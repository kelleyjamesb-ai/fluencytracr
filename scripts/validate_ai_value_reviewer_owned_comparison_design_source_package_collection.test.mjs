import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  buildReviewerOwnedComparisonDesignSourcePackageCollection,
  validateReviewerOwnedComparisonDesignSourcePackageCollection
} from "./run_ai_value_reviewer_owned_comparison_design_source_package_collection.mjs";
import {
  buildComparisonDesignSourcePackagePreparationBinding
} from "./run_ai_value_comparison_design_source_package_preparation_binding.mjs";
import {
  buildAggregateDataCollectionPlanningContract
} from "./run_ai_value_aggregate_data_collection_planning_contract.mjs";
import {
  buildReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  buildHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";
import {
  buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject
} from "./run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs";

const metricLibraryRef =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

let cachedRuntimeSource = null;

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

function sourceRuntimeSource() {
  if (cachedRuntimeSource) return JSON.parse(JSON.stringify(cachedRuntimeSource));
  cachedRuntimeSource = JSON.parse(
    execFileSync("npm", [
      "run",
      "--silent",
      "run:ai-value-contribution-alignment-internal-bayesian-execution-runtime-source-envelope"
    ], { encoding: "utf8" })
  );
  return JSON.parse(JSON.stringify(cachedRuntimeSource));
}

function rehashCollection(record) {
  const { collection_hash, ...hashable } = record;
  record.collection_hash = crypto.createHash("sha256").update(stableJson(hashable)).digest("hex");
  return record;
}

function recommendationPlan(overrides = {}) {
  return buildHypothesisToMetricRecommendationPlan({
    blueprint_hypothesis_ref: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
    blueprint_hypothesis_statement:
      "Improve support case resolution capacity while keeping escalation and quality posture governed.",
    value_route: "CAPACITY_CREATION",
    workflow_function_scope: "customer_support_case_resolution",
    cohort_scope: "eligible_support_cases_aggregate",
    metric_library_refs: [metricLibraryRef],
    ...overrides
  });
}

function milestoneWindowRefs(overrides = {}) {
  return {
    T0_baseline: "measurement_window.customer_support.case_resolution.t0",
    T30: "measurement_window.customer_support.case_resolution.t30",
    T60: "measurement_window.customer_support.case_resolution.t60",
    T90: "measurement_window.customer_support.case_resolution.t90",
    T120: "measurement_window.customer_support.case_resolution.t120",
    T180_6_month: "measurement_window.customer_support.case_resolution.t180",
    T270_9_month: "measurement_window.customer_support.case_resolution.t270",
    T365_12_month: "measurement_window.customer_support.case_resolution.t365",
    ...overrides
  };
}

function collectionWindowRefs(overrides = {}) {
  return {
    T0_baseline: "planned_collection_window.customer_support.case_resolution.t0",
    T30: "planned_collection_window.customer_support.case_resolution.t30",
    T60: "planned_collection_window.customer_support.case_resolution.t60",
    T90: "planned_collection_window.customer_support.case_resolution.t90",
    T120: "planned_collection_window.customer_support.case_resolution.t120",
    T180_6_month: "planned_collection_window.customer_support.case_resolution.t180",
    T270_9_month: "planned_collection_window.customer_support.case_resolution.t270",
    T365_12_month: "planned_collection_window.customer_support.case_resolution.t365",
    ...overrides
  };
}

function collectionPlan(source, overrides = {}) {
  return {
    aggregate_data_collection_plan_ref:
      "aggregate_data_collection_plan.customer_support.case_resolution.2026_06",
    source_reviewer_approved_measurement_plan_ref:
      source.reviewer_approved_measurement_plan_ref,
    collection_owner_role_ref: "role.value_data_governance_reviewer",
    aggregate_source_posture_ref: "aggregate_source_posture.customer_support.case_resolution",
    source_system_posture_ref: "source_system_posture.customer_support.aggregate_export_only",
    aggregate_export_manifest_plan_ref:
      "aggregate_export_manifest_plan.customer_support.case_resolution",
    measurement_cell_binding_plan_ref:
      "measurement_cell_binding_plan.customer_support.case_resolution",
    planned_collection_window_refs: collectionWindowRefs(),
    suppression_missing_held_collection_precheck_posture: "CLEAR",
    privacy_boundary_attestation_ref:
      "privacy_boundary_attestation.aggregate_only.no_identifiers",
    raw_data_exclusion_attestation_ref:
      "raw_data_exclusion.no_raw_rows.no_prompts.no_transcripts",
    live_connector_exclusion_attestation_ref:
      "live_connector_exclusion.no_live_execution",
    reviewer_decision_ref: "reviewer_decision.aggregate_collection_plan.2026_06",
    planning_state: "APPROVED_FOR_AGGREGATE_COLLECTION_PLANNING",
    ...overrides
  };
}

function upstreamSources() {
  const sourceRecommendationPlan = recommendationPlan();
  const recommendation = sourceRecommendationPlan.candidate_metric_recommendations[0];
  const sourceReviewerApprovedMeasurementPlan = buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan,
    reviewerApproval: {
      reviewer_approved_measurement_plan_ref:
        "reviewer_approved_measurement_plan.customer_support.case_resolution.2026_06",
      source_blueprint_hypothesis_ref: sourceRecommendationPlan.blueprint_hypothesis_ref,
      source_candidate_metric_recommendation_ref: recommendation.recommendation_ref,
      selected_metric_id: recommendation.candidate_metric_id,
      selected_metric_family: recommendation.candidate_metric_family,
      selected_measurement_unit: recommendation.measurement_unit,
      metric_owner_role_ref: recommendation.metric_owner_role_ref,
      expected_movement_direction: "decrease",
      expected_lag_definition: "lag_definition.customer_support.case_resolution.t60",
      baseline_value_source_ref: "baseline_source.customer_support.case_resolution.t0",
      comparison_condition_ref: "comparison_condition.customer_support.case_resolution.2026_06",
      milestone_schedule_ref: "milestone_schedule.customer_support.case_resolution.2026_06",
      milestone_window_refs: milestoneWindowRefs(),
      cohort_identity: "eligible_support_cases_aggregate",
      workflow_function_identity: "customer_support_case_resolution",
      aggregate_measurement_cell_grain:
        "org_id+function_area+workflow_id+cohort_key+time_window+metric_id",
      suppression_missing_held_precheck_posture: "CLEAR",
      approval_state: "APPROVED_FOR_AGGREGATE_DATA_COLLECTION_PLANNING",
      approval_role_ref: "role.value_governance_reviewer",
      reviewer_decision_ref: "reviewer_decision.customer_support.case_resolution.2026_06"
    }
  });
  const sourceAggregateDataCollectionPlanningContract =
    buildAggregateDataCollectionPlanningContract({
      sourceReviewerApprovedMeasurementPlan,
      sourceRecommendationPlan,
      aggregateDataCollectionPlan: collectionPlan(sourceReviewerApprovedMeasurementPlan)
    });
  const sourceComparisonDesignSourcePackagePreparationBinding =
    buildComparisonDesignSourcePackagePreparationBinding({
      sourceRecommendationPlan,
      sourceReviewerApprovedMeasurementPlan,
      sourceAggregateDataCollectionPlanningContract
    });
  return {
    sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract,
    sourceComparisonDesignSourcePackagePreparationBinding
  };
}

function reviewerOwnedPackage(overrides = {}) {
  return {
    reviewer_owned_source_package_ref:
      "reviewer_owned_comparison_design_source_package.customer_support.case_resolution.2026_06",
    source_blueprint_hypothesis_ref: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
    business_function: "customer_support",
    prioritized_use_case: "case_resolution_ai_assist",
    workflow: "customer_support_case_resolution",
    workflow_step: "case_triage_to_resolution",
    cohort: "eligible_support_cases_aggregate",
    metric: "support_median_resolution_hours",
    evidence_source: "aggregate_measurement_cell_refs_only",
    observation_window: "T0_T30_T60_T90_T120_T180_T270_T365",
    governance_state: "reviewer_owned_aggregate_only",
    treatment_group_definition:
      "Aggregate Measurement Cells representing Blueprint-approved workflows after implementation of the prioritized AI-enabled use case.",
    comparison_group_definition:
      "Aggregate Measurement Cells representing the same workflow and cohort during the approved baseline observation period prior to Blueprint implementation.",
    rollout_or_comparison_design_type: "staggered_rollout",
    baseline_source_posture: "baseline_source.customer_support.case_resolution.t0",
    comparison_condition: "comparison_condition.customer_support.case_resolution.2026_06",
    baseline_window: "T0_baseline",
    comparison_window: "T30_T60_T90_T120_T180_T270_T365",
    expected_movement_direction: "decrease",
    expected_lag_definition: "lag_definition.customer_support.case_resolution.t60",
    metric_direction_lag_confirmation_ref:
      "metric_direction_lag_confirmation.customer_support.case_resolution.2026_06",
    approved_expectation_path_blueprint_hypothesis_binding_ref:
      "expectation_path_binding.customer_support.case_resolution.2026_06",
    cohort_identity_confirmation_ref:
      "cohort_identity_confirmation.customer_support.case_resolution.2026_06",
    workflow_function_identity_confirmation_ref:
      "workflow_function_identity_confirmation.customer_support.case_resolution.2026_06",
    aggregate_measurement_cell_grain_confirmation_ref:
      "measurement_cell_grain_confirmation.customer_support.case_resolution.2026_06",
    aggregate_measurement_cell_grain:
      "Blueprint Hypothesis x Business Function x Prioritized Use Case x Workflow x Workflow Step x Cohort x Metric x Evidence Source x Milestone Window",
    milestone_schedule_confirmation_refs: milestoneWindowRefs({
      T0_baseline: "reviewed_milestone.customer_support.case_resolution.t0",
      T30: "reviewed_milestone.customer_support.case_resolution.t30",
      T60: "reviewed_milestone.customer_support.case_resolution.t60",
      T90: "reviewed_milestone.customer_support.case_resolution.t90",
      T120: "reviewed_milestone.customer_support.case_resolution.t120",
      T180_6_month: "reviewed_milestone.customer_support.case_resolution.t180",
      T270_9_month: "reviewed_milestone.customer_support.case_resolution.t270",
      T365_12_month: "reviewed_milestone.customer_support.case_resolution.t365"
    }),
    suppression_missing_held_window_review: "CLEAR",
    boundary_checks: {
      raw_rows_absent: "CLEAR",
      identifiers_absent: "CLEAR",
      query_text_absent: "CLEAR",
      prompts_transcripts_absent: "CLEAR",
      person_level_data_absent: "CLEAR",
      causality_claim_absent: "CLEAR",
      roi_finance_productivity_claims_absent: "CLEAR",
      confidence_probability_output_absent: "CLEAR",
      live_connector_persistence_export_authorization_absent: "CLEAR",
      cross_slice_aggregation_prohibition_clear: "CLEAR"
    },
    reviewer_role_ref: "role.data_science_governance_reviewer",
    review_decision: "COLLECTED_FOR_REVIEW_ONLY",
    ...overrides
  };
}

function validCollection() {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage();
  return {
    sources,
    packageInput,
    record: buildReviewerOwnedComparisonDesignSourcePackageCollection({
      ...sources,
      reviewerOwnedComparisonDesignSourcePackage: packageInput
    })
  };
}

test("explicit reviewer-owned aggregate package is collected for review only", () => {
  const { sources, packageInput, record } = validCollection();
  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(record.collection_state, "REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY");
  assert.equal(record.allowed_next_step, "run_comparison_design_adequacy_evidence_review_only");
  assert.equal(record.artifact_class, "reviewer_owned_comparison_design_source_package_collection");
  assert.equal(record.internal_only, true);
  assert.equal(record.aggregate_only, true);
  assert.equal(record.source_ref_only, true);
  assert.equal(record.review_decision, "COLLECTED_FOR_REVIEW_ONLY");
  assert.equal(record.source_package_collected, true);
  assert.equal(record.reviewed_evidence_created, false);
  assert.equal(record.evidence_satisfied, false);
  assert.equal(record.comparison_design_adequacy_satisfied, false);
  assert.equal(record.diagnostics_evidence_satisfied, false);
  assert.equal(record.promotion_authorized, false);
  assert.equal(record.source_blueprint_hypothesis_ref, sources.sourceRecommendationPlan.blueprint_hypothesis_ref);
  assert.equal(record.treatment_group_definition, packageInput.treatment_group_definition);
  assert.equal(record.comparison_group_definition, packageInput.comparison_group_definition);
  assert.equal(record.rollout_or_comparison_design_type, "staggered_rollout");
  assert.equal(record.aggregate_measurement_cell_grain, "Blueprint Hypothesis x Business Function x Prioritized Use Case x Workflow x Workflow Step x Cohort x Metric x Evidence Source x Milestone Window");
  assert.deepEqual(record.atomic_evidence_grain_support, [
    "blueprint_hypothesis",
    "business_function",
    "prioritized_use_case",
    "workflow",
    "workflow_step",
    "cohort",
    "metric",
    "evidence_source",
    "observation_window",
    "governance_state"
  ]);
});

test("default path without preparation binding holds for binding", () => {
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection();

  assert.equal(record.collection_state, "HOLD_FOR_BINDING");
  assert.equal(record.allowed_next_step, "prepare_comparison_design_source_package_only");
  assert.equal(record.source_package_collected, false);
  assert.ok(record.gap_list.includes("missing_source_comparison_design_source_package_preparation_binding"));
  assert.equal(record.evidence_satisfied, false);
  assert.equal(record.promotion_authorized, false);
});

test("ready preparation without explicit reviewer-owned package holds for more information", () => {
  const sources = upstreamSources();
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection(sources);

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.allowed_next_step, "collect_reviewer_owned_comparison_design_source_package_only");
  assert.equal(record.review_decision, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.ok(record.gap_list.includes("missing_reviewer_owned_comparison_design_source_package"));
});

test("preferred defaults do not become reviewer-owned facts when package fields are missing", () => {
  const sources = upstreamSources();
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: {
      reviewer_owned_source_package_ref:
        "reviewer_owned_comparison_design_source_package.customer_support.partial.2026_06"
    }
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.equal(record.review_decision, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.treatment_group_definition, null);
  assert.equal(record.comparison_group_definition, null);
  assert.ok(record.gap_list.includes("missing_treatment_group_definition"));
  assert.ok(record.gap_list.includes("missing_rollout_or_comparison_design_type"));
});

test("validation rejects forged preparation binding hash", () => {
  const { sources, packageInput, record } = validCollection();
  record.source_comparison_design_source_package_preparation_hash = "forged_preparation_hash";
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_comparison_design_source_package_preparation_hash mismatch"));
});

test("boundary checks must be explicitly clear before collection is ready", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    boundary_checks: {
      ...reviewerOwnedPackage().boundary_checks,
      raw_rows_absent: "HOLD_FOR_MORE_INFORMATION"
    }
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.ok(record.gap_list.includes("boundary_check_not_clear:raw_rows_absent"));
});

test("CLEAR boundary checks cannot launder unsafe package values", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    treatment_group_definition: "raw_rows: support case employee_id details"
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.treatment_group_definition, null);
  assert.ok(record.gap_list.includes("unsafe_treatment_group_definition"));
});

test("allowed package fields must be scalar strings and cannot hide nested raw content", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    treatment_group_definition: {
      raw_rows: ["employee_id 123 prompt: unsafe"]
    }
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.equal(record.treatment_group_definition, null);
  assert.ok(record.gap_list.includes("non_scalar_treatment_group_definition"));
  assert.ok(
    record.gap_list.includes(
      "unsafe_contract_value:reviewerOwnedPackage.treatment_group_definition.raw_rows[0]"
    )
  );
  assert.equal(record.reviewer_owned_source_package_hash, null);
});

test("milestone refs must be scalar strings and cannot hide nested authorization", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    milestone_schedule_confirmation_refs: {
      ...reviewerOwnedPackage().milestone_schedule_confirmation_refs,
      T30: {
        promotion_authorized: true,
        transcript: "transcript: unsafe"
      }
    }
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.equal(record.milestone_schedule.reviewer_owned_milestone_refs.T30, null);
  assert.ok(
    record.gap_list.includes("non_scalar_milestone_schedule_confirmation_ref:T30")
  );
  assert.ok(
    record.gap_list.includes(
      "unsafe_contract_value:reviewerOwnedPackage.milestone_schedule_confirmation_refs.T30.transcript"
    )
  );
  assert.equal(record.reviewer_owned_source_package_hash, null);
});

test("source package collection cannot satisfy evidence or promote Bayesian chain", () => {
  const { record } = validCollection();

  assert.equal(record.source_package_collected, true);
  assert.equal(record.reviewed_evidence_created, false);
  assert.equal(record.creates_evidence, false);
  assert.equal(record.evidence_satisfied, false);
  assert.equal(record.comparison_design_adequacy_satisfied, false);
  assert.equal(record.governed_diagnostics_sufficiency_evidence_source_complete, false);
  assert.equal(record.posterior_interpretation_authorized, false);
  assert.equal(record.promotion_authorized, false);
  assert.equal(record.feeds.comparison_design_adequacy_evidence_review, false);
  assert.equal(record.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.equal(record.bayesian_chain_state.current_state, "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE");
  assert.equal(record.bayesian_chain_state.changed_by_this_artifact, false);
});

test("validation rejects side doors and unexpected nested fields after rehash", () => {
  const { sources, packageInput, record } = validCollection();
  record.evidence_satisfied = true;
  record.comparison_design_adequacy_satisfied = true;
  record.promotion_authorized = true;
  record.blocked_outputs.confidence_output = true;
  record.feeds.governed_diagnostics_sufficiency_evidence_source = true;
  record.boundary_checks.synthetic_evidence_complete = "CLEAR";
  record.milestone_schedule.export_authorization = true;
  record.bayesian_chain_state.posterior_output_authorized = true;
  record.source_package_payload = { raw_rows: ["do not include"] };
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("evidence_satisfied must be false"));
  assert.ok(validation.gaps.includes("comparison_design_adequacy_satisfied must be false"));
  assert.ok(validation.gaps.includes("promotion_authorized must be false"));
  assert.ok(validation.gaps.includes("blocked_outputs.confidence_output must be present and false"));
  assert.ok(validation.gaps.includes("feeds.governed_diagnostics_sufficiency_evidence_source must be present and false"));
  assert.ok(validation.gaps.includes("boundary_checks.synthetic_evidence_complete is not an allowed boundary check key"));
  assert.ok(validation.gaps.includes("milestone_schedule.export_authorization is not an allowed milestone schedule key"));
  assert.ok(validation.gaps.includes("bayesian_chain_state.posterior_output_authorized is not an allowed Bayesian chain key"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:source_package_payload"));
});

test("validation rejects forbidden nested keys inside held milestone refs after rehash", () => {
  const { sources, packageInput, record } = validCollection();
  record.collection_state = "HOLD_FOR_MORE_INFORMATION";
  record.allowed_next_step = "collect_reviewer_owned_comparison_design_source_package_only";
  record.source_package_collected = false;
  record.review_decision = "HOLD_FOR_MORE_INFORMATION";
  record.milestone_schedule.collection_ready_for_review_only = false;
  record.milestone_schedule.reviewer_owned_milestone_refs.export_authorization = true;
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "milestone_schedule.reviewer_owned_milestone_refs.export_authorization is not an allowed milestone ref key"
    )
  );
});

test("validation rejects object values under allowed boundary check keys after rehash", () => {
  const { sources, packageInput, record } = validCollection();
  record.collection_state = "HOLD_FOR_MORE_INFORMATION";
  record.allowed_next_step = "collect_reviewer_owned_comparison_design_source_package_only";
  record.source_package_collected = false;
  record.review_decision = "HOLD_FOR_MORE_INFORMATION";
  record.milestone_schedule.collection_ready_for_review_only = false;
  record.boundary_checks.raw_rows_absent = {
    export_authorization: true,
    raw_rows: ["employee_id 123"]
  };
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("boundary_checks.raw_rows_absent must be a scalar string"));
  assert.ok(
    validation.gaps.includes("unsafe_contract_value:boundary_checks.raw_rows_absent.raw_rows[0]")
  );
});

test("validation rejects extra blocked claims after rehash", () => {
  const { sources, packageInput, record } = validCollection();
  record.blocked_claims.push("promotion_authorized=true");
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes("blocked_claims contains unexpected claim:promotion_authorized=true")
  );
});

test("five-milestone package fails because all eight milestones are required", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    milestone_schedule_confirmation_refs: {
      T0_baseline: "reviewed_milestone.customer_support.case_resolution.t0",
      T30: "reviewed_milestone.customer_support.case_resolution.t30",
      T60: "reviewed_milestone.customer_support.case_resolution.t60",
      T90: "reviewed_milestone.customer_support.case_resolution.t90",
      T120: "reviewed_milestone.customer_support.case_resolution.t120"
    }
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.ok(record.gap_list.includes("missing_milestone_schedule_confirmation_ref:T180_6_month"));
  assert.ok(record.gap_list.includes("missing_milestone_schedule_confirmation_ref:T270_9_month"));
  assert.ok(record.gap_list.includes("missing_milestone_schedule_confirmation_ref:T365_12_month"));
});

test("validation rejects reviewed evidence and runtime hash laundering fields", () => {
  const { sources, packageInput, record } = validCollection();
  record.reviewed_source_evidence_ref = "internal_diagnostics_sufficiency_evidence.comparison_design";
  record.reviewed_source_evidence_hash = "reviewed_hash";
  record.source_evidence_hash = "source_hash";
  record.reviewed_evidence_manifest_hash = "manifest_hash";
  record.source_runtime_ref = "runtime_ref";
  record.runtime_hash = "runtime_hash";
  record.fixture_artifact_hash = "fixture_hash";
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("unexpected_top_level_field:reviewed_source_evidence_ref"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:reviewed_source_evidence_hash"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:source_evidence_hash"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:reviewed_evidence_manifest_hash"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:source_runtime_ref"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:runtime_hash"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:fixture_artifact_hash"));
});

test("validation rejects SED VBD and outcome assessment fields", () => {
  const { sources, packageInput, record } = validCollection();
  record.said_evidence_refs = ["sed.source.ref"];
  record.unsaid_behavioral_evidence_refs = ["vbd.source.ref"];
  record.aggregate_outcome_measurement_cell_refs = ["measurement_cell.outcome.ref"];
  record.outcome_movement_state = "DIRECTIONALLY_ALIGNED_INTERNAL_ONLY";
  record.evidence_grade = "OBJECTIVE";
  record.confidence_score = 0.91;
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("unexpected_top_level_field:said_evidence_refs"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:unsaid_behavioral_evidence_refs"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:aggregate_outcome_measurement_cell_refs"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:outcome_movement_state"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:evidence_grade"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:confidence_score"));
});

test("validation rejects source projection drift despite a recomputed collection hash", () => {
  const { sources, packageInput, record } = validCollection();
  record.source_blueprint_hypothesis_ref = "blueprint_hypothesis.forged";
  record.selected_metric_id = "forged_metric";
  record.milestone_schedule.reviewer_owned_milestone_refs.T90 = "reviewed_milestone.forged";
  rehashCollection(record);

  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(record, {
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_blueprint_hypothesis_ref must match source preparation binding"));
  assert.ok(validation.gaps.includes("selected_metric_id must match source preparation binding"));
  assert.ok(validation.gaps.includes("milestone_schedule.reviewer_owned_milestone_refs must match reviewer-owned source package"));
});

test("package facts that drift from the preparation binding hold for more information", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    metric: "forged_metric",
    cohort: "forged_cohort",
    workflow: "forged_workflow",
    baseline_source_posture: "baseline_source.forged",
    comparison_condition: "comparison_condition.forged",
    expected_movement_direction: "increase",
    expected_lag_definition: "lag_definition.forged"
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.ok(record.gap_list.includes("metric must match source preparation binding"));
  assert.ok(record.gap_list.includes("cohort must match source preparation binding"));
  assert.ok(record.gap_list.includes("workflow must match source preparation binding"));
  assert.ok(record.gap_list.includes("baseline_source_posture must match source preparation binding"));
  assert.ok(record.gap_list.includes("comparison_condition must match source preparation binding"));
  assert.ok(record.gap_list.includes("expected_movement_direction must match source preparation binding"));
  assert.ok(record.gap_list.includes("expected_lag_definition must match source preparation binding"));
});

test("unapproved evidence and runtime fields in package input hold closed", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    reviewed_source_evidence_hash: "reviewed_hash",
    source_evidence_hash: "source_hash",
    source_package_hash: "package_hash",
    evidence_satisfied: true,
    runtime_hash: "runtime_hash"
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.source_package_collected, false);
  assert.ok(record.gap_list.includes("unexpected_reviewer_owned_source_package_field:reviewed_source_evidence_hash"));
  assert.ok(record.gap_list.includes("unexpected_reviewer_owned_source_package_field:source_evidence_hash"));
  assert.ok(record.gap_list.includes("unexpected_reviewer_owned_source_package_field:source_package_hash"));
  assert.ok(record.gap_list.includes("unexpected_reviewer_owned_source_package_field:evidence_satisfied"));
  assert.ok(record.gap_list.includes("unexpected_reviewer_owned_source_package_field:runtime_hash"));
});

test("extra boundary assertions in package input hold closed", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    boundary_checks: {
      ...reviewerOwnedPackage().boundary_checks,
      reviewed_evidence_created: "CLEAR",
      adequacy_satisfied: "CLEAR",
      synthetic_evidence_complete: "CLEAR"
    }
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.ok(record.gap_list.includes("boundary_checks.reviewed_evidence_created is not an allowed boundary check key"));
  assert.ok(record.gap_list.includes("boundary_checks.adequacy_satisfied is not an allowed boundary check key"));
  assert.ok(record.gap_list.includes("boundary_checks.synthetic_evidence_complete is not an allowed boundary check key"));
});

test("stale held or extra milestone refs in package input hold closed", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    milestone_schedule_confirmation_refs: {
      ...reviewerOwnedPackage().milestone_schedule_confirmation_refs,
      T120: "stale_reviewed_milestone.customer_support.case_resolution.t120",
      T365_12_month: "held_reviewed_milestone.customer_support.case_resolution.t365",
      T999: "reviewed_milestone.customer_support.case_resolution.t999"
    }
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.ok(record.gap_list.includes("non_ready_milestone_schedule_confirmation_ref:T120"));
  assert.ok(record.gap_list.includes("non_ready_milestone_schedule_confirmation_ref:T365_12_month"));
  assert.ok(record.gap_list.includes("milestone_schedule_confirmation_refs.T999 is not an allowed milestone key"));
});

test("reviewer decision laundering in package input holds closed", () => {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage({
    review_decision: "APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING"
  });
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });

  assert.equal(record.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.review_decision, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(record.evidence_satisfied, false);
  assert.equal(record.comparison_design_adequacy_satisfied, false);
  assert.ok(record.gap_list.includes("review_decision_not_collected_for_review_only"));
});

test("forged source preparation binding input holds for binding", () => {
  const sources = upstreamSources();
  const forgedPreparation = {
    ...sources.sourceComparisonDesignSourcePackagePreparationBinding,
    selected_metric_id: "forged_metric"
  };
  const { preparation_hash, ...hashable } = forgedPreparation;
  forgedPreparation.preparation_hash = crypto
    .createHash("sha256")
    .update(stableJson(hashable))
    .digest("hex");
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    sourceComparisonDesignSourcePackagePreparationBinding: forgedPreparation,
    reviewerOwnedComparisonDesignSourcePackage: reviewerOwnedPackage()
  });

  assert.equal(record.collection_state, "HOLD_FOR_BINDING");
  assert.equal(record.allowed_next_step, "prepare_comparison_design_source_package_only");
  assert.ok(
    record.gap_list.some((gap) =>
      gap.startsWith("source_preparation_binding_invalid:")
    )
  );
});

test("collected package record can feed only comparison-design adequacy review", () => {
  const runtimeSource = sourceRuntimeSource();
  const { record } = validCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      ...runtimeSource,
      comparison_design_source_evidence: record
    });

  assert.equal(
    review.review_state,
    "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING"
  );
  assert.equal(review.evidence_satisfaction?.evidence_satisfied, true);
  assert.equal(review.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.equal(review.feeds.diagnostics_evidence_packet, false);
  assert.equal(review.feeds.bayesian_promotion_decision_gate, false);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
});
