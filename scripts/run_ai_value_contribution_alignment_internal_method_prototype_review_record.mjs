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
  buildContributionAlignmentSmallInternalMethodPrototypeFromObject,
  validateContributionAlignmentSmallInternalMethodPrototype
} from "./run_ai_value_contribution_alignment_small_internal_method_prototype.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_method_prototype_review_record_2026_06";

const READY_STATE = "PROMOTE_EXACT_SCOPE_RESEARCH_MATH_FINALIZATION_REVIEW";
const HOLD_PROTOTYPE_STATE =
  "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const SOURCE_PROTOTYPE_READY_STATE = "READY_FOR_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD";

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
  "review_record_id",
  "review_record_state",
  "generated_at",
  "derivation_version",
  "source_method_prototype_ref",
  "review_scope",
  "finalization_review_scope",
  "component_posture_review",
  "context_separation_review",
  "promotion_basis",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_record_hash"
]);

const REVIEW_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "review_record_only",
  "exact_scope_research_math_finalization_review",
  "research_model_feed",
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

const FINALIZATION_REVIEW_SCOPE_FIELDS = [
  "allowed_next_step",
  "requires_separate_promotion",
  "implements_research_math",
  "emits_numeric_result",
  "emits_customer_output",
  "persists_research_inputs",
  "runs_live_connectors"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_method_prototype_only",
  "receives_full_method_prototype_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "receives_full_series_payloads",
  "persists_review_record",
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
  "Internal method prototype review record is non-persistent internal gating only.",
  "Ready state authorizes only a separate exact-scope research math finalization review.",
  "The review record consumes compact method prototype refs and qualitative component posture only.",
  "The review record does not implement research math, emit numeric results, feed a research model, emit confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const REQUIRED_COMPONENTS = [
  "hypothesis_binding",
  "source_coverage",
  "milestone_continuity",
  "ai_fluency_construct_context_integrity",
  "psychological_context_integrity",
  "observed_vbd_alignment",
  "selected_metric_movement",
  "comparison_design_strength",
  "assumption_governance",
  "boundary_clearance"
];

const FINALIZATION_REVIEW_SCOPE = {
  allowed_next_step: "exact_scope_research_math_finalization_review_only",
  requires_separate_promotion: true,
  implements_research_math: false,
  emits_numeric_result: false,
  emits_customer_output: false,
  persists_research_inputs: false,
  runs_live_connectors: false
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
  /prototype_?payload/i,
  /review_?record_?payload/i,
  /measurement_?cell_?payload/i,
  /series_?payload/i,
  /payload_?json/i,
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
  /prototype_payload/i,
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
  if (/^contribution_alignment_internal_method_prototype_review_record_[0-9a-f]{16}$/.test(value)) {
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

function exactArrayGaps(value, expected, path) {
  const gaps = [];
  if (!Array.isArray(value)) return [`${path} must be an array`];
  if (stableStringify(value) !== stableStringify(expected)) {
    gaps.push(`${path} must match governed values`);
  }
  return gaps;
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("small internal method prototype must match source-decision-bound expected envelope")) {
    return "source_method_prototype: small internal method prototype must match source-decision-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_method_prototype rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_method_prototype rejected unsafe or invalid content";
  }
  return `source_method_prototype: ${text}`;
}

function compactSourceMethodPrototypeRef(prototype) {
  return {
    prototype_id: compactScalar(prototype?.prototype_id),
    prototype_state: compactScalar(prototype?.prototype_state),
    prototype_hash: compactScalar(prototype?.prototype_hash),
    source_decision_id: compactScalar(prototype?.source_decision_ref?.decision_id),
    source_decision_hash: compactScalar(prototype?.source_decision_ref?.decision_hash),
    output_kind: compactScalar(prototype?.method_frame?.output_kind)
  };
}

function componentPostureReviewFor(prototype, readyForReview) {
  if (!readyForReview) return [];
  return (prototype?.qualitative_component_postures ?? []).map((component) => ({
    component_id: compactScalar(component?.component_id),
    evidence_role: compactScalar(component?.evidence_role),
    review_posture: compactScalar(component?.review_posture),
    output_state: compactScalar(component?.output_state),
    numeric_role: compactScalar(component?.numeric_role)
  }));
}

function contextSeparationReviewFor(prototype, readyForReview) {
  const context = prototype?.context_separation_review;
  if (!readyForReview) {
    return {
      ai_fluency_construct_context_state: null,
      psychological_context_state: null,
      observed_vbd_context_state: null,
      selected_metric_movement_state: null,
      separation_rule:
        "construct_psychological_observed_metric_contexts_must_remain_distinct"
    };
  }
  return {
    ai_fluency_construct_context_state:
      compactScalar(context?.ai_fluency_construct_context_state),
    psychological_context_state:
      compactScalar(context?.psychological_context_state),
    observed_vbd_context_state:
      compactScalar(context?.observed_vbd_context_state),
    selected_metric_movement_state:
      compactScalar(context?.selected_metric_movement_state),
    separation_rule:
      "construct_psychological_observed_metric_contexts_must_remain_distinct"
  };
}

function hasForbiddenContent(value, path = "review") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("review.feeds.") ||
      path.startsWith("review.boundary_policy.") ||
      path.startsWith("review.review_scope.") ||
      path.startsWith("review.finalization_review_scope.") ||
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
          path === "review.review_scope" ||
          path === "review.finalization_review_scope" ||
          path === "review.promotion_basis"
        );
      if (!safeNegativeBoundaryKey && unsafeKey) {
        gaps.push("review contains forbidden field name");
        continue;
      }
      const nestedPath = `${path}.${key}`;
      gaps.push(...hasForbiddenContent(nested, nestedPath));
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

function sourceMethodPrototypeValidationFor(prototype, options = {}) {
  if (!prototype) {
    return {
      valid: false,
      gaps: ["sourceMethodPrototype is required"]
    };
  }
  return validateContributionAlignmentSmallInternalMethodPrototype(prototype, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourceDecision: options.sourceDecision,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function sourceComponentPostureGaps(prototype) {
  const components = prototype?.qualitative_component_postures;
  if (!Array.isArray(components)) {
    return ["source_method_prototype component posture must remain qualitative and non-numeric"];
  }
  if (components.length !== REQUIRED_COMPONENTS.length) {
    return ["source_method_prototype component posture must remain qualitative and non-numeric"];
  }
  const gaps = [];
  REQUIRED_COMPONENTS.forEach((componentId, index) => {
    const component = components[index];
    if (
      component?.component_id !== componentId ||
      component?.review_posture !== "included_for_internal_method_review" ||
      component?.output_state !== "not_emitted" ||
      component?.numeric_role !== "none"
    ) {
      gaps.push("source_method_prototype component posture must remain qualitative and non-numeric");
    }
  });
  return sanitizeGaps(gaps);
}

function reviewRecordStateFor(prototype, prototypeValidation, sourceGaps, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  if (sourceGaps.length > 0) return HOLD_PROTOTYPE_STATE;
  const prototypeReady =
    prototype?.prototype_state === SOURCE_PROTOTYPE_READY_STATE &&
    prototype?.feeds?.internal_method_prototype_review === true &&
    prototypeValidation.valid === true;
  return prototypeReady ? READY_STATE : HOLD_PROTOTYPE_STATE;
}

export function contributionAlignmentInternalMethodPrototypeReviewRecordHash(record) {
  const withoutHash = { ...record };
  delete withoutHash.review_record_hash;
  return sha256Json(withoutHash);
}

function buildBaseReviewRecord(sourceMethodPrototype, options = {}) {
  const prototype = clone(sourceMethodPrototype);
  const prototypeValidation = sourceMethodPrototypeValidationFor(prototype, options);
  const sourceGaps = sourceComponentPostureGaps(prototype);
  const preliminaryContentGaps = [];
  const reviewRecordState = reviewRecordStateFor(
    prototype,
    prototypeValidation,
    sourceGaps,
    preliminaryContentGaps
  );
  const readyForReview = reviewRecordState === READY_STATE;
  const emitComponentPosture = readyForReview && prototypeValidation.valid === true;
  const validationGaps = sanitizeGaps([
    ...prototypeValidation.gaps.map(safeValidationGap),
    ...sourceGaps
  ]);

  let record = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD_SCHEMA_VERSION,
    review_record_id: `contribution_alignment_internal_method_prototype_review_record_${sha256Json({
      prototype_id: prototype?.prototype_id ?? null,
      prototype_hash: prototype?.prototype_hash ?? null
    }).slice(0, 16)}`,
    review_record_state: reviewRecordState,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_method_prototype_ref: compactSourceMethodPrototypeRef(prototype),
    review_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      review_record_only: true,
      exact_scope_research_math_finalization_review: readyForReview,
      research_model_feed: false,
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
    finalization_review_scope: { ...FINALIZATION_REVIEW_SCOPE },
    component_posture_review: componentPostureReviewFor(prototype, emitComponentPosture),
    context_separation_review: contextSeparationReviewFor(prototype, emitComponentPosture),
    promotion_basis: {
      source_method_prototype_ready: readyForReview,
      qualitative_component_posture_present: readyForReview,
      context_separation_preserved: readyForReview,
      customer_metric_context_distinct: readyForReview,
      numeric_result_emitted: false,
      customer_output_emitted: false
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      exact_scope_research_math_finalization_review: readyForReview,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_method_prototype_only: true,
      receives_full_method_prototype_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      receives_full_series_payloads: false,
      persists_review_record: false,
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
        `${CONTRIBUTION_ALIGNMENT_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForReview,
      review_record_state: reviewRecordState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(record);
  if (contentGaps.length > 0) {
    record = {
      ...record,
      review_record_state: REJECT_BOUNDARY_STATE,
      review_scope: {
        ...record.review_scope,
        exact_scope_research_math_finalization_review: false
      },
      promotion_basis: {
        ...record.promotion_basis,
        source_method_prototype_ready: false,
        qualitative_component_posture_present: false,
        context_separation_preserved: false,
        customer_metric_context_distinct: false
      },
      feeds: {
        ...record.feeds,
        exact_scope_research_math_finalization_review: false
      },
      validation_summary: {
        ...record.validation_summary,
        valid: false,
        review_record_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  record.review_record_hash =
    contributionAlignmentInternalMethodPrototypeReviewRecordHash(record);
  return record;
}

export function buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
  sourceMethodPrototype,
  options = {}
) {
  return buildBaseReviewRecord(sourceMethodPrototype, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(record) {
  const gaps = [];
  if (!isPlainObject(record)) {
    return ["internal method prototype review record must be an object"];
  }
  Object.keys(record).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    record.schema_version !==
    CONTRIBUTION_ALIGNMENT_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_PROTOTYPE_STATE, REJECT_BOUNDARY_STATE].includes(record.review_record_state)) {
    gaps.push("review_record_state is invalid");
  }
  if (!isPlainObject(record.review_scope)) {
    gaps.push("review_scope is required");
  } else {
    for (const key of Object.keys(record.review_scope)) {
      if (!REVIEW_SCOPE_FIELDS.includes(key)) gaps.push("review_scope contains ungoverned field");
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      review_record_only: true,
      exact_scope_research_math_finalization_review: record.review_record_state === READY_STATE,
      research_model_feed: false,
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
      if (record.review_scope[field] !== expected) {
        gaps.push(`review_scope.${field} must be ${expected}`);
      }
    }
  }
  if (!isPlainObject(record.finalization_review_scope)) {
    gaps.push("finalization_review_scope is required");
  } else {
    for (const key of Object.keys(record.finalization_review_scope)) {
      if (!FINALIZATION_REVIEW_SCOPE_FIELDS.includes(key)) {
        gaps.push("finalization_review_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries(FINALIZATION_REVIEW_SCOPE)) {
      if (record.finalization_review_scope[field] !== expected) {
        gaps.push(`finalization_review_scope.${field} is invalid`);
      }
    }
  }
  const expectedComponents =
    record.review_record_state === READY_STATE
      ? REQUIRED_COMPONENTS.map((component_id) => ({
          component_id,
          evidence_role: record.component_posture_review?.find(
            (component) => component.component_id === component_id
          )?.evidence_role,
          review_posture: "included_for_internal_method_review",
          output_state: "not_emitted",
          numeric_role: "none"
        }))
      : [];
  if (!Array.isArray(record.component_posture_review)) {
    gaps.push("component_posture_review must be an array");
  } else if (
    record.review_record_state === READY_STATE &&
    (
      record.component_posture_review.length !== REQUIRED_COMPONENTS.length ||
      !REQUIRED_COMPONENTS.every((componentId, index) =>
        record.component_posture_review[index]?.component_id === componentId &&
        record.component_posture_review[index]?.review_posture ===
          "included_for_internal_method_review" &&
        record.component_posture_review[index]?.output_state === "not_emitted" &&
        record.component_posture_review[index]?.numeric_role === "none"
      )
    )
  ) {
    gaps.push("component_posture_review must match governed component posture");
  } else if (record.review_record_state !== READY_STATE) {
    gaps.push(...exactArrayGaps(record.component_posture_review, expectedComponents, "component_posture_review"));
  }
  const feeds = record.feeds ?? {};
  if (
    feeds.exact_scope_research_math_finalization_review !==
    (record.review_record_state === READY_STATE)
  ) {
    gaps.push("feeds.exact_scope_research_math_finalization_review must be true only for ready records");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "exact_scope_research_math_finalization_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_method_prototype_only") {
      if (record.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_method_prototype_only must be true");
      }
    } else if (record.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(record.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(record.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(record.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = record.validation_summary ?? {};
  if (validationSummary.review_record_state !== record.review_record_state) {
    gaps.push("validation_summary.review_record_state must match review_record_state");
  }
  if (validationSummary.valid !== (record.review_record_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match review record readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (record.review_record_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready review records");
  }
  if (
    record.review_record_hash !==
    contributionAlignmentInternalMethodPrototypeReviewRecordHash(record)
  ) {
    gaps.push("review_record_hash must match compact internal method prototype review record");
  }
  return gaps;
}

function collectSourceBindingGaps(record, options = {}) {
  const gaps = [];
  if (!isPlainObject(record)) {
    gaps.push("internal method prototype review record must be an object");
    return gaps;
  }
  if (!options.sourceMethodPrototype) {
    gaps.push("sourceMethodPrototype is required for internal method prototype review record validation");
    return gaps;
  }
  const prototypeValidation = sourceMethodPrototypeValidationFor(options.sourceMethodPrototype, options);
  for (const [optionName, message] of [
    ["sourceDecision", "sourceDecision is required for internal method prototype review record validation"],
    ["sourceGateReview", "sourceGateReview is required for internal method prototype review record validation"],
    ["sourcePrototypeReviewPacket", "sourcePrototypeReviewPacket is required for internal method prototype review record validation"],
    ["sourcePrototype", "sourcePrototype is required for internal method prototype review record validation"],
    ["sourceDesignReview", "sourceDesignReview is required for internal method prototype review record validation"],
    ["sourceReviewPacket", "sourceReviewPacket is required for internal method prototype review record validation"],
    ["sourceRunner", "sourceRunner is required for internal method prototype review record validation"],
    ["sourcePacket", "sourcePacket is required for internal method prototype review record validation"],
    ["sourceFixture", "sourceFixture is required for internal method prototype review record validation"],
    ["researchDesignText", "researchDesignText is required for internal method prototype review record validation"],
    ["implementationDecisionText", "implementationDecisionText is required for internal method prototype review record validation"]
  ]) {
    if (!options[optionName]) gaps.push(message);
  }
  const expectedRecord = buildBaseReviewRecord(options.sourceMethodPrototype, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourceDecision: options.sourceDecision,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedRecord);
  const actualWithoutHash = clone(record);
  delete expectedWithoutHash.review_record_hash;
  delete actualWithoutHash.review_record_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("internal method prototype review record must match source-prototype-bound expected envelope");
  }
  if (
    record.source_method_prototype_ref?.prototype_id !==
    options.sourceMethodPrototype.prototype_id
  ) {
    gaps.push("source_method_prototype_ref.prototype_id drifted");
  }
  if (
    record.source_method_prototype_ref?.prototype_hash !==
    options.sourceMethodPrototype.prototype_hash
  ) {
    gaps.push("source_method_prototype_ref.prototype_hash drifted");
  }
  const sourceGaps = sourceComponentPostureGaps(options.sourceMethodPrototype);
  const expectedState = reviewRecordStateFor(
    options.sourceMethodPrototype,
    prototypeValidation,
    sourceGaps,
    []
  );
  if (record.review_record_state !== expectedState) {
    gaps.push(`review_record_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentInternalMethodPrototypeReviewRecord(
  record,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(record),
    ...collectSourceBindingGaps(record, options),
    ...hasForbiddenContent(record)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    review_record_id: safeValidationScalar(record?.review_record_id),
    review_record_state: safeValidationScalar(record?.review_record_state, [
      READY_STATE,
      HOLD_PROTOTYPE_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && record?.review_record_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  return {
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision,
    sourceMethodPrototype
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const { packetPath, sourceFixturePath, researchDesignPath } = cliOptions(
    process.argv.slice(2)
  );
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
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
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
  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
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
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}
