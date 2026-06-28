#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCustomerDataModelPromotionGateFromObject,
  customerDataModelPromotionGateHash,
  validateCustomerDataModelPromotionGate
} from "./run_ai_value_customer_data_model_promotion_gate.mjs";
import {
  buildCustomerDataModelPersistencePromotionDecisionFromObject,
  customerDataModelPersistencePromotionDecisionHash,
  validateCustomerDataModelPersistencePromotionDecision
} from "./run_ai_value_customer_data_model_persistence_promotion_decision.mjs";
import {
  buildMeasurementCellSnapshotProjectionFromObject,
  validateMeasurementCellSnapshotProjection
} from "./run_ai_value_measurement_cell_snapshot_projection.mjs";

export const CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_customer_data_model_persistence_implementation_decision_2026_06";

const PROMOTE_STATE =
  "PROMOTE_COMPACT_CUSTOMER_DATA_MODEL_SNAPSHOT_PERSISTENCE";
const HOLD_STATE =
  "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SOURCE_PROMOTION_READY_STATE =
  "READY_FOR_EXACT_SCOPE_CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION";

const TRUE_READY_FEEDS = [
  "customer_data_model_compact_persistence_table",
  "customer_data_model_repository_write_path",
  "customer_data_model_repository_read_path"
];

const FALSE_FEEDS = [
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
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

const IMPLEMENTATION_SCOPE_FIELDS = [
  "exact_scope_only",
  "source_bound",
  "compact_refs_only",
  "append_only",
  "internal_product_data_model",
  "persistence_table_authorized",
  "prisma_model_authorized",
  "migration_authorized",
  "repository_write_authorized",
  "repository_read_authorized",
  "route_authorized",
  "ui_authorized",
  "export_authorized",
  "rendered_readout_authorized",
  "customer_facing_output_authorized",
  "live_connector_authorized",
  "model_output_authorized",
  "finance_output_authorized"
];

const CUSTOMER_EXPOSURE_FIELDS = [
  "customer_visible",
  "exposure_state",
  "status_posture_only",
  "read_route_allowed",
  "write_route_allowed",
  "frontend_ui_creation_allowed",
  "export_allowed",
  "customer_facing_output_allowed",
  "financial_output_allowed"
];

const BOUNDARY_POLICY_FIELDS = [
  "creates_persistence_table",
  "creates_prisma_model",
  "creates_migration",
  "creates_repository_write_path",
  "creates_repository_read_path",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "emits_customer_facing_output",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "feeds_research_model",
  "emits_model_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const SOURCE_DECISION_REF_FIELDS = [
  "promotion_decision_id",
  "promotion_decision_state",
  "promotion_decision_hash",
  "source_gate_id",
  "source_gate_hash",
  "source_projection_id",
  "source_projection_hash",
  "snapshot_id",
  "org_id",
  "client_id",
  "measurement_cell_id",
  "measurement_plan_id",
  "expectation_path_id",
  "metric_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "window_mode",
  "milestone_day",
  "aggregate_source_system",
  "pipeline_boundary_hash"
];

const PHYSICAL_MODEL_FIELDS = [
  "candidate_model_id",
  "table_name",
  "source_authority",
  "source_projection_schema_version",
  "grain",
  "persistence_mode",
  "allowed_audience",
  "required_columns",
  "json_columns"
];

const REPOSITORY_CONTRACT_FIELDS = [
  "write_function",
  "read_function",
  "write_input_contract",
  "read_scope",
  "append_only",
  "recompute_source_validation",
  "rejects_unpromoted_sources",
  "rejects_route_or_ui_output"
];

const REQUIRED_COLUMNS = [
  "id",
  "org_id",
  "client_id",
  "customer_data_model_snapshot_id",
  "source_snapshot_id",
  "source_projection_id",
  "source_projection_hash",
  "source_gate_id",
  "source_gate_hash",
  "source_promotion_decision_id",
  "source_promotion_decision_hash",
  "implementation_decision_id",
  "implementation_decision_hash",
  "measurement_cell_id",
  "measurement_cell_assembly_run_id",
  "measurement_plan_id",
  "value_hypothesis_id",
  "value_hypothesis_ref",
  "value_hypothesis_binding_state",
  "approved_blueprint_ref",
  "approved_blueprint_payload_hash",
  "blueprint_expectation_ref",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approval_state",
  "approved_at",
  "approved_by_role",
  "value_driver",
  "metric_id",
  "metric_definition_ref",
  "metric_definition_hash",
  "metric_owner_approval_state",
  "metric_direction",
  "metric_unit",
  "expected_metric_lag_days",
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "window_mode",
  "milestone_day",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "aggregate_source_system",
  "aggregate_export_review_ref",
  "aggregate_export_review_state",
  "aggregate_source_export_ref",
  "aggregate_export_review_hash",
  "pipeline_dry_run_ref",
  "pipeline_boundary_hash",
  "source_refs_json",
  "aggregate_boundary_ref_json",
  "assembly_decision",
  "validation_valid",
  "assembly_validation_valid",
  "validation_gap_count",
  "assembly_validation_gap_count",
  "required_caveats_json",
  "blocked_uses_json",
  "version",
  "supersedes_id",
  "generated_at",
  "created_at",
  "created_by_role"
];

const JSON_COLUMNS = [
  "source_refs_json",
  "aggregate_boundary_ref_json",
  "required_caveats_json",
  "blocked_uses_json"
];

const REQUIRED_BLOCKED_USES = [
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "live_connector_execution",
  "research_model_feed",
  "model_output",
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

const REQUIRED_CAVEATS = [
  "Customer Data Model persistence implementation is compact product data only.",
  "The promoted scope is one append-only table and internal repository write/read path.",
  "No backend route, frontend UI, export, rendered readout, live connector execution, model output, finance output, or customer-facing output is authorized."
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_decision_ref",
  "implementation_scope",
  "physical_model",
  "repository_contract",
  "customer_exposure",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "validation_summary",
  "decision_hash"
]);

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:|-]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /query_?text/i,
  /sql/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /payload_?json/i,
  /validation_?json/i,
  /blueprint_?path_?binding_?json/i,
  /full_?measurement_?cell/i,
  /source_?package_?payload/i,
  /^confidence/i,
  /confidence_?score/i,
  /model_?output/i,
  /research_?model_?feed/i,
  /^probability$/i,
  /probability_?score/i,
  /^score$/i,
  /^roi$/i,
  /ebitda/i,
  /financial_?output/i,
  /causality/i,
  /productivity/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /select\s+.+\s+from/i,
  /\braw_rows?\b/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\btranscript\b/i,
  /(?:^|[._:-])(?:user|employee|person|row|span|project|dataset|table)[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:email|user|person|employee)[._:-]?hash(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:export|digest)(?:[._:-]|$)/i
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function trueMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function safeGeneratedAt(input, options = {}) {
  const candidate = options.generatedAt ?? asRecord(input).generated_at;
  if (
    typeof candidate === "string" &&
    Number.isFinite(Date.parse(candidate)) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(candidate))
  ) {
    return candidate;
  }
  return new Date().toISOString();
}

function pathContains(path, name) {
  return path.some((part) => part === name);
}

function keyIsGovernedPosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && [...TRUE_READY_FEEDS, ...FALSE_FEEDS].includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "customer_exposure" && CUSTOMER_EXPOSURE_FIELDS.includes(key)) ||
    (path[0] === "implementation_scope" && IMPLEMENTATION_SCOPE_FIELDS.includes(key))
  );
}

function collectBoundaryLeakage(value, path = []) {
  const gaps = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...collectBoundaryLeakage(item, [...path, String(index)]));
    });
    return gaps;
  }
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      !pathContains(path, "blocked_uses") &&
      !pathContains(path, "required_caveats") &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push(`${path.join(".") || "value"} contains unsafe source text`);
    }
    return gaps;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (
      !pathContains(path, "blocked_uses") &&
      !pathContains(path, "required_caveats") &&
      !keyIsGovernedPosture(path, key) &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      gaps.push(`${nextPath.join(".")} is not allowed`);
      continue;
    }
    gaps.push(...collectBoundaryLeakage(nestedValue, nextPath));
  }
  return gaps;
}

function validationSummary(valid, gaps) {
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid,
    gaps
  };
}

function isProjection(value) {
  return asRecord(value).schema_version === "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06";
}

function isGate(value) {
  return asRecord(value).schema_version === "FT_AI_VALUE_CUSTOMER_DATA_MODEL_PROMOTION_GATE_2026_06";
}

function isPromotionDecision(value) {
  return asRecord(value).schema_version === "FT_AI_VALUE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_2026_06";
}

function sourceProjectionFromInput(input, options = {}) {
  if (options.sourceProjection) return asRecord(options.sourceProjection);
  if (isProjection(input)) return asRecord(input);
  if (isGate(input) || isPromotionDecision(input)) return null;
  return buildMeasurementCellSnapshotProjectionFromObject(input);
}

function sourceGateFromInput(input, options = {}) {
  if (options.sourceGate) return asRecord(options.sourceGate);
  if (isGate(input)) return asRecord(input);
  return buildCustomerDataModelPromotionGateFromObject(input, options);
}

function sourcePromotionDecisionFromInput(input, options = {}) {
  if (options.sourcePromotionDecision) return asRecord(options.sourcePromotionDecision);
  if (isPromotionDecision(input)) return asRecord(input);
  return buildCustomerDataModelPersistencePromotionDecisionFromObject(input, options);
}

function sourceDecisionRef(promotionDecision) {
  const sourceRef = asRecord(promotionDecision.source_gate_ref);
  return {
    promotion_decision_id: promotionDecision.decision_id,
    promotion_decision_state: promotionDecision.decision_state,
    promotion_decision_hash: promotionDecision.decision_hash,
    source_gate_id: sourceRef.gate_id,
    source_gate_hash: sourceRef.gate_hash,
    source_projection_id: sourceRef.projection_id,
    source_projection_hash: sourceRef.projection_hash,
    snapshot_id: sourceRef.snapshot_id,
    org_id: sourceRef.org_id,
    client_id: sourceRef.client_id ?? null,
    measurement_cell_id: sourceRef.measurement_cell_id,
    measurement_plan_id: sourceRef.measurement_plan_id,
    expectation_path_id: sourceRef.expectation_path_id,
    metric_id: sourceRef.metric_id,
    workflow_family: sourceRef.workflow_family,
    function_area: sourceRef.function_area,
    cohort_key: sourceRef.cohort_key,
    window_mode: sourceRef.window_mode,
    milestone_day: sourceRef.milestone_day,
    aggregate_source_system: sourceRef.aggregate_source_system,
    pipeline_boundary_hash: sourceRef.pipeline_boundary_hash
  };
}

function physicalModel() {
  return {
    candidate_model_id: "compact_customer_data_model_snapshot",
    table_name: "ai_value_customer_data_model_snapshots",
    source_authority: "measurement_cell_snapshots",
    source_projection_schema_version: "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06",
    grain: "org_measurement_plan_measurement_cell_metric_expectation_path_milestone_version",
    persistence_mode: "append_only_compact_projection",
    allowed_audience: "internal_product_data_model",
    required_columns: REQUIRED_COLUMNS,
    json_columns: JSON_COLUMNS
  };
}

function repositoryContract(ready) {
  return {
    write_function: "persistAiValueCustomerDataModelSnapshot",
    read_function: "listAiValueCustomerDataModelSnapshots",
    write_input_contract:
      "valid_snapshot_projection_plus_ready_gate_promotion_and_implementation_decision",
    read_scope: "internal_org_scoped_product_data_only",
    append_only: true,
    recompute_source_validation: ready,
    rejects_unpromoted_sources: true,
    rejects_route_or_ui_output: true
  };
}

function baseDecision(state, valid, gaps, generatedAt) {
  const ready = state === PROMOTE_STATE && valid;
  return {
    schema_version: CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION_SCHEMA_VERSION,
    decision_id: `customer_data_model_persistence_implementation_decision:${state.toLowerCase()}`,
    decision_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    implementation_scope: {
      exact_scope_only: true,
      source_bound: ready,
      compact_refs_only: true,
      append_only: true,
      internal_product_data_model: true,
      persistence_table_authorized: ready,
      prisma_model_authorized: ready,
      migration_authorized: ready,
      repository_write_authorized: ready,
      repository_read_authorized: ready,
      route_authorized: false,
      ui_authorized: false,
      export_authorized: false,
      rendered_readout_authorized: false,
      customer_facing_output_authorized: false,
      live_connector_authorized: false,
      model_output_authorized: false,
      finance_output_authorized: false
    },
    physical_model: physicalModel(),
    repository_contract: repositoryContract(ready),
    customer_exposure: {
      customer_visible: false,
      exposure_state: "not_authorized_by_implementation_decision",
      status_posture_only: true,
      read_route_allowed: false,
      write_route_allowed: false,
      frontend_ui_creation_allowed: false,
      export_allowed: false,
      customer_facing_output_allowed: false,
      financial_output_allowed: false
    },
    feeds: {
      ...Object.fromEntries(TRUE_READY_FEEDS.map((feed) => [feed, ready])),
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      ...Object.fromEntries(
        [
          "creates_persistence_table",
          "creates_prisma_model",
          "creates_migration",
          "creates_repository_write_path",
          "creates_repository_read_path"
        ].map((field) => [field, ready])
      ),
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter(
          (field) =>
            ![
              "creates_persistence_table",
              "creates_prisma_model",
              "creates_migration",
              "creates_repository_write_path",
              "creates_repository_read_path"
            ].includes(field)
        )
      )
    },
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedDecision(gaps, generatedAt) {
  const decision = {
    ...baseDecision(REJECTED_STATE, false, gaps, generatedAt),
    source_decision_ref: null
  };
  decision.decision_hash = customerDataModelPersistenceImplementationDecisionHash(decision);
  return decision;
}

export function customerDataModelPersistenceImplementationDecisionHash(decision) {
  const clone = JSON.parse(JSON.stringify(decision));
  delete clone.decision_hash;
  return sha256Json(clone);
}

export function buildCustomerDataModelPersistenceImplementationDecisionFromObject(
  input,
  options = {}
) {
  const generatedAt = safeGeneratedAt(input, options);
  const leakageGaps = isProjection(input) || isGate(input) || isPromotionDecision(input)
    ? []
    : collectBoundaryLeakage(input);
  if (leakageGaps.length > 0 && !isPromotionDecision(input)) {
    return rejectedDecision(leakageGaps, generatedAt);
  }

  const projection = sourceProjectionFromInput(input, options);
  const projectionValidation = projection
    ? validateMeasurementCellSnapshotProjection(projection)
    : { valid: false, gaps: ["source projection is required"] };
  const gate = sourceGateFromInput(input, {
    ...options,
    sourceProjection: projection
  });
  const gateValidation = validateCustomerDataModelPromotionGate(gate, {
    sourceProjection: projection
  });
  const promotionDecision = sourcePromotionDecisionFromInput(input, {
    ...options,
    sourceProjection: projection,
    sourceGate: gate
  });
  const promotionValidation = validateCustomerDataModelPersistencePromotionDecision(
    promotionDecision,
    {
      sourceProjection: projection,
      sourceGate: gate
    }
  );
  const sourceUsable =
    projectionValidation.valid === true &&
    gateValidation.valid === true &&
    promotionValidation.valid === true &&
    promotionDecision.decision_state === SOURCE_PROMOTION_READY_STATE;
  const state = sourceUsable ? PROMOTE_STATE : HOLD_STATE;
  const valid = state === PROMOTE_STATE;
  const gaps = valid
    ? []
    : [
        ...new Set([
          ...projectionValidation.gaps.map((gap) => `sourceProjection: ${gap}`),
          ...gateValidation.gaps.map((gap) => `sourceGate: ${gap}`),
          ...promotionValidation.gaps.map((gap) => `sourcePromotionDecision: ${gap}`)
        ])
      ];
  const decision = {
    ...baseDecision(state, valid, gaps, generatedAt),
    source_decision_ref: sourceUsable ? sourceDecisionRef(promotionDecision) : null
  };
  if (decision.source_decision_ref?.org_id && decision.source_decision_ref?.measurement_cell_id) {
    decision.decision_id =
      `customer_data_model_persistence_implementation_decision:${decision.source_decision_ref.org_id}:${decision.source_decision_ref.measurement_cell_id}`;
  }
  decision.decision_hash = customerDataModelPersistenceImplementationDecisionHash(decision);
  return decision;
}

function isSafeRef(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 260 &&
    SAFE_REF_PATTERN.test(value) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function collectAllowedFieldsGaps(record, allowedFields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !allowedFields.has(key))
    .map((key) => `${label}.${key} is not allowed`);
}

function collectSourceDecisionRefGaps(ref) {
  const gaps = [];
  for (const field of SOURCE_DECISION_REF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`source_decision_ref.${field} is required`);
      continue;
    }
    if (
      field !== "milestone_day" &&
      ref[field] != null &&
      typeof ref[field] === "string" &&
      !isSafeRef(ref[field]) &&
      !SHA256_PATTERN.test(ref[field])
    ) {
      gaps.push(`source_decision_ref.${field} must be safe compact metadata`);
    }
  }
  if (ref.window_mode !== "milestone") {
    gaps.push("source_decision_ref.window_mode must be milestone");
  }
  return gaps;
}

function collectShapeGaps(decision) {
  const gaps = [];
  const record = asRecord(decision);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "decision"));
  if (record.schema_version !== CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![PROMOTE_STATE, HOLD_STATE, REJECTED_STATE].includes(record.decision_state)) {
    gaps.push("decision_state is unsupported");
  }
  for (const [label, fields] of [
    ["source_decision_ref", SOURCE_DECISION_REF_FIELDS],
    ["implementation_scope", IMPLEMENTATION_SCOPE_FIELDS],
    ["physical_model", PHYSICAL_MODEL_FIELDS],
    ["repository_contract", REPOSITORY_CONTRACT_FIELDS],
    ["customer_exposure", CUSTOMER_EXPOSURE_FIELDS]
  ]) {
    const nested = asRecord(record[label]);
    if (record.decision_state === PROMOTE_STATE || label !== "source_decision_ref") {
      for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(nested, field)) {
          gaps.push(`${label}.${field} is required`);
        }
      }
    }
    gaps.push(...collectAllowedFieldsGaps(nested, new Set(fields), label));
  }
  if (record.decision_state === PROMOTE_STATE) {
    gaps.push(...collectSourceDecisionRefGaps(asRecord(record.source_decision_ref)));
  }
  const ready = record.decision_state === PROMOTE_STATE;
  const scope = asRecord(record.implementation_scope);
  for (const field of IMPLEMENTATION_SCOPE_FIELDS) {
    let expected = false;
    if (
      [
        "exact_scope_only",
        "compact_refs_only",
        "append_only",
        "internal_product_data_model"
      ].includes(field)
    ) {
      expected = true;
    }
    if (
      [
        "source_bound",
        "persistence_table_authorized",
        "prisma_model_authorized",
        "migration_authorized",
        "repository_write_authorized",
        "repository_read_authorized"
      ].includes(field)
    ) {
      expected = ready;
    }
    if (scope[field] !== expected) {
      gaps.push(`implementation_scope.${field} must be ${expected}`);
    }
  }
  const customerExposure = asRecord(record.customer_exposure);
  for (const field of CUSTOMER_EXPOSURE_FIELDS) {
    let expected = false;
    if (field === "exposure_state") expected = "not_authorized_by_implementation_decision";
    if (field === "status_posture_only") expected = true;
    if (customerExposure[field] !== expected) {
      gaps.push(`customer_exposure.${field} must be ${expected}`);
    }
  }
  const model = asRecord(record.physical_model);
  if (stableStringify(model) !== stableStringify(physicalModel())) {
    gaps.push("physical_model must match compact customer data model scope exactly");
  }
  const repository = asRecord(record.repository_contract);
  if (stableStringify(repository) !== stableStringify(repositoryContract(ready))) {
    gaps.push("repository_contract must match compact customer data model scope exactly");
  }
  const feeds = asRecord(record.feeds);
  gaps.push(...collectAllowedFieldsGaps(feeds, new Set([...TRUE_READY_FEEDS, ...FALSE_FEEDS]), "feeds"));
  for (const feed of TRUE_READY_FEEDS) {
    if (feeds[feed] !== ready) gaps.push(`feeds.${feed} must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  const boundary = asRecord(record.boundary_policy);
  gaps.push(...collectAllowedFieldsGaps(boundary, new Set(BOUNDARY_POLICY_FIELDS), "boundary_policy"));
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "creates_persistence_table",
      "creates_prisma_model",
      "creates_migration",
      "creates_repository_write_path",
      "creates_repository_read_path"
    ].includes(field)
      ? ready
      : false;
    if (boundary[field] !== expected) gaps.push(`boundary_policy.${field} must be ${expected}`);
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed implementation caveats exactly");
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed implementation blocked uses exactly");
  }
  if (!record.decision_hash || !SHA256_PATTERN.test(record.decision_hash)) {
    gaps.push("decision_hash must be a sha256 hash");
  } else if (record.decision_hash !== customerDataModelPersistenceImplementationDecisionHash(record)) {
    gaps.push("decision_hash must match compact implementation decision envelope");
  }
  return gaps;
}

function collectSourceBindingGaps(decision, options = {}) {
  const record = asRecord(decision);
  const gaps = [];
  if (record.decision_state !== PROMOTE_STATE) return gaps;
  if (!options.sourceProjection || !options.sourceGate || !options.sourcePromotionDecision) {
    gaps.push(
      "sourceProjection, sourceGate, and sourcePromotionDecision are required to validate promoted implementation decisions"
    );
    return gaps;
  }
  const gateValidation = validateCustomerDataModelPromotionGate(options.sourceGate, {
    sourceProjection: options.sourceProjection
  });
  if (gateValidation.valid !== true) {
    gaps.push("sourceGate must be a valid ready customer data model promotion gate");
    return gaps;
  }
  const promotionValidation = validateCustomerDataModelPersistencePromotionDecision(
    options.sourcePromotionDecision,
    {
      sourceProjection: options.sourceProjection,
      sourceGate: options.sourceGate
    }
  );
  if (
    promotionValidation.valid !== true ||
    options.sourcePromotionDecision.decision_state !== SOURCE_PROMOTION_READY_STATE
  ) {
    gaps.push("sourcePromotionDecision must be valid and ready for exact-scope implementation");
    return gaps;
  }
  const expectedRef = sourceDecisionRef(options.sourcePromotionDecision);
  const actualRef = asRecord(record.source_decision_ref);
  for (const field of SOURCE_DECISION_REF_FIELDS) {
    if (stableStringify(actualRef[field]) !== stableStringify(expectedRef[field])) {
      gaps.push(`source_decision_ref.${field} does not match source promotion decision`);
    }
  }
  return gaps;
}

export function validateCustomerDataModelPersistenceImplementationDecision(
  decision,
  options = {}
) {
  const leakageGaps = collectBoundaryLeakage(decision);
  const shapeGaps = collectShapeGaps(decision);
  const bindingGaps = collectSourceBindingGaps(decision, options);
  const summary = asRecord(asRecord(decision).validation_summary);
  const summaryGaps = Array.isArray(summary.gaps)
    ? summary.gaps.filter((gap) => typeof gap === "string" && gap.length > 0)
    : [];
  const ready = asRecord(decision).decision_state === PROMOTE_STATE;
  const gaps = [...leakageGaps, ...shapeGaps, ...bindingGaps];
  if (summary.valid !== ready) {
    gaps.push(`validation_summary.valid must be ${ready}`);
  }
  if (ready && summaryGaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for promoted implementation decisions");
  }
  if (!ready) {
    gaps.push(...summaryGaps);
    if (summaryGaps.length === 0) gaps.push("decision_state is not promoted");
  }
  return validationSummary(gaps.length === 0, gaps);
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    throw new Error(
      "Usage: run_ai_value_customer_data_model_persistence_implementation_decision.mjs <snapshot-or-projection-or-gate-or-promotion-decision.json>"
    );
  }
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(input);
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
