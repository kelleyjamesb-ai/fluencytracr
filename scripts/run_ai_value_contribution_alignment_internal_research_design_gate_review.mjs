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
  buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject,
  validateContributionAlignmentInternalModelPrototypeReviewPacket
} from "./run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_research_design_gate_review_2026_06";

const READY_STATE = "READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION";
const HOLD_REVIEW_PACKET_STATE =
  "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SOURCE_REVIEW_PACKET_READY_STATE = "READY_FOR_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW";

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
  "gate_review_id",
  "gate_state",
  "generated_at",
  "derivation_version",
  "source_prototype_review_packet_ref",
  "gate_scope",
  "research_design_ref",
  "gate_review_summary",
  "context_separation_review",
  "boundary_clearance",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "gate_review_hash"
]);

const GATE_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "gate_review_only",
  "method_prototype_decision_review",
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
  "receives_compact_review_packet_only",
  "receives_full_review_packet_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_prototype_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_gate_review",
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
  "Internal research-design gate review is non-persistent review gating only.",
  "Ready state authorizes only a later exact-scope method-prototype decision review.",
  "The gate review consumes compact prototype review packet refs and hashes only.",
  "The gate review does not authorize research model feed, model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct."
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
  /review_?packet_?payload/i,
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
  /review_packet_payload/i,
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
  if (/^contribution_alignment_internal_research_design_gate_review_[0-9a-f]{16}$/.test(value)) {
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

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("prototype review packet must match source-prototype-bound expected envelope")) {
    return "source_prototype_review_packet: prototype review packet must match source-prototype-bound expected envelope";
  }
  if (text.includes("component_trace_review.missing_components must be empty for ready review packets")) {
    return "source_prototype_review_packet: component trace incomplete";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_prototype_review_packet rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_prototype_review_packet rejected unsafe or invalid content";
  }
  return `source_prototype_review_packet: ${text}`;
}

function compactSourcePrototypeReviewPacketRef(packet) {
  return {
    review_packet_id: compactScalar(packet?.review_packet_id),
    review_state: compactScalar(packet?.review_state),
    review_packet_hash: compactScalar(packet?.review_packet_hash),
    source_prototype_id: compactScalar(packet?.source_prototype_ref?.prototype_id),
    source_prototype_hash: compactScalar(packet?.source_prototype_ref?.prototype_hash),
    source_design_review_id:
      compactScalar(packet?.source_prototype_ref?.source_design_review_id),
    source_design_review_hash:
      compactScalar(packet?.source_prototype_ref?.source_design_review_hash),
    method_family: compactScalar(packet?.source_prototype_ref?.method_family),
    replay_mode: compactScalar(packet?.source_prototype_ref?.replay_mode)
  };
}

function contextSeparationReviewFor(packet, readyForGateReview) {
  if (!readyForGateReview) {
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
      compactScalar(packet?.context_separation_review?.ai_fluency_construct_context_state),
    psychological_context_state:
      compactScalar(packet?.context_separation_review?.psychological_context_state),
    observed_vbd_context_state:
      compactScalar(packet?.context_separation_review?.observed_vbd_context_state),
    selected_metric_movement_state:
      compactScalar(packet?.context_separation_review?.selected_metric_movement_state),
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
      path.startsWith("review.gate_scope.") ||
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
          path === "review.gate_scope" ||
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

function sourceReviewPacketValidationFor(packet, options = {}) {
  if (!packet) {
    return {
      valid: false,
      gaps: ["sourcePrototypeReviewPacket is required"]
    };
  }
  return validateContributionAlignmentInternalModelPrototypeReviewPacket(packet, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function gateStateFor(packet, packetValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const packetReady =
    packet?.review_state === SOURCE_REVIEW_PACKET_READY_STATE &&
    packet?.feeds?.internal_research_design_gate_review === true &&
    packetValidation.valid === true;
  return packetReady ? READY_STATE : HOLD_REVIEW_PACKET_STATE;
}

export function contributionAlignmentInternalResearchDesignGateReviewHash(
  gateReview
) {
  const withoutHash = { ...gateReview };
  delete withoutHash.gate_review_hash;
  return sha256Json(withoutHash);
}

function buildBaseGateReview(sourcePrototypeReviewPacket, options = {}) {
  const packet = clone(sourcePrototypeReviewPacket);
  const packetValidation = sourceReviewPacketValidationFor(packet, options);
  const preliminaryContentGaps = [];
  const gateState = gateStateFor(
    packet,
    packetValidation,
    preliminaryContentGaps
  );
  const readyForGateReview = gateState === READY_STATE;
  const validationGaps = sanitizeGaps(
    packetValidation.gaps.map(safeValidationGap)
  );

  let gateReview = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_SCHEMA_VERSION,
    gate_review_id: `contribution_alignment_internal_research_design_gate_review_${sha256Json({
      review_packet_id: packet?.review_packet_id ?? null,
      review_packet_hash: packet?.review_packet_hash ?? null
    }).slice(0, 16)}`,
    gate_state: gateState,
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_prototype_review_packet_ref: compactSourcePrototypeReviewPacketRef(packet),
    gate_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      gate_review_only: true,
      method_prototype_decision_review: readyForGateReview,
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
    research_design_ref: {
      design_ref: "AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN",
      design_hash: options.researchDesignText ? sha256Text(options.researchDesignText) : null,
      design_status: readyForGateReview ? "internal_design_draft_reviewed" : "held",
      design_cap: "METHOD_DESIGN_ONLY"
    },
    gate_review_summary: {
      source_packet_state: readyForGateReview ? "source_bound" : "held",
      component_trace_state: readyForGateReview ? "complete" : "held",
      context_separation_state: readyForGateReview ? "preserved" : "held",
      output_boundary_state: readyForGateReview ? "blocked_output_safe" : "held",
      evidence_scope: readyForGateReview ? "controlled_fixture_refs_only" : "held",
      allowed_next_step: readyForGateReview
        ? "exact_scope_method_prototype_decision_only"
        : "none"
    },
    context_separation_review: contextSeparationReviewFor(packet, readyForGateReview),
    boundary_clearance: {
      source_bound: packetValidation.valid,
      component_trace_complete:
        readyForGateReview &&
        packet?.component_trace_review?.missing_components?.length === 0,
      context_separation_preserved: readyForGateReview,
      result_emission_blocked: true,
      score_like_emission_blocked: true,
      uncertainty_claim_blocked: true,
      financial_claim_blocked: true,
      customer_release_blocked: true,
      durable_state_blocked: true,
      live_execution_blocked: true
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      method_prototype_decision_review: readyForGateReview,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_review_packet_only: true,
      receives_full_review_packet_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_prototype_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_gate_review: false,
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
        `${CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForGateReview,
      gate_state: gateState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(gateReview);
  if (contentGaps.length > 0) {
    gateReview = {
      ...gateReview,
      gate_state: REJECT_BOUNDARY_STATE,
      gate_scope: {
        ...gateReview.gate_scope,
        method_prototype_decision_review: false
      },
      feeds: {
        ...gateReview.feeds,
        method_prototype_decision_review: false
      },
      validation_summary: {
        ...gateReview.validation_summary,
        valid: false,
        gate_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  gateReview.gate_review_hash =
    contributionAlignmentInternalResearchDesignGateReviewHash(gateReview);
  return gateReview;
}

export function buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
  sourcePrototypeReviewPacket,
  options = {}
) {
  return buildBaseGateReview(sourcePrototypeReviewPacket, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(gateReview) {
  const gaps = [];
  if (!isPlainObject(gateReview)) {
    return ["research-design gate review must be an object"];
  }
  Object.keys(gateReview).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    gateReview.schema_version !==
    CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_REVIEW_PACKET_STATE, REJECT_BOUNDARY_STATE].includes(gateReview.gate_state)) {
    gaps.push("gate_state is invalid");
  }
  if (!isPlainObject(gateReview.gate_scope)) {
    gaps.push("gate_scope is required");
  } else {
    for (const key of Object.keys(gateReview.gate_scope)) {
      if (!GATE_SCOPE_FIELDS.includes(key)) {
        gaps.push("gate_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      gate_review_only: true,
      method_prototype_decision_review: gateReview.gate_state === READY_STATE,
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
      if (gateReview.gate_scope[field] !== expected) {
        gaps.push(`gate_scope.${field} must be ${expected}`);
      }
    }
  }
  if (gateReview.gate_state === READY_STATE) {
    const expectedSummary = {
      source_packet_state: "source_bound",
      component_trace_state: "complete",
      context_separation_state: "preserved",
      output_boundary_state: "blocked_output_safe",
      evidence_scope: "controlled_fixture_refs_only",
      allowed_next_step: "exact_scope_method_prototype_decision_only"
    };
    for (const [field, expected] of Object.entries(expectedSummary)) {
      if (gateReview.gate_review_summary?.[field] !== expected) {
        gaps.push(`gate_review_summary.${field} must be ${expected}`);
      }
    }
  }
  const feeds = gateReview.feeds ?? {};
  if (
    feeds.method_prototype_decision_review !==
    (gateReview.gate_state === READY_STATE)
  ) {
    gaps.push("feeds.method_prototype_decision_review must be true only for ready gate reviews");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "method_prototype_decision_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_review_packet_only") {
      if (gateReview.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_review_packet_only must be true");
      }
    } else if (gateReview.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(gateReview.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(gateReview.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(gateReview.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = gateReview.validation_summary ?? {};
  if (validationSummary.gate_state !== gateReview.gate_state) {
    gaps.push("validation_summary.gate_state must match gate_state");
  }
  if (validationSummary.valid !== (gateReview.gate_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match gate_state readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (gateReview.gate_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready gate reviews");
  }
  if (
    gateReview.gate_review_hash !==
    contributionAlignmentInternalResearchDesignGateReviewHash(gateReview)
  ) {
    gaps.push("gate_review_hash must match compact research-design gate review");
  }
  return gaps;
}

function collectSourceBindingGaps(gateReview, options = {}) {
  const gaps = [];
  if (!isPlainObject(gateReview)) {
    gaps.push("research-design gate review must be an object");
    return gaps;
  }
  if (!options.sourcePrototypeReviewPacket) {
    gaps.push("sourcePrototypeReviewPacket is required for research-design gate review validation");
    return gaps;
  }
  const packetValidation = sourceReviewPacketValidationFor(
    options.sourcePrototypeReviewPacket,
    options
  );
  if (!options.sourcePrototype) {
    gaps.push("sourcePrototype is required for research-design gate review validation");
  }
  if (!options.sourceDesignReview) {
    gaps.push("sourceDesignReview is required for research-design gate review validation");
  }
  if (!options.sourceReviewPacket) {
    gaps.push("sourceReviewPacket is required for research-design gate review validation");
  }
  if (!options.sourceRunner) {
    gaps.push("sourceRunner is required for research-design gate review validation");
  }
  if (!options.sourcePacket) {
    gaps.push("sourcePacket is required for research-design gate review validation");
  }
  if (!options.sourceFixture) {
    gaps.push("sourceFixture is required for research-design gate review validation");
  }
  if (!options.researchDesignText) {
    gaps.push("researchDesignText is required for research-design gate review validation");
  }
  if (!options.implementationDecisionText) {
    gaps.push("implementationDecisionText is required for research-design gate review validation");
  }
  const expectedGateReview = buildBaseGateReview(options.sourcePrototypeReviewPacket, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourceDesignReview: options.sourceDesignReview,
    sourcePrototype: options.sourcePrototype,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedGateReview);
  const actualWithoutHash = clone(gateReview);
  delete expectedWithoutHash.gate_review_hash;
  delete actualWithoutHash.gate_review_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("research-design gate review must match source-review-packet-bound expected envelope");
  }
  if (
    gateReview.source_prototype_review_packet_ref?.review_packet_id !==
    options.sourcePrototypeReviewPacket.review_packet_id
  ) {
    gaps.push("source_prototype_review_packet_ref.review_packet_id drifted");
  }
  if (
    gateReview.source_prototype_review_packet_ref?.review_packet_hash !==
    options.sourcePrototypeReviewPacket.review_packet_hash
  ) {
    gaps.push("source_prototype_review_packet_ref.review_packet_hash drifted");
  }
  const expectedState = gateStateFor(
    options.sourcePrototypeReviewPacket,
    packetValidation,
    []
  );
  if (gateReview.gate_state !== expectedState) {
    gaps.push(`gate_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentInternalResearchDesignGateReview(
  gateReview,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(gateReview),
    ...collectSourceBindingGaps(gateReview, options),
    ...hasForbiddenContent(gateReview)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    gate_review_id: safeValidationScalar(gateReview?.gate_review_id),
    gate_state: safeValidationScalar(gateReview?.gate_state, [
      READY_STATE,
      HOLD_REVIEW_PACKET_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && gateReview?.gate_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  const sourcePrototypeReviewPacket =
    buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
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
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    sourcePrototypeReviewPacket,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      sourcePrototypeReviewPacket,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      sourcePrototypeReviewPacket,
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
  process.stdout.write(`${JSON.stringify(gateReview, null, 2)}\n`);
}
