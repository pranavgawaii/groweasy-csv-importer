import type { ImportResult, ProgressEvent, RawRow } from "@/types/crm";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

/**
 * POST parsed rows to the backend and stream progress back.
 *
 * The backend responds with newline-delimited JSON (NDJSON) progress events.
 * We read the stream incrementally, forwarding each `progress` event to
 * `onProgress`, and resolve with the final `ImportResult` from the `done` event.
 */
export async function importRows(
  rows: RawRow[],
  onProgress?: (event: ProgressEvent) => void,
  signal?: AbortSignal
): Promise<ImportResult> {
  const res = await fetch(`${API_BASE}/api/import?stream=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ rows }),
    signal,
  });

  if (!res.ok) {
    // Non-stream error responses come back as JSON { error }.
    const message = await safeErrorMessage(res);
    throw new Error(message);
  }

  if (!res.body) {
    // Fallback: no streaming body available, treat as plain JSON.
    return (await res.json()) as ImportResult;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ImportResult | null = null;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: ProgressEvent;
    try {
      event = JSON.parse(trimmed) as ProgressEvent;
    } catch {
      return; // ignore malformed partial lines
    }
    if (event.type === "done") {
      result = event.result;
    } else if (event.type === "error") {
      throw new Error(event.message);
    } else {
      onProgress?.(event);
    }
  };

  // Read the stream chunk by chunk, splitting on newlines.
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }
  }
  if (buffer.trim()) handleLine(buffer);

  if (!result) {
    throw new Error("Import stream ended without a result.");
  }
  return result;
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    /* fall through */
  }
  return `Import failed (HTTP ${res.status}).`;
}

/** Quick backend liveness check used by the header status pill. */
export async function checkHealth(): Promise<{
  status: string;
  model: string;
  groqConfigured: boolean;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as {
      status: string;
      model: string;
      groqConfigured: boolean;
    };
  } catch {
    return null;
  }
}
