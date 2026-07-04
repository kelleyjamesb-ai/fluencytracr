import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION,
  CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF,
  CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF,
  INTERNAL_CONFIDENCE_CONSUMER_TOKEN,
  CONFIDENCE_OBSERVATION_MILESTONE_DAYS,
  CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
  CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
  CONFIDENCE_MODEL_RUNTIME_HOLD_STATE,
  WEAKLY_REGULARIZING_PLACEHOLDER_STATE,
  EVIDENCE_ADMISSION_REASON_CODES,
  EVIDENCE_REJECTION_REASON_CODES,
  CONFIDENCE_MODEL_BLOCKED_USES,
  BlueprintDerivedPriorProvenanceSchema,
  EvidenceAdmissionSchema,
  PosteriorWithCredibleIntervalsSchema,
  ConfidenceModelContractSchema,
  THRESHOLD_PROBABILITY_REPRESENTATION_SCHEMA_VERSION,
  EXPECTED_LOSS_REPRESENTATION_SCHEMA_VERSION,
  INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
  EXPECTED_LOSS_DECISION_THRESHOLD_EPSILON,
  MINIMUM_WORTHWHILE_EFFECT_THRESHOLD,
  INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
  ThresholdProbabilityRepresentationSchema,
  ExpectedLossRepresentationSchema,
  computeInferenceProofArtifactSelfHash,
  InferenceProofArtifactSchema
} from "../dist/index.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bindInferenceProofSelfHash(artifact) {
  artifact.hash_bindings.artifact_self_hash =
    computeInferenceProofArtifactSelfHash(artifact);
  return artifact;
}

function markInferenceProofHold(artifact, failingDiagnostics) {
  artifact.governance_state.state = "HOLD";
  artifact.governance_state.failing_diagnostics = failingDiagnostics;
  artifact.governance_state.comparison_supported_contribution_estimate_authorized =
    false;
}

// ---------------------------------------------------------------------------
// Valid example fixtures
// ---------------------------------------------------------------------------

const validPriorProvenance = {
  provenance_class: "blueprint_derived_prior_provenance",
  blueprint_hypothesis_ref: {
    hypothesis_id: "blueprint-hypothesis-001",
    blueprint_version: "blueprint_2026_06"
  },
  elicitation_basis: "internal_placeholder_not_elicited",
  is_weakly_regularizing_placeholder: true,
  placeholder_state: WEAKLY_REGULARIZING_PLACEHOLDER_STATE,
  provenance_version: "confidence_model_prior_provenance_2026_07",
  numeric_prior_parameters_present: false
};

const validAdmitted = {
  source_consumer: INTERNAL_CONFIDENCE_CONSUMER_TOKEN,
  read_path_decision_schema_version:
    CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF,
  observation_requirement_schema_version:
    CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF,
  person_level_identifiers_present: false,
  admission_state: "admitted",
  source_ref: {
    series_ref: "measurement_cell_series/demo-cell-001",
    org_scope: "org-demo",
    source_snapshot_hash: "a".repeat(64)
  },
  milestone_day: 30,
  gate_cleared: true,
  append_only: true,
  compact_refs_only: true,
  org_scoped: true,
  aggregate_only: true,
  // Series-sourced admission is bound to the read-path floor of 10; the
  // k>=5 CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR alone is not sufficient here.
  minimum_cohort_floor: CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
  cohort_size: 12,
  admission_reason_codes: [
    "gate_cleared_observation_admitted",
    "milestone_window_observed",
    "org_scoped_aggregate_cohort_met"
  ]
};

const validRejected = {
  source_consumer: INTERNAL_CONFIDENCE_CONSUMER_TOKEN,
  read_path_decision_schema_version:
    CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF,
  observation_requirement_schema_version:
    CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF,
  person_level_identifiers_present: false,
  admission_state: "rejected_fail_closed",
  fail_closed: true,
  admitted: false,
  observed_milestone_day: 45,
  rejection_reason_codes: ["milestone_day_not_in_contract"]
};

const validPosterior = {
  representation_class: "credible_intervals_only",
  parameter_name: "contribution_alignment_effect",
  credible_interval_levels: [0.5, 0.8, 0.95],
  point_estimate_output_authorized: false,
  numeric_posterior_values_withheld: true,
  internal_only: true,
  customer_output_authorized: false,
  confidence_output_authorized: false,
  probability_output_authorized: false,
  finance_output_authorized: false
};

const validContract = {
  schema_version: CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION,
  contract_class: "types_and_schemas_only",
  execution_authorized: false,
  inference_authorized: false,
  output_authorized: false,
  internal_only: true,
  runtime_hold_state: CONFIDENCE_MODEL_RUNTIME_HOLD_STATE,
  prior_provenance: validPriorProvenance,
  evidence_admissions: [validAdmitted, validRejected],
  posterior_representation: validPosterior,
  blocked_uses: [...CONFIDENCE_MODEL_BLOCKED_USES]
};

// ---------------------------------------------------------------------------
// (c) Schema-version and aligned-token constants
// ---------------------------------------------------------------------------

test("schema_version constant matches the pinned literal", () => {
  assert.equal(
    CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION,
    "FT_AI_VALUE_CONFIDENCE_MODEL_CONTRACT_2026_07"
  );
});

test("aligned read-path contract tokens are pinned exactly", () => {
  assert.equal(
    CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF,
    "FT_AI_VALUE_CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_2026_07"
  );
  assert.equal(
    CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF,
    "FT_AI_VALUE_CONFIDENCE_OBSERVATION_REQUIREMENT_2026_07"
  );
  assert.equal(INTERNAL_CONFIDENCE_CONSUMER_TOKEN, "internal_confidence_engine_only");
  assert.deepEqual([...CONFIDENCE_OBSERVATION_MILESTONE_DAYS], [0, 30, 60, 90, 180, 365]);
  assert.equal(CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR, 5);
  assert.equal(CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR, 10);
  assert.ok(EVIDENCE_ADMISSION_REASON_CODES.length > 0);
  assert.ok(EVIDENCE_REJECTION_REASON_CODES.includes("boundary_leakage_rejected"));
  assert.ok(
    EVIDENCE_REJECTION_REASON_CODES.includes(
      "confidence_observation_requirement_not_valid"
    )
  );
});

// ---------------------------------------------------------------------------
// (a) Valid examples parse
// ---------------------------------------------------------------------------

test("valid Blueprint-derived prior provenance parses", () => {
  const parsed = BlueprintDerivedPriorProvenanceSchema.parse(validPriorProvenance);
  assert.equal(parsed.numeric_prior_parameters_present, false);
});

test("valid non-placeholder prior provenance parses", () => {
  const provenance = clone(validPriorProvenance);
  provenance.is_weakly_regularizing_placeholder = false;
  provenance.placeholder_state = null;
  provenance.elicitation_basis = "blueprint_hypothesis_statement";
  BlueprintDerivedPriorProvenanceSchema.parse(provenance);
});

test("valid admitted evidence parses at every contract milestone", () => {
  for (const day of CONFIDENCE_OBSERVATION_MILESTONE_DAYS) {
    const admitted = clone(validAdmitted);
    admitted.milestone_day = day;
    const parsed = EvidenceAdmissionSchema.parse(admitted);
    assert.equal(parsed.admission_state, "admitted");
  }
});

test("valid fail-closed rejection parses", () => {
  const parsed = EvidenceAdmissionSchema.parse(validRejected);
  assert.equal(parsed.fail_closed, true);
});

test("valid posterior credible-interval representation parses", () => {
  const parsed = PosteriorWithCredibleIntervalsSchema.parse(validPosterior);
  assert.equal(parsed.numeric_posterior_values_withheld, true);
});

test("valid aggregate ConfidenceModel contract parses", () => {
  const parsed = ConfidenceModelContractSchema.parse(validContract);
  assert.equal(parsed.schema_version, CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION);
  assert.equal(parsed.execution_authorized, false);
});

// ---------------------------------------------------------------------------
// (b) Governance violations reject
// ---------------------------------------------------------------------------

test("customer_output_authorized: true rejects", () => {
  const posterior = clone(validPosterior);
  posterior.customer_output_authorized = true;
  assert.equal(PosteriorWithCredibleIntervalsSchema.safeParse(posterior).success, false);
});

test("point_estimate_output_authorized: true rejects", () => {
  const posterior = clone(validPosterior);
  posterior.point_estimate_output_authorized = true;
  assert.equal(PosteriorWithCredibleIntervalsSchema.safeParse(posterior).success, false);
});

test("posterior without interval levels rejects (no point-estimate shapes)", () => {
  const posterior = clone(validPosterior);
  posterior.credible_interval_levels = [];
  assert.equal(PosteriorWithCredibleIntervalsSchema.safeParse(posterior).success, false);
});

test("posterior with numeric point-estimate field rejects (strict)", () => {
  const posterior = clone(validPosterior);
  posterior.point_estimate = 0.42;
  assert.equal(PosteriorWithCredibleIntervalsSchema.safeParse(posterior).success, false);
});

test("missing Blueprint provenance ref rejects", () => {
  const provenance = clone(validPriorProvenance);
  delete provenance.blueprint_hypothesis_ref;
  assert.equal(BlueprintDerivedPriorProvenanceSchema.safeParse(provenance).success, false);
});

test("placeholder prior without the explicit placeholder label rejects", () => {
  const provenance = clone(validPriorProvenance);
  provenance.placeholder_state = null;
  assert.equal(BlueprintDerivedPriorProvenanceSchema.safeParse(provenance).success, false);
});

test("numeric prior parameters flagged present reject (provenance only)", () => {
  const provenance = clone(validPriorProvenance);
  provenance.numeric_prior_parameters_present = true;
  assert.equal(BlueprintDerivedPriorProvenanceSchema.safeParse(provenance).success, false);
});

test("person-level identifier fields reject (strict schemas)", () => {
  const admitted = clone(validAdmitted);
  admitted.user_email = "person@example.com";
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);

  const withPersonRef = clone(validAdmitted);
  withPersonRef.source_ref.person_id = "employee-7";
  assert.equal(EvidenceAdmissionSchema.safeParse(withPersonRef).success, false);
});

test("person_level_identifiers_present: true rejects", () => {
  const admitted = clone(validAdmitted);
  admitted.person_level_identifiers_present = true;
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);
});

test("cohort below the k>=5 floor rejects", () => {
  const admitted = clone(validAdmitted);
  admitted.cohort_size = 4;
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);

  const looseFloor = clone(validAdmitted);
  looseFloor.minimum_cohort_floor = 3;
  assert.equal(EvidenceAdmissionSchema.safeParse(looseFloor).success, false);

  const belowStatedFloor = clone(validAdmitted);
  belowStatedFloor.minimum_cohort_floor = 10;
  belowStatedFloor.cohort_size = 7;
  assert.equal(EvidenceAdmissionSchema.safeParse(belowStatedFloor).success, false);
});

test("declared floor below the series read-path floor of 10 rejects", () => {
  // Floor 5 with cohort 7 satisfies the k>=5 schema floor and the declared
  // floor, but the governing read-path decision contract hard-codes
  // minimum_cohort_size: 10 — series-sourced admission may not undercut it.
  const undercutFloor = clone(validAdmitted);
  undercutFloor.minimum_cohort_floor = 5;
  undercutFloor.cohort_size = 7;
  const result = EvidenceAdmissionSchema.safeParse(undercutFloor);
  assert.equal(result.success, false);
});

test("declared floor 10 with cohort 9 rejects (stated-floor cross-validation still enforced)", () => {
  const belowDeclared = clone(validAdmitted);
  belowDeclared.minimum_cohort_floor = 10;
  belowDeclared.cohort_size = 9;
  assert.equal(EvidenceAdmissionSchema.safeParse(belowDeclared).success, false);
});

test("cohort 10 at declared floor 10 is admitted", () => {
  const atFloor = clone(validAdmitted);
  atFloor.minimum_cohort_floor = 10;
  atFloor.cohort_size = 10;
  const parsed = EvidenceAdmissionSchema.parse(atFloor);
  assert.equal(parsed.admission_state, "admitted");
});

test("source_snapshot_hash carrying a payload-bearing string rejects", () => {
  const emailLike = clone(validAdmitted);
  emailLike.source_ref.source_snapshot_hash = "person@example.com";
  assert.equal(EvidenceAdmissionSchema.safeParse(emailLike).success, false);
});

test("malformed source_snapshot_hash rejects (non-hex and wrong length)", () => {
  const nonHex = clone(validAdmitted);
  nonHex.source_ref.source_snapshot_hash = "Z".repeat(64);
  assert.equal(EvidenceAdmissionSchema.safeParse(nonHex).success, false);

  const wrongLength = clone(validAdmitted);
  wrongLength.source_ref.source_snapshot_hash = "a3f1c9e2b8d4";
  assert.equal(EvidenceAdmissionSchema.safeParse(wrongLength).success, false);
});

test("unknown milestone token rejects", () => {
  const admitted = clone(validAdmitted);
  admitted.milestone_day = 45;
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);
});

test("unknown reason codes reject", () => {
  const admitted = clone(validAdmitted);
  admitted.admission_reason_codes = ["looks_fine_to_me"];
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);

  const rejected = clone(validRejected);
  rejected.rejection_reason_codes = ["vibes_based_rejection"];
  assert.equal(EvidenceAdmissionSchema.safeParse(rejected).success, false);
});

test("empty reason-code lists reject", () => {
  const admitted = clone(validAdmitted);
  admitted.admission_reason_codes = [];
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);
});

test("gate_cleared: false rejects (gate-cleared observations only)", () => {
  const admitted = clone(validAdmitted);
  admitted.gate_cleared = false;
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);
});

test("wrong consumer scope token rejects", () => {
  const admitted = clone(validAdmitted);
  admitted.source_consumer = "customer_dashboard_feed";
  assert.equal(EvidenceAdmissionSchema.safeParse(admitted).success, false);
});

test("contract with execution_authorized: true rejects", () => {
  const contract = clone(validContract);
  contract.execution_authorized = true;
  assert.equal(ConfidenceModelContractSchema.safeParse(contract).success, false);
});

test("contract with wrong schema_version rejects", () => {
  const contract = clone(validContract);
  contract.schema_version = "FT_AI_VALUE_CONFIDENCE_MODEL_CONTRACT_2026_08";
  assert.equal(ConfidenceModelContractSchema.safeParse(contract).success, false);
});

test("contract with weakened blocked_uses list rejects", () => {
  const contract = clone(validContract);
  contract.blocked_uses = contract.blocked_uses.filter(
    (use) => use !== "customer_facing_output"
  );
  assert.equal(ConfidenceModelContractSchema.safeParse(contract).success, false);
});

test("contract with unknown top-level key rejects (strict)", () => {
  const contract = clone(validContract);
  contract.compute_posterior = true;
  assert.equal(ConfidenceModelContractSchema.safeParse(contract).success, false);
});

// ---------------------------------------------------------------------------
// Internal-only probability representations
// (add-bayesian-inference-proof-harness, task 2.2)
// ---------------------------------------------------------------------------

const validPosteriorArtifactHash =
  "a3f1c9e2b8d4076f5a1e9c3b7d20486fa3f1c9e2b8d4076f5a1e9c3b7d20486f";

const validThresholdProbability = {
  schema_version: THRESHOLD_PROBABILITY_REPRESENTATION_SCHEMA_VERSION,
  representation_class: "internal_diagnostic_representation_only",
  internal_only: true,
  customer_output_authorized: false,
  probability_output_authorized: false,
  confidence_output_authorized: false,
  finance_output_authorized: false,
  promotion_decision_ref: null,
  parameter_name: "contribution_alignment_effect",
  minimum_worthwhile_threshold: MINIMUM_WORTHWHILE_EFFECT_THRESHOLD,
  threshold_units: "standardized_effect_sd",
  threshold_probability: 0.82,
  credible_interval_level_context: 0.8,
  derived_from_posterior_with_credible_intervals: true,
  source_posterior_parameter_name: "contribution_alignment_effect",
  source_posterior_artifact_hash: validPosteriorArtifactHash
};

const validExpectedLoss = {
  schema_version: EXPECTED_LOSS_REPRESENTATION_SCHEMA_VERSION,
  representation_class: "internal_diagnostic_representation_only",
  internal_only: true,
  customer_output_authorized: false,
  probability_output_authorized: false,
  confidence_output_authorized: false,
  finance_output_authorized: false,
  promotion_decision_ref: null,
  parameter_name: "contribution_alignment_effect",
  loss_function_declared: true,
  expected_loss: 0.03,
  decision_threshold_epsilon: EXPECTED_LOSS_DECISION_THRESHOLD_EPSILON,
  decision_rule: "act_when_expected_loss_below_epsilon_internal_only",
  source_posterior_parameter_name: "contribution_alignment_effect",
  source_posterior_artifact_hash: validPosteriorArtifactHash
};

// (c) schema_version constants match the pinned literals

test("internal probability representation schema_version constants are pinned", () => {
  assert.equal(
    THRESHOLD_PROBABILITY_REPRESENTATION_SCHEMA_VERSION,
    "FT_AI_VALUE_CONFIDENCE_THRESHOLD_PROBABILITY_REPRESENTATION_2026_07"
  );
  assert.equal(
    EXPECTED_LOSS_REPRESENTATION_SCHEMA_VERSION,
    "FT_AI_VALUE_CONFIDENCE_EXPECTED_LOSS_REPRESENTATION_2026_07"
  );
});

// (a) valid examples parse

test("valid threshold-probability representation parses", () => {
  const parsed = ThresholdProbabilityRepresentationSchema.parse(
    validThresholdProbability
  );
  assert.equal(parsed.internal_only, true);
  assert.equal(parsed.customer_output_authorized, false);
  assert.equal(parsed.promotion_decision_ref, null);
});

test("valid expected-loss representation parses", () => {
  const parsed = ExpectedLossRepresentationSchema.parse(validExpectedLoss);
  assert.equal(parsed.internal_only, true);
  assert.equal(parsed.customer_output_authorized, false);
  assert.equal(parsed.promotion_decision_ref, null);
});

// (b) governance violations reject

test("threshold-probability representation claiming customer authorization rejects", () => {
  const representation = clone(validThresholdProbability);
  representation.customer_output_authorized = true;
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(representation).success,
    false
  );
});

test("expected-loss representation claiming customer authorization rejects", () => {
  const representation = clone(validExpectedLoss);
  representation.customer_output_authorized = true;
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(representation).success,
    false
  );
});

for (const flag of [
  "probability_output_authorized",
  "confidence_output_authorized",
  "finance_output_authorized"
]) {
  test(`threshold-probability representation claiming ${flag} rejects`, () => {
    const representation = clone(validThresholdProbability);
    representation[flag] = true;
    assert.equal(
      ThresholdProbabilityRepresentationSchema.safeParse(representation)
        .success,
      false
    );
  });

  test(`expected-loss representation claiming ${flag} rejects`, () => {
    const representation = clone(validExpectedLoss);
    representation[flag] = true;
    assert.equal(
      ExpectedLossRepresentationSchema.safeParse(representation).success,
      false
    );
  });
}

test("internal_only: false rejects for both internal representations", () => {
  const thresholdRepresentation = clone(validThresholdProbability);
  thresholdRepresentation.internal_only = false;
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(thresholdRepresentation)
      .success,
    false
  );

  const lossRepresentation = clone(validExpectedLoss);
  lossRepresentation.internal_only = false;
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(lossRepresentation).success,
    false
  );
});

test("non-null promotion_decision_ref rejects (promotion is a separate human decision)", () => {
  const thresholdRepresentation = clone(validThresholdProbability);
  thresholdRepresentation.promotion_decision_ref = "promotion-decision-001";
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(thresholdRepresentation)
      .success,
    false
  );

  const lossRepresentation = clone(validExpectedLoss);
  lossRepresentation.promotion_decision_ref = "promotion-decision-001";
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(lossRepresentation).success,
    false
  );
});

test("unknown keys reject on internal representations (strict)", () => {
  const thresholdRepresentation = clone(validThresholdProbability);
  thresholdRepresentation.customer_dashboard_copy = "82% likely";
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(thresholdRepresentation)
      .success,
    false
  );

  const lossRepresentation = clone(validExpectedLoss);
  lossRepresentation.roi_estimate = 1.2;
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(lossRepresentation).success,
    false
  );
});

test("threshold_probability outside [0, 1] rejects", () => {
  const above = clone(validThresholdProbability);
  above.threshold_probability = 1.5;
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(above).success,
    false
  );

  const below = clone(validThresholdProbability);
  below.threshold_probability = -0.1;
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(below).success,
    false
  );
});

test("negative expected_loss rejects", () => {
  const representation = clone(validExpectedLoss);
  representation.expected_loss = -0.01;
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(representation).success,
    false
  );
});

test("decision_threshold_epsilon off the compiled constant rejects", () => {
  const compiledConstant = clone(validExpectedLoss);
  assert.equal(compiledConstant.decision_threshold_epsilon, 0.01);

  const tuned = clone(validExpectedLoss);
  tuned.decision_threshold_epsilon = 0.05;
  assert.equal(ExpectedLossRepresentationSchema.safeParse(tuned).success, false);

  const zero = clone(validExpectedLoss);
  zero.decision_threshold_epsilon = 0;
  assert.equal(ExpectedLossRepresentationSchema.safeParse(zero).success, false);
});

test("minimum_worthwhile_threshold off the compiled constant rejects", () => {
  const compiledConstant = clone(validThresholdProbability);
  assert.equal(compiledConstant.minimum_worthwhile_threshold, 0.2);

  const tuned = clone(validThresholdProbability);
  tuned.minimum_worthwhile_threshold = 0.5;
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(tuned).success,
    false
  );
});

test("wrong threshold_units rejects", () => {
  const representation = clone(validThresholdProbability);
  representation.threshold_units = "raw_effect";
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(representation).success,
    false
  );
});

test("parameter-name mismatch with source posterior rejects for both representations", () => {
  const thresholdRepresentation = clone(validThresholdProbability);
  thresholdRepresentation.source_posterior_parameter_name =
    "some_other_effect";
  const thresholdResult = ThresholdProbabilityRepresentationSchema.safeParse(
    thresholdRepresentation
  );
  assert.equal(thresholdResult.success, false);
  assert.ok(
    thresholdResult.error.issues.some((issue) =>
      issue.message.includes(
        'source_posterior_parameter_name "some_other_effect" does not match parameter_name "contribution_alignment_effect"'
      )
    )
  );

  const lossRepresentation = clone(validExpectedLoss);
  lossRepresentation.source_posterior_parameter_name = "some_other_effect";
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(lossRepresentation).success,
    false
  );
});

test("malformed source_posterior_artifact_hash rejects for both representations", () => {
  const nonHex = clone(validThresholdProbability);
  nonHex.source_posterior_artifact_hash = "Z".repeat(64);
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(nonHex).success,
    false
  );

  const wrongLength = clone(validThresholdProbability);
  wrongLength.source_posterior_artifact_hash = "a3f1c9e2b8d4";
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(wrongLength).success,
    false
  );

  const lossNonHex = clone(validExpectedLoss);
  lossNonHex.source_posterior_artifact_hash = "Z".repeat(64);
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(lossNonHex).success,
    false
  );

  const lossWrongLength = clone(validExpectedLoss);
  lossWrongLength.source_posterior_artifact_hash = "a3f1c9e2b8d4";
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(lossWrongLength).success,
    false
  );
});

test("credible_interval_level_context outside CREDIBLE_INTERVAL_LEVELS rejects", () => {
  const representation = clone(validThresholdProbability);
  representation.credible_interval_level_context = 0.9;
  assert.equal(
    ThresholdProbabilityRepresentationSchema.safeParse(representation).success,
    false
  );
});

// ---------------------------------------------------------------------------
// Internal synthetic inference proof artifact
// ---------------------------------------------------------------------------

const ppcSummary = {
  mean: 0.12,
  credible_interval_80: {
    lower: -0.05,
    upper: 0.28
  }
};

const validCalibrationCoverageStandardError = Math.sqrt(
  (0.8 * (1 - 0.8)) / INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
);

const validInferenceProofArtifact = {
  schema_version: INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
  artifact_class: "internal_synthetic_inference_proof",
  generated_at: "2026-07-04T00:00:00Z",
  harness_version: "confidence-inference-proof-harness-2026-07",
  lockfile_hash: "b".repeat(64),
  synthetic_generator: {
    generator_id: "synthetic-hierarchical-did-v1",
    generator_version: "2026.07.04",
    seed_range: {
      start_seed: 1000,
      end_seed: 1599
    },
    synthetic_input_hash: "c".repeat(64),
    real_data_present: false,
    customer_data_present: false,
    production_data_present: false,
    live_data_source_present: false
  },
  model_spec_binding: {
    model_family: "bayesian_hierarchical_difference_in_differences_candidate",
    estimand_name: "aggregate_selected_metric_movement",
    estimand_units: "standardized_effect_sd",
    likelihood_family: "normal_continuous_aggregate",
    link_function: "identity",
    aggregate_cell_variance_mode: "cohort_size_weighted_known_variance",
    cohort_size_enters_likelihood: true,
    missing_or_suppressed_windows_hold: true,
    missing_or_suppressed_window_evidence: {
      observed_milestone_days: [90],
      missing_milestone_days: [],
      suppressed_or_stale_milestone_days: [],
      source_evidence_hash: "f".repeat(64)
    },
    treatment_effect_pooling: "workflow",
    pooling_structure: {
      expectation_path: true,
      workflow: true,
      function: true,
      cohort: true,
      organization: true
    }
  },
  diagnostics: {
    sampler: {
      parameters: [
        {
          parameter_name: "contribution_alignment_effect",
          r_hat: 1.0,
          bulk_ess: 800,
          tail_ess: 650,
          posterior_mean_mcse: 0.01,
          interval_endpoint_mcse: 0.02,
          posterior_sd: 0.3,
          max_mcse_to_posterior_sd_ratio: 0.06666666666666667
        }
      ],
      post_warmup_divergences: 0,
      max_treedepth_saturation_rate: 0,
      max_treedepth_warning: false,
      energy_bfmi_min: 0.6,
      energy_bfmi_warning: false,
      rank_plots_recorded: true,
      energy_plots_recorded: true
    },
    posterior_predictive_checks: [
      {
        statistic_name: "pre_post_mean_movement",
        observed_value: 0.13,
        posterior_predictive_summary: ppcSummary,
        p_value: 0.52,
        pass: true
      },
      {
        statistic_name: "between_cohort_variance",
        observed_value: 0.09,
        posterior_predictive_summary: ppcSummary,
        p_value: 0.41,
        pass: true
      },
      {
        statistic_name: "within_cohort_variance",
        observed_value: 0.2,
        posterior_predictive_summary: ppcSummary,
        p_value: 0.63,
        pass: true
      },
      {
        statistic_name: "tail_or_extreme_cell_statistic",
        observed_value: 0.31,
        posterior_predictive_summary: ppcSummary,
        p_value: 0.71,
        pass: true
      },
      {
        statistic_name: "difference_in_differences_contrast",
        observed_value: 0.21,
        posterior_predictive_summary: ppcSummary,
        p_value: 0.57,
        pass: true
      }
    ],
    prior_sensitivity: {
      prior_family_documented: true,
      empirical_prior_justification_documented: true,
      prior_justification_ref: "docs/research/synthetic-prior-justification-001",
      posterior_mean_shift_in_posterior_sd: 0.2,
      pass: true
    },
    pre_trend: {
      pseudo_effect_credible_interval_80: {
        lower: -0.08,
        upper: 0.07
      },
      includes_zero: true,
      pass: true
    }
  },
  calibration: {
    per_scenario_required: true,
    scenarios: [0, 0.2, 0.5].flatMap((effect) =>
      [12, 16].map((cohortSize) => ({
        scenario_id: `effect-${effect}-k-${cohortSize}`,
        injected_effect_size_sd: effect,
        cohort_size: cohortSize,
        replication_count: INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        credible_interval_level: 0.8,
        coverage_rate: 0.8,
        coverage_standard_error: validCalibrationCoverageStandardError,
        pass: true
      }))
    )
  },
  null_checks: {
    null_effect_scenario_count: INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    false_eligibility_rate: 0.02,
    pass: true
  },
  floor_checks: {
    k4_rejected: {
      cohort_size: 4,
      outcome: "rejected_below_schema_floor",
      pass: true
    },
    k8_internal_only: {
      cohort_size: 8,
      outcome: "internal_only_display_ineligible",
      valid_internal: true,
      display_eligible: false,
      pass: true
    },
    eligible_floor_cases: [
      {
        cohort_size: 12,
        valid_internal: true,
        display_eligible: true,
        pass: true
      },
      {
        cohort_size: 16,
        valid_internal: true,
        display_eligible: true,
        pass: true
      }
    ]
  },
  peeking_control: {
    procedure: "fixed_horizon_one_look_only",
    repeated_evaluation: false,
    look_index: 1,
    total_planned_looks: 1,
    milestone_days_included: [90],
    metrics_included: ["selected_metric"],
    cohorts_included: ["synthetic-treated-vs-comparison"],
    sequential_method_name: null,
    synthetic_null_proof_hash: null,
    false_eligibility_bound: 0.05,
    pass: true
  },
  comparison_adequacy: {
    comparison_cohort_present: true,
    adequacy_proof_hash: "b".repeat(64),
    reviewer_owned_comparison_design_adequacy_ref:
      "comparison-design-adequacy-review-001",
    required_checks: [
      {
        criterion: "same_selected_metric_definition",
        pass: true
      },
      {
        criterion: "aligned_milestone_windows",
        pass: true
      },
      {
        criterion: "same_metric_direction",
        pass: true
      },
      {
        criterion: "approved_lag_handling",
        pass: true
      },
      {
        criterion: "same_expectation_path_and_context",
        pass: true
      },
      {
        criterion: "similar_pre_period_level_trend",
        pass: true
      },
      {
        criterion: "no_contamination",
        pass: true
      },
      {
        criterion: "adequate_aggregate_floors",
        pass: true
      },
      {
        criterion: "no_suppressed_or_stale_windows",
        pass: true
      }
    ],
    all_required_checks_pass: true
  },
  governance_state: {
    state: "eligible_internal_only",
    failing_diagnostics: [],
    comparison_supported_contribution_estimate_authorized: true,
    evidence_tier_only: false
  },
  hash_bindings: {
    source_posterior_hash: "d".repeat(64),
    synthetic_input_hash: "c".repeat(64),
    artifact_self_hash: "0".repeat(64)
  },
  blocked_uses: [...CONFIDENCE_MODEL_BLOCKED_USES],
  numeric_values_role: "internal_validation_inputs_not_output",
  numeric_posterior_values_customer_authorized: false,
  internal_only: true,
  customer_output_authorized: false,
  probability_output_authorized: false,
  confidence_output_authorized: false,
  finance_output_authorized: false,
  creates_route: false,
  creates_ui: false,
  writes_persistence: false,
  creates_export: false,
  renders_readout: false,
  executes_connector: false,
  promotion_decision_ref: null
};

bindInferenceProofSelfHash(validInferenceProofArtifact);

test("inference proof artifact schema_version constant is pinned", () => {
  assert.equal(
    INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
    "FT_AI_VALUE_CONFIDENCE_INFERENCE_PROOF_ARTIFACT_2026_07"
  );
});

test("valid internal synthetic inference proof artifact parses", () => {
  const parsed = InferenceProofArtifactSchema.parse(validInferenceProofArtifact);
  assert.equal(parsed.artifact_class, "internal_synthetic_inference_proof");
  assert.equal(parsed.internal_only, true);
  assert.equal(parsed.customer_output_authorized, false);
});

test("inference proof artifact rejects unknown top-level and nested keys", () => {
  const topLevel = clone(validInferenceProofArtifact);
  topLevel.customer_safe_claim = "AI impacted your business";
  assert.equal(InferenceProofArtifactSchema.safeParse(topLevel).success, false);

  const nested = clone(validInferenceProofArtifact);
  nested.diagnostics.sampler.parameters[0].confidence_score = 0.91;
  assert.equal(InferenceProofArtifactSchema.safeParse(nested).success, false);
});

test("inference proof artifact rejects real or live data flags", () => {
  for (const flag of [
    "real_data_present",
    "customer_data_present",
    "production_data_present",
    "live_data_source_present"
  ]) {
    const artifact = clone(validInferenceProofArtifact);
    artifact.synthetic_generator[flag] = true;
    assert.equal(
      InferenceProofArtifactSchema.safeParse(artifact).success,
      false
    );
  }
});

test("inference proof artifact rejects output, route, persistence, and promotion side doors", () => {
  for (const flag of [
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "finance_output_authorized",
    "numeric_posterior_values_customer_authorized",
    "creates_route",
    "creates_ui",
    "writes_persistence",
    "creates_export",
    "renders_readout",
    "executes_connector"
  ]) {
    const artifact = clone(validInferenceProofArtifact);
    artifact[flag] = true;
    assert.equal(
      InferenceProofArtifactSchema.safeParse(artifact).success,
      false,
      `${flag} should reject`
    );
  }

  const promoted = clone(validInferenceProofArtifact);
  promoted.promotion_decision_ref = "promotion-decision-001";
  assert.equal(InferenceProofArtifactSchema.safeParse(promoted).success, false);
});

test("inference proof artifact rejects malformed hashes and mismatched synthetic hash binding", () => {
  for (const path of [
    ["lockfile_hash"],
    ["synthetic_generator", "synthetic_input_hash"],
    ["hash_bindings", "source_posterior_hash"],
    ["hash_bindings", "synthetic_input_hash"],
    ["hash_bindings", "artifact_self_hash"]
  ]) {
    const artifact = clone(validInferenceProofArtifact);
    let target = artifact;
    for (const key of path.slice(0, -1)) {
      target = target[key];
    }
    target[path[path.length - 1]] = "not-a-sha";
    assert.equal(
      InferenceProofArtifactSchema.safeParse(artifact).success,
      false,
      `${path.join(".")} should reject malformed hashes`
    );
  }

  const mismatched = clone(validInferenceProofArtifact);
  mismatched.hash_bindings.synthetic_input_hash = "f".repeat(64);
  assert.equal(InferenceProofArtifactSchema.safeParse(mismatched).success, false);

  const staleSelfHash = clone(validInferenceProofArtifact);
  staleSelfHash.hash_bindings.artifact_self_hash = "e".repeat(64);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(staleSelfHash).success,
    false
  );
});

test("inference proof artifact pins blocked uses in full order", () => {
  const weakened = clone(validInferenceProofArtifact);
  weakened.blocked_uses = weakened.blocked_uses.filter(
    (use) => use !== "customer_facing_output"
  );
  assert.equal(InferenceProofArtifactSchema.safeParse(weakened).success, false);

  const reordered = clone(validInferenceProofArtifact);
  reordered.blocked_uses = [...reordered.blocked_uses].reverse();
  assert.equal(InferenceProofArtifactSchema.safeParse(reordered).success, false);
});

test("inference proof artifact enforces HOLD and eligible diagnostic naming", () => {
  const holdWithoutDiagnostic = clone(validInferenceProofArtifact);
  holdWithoutDiagnostic.governance_state.state = "HOLD";
  assert.equal(
    InferenceProofArtifactSchema.safeParse(holdWithoutDiagnostic).success,
    false
  );

  const eligibleWithDiagnostic = clone(validInferenceProofArtifact);
  eligibleWithDiagnostic.governance_state.failing_diagnostics = ["r_hat"];
  assert.equal(
    InferenceProofArtifactSchema.safeParse(eligibleWithDiagnostic).success,
    false
  );

  const validHold = clone(validInferenceProofArtifact);
  markInferenceProofHold(validHold, ["divergences"]);
  validHold.diagnostics.sampler.post_warmup_divergences = 1;
  bindInferenceProofSelfHash(validHold);
  assert.equal(InferenceProofArtifactSchema.safeParse(validHold).success, true);
});

test("inference proof artifact requires comparison adequacy before contribution-estimate authorization", () => {
  const missingComparisonProof = clone(validInferenceProofArtifact);
  delete missingComparisonProof.comparison_adequacy;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(missingComparisonProof).success,
    false
  );

  const evidenceTierAndComparisonEstimate = clone(validInferenceProofArtifact);
  evidenceTierAndComparisonEstimate.governance_state.evidence_tier_only = true;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(evidenceTierAndComparisonEstimate)
      .success,
    false
  );

  const failedRubricStillEligible = clone(validInferenceProofArtifact);
  failedRubricStillEligible.comparison_adequacy.required_checks[0].pass = false;
  failedRubricStillEligible.comparison_adequacy.all_required_checks_pass = false;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(failedRubricStillEligible).success,
    false
  );

  const failedRubricHeld = clone(failedRubricStillEligible);
  markInferenceProofHold(failedRubricHeld, ["comparison_cohort_adequacy"]);
  failedRubricHeld.governance_state.evidence_tier_only = true;
  bindInferenceProofSelfHash(failedRubricHeld);
  assert.equal(InferenceProofArtifactSchema.safeParse(failedRubricHeld).success, true);

  const holdStillAuthorizesComparisonEstimate = clone(failedRubricHeld);
  holdStillAuthorizesComparisonEstimate.governance_state.comparison_supported_contribution_estimate_authorized =
    true;
  holdStillAuthorizesComparisonEstimate.governance_state.evidence_tier_only =
    false;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(holdStillAuthorizesComparisonEstimate)
      .success,
    false
  );

  const missingRubricCriterion = clone(validInferenceProofArtifact);
  missingRubricCriterion.comparison_adequacy.required_checks =
    missingRubricCriterion.comparison_adequacy.required_checks.slice(0, -1);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(missingRubricCriterion).success,
    false
  );

  const duplicateRubricCriterion = clone(validInferenceProofArtifact);
  duplicateRubricCriterion.comparison_adequacy.required_checks[8].criterion =
    "same_selected_metric_definition";
  assert.equal(
    InferenceProofArtifactSchema.safeParse(duplicateRubricCriterion).success,
    false
  );
});

test("inference proof artifact forces failing MCMC diagnostics into HOLD", () => {
  for (const mutate of [
    (artifact) => {
      artifact.diagnostics.sampler.parameters[0].r_hat = 1.02;
    },
    (artifact) => {
      artifact.diagnostics.sampler.parameters[0].bulk_ess = 399;
    },
    (artifact) => {
      artifact.diagnostics.sampler.parameters[0].tail_ess = 399;
    },
    (artifact) => {
      artifact.diagnostics.sampler.parameters[0].max_mcse_to_posterior_sd_ratio = 0.11;
    },
    (artifact) => {
      artifact.diagnostics.sampler.parameters[0].posterior_mean_mcse = 10;
      artifact.diagnostics.sampler.parameters[0].interval_endpoint_mcse = 10;
      artifact.diagnostics.sampler.parameters[0].posterior_sd = 0.3;
      artifact.diagnostics.sampler.parameters[0].max_mcse_to_posterior_sd_ratio = 0.06;
    },
    (artifact) => {
      artifact.diagnostics.sampler.parameters[0].posterior_mean_mcse = 0.04;
      artifact.diagnostics.sampler.parameters[0].interval_endpoint_mcse = 0.02;
      artifact.diagnostics.sampler.parameters[0].posterior_sd = 1;
      artifact.diagnostics.sampler.parameters[0].max_mcse_to_posterior_sd_ratio = 0.01;
    },
    (artifact) => {
      artifact.diagnostics.sampler.post_warmup_divergences = 1;
    },
    (artifact) => {
      artifact.diagnostics.sampler.max_treedepth_warning = true;
    },
    (artifact) => {
      artifact.diagnostics.sampler.energy_bfmi_warning = true;
    }
  ]) {
    const artifact = clone(validInferenceProofArtifact);
    mutate(artifact);
    assert.equal(InferenceProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("inference proof artifact forces unsupported likelihood families into HOLD", () => {
  const normalWithLogitLink = clone(validInferenceProofArtifact);
  normalWithLogitLink.model_spec_binding.link_function = "logit";
  bindInferenceProofSelfHash(normalWithLogitLink);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(normalWithLogitLink).success,
    false
  );

  const unsupportedEligible = clone(validInferenceProofArtifact);
  unsupportedEligible.model_spec_binding.likelihood_family =
    "poisson_count_aggregate";
  unsupportedEligible.model_spec_binding.link_function = "log";
  assert.equal(
    InferenceProofArtifactSchema.safeParse(unsupportedEligible).success,
    false
  );

  const unsupportedHeld = clone(unsupportedEligible);
  markInferenceProofHold(unsupportedHeld, ["unsupported_likelihood_family"]);
  bindInferenceProofSelfHash(unsupportedHeld);
  assert.equal(InferenceProofArtifactSchema.safeParse(unsupportedHeld).success, true);
});

test("inference proof artifact requires documented prior justification", () => {
  const missingPriorRef = clone(validInferenceProofArtifact);
  delete missingPriorRef.diagnostics.prior_sensitivity.prior_justification_ref;
  bindInferenceProofSelfHash(missingPriorRef);
  assert.equal(InferenceProofArtifactSchema.safeParse(missingPriorRef).success, false);

  const undocumentedPrior = clone(validInferenceProofArtifact);
  undocumentedPrior.diagnostics.prior_sensitivity.empirical_prior_justification_documented =
    false;
  bindInferenceProofSelfHash(undocumentedPrior);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(undocumentedPrior).success,
    false
  );
});

test("inference proof artifact validates missing and suppressed window evidence", () => {
  const missingWindowEligible = clone(validInferenceProofArtifact);
  missingWindowEligible.model_spec_binding.missing_or_suppressed_window_evidence.missing_milestone_days =
    [30];
  bindInferenceProofSelfHash(missingWindowEligible);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(missingWindowEligible).success,
    false
  );

  const missingWindowHeld = clone(missingWindowEligible);
  markInferenceProofHold(missingWindowHeld, ["missing_or_suppressed_windows"]);
  bindInferenceProofSelfHash(missingWindowHeld);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(missingWindowHeld).success,
    true
  );

  const contradictoryWindowEvidence = clone(validInferenceProofArtifact);
  contradictoryWindowEvidence.model_spec_binding.missing_or_suppressed_window_evidence.missing_milestone_days =
    [90];
  bindInferenceProofSelfHash(contradictoryWindowEvidence);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(contradictoryWindowEvidence).success,
    false
  );
});

test("inference proof artifact requires complete PPC statistics and gate values", () => {
  const missingField = clone(validInferenceProofArtifact);
  delete missingField.diagnostics.posterior_predictive_checks[0].observed_value;
  assert.equal(InferenceProofArtifactSchema.safeParse(missingField).success, false);

  const missingDesignatedStat = clone(validInferenceProofArtifact);
  missingDesignatedStat.diagnostics.posterior_predictive_checks =
    missingDesignatedStat.diagnostics.posterior_predictive_checks.filter(
      (stat) => stat.statistic_name !== "difference_in_differences_contrast"
    );
  assert.equal(
    InferenceProofArtifactSchema.safeParse(missingDesignatedStat).success,
    false
  );

  const failingPpc = clone(validInferenceProofArtifact);
  failingPpc.diagnostics.posterior_predictive_checks[0].p_value = 0.99;
  assert.equal(InferenceProofArtifactSchema.safeParse(failingPpc).success, false);
});

test("inference proof artifact cross-checks pre-trend interval values", () => {
  const forgedPreTrend = clone(validInferenceProofArtifact);
  forgedPreTrend.diagnostics.pre_trend.pseudo_effect_credible_interval_80 = {
    lower: 0.1,
    upper: 0.2
  };
  forgedPreTrend.diagnostics.pre_trend.includes_zero = true;
  forgedPreTrend.diagnostics.pre_trend.pass = true;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(forgedPreTrend).success,
    false
  );

  const heldPreTrend = clone(forgedPreTrend);
  heldPreTrend.diagnostics.pre_trend.includes_zero = false;
  heldPreTrend.diagnostics.pre_trend.pass = false;
  markInferenceProofHold(heldPreTrend, ["pre_trend"]);
  bindInferenceProofSelfHash(heldPreTrend);
  assert.equal(InferenceProofArtifactSchema.safeParse(heldPreTrend).success, true);
});

test("inference proof artifact enforces calibration and null proof gates", () => {
  const tooFewReplications = clone(validInferenceProofArtifact);
  tooFewReplications.calibration.scenarios[0].replication_count = 199;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(tooFewReplications).success,
    false
  );

  const missingCell = clone(validInferenceProofArtifact);
  missingCell.calibration.scenarios = missingCell.calibration.scenarios.filter(
    (scenario) =>
      !(scenario.injected_effect_size_sd === 0.5 && scenario.cohort_size === 16)
  );
  assert.equal(InferenceProofArtifactSchema.safeParse(missingCell).success, false);

  const highCoverageEligible = clone(validInferenceProofArtifact);
  highCoverageEligible.calibration.scenarios[0].coverage_rate = 0.9;
  highCoverageEligible.calibration.scenarios[0].coverage_standard_error =
    Math.sqrt(
      (0.9 * (1 - 0.9)) /
        highCoverageEligible.calibration.scenarios[0].replication_count
    );
  bindInferenceProofSelfHash(highCoverageEligible);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(highCoverageEligible).success,
    false
  );

  const highCoverageHold = clone(highCoverageEligible);
  markInferenceProofHold(highCoverageHold, ["calibration_coverage"]);
  bindInferenceProofSelfHash(highCoverageHold);
  assert.equal(InferenceProofArtifactSchema.safeParse(highCoverageHold).success, true);

  const forgedCoverageStandardError = clone(validInferenceProofArtifact);
  forgedCoverageStandardError.calibration.scenarios[0].coverage_standard_error = 0;
  bindInferenceProofSelfHash(forgedCoverageStandardError);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(forgedCoverageStandardError).success,
    false
  );

  const highNullFalseEligibility = clone(validInferenceProofArtifact);
  highNullFalseEligibility.null_checks.false_eligibility_rate = 0.06;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(highNullFalseEligibility).success,
    false
  );
});

test("inference proof artifact enforces floor cases", () => {
  const k4NotRejected = clone(validInferenceProofArtifact);
  k4NotRejected.floor_checks.k4_rejected.outcome =
    "internal_only_display_ineligible";
  assert.equal(InferenceProofArtifactSchema.safeParse(k4NotRejected).success, false);

  const k8DisplayEligible = clone(validInferenceProofArtifact);
  k8DisplayEligible.floor_checks.k8_internal_only.display_eligible = true;
  assert.equal(
    InferenceProofArtifactSchema.safeParse(k8DisplayEligible).success,
    false
  );

  const missingK16 = clone(validInferenceProofArtifact);
  missingK16.floor_checks.eligible_floor_cases = [
    missingK16.floor_checks.eligible_floor_cases[0],
    missingK16.floor_checks.eligible_floor_cases[0]
  ];
  assert.equal(InferenceProofArtifactSchema.safeParse(missingK16).success, false);
});

test("inference proof artifact rejects naive repeated-look peeking", () => {
  const repeatedWithoutProof = clone(validInferenceProofArtifact);
  repeatedWithoutProof.peeking_control.repeated_evaluation = true;
  repeatedWithoutProof.peeking_control.total_planned_looks = 6;
  repeatedWithoutProof.peeking_control.milestone_days_included = [
    0,
    30,
    60,
    90,
    180,
    365
  ];
  assert.equal(
    InferenceProofArtifactSchema.safeParse(repeatedWithoutProof).success,
    false
  );

  const fixedHorizonMultiMetric = clone(validInferenceProofArtifact);
  fixedHorizonMultiMetric.peeking_control.metrics_included = [
    "selected_metric",
    "second_metric"
  ];
  assert.equal(
    InferenceProofArtifactSchema.safeParse(fixedHorizonMultiMetric).success,
    false
  );

  const fixedHorizonMultiCohort = clone(validInferenceProofArtifact);
  fixedHorizonMultiCohort.peeking_control.cohorts_included = [
    "synthetic-treated-vs-comparison",
    "second-comparison"
  ];
  assert.equal(
    InferenceProofArtifactSchema.safeParse(fixedHorizonMultiCohort).success,
    false
  );

  const alwaysValid = clone(validInferenceProofArtifact);
  alwaysValid.peeking_control.procedure =
    "always_valid_sequential_procedure_proven";
  alwaysValid.peeking_control.repeated_evaluation = true;
  alwaysValid.peeking_control.look_index = 6;
  alwaysValid.peeking_control.total_planned_looks = 6;
  alwaysValid.peeking_control.milestone_days_included = [
    0,
    30,
    60,
    90,
    180,
    365
  ];
  alwaysValid.peeking_control.sequential_method_name =
    "synthetic_null_validated_e_value";
  alwaysValid.peeking_control.synthetic_null_proof_hash = "f".repeat(64);
  bindInferenceProofSelfHash(alwaysValid);
  assert.equal(InferenceProofArtifactSchema.safeParse(alwaysValid).success, true);

  const partialAlwaysValid = clone(alwaysValid);
  partialAlwaysValid.peeking_control.look_index = 3;
  partialAlwaysValid.peeking_control.total_planned_looks = 6;
  partialAlwaysValid.peeking_control.milestone_days_included = [0, 30, 60];
  bindInferenceProofSelfHash(partialAlwaysValid);
  assert.equal(
    InferenceProofArtifactSchema.safeParse(partialAlwaysValid).success,
    false
  );
});

test("inference proof artifact rejects causality, ROI, productivity, and confidence sidecars", () => {
  for (const field of [
    "causal_effect",
    "roi",
    "productivity",
    "value_attributed",
    "impact_probability",
    "confidence_score"
  ]) {
    const artifact = clone(validInferenceProofArtifact);
    artifact[field] = 1;
    assert.equal(
      InferenceProofArtifactSchema.safeParse(artifact).success,
      false,
      `${field} should reject`
    );
  }
});
