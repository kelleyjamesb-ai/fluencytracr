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
  buildContributionAlignmentResearchMathFinalizationReviewFromObject
} from "./run_ai_value_contribution_alignment_research_math_finalization_review.mjs";
import {
  buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject,
  validateContributionAlignmentResearchMathDataModelPromotionDecision
} from "./run_ai_value_contribution_alignment_research_math_data_model_promotion_decision.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_research_math_data_model_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_RESEARCH_MATH_FINALIZATION_DESIGN";
const HOLD_PROMOTION_DECISION_STATE =
  "HOLD_FOR_VALID_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const SOURCE_DECISION_READY_STATE = "PROMOTE_INTERNAL_RESEARCH_MATH_DATA_MODEL_LAYER";

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

const REQUIRED_COMPONENTS = [
  ["hypothesis_binding", "approved_path_identity_context"],
  ["source_coverage", "reviewed_aggregate_source_context"],
  ["milestone_continuity", "day_0_30_60_90_180_365_ref_context"],
  ["ai_fluency_construct_context_integrity", "aggregate_construct_context"],
  ["psychological_context_integrity", "aggregate_attitude_behavior_intent_context"],
  ["observed_vbd_alignment", "observed_work_behavior_context"],
  ["selected_metric_movement", "customer_metric_movement_context"],
  ["comparison_design_strength", "future_design_strength_context"],
  ["assumption_governance", "assumption_review_context"],
  ["boundary_clearance", "fail_closed_boundary_context"]
];

const COMPONENT_REGISTRY = REQUIRED_COMPONENTS.map(([component_id, evidence_role]) => ({
  component_id,
  evidence_role,
  model_role: "context_only",
  output_state: "not_emitted",
  numeric_role: "none"
}));

const MODEL_GRAIN = {
  approved_hypothesis_path: "one_selected_approved_expectation_path_ref",
  measurement_context: "one_source_bound_measurement_context_ref",
  milestone_evidence: "day_0_30_60_90_180_365_compact_refs",
  repeated_window_requirement:
    "required_before_later_separately_approved_customer_facing_promotion_review",
  persistence_posture: "not_authorized"
};

const CONTEXT_PARTITIONS = {
  ai_fluency_construct_context: {
    context_role: "aggregate_construct_context_only",
    construct_dimensions: [
      "Confidence",
      "Usage Quality",
      "Behavior Change",
      "Leadership Reinforcement",
      "Capability Growth"
    ],
    substitutes_for_observed_vbd: false,
    substitutes_for_metric_movement: false
  },
  ai_fluency_psychological_context: {
    context_role: "aggregate_psychological_context_only",
    instrument_items: [
      "ai_attitude",
      "ai_behavior_toward_ai",
      "behavioral_intent"
    ],
    substitutes_for_construct_context: false,
    substitutes_for_observed_vbd: false,
    substitutes_for_metric_movement: false
  },
  observed_vbd_context: {
    context_role: "observed_work_behavior_context_only",
    source_posture: "aggregate_telemetry_derived_context",
    substitutes_for_psychological_context: false,
    substitutes_for_metric_movement: false
  },
  selected_metric_movement_context: {
    context_role: "customer_owned_metric_movement_context_only",
    source_posture: "approved_customer_metric_context",
    substitutes_for_observed_vbd: false,
    substitutes_for_finance_output: false
  }
};

const RESEARCH_DESIGN_BOUNDARY = {
  allowed_method_family_metadata: "separate_future_design_only",
  research_math_execution_not_authorized: true,
  statistical_parameter_output_blocked: true,
  numeric_component_output_blocked: true,
  uncertainty_output_blocked: true,
  contribution_claim_not_authorized: true,
  customer_output_not_authorized: true
};

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "data_model_id",
  "data_model_state",
  "generated_at",
  "derivation_version",
  "source_promotion_decision_ref",
  "data_model_scope",
  "model_grain",
  "component_registry",
  "context_partitions",
  "research_design_boundary",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "data_model_hash"
]);

const DATA_MODEL_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "data_model_boundary_only",
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

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_promotion_decision_only",
  "receives_full_promotion_decision_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "receives_full_series_payloads",
  "persists_data_model",
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
  "Internal research math data model is non-persistent internal design support only.",
  "The data model defines compact context grain and component boundaries only.",
  "The data model does not implement research math or emit numeric results.",
  "The data model does not authorize research model feed, model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, persistence, schemas, live connectors, or customer-facing output.",
  "AI Fluency construct context, AI Fluency psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /query_?text/i,
  /sql_?text/i,
  /\bsql\b/i,
  /prompt/i,
  /messages?/i,
  /chat_?log/i,
  /conversation/i,
  /completion/i,
  /response/i,
  /transcript/i,
  /meeting_?notes/i,
  /source_?excerpt/i,
  /raw_?text/i,
  /raw_?answer/i,
  /open_?response/i,
  /survey_?item/i,
  /respondent/i,
  /user_?id/i,
  /employee_?id/i,
  /person_?id/i,
  /actor_?id/i,
  /principal_?id/i,
  /creator_?id/i,
  /owner_?email/i,
  /slack_?user_?id/i,
  /anonymous_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /hashed.*identifier/i,
  /hashed.*email/i,
  /joinable.*identifier/i,
  /source_?package_?payload/i,
  /handoff_?bundle_?payload/i,
  /review_?record_?payload/i,
  /finalization_?review_?payload/i,
  /promotion_?decision_?payload/i,
  /measurement_?cell_?payload/i,
  /series_?payload/i,
  /payload_?json/i,
  /model_?input/i,
  /feature_?table/i,
  /table_?ref/i,
  /warehouse_?ref/i,
  /dataset_?path/i,
  /project_?dataset_?table/i,
  /dashboard_?slug/i,
  /looker_?(?:dashboard|report)_?id/i,
  /job_?reference/i,
  /source_?system_?ref/i,
  /snapshot_?payload/i,
  /customer_?read_?model/i,
  /metric_?contribution_?value/i,
  /equation/i,
  /formula/i,
  /model_?result/i,
  /model_?output/i,
  /numeric_?weight/i,
  /component_?weight/i,
  /confidence_?score/i,
  /contribution_?score/i,
  /probability/i,
  /posterior/i,
  /p_?value/i,
  /standard_?error/i,
  /credible_?interval/i,
  /effect_?size/i,
  /r_?squared/i,
  /\broi\b/i,
  /arr_?impact/i,
  /cost_?savings/i,
  /fte_?reduction/i,
  /headcount/i,
  /payback/i,
  /margin/i,
  /ebita/i,
  /ebitda/i,
  /net_?present_?value/i,
  /finance_?result/i,
  /finance_?output/i,
  /causality/i,
  /counterfactual/i,
  /treatment_?group/i,
  /control_?group/i,
  /diff_?in_?diff/i,
  /\bate\b/i,
  /incremental_?effect/i,
  /productivity/i,
  /time_?saved/i,
  /hours_?saved/i,
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
  /scio_apps/i,
  /scrubbed_agentspan/i,
  /bigquery\.jobUser/i,
  /sigma/i,
  /\$[0-9]/i,
  /\braw rows?\b/i,
  /raw[_-\s]?rows?/i,
  /\bquery text\b/i,
  /query[_-\s]?text/i,
  /\bsql text\b/i,
  /prompt/i,
  /transcript/i,
  /actor[_-\s]?id/i,
  /principal[_-\s]?id/i,
  /creator[_-\s]?id/i,
  /owner[_-\s]?email/i,
  /slack[_-\s]?user[_-\s]?id/i,
  /anonymous[_-\s]?id/i,
  /hashed[_-\s]?email/i,
  /(?:^|_)(?:user|employee|person|respondent)_(?:id|identifier|email|name)(?:_|$)/i,
  /row[_-\s]?id/i,
  /span[_-\s]?id/i,
  /payload_json/i,
  /research[_-\s]?model/i,
  /model[_-\s]?(?:result|output|outputs|training|feed|approved|approval|authorized|authorization)/i,
  /feature[_-\s]?table/i,
  /table[_-\s]?ref/i,
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
  /coefficient/i,
  /likelihood/i,
  /component[_-\s]?weight/i,
  /\bconfidence score\b/i,
  /confidence[_-\s]?(?:score|percentage|percent|model|output|ready)/i,
  /\bcontribution score\b/i,
  /customer[-_\s]?facing\s+confidence/i,
  /\bprobability of contribution\b/i,
  /probability/i,
  /posterior/i,
  /p[_-\s]?value/i,
  /standard[_-\s]?error/i,
  /credible[_-\s]?interval/i,
  /score[_-\s]?(?:like|output|ready|field)?/i,
  /numeric[_-\s]?weight/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?attribution/i,
  /\bproved roi\b/i,
  /\bpredicted roi\b/i,
  /\brealized roi\b/i,
  /\broi\b/i,
  /\bebita\b/i,
  /\bebitda\b/i,
  /arr[_-\s]?impact/i,
  /cost[_-\s]?savings/i,
  /fte[_-\s]?reduction/i,
  /headcount[_-\s]?saved/i,
  /payback/i,
  /net[_-\s]?present[_-\s]?value/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /counterfactual/i,
  /treatment[_-\s]?group/i,
  /control[_-\s]?group/i,
  /diff[_-\s]?in[_-\s]?diff/i,
  /\bate\b/i,
  /incremental[_-\s]?effect/i,
  /\bproductivity\b/i,
  /time[_-\s]?saved/i,
  /hours[_-\s]?saved/i
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
  if (/^contribution_alignment_internal_research_math_data_model_[0-9a-f]{16}$/.test(value)) {
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
    if (stableStringify(value[field]) !== stableStringify(expectedValue)) {
      gaps.push(`${path}.${field} is invalid`);
    }
  }
  return gaps;
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("research math data model promotion decision must match source-finalization-review-bound expected envelope")) {
    return "source_promotion_decision: research math data model promotion decision must match source-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_promotion_decision rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_promotion_decision rejected unsafe or invalid content";
  }
  return `source_promotion_decision: ${text}`;
}

function compactSourcePromotionDecisionRef(decision) {
  return {
    decision_id: compactId(
      decision?.decision_id,
      "contribution_alignment_research_math_data_model_promotion_decision"
    ),
    decision_state: compactState(decision?.decision_state, [
      SOURCE_DECISION_READY_STATE,
      "HOLD_FOR_VALID_RESEARCH_MATH_FINALIZATION_REVIEW",
      REJECT_BOUNDARY_STATE
    ]),
    decision_hash: compactHash(decision?.decision_hash),
    source_finalization_review_id: compactId(
      decision?.source_finalization_review_ref?.finalization_review_id,
      "contribution_alignment_research_math_finalization_review"
    ),
    source_finalization_review_hash: compactHash(
      decision?.source_finalization_review_ref?.finalization_review_hash
    ),
    allowed_next_step: compactAllowedScalar(
      decision?.data_model_layer_scope?.allowed_next_step,
      ["internal_research_math_data_model_layer_only"]
    )
  };
}

function hasForbiddenContent(value, path = "data_model") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("data_model.feeds.") ||
      path.startsWith("data_model.boundary_policy.") ||
      path.startsWith("data_model.data_model_scope.") ||
      path.startsWith("data_model.research_design_boundary.") ||
      path.startsWith("data_model.context_partitions.") ||
      path.startsWith("data_model.promotion_basis.")
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
          path === "data_model.feeds" ||
          path === "data_model.boundary_policy" ||
          path === "data_model.data_model_scope" ||
          path === "data_model.research_design_boundary" ||
          path.startsWith("data_model.context_partitions.")
        );
      if (!safeNegativeBoundaryKey && unsafeKey) {
        gaps.push("data_model contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value === "string") {
    if (
      path.startsWith("data_model.blocked_uses[") &&
      REQUIRED_BLOCKED_USES.includes(value)
    ) {
      return gaps;
    }
    if (
      path.startsWith("data_model.required_caveats[") &&
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

function sourcePromotionDecisionValidationFor(decision, options = {}) {
  if (!decision) {
    return {
      valid: false,
      gaps: ["sourcePromotionDecision is required"]
    };
  }
  return validateContributionAlignmentResearchMathDataModelPromotionDecision(
    decision,
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
      sourceFinalizationReview: options.sourceFinalizationReview,
      sourcePacket: options.sourcePacket,
      sourceFixture: options.sourceFixture,
      researchDesignText: options.researchDesignText,
      researchDesignPath: options.researchDesignPath,
      implementationDecisionText: options.implementationDecisionText,
      cwd: options.cwd ?? process.cwd()
    }
  );
}

function dataModelStateFor(sourceDecision, sourceValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const decisionReady =
    sourceDecision?.decision_state === SOURCE_DECISION_READY_STATE &&
    sourceDecision?.feeds?.internal_research_math_data_model_layer === true &&
    sourceValidation.valid === true;
  return decisionReady ? READY_STATE : HOLD_PROMOTION_DECISION_STATE;
}

export function contributionAlignmentInternalResearchMathDataModelHash(dataModel) {
  const withoutHash = { ...dataModel };
  delete withoutHash.data_model_hash;
  return sha256Json(withoutHash);
}

function buildBaseDataModel(sourcePromotionDecision, options = {}) {
  const promotionDecision = clone(sourcePromotionDecision);
  const sourceValidation = sourcePromotionDecisionValidationFor(
    promotionDecision,
    options
  );
  const preliminaryContentGaps = [];
  const dataModelState = dataModelStateFor(
    promotionDecision,
    sourceValidation,
    preliminaryContentGaps
  );
  const ready = dataModelState === READY_STATE;
  const validationGaps = sanitizeGaps(
    sourceValidation.gaps.map(safeValidationGap)
  );

  let dataModel = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION,
    data_model_id: `contribution_alignment_internal_research_math_data_model_${sha256Json({
      decision_id: promotionDecision?.decision_id ?? null,
      decision_hash: promotionDecision?.decision_hash ?? null
    }).slice(0, 16)}`,
    data_model_state: dataModelState,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_promotion_decision_ref: compactSourcePromotionDecisionRef(promotionDecision),
    data_model_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      data_model_boundary_only: true,
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
    model_grain: { ...MODEL_GRAIN },
    component_registry: ready ? clone(COMPONENT_REGISTRY) : [],
    context_partitions: ready ? clone(CONTEXT_PARTITIONS) : {
      ai_fluency_construct_context: null,
      ai_fluency_psychological_context: null,
      observed_vbd_context: null,
      selected_metric_movement_context: null
    },
    research_design_boundary: { ...RESEARCH_DESIGN_BOUNDARY },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_research_math_finalization_design: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_promotion_decision_only: true,
      receives_full_promotion_decision_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      receives_full_series_payloads: false,
      persists_data_model: false,
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
        `${CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      data_model_state: dataModelState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(dataModel);
  if (contentGaps.length > 0) {
    dataModel = {
      ...dataModel,
      data_model_state: REJECT_BOUNDARY_STATE,
      component_registry: [],
      context_partitions: {
        ai_fluency_construct_context: null,
        ai_fluency_psychological_context: null,
        observed_vbd_context: null,
        selected_metric_movement_context: null
      },
      feeds: {
        ...dataModel.feeds,
        internal_research_math_finalization_design: false
      },
      validation_summary: {
        ...dataModel.validation_summary,
        valid: false,
        data_model_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  dataModel.data_model_hash = contributionAlignmentInternalResearchMathDataModelHash(dataModel);
  return dataModel;
}

export function buildContributionAlignmentInternalResearchMathDataModelFromObject(
  sourcePromotionDecision,
  options = {}
) {
  return buildBaseDataModel(sourcePromotionDecision, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(dataModel) {
  const gaps = [];
  if (!isPlainObject(dataModel)) {
    return ["internal research math data model must be an object"];
  }
  Object.keys(dataModel).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    dataModel.schema_version !==
    CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_PROMOTION_DECISION_STATE, REJECT_BOUNDARY_STATE].includes(dataModel.data_model_state)) {
    gaps.push("data_model_state is invalid");
  }
  if (!isPlainObject(dataModel.data_model_scope)) {
    gaps.push("data_model_scope is required");
  } else {
    for (const key of Object.keys(dataModel.data_model_scope)) {
      if (!DATA_MODEL_SCOPE_FIELDS.includes(key)) {
        gaps.push("data_model_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      data_model_boundary_only: true,
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
      if (dataModel.data_model_scope[field] !== expected) {
        gaps.push(`data_model_scope.${field} must be ${expected}`);
      }
    }
  }
  gaps.push(...exactObjectGaps(dataModel.model_grain, MODEL_GRAIN, "model_grain"));
  if (!Array.isArray(dataModel.component_registry)) {
    gaps.push("component_registry must be an array");
  } else if (
    dataModel.data_model_state === READY_STATE &&
    stableStringify(dataModel.component_registry) !== stableStringify(COMPONENT_REGISTRY)
  ) {
    gaps.push("component_registry must match governed component registry");
  } else if (
    dataModel.data_model_state !== READY_STATE &&
    dataModel.component_registry.length !== 0
  ) {
    gaps.push("component_registry must be empty for held data models");
  }
  if (dataModel.data_model_state === READY_STATE) {
    gaps.push(...exactObjectGaps(
      dataModel.context_partitions,
      CONTEXT_PARTITIONS,
      "context_partitions"
    ));
  }
  gaps.push(...exactObjectGaps(
    dataModel.research_design_boundary,
    RESEARCH_DESIGN_BOUNDARY,
    "research_design_boundary"
  ));
  const feeds = dataModel.feeds ?? {};
  if (
    feeds.internal_research_math_finalization_design !==
    (dataModel.data_model_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_research_math_finalization_design must be true only for ready data models");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_research_math_finalization_design" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_promotion_decision_only") {
      if (dataModel.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_promotion_decision_only must be true");
      }
    } else if (dataModel.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(dataModel.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(dataModel.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(dataModel.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = dataModel.validation_summary ?? {};
  if (validationSummary.data_model_state !== dataModel.data_model_state) {
    gaps.push("validation_summary.data_model_state must match data_model_state");
  }
  if (validationSummary.valid !== (dataModel.data_model_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match data model readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (dataModel.data_model_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready data models");
  }
  if (dataModel.data_model_hash !== contributionAlignmentInternalResearchMathDataModelHash(dataModel)) {
    gaps.push("data_model_hash must match compact internal research math data model");
  }
  return gaps;
}

function collectSourceBindingGaps(dataModel, options = {}) {
  const gaps = [];
  if (!isPlainObject(dataModel)) {
    gaps.push("internal research math data model must be an object");
    return gaps;
  }
  if (!options.sourcePromotionDecision) {
    gaps.push("sourcePromotionDecision is required for internal research math data model validation");
    return gaps;
  }
  for (const [optionName, message] of [
    ["sourceFinalizationReview", "sourceFinalizationReview is required for internal research math data model validation"],
    ["sourceReviewRecord", "sourceReviewRecord is required for internal research math data model validation"],
    ["sourceMethodPrototype", "sourceMethodPrototype is required for internal research math data model validation"],
    ["sourceDecision", "sourceDecision is required for internal research math data model validation"],
    ["sourceGateReview", "sourceGateReview is required for internal research math data model validation"],
    ["sourcePrototypeReviewPacket", "sourcePrototypeReviewPacket is required for internal research math data model validation"],
    ["sourcePrototype", "sourcePrototype is required for internal research math data model validation"],
    ["sourceDesignReview", "sourceDesignReview is required for internal research math data model validation"],
    ["sourceReviewPacket", "sourceReviewPacket is required for internal research math data model validation"],
    ["sourceRunner", "sourceRunner is required for internal research math data model validation"],
    ["sourcePacket", "sourcePacket is required for internal research math data model validation"],
    ["sourceFixture", "sourceFixture is required for internal research math data model validation"],
    ["researchDesignText", "researchDesignText is required for internal research math data model validation"],
    ["implementationDecisionText", "implementationDecisionText is required for internal research math data model validation"]
  ]) {
    if (!options[optionName]) gaps.push(message);
  }
  const expectedDataModel = buildBaseDataModel(options.sourcePromotionDecision, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourceDecision: options.sourceDecision,
    sourceMethodPrototype: options.sourceMethodPrototype,
    sourceReviewRecord: options.sourceReviewRecord,
    sourceFinalizationReview: options.sourceFinalizationReview,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedDataModel);
  const actualWithoutHash = clone(dataModel);
  delete expectedWithoutHash.data_model_hash;
  delete actualWithoutHash.data_model_hash;
  if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
    gaps.push("internal research math data model must match source-decision-bound expected envelope");
  }
  if (
    dataModel.source_promotion_decision_ref?.decision_id !==
    options.sourcePromotionDecision.decision_id
  ) {
    gaps.push("source_promotion_decision_ref.decision_id drifted");
  }
  if (
    dataModel.source_promotion_decision_ref?.decision_hash !==
    options.sourcePromotionDecision.decision_hash
  ) {
    gaps.push("source_promotion_decision_ref.decision_hash drifted");
  }
  const sourceValidation = sourcePromotionDecisionValidationFor(
    options.sourcePromotionDecision,
    options
  );
  const expectedState = dataModelStateFor(options.sourcePromotionDecision, sourceValidation, []);
  if (dataModel.data_model_state !== expectedState) {
    gaps.push(`data_model_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentInternalResearchMathDataModel(
  dataModel,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(dataModel),
    ...collectSourceBindingGaps(dataModel, options),
    ...hasForbiddenContent(dataModel)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    data_model_id: safeValidationScalar(dataModel?.data_model_id),
    data_model_state: safeValidationScalar(dataModel?.data_model_state, [
      READY_STATE,
      HOLD_PROMOTION_DECISION_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && dataModel?.data_model_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  const sourcePromotionDecision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      sourceFinalizationReview,
      { sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype, sourcePrototypeReviewPacket, sourceGateReview, sourceDecision, sourceMethodPrototype, sourceReviewRecord, sourceFinalizationReview, sourcePacket, sourceFixture, researchDesignText, researchDesignPath, implementationDecisionText, cwd }
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
    sourceFinalizationReview,
    sourcePromotionDecision
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
  const dataModel = buildContributionAlignmentInternalResearchMathDataModelFromObject(
    chain.sourcePromotionDecision,
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
  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
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
  process.stdout.write(`${JSON.stringify(dataModel, null, 2)}\n`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) main();
