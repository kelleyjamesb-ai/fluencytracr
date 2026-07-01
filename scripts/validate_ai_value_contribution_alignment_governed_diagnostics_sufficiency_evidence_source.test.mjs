import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject
} from "./run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject
} from "./run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs";
import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs";
import {
  buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource,
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash,
  validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";
import {
  contributionAlignmentInternalBayesianExecutionRuntimeHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";

const SOURCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_2026_06";
const READY_STATE =
  "GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW";
const HOLD_STATE =
  "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const AGGREGATE_WINDOWS_PATH =
  "docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-runtime/examples/aggregate-window-runtime-fixture.json";

const DIMENSIONS = [
  "comparison_design_adequacy",
  "convergence_diagnostics",
  "posterior_predictive_checks",
  "prior_sensitivity",
  "residual_fit_checks",
  "calibration_backtest",
  "feature_weight_provenance"
];

const FALSE_FEEDS = [
  "bayesian_promotion_decision_gate",
  "internal_bayesian_execution_artifact_v1",
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "customer_facing_output",
  "economic_output",
  "roi_output",
  "finance_output",
  "causality_output",
  "productivity_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution"
];

let cachedRuntimeSource = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Json(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function sourceRuntimeSource() {
  if (cachedRuntimeSource) return clone(cachedRuntimeSource);
  const sourceGate = JSON.parse(
    execFileSync("npm", [
      "run",
      "--silent",
      "run:ai-value-contribution-alignment-internal-bayesian-execution-gate"
    ], { encoding: "utf8" })
  );
  const runtime = JSON.parse(
    execFileSync("npm", [
      "run",
      "--silent",
      "run:ai-value-contribution-alignment-internal-bayesian-execution-runtime"
    ], { encoding: "utf8" })
  );
  cachedRuntimeSource = {
    source_runtime: runtime,
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: JSON.parse(
      readFileSync(AGGREGATE_WINDOWS_PATH, "utf8")
    )
  };
  return clone(cachedRuntimeSource);
}

function sourceRuntime() {
  return sourceRuntimeSource().source_runtime;
}

function sourceRuntimeEnvelope(overrides = {}) {
  return {
    ...sourceRuntimeSource(),
    ...overrides
  };
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

function reviewedSourceEvidenceRef(dimension) {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function reviewedSourceEvidenceHash(dimension) {
  return sha256Json({
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_HASH_2026_06",
    evidence_dimension: dimension,
    reviewed_source_evidence_ref: reviewedSourceEvidenceRef(dimension),
    aggregate_only_scope: true,
    reviewed_internal_source_attestation: "governed_diagnostics_sufficiency_evidence_source"
  });
}

function reviewedEvidenceManifestHash(manifest) {
  const withoutHash = clone(manifest);
  delete withoutHash.manifest_hash;
  return sha256Json(withoutHash);
}

function legacyRuntimeOnlyDimensionHash(runtime, dimension, sourceEvidenceRef) {
  return sha256Json({
    schema_version: "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06",
    evidence_dimension: dimension,
    source_evidence_ref: sourceEvidenceRef,
    source_runtime_hash: runtime.runtime_hash,
    source_fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
}

function expectedDimensionHash(runtime, dimension, sourceEvidenceRef, reviewedHash) {
  return sha256Json({
    schema_version: "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06",
    evidence_dimension: dimension,
    source_evidence_ref: sourceEvidenceRef,
    reviewed_source_evidence_hash: reviewedHash,
    source_runtime_hash: runtime.runtime_hash,
    source_fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
}

function governedEvidenceInput(runtime, overrides = {}) {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const sourceEvidenceRef = reviewedSourceEvidenceRef(dimension);
      const reviewedHash = reviewedSourceEvidenceHash(dimension);
      return [
        dimension,
        {
          reviewed_source_evidence_ref: sourceEvidenceRef,
          reviewed_source_evidence_hash: reviewedHash,
          source_evidence_hash: expectedDimensionHash(
            runtime,
            dimension,
            sourceEvidenceRef,
            reviewedHash
          ),
          aggregate_only_scope: true,
          suppressed_missing_held_windows_clear: true,
          eligible_for_satisfied_representation: true,
          placeholder_evidence: false,
          generated_fixture_evidence: false,
          evidence_satisfied: true
        }
      ];
    })
  );
  const manifest = {
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_2026_06",
    manifest_state: "REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_INTERNAL_ONLY",
    internal_only: true,
    aggregate_only: true,
    source_runtime_ref: {
      runtime_hash: runtime.runtime_hash,
      fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash
    },
    evidence_dimensions: Object.fromEntries(
      DIMENSIONS.map((dimension) => [
        dimension,
        {
          reviewed_source_evidence_ref: reviewedSourceEvidenceRef(dimension),
          reviewed_source_evidence_hash: reviewedSourceEvidenceHash(dimension),
          aggregate_only_scope: true
        }
      ])
    )
  };
  manifest.manifest_hash = reviewedEvidenceManifestHash(manifest);
  const evidence = {
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_REFS_2026_06",
    evidence_review_state: "REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_INTERNAL_ONLY",
    internal_only: true,
    aggregate_only: true,
    source_runtime_ref: {
      runtime_hash: runtime.runtime_hash,
      fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash
    },
    reviewed_evidence_manifest_hash: manifest.manifest_hash,
    reviewed_evidence_manifest: manifest,
    evidence_dimensions: dimensions,
  };
  return {
    ...evidence,
    ...overrides
  };
}

test("governed diagnostics sufficiency evidence source defaults to unsatisfied hold", () => {
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(
      sourceRuntimeEnvelope()
    );
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions()
  );

  assert.equal(validation.valid, false);
  assert.equal(source.schema_version, SOURCE_SCHEMA_VERSION);
  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(source.source_policy.internal_only, true);
  assert.equal(source.source_policy.aggregate_only, true);
  assert.equal(source.source_policy.promotion_authorized, false);
  assert.equal(source.source_policy.posterior_interpretation_authorized, false);
  assert.equal(source.source_policy.confidence_output_authorized, false);
  assert.equal(source.source_policy.probability_output_authorized, false);
  assert.equal(source.source_policy.customer_output_authorized, false);
  assert.equal(source.source_policy.economic_output_authorized, false);
  assert.equal(source.source_policy.roi_output_authorized, false);
  assert.equal(source.source_policy.productivity_output_authorized, false);
  assert.equal(source.source_policy.causality_output_authorized, false);
  assert.equal(source.source_policy.finance_output_authorized, false);
  assert.equal(source.allowed_next_step, "complete_governed_diagnostics_sufficiency_evidence_source");
  assert.equal(source.boundary_policy.receives_reviewed_diagnostics_source_evidence_refs, false);
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(
    source.evidence_readiness_reconciliation.reconciliation_state,
    "HOLD_MISSING_GOVERNED_REVIEWED_EVIDENCE"
  );
  assert.equal(source.evidence_readiness_reconciliation.governed_reviewed_evidence_supplied, false);
  assert.deepEqual(source.evidence_readiness_reconciliation.satisfied_dimensions, []);
  assert.deepEqual(source.evidence_readiness_reconciliation.unsatisfied_dimensions, DIMENSIONS);
  for (const dimension of DIMENSIONS) {
    assert.equal(source.evidence_dimensions[dimension].evidence_satisfied, false);
    assert.equal(source.evidence_dimensions[dimension].reviewed_source_evidence_hash, null);
    assert.equal(source.evidence_dimensions[dimension].source_evidence_hash, null);
    assert.deepEqual(
      source.evidence_readiness_reconciliation.missing_evidence_by_dimension[dimension],
      [
        "reviewed_source_evidence_ref",
        "reviewed_source_evidence_hash",
        "source_evidence_hash",
        "aggregate_only_scope",
        "suppressed_missing_held_windows_clear",
        "eligible_for_satisfied_representation",
        "evidence_satisfied"
      ],
      `${dimension} missing evidence report`
    );
  }
  for (const feed of FALSE_FEEDS) {
    assert.equal(source.feeds[feed], false, `${feed} must remain false`);
  }
});

test("governed diagnostics sufficiency evidence source accepts only explicit governed evidence refs and hashes", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(source.source_state, READY_STATE);
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, true);
  assert.equal(
    source.evidence_readiness_reconciliation.reconciliation_state,
    "GOVERNED_REVIEWED_EVIDENCE_COMPLETE"
  );
  assert.equal(source.evidence_readiness_reconciliation.governed_reviewed_evidence_supplied, true);
  assert.deepEqual(source.evidence_readiness_reconciliation.satisfied_dimensions, DIMENSIONS);
  assert.deepEqual(source.evidence_readiness_reconciliation.unsatisfied_dimensions, []);
  assert.equal(source.allowed_next_step, "diagnostics_evidence_packet_update_only");
  assert.equal(source.source_policy.promotion_authorized, false);
  assert.equal(source.promotion_boundary.promotion_authorized, false);
  assert.equal(source.promotion_boundary.internal_bayesian_execution_artifact_v1_authorized, false);
  assert.equal(source.boundary_policy.receives_reviewed_diagnostics_source_evidence_refs, true);
  for (const dimension of DIMENSIONS) {
    assert.equal(source.evidence_dimensions[dimension].evidence_satisfied, true);
    assert.equal(
      source.evidence_dimensions[dimension].reviewed_source_evidence_hash,
      reviewedSourceEvidenceHash(dimension)
    );
    assert.equal(
      source.evidence_dimensions[dimension].source_evidence_hash,
      expectedDimensionHash(
        runtime,
        dimension,
        reviewedSourceEvidenceRef(dimension),
        reviewedSourceEvidenceHash(dimension)
      )
    );
  }
});

test("governed diagnostics sufficiency evidence source rejects runtime-only self-manufactured hashes", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const dimension = "convergence_diagnostics";
  const sourceEvidenceRef = reviewedSourceEvidenceRef(dimension);
  sourceEvidenceRefs.evidence_dimensions[dimension].source_evidence_hash =
    legacyRuntimeOnlyDimensionHash(runtime, dimension, sourceEvidenceRef);

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(source.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /convergence_diagnostics source evidence hash is invalid/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source rejects arbitrary reviewed hashes even when source hashes recompute", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  for (const dimension of DIMENSIONS) {
    const forgedReviewedHash = sha256Json({
      dimension,
      forged_review: "not_a_governed_review_manifest"
    });
    const sourceEvidenceRef = reviewedSourceEvidenceRef(dimension);
    sourceEvidenceRefs.evidence_dimensions[dimension].reviewed_source_evidence_hash =
      forgedReviewedHash;
    sourceEvidenceRefs.evidence_dimensions[dimension].source_evidence_hash =
      expectedDimensionHash(runtime, dimension, sourceEvidenceRef, forgedReviewedHash);
  }

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence:
      buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
  }));
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence:
      buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
  }));
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    ...sourceRuntimeEnvelope({ source_diagnostics_evidence_packet: packet })
  });

  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source), null);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_authorized, false);
});

test("governed diagnostics sufficiency evidence source rejects self-consistent forged manifest", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  for (const dimension of DIMENSIONS) {
    const forgedReviewedHash = sha256Json({
      dimension,
      forged_review: "self_consistent_but_not_governed"
    });
    const sourceEvidenceRef = reviewedSourceEvidenceRef(dimension);
    sourceEvidenceRefs.evidence_dimensions[dimension].reviewed_source_evidence_hash =
      forgedReviewedHash;
    sourceEvidenceRefs.evidence_dimensions[dimension].source_evidence_hash =
      expectedDimensionHash(runtime, dimension, sourceEvidenceRef, forgedReviewedHash);
    sourceEvidenceRefs.reviewed_evidence_manifest.evidence_dimensions[
      dimension
    ].reviewed_source_evidence_hash = forgedReviewedHash;
  }
  sourceEvidenceRefs.reviewed_evidence_manifest.manifest_hash =
    reviewedEvidenceManifestHash(sourceEvidenceRefs.reviewed_evidence_manifest);
  sourceEvidenceRefs.reviewed_evidence_manifest_hash =
    sourceEvidenceRefs.reviewed_evidence_manifest.manifest_hash;

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence:
      buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
  }));
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence:
      buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
  }));
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    ...sourceRuntimeEnvelope({ source_diagnostics_evidence_packet: packet })
  });
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(validation.valid, false);
  assert.equal(buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source), null);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.ok(
    validation.gaps.some((gap) => /not recognized governed reviewed evidence/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source feeds packet through hash-bound source", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const packetSideEvidence =
    buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source);
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence: source
  }));
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence: source
  }));
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    ...sourceRuntimeEnvelope({ source_diagnostics_evidence_packet: packet })
  });

  assert.equal(source.source_policy.promotion_authorized, false);
  assert.equal(packetSideEvidence.promotion_authorized, false);
  assert.equal(
    packet.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash,
    source.evidence_hash
  );
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(
    review.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash,
    source.evidence_hash
  );
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_authorized, true);
  assert.equal(gate.allowed_next_step, "internal_bayesian_execution_artifact_v1_only");
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, true);
  assert.equal(gate.feeds.posterior_interpretation, false);
  assert.equal(gate.feeds.confidence_output, false);
  assert.equal(gate.feeds.probability_output, false);
  assert.equal(gate.feeds.customer_facing_output, false);
});

test("governed diagnostics packet projection rejects forged ready source with recomputed hash", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const forged = clone(source);
  const dimension = "convergence_diagnostics";
  const forgedReviewedHash = sha256Json({
    dimension,
    forged_review: "self_consistent_ready_source_but_not_governed"
  });
  forged.evidence_dimensions[dimension].reviewed_source_evidence_hash =
    forgedReviewedHash;
  forged.evidence_dimensions[dimension].source_evidence_hash =
    expectedDimensionHash(
      runtime,
      dimension,
      reviewedSourceEvidenceRef(dimension),
      forgedReviewedHash
    );
  forged.evidence_hash =
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(forged);

  assert.equal(forged.source_state, READY_STATE);
  assert.equal(
    buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(forged),
    null
  );
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    forged,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /mismatch against reviewed evidence/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source rejects placeholder generated fixture evidence", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  sourceEvidenceRefs.evidence_dimensions.convergence_diagnostics.placeholder_evidence = true;
  sourceEvidenceRefs.evidence_dimensions.convergence_diagnostics.generated_fixture_evidence = true;

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(source.evidence_dimensions.convergence_diagnostics.evidence_satisfied, false);
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(source.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /placeholder|generated_fixture|convergence_diagnostics/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source rejects placeholder refs even when flags are false", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const badRef = "placeholder_generated_fixture.convergence_diagnostics.2026_06";
  sourceEvidenceRefs.evidence_dimensions.convergence_diagnostics.reviewed_source_evidence_ref = badRef;
  sourceEvidenceRefs.evidence_dimensions.convergence_diagnostics.source_evidence_hash =
    expectedDimensionHash(
      runtime,
      "convergence_diagnostics",
      badRef,
      reviewedSourceEvidenceHash("convergence_diagnostics")
    );

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(source.source_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /boundary leakage/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source holds partial evidence and promotion remains blocked", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  delete sourceEvidenceRefs.evidence_dimensions.prior_sensitivity.source_evidence_hash;

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence:
      buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
  }));
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(sourceRuntimeEnvelope({
    source_diagnostics_sufficiency_evidence:
      buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
  }));
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    ...sourceRuntimeEnvelope({ source_diagnostics_evidence_packet: packet })
  });

  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(
    source.evidence_readiness_reconciliation.reconciliation_state,
    "HOLD_INCOMPLETE_GOVERNED_REVIEWED_EVIDENCE"
  );
  assert.deepEqual(source.evidence_readiness_reconciliation.unsatisfied_dimensions, [
    "prior_sensitivity"
  ]);
  assert.deepEqual(source.evidence_readiness_reconciliation.missing_evidence_by_dimension.prior_sensitivity, [
    "source_evidence_hash"
  ]);
  assert.ok(source.evidence_readiness_reconciliation.satisfied_dimensions.includes("convergence_diagnostics"));
  assert.equal(buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source), null);
  assert.equal(source.evidence_dimensions.prior_sensitivity.evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
});

test("governed diagnostics sufficiency evidence source rejects unsafe reviewed evidence content", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime, {
    confidence_evidence: "high confidence model score"
  });

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(source);
  const serialized = `${JSON.stringify(source)} ${JSON.stringify(validation)}`;

  assert.equal(source.source_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("high confidence model score"), false);
  assert.equal(serialized.includes("confidence_evidence"), false);
});

test("governed diagnostics sufficiency evidence source rejects reviewed evidence authorization sidecars", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime, {
    promotion_authorized: true,
    posterior_output_authorized: true,
    customer_output_authorized: true,
    economic_output_authorized: true
  });
  sourceEvidenceRefs.evidence_dimensions.convergence_diagnostics.probability_output_authorized = true;

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(source);
  const serialized = `${JSON.stringify(source)} ${JSON.stringify(validation)}`;

  assert.equal(source.source_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  assert.equal(source.promotion_boundary.promotion_authorized, false);
  assert.equal(serialized.includes("\"promotion_authorized\":true"), false);
  assert.equal(serialized.includes("\"posterior_output_authorized\":true"), false);
  assert.equal(serialized.includes("\"customer_output_authorized\":true"), false);
  assert.equal(serialized.includes("\"economic_output_authorized\":true"), false);
  assert.equal(serialized.includes("\"probability_output_authorized\":true"), false);
});

test("governed diagnostics sufficiency evidence source holds when source runtime has suppressed windows", () => {
  const runtime = sourceRuntime();
  runtime.aggregate_design_matrix.suppressed_window_count = 1;
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);
  const sourceEvidenceRefs = governedEvidenceInput(runtime);

  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      source_runtime: runtime,
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));

  assert.equal(source.source_state, HOLD_STATE);
  assert.equal(source.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(source.promotion_boundary.promotion_authorized, false);
  for (const dimension of DIMENSIONS) {
    assert.equal(source.evidence_dimensions[dimension].evidence_satisfied, false);
  }
});

test("governed diagnostics sufficiency evidence source rejects promotion and output side doors without echo", () => {
  const runtime = sourceRuntime();
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: governedEvidenceInput(runtime),
      promotion_authorized: true,
      confidence_output: "high",
      probability_output: 0.91,
      customer_facing_output: "ready",
      roi_output: "dollars",
      causality_output: "caused",
      productivity_output: "productivity",
      query_text: "SELECT user_id FROM raw_rows",
      raw_rows: [{ email: "person@example.com" }]
    }));
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(source);
  const serialized = `${JSON.stringify(source)} ${JSON.stringify(validation)}`;

  assert.equal(source.source_state, REJECT_STATE);
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "confidence_output",
    "probability_output",
    "customer_facing_output",
    "roi_output",
    "causality_output",
    "productivity_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("governed diagnostics sufficiency evidence source keeps feature weights structural internal only", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));

  assert.equal(source.feature_weight_provenance.weights_structural_internal_only, true);
  assert.equal(source.feature_weight_provenance.weights_not_confidence_scores, true);
  assert.equal(source.feature_weight_provenance.customer_facing_weight_output, false);
  assert.equal(source.evidence_dimensions.feature_weight_provenance.evidence_satisfied, true);

  source.feature_weight_provenance.weights_not_confidence_scores = false;
  source.source_hash = contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source);
  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /feature_weight|confidence/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source rejects tampered ready reconciliation metadata", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));

  source.evidence_readiness_reconciliation.satisfied_dimensions = ["convergence_diagnostics"];
  source.evidence_readiness_reconciliation.unsatisfied_dimensions = ["prior_sensitivity"];
  source.evidence_readiness_reconciliation.missing_evidence_by_dimension.prior_sensitivity = [
    "source_evidence_hash"
  ];
  source.evidence_hash = contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source);

  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(validation.valid, false);
  assert.equal(buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source), null);
  assert.ok(
    validation.gaps.some((gap) => /evidence_readiness_reconciliation/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("governed diagnostics sufficiency evidence source rejects false ready supplied marker", () => {
  const runtime = sourceRuntime();
  const sourceEvidenceRefs = governedEvidenceInput(runtime);
  const source =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
      reviewed_diagnostics_source_evidence: sourceEvidenceRefs
    }));

  source.evidence_readiness_reconciliation.governed_reviewed_evidence_supplied = false;
  source.evidence_hash = contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source);

  const validation = validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
    source,
    sourceRuntimeValidationOptions({ reviewedDiagnosticsSourceEvidence: sourceEvidenceRefs })
  );

  assert.equal(validation.valid, false);
  assert.equal(buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source), null);
  assert.ok(
    validation.gaps.some((gap) => /governed_reviewed_evidence_supplied/.test(gap)),
    validation.gaps.join("; ")
  );
});
