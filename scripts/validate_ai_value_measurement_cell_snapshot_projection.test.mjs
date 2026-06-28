import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildMeasurementCellSnapshotProjectionFromObject,
  measurementCellSnapshotProjectionHash,
  validateMeasurementCellSnapshotProjection
} from "./run_ai_value_measurement_cell_snapshot_projection.mjs";

const REQUIRED_FALSE_FEEDS = [
  "customer_facing_projection",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "measurement_cell_series_persistence",
  "research_model_feed",
  "model_output",
  "finance_output",
  "probability_output",
  "score_like_output"
];

const REQUIRED_BLOCKED_USES = [
  "snapshot_read_route",
  "snapshot_export",
  "customer_facing_projection",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "rendered_readout",
  "frontend_ui",
  "live_connector_execution",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "measurement_cell_series_persistence",
  "research_model_feed",
  "contribution_model",
  "probability_output",
  "score_output",
  "realized_roi",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "raw_rows",
  "rows",
  "records",
  "query_text",
  "sql_text",
  "bigquery_sql",
  "sigma_query",
  "prompt",
  "response",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "row_id",
  "span_id",
  "job_id",
  "query_id",
  "project_id",
  "dataset_id",
  "table_id",
  "dashboard_url",
  "source_package_payload",
  "operator_handoff_bundle",
  "approved_expectation_paths",
  "confidence",
  "confidence_score",
  "probability",
  "probability_score",
  "score",
  "roi",
  "ebitda",
  "financial_output",
  "causality",
  "productivity"
];

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function recomputeAggregateHashes(snapshot) {
  const boundary = snapshot.aggregate_boundary_ref;
  const reviewHash = sha256Json({
    review_id: boundary.review_id,
    review_state: boundary.review_state,
    source_export_ref: boundary.source_export_ref,
    aggregate_definition_ref: boundary.aggregate_definition_ref,
    aggregate_output_ref: boundary.aggregate_output_ref
  });
  boundary.review_hash = reviewHash;
  snapshot.aggregate_export_review_hash = reviewHash;
  const pipelineHash = sha256Json({
    schema_version: "FT_AI_VALUE_MEASUREMENT_CELL_PIPELINE_BOUNDARY_HASH_2026_06",
    aggregate_boundary: {
      source_system: boundary.source_system,
      review_id: boundary.review_id,
      review_state: boundary.review_state,
      source_export_ref: boundary.source_export_ref,
      aggregate_definition_ref: boundary.aggregate_definition_ref,
      aggregate_output_ref: boundary.aggregate_output_ref,
      review_hash: boundary.review_hash,
      pipeline_dry_run_id: boundary.pipeline_dry_run_id,
      pipeline_source_export_ref: boundary.pipeline_source_export_ref
    },
    snapshot_binding: {
      measurement_cell_id: snapshot.measurement_cell_id,
      measurement_cell_assembly_run_id: snapshot.measurement_cell_assembly_run_id,
      measurement_plan_id: snapshot.measurement_plan_id,
      expectation_path_id: snapshot.expectation_path_id,
      metric_id: snapshot.metric_id,
      workflow_family: snapshot.workflow_family,
      workflow_id: snapshot.workflow_id ?? null,
      function_area: snapshot.function_area,
      cohort_key: snapshot.cohort_key,
      window_mode: snapshot.window_mode,
      milestone_day: snapshot.milestone_day,
      baseline_window_start: snapshot.baseline_window_start,
      baseline_window_end: snapshot.baseline_window_end,
      comparison_window_start: snapshot.comparison_window_start,
      comparison_window_end: snapshot.comparison_window_end,
      source_refs: snapshot.source_refs
    }
  });
  boundary.pipeline_boundary_hash = pipelineHash;
  snapshot.pipeline_boundary_hash = pipelineHash;
  return snapshot;
}

function safeSnapshot(overrides = {}) {
  const sourceRefs = {
    blueprint_source_ref: "blueprint_parse_support_approved_day_30",
    ai_fluency_source_ref: "ai_fluency_support_day_30",
    vbd_source_ref: "scrubbed_glean_vbd_token_support_day_30",
    metric_source_ref: "support_metric_resolution_hours_day_30",
    token_source_ref: "scrubbed_glean_vbd_token_support_day_30"
  };
  const aggregateBoundaryRef = {
    source_system: "bigquery_export",
    review_id: "bigquery_aggregate_export_review_support_day_30",
    review_state: "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW",
    source_export_ref: "bigquery_export_scrubbed_glean_vbd_token_support_day_30",
    aggregate_definition_ref: "aggregate_definition_support_resolution_day_30",
    aggregate_output_ref: "aggregate_output_support_resolution_day_30",
    review_hash: "",
    pipeline_dry_run_id: "pipeline_dry_run_support_day_30",
    pipeline_source_export_ref: "bigquery_export_scrubbed_glean_vbd_token_support_day_30",
    pipeline_boundary_hash: ""
  };
  const blueprintPathBinding = {
    expectation_path_id: "exp_path_support_resolution_capacity",
    expectation_path_version: 1,
    expectation_path_hash: "c".repeat(64),
    approved_blueprint_payload_hash: "d".repeat(64),
    approved_blueprint_ref: "blueprint_hypothesis_support_approved",
    blueprint_expectation_ref: "blueprint_expectation_support_resolution",
    approval_state: "approved",
    approved_at: "2026-05-01T00:00:00.000Z",
    approved_by_role: "workflow_owner",
    value_driver: "Capacity",
    expected_metric_id: "support_median_resolution_hours",
    expected_metric_lag_days: 30
  };
  const snapshot = {
    id: "measurement_cell_snapshot_support_day_30_v1",
    org_id: "org_northstar",
    client_id: "client_northstar",
    measurement_cell_id: "measurement_cell_support_resolution_day_30",
    measurement_cell_assembly_run_id: "measurement_cell_assembly_support_day_30",
    measurement_plan_id: "measurement_plan_support_resolution",
    aggregate_source_system: "bigquery_export",
    aggregate_export_review_ref: aggregateBoundaryRef.review_id,
    aggregate_export_review_state: aggregateBoundaryRef.review_state,
    aggregate_source_export_ref: aggregateBoundaryRef.source_export_ref,
    aggregate_export_review_hash: "",
    pipeline_dry_run_ref: aggregateBoundaryRef.pipeline_dry_run_id,
    pipeline_boundary_hash: "",
    aggregate_boundary_ref: aggregateBoundaryRef,
    value_hypothesis_id: "value_hypothesis_support_capacity",
    value_hypothesis_ref: "value_hypothesis_support_capacity_ref",
    value_hypothesis_binding_state: "bound",
    approved_blueprint_ref: blueprintPathBinding.approved_blueprint_ref,
    approved_blueprint_payload_hash: blueprintPathBinding.approved_blueprint_payload_hash,
    blueprint_expectation_ref: blueprintPathBinding.blueprint_expectation_ref,
    expectation_path_id: blueprintPathBinding.expectation_path_id,
    expectation_path_version: blueprintPathBinding.expectation_path_version,
    expectation_path_hash: blueprintPathBinding.expectation_path_hash,
    approval_state: blueprintPathBinding.approval_state,
    approved_at: blueprintPathBinding.approved_at,
    approved_by_role: blueprintPathBinding.approved_by_role,
    value_driver: blueprintPathBinding.value_driver,
    metric_id: "support_median_resolution_hours",
    metric_definition_ref: "metric_definition_support_resolution_hours",
    metric_definition_hash: "e".repeat(64),
    metric_owner_approval_state: "approved",
    metric_direction: "decrease",
    metric_unit: "hours",
    expected_metric_lag_days: 30,
    workflow_family: "customer_support",
    workflow_id: "support_resolution_workflow",
    function_area: "support",
    cohort_key: "support_agents_min_k_25",
    window_mode: "milestone",
    milestone_day: 30,
    baseline_window_start: "2026-05-01T00:00:00.000Z",
    baseline_window_end: "2026-05-31T00:00:00.000Z",
    comparison_window_start: "2026-06-01T00:00:00.000Z",
    comparison_window_end: "2026-06-30T00:00:00.000Z",
    assembly_decision: "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER",
    payload: {
      measurement_cell_id: "measurement_cell_support_resolution_day_30",
      evidence_posture: "aggregate_measurement_cell_ready",
      selected_metric_id: "support_median_resolution_hours"
    },
    assembly_payload: null,
    validation: { valid: true, gaps: [] },
    assembly_validation: { valid: true, gaps: [] },
    source_refs: sourceRefs,
    blueprint_path_binding: blueprintPathBinding,
    required_caveats: [
      "Measurement Cell Snapshot projection is internal operator review only."
    ],
    blocked_uses: REQUIRED_BLOCKED_USES,
    version: 1,
    supersedes_id: null,
    generated_at: "2026-06-24T00:00:00.000Z",
    created_at: "2026-06-24T00:00:00.000Z",
    created_by_role: "value_realization_pm"
  };
  const merged = { ...snapshot, ...overrides };
  return recomputeAggregateHashes(merged);
}

function assertRejectedWithoutEcho(projection, needle) {
  const serialized = JSON.stringify(projection);
  assert.equal(
    serialized.includes(needle),
    false,
    `projection must not echo unsafe value ${needle}`
  );
  assert.equal(
    projection.projection_state,
    "REJECTED_FOR_BOUNDARY_LEAKAGE"
  );
  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, false);
}

test("projects a safe Measurement Cell snapshot as internal operator review state only", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(safeSnapshot());
  const validation = validateMeasurementCellSnapshotProjection(projection);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(projection.projection_state, "INTERNAL_OPERATOR_PROJECTION_READY");
  assert.equal(projection.display_mode, "internal_operator_review");
  assert.equal(projection.projection_scope.internal_only, true);
  assert.equal(projection.projection_scope.compact_refs_only, true);
  assert.equal(projection.customer_exposure.customer_visible, false);
  assert.equal(
    projection.customer_exposure.exposure_state,
    "held_for_source_bound_projection_promotion"
  );
  assert.equal(
    projection.snapshot_identity.measurement_cell_id,
    "measurement_cell_support_resolution_day_30"
  );
  assert.equal(projection.pathway_binding.value_driver, "Capacity");
  assert.equal(
    projection.pathway_binding.expectation_path_id,
    "exp_path_support_resolution_capacity"
  );
  assert.equal(projection.metric_context.metric_id, "support_median_resolution_hours");
  assert.equal(projection.window_context.window_mode, "milestone");
  assert.equal(projection.window_context.milestone_day, 30);
  assert.equal(projection.source_context.aggregate_source_system, "bigquery_export");
  assert.equal(
    projection.source_context.aggregate_boundary_ref.source_export_ref,
    "bigquery_export_scrubbed_glean_vbd_token_support_day_30"
  );
  assert.equal(projection.evidence_posture.validation_valid, true);
  assert.equal(projection.feeds.snapshot_projection_internal_review, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(projection.feeds[feed], false, `${feed} must remain false`);
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    assert.equal(
      projection.blocked_uses.includes(blockedUse),
      true,
      `blocked_uses missing ${blockedUse}`
    );
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(projection, key), false, `${key} must not be emitted`);
  }
  assert.equal(JSON.stringify(projection).includes("SELECT"), false);
});

test("projects a valid Sigma snapshot with connector-boundary review state", () => {
  const snapshot = safeSnapshot();
  snapshot.aggregate_source_system = "sigma_export";
  snapshot.aggregate_boundary_ref.source_system = "sigma_export";
  snapshot.aggregate_export_review_ref = "sigma_connector_boundary_review_support_day_30";
  snapshot.aggregate_boundary_ref.review_id = "sigma_connector_boundary_review_support_day_30";
  snapshot.aggregate_export_review_state =
    "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW";
  snapshot.aggregate_boundary_ref.review_state =
    "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW";
  snapshot.aggregate_source_export_ref =
    "sigma_export_scrubbed_glean_vbd_token_support_day_30";
  snapshot.aggregate_boundary_ref.source_export_ref =
    "sigma_export_scrubbed_glean_vbd_token_support_day_30";
  snapshot.aggregate_boundary_ref.pipeline_source_export_ref =
    "sigma_export_scrubbed_glean_vbd_token_support_day_30";
  recomputeAggregateHashes(snapshot);

  const projection = buildMeasurementCellSnapshotProjectionFromObject(snapshot);
  const validation = validateMeasurementCellSnapshotProjection(projection);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(projection.projection_state, "INTERNAL_OPERATOR_PROJECTION_READY");
  assert.equal(projection.source_context.aggregate_source_system, "sigma_export");
});

test("fails closed for missing path, metric, window, and source identity", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(
    safeSnapshot({
      expectation_path_id: "",
      metric_id: "",
      window_mode: "rolling_30_day",
      aggregate_source_system: "",
      aggregate_export_review_ref: ""
    })
  );
  const validation = validateMeasurementCellSnapshotProjection(projection);

  assert.equal(validation.valid, false);
  assert.equal(projection.projection_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT");
  assert.equal(projection.feeds.snapshot_projection_internal_review, false);
  assert.match(validation.gaps.join("; "), /expectation_path_id/);
  assert.match(validation.gaps.join("; "), /metric_id/);
  assert.match(validation.gaps.join("; "), /window_mode must be milestone/);
  assert.match(validation.gaps.join("; "), /aggregate_source_system/);
});

test("fails closed when Blueprint binding fields drift from projected row fields", () => {
  const snapshot = safeSnapshot();
  snapshot.blueprint_path_binding.approved_blueprint_ref = "different_blueprint";
  snapshot.blueprint_path_binding.blueprint_expectation_ref = "different_expectation";
  snapshot.blueprint_path_binding.approved_at = "2026-06-01T00:00:00.000Z";
  snapshot.blueprint_path_binding.approved_by_role = "analytics_owner";

  const projection = buildMeasurementCellSnapshotProjectionFromObject(snapshot);
  const validation = validateMeasurementCellSnapshotProjection(projection);

  assert.equal(projection.projection_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT");
  assert.equal(validation.valid, false);
  assert.match(validation.gaps.join("; "), /approved_blueprint_ref/);
  assert.match(validation.gaps.join("; "), /blueprint_expectation_ref/);
  assert.match(validation.gaps.join("; "), /approved_at/);
  assert.match(validation.gaps.join("; "), /approved_by_role/);
});

test("fails closed when aggregate review or pipeline boundary hashes are forged", () => {
  const snapshot = safeSnapshot();
  snapshot.aggregate_export_review_hash = "f".repeat(64);
  snapshot.aggregate_boundary_ref.review_hash = "f".repeat(64);
  snapshot.pipeline_boundary_hash = "e".repeat(64);
  snapshot.aggregate_boundary_ref.pipeline_boundary_hash = "e".repeat(64);

  const projection = buildMeasurementCellSnapshotProjectionFromObject(snapshot);
  const validation = validateMeasurementCellSnapshotProjection(projection);

  assert.equal(projection.projection_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT");
  assert.equal(validation.valid, false);
  assert.match(validation.gaps.join("; "), /review_hash/);
  assert.match(validation.gaps.join("; "), /pipeline_boundary_hash/);
});

test("rejects identifier-like compact ref values before projection", () => {
  for (const unsafeRef of [
    "employee_id:12345",
    "person_id:12345",
    "row_id:abc",
    "span_id:abc",
    "project_id:warehouse",
    "dataset_id:raw",
    "table_id:events",
    "email_hash:abc123",
    "hashed_email:abc123",
    "user_hash:abc123",
    "trace_id:abc123",
    "prompt_text_export_123",
    "query_text_export_123",
    "sql_text_export_123",
    "response_content_digest_123"
  ]) {
    const snapshot = safeSnapshot({
      source_refs: {
        ...safeSnapshot().source_refs,
        vbd_source_ref: unsafeRef
      }
    });
    const projection = buildMeasurementCellSnapshotProjectionFromObject(snapshot);

    assert.equal(
      projection.projection_state,
      "REJECTED_FOR_BOUNDARY_LEAKAGE",
      unsafeRef
    );
    assert.equal(JSON.stringify(projection).includes(unsafeRef), false);
  }
});

test("rejected projections do not echo unsafe generated_at values", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject({
    ...safeSnapshot(),
    generated_at: "SELECT user_id FROM raw_rows",
    raw_rows: [{ employee_email: "person@example.com" }]
  });
  const serialized = JSON.stringify(projection);

  assert.equal(projection.projection_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
});

test("rejects unsafe source refs, live handles, raw data, prompts, transcripts, and identifiers without echo", () => {
  const snapshot = safeSnapshot({
    aggregate_source_export_ref: "bquxjob_123",
    source_refs: {
      blueprint_source_ref: "https://warehouse.example/raw",
      ai_fluency_source_ref: "ai_fluency_support_day_30",
      vbd_source_ref: "SELECT user_id FROM raw_rows",
      metric_source_ref: "support_metric_resolution_hours_day_30",
      token_source_ref: "scrubbed_glean_vbd_token_support_day_30"
    },
    payload: {
      raw_rows: [{ employee_email: "person@example.com" }],
      query_text: "SELECT user_id FROM raw_rows",
      prompt: "Summarize this transcript",
      transcript: "agent transcript"
    }
  });
  const projection = buildMeasurementCellSnapshotProjectionFromObject(snapshot);

  assertRejectedWithoutEcho(projection, "person@example.com");
  assert.equal(JSON.stringify(projection).includes("SELECT user_id"), false);
  assert.equal(JSON.stringify(projection).includes("bquxjob_123"), false);
  assert.equal(JSON.stringify(projection).includes("agent transcript"), false);
});

test("rejects full source packages, handoff bundles, expectation registries, and model or finance fields", () => {
  const snapshot = safeSnapshot({
    blueprint_path_binding: {
      ...safeSnapshot().blueprint_path_binding,
      approved_expectation_paths: [{ expectation_path_id: "other_path" }]
    },
    validation: {
      valid: true,
      source_package_payload: { raw_rows: [] },
      operator_handoff_bundle: { prompts: ["unsafe"] },
      confidence_score: 0.72,
      probability: 0.8,
      roi: 100,
      ebitda: 200,
      causality: "causal_positive_claim",
      productivity: "lift"
    }
  });
  const projection = buildMeasurementCellSnapshotProjectionFromObject(snapshot);
  const serialized = JSON.stringify(projection);

  assert.equal(projection.projection_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, false);
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(projection, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("other_path"), false);
  assert.equal(serialized.includes("causal_positive_claim"), false);
});

test("rejects customer-facing, route, UI, export, readout, and model flag smuggling", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(
    safeSnapshot({
      customer_visible: true,
      customer_facing_projection: true,
      customer_facing_output: true,
      customer_facing_financial_output: true,
      backend_route: true,
      frontend_ui: true,
      export_creation: true,
      rendered_readout: true,
      snapshot_read_route: true,
      model_output: true,
      research_model_feed: true,
      p_value: 0.03,
      credible_interval: [0.1, 0.9],
      savings: 100,
      payback: "fast"
    })
  );

  assert.equal(projection.projection_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, false);
  assert.equal(projection.customer_exposure.customer_visible, false);
  assert.equal(projection.feeds.backend_route, false);
  assert.equal(projection.feeds.frontend_ui, false);
  assert.equal(projection.feeds.export_creation, false);
  assert.equal(projection.feeds.rendered_readout, false);
  assert.equal(projection.feeds.model_output, false);
  assert.equal(hasNestedKey(projection, "p_value"), false);
  assert.equal(hasNestedKey(projection, "credible_interval"), false);
  assert.equal(JSON.stringify(projection).includes("fast"), false);
});

test("rejects governance-array smuggling without echoing nested unsafe values", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(
    safeSnapshot({
      blocked_uses: [
        ...REQUIRED_BLOCKED_USES,
        { raw_rows: [{ employee_email: "person@example.com" }] },
        "SELECT user_id FROM raw_rows"
      ],
      required_caveats: [
        "Measurement Cell Snapshot projection is internal operator review only.",
        { query_text: "SELECT user_id FROM raw_rows" }
      ]
    })
  );
  const serialized = JSON.stringify(projection);

  assert.equal(projection.projection_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(hasNestedKey(projection, "raw_rows"), false);
  assert.equal(hasNestedKey(projection, "query_text"), false);
});

test("validation rejects forged ready projections with missing identity, extra feeds, or extra governance strings", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(safeSnapshot());

  const missingIdentity = clone(projection);
  delete missingIdentity.snapshot_identity;
  missingIdentity.projection_hash = measurementCellSnapshotProjectionHash(missingIdentity);
  assert.equal(validateMeasurementCellSnapshotProjection(missingIdentity).valid, false);

  const extraFeed = clone(projection);
  extraFeed.feeds.customer_export = true;
  extraFeed.boundary_policy.customer_export = true;
  extraFeed.projection_hash = measurementCellSnapshotProjectionHash(extraFeed);
  assert.equal(validateMeasurementCellSnapshotProjection(extraFeed).valid, false);

  const extraBlockedUse = clone(projection);
  extraBlockedUse.blocked_uses.push("SELECT user_id FROM raw_rows");
  extraBlockedUse.projection_hash = measurementCellSnapshotProjectionHash(extraBlockedUse);
  assert.equal(validateMeasurementCellSnapshotProjection(extraBlockedUse).valid, false);

  const extraCaveat = clone(projection);
  extraCaveat.required_caveats.push("extra caveat");
  extraCaveat.projection_hash = measurementCellSnapshotProjectionHash(extraCaveat);
  assert.equal(validateMeasurementCellSnapshotProjection(extraCaveat).valid, false);
});

test("rejects wrapper sidecar leakage even when nested snapshot is safe", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject({
    measurement_cell_snapshot: safeSnapshot(),
    customer_facing_output: true,
    raw_rows: [{ user_id: "user_123" }]
  });
  const serialized = JSON.stringify(projection);

  assert.equal(projection.projection_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, false);
  assert.equal(serialized.includes("user_123"), false);
  assert.equal(hasNestedKey(projection, "raw_rows"), false);
});

test("validation recomputes the projection hash and rejects forged ready records", () => {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(safeSnapshot());
  const forged = clone(projection);
  forged.snapshot_identity.measurement_cell_id = "forged_cell";
  forged.projection_hash = "f".repeat(64);

  const validation = validateMeasurementCellSnapshotProjection(forged);

  assert.equal(measurementCellSnapshotProjectionHash(projection), projection.projection_hash);
  assert.equal(validation.valid, false);
  assert.match(validation.gaps.join("; "), /projection_hash must match recomputed hash/);
});

test("CLI emits a valid internal projection from a snapshot JSON file", () => {
  const input = Buffer.from(JSON.stringify(safeSnapshot())).toString("base64");
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      `const {writeFileSync,mkdtempSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');const dir=mkdtempSync(join(tmpdir(),'snapshot-projection-'));const file=join(dir,'snapshot.json');writeFileSync(file,Buffer.from('${input}','base64').toString());const {execFileSync}=require('node:child_process');process.stdout.write(execFileSync(process.execPath,['scripts/run_ai_value_measurement_cell_snapshot_projection.mjs',file],{cwd:process.cwd()}));`
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const projection = JSON.parse(output);

  assert.equal(validateMeasurementCellSnapshotProjection(projection).valid, true);
  assert.equal(projection.projection_state, "INTERNAL_OPERATOR_PROJECTION_READY");
  assert.equal(sha256Json(projection).length, 64);
});
