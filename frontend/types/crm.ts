/**
 * Client-side mirror of the GrowEasy CRM contract returned by the backend.
 * Kept in sync with `backend/src/types/crm.ts`.
 */

export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number];

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

/** The 15 CRM fields in canonical display order. */
export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

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

/** An arbitrary parsed CSV row. */
export type RawRow = Record<string, string>;

export interface SkippedRow {
  originalRow: RawRow;
  reason: string;
}

export interface ImportResult {
  records: CrmRecord[];
  skipped: SkippedRow[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

/** Streamed progress events emitted by the backend during import. */
export type ProgressEvent =
  | { type: "start"; totalRows: number; totalBatches: number }
  | { type: "progress"; completedBatches: number; totalBatches: number }
  | { type: "done"; result: ImportResult }
  | { type: "error"; message: string };
