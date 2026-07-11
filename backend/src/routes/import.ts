import { Router, type Request, type Response } from "express";
import { normalizeRows, parseCsv } from "../services/csvParser.js";
import { processRows } from "../services/batcher.js";
import type { ProgressEvent, RawRow } from "../types/crm.js";

export const importRouter = Router();

const MAX_ROWS = 5000;

/** Pull normalized rows out of the request body, supporting `{ rows }` or `{ csv }`. */
function extractRows(body: unknown): RawRow[] {
  if (!body || typeof body !== "object") {
    throw new Error('Request body must be JSON with a "rows" array or "csv" string.');
  }
  const { rows, csv } = body as { rows?: unknown; csv?: unknown };

  if (typeof csv === "string" && csv.trim()) {
    return parseCsv(csv);
  }
  if (Array.isArray(rows)) {
    return normalizeRows(rows as Record<string, unknown>[]);
  }
  throw new Error('Provide either a "rows" array or a "csv" string.');
}

/**
 * POST /api/import
 *
 * Body: { rows: Record<string,string>[] }  — or  { csv: string }
 *
 * Response:
 *  - Default: JSON ImportResult.
 *  - With `Accept: text/event-stream` or `?stream=1`: NDJSON progress stream
 *    ending in a `{ type: "done", result }` event.
 */
importRouter.post("/import", async (req: Request, res: Response) => {
  let rows: RawRow[];
  try {
    rows = extractRows(req.body);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid request" });
    return;
  }

  if (rows.length === 0) {
    res.status(400).json({ error: "No non-empty rows found to import." });
    return;
  }
  if (rows.length > MAX_ROWS) {
    res.status(413).json({ error: `Too many rows (${rows.length}). Max is ${MAX_ROWS}.` });
    return;
  }

  const wantsStream =
    req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");

  if (wantsStream) {
    await handleStream(rows, res);
    return;
  }

  try {
    const result = await processRows(rows);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Import failed unexpectedly.",
    });
  }
});

/** Stream NDJSON progress events, one JSON object per line. */
async function handleStream(rows: RawRow[], res: Response): Promise<void> {
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event: ProgressEvent) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const result = await processRows(rows, send);
    send({ type: "done", result });
  } catch (err) {
    send({
      type: "error",
      message: err instanceof Error ? err.message : "Import failed unexpectedly.",
    });
  } finally {
    res.end();
  }
}
