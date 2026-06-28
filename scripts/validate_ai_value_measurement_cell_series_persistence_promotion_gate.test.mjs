import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  runControlledRepeatedPilotEvidencePackageFromObject,
  validateControlledRepeatedPilotEvidencePackage
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";
import {
  buildMeasurementCellSeriesPersistencePromotionGateFromObject,
  measurementCellSeriesPersistencePromotionGateHash,
  validateMeasurementCellSeriesPersistencePromotionGate
} from "./run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_FALSE_FEEDS = [
  "measurement_cell_series_snapshot_write",
  "measurement_cell_series_schema_creation",
  "measurement_cell_series_migration_creation",
  "measurement_cell_series_repository_write_path",
  "evidence_snapshot_extension",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "research_model_feed",
  "model_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

const REQUIRED_BLOCKED_USES = [
  "measurement_cell_series_snapshot_write",
  "measurement_cell_series_schema_creation",
  "measurement_cell_series_migration_creation",
  "measurement_cell_series_repository_write_path",
  "evidence_snapshot_extension",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "live_connector_execution",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "research_model_feed",
  "contribution_model",
  "probability_output",
  "score_output",
  "realized_roi",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning"
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

function repeatedPackage(options = {}) {
  const fixture = sourceFixture();
  const packageRecord = runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
    cwd: process.cwd(),
    ...options
  });
  const validation = validateControlledRepeatedPilotEvidencePackage(packageRecord, {
    sourceFixture: fixture,
    cwd: process.cwd(),
    ...options
  });
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return packageRecord;
}

function readyReadPathProof(overrides = {}) {
  return {
    durable_read_path_state: "DURABLE_SERIES_READ_PATH_PROVEN",
    compact_snapshot_projection_state: "COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONTINUITY_READ_PATH",
    customer_history_projection_state: "CUSTOMER_HISTORY_CONTINUITY_REQUIRES_SERIES_SNAPSHOT_READ_MODEL",
    series_contract_state: "MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT_VALIDATED",
    auth_tenant_enforcement_state: "ORG_SCOPED_SERIES_READ_GUARDS_REQUIRED",
    privacy_k_min_review_state: "AGGREGATE_PRIVACY_POSTURE_READY",
    evidence_continuity_placement_state: "KEEP_EVIDENCE_CONTINUITY_INSIDE_SERIES_SNAPSHOT_SCOPE",
    storage_boundary_state: "APPEND_ONLY_COMPACT_REFS_ONLY",
    live_wiring_state: "NO_LIVE_CONNECTOR_EXECUTION_REQUIRED",
    ...overrides
  };
}

function readyProofRefs(proof = readyReadPathProof()) {
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

function readyGateOptions(overrides = {}) {
  const proof = readyReadPathProof(overrides);
  return {
    readPathProof: proof,
    readPathProofRefs: readyProofRefs(proof)
  };
}

function forgedReadyGate(source = repeatedPackage()) {
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(
    source,
    readyGateOptions()
  );
  gate.gate_state =
    "READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION";
  gate.gate_scope.source_bound = true;
  gate.feeds.measurement_cell_series_snapshot_implementation_decision = true;
  gate.prerequisites.durable_read_path_decision_bound = true;
  gate.prerequisites.read_path_proof_refs_bound = true;
  gate.validation_summary.valid = true;
  gate.validation_summary.gaps = [];
  gate.hold_reasons = [];
  gate.gate_hash = measurementCellSeriesPersistencePromotionGateHash(gate);
  return gate;
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function searchText(args) {
  try {
    return execFileSync("rg", args, {
      cwd: process.cwd(),
      encoding: "utf8"
    });
  } catch (error) {
    if (error.status === 1) return "";
    throw error;
  }
}

test("series persistence promotion gate rejects unsafe generated_at without echo", () => {
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject({
    controlled_repeated_pilot_evidence_package: repeatedPackage(),
    generated_at: "SELECT user_id FROM raw_rows"
  });
  const serialized = JSON.stringify(gate);
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
});

test("series persistence promotion gate holds by default even with complete repeated milestone evidence", () => {
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(repeatedPackage());
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(gate.gate_scope.internal_review_only, true);
  assert.equal(gate.gate_scope.separate_implementation_decision_required, true);
  assert.equal(gate.gate_scope.persistence_authorized, false);
  assert.equal(gate.gate_scope.schema_authorized, false);
  assert.equal(gate.gate_scope.route_authorized, false);
  assert.equal(gate.gate_scope.customer_facing_output_authorized, false);
  assert.equal(gate.prerequisites.repeated_milestone_evidence_valid, true);
  assert.equal(gate.prerequisites.complete_milestone_series, true);
  assert.equal(gate.prerequisites.durable_read_path_proven, false);
  assert.equal(gate.source_series_ref.complete_milestone_series, true);
  assert.deepEqual(gate.source_series_ref.required_milestone_days, [0, 30, 60, 90, 180, 365]);
  assert.ok(gate.hold_reasons.includes("durable_series_read_path_not_proven"));
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, `${feed} must remain false`);
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    assert.ok(gate.blocked_uses.includes(blockedUse), `missing ${blockedUse}`);
  }
});

test("series persistence promotion gate does not become ready from caller-supplied proof strings", () => {
  const source = repeatedPackage();
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(
    source,
    readyGateOptions()
  );
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate, {
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: sourceFixture()
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(gate.prerequisites.durable_read_path_proven, true);
  assert.equal(gate.prerequisites.read_path_proof_refs_bound, true);
  assert.equal(gate.prerequisites.durable_read_path_decision_bound, false);
  assert.ok(gate.hold_reasons.includes("durable_read_path_decision_not_bound"));
  assert.equal(gate.feeds.measurement_cell_series_snapshot_implementation_decision, false);
  assert.equal(gate.feeds.measurement_cell_series_snapshot_write, false);
  assert.equal(gate.feeds.evidence_snapshot_extension, false);
  assert.equal(gate.feeds.backend_route, false);
  assert.equal(gate.feeds.frontend_ui, false);
  assert.equal(gate.gate_scope.separate_implementation_decision_required, true);
  assert.equal(gate.gate_scope.persistence_authorized, false);
  assert.equal(gate.customer_exposure.customer_visible, false);
  assert.equal(gate.customer_exposure.exposure_state, "not_authorized_by_gate");
  assert.equal(gate.future_physical_model.current_authority, "gate_only_no_implementation");
});

test("ready gate validation rejects source package ref drift after rehash", () => {
  const source = repeatedPackage();
  const gate = forgedReadyGate(source);
  const drifted = clone(gate);
  drifted.source_series_ref.package_integrity_hash = "a".repeat(64);
  drifted.source_series_ref.ready_windows = 5;
  drifted.gate_hash = measurementCellSeriesPersistencePromotionGateHash(drifted);

  const withoutSource = validateMeasurementCellSeriesPersistencePromotionGate(drifted);
  const withSource = validateMeasurementCellSeriesPersistencePromotionGate(drifted, {
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: sourceFixture()
  });

  assert.equal(withoutSource.valid, false);
  assert.ok(
    withoutSource.gaps.some((gap) => /sourceRepeatedPilotEvidencePackage is required/.test(gap)),
    withoutSource.gaps.join("; ")
  );
  assert.equal(withSource.valid, false);
  assert.ok(
    withSource.gaps.some((gap) =>
      /source_series_ref\.(package_integrity_hash|ready_windows)/.test(gap)
    ),
    withSource.gaps.join("; ")
  );
});

test("series persistence promotion gate holds on incomplete repeated milestone evidence", () => {
  const incomplete = runControlledRepeatedPilotEvidencePackageFromObject(sourceFixture(), {
    cwd: process.cwd(),
    milestoneDays: [30, 60, 90, 180, 365]
  });
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(
    incomplete,
    readyGateOptions()
  );
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

  assert.equal(gate.gate_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES");
  assert.equal(validation.valid, false);
  assert.ok(gate.hold_reasons.includes("repeated_milestone_evidence_invalid_or_incomplete"));
  assert.equal(gate.feeds.measurement_cell_series_snapshot_implementation_decision, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, feed);
  }
});

test("series persistence promotion gate rejects unsafe side doors without echo", () => {
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject({
    controlled_repeated_pilot_evidence_package: repeatedPackage(),
    raw_rows: [{ employee_email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    measurement_cell_series_snapshots: [{ unsafe: true }],
    evidence_snapshots_extension: true,
    customer_facing_output: true,
    backend_route: true,
    frontend_ui: true,
    export_creation: true,
    live_bigquery_execution: true,
    confidence_score: 0.8,
    probability: 0.7,
    roi: 100,
    ebitda: 200,
    causality: "proved",
    productivity: "lift"
  });
  const serialized = JSON.stringify(gate);
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("proved"), false);
  assert.equal(hasNestedKey(gate, "raw_rows"), false);
  assert.equal(hasNestedKey(gate, "query_text"), false);
  assert.equal(hasNestedKey(gate, "measurement_cell_series_snapshots"), false);
});

test("series persistence promotion gate rejects unsafe direct source-package sidecars without echo", () => {
  const tainted = {
    ...repeatedPackage(),
    raw_rows: [{ employee_email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows"
  };
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(tainted);
  const serialized = JSON.stringify(gate);
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
});

test("series persistence promotion gate holds for every missing milestone and rolling windows", () => {
  const milestones = [0, 30, 60, 90, 180, 365];
  for (const missingMilestone of milestones) {
    const incomplete = runControlledRepeatedPilotEvidencePackageFromObject(sourceFixture(), {
      cwd: process.cwd(),
      milestoneDays: milestones.filter((day) => day !== missingMilestone)
    });
    const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(
      incomplete,
      readyGateOptions()
    );

    assert.equal(gate.gate_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES", `${missingMilestone}`);
    assert.equal(gate.feeds.measurement_cell_series_snapshot_implementation_decision, false);
    for (const feed of REQUIRED_FALSE_FEEDS) {
      assert.equal(gate.feeds[feed], false, `${missingMilestone}:${feed}`);
    }
  }

  const rolling = runControlledRepeatedPilotEvidencePackageFromObject(sourceFixture(), {
    cwd: process.cwd(),
    windowMode: "rolling_30_day"
  });
  const rollingGate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(
    rolling,
    readyGateOptions()
  );

  assert.equal(rollingGate.gate_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES");
  assert.equal(rollingGate.feeds.measurement_cell_series_snapshot_implementation_decision, false);
});

test("ready gate validation rejects live-handle-shaped proof refs", () => {
  const source = repeatedPackage();
  const gate = forgedReadyGate(source);
  const proof = gate.read_path_proof_refs.durable_read_path_state;
  proof.source_doc_ref = "docs.architecture.bigquery.project.dataset.table";
  proof.proof_hash = sha256Json({
    ref_id: proof.ref_id,
    state: proof.state,
    source_doc_ref: proof.source_doc_ref
  });
  gate.gate_hash = measurementCellSeriesPersistencePromotionGateHash(gate);

  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate, {
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: sourceFixture()
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /source_doc_ref/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("each missing read-path proof prerequisite keeps the gate held with false implementation feeds", () => {
  const missingPrerequisites = [
    ["durable_read_path_state", "NOT_PROVEN", "durable_series_read_path_not_proven"],
    ["compact_snapshot_projection_state", "COMPACT_SNAPSHOT_ROWS_NOT_TESTED", "compact_snapshot_projection_gap_not_proven"],
    ["customer_history_projection_state", "CUSTOMER_HISTORY_NOT_REQUIRED", "customer_history_projection_need_not_proven"],
    ["series_contract_state", "SERIES_CONTRACT_NOT_VALIDATED", "series_contract_not_validated"],
    ["auth_tenant_enforcement_state", "NOT_PROMOTED", "auth_tenant_enforcement_not_ready"],
    ["privacy_k_min_review_state", "NOT_PROMOTED", "privacy_k_min_review_not_ready"],
    ["evidence_continuity_placement_state", "MOVE_TO_EVIDENCE_SNAPSHOTS", "evidence_continuity_placement_not_bound"],
    ["storage_boundary_state", "FULL_PAYLOADS_ALLOWED", "storage_boundary_not_compact"],
    ["live_wiring_state", "LIVE_CONNECTOR_REQUIRED", "live_wiring_boundary_not_held"]
  ];

  for (const [prerequisite, value, holdReason] of missingPrerequisites) {
    const source = repeatedPackage();
    const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(source, {
      ...readyGateOptions({ [prerequisite]: value })
    });
    const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

    assert.equal(gate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF", prerequisite);
    assert.equal(validation.valid, false, prerequisite);
    assert.ok(gate.hold_reasons.includes(holdReason), prerequisite);
    assert.equal(gate.feeds.measurement_cell_series_snapshot_implementation_decision, false);
    for (const feed of REQUIRED_FALSE_FEEDS) {
      assert.equal(gate.feeds[feed], false, `${prerequisite}:${feed}`);
    }
  }
});

test("gate validation rejects forged ready gates with extra feeds or persistence side doors", () => {
  const source = repeatedPackage();
  const gate = forgedReadyGate(source);

  assert.equal(
    validateMeasurementCellSeriesPersistencePromotionGate(gate, {
      sourceRepeatedPilotEvidencePackage: source,
      sourceFixture: sourceFixture()
    }).valid,
    false
  );

  const extraFeed = clone(gate);
  extraFeed.feeds.customer_export = true;
  extraFeed.gate_hash = measurementCellSeriesPersistencePromotionGateHash(extraFeed);
  assert.equal(validateMeasurementCellSeriesPersistencePromotionGate(extraFeed).valid, false);

  const missingSourceRef = clone(gate);
  delete missingSourceRef.source_series_ref;
  missingSourceRef.gate_hash = measurementCellSeriesPersistencePromotionGateHash(missingSourceRef);
  assert.equal(validateMeasurementCellSeriesPersistencePromotionGate(missingSourceRef).valid, false);

  const authorizedPersistence = clone(gate);
  authorizedPersistence.gate_scope.persistence_authorized = true;
  authorizedPersistence.gate_hash =
    measurementCellSeriesPersistencePromotionGateHash(authorizedPersistence);
  assert.equal(
    validateMeasurementCellSeriesPersistencePromotionGate(authorizedPersistence, {
      sourceRepeatedPilotEvidencePackage: source,
      sourceFixture: sourceFixture()
    }).valid,
    false
  );

  const evidenceSnapshot = clone(gate);
  evidenceSnapshot.feeds.evidence_snapshot_extension = true;
  evidenceSnapshot.gate_hash = measurementCellSeriesPersistencePromotionGateHash(evidenceSnapshot);
  assert.equal(
    validateMeasurementCellSeriesPersistencePromotionGate(evidenceSnapshot, {
      sourceRepeatedPilotEvidencePackage: source,
      sourceFixture: sourceFixture()
    }).valid,
    false
  );

  const customerVisible = clone(gate);
  customerVisible.customer_exposure.customer_visible = true;
  customerVisible.gate_hash = measurementCellSeriesPersistencePromotionGateHash(customerVisible);
  assert.equal(
    validateMeasurementCellSeriesPersistencePromotionGate(customerVisible, {
      sourceRepeatedPilotEvidencePackage: source,
      sourceFixture: sourceFixture()
    }).valid,
    false
  );
});

test("gate validation rejects unsafe extra caveats or blocked uses after rehash", () => {
  const source = repeatedPackage();
  const gate = forgedReadyGate(source);
  const forged = clone(gate);
  forged.required_caveats.push("SELECT user_id FROM raw_rows");
  forged.blocked_uses.push("person@example.com");
  forged.gate_hash = measurementCellSeriesPersistencePromotionGateHash(forged);

  const validation = validateMeasurementCellSeriesPersistencePromotionGate(forged, {
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: sourceFixture()
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /required_caveats/.test(gap)),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => /blocked_uses/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("gate validation rejects forged ready gates with stale validation summary or hold reasons", () => {
  const source = repeatedPackage();
  const gate = forgedReadyGate(source);

  const staleSummary = clone(gate);
  staleSummary.validation_summary.valid = false;
  staleSummary.validation_summary.gaps = ["stale held validation summary"];
  staleSummary.gate_hash = measurementCellSeriesPersistencePromotionGateHash(staleSummary);
  let validation = validateMeasurementCellSeriesPersistencePromotionGate(staleSummary, {
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: sourceFixture()
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /validation_summary/.test(gap)),
    validation.gaps.join("; ")
  );

  const staleHoldReasons = clone(gate);
  staleHoldReasons.hold_reasons = ["durable_series_read_path_not_proven"];
  staleHoldReasons.gate_hash =
    measurementCellSeriesPersistencePromotionGateHash(staleHoldReasons);
  validation = validateMeasurementCellSeriesPersistencePromotionGate(staleHoldReasons, {
    sourceRepeatedPilotEvidencePackage: source,
    sourceFixture: sourceFixture()
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /hold_reasons/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("series persistence promotion gate CLI emits current hold state", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs",
      FIXTURE_PATH
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const gate = JSON.parse(output);
  const validation = validateMeasurementCellSeriesPersistencePromotionGate(gate);

  assert.equal(gate.gate_state, "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF");
  assert.equal(validation.valid, false);
  assert.equal(gate.prerequisites.repeated_milestone_evidence_valid, true);
  assert.equal(gate.feeds.measurement_cell_series_snapshot_write, false);
});

test("series persistence promotion gate remains route, UI, schema, and migration free", () => {
  assert.ok(
    existsSync("docs/contracts/ai-value-measurement-cell-series-persistence-promotion-gate/README.md"),
    "series persistence promotion gate contract README must exist"
  );

  const physicalSurfaceMatches = searchText([
    "-n",
    "measurement_cell_series_snapshots|evidence_continuity_snapshot|extends_evidence_snapshots",
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations",
    "backend/src",
    "frontend/src/pages",
    "frontend/src/lib"
  ]);
  assert.equal(physicalSurfaceMatches, "");
});
