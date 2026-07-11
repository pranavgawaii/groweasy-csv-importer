import assert from "node:assert/strict";
import { test } from "node:test";
import { hasContact, validateRecord } from "./validator.js";

test("keeps valid enum values", () => {
  const r = validateRecord({
    crm_status: "SALE_DONE",
    data_source: "eden_park",
  });
  assert.equal(r.crm_status, "SALE_DONE");
  assert.equal(r.data_source, "eden_park");
});

test("nulls invalid crm_status and blanks invalid data_source", () => {
  const r = validateRecord({
    crm_status: "MAYBE_LATER",
    data_source: "unknown_project",
  });
  assert.equal(r.crm_status, null);
  assert.equal(r.data_source, "");
});

test("keeps a parseable created_at and nulls a garbage one", () => {
  assert.equal(
    validateRecord({ created_at: "2026-05-13 14:20:48" }).created_at,
    "2026-05-13 14:20:48"
  );
  assert.equal(validateRecord({ created_at: "not a date" }).created_at, null);
});

test("escapes internal newlines to keep values single-line", () => {
  const r = validateRecord({ crm_note: "line one\nline two" });
  assert.equal(r.crm_note, "line one\\nline two");
});

test("treats literal null-ish strings as absent", () => {
  assert.equal(validateRecord({ company: "null" }).company, null);
  assert.equal(validateRecord({ company: "N/A" }).company, null);
});

test("hasContact requires an email or mobile", () => {
  assert.equal(hasContact(validateRecord({ email: "a@b.com" })), true);
  assert.equal(
    hasContact(validateRecord({ mobile_without_country_code: "9876543210" })),
    true
  );
  assert.equal(hasContact(validateRecord({ name: "No Contact" })), false);
});
