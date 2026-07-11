import { parse } from "csv-parse/sync";
import type { RawRow } from "../types/crm.js";

/**
 * Parse a raw CSV string into an array of row objects keyed by header.
 * Used when a client posts a raw `csv` string instead of pre-parsed rows.
 */
export function parseCsv(csv: string): RawRow[] {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, unknown>[];

  return normalizeRows(records);
}

/**
 * Normalize incoming rows into a clean `Record<string, string>` shape:
 * - trims header keys
 * - coerces every value to a trimmed string
 * - drops rows that are entirely empty
 *
 * This runs on both the pre-parsed and server-parsed paths so downstream
 * code (and the LLM) always sees consistent, well-formed input.
 */
export function normalizeRows(rows: Record<string, unknown>[]): RawRow[] {
  const cleaned: RawRow[] = [];

  for (const row of rows) {
    if (row === null || typeof row !== "object") continue;

    const normalized: RawRow = {};
    let hasValue = false;

    for (const [rawKey, rawValue] of Object.entries(row)) {
      const key = rawKey.trim();
      if (!key) continue;

      const value =
        rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();

      normalized[key] = value;
      if (value) hasValue = true;
    }

    if (hasValue) cleaned.push(normalized);
  }

  return cleaned;
}
