import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION,
  runControlledAggregateFixtureReviewFromObject,
  validateControlledAggregateFixtureReview
} from "./run_ai_value_controlled_aggregate_fixture_review.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_FALSE_FEEDS = [
  "pipeline_run",
  "pipeline_run_id",
  "durable_pipeline_run_storage",
  "source_package_clearance",
  "measurement_cell_input",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "reportability_readiness",
  "value_hypothesis_packet_runner",
  "finance_context_investigation",
  "finance_context_investigation_planning",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "data_spine_readiness",
  "scrubbed_glean_exports",
  "real_data_intake_packet_run",
  "pilot_intake_run",
  "client_evidence_entries",
  "source_packages",
  "evidence_collection_assembly",
  "evidence_snapshot",
  "claim_readiness_handoff",
  "ai_value_objects",
  "payload_json",
  "validation_json",
  "source_refs_json"
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("controlled aggregate fixture review executes saved aggregate fixtures into a compact internal review package", () => {
  const review = runControlledAggregateFixtureReviewFromObject(readJson(FIXTURE_PATH));
  const validation = validateControlledAggregateFixtureReview(review);
  const serialized = JSON.stringify(review);

  assert.equal(
    review.schema_version,
    CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, "PASSED_INTERNAL_FIXTURE_REVIEW");
  assert.equal(review.engine_decision, "READY_FOR_MEASUREMENT_CELL_ASSEMBLY");
  assert.equal(review.engine_executed, true);
  assert.equal(review.validation_summary.fixture_valid, true);
  assert.equal(review.validation_summary.real_data_intake_valid, true);
  assert.equal(review.validation_summary.pilot_intake_valid, true);
  assert.equal(review.validation_summary.source_package_count, 5);
  assert.equal(review.internal_review_package.next_gate, "measurement_cell_assembly_candidate_only");
  assert.equal(review.feeds.internal_fixture_review, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "persisted",
    "creates_migrations",
    "creates_prisma_schema",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_ingestion_jobs",
    "runs_bigquery",
    "runs_sigma",
    "runs_glean_query",
    "writes_output_files",
    "stores_raw_source_data"
  ]) {
    assert.equal(review.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(review, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("\"raw_rows\""), false);
  assert.equal(serialized.includes("\"query_text\""), false);
  assert.equal(serialized.includes("\"user_id\""), false);
  assert.equal(
    typeof review.internal_review_package.reviewed_source_refs_hash,
    "string"
  );
});

test("controlled aggregate fixture review rejects unsafe fixture fields before engine execution", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.raw_rows = [{
    user_id: "user_123",
    transcript: "raw transcript",
    prompt_text: "Summarize person@example.com from this raw transcript"
  }];
  fixture.data_spine_input.sources.vbdToken.source_ref =
    "select_employee_email_from_raw_rows_roi_probability";
  fixture.scrubbed_glean_exports[0].source_refs = {
    aggregate_probe_id: "query_text_employee_email_probability"
  };
  fixture.roi_value = 120000;
  fixture.confidence_percent = 91;
  fixture.probability = 0.84;
  fixture.creates_backend_routes = true;
  fixture.creates_frontend_ui = true;
  fixture.persistence_table = "ai_value_pilot_runs";
  fixture.ai_value_objects = [{ object_type: "executive_packet" }];
  fixture.runs_bigquery = true;
  fixture.runs_sigma = true;
  fixture.ingestion_job = "live_connector";
  fixture.data_spine_input.sources.vbdToken.connector_status = "live_connector";

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.feeds.internal_fixture_review, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  for (const token of [
    "raw_rows",
    "user_id",
    "transcript",
    "data_spine_input.sources.vbdToken.source_ref",
    "source_refs.aggregate_probe_id",
    "roi_value",
    "confidence_percent",
    "probability",
    "creates_backend_routes",
    "creates_frontend_ui",
    "persistence_table",
    "ai_value_objects",
    "runs_bigquery",
    "runs_sigma",
    "ingestion_job",
    "connector_status"
  ]) {
    assert.ok(
      review.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("Summarize"), false);
  assert.equal(serialized.includes("raw transcript"), false);
  assert.equal(serialized.includes("select_employee_email_from_raw_rows"), false);
  assert.equal(serialized.includes("query_text_employee_email_probability"), false);
});

test("controlled aggregate fixture review holds suppressed aggregate telemetry without executing the engine", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports[0].k_min_posture = {
    minimum_cohort_threshold: 5,
    cohort_threshold_met: false,
    total_slices: 8,
    k_min_clear_slices: 7,
    suppressed_or_unknown_slices: 1
  };
  fixture.scrubbed_glean_exports[0].evidence_state = "suppressed";

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.feeds.internal_fixture_review, false);
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("suppressed_or_unknown_slices")
    )
  );
});

test("controlled aggregate fixture review holds unknown or missing aggregate telemetry before engine execution", () => {
  const missingSuppression = clone(readJson(FIXTURE_PATH));
  delete missingSuppression.scrubbed_glean_exports[1].k_min_posture.suppressed_or_unknown_slices;

  const missingSuppressionReview =
    runControlledAggregateFixtureReviewFromObject(missingSuppression);
  assert.equal(
    missingSuppressionReview.review_state,
    "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY"
  );
  assert.equal(missingSuppressionReview.engine_executed, false);
  assert.ok(
    missingSuppressionReview.validation_summary.gaps.some((gap) =>
      gap.includes("suppressed_or_unknown_slices is required")
    ),
    missingSuppressionReview.validation_summary.gaps.join("; ")
  );

  const missingAggregateSummary = clone(readJson(FIXTURE_PATH));
  delete missingAggregateSummary.scrubbed_glean_exports[2].metric_or_signal_summary;

  const missingAggregateSummaryReview =
    runControlledAggregateFixtureReviewFromObject(missingAggregateSummary);
  assert.equal(
    missingAggregateSummaryReview.review_state,
    "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY"
  );
  assert.equal(missingAggregateSummaryReview.engine_executed, false);
  assert.ok(
    missingAggregateSummaryReview.validation_summary.gaps.some((gap) =>
      gap.includes("metric_or_signal_summary.aggregate_value_present must be true")
    ),
    missingAggregateSummaryReview.validation_summary.gaps.join("; ")
  );

  const missingLayerOneSummary = clone(readJson(FIXTURE_PATH));
  delete missingLayerOneSummary.scrubbed_glean_exports[0].vbd_summary;

  const missingLayerOneSummaryReview =
    runControlledAggregateFixtureReviewFromObject(missingLayerOneSummary);
  assert.equal(
    missingLayerOneSummaryReview.review_state,
    "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY"
  );
  assert.equal(missingLayerOneSummaryReview.engine_executed, false);
  assert.ok(
    missingLayerOneSummaryReview.validation_summary.gaps.some((gap) =>
      gap.includes("vbd_summary is required")
    ),
    missingLayerOneSummaryReview.validation_summary.gaps.join("; ")
  );

  const nonAggregateLayerOneSummary = clone(readJson(FIXTURE_PATH));
  nonAggregateLayerOneSummary.scrubbed_glean_exports[0].vbd_summary.aggregate_only = false;

  const nonAggregateLayerOneSummaryReview =
    runControlledAggregateFixtureReviewFromObject(nonAggregateLayerOneSummary);
  assert.equal(
    nonAggregateLayerOneSummaryReview.review_state,
    "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY"
  );
  assert.equal(nonAggregateLayerOneSummaryReview.engine_executed, false);
  assert.ok(
    nonAggregateLayerOneSummaryReview.validation_summary.gaps.some((gap) =>
      gap.includes("vbd_summary.aggregate_only must be true")
    ),
    nonAggregateLayerOneSummaryReview.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate fixture review blocks source-ref drift against the Data Spine", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports[2].aggregate_probe_id =
    "support_metric_resolution_hours_other_day_30";

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("layer_3_business_system_outcomes aggregate ref must match Data Spine customer_metric source_ref")
    ),
    review.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate fixture review blocks Blueprint source-ref drift against expected fixture refs", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources.blueprint.source_ref =
    "blueprint_parse_support_other_day_30";

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("expected.reviewed_source_refs.blueprint")
    ),
    review.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate fixture review supports canonical snake_case source lane keys", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources = {
    blueprint: fixture.data_spine_input.sources.blueprint,
    ai_fluency: fixture.data_spine_input.sources.aiFluency,
    vbd_token: fixture.data_spine_input.sources.vbdToken,
    customer_metric: fixture.data_spine_input.sources.customerMetric,
    assumption: fixture.data_spine_input.sources.assumption,
    governance: fixture.data_spine_input.sources.governance
  };

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "PASSED_INTERNAL_FIXTURE_REVIEW");
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.validation_summary.source_package_count, 5);
});

test("controlled aggregate fixture review holds missing Data Spine lanes before engine execution", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources.vbdToken.state = "missing";
  fixture.data_spine_input.sources.vbdToken.source_ref = null;

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "HELD_FOR_DATA_SPINE");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.feeds.internal_fixture_review, false);
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("data_spine_input.sources.vbd_token")
    ),
    review.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate fixture review rejects broader finance, confidence, probability, productivity, and causality variants", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources.customerMetric.finance_context_investigation_ready = true;
  fixture.data_spine_input.sources.customerMetric.finance_review_context = {
    rolling_finance_context: true
  };
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.confidence_interval = [0.7, 0.9];
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.probability_interval = [0.4, 0.8];
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.productivity = "lift";
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.casuality_claim = "misspelled side door";

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  for (const token of [
    "finance_context_investigation_ready",
    "finance_review_context",
    "rolling_finance_context",
    "confidence_interval",
    "probability_interval",
    "productivity",
    "casuality_claim"
  ]) {
    assert.ok(
      review.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate fixture review rejects alias side doors for identifiers, raw data, connector state, and dollarized value", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.user_uuid = "user-abc";
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.user = {
    uuid: "user-abc"
  };
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.rawData = [{
    field: "unsafe"
  }];
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.rawDataRows = [{
    id: 1
  }];
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.return_on_investment =
    "blocked";
  fixture.scrubbed_glean_exports[2].metric_or_signal_summary.dollarized_value =
    42;
  fixture.data_spine_input.sources.vbdToken.connector_status = "active";
  fixture.scrubbed_glean_exports[2].caveats.push(
    "raw transcript: person@example.com should never validate"
  );
  fixture.scrubbed_glean_exports[0].blocked_uses.push(
    "raw transcript: person@example.com"
  );

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  for (const token of [
    "user_uuid",
    "user.uuid",
    "rawData",
    "rawDataRows",
    "return_on_investment",
    "dollarized_value",
    "connector_status",
    "caveats",
    "blocked_uses"
  ]) {
    assert.ok(
      review.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("raw transcript"), false);
});

test("controlled aggregate fixture review blocks unsafe text in external Measurement Plan before engine execution", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const plan = readJson(fixture.measurement_plan_path);
  const tempDir = mkdtempSync(join(tmpdir(), "ft-controlled-fixture-"));
  const planPath = join(tempDir, "plan.json");
  try {
    plan.required_caveats = ["raw transcript: person@example.com"];
    writeFileSync(planPath, JSON.stringify(plan), "utf8");
    fixture.measurement_plan_path = "plan.json";

    const review = runControlledAggregateFixtureReviewFromObject(fixture, {
      cwd: tempDir
    });
    const validation = validateControlledAggregateFixtureReview(review);
    const serialized = JSON.stringify(review);

    assert.equal(review.review_state, "BLOCKED");
    assert.equal(review.engine_executed, false);
    assert.equal(validation.valid, true, validation.gaps.join("; "));
    assert.ok(
      review.validation_summary.gaps.some((gap) =>
        gap.includes("measurement_plan.required_caveats.0")
      ),
      review.validation_summary.gaps.join("; ")
    );
    assert.equal(serialized.includes("person@example.com"), false);
    assert.equal(serialized.includes("raw transcript"), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("controlled aggregate fixture review preserves downstream BLOCKED state", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.workflow_family = "other_workflow";
  for (const source of Object.values(fixture.data_spine_input.sources)) {
    source.workflow_family = "other_workflow";
  }

  const review = runControlledAggregateFixtureReviewFromObject(fixture);
  const validation = validateControlledAggregateFixtureReview(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.engine_decision, "BLOCKED");
  assert.equal(review.engine_executed, true);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("controlled aggregate fixture review validation rejects stale or contradictory review objects", () => {
  const review = runControlledAggregateFixtureReviewFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(review);
  tampered.engine_executed = false;
  tampered.engine_decision = "BLOCKED";
  tampered.validation_summary.real_data_intake_valid = false;
  tampered.validation_summary.pilot_intake_valid = false;
  tampered.internal_review_package.next_gate = "customer_share_package";
  tampered.internal_review_package.reviewed_source_refs = {};
  tampered.internal_review_package.reviewed_source_refs_hash = "stale";

  const validation = validateControlledAggregateFixtureReview(tampered);

  assert.equal(validation.valid, false);
  for (const token of [
    "engine_executed",
    "engine_decision",
    "real_data_intake_valid",
    "pilot_intake_valid",
    "next_gate",
    "reviewed_source_refs",
    "reviewed_source_refs_hash"
  ]) {
    assert.ok(validation.gaps.some((gap) => gap.includes(token)), `missing ${token}`);
  }
});

test("controlled aggregate fixture review validation rejects nested child objects and unsafe stale gaps", () => {
  const review = runControlledAggregateFixtureReviewFromObject(readJson(FIXTURE_PATH));
  const nested = clone(review);
  nested.internal_review_package.source_packages = [];
  nested.internal_review_package.real_data_intake_packet_run = {};
  nested.internal_review_package.pilot_intake_run = {};

  const nestedValidation = validateControlledAggregateFixtureReview(nested);
  assert.equal(nestedValidation.valid, false);
  for (const token of [
    "source_packages",
    "real_data_intake_packet_run",
    "pilot_intake_run"
  ]) {
    assert.ok(
      nestedValidation.gaps.some((gap) => gap.includes(token)),
      `missing ${token}`
    );
  }

  const staleGap = clone(review);
  staleGap.review_state = "BLOCKED";
  staleGap.engine_executed = false;
  staleGap.engine_decision = null;
  staleGap.run_ref.real_data_intake_run_id = null;
  staleGap.run_ref.pilot_intake_run_id = null;
  staleGap.run_ref.measurement_plan_id = null;
  staleGap.validation_summary = {
    fixture_valid: false,
    real_data_intake_valid: false,
    pilot_intake_valid: false,
    source_package_count: 0,
    gaps: ["raw transcript: person@example.com"],
    missing_evidence: []
  };
  staleGap.internal_review_package.next_gate = "fix_fixture_before_engine_execution";
  staleGap.internal_review_package.reviewed_source_refs_hash = null;

  const staleGapValidation = validateControlledAggregateFixtureReview(staleGap);
  assert.equal(staleGapValidation.valid, false);
  assert.ok(
    staleGapValidation.gaps.some((gap) =>
      gap.includes("Unsafe validation gap value detected")
    ),
    staleGapValidation.gaps.join("; ")
  );

  const stalePreEngineBlocked = clone(review);
  stalePreEngineBlocked.review_state = "BLOCKED";
  stalePreEngineBlocked.engine_executed = false;
  stalePreEngineBlocked.engine_decision = null;
  stalePreEngineBlocked.validation_summary = {
    fixture_valid: false,
    real_data_intake_valid: false,
    pilot_intake_valid: false,
    source_package_count: 0,
    gaps: ["Forbidden field detected: raw_rows"],
    missing_evidence: []
  };
  stalePreEngineBlocked.internal_review_package.next_gate =
    "fix_fixture_before_engine_execution";
  stalePreEngineBlocked.internal_review_package.reviewed_source_refs_hash = null;

  const stalePreEngineBlockedValidation =
    validateControlledAggregateFixtureReview(stalePreEngineBlocked);
  assert.equal(stalePreEngineBlockedValidation.valid, false);
  for (const token of [
    "measurement_plan_id",
    "org_id",
    "client_id",
    "workflow_family",
    "reviewed_source_refs"
  ]) {
    assert.ok(
      stalePreEngineBlockedValidation.gaps.some((gap) => gap.includes(token)),
      `missing ${token}`
    );
  }
});
