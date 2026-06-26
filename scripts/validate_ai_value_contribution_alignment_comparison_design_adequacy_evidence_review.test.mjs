import assert from "node:assert/strict";
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

const READY_STATE =
  "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING";
const HOLD_STATE = "HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const EXPECTED_REF =
  "internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06";

let cachedRuntime = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceRuntime() {
  if (cachedRuntime) return clone(cachedRuntime);
  cachedRuntime = JSON.parse(
    execFileSync("npm", [
      "run",
      "--silent",
      "run:ai-value-contribution-alignment-internal-bayesian-execution-runtime"
    ], { encoding: "utf8" })
  );
  return clone(cachedRuntime);
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

test("comparison-design evidence review defaults to held when governed evidence is missing", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(runtime);
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(
    review,
    { sourceRuntime: runtime }
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

test("comparison-design evidence review can emit hash-bound evidence from explicit reviewed package", () => {
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

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, READY_STATE);
  assert.equal(review.review_policy.evidence_source_binding_authorized, true);
  assert.equal(review.evidence_satisfaction.evidence_satisfied, true);
  assert.equal(review.evidence_satisfaction.reviewed_source_evidence_ref, EXPECTED_REF);
  assert.match(review.evidence_satisfaction.reviewed_source_evidence_hash, /^[0-9a-f]{64}$/);
  assert.match(review.evidence_satisfaction.source_evidence_hash, /^[0-9a-f]{64}$/);
  assert.equal(review.evidence_satisfaction.aggregate_only_scope, true);
  assert.equal(review.evidence_satisfaction.suppressed_missing_held_windows_clear, true);
  assert.equal(review.evidence_satisfaction.eligible_for_satisfied_representation, true);
  assert.equal(review.evidence_satisfaction.placeholder_evidence, false);
  assert.equal(review.evidence_satisfaction.generated_fixture_evidence, false);
  assert.equal(review.comparison_design_review.causality_claim_authorized, false);
  assert.equal(review.promotion_boundary.promotion_authorized, false);
  assert.equal(review.feeds.governed_diagnostics_sufficiency_evidence_source, false);
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

test("comparison-design review alone cannot complete governed diagnostics sufficiency source", () => {
  const runtime = sourceRuntime();
  const sourcePackage = validComparisonDesignSourcePackage(runtime);
  const review =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: runtime,
      comparison_design_source_evidence: sourcePackage
    });
  const source = buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(
    runtime
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
