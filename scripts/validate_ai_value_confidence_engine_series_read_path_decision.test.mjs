import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildDemoCustomerEvidenceHistoryInputFromSourceFixture,
  buildCustomerEvidenceHistoryReadPathProofFromObject
} from "./run_ai_value_customer_evidence_history_read_path_proof.mjs";
import {
  buildConfidenceEngineSeriesReadPathDecisionFromObject,
  buildDemoConfidenceObservationRequirement,
  CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION,
  CONFIDENCE_SERIES_AUTHORIZED_STATE,
  CONFIDENCE_SERIES_HOLD_STATE,
  confidenceEngineSeriesReadPathDecisionHash,
  INTERNAL_CONFIDENCE_CONSUMER_TOKEN,
  validateConfidenceEngineSeriesReadPathDecision
} from "./run_ai_value_confidence_engine_series_read_path_decision.mjs";
import {
  buildDurableSeriesReadPathDecisionFromObject,
  validateDurableSeriesConfidenceCoexistence
} from "./run_ai_value_durable_series_read_path_decision.mjs";
import {
  runControlledRepeatedPilotEvidencePackageFromObject
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";
import {
  buildMeasurementCellSeriesPersistencePromotionGateFromObject,
  measurementCellSeriesPersistencePromotionGateHash,
  validateMeasurementCellSeriesPersistencePromotionGate
} from "./run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_FALSE_FEEDS = [
  "measurement_cell_series_snapshot_implementation_decision",
  "measurement_cell_series_snapshot_write",
  "measurement_cell_series_schema_creation",
  "measurement_cell_series_migration_creation",
  "measurement_cell_series_repository_write_path",
  "evidence_snapshot_extension",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_economic_output",
  "customer_facing_financial_output",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "model_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function sha256Json(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function sourceFixture() {
  return readJson(FIXTURE_PATH);
}

function alternateSourceFixture() {
  const fixture = clone(sourceFixture());
  fixture.fixture_id = "controlled_aggregate_fixture_review_support_alt";
  return fixture;
}

function customerHistoryProof(fixture = sourceFixture()) {
  return buildCustomerEvidenceHistoryReadPathProofFromObject(
    buildDemoCustomerEvidenceHistoryInputFromSourceFixture(fixture, {
      cwd: process.cwd()
    }),
    { cwd: process.cwd() }
  );
}

function authorizedDecision(proof = customerHistoryProof()) {
  return buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: buildDemoConfidenceObservationRequirement()
    },
    { cwd: process.cwd() }
  );
}

const CONFIDENCE_READY_PROOF_STATES = {
  durable_read_path_state: "CONFIDENCE_OBSERVATION_READ_PATH_PROVEN",
  compact_snapshot_projection_state:
    "COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONFIDENCE_OBSERVATION_READ_PATH",
  customer_history_projection_state:
    "CUSTOMER_HISTORY_CONTINUITY_REMAINS_ON_COMPACT_SNAPSHOTS",
  series_contract_state: "MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT_VALIDATED",
  auth_tenant_enforcement_state: "ORG_SCOPED_SERIES_READ_GUARDS_REQUIRED",
  privacy_k_min_review_state: "AGGREGATE_PRIVACY_POSTURE_READY",
  evidence_continuity_placement_state:
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_SERIES_SNAPSHOT_SCOPE",
  storage_boundary_state: "APPEND_ONLY_COMPACT_REFS_ONLY",
  live_wiring_state: "NO_LIVE_CONNECTOR_EXECUTION_REQUIRED"
};

function confidenceProofRefs(proof = CONFIDENCE_READY_PROOF_STATES) {
  return Object.fromEntries(
    Object.entries(proof).map(([field, state]) => {
      const compact = {
        ref_id: `${field}_proof`,
        state,
        source_doc_ref: `docs.architecture.${field}`
      };
      return [field, { ...compact, proof_hash: sha256Json(compact) }];
    })
  );
}

function confidenceBinding(proof = customerHistoryProof()) {
  return {
    decision: authorizedDecision(proof),
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceConfidenceObservationRequirement: buildDemoConfidenceObservationRequirement()
  };
}

test("confidence-engine series read-path decision authorizes with valid proofs and scoped feed", () => {
  const proof = customerHistoryProof();
  const requirement = buildDemoConfidenceObservationRequirement();
  const decision = authorizedDecision(proof);
  const validation = validateConfidenceEngineSeriesReadPathDecision(decision, {
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceConfidenceObservationRequirement: requirement
  });

  assert.equal(decision.decision_state, CONFIDENCE_SERIES_AUTHORIZED_STATE);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(decision.feeds.research_model_feed, INTERNAL_CONFIDENCE_CONSUMER_TOKEN);
  assert.equal(
    decision.feeds.measurement_cell_series_persistence_promotion_gate_confidence_path,
    true
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
  }
  assert.equal(decision.decision_scope.internal_confidence_observation_store_authorized, true);
  assert.equal(
    decision.decision_scope.series_persistence_authorized_beyond_confidence_observations,
    false
  );
  assert.equal(decision.decision_scope.route_authorized, false);
  assert.equal(decision.decision_scope.ui_authorized, false);
  assert.equal(decision.decision_scope.export_authorized, false);
  assert.equal(decision.decision_scope.customer_facing_output_authorized, false);
  assert.equal(decision.decision_scope.finance_output_authorized, false);
  assert.deepEqual(decision.observation_requirement_ref.required_milestone_days, [
    0, 30, 60, 90, 180, 365
  ]);
  assert.equal(decision.observation_requirement_ref.minimum_cohort_size, 10);
  assert.equal(decision.decision_hash, confidenceEngineSeriesReadPathDecisionHash(decision));
});

test("confidence-engine series read-path decision holds without a valid requirement statement", () => {
  const proof = customerHistoryProof();
  const missing = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    { customer_evidence_history_read_path_proof: proof },
    { cwd: process.cwd() }
  );
  assert.equal(missing.decision_state, CONFIDENCE_SERIES_HOLD_STATE);
  assert.ok(missing.hold_reasons.includes("confidence_observation_requirement_not_valid"));
  assert.equal(missing.feeds.research_model_feed, false);
  assert.equal(
    missing.feeds.measurement_cell_series_persistence_promotion_gate_confidence_path,
    false
  );

  const tamperedConsumer = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: {
        ...buildDemoConfidenceObservationRequirement(),
        consumer: "any_model_consumer"
      }
    },
    { cwd: process.cwd() }
  );
  assert.equal(tamperedConsumer.decision_state, CONFIDENCE_SERIES_HOLD_STATE);
  assert.ok(tamperedConsumer.hold_reasons.includes("consumer_runtime_not_bound"));
  assert.equal(tamperedConsumer.feeds.research_model_feed, false);

  const tamperedMilestones = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: {
        ...buildDemoConfidenceObservationRequirement(),
        required_milestone_days: [0, 30]
      }
    },
    { cwd: process.cwd() }
  );
  assert.equal(tamperedMilestones.decision_state, CONFIDENCE_SERIES_HOLD_STATE);
  assert.ok(
    tamperedMilestones.hold_reasons.includes("confidence_observation_requirement_not_valid")
  );

  const sufficientCompactRows = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: {
        ...buildDemoConfidenceObservationRequirement(),
        compact_snapshot_rows_sufficient: true
      }
    },
    { cwd: process.cwd() }
  );
  assert.equal(sufficientCompactRows.decision_state, CONFIDENCE_SERIES_HOLD_STATE);
  assert.ok(
    sufficientCompactRows.hold_reasons.includes("compact_snapshot_confidence_gap_not_stated")
  );
});

test("confidence-engine series read-path decision rejects unsafe side doors without echo", () => {
  const decision = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: customerHistoryProof(),
      confidence_observation_requirement: buildDemoConfidenceObservationRequirement(),
      raw_rows: [{ employee_email: "person@example.com" }],
      query_text: "SELECT user_id FROM raw_rows",
      backend_route: true,
      frontend_ui: true,
      live_bigquery_execution: true,
      probability: 0.7,
      roi: 100
    },
    { cwd: process.cwd() }
  );
  const serialized = JSON.stringify(decision);
  const validation = validateConfidenceEngineSeriesReadPathDecision(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.deepEqual(decision.hold_reasons, ["boundary_leakage_rejected"]);
});

test("confidence-engine series read-path decision rejects unsafe direct proof refs before copying", () => {
  const proof = clone(customerHistoryProof());
  proof.proof_id = "person@example.com";
  const decision = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: buildDemoConfidenceObservationRequirement()
    },
    { cwd: process.cwd() }
  );
  const serialized = JSON.stringify(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(serialized.includes("person@example.com"), false);
  assert.deepEqual(decision.hold_reasons, ["boundary_leakage_rejected"]);

  const dir = mkdtempSync(join(tmpdir(), "fluencytracr-confidence-proof-"));
  const inputPath = join(dir, "proof.json");
  writeFileSync(inputPath, JSON.stringify(proof));
  const output = execFileSync(
    process.execPath,
    ["scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs", inputPath],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const cliDecision = JSON.parse(output);

  assert.equal(cliDecision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(JSON.stringify(cliDecision).includes("person@example.com"), false);
});

test("confidence-engine series read-path decision rejects forged feeds and stale states after rehash", () => {
  const proof = customerHistoryProof();
  const decision = authorizedDecision(proof);

  const booleanFeed = clone(decision);
  booleanFeed.feeds.research_model_feed = true;
  booleanFeed.decision_hash = confidenceEngineSeriesReadPathDecisionHash(booleanFeed);
  const booleanValidation = validateConfidenceEngineSeriesReadPathDecision(booleanFeed);
  assert.equal(booleanValidation.valid, false);
  assert.ok(
    booleanValidation.gaps.some((gap) => /feeds\.research_model_feed/.test(gap)),
    booleanValidation.gaps.join("; ")
  );

  const widenedScope = clone(decision);
  widenedScope.decision_scope.series_persistence_authorized_beyond_confidence_observations = true;
  widenedScope.decision_hash = confidenceEngineSeriesReadPathDecisionHash(widenedScope);
  assert.equal(validateConfidenceEngineSeriesReadPathDecision(widenedScope).valid, false);

  const forgedAuthorized = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    { customer_evidence_history_read_path_proof: proof },
    { cwd: process.cwd() }
  );
  forgedAuthorized.decision_state = CONFIDENCE_SERIES_AUTHORIZED_STATE;
  forgedAuthorized.decision_hash = confidenceEngineSeriesReadPathDecisionHash(forgedAuthorized);
  const forgedValidation = validateConfidenceEngineSeriesReadPathDecision(forgedAuthorized);
  assert.equal(forgedValidation.valid, false);
  assert.ok(
    forgedValidation.gaps.some((gap) => /prerequisites\./.test(gap)),
    forgedValidation.gaps.join("; ")
  );

  const staleHash = clone(decision);
  staleHash.generated_at = "2026-07-02T00:00:00.000Z";
  const staleValidation = validateConfidenceEngineSeriesReadPathDecision(staleHash);
  assert.equal(staleValidation.valid, false);
  assert.ok(
    staleValidation.gaps.some((gap) => /decision_hash/.test(gap)),
    staleValidation.gaps.join("; ")
  );

  const staleProofRef = clone(decision);
  staleProofRef.source_proof_ref.observed_milestone_days = [0, 30, 60, 90, 180];
  staleProofRef.decision_hash = confidenceEngineSeriesReadPathDecisionHash(staleProofRef);
  const staleProofRefValidation = validateConfidenceEngineSeriesReadPathDecision(staleProofRef);
  assert.equal(staleProofRefValidation.valid, false);
  assert.ok(
    staleProofRefValidation.gaps.some((gap) => /source_proof_ref\.observed_milestone_days/.test(gap)),
    staleProofRefValidation.gaps.join("; ")
  );

  const staleRequirementRef = clone(decision);
  staleRequirementRef.observation_requirement_ref.requirement_hash = "b".repeat(64);
  staleRequirementRef.decision_hash =
    confidenceEngineSeriesReadPathDecisionHash(staleRequirementRef);
  const staleRequirementRefValidation =
    validateConfidenceEngineSeriesReadPathDecision(staleRequirementRef);
  assert.equal(staleRequirementRefValidation.valid, false);
  assert.ok(
    staleRequirementRefValidation.gaps.some((gap) =>
      /observation_requirement_ref\.requirement_hash/.test(gap)
    ),
    staleRequirementRefValidation.gaps.join("; ")
  );
});

test("confidence-engine series read-path decision source binding rejects proof or requirement drift", () => {
  const proof = customerHistoryProof();
  const decision = authorizedDecision(proof);

  const driftedRequirement = {
    ...buildDemoConfidenceObservationRequirement(),
    minimum_cohort_size: 5
  };
  const validation = validateConfidenceEngineSeriesReadPathDecision(decision, {
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceConfidenceObservationRequirement: driftedRequirement
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /binding mismatch/.test(gap)),
    validation.gaps.join("; ")
  );

  const driftedDecisionId = clone(decision);
  driftedDecisionId.decision_id = "confidence_engine_series_read_path_decision:safe-but-drifted";
  driftedDecisionId.decision_hash =
    confidenceEngineSeriesReadPathDecisionHash(driftedDecisionId);
  const driftedDecisionIdValidation = validateConfidenceEngineSeriesReadPathDecision(
    driftedDecisionId,
    {
      sourceCustomerEvidenceHistoryReadPathProof: proof,
      sourceConfidenceObservationRequirement: buildDemoConfidenceObservationRequirement()
    }
  );
  assert.equal(driftedDecisionIdValidation.valid, false);
  assert.ok(
    driftedDecisionIdValidation.gaps.some((gap) => /decision_id/.test(gap)),
    driftedDecisionIdValidation.gaps.join("; ")
  );
});

test("durable customer-history decision and confidence authorization coexist without weakening either", () => {
  const proof = customerHistoryProof();
  const durable = buildDurableSeriesReadPathDecisionFromObject(proof, { cwd: process.cwd() });
  const confidence = authorizedDecision(proof);

  assert.equal(
    durable.decision_state,
    "HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED"
  );
  assert.equal(durable.feeds.research_model_feed, false);
  assert.equal(
    durable.allowed_next_step,
    "continue_customer_history_reads_from_ai_value_customer_data_model_snapshots"
  );

  const coexistence = validateDurableSeriesConfidenceCoexistence(durable, confidence);
  assert.equal(coexistence.valid, true, coexistence.gaps.join("; "));

  const heldConfidence = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    { customer_evidence_history_read_path_proof: proof },
    { cwd: process.cwd() }
  );
  const heldCoexistence = validateDurableSeriesConfidenceCoexistence(durable, heldConfidence);
  assert.equal(heldCoexistence.valid, false);
  assert.ok(
    heldCoexistence.gaps.includes("confidence_engine_series_read_path_decision_not_authorized")
  );

  const driftedDurable = clone(durable);
  driftedDurable.source_proof_ref.customer_history_hash = "a".repeat(64);
  const driftedCoexistence = validateDurableSeriesConfidenceCoexistence(
    driftedDurable,
    confidence
  );
  assert.equal(driftedCoexistence.valid, false);
  assert.ok(driftedCoexistence.gaps.includes("decisions_not_bound_to_same_customer_history"));
});

test("series persistence promotion gate becomes ready only through a bound confidence-lane decision", () => {
  const fixture = sourceFixture();
  const proof = customerHistoryProof();
  const source = runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
    cwd: process.cwd()
  });
  const binding = confidenceBinding(proof);
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: binding
  });
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate, {
    cwd: process.cwd(),
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: fixture,
    confidenceSeriesReadPathBinding: binding
  });

  assert.equal(
    gate.gate_state,
    "READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION"
  );
  assert.equal(gate.read_path_lane, "internal_confidence_observation");
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(gate.feeds.measurement_cell_series_snapshot_implementation_decision, true);
  assert.equal(gate.feeds.research_model_feed, false);
  assert.equal(gate.gate_scope.persistence_authorized, false);
  assert.equal(gate.gate_scope.separate_implementation_decision_required, true);
  assert.equal(gate.customer_exposure.customer_visible, false);
  assert.equal(
    gate.internal_confidence_observation_decision_ref.decision_state,
    CONFIDENCE_SERIES_AUTHORIZED_STATE
  );
  assert.equal(
    gate.internal_confidence_observation_decision_ref.decision_schema_version,
    CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION
  );
});

test("series persistence promotion gate confidence lane fails closed on held, forged, or missing bindings", () => {
  const fixture = sourceFixture();
  const proof = customerHistoryProof();
  const source = runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
    cwd: process.cwd()
  });

  const noBinding = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs()
  });
  assert.equal(noBinding.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(noBinding.read_path_lane, "customer_history");
  assert.equal(noBinding.prerequisites.durable_read_path_decision_bound, false);
  assert.equal(noBinding.internal_confidence_observation_decision_ref, null);
  assert.equal(noBinding.feeds.measurement_cell_series_snapshot_implementation_decision, false);

  const heldDecision = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    { customer_evidence_history_read_path_proof: proof },
    { cwd: process.cwd() }
  );
  const heldBinding = {
    decision: heldDecision,
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceConfidenceObservationRequirement: {}
  };
  const heldGate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: heldBinding
  });
  assert.equal(heldGate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(heldGate.read_path_lane, "customer_history");
  assert.equal(heldGate.feeds.measurement_cell_series_snapshot_implementation_decision, false);

  const forgedDecision = clone(authorizedDecision(proof));
  forgedDecision.feeds.research_model_feed = "any_model_consumer";
  forgedDecision.decision_hash = confidenceEngineSeriesReadPathDecisionHash(forgedDecision);
  const forgedBinding = {
    decision: forgedDecision,
    sourceCustomerEvidenceHistoryReadPathProof: proof,
    sourceConfidenceObservationRequirement: buildDemoConfidenceObservationRequirement()
  };
  const forgedGate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: forgedBinding
  });
  assert.equal(forgedGate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(forgedGate.feeds.measurement_cell_series_snapshot_implementation_decision, false);

  const decisionOnlyGate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: {
      decision: authorizedDecision(proof)
    }
  });
  assert.equal(decisionOnlyGate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(decisionOnlyGate.read_path_lane, "customer_history");
  assert.equal(
    decisionOnlyGate.feeds.measurement_cell_series_snapshot_implementation_decision,
    false
  );

  const binding = confidenceBinding(proof);
  const readyGate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: binding
  });
  const missingBindingValidation = validateMeasurementCellSeriesPersistencePromotionGate(
    readyGate,
    {
      cwd: process.cwd(),
      sourceRepeatedPilotEvidencePackage: source,
      sourceFixture: fixture
    }
  );
  assert.equal(missingBindingValidation.valid, false);
  assert.ok(
    missingBindingValidation.gaps.some((gap) =>
      /confidenceSeriesReadPathBinding\.decision is required/.test(gap)
    ),
    missingBindingValidation.gaps.join("; ")
  );

  const decisionOnlyBindingValidation = validateMeasurementCellSeriesPersistencePromotionGate(
    readyGate,
    {
      cwd: process.cwd(),
      sourceRepeatedPilotEvidencePackage: source,
      sourceFixture: fixture,
      confidenceSeriesReadPathBinding: {
        decision: binding.decision
      }
    }
  );
  assert.equal(decisionOnlyBindingValidation.valid, false);
  assert.ok(
    decisionOnlyBindingValidation.gaps.some((gap) =>
      /sourceCustomerEvidenceHistoryReadPathProof is required/.test(gap)
    ),
    decisionOnlyBindingValidation.gaps.join("; ")
  );
  assert.ok(
    decisionOnlyBindingValidation.gaps.some((gap) =>
      /sourceConfidenceObservationRequirement is required/.test(gap)
    ),
    decisionOnlyBindingValidation.gaps.join("; ")
  );

  const driftedRef = clone(readyGate);
  driftedRef.internal_confidence_observation_decision_ref.requirement_hash = "b".repeat(64);
  driftedRef.gate_hash = measurementCellSeriesPersistencePromotionGateHash(driftedRef);
  const driftedValidation = validateMeasurementCellSeriesPersistencePromotionGate(driftedRef, {
    cwd: process.cwd(),
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: fixture,
    confidenceSeriesReadPathBinding: binding
  });
  assert.equal(driftedValidation.valid, false);
  assert.ok(
    driftedValidation.gaps.some((gap) =>
      /internal_confidence_observation_decision_ref\.requirement_hash/.test(gap)
    ),
    driftedValidation.gaps.join("; ")
  );
});

test("series persistence promotion gate binds confidence decisions to the gated source series", () => {
  const sourceA = runControlledRepeatedPilotEvidencePackageFromObject(sourceFixture(), {
    cwd: process.cwd()
  });
  const sourceB = runControlledRepeatedPilotEvidencePackageFromObject(alternateSourceFixture(), {
    cwd: process.cwd()
  });
  const bindingA = confidenceBinding(customerHistoryProof(sourceFixture()));

  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(sourceB, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: bindingA
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(gate.read_path_lane, "customer_history");
  assert.equal(gate.internal_confidence_observation_decision_ref, null);
  assert.equal(gate.feeds.measurement_cell_series_snapshot_implementation_decision, false);

  const readyGateA = buildMeasurementCellSeriesPersistencePromotionGateFromObject(sourceA, {
    cwd: process.cwd(),
    readPathProof: CONFIDENCE_READY_PROOF_STATES,
    readPathProofRefs: confidenceProofRefs(),
    confidenceSeriesReadPathBinding: bindingA
  });
  const mismatchedValidation = validateMeasurementCellSeriesPersistencePromotionGate(readyGateA, {
    cwd: process.cwd(),
    sourceRepeatedPilotEvidencePackage: sourceB,
    sourceFixture: alternateSourceFixture(),
    confidenceSeriesReadPathBinding: bindingA
  });

  assert.equal(mismatchedValidation.valid, false);
  assert.ok(
    mismatchedValidation.gaps.some((gap) => /source_series_ref\./.test(gap)),
    mismatchedValidation.gaps.join("; ")
  );
});

test("confidence-engine series read-path decision CLI emits an authorized decision from the fixture", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const decision = JSON.parse(output);
  const validation = validateConfidenceEngineSeriesReadPathDecision(decision);

  assert.equal(decision.decision_state, CONFIDENCE_SERIES_AUTHORIZED_STATE);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(decision.feeds.research_model_feed, INTERNAL_CONFIDENCE_CONSUMER_TOKEN);
});

test("confidence-engine series read-path decision contract README exists", () => {
  assert.ok(
    existsSync(
      "docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md"
    ),
    "confidence-engine series read-path decision contract README must exist"
  );
});
