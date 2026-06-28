#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCompactSourceWiringHardeningFromObject,
  COMPACT_SOURCE_WIRING_HARDENING_SCHEMA_VERSION,
  compactSourceWiringHardeningHash,
  validateCompactSourceWiringHardening
} from "./run_ai_value_compact_source_wiring_hardening.mjs";

export const CONNECTOR_PROMOTION_READINESS_SEQUENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONNECTOR_PROMOTION_READINESS_SEQUENCE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONNECTOR_PROMOTION_READINESS_SEQUENCE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_connector_promotion_readiness_sequence_2026_06";

const READY_STATE = "CONNECTOR_PROMOTION_READINESS_SEQUENCE_DESIGNED_NON_LIVE";
const HOLD_STATE = "HOLD_FOR_COMPACT_SOURCE_WIRING_HARDENING";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const READY_COMPACT_HARDENING_STATE = "COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE";
const ALLOWED_NEXT_STEP =
  "human_review_connector_promotion_sequence_before_live_connector_implementation";
const HELD_NEXT_STEP = "complete_compact_source_wiring_hardening";

const SOURCE_HARDENING_REF_FIELDS = [
  "schema_version",
  "hardening_id",
  "hardening_state",
  "hardening_hash",
  "allowed_next_step"
];

const ACTION_SEQUENCE_FIELDS = [
  "non_live_connector_promotion_requirements",
  "glean_source_adapter_boundary",
  "source_descriptor_promotion_checklist",
  "exact_scope_live_connector_promotion_gate"
];

const ACTION_FIELDS = [
  "state",
  "scope",
  "review_owner",
  "required_before_next_action",
  "authorizes_live_execution",
  "authorizes_model_or_weights"
];

const FUTURE_MODEL_READINESS_FIELDS = [
  "target_state",
  "current_state",
  "numeric_weights_authorized",
  "bayesian_model_authorized",
  "model_output_authorized",
  "readiness_prerequisites"
];

const FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "query_text_storage",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "source_package_clearance",
  "source_descriptor_customer_exposure",
  "measurement_cell_creation",
  "measurement_cell_snapshot_write",
  "measurement_cell_series_persistence",
  "evidence_continuity_persistence",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "research_model_feed",
  "model_output",
  "numeric_weights_output",
  "bayesian_model_execution",
  "bayesian_probability_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "roi_output",
  "causality_output",
  "productivity_output",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const BOUNDARY_POLICY_FIELDS = [
  "fluencytracr_runs_bigquery",
  "fluencytracr_runs_sigma",
  "fluencytracr_runs_glean_query",
  "fluencytracr_runs_customer_connectors",
  "fluencytracr_uses_credentials",
  "fluencytracr_executes_queries",
  "fluencytracr_stores_query_text",
  "fluencytracr_receives_raw_rows",
  "fluencytracr_receives_dashboard_rows",
  "fluencytracr_receives_identifiers",
  "persists_connector_run",
  "persists_pipeline_run",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "extends_evidence_continuity",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "feeds_research_model",
  "implements_statistical_model_equation",
  "implements_numeric_weights",
  "implements_bayesian_model",
  "emits_model_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "sequence_id",
  "sequence_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_compact_hardening_ref",
  "prepared_source_systems",
  "held_source_systems",
  "action_sequence",
  "future_model_readiness",
  "prerequisites",
  "allowed_next_step",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "hold_reasons",
  "validation_summary",
  "sequence_hash"
]);

const PREREQUISITE_FIELDS = [
  "compact_source_wiring_hardening_valid",
  "bigquery_source_descriptor_prepared_non_live",
  "sigma_source_descriptor_prepared_non_live",
  "glean_source_adapter_held",
  "all_live_and_model_feeds_false"
];

const ALLOWED_SOURCE_SYSTEMS = new Set([
  "bigquery_export",
  "sigma_export",
  "glean_query"
]);

const ALLOWED_INPUT_FIELDS = new Set([
  "source_fixture",
  "compact_source_wiring_hardening",
  "generated_at"
]);

const REQUIRED_CAVEATS = [
  "Connector Promotion Readiness Sequence is requirements and gate design only; it does not authorize live BigQuery, Sigma, Glean, or customer connector execution.",
  "Glean remains held until a separate exact-scope non-live source adapter boundary plan exists.",
  "Source descriptor promotion requires human review before any live connector implementation decision.",
  "Numeric weights and Bayesian modeling are future research-readiness targets only; this sequence does not authorize weights, Bayesian execution, probability output, confidence output, model output, finance output, ROI, causality, productivity, or customer-facing output."
];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "query_text_storage",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "source_package_clearance",
  "source_descriptor_customer_exposure",
  "measurement_cell_creation",
  "measurement_cell_snapshot_write",
  "measurement_cell_series_persistence",
  "evidence_continuity_persistence",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "research_model_feed",
  "statistical_model_equation",
  "numeric_weights",
  "bayesian_model",
  "confidence_output",
  "probability_output",
  "score_output",
  "finance_output",
  "realized_roi",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning"
];

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:|-]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /dashboard_?rows?/i,
  /query_?text/i,
  /sql/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /credential/i,
  /secret/i,
  /token/i,
  /oauth/i,
  /service_?account/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /trace_?id/i,
  /job_?id/i,
  /query_?id/i,
  /api_?run/i,
  /dashboard_?url/i,
  /dashboard_?id/i,
  /workbook/i,
  /connector_?run/i,
  /warehouse/i,
  /^project_?id$/i,
  /^dataset_?id$/i,
  /^table_?id$/i,
  /source_?hash/i,
  /source_?refs?_?json/i,
  /payload_json/i,
  /validation_json/i,
  /measurement_?cell_?series_?snapshots/i,
  /confidence/i,
  /probability/i,
  /^score$/i,
  /score_?like/i,
  /^roi$/i,
  /finance/i,
  /financial/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i,
  /numeric_?weights/i,
  /model_?weights/i,
  /bayesian/i,
  /posterior/i,
  /likelihood/i,
  /customer_?facing/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /select\s+.+\s+from/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /warehouse/i,
  /workbook/i,
  /dashboard/i,
  /(?:^|[._:-])(?:project|dataset|table)[._:-]?(?:id|ref)?(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:org|client|customer|user|employee|person|row|span|trace)[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function validationSummary(valid, gaps) {
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid,
    gaps
  };
}

function pathContains(path, name) {
  return path.some((part) => part === name);
}

function keyIsFalsePosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && FALSE_FEEDS.includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "future_model_readiness" &&
      FUTURE_MODEL_READINESS_FIELDS.includes(key))
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
      !keyIsFalsePosture(path, key) &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      gaps.push(`${nextPath.join(".")} is not allowed`);
      continue;
    }
    gaps.push(...collectBoundaryLeakage(nestedValue, nextPath));
  }
  return gaps;
}

function collectAllowedFieldsGaps(record, allowedFields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !allowedFields.has(key))
    .map((key) => `${label}.${key} is not allowed`);
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

function safeCompactString(value) {
  if (typeof value !== "string") return null;
  return isSafeRef(value) ? value : null;
}

function safeHash(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value) ? value : null;
}

function safeGeneratedAt(input, options = {}) {
  const candidate = options.generatedAt ?? asRecord(input).generated_at;
  if (
    typeof candidate === "string" &&
    Number.isFinite(Date.parse(candidate)) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(candidate))
  ) {
    return { value: candidate, gaps: [] };
  }
  if (candidate !== undefined) {
    return {
      value: new Date().toISOString(),
      gaps: ["generated_at contains unsafe or invalid timestamp"]
    };
  }
  return { value: new Date().toISOString(), gaps: [] };
}

function inputBoundaryGaps(input, generatedAtGaps) {
  const record = asRecord(input);
  const wrapper = Object.prototype.hasOwnProperty.call(record, "source_fixture");
  if (!wrapper) return generatedAtGaps;
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return [
    ...generatedAtGaps,
    ...collectBoundaryLeakage(sidecar),
    ...Object.keys(sidecar)
      .filter((key) => !FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key)))
      .map((key) => `${key} is not allowed`)
  ];
}

function sourceFixtureFromInput(input) {
  const record = asRecord(input);
  return record.source_fixture ?? record;
}

function sourceHardeningFromInput(input, sourceFixture, generatedAt, options = {}) {
  const record = asRecord(input);
  if (record.compact_source_wiring_hardening) {
    return {
      hardening: asRecord(record.compact_source_wiring_hardening),
      supplied: true
    };
  }
  return {
    hardening: buildCompactSourceWiringHardeningFromObject(sourceFixture, {
      cwd: options.cwd ?? process.cwd(),
      generatedAt
    }),
    supplied: false
  };
}

function sourceHardeningRef(hardening) {
  return {
    schema_version: safeCompactString(hardening.schema_version),
    hardening_id: safeCompactString(hardening.hardening_id),
    hardening_state: safeCompactString(hardening.hardening_state),
    hardening_hash: safeHash(hardening.hardening_hash),
    allowed_next_step: safeCompactString(hardening.allowed_next_step)
  };
}

function safeSourceSystems(sources) {
  return asArray(sources)
    .map((source) => asRecord(source).source_system)
    .filter((sourceSystem) => ALLOWED_SOURCE_SYSTEMS.has(sourceSystem));
}

function actionSequence() {
  return {
    non_live_connector_promotion_requirements: {
      state: "READY_REQUIREMENTS_DRAFT_ONLY",
      scope: "non_live_connector_promotion_decision_requirements_only",
      review_owner: "human_value_realization_owner",
      required_before_next_action: "glean_source_adapter_boundary_plan",
      authorizes_live_execution: false,
      authorizes_model_or_weights: false
    },
    glean_source_adapter_boundary: {
      state: "HELD_NON_LIVE_GLEAN_ADAPTER_BOUNDARY_REQUIRED",
      scope: "held_non_live_glean_source_adapter_boundary_plan",
      review_owner: "human_source_adapter_owner",
      required_before_next_action: "source_descriptor_promotion_checklist",
      authorizes_live_execution: false,
      authorizes_model_or_weights: false
    },
    source_descriptor_promotion_checklist: {
      state: "READY_FOR_HUMAN_REVIEW_CHECKLIST",
      scope: "source_descriptor_promotion_human_checklist",
      review_owner: "human_governance_reviewer",
      required_before_next_action: "exact_scope_live_connector_promotion_gate_design",
      authorizes_live_execution: false,
      authorizes_model_or_weights: false
    },
    exact_scope_live_connector_promotion_gate: {
      state: "DESIGNED_EXACT_SCOPE_GATE_REQUIREMENTS_ONLY",
      scope: "bigquery_sigma_live_connector_promotion_gate_design_only",
      review_owner: "human_platform_and_security_reviewer",
      required_before_next_action: "human_review_before_live_connector_implementation",
      authorizes_live_execution: false,
      authorizes_model_or_weights: false
    }
  };
}

function futureModelReadiness() {
  return {
    target_state: "full_data_model_with_weights_and_bayesian_ready",
    current_state: "not_ready_requirements_and_gate_design_only",
    numeric_weights_authorized: false,
    bayesian_model_authorized: false,
    model_output_authorized: false,
    readiness_prerequisites: [
      "source_descriptor_promotion_human_review_passed",
      "exact_scope_live_connector_promotion_gate_approved",
      "live_connector_execution_boundary_implemented_upstream_only",
      "research_math_data_model_source_binding_revalidated",
      "numeric_weight_candidate_review_promoted",
      "bayesian_design_review_promoted"
    ]
  };
}

function baseSequence(state, valid, gaps, generatedAt) {
  const sourceBound = state === READY_STATE && valid;
  return {
    schema_version: CONNECTOR_PROMOTION_READINESS_SEQUENCE_SCHEMA_VERSION,
    sequence_id: `connector_promotion_readiness_sequence:${state.toLowerCase()}`,
    sequence_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceBound,
    prepared_source_systems: sourceBound ? ["bigquery_export", "sigma_export"] : [],
    held_source_systems: ["glean_query"],
    action_sequence: actionSequence(),
    future_model_readiness: futureModelReadiness(),
    allowed_next_step: sourceBound ? ALLOWED_NEXT_STEP : HELD_NEXT_STEP,
    feeds: falseMap(FALSE_FEEDS),
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    hold_reasons: gaps,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedSequence(gaps, generatedAt) {
  const prerequisites = Object.fromEntries(PREREQUISITE_FIELDS.map((field) => [field, false]));
  const sequence = {
    ...baseSequence(REJECTED_STATE, false, ["boundary_leakage_rejected"], generatedAt),
    source_compact_hardening_ref: null,
    prerequisites
  };
  sequence.sequence_hash = connectorPromotionReadinessSequenceHash(sequence);
  return sequence;
}

export function connectorPromotionReadinessSequenceHash(sequence) {
  const clone = JSON.parse(JSON.stringify(sequence));
  delete clone.sequence_hash;
  return sha256Json(clone);
}

export function buildConnectorPromotionReadinessSequenceFromObject(input, options = {}) {
  const generatedAtResult = safeGeneratedAt(input, options);
  const generatedAt = generatedAtResult.value;
  const wrapperGaps = inputBoundaryGaps(input, generatedAtResult.gaps);
  if (wrapperGaps.length > 0) {
    return rejectedSequence(wrapperGaps, generatedAt);
  }

  const sourceFixture = sourceFixtureFromInput(input);
  const sourceHardening = sourceHardeningFromInput(
    input,
    sourceFixture,
    generatedAt,
    options
  );
  const hardening = sourceHardening.hardening;
  const hardeningValidation = validateCompactSourceWiringHardening(
    hardening,
    sourceHardening.supplied
      ? { sourceFixture, cwd: options.cwd ?? process.cwd() }
      : {
          sourceFixture,
          expectedHardening: hardening,
          cwd: options.cwd ?? process.cwd()
        }
  );
  const preparedSystems = safeSourceSystems(hardening.prepared_source_systems);
  const heldSystems = safeSourceSystems(hardening.held_source_systems);
  const feeds = falseMap(FALSE_FEEDS);
  const boundaryPolicy = falseMap(BOUNDARY_POLICY_FIELDS);
  const prerequisites = {
    compact_source_wiring_hardening_valid:
      hardeningValidation.valid === true &&
      hardening.hardening_state === READY_COMPACT_HARDENING_STATE &&
      hardening.hardening_hash === compactSourceWiringHardeningHash(hardening),
    bigquery_source_descriptor_prepared_non_live:
      preparedSystems.includes("bigquery_export") &&
      hardening.feeds?.live_bigquery_execution === false,
    sigma_source_descriptor_prepared_non_live:
      preparedSystems.includes("sigma_export") &&
      hardening.feeds?.live_sigma_execution === false,
    glean_source_adapter_held:
      heldSystems.includes("glean_query") &&
      !preparedSystems.includes("glean_query") &&
      hardening.feeds?.live_glean_query === false,
    all_live_and_model_feeds_false:
      Object.values(feeds).every((value) => value === false) &&
      Object.values(boundaryPolicy).every((value) => value === false)
  };
  const gaps = [];
  for (const [field, value] of Object.entries(prerequisites)) {
    if (value !== true) {
      gaps.push(`${field}_not_satisfied`);
    }
  }
  gaps.push(...asArray(hardeningValidation.gaps));
  const holdReasons = [...new Set(gaps)];
  const valid = Object.values(prerequisites).every((value) => value === true) && gaps.length === 0;
  const sequence = {
    ...baseSequence(valid ? READY_STATE : HOLD_STATE, valid, valid ? [] : holdReasons, generatedAt),
    source_compact_hardening_ref: sourceHardeningRef(hardening),
    prepared_source_systems: valid ? ["bigquery_export", "sigma_export"] : preparedSystems,
    held_source_systems: ["glean_query"],
    prerequisites,
    feeds,
    boundary_policy: boundaryPolicy,
    hold_reasons: valid ? [] : holdReasons
  };
  if (sequence.source_compact_hardening_ref.hardening_hash) {
    sequence.sequence_id =
      `connector_promotion_readiness_sequence:${sequence.source_compact_hardening_ref.hardening_hash}`;
  }
  sequence.sequence_hash = connectorPromotionReadinessSequenceHash(sequence);
  return sequence;
}

function collectShapeGaps(sequence) {
  const gaps = [];
  const record = asRecord(sequence);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "sequence"));
  if (record.schema_version !== CONNECTOR_PROMOTION_READINESS_SEQUENCE_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.sequence_state)) {
    gaps.push("sequence_state is unsupported");
  }
  const sourceBound = record.sequence_state === READY_STATE;
  const rejected = record.sequence_state === REJECTED_STATE;
  if (record.source_bound !== sourceBound) {
    gaps.push(`source_bound must be ${sourceBound}`);
  }
  if (sourceBound && record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${ALLOWED_NEXT_STEP}`);
  }
  if (!sourceBound && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  if (rejected) {
    if (record.source_compact_hardening_ref !== null) {
      gaps.push("source_compact_hardening_ref must be null for rejected records");
    }
    if (record.sequence_id !== `connector_promotion_readiness_sequence:${REJECTED_STATE.toLowerCase()}`) {
      gaps.push("sequence_id must match rejected sequence state");
    }
  } else {
    gaps.push(
      ...collectRefShapeGaps(
        record.source_compact_hardening_ref,
        SOURCE_HARDENING_REF_FIELDS,
        "source_compact_hardening_ref"
      )
    );
    const ref = asRecord(record.source_compact_hardening_ref);
    const expectedSequenceId = ref.hardening_hash
      ? `connector_promotion_readiness_sequence:${ref.hardening_hash}`
      : `connector_promotion_readiness_sequence:${String(record.sequence_state ?? "").toLowerCase()}`;
    if (record.sequence_id !== expectedSequenceId) {
      gaps.push("sequence_id must bind to source compact hardening hash");
    }
    if (sourceBound) {
      if (ref.schema_version !== COMPACT_SOURCE_WIRING_HARDENING_SCHEMA_VERSION) {
        gaps.push("source_compact_hardening_ref.schema_version is unsupported");
      }
      if (ref.hardening_state !== READY_COMPACT_HARDENING_STATE) {
        gaps.push(`source_compact_hardening_ref.hardening_state must be ${READY_COMPACT_HARDENING_STATE}`);
      }
      if (!SHA256_PATTERN.test(String(ref.hardening_hash ?? ""))) {
        gaps.push("source_compact_hardening_ref.hardening_hash must be a sha256 hash");
      }
    }
  }

  if (stableStringify(asArray(record.prepared_source_systems)) !== stableStringify(sourceBound ? ["bigquery_export", "sigma_export"] : asArray(record.prepared_source_systems))) {
    gaps.push("prepared_source_systems shape is invalid");
  }
  if (sourceBound && stableStringify(record.prepared_source_systems) !== stableStringify(["bigquery_export", "sigma_export"])) {
    gaps.push("prepared_source_systems must include only bigquery_export and sigma_export");
  }
  if (!asArray(record.held_source_systems).includes("glean_query")) {
    gaps.push("held_source_systems must include glean_query");
  }
  if (asArray(record.prepared_source_systems).includes("glean_query")) {
    gaps.push("prepared_source_systems must not include glean_query");
  }

  gaps.push(...collectActionSequenceGaps(record.action_sequence));
  gaps.push(...collectFutureModelReadinessGaps(record.future_model_readiness));
  gaps.push(...collectRefShapeGaps(record.prerequisites, PREREQUISITE_FIELDS, "prerequisites"));
  const prerequisites = asRecord(record.prerequisites);
  for (const field of PREREQUISITE_FIELDS) {
    if (prerequisites[field] !== sourceBound) {
      gaps.push(`prerequisites.${field} must be ${sourceBound}`);
    }
  }

  const feeds = asRecord(record.feeds);
  gaps.push(...collectAllowedFieldsGaps(feeds, new Set(FALSE_FEEDS), "feeds"));
  for (const field of FALSE_FEEDS) {
    if (feeds[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }

  const boundaryPolicy = asRecord(record.boundary_policy);
  gaps.push(...collectAllowedFieldsGaps(boundaryPolicy, new Set(BOUNDARY_POLICY_FIELDS), "boundary_policy"));
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (boundaryPolicy[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }

  for (const caveat of REQUIRED_CAVEATS) {
    if (!asArray(record.required_caveats).includes(caveat)) {
      gaps.push(`required_caveats must include: ${caveat}`);
    }
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!asArray(record.blocked_uses).includes(blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
  }

  gaps.push(...collectBoundaryLeakage(record));
  const expectedHash = connectorPromotionReadinessSequenceHash(record);
  if (record.sequence_hash !== expectedHash) {
    gaps.push("sequence_hash must match sequence body");
  }
  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  if (summary.valid !== sourceBound) {
    gaps.push(`validation_summary.valid must be ${sourceBound}`);
  }
  if (sourceBound && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready records");
  }
  if (!sourceBound && stableStringify(summary.gaps) !== stableStringify(record.hold_reasons ?? [])) {
    gaps.push("validation_summary.gaps must match hold_reasons for held records");
  }
  return [...new Set(gaps)];
}

function collectRefShapeGaps(record, fields, label) {
  const gaps = [];
  const ref = asRecord(record);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`${label}.${field} is required`);
    }
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function collectActionSequenceGaps(actionSequenceRecord) {
  const gaps = collectRefShapeGaps(
    actionSequenceRecord,
    ACTION_SEQUENCE_FIELDS,
    "action_sequence"
  );
  const expected = actionSequence();
  for (const field of ACTION_SEQUENCE_FIELDS) {
    gaps.push(...collectRefShapeGaps(asRecord(actionSequenceRecord)[field], ACTION_FIELDS, `action_sequence.${field}`));
    if (stableStringify(asRecord(actionSequenceRecord)[field]) !== stableStringify(expected[field])) {
      gaps.push(`action_sequence.${field} must match governed action definition`);
    }
  }
  return gaps;
}

function collectFutureModelReadinessGaps(record) {
  const gaps = collectRefShapeGaps(
    record,
    FUTURE_MODEL_READINESS_FIELDS,
    "future_model_readiness"
  );
  const readiness = asRecord(record);
  const expected = futureModelReadiness();
  if (stableStringify(readiness) !== stableStringify(expected)) {
    gaps.push("future_model_readiness must remain target-only and unauthorized");
  }
  return gaps;
}

function collectSourceBindingGaps(sequence, options = {}) {
  if (!options.sourceFixture) return [];
  const expected = options.expectedSequence
    ? asRecord(options.expectedSequence)
    : buildConnectorPromotionReadinessSequenceFromObject(options.sourceFixture, {
        cwd: options.cwd ?? process.cwd(),
        generatedAt: asRecord(sequence).generated_at
      });
  const record = asRecord(sequence);
  const gaps = [];
  for (const field of [
    "sequence_id",
    "sequence_state",
    "source_bound",
    "source_compact_hardening_ref",
    "prepared_source_systems",
    "held_source_systems",
    "action_sequence",
    "future_model_readiness",
    "prerequisites",
    "allowed_next_step",
    "feeds",
    "boundary_policy",
    "required_caveats",
    "blocked_uses",
    "hold_reasons",
    "validation_summary"
  ]) {
    if (stableStringify(record[field]) !== stableStringify(expected[field])) {
      gaps.push(`sourceFixture binding mismatch for ${field}`);
    }
  }
  return gaps;
}

export function validateConnectorPromotionReadinessSequence(sequence, options = {}) {
  const record = asRecord(sequence);
  const gaps = [
    ...collectShapeGaps(record),
    ...collectSourceBindingGaps(record, options)
  ];
  if (record.sequence_state === READY_STATE && !options.sourceFixture) {
    gaps.push("sourceFixture is required to validate ready connector promotion readiness sequence");
  }
  return validationSummary(
    gaps.length === 0 && record.sequence_state === READY_STATE,
    [...new Set(gaps)]
  );
}

function inputFromCliPath(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_connector_promotion_readiness_sequence.mjs <source-fixture-or-sequence-input-json>"
    );
    process.exit(1);
  }
  const sequence = buildConnectorPromotionReadinessSequenceFromObject(inputFromCliPath(inputPath), {
    cwd: process.cwd()
  });
  process.stdout.write(`${JSON.stringify(sequence, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
