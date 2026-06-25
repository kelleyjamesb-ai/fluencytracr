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
  buildContributionAlignmentInternalModelPrototypeFromObject,
  validateContributionAlignmentInternalModelPrototype
} from "./run_ai_value_contribution_alignment_internal_model_prototype.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_model_prototype_review_packet_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW";
const HOLD_PROTOTYPE_STATE = "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

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
  "review_packet_id",
  "review_state",
  "generated_at",
  "derivation_version",
  "source_prototype_ref",
  "review_scope",
  "source_bound_posture",
  "component_trace_review",
  "context_separation_review",
  "boundary_clearance",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_packet_hash"
]);

const REVIEW_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "review_packet_only",
  "internal_research_design_gate_review",
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

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_prototype_only",
  "receives_full_prototype_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_review_packet",
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
  "model_implementation",
  "research_model_feed",
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
  "Internal model prototype review packet is non-persistent review gating only.",
  "Ready state authorizes only a separate internal research-design gate review.",
  "The review packet consumes compact prototype refs and hashes only.",
  "The review packet does not authorize research model feed, model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
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
  /prototype_review_packet_payload/i,
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
  if (/^contribution_alignment_internal_model_prototype_review_[0-9a-f]{16}$/.test(value)) {
    return value;
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return null;
}

function exactArrayGaps(value, expected, path) {
  const gaps = [];
  if (!Array.isArray(value)) return [`${path} must be an array`];
  if (value.length !== expected.length) {
    gaps.push(`${path} must contain only governed values`);
  }
  for (const item of expected) {
    if (!value.includes(item)) gaps.push(`${path} missing ${item}`);
  }
  value.forEach((item, index) => {
    if (!expected.includes(item)) {
      gaps.push(`${path} contains ungoverned value at index ${index}`);
    }
  });
  return gaps;
}

function compactScalar(value, allowedUnsafeValues = []) {
  if (value === undefined || value === null) return null;
  if (!["string", "number", "boolean"].includes(typeof value)) return null;
  if (allowedUnsafeValues.includes(value)) return value;
  if (
    typeof value === "string" &&
    FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  ) {
    return null;
  }
  return value;
}

function compactBoolean(value) {
  return typeof value === "boolean" ? value : false;
}

function compactScalarArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => compactScalar(item))
    .filter((item) => item !== null);
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("internal model prototype must match source-design-review-bound expected envelope")) {
    return "internal_model_prototype: internal model prototype must match source-design-review-bound expected envelope";
  }
  if (text.includes("component_reviews must match governed component review trace")) {
    return "internal_model_prototype: component_reviews must match governed component review trace";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "internal_model_prototype rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "internal_model_prototype rejected unsafe or invalid content";
  }
  return `internal_model_prototype: ${text}`;
}

function compactSourcePrototypeRef(prototype) {
  return {
    prototype_id: compactScalar(prototype?.prototype_id),
    prototype_state: compactScalar(prototype?.prototype_state),
    prototype_hash: compactScalar(prototype?.prototype_hash),
    source_design_review_id:
      compactScalar(prototype?.source_design_review_ref?.design_review_id),
    source_design_review_hash:
      compactScalar(prototype?.source_design_review_ref?.design_review_hash),
    method_family: compactScalar(prototype?.method_frame?.model_family),
    replay_mode: compactScalar(prototype?.method_frame?.replay_mode)
  };
}

function componentTraceReviewFor(prototype, readyForReview) {
  const observedComponents = readyForReview
    ? compactScalarArray(
        (prototype?.component_reviews ?? []).map((component) => component?.component_id)
      )
    : [];
  return {
    required_components: [...REQUIRED_COMPONENTS],
    observed_components: observedComponents,
    missing_components: REQUIRED_COMPONENTS.filter(
      (component) => !observedComponents.includes(component)
    ),
    invalid_components: observedComponents.filter(
      (component) => !REQUIRED_COMPONENTS.includes(component)
    ),
    component_refs: readyForReview
      ? (prototype?.component_reviews ?? []).map((component) => ({
          component_id: compactScalar(component?.component_id),
          role: compactScalar(component?.role),
          input_ref: compactScalar(component?.input_ref),
          trace_state: compactScalar(component?.trace_state),
          emission_state: compactScalar(component?.emission_state)
        }))
      : []
  };
}

function contextSeparationReviewFor(prototype, readyForReview) {
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
      compactScalar(prototype?.context_refs?.ai_fluency_construct_context_ref?.ref_state),
    psychological_context_state:
      compactScalar(prototype?.context_refs?.ai_fluency_psychological_context_ref?.ref_state),
    observed_vbd_context_state:
      compactScalar(prototype?.context_refs?.observed_vbd_context_ref?.ref_state),
    selected_metric_movement_state:
      compactScalar(prototype?.context_refs?.selected_metric_movement_ref?.ref_state),
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
      path.startsWith("review.boundary_clearance.")
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
      const nestedPath = `${path}.${key}`;
      const safeNegativeBoundaryKey =
        nested === false &&
        (
          path === "review.feeds" ||
          path === "review.boundary_policy" ||
          path === "review.review_scope" ||
          path === "review.boundary_clearance"
        );
      if (
        !safeNegativeBoundaryKey &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("review contains forbidden field name");
      }
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

function sourcePrototypeValidationFor(prototype, options = {}) {
  if (!prototype) {
    return {
      valid: false,
      gaps: ["source prototype is required"]
    };
  }
  return validateContributionAlignmentInternalModelPrototype(prototype, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function reviewStateFor(prototype, prototypeValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const prototypeReady =
    prototype?.prototype_state === "READY_FOR_INTERNAL_MODEL_PROTOTYPE_RECORD" &&
    prototype?.feeds?.internal_model_prototype_record === true &&
    prototypeValidation.valid === true;
  return prototypeReady ? READY_STATE : HOLD_PROTOTYPE_STATE;
}

export function contributionAlignmentInternalModelPrototypeReviewPacketHash(
  reviewPacket
) {
  const withoutHash = { ...reviewPacket };
  delete withoutHash.review_packet_hash;
  return sha256Json(withoutHash);
}

function buildBaseReviewPacket(sourcePrototype, options = {}) {
  const prototype = clone(sourcePrototype);
  const prototypeValidation = sourcePrototypeValidationFor(prototype, options);
  const preliminaryContentGaps = [];
  const reviewState = reviewStateFor(
    prototype,
    prototypeValidation,
    preliminaryContentGaps
  );
  const readyForReview = reviewState === READY_STATE;
  const validationGaps = sanitizeGaps(
    prototypeValidation.gaps.map(safeValidationGap)
  );

  let reviewPacket = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET_SCHEMA_VERSION,
    review_packet_id: `contribution_alignment_internal_model_prototype_review_${sha256Json({
      prototype_id: prototype?.prototype_id ?? null,
      prototype_hash: prototype?.prototype_hash ?? null
    }).slice(0, 16)}`,
    review_state: reviewState,
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_prototype_ref: compactSourcePrototypeRef(prototype),
    review_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      review_packet_only: true,
      internal_research_design_gate_review: readyForReview,
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
    source_bound_posture: {
      source_prototype_valid: prototypeValidation.valid,
      prototype_state: compactScalar(prototype?.prototype_state),
      prototype_hash: compactScalar(prototype?.prototype_hash),
      design_review_hash: compactScalar(
        prototype?.source_design_review_ref?.design_review_hash
      ),
      interpretation_cap: "INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_ONLY"
    },
    component_trace_review: componentTraceReviewFor(prototype, readyForReview),
    context_separation_review: contextSeparationReviewFor(prototype, readyForReview),
    boundary_clearance: {
      source_bound: prototypeValidation.valid,
      component_trace_complete:
        readyForReview &&
        componentTraceReviewFor(prototype, readyForReview).missing_components.length === 0,
      result_emission_blocked: true,
      score_like_emission_blocked: true,
      uncertainty_claim_blocked: true,
      financial_claim_blocked: true,
      customer_release_blocked: true
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_research_design_gate_review: readyForReview,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_prototype_only: true,
      receives_full_prototype_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_review_packet: false,
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
        `${CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForReview,
      review_state: reviewState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(reviewPacket);
  if (contentGaps.length > 0) {
    reviewPacket = {
      ...reviewPacket,
      review_state: REJECT_BOUNDARY_STATE,
      review_scope: {
        ...reviewPacket.review_scope,
        internal_research_design_gate_review: false
      },
      feeds: {
        ...reviewPacket.feeds,
        internal_research_design_gate_review: false
      },
      validation_summary: {
        ...reviewPacket.validation_summary,
        valid: false,
        review_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  reviewPacket.review_packet_hash =
    contributionAlignmentInternalModelPrototypeReviewPacketHash(reviewPacket);
  return reviewPacket;
}

export function buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
  sourcePrototype,
  options = {}
) {
  return buildBaseReviewPacket(sourcePrototype, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(reviewPacket) {
  const gaps = [];
  if (!isPlainObject(reviewPacket)) return ["prototype review packet must be an object"];
  Object.keys(reviewPacket).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    reviewPacket.schema_version !==
    CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_PROTOTYPE_STATE, REJECT_BOUNDARY_STATE].includes(reviewPacket.review_state)) {
    gaps.push("review_state is invalid");
  }
  if (!isPlainObject(reviewPacket.review_scope)) {
    gaps.push("review_scope is required");
  } else {
    for (const key of Object.keys(reviewPacket.review_scope)) {
      if (!REVIEW_SCOPE_FIELDS.includes(key)) {
        gaps.push("review_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      review_packet_only: true,
      internal_research_design_gate_review: reviewPacket.review_state === READY_STATE,
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
      if (reviewPacket.review_scope[field] !== expected) {
        gaps.push(`review_scope.${field} must be ${expected}`);
      }
    }
  }
  const componentTraceReview = reviewPacket.component_trace_review ?? {};
  gaps.push(
    ...exactArrayGaps(
      componentTraceReview.required_components,
      REQUIRED_COMPONENTS,
      "component_trace_review.required_components"
    )
  );
  if (reviewPacket.review_state === READY_STATE) {
    gaps.push(
      ...exactArrayGaps(
        componentTraceReview.observed_components,
        REQUIRED_COMPONENTS,
        "component_trace_review.observed_components"
      )
    );
    if (!Array.isArray(componentTraceReview.missing_components)) {
      gaps.push("component_trace_review.missing_components must be an array");
    } else if (componentTraceReview.missing_components.length > 0) {
      gaps.push("component_trace_review.missing_components must be empty for ready packets");
    }
  }
  const feeds = reviewPacket.feeds ?? {};
  if (
    feeds.internal_research_design_gate_review !==
    (reviewPacket.review_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_research_design_gate_review must be true only for ready review packets");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_research_design_gate_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_prototype_only") {
      if (reviewPacket.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_prototype_only must be true");
      }
    } else if (reviewPacket.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(reviewPacket.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(reviewPacket.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(reviewPacket.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = reviewPacket.validation_summary ?? {};
  if (validationSummary.review_state !== reviewPacket.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (validationSummary.valid !== (reviewPacket.review_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match review_state readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (reviewPacket.review_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready review packets");
  }
  if (
    reviewPacket.review_packet_hash !==
    contributionAlignmentInternalModelPrototypeReviewPacketHash(reviewPacket)
  ) {
    gaps.push("review_packet_hash must match compact prototype review packet");
  }
  return gaps;
}

function collectSourceBindingGaps(reviewPacket, options = {}) {
  const gaps = [];
  if (!isPlainObject(reviewPacket)) {
    gaps.push("prototype review packet must be an object");
    return gaps;
  }
  if (!options.sourcePrototype) {
    gaps.push("sourcePrototype is required for prototype review packet validation");
    return gaps;
  }
  const prototypeValidation = sourcePrototypeValidationFor(
    options.sourcePrototype,
    options
  );
  if (!options.sourceDesignReview) {
    gaps.push("sourceDesignReview is required for prototype review packet validation");
  }
  if (!options.sourceReviewPacket) {
    gaps.push("sourceReviewPacket is required for prototype review packet validation");
  }
  if (!options.sourceRunner) {
    gaps.push("sourceRunner is required for prototype review packet validation");
  }
  if (!options.sourcePacket) {
    gaps.push("sourcePacket is required for prototype review packet validation");
  }
  if (!options.sourceFixture) {
    gaps.push("sourceFixture is required for prototype review packet validation");
  }
  if (!options.researchDesignText) {
    gaps.push("researchDesignText is required for prototype review packet validation");
  }
  if (!options.implementationDecisionText) {
    gaps.push("implementationDecisionText is required for prototype review packet validation");
  }
  const expectedReviewPacket = buildBaseReviewPacket(options.sourcePrototype, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedReviewPacket);
  const actualWithoutHash = clone(reviewPacket);
  delete expectedWithoutHash.review_packet_hash;
  delete actualWithoutHash.review_packet_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("prototype review packet must match source-prototype-bound expected envelope");
  }
  if (
    reviewPacket.source_prototype_ref?.prototype_id !==
    options.sourcePrototype.prototype_id
  ) {
    gaps.push("source_prototype_ref.prototype_id drifted");
  }
  if (
    reviewPacket.source_prototype_ref?.prototype_hash !==
    options.sourcePrototype.prototype_hash
  ) {
    gaps.push("source_prototype_ref.prototype_hash drifted");
  }
  const expectedState = reviewStateFor(
    options.sourcePrototype,
    prototypeValidation,
    []
  );
  if (reviewPacket.review_state !== expectedState) {
    gaps.push(`review_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentInternalModelPrototypeReviewPacket(
  reviewPacket,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(reviewPacket),
    ...collectSourceBindingGaps(reviewPacket, options),
    ...hasForbiddenContent(reviewPacket)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    review_packet_id: safeValidationScalar(reviewPacket?.review_packet_id),
    review_state: safeValidationScalar(reviewPacket?.review_state, [
      READY_STATE,
      HOLD_PROTOTYPE_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && reviewPacket?.review_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  const sourceRunner = buildContributionAlignmentInternalPrototypeRunnerFromObject(
    sourcePacket,
    {
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const sourceReviewPacket = buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    {
      sourceRunner,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const sourceDesignReview = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    {
      sourceRunner,
      sourceReviewPacket,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const sourcePrototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    sourceDesignReview,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    sourcePrototype,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
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
  console.log(JSON.stringify(reviewPacket, null, 2));
}
