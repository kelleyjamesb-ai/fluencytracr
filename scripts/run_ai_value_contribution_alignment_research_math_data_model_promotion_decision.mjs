#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";
import {
  buildContributionAlignmentRunnerReviewPacketFromObject
} from "./run_ai_value_contribution_alignment_runner_review_packet.mjs";
import {
  buildContributionAlignmentModelPrototypeDesignReviewFromObject
} from "./run_ai_value_contribution_alignment_model_prototype_design_review.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeFromObject
} from "./run_ai_value_contribution_alignment_internal_model_prototype.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject
} from "./run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs";
import {
  buildContributionAlignmentInternalResearchDesignGateReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs";
import {
  buildContributionAlignmentMethodPrototypeDecisionFromObject
} from "./run_ai_value_contribution_alignment_method_prototype_decision.mjs";
import {
  buildContributionAlignmentSmallInternalMethodPrototypeFromObject
} from "./run_ai_value_contribution_alignment_small_internal_method_prototype.mjs";
import {
  buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject
} from "./run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs";
import {
  buildContributionAlignmentResearchMathFinalizationReviewFromObject,
  validateContributionAlignmentResearchMathFinalizationReview
} from "./run_ai_value_contribution_alignment_research_math_finalization_review.mjs";

export const CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_research_math_data_model_promotion_decision_2026_06";

const READY_STATE = "PROMOTE_INTERNAL_RESEARCH_MATH_DATA_MODEL_LAYER";
const HOLD_REVIEW_STATE = "HOLD_FOR_VALID_RESEARCH_MATH_FINALIZATION_REVIEW";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const SOURCE_FINALIZATION_REVIEW_READY_STATE =
  "READY_FOR_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION";

const RUNNER_IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const FALSE_FEEDS = [
  "research_model_feed",
  "research_math_output",
  "model_implementation",
  "model_output",
  "numeric_weight_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "finance_context_investigation",
  "customer_facing_output",
  "customer_facing_export",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_finalization_review_ref",
  "decision_scope",
  "data_model_layer_scope",
  "context_partition_requirements",
  "promotion_basis",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "decision_hash"
]);

const DECISION_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "decision_only",
  "internal_research_math_data_model_layer",
  "research_model_feed",
  "research_math_output",
  "model_implementation",
  "numeric_weights",
  "confidence_output",
  "model_result",
  "probability_output",
  "score_like_output",
  "finance_output",
  "customer_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution"
];

const DATA_MODEL_LAYER_SCOPE_FIELDS = [
  "allowed_next_step",
  "requires_separate_promotion",
  "non_persistent_layer_only",
  "persists_research_inputs",
  "creates_physical_tables",
  "creates_customer_read_model",
  "implements_research_math",
  "emits_numeric_result",
  "emits_customer_output",
  "runs_live_connectors"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_finalization_review_only",
  "receives_full_finalization_review_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "receives_full_series_payloads",
  "persists_decision",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "feeds_research_model",
  "implements_research_math",
  "emits_research_math_output",
  "emits_model_result",
  "emits_numeric_weights",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const REQUIRED_BLOCKED_USES = [
  "research_model_feed",
  "research_math_output",
  "model_implementation",
  "model_output",
  "numeric_weights",
  "confidence_output",
  "contribution_model_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "finance_context_investigation",
  "roi",
  "ebitda",
  "financial_attribution",
  "causality_claim",
  "productivity_measurement",
  "customer_facing_output",
  "customer_facing_export",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "raw_data_storage"
];

const REQUIRED_CAVEATS = [
  "Research math data model promotion decision is non-persistent internal gating only.",
  "Ready state authorizes only a compact internal research math data model layer.",
  "The promoted layer may define data-model context and component boundaries only.",
  "The decision does not authorize research math output, model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, persistence, schemas, live connectors, or customer-facing output.",
  "AI Fluency construct context, AI Fluency psychological context, observed VBD context, and selected customer metric movement must remain distinct."
];

const DATA_MODEL_LAYER_SCOPE = {
  allowed_next_step: "internal_research_math_data_model_layer_only",
  requires_separate_promotion: true,
  non_persistent_layer_only: true,
  persists_research_inputs: false,
  creates_physical_tables: false,
  creates_customer_read_model: false,
  implements_research_math: false,
  emits_numeric_result: false,
  emits_customer_output: false,
  runs_live_connectors: false
};

const CONTEXT_PARTITION_REQUIREMENTS = {
  ai_fluency_construct_context: "required_distinct_context",
  ai_fluency_psychological_context: "required_distinct_context",
  observed_vbd_context: "required_distinct_context",
  selected_metric_movement_context: "required_distinct_context",
  substitution_rule: "psychological_context_observed_vbd_context_and_metric_movement_are_not_substitutable"
};

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /query_?text/i,
  /sql_?text/i,
  /\bsql\b/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /raw_?text/i,
  /survey_?item/i,
  /respondent/i,
  /user_?id/i,
  /employee_?id/i,
  /person_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /hashed.*identifier/i,
  /joinable.*identifier/i,
  /source_?package_?payload/i,
  /handoff_?bundle_?payload/i,
  /review_?record_?payload/i,
  /finalization_?review_?payload/i,
  /measurement_?cell_?payload/i,
  /series_?payload/i,
  /payload_?json/i,
  /warehouse_?ref/i,
  /dataset_?path/i,
  /project_?dataset_?table/i,
  /dashboard_?slug/i,
  /looker_?(?:dashboard|report)_?id/i,
  /job_?reference/i,
  /source_?system_?ref/i,
  /equation/i,
  /formula/i,
  /model_?result/i,
  /model_?output/i,
  /numeric_?weight/i,
  /confidence_?score/i,
  /contribution_?score/i,
  /probability/i,
  /posterior/i,
  /\broi\b/i,
  /ebitda/i,
  /finance_?result/i,
  /finance_?output/i,
  /causality/i,
  /productivity/i,
  /customer_?facing_?result/i,
  /customer_?facing_?output/i,
  /export_?payload/i,
  /route_?payload/i,
  /ui_?payload/i,
  /credential/i,
  /secret/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /https?:\/\//i,
  /\braw rows?\b/i,
  /raw[_-\s]?rows?/i,
  /\bquery text\b/i,
  /query[_-\s]?text/i,
  /\bsql text\b/i,
  /prompt/i,
  /transcript/i,
  /(?:^|_)(?:user|employee|person|respondent)_(?:id|identifier|email|name)(?:_|$)/i,
  /hashed[_-\s]?(?:user|person|employee|respondent)/i,
  /joinable[_-\s]?(?:user|person|employee|respondent)/i,
  /row[_-\s]?id/i,
  /span[_-\s]?id/i,
  /source_package_(?:payload|clearance|cleared|approved|passed)/i,
  /operator_source_handoff_bundle/i,
  /review_record_payload/i,
  /measurement_cell_payload/i,
  /measurement_cell_series_payload/i,
  /payload_json/i,
  /validation_json/i,
  /source_refs_json/i,
  /blueprint_path_binding_json/i,
  /research[_-\s]?model/i,
  /model[_-\s]?(?:result|output|outputs|training|feed|approved|approval|authorized|authorization)/i,
  /statistical[_-\s]?model[_-\s]?selection/i,
  /durable[_-\s]?research[_-\s]?inputs/i,
  /feature[_-\s]?table/i,
  /warehouse[_-\s]?ref/i,
  /dataset[_-\s]?path/i,
  /dashboard[_-\s]?slug/i,
  /looker[_-\s]?(?:dashboard|report)/i,
  /job[_-\s]?reference/i,
  /source[_-\s]?system[_-\s]?ref/i,
  /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\b/i,
  /prediction[_-\s]?output/i,
  /equation/i,
  /formula/i,
  /f\s*\(/i,
  /coefficient/i,
  /likelihood/i,
  /index/i,
  /\bconfidence score\b/i,
  /confidence[_-\s]?(?:score|percentage|percent|model|output|ready)/i,
  /\bcontribution score\b/i,
  /customer[-_\s]?facing\s+confidence/i,
  /\bprobability of contribution\b/i,
  /probability/i,
  /score[_-\s]?(?:like|output|ready|field)?/i,
  /numeric[_-\s]?weight/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?attribution/i,
  /\bproved roi\b/i,
  /\bpredicted roi\b/i,
  /\brealized roi\b/i,
  /\broi\b/i,
  /\bebitda\b/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /\bproductivity\b/i,
  /\bcustomer-facing confidence\b/i
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

function sha256Text(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function sha256Json(value) {
  return sha256Text(stableStringify(value));
}

function clone(value) {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps) {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function safeValidationScalar(value, allowedValues = []) {
  if (allowedValues.includes(value)) return value;
  if (typeof value !== "string") return null;
  if (/^contribution_alignment_research_math_data_model_promotion_decision_[0-9a-f]{16}$/.test(value)) {
    return value;
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return null;
}

function compactScalar(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function compactId(value, prefix) {
  if (typeof value !== "string") return null;
  return new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value) ? value : null;
}

function compactHash(value) {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function compactState(value, allowedValues) {
  if (typeof value !== "string") return null;
  return allowedValues.includes(value) ? value : null;
}

function compactAllowedScalar(value, allowedValues) {
  if (typeof value !== "string") return null;
  return allowedValues.includes(value) ? value : null;
}

function exactArrayGaps(value, expected, path) {
  if (!Array.isArray(value)) return [`${path} must be an array`];
  if (stableStringify(value) !== stableStringify(expected)) {
    return [`${path} must match governed values`];
  }
  return [];
}

function exactObjectGaps(value, expected, path) {
  if (!isPlainObject(value)) return [`${path} is required`];
  for (const key of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(expected, key)) {
      return [`${path} contains ungoverned field`];
    }
  }
  const gaps = [];
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (value[field] !== expectedValue) gaps.push(`${path}.${field} is invalid`);
  }
  return gaps;
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("research math finalization review must match source-review-record-bound expected envelope")) {
    return "source_finalization_review: research math finalization review must match source-review-record-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_finalization_review rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_finalization_review rejected unsafe or invalid content";
  }
  return `source_finalization_review: ${text}`;
}

function compactSourceFinalizationReviewRef(finalizationReview) {
  return {
    finalization_review_id: compactId(
      finalizationReview?.finalization_review_id,
      "contribution_alignment_research_math_finalization_review"
    ),
    finalization_review_state: compactState(finalizationReview?.finalization_review_state, [
      SOURCE_FINALIZATION_REVIEW_READY_STATE,
      "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD",
      REJECT_BOUNDARY_STATE
    ]),
    finalization_review_hash: compactHash(finalizationReview?.finalization_review_hash),
    source_review_record_id: compactId(
      finalizationReview?.source_review_record_ref?.review_record_id,
      "contribution_alignment_internal_method_prototype_review_record"
    ),
    source_review_record_hash: compactHash(
      finalizationReview?.source_review_record_ref?.review_record_hash
    ),
    allowed_next_step: compactAllowedScalar(
      finalizationReview?.next_step_scope?.allowed_next_step,
      ["research_math_data_model_promotion_decision_only"]
    )
  };
}

function hasForbiddenContent(value, path = "decision") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("decision.feeds.") ||
      path.startsWith("decision.boundary_policy.") ||
      path.startsWith("decision.decision_scope.") ||
      path.startsWith("decision.data_model_layer_scope.") ||
      path.startsWith("decision.promotion_basis.")
    );
  if (safeFalseBoundaryFlag) return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...hasForbiddenContent(item, `${path}[${index}]`));
    });
    return gaps;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const unsafeKey =
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key)) ||
        FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(key));
      const safeNegativeBoundaryKey =
        nested === false &&
        (
          path === "decision.feeds" ||
          path === "decision.boundary_policy" ||
          path === "decision.decision_scope" ||
          path === "decision.data_model_layer_scope" ||
          path === "decision.promotion_basis"
        );
      if (!safeNegativeBoundaryKey && unsafeKey) {
        gaps.push("decision contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value === "string") {
    if (
      path.startsWith("decision.blocked_uses[") &&
      REQUIRED_BLOCKED_USES.includes(value)
    ) {
      return gaps;
    }
    if (
      path.startsWith("decision.required_caveats[") &&
      REQUIRED_CAVEATS.includes(value)
    ) {
      return gaps;
    }
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        gaps.push(`${path} contains unsafe model, finance, raw, identifier, or customer-facing language`);
      }
    }
  }
  return gaps;
}

function sourceFinalizationReviewValidationFor(finalizationReview, options = {}) {
  if (!finalizationReview) {
    return {
      valid: false,
      gaps: ["sourceFinalizationReview is required"]
    };
  }
  return validateContributionAlignmentResearchMathFinalizationReview(
    finalizationReview,
    {
      sourceRunner: options.sourceRunner,
      sourceReviewPacket: options.sourceReviewPacket,
      sourceDesignReview: options.sourceDesignReview,
      sourcePrototype: options.sourcePrototype,
      sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
      sourceGateReview: options.sourceGateReview,
      sourceDecision: options.sourceDecision,
      sourceMethodPrototype: options.sourceMethodPrototype,
      sourceReviewRecord: options.sourceReviewRecord,
      sourcePacket: options.sourcePacket,
      sourceFixture: options.sourceFixture,
      researchDesignText: options.researchDesignText,
      researchDesignPath: options.researchDesignPath,
      implementationDecisionText: options.implementationDecisionText,
      cwd: options.cwd ?? process.cwd()
    }
  );
}

function decisionStateFor(finalizationReview, sourceValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const finalizationReviewReady =
    finalizationReview?.finalization_review_state === SOURCE_FINALIZATION_REVIEW_READY_STATE &&
    finalizationReview?.feeds?.research_math_data_model_promotion_decision === true &&
    sourceValidation.valid === true;
  return finalizationReviewReady ? READY_STATE : HOLD_REVIEW_STATE;
}

export function contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision) {
  const withoutHash = { ...decision };
  delete withoutHash.decision_hash;
  return sha256Json(withoutHash);
}

function buildBaseDecision(sourceFinalizationReview, options = {}) {
  const finalizationReview = clone(sourceFinalizationReview);
  const sourceValidation = sourceFinalizationReviewValidationFor(finalizationReview, options);
  const preliminaryContentGaps = [];
  const decisionState = decisionStateFor(
    finalizationReview,
    sourceValidation,
    preliminaryContentGaps
  );
  const ready = decisionState === READY_STATE;
  const validationGaps = sanitizeGaps(
    sourceValidation.gaps.map(safeValidationGap)
  );

  let decision = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION_SCHEMA_VERSION,
    decision_id: `contribution_alignment_research_math_data_model_promotion_decision_${sha256Json({
      finalization_review_id: finalizationReview?.finalization_review_id ?? null,
      finalization_review_hash: finalizationReview?.finalization_review_hash ?? null
    }).slice(0, 16)}`,
    decision_state: decisionState,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_finalization_review_ref: compactSourceFinalizationReviewRef(finalizationReview),
    decision_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      decision_only: true,
      internal_research_math_data_model_layer: ready,
      research_model_feed: false,
      research_math_output: false,
      model_implementation: false,
      numeric_weights: false,
      confidence_output: false,
      model_result: false,
      probability_output: false,
      score_like_output: false,
      finance_output: false,
      customer_output: false,
      route_creation: false,
      ui_creation: false,
      schema_creation: false,
      persistence_write: false,
      export_creation: false,
      live_connector_execution: false
    },
    data_model_layer_scope: { ...DATA_MODEL_LAYER_SCOPE },
    context_partition_requirements: { ...CONTEXT_PARTITION_REQUIREMENTS },
    promotion_basis: {
      source_finalization_review_ready: ready,
      source_finalization_review_valid: sourceValidation.valid === true,
      context_partitions_required: ready,
      internal_data_model_layer_only: ready,
      durable_state_authorized: false,
      physical_tables_authorized: false,
      numeric_result_authorized: false,
      customer_output_authorized: false
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_research_math_data_model_layer: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_finalization_review_only: true,
      receives_full_finalization_review_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      receives_full_series_payloads: false,
      persists_decision: false,
      creates_routes: false,
      creates_ui: false,
      creates_schemas: false,
      creates_exports: false,
      runs_live_connectors: false,
      feeds_research_model: false,
      implements_research_math: false,
      emits_research_math_output: false,
      emits_model_result: false,
      emits_numeric_weights: false,
      emits_confidence_output: false,
      emits_probability: false,
      emits_score_like_output: false,
      emits_finance_output: false,
      emits_customer_facing_output: false,
      computes_roi: false,
      claims_causality: false,
      measures_productivity: false
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      decision_state: decisionState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(decision);
  if (contentGaps.length > 0) {
    decision = {
      ...decision,
      decision_state: REJECT_BOUNDARY_STATE,
      decision_scope: {
        ...decision.decision_scope,
        internal_research_math_data_model_layer: false
      },
      promotion_basis: {
        ...decision.promotion_basis,
        source_finalization_review_ready: false,
        source_finalization_review_valid: false,
        context_partitions_required: false,
        internal_data_model_layer_only: false
      },
      feeds: {
        ...decision.feeds,
        internal_research_math_data_model_layer: false
      },
      validation_summary: {
        ...decision.validation_summary,
        valid: false,
        decision_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  decision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision);
  return decision;
}

export function buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
  sourceFinalizationReview,
  options = {}
) {
  return buildBaseDecision(sourceFinalizationReview, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(decision) {
  const gaps = [];
  if (!isPlainObject(decision)) {
    return ["research math data model promotion decision must be an object"];
  }
  Object.keys(decision).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    decision.schema_version !==
    CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_REVIEW_STATE, REJECT_BOUNDARY_STATE].includes(decision.decision_state)) {
    gaps.push("decision_state is invalid");
  }
  if (!isPlainObject(decision.decision_scope)) {
    gaps.push("decision_scope is required");
  } else {
    for (const key of Object.keys(decision.decision_scope)) {
      if (!DECISION_SCOPE_FIELDS.includes(key)) gaps.push("decision_scope contains ungoverned field");
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      decision_only: true,
      internal_research_math_data_model_layer: decision.decision_state === READY_STATE,
      research_model_feed: false,
      research_math_output: false,
      model_implementation: false,
      numeric_weights: false,
      confidence_output: false,
      model_result: false,
      probability_output: false,
      score_like_output: false,
      finance_output: false,
      customer_output: false,
      route_creation: false,
      ui_creation: false,
      schema_creation: false,
      persistence_write: false,
      export_creation: false,
      live_connector_execution: false
    })) {
      if (decision.decision_scope[field] !== expected) {
        gaps.push(`decision_scope.${field} must be ${expected}`);
      }
    }
  }
  if (!isPlainObject(decision.data_model_layer_scope)) {
    gaps.push("data_model_layer_scope is required");
  } else {
    for (const key of Object.keys(decision.data_model_layer_scope)) {
      if (!DATA_MODEL_LAYER_SCOPE_FIELDS.includes(key)) {
        gaps.push("data_model_layer_scope contains ungoverned field");
      }
    }
    gaps.push(...exactObjectGaps(
      decision.data_model_layer_scope,
      DATA_MODEL_LAYER_SCOPE,
      "data_model_layer_scope"
    ));
  }
  gaps.push(...exactObjectGaps(
    decision.context_partition_requirements,
    CONTEXT_PARTITION_REQUIREMENTS,
    "context_partition_requirements"
  ));
  const feeds = decision.feeds ?? {};
  if (
    feeds.internal_research_math_data_model_layer !==
    (decision.decision_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_research_math_data_model_layer must be true only for ready decisions");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_research_math_data_model_layer" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_finalization_review_only") {
      if (decision.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_finalization_review_only must be true");
      }
    } else if (decision.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(decision.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(decision.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(decision.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = decision.validation_summary ?? {};
  if (validationSummary.decision_state !== decision.decision_state) {
    gaps.push("validation_summary.decision_state must match decision_state");
  }
  if (validationSummary.valid !== (decision.decision_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match decision readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (decision.decision_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready decisions");
  }
  if (
    decision.decision_hash !==
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision)
  ) {
    gaps.push("decision_hash must match compact research math data model promotion decision");
  }
  return gaps;
}

function collectSourceBindingGaps(decision, options = {}) {
  const gaps = [];
  if (!isPlainObject(decision)) {
    gaps.push("research math data model promotion decision must be an object");
    return gaps;
  }
  if (!options.sourceFinalizationReview) {
    gaps.push("sourceFinalizationReview is required for research math data model promotion decision validation");
    return gaps;
  }
  for (const [optionName, message] of [
    ["sourceReviewRecord", "sourceReviewRecord is required for research math data model promotion decision validation"],
    ["sourceMethodPrototype", "sourceMethodPrototype is required for research math data model promotion decision validation"],
    ["sourceDecision", "sourceDecision is required for research math data model promotion decision validation"],
    ["sourceGateReview", "sourceGateReview is required for research math data model promotion decision validation"],
    ["sourcePrototypeReviewPacket", "sourcePrototypeReviewPacket is required for research math data model promotion decision validation"],
    ["sourcePrototype", "sourcePrototype is required for research math data model promotion decision validation"],
    ["sourceDesignReview", "sourceDesignReview is required for research math data model promotion decision validation"],
    ["sourceReviewPacket", "sourceReviewPacket is required for research math data model promotion decision validation"],
    ["sourceRunner", "sourceRunner is required for research math data model promotion decision validation"],
    ["sourcePacket", "sourcePacket is required for research math data model promotion decision validation"],
    ["sourceFixture", "sourceFixture is required for research math data model promotion decision validation"],
    ["researchDesignText", "researchDesignText is required for research math data model promotion decision validation"],
    ["implementationDecisionText", "implementationDecisionText is required for research math data model promotion decision validation"]
  ]) {
    if (!options[optionName]) gaps.push(message);
  }
  const expectedDecision = buildBaseDecision(options.sourceFinalizationReview, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourceDecision: options.sourceDecision,
    sourceMethodPrototype: options.sourceMethodPrototype,
    sourceReviewRecord: options.sourceReviewRecord,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedDecision);
  const actualWithoutHash = clone(decision);
  delete expectedWithoutHash.decision_hash;
  delete actualWithoutHash.decision_hash;
  if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
    gaps.push("research math data model promotion decision must match source-finalization-review-bound expected envelope");
  }
  if (
    decision.source_finalization_review_ref?.finalization_review_id !==
    options.sourceFinalizationReview.finalization_review_id
  ) {
    gaps.push("source_finalization_review_ref.finalization_review_id drifted");
  }
  if (
    decision.source_finalization_review_ref?.finalization_review_hash !==
    options.sourceFinalizationReview.finalization_review_hash
  ) {
    gaps.push("source_finalization_review_ref.finalization_review_hash drifted");
  }
  const sourceValidation = sourceFinalizationReviewValidationFor(
    options.sourceFinalizationReview,
    options
  );
  const expectedState = decisionStateFor(options.sourceFinalizationReview, sourceValidation, []);
  if (decision.decision_state !== expectedState) {
    gaps.push(`decision_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentResearchMathDataModelPromotionDecision(
  decision,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(decision),
    ...collectSourceBindingGaps(decision, options),
    ...hasForbiddenContent(decision)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    decision_id: safeValidationScalar(decision?.decision_id),
    decision_state: safeValidationScalar(decision?.decision_state, [
      READY_STATE,
      HOLD_REVIEW_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && decision?.decision_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_research_math_data_model_promotion_decision.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
  );
  process.exit(1);
}

function cliOptions(argv) {
  const packetPath = argv.filter((arg) => !arg.startsWith("--")).at(-1);
  const sourceFixturePrefix = "--source-fixture=";
  const researchDesignPrefix = "--research-design=";
  const sourceFixtureArg = argv.find((arg) => arg.startsWith(sourceFixturePrefix));
  const researchDesignArg = argv.find((arg) => arg.startsWith(researchDesignPrefix));
  return {
    packetPath,
    sourceFixturePath: sourceFixtureArg?.slice(sourceFixturePrefix.length),
    researchDesignPath: researchDesignArg?.slice(researchDesignPrefix.length)
  };
}

function buildSourceChain(sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd) {
  const sourceRunner = buildContributionAlignmentInternalPrototypeRunnerFromObject(
    sourcePacket,
    { sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourceReviewPacket = buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    { sourceRunner, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourceDesignReview = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    { sourceRunner, sourceReviewPacket, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourcePrototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    sourceDesignReview,
    { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourcePrototypeReviewPacket =
    buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
      sourcePrototype,
      { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
    );
  const sourceGateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    sourcePrototypeReviewPacket,
    { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePrototypeReviewPacket, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourceDecision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    sourceGateReview,
    { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePrototypeReviewPacket, sourceGateReview, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourceMethodPrototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    sourceDecision,
    { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePrototypeReviewPacket, sourceGateReview, sourceDecision, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
  );
  const sourceReviewRecord =
    buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
      sourceMethodPrototype,
      { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePrototypeReviewPacket, sourceGateReview, sourceDecision, sourceMethodPrototype, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
    );
  const sourceFinalizationReview =
    buildContributionAlignmentResearchMathFinalizationReviewFromObject(
      sourceReviewRecord,
      { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePrototypeReviewPacket, sourceGateReview, sourceDecision, sourceMethodPrototype, sourceReviewRecord, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
    );
  return {
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision,
    sourceMethodPrototype,
    sourceReviewRecord,
    sourceFinalizationReview
  };
}

function main() {
  const { packetPath, sourceFixturePath, researchDesignPath } =
    cliOptions(process.argv.slice(2));
  if (!packetPath || !sourceFixturePath || !researchDesignPath) printUsageAndExit();
  const cwd = process.cwd();
  const sourcePacket = JSON.parse(readFileSync(resolve(cwd, packetPath), "utf8"));
  const sourceFixture = JSON.parse(readFileSync(resolve(cwd, sourceFixturePath), "utf8"));
  const researchDesignText = readFileSync(resolve(cwd, researchDesignPath), "utf8");
  const implementationDecisionText = readFileSync(
    resolve(cwd, RUNNER_IMPLEMENTATION_DECISION_PATH),
    "utf8"
  );
  const chain = buildSourceChain(
    sourcePacket,
    sourceFixture,
    researchDesignText,
    researchDesignPath,
    implementationDecisionText,
    cwd
  );
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      {
        ...chain,
        sourcePacket,
        sourceFixture,
        researchDesignText,
        researchDesignPath,
        implementationDecisionText,
        cwd
      }
    );
  const validation = validateContributionAlignmentResearchMathDataModelPromotionDecision(
    decision,
    {
      ...chain,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  if (!validation.envelope_valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) main();
