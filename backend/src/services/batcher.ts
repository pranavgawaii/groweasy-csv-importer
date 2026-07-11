import { extractBatch } from "./groqClient.js";
import { hasContact, validateRecord } from "./validator.js";
import type {
  CrmRecord,
  ImportResult,
  ProgressEvent,
  RawRow,
  SkippedRow,
} from "../types/crm.js";
import { prisma } from "./prisma.js";

export const BATCH_SIZE = 18;
export const CONCURRENCY = 3;
export const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

/** Split an array into fixed-size chunks. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` with up to `retries` extra attempts, backing off exponentially
 * (500ms, 1000ms, ...) between tries. Throws the last error if all fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  baseDelay = BASE_BACKOFF_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(baseDelay * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Map over items with a bounded number of workers running at once, preserving
 * input order in the output. `onSettled` fires as each item completes so callers
 * can report live progress.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onSettled?: () => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runner(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index] as T, index);
      onSettled?.();
    }
  }

  const pool = Array.from({ length: Math.min(limit, items.length) }, runner);
  await Promise.all(pool);
  return results;
}

interface BatchOutput {
  records: CrmRecord[];
  skipped: SkippedRow[];
}

/** Process a single batch: call the LLM (with retry), validate, and split by contact info. */
async function processBatch(batch: RawRow[]): Promise<BatchOutput> {
  try {
    const raw = await withRetry(() => extractBatch(batch));

    const records: CrmRecord[] = [];
    const skipped: SkippedRow[] = [];

    for (const rawRecord of raw.records) {
      const record = validateRecord(rawRecord);
      if (hasContact(record)) {
        records.push(record);
      } else {
        skipped.push({
          originalRow: asRow(rawRecord),
          reason: "no email or mobile",
        });
      }
    }

    for (const rawSkip of raw.skipped) {
      skipped.push({
        originalRow: asRow(rawSkip),
        reason: "no email or mobile",
      });
    }

    return { records, skipped };
  } catch (err) {
    // Batch failed even after retries — never drop the rows, surface them as skipped.
    const reason = `batch failed after ${MAX_RETRIES} retries: ${
      err instanceof Error ? err.message : "unknown error"
    }`;
    return {
      records: [],
      skipped: batch.map((originalRow) => ({ originalRow, reason })),
    };
  }
}

/** Best-effort coercion of an unknown LLM entry back into a row object. */
function asRow(value: unknown): RawRow {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: RawRow = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = v === null || v === undefined ? "" : String(v);
    }
    return out;
  }
  return { value: String(value ?? "") };
}

/**
 * Orchestrate the full import: batch the rows, process batches with bounded
 * concurrency + retries, and merge everything into one validated result.
 * `onProgress` receives lifecycle events suitable for streaming to a client.
 */
export async function processRows(
  rows: RawRow[],
  onProgress?: (event: ProgressEvent) => void
): Promise<ImportResult> {
  const batches = chunk(rows, BATCH_SIZE);
  const totalBatches = batches.length;

  onProgress?.({ type: "start", totalRows: rows.length, totalBatches });

  let completedBatches = 0;
  const outputs = await mapWithConcurrency(
    batches,
    CONCURRENCY,
    (batch) => processBatch(batch),
    () => {
      completedBatches += 1;
      onProgress?.({ type: "progress", completedBatches, totalBatches });
    }
  );

  const records: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];
  for (const out of outputs) {
    records.push(...out.records);
    skipped.push(...out.skipped);
  }

  if (records.length > 0) {
    try {
      await prisma.lead.createMany({
        data: records.map((r) => ({
          created_at: r.created_at ? new Date(r.created_at) : null,
          name: r.name,
          email: r.email,
          country_code: r.country_code,
          mobile_without_country_code: r.mobile_without_country_code,
          company: r.company,
          city: r.city,
          state: r.state,
          country: r.country,
          lead_owner: r.lead_owner,
          crm_status: r.crm_status,
          crm_note: r.crm_note,
          data_source: r.data_source,
          possession_time: r.possession_time,
          description: r.description,
        })),
      });
    } catch (dbErr) {
      console.error("Failed to save records to database:", dbErr);
      // We still return the records to the client, but log the DB error.
    }
  }

  return {
    records,
    skipped,
    totalRows: rows.length,
    totalImported: records.length,
    totalSkipped: skipped.length,
  };
}
