#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildResearchPromotionReadinessPacketFromObject,
  researchPromotionPacketIntegrityHash,
  validateResearchPromotionReadinessPacket
} from "./run_ai_value_research_promotion_readiness_packet.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_prototype_runner_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_ALIGNMENT_REVIEW";
const HOLD_PACKET_STATE = "HOLD_FOR_VALID_RESEARCH_PROMOTION_PACKET";
const HOLD_DESIGN_STATE = "HOLD_FOR_VALID_INTERNAL_RESEARCH_DESIGN";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const IMPLEMENTATION_DECISION =
  "PROMOTE_NON_PERSISTENT_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION__HOLD_MODEL_IMPLEMENTATION";

const IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const DEFAULT_RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";

const APPROVED_RESEARCH_DESIGN_HASH =
  "be5722a843d259fe79ff7f7c3f4c13c3ac9530b92502ef9d9e6a6130fa0b3769";

const APPROVED_IMPLEMENTATION_DECISION_HASH =
  "a24eaa99eb2936c2fcb10d8b34dfa995edaf0e556e0144f64c19e95f91fc397a";

const FALSE_FEEDS = [
  "research_model_feed",
  "model_output",
  "numeric_weight_output",
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
  "runner_id",
  "runner_state",
  "generated_at",
  "derivation_version",
  "implementation_decision_ref",
  "packet_ref",
  "research_design_ref",
  "review_scope",
  "design_strength_cap",
  "source_bound_posture",
  "selected_expectation_path_ref",
  "milestone_review",
  "context_refs",
  "assumption_governance_ref",
  "data_spine_alignment_ref",
  "source_package_review_posture_ref",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "runner_hash"
]);

const REVIEW_SCOPE_FIELDS = new Set([
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "model_result_authorized",
  "customer_output_authorized",
  "finance_output_authorized",
  "probability_output_authorized",
  "score_like_output_authorized",
  "route_creation_authorized",
  "ui_creation_authorized",
  "schema_creation_authorized",
  "persistence_write_authorized",
  "export_creation_authorized",
  "live_connector_execution_authorized"
]);

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_refs_only",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_runner_output",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "feeds_research_model",
  "emits_model_result",
  "emits_numeric_weights",
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
  "Internal prototype runner output is method-design review only.",
  "The runner consumes compact refs and hashes only.",
  "The runner does not implement model math, numeric weights, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
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
  /measurement_?cell_?payload/i,
  /series_?payload/i,
  /expectation_?path_?registry/i,
  /payload_?json/i,
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
  /\bselect\b.+\bfrom\b/i,
  /\braw rows?\b/i,
  /\bquery text\b/i,
  /\bsql text\b/i,
  /\bprompt\b/i,
  /\btranscript\b/i,
  /person@example\.com/i,
  /\bconfidence score\b/i,
  /\bcontribution score\b/i,
  /\bprobability of contribution\b/i,
  /\bproved roi\b/i,
  /\bpredicted roi\b/i,
  /\brealized roi\b/i,
  /\bebitda\b/i,
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

export function contributionAlignmentInternalPrototypeRunnerHash(runner) {
  const withoutHash = { ...runner };
  delete withoutHash.runner_hash;
  return sha256Json(withoutHash);
}

function hasForbiddenContent(value, path = "runner") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("runner.feeds.") ||
      path.startsWith("runner.boundary_policy.") ||
      path.startsWith("runner.review_scope.")
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
          path === "runner.feeds" ||
          path === "runner.boundary_policy" ||
          path === "runner.review_scope"
        );
      if (
        !safeNegativeBoundaryKey &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push(`${nestedPath} must not contain raw rows, query text, identifiers, model, finance, customer-facing, or generic payload fields`);
      }
      gaps.push(...hasForbiddenContent(nested, nestedPath));
    }
    return gaps;
  }
  if (typeof value === "string") {
    if (
      path.startsWith("runner.blocked_uses[") &&
      REQUIRED_BLOCKED_USES.includes(value)
    ) {
      return gaps;
    }
    if (
      path.startsWith("runner.required_caveats[") &&
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

function packetValidationFor(packet, options) {
  if (!options.sourceFixture) {
    return {
      valid: false,
      gaps: ["sourceFixture is required to bind the runner to the controlled source packet"]
    };
  }
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: options.sourceFixture,
    cwd: options.cwd
  });
  const expectedPacket = buildResearchPromotionReadinessPacketFromObject(
    options.sourceFixture,
    { cwd: options.cwd }
  );
  const gaps = [...validation.gaps];
  if (JSON.stringify(packet) !== JSON.stringify(expectedPacket)) {
    gaps.push("research promotion packet must match source-fixture-bound output");
  }
  if (researchPromotionPacketIntegrityHash(packet) !== packet.packet_integrity_hash) {
    gaps.push("research promotion packet integrity hash drifted");
  }
  if (packet.decision !== "READY_FOR_INTERNAL_RESEARCH_DESIGN") {
    gaps.push("research promotion packet decision must be READY_FOR_INTERNAL_RESEARCH_DESIGN");
  }
  return {
    ...validation,
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps)
  };
}

function designValidationFor(options) {
  const text = options.researchDesignText ?? "";
  const gaps = [];
  const designHash = text ? sha256Text(text) : null;
  if (!text) gaps.push("research design text is required");
  if (designHash !== APPROVED_RESEARCH_DESIGN_HASH) {
    gaps.push("research design hash must match approved internal research design");
  }
  if (!text.includes("Decision: `RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT`")) {
    gaps.push("research design decision must remain RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT");
  }
  if (!text.includes("Implementation posture: `HOLD_RESEARCH_MODEL_IMPLEMENTATION`")) {
    gaps.push("research design must keep model implementation held");
  }
  if (!text.includes("METHOD_DESIGN_ONLY")) {
    gaps.push("research design must preserve METHOD_DESIGN_ONLY cap");
  }
  if (!text.includes("PROMOTE_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_DESIGN__HOLD_RUNNER_IMPLEMENTATION")) {
    gaps.push("research design must cite the implementation-held prototype runner design decision");
  }
  return {
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps),
    design_hash: designHash
  };
}

function implementationDecisionValidationFor(options) {
  const text = options.implementationDecisionText ?? "";
  const gaps = [];
  const decisionHash = text ? sha256Text(text) : null;
  if (!text) gaps.push("implementation decision text is required");
  if (decisionHash !== APPROVED_IMPLEMENTATION_DECISION_HASH) {
    gaps.push("implementation decision hash must match approved internal runner implementation decision");
  }
  if (!text.includes(`Decision:\n\`${IMPLEMENTATION_DECISION}\``)) {
    gaps.push("implementation decision must promote only the non-persistent internal runner implementation");
  }
  if (!text.includes("does not authorize confidence math")) {
    gaps.push("implementation decision must keep confidence math and model implementation blocked");
  }
  return {
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps),
    decision_hash: decisionHash
  };
}

function runnerStateFor(
  packetValidation,
  designValidation,
  implementationDecisionValidation,
  runnerContentGaps
) {
  if (runnerContentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  if (!packetValidation.valid) return HOLD_PACKET_STATE;
  if (!designValidation.valid) return HOLD_DESIGN_STATE;
  if (!implementationDecisionValidation.valid) return HOLD_DESIGN_STATE;
  return READY_STATE;
}

function contextRef(ref, refState) {
  return {
    ref_state: refState,
    context_ref: ref?.context_ref ?? null,
    source_ref: ref?.source_ref ?? null,
    context_scope: ref?.context_scope ?? null,
    readiness_effect: ref?.readiness_effect ?? null,
    source_hash: ref?.source_hash ?? null
  };
}

function compactSnapshotRef(ref) {
  return {
    window_id: ref.window_id,
    milestone_day: ref.milestone_day,
    status: ref.status,
    snapshot_ref: ref.snapshot_ref,
    assembly_run_ref: ref.assembly_run_ref,
    metric_id: ref.metric_id,
    metric_direction: ref.metric_direction,
    metric_lag_days: ref.metric_lag_days,
    expectation_path_id: ref.expectation_path_id,
    expectation_path_version: ref.expectation_path_version,
    expectation_path_hash: ref.expectation_path_hash,
    value_hypothesis_ref: ref.value_hypothesis_ref,
    value_driver: ref.value_driver
  };
}

function buildBaseRunner(packet, options = {}) {
  const packetValidation = packetValidationFor(packet, options);
  const designValidation = designValidationFor(options);
  const implementationDecisionValidation = implementationDecisionValidationFor(options);
  const preliminaryContentGaps = [];
  const state = runnerStateFor(
    packetValidation,
    designValidation,
    implementationDecisionValidation,
    preliminaryContentGaps
  );
  const validationGaps = sanitizeGaps([
    ...packetValidation.gaps,
    ...designValidation.gaps,
    ...implementationDecisionValidation.gaps
  ]);
  const validForReview = state === READY_STATE;
  const runner = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_SCHEMA_VERSION,
    runner_id: `contribution_alignment_internal_runner_${sha256Json({
      packet_id: packet.research_promotion_packet_id ?? null,
      packet_hash: packet.packet_integrity_hash ?? null,
      design_hash: designValidation.design_hash
    }).slice(0, 16)}`,
    runner_state: state,
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    implementation_decision_ref: {
      decision: IMPLEMENTATION_DECISION,
      decision_path: IMPLEMENTATION_DECISION_PATH,
      decision_hash: implementationDecisionValidation.decision_hash,
      implementation_scope: "non_persistent_internal_runner_only",
      model_implementation_posture: "HOLD_RESEARCH_MODEL_IMPLEMENTATION",
      customer_output_posture: "blocked"
    },
    packet_ref: {
      research_promotion_packet_id: packet.research_promotion_packet_id ?? null,
      packet_integrity_hash: packet.packet_integrity_hash ?? null,
      packet_decision: packet.decision ?? null,
      source_fixture_bound: packetValidation.valid,
      packet_validation_valid: packetValidation.valid
    },
    research_design_ref: {
      design_path: options.researchDesignPath ?? DEFAULT_RESEARCH_DESIGN_PATH,
      design_hash: designValidation.design_hash,
      design_decision: "RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT",
      design_posture: "HOLD_RESEARCH_MODEL_IMPLEMENTATION",
      design_validation_valid: designValidation.valid
    },
    review_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      model_result_authorized: false,
      customer_output_authorized: false,
      finance_output_authorized: false,
      probability_output_authorized: false,
      score_like_output_authorized: false,
      route_creation_authorized: false,
      ui_creation_authorized: false,
      schema_creation_authorized: false,
      persistence_write_authorized: false,
      export_creation_authorized: false,
      live_connector_execution_authorized: false
    },
    design_strength_cap: "METHOD_DESIGN_ONLY",
    source_bound_posture: {
      source_fixture_bound: packetValidation.valid,
      packet_validation_valid: packetValidation.valid,
      design_validation_valid: designValidation.valid,
      interpretation_cap: "METHOD_DESIGN_ONLY",
      current_packet_is_controlled_fixture_bound: true,
      live_customer_evidence: false
    },
    selected_expectation_path_ref: {
      approved_blueprint_ref: packet.approved_blueprint_ref ?? null,
      value_hypothesis_ref: packet.value_hypothesis_ref ?? null,
      approved_blueprint_payload_hash: packet.approved_blueprint_payload_hash ?? null,
      expectation_path_id: packet.expectation_path_id ?? null,
      expectation_path_version: packet.expectation_path_version ?? null,
      expectation_path_hash: packet.expectation_path_hash ?? null,
      approved_at: packet.approved_at ?? null,
      approved_by_role: packet.approved_by_role ?? null,
      approval_state: packet.approval_state ?? null,
      expected_pathway_metadata: packet.expected_pathway_metadata ?? null
    },
    milestone_review: {
      required_milestones: packet.milestone_coverage?.required_milestones ?? [],
      observed_milestones: packet.milestone_coverage?.observed_milestones ?? [],
      missing_milestones: packet.milestone_coverage?.missing_milestones ?? [],
      ready_windows: packet.milestone_coverage?.ready_windows ?? 0,
      held_windows: packet.milestone_coverage?.held_windows ?? 0,
      suppressed_windows: packet.milestone_coverage?.suppressed_windows ?? 0,
      missing_windows: packet.milestone_coverage?.missing_windows ?? 0,
      blocked_windows: packet.milestone_coverage?.blocked_windows ?? 0,
      compact_snapshot_refs: (packet.measurement_cell_snapshot_refs ?? []).map(
        compactSnapshotRef
      )
    },
    context_refs: {
      ai_fluency_construct_context_ref: contextRef(
        packet.ai_fluency_construct_context_ref,
        packet.ai_fluency_construct_context_ref ? "present" : "missing"
      ),
      ai_fluency_psychological_context_ref: contextRef(
        packet.ai_fluency_psychological_context_ref,
        packet.ai_fluency_psychological_context_ref ? "context_only" : "missing"
      ),
      observed_vbd_context_ref: contextRef(
        packet.observed_vbd_context_ref,
        packet.observed_vbd_context_ref ? "present" : "missing"
      ),
      selected_metric_movement_ref: {
        ref_state: packet.selected_metric_movement_ref?.movement_state ?? "missing",
        context_ref: packet.selected_metric_movement_ref?.context_ref ?? null,
        source_ref: packet.selected_metric_movement_ref?.source_ref ?? null,
        metric_id: packet.selected_metric_movement_ref?.metric_id ?? null,
        metric_direction: packet.selected_metric_movement_ref?.metric_direction ?? null,
        metric_lag_days: packet.selected_metric_movement_ref?.metric_lag_days ?? null,
        movement_state: packet.selected_metric_movement_ref?.movement_state ?? null,
        freshness_state: packet.selected_metric_movement_ref?.freshness_state ?? null,
        window_status: packet.selected_metric_movement_ref?.window_status ?? null,
        window_alignment_state:
          packet.selected_metric_movement_ref?.window_alignment_state ?? null,
        source_hash: packet.selected_metric_movement_ref?.source_hash ?? null
      }
    },
    assumption_governance_ref: packet.assumption_governance_ref ?? null,
    data_spine_alignment_ref: packet.data_spine_alignment_ref ?? null,
    source_package_review_posture_ref: packet.source_package_review_posture_ref ?? null,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_alignment_review: validForReview,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_refs_only: true,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_runner_output: false,
      creates_routes: false,
      creates_ui: false,
      creates_schemas: false,
      creates_exports: false,
      runs_live_connectors: false,
      feeds_research_model: false,
      emits_model_result: false,
      emits_numeric_weights: false,
      emits_probability: false,
      emits_score_like_output: false,
      emits_finance_output: false,
      emits_customer_facing_output: false,
      computes_roi: false,
      claims_causality: false,
      measures_productivity: false
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_SCHEMA_VERSION}_SUMMARY`,
      valid: validForReview,
      runner_state: state,
      gaps: validationGaps
    }
  };
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);
  return runner;
}

export function buildContributionAlignmentInternalPrototypeRunnerFromObject(
  sourcePacket,
  options = {}
) {
  return buildBaseRunner(clone(sourcePacket), {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(runner) {
  const gaps = [];
  if (!isPlainObject(runner)) return ["runner must be an object"];
  for (const key of Object.keys(runner)) {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field: ${key}`);
  }
  if (runner.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_PACKET_STATE, HOLD_DESIGN_STATE, REJECT_BOUNDARY_STATE].includes(runner.runner_state)) {
    gaps.push("runner_state is invalid");
  }
  if (!isPlainObject(runner.review_scope)) {
    gaps.push("review_scope is required");
  } else {
    for (const key of Object.keys(runner.review_scope)) {
      if (!REVIEW_SCOPE_FIELDS.has(key)) {
        gaps.push(`review_scope.${key} is not allowed`);
      }
    }
    for (const [key, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      model_result_authorized: false,
      customer_output_authorized: false,
      finance_output_authorized: false,
      probability_output_authorized: false,
      score_like_output_authorized: false,
      route_creation_authorized: false,
      ui_creation_authorized: false,
      schema_creation_authorized: false,
      persistence_write_authorized: false,
      export_creation_authorized: false,
      live_connector_execution_authorized: false
    })) {
      if (runner.review_scope[key] !== expected) {
        gaps.push(`review_scope.${key} must be ${expected}`);
      }
    }
  }
  if (runner.design_strength_cap !== "METHOD_DESIGN_ONLY") {
    gaps.push("design_strength_cap must remain METHOD_DESIGN_ONLY");
  }
  for (const feed of FALSE_FEEDS) {
    if (runner.feeds?.[feed] !== false) {
      gaps.push(`feeds.${feed} must remain false`);
    }
  }
  for (const key of Object.keys(runner.feeds ?? {})) {
    if (key !== "internal_alignment_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push(`feeds.${key} is not allowed`);
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_refs_only") {
      if (runner.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_refs_only must be true");
      }
    } else if (runner.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(runner.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push(`boundary_policy.${key} is not allowed`);
    }
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!Array.isArray(runner.blocked_uses) || !runner.blocked_uses.includes(blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
  }
  for (const blockedUse of runner.blocked_uses ?? []) {
    if (!REQUIRED_BLOCKED_USES.includes(blockedUse)) {
      gaps.push(`blocked_uses contains ungoverned value: ${blockedUse}`);
    }
  }
  for (const caveat of runner.required_caveats ?? []) {
    if (!REQUIRED_CAVEATS.includes(caveat)) {
      gaps.push(`required_caveats contains ungoverned value: ${caveat}`);
    }
  }
  if (runner.runner_hash !== contributionAlignmentInternalPrototypeRunnerHash(runner)) {
    gaps.push("runner_hash must match compact runner output");
  }
  return gaps;
}

function collectGovernanceSmugglingGaps(runner) {
  const gaps = [];
  for (const blockedUse of runner?.blocked_uses ?? []) {
    if (!REQUIRED_BLOCKED_USES.includes(blockedUse)) {
      gaps.push(`blocked_uses contains ungoverned value: ${blockedUse}`);
    }
  }
  for (const caveat of runner?.required_caveats ?? []) {
    if (!REQUIRED_CAVEATS.includes(caveat)) {
      gaps.push(`required_caveats contains ungoverned value: ${caveat}`);
    }
  }
  for (const gap of runner?.validation_summary?.gaps ?? []) {
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(gap)) {
        gaps.push("validation_summary.gaps contains unsafe model, finance, raw, identifier, or customer-facing language");
      }
    }
  }
  return gaps;
}

function collectSourceBindingGaps(runner, options = {}) {
  const gaps = [];
  const packet = options.sourcePacket;
  if (!packet) {
    gaps.push("sourcePacket is required for runner validation");
    return gaps;
  }
  const packetValidation = packetValidationFor(packet, {
    sourceFixture: options.sourceFixture,
    cwd: options.cwd ?? process.cwd()
  });
  const designValidation = designValidationFor(options);
  const implementationDecisionValidation = implementationDecisionValidationFor(options);
  const contentGaps = hasForbiddenContent(runner);
  const expectedState = runnerStateFor(
    packetValidation,
    designValidation,
    implementationDecisionValidation,
    contentGaps
  );
  const expectedRunner = buildBaseRunner(packet, {
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutSelfValidation = clone(expectedRunner);
  const runnerWithoutSelfValidation = clone(runner);
  delete expectedWithoutSelfValidation.runner_hash;
  delete runnerWithoutSelfValidation.runner_hash;
  if (JSON.stringify(runnerWithoutSelfValidation) !== JSON.stringify(expectedWithoutSelfValidation)) {
    gaps.push("runner output must match source-bound expected envelope");
  }
  if (runner.runner_state !== expectedState) {
    gaps.push(`runner_state must be ${expectedState}`);
  }
  if (runner.packet_ref?.research_promotion_packet_id !== packet.research_promotion_packet_id) {
    gaps.push("packet_ref.research_promotion_packet_id drifted");
  }
  if (runner.packet_ref?.packet_integrity_hash !== packet.packet_integrity_hash) {
    gaps.push("packet_ref.packet_integrity_hash drifted");
  }
  if (options.researchDesignText) {
    const designHash = sha256Text(options.researchDesignText);
    if (runner.research_design_ref?.design_hash !== designHash) {
      gaps.push("research_design_ref.design_hash drifted");
    }
  }
  if (
    runner.implementation_decision_ref?.decision_hash !==
    implementationDecisionValidation.decision_hash
  ) {
    gaps.push("implementation_decision_ref.decision_hash drifted");
  }
  if (expectedState === READY_STATE) {
    if (runner.feeds?.internal_alignment_review !== true) {
      gaps.push("feeds.internal_alignment_review must be true only for ready runner output");
    }
    if (runner.validation_summary?.valid !== true) {
      gaps.push("validation_summary.valid must be true for ready runner output");
    }
  } else {
    if (runner.feeds?.internal_alignment_review !== false) {
      gaps.push("feeds.internal_alignment_review must be false unless ready");
    }
    if (runner.validation_summary?.valid !== false) {
      gaps.push("validation_summary.valid must be false unless ready");
    }
  }
  return gaps;
}

export function validateContributionAlignmentInternalPrototypeRunner(
  runner,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(runner),
    ...collectGovernanceSmugglingGaps(runner),
    ...collectSourceBindingGaps(runner, options),
    ...hasForbiddenContent(runner)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    runner_id: runner?.runner_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_internal_prototype_runner.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
  );
  process.exit(1);
}

function cliOptions(argv) {
  const packetPath = argv.filter((arg) => !arg.startsWith("--")).at(-1);
  const sourceFixtureArg = argv.find((arg) => arg.startsWith("--source-fixture="));
  const researchDesignArg = argv.find((arg) => arg.startsWith("--research-design="));
  return {
    packetPath,
    sourceFixturePath: sourceFixtureArg?.split("=")[1],
    researchDesignPath: researchDesignArg?.split("=")[1]
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
  const packet = JSON.parse(readFileSync(resolve(cwd, packetPath), "utf8"));
  const sourceFixture = JSON.parse(readFileSync(resolve(cwd, sourceFixturePath), "utf8"));
  const researchDesignText = readFileSync(resolve(cwd, researchDesignPath), "utf8");
  const implementationDecisionText = readFileSync(
    resolve(cwd, IMPLEMENTATION_DECISION_PATH),
    "utf8"
  );
  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture,
    researchDesignText,
    researchDesignPath,
    implementationDecisionText,
    cwd
  });
  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture,
    researchDesignText,
    implementationDecisionText,
    cwd
  });
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(runner, null, 2));
}
