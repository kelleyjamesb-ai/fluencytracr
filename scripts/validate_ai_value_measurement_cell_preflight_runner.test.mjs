import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MEASUREMENT_CELL_PREFLIGHT_RUNNER_SCHEMA_VERSION,
  runMeasurementCellPreflightFromObject,
  validateMeasurementCellPreflight
} from "./run_ai_value_measurement_cell_preflight_runner.mjs";
import {
  buildControlledAggregateFixtureForMilestone
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";
import {
  reviewedAggregateContextHash,
  reviewedBlueprintExpectationHash
} from "./run_ai_value_controlled_measurement_cell_assembly.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PLAN_PATH =
  "docs/contracts/ai-value-measurement-plan/examples/full-playbook-ready-plan.json";

const FORBIDDEN_OUTPUT_KEYS = [
  "raw_rows",
  "rows",
  "records",
  "events",
  "query_text",
  "sql_text",
  "bigquery_sql",
  "sigma_query",
  "prompt",
  "prompt_text",
  "response_text",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "measurement_plan",
  "data_spine_readiness",
  "source_package_review_queue",
  "real_data_intake_packet_run",
  "pilot_intake_run",
  "source_packages",
  "blueprint_operator_source_handoff",
  "measurement_cell_input",
  "measurement_cell",
  "measurement_cell_series",
  "child_payload",
  "full_payload",
  "assembly_payload",
  "source_package_payload",
  "handoff_bundle",
  "expectation_path_registry",
  "payload_json",
  "validation_json",
  "source_refs_json",
  "blueprint_path_binding_json",
  "confidence",
  "score",
  "roi",
  "ebitda",
  "finance_context",
  "causality",
  "productivity",
  "probability"
];

const REQUIRED_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "source_package_clearance",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "backend_route",
  "frontend_ui",
  "schema_creation",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "research_model_feed",
  "model_likelihood_output",
  "value_contribution_model_feed",
  "model_result_output",
  "financial_claim"
];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "source_package_clearance",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "migration_creation",
  "repository_creation",
  "output_file_write",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "finance_context_investigation",
  "realized_roi",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "score_like_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const REQUIRED_CAVEATS = [
  "Measurement Cell preflight is an internal proof only.",
  "Snapshot candidate proof does not persist Measurement Cell snapshots.",
  "No live BigQuery, Sigma, Glean, or customer connector execution occurs.",
  "Preflight output is not customer-facing output, finance output, or value contribution modeling."
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}

function sha256Json(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function stripPreflightIntegrityHash(preflight) {
  const next = clone(preflight);
  delete next.preflight_integrity_hash;
  return next;
}

function stripSnapshotCandidateHash(candidate) {
  const next = clone(candidate);
  delete next.snapshot_candidate_hash;
  return next;
}

function assertValidationGap(validation, token) {
  assert.ok(
    validation.gaps.some((gap) => gap.includes(token)),
    `missing gap for ${token}: ${validation.gaps.join("; ")}`
  );
}

function setFixtureWindows(fixture, baselineWindow, comparisonWindow) {
  fixture.data_spine_input.baseline_window = clone(baselineWindow);
  fixture.data_spine_input.comparison_window = clone(comparisonWindow);
  for (const source of Object.values(fixture.data_spine_input.sources ?? {})) {
    source.baseline_window = clone(baselineWindow);
    source.comparison_window = clone(comparisonWindow);
  }
  fixture.blueprint_extraction_input.baselineWindow = clone(baselineWindow);
  fixture.blueprint_extraction_input.comparisonWindow = clone(comparisonWindow);
  for (const record of fixture.scrubbed_glean_exports ?? []) {
    record.covered_window = clone(comparisonWindow);
  }
  fixture.expected.reviewed_aggregate_context_hash =
    reviewedAggregateContextHash(fixture);
  fixture.expected.reviewed_blueprint_expectation_hash =
    reviewedBlueprintExpectationHash(fixture);
}

function setPlanWindows(plan, baselineWindow, comparisonWindow) {
  plan.windows.baseline_window_start = baselineWindow.window_start;
  plan.windows.baseline_window_end = baselineWindow.window_end;
  plan.windows.comparison_window_start = comparisonWindow.window_start;
  plan.windows.comparison_window_end = comparisonWindow.window_end;
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function assertPassedPreflight(preflight, sourceSystem) {
  const validation = validateMeasurementCellPreflight(preflight, {
    sourceFixture: readJson(FIXTURE_PATH),
    sourceSystem
  });
  const serialized = JSON.stringify(preflight).toLowerCase();

  assert.equal(preflight.schema_version, MEASUREMENT_CELL_PREFLIGHT_RUNNER_SCHEMA_VERSION);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(preflight.preflight_state, "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT");
  assert.equal(preflight.source_system, sourceSystem);
  assert.equal(preflight.engine_executed, true);
  assert.equal(preflight.aggregate_export_review_ref.review_state.startsWith("PASSED_"), true);
  assert.equal(
    preflight.aggregate_export_review_ref.source_export_ref,
    preflight.pipeline_ref.source_export_ref
  );
  assert.equal(preflight.pipeline_ref.dry_run_state, "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW");
  assert.equal(
    preflight.assembly_ref.assembly_state,
    "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW"
  );
  assert.equal(
    preflight.assembly_ref.assembly_decision,
    "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER"
  );
  assert.equal(
    preflight.snapshot_candidate_ref.snapshot_candidate_state,
    "READY_FOR_MEASUREMENT_CELL_SNAPSHOT_PERSISTENCE_REVIEW"
  );
  assert.equal(
    preflight.snapshot_candidate_ref.snapshot_candidate_schema_version,
    "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_CANDIDATE_2026_06"
  );
  assert.deepEqual(preflight.snapshot_candidate_ref.aggregate_boundary_ref, {
    source_system: sourceSystem,
    review_id: preflight.aggregate_export_review_ref.review_id,
    review_state: preflight.aggregate_export_review_ref.review_state,
    source_export_ref: preflight.aggregate_export_review_ref.source_export_ref,
    aggregate_definition_ref:
      preflight.aggregate_export_review_ref.aggregate_definition_ref,
    aggregate_output_ref: preflight.aggregate_export_review_ref.aggregate_output_ref,
    review_hash: preflight.aggregate_export_review_ref.review_hash,
    pipeline_dry_run_id: preflight.pipeline_ref.dry_run_id,
    pipeline_source_export_ref: preflight.pipeline_ref.source_export_ref,
    pipeline_boundary_hash:
      preflight.snapshot_candidate_ref.aggregate_boundary_ref.pipeline_boundary_hash
  });
  assert.equal(
    preflight.snapshot_candidate_ref.aggregate_boundary_ref.source_export_ref,
    preflight.pipeline_ref.source_export_ref
  );
  assert.match(
    preflight.snapshot_candidate_ref.aggregate_boundary_ref.review_hash,
    /^[a-f0-9]{64}$/
  );
  assert.match(
    preflight.snapshot_candidate_ref.aggregate_boundary_ref.pipeline_boundary_hash,
    /^[a-f0-9]{64}$/
  );
  assert.equal(
    preflight.snapshot_candidate_ref.measurement_cell_id,
    "measurement_cell_org_example_customer_support_customer_support_case_resolution_workflow_family_customer_support_case_resolution_eligible_cases_2300_day_30_support_median_resolution_hours"
  );
  assert.deepEqual(preflight.snapshot_candidate_ref.source_refs, {
    blueprint_source_ref: "blueprint_parse_support_approved_day_30",
    ai_fluency_source_ref: "ai_fluency_support_day_30",
    vbd_source_ref: "scrubbed_glean_vbd_token_support_day_30",
    metric_source_ref: "support_metric_resolution_hours_day_30",
    token_source_ref: "scrubbed_glean_vbd_token_support_day_30"
  });
  for (const [key, value] of Object.entries(preflight.snapshot_candidate_ref.source_refs)) {
    assert.notEqual(value, key, `${key} must carry the reviewed source ref, not the key name`);
  }
  assert.equal(
    preflight.snapshot_candidate_ref.expectation_path_id,
    "expectation_path_support_median_resolution_hours_capacity"
  );
  assert.equal(preflight.snapshot_candidate_ref.metric_id, "support_median_resolution_hours");
  assert.equal(preflight.snapshot_candidate_ref.window_mode, "milestone");
  assert.equal(preflight.snapshot_candidate_ref.milestone_day, 30);
  assert.match(preflight.preflight_integrity_hash, /^[a-f0-9]{64}$/);
  assert.match(preflight.snapshot_candidate_ref.snapshot_candidate_hash, /^[a-f0-9]{64}$/);
  assert.match(preflight.pipeline_ref.manifest_hash, /^[a-f0-9]{64}$/);
  assert.match(preflight.pipeline_ref.aggregate_fixture_hash, /^[a-f0-9]{64}$/);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(preflight.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "runs_bigquery",
    "runs_sigma",
    "runs_glean_query",
    "runs_customer_connectors",
    "persists_snapshot",
    "persists_pipeline_run",
    "creates_route",
    "creates_ui",
    "creates_schema",
    "creates_migration",
    "creates_repository",
    "writes_output_file",
    "emits_model_likelihood_output",
    "authorizes_value_contribution_model",
    "emits_model_result_output",
    "emits_outcome_proof_claim",
    "emits_workforce_efficiency_claim",
    "computes_financial_return",
    "emits_financial_output",
    "customer_facing_output",
    "customer_facing_economic_output"
  ]) {
    assert.equal(preflight.boundary_policy[field], false, `${field} must remain false`);
  }
  assert.deepEqual(preflight.blocked_uses, REQUIRED_BLOCKED_USES);
  assert.deepEqual(preflight.required_caveats, REQUIRED_CAVEATS);
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(preflight, key), false, `${key} must not be emitted`);
  }
  for (const token of [
    "select ",
    "person@example.com",
    "raw_rows",
    "query_text",
    "prompt_text",
    "transcript",
    "payload_json",
    "confidence",
    "full_payload"
  ]) {
    assert.equal(serialized.includes(token), false, `${token} must not leak`);
  }
}

test("Measurement Cell preflight runner passes BigQuery aggregate review through snapshot candidate proof", () => {
  const preflight = runMeasurementCellPreflightFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export"
  });

  assertPassedPreflight(preflight, "bigquery_export");
});

test("Measurement Cell preflight runner passes Sigma-shaped aggregate manifests without live Sigma execution", () => {
  const preflight = runMeasurementCellPreflightFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export"
  });

  assertPassedPreflight(preflight, "sigma_export");
  assert.equal(
    preflight.aggregate_export_review_ref.review_state,
    "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW"
  );
  assert.equal(preflight.boundary_policy.runs_sigma, false);
});

test("Measurement Cell preflight runner blocks live execution, raw rows, query text, and unsafe refs", () => {
  const preflight = runMeasurementCellPreflightFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    manifestOverrides: {
      execution_policy: {
        runs_bigquery: true,
        runs_sigma: false,
        runs_glean_query: false,
        runs_live_connectors: true,
        runs_customer_connectors: true
      },
      query_text: "SELECT user_id, employee_email FROM raw_rows",
      raw_rows: [{ user_id: "user_123", employee_email: "person@example.com" }],
      source_refs: {
        aggregate_export_ref: "query_text_user_id_probability"
      }
    }
  });
  const validation = validateMeasurementCellPreflight(preflight);
  const serialized = JSON.stringify(preflight);

  assert.equal(preflight.preflight_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.equal(preflight.engine_executed, false);
  assert.equal(preflight.snapshot_candidate_ref, null);
  assert.equal(preflight.feeds.measurement_cell_snapshot_candidate_proof, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
});

test("Measurement Cell preflight validator rejects hand-edited passed snapshot candidates", () => {
  const preflight = runMeasurementCellPreflightFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(preflight);
  tampered.snapshot_candidate_ref.metric_id = "support_escalation_rate";
  tampered.snapshot_candidate_ref.snapshot_candidate_hash = "a".repeat(64);
  tampered.preflight_integrity_hash = "b".repeat(64);

  const validation = validateMeasurementCellPreflight(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "snapshot_candidate_ref.metric_id",
    "snapshot_candidate_hash",
    "preflight_integrity_hash"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("Measurement Cell preflight validator rejects aggregate boundary proof drift", () => {
  const preflight = runMeasurementCellPreflightFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(preflight);
  tampered.snapshot_candidate_ref.aggregate_boundary_ref.source_export_ref =
    "bigquery_export_other_safe_ref";
  tampered.snapshot_candidate_ref.aggregate_boundary_ref.review_state = "BLOCKED";
  tampered.snapshot_candidate_ref.snapshot_candidate_hash = "a".repeat(64);
  tampered.preflight_integrity_hash = "b".repeat(64);

  const validation = validateMeasurementCellPreflight(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "aggregate_boundary_ref",
    "source_export_ref",
    "snapshot_candidate_hash",
    "preflight_integrity_hash"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}: ${validation.gaps.join("; ")}`
    );
  }
});

test("Measurement Cell preflight validator rejects unsafe snapshot candidate source refs", () => {
  const fixture = readJson(FIXTURE_PATH);
  const preflight = runMeasurementCellPreflightFromObject(fixture);

  const keyNameValues = clone(preflight);
  keyNameValues.snapshot_candidate_ref.source_refs = Object.fromEntries(
    Object.keys(preflight.snapshot_candidate_ref.source_refs).map((key) => [key, key])
  );
  const keyNameValidation = validateMeasurementCellPreflight(keyNameValues, {
    sourceFixture: fixture
  });
  assert.equal(keyNameValidation.valid, false);
  assertValidationGap(keyNameValidation, "key name");
  assertValidationGap(keyNameValidation, "snapshot_candidate_ref.source_refs");

  const missingRequiredRef = clone(preflight);
  delete missingRequiredRef.snapshot_candidate_ref.source_refs.token_source_ref;
  const missingRequiredValidation = validateMeasurementCellPreflight(missingRequiredRef, {
    sourceFixture: fixture
  });
  assert.equal(missingRequiredValidation.valid, false);
  assertValidationGap(missingRequiredValidation, "token_source_ref is required");

  const swappedRefs = clone(preflight);
  const blueprintRef =
    swappedRefs.snapshot_candidate_ref.source_refs.blueprint_source_ref;
  swappedRefs.snapshot_candidate_ref.source_refs.blueprint_source_ref =
    swappedRefs.snapshot_candidate_ref.source_refs.ai_fluency_source_ref;
  swappedRefs.snapshot_candidate_ref.source_refs.ai_fluency_source_ref = blueprintRef;
  const swappedValidation = validateMeasurementCellPreflight(swappedRefs, {
    sourceFixture: fixture
  });
  assert.equal(swappedValidation.valid, false);
  assertValidationGap(swappedValidation, "snapshot_candidate_ref.source_refs");

  const rawLookingRef = clone(preflight);
  rawLookingRef.snapshot_candidate_ref.source_refs.vbd_source_ref =
    "select_user_id_from_raw_rows";
  const rawLookingValidation = validateMeasurementCellPreflight(rawLookingRef, {
    sourceFixture: fixture
  });
  assert.equal(rawLookingValidation.valid, false);
  assertValidationGap(rawLookingValidation, "source_refs.vbd_source_ref");
  assertValidationGap(rawLookingValidation, "unsafe text");

  for (const unsafeRef of [
    "supportjob_id_123_day_30",
    "supportuserid123_day_30",
    "supportuser_id123_day_30",
    "supportrow_id123_day_30",
    "supportrawrows_day_30",
    "supportquerytext_day_30",
    "support_metric_sql_text_day_30",
    "support_metric_prompt_text_day_30",
    "support_metric_response_text_day_30",
    "support_metric_transcript_text_day_30"
  ]) {
    const unsafeTextRef = clone(preflight);
    unsafeTextRef.snapshot_candidate_ref.source_refs.metric_source_ref = unsafeRef;
    const unsafeTextValidation = validateMeasurementCellPreflight(unsafeTextRef, {
      sourceFixture: fixture
    });
    assert.equal(unsafeTextValidation.valid, false);
    assertValidationGap(unsafeTextValidation, "source_refs.metric_source_ref");
    assertValidationGap(unsafeTextValidation, "unsafe text");
  }
});

test("Measurement Cell preflight runner holds when aggregate telemetry is suppressed", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports[1].k_min_posture.suppressed_or_unknown_slices = 1;
  const preflight = runMeasurementCellPreflightFromObject(fixture);

  assert.equal(preflight.preflight_state, "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW");
  assert.equal(preflight.engine_executed, false);
  assert.equal(preflight.snapshot_candidate_ref, null);
  assert.equal(preflight.feeds.measurement_cell_snapshot_candidate_proof, false);
  assert.ok(
    preflight.validation_summary.gaps.some((gap) =>
      gap.includes("suppressed_or_unknown_slices")
    ),
    preflight.validation_summary.gaps.join("; ")
  );
});

test("Measurement Cell preflight runner holds Sigma when aggregate telemetry is suppressed", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports[1].k_min_posture.suppressed_or_unknown_slices = 1;
  const preflight = runMeasurementCellPreflightFromObject(fixture, {
    sourceSystem: "sigma_export"
  });

  assert.equal(preflight.preflight_state, "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW");
  assert.equal(preflight.aggregate_export_review_ref.review_state, "BLOCKED");
  assert.equal(preflight.validation_summary.aggregate_export_review_valid, false);
  assert.equal(preflight.engine_executed, false);
  assert.equal(preflight.snapshot_candidate_ref, null);
});

test("Measurement Cell preflight runner binds milestone measurement-plan overrides through dry-run proof", () => {
  const baseFixture = readJson(FIXTURE_PATH);
  const { fixture, measurementPlan } = buildControlledAggregateFixtureForMilestone(
    baseFixture,
    60,
    {
      cwd: process.cwd(),
      windowMode: "milestone"
    }
  );
  const preflight = runMeasurementCellPreflightFromObject(fixture, {
    measurementPlanOverride: measurementPlan
  });
  const validation = validateMeasurementCellPreflight(preflight, {
    sourceFixture: fixture,
    measurementPlanOverride: measurementPlan
  });

  assert.equal(preflight.preflight_state, "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT");
  assert.equal(validation.valid, true);
  assert.equal(preflight.snapshot_candidate_ref.milestone_day, 60);
  assert.match(
    preflight.snapshot_candidate_ref.aggregate_boundary_ref.source_export_ref,
    /day_60$/
  );

  const unbound = runMeasurementCellPreflightFromObject(fixture);
  assert.notEqual(
    unbound.preflight_state,
    "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT"
  );
  assert.equal(unbound.snapshot_candidate_ref, null);
});

test("Measurement Cell preflight runner holds milestone date drift before snapshot candidate proof", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const measurementPlan = clone(readJson(PLAN_PATH));
  const baselineWindow = {
    window_start: "2026-05-01",
    window_end: "2026-05-31"
  };
  const comparisonWindow = {
    window_start: "2026-06-01",
    window_end: "2026-06-30"
  };
  setFixtureWindows(fixture, baselineWindow, comparisonWindow);
  setPlanWindows(measurementPlan, baselineWindow, comparisonWindow);

  const preflight = runMeasurementCellPreflightFromObject(fixture, {
    measurementPlanOverride: measurementPlan
  });

  assert.equal(preflight.preflight_state, "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY");
  assert.equal(preflight.snapshot_candidate_ref, null);
  assert.equal(preflight.validation_summary.snapshot_candidate_valid, false);
  assert.ok(
    preflight.validation_summary.gaps.some((gap) =>
      gap.includes("milestone_day must match the derived comparison-window offset")
    ),
    preflight.validation_summary.gaps.join("; ")
  );
  assert.equal(preflight.feeds.measurement_cell_snapshot_candidate_proof, false);
});

test("Measurement Cell preflight runner rejects rolling 30-day snapshot candidates before proof", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.expected.window_mode = "rolling_30_day";

  const preflight = runMeasurementCellPreflightFromObject(fixture);

  assert.equal(preflight.preflight_state, "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY");
  assert.equal(preflight.snapshot_candidate_ref, null);
  assert.equal(preflight.validation_summary.snapshot_candidate_valid, false);
  assert.ok(
    preflight.validation_summary.gaps.some((gap) =>
      gap.includes("window_mode must be milestone for snapshot candidate proof")
    ),
    preflight.validation_summary.gaps.join("; ")
  );
  assert.equal(preflight.feeds.measurement_cell_snapshot_candidate_proof, false);
});

test("Measurement Cell preflight validator rejects passed-envelope milestone date drift", () => {
  const fixture = readJson(FIXTURE_PATH);
  const preflight = runMeasurementCellPreflightFromObject(fixture);
  const tampered = clone(preflight);
  tampered.snapshot_candidate_ref.baseline_window_start = "2026-05-01";
  tampered.snapshot_candidate_ref.baseline_window_end = "2026-05-31";
  tampered.snapshot_candidate_ref.comparison_window_start = "2026-06-01";
  tampered.snapshot_candidate_ref.comparison_window_end = "2026-06-30";
  tampered.snapshot_candidate_ref.snapshot_candidate_hash = sha256Json(
    stripSnapshotCandidateHash(tampered.snapshot_candidate_ref)
  );
  tampered.preflight_integrity_hash = sha256Json(
    stripPreflightIntegrityHash(tampered)
  );

  const validation = validateMeasurementCellPreflight(tampered, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assertValidationGap(validation, "milestone_day must match the derived comparison-window offset");
});

test("Measurement Cell preflight validator rejects passed-envelope baseline range drift", () => {
  const fixture = readJson(FIXTURE_PATH);
  const preflight = runMeasurementCellPreflightFromObject(fixture);
  const tampered = clone(preflight);
  tampered.snapshot_candidate_ref.baseline_window_start = "2026-05-02";
  tampered.snapshot_candidate_ref.baseline_window_end = "2026-05-01";
  tampered.snapshot_candidate_ref.snapshot_candidate_hash = sha256Json(
    stripSnapshotCandidateHash(tampered.snapshot_candidate_ref)
  );
  tampered.preflight_integrity_hash = sha256Json(
    stripPreflightIntegrityHash(tampered)
  );

  const validation = validateMeasurementCellPreflight(tampered, {
    skipFixtureRerun: true
  });

  assert.equal(validation.valid, false);
  assertValidationGap(validation, "baseline_window_end must be after baseline_window_start");
});

test("Measurement Cell preflight validator rejects malformed baseline window starts", () => {
  const fixture = readJson(FIXTURE_PATH);
  const preflight = runMeasurementCellPreflightFromObject(fixture);
  const tampered = clone(preflight);
  tampered.snapshot_candidate_ref.baseline_window_start = "not-a-date";
  tampered.snapshot_candidate_ref.snapshot_candidate_hash = sha256Json(
    stripSnapshotCandidateHash(tampered.snapshot_candidate_ref)
  );
  tampered.preflight_integrity_hash = sha256Json(
    stripPreflightIntegrityHash(tampered)
  );

  const validation = validateMeasurementCellPreflight(tampered, {
    skipFixtureRerun: true
  });

  assert.equal(validation.valid, false);
  assertValidationGap(validation, "baseline_window_start must be a valid ISO date");
});

test("Measurement Cell preflight validator rejects open-container payload smuggling and source-ref drift", () => {
  const preflight = runMeasurementCellPreflightFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(preflight);
  tampered.pipeline_ref.source_export_ref = "bigquery_export_other_safe_ref";
  tampered.validation_summary.child_payload = {
    measurement_cell_id: "measurement_cell_smuggled"
  };
  tampered.snapshot_candidate_ref.source_refs.extra_source_ref = "safe_extra_ref";

  const validation = validateMeasurementCellPreflight(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "source_export_ref",
    "validation_summary",
    "source_refs",
    "child_payload"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}: ${validation.gaps.join("; ")}`
    );
  }
});

test("Measurement Cell preflight CLI emits compact snapshot-candidate proof", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_measurement_cell_preflight_runner.mjs",
      FIXTURE_PATH,
      "--source-system=sigma_export"
    ],
    { encoding: "utf8" }
  );
  const preflight = JSON.parse(output);

  assert.equal(preflight.source_system, "sigma_export");
  assert.equal(preflight.preflight_state, "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT");
  assert.equal(preflight.snapshot_candidate_ref.metric_id, "support_median_resolution_hours");
  assert.equal(hasNestedKey(preflight, "measurement_cell"), false);
});
