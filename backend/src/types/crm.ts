/**
 * The GrowEasy CRM schema — this is the contract every imported record must match.
 * Field names here are the canonical output keys returned to the client.
 */

/** Allowed CRM status values. Anything the LLM returns outside this set is nulled. */
export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number];

/** Allowed data sources. Anything outside this set is blanked. */
export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

/** A single mapped CRM record. All optional fields are `null` when absent. */
export interface CrmRecord {
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: CrmStatus | null;
  crm_note: string | null;
  data_source: DataSource | "";
  possession_time: string | null;
  description: string | null;
}

/** An arbitrary CSV row: whatever columns the source file had, values as strings. */
export type RawRow = Record<string, string>;

/** A row that could not be imported, kept with the reason for transparency. */
export interface SkippedRow {
  originalRow: RawRow;
  reason: string;
}

/** The raw shape we expect back from the LLM for a single batch. */
export interface LlmBatchResult {
  records: unknown[];
  skipped: unknown[];
}

/** The final merged response returned to the client. */
export interface ImportResult {
  records: CrmRecord[];
  skipped: SkippedRow[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

/** Streamed progress events (NDJSON) emitted while batches are processed. */
export type ProgressEvent =
  | { type: "start"; totalRows: number; totalBatches: number }
  | { type: "progress"; completedBatches: number; totalBatches: number }
  | { type: "done"; result: ImportResult }
  | { type: "error"; message: string };
