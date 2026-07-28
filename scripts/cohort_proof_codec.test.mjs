import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import shared from "../shared/dist/index.js";

const {
  COHORT_PROOF_POLICY_VERSION,
  cohortMemberSetBytes,
  cohortReservationBytes,
  canonicalCohortJsonBytes,
  outcomeEvidenceAdmissionReceiptBytes,
  outcomeEvidenceContentBytes
} = shared;

const hex = (value) => Buffer.from(value).toString("hex");
const hash = (value) => createHash("sha256").update(value).digest("hex");

const slice = {
  org_id: "org_alpha",
  workflow_id: "workflow:renewal",
  jbtd_id: "renewal",
  persona_id: "account_exec"
};
const members = ["member-05", "member-01", "a|bc", "member-03", "é"];
const evidence = {
  org_id: "org_alpha",
  evidence_id: "evidence_baseline",
  workflow_id: "workflow:renewal",
  outcome_metric: "cycle_time",
  outcome_unit: "days",
  period_start: "2026-01-01T00:00:00.000Z",
  period_end: "2026-03-02T00:00:00.000Z",
  aggregate_value: 12.5,
  cohort_size: 5,
  source_system: "customer_crm",
  jbtd_id: "renewal",
  persona_id: "account_exec",
  aggregate_kind: "mean",
  source_attestation: { approved: true, note: "aggregate" },
  ingested_at: "2026-03-03T00:00:00.000Z"
};
const receipt = {
  policy_version: "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07",
  workflow_id: "workflow:renewal",
  jbtd_id: "renewal",
  persona_id: "account_exec",
  baseline_window: {
    period_start: "2026-01-01T00:00:00.000Z",
    period_end: "2026-03-02T00:00:00.000Z",
    evidence_ids: ["evidence_baseline"]
  },
  comparison_window: {
    period_start: "2026-03-02T00:00:00.000Z",
    period_end: "2026-05-01T00:00:00.000Z",
    evidence_ids: ["evidence_comparison"]
  }
};

test("codec produces stable golden hashes", () => {
  assert.equal(COHORT_PROOF_POLICY_VERSION, "FT_COHORT_EQUALITY_PRIVACY_POLICY_2026_07");
  assert.equal(
    hash(cohortMemberSetBytes(slice, members)),
    "791d9d238c8bf20872f676a7ff237e592fc99cfa984158afed1fe905b190f07b"
  );
  assert.equal(
    hash(cohortReservationBytes(slice)),
    "2fe417ca94734da726490311baf5fa6e86a2ca29c92fdf9562b70b4100044aae"
  );
  assert.equal(
    hash(outcomeEvidenceContentBytes(evidence)),
    "db97e1629e5c02f7fbe9d40091356d2b3542bcb1044924596ae72eceddfabb6d"
  );
  assert.equal(
    hash(outcomeEvidenceAdmissionReceiptBytes(receipt)),
    "a78b8437cda280e52a55c78857295683bbd794d562f4a4d6eee9d4a258f601f7"
  );
});

test("member framing is set ordered, exact, and collision resistant", () => {
  assert.equal(
    hex(cohortMemberSetBytes(slice, members)),
    hex(cohortMemberSetBytes(slice, [...members].reverse()))
  );
  assert.notEqual(
    hex(cohortMemberSetBytes(slice, ["ab", "c", "d", "e", "f"])),
    hex(cohortMemberSetBytes(slice, ["a", "bc", "d", "e", "f"]))
  );
  assert.notEqual(
    hex(cohortMemberSetBytes(slice, ["é", "b", "c", "d", "e"])),
    hex(cohortMemberSetBytes(slice, ["e\u0301", "b", "c", "d", "e"]))
  );
});

test("member codec rejects duplicates and invalid handles", () => {
  assert.throws(
    () => cohortMemberSetBytes(slice, ["a", "a", "b", "c", "d"]),
    /COHORT_CODEC_DUPLICATE_MEMBER/
  );
  assert.throws(
    () => cohortMemberSetBytes(slice, ["", "a", "b", "c", "d"]),
    /COHORT_CODEC_INVALID_MEMBER/
  );
  assert.throws(
    () => cohortMemberSetBytes(slice, ["a\n", "a", "b", "c", "d"]),
    /COHORT_CODEC_INVALID_MEMBER/
  );
  assert.throws(
    () => cohortMemberSetBytes(slice, ["\ud800", "a", "b", "c", "d"]),
    /COHORT_CODEC_INVALID_UNICODE/
  );
  assert.throws(
    () => cohortMemberSetBytes(slice, ["x".repeat(257), "a", "b", "c", "d"]),
    /COHORT_CODEC_INVALID_MEMBER/
  );
});

test("canonical JSON is byte stable and rejects ambiguous values", () => {
  assert.equal(
    Buffer.from(canonicalCohortJsonBytes({ z: [2, 1], a: null })).toString(),
    '{"a":null,"z":[2,1]}'
  );
  assert.throws(
    () => canonicalCohortJsonBytes({ value: -0 }),
    /COHORT_CODEC_INVALID_JSON_NUMBER/
  );
  assert.throws(
    () => canonicalCohortJsonBytes({ value: Number.NaN }),
    /COHORT_CODEC_INVALID_JSON_NUMBER/
  );
  assert.throws(
    () => canonicalCohortJsonBytes({ value: undefined }),
    /COHORT_CODEC_UNSUPPORTED_JSON/
  );
  const sparse = [];
  sparse[1] = "value";
  assert.throws(
    () => canonicalCohortJsonBytes(sparse),
    /COHORT_CODEC_INVALID_JSON_ARRAY/
  );
});

test("evidence codec rejects negative zero aggregate values", () => {
  assert.throws(
    () => outcomeEvidenceContentBytes({ ...evidence, aggregate_value: -0 }),
    /COHORT_CODEC_INVALID_BINARY64/
  );
});

test("evidence codec distinguishes explicit null from an empty UTF-8 value", () => {
  const nullable = {
    ...evidence,
    jbtd_id: null,
    persona_id: null,
    aggregate_kind: null
  };
  const empty = {
    ...evidence,
    jbtd_id: "",
    persona_id: "",
    aggregate_kind: ""
  };
  assert.notEqual(
    hex(outcomeEvidenceContentBytes(nullable)),
    hex(outcomeEvidenceContentBytes(empty))
  );
});
