import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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
import {
  buildDurableSeriesReadPathDecisionFromObject,
  durableSeriesReadPathDecisionHash,
  validateDurableSeriesReadPathDecision
} from "./run_ai_value_durable_series_read_path_decision.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_MILESTONES = [0, 30, 60, 90, 180, 365];

const REQUIRED_FALSE_FEEDS = [
  "measurement_cell_series_snapshot_implementation_decision",
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
    comparison_window_start: "2026-04-01",
    comparison_window_end: "2026-05-31",
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

function completeSnapshots() {
  return REQUIRED_MILESTONES.map((day) => compactCustomerSnapshot(day));
}

function proofInput(overrides = {}) {
  return {
    controlled_repeated_pilot_evidence_package: repeatedPackage(),
    customer_data_model_snapshots: completeSnapshots(),
    ...overrides
  };
}

function validProof() {
  const input = proofInput();
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const validation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    sourceInput: input
  });
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return { proof, input };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("durable Series read-path decision holds Series persistence when compact history satisfies the read path", () => {
  const { proof, input } = validProof();
  const decision = buildDurableSeriesReadPathDecisionFromObject(proof);
  const validation = validateDurableSeriesReadPathDecision(decision, {
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceInput: input
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    decision.decision_state,
    "HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED"
  );
  assert.equal(decision.source_bound, true);
  assert.equal(decision.prerequisites.customer_evidence_history_proof_valid, true);
  assert.equal(decision.prerequisites.compact_snapshot_history_satisfies_read_path, true);
  assert.equal(decision.prerequisites.series_snapshot_read_model_required, false);
  assert.equal(decision.decision_scope.measurement_cell_series_persistence_authorized, false);
  assert.equal(decision.decision_scope.schema_authorized, false);
  assert.equal(decision.decision_scope.migration_authorized, false);
  assert.equal(decision.decision_scope.repository_write_authorized, false);
  assert.equal(decision.decision_scope.route_authorized, false);
  assert.equal(decision.decision_scope.ui_authorized, false);
  assert.equal(
    decision.allowed_next_step,
    "continue_customer_history_reads_from_ai_value_customer_data_model_snapshots"
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
  }
});

test("durable Series read-path decision holds when the customer history proof is incomplete", () => {
  const input = proofInput({
    customer_data_model_snapshots: completeSnapshots().filter(
      (snapshot) => snapshot.milestone_day !== 365
    )
  });
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(input);
  const decision = buildDurableSeriesReadPathDecisionFromObject(proof);
  const validation = validateDurableSeriesReadPathDecision(decision, {
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceInput: input
  });

  assert.equal(validation.valid, false);
  assert.equal(decision.decision_state, "HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF");
  assert.ok(decision.hold_reasons.includes("customer_evidence_history_proof_not_valid"));
  assert.equal(decision.feeds.measurement_cell_series_snapshot_implementation_decision, false);
});

test("durable Series read-path decision rejects unsafe wrappers without echo", () => {
  const { proof } = validProof();
  const decision = buildDurableSeriesReadPathDecisionFromObject({
    customer_evidence_history_read_path_proof: proof,
    raw_rows: [{ employee_email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    measurement_cell_series_snapshots: [{ unsafe: true }],
    backend_route: true,
    frontend_ui: true,
    probability_score: 0.9,
    roi: 100
  });
  const serialized = JSON.stringify(decision);
  const validation = validateDurableSeriesReadPathDecision(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(hasNestedKey(decision, "raw_rows"), false);
  assert.equal(hasNestedKey(decision, "measurement_cell_series_snapshots"), false);
});

test("durable Series read-path decision validation rejects source proof drift after rehash", () => {
  const { proof, input } = validProof();
  const decision = buildDurableSeriesReadPathDecisionFromObject(proof);
  const forged = clone(decision);
  forged.source_proof_ref.customer_history_hash = "a".repeat(64);
  forged.decision_hash = durableSeriesReadPathDecisionHash(forged);

  const validation = validateDurableSeriesReadPathDecision(forged, {
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceInput: input
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceCustomerEvidenceHistoryReadPathProof/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("durable Series read-path decision rejects forged ready state when compact proof says history is satisfied", () => {
  const { proof, input } = validProof();
  const decision = buildDurableSeriesReadPathDecisionFromObject(proof);
  const forged = clone(decision);
  forged.decision_state =
    "READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION";
  forged.decision_scope.measurement_cell_series_persistence_authorized = true;
  forged.feeds.measurement_cell_series_snapshot_implementation_decision = true;
  forged.validation_summary.valid = true;
  forged.validation_summary.gaps = [];
  forged.decision_hash = durableSeriesReadPathDecisionHash(forged);

  const validation = validateDurableSeriesReadPathDecision(forged, {
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceInput: input
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /decision_state/.test(gap) || /authorized/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("durable Series read-path decision rejects forged compact gap proof states in this slice", () => {
  const { proof, input } = validProof();
  const gapProof = clone(proof);
  gapProof.proof_state = "COMPACT_CUSTOMER_HISTORY_READ_PATH_GAP_PROVEN";
  gapProof.read_path_result.compact_snapshot_projection_state =
    "COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONTINUITY_READ_PATH";
  gapProof.read_path_result.customer_history_projection_state =
    "CUSTOMER_HISTORY_CONTINUITY_REQUIRES_SERIES_SNAPSHOT_READ_MODEL";
  gapProof.read_path_result.evidence_continuity_placement_state =
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_SNAPSHOT_SCOPE";
  gapProof.feeds.durable_series_read_path_decision = true;
  gapProof.proof_hash = customerEvidenceHistoryReadPathProofHash(gapProof);

  const proofValidation = validateCustomerEvidenceHistoryReadPathProof(gapProof);
  assert.equal(proofValidation.valid, false);

  const decision = buildDurableSeriesReadPathDecisionFromObject(gapProof);
  const validation = validateDurableSeriesReadPathDecision(decision, {
    sourceCustomerEvidenceHistoryReadPathProof: gapProof
  });

  assert.equal(validation.valid, false);
  assert.equal(decision.decision_state, "HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF");
  assert.equal(decision.prerequisites.series_snapshot_read_model_required, false);
  assert.equal(decision.decision_scope.measurement_cell_series_persistence_authorized, false);
  assert.equal(decision.decision_scope.schema_authorized, false);
  assert.equal(decision.decision_scope.migration_authorized, false);
  assert.equal(decision.decision_scope.repository_write_authorized, false);
  assert.equal(decision.feeds.measurement_cell_series_snapshot_implementation_decision, false);
  assert.equal(decision.feeds.measurement_cell_series_snapshot_write, false);
  assert.equal(decision.feeds.backend_route, false);
  assert.equal(decision.feeds.frontend_ui, false);

  const staleGapProof = clone(gapProof);
  staleGapProof.customer_history_ref.latest_clear_milestone_count = 5;
  staleGapProof.proof_hash = customerEvidenceHistoryReadPathProofHash(staleGapProof);
  const staleDecision = buildDurableSeriesReadPathDecisionFromObject(staleGapProof);
  const staleValidation = validateDurableSeriesReadPathDecision(staleDecision, {
    sourceCustomerEvidenceHistoryReadPathProof: staleGapProof,
    sourceInput: input
  });
  assert.equal(staleValidation.valid, false);
});
