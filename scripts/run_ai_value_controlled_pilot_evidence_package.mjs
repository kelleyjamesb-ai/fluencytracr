#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMeasurementCellSeries,
  validateMeasurementCellSeries
} from "../shared/dist/aiValueEngine/index.js";

import {
  buildControlledMeasurementCellAssemblyArtifactsFromObject,
  runControlledMeasurementCellAssemblyFromObject,
  reviewedAggregateContextHash,
  reviewedBlueprintExpectationHash,
  validateControlledMeasurementCellAssembly
} from "./run_ai_value_controlled_measurement_cell_assembly.mjs";

export const CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_PILOT_EVIDENCE_PACKAGE_2026_06";

const FIXTURE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_FIXTURE_2026_06";

const DERIVATION_VERSION =
  "ai_value_controlled_pilot_evidence_package_2026_06";

const PASSED_DECISION = "PILOT_PASSED_PROMOTION_REVIEW_READY";
const HELD_ALIGNMENT_DECISION = "PILOT_HELD_FOR_SOURCE_ALIGNMENT";
const HELD_LEGACY_DECISION = "PILOT_HELD_FOR_LEGACY_READOUT_ISOLATION";
const HELD_SUPPRESSION_DECISION = "PILOT_HELD_FOR_SUPPRESSION_OR_MISSING_EVIDENCE";
const REJECTED_BOUNDARY_DECISION = "PILOT_REJECTED_FOR_BOUNDARY_LEAKAGE";

const ALLOWED_PILOT_DECISIONS = new Set([
  PASSED_DECISION,
  HELD_ALIGNMENT_DECISION,
  HELD_LEGACY_DECISION,
  HELD_SUPPRESSION_DECISION,
  REJECTED_BOUNDARY_DECISION
]);

const REQUIRED_FALSE_FEEDS = [
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "finance_context_investigation",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "persistence",
  "backend_routes",
  "frontend_ui",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "runs_live_connectors",
  "parses_uploaded_documents",
  "writes_output_files",
  "stores_raw_source_data",
  "creates_schemas",
  "creates_repositories",
  "creates_routes",
  "creates_ui",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "customer_facing_output",
  "customer_facing_financial_output"
];

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "confidence_model",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "pilot_id",
  "fixture_id",
  "pilot_decision",
  "engine_executed",
  "evidence_flow",
  "alignment_summary",
  "validation_summary",
  "measurement_cell_promotion_record",
  "series_boundary",
  "feeds",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version",
  "package_integrity_hash"
]);

const ALLOWED_EVIDENCE_FLOW_FIELDS = new Set([
  "controlled_aggregate_review",
  "measurement_cell_assembly",
  "series_alignment_check"
]);

const ALLOWED_ALIGNMENT_SUMMARY_FIELDS = new Set([
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "measurement_plan_id",
  "value_hypothesis_id",
  "selected_metric_id",
  "expectation_path_id",
  "measurement_cell_ref",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash",
  "selected_path_binding_state"
]);

const ALLOWED_VALIDATION_SUMMARY_FIELDS = new Set([
  "controlled_review_valid",
  "measurement_cell_candidate_valid",
  "source_package_count",
  "gaps",
  "missing_evidence"
]);

const ALLOWED_MEASUREMENT_CELL_PROMOTION_FIELDS = new Set([
  "decision",
  "next_decision",
  "authorized_scope",
  "blocked_scope",
  "required_next_tests"
]);

const ALLOWED_SERIES_BOUNDARY_FIELDS = new Set([
  "decision",
  "reason",
  "required_milestones",
  "observed_milestones",
  "missing_milestones",
  "complete_milestone_series",
  "ready_windows",
  "held_windows",
  "suppressed_windows",
  "missing_windows",
  "blocked_windows",
  "alignment_state",
  "validation_valid",
  "compact_refs",
  "window_modes",
  "rolling_window_boundary",
  "blocked_uses"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row|rows|data)/i,
  /^raw_data$/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /department_ranking/i,
  /people_decisioning/i,
  /^confidence$/i,
  /confidence/i,
  /^probability$/i,
  /probability/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^p_value$/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact|output|proof)/i,
  /return_on_investment/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^data_spine$/i,
  /^data_spine_input$/i,
  /^data_spine_payload$/i,
  /^data_spine_readiness$/i,
  /^real_data_intake_packet_run$/i,
  /^source_package$/i,
  /^source_package_payload$/i,
  /^source_package_review_queue$/i,
  /^source_queue$/i,
  /^measurement_cell$/i,
  /^measurement_cell_input$/i,
  /^measurement_cell_payload$/i,
  /^measurement_cell_series$/i,
  /^measurement_cell_windows$/i,
  /^repeated_measurement_cell_refs$/i,
  /^source_packages$/i,
  /^operator_source_handoff_bundle$/i,
  /^approved_expectation_paths$/i,
  /^creates_(?:migrations|prisma_schema|schemas|backend_routes?|frontend_ui|ingestion_jobs)$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /admin_override/i,
  /operator_override/i,
  /force_ready/i,
  /threshold/i,
  /new_suppression_reason/i,
  /new_canonical_event/i
];

const UNSAFE_VALUE_PATTERNS = [
  /raw[_-\s]?(?:row|rows|prompt|response|transcript|content|file|export|event)/i,
  /query[_-\s]?text/i,
  /sql[_-\s]?text/i,
  /user[_-\s]?id/i,
  /person[_-\s]?id/i,
  /employee[_-\s]?(?:id|email|name)/i,
  /respondent[_-\s]?(?:id|email|name)/i,
  /roi/i,
  /ebita/i,
  /ebitda/i,
  /confidence/i,
  /probability/i,
  /financial[_-\s]?attribution/i,
  /customer[_-\s]?facing[_-\s]?(?:financial|economic)/i,
  /productivity/i,
  /causal/i
];

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stringsOf(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim());
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function sanitizeGaps(gaps) {
  return uniqueStrings(gaps).map((gap) =>
    gap
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/\b(?:user|employee|person|respondent)[_-]?\d+\b/gi, "[redacted-identifier]")
  );
}

function safeIdPart(value) {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "unknown";
}

function deepClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function milestoneWindowsForDay(day) {
  const launch = new Date(Date.UTC(2026, 0, 1));
  const comparisonStart = addDays(launch, day);
  return {
    baselineWindow: {
      window_start: isoDate(addDays(launch, -30)),
      window_end: isoDate(addDays(launch, -1))
    },
    comparisonWindow: {
      window_start: isoDate(comparisonStart),
      window_end: isoDate(addDays(comparisonStart, 29))
    }
  };
}

function replaceDaySuffixes(value, day) {
  if (typeof value === "string") {
    return value.replace(/day_\d+/g, `day_${day}`);
  }
  if (Array.isArray(value)) return value.map((item) => replaceDaySuffixes(item, day));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        replaceDaySuffixes(nested, day)
      ])
    );
  }
  return value;
}

function setPlanWindows(plan, baselineWindow, comparisonWindow) {
  if (!plan || typeof plan !== "object") return;
  plan.windows = {
    ...(plan.windows ?? {}),
    baseline_window_start: baselineWindow.window_start,
    baseline_window_end: baselineWindow.window_end,
    comparison_window_start: comparisonWindow.window_start,
    comparison_window_end: comparisonWindow.window_end
  };
}

function setCoveredWindows(fixture, baselineWindow, comparisonWindow) {
  if (fixture?.data_spine_input) {
    fixture.data_spine_input.baseline_window = deepClone(baselineWindow);
    fixture.data_spine_input.comparison_window = deepClone(comparisonWindow);
    for (const source of Object.values(fixture.data_spine_input.sources ?? {})) {
      if (!source || typeof source !== "object") continue;
      source.baseline_window = deepClone(baselineWindow);
      source.comparison_window = deepClone(comparisonWindow);
    }
  }
  if (fixture?.blueprint_extraction_input) {
    fixture.blueprint_extraction_input.baselineWindow = deepClone(baselineWindow);
    fixture.blueprint_extraction_input.comparisonWindow = deepClone(comparisonWindow);
  }
  for (const record of fixture?.scrubbed_glean_exports ?? []) {
    record.covered_window = deepClone(comparisonWindow);
  }
}

function loadMeasurementPlan(fixture, cwd) {
  if (fixture?.measurement_plan) return fixture.measurement_plan;
  if (!fixture?.measurement_plan_path) return null;
  try {
    return JSON.parse(readFileSync(resolve(cwd, fixture.measurement_plan_path), "utf8"));
  } catch {
    return null;
  }
}

function fixtureForMilestone(baseFixture, day, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const fixture = replaceDaySuffixes(deepClone(baseFixture), day);
  const { baselineWindow, comparisonWindow } = milestoneWindowsForDay(day);
  const measurementPlan = replaceDaySuffixes(
    deepClone(loadMeasurementPlan(baseFixture, cwd)),
    day
  );
  setPlanWindows(measurementPlan, baselineWindow, comparisonWindow);
  fixture.fixture_id = `controlled_aggregate_fixture_review_support_day_${day}`;
  fixture.run_id = `real_data_intake_packet_run_support_controlled_fixture_day_${day}`;
  fixture.expected = {
    ...(fixture.expected ?? {}),
    milestone_day: day,
    window_mode: options.windowMode ?? "milestone"
  };
  setCoveredWindows(fixture, baselineWindow, comparisonWindow);
  fixture.expected.reviewed_aggregate_context_hash =
    reviewedAggregateContextHash(fixture);
  fixture.expected.reviewed_blueprint_expectation_hash =
    reviewedBlueprintExpectationHash(fixture);
  return { fixture, measurementPlan };
}

function boundaryPolicy() {
  return Object.fromEntries(REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false]));
}

function falseFeeds(passed) {
  return {
    controlled_pilot_evidence_package: passed,
    controlled_aggregate_fixture_review: passed,
    controlled_measurement_cell_assembly: passed,
    measurement_cell_snapshot_promotion_review: passed,
    ...Object.fromEntries(REQUIRED_FALSE_FEEDS.map((field) => [field, false]))
  };
}

function requiredCaveats() {
  return [
    "Controlled pilot evidence package uses saved scrubbed aggregate fixtures only.",
    "A passed package supports Measurement Cell snapshot promotion review only; it does not create storage, customer output, live connector execution, finance output, model output, or claim proof.",
    "Measurement Cell Series persistence remains held until repeated milestone windows validate across Day 0, 30, 60, 90, 180, and 365."
  ];
}

function candidatePassed(candidate, candidateValidation) {
  return (
    candidateValidation.valid === true &&
    candidate?.assembly_state === "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW" &&
    candidate?.review_state === "PASSED_INTERNAL_FIXTURE_REVIEW"
  );
}

function decisionForCandidate(candidate, candidateValidation) {
  if (candidatePassed(candidate, candidateValidation)) return PASSED_DECISION;
  const gaps = stringsOf(candidate?.validation_summary?.gaps).join(" | ");
  if (
    /raw_rows?|raw[_\s-]?(?:prompt|response|transcript|content|file|export|event|data)|user_id|employee_id|person_id|transcript|prompt|query_text|sql_text|confidence|probability|p_value|roi|ebita|ebitda|financial_attribution|causality|productivity|runs_bigquery|runs_sigma|runs_glean|live_connector|connector_status|backend_routes|frontend_ui|persistence|ingestion_job/i.test(gaps)
  ) {
    return REJECTED_BOUNDARY_DECISION;
  }
  if (
    candidate?.review_state === "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY" ||
    /suppressed|missing_evidence|cohort_threshold|evidence_state/i.test(gaps)
  ) {
    return HELD_SUPPRESSION_DECISION;
  }
  if (
    /reviewed_aggregate_context_hash|reviewed_blueprint_expectation_hash|source_ref|source refs|data spine|alignment|metric|lag|expectation_path|approval|rolling_30_day|window_mode|measurement_cell_ref/i.test(gaps) ||
    candidate?.review_state === "HELD_FOR_DATA_SPINE"
  ) {
    return HELD_ALIGNMENT_DECISION;
  }
  if (/executive_packet|html_readout|legacy/i.test(gaps)) {
    return HELD_LEGACY_DECISION;
  }
  return REJECTED_BOUNDARY_DECISION;
}

function measurementCellPromotionRecord(decision) {
  const passed = decision === PASSED_DECISION;
  return {
    decision: passed
      ? "MEASUREMENT_CELL_SNAPSHOT_PROMOTION_REVIEW_READY"
      : "HOLD_PHYSICAL_MEASUREMENT_CELL_TABLES",
    next_decision: passed
      ? "RECOMMEND_REVISIT_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION"
      : "REVISIT_AFTER_PILOT_GAPS_CLEAR",
    authorized_scope: passed
      ? [
          "append_only_measurement_cell_snapshot_design_review",
          "approved_expectation_path_binding_review",
          "compact_source_ref_lineage_review",
          "red_green_persistence_gate_test_planning"
        ]
      : [],
    blocked_scope: [
      "prisma_schema_changes_in_this_runner",
      "migrations_in_this_runner",
      "repositories_in_this_runner",
      "routes_or_ui",
      "measurement_cell_series_persistence",
      "evidence_continuity_persistence",
      "live_bigquery_sigma_or_glean_execution",
      "customer_facing_output",
      "finance_output",
      "model_math"
    ],
    required_next_tests: [
      "path_drift",
      "approval_drift",
      "lag_drift",
      "metric_drift",
      "unsafe_source_refs",
      "raw_rows",
      "query_text",
      "prompts",
      "transcripts",
      "user_identifiers",
      "full_expectation_path_registry",
      "roi_fields",
      "finance_output_fields",
      "causality_fields",
      "productivity_fields",
      "probability_fields",
      "confidence_or_score_like_fields",
      "jsonb_smuggling"
    ]
  };
}

function seriesBoundary() {
  return {
    decision: "HOLD_FOR_REPEATED_MILESTONE_EVIDENCE",
    reason: "single_controlled_fixture_window_demonstrates_measurement_cell_flow_only",
    required_milestones: [...MILESTONE_DAYS],
    blocked_uses: [
      "measurement_cell_series_persistence",
      "evidence_continuity",
      "finance_context_investigation",
      "bayesian_research_planning",
      "confidence_research",
      "customer_facing_output",
      "export"
    ]
  };
}

function seriesWindowModes(series) {
  return uniqueStrings(
    (series?.measurement_cell_windows ?? [])
      .map((window) => window?.window?.window_mode)
      .filter(Boolean)
  );
}

function milestoneContinuityEligible(series, seriesValidation) {
  const modes = seriesWindowModes(series);
  return seriesValidation?.valid === true &&
    modes.length > 0 &&
    modes.every((mode) => mode === "milestone");
}

function repeatedSeriesBoundary(series, seriesValidation) {
  const continuity = series?.evidence_continuity_manifest ?? {};
  const alignment = series?.alignment_manifest ?? {};
  const continuityEligible = milestoneContinuityEligible(series, seriesValidation);
  const windowModes = seriesWindowModes(series);
  const compactRefs = continuityEligible
    ? (series?.repeated_measurement_cell_refs ?? []).map((ref) => ({
        window_id: ref.window_id ?? null,
        milestone_day: ref.milestone_day ?? null,
        status: ref.status ?? null,
        measurement_cell_assembly_run_id:
          ref.measurement_cell_assembly_run_id ?? null,
        measurement_cell_ref: ref.measurement_cell_id ?? null,
        metric_id: ref.metric_id ?? null,
        expectation_path_id: ref.expectation_path_id ?? null
      }))
    : [];
  const complete = series?.decision === "CONTINUITY_COVERAGE_COMPLETE" &&
    continuityEligible;
  return {
    decision: complete
      ? "HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION"
      : "HOLD_FOR_REPEATED_MILESTONE_EVIDENCE",
    reason: complete
      ? "repeated_milestone_evidence_complete_but_series_persistence_not_authorized"
      : "repeated_milestone_evidence_not_complete_or_not_aligned",
    required_milestones: [...MILESTONE_DAYS],
    observed_milestones: continuityEligible && Array.isArray(continuity.observed_milestone_days)
      ? continuity.observed_milestone_days
      : [],
    missing_milestones: continuityEligible && Array.isArray(continuity.missing_milestone_days)
      ? continuity.missing_milestone_days
      : [],
    complete_milestone_series:
      continuityEligible && continuity.complete_milestone_series === true,
    ready_windows: continuityEligible ? Number(continuity.ready_windows ?? 0) : 0,
    held_windows: continuityEligible ? Number(continuity.held_windows ?? 0) : 0,
    suppressed_windows: continuityEligible
      ? Number(continuity.suppressed_windows ?? 0)
      : 0,
    missing_windows: continuityEligible
      ? Number(continuity.missing_windows ?? 0)
      : 0,
    blocked_windows: continuityEligible
      ? Number(continuity.blocked_windows ?? 0)
      : 0,
    alignment_state: alignment.aligned === true ? "aligned" : "not_aligned",
    validation_valid: seriesValidation?.valid === true,
    compact_refs: compactRefs,
    window_modes: windowModes,
    rolling_window_boundary:
      "rolling_30_day_context_is_operating_context_only_not_evidence_continuity",
    blocked_uses: [
      "measurement_cell_series_persistence",
      "evidence_continuity_persistence",
      "finance_context_investigation",
      "bayesian_research_planning",
      "confidence_research",
      "customer_facing_output",
      "export"
    ]
  };
}

function compactEvidenceFlow(candidate) {
  return {
    controlled_aggregate_review: {
      state: candidate?.review_state ?? null,
      engine_decision: candidate?.review_ref?.controlled_review_engine_decision ?? null,
      real_data_intake_run_id: candidate?.review_ref?.real_data_intake_run_id ?? null,
      pilot_intake_run_id: candidate?.review_ref?.pilot_intake_run_id ?? null
    },
    measurement_cell_assembly: {
      state: candidate?.assembly_state ?? null,
      assembly_decision: candidate?.assembly_ref?.assembly_decision ?? null,
      assembly_run_id: candidate?.assembly_ref?.assembly_run_id ?? null,
      measurement_cell_ref: candidate?.assembly_ref?.measurement_cell_ref ?? null
    },
    series_alignment_check: {
      state: "SERIES_PERSISTENCE_NOT_PROMOTED",
      decision: "HOLD_FOR_REPEATED_MILESTONE_EVIDENCE",
      covered_milestone_days: candidate?.internal_candidate_metadata?.time_window_id
        ? [candidate.internal_candidate_metadata.time_window_id]
        : [],
      required_milestone_days: [...MILESTONE_DAYS]
    }
  };
}

function alignmentSummary(candidate, fixture, measurementPlan) {
  const metadata = candidate?.internal_candidate_metadata ?? {};
  return {
    org_id: metadata.org_id ?? null,
    client_id: metadata.client_id ?? null,
    workflow_family: metadata.workflow_family ?? null,
    function_area: metadata.function_area ?? null,
    cohort_key: metadata.cohort_key ?? null,
    measurement_plan_id: metadata.measurement_plan_id ?? null,
    value_hypothesis_id:
      measurementPlan?.value_hypothesis?.value_hypothesis_id ??
      measurementPlan?.value_hypothesis_id ??
      null,
    selected_metric_id: metadata.selected_metric_id ?? null,
    expectation_path_id: metadata.expectation_path_id ?? null,
    measurement_cell_ref: metadata.measurement_cell_ref ?? null,
    reviewed_source_refs_hash:
      candidate?.review_ref?.reviewed_source_refs_hash ??
      metadata.reviewed_source_refs_hash ??
      null,
    reviewed_aggregate_context_hash:
      candidate?.review_ref?.reviewed_aggregate_context_hash ??
      metadata.reviewed_aggregate_context_hash ??
      fixture?.expected?.reviewed_aggregate_context_hash ??
      null,
    reviewed_blueprint_expectation_hash:
      candidate?.review_ref?.reviewed_blueprint_expectation_hash ??
      metadata.reviewed_blueprint_expectation_hash ??
      fixture?.expected?.reviewed_blueprint_expectation_hash ??
      null,
    selected_path_binding_state: metadata.expectation_path_id
      ? "stable_selected_path_binding_verified"
      : "selected_path_binding_not_verified"
  };
}

function buildPackageEnvelope({ fixture, candidate, candidateValidation, cwd }) {
  const decision = decisionForCandidate(candidate, candidateValidation);
  const passed = decision === PASSED_DECISION;
  const measurementPlan = loadMeasurementPlan(fixture, cwd);
  const validationGaps = sanitizeGaps([
    ...stringsOf(candidate?.validation_summary?.gaps),
    ...stringsOf(candidateValidation?.gaps)
  ]);
  const pilotPackage = {
    schema_version: CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION,
    pilot_id: `controlled_pilot_evidence_package_${safeIdPart(fixture?.fixture_id)}`,
    fixture_id: fixture?.fixture_id ?? null,
    pilot_decision: decision,
    engine_executed: candidate?.engine_executed === true,
    evidence_flow: compactEvidenceFlow(candidate),
    alignment_summary: alignmentSummary(candidate, fixture, measurementPlan),
    validation_summary: {
      controlled_review_valid: candidate?.validation_summary?.controlled_review_valid === true,
      measurement_cell_candidate_valid: candidateValidation.valid === true && candidate?.validation_summary?.assembly_run_valid === true,
      source_package_count: candidate?.validation_summary?.source_package_count ?? 0,
      gaps: validationGaps,
      missing_evidence: uniqueStrings([
        ...stringsOf(candidate?.validation_summary?.missing_evidence),
        ...stringsOf(candidateValidation?.gaps)
      ])
    },
    measurement_cell_promotion_record: measurementCellPromotionRecord(decision),
    series_boundary: seriesBoundary(),
    feeds: falseFeeds(passed),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: requiredCaveats(),
    generated_at: fixture?.generated_at ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  return {
    ...pilotPackage,
    package_integrity_hash: packageIntegrityHash(pilotPackage)
  };
}

function packageIntegrityHash(pilotPackage) {
  const clone = { ...pilotPackage };
  delete clone.package_integrity_hash;
  return sha256(clone);
}

export function runControlledPilotEvidencePackageFromObject(fixture, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture, { cwd });
  const candidateValidation = validateControlledMeasurementCellAssembly(candidate, {
    sourceFixture: fixture,
    cwd
  });
  return buildPackageEnvelope({ fixture, candidate, candidateValidation, cwd });
}

function repeatedDecisionFor({
  series,
  seriesValidation,
  candidateRecords,
  validationGaps
}) {
  if (
    candidateRecords.some((record) =>
      record.package_decision === REJECTED_BOUNDARY_DECISION
    )
  ) {
    return REJECTED_BOUNDARY_DECISION;
  }
  if (series?.decision === "CONTINUITY_COVERAGE_COMPLETE" &&
    seriesValidation.valid === true &&
    validationGaps.length === 0 &&
    candidateRecords.every((record) => record.ready === true)
  ) {
    return PASSED_DECISION;
  }
  if (series?.decision === "BLOCKED" || seriesValidation.valid === false) {
    return HELD_ALIGNMENT_DECISION;
  }
  if (
    candidateRecords.some((record) =>
      record.package_decision === HELD_ALIGNMENT_DECISION
    )
  ) {
    return HELD_ALIGNMENT_DECISION;
  }
  return HELD_SUPPRESSION_DECISION;
}

function repeatedEvidenceFlow({ candidateRecords, series, seriesValidation }) {
  const readyCandidates = candidateRecords.filter((record) => record.ready).length;
  const continuityEligible = milestoneContinuityEligible(series, seriesValidation);
  return {
    controlled_aggregate_review: {
      state: candidateRecords.every((record) =>
        record.candidate?.review_state === "PASSED_INTERNAL_FIXTURE_REVIEW"
      )
        ? "PASSED_REPEATED_FIXTURE_REVIEW"
        : "HELD_REPEATED_FIXTURE_REVIEW",
      reviewed_milestone_days: candidateRecords.map((record) => record.day),
      candidate_count: candidateRecords.length
    },
    measurement_cell_assembly: {
      state: readyCandidates === candidateRecords.length
        ? "PASSED_REPEATED_MEASUREMENT_CELL_CANDIDATE_REVIEW"
        : "HELD_REPEATED_MEASUREMENT_CELL_CANDIDATE_REVIEW",
      ready_windows: readyCandidates,
      candidate_count: candidateRecords.length
    },
    series_alignment_check: {
      state: series?.decision === "CONTINUITY_COVERAGE_COMPLETE" &&
        seriesValidation.valid === true
        ? "SERIES_REVIEW_READY"
        : "SERIES_REVIEW_HELD",
      decision: series?.decision ?? null,
      validation_valid: seriesValidation.valid === true,
      covered_milestone_days: continuityEligible
        ? series?.evidence_continuity_manifest?.observed_milestone_days ?? []
        : [],
      required_milestone_days: [...MILESTONE_DAYS]
    }
  };
}

export function runControlledRepeatedPilotEvidencePackageFromObject(
  fixture,
  options = {}
) {
  const cwd = options.cwd ?? process.cwd();
  const milestoneDays = Array.isArray(options.milestoneDays)
    ? options.milestoneDays
    : MILESTONE_DAYS;
  const variants = milestoneDays.map((day) =>
    fixtureForMilestone(fixture, day, { cwd, windowMode: options.windowMode })
  );
  const candidateRecords = variants.map((variantRecord, index) => {
    const artifacts = buildControlledMeasurementCellAssemblyArtifactsFromObject(
      variantRecord.fixture,
      { cwd, measurementPlanOverride: variantRecord.measurementPlan }
    );
    const candidate = artifacts.candidate;
    const candidateValidation = validateControlledMeasurementCellAssembly(candidate, {
      sourceFixture: variantRecord.fixture,
      cwd,
      measurementPlanOverride: variantRecord.measurementPlan
    });
    return {
      day: milestoneDays[index],
      variant: variantRecord.fixture,
      measurementPlan: variantRecord.measurementPlan,
      artifacts,
      candidate,
      candidateValidation,
      package_decision: decisionForCandidate(candidate, candidateValidation),
      ready: candidatePassed(candidate, candidateValidation) &&
        artifacts.assemblyRun?.decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER" &&
        Boolean(artifacts.assemblyRun?.measurement_cell)
    };
  });
  const seedRecord = candidateRecords[0] ?? {
    variant: fixture,
    measurementPlan: loadMeasurementPlan(fixture, cwd),
    candidate: runControlledMeasurementCellAssemblyFromObject(fixture, { cwd }),
    candidateValidation: { valid: false, gaps: ["no milestone windows provided"] }
  };
  const seedMeasurementPlan = seedRecord.measurementPlan ??
    loadMeasurementPlan(seedRecord.variant, cwd);
  const series = buildMeasurementCellSeries({
    measurementCellSeriesId: `controlled_pilot_measurement_cell_series_${safeIdPart(fixture?.fixture_id)}`,
    orgId:
      seedRecord.artifacts?.dataSpine?.org_id ??
      seedRecord.candidate?.internal_candidate_metadata?.org_id ??
      fixture?.data_spine_input?.org_id ??
      "unknown_org",
    clientId:
      seedRecord.artifacts?.dataSpine?.client_id ??
      seedRecord.candidate?.internal_candidate_metadata?.client_id ??
      fixture?.data_spine_input?.client_id ??
      "unknown_client",
    workflowFamily:
      seedRecord.artifacts?.dataSpine?.workflow_family ??
      seedRecord.candidate?.internal_candidate_metadata?.workflow_family ??
      fixture?.data_spine_input?.workflow_family ??
      "unknown_workflow",
    functionArea:
      seedRecord.artifacts?.dataSpine?.function_area ??
      seedRecord.candidate?.internal_candidate_metadata?.function_area ??
      fixture?.data_spine_input?.function_area ??
      "unknown_function",
    cohortKey:
      seedRecord.artifacts?.dataSpine?.cohort_key ??
      seedRecord.candidate?.internal_candidate_metadata?.cohort_key ??
      fixture?.data_spine_input?.cohort_key ??
      "unknown_cohort",
    windows: candidateRecords.map((record) => ({
      milestoneDay: record.day,
      measurementCellAssemblyRun: record.artifacts.assemblyRun ?? undefined
    })),
    generatedAt: fixture?.generated_at ?? new Date(0).toISOString()
  });
  const seriesValidation = validateMeasurementCellSeries(series);
  const seriesGaps = sanitizeGaps([
    ...stringsOf(series?.gaps),
    ...stringsOf(seriesValidation?.gaps)
  ]);
  const missingMilestones = stringsOf(series?.missing_evidence);
  const candidateGaps = sanitizeGaps(
    candidateRecords.flatMap((record) => [
      ...stringsOf(record.candidate?.validation_summary?.gaps).map(
        (gap) => `day_${record.day}: ${gap}`
      ),
      ...stringsOf(record.candidateValidation?.gaps).map(
        (gap) => `day_${record.day}: ${gap}`
      )
    ])
  );
  const validationGaps = uniqueStrings([
    ...candidateGaps,
    ...seriesGaps,
    ...(
      series?.decision === "CONTINUITY_COVERAGE_COMPLETE"
        ? []
        : missingMilestones
    )
  ]);
  const decision = repeatedDecisionFor({
    series,
    seriesValidation,
    candidateRecords,
    validationGaps
  });
  const passed = decision === PASSED_DECISION;
  const pilotPackage = {
    schema_version: CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION,
    pilot_id: `controlled_repeated_pilot_evidence_package_${safeIdPart(fixture?.fixture_id)}`,
    fixture_id: fixture?.fixture_id ?? null,
    pilot_decision: decision,
    engine_executed: candidateRecords.some((record) =>
      record.candidate?.engine_executed === true
    ),
    evidence_flow: repeatedEvidenceFlow({
      candidateRecords,
      series,
      seriesValidation
    }),
    alignment_summary: alignmentSummary(
      seedRecord.candidate,
      seedRecord.variant,
      seedMeasurementPlan
    ),
    validation_summary: {
      controlled_review_valid: candidateRecords.every((record) =>
        record.candidate?.validation_summary?.controlled_review_valid === true
      ),
      measurement_cell_candidate_valid: candidateRecords.every((record) =>
        record.ready === true
      ),
      source_package_count:
        seedRecord.candidate?.validation_summary?.source_package_count ?? 0,
      gaps: validationGaps,
      missing_evidence: uniqueStrings([
        ...candidateRecords.flatMap((record) =>
          stringsOf(record.candidate?.validation_summary?.missing_evidence)
        ),
        ...missingMilestones
      ])
    },
    measurement_cell_promotion_record: measurementCellPromotionRecord(decision),
    series_boundary: repeatedSeriesBoundary(series, seriesValidation),
    feeds: falseFeeds(passed),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      ...requiredCaveats(),
      "Repeated milestone evidence is internal continuity and alignment review only; it does not promote Series persistence."
    ],
    generated_at: fixture?.generated_at ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  return {
    ...pilotPackage,
    package_integrity_hash: packageIntegrityHash(pilotPackage)
  };
}

export function runControlledPilotEvidencePackage(path, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, path), "utf8"));
  return runControlledPilotEvidencePackageFromObject(fixture, { cwd });
}

function collectTopLevelGaps(pilotPackage) {
  const gaps = [];
  if (!pilotPackage || typeof pilotPackage !== "object" || Array.isArray(pilotPackage)) {
    return ["controlled pilot evidence package must be an object"];
  }
  for (const field of ALLOWED_TOP_LEVEL_FIELDS) {
    if (pilotPackage[field] === undefined || pilotPackage[field] === null || pilotPackage[field] === "") {
      gaps.push(`${field} is required`);
    }
  }
  for (const field of Object.keys(pilotPackage)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported controlled pilot evidence package field: ${field}`);
    }
  }
  if (pilotPackage.schema_version !== CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION) {
    gaps.push(`schema_version must be ${CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION}`);
  }
  if (!ALLOWED_PILOT_DECISIONS.has(String(pilotPackage.pilot_decision ?? ""))) {
    gaps.push(`pilot_decision is invalid: ${pilotPackage.pilot_decision}`);
  }
  if (!HASH_PATTERN.test(String(pilotPackage.package_integrity_hash ?? ""))) {
    gaps.push("package_integrity_hash must be a sha256 hex hash");
  } else if (pilotPackage.package_integrity_hash !== packageIntegrityHash(pilotPackage)) {
    gaps.push("package_integrity_hash must match package contents");
  }
  return gaps;
}

function collectObjectFieldGaps(value, allowedFields, path) {
  const gaps = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${path} must be an object`];
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      gaps.push(`Unsupported ${path} field: ${field}`);
    }
  }
  return gaps;
}

function collectShapeGaps(pilotPackage) {
  const gaps = [
    ...collectObjectFieldGaps(
      pilotPackage?.evidence_flow,
      ALLOWED_EVIDENCE_FLOW_FIELDS,
      "evidence_flow"
    ),
    ...collectObjectFieldGaps(
      pilotPackage?.alignment_summary,
      ALLOWED_ALIGNMENT_SUMMARY_FIELDS,
      "alignment_summary"
    ),
    ...collectObjectFieldGaps(
      pilotPackage?.validation_summary,
      ALLOWED_VALIDATION_SUMMARY_FIELDS,
      "validation_summary"
    ),
    ...collectObjectFieldGaps(
      pilotPackage?.measurement_cell_promotion_record,
      ALLOWED_MEASUREMENT_CELL_PROMOTION_FIELDS,
      "measurement_cell_promotion_record"
    ),
    ...collectObjectFieldGaps(
      pilotPackage?.series_boundary,
      ALLOWED_SERIES_BOUNDARY_FIELDS,
      "series_boundary"
    )
  ];
  if (!Array.isArray(pilotPackage?.validation_summary?.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  }
  if (!Array.isArray(pilotPackage?.validation_summary?.missing_evidence)) {
    gaps.push("validation_summary.missing_evidence must be an array");
  }
  if (!Array.isArray(pilotPackage?.blocked_uses)) {
    gaps.push("blocked_uses must be an array");
  }
  if (!Array.isArray(pilotPackage?.required_caveats)) {
    gaps.push("required_caveats must be an array");
  }
  return gaps;
}

function collectPolicyGaps(pilotPackage) {
  const gaps = [];
  for (const feed of REQUIRED_FALSE_FEEDS) {
    if (pilotPackage?.feeds?.[feed] !== false) {
      gaps.push(`feeds.${feed} must be false`);
    }
  }
  const passed = pilotPackage?.pilot_decision === PASSED_DECISION;
  if (pilotPackage?.feeds?.measurement_cell_snapshot_promotion_review !== passed) {
    gaps.push("feeds.measurement_cell_snapshot_promotion_review must match pilot pass state");
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (pilotPackage?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!pilotPackage?.blocked_uses?.includes(use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }
  if (
    ![
      "HOLD_FOR_REPEATED_MILESTONE_EVIDENCE",
      "HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION"
    ].includes(String(pilotPackage?.series_boundary?.decision ?? ""))
  ) {
    gaps.push("series_boundary.decision must keep Series persistence held");
  }
  return gaps;
}

function collectConsistencyGaps(pilotPackage) {
  const gaps = [];
  const passed = pilotPackage?.pilot_decision === PASSED_DECISION;
  if (passed) {
    if (pilotPackage?.engine_executed !== true) {
      gaps.push("engine_executed must be true for passed pilot package");
    }
    if (
      pilotPackage?.measurement_cell_promotion_record?.decision !==
      "MEASUREMENT_CELL_SNAPSHOT_PROMOTION_REVIEW_READY"
    ) {
      gaps.push("measurement_cell_promotion_record.decision must be review-ready for passed pilot package");
    }
    if (pilotPackage?.validation_summary?.gaps?.length !== 0) {
      gaps.push("validation_summary.gaps must be empty for passed pilot package");
    }
    for (const field of [
      "measurement_plan_id",
      "value_hypothesis_id",
      "selected_metric_id",
      "expectation_path_id",
      "measurement_cell_ref",
      "reviewed_source_refs_hash",
      "reviewed_aggregate_context_hash",
      "reviewed_blueprint_expectation_hash"
    ]) {
      if (!pilotPackage?.alignment_summary?.[field]) {
        gaps.push(`alignment_summary.${field} is required for passed pilot package`);
      }
    }
  } else if (
    pilotPackage?.measurement_cell_promotion_record?.decision !==
    "HOLD_PHYSICAL_MEASUREMENT_CELL_TABLES"
  ) {
    gaps.push("measurement_cell_promotion_record.decision must hold tables unless pilot passed");
  }
  for (const field of [
    "reviewed_source_refs_hash",
    "reviewed_aggregate_context_hash",
    "reviewed_blueprint_expectation_hash"
  ]) {
    const value = pilotPackage?.alignment_summary?.[field];
    if (value !== null && value !== undefined && !HASH_PATTERN.test(String(value))) {
      gaps.push(`alignment_summary.${field} must be a sha256 hex hash`);
    }
  }
  return gaps;
}

function collectUnsafeFields(value, path = [], gaps = []) {
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeFields(item, [...path, String(index)], gaps));
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    const currentPath = [...path, key].join(".");
    const allowedPolicyPath =
      currentPath.startsWith("feeds.") ||
      currentPath.startsWith("boundary_policy.") ||
      currentPath.startsWith("blocked_uses.") ||
      currentPath.startsWith("required_caveats.") ||
      currentPath.startsWith("measurement_cell_promotion_record.blocked_scope.") ||
      currentPath.startsWith("measurement_cell_promotion_record.required_next_tests.") ||
      currentPath.startsWith("series_boundary.blocked_uses.");
    if (!allowedPolicyPath && FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      gaps.push(`Unsafe field detected: ${currentPath}`);
    }
    collectUnsafeFields(nested, [...path, key], gaps);
  }
  return gaps;
}

function collectUnsafeValues(value, path = [], gaps = []) {
  if (typeof value === "string") {
    if (UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      const keyPath = path.join(".");
      const exempt =
        keyPath.startsWith("blocked_uses") ||
        keyPath.startsWith("required_caveats") ||
        keyPath.startsWith("validation_summary.gaps") ||
        keyPath.startsWith("validation_summary.missing_evidence") ||
        keyPath.startsWith("measurement_cell_promotion_record.blocked_scope") ||
        keyPath.startsWith("measurement_cell_promotion_record.required_next_tests") ||
        keyPath.startsWith("series_boundary.blocked_uses");
      if (!exempt) gaps.push(`Unsafe value detected: ${keyPath || "value"}`);
    }
    return gaps;
  }
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeValues(item, [...path, String(index)], gaps));
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeValues(nested, [...path, key], gaps);
  }
  return gaps;
}

function collectFixtureBoundGaps(pilotPackage, options = {}) {
  if (!options.sourceFixture) return [];
  if (options.sourceFixture?.schema_version !== FIXTURE_SCHEMA_VERSION) {
    return [`sourceFixture.schema_version must be ${FIXTURE_SCHEMA_VERSION}`];
  }
  const expected = runControlledPilotEvidencePackageFromObject(options.sourceFixture, {
    cwd: options.cwd ?? process.cwd()
  });
  if (pilotPackage.package_integrity_hash !== expected.package_integrity_hash) {
    return ["controlled pilot evidence package must match source-fixture-bound output"];
  }
  return [];
}

export function validateControlledPilotEvidencePackage(pilotPackage, options = {}) {
  const gaps = [
    ...collectTopLevelGaps(pilotPackage),
    ...collectShapeGaps(pilotPackage),
    ...collectPolicyGaps(pilotPackage),
    ...collectConsistencyGaps(pilotPackage),
    ...collectFixtureBoundGaps(pilotPackage, options),
    ...collectUnsafeFields(pilotPackage),
    ...collectUnsafeValues(pilotPackage)
  ];
  return {
    schema_version: `${CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION}_VALIDATION`,
    fixture_id: pilotPackage?.fixture_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}

function collectRepeatedPackageGaps(pilotPackage) {
  const gaps = [];
  if (!Array.isArray(pilotPackage?.series_boundary?.observed_milestones)) {
    gaps.push("series_boundary.observed_milestones must be an array");
  }
  if (!Array.isArray(pilotPackage?.series_boundary?.missing_milestones)) {
    gaps.push("series_boundary.missing_milestones must be an array");
  }
  if (!Array.isArray(pilotPackage?.series_boundary?.compact_refs)) {
    gaps.push("series_boundary.compact_refs must be an array");
  }
  if (!Array.isArray(pilotPackage?.series_boundary?.window_modes)) {
    gaps.push("series_boundary.window_modes must be an array");
  }
  const hasNonMilestoneWindowMode =
    Array.isArray(pilotPackage?.series_boundary?.window_modes) &&
    pilotPackage.series_boundary.window_modes.some((mode) => mode !== "milestone");
  if (hasNonMilestoneWindowMode) {
    if (pilotPackage?.series_boundary?.complete_milestone_series !== false) {
      gaps.push("rolling or non-milestone windows must not mark complete_milestone_series");
    }
    for (const field of [
      "ready_windows",
      "held_windows",
      "suppressed_windows",
      "missing_windows",
      "blocked_windows"
    ]) {
      if (Number(pilotPackage?.series_boundary?.[field] ?? 0) !== 0) {
        gaps.push(`rolling or non-milestone windows must not populate series_boundary.${field}`);
      }
    }
    for (const field of ["observed_milestones", "missing_milestones", "compact_refs"]) {
      if ((pilotPackage?.series_boundary?.[field] ?? []).length !== 0) {
        gaps.push(`rolling or non-milestone windows must not populate series_boundary.${field}`);
      }
    }
    if (
      (pilotPackage?.evidence_flow?.series_alignment_check?.covered_milestone_days ?? [])
        .length !== 0
    ) {
      gaps.push("rolling or non-milestone windows must not populate covered milestone days");
    }
  }
  if (
    pilotPackage?.series_boundary?.validation_valid === false &&
    (pilotPackage?.series_boundary?.compact_refs ?? []).length !== 0
  ) {
    gaps.push("invalid Series validation must not emit compact milestone refs");
  }
  if (
    pilotPackage?.series_boundary?.decision ===
      "HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION" &&
    pilotPackage?.evidence_flow?.series_alignment_check?.decision !==
      "CONTINUITY_COVERAGE_COMPLETE"
  ) {
    gaps.push("complete repeated package requires Series continuity coverage complete");
  }
  if (
    pilotPackage?.evidence_flow?.series_alignment_check?.decision ===
      "CONTINUITY_COVERAGE_COMPLETE" &&
    pilotPackage?.series_boundary?.compact_refs?.length !== MILESTONE_DAYS.length
  ) {
    gaps.push("complete repeated package requires compact refs for each governed milestone");
  }
  return gaps;
}

function collectRepeatedFixtureBoundGaps(pilotPackage, options = {}) {
  if (!options.sourceFixture) return [];
  if (options.sourceFixture?.schema_version !== FIXTURE_SCHEMA_VERSION) {
    return [`sourceFixture.schema_version must be ${FIXTURE_SCHEMA_VERSION}`];
  }
  const expected = runControlledRepeatedPilotEvidencePackageFromObject(
    options.sourceFixture,
    {
      cwd: options.cwd ?? process.cwd(),
      milestoneDays: options.milestoneDays,
      windowMode: options.windowMode
    }
  );
  if (pilotPackage.package_integrity_hash !== expected.package_integrity_hash) {
    return ["controlled repeated pilot evidence package must match source-fixture-bound output"];
  }
  return [];
}

export function validateControlledRepeatedPilotEvidencePackage(
  pilotPackage,
  options = {}
) {
  const baseValidation = validateControlledPilotEvidencePackage(pilotPackage, {
    cwd: options.cwd
  });
  const gaps = [
    ...baseValidation.gaps,
    ...collectRepeatedPackageGaps(pilotPackage),
    ...collectRepeatedFixtureBoundGaps(pilotPackage, options)
  ];
  return {
    schema_version: `${CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION}_REPEATED_VALIDATION`,
    fixture_id: pilotPackage?.fixture_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_controlled_pilot_evidence_package.mjs <fixture.json> [--repeated] [--milestones=0,30,60,90,180,365] [--window-mode=milestone]"
  );
  process.exit(1);
}

function cliOptions(argv) {
  const fixturePath = argv.find((arg) => !arg.startsWith("--"));
  const repeated = argv.includes("--repeated");
  const milestonesArg = argv.find((arg) => arg.startsWith("--milestones="));
  const windowModeArg = argv.find((arg) => arg.startsWith("--window-mode="));
  return {
    fixturePath,
    repeated,
    milestoneDays: milestonesArg
      ? milestonesArg
          .split("=")[1]
          .split(",")
          .map((day) => Number(day.trim()))
          .filter((day) => Number.isFinite(day))
      : undefined,
    windowMode: windowModeArg ? windowModeArg.split("=")[1] : undefined
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const { fixturePath, repeated, milestoneDays, windowMode } = cliOptions(
    process.argv.slice(2)
  );
  if (!fixturePath) printUsageAndExit();
  const cwd = process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, fixturePath), "utf8"));
  const pilotPackage = repeated
    ? runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
        cwd,
        milestoneDays,
        windowMode
      })
    : runControlledPilotEvidencePackageFromObject(fixture, { cwd });
  const validation = repeated
    ? validateControlledRepeatedPilotEvidencePackage(pilotPackage, {
        sourceFixture: fixture,
        cwd,
        milestoneDays,
        windowMode
      })
    : validateControlledPilotEvidencePackage(pilotPackage, {
        sourceFixture: fixture,
        cwd
      });
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
  }
  console.log(JSON.stringify(pilotPackage, null, 2));
}
