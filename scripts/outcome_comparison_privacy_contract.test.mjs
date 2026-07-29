import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import shared from "../shared/dist/index.js";

const projection = {
  policy_version: "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07",
  org_id: "org_alpha",
  workflow_id: "workflow:renewal",
  jbtd_id: "renewal",
  persona_id: "account_exec",
  outcome_metric: "cycle_time",
  outcome_unit: "days",
  source_system: "customer_crm",
  baseline_window: {
    period_start: "2026-01-01T00:00:00.000Z",
    period_end: "2026-03-02T00:00:00.000Z",
    evidence_id: "evidence_baseline",
    cohort_size: 5,
    aggregate_value: 12.5
  },
  comparison_window: {
    period_start: "2026-03-02T00:00:00.000Z",
    period_end: "2026-05-01T00:00:00.000Z",
    evidence_id: "evidence_comparison",
    cohort_size: 5,
    aggregate_value: 9.75
  }
};

const receipt = {
  policy_version: "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07",
  release_id: "1b2e8f6d-ea3d-4db8-aea7-cb4be92e773d",
  proof_journal_id: "4d012e7e-c9e2-4eef-b441-57ecaa39f6e1",
  reservation_key: "a".repeat(64),
  content_fingerprint: "b".repeat(64),
  projection_hash: "c".repeat(64),
  comparison_privacy_only: true,
  claim_authority_effect: "NONE",
  claim_authorized: false,
  model_authorized: false,
  customer_publishable: false
};

const contentCommitment = {
  commitment_version: "FT_OUTCOME_COMPARISON_CONTENT_COMMITMENT_V1",
  projection,
  proof_journal_id: receipt.proof_journal_id,
  proof_hash: "d".repeat(64),
  admission_receipt_hash: "e".repeat(64),
  baseline_evidence_hash: "f".repeat(64),
  comparison_evidence_hash: "1".repeat(64),
  reservation_key: receipt.reservation_key
};

test("C.1 exports strict atomic projection and bounded receipt contracts", () => {
  assert.equal(
    shared.OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION,
    "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07"
  );
  assert.deepEqual(
    shared.OutcomeComparisonProjectionSchema.parse(projection),
    projection
  );
  assert.deepEqual(
    shared.OutcomeComparisonPrivacyReceiptSchema.parse(receipt),
    receipt
  );
  assert.throws(
    () =>
      shared.OutcomeComparisonProjectionSchema.parse({
        ...projection,
        percent_change: 22
      }),
    /unrecognized/i
  );
  assert.throws(
    () =>
      shared.OutcomeComparisonPrivacyReceiptSchema.parse({
        ...receipt,
        aggregate_value: 12.5
      }),
    /unrecognized/i
  );
});

test("C.1 projection policy rejects ambiguous windows and unsafe numeric values", () => {
  assert.throws(
    () =>
      shared.OutcomeComparisonProjectionSchema.parse({
        ...projection,
        comparison_window: {
          ...projection.comparison_window,
          period_start: "2026-02-01T00:00:00.000Z"
        }
      }),
    /overlap/i
  );
  assert.throws(
    () =>
      shared.OutcomeComparisonProjectionSchema.parse({
        ...projection,
        baseline_window: {
          ...projection.baseline_window,
          aggregate_value: -0
        }
      }),
    /negative zero/i
  );
  assert.throws(
    () =>
      shared.OutcomeComparisonProjectionSchema.parse({
        ...projection,
        comparison_window: {
          ...projection.comparison_window,
          evidence_id: projection.baseline_window.evidence_id
        }
      }),
    /distinct evidence/i
  );
});

test("C.1 canonical bytes are stable, typed, and domain separated", () => {
  const projectionBytes = shared.outcomeComparisonProjectionBytes(projection);
  const receiptBytes = shared.outcomeComparisonPrivacyReceiptBytes(receipt);
  assert.equal(
    createHash("sha256").update(projectionBytes).digest("hex"),
    "0b974e9b31b0146ccca5b0e53e189a2e182756a31f7e11b0caee52eda657cf2a"
  );
  assert.equal(
    createHash("sha256").update(receiptBytes).digest("hex"),
    "144d3ec9d258a80aa7e3e319683504e30d77efbfe8da6f1587845804c49605c5"
  );
  assert.notDeepEqual(
    Buffer.from(projectionBytes),
    Buffer.from(receiptBytes)
  );
  assert.notDeepEqual(
    Buffer.from(projectionBytes),
    Buffer.from(
      shared.outcomeComparisonProjectionBytes({
        ...projection,
        baseline_window: {
          ...projection.baseline_window,
          aggregate_value: 12.75
        }
      })
    )
  );
});

test("C.1 content commitment binds every projection and lineage field", () => {
  assert.equal(
    shared.OUTCOME_COMPARISON_CONTENT_COMMITMENT_VERSION,
    "FT_OUTCOME_COMPARISON_CONTENT_COMMITMENT_V1"
  );
  assert.deepEqual(
    shared.OutcomeComparisonContentCommitmentSchema.parse(contentCommitment),
    contentCommitment
  );

  const baseline = Buffer.from(
    shared.outcomeComparisonContentCommitmentBytes(contentCommitment)
  ).toString("hex");
  assert.notEqual(
    baseline,
    Buffer.from(shared.outcomeComparisonProjectionBytes(projection)).toString(
      "hex"
    )
  );

  const variants = [
    ["org_id", { projection: { ...projection, org_id: "org_beta" } }],
    [
      "workflow_id",
      { projection: { ...projection, workflow_id: "workflow:expansion" } }
    ],
    ["jbtd_id", { projection: { ...projection, jbtd_id: "expansion" } }],
    [
      "persona_id",
      { projection: { ...projection, persona_id: "sales_leader" } }
    ],
    [
      "outcome_metric",
      { projection: { ...projection, outcome_metric: "resolution_time" } }
    ],
    [
      "outcome_unit",
      { projection: { ...projection, outcome_unit: "hours" } }
    ],
    [
      "source_system",
      { projection: { ...projection, source_system: "customer_erp" } }
    ],
    [
      "baseline.period_start",
      {
        projection: {
          ...projection,
          baseline_window: {
            ...projection.baseline_window,
            period_start: "2025-12-31T00:00:00.000Z"
          }
        }
      }
    ],
    [
      "baseline.period_end",
      {
        projection: {
          ...projection,
          baseline_window: {
            ...projection.baseline_window,
            period_end: "2026-03-01T00:00:00.000Z"
          }
        }
      }
    ],
    [
      "baseline.evidence_id",
      {
        projection: {
          ...projection,
          baseline_window: {
            ...projection.baseline_window,
            evidence_id: "evidence_baseline_v2"
          }
        }
      }
    ],
    [
      "baseline.cohort_size",
      {
        projection: {
          ...projection,
          baseline_window: {
            ...projection.baseline_window,
            cohort_size: 6
          }
        }
      }
    ],
    [
      "baseline.aggregate_value",
      {
        projection: {
          ...projection,
          baseline_window: {
            ...projection.baseline_window,
            aggregate_value: 12.75
          }
        }
      }
    ],
    [
      "comparison.period_start",
      {
        projection: {
          ...projection,
          comparison_window: {
            ...projection.comparison_window,
            period_start: "2026-03-03T00:00:00.000Z"
          }
        }
      }
    ],
    [
      "comparison.period_end",
      {
        projection: {
          ...projection,
          comparison_window: {
            ...projection.comparison_window,
            period_end: "2026-05-02T00:00:00.000Z"
          }
        }
      }
    ],
    [
      "comparison.evidence_id",
      {
        projection: {
          ...projection,
          comparison_window: {
            ...projection.comparison_window,
            evidence_id: "evidence_comparison_v2"
          }
        }
      }
    ],
    [
      "comparison.cohort_size",
      {
        projection: {
          ...projection,
          comparison_window: {
            ...projection.comparison_window,
            cohort_size: 6
          }
        }
      }
    ],
    [
      "comparison.aggregate_value",
      {
        projection: {
          ...projection,
          comparison_window: {
            ...projection.comparison_window,
            aggregate_value: 9.5
          }
        }
      }
    ],
    [
      "proof_journal_id",
      {
        proof_journal_id: "2a13173a-94f7-4c9a-9cbf-31a12885351c"
      }
    ],
    ["proof_hash", { proof_hash: "2".repeat(64) }],
    ["admission_receipt_hash", { admission_receipt_hash: "3".repeat(64) }],
    ["baseline_evidence_hash", { baseline_evidence_hash: "4".repeat(64) }],
    ["comparison_evidence_hash", { comparison_evidence_hash: "5".repeat(64) }],
    ["reservation_key", { reservation_key: "6".repeat(64) }]
  ];

  for (const [field, patch] of variants) {
    const candidate = {
      ...contentCommitment,
      ...patch,
      projection: patch.projection ?? contentCommitment.projection
    };
    assert.notEqual(
      Buffer.from(
        shared.outcomeComparisonContentCommitmentBytes(candidate)
      ).toString("hex"),
      baseline,
      `${field} must change commitment bytes`
    );
  }

  assert.throws(
    () =>
      shared.OutcomeComparisonContentCommitmentSchema.parse({
        ...contentCommitment,
        projection: {
          ...projection,
          policy_version: "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_08"
        }
      }),
    /invalid literal/i
  );
});

test("C.1 diagnostics remain internal, bounded, and non-authorizing", () => {
  assert.deepEqual(shared.OUTCOME_COMPARISON_PRIVACY_DIAGNOSTICS, [
    "INVALID_INPUT",
    "PERSISTENCE_UNAVAILABLE",
    "C0_AUTHORITY_UNAVAILABLE",
    "EVIDENCE_PAIR_MISMATCH",
    "RESERVATION_MISMATCH",
    "REPLAY_MISMATCH",
    "JOURNAL_READBACK_MISMATCH",
    "PRODUCER_AUTHORITY_REVOKED"
  ]);
});

test("C.1 publishes additive strict JSON schemas and internal contract documentation", () => {
  const projectionSchemaPath =
    "schemas/outcome_comparison_projection.schema.json";
  const receiptSchemaPath =
    "schemas/outcome_comparison_privacy_receipt.schema.json";
  const documentationPath =
    "docs/contracts/outcome-comparison-privacy/README.md";

  for (const path of [
    projectionSchemaPath,
    receiptSchemaPath,
    documentationPath
  ]) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }

  const projectionSchema = JSON.parse(
    readFileSync(projectionSchemaPath, "utf8")
  );
  const receiptSchema = JSON.parse(readFileSync(receiptSchemaPath, "utf8"));
  const documentation = readFileSync(documentationPath, "utf8");

  assert.equal(projectionSchema.additionalProperties, false);
  assert.equal(
    projectionSchema.properties.policy_version.const,
    shared.OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION
  );
  assert.equal(receiptSchema.additionalProperties, false);
  assert.equal(receiptSchema.properties.claim_authorized.const, false);
  assert.equal(receiptSchema.properties.model_authorized.const, false);
  assert.equal(receiptSchema.properties.customer_publishable.const, false);
  for (const field of ["period_start", "period_end"]) {
    assert.deepEqual(projectionSchema.$defs.window.properties[field], {
      type: "string",
      format: "date-time",
      minLength: 24,
      maxLength: 24,
      pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$"
    });
  }
  assert.deepEqual(projectionSchema.$defs.window.properties.evidence_id, {
    type: "string",
    minLength: 1,
    maxLength: 128,
    pattern: "^[a-z0-9][a-z0-9_-]{0,127}$"
  });
  assert.match(documentation, /atomic/i);
  assert.match(documentation, /not authorize claim language/i);
  assert.match(documentation, /no public endpoint/i);
  for (const field of [
    "projection",
    "proof_journal_id",
    "proof_hash",
    "admission_receipt_hash",
    "baseline_evidence_hash",
    "comparison_evidence_hash",
    "reservation_key"
  ]) {
    assert.match(documentation, new RegExp(`\\b${field}\\b`));
  }
});
