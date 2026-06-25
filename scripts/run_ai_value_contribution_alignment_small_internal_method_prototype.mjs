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
  buildContributionAlignmentMethodPrototypeDecisionFromObject,
  validateContributionAlignmentMethodPrototypeDecision
} from "./run_ai_value_contribution_alignment_method_prototype_decision.mjs";

export const CONTRIBUTION_ALIGNMENT_SMALL_INTERNAL_METHOD_PROTOTYPE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_SMALL_INTERNAL_METHOD_PROTOTYPE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_SMALL_INTERNAL_METHOD_PROTOTYPE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_small_internal_method_prototype_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD";
const HOLD_DECISION_STATE = "HOLD_FOR_VALID_METHOD_PROTOTYPE_DECISION";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const SOURCE_DECISION_READY_STATE = "PROMOTE_SMALL_INTERNAL_METHOD_PROTOTYPE";

const RUNNER_IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const FALSE_FEEDS = [
  "research_model_feed",
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
  "prototype_id",
  "prototype_state",
  "generated_at",
  "derivation_version",
  "source_decision_ref",
  "prototype_scope",
  "method_frame",
  "qualitative_component_postures",
  "context_separation_review",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "prototype_hash"
]);

const PROTOTYPE_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "qualitative_component_posture_only",
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
  "receives_compact_decision_only",
  "receives_full_decision_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_prototype_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_prototype",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "feeds_research_model",
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
  "Small internal method prototype is non-persistent internal review only.",
  "The prototype emits qualitative component posture only.",
  "The prototype does not combine components into a numeric result.",
  "The prototype does not authorize research model feed, model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const COMPONENT_POSTURES = [
  ["hypothesis_binding", "customer_approved_path_identity"],
  ["source_coverage", "reviewed_source_lane_posture"],
  ["milestone_continuity", "day_0_30_60_90_180_365_window_refs"],
  ["ai_fluency_construct_context_integrity", "aggregate_construct_context_only"],
  ["psychological_context_integrity", "aggregate_stated_context_only"],
  ["observed_vbd_alignment", "telemetry_derived_observed_work_behavior_context"],
  ["selected_metric_movement", "customer_owned_metric_movement_context"],
  ["comparison_design_strength", "method_only_until_later_promotion"],
  ["assumption_governance", "reviewed_assumption_posture"],
  ["boundary_clearance", "fail_closed_output_boundary"]
].map(([component_id, evidence_role]) => ({
  component_id,
  evidence_role,
  review_posture: "included_for_internal_method_review",
  output_state: "not_emitted",
  numeric_role: "none"
}));

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
  /decision_?payload/i,
  /prototype_?payload/i,
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
  /decision_payload/i,
  /prototype_payload/i,
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
  /^\s*[\[{]/,
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
  if (/^contribution_alignment_small_internal_method_prototype_[0-9a-f]{16}$/.test(value)) {
    return value;
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return null;
}

function exactArrayGaps(value, expected, path) {
  const gaps = [];
  if (!Array.isArray(value)) return [`${path} must be an array`];
  if (stableStringify(value) !== stableStringify(expected)) {
    gaps.push(`${path} must match governed values`);
  }
  return gaps;
}

function compactScalar(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("method prototype decision must match source-gate-bound expected envelope")) {
    return "source_decision: method prototype decision must match source-gate-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_decision rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_decision rejected unsafe or invalid content";
  }
  return `source_decision: ${text}`;
}

function compactSourceDecisionRef(decision) {
  return {
    decision_id: compactScalar(decision?.decision_id),
    decision_state: compactScalar(decision?.decision_state),
    decision_hash: compactScalar(decision?.decision_hash),
    source_gate_review_id: compactScalar(decision?.source_gate_review_ref?.gate_review_id),
    source_gate_review_hash: compactScalar(decision?.source_gate_review_ref?.gate_review_hash),
    allowed_output: compactScalar(decision?.method_prototype_scope?.allowed_output),
    evidence_scope: compactScalar(decision?.method_prototype_scope?.evidence_scope)
  };
}

function contextSeparationReviewFor(options, readyForPrototype) {
  const context = options.sourceGateReview?.context_separation_review;
  if (!readyForPrototype) {
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
      path.startsWith("review.prototype_scope.") ||
      path.startsWith("review.method_frame.")
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
          path === "review.prototype_scope" ||
          path === "review.method_frame"
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

function sourceDecisionValidationFor(decision, options = {}) {
  if (!decision) {
    return {
      valid: false,
      gaps: ["sourceDecision is required"]
    };
  }
  return validateContributionAlignmentMethodPrototypeDecision(decision, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function prototypeStateFor(decision, decisionValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const decisionReady =
    decision?.decision_state === SOURCE_DECISION_READY_STATE &&
    decision?.feeds?.small_internal_method_prototype === true &&
    decisionValidation.valid === true;
  return decisionReady ? READY_STATE : HOLD_DECISION_STATE;
}

export function contributionAlignmentSmallInternalMethodPrototypeHash(prototype) {
  const withoutHash = { ...prototype };
  delete withoutHash.prototype_hash;
  return sha256Json(withoutHash);
}

function buildBasePrototype(sourceDecision, options = {}) {
  const decision = clone(sourceDecision);
  const decisionValidation = sourceDecisionValidationFor(decision, options);
  const preliminaryContentGaps = [];
  const prototypeState = prototypeStateFor(
    decision,
    decisionValidation,
    preliminaryContentGaps
  );
  const readyForPrototype = prototypeState === READY_STATE;
  const validationGaps = sanitizeGaps(decisionValidation.gaps.map(safeValidationGap));

  let prototype = {
    schema_version: CONTRIBUTION_ALIGNMENT_SMALL_INTERNAL_METHOD_PROTOTYPE_SCHEMA_VERSION,
    prototype_id: `contribution_alignment_small_internal_method_prototype_${sha256Json({
      decision_id: decision?.decision_id ?? null,
      decision_hash: decision?.decision_hash ?? null
    }).slice(0, 16)}`,
    prototype_state: prototypeState,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_decision_ref: compactSourceDecisionRef(decision),
    prototype_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      qualitative_component_posture_only: readyForPrototype,
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
    method_frame: {
      method_family: "contribution_alignment_component_posture",
      output_kind: "qualitative_component_posture",
      numeric_combination_authorized: false,
      result_emitted: false,
      parameterization_authorized: false,
      research_feed_authorized: false
    },
    qualitative_component_postures: readyForPrototype ? [...COMPONENT_POSTURES] : [],
    context_separation_review: contextSeparationReviewFor(options, readyForPrototype),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_method_prototype_review: readyForPrototype,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_decision_only: true,
      receives_full_decision_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_prototype_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_prototype: false,
      creates_routes: false,
      creates_ui: false,
      creates_schemas: false,
      creates_exports: false,
      runs_live_connectors: false,
      feeds_research_model: false,
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
        `${CONTRIBUTION_ALIGNMENT_SMALL_INTERNAL_METHOD_PROTOTYPE_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForPrototype,
      prototype_state: prototypeState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(prototype);
  if (contentGaps.length > 0) {
    prototype = {
      ...prototype,
      prototype_state: REJECT_BOUNDARY_STATE,
      prototype_scope: {
        ...prototype.prototype_scope,
        qualitative_component_posture_only: false
      },
      feeds: {
        ...prototype.feeds,
        internal_method_prototype_review: false
      },
      validation_summary: {
        ...prototype.validation_summary,
        valid: false,
        prototype_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  prototype.prototype_hash = contributionAlignmentSmallInternalMethodPrototypeHash(prototype);
  return prototype;
}

export function buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
  sourceDecision,
  options = {}
) {
  return buildBasePrototype(sourceDecision, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(prototype) {
  const gaps = [];
  if (!isPlainObject(prototype)) {
    return ["small internal method prototype must be an object"];
  }
  Object.keys(prototype).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    prototype.schema_version !==
    CONTRIBUTION_ALIGNMENT_SMALL_INTERNAL_METHOD_PROTOTYPE_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_DECISION_STATE, REJECT_BOUNDARY_STATE].includes(prototype.prototype_state)) {
    gaps.push("prototype_state is invalid");
  }
  if (!isPlainObject(prototype.prototype_scope)) {
    gaps.push("prototype_scope is required");
  } else {
    for (const key of Object.keys(prototype.prototype_scope)) {
      if (!PROTOTYPE_SCOPE_FIELDS.includes(key)) {
        gaps.push("prototype_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      qualitative_component_posture_only: prototype.prototype_state === READY_STATE,
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
      if (prototype.prototype_scope[field] !== expected) {
        gaps.push(`prototype_scope.${field} must be ${expected}`);
      }
    }
  }
  for (const [field, expected] of Object.entries({
    method_family: "contribution_alignment_component_posture",
    output_kind: "qualitative_component_posture",
    numeric_combination_authorized: false,
    result_emitted: false,
    parameterization_authorized: false,
    research_feed_authorized: false
  })) {
    if (prototype.method_frame?.[field] !== expected) {
      gaps.push(`method_frame.${field} must be ${expected}`);
    }
  }
  gaps.push(
    ...exactArrayGaps(
      prototype.qualitative_component_postures,
      prototype.prototype_state === READY_STATE ? COMPONENT_POSTURES : [],
      "qualitative_component_postures"
    )
  );
  const feeds = prototype.feeds ?? {};
  if (
    feeds.internal_method_prototype_review !==
    (prototype.prototype_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_method_prototype_review must be true only for ready prototypes");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_method_prototype_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_decision_only") {
      if (prototype.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_decision_only must be true");
      }
    } else if (prototype.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(prototype.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(prototype.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(prototype.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = prototype.validation_summary ?? {};
  if (validationSummary.prototype_state !== prototype.prototype_state) {
    gaps.push("validation_summary.prototype_state must match prototype_state");
  }
  if (validationSummary.valid !== (prototype.prototype_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match prototype readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (prototype.prototype_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready prototypes");
  }
  if (
    prototype.prototype_hash !==
    contributionAlignmentSmallInternalMethodPrototypeHash(prototype)
  ) {
    gaps.push("prototype_hash must match compact small internal method prototype");
  }
  return gaps;
}

function collectSourceBindingGaps(prototype, options = {}) {
  const gaps = [];
  if (!isPlainObject(prototype)) {
    gaps.push("small internal method prototype must be an object");
    return gaps;
  }
  if (!options.sourceDecision) {
    gaps.push("sourceDecision is required for small internal method prototype validation");
    return gaps;
  }
  const decisionValidation = sourceDecisionValidationFor(options.sourceDecision, options);
  if (!options.sourceGateReview) {
    gaps.push("sourceGateReview is required for small internal method prototype validation");
  }
  if (!options.sourcePrototypeReviewPacket) {
    gaps.push("sourcePrototypeReviewPacket is required for small internal method prototype validation");
  }
  if (!options.sourcePrototype) {
    gaps.push("sourcePrototype is required for small internal method prototype validation");
  }
  if (!options.sourceDesignReview) {
    gaps.push("sourceDesignReview is required for small internal method prototype validation");
  }
  if (!options.sourceReviewPacket) {
    gaps.push("sourceReviewPacket is required for small internal method prototype validation");
  }
  if (!options.sourceRunner) {
    gaps.push("sourceRunner is required for small internal method prototype validation");
  }
  if (!options.sourcePacket) {
    gaps.push("sourcePacket is required for small internal method prototype validation");
  }
  if (!options.sourceFixture) {
    gaps.push("sourceFixture is required for small internal method prototype validation");
  }
  if (!options.researchDesignText) {
    gaps.push("researchDesignText is required for small internal method prototype validation");
  }
  if (!options.implementationDecisionText) {
    gaps.push("implementationDecisionText is required for small internal method prototype validation");
  }
  const expectedPrototype = buildBasePrototype(options.sourceDecision, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourceGateReview: options.sourceGateReview,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedPrototype);
  const actualWithoutHash = clone(prototype);
  delete expectedWithoutHash.prototype_hash;
  delete actualWithoutHash.prototype_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("small internal method prototype must match source-decision-bound expected envelope");
  }
  if (
    prototype.source_decision_ref?.decision_id !==
    options.sourceDecision.decision_id
  ) {
    gaps.push("source_decision_ref.decision_id drifted");
  }
  if (
    prototype.source_decision_ref?.decision_hash !==
    options.sourceDecision.decision_hash
  ) {
    gaps.push("source_decision_ref.decision_hash drifted");
  }
  const expectedState = prototypeStateFor(options.sourceDecision, decisionValidation, []);
  if (prototype.prototype_state !== expectedState) {
    gaps.push(`prototype_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentSmallInternalMethodPrototype(
  prototype,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(prototype),
    ...collectSourceBindingGaps(prototype, options),
    ...hasForbiddenContent(prototype)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    prototype_id: safeValidationScalar(prototype?.prototype_id),
    prototype_state: safeValidationScalar(prototype?.prototype_state, [
      READY_STATE,
      HOLD_DECISION_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && prototype?.prototype_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_small_internal_method_prototype.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  return {
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision
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
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
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
  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
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
  process.stdout.write(`${JSON.stringify(prototype, null, 2)}\n`);
}
