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
  buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject,
  validateContributionAlignmentInternalMethodPrototypeReviewRecord
} from "./run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs";

export const CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_FINALIZATION_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_FINALIZATION_REVIEW_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_FINALIZATION_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_research_math_finalization_review_2026_06";

const READY_STATE = "READY_FOR_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION";
const HOLD_REVIEW_RECORD_STATE =
  "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const SOURCE_REVIEW_READY_STATE = "PROMOTE_EXACT_SCOPE_RESEARCH_MATH_FINALIZATION_REVIEW";

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
  "finalization_review_id",
  "finalization_review_state",
  "generated_at",
  "derivation_version",
  "source_review_record_ref",
  "finalization_review_scope",
  "next_step_scope",
  "context_separation_requirements",
  "promotion_basis",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "finalization_review_hash"
]);

const FINALIZATION_REVIEW_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "review_only",
  "data_model_promotion_decision",
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

const NEXT_STEP_SCOPE_FIELDS = [
  "allowed_next_step",
  "requires_separate_promotion",
  "implements_research_math",
  "emits_numeric_result",
  "emits_customer_output",
  "persists_research_inputs",
  "creates_physical_tables",
  "runs_live_connectors"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_review_record_only",
  "receives_full_review_record_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "receives_full_series_payloads",
  "persists_review",
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
  "Research math finalization review is non-persistent internal gating only.",
  "Ready state authorizes only a later research math data model promotion decision.",
  "The review consumes compact internal method prototype review record refs only.",
  "The review does not implement research math, emit numeric results, feed a research model, emit confidence output, probability, score-like output, finance output, ROI, causality, productivity, persistence, or customer-facing output.",
  "AI Fluency construct context, AI Fluency psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const NEXT_STEP_SCOPE = {
  allowed_next_step: "research_math_data_model_promotion_decision_only",
  requires_separate_promotion: true,
  implements_research_math: false,
  emits_numeric_result: false,
  emits_customer_output: false,
  persists_research_inputs: false,
  creates_physical_tables: false,
  runs_live_connectors: false
};

const CONTEXT_SEPARATION_REQUIREMENTS = {
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
  /warehouse[_-\s]?ref/i,
  /dataset[_-\s]?path/i,
  /dashboard[_-\s]?slug/i,
  /looker[_-\s]?(?:dashboard|report)/i,
  /job[_-\s]?reference/i,
  /source[_-\s]?system[_-\s]?ref/i,
  /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\b/i,
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
  /source_package_(?:payload|clearance|cleared|approved|passed)/i,
  /review_record_payload/i,
  /measurement_cell_payload/i,
  /measurement_cell_series_payload/i,
  /payload_json/i,
  /research[_-\s]?model/i,
  /model[_-\s]?(?:result|output|outputs|training|feed|approved|approval|authorized|authorization)/i,
  /feature[_-\s]?table/i,
  /table[_-\s]?ref/i,
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
  if (/^contribution_alignment_research_math_finalization_review_[0-9a-f]{16}$/.test(value)) {
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
  if (text.includes("internal method prototype review record must match source-prototype-bound expected envelope")) {
    return "source_review_record: internal method prototype review record must match source-prototype-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_review_record rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_review_record rejected unsafe or invalid content";
  }
  return `source_review_record: ${text}`;
}

function compactSourceReviewRecordRef(reviewRecord) {
  return {
    review_record_id: compactId(
      reviewRecord?.review_record_id,
      "contribution_alignment_internal_method_prototype_review_record"
    ),
    review_record_state: compactState(reviewRecord?.review_record_state, [
      SOURCE_REVIEW_READY_STATE,
      HOLD_REVIEW_RECORD_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    review_record_hash: compactHash(reviewRecord?.review_record_hash),
    source_method_prototype_id: compactId(
      reviewRecord?.source_method_prototype_ref?.prototype_id,
      "contribution_alignment_small_internal_method_prototype"
    ),
    source_method_prototype_hash: compactHash(
      reviewRecord?.source_method_prototype_ref?.prototype_hash
    ),
    allowed_next_step: compactAllowedScalar(
      reviewRecord?.finalization_review_scope?.allowed_next_step,
      ["exact_scope_research_math_finalization_review_only"]
    )
  };
}

function hasForbiddenContent(value, path = "review") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("review.feeds.") ||
      path.startsWith("review.boundary_policy.") ||
      path.startsWith("review.finalization_review_scope.") ||
      path.startsWith("review.next_step_scope.") ||
      path.startsWith("review.promotion_basis.")
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
          path === "review.feeds" ||
          path === "review.boundary_policy" ||
          path === "review.finalization_review_scope" ||
          path === "review.next_step_scope" ||
          path === "review.promotion_basis"
        );
      if (!safeNegativeBoundaryKey && unsafeKey) {
        gaps.push("review contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value === "string") {
    if (
      path.startsWith("review.blocked_uses[") &&
      REQUIRED_BLOCKED_USES.includes(value)
    ) {
      return gaps;
    }
    if (
      path.startsWith("review.required_caveats[") &&
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

function sourceReviewRecordValidationFor(reviewRecord, options = {}) {
  if (!reviewRecord) {
    return {
      valid: false,
      gaps: ["sourceReviewRecord is required"]
    };
  }
  return validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    reviewRecord,
    {
      sourceRunner: options.sourceRunner,
      sourceReviewPacket: options.sourceReviewPacket,
      sourceDesignReview: options.sourceDesignReview,
      sourcePrototype: options.sourcePrototype,
      sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
      sourceGateReview: options.sourceGateReview,
      sourceDecision: options.sourceDecision,
      sourceMethodPrototype: options.sourceMethodPrototype,
      sourcePacket: options.sourcePacket,
      sourceFixture: options.sourceFixture,
      researchDesignText: options.researchDesignText,
      researchDesignPath: options.researchDesignPath,
      implementationDecisionText: options.implementationDecisionText,
      cwd: options.cwd ?? process.cwd()
    }
  );
}

function reviewStateFor(reviewRecord, sourceValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const reviewReady =
    reviewRecord?.review_record_state === SOURCE_REVIEW_READY_STATE &&
    reviewRecord?.feeds?.exact_scope_research_math_finalization_review === true &&
    sourceValidation.valid === true;
  return reviewReady ? READY_STATE : HOLD_REVIEW_RECORD_STATE;
}

export function contributionAlignmentResearchMathFinalizationReviewHash(review) {
  const withoutHash = { ...review };
  delete withoutHash.finalization_review_hash;
  return sha256Json(withoutHash);
}

function buildBaseReview(sourceReviewRecord, options = {}) {
  const reviewRecord = clone(sourceReviewRecord);
  const sourceValidation = sourceReviewRecordValidationFor(reviewRecord, options);
  const preliminaryContentGaps = [];
  const reviewState = reviewStateFor(
    reviewRecord,
    sourceValidation,
    preliminaryContentGaps
  );
  const ready = reviewState === READY_STATE;
  const validationGaps = sanitizeGaps(
    sourceValidation.gaps.map(safeValidationGap)
  );

  let review = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_FINALIZATION_REVIEW_SCHEMA_VERSION,
    finalization_review_id: `contribution_alignment_research_math_finalization_review_${sha256Json({
      review_record_id: reviewRecord?.review_record_id ?? null,
      review_record_hash: reviewRecord?.review_record_hash ?? null
    }).slice(0, 16)}`,
    finalization_review_state: reviewState,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_review_record_ref: compactSourceReviewRecordRef(reviewRecord),
    finalization_review_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      review_only: true,
      data_model_promotion_decision: ready,
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
    next_step_scope: { ...NEXT_STEP_SCOPE },
    context_separation_requirements: { ...CONTEXT_SEPARATION_REQUIREMENTS },
    promotion_basis: {
      source_review_record_ready: ready,
      source_review_record_valid: sourceValidation.valid === true,
      context_separation_preserved: ready,
      data_model_promotion_decision_only: ready,
      durable_state_authorized: false,
      physical_tables_authorized: false,
      numeric_result_authorized: false,
      customer_output_authorized: false
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      research_math_data_model_promotion_decision: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_review_record_only: true,
      receives_full_review_record_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      receives_full_series_payloads: false,
      persists_review: false,
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
        `${CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_FINALIZATION_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      finalization_review_state: reviewState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(review);
  if (contentGaps.length > 0) {
    review = {
      ...review,
      finalization_review_state: REJECT_BOUNDARY_STATE,
      finalization_review_scope: {
        ...review.finalization_review_scope,
        data_model_promotion_decision: false
      },
      promotion_basis: {
        ...review.promotion_basis,
        source_review_record_ready: false,
        source_review_record_valid: false,
        context_separation_preserved: false,
        data_model_promotion_decision_only: false
      },
      feeds: {
        ...review.feeds,
        research_math_data_model_promotion_decision: false
      },
      validation_summary: {
        ...review.validation_summary,
        valid: false,
        finalization_review_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  review.finalization_review_hash =
    contributionAlignmentResearchMathFinalizationReviewHash(review);
  return review;
}

export function buildContributionAlignmentResearchMathFinalizationReviewFromObject(
  sourceReviewRecord,
  options = {}
) {
  return buildBaseReview(sourceReviewRecord, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(review) {
  const gaps = [];
  if (!isPlainObject(review)) {
    return ["research math finalization review must be an object"];
  }
  Object.keys(review).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    review.schema_version !==
    CONTRIBUTION_ALIGNMENT_RESEARCH_MATH_FINALIZATION_REVIEW_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_REVIEW_RECORD_STATE, REJECT_BOUNDARY_STATE].includes(review.finalization_review_state)) {
    gaps.push("finalization_review_state is invalid");
  }
  if (!isPlainObject(review.finalization_review_scope)) {
    gaps.push("finalization_review_scope is required");
  } else {
    for (const key of Object.keys(review.finalization_review_scope)) {
      if (!FINALIZATION_REVIEW_SCOPE_FIELDS.includes(key)) {
        gaps.push("finalization_review_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      review_only: true,
      data_model_promotion_decision: review.finalization_review_state === READY_STATE,
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
      if (review.finalization_review_scope[field] !== expected) {
        gaps.push(`finalization_review_scope.${field} must be ${expected}`);
      }
    }
  }
  if (!isPlainObject(review.next_step_scope)) {
    gaps.push("next_step_scope is required");
  } else {
    for (const key of Object.keys(review.next_step_scope)) {
      if (!NEXT_STEP_SCOPE_FIELDS.includes(key)) {
        gaps.push("next_step_scope contains ungoverned field");
      }
    }
    gaps.push(...exactObjectGaps(review.next_step_scope, NEXT_STEP_SCOPE, "next_step_scope"));
  }
  gaps.push(...exactObjectGaps(
    review.context_separation_requirements,
    CONTEXT_SEPARATION_REQUIREMENTS,
    "context_separation_requirements"
  ));
  const feeds = review.feeds ?? {};
  if (
    feeds.research_math_data_model_promotion_decision !==
    (review.finalization_review_state === READY_STATE)
  ) {
    gaps.push("feeds.research_math_data_model_promotion_decision must be true only for ready reviews");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "research_math_data_model_promotion_decision" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_review_record_only") {
      if (review.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_review_record_only must be true");
      }
    } else if (review.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(review.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(review.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(review.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = review.validation_summary ?? {};
  if (validationSummary.finalization_review_state !== review.finalization_review_state) {
    gaps.push("validation_summary.finalization_review_state must match finalization_review_state");
  }
  if (validationSummary.valid !== (review.finalization_review_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match review readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (review.finalization_review_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready reviews");
  }
  if (
    review.finalization_review_hash !==
    contributionAlignmentResearchMathFinalizationReviewHash(review)
  ) {
    gaps.push("finalization_review_hash must match compact research math finalization review");
  }
  return gaps;
}

function collectSourceBindingGaps(review, options = {}) {
  const gaps = [];
  if (!isPlainObject(review)) {
    gaps.push("research math finalization review must be an object");
    return gaps;
  }
  if (!options.sourceReviewRecord) {
    gaps.push("sourceReviewRecord is required for research math finalization review validation");
    return gaps;
  }
  for (const [optionName, message] of [
    ["sourceMethodPrototype", "sourceMethodPrototype is required for research math finalization review validation"],
    ["sourceDecision", "sourceDecision is required for research math finalization review validation"],
    ["sourceGateReview", "sourceGateReview is required for research math finalization review validation"],
    ["sourcePrototypeReviewPacket", "sourcePrototypeReviewPacket is required for research math finalization review validation"],
    ["sourcePrototype", "sourcePrototype is required for research math finalization review validation"],
    ["sourceDesignReview", "sourceDesignReview is required for research math finalization review validation"],
    ["sourceReviewPacket", "sourceReviewPacket is required for research math finalization review validation"],
    ["sourceRunner", "sourceRunner is required for research math finalization review validation"],
    ["sourcePacket", "sourcePacket is required for research math finalization review validation"],
    ["sourceFixture", "sourceFixture is required for research math finalization review validation"],
    ["researchDesignText", "researchDesignText is required for research math finalization review validation"],
    ["implementationDecisionText", "implementationDecisionText is required for research math finalization review validation"]
  ]) {
    if (!options[optionName]) gaps.push(message);
  }
  const expectedReview = buildBaseReview(options.sourceReviewRecord, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourceDecision: options.sourceDecision,
    sourceMethodPrototype: options.sourceMethodPrototype,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedReview);
  const actualWithoutHash = clone(review);
  delete expectedWithoutHash.finalization_review_hash;
  delete actualWithoutHash.finalization_review_hash;
  if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
    gaps.push("research math finalization review must match source-review-record-bound expected envelope");
  }
  if (
    review.source_review_record_ref?.review_record_id !==
    options.sourceReviewRecord.review_record_id
  ) {
    gaps.push("source_review_record_ref.review_record_id drifted");
  }
  if (
    review.source_review_record_ref?.review_record_hash !==
    options.sourceReviewRecord.review_record_hash
  ) {
    gaps.push("source_review_record_ref.review_record_hash drifted");
  }
  const sourceValidation = sourceReviewRecordValidationFor(options.sourceReviewRecord, options);
  const expectedState = reviewStateFor(options.sourceReviewRecord, sourceValidation, []);
  if (review.finalization_review_state !== expectedState) {
    gaps.push(`finalization_review_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentResearchMathFinalizationReview(
  review,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(review),
    ...collectSourceBindingGaps(review, options),
    ...hasForbiddenContent(review)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    finalization_review_id: safeValidationScalar(review?.finalization_review_id),
    finalization_review_state: safeValidationScalar(review?.finalization_review_state, [
      READY_STATE,
      HOLD_REVIEW_RECORD_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && review?.finalization_review_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_research_math_finalization_review.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  return {
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision,
    sourceMethodPrototype,
    sourceReviewRecord
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
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
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
  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
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
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) main();
