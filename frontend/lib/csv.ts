import Papa from "papaparse";
import type { RawRow } from "@/types/crm";

export interface ParsedCsv {
  headers: string[];
  rows: RawRow[];
}

/**
 * Parse a CSV File in the browser with papaparse.
 * Every value is coerced to a trimmed string so the preview and the API
 * always see a consistent `Record<string, string>` shape.
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = (results.meta.fields ?? []).filter(Boolean);
        const rows: RawRow[] = [];

        for (const raw of results.data) {
          if (!raw || typeof raw !== "object") continue;
          const row: RawRow = {};
          let hasValue = false;
          for (const header of headers) {
            const value = raw[header];
            const str =
              value === null || value === undefined ? "" : String(value).trim();
            row[header] = str;
            if (str) hasValue = true;
          }
          if (hasValue) rows.push(row);
        }

        if (headers.length === 0) {
          reject(new Error("Couldn't find any columns in this CSV."));
          return;
        }
        resolve({ headers, rows });
      },
      error: (err) => reject(new Error(err.message || "Failed to parse CSV.")),
    });
  });
}

/** Human-readable file size, e.g. "12.4 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}
