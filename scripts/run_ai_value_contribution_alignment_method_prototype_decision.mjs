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
  buildContributionAlignmentInternalResearchDesignGateReviewFromObject,
  validateContributionAlignmentInternalResearchDesignGateReview
} from "./run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs";

export const CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_method_prototype_decision_2026_06";

const READY_STATE = "PROMOTE_SMALL_INTERNAL_METHOD_PROTOTYPE";
const HOLD_GATE_STATE = "HOLD_FOR_VALID_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const SOURCE_GATE_READY_STATE = "READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION";

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
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_gate_review_ref",
  "decision_scope",
  "method_prototype_scope",
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
  "small_internal_method_prototype",
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
  "receives_compact_gate_review_only",
  "receives_full_gate_review_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_prototype_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_decision",
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
  "Method prototype decision is non-persistent internal gating only.",
  "Ready state authorizes only a small internal method prototype.",
  "The small internal method prototype may emit qualitative component posture only.",
  "The decision does not authorize research model feed, model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const METHOD_PROTOTYPE_SCOPE = {
  prototype_kind: "small_internal_method_prototype",
  allowed_output: "qualitative_component_posture_only",
  evidence_scope: "controlled_fixture_compact_refs_only",
  numeric_result_authorized: false,
  customer_output_authorized: false,
  durable_state_authorized: false,
  live_execution_authorized: false
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
  /gate_?review_?payload/i,
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
  /gate_review_payload/i,
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
  if (/^contribution_alignment_method_prototype_decision_[0-9a-f]{16}$/.test(value)) {
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

function compactScalar(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("research-design gate review must match source-review-packet-bound expected envelope")) {
    return "source_gate_review: research-design gate review must match source-review-packet-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_gate_review rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_gate_review rejected unsafe or invalid content";
  }
  return `source_gate_review: ${text}`;
}

function compactSourceGateReviewRef(gateReview) {
  return {
    gate_review_id: compactScalar(gateReview?.gate_review_id),
    gate_state: compactScalar(gateReview?.gate_state),
    gate_review_hash: compactScalar(gateReview?.gate_review_hash),
    source_review_packet_id:
      compactScalar(gateReview?.source_prototype_review_packet_ref?.review_packet_id),
    source_review_packet_hash:
      compactScalar(gateReview?.source_prototype_review_packet_ref?.review_packet_hash),
    source_prototype_id:
      compactScalar(gateReview?.source_prototype_review_packet_ref?.source_prototype_id),
    source_prototype_hash:
      compactScalar(gateReview?.source_prototype_review_packet_ref?.source_prototype_hash),
    allowed_next_step: compactScalar(gateReview?.gate_review_summary?.allowed_next_step),
    evidence_scope: compactScalar(gateReview?.gate_review_summary?.evidence_scope),
    design_hash: compactScalar(gateReview?.research_design_ref?.design_hash)
  };
}

function hasForbiddenContent(value, path = "review") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("review.feeds.") ||
      path.startsWith("review.boundary_policy.") ||
      path.startsWith("review.decision_scope.") ||
      path.startsWith("review.method_prototype_scope.")
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
          path === "review.decision_scope" ||
          path === "review.method_prototype_scope"
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

function sourceGateValidationFor(gateReview, options = {}) {
  if (!gateReview) {
    return {
      valid: false,
      gaps: ["sourceGateReview is required"]
    };
  }
  return validateContributionAlignmentInternalResearchDesignGateReview(gateReview, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function decisionStateFor(gateReview, gateValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const gateReady =
    gateReview?.gate_state === SOURCE_GATE_READY_STATE &&
    gateReview?.feeds?.method_prototype_decision_review === true &&
    gateValidation.valid === true;
  return gateReady ? READY_STATE : HOLD_GATE_STATE;
}

export function contributionAlignmentMethodPrototypeDecisionHash(decision) {
  const withoutHash = { ...decision };
  delete withoutHash.decision_hash;
  return sha256Json(withoutHash);
}

function buildBaseDecision(sourceGateReview, options = {}) {
  const gateReview = clone(sourceGateReview);
  const gateValidation = sourceGateValidationFor(gateReview, options);
  const preliminaryContentGaps = [];
  const decisionState = decisionStateFor(
    gateReview,
    gateValidation,
    preliminaryContentGaps
  );
  const readyForPrototype = decisionState === READY_STATE;
  const validationGaps = sanitizeGaps(gateValidation.gaps.map(safeValidationGap));

  let decision = {
    schema_version: CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_SCHEMA_VERSION,
    decision_id: `contribution_alignment_method_prototype_decision_${sha256Json({
      gate_review_id: gateReview?.gate_review_id ?? null,
      gate_review_hash: gateReview?.gate_review_hash ?? null
    }).slice(0, 16)}`,
    decision_state: decisionState,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_gate_review_ref: compactSourceGateReviewRef(gateReview),
    decision_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      decision_only: true,
      small_internal_method_prototype: readyForPrototype,
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
    method_prototype_scope: {
      ...METHOD_PROTOTYPE_SCOPE,
      scope_state: readyForPrototype ? "authorized_for_internal_build" : "held"
    },
    promotion_basis: {
      source_gate_valid: gateValidation.valid,
      gate_state: compactScalar(gateReview?.gate_state),
      gate_review_hash: compactScalar(gateReview?.gate_review_hash),
      design_hash: options.researchDesignText ? sha256Text(options.researchDesignText) : null,
      allowed_next_step: compactScalar(gateReview?.gate_review_summary?.allowed_next_step)
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      small_internal_method_prototype: readyForPrototype,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_gate_review_only: true,
      receives_full_gate_review_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_prototype_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_decision: false,
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
        `${CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForPrototype,
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
        small_internal_method_prototype: false
      },
      feeds: {
        ...decision.feeds,
        small_internal_method_prototype: false
      },
      validation_summary: {
        ...decision.validation_summary,
        valid: false,
        decision_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  decision.decision_hash = contributionAlignmentMethodPrototypeDecisionHash(decision);
  return decision;
}

export function buildContributionAlignmentMethodPrototypeDecisionFromObject(
  sourceGateReview,
  options = {}
) {
  return buildBaseDecision(sourceGateReview, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(decision) {
  const gaps = [];
  if (!isPlainObject(decision)) return ["method prototype decision must be an object"];
  Object.keys(decision).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    decision.schema_version !==
    CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_GATE_STATE, REJECT_BOUNDARY_STATE].includes(decision.decision_state)) {
    gaps.push("decision_state is invalid");
  }
  if (!isPlainObject(decision.decision_scope)) {
    gaps.push("decision_scope is required");
  } else {
    for (const key of Object.keys(decision.decision_scope)) {
      if (!DECISION_SCOPE_FIELDS.includes(key)) {
        gaps.push("decision_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      decision_only: true,
      small_internal_method_prototype: decision.decision_state === READY_STATE,
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
      if (decision.decision_scope[field] !== expected) {
        gaps.push(`decision_scope.${field} must be ${expected}`);
      }
    }
  }
  if (!isPlainObject(decision.method_prototype_scope)) {
    gaps.push("method_prototype_scope is required");
  } else {
    for (const [field, expected] of Object.entries(METHOD_PROTOTYPE_SCOPE)) {
      if (decision.method_prototype_scope[field] !== expected) {
        gaps.push(`method_prototype_scope.${field} must be ${expected}`);
      }
    }
    if (
      decision.method_prototype_scope.scope_state !==
      (decision.decision_state === READY_STATE ? "authorized_for_internal_build" : "held")
    ) {
      gaps.push("method_prototype_scope.scope_state must match decision readiness");
    }
  }
  const feeds = decision.feeds ?? {};
  if (
    feeds.small_internal_method_prototype !==
    (decision.decision_state === READY_STATE)
  ) {
    gaps.push("feeds.small_internal_method_prototype must be true only for ready decisions");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "small_internal_method_prototype" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_gate_review_only") {
      if (decision.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_gate_review_only must be true");
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
  if (decision.decision_hash !== contributionAlignmentMethodPrototypeDecisionHash(decision)) {
    gaps.push("decision_hash must match compact method prototype decision");
  }
  return gaps;
}

function collectSourceBindingGaps(decision, options = {}) {
  const gaps = [];
  if (!isPlainObject(decision)) {
    gaps.push("method prototype decision must be an object");
    return gaps;
  }
  if (!options.sourceGateReview) {
    gaps.push("sourceGateReview is required for method prototype decision validation");
    return gaps;
  }
  const gateValidation = sourceGateValidationFor(options.sourceGateReview, options);
  if (!options.sourcePrototypeReviewPacket) {
    gaps.push("sourcePrototypeReviewPacket is required for method prototype decision validation");
  }
  if (!options.sourcePrototype) {
    gaps.push("sourcePrototype is required for method prototype decision validation");
  }
  if (!options.sourceDesignReview) {
    gaps.push("sourceDesignReview is required for method prototype decision validation");
  }
  if (!options.sourceReviewPacket) {
    gaps.push("sourceReviewPacket is required for method prototype decision validation");
  }
  if (!options.sourceRunner) {
    gaps.push("sourceRunner is required for method prototype decision validation");
  }
  if (!options.sourcePacket) {
    gaps.push("sourcePacket is required for method prototype decision validation");
  }
  if (!options.sourceFixture) {
    gaps.push("sourceFixture is required for method prototype decision validation");
  }
  if (!options.researchDesignText) {
    gaps.push("researchDesignText is required for method prototype decision validation");
  }
  if (!options.implementationDecisionText) {
    gaps.push("implementationDecisionText is required for method prototype decision validation");
  }
  const expectedDecision = buildBaseDecision(options.sourceGateReview, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePrototypeReviewPacket: options.sourcePrototypeReviewPacket,
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
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("method prototype decision must match source-gate-bound expected envelope");
  }
  if (
    decision.source_gate_review_ref?.gate_review_id !==
    options.sourceGateReview.gate_review_id
  ) {
    gaps.push("source_gate_review_ref.gate_review_id drifted");
  }
  if (
    decision.source_gate_review_ref?.gate_review_hash !==
    options.sourceGateReview.gate_review_hash
  ) {
    gaps.push("source_gate_review_ref.gate_review_hash drifted");
  }
  const expectedState = decisionStateFor(options.sourceGateReview, gateValidation, []);
  if (decision.decision_state !== expectedState) {
    gaps.push(`decision_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentMethodPrototypeDecision(
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
      HOLD_GATE_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && decision?.decision_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_method_prototype_decision.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  return {
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview
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
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.sourceGateReview,
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
  const validation = validateContributionAlignmentMethodPrototypeDecision(
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
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}
