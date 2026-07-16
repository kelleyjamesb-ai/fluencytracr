import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject,
  contributionAlignmentComparisonDesignAdequacySourcePackageHash,
  validateContributionAlignmentComparisonDesignAdequacyEvidenceReview
} from "./run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";
import {
  contributionAlignmentInternalBayesianExecutionGateHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";
import {
  contributionAlignmentInternalBayesianExecutionRuntimeHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";
import {
  buildReviewerOwnedComparisonDesignSourcePackageCollection
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

const READY_STATE =
  "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING";
const HOLD_STATE = "HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const EXPECTED_REF =
  "internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06";
const metricLibraryRef =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

let cachedRuntimeSource = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceRuntime() {
  if (cachedRuntimeSource) return clone(cachedRuntimeSource.source_runtime);
  cachedRuntimeSource = JSON.parse(
    execFileSync("npm", [
      "run",
      "--silent",
      "run:ai-value-contribution-alignment-internal-bayesian-execution-runtime-source-envelope"
    ], { encoding: "utf8" })
  );
  return clone(cachedRuntimeSource.source_runtime);
}

function sourceRuntimeSource() {
  if (!cachedRuntimeSource) sourceRuntime();
  return clone(cachedRuntimeSource);
}

function sourceRuntimeEnvelope(overrides = {}) {
  return {
    ...sourceRuntimeSource(),
    ...overrides
  };
}

function rehashSourceGateEnvelope(runtimeSource, mutateGate) {
  const envelope = clone(runtimeSource);
  mutateGate(envelope.source_gate);
  envelope.source_gate.gate_hash =
    contributionAlignmentInternalBayesianExecutionGateHash(envelope.source_gate);
  envelope.source_runtime.source_gate_ref.gate_hash = envelope.source_gate.gate_hash;
  envelope.source_runtime.runtime_hash =
    contributionAlignmentInternalBayesianExecutionRuntimeHash(envelope.source_runtime);
  return envelope;
}

function sourceRuntimeValidationOptions(overrides = {}) {
  const source = sourceRuntimeSource();
  return {
    sourceRuntime: source.source_runtime,
    sourceGate: source.source_gate,
    aggregateMeasurementCellWindows: source.aggregate_measurement_cell_windows,
    ...overrides
  };
}

function validComparisonDesignSourcePackage(runtime, overrides = {}) {
  const sourcePackage = {
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_2026_06",
    source_package_id: "comparison_design_adequacy_source_package_2026_06_reviewed",
    package_state: "COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_REVIEWED_INTERNAL_ONLY",
    internal_only: true,
    aggregate_only: true,
    reviewed_source_evidence_ref: EXPECTED_REF,
    source_runtime_ref: {
      runtime_hash: runtime.runtime_hash,
      fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash
    },
    treatment_definition: {
      defined: true,
      aggregate_measurement_cell_grain: true,
      measurement_cell_role: "treatment"
    },
    comparison_definition: {
      defined: true,
      aggregate_measurement_cell_grain: true,
      measurement_cell_role: "comparison"
    },
    pre_post_window_definition: {
      defined: true,
      pre_window_defined: true,
      post_window_defined: true,
      window_alignment:
        "same_metric_direction_lag_expectation_path_cohort_workflow_function_identity"
    },
    rollout_or_comparison_design_type: "governed_comparison_group",
    aggregate_measurement_cell_grain: true,
    metric_direction_lag_expectation_path_cohort_workflow_function_identity_matched: true,
    suppression_missing_held_window_review: {
      missing_window_count_zero: true,
      suppressed_window_count_zero: true,
      held_window_count_zero: true,
      suppressed_missing_held_windows_clear: true
    },
    unsupported_cross_slice_aggregation_present: false,
    person_level_or_identifiable_fields_present: false,
    causality_claim_authorized: false,
    reviewer_role: "data_science_reviewer+governance_reviewer",
    review_decision: "APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING",
    placeholder_evidence: false,
    generated_fixture_evidence: false
  };
  Object.assign(sourcePackage, overrides);
  sourcePackage.source_package_hash =
    contributionAlignmentComparisonDesignAdequacySourcePackageHash(sourcePackage);
  return sourcePackage;
}

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

function rehashCollection(record) {
  const { collection_hash, ...hashable } = record;
  record.collection_hash = cryptoHash(hashable);
  return record;
}

function cryptoHash(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
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

function reviewerOwnedCollection(packageOverrides = {}, collectionOverrides = {}) {
  const sources = upstreamSources();
  const packageInput = reviewerOwnedPackage(packageOverrides);
  const collection = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    ...sources,
    reviewerOwnedComparisonDesignSourcePackage: packageInput
  });
  Object.assign(collection, collectionOverrides);
  if (Object.keys(collectionOverrides).length > 0) rehashCollection(collection);
  return { sources, packageInput, collection };
}

test("comparison-design evidence review defaults to held when governed evidence is missing", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(
      sourceRuntimeEnvelope()
    );
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(
    review,
    sourceRuntimeValidationOptions()
  );

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(validation.valid, false);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
  assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
  assert.equal(review.allowed_next_step, "complete_governed_diagnostics_sufficiency_evidence_source");
  assert.equal(review.promotion_boundary.promotion_authorized, false);
  assert.equal(review.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.ok(
    review.evidence_satisfaction.missing_evidence.includes(
      "reviewed comparison-design adequacy source package"
    )
  );
});

test("comparison-design evidence review binds to reviewer-owned package collection and satisfies only comparison_design_adequacy", () => {
  const runtime = sourceRuntime();
  const { collection } = reviewerOwnedCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(sourceRuntimeEnvelope({
      comparison_design_source_evidence: collection
    }));
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(
    review,
    sourceRuntimeValidationOptions({
      comparisonDesignSourceEvidence: collection
    })
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, READY_STATE);
  assert.equal(review.source_bound, true);
  assert.equal(review.source_runtime_ref.runtime_hash, runtime.runtime_hash);
  assert.equal(
    review.source_runtime_ref.fixture_artifact_hash,
    runtime.internal_fit_artifact.artifact_hash
  );
  assert.equal(review.source_package_ref.source_package_id, collection.reviewer_owned_source_package_ref);
  assert.equal(review.source_package_ref.source_package_hash, collection.reviewer_owned_source_package_hash);
  assert.equal(review.source_package_ref.collection_hash, collection.collection_hash);
  assert.equal(review.evidence_satisfaction.evidence_dimension, "comparison_design_adequacy");
  assert.equal(review.evidence_satisfaction.evidence_satisfied, true);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_ref, EXPECTED_REF);
  assert.match(review.evidence_satisfaction.reviewed_source_evidence_hash, /^[0-9a-f]{64}$/);
  assert.match(review.evidence_satisfaction.source_evidence_hash, /^[0-9a-f]{64}$/);
  assert.equal(review.evidence_satisfaction.aggregate_only_scope, true);
  assert.equal(review.evidence_satisfaction.suppressed_missing_held_windows_clear, true);
  assert.equal(review.evidence_satisfaction.eligible_for_satisfied_representation, true);
  assert.equal(review.evidence_satisfaction.placeholder_evidence, false);
  assert.equal(review.evidence_satisfaction.generated_fixture_evidence, false);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
  assert.equal(review.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.equal(review.feeds.diagnostics_evidence_packet, false);
  assert.equal(review.feeds.bayesian_promotion_decision_gate, false);
});

test("plain source_runtime wrapper stays held without source binding envelope", () => {
  const runtime = sourceRuntime();
  const { collection } = reviewerOwnedCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: collection
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.review_hash, null);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.ok(
    review.validation_summary.gaps.includes(
      "source_runtime.sourceGate is required for ready internal Bayesian execution runtime validation"
    )
  );
  assert.ok(
    review.validation_summary.gaps.includes(
      "source_runtime.aggregateMeasurementCellWindows is required for ready internal Bayesian execution runtime validation"
    )
  );
});

test("direct legacy adequacy source package no longer satisfies without reviewer-owned collection", () => {
  const runtime = sourceRuntime();
  const sourcePackage = validComparisonDesignSourcePackage(runtime);
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: sourcePackage
    });
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(
    review,
    {
      sourceRuntime: runtime,
      comparisonDesignSourceEvidence: sourcePackage
    }
  );

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.review_hash, null);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
  assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
  assert.ok(
    review.validation_summary.gaps.includes(
      "comparison design source evidence must be reviewer-owned package collection"
    )
  );
});

test("held upstream reviewer-owned package returns hold with no adequacy hashes", () => {
  const runtime = sourceRuntime();
  const sources = upstreamSources();
  const collection = buildReviewerOwnedComparisonDesignSourcePackageCollection(sources);
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(sourceRuntimeEnvelope({
      comparison_design_source_evidence: collection
    }));

  assert.equal(collection.collection_state, "HOLD_FOR_MORE_INFORMATION");
  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.review_hash, null);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
  assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
});

test("missing reviewer-owned package ref or hash returns hold", () => {
  const runtime = sourceRuntime();
  for (const missingField of [
    "reviewer_owned_source_package_ref",
    "reviewer_owned_source_package_hash"
  ]) {
    const { collection } = reviewerOwnedCollection();
    collection[missingField] = null;
    rehashCollection(collection);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtime,
        comparison_design_source_evidence: collection
      });

    assert.equal(review.review_state, HOLD_STATE);
    assert.equal(review.review_hash, null);
    assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
    assert.ok(
      review.validation_summary.gaps.some((gap) => gap.includes(missingField)),
      `${missingField} gap missing`
    );
  }
});

test("forged reviewer-owned package hash returns hold", () => {
  const runtime = sourceRuntime();
  const { collection } = reviewerOwnedCollection();
  collection.reviewer_owned_source_package_hash = "0".repeat(64);
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: collection
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.review_hash, null);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.ok(review.validation_summary.gaps.includes("reviewer-owned collection hash is invalid"));
});

test("nested reviewer-owned package facts return hold", () => {
  const runtime = sourceRuntime();
  const { collection } = reviewerOwnedCollection();
  collection.treatment_group_definition = { raw_rows: ["employee_id 123"] };
  rehashCollection(collection);
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: collection
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.review_hash, null);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.ok(review.validation_summary.gaps.includes("treatment_group_definition must be a scalar string"));
});

test("recomputed reviewer-owned collection with top-level raw or promotion sidecar returns hold", () => {
  const runtime = sourceRuntime();
  for (const mutate of [
    (collection) => {
      collection.raw_rows = [];
    },
    (collection) => {
      collection.promotion_payload = {
        promotion_authorized: true
      };
    }
  ]) {
    const { collection } = reviewerOwnedCollection();
    mutate(collection);
    rehashCollection(collection);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtime,
        comparison_design_source_evidence: collection
      });

    assert.equal(review.review_state, HOLD_STATE);
    assert.equal(review.review_hash, null);
    assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
    assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
    assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
    assert.ok(
      review.validation_summary.gaps.some((gap) =>
        /unexpected|forbidden|raw|promotion/.test(gap)
      ),
      review.validation_summary.gaps.join("; ")
    );
  }
});

test("missing milestone refs return hold", () => {
  const runtime = sourceRuntime();
  const { collection } = reviewerOwnedCollection();
  delete collection.milestone_schedule.reviewer_owned_milestone_refs.T365_12_month;
  rehashCollection(collection);
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: collection
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.review_hash, null);
  assert.ok(
    review.validation_summary.gaps.includes(
      "milestone_schedule.reviewer_owned_milestone_refs.T365_12_month is required"
    )
  );
});

test("unsafe boundary check or non-collected reviewer decision returns hold", () => {
  const runtime = sourceRuntime();
  for (const collectionOverrides of [
    { boundary_checks: { ...reviewerOwnedCollection().collection.boundary_checks, raw_rows_absent: "HOLD_FOR_MORE_INFORMATION" } },
    { review_decision: "HOLD_FOR_MORE_INFORMATION" }
  ]) {
    const { collection } = reviewerOwnedCollection({}, collectionOverrides);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtime,
        comparison_design_source_evidence: collection
      });

    assert.equal(review.review_state, HOLD_STATE);
    assert.equal(review.review_hash, null);
    assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  }
});

test("blocked claim Bayesian readiness and promotion side doors return hold", () => {
  const runtime = sourceRuntime();
  for (const mutate of [
    (collection) => collection.blocked_claims.push("promotion_authorized=true"),
    (collection) => {
      collection.bayesian_chain_state.current_state = "BAYESIAN_READY";
    },
    (collection) => {
      collection.promotion_authorized = true;
    }
  ]) {
    const { collection } = reviewerOwnedCollection();
    mutate(collection);
    rehashCollection(collection);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtime,
        comparison_design_source_evidence: collection
      });

    assert.equal(review.review_state, HOLD_STATE);
    assert.equal(review.review_hash, null);
    assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
    assert.equal(review.promotion_boundary.promotion_authorized, false);
  }
});

test("stale fixture template runtime generated and unsafe source content return hold", () => {
  const runtime = sourceRuntime();
  for (const mutate of [
    (collection) => {
      collection.milestone_schedule.reviewer_owned_milestone_refs.T90 = "stale_reviewed_milestone.t90";
    },
    (collection) => {
      collection.reviewer_owned_source_package_ref = "template_source_package.generated_fixture";
    },
    (collection) => {
      collection.treatment_group_definition = "raw_rows: employee_id 123";
    },
    (collection) => {
      collection.comparison_group_definition = "select * from customer_rows";
    },
    (collection) => {
      collection.workflow_step = "prompt: transcript unsafe";
    },
    (collection) => {
      collection.cohort = "person_level employee_id cohort";
    }
  ]) {
    const { collection } = reviewerOwnedCollection();
    mutate(collection);
    rehashCollection(collection);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtime,
        comparison_design_source_evidence: collection
      });

    assert.equal(review.review_state, HOLD_STATE);
    assert.equal(review.review_hash, null);
    assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
    assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
    assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
  }
});

test("comparison-design adequacy review keeps non-authorization outputs blocked", () => {
  const { collection } = reviewerOwnedCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(sourceRuntimeEnvelope({
      comparison_design_source_evidence: collection
    }));

  assert.equal(review.review_state, READY_STATE);
  for (const value of Object.values(review.feeds)) assert.equal(value, false);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
  assert.equal(review.promotion_boundary.posterior_interpretation_authorized, false);
  assert.equal(review.promotion_boundary.confidence_probability_authorized, false);
  assert.equal(review.promotion_boundary.customer_economic_output_authorized, false);
  assert.equal(review.boundary_policy.creates_routes, false);
  assert.equal(review.boundary_policy.creates_ui, false);
  assert.equal(review.boundary_policy.creates_schemas, false);
  assert.equal(review.boundary_policy.persists_review, false);
  assert.equal(review.boundary_policy.creates_exports, false);
  assert.equal(review.boundary_policy.runs_live_connectors, false);
});

test("comparison-design evidence review does not satisfy evidence from runtime design matrix alone", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: runtime.aggregate_design_matrix
    });

  assert.equal(review.review_state, REJECT_STATE);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
});

test("comparison-design evidence review does not satisfy runtime fixture review flags", () => {
  const runtime = sourceRuntime();
  runtime.internal_fit_artifact.comparison_design_adequacy_review_present = true;
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(runtime);

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
  assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
  assert.ok(
    review.evidence_satisfaction.missing_evidence.includes(
      "reviewed comparison-design adequacy source package"
    )
  );
});

test("comparison-design evidence review does not satisfy model-spec prose or template-like input", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: {
        comparison_design_adequacy_review_required: true,
        reviewed_source_evidence_ref: EXPECTED_REF,
        required_evidence_artifact: "reviewed_comparison_design_adequacy_memo"
      }
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_hash, null);
  assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
  assert.ok(
    review.validation_summary.gaps.some((gap) => /schema_version|source_package_hash/.test(gap)),
    review.validation_summary.gaps.join("; ")
  );
});

test("comparison-design evidence review does not satisfy source-hash-only evidence", () => {
  const runtime = sourceRuntime();
  const sourcePackage = {
    reviewed_source_evidence_ref: EXPECTED_REF,
    source_package_hash: "0".repeat(64),
    source_evidence_hash: "1".repeat(64)
  };
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: sourcePackage
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.equal(review.evidence_satisfaction.source_evidence_hash, null);
  assert.ok(
    review.validation_summary.gaps.some((gap) => /schema_version|treatment_definition/.test(gap)),
    review.validation_summary.gaps.join("; ")
  );
});

test("comparison-design evidence review rejects placeholder or generated fixture source package", () => {
  const runtime = sourceRuntime();
  const sourcePackage = validComparisonDesignSourcePackage(runtime, {
    placeholder_evidence: true,
    generated_fixture_evidence: true
  });
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: sourcePackage
    });

  assert.equal(review.review_state, HOLD_STATE);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, false);
  assert.ok(
    review.validation_summary.gaps.some((gap) => /placeholder|generated_fixture/.test(gap)),
    review.validation_summary.gaps.join("; ")
  );
  assert.equal(review.promotion_boundary.promotion_authorized, false);
});

test("comparison-design evidence review rejects unsafe output and raw-source leakage without echo", () => {
  const runtime = sourceRuntime();
  const sourcePackage = validComparisonDesignSourcePackage(runtime, {
    raw_rows: [{ email: "person@example.com" }],
    customer_output: "high confidence ROI caused productivity"
  });
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: sourcePackage,
      promotion_authorized: true
    });
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
  for (const unsafe of [
    "person@example.com",
    "raw_rows",
    "customer_output",
    "high confidence",
    "ROI",
    "productivity"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("comparison-design evidence review rejects forbidden source sidecar names even without values", () => {
  const runtime = sourceRuntime();
  const sourcePackage = validComparisonDesignSourcePackage(runtime, {
    raw_rows: []
  });
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: sourcePackage
    });

  assert.equal(review.review_state, REJECT_STATE);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
});

test("comparison-design evidence review accepts canonical nested source-gate boundary attestations", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtimeSource,
      comparison_design_source_evidence: collection
    });

  assert.equal(runtimeSource.source_gate.runtime_prerequisites.no_raw_rows_or_records, true);
  assert.equal(runtimeSource.source_gate.runtime_prerequisites.no_identifiers, true);
  assert.equal(runtimeSource.source_gate.runtime_prerequisites.no_query_text, true);
  assert.equal(runtimeSource.source_gate.runtime_prerequisites.no_live_connectors, true);
  assert.equal(review.review_state, READY_STATE);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, true);
});

test("comparison-design evidence review rejects actual raw or person-level content nested under source_gate", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  for (const mutateGate of [
    (gate) => { gate.raw_rows = [{ selected_metric: 13 }]; },
    (gate) => { gate.employee_id = "person-123"; },
    (gate) => { gate.extra = { no_identifiers: true }; },
    (gate) => { gate.evidence = [{ metric_value: 13 }]; }
  ]) {
    const forgedEnvelope = rehashSourceGateEnvelope(runtimeSource, mutateGate);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: forgedEnvelope,
        comparison_design_source_evidence: collection
      });
    const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
    const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

    assert.equal(review.review_state, REJECT_STATE);
    assert.equal(validation.valid, false);
    assert.equal(serialized.includes("person-123"), false);
    assert.equal(serialized.includes("selected_metric"), false);
  }
});

test("comparison-design evidence review rejects malformed source gates in legacy plain-runtime wrappers", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  for (const mutateGate of [
    (gate) => { gate.raw_rows = [{ selected_metric: 13 }]; },
    (gate) => { gate.participants = [{ display_name: "Person Example" }]; }
  ]) {
    const forgedEnvelope = rehashSourceGateEnvelope(runtimeSource, mutateGate);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: forgedEnvelope.source_runtime,
        source_gate: forgedEnvelope.source_gate,
        aggregate_measurement_cell_windows:
          forgedEnvelope.aggregate_measurement_cell_windows,
        comparison_design_source_evidence: collection
      });
    const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
    const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

    assert.equal(review.review_state, REJECT_STATE);
    assert.equal(validation.valid, false);
    assert.equal(serialized.includes("selected_metric"), false);
    assert.equal(serialized.includes("Person Example"), false);
  }
});

test("comparison-design evidence review rejects unsafe aggregate windows in legacy plain-runtime wrappers", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  for (const mutateWindows of [
    (windows) => { windows[0].raw_rows = [{ email: "person@example.com" }]; },
    (windows) => {
      windows[0].participants = [{ display_name: "Person Example" }];
    }
  ]) {
    const unsafeWindows = clone(runtimeSource.aggregate_measurement_cell_windows);
    mutateWindows(unsafeWindows);
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtimeSource.source_runtime,
        source_gate: runtimeSource.source_gate,
        aggregate_measurement_cell_windows: unsafeWindows,
        comparison_design_source_evidence: collection
      });
    const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
    const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

    assert.equal(review.review_state, REJECT_STATE);
    assert.equal(validation.valid, false);
    assert.equal(serialized.includes("person@example.com"), false);
    assert.equal(serialized.includes("Person Example"), false);
    assert.equal(serialized.includes("raw_rows"), false);
  }
});

test("comparison-design evidence review rejects ambiguous nested-envelope shapes", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  for (const invalidNestedRuntime of [null, {}, []]) {
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: {
          ...runtimeSource,
          source_runtime: invalidNestedRuntime
        },
        comparison_design_source_evidence: collection
      });

    assert.equal(review.review_state, REJECT_STATE);
    assert.equal(
      validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review).valid,
      false
    );
  }
});

test("comparison-design evidence review rejects ungoverned nested windows and metadata", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  const unsafeWindowsEnvelope = clone(runtimeSource);
  unsafeWindowsEnvelope.aggregate_measurement_cell_windows[0].participants = [
    { display_name: "Person Example" }
  ];

  for (const envelope of [
    unsafeWindowsEnvelope,
    { ...runtimeSource, generated_at: "not-a-governed-timestamp" }
  ]) {
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: envelope,
        comparison_design_source_evidence: collection
      });
    const serialized = JSON.stringify(review);

    assert.equal(review.review_state, REJECT_STATE);
    assert.equal(serialized.includes("Person Example"), false);
    assert.equal(serialized.includes("not-a-governed-timestamp"), false);
  }
});

test("comparison-design evidence review rejects unsafe nested runtime envelope sidecars", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: {
        ...runtimeSource,
        raw_rows: [{ email: "person@example.com" }],
        query_text: "SELECT user_id FROM raw_rows"
      },
      comparison_design_source_evidence: collection
    });
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id", "raw_rows", "query_text"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("comparison-design evidence review rejects identifier-shaped runtime envelope values", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  runtimeSource.aggregate_measurement_cell_windows[0].window_ref =
    "agg_window_user_id_123";

  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtimeSource,
      comparison_design_source_evidence: collection
    });
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("agg_window_user_id_123"), false);
});

test("comparison-design evidence review rejects ignored outer fields beside a nested runtime envelope", () => {
  const runtimeSource = sourceRuntimeSource();
  const { collection } = reviewerOwnedCollection();
  for (const outerSidecar of [
    { generated_at: { raw_rows: [{ email: "person@example.com" }] } },
    { source_gate: { raw_rows: [{ email: "person@example.com" }] } },
    {
      aggregate_measurement_cell_windows: {
        query_text: "SELECT user_id FROM raw_rows"
      }
    }
  ]) {
    const review =
      buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
        source_runtime: runtimeSource,
        comparison_design_source_evidence: collection,
        ...outerSidecar
      });
    const validation =
      validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review);
    const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

    assert.equal(review.review_state, REJECT_STATE);
    assert.equal(validation.valid, false);
    assert.equal(serialized.includes("person@example.com"), false);
    assert.equal(serialized.includes("SELECT user_id"), false);
  }
});

test("comparison-design review alone cannot complete governed diagnostics sufficiency source", () => {
  const runtime = sourceRuntime();
  const { collection } = reviewerOwnedCollection();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(sourceRuntimeEnvelope({
      comparison_design_source_evidence: collection
    }));
  const source = buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(
    sourceRuntimeEnvelope()
  );

  assert.equal(review.review_state, READY_STATE);
  assert.equal(source.source_state, "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE");
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.deepEqual(source.evidence_readiness_reconciliation.satisfied_dimensions, []);
  assert.ok(
    source.evidence_readiness_reconciliation.unsatisfied_dimensions.includes(
      "comparison_design_adequacy"
    )
  );
  assert.equal(source.promotion_boundary.promotion_authorized, false);
});
