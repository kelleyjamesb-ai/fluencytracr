import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_SCHEMA_VERSION,
  AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_SCHEMA_VERSION,
  AI_VALUE_SOURCE_INVENTORY_MANIFEST_SCHEMA_VERSION,
  validateAiValueAggregateExtractionManifest,
  validateAiValueControlledAggregateManifestChain,
  validateAiValuePipelineRunReviewManifest,
  validateAiValueSourceInventoryManifest
} from "../shared/dist/aiValueEngine/index.js";

const SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS = [
  "runs_live_connector",
  "executes_query",
  "uses_credentials",
  "stores_query_text",
  "stores_raw_rows",
  "stores_dashboard_rows",
  "stores_prompts",
  "stores_transcripts",
  "stores_user_identifiers",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_output",
  "emits_customer_facing_output"
];

const AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS = [
  "fluencytracr_runs_bigquery",
  "fluencytracr_runs_sigma",
  "fluencytracr_runs_glean_query",
  "fluencytracr_uses_credentials",
  "query_text_stored",
  "raw_rows_present",
  "dashboard_rows_present",
  "prompts_present",
  "transcripts_present",
  "user_identifiers_present",
  "source_package_cleared",
  "measurement_cell_created",
  "measurement_cell_snapshot_created",
  "measurement_cell_series_created",
  "research_model_input_created",
  "probability_output_created",
  "roi_output_created",
  "financial_output_created",
  "customer_facing_output_created"
];

const PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS = [
  "runs_live_connector",
  "executes_query",
  "uses_credentials",
  "stores_query_text",
  "stores_raw_rows",
  "stores_dashboard_rows",
  "stores_prompts",
  "stores_transcripts",
  "stores_user_identifiers",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "writes_persistence",
  "creates_route",
  "creates_ui",
  "creates_schema",
  "creates_export",
  "renders_readout",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_output",
  "emits_customer_facing_output"
];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "persistence_write",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "export_creation",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "financial_attribution",
  "realized_roi",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "source_package_cleared",
  "measurement_cell_ready",
  "measurement_cell_snapshot_ready",
  "measurement_cell_series_ready",
  "finance_context_ready",
  "customer_output_ready",
  "roi_claim",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const SOURCE_INVENTORY_CAVEATS = [
  "Source inventory manifest only; it does not authorize live connector execution.",
  "Source inventory readiness is not Source Package clearance.",
  "Source inventory readiness is not Measurement Cell readiness."
];

const AGGREGATE_EXTRACTION_CAVEATS = [
  "Aggregate extraction manifest only; it does not authorize FluencyTracr query execution.",
  "Aggregate extraction review is not Source Package clearance.",
  "Aggregate extraction review is not Measurement Cell readiness."
];

const PIPELINE_REVIEW_CAVEATS = [
  "Pipeline run review manifest only; it is manual promotion-review context.",
  "Pipeline run review does not feed intake, persist records, or clear Source Package review.",
  "Pipeline run review is not Measurement Cell, Series, research-model, finance, or customer output."
];

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
  const serialized = JSON.stringify(canonicalize(value));
  return createHash("sha256")
    .update(serialized ?? "null")
    .digest("hex");
}

function validationProofHash(manifest, validation) {
  return sha256Json({
    manifest_hash: sha256Json(manifest),
    validation_result: validation
  });
}

function falseBoundary(fields) {
  return Object.fromEntries(fields.map((field) => [field, false]));
}

function manifestRefFromInventory(source) {
  return {
    manifest_id: source.source_inventory_manifest_id,
    manifest_hash: sha256Json(source),
    source_lane: source.source_lane,
    source_system: source.source_system,
    source_ref: source.approved_source_ref,
    org_id: source.org_id,
    client_id: source.client_id,
    workflow_family: source.workflow_family,
    function_area: source.function_area,
    cohort_key: source.cohort_key,
    window: source.approved_extraction_window,
    aggregate_grain: source.approved_aggregate_grain
  };
}

function manifestRefFromExtraction(extraction) {
  return {
    manifest_id: extraction.aggregate_extraction_manifest_id,
    manifest_hash: sha256Json(extraction),
    source_lane: extraction.source_package_lane,
    source_system: extraction.source_system,
    source_ref: extraction.aggregate_output_ref,
    org_id: extraction.org_id,
    client_id: extraction.client_id,
    workflow_family: extraction.workflow_family,
    function_area: extraction.function_area,
    cohort_key: extraction.cohort_key,
    window: extraction.extraction_window,
    aggregate_grain: extraction.aggregate_grain
  };
}

function approvedExpectationPathBinding() {
  return {
    expectation_path_id: "expectation_path_support_resolution_capacity",
    expectation_path_version: 1,
    expectation_path_hash: sha256Json({
      expectation_path_id: "expectation_path_support_resolution_capacity",
      metric_id: "support_median_resolution_hours",
      driver: "Capacity"
    }),
    approved_blueprint_payload_hash: sha256Json({ blueprint: "approved_support_resolution" }),
    approval_state: "customer_approved",
    approved_at: "2026-06-22T00:00:00.000Z",
    approved_by_role: "customer_business_owner"
  };
}

function expectedQueueRef(source, extraction, review, binding) {
  const identityHash = sha256Json({
    source_manifest_ref: manifestRefFromInventory(source),
    aggregate_extraction_manifest_ref: manifestRefFromExtraction(extraction),
    org_id: review.org_id,
    client_id: review.client_id,
    measurement_plan_id: review.measurement_plan_id,
    workflow_family: review.workflow_family,
    workflow_id: review.workflow_id,
    function_area: review.function_area,
    cohort_key: review.cohort_key,
    baseline_window: review.baseline_window,
    comparison_window: review.comparison_window,
    metric_id: review.metric_id,
    approved_expectation_path_binding: binding
  }).slice(0, 24);
  return [
    "source_package_review_queue",
    source.source_system,
    review.org_id,
    review.client_id,
    review.workflow_family,
    review.function_area,
    review.cohort_key,
    review.metric_id,
    identityHash
  ].join("_");
}

function buildSourceInventoryManifest() {
  return {
    source_inventory_manifest_id: "source_inventory_bigquery_export_support_resolution",
    schema_version: AI_VALUE_SOURCE_INVENTORY_MANIFEST_SCHEMA_VERSION,
    source_lane: "vbd_token",
    source_system: "bigquery_export",
    source_category: "scrubbed_aggregate_export",
    source_owner_role: "customer_data_platform_owner",
    source_owner_attestation: "AGGREGATE_ONLY_ATTESTED",
    org_id: "org_example",
    client_id: "client_northstar",
    workflow_family: "support_resolution",
    function_area: "customer_support",
    cohort_key: "eligible_cases",
    approved_source_ref: "bigquery_export_support_resolution_vbd_token_aggregate",
    approved_extraction_window: {
      window_start: "2026-02-01",
      window_end: "2026-03-02"
    },
    approved_aggregate_grain: "workflow_function_cohort_window",
    approved_output_fields: [
      "workflow_family",
      "function_area",
      "cohort_key",
      "window_start",
      "window_end",
      "support_median_resolution_hours"
    ],
    k_min_posture: "K_MIN_ALREADY_ENFORCED_UPSTREAM",
    suppression_posture: "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM",
    legal_trust_review_state: "LEGAL_TRUST_REVIEW_NOT_REQUIRED",
    allowed_uses: [
      "source_inventory_review",
      "aggregate_extraction_candidate"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: falseBoundary(SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS),
    required_caveats: [...SOURCE_INVENTORY_CAVEATS],
    generated_at: "2026-06-22T00:00:00.000Z"
  };
}

function buildAggregateExtractionManifest(source) {
  return {
    aggregate_extraction_manifest_id: "aggregate_extraction_bigquery_export_support_resolution",
    schema_version: AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_SCHEMA_VERSION,
    source_inventory_manifest_ref: manifestRefFromInventory(source),
    source_system: source.source_system,
    execution_boundary: "approved_glean_or_customer_environment",
    approved_aggregate_definition_ref: "aggregate_definition_bigquery_export_support_resolution",
    upstream_aggregate_attestation_ref: "aggregate_attestation_bigquery_export_support_resolution",
    org_id: source.org_id,
    client_id: source.client_id,
    workflow_family: source.workflow_family,
    function_area: source.function_area,
    cohort_key: source.cohort_key,
    extraction_window: source.approved_extraction_window,
    aggregate_grain: source.approved_aggregate_grain,
    metric_definitions: ["support_median_resolution_hours"],
    source_package_lane: source.source_lane,
    aggregate_output_ref: "bigquery_export_support_resolution_vbd_token_output",
    aggregate_output_hash: sha256Json({ aggregate: "support_resolution", day: 30 }),
    k_min_posture: "K_MIN_ENFORCED",
    suppression_results: {
      suppression_state: "SUPPRESSION_ENFORCED",
      k_min_state: "K_MIN_ENFORCED",
      held_telemetry_present: false,
      suppressed_telemetry_present: false
    },
    freshness_state: "CURRENT_FOR_APPROVED_WINDOW",
    owner_review_state: "AGGREGATE_EXTRACTION_ATTESTED",
    allowed_uses: [
      "aggregate_extraction_review",
      "pipeline_run_review_candidate"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: falseBoundary(AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS),
    required_caveats: [...AGGREGATE_EXTRACTION_CAVEATS],
    generated_at: "2026-06-22T00:00:00.000Z"
  };
}

function buildPipelineRunReviewManifest(source, extraction) {
  const binding = approvedExpectationPathBinding();
  const sourceValidation = validateAiValueSourceInventoryManifest(source);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );
  const review = {
    pipeline_run_review_manifest_id: "pipeline_run_review_bigquery_export_support_resolution",
    schema_version: AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_SCHEMA_VERSION,
    pipeline_review_state: "ELIGIBLE_FOR_OPERATOR_PROMOTION_REVIEW",
    source_inventory_manifest_ref: manifestRefFromInventory(source),
    aggregate_extraction_manifest_ref: manifestRefFromExtraction(extraction),
    operator_role: "internal_ai_value_operator",
    source_owner_role: source.source_owner_role,
    org_id: source.org_id,
    client_id: source.client_id,
    measurement_plan_id: "measurement_plan_support_resolution",
    workflow_family: source.workflow_family,
    workflow_id: "support_case_resolution",
    function_area: source.function_area,
    cohort_key: source.cohort_key,
    baseline_window: {
      window_start: "2026-01-01",
      window_end: "2026-01-30"
    },
    comparison_window: extraction.extraction_window,
    metric_id: "support_median_resolution_hours",
    expectation_path_id: binding.expectation_path_id,
    reviewed_aggregate_source_refs: [
      source.approved_source_ref,
      extraction.aggregate_output_ref
    ],
    data_spine_alignment_envelope: {
      source_lane: source.source_lane,
      source_system: source.source_system,
      source_ref: source.approved_source_ref,
      source_owner_role: source.source_owner_role,
      org_id: source.org_id,
      client_id: source.client_id,
      measurement_plan_id: "measurement_plan_support_resolution",
      workflow_family: source.workflow_family,
      workflow_id: "support_case_resolution",
      function_area: source.function_area,
      cohort_key: source.cohort_key,
      baseline_window: {
        window_start: "2026-01-01",
        window_end: "2026-01-30"
      },
      comparison_window: extraction.extraction_window,
      metric_id: "support_median_resolution_hours",
      expectation_path_id: binding.expectation_path_id,
      expectation_path_version: binding.expectation_path_version,
      expectation_path_hash: binding.expectation_path_hash,
      approved_blueprint_payload_hash: binding.approved_blueprint_payload_hash,
      approval_state: binding.approval_state,
      approved_at: binding.approved_at,
      approved_by_role: binding.approved_by_role
    },
    source_package_review_queue_posture_ref: {
      queue_ref: null,
      queue_state: "DATA_SPINE_REVIEW_READY",
      reviewed_at: "2026-06-22T00:00:00.000Z",
      reviewed_by_role: "internal_ai_value_operator"
    },
    validation_result_refs: {
      source_inventory_validation_ref: "source_inventory_validation_bigquery_export_support_resolution",
      source_inventory_validation_hash: validationProofHash(source, sourceValidation),
      aggregate_extraction_validation_ref: "aggregate_extraction_validation_bigquery_export_support_resolution",
      aggregate_extraction_validation_hash: validationProofHash(extraction, extractionValidation),
      connector_adapter_ref: "connector_adapter_review_bigquery_export_support_resolution"
    },
    allowed_uses: ["manual_operator_promotion_review"],
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: falseBoundary(PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS),
    required_caveats: [...PIPELINE_REVIEW_CAVEATS],
    stop_conditions: [...REQUIRED_BLOCKED_USES],
    generated_at: "2026-06-22T00:00:00.000Z"
  };
  review.source_package_review_queue_posture_ref.queue_ref = expectedQueueRef(
    source,
    extraction,
    review,
    binding
  );
  return review;
}

function validChain() {
  const source = buildSourceInventoryManifest();
  const extraction = buildAggregateExtractionManifest(source);
  const review = buildPipelineRunReviewManifest(source, extraction);
  const binding = approvedExpectationPathBinding();
  return { source, extraction, review, binding };
}

function validSigmaChain() {
  const source = buildSourceInventoryManifest();
  source.source_system = "sigma_export";
  source.source_owner_role = "customer_analytics_owner";
  source.source_inventory_manifest_id = "source_inventory_sigma_export_support_resolution";
  source.approved_source_ref = "sigma_export_support_resolution_vbd_token_aggregate";

  const extraction = buildAggregateExtractionManifest(source);
  extraction.aggregate_extraction_manifest_id = "aggregate_extraction_sigma_export_support_resolution";
  extraction.source_inventory_manifest_ref = manifestRefFromInventory(source);
  extraction.approved_aggregate_definition_ref = "aggregate_definition_sigma_export_support_resolution";
  extraction.upstream_aggregate_attestation_ref =
    "aggregate_attestation_sigma_export_support_resolution";
  extraction.aggregate_output_ref = "sigma_export_support_resolution_vbd_token_output";

  const review = buildPipelineRunReviewManifest(source, extraction);
  const binding = approvedExpectationPathBinding();
  review.pipeline_run_review_manifest_id = "pipeline_run_review_sigma_export_support_resolution";
  review.validation_result_refs.source_inventory_validation_ref =
    "source_inventory_validation_sigma_export_support_resolution";
  review.validation_result_refs.aggregate_extraction_validation_ref =
    "aggregate_extraction_validation_sigma_export_support_resolution";
  review.validation_result_refs.connector_adapter_ref =
    "connector_adapter_review_sigma_export_support_resolution";
  review.source_package_review_queue_posture_ref.queue_ref = expectedQueueRef(
    source,
    extraction,
    review,
    binding
  );
  return { source, extraction, review, binding };
}

function assertNoSensitiveEcho(validation) {
  const serialized = JSON.stringify(validation.gaps);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("SELECT *"), false);
}

test("controlled aggregate manifest validators accept a fully aligned manifest chain", () => {
  const { source, extraction, review, binding } = validChain();

  const sourceValidation = validateAiValueSourceInventoryManifest(source);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );
  const reviewValidation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });
  const chainValidation = validateAiValueControlledAggregateManifestChain({
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    pipelineRunReviewManifest: review,
    approvedExpectationPathBinding: binding
  });

  assert.equal(sourceValidation.valid, true, sourceValidation.gaps.join("; "));
  assert.equal(extractionValidation.valid, true, extractionValidation.gaps.join("; "));
  assert.equal(reviewValidation.valid, true, reviewValidation.gaps.join("; "));
  assert.equal(chainValidation.valid, true, chainValidation.gaps.join("; "));
  assert.equal(sourceValidation.schema_version, "FT_AI_VALUE_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_2026_06");
});

test("controlled aggregate manifest validators accept Sigma-shaped reviewed aggregate refs", () => {
  const { source, extraction, review, binding } = validSigmaChain();

  const sourceValidation = validateAiValueSourceInventoryManifest(source);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );
  const reviewValidation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });
  const chainValidation = validateAiValueControlledAggregateManifestChain({
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    pipelineRunReviewManifest: review,
    approvedExpectationPathBinding: binding
  });

  assert.equal(sourceValidation.valid, true, sourceValidation.gaps.join("; "));
  assert.equal(extractionValidation.valid, true, extractionValidation.gaps.join("; "));
  assert.equal(reviewValidation.valid, true, reviewValidation.gaps.join("; "));
  assert.equal(chainValidation.valid, true, chainValidation.gaps.join("; "));
});

test("source inventory manifest allows the governed AI Fluency confidence aggregate field only by exact allowlist", () => {
  const source = buildSourceInventoryManifest();
  source.source_inventory_manifest_id = "source_inventory_bigquery_export_ai_fluency";
  source.source_lane = "ai_fluency";
  source.approved_source_ref = "bigquery_export_ai_fluency_support_day_30";
  source.approved_output_fields = [
    "workflow_family",
    "function_area",
    "cohort_key",
    "window_start",
    "window_end",
    "ai_fluency_confidence_mean"
  ];

  const validation = validateAiValueSourceInventoryManifest(source);

  assert.equal(validation.valid, true, validation.gaps.join("; "));

  const unsafe = clone(source);
  unsafe.approved_output_fields.push("confidence_score");
  const unsafeValidation = validateAiValueSourceInventoryManifest(unsafe);

  assert.equal(unsafeValidation.valid, false);
  assert.ok(
    unsafeValidation.gaps.some((gap) =>
      gap.includes("approved_output_fields must be governed aggregate field names")
    ),
    unsafeValidation.gaps.join("; ")
  );
});

test("source inventory manifest fails closed on unsafe refs, raw fields, aliases, and non-false boundaries", () => {
  const source = buildSourceInventoryManifest();
  source.source_owner_attestation = "APPROVED";
  source.legal_trust_review_state = "CLEARED";
  source.approved_source_ref = "https://bigquery.example/jobs/bquxjob_123";
  source.approved_output_fields.push("employee_email");
  source.boundary_policy.runs_live_connector = "false";
  source.raw_rows = [{ employee_email: "person@example.com", query_text: "SELECT * FROM raw_rows" }];

  const validation = validateAiValueSourceInventoryManifest(source);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("source_owner_attestation")));
  assert.ok(validation.gaps.some((gap) => gap.includes("approved_source_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("boundary_policy.runs_live_connector")));
  assert.ok(validation.gaps.some((gap) => gap.includes("Forbidden field detected")));
  assert.equal(JSON.stringify(validation.gaps).includes("raw_rows"), false);
  assertNoSensitiveEcho(validation);
});

test("source inventory manifest rejects empty or reversed windows and unsafe ref variants", () => {
  const emptyWindow = buildSourceInventoryManifest();
  emptyWindow.approved_extraction_window = { window_start: "", window_end: "" };

  const reversedWindow = buildSourceInventoryManifest();
  reversedWindow.approved_extraction_window = {
    window_start: "2026-03-02",
    window_end: "2026-02-01"
  };

  const impossibleWindow = buildSourceInventoryManifest();
  impossibleWindow.approved_extraction_window = {
    window_start: "2026-02-31",
    window_end: "2026-03-02"
  };

  const unsafeRef = buildSourceInventoryManifest();
  unsafeRef.approved_source_ref = "bigquery_export_raw_table_customer_cases";
  unsafeRef.approved_output_fields.push("case_row_id", "span_id");

  const emptyValidation = validateAiValueSourceInventoryManifest(emptyWindow);
  const reversedValidation = validateAiValueSourceInventoryManifest(reversedWindow);
  const impossibleValidation = validateAiValueSourceInventoryManifest(impossibleWindow);
  const unsafeValidation = validateAiValueSourceInventoryManifest(unsafeRef);

  assert.equal(emptyValidation.valid, false);
  assert.equal(reversedValidation.valid, false);
  assert.equal(impossibleValidation.valid, false);
  assert.equal(unsafeValidation.valid, false);
  assert.ok(emptyValidation.gaps.some((gap) => gap.includes("approved_extraction_window")));
  assert.ok(reversedValidation.gaps.some((gap) => gap.includes("approved_extraction_window")));
  assert.ok(impossibleValidation.gaps.some((gap) => gap.includes("approved_extraction_window")));
  assert.ok(unsafeValidation.gaps.some((gap) => gap.includes("approved_source_ref")));
  assert.ok(unsafeValidation.gaps.some((gap) => gap.includes("approved_output_fields")));
});

test("source inventory manifest rejects encoded payload chunks as aggregate field names", () => {
  const source = buildSourceInventoryManifest();
  source.approved_output_fields = [
    "workflow_family",
    "function_area",
    "cohort_key",
    "window_start",
    "window_end",
    "cmF3X3Jvd3Nfc2VsZWN0X3Byb21wdF90cmFuc2NyaXB0X3JvaQ"
  ];

  const validation = validateAiValueSourceInventoryManifest(source);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("governed aggregate field names")));
});

test("manifest validation diagnostics do not echo unsafe field names", () => {
  const source = buildSourceInventoryManifest();
  source.transcript_customer_said_secret_case_number_abc123 = "blocked";

  const validation = validateAiValueSourceInventoryManifest(source);
  const serialized = JSON.stringify(validation.gaps);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("transcript_customer_said_secret_case_number_abc123"), false);
  assert.ok(validation.gaps.some((gap) => gap.includes("Unsupported source_inventory_manifest field detected")));
  assert.ok(validation.gaps.some((gap) => gap.includes("Forbidden field detected")));
});

test("source inventory manifest rejects identifier and finance-output aliases in metadata values", () => {
  const identifierAliases = buildSourceInventoryManifest();
  identifierAliases.approved_output_fields.push(
    "employee_email",
    "user_id",
    "person_id",
    "respondent_email",
    "hashed_user_id",
    "joinable_user_identifier"
  );

  const financeAlias = buildSourceInventoryManifest();
  financeAlias.approved_output_fields.push(
    "finance_output",
    "finance_result",
    "finance_value",
    "finance_claim",
    "financial_output"
  );

  const identifierValidation = validateAiValueSourceInventoryManifest(identifierAliases);
  const financeValidation = validateAiValueSourceInventoryManifest(financeAlias);

  assert.equal(identifierValidation.valid, false);
  assert.equal(financeValidation.valid, false);
  assert.ok(identifierValidation.gaps.some((gap) => gap.includes("approved_output_fields")));
  assert.ok(financeValidation.gaps.some((gap) => gap.includes("approved_output_fields")));
});

test("aggregate extraction manifest fails closed on source drift, query handles, held telemetry, and payload smuggling", () => {
  const { source, extraction } = validChain();
  extraction.source_system = "sigma_export";
  extraction.source_inventory_manifest_ref.manifest_hash = sha256Json({ stale: true });
  extraction.approved_aggregate_definition_ref = "SELECT user_id FROM raw_rows";
  extraction.suppression_results.held_telemetry_present = true;
  extraction.payload_json = JSON.stringify({
    raw_rows: [{ email: "person@example.com" }],
    roi: 123
  });

  const validation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("source_inventory_manifest_ref.manifest_hash")));
  assert.ok(validation.gaps.some((gap) => gap.includes("aggregate_extraction.source_system")));
  assert.ok(validation.gaps.some((gap) => gap.includes("approved_aggregate_definition_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("held or suppressed telemetry")));
  assert.ok(validation.gaps.some((gap) => gap.includes("Forbidden field detected")));
  assert.equal(JSON.stringify(validation.gaps).includes("payload_json"), false);
  assertNoSensitiveEcho(validation);
});

test("aggregate extraction manifest rejects identifier and finance-output aliases in metrics", () => {
  const { source, extraction } = validChain();
  extraction.metric_definitions = [
    "support_median_resolution_hours",
    "employee_email",
    "finance_output",
    "financial_output"
  ];

  const validation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("metric_definitions")));
});

test("aggregate extraction manifest rejects safe but unapproved metric definitions", () => {
  const { source, extraction } = validChain();
  extraction.metric_definitions = [
    "support_median_resolution_hours",
    "unapproved_safe_metric"
  ];

  const validation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("governed aggregate metric identifiers")) ||
    validation.gaps.some((gap) => gap.includes("approved Source Inventory output fields"))
  );
});

test("aggregate extraction manifest allows approved AI fluency confidence aggregate fields", () => {
  const { source, extraction } = validChain();
  source.source_lane = "ai_fluency";
  source.approved_output_fields = [
    "workflow_family",
    "function_area",
    "cohort_key",
    "window_start",
    "window_end",
    "ai_fluency_confidence_mean"
  ];
  extraction.source_inventory_manifest_ref = manifestRefFromInventory(source);
  extraction.source_package_lane = "ai_fluency";
  extraction.metric_definitions = ["ai_fluency_confidence_mean"];

  const validation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("aggregate extraction manifest rejects dimension fields as metric definitions", () => {
  const { source, extraction } = validChain();
  extraction.metric_definitions = ["workflow_family"];

  const validation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("metric_definitions")),
    validation.gaps.join("; ")
  );
});

test("aggregate extraction manifest fails closed instead of throwing when source inventory context is missing", () => {
  const source = buildSourceInventoryManifest();
  const extraction = buildAggregateExtractionManifest(source);

  const validation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: null }
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("Source Inventory Manifest validation")));
});

test("pipeline run review manifest fails closed on clearance aliases, snapshot aliases, and missing stop conditions", () => {
  const { source, extraction, review, binding } = validChain();
  review.source_package_review_queue_posture_ref.queue_state = "APPROVED";
  review.allowed_uses = ["measurement_cell_snapshot_ready"];
  review.stop_conditions = [];

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("queue_state must be canonical")));
  assert.ok(validation.gaps.some((gap) => gap.includes("clearance aliases")));
  assert.ok(validation.gaps.some((gap) => gap.includes("allowed_uses")));
  assert.ok(validation.gaps.some((gap) => gap.includes("stop_conditions")));
});

test("pipeline run review manifest requires complete deterministic Source Package Review Queue posture refs", () => {
  const { source, extraction, review, binding } = validChain();
  delete review.source_package_review_queue_posture_ref.reviewed_at;
  review.source_package_review_queue_posture_ref.queue_ref = "source_package_review_queue_stale_safe_ref";

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("reviewed_at is missing")));
  assert.ok(validation.gaps.some((gap) => gap.includes("queue_ref must match deterministic")));
});

test("pipeline run review manifest fails closed on path, metric, source-ref, and recomputed validation drift", () => {
  const { source, extraction, review, binding } = validChain();
  review.metric_id = "unapproved_metric";
  review.expectation_path_id = "expectation_path_other";
  review.reviewed_aggregate_source_refs[1] = "bigquery_export_other_output";
  review.validation_result_refs.source_inventory_validation_hash = sha256Json({ copied: "all checks passed" });

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("metric_id must match")));
  assert.ok(validation.gaps.some((gap) => gap.includes("expectation_path_id must match")));
  assert.ok(validation.gaps.some((gap) => gap.includes("reviewed_aggregate_source_refs")));
  assert.ok(validation.gaps.some((gap) => gap.includes("source_inventory_validation_hash")));
});

test("pipeline run review manifest binds approved expectation path hash to selected metric", () => {
  const { source, extraction, review, binding } = validChain();
  extraction.metric_definitions = [
    "support_median_resolution_hours",
    "escalation_rate"
  ];
  extraction.aggregate_output_hash = sha256Json({
    aggregate: "support_resolution",
    metrics: extraction.metric_definitions
  });
  review.aggregate_extraction_manifest_ref = manifestRefFromExtraction(extraction);
  review.metric_id = "escalation_rate";
  review.data_spine_alignment_envelope.metric_id = "escalation_rate";
  review.reviewed_aggregate_source_refs[1] = extraction.aggregate_output_ref;
  review.source_package_review_queue_posture_ref.queue_ref = expectedQueueRef(
    source,
    extraction,
    review,
    binding
  );
  review.validation_result_refs.aggregate_extraction_validation_hash =
    validationProofHash(
      extraction,
      validateAiValueAggregateExtractionManifest(extraction, {
        sourceInventoryManifest: source
      })
    );

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("expectation_path_hash must bind")
    ),
    validation.gaps.join("; ")
  );
});

test("pipeline run review manifest rejects coordinated expectation-path drift against approved binding", () => {
  const { source, extraction, review, binding } = validChain();
  review.expectation_path_id = "expectation_path_drifted";
  review.data_spine_alignment_envelope.expectation_path_id = "expectation_path_drifted";
  review.data_spine_alignment_envelope.expectation_path_hash = sha256Json({ forged: "path" });
  review.source_package_review_queue_posture_ref.queue_ref = expectedQueueRef(
    source,
    extraction,
    review,
    {
      ...binding,
      expectation_path_id: "expectation_path_drifted",
      expectation_path_hash: review.data_spine_alignment_envelope.expectation_path_hash
    }
  );

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("approvedExpectationPathBinding.expectation_path_id")));
  assert.ok(validation.gaps.some((gap) => gap.includes("data_spine_alignment_envelope.expectation_path_id")));
  assert.ok(validation.gaps.some((gap) => gap.includes("data_spine_alignment_envelope.expectation_path_hash")));
  assert.ok(validation.gaps.some((gap) => gap.includes("queue_ref must match deterministic")));
});

test("pipeline run review validation hashes bind to the specific manifest, not copied valid summaries", () => {
  const { source, extraction, review, binding } = validChain();
  const otherSource = buildSourceInventoryManifest();
  otherSource.workflow_family = "another_workflow";
  const copiedValidSummaryHash = sha256Json(validateAiValueSourceInventoryManifest(otherSource));

  review.validation_result_refs.source_inventory_validation_hash = copiedValidSummaryHash;

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("source_inventory_validation_hash")));
});

test("pipeline run review manifest accepts governed held states as valid fail-closed records", () => {
  const { source, extraction, review, binding } = validChain();
  review.pipeline_review_state = "HELD_FOR_SOURCE_PACKAGE_QUEUE_REF";
  review.source_package_review_queue_posture_ref.queue_state = "HELD_FOR_SOURCE_REVIEW";

  const validation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: source,
    aggregateExtractionManifest: extraction,
    approvedExpectationPathBinding: binding
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("manifest validators reject JSON smuggling through reserved payload containers", () => {
  const { source, extraction, review, binding } = validChain();
  const smuggled = JSON.stringify({
    query_text: "SELECT user_id FROM raw_rows",
    transcript: "Prompt: summarize person@example.com",
    ebitda: 1000,
    confidence: 0.91
  });

  source.metadata = { payload_json: smuggled };
  extraction.metadata = { validation_json: smuggled };
  review.metadata = { source_refs_json: smuggled };

  const sourceValidation = validateAiValueSourceInventoryManifest(source);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: buildSourceInventoryManifest() }
  );
  const reviewValidation = validateAiValuePipelineRunReviewManifest(review, {
    sourceInventoryManifest: buildSourceInventoryManifest(),
    aggregateExtractionManifest: buildAggregateExtractionManifest(buildSourceInventoryManifest()),
    approvedExpectationPathBinding: binding
  });

  assert.equal(sourceValidation.valid, false);
  assert.equal(extractionValidation.valid, false);
  assert.equal(reviewValidation.valid, false);
  assert.ok(sourceValidation.gaps.some((gap) => gap.includes("Forbidden field detected")));
  assert.ok(extractionValidation.gaps.some((gap) => gap.includes("Forbidden field detected")));
  assert.ok(reviewValidation.gaps.some((gap) => gap.includes("Forbidden field detected")));
  assert.equal(JSON.stringify(sourceValidation.gaps).includes("payload_json"), false);
  assert.equal(JSON.stringify(extractionValidation.gaps).includes("validation_json"), false);
  assert.equal(JSON.stringify(reviewValidation.gaps).includes("source_refs_json"), false);
  assertNoSensitiveEcho(sourceValidation);
  assertNoSensitiveEcho(extractionValidation);
  assertNoSensitiveEcho(reviewValidation);
});

test("controlled aggregate manifest module remains validator-only", () => {
  const source = readFileSync(
    "shared/src/aiValueEngine/controlledAggregatePipelineManifests.ts",
    "utf8"
  );

  assert.equal(/export function build[A-Za-z0-9_]*Manifest/.test(source), false);
  assert.equal(source.includes("BuildPipelineManifestsFromConnectorAdapterInput"), false);
});
