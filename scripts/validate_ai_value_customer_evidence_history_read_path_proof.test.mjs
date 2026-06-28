import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  runControlledRepeatedPilotEvidencePackageFromObject,
  validateControlledRepeatedPilotEvidencePackage
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";
import {
  buildCustomerEvidenceHistoryReadPathProofFromObject,
  customerEvidenceHistoryReadPathProofHash,
  validateCustomerEvidenceHistoryReadPathProof
} from "./run_ai_value_customer_evidence_history_read_path_proof.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_MILESTONES = [0, 30, 60, 90, 180, 365];

const REQUIRED_FALSE_FEEDS = [
  "measurement_cell_series_snapshot_write",
  "measurement_cell_series_schema_creation",
  "measurement_cell_series_migration_creation",
  "measurement_cell_series_repository_write_path",
  "evidence_snapshot_extension",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_economic_output",
  "customer_facing_financial_output",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "research_model_feed",
  "model_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Json(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function sourceFixture() {
  return readJson(FIXTURE_PATH);
}

function repeatedPackage(options = {}) {
  const fixture = sourceFixture();
  const packageRecord = runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
    cwd: process.cwd(),
    ...options
  });
  const validation = validateControlledRepeatedPilotEvidencePackage(packageRecord, {
    sourceFixture: fixture,
    cwd: process.cwd(),
    ...options
  });
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return packageRecord;
}

function compactCustomerSnapshot(day, overrides = {}) {
  return {
    id: `db_row_internal_day_${day}`,
    org_id: "org-northstar-enterprise",
    client_id: "client-internal",
    customer_data_model_snapshot_id:
      `customer_data_model_snapshot:measurement_cell_support_day_${day}`,
    source_snapshot_id: `measurement_cell_snapshot_support_day_${day}`,
    source_projection_id: `measurement_cell_projection_support_day_${day}`,
    source_projection_hash: "a".repeat(64),
    source_gate_id: `customer_data_model_gate_support_day_${day}`,
    source_gate_hash: "b".repeat(64),
    source_promotion_decision_id: `customer_data_model_promotion_day_${day}`,
    source_promotion_decision_hash: "c".repeat(64),
    implementation_decision_id: `customer_data_model_implementation_day_${day}`,
    implementation_decision_hash: "d".repeat(64),
    measurement_cell_id: "measurement_cell_support_resolution",
    measurement_cell_assembly_run_id: `assembly_run_internal_day_${day}`,
    measurement_plan_id: "measurement_plan_customer_support_2026_05",
    value_hypothesis_id: "value_hypothesis_support_capacity",
    value_hypothesis_ref: "value_hypothesis_ref_support_capacity",
    value_hypothesis_binding_state: "bound",
    approved_blueprint_ref: "approved_blueprint_support_capacity",
    approved_blueprint_payload_hash: "e".repeat(64),
    blueprint_expectation_ref: "blueprint_expectation_support_resolution",
    expectation_path_id: "expectation_path_support_resolution",
    expectation_path_version: 1,
    expectation_path_hash: "f".repeat(64),
    approval_state: "approved",
    approved_at: "2026-06-24T00:00:00.000Z",
    approved_by_role: "value_realization_pm",
    value_driver: "Capacity",
    metric_id: "support_median_resolution_hours",
    metric_definition_ref: "metric_definition_support_resolution",
    metric_definition_hash: "1".repeat(64),
    metric_owner_approval_state: "approved",
    metric_direction: "decrease",
    metric_unit: "hours",
    expected_metric_lag_days: 30,
    workflow_family: "customer_support_case_resolution",
    workflow_id: "workflow_support_case_resolution",
    function_area: "Customer Support",
    cohort_key: "function:customer_support",
    window_mode: "milestone",
    milestone_day: day,
    baseline_window_start: "2026-02-01",
    baseline_window_end: "2026-03-31",
    comparison_window_start: `2026-${String(Math.min(12, 4 + Math.floor(day / 30))).padStart(2, "0")}-01`,
    comparison_window_end: `2026-${String(Math.min(12, 5 + Math.floor(day / 30))).padStart(2, "0")}-28`,
    aggregate_source_system: "bigquery_export",
    aggregate_export_review_ref: `aggregate_review_support_day_${day}`,
    aggregate_export_review_state: "passed_review",
    aggregate_source_export_ref: `source_export_support_day_${day}`,
    aggregate_export_review_hash: "2".repeat(64),
    pipeline_dry_run_ref: `pipeline_dry_run_support_day_${day}`,
    pipeline_boundary_hash: "3".repeat(64),
    source_refs: {
      vbd_source_ref: `vbd_probe_support_day_${day}`,
      token_source_ref: `token_probe_support_day_${day}`
    },
    aggregate_boundary_ref: {
      source_inventory_manifest_ref: `source_inventory_support_day_${day}`,
      aggregate_extraction_manifest_ref: `aggregate_extraction_support_day_${day}`,
      pipeline_run_review_manifest_ref: `pipeline_review_support_day_${day}`
    },
    assembly_decision: "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER",
    validation_valid: true,
    assembly_validation_valid: true,
    validation_gap_count: 0,
    assembly_validation_gap_count: 0,
    required_caveats: [
      "Aggregate evidence status only; customer-owned outcome review remains required."
    ],
    blocked_uses: [
      "realized_roi",
      "finance_output",
      "causality_claim",
      "productivity_claim",
      "confidence_output",
      "probability_output",
      "score_output",
      "live_bigquery_execution",
      "live_sigma_execution",
      "customer_facing_financial_output"
    ],
    version: 1,
    supersedes_id: null,
    generated_at: `2026-06-25T${String(10 + Math.min(13, Math.floor(day / 30))).padStart(2, "0")}:00:00.000Z`,
    created_at: `2026-06-25T${String(10 + Math.min(13, Math.floor(day / 30))).padStart(2, "0")}:01:00.000Z`,
    created_by_role: "value_realization_pm",
    ...overrides
  };
}

function completeSnapshots(overrides = {}) {
  return REQUIRED_MILESTONES.map((day) => compactCustomerSnapshot(day, overrides[day] ?? {}));
}

function proofInput(overrides = {}) {
  return {
    controlled_repeated_pilot_evidence_package: repeatedPackage(),
    customer_data_model_snapshots: completeSnapshots(),
    ...overrides
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function searchText(args) {
  try {
    return execFileSync("rg", args, {
      cwd: process.cwd(),
      encoding: "utf8"
    });
  } catch (error) {
    if (error.status === 1) return "";
    throw error;
  }
}

test("customer evidence history read-path proof rejects unsafe generated_at without echo", () => {
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject({
    ...proofInput(),
    generated_at: "SELECT user_id FROM raw_rows",
    raw_rows: [{ employee_email: "person@example.com" }]
  });
  const serialized = JSON.stringify(proof);
  const validation = validateCustomerEvidenceHistoryReadPathProof(proof);

  assert.equal(proof.proof_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(hasNestedKey(proof, "raw_rows"), false);
});

test("customer evidence history read-path proof passes complete compact milestone history", () => {
  const input = proofInput();
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const validation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    sourceInput: input
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(proof.proof_state, "COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN");
  assert.equal(proof.source_bound, true);
  assert.deepEqual(proof.source_series_ref.required_milestone_days, REQUIRED_MILESTONES);
  assert.deepEqual(proof.customer_history_ref.required_milestone_days, REQUIRED_MILESTONES);
  assert.deepEqual(proof.customer_history_ref.observed_milestone_days, REQUIRED_MILESTONES);
  assert.deepEqual(proof.customer_history_ref.missing_milestone_days, []);
  assert.equal(proof.customer_history_ref.latest_clear_milestone_count, 6);
  assert.equal(
    proof.read_path_result.compact_snapshot_projection_state,
    "COMPACT_SNAPSHOT_ROWS_SATISFY_CUSTOMER_HISTORY_READ_PATH"
  );
  assert.equal(
    proof.read_path_result.customer_history_projection_state,
    "CUSTOMER_HISTORY_CONTINUITY_CAN_BE_SERVED_FROM_COMPACT_SNAPSHOTS"
  );
  assert.equal(
    proof.read_path_result.evidence_continuity_placement_state,
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT"
  );
  assert.equal(proof.proof_scope.measurement_cell_series_persistence_authorized, false);
  assert.equal(proof.proof_scope.route_authorized, false);
  assert.equal(proof.proof_scope.ui_authorized, false);
  assert.equal(proof.proof_scope.export_authorized, false);
  assert.equal(proof.feeds.durable_series_read_path_decision, true);
  assert.equal(proof.feeds.measurement_cell_series_snapshot_implementation_decision, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(proof.feeds[feed], false, `${feed} must remain false`);
  }

  const serialized = JSON.stringify(proof);
  assert.equal(serialized.includes("org-northstar-enterprise"), false);
  assert.equal(serialized.includes("client-internal"), false);
  assert.equal(serialized.includes("customer_data_model_snapshot:"), false);
  assert.equal(serialized.includes("source_export_support_day"), false);
  assert.equal(serialized.includes("pipeline_dry_run_support_day"), false);
  assert.equal(serialized.includes('"source_refs"'), false);
  assert.equal(serialized.includes('"aggregate_boundary_ref"'), false);
  assert.equal(serialized.includes('"raw_rows"'), false);
  assert.equal(serialized.includes('"query_text"'), false);
});

test("customer evidence history read-path proof holds for each missing milestone", () => {
  for (const missingDay of REQUIRED_MILESTONES) {
    const input = proofInput({
      customer_data_model_snapshots: completeSnapshots().filter(
        (snapshot) => snapshot.milestone_day !== missingDay
      )
    });
    const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
    const validation = validateCustomerEvidenceHistoryReadPathProof(proof, {
      sourceInput: input
    });

    assert.equal(proof.proof_state, "HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_INPUTS");
    assert.equal(validation.valid, false);
    assert.ok(
      proof.hold_reasons.includes("customer_history_missing_required_milestones"),
      String(missingDay)
    );
    assert.deepEqual(proof.customer_history_ref.missing_milestone_days, [missingDay]);
    assert.equal(proof.feeds.durable_series_read_path_decision, false);
    assert.equal(proof.feeds.measurement_cell_series_snapshot_implementation_decision, false);
  }
});

test("customer evidence history read-path proof does not use stale clear rows when latest row is held", () => {
  const staleClearDay90 = compactCustomerSnapshot(90, {
    id: "db_row_stale_clear_day_90",
    version: 1,
    generated_at: "2026-06-25T10:00:00.000Z",
    created_at: "2026-06-25T10:01:00.000Z"
  });
  const latestHeldDay90 = compactCustomerSnapshot(90, {
    id: "db_row_latest_held_day_90",
    version: 2,
    supersedes_id: "db_row_stale_clear_day_90",
    validation_valid: false,
    validation_gap_count: 1,
    generated_at: "2026-06-25T11:00:00.000Z",
    created_at: "2026-06-25T11:01:00.000Z"
  });
  const input = proofInput({
    customer_data_model_snapshots: [
      ...completeSnapshots().filter((snapshot) => snapshot.milestone_day !== 90),
      staleClearDay90,
      latestHeldDay90
    ]
  });
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const validation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    sourceInput: input
  });

  assert.equal(validation.valid, false);
  assert.equal(proof.proof_state, "HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_INPUTS");
  assert.equal(proof.customer_history_ref.stale_candidate_rows_ignored, 1);
  assert.deepEqual(proof.customer_history_ref.missing_milestone_days, [90]);
  assert.ok(proof.hold_reasons.includes("latest_customer_snapshots_not_clear"));
});

test("customer evidence history read-path proof holds on incomplete repeated Series evidence", () => {
  const input = proofInput({
    controlled_repeated_pilot_evidence_package: repeatedPackage({
      milestoneDays: [30, 60, 90, 180, 365]
    })
  });
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const validation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    sourceInput: input
  });

  assert.equal(proof.proof_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES");
  assert.equal(validation.valid, false);
  assert.ok(proof.hold_reasons.includes("measurement_cell_series_invalid_or_incomplete"));
  assert.equal(proof.feeds.durable_series_read_path_decision, false);
});

test("customer evidence history read-path proof rejects unsafe side doors without echo", () => {
  const input = proofInput({
    customer_data_model_snapshots: [
      ...completeSnapshots(),
      {
        raw_rows: [{ employee_email: "person@example.com" }],
        query_text: "SELECT user_id FROM raw_rows",
        confidence_score: 0.9,
        roi: 100
      }
    ],
    measurement_cell_series_snapshots: [{ unsafe: true }],
    evidence_snapshots_extension: true,
    backend_route: true,
    frontend_ui: true,
    live_bigquery_execution: true
  });
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const serialized = JSON.stringify(proof);
  const validation = validateCustomerEvidenceHistoryReadPathProof(proof);

  assert.equal(proof.proof_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(hasNestedKey(proof, "measurement_cell_series_snapshots"), false);
  assert.equal(hasNestedKey(proof, "evidence_snapshots_extension"), false);
});

test("customer evidence history proof validation rejects forged source ref drift after rehash", () => {
  const input = proofInput();
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const forged = clone(proof);
  forged.customer_history_ref.latest_clear_milestone_count = 5;
  forged.customer_history_ref.history_group_hash = sha256Json({
    forged: true
  });
  forged.proof_hash = customerEvidenceHistoryReadPathProofHash(forged);

  const validation = validateCustomerEvidenceHistoryReadPathProof(forged, {
    sourceInput: input
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceInput/.test(gap) || /customer_history_ref/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("customer evidence history read-path proof remains route, UI, schema, and migration free", () => {
  assert.ok(
    existsSync("docs/contracts/ai-value-customer-evidence-history-read-path-proof/README.md"),
    "customer evidence history read-path proof contract README must exist"
  );

  const physicalSurfaceMatches = searchText([
    "-n",
    "measurement_cell_series_snapshots|evidence_continuity_snapshot|customer_evidence_history_route",
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations",
    "backend/src",
    "frontend/src/pages",
    "frontend/src/lib"
  ]);
  assert.equal(physicalSurfaceMatches, "");
});
