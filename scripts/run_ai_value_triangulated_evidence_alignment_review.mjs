#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  contributionAlignmentComparisonDesignAdequacyEvidenceReviewHash
} from "./run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs";

export const TRIANGULATED_EVIDENCE_ALIGNMENT_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_TRIANGULATED_EVIDENCE_ALIGNMENT_REVIEW_2026_06";

const HOLD_STATE = "HOLD_FOR_GOVERNED_EVIDENCE";
const READY_STATES = Object.freeze([
  "ALIGNED_FOR_REVIEW",
  "DIVERGENT_FOR_REVIEW",
  "PARTIAL_ALIGNMENT_FOR_REVIEW"
]);
const READY_COMPARISON_REVIEW_STATE =
  "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING";
const ALLOWED_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  "reviewer_owned_triangulated_evidence_alignment_ref",
  "source_blueprint_hypothesis_ref",
  "source_comparison_design_adequacy_review_hash",
  "source_sed_aggregate_evidence_ref",
  "source_sed_aggregate_evidence_hash",
  "source_vbd_aggregate_evidence_ref",
  "source_vbd_aggregate_evidence_hash",
  "source_outcome_metric_aggregate_evidence_ref",
  "source_outcome_metric_aggregate_evidence_hash",
  "observation_window_ref",
  "cohort_ref",
  "workflow_function_ref",
  "prioritized_use_case_ref",
  "metric_ref",
  "source_sed_blueprint_hypothesis_ref",
  "source_sed_observation_window_ref",
  "source_sed_cohort_ref",
  "source_sed_workflow_function_ref",
  "source_sed_prioritized_use_case_ref",
  "source_sed_metric_ref",
  "source_vbd_blueprint_hypothesis_ref",
  "source_vbd_observation_window_ref",
  "source_vbd_cohort_ref",
  "source_vbd_workflow_function_ref",
  "source_vbd_prioritized_use_case_ref",
  "source_vbd_metric_ref",
  "source_outcome_blueprint_hypothesis_ref",
  "source_outcome_observation_window_ref",
  "source_outcome_cohort_ref",
  "source_outcome_workflow_function_ref",
  "source_outcome_prioritized_use_case_ref",
  "source_outcome_metric_ref",
  "source_sed_evidence_status",
  "source_vbd_evidence_status",
  "source_outcome_evidence_status",
  "reviewer_role_ref",
  "alignment_review_decision",
  "alignment_review_notes",
  "boundary_checks_clear",
  "reviewer_attestations_complete",
  "aggregate_only_scope",
  "placeholder_evidence",
  "generated_fixture_evidence"
]);

const REQUIRED_HASH_FIELDS = Object.freeze([
  "reviewer_owned_triangulated_evidence_alignment_hash",
  "source_comparison_design_adequacy_review_hash",
  "source_sed_aggregate_evidence_hash",
  "source_vbd_aggregate_evidence_hash",
  "source_outcome_metric_aggregate_evidence_hash"
]);

const CONTEXT_BINDINGS = Object.freeze([
  ["source_sed_blueprint_hypothesis_ref", "source_blueprint_hypothesis_ref"],
  ["source_vbd_blueprint_hypothesis_ref", "source_blueprint_hypothesis_ref"],
  ["source_outcome_blueprint_hypothesis_ref", "source_blueprint_hypothesis_ref"],
  ["source_sed_observation_window_ref", "observation_window_ref"],
  ["source_vbd_observation_window_ref", "observation_window_ref"],
  ["source_outcome_observation_window_ref", "observation_window_ref"],
  ["source_sed_cohort_ref", "cohort_ref"],
  ["source_vbd_cohort_ref", "cohort_ref"],
  ["source_outcome_cohort_ref", "cohort_ref"],
  ["source_sed_workflow_function_ref", "workflow_function_ref"],
  ["source_vbd_workflow_function_ref", "workflow_function_ref"],
  ["source_outcome_workflow_function_ref", "workflow_function_ref"],
  ["source_sed_prioritized_use_case_ref", "prioritized_use_case_ref"],
  ["source_vbd_prioritized_use_case_ref", "prioritized_use_case_ref"],
  ["source_outcome_prioritized_use_case_ref", "prioritized_use_case_ref"],
  ["source_sed_metric_ref", "metric_ref"],
  ["source_vbd_metric_ref", "metric_ref"],
  ["source_outcome_metric_ref", "metric_ref"]
]);

const STREAM_REF_PATTERNS = Object.freeze({
  source_sed_aggregate_evidence_ref:
    /(?:^|[_.-])(?:sed|ai_fluency_instrument)(?:[_.-]|$)/i,
  source_vbd_aggregate_evidence_ref:
    /(?:^|[_.-])(?:vbd|behavioral)(?:[_.-]|$)/i,
  source_outcome_metric_aggregate_evidence_ref:
    /(?:^|[_.-])(?:outcome|business|operational)(?:[_.-]|$)/i
});

const ALLOWED_INPUT_FIELDS = new Set([
  ...REQUIRED_SOURCE_FIELDS,
  "reviewer_owned_triangulated_evidence_alignment_hash"
]);

const BLOCKED_OUTPUT_FIELDS = Object.freeze([
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "customer_facing_output",
  "customer_facing_economic_output",
  "economic_output",
  "roi_output",
  "finance_output",
  "causality_output",
  "productivity_output",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "raw_rows",
  "query_text",
  "prompts",
  "transcripts",
  "identifiers",
  "person_level_data",
  "individual_scoring",
  "team_scoring"
]);

const FEED_FIELDS = Object.freeze([
  "governed_diagnostics_sufficiency_evidence_source",
  "diagnostics_evidence_packet",
  "bayesian_promotion_decision_gate",
  "internal_bayesian_execution_artifact_v1",
  "posterior_interpretation_specification_gate",
  "routes_or_ui",
  "schemas_persistence_or_exports",
  "live_connectors"
]);

const REQUIRED_BLOCKED_CLAIMS = Object.freeze([
  "alignment_review_is_not_bayesian_convergence_diagnostics",
  "alignment_review_is_not_diagnostics_sufficiency",
  "alignment_review_is_not_global_evidence_satisfaction",
  "alignment_review_is_source_ref_posture_only",
  "alignment_review_is_not_causality",
  "alignment_review_is_not_roi",
  "alignment_review_is_not_productivity",
  "alignment_review_is_not_confidence_or_probability",
  "alignment_review_is_not_customer_facing_economic_output",
  "reviewer_owned_refs_and_hashes_required",
  "raw_rows_blocked",
  "query_text_blocked",
  "prompts_transcripts_blocked",
  "identifiers_blocked",
  "person_level_data_blocked",
  "promotion_blocked"
]);

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "artifact_class",
  "triangulated_evidence_alignment_review_state",
  "internal_only",
  "aggregate_only",
  "source_ref_only",
  "fail_closed",
  "review_only",
  "reviewer_owned_triangulated_evidence_alignment_ref",
  "reviewer_owned_triangulated_evidence_alignment_hash",
  "source_blueprint_hypothesis_ref",
  "source_comparison_design_adequacy_review_hash",
  "source_sed_aggregate_evidence_ref",
  "source_sed_aggregate_evidence_hash",
  "source_vbd_aggregate_evidence_ref",
  "source_vbd_aggregate_evidence_hash",
  "source_outcome_metric_aggregate_evidence_ref",
  "source_outcome_metric_aggregate_evidence_hash",
  "observation_window_ref",
  "cohort_ref",
  "workflow_function_ref",
  "prioritized_use_case_ref",
  "metric_ref",
  "source_sed_blueprint_hypothesis_ref",
  "source_sed_observation_window_ref",
  "source_sed_cohort_ref",
  "source_sed_workflow_function_ref",
  "source_sed_prioritized_use_case_ref",
  "source_sed_metric_ref",
  "source_vbd_blueprint_hypothesis_ref",
  "source_vbd_observation_window_ref",
  "source_vbd_cohort_ref",
  "source_vbd_workflow_function_ref",
  "source_vbd_prioritized_use_case_ref",
  "source_vbd_metric_ref",
  "source_outcome_blueprint_hypothesis_ref",
  "source_outcome_observation_window_ref",
  "source_outcome_cohort_ref",
  "source_outcome_workflow_function_ref",
  "source_outcome_prioritized_use_case_ref",
  "source_outcome_metric_ref",
  "source_sed_evidence_status",
  "source_vbd_evidence_status",
  "source_outcome_evidence_status",
  "reviewer_role_ref",
  "alignment_review_decision",
  "alignment_review_notes",
  "boundary_checks_clear",
  "reviewer_attestations_complete",
  "aggregate_only_scope",
  "placeholder_evidence",
  "generated_fixture_evidence",
  "reviewed_source_evidence_hash",
  "source_evidence_hash",
  "convergence_diagnostics_satisfied",
  "diagnostics_sufficiency_satisfied",
  "bayesian_readiness_authorized",
  "promotion_authorized",
  "posterior_interpretation_authorized",
  "confidence_probability_authorized",
  "customer_economic_output_authorized",
  "blocked_claims",
  "blocked_outputs",
  "feeds",
  "gap_list",
  "allowed_next_step",
  "alignment_review_hash"
]);

const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bselect\b[\s\S]{0,120}\bfrom\b/i,
  /\bsql\b/i,
  /\b(raw_rows?|row[-_\s]?level|raw\s+event|raw\s+record)\b/i,
  /\b(user_id|employee_id|person_level|person-level|identifier)\b/i,
  /\b(prompt|transcript)\b/i,
  /\bposterior\b/i,
  /\b(confidence|probability|score(?:_like)?)\b/i,
  /\b(?:roi|finance|financial|economic|causal|causality|caused|attribution|productivity)\b/i,
  /\bcustomer[-_\s]?facing\b/i,
  /\blive[-_\s]?connector\b/i,
  /\b(route|ui|schema|persistence|export)[-_\s]?(?:creation|write|authorization)?\b/i
]);

const NON_REVIEWER_OWNED_PROVENANCE_PATTERN =
  /(?:^|[\s_.-])(?:draft|local|pending|generated|fixture|template|runtime(?:_only|-only)?|source(?:_hash_only|-hash-only)|hash(?:_only|-only)|example|default)(?:$|[\s_.-])/i;
const NON_READY_EVIDENCE_PATTERN =
  /(?:^|[\s_.-])(?:stale|suppressed|held|hold|misaligned|missing)(?:$|[\s_.-])/i;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashObject(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function cloneJson(value) {
  if (value === null || value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function safeHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function containsUnsafeValue(value) {
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(String(value)));
}

function safeScalar(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (containsUnsafeValue(raw)) return null;
  if (NON_REVIEWER_OWNED_PROVENANCE_PATTERN.test(raw)) return null;
  if (NON_READY_EVIDENCE_PATTERN.test(raw)) return null;
  return raw;
}

function sourceHashBody(source) {
  const record = asRecord(source);
  const body = {};
  for (const field of REQUIRED_SOURCE_FIELDS) {
    body[field] = record[field] ?? null;
  }
  return body;
}

export function triangulatedEvidenceAlignmentSourceHash(source) {
  return hashObject(sourceHashBody(source));
}

function alignmentReviewHashBody(review) {
  const body = cloneJson(review);
  delete body.alignment_review_hash;
  return body;
}

export function triangulatedEvidenceAlignmentReviewHash(review) {
  return hashObject(alignmentReviewHashBody(review));
}

function reviewBodyWithoutHash(review) {
  const body = cloneJson(review);
  delete body.alignment_review_hash;
  return body;
}

function scanUnexpectedInputFields(source, gaps) {
  for (const key of Object.keys(asRecord(source))) {
    if (!ALLOWED_INPUT_FIELDS.has(key)) {
      gaps.push("unexpected reviewer-owned alignment source field");
    }
  }
}

function sanitizeSource(source, gaps) {
  const record = asRecord(source);
  const sanitized = {};
  scanUnexpectedInputFields(record, gaps);

  for (const field of REQUIRED_SOURCE_FIELDS) {
    const value = record[field];
    if (value === undefined || value === null || value === "") {
      sanitized[field] = null;
      gaps.push(`missing_${field}`);
      continue;
    }
    if (typeof value !== "string") {
      sanitized[field] = null;
      gaps.push(`non_scalar_${field}`);
      continue;
    }
    const safe = safeScalar(value);
    if (!safe) {
      sanitized[field] = null;
      gaps.push(`unsafe_${field}`);
      continue;
    }
    sanitized[field] = safe;
  }

  const sourceHash = record.reviewer_owned_triangulated_evidence_alignment_hash;
  sanitized.reviewer_owned_triangulated_evidence_alignment_hash =
    safeHash(sourceHash);
  if (!safeHash(sourceHash)) {
    gaps.push("reviewer_owned_triangulated_evidence_alignment_hash must be a valid hash");
  } else if (sourceHash !== triangulatedEvidenceAlignmentSourceHash(record)) {
    gaps.push("reviewer_owned_triangulated_evidence_alignment_hash mismatch");
  }

  for (const field of REQUIRED_HASH_FIELDS) {
    if (!safeHash(record[field])) gaps.push(`${field} must be a valid hash`);
  }
  for (const [field, pattern] of Object.entries(STREAM_REF_PATTERNS)) {
    if (sanitized[field] && !pattern.test(sanitized[field])) {
      gaps.push(`${field} must match its evidence stream lane`);
    }
  }
  const streamHashes = [
    sanitized.source_sed_aggregate_evidence_hash,
    sanitized.source_vbd_aggregate_evidence_hash,
    sanitized.source_outcome_metric_aggregate_evidence_hash
  ].filter((hash) => safeHash(hash));
  if (streamHashes.length === 3 && new Set(streamHashes).size !== 3) {
    gaps.push("stream evidence hashes must be distinct");
  }

  if (!READY_STATES.includes(sanitized.alignment_review_decision)) {
    gaps.push("alignment_review_decision must be an allowed review state");
  }
  if (sanitized.boundary_checks_clear !== "CLEAR") {
    gaps.push("boundary_checks_clear must be CLEAR");
  }
  if (sanitized.reviewer_attestations_complete !== "YES") {
    gaps.push("reviewer_attestations_complete must be YES");
  }
  if (sanitized.aggregate_only_scope !== "YES") {
    gaps.push("aggregate_only_scope must be YES");
  }
  if (sanitized.placeholder_evidence !== "NO") {
    gaps.push("placeholder_evidence must be NO");
  }
  if (sanitized.generated_fixture_evidence !== "NO") {
    gaps.push("generated_fixture_evidence must be NO");
  }
  for (const field of [
    "source_sed_evidence_status",
    "source_vbd_evidence_status",
    "source_outcome_evidence_status"
  ]) {
    if (sanitized[field] !== "CLEAR") gaps.push(`${field} must be CLEAR`);
  }

  for (const [sourceField, canonicalField] of CONTEXT_BINDINGS) {
    if (sanitized[sourceField] && sanitized[canonicalField] && sanitized[sourceField] !== sanitized[canonicalField]) {
      gaps.push(`context_mismatch:${sourceField} must match ${canonicalField}`);
    }
  }

  return sanitized;
}

function sourceComparisonReviewGaps(sourceReview, sourceHash) {
  const review = asRecord(sourceReview);
  const gaps = [];
  if (!sourceReview || Object.keys(review).length === 0) {
    return ["source_comparison_design_adequacy_review is required"];
  }
  if (review.review_state !== READY_COMPARISON_REVIEW_STATE) {
    gaps.push("source_comparison_design_adequacy_review must be ready");
  }
  if (!safeHash(review.review_hash)) {
    gaps.push("source_comparison_design_adequacy_review.review_hash must be a valid hash");
  } else {
    const expected = contributionAlignmentComparisonDesignAdequacyEvidenceReviewHash(review);
    if (review.review_hash !== expected) {
      gaps.push("source_comparison_design_adequacy_review.review_hash mismatch");
    }
    if (sourceHash && review.review_hash !== sourceHash) {
      gaps.push("source_comparison_design_adequacy_review_hash mismatch");
    }
  }
  const satisfaction = asRecord(review.evidence_satisfaction);
  if (satisfaction.evidence_dimension !== "comparison_design_adequacy") {
    gaps.push("source_comparison_design_adequacy_review evidence_dimension must be comparison_design_adequacy");
  }
  if (satisfaction.evidence_satisfied !== true) {
    gaps.push("source_comparison_design_adequacy_review must satisfy only comparison_design_adequacy");
  }
  const promotionBoundary = asRecord(review.promotion_boundary);
  for (const field of [
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "confidence_probability_authorized",
    "customer_economic_output_authorized",
    "internal_bayesian_execution_artifact_v1_authorized"
  ]) {
    if (promotionBoundary[field] !== false) {
      gaps.push(`source_comparison_design_adequacy_review ${field} must be false`);
    }
  }
  for (const [key, value] of Object.entries(asRecord(review.feeds))) {
    if (value !== false) gaps.push(`source_comparison_design_adequacy_review feeds.${key} must be false`);
  }
  return unique(gaps);
}

function buildRecord(sanitized, state, gaps) {
  const ready = READY_STATES.includes(state) && gaps.length === 0;
  const record = {
    schema_version: TRIANGULATED_EVIDENCE_ALIGNMENT_REVIEW_SCHEMA_VERSION,
    artifact_class: "triangulated_evidence_alignment_review",
    triangulated_evidence_alignment_review_state: ready ? state : HOLD_STATE,
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    review_only: true,
    reviewer_owned_triangulated_evidence_alignment_ref:
      sanitized.reviewer_owned_triangulated_evidence_alignment_ref ?? null,
    reviewer_owned_triangulated_evidence_alignment_hash:
      sanitized.reviewer_owned_triangulated_evidence_alignment_hash ?? null,
    source_blueprint_hypothesis_ref: sanitized.source_blueprint_hypothesis_ref ?? null,
    source_comparison_design_adequacy_review_hash:
      sanitized.source_comparison_design_adequacy_review_hash ?? null,
    source_sed_aggregate_evidence_ref: sanitized.source_sed_aggregate_evidence_ref ?? null,
    source_sed_aggregate_evidence_hash: sanitized.source_sed_aggregate_evidence_hash ?? null,
    source_vbd_aggregate_evidence_ref: sanitized.source_vbd_aggregate_evidence_ref ?? null,
    source_vbd_aggregate_evidence_hash: sanitized.source_vbd_aggregate_evidence_hash ?? null,
    source_outcome_metric_aggregate_evidence_ref:
      sanitized.source_outcome_metric_aggregate_evidence_ref ?? null,
    source_outcome_metric_aggregate_evidence_hash:
      sanitized.source_outcome_metric_aggregate_evidence_hash ?? null,
    observation_window_ref: sanitized.observation_window_ref ?? null,
    cohort_ref: sanitized.cohort_ref ?? null,
    workflow_function_ref: sanitized.workflow_function_ref ?? null,
    prioritized_use_case_ref: sanitized.prioritized_use_case_ref ?? null,
    metric_ref: sanitized.metric_ref ?? null,
    source_sed_blueprint_hypothesis_ref:
      sanitized.source_sed_blueprint_hypothesis_ref ?? null,
    source_sed_observation_window_ref: sanitized.source_sed_observation_window_ref ?? null,
    source_sed_cohort_ref: sanitized.source_sed_cohort_ref ?? null,
    source_sed_workflow_function_ref: sanitized.source_sed_workflow_function_ref ?? null,
    source_sed_prioritized_use_case_ref:
      sanitized.source_sed_prioritized_use_case_ref ?? null,
    source_sed_metric_ref: sanitized.source_sed_metric_ref ?? null,
    source_vbd_blueprint_hypothesis_ref:
      sanitized.source_vbd_blueprint_hypothesis_ref ?? null,
    source_vbd_observation_window_ref: sanitized.source_vbd_observation_window_ref ?? null,
    source_vbd_cohort_ref: sanitized.source_vbd_cohort_ref ?? null,
    source_vbd_workflow_function_ref: sanitized.source_vbd_workflow_function_ref ?? null,
    source_vbd_prioritized_use_case_ref:
      sanitized.source_vbd_prioritized_use_case_ref ?? null,
    source_vbd_metric_ref: sanitized.source_vbd_metric_ref ?? null,
    source_outcome_blueprint_hypothesis_ref:
      sanitized.source_outcome_blueprint_hypothesis_ref ?? null,
    source_outcome_observation_window_ref:
      sanitized.source_outcome_observation_window_ref ?? null,
    source_outcome_cohort_ref: sanitized.source_outcome_cohort_ref ?? null,
    source_outcome_workflow_function_ref:
      sanitized.source_outcome_workflow_function_ref ?? null,
    source_outcome_prioritized_use_case_ref:
      sanitized.source_outcome_prioritized_use_case_ref ?? null,
    source_outcome_metric_ref: sanitized.source_outcome_metric_ref ?? null,
    source_sed_evidence_status: sanitized.source_sed_evidence_status ?? null,
    source_vbd_evidence_status: sanitized.source_vbd_evidence_status ?? null,
    source_outcome_evidence_status: sanitized.source_outcome_evidence_status ?? null,
    reviewer_role_ref: sanitized.reviewer_role_ref ?? null,
    alignment_review_decision: sanitized.alignment_review_decision ?? "HOLD_FOR_GOVERNED_EVIDENCE",
    alignment_review_notes: sanitized.alignment_review_notes ?? null,
    boundary_checks_clear: sanitized.boundary_checks_clear ?? null,
    reviewer_attestations_complete: sanitized.reviewer_attestations_complete ?? null,
    aggregate_only_scope: sanitized.aggregate_only_scope ?? null,
    placeholder_evidence: sanitized.placeholder_evidence ?? null,
    generated_fixture_evidence: sanitized.generated_fixture_evidence ?? null,
    reviewed_source_evidence_hash: null,
    source_evidence_hash: null,
    convergence_diagnostics_satisfied: false,
    diagnostics_sufficiency_satisfied: false,
    bayesian_readiness_authorized: false,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    confidence_probability_authorized: false,
    customer_economic_output_authorized: false,
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_outputs: falseMap(BLOCKED_OUTPUT_FIELDS),
    feeds: falseMap(FEED_FIELDS),
    gap_list: unique(gaps),
    allowed_next_step: ALLOWED_NEXT_STEP,
    alignment_review_hash: null
  };
  record.alignment_review_hash = ready ? triangulatedEvidenceAlignmentReviewHash(record) : null;
  return record;
}

export function buildTriangulatedEvidenceAlignmentReview({
  reviewerOwnedTriangulatedEvidenceAlignment,
  sourceComparisonDesignAdequacyReview
} = {}) {
  const source = reviewerOwnedTriangulatedEvidenceAlignment ?? {};
  const gaps = [];
  const sanitized = sanitizeSource(source, gaps);
  gaps.push(
    ...sourceComparisonReviewGaps(
      sourceComparisonDesignAdequacyReview,
      sanitized.source_comparison_design_adequacy_review_hash
    )
  );
  return buildRecord(
    sanitized,
    sanitized.alignment_review_decision ?? HOLD_STATE,
    unique(gaps)
  );
}

function exactFalseObjectGaps(record, fields, label) {
  const gaps = [];
  const value = asRecord(record);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      gaps.push(`${label}.${field} is required`);
    } else if (value[field] !== false) {
      gaps.push(`${label}.${field} must be false`);
    }
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) gaps.push(`${label}.${field} is not allowed`);
  }
  return gaps;
}

function validateBlockedClaims(record) {
  if (!Array.isArray(record.blocked_claims)) return ["blocked_claims must be an array"];
  const gaps = [];
  const seen = new Set();
  const required = new Set(REQUIRED_BLOCKED_CLAIMS);
  for (const claim of record.blocked_claims) {
    if (typeof claim !== "string") {
      gaps.push("blocked_claims entries must be scalar strings");
      continue;
    }
    if (!required.has(claim)) gaps.push(`blocked_claims contains unexpected claim:${claim}`);
    if (seen.has(claim)) gaps.push(`blocked_claims contains duplicate claim:${claim}`);
    seen.add(claim);
  }
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!seen.has(claim)) gaps.push(`blocked_claims missing required claim:${claim}`);
  }
  return gaps;
}

function validateSourceFieldShape(record, ready) {
  const gaps = [];
  for (const field of REQUIRED_SOURCE_FIELDS) {
    const value = record[field];
    if (ready) {
      if (typeof value !== "string" || !value) {
        gaps.push(`${field} must be a scalar string`);
      }
      continue;
    }
    if (value === null || value === undefined) continue;
    if (field === "alignment_review_decision" && value === HOLD_STATE) continue;
    if (typeof value !== "string" || !safeScalar(value)) {
      gaps.push(`${field} must be a safe scalar string or null when held`);
    }
  }
  for (const field of REQUIRED_HASH_FIELDS) {
    const value = record[field];
    if (ready) {
      if (!safeHash(value)) gaps.push(`${field} must be a valid hash`);
      continue;
    }
    if (value !== null && value !== undefined && !safeHash(value)) {
      gaps.push(`${field} must be null or a valid hash when held`);
    }
  }
  return gaps;
}

export function validateTriangulatedEvidenceAlignmentReview(review, options = {}) {
  const record = asRecord(review);
  const gaps = [];
  for (const key of Object.keys(record)) {
    if (!TOP_LEVEL_FIELDS.has(key)) {
      if (key === "evidence_satisfied") {
        gaps.push("evidence_satisfied must not be emitted");
      } else {
        gaps.push(`unexpected field:${key}`);
      }
    }
  }
  if (record.schema_version !== TRIANGULATED_EVIDENCE_ALIGNMENT_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (record.artifact_class !== "triangulated_evidence_alignment_review") {
    gaps.push("artifact_class is invalid");
  }
  for (const [field, expected] of Object.entries({
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    review_only: true
  })) {
    if (record[field] !== expected) gaps.push(`${field} must be ${expected}`);
  }
  const ready = READY_STATES.includes(record.triangulated_evidence_alignment_review_state);
  gaps.push(...validateSourceFieldShape(record, ready));
  if (record.convergence_diagnostics_satisfied !== false) {
    gaps.push("convergence_diagnostics_satisfied must be false");
  }
  if (record.diagnostics_sufficiency_satisfied !== false) {
    gaps.push("diagnostics_sufficiency_satisfied must be false");
  }
  for (const field of [
    "bayesian_readiness_authorized",
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "confidence_probability_authorized",
    "customer_economic_output_authorized"
  ]) {
    if (record[field] !== false) gaps.push(`${field} must be false`);
  }
  if (record.reviewed_source_evidence_hash !== null) {
    gaps.push("reviewed_source_evidence_hash must be null");
  }
  if (record.source_evidence_hash !== null) {
    gaps.push("source_evidence_hash must be null");
  }
  if (record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push("allowed_next_step is invalid");
  }
  gaps.push(...exactFalseObjectGaps(record.blocked_outputs, BLOCKED_OUTPUT_FIELDS, "blocked_outputs"));
  gaps.push(...exactFalseObjectGaps(record.feeds, FEED_FIELDS, "feeds"));
  gaps.push(...validateBlockedClaims(record));
  if (ready) {
    if (!safeHash(record.alignment_review_hash)) {
      gaps.push("alignment_review_hash must be emitted for ready alignment review");
    } else if (record.alignment_review_hash !== triangulatedEvidenceAlignmentReviewHash(record)) {
      gaps.push("alignment_review_hash mismatch");
    }
    if (Array.isArray(record.gap_list) && record.gap_list.length > 0) {
      gaps.push("ready alignment review must not contain gaps");
    }
    if (!options.reviewerOwnedTriangulatedEvidenceAlignment) {
      gaps.push("reviewerOwnedTriangulatedEvidenceAlignment source is required for ready validation");
    }
    if (!options.sourceComparisonDesignAdequacyReview) {
      gaps.push("sourceComparisonDesignAdequacyReview source is required for ready validation");
    }
    if (
      options.reviewerOwnedTriangulatedEvidenceAlignment &&
      options.sourceComparisonDesignAdequacyReview
    ) {
      const expected = buildTriangulatedEvidenceAlignmentReview(options);
      if (!READY_STATES.includes(expected.triangulated_evidence_alignment_review_state)) {
        gaps.push("source-bound triangulated evidence alignment review does not validate ready");
      }
      if (stableJson(reviewBodyWithoutHash(expected)) !== stableJson(reviewBodyWithoutHash(record))) {
        gaps.push("ready alignment review must match source-bound recomputation");
      }
    }
  } else if (record.triangulated_evidence_alignment_review_state === HOLD_STATE) {
    if (record.alignment_review_hash !== null) {
      gaps.push("alignment_review_hash must be null when held");
    }
  } else {
    gaps.push("triangulated_evidence_alignment_review_state is invalid");
  }
  return { valid: unique(gaps).length === 0, gaps: unique(gaps) };
}

function readJsonInput(path) {
  const input = path && path !== "-" ? readFileSync(path, "utf8") : readFileSync(0, "utf8");
  return input.trim() ? JSON.parse(input) : {};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = readJsonInput(process.argv[2]);
  const review = buildTriangulatedEvidenceAlignmentReview(input);
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}
