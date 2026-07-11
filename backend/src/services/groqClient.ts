import Groq from "groq-sdk";
import type { LlmBatchResult, RawRow } from "../types/crm.js";

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

let client: Groq | null = null;

/** Lazily construct the Groq client so the process can boot without a key (for tests). */
function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Add it to backend/.env — see README."
      );
    }
    client = new Groq({ apiKey });
  }
  return client;
}

/**
 * The CRM extraction system prompt. Encodes the full mapping contract and rules.
 * Kept verbatim to the spec so the model behaves predictably across CSV shapes.
 */
export const SYSTEM_PROMPT = `You are a CRM data extraction engine for GrowEasy. You will receive an array of raw CSV rows as JSON objects — keys are whatever the original CSV's columns were, which may be inconsistent, messy, or come from any source (Facebook Lead Ads, Google Ads, Excel exports, real estate CRMs, manual sheets).

For EACH row, map it into this exact CRM schema:
- created_at: lead creation date/time, must be parseable by JS \`new Date(created_at)\`. If absent, null.
- name: lead's full name.
- email: primary email. If multiple exist, use the first valid one; append extras into crm_note.
- country_code: e.g. "+91". Infer only if a valid mobile number and clear locale context exist; else null.
- mobile_without_country_code: mobile stripped of country code. If multiple numbers exist, use the first; append extras to crm_note.
- company: company/organization name if present.
- city, state, country: location fields if present.
- lead_owner: assigned owner/agent if present.
- crm_status: exactly one of ["GOOD_LEAD_FOLLOW_UP","DID_NOT_CONNECT","BAD_LEAD","SALE_DONE"], inferred from any status/remark text. Cues: interested / callback requested / follow up / site visit booked / reschedule → GOOD_LEAD_FOLLOW_UP; did not pick up / not reachable / no answer / switched off → DID_NOT_CONNECT; not interested / junk / spam / wrong number / budget mismatch → BAD_LEAD; sale closed / deal done / booked unit / token paid → SALE_DONE. If nothing indicates status, null — never guess.
- crm_note: consolidate remarks, follow-up notes, extra emails/phones, and any leftover useful info. Join with "; ".
- data_source: exactly one of ["leads_on_demand","meridian_tower","eden_park","varah_swamy","sarjapur_plots"]. Only set if confidently matched; else blank.
- possession_time: property possession timeframe if mentioned.
- description: additional descriptive info not captured above.

RULES:
1. If a row has NEITHER email NOR mobile number, exclude it from "records" and instead add it to "skipped" with the original row data.
2. Never invent data. Missing/unclear fields = null (or blank for data_source/crm_status).
3. Every value must be single-line; escape internal newlines as \\n.
4. Return ONLY valid JSON, no markdown fences, no commentary, in this shape:
{ "records": [ {...} ], "skipped": [ {...} ] }`;

/** Strip accidental markdown fences and isolate the JSON object from model output. */
function extractJson(content: string): string {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return text;
}

/**
 * Send one batch of raw rows to Groq and return the parsed (but not yet validated)
 * batch result. Throws on network/parse failure so the caller can retry.
 */
export async function extractBatch(rows: RawRow[]): Promise<LlmBatchResult> {
  const groq = getClient();

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Rows to process:\n${JSON.stringify(rows)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new Error("Failed to parse JSON from Groq response");
  }

  const result = parsed as Partial<LlmBatchResult>;
  return {
    records: Array.isArray(result.records) ? result.records : [],
    skipped: Array.isArray(result.skipped) ? result.skipped : [],
  };
}

export const GROQ_MODEL = MODEL;
