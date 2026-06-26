import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildContributionAlignmentFeatureStabilityReviewFromObject
} from "./run_ai_value_contribution_alignment_feature_stability_review.mjs";
import {
  buildContributionAlignmentInternalNumericWeightDecisionFromObject
} from "./run_ai_value_contribution_alignment_internal_numeric_weight_decision.mjs";
import {
  buildContributionAlignmentVersionedWeightObjectFromObject
} from "./run_ai_value_contribution_alignment_versioned_weight_object.mjs";
import {
  buildContributionAlignmentWeightedInternalModelFrameFromObject
} from "./run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs";
import {
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs";
import {
  buildContributionAlignmentBayesianModelSpecificationFromObject
} from "./run_ai_value_contribution_alignment_bayesian_model_specification.mjs";
import {
  buildContributionAlignmentInternalBayesianExecutionGateFromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";
import {
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";
import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject
} from "./run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject
} from "./run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";
import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs";
import {
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject
} from "./run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs";
import {
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_artifact_v1.mjs";
import {
  buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject,
  contributionAlignmentBayesianHardeningOrchestratorReportHash,
  validateContributionAlignmentBayesianHardeningOrchestratorReport
} from "./run_ai_value_contribution_alignment_bayesian_hardening_orchestrator.mjs";

const REPORT_READY_STATE = "BAYESIAN_HARDENING_ORCHESTRATOR_REPORT_READY";
const DEFAULT_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const EXPLICIT_NEXT_STEP = "posterior_interpretation_specification_gate_only";

const DIMENSIONS = [
  "comparison_design_adequacy",
  "convergence_diagnostics",
  "posterior_predictive_checks",
  "prior_sensitivity",
  "residual_fit_checks",
  "calibration_backtest",
  "feature_weight_provenance"
];

const BLOCKED_OUTPUT_FIELDS = [
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "weighted_internal_model_output",
  "aggregate_score_output",
  "research_model_feed",
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
  "live_connector_execution",
  "raw_rows",
  "query_text",
  "identifiers",
  "prompts",
  "transcripts",
  "person_level_data"
];

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";

const AGGREGATE_WINDOWS = [
  {
    aggregate_window_id: "agg_window_ai_exposed_baseline",
    comparison_role: "ai_exposed",
    window_role: "baseline",
    selected_metric_mean: 10,
    selected_metric_standard_error: 0.4,
    cohort_size: 12
  },
  {
    aggregate_window_id: "agg_window_ai_exposed_comparison",
    comparison_role: "ai_exposed",
    window_role: "comparison",
    selected_metric_mean: 13,
    selected_metric_standard_error: 0.5,
    cohort_size: 12
  },
  {
    aggregate_window_id: "agg_window_comparison_baseline",
    comparison_role: "comparison",
    window_role: "baseline",
    selected_metric_mean: 9,
    selected_metric_standard_error: 0.4,
    cohort_size: 12
  },
  {
    aggregate_window_id: "agg_window_comparison_comparison",
    comparison_role: "comparison",
    window_role: "comparison",
    selected_metric_mean: 10,
    selected_metric_standard_error: 0.5,
    cohort_size: 12
  }
];

let cachedRuntime = null;

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

function sourceDataModel() {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  return JSON.parse(output);
}

function sourceRuntime() {
  if (cachedRuntime) return clone(cachedRuntime);
  const sourceFeatureStabilityReview =
    buildContributionAlignmentFeatureStabilityReviewFromObject(sourceDataModel());
  const sourceWeightDecision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(
      sourceFeatureStabilityReview
    );
  const sourceWeightObject = buildContributionAlignmentVersionedWeightObjectFromObject(
    sourceWeightDecision,
    { sourceFeatureStabilityReview }
  );
  const sourceFrame = buildContributionAlignmentWeightedInternalModelFrameFromObject(
    sourceWeightObject,
    { sourceWeightDecision, sourceFeatureStabilityReview }
  );
  const sourceReadinessReview =
    buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
      sourceFrame,
      { sourceWeightObject }
    );
  const sourceSpecification =
    buildContributionAlignmentBayesianModelSpecificationFromObject(
      sourceReadinessReview,
      { sourceFrame, sourceWeightObject }
    );
  const sourceGate = buildContributionAlignmentInternalBayesianExecutionGateFromObject(
    sourceSpecification,
    { sourceReadinessReview, sourceFrame }
  );
  cachedRuntime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  return clone(cachedRuntime);
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

function sourceEvidenceHash(runtime, dimension, sourceEvidenceRef, reviewedHash) {
  return sha256Json({
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06",
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

function reviewedEvidenceManifestHash(manifest) {
  const withoutHash = clone(manifest);
  delete withoutHash.manifest_hash;
  return sha256Json(withoutHash);
}

function reviewedEvidenceInput(runtime) {
  const evidenceDimensions = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const sourceRef = reviewedSourceEvidenceRef(dimension);
      const reviewedHash = reviewedSourceEvidenceHash(dimension);
      return [
        dimension,
        {
          reviewed_source_evidence_ref: sourceRef,
          reviewed_source_evidence_hash: reviewedHash,
          source_evidence_hash: sourceEvidenceHash(runtime, dimension, sourceRef, reviewedHash),
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
  return {
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
    evidence_dimensions: evidenceDimensions
  };
}

function explicitPromotionPath(runtime = sourceRuntime()) {
  const reviewedEvidence = reviewedEvidenceInput(runtime);
  const governedSource =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject({
      source_runtime: runtime,
      reviewed_diagnostics_source_evidence: reviewedEvidence
    });
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: governedSource
  });
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: governedSource
  });
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    source_runtime: runtime,
    source_diagnostics_evidence_packet: packet
  });
  const handoff = buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
    source_runtime: runtime,
    source_governed_diagnostics_sufficiency_evidence_source: governedSource,
    source_diagnostics_review: review,
    source_diagnostics_evidence_packet: packet,
    source_promotion_gate: gate
  });
  const artifact = buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
    source_promotion_handoff: handoff,
    source_promotion_gate: gate,
    source_runtime: runtime,
    source_diagnostics_review: review,
    source_diagnostics_evidence_packet: packet,
    source_governed_diagnostics_sufficiency_evidence_source: governedSource
  });
  return { runtime, reviewedEvidence, governedSource, review, packet, gate, handoff, artifact };
}

function orchestratorInput(path = explicitPromotionPath()) {
  return {
    source_runtime: path.runtime,
    explicit_governed_path: {
      source_reviewed_diagnostics_source_evidence: path.reviewedEvidence,
      source_governed_diagnostics_sufficiency_evidence_source: path.governedSource,
      source_diagnostics_review: path.review,
      source_diagnostics_evidence_packet: path.packet,
      source_promotion_gate: path.gate,
      source_promotion_handoff: path.handoff,
      source_internal_bayesian_execution_artifact_v1: path.artifact
    }
  };
}

test("Bayesian hardening orchestrator confirms default path remains held", () => {
  const runtime = sourceRuntime();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: runtime
    });
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
      sourceRuntime: runtime
    });

  assert.equal(report.report_state, REPORT_READY_STATE);
  assert.equal(report.default_execution.confirmed_held, true);
  assert.equal(report.default_execution.first_blocked_gate, "governed_diagnostics_sufficiency_evidence_source");
  assert.equal(report.default_execution.allowed_next_step, DEFAULT_NEXT_STEP);
  assert.equal(report.default_execution.steps[1].supplied, false);
  assert.equal(report.default_execution.steps[1].hash, null);
  assert.equal(report.verification_status.stopped_at_first_blocked_gate, true);
  assert.equal(report.allowed_next_step, DEFAULT_NEXT_STEP);
  assert.equal(report.report_policy.promotion_authorized, false);
  assert.equal(report.explicit_governed_path.supplied, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("Bayesian hardening orchestrator READY validation requires sourceRuntime", () => {
  const runtime = sourceRuntime();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: runtime
    });
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report);

  assert.equal(report.report_state, REPORT_READY_STATE);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceRuntime is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator reports explicit governed path and derived next gate", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(
      orchestratorInput(path)
    );
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
      sourceRuntime: path.runtime,
      explicitGovernedPath: orchestratorInput(path).explicit_governed_path
    });

  assert.equal(report.report_state, REPORT_READY_STATE);
  assert.equal(report.default_execution.confirmed_held, true);
  assert.equal(report.explicit_governed_path.supplied, true);
  assert.equal(report.explicit_governed_path.completed, true);
  assert.equal(report.explicit_governed_path.first_blocked_gate, null);
  assert.equal(report.allowed_next_step, EXPLICIT_NEXT_STEP);
  assert.equal(report.current_gate, "internal_bayesian_execution_artifact_v1");
  assert.equal(report.report_policy.promotion_authorized, false);
  assert.equal(report.promotion_authority.orchestrator_promotion_authorized, false);
  assert.equal(report.promotion_authority.only_existing_gate_artifacts_may_authorize_promotion, true);
  assert.equal(report.artifact_hashes.runtime_hash, path.runtime.runtime_hash);
  assert.equal(report.artifact_hashes.governed_diagnostics_sufficiency_evidence_source_hash, path.governedSource.evidence_hash);
  assert.equal(report.artifact_hashes.diagnostics_review_hash, path.review.review_hash);
  assert.equal(report.artifact_hashes.diagnostics_evidence_packet_hash, path.packet.packet_hash);
  assert.equal(report.artifact_hashes.bayesian_promotion_gate_hash, path.gate.gate_hash);
  assert.equal(report.artifact_hashes.promotion_handoff_hash, path.handoff.handoff_hash);
  assert.equal(report.artifact_hashes.internal_bayesian_execution_artifact_v1_hash, path.artifact.artifact_hash);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("Bayesian hardening orchestrator explicit governed path requires reviewed diagnostics source evidence", () => {
  const path = explicitPromotionPath();
  const input = {
    source_runtime: path.runtime,
    explicit_governed_path: {
      source_governed_diagnostics_sufficiency_evidence_source: path.governedSource,
      source_diagnostics_evidence_packet: path.packet,
      source_diagnostics_review: path.review,
      source_promotion_gate: path.gate,
      source_promotion_handoff: path.handoff,
      source_internal_bayesian_execution_artifact_v1: path.artifact
    }
  };
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(input);
  const governedStep = report.explicit_governed_path.steps.find(
    (step) => step.step === "governed_diagnostics_sufficiency_evidence_source"
  );
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
      sourceRuntime: path.runtime,
      explicitGovernedPath: input.explicit_governed_path
    });

  assert.equal(report.explicit_governed_path.supplied, true);
  assert.equal(report.explicit_governed_path.completed, false);
  assert.equal(
    report.explicit_governed_path.first_blocked_gate,
    "governed_diagnostics_sufficiency_evidence_source"
  );
  assert.equal(report.allowed_next_step, DEFAULT_NEXT_STEP);
  assert.equal(governedStep.validation_valid, false);
  assert.ok(
    governedStep.validation_gaps.some((gap) =>
      /reviewedDiagnosticsSourceEvidence is required/.test(gap)
    ),
    governedStep.validation_gaps.join("; ")
  );
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /explicit governed path contains supplied artifacts/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator stops at missing explicit gates", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
    source_runtime: path.runtime,
    explicit_governed_path: {
      source_reviewed_diagnostics_source_evidence: path.reviewedEvidence,
      source_governed_diagnostics_sufficiency_evidence_source: path.governedSource
    }
  });

  assert.equal(report.explicit_governed_path.supplied, true);
  assert.equal(report.explicit_governed_path.completed, false);
  assert.equal(report.explicit_governed_path.first_blocked_gate, "diagnostics_evidence_packet");
  assert.equal(report.allowed_next_step, "diagnostics_evidence_packet_update_only");
  assert.equal(report.report_policy.promotion_authorized, false);
});

test("Bayesian hardening orchestrator validation fails on invalid supplied explicit artifacts", () => {
  const path = explicitPromotionPath();
  const forgedSource = clone(path.governedSource);
  forgedSource.evidence_hash = "0".repeat(64);
  const input = {
    source_runtime: path.runtime,
    explicit_governed_path: {
      source_reviewed_diagnostics_source_evidence: path.reviewedEvidence,
      source_governed_diagnostics_sufficiency_evidence_source: forgedSource,
      source_diagnostics_evidence_packet: path.packet,
      source_diagnostics_review: path.review,
      source_promotion_gate: path.gate,
      source_promotion_handoff: path.handoff,
      source_internal_bayesian_execution_artifact_v1: path.artifact
    }
  };
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(input);
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
      sourceRuntime: path.runtime,
      explicitGovernedPath: input.explicit_governed_path
    });

  assert.equal(report.explicit_governed_path.supplied, true);
  assert.equal(report.explicit_governed_path.completed, false);
  assert.equal(report.explicit_governed_path.first_blocked_gate, "governed_diagnostics_sufficiency_evidence_source");
  assert.equal(report.verification_status.explicit_path_validated, false);
  assert.equal(report.allowed_next_step, DEFAULT_NEXT_STEP);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /explicit.*validation|evidence.*hash/i.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator explicit READY validation requires explicitGovernedPath", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(
      orchestratorInput(path)
    );
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
      sourceRuntime: path.runtime
    });

  assert.equal(report.report_state, REPORT_READY_STATE);
  assert.equal(report.explicit_governed_path.supplied, true);
  assert.equal(report.explicit_governed_path.completed, true);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /explicitGovernedPath is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator keeps all blocked outputs blocked", () => {
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(
      orchestratorInput()
    );

  for (const field of BLOCKED_OUTPUT_FIELDS) {
    assert.equal(report.blocked_outputs[field], false, `blocked_outputs.${field}`);
    assert.equal(report.feeds[field], false, `feeds.${field}`);
  }
  assert.equal(report.feeds.posterior_interpretation_specification_gate, false);
  assert.equal(report.feeds.live_connector_execution, false);
  assert.equal(report.feeds.route_creation, false);
  assert.equal(report.feeds.schema_creation, false);
  assert.equal(report.feeds.persistence_write, false);
  assert.equal(report.feeds.export_creation, false);
});

test("Bayesian hardening orchestrator rejects promotion side doors after rehash", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(
      orchestratorInput(path)
    );
  const forged = clone(report);
  forged.report_policy.promotion_authorized = true;
  forged.feeds.confidence_output = true;
  forged.report_hash = contributionAlignmentBayesianHardeningOrchestratorReportHash(forged);
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(forged, {
      sourceRuntime: path.runtime,
      explicitGovernedPath: orchestratorInput(path).explicit_governed_path
    });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /promotion_authorized|confidence_output/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator rejects unknown nested sidecars after rehash", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(
      orchestratorInput(path)
    );
  const forged = clone(report);
  forged.feeds.customer_roi_probability = true;
  forged.blocked_outputs.live_connector_payload = true;
  forged.report_policy.customer_facing_output = true;
  forged.verification_status.live_connector_execution = true;
  forged.report_hash = contributionAlignmentBayesianHardeningOrchestratorReportHash(forged);
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(forged, {
      sourceRuntime: path.runtime,
      explicitGovernedPath: orchestratorInput(path).explicit_governed_path
    });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /ungoverned field|customer_roi_probability|live_connector/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator rejects forged default execution details after rehash", () => {
  const runtime = sourceRuntime();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: runtime
    });
  const forged = clone(report);
  forged.default_execution.steps[0].state =
    "GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW";
  forged.default_execution.steps[0].ready = true;
  forged.default_execution.steps[0].validation_valid = true;
  forged.report_hash = contributionAlignmentBayesianHardeningOrchestratorReportHash(forged);
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(forged, {
      sourceRuntime: runtime
    });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /default execution.*sourceRuntime|mismatch/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator rejects fabricated governed evidence input without echo", () => {
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: sourceRuntime(),
      reviewed_diagnostics_source_evidence: {
        reviewed_source_evidence_ref: "fabricated_customer_probability_evidence",
        raw_rows: [{ user_id: "person@example.com" }]
      }
    });
  const validation = validateContributionAlignmentBayesianHardeningOrchestratorReport(report);
  const serialized = JSON.stringify(report);

  assert.equal(report.report_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("fabricated_customer_probability_evidence"), false);
});

test("Bayesian hardening orchestrator rejects nested fabricated evidence sidecars", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: path.runtime,
      explicit_governed_path: {
        source_governed_diagnostics_sufficiency_evidence_source: path.governedSource,
        reviewed_diagnostics_source_evidence: {
          reviewed_source_evidence_ref: "fabricated_customer_probability_evidence",
          raw_rows: [{ user_id: "person@example.com" }]
        }
      }
    });
  const validation = validateContributionAlignmentBayesianHardeningOrchestratorReport(report);
  const serialized = JSON.stringify(report);

  assert.equal(report.report_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("fabricated_customer_probability_evidence"), false);
});

test("Bayesian hardening orchestrator rejects reviewed evidence without governed source", () => {
  const path = explicitPromotionPath();
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: path.runtime,
      explicit_governed_path: {
        source_reviewed_diagnostics_source_evidence: path.reviewedEvidence
      }
    });
  const validation = validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
    sourceRuntime: path.runtime,
    explicitGovernedPath: {
      source_reviewed_diagnostics_source_evidence: path.reviewedEvidence
    }
  });

  assert.equal(report.report_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /boundary leakage rejected/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian hardening orchestrator rejects unsafe nested reviewed evidence without echo", () => {
  const path = explicitPromotionPath();
  const unsafeReviewedEvidence = clone(path.reviewedEvidence);
  unsafeReviewedEvidence.raw_rows = [
    { user_id: "person@example.com", prompt: "leak" }
  ];
  const report =
    buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: path.runtime,
      explicit_governed_path: {
        source_reviewed_diagnostics_source_evidence: unsafeReviewedEvidence,
        source_governed_diagnostics_sufficiency_evidence_source: path.governedSource
      }
    });
  const validation = validateContributionAlignmentBayesianHardeningOrchestratorReport(report);
  const serialized = `${JSON.stringify(report)} ${JSON.stringify(validation)}`;

  assert.equal(report.report_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("\"prompt\":\"leak\""), false);
});

test("Bayesian hardening orchestrator runner remains report-only without write/export/live behavior", () => {
  const runner = execFileSync(
    "sed",
    ["-n", "1,760p", "scripts/run_ai_value_contribution_alignment_bayesian_hardening_orchestrator.mjs"],
    { encoding: "utf8" }
  );
  const packageJson = execFileSync("sed", ["-n", "1,260p", "package.json"], {
    encoding: "utf8"
  });
  const forbidden = [
    "writeFileSync",
    "appendFileSync",
    "createWriteStream",
    "--output",
    "export_url",
    "fetch(",
    "prisma",
    "dogfood-output"
  ];

  for (const needle of forbidden) {
    assert.equal(runner.includes(needle), false, `runner includes ${needle}`);
  }
  assert.equal(
    /run:ai-value-contribution-alignment-bayesian-hardening-orchestrator[^"]*"[^"]*>\s*(?!\/tmp)/.test(packageJson),
    false
  );
});

test("Bayesian hardening orchestrator CLI accepts reviewed diagnostics evidence for explicit validation", () => {
  const path = explicitPromotionPath();
  const tempDir = mkdtempSync(join(tmpdir(), "fluencytracr-orchestrator-"));
  const files = {
    runtime: join(tempDir, "runtime.json"),
    reviewedEvidence: join(tempDir, "reviewed-evidence.json"),
    governedSource: join(tempDir, "governed-source.json"),
    packet: join(tempDir, "packet.json"),
    review: join(tempDir, "review.json"),
    gate: join(tempDir, "gate.json"),
    handoff: join(tempDir, "handoff.json"),
    artifact: join(tempDir, "artifact.json")
  };
  for (const [key, filePath] of Object.entries(files)) {
    const payload = {
      runtime: path.runtime,
      reviewedEvidence: path.reviewedEvidence,
      governedSource: path.governedSource,
      packet: path.packet,
      review: path.review,
      gate: path.gate,
      handoff: path.handoff,
      artifact: path.artifact
    }[key];
    writeFileSync(filePath, `${JSON.stringify(payload)}\n`);
  }

  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_bayesian_hardening_orchestrator.mjs",
      files.runtime,
      "--reviewed-diagnostics-source-evidence",
      files.reviewedEvidence,
      files.governedSource,
      files.packet,
      files.review,
      files.gate,
      files.handoff,
      files.artifact
    ],
    { encoding: "utf8" }
  );
  const report = JSON.parse(output);
  const validation =
    validateContributionAlignmentBayesianHardeningOrchestratorReport(report, {
      sourceRuntime: path.runtime,
      explicitGovernedPath: orchestratorInput(path).explicit_governed_path
    });

  assert.equal(report.report_state, REPORT_READY_STATE);
  assert.equal(report.explicit_governed_path.completed, true);
  assert.equal(report.allowed_next_step, EXPLICIT_NEXT_STEP);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
});
