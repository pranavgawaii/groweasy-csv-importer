import {
  CRM_STATUSES,
  DATA_SOURCES,
  type CrmRecord,
  type CrmStatus,
  type DataSource,
} from "../types/crm.js";

const STATUS_SET = new Set<string>(CRM_STATUSES);
const SOURCE_SET = new Set<string>(DATA_SOURCES);

/**
 * Coerce an arbitrary LLM value into a clean single-line string, or null.
 * Internal newlines are escaped to a literal `\n` so every field stays single-line.
 */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "\\n")
    .trim();

  if (!cleaned) return null;
  // The model sometimes emits literal "null"/"n/a" strings — treat as absent.
  if (/^(null|n\/a|na|none|-)$/i.test(cleaned)) return null;
  return cleaned;
}

/** crm_status must be exactly one of the allowed enums, else null. */
function validateStatus(value: unknown): CrmStatus | null {
  return typeof value === "string" && STATUS_SET.has(value)
    ? (value as CrmStatus)
    : null;
}

/** data_source must be exactly one of the allowed enums, else blank string. */
function validateDataSource(value: unknown): DataSource | "" {
  return typeof value === "string" && SOURCE_SET.has(value)
    ? (value as DataSource)
    : "";
}

/** created_at must be parseable by `new Date()`, else null. Preserves the original string. */
function validateDate(value: unknown): string | null {
  const str = toNullableString(value);
  if (!str) return null;
  const ts = new Date(str).getTime();
  return Number.isNaN(ts) ? null : str;
}

/**
 * Turn an untrusted LLM record object into a validated `CrmRecord`.
 * Every field is sanitized; enums and dates are checked against the schema.
 * Never trust raw model output — this is the single gate before the client sees data.
 */
export function validateRecord(raw: unknown): CrmRecord {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  return {
    created_at: validateDate(r.created_at),
    name: toNullableString(r.name),
    email: toNullableString(r.email),
    country_code: toNullableString(r.country_code),
    mobile_without_country_code: toNullableString(r.mobile_without_country_code),
    company: toNullableString(r.company),
    city: toNullableString(r.city),
    state: toNullableString(r.state),
    country: toNullableString(r.country),
    lead_owner: toNullableString(r.lead_owner),
    crm_status: validateStatus(r.crm_status),
    crm_note: toNullableString(r.crm_note),
    data_source: validateDataSource(r.data_source),
    possession_time: toNullableString(r.possession_time),
    description: toNullableString(r.description),
  };
}

/** A record is importable only if it has at least an email or a mobile number. */
export function hasContact(record: CrmRecord): boolean {
  return Boolean(record.email || record.mobile_without_country_code);
}
