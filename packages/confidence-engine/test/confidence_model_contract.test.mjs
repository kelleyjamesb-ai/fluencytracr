import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION,
  CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF,
  CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF,
  INTERNAL_CONFIDENCE_CONSUMER_TOKEN,
  CONFIDENCE_OBSERVATION_MILESTONE_DAYS,
  CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
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
  ThresholdProbabilityRepresentationSchema,
  ExpectedLossRepresentationSchema
} from "../dist/index.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
  minimum_cohort_floor: CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
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

const validThresholdProbability = {
  schema_version: THRESHOLD_PROBABILITY_REPRESENTATION_SCHEMA_VERSION,
  representation_class: "internal_diagnostic_representation_only",
  internal_only: true,
  customer_output_authorized: false,
  promotion_decision_ref: null,
  parameter_name: "contribution_alignment_effect",
  minimum_worthwhile_threshold_declared: true,
  threshold_probability: 0.82,
  credible_interval_level_context: 0.8,
  derived_from_posterior_with_credible_intervals: true
};

const validExpectedLoss = {
  schema_version: EXPECTED_LOSS_REPRESENTATION_SCHEMA_VERSION,
  representation_class: "internal_diagnostic_representation_only",
  internal_only: true,
  customer_output_authorized: false,
  promotion_decision_ref: null,
  parameter_name: "contribution_alignment_effect",
  loss_function_declared: true,
  expected_loss: 0.03,
  decision_threshold_epsilon: 0.05,
  decision_rule: "act_when_expected_loss_below_epsilon_internal_only"
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

test("non-positive decision_threshold_epsilon rejects", () => {
  const representation = clone(validExpectedLoss);
  representation.decision_threshold_epsilon = 0;
  assert.equal(
    ExpectedLossRepresentationSchema.safeParse(representation).success,
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
