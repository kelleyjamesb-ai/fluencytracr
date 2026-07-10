import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_SCHEMA_VERSION,
  buildAIFluencyInstrumentSnapshotFromObject,
  validateAIFluencyInstrumentSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function baseInput(overrides = {}) {
  return {
    schema_version: AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_SCHEMA_VERSION,
    client_id: "client-atlas",
    org_id: "org-atlas",
    instrument_id: "ai-fluency-instrument-24",
    instrument_version: "2.3",
    collection_wave_id: "baseline-2026-01",
    collection_mode: "aggregate_export",
    function_area: "Customer Success",
    workflow_family: "account_health_review",
    cohort_key: "cs-approved-aggregate",
    window_start: "2026-01-01",
    window_end: "2026-01-31",
    eligible_population_count: 80,
    response_count: 44,
    response_rate: 0.55,
    overall_ai_fluency_score: 72,
    confidence_score: 70,
    usage_quality_score: 74,
    behavior_change_score: 68,
    leadership_reinforcement_score: 76,
    capability_growth_score: 73,
    overall_standard_error: 1.8,
    dimension_standard_errors: {
      overall_ai_fluency: 1.8,
      confidence: 2.0,
      usage_quality: 1.9,
      behavior_change: 2.2,
      leadership_reinforcement: 2.1,
      capability_growth: 2.0
    },
    suppression_state: "none",
    k_min_posture: "aggregate_k_min_met",
    source_owner_role: "AI Fluency instrument owner",
    owner_approval_state: "approved",
    review_state: "approved_for_model_context",
    source_adapter: "controlled_json_import",
    source_ref: "ai-fluency-snapshot://atlas/baseline/customer-success",
    source_hash: HASH_A,
    caveats: ["synthetic aggregate fixture"],
    ...overrides
  };
}

function comparable(snapshot) {
  return {
    client_id: snapshot.client_id,
    org_id: snapshot.org_id,
    instrument_id: snapshot.instrument_id,
    instrument_version: snapshot.instrument_version,
    collection_wave_id: snapshot.collection_wave_id,
    function_area: snapshot.function_area,
    workflow_family: snapshot.workflow_family,
    cohort_key: snapshot.cohort_key,
    window_start: snapshot.window_start,
    window_end: snapshot.window_end,
    overall_ai_fluency_score: snapshot.overall_ai_fluency_score,
    confidence_score: snapshot.confidence_score,
    source_hash: snapshot.source_hash
  };
}

test("canonical snapshot validates as aggregate source context only", () => {
  const snapshot = buildAIFluencyInstrumentSnapshotFromObject(baseInput());
  const result = validateAIFluencyInstrumentSnapshot(snapshot);

  assert.equal(result.valid, true);
  assert.equal(result.feeds.longitudinal_model_context, true);
  assert.equal(result.feeds.full_fluency_measurement_model, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(snapshot.aggregate_only, true);
  assert.equal(snapshot.person_level_data_present, false);
  assert.equal(snapshot.customer_output_authorized, false);
  assert.equal(snapshot.confidence_output_authorized, false);
});

test("Apps Script, controlled JSON, and future API fixtures normalize to the same snapshot authority", () => {
  const appScript = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({
      source_adapter: "google_apps_script_aggregate_export",
      dashboard_export_id: "baseline-2026-01",
      collection_mode: "aggregated_dashboard_export"
    })
  );
  const controlledJson = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({ source_adapter: "controlled_json_import" })
  );
  const futureApi = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({
      source_adapter: "future_instrument_api_fixture",
      collectionMode: "aggregate_api_fixture",
      source: {
        adapter: "future_instrument_api_fixture",
        source_ref: "ai-fluency-snapshot://atlas/baseline/customer-success",
        source_hash: HASH_A
      }
    })
  );

  assert.deepEqual(comparable(appScript), comparable(controlledJson));
  assert.deepEqual(comparable(futureApi), comparable(controlledJson));
  assert.equal(validateAIFluencyInstrumentSnapshot(appScript).valid, true);
  assert.equal(validateAIFluencyInstrumentSnapshot(controlledJson).valid, true);
  assert.equal(validateAIFluencyInstrumentSnapshot(futureApi).valid, true);
});

test("missing uncertainty stays visible and blocks full measurement-model authorization", () => {
  const snapshot = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({
      overall_standard_error: undefined,
      dimension_standard_errors: {}
    })
  );
  const result = validateAIFluencyInstrumentSnapshot(snapshot);

  assert.equal(result.valid, true);
  assert.equal(snapshot.measurement_uncertainty_state, "missing_uncertainty_visible");
  assert.equal(snapshot.full_fluency_measurement_model_authorized, false);
  assert.equal(result.feeds.full_fluency_measurement_model, false);
});

test("partial uncertainty and camelCase uncertainty are handled explicitly", () => {
  const partial = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({
      dimension_standard_errors: {
        overall_ai_fluency: 1.8,
        confidence: 2.0
      }
    })
  );
  assert.equal(partial.measurement_uncertainty_state, "missing_uncertainty_visible");

  const futureApi = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({
      dimension_standard_errors: undefined,
      dimensionStandardErrors: {
        overall_ai_fluency: 1.8,
        confidence: 2.0,
        usage_quality: 1.9,
        behavior_change: 2.2,
        leadership_reinforcement: 2.1,
        capability_growth: 2.0
      }
    })
  );
  assert.equal(futureApi.measurement_uncertainty_state, "aggregate_uncertainty_available");
});

test("missing aggregate coverage fields reject", () => {
  const missingCoverage = validateAIFluencyInstrumentSnapshot(
    baseInput({
      eligible_population_count: undefined,
      response_rate: undefined
    })
  );
  assert.equal(missingCoverage.valid, false);
  assert.ok(
    missingCoverage.gaps.some((gap) => gap.includes("eligible_population_count is missing"))
  );
  assert.ok(missingCoverage.gaps.some((gap) => gap.includes("response_rate is missing")));

  const impossibleCoverage = validateAIFluencyInstrumentSnapshot(
    baseInput({
      eligible_population_count: 40,
      response_count: 44,
      response_rate: 1.1
    })
  );
  assert.equal(impossibleCoverage.valid, false);
  assert.ok(
    impossibleCoverage.gaps.some((gap) =>
      gap.includes("response_count must not exceed eligible_population_count")
    )
  );
  assert.ok(
    impossibleCoverage.gaps.some((gap) => gap.includes("response_rate must be between 0 and 1"))
  );
});

test("baseline and retest snapshots remain independently traceable", () => {
  const baseline = buildAIFluencyInstrumentSnapshotFromObject(baseInput());
  const retest = buildAIFluencyInstrumentSnapshotFromObject(
    baseInput({
      collection_wave_id: "retest-2026-07",
      window_start: "2026-07-01",
      window_end: "2026-07-31",
      source_ref: "ai-fluency-snapshot://atlas/retest/customer-success",
      source_hash: HASH_B,
      overall_ai_fluency_score: 78
    })
  );

  assert.notEqual(baseline.snapshot_id, retest.snapshot_id);
  assert.notEqual(baseline.collection_wave_id, retest.collection_wave_id);
  assert.notEqual(baseline.source_hash, retest.source_hash);
  assert.equal(validateAIFluencyInstrumentSnapshot(baseline).valid, true);
  assert.equal(validateAIFluencyInstrumentSnapshot(retest).valid, true);
});

test("respondent-level leakage rejects before model assembly", () => {
  const unsafe = baseInput({
    respondent_id: "respondent-abc123",
    raw_answers: [{ q1: "free text" }],
    source_ref: "ai-fluency-snapshot://person@example.com/baseline"
  });
  const result = validateAIFluencyInstrumentSnapshot(unsafe);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.longitudinal_model_context, false);
  assert.ok(result.gaps.some((gap) => gap.includes("forbidden")));
});

test("raw unsafe boundary flags cannot be normalized away", () => {
  const result = validateAIFluencyInstrumentSnapshot(
    baseInput({
      aggregate_only: false,
      person_level_data_present: true,
      contains_respondent_level_data: true,
      boundary_policy: {
        creates_backend_routes: true
      },
      confidence_output_authorized: true
    })
  );

  assert.equal(result.valid, false);
  assert.equal(result.feeds.longitudinal_model_context, false);
  assert.ok(result.gaps.some((gap) => gap.includes("aggregate_only raw input")));
  assert.ok(result.gaps.some((gap) => gap.includes("person_level_data_present raw input")));
  assert.ok(result.gaps.some((gap) => gap.includes("boundary_policy.creates_backend_routes")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_output_authorized raw input")));
});
