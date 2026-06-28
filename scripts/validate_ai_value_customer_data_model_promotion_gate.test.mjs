import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMeasurementCellSnapshotProjectionFromObject,
  measurementCellSnapshotProjectionHash,
  validateMeasurementCellSnapshotProjection
} from "./run_ai_value_measurement_cell_snapshot_projection.mjs";
import {
  buildCustomerDataModelPromotionGateFromObject,
  customerDataModelPromotionGateHash,
  validateCustomerDataModelPromotionGate
} from "./run_ai_value_customer_data_model_promotion_gate.mjs";

const SNAPSHOT_PATH =
  "docs/contracts/ai-value-measurement-cell-snapshot-projection/examples/controlled-measurement-cell-snapshot.json";

const REQUIRED_FALSE_FEEDS = [
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
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
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
  "customer_data_model_read_route",
  "customer_data_model_write_route",
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

function validProjection() {
  const projection = buildMeasurementCellSnapshotProjectionFromObject(readJson(SNAPSHOT_PATH));
  const validation = validateMeasurementCellSnapshotProjection(projection);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return projection;
}

function readyPrerequisites(overrides = {}) {
  return {
    customer_projection_decision_state: "PROMOTE_SOURCE_BOUND_CUSTOMER_PROJECTION_CONTRACTS",
    route_projection_contract_state: "SOURCE_BOUND_ROUTE_PROJECTION_CONTRACT_READY",
    auth_tenant_enforcement_state: "ORG_SCOPED_AUTH_AND_TENANT_GUARDS_READY",
    legacy_readout_guard_state: "ROUTE_AND_UI_GUARD_RESOLVED",
    export_governance_state: "EXPORT_PROHIBITION_CONTRACT_READY",
    legal_trust_review_state: "APPROVED_FOR_STATUS_POSTURE_ONLY",
    privacy_k_min_review_state: "AGGREGATE_PRIVACY_POSTURE_READY",
    customer_value_language_state: "POSTURE_ONLY_VALUE_LANGUAGE_APPROVED",
    ...overrides
  };
}

function readyPrerequisiteProofRefs(prerequisites = readyPrerequisites()) {
  return Object.fromEntries(
    Object.entries(prerequisites).map(([field, state]) => {
      const proof = {
        ref_id: `${field}_proof`,
        state,
        source_doc_ref: `docs.architecture.${field}`
      };
      return [field, { ...proof, proof_hash: sha256Json(proof) }];
    })
  );
}

function readyGateOptions(overrides = {}) {
  const prerequisites = readyPrerequisites(overrides);
  return {
    prerequisites,
    prerequisiteProofRefs: readyPrerequisiteProofRefs(prerequisites)
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("customer data model promotion gate rejects unsafe generated_at without echo", () => {
  const gate = buildCustomerDataModelPromotionGateFromObject({
    measurement_cell_snapshot_projection: validProjection(),
    generated_at: "SELECT user_id FROM raw_rows"
  });
  const serialized = JSON.stringify(gate);
  const validation = validateCustomerDataModelPromotionGate(gate);

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
});

test("customer data model promotion gate holds by default even with valid internal snapshot projection", () => {
  const gate = buildCustomerDataModelPromotionGateFromObject(validProjection());
  const validation = validateCustomerDataModelPromotionGate(gate);

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES");
  assert.equal(gate.decision_scope.internal_review_only, true);
  assert.equal(gate.decision_scope.separate_promotion_decision_required, true);
  assert.equal(gate.decision_scope.persistence_authorized, false);
  assert.equal(gate.decision_scope.route_authorized, false);
  assert.equal(gate.decision_scope.ui_authorized, false);
  assert.equal(gate.decision_scope.customer_facing_output_authorized, false);
  assert.equal(gate.prerequisites.measurement_cell_snapshot_projection_valid, true);
  assert.equal(gate.prerequisites.route_projection_contract_ready, false);
  assert.equal(gate.prerequisites.export_governance_ready, false);
  assert.equal(gate.prerequisites.legal_trust_review_ready, false);
  assert.ok(gate.hold_reasons.includes("customer_projection_decision_not_promoted"));
  assert.ok(gate.hold_reasons.includes("route_projection_contract_not_ready"));
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, `${feed} must remain false`);
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    assert.ok(gate.blocked_uses.includes(blockedUse), `missing ${blockedUse}`);
  }
});

test("customer data model promotion gate can become ready only for a separate persistence promotion decision", () => {
  const projection = validProjection();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, readyGateOptions());
  const validation = validateCustomerDataModelPromotionGate(gate, { sourceProjection: projection });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    gate.gate_state,
    "READY_FOR_SEPARATE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION"
  );
  assert.equal(gate.feeds.customer_data_model_persistence_promotion_decision, true);
  assert.equal(gate.feeds.customer_data_model_persistence_write, false);
  assert.equal(gate.feeds.backend_route, false);
  assert.equal(gate.feeds.frontend_ui, false);
  assert.equal(gate.decision_scope.separate_promotion_decision_required, true);
  assert.equal(gate.decision_scope.persistence_authorized, false);
  assert.equal(gate.customer_exposure.customer_visible, false);
  assert.equal(gate.customer_exposure.exposure_state, "not_authorized_by_gate");
});

test("ready gate validation rejects source projection ref drift after rehash", () => {
  const projection = validProjection();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, readyGateOptions());
  const drifted = clone(gate);
  drifted.source_projection_ref.projection_hash =
    "a".repeat(64);
  drifted.source_projection_ref.pipeline_boundary_hash =
    "b".repeat(64);
  drifted.source_projection_ref.metric_id = "different_metric";
  drifted.gate_hash = customerDataModelPromotionGateHash(drifted);

  const withoutSourceProjection = validateCustomerDataModelPromotionGate(drifted);
  const withSourceProjection = validateCustomerDataModelPromotionGate(drifted, {
    sourceProjection: projection
  });

  assert.equal(withoutSourceProjection.valid, false);
  assert.ok(
    withoutSourceProjection.gaps.some((gap) => /sourceProjection is required/.test(gap)),
    withoutSourceProjection.gaps.join("; ")
  );
  assert.equal(withSourceProjection.valid, false);
  assert.ok(
    withSourceProjection.gaps.some((gap) =>
      /source_projection_ref\.(projection_hash|pipeline_boundary_hash|metric_id)/.test(gap)
    ),
    withSourceProjection.gaps.join("; ")
  );
});

test("ready gate validation rejects false prerequisites after rehash", () => {
  const projection = validProjection();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, readyGateOptions());
  const forged = clone(gate);
  forged.prerequisites.route_projection_contract_ready = false;
  forged.prerequisites.legal_trust_review_ready = false;
  forged.gate_hash = customerDataModelPromotionGateHash(forged);

  const validation = validateCustomerDataModelPromotionGate(forged, {
    sourceProjection: projection
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("route_projection_contract_ready")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("legal_trust_review_ready")),
    validation.gaps.join("; ")
  );
});

test("ready gate validation rejects unsafe client refs even when source projection matches", () => {
  const projection = validProjection();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, readyGateOptions());
  gate.source_projection_ref.client_id = "client id with spaces";
  gate.gate_hash = customerDataModelPromotionGateHash(gate);

  const validation = validateCustomerDataModelPromotionGate(gate, {
    sourceProjection: projection
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("source_projection_ref.client_id must be safe compact metadata")
    ),
    validation.gaps.join("; ")
  );
});

test("ready gate accepts generated compact product refs from persisted Measurement Cell snapshots", () => {
  const projection = validProjection();
  projection.snapshot_identity.measurement_cell_id =
    "measurement_cell_org_example_customer_support_customer_support_case_resolution_workflow_family_customer_support_case_resolution_eligible_cases_2300_day_30_support_median_resolution_hours";
  projection.workflow_context.cohort_key =
    "workflow_family:customer_support_case_resolution|eligible_cases:2300";
  projection.projection_id =
    `measurement_cell_snapshot_projection:${projection.snapshot_identity.org_id}:${projection.snapshot_identity.measurement_cell_id}:v${projection.snapshot_identity.version}`;
  delete projection.projection_hash;
  projection.projection_hash = measurementCellSnapshotProjectionHash(projection);

  const projectionValidation = validateMeasurementCellSnapshotProjection(projection);
  assert.equal(projectionValidation.valid, true, projectionValidation.gaps.join("; "));

  const gate = buildCustomerDataModelPromotionGateFromObject(projection, readyGateOptions());
  const validation = validateCustomerDataModelPromotionGate(gate, {
    sourceProjection: projection
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(gate.source_projection_ref.projection_id, projection.projection_id);
  assert.equal(
    gate.source_projection_ref.measurement_cell_id,
    projection.snapshot_identity.measurement_cell_id
  );
  assert.equal(gate.source_projection_ref.cohort_key, projection.workflow_context.cohort_key);
});

test("gate holds on invalid or tampered Measurement Cell Snapshot projections", () => {
  const projection = validProjection();
  projection.source_context.aggregate_source_system = "sigma_export";
  projection.projection_hash = customerDataModelPromotionGateHash(projection);

  const gate = buildCustomerDataModelPromotionGateFromObject(projection, {
    ...readyGateOptions()
  });
  const validation = validateCustomerDataModelPromotionGate(gate);

  assert.equal(gate.gate_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT_PROJECTION");
  assert.equal(validation.valid, false);
  assert.ok(gate.hold_reasons.includes("measurement_cell_snapshot_projection_invalid"));
});

test("gate rejects raw, identifier, route, UI, export, live, model, and finance side doors without echo", () => {
  const gate = buildCustomerDataModelPromotionGateFromObject({
    measurement_cell_snapshot_projection: validProjection(),
    raw_rows: [{ employee_email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
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
  const validation = validateCustomerDataModelPromotionGate(gate);

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("proved"), false);
  assert.equal(hasNestedKey(gate, "raw_rows"), false);
  assert.equal(hasNestedKey(gate, "query_text"), false);
});

test("gate rejects dual projection and snapshot wrappers instead of ignoring sidecars", () => {
  const gate = buildCustomerDataModelPromotionGateFromObject(
    {
      measurement_cell_snapshot_projection: validProjection(),
      snapshot: {
        raw_rows: [{ employee_email: "person@example.com" }],
        query_text: "SELECT user_id FROM raw_rows"
      }
    },
    readyGateOptions()
  );
  const serialized = JSON.stringify(gate);
  const validation = validateCustomerDataModelPromotionGate(gate);

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
});

test("each missing customer data model prerequisite keeps the gate held with false implementation feeds", () => {
  const missingPrerequisites = [
    ["customer_projection_decision_state", "HOLD_FOR_SOURCE_BOUND_PROJECTION_CONTRACTS", "customer_projection_decision_not_promoted"],
    ["route_projection_contract_state", "not_promoted", "route_projection_contract_not_ready"],
    ["auth_tenant_enforcement_state", "not_promoted", "auth_tenant_enforcement_not_ready"],
    ["legacy_readout_guard_state", "not_resolved", "legacy_readout_guard_not_resolved"],
    ["export_governance_state", "not_promoted", "export_governance_not_ready"],
    ["legal_trust_review_state", "not_approved", "legal_trust_review_not_ready"],
    ["privacy_k_min_review_state", "not_promoted", "privacy_k_min_review_not_ready"],
    ["customer_value_language_state", "not_approved", "customer_value_language_not_ready"]
  ];

  for (const [prerequisite, value, holdReason] of missingPrerequisites) {
    const gate = buildCustomerDataModelPromotionGateFromObject(validProjection(), {
      ...readyGateOptions({ [prerequisite]: value })
    });
    const validation = validateCustomerDataModelPromotionGate(gate);

    assert.equal(gate.gate_state, "HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES", prerequisite);
    assert.equal(validation.valid, false, prerequisite);
    assert.ok(gate.hold_reasons.includes(holdReason), prerequisite);
    assert.equal(gate.feeds.customer_data_model_persistence_promotion_decision, false, prerequisite);
    for (const feed of REQUIRED_FALSE_FEEDS) {
      assert.equal(gate.feeds[feed], false, `${prerequisite}:${feed}`);
    }
  }
});

test("gate validation rejects forged ready gates with extra feeds or missing projection refs", () => {
  const projection = validProjection();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, readyGateOptions());

  const extraFeed = clone(gate);
  extraFeed.feeds.customer_export = true;
  extraFeed.gate_hash = customerDataModelPromotionGateHash(extraFeed);
  assert.equal(validateCustomerDataModelPromotionGate(extraFeed).valid, false);

  const missingProjection = clone(gate);
  delete missingProjection.source_projection_ref;
  missingProjection.gate_hash = customerDataModelPromotionGateHash(missingProjection);
  assert.equal(validateCustomerDataModelPromotionGate(missingProjection).valid, false);

  const authorizedPersistence = clone(gate);
  authorizedPersistence.decision_scope.persistence_authorized = true;
  authorizedPersistence.gate_hash = customerDataModelPromotionGateHash(authorizedPersistence);
  assert.equal(validateCustomerDataModelPromotionGate(authorizedPersistence).valid, false);

  const customerVisible = clone(gate);
  customerVisible.customer_exposure.customer_visible = true;
  customerVisible.gate_hash = customerDataModelPromotionGateHash(customerVisible);
  assert.equal(validateCustomerDataModelPromotionGate(customerVisible, { sourceProjection: projection }).valid, false);

  const routeAuthorized = clone(gate);
  routeAuthorized.decision_scope.route_authorized = true;
  routeAuthorized.gate_hash = customerDataModelPromotionGateHash(routeAuthorized);
  assert.equal(validateCustomerDataModelPromotionGate(routeAuthorized, { sourceProjection: projection }).valid, false);

  const routePolicy = clone(gate);
  routePolicy.boundary_policy.creates_backend_route = true;
  routePolicy.gate_hash = customerDataModelPromotionGateHash(routePolicy);
  assert.equal(validateCustomerDataModelPromotionGate(routePolicy, { sourceProjection: projection }).valid, false);

  const writeFeed = clone(gate);
  writeFeed.feeds.customer_data_model_persistence_write = true;
  writeFeed.gate_hash = customerDataModelPromotionGateHash(writeFeed);
  assert.equal(validateCustomerDataModelPromotionGate(writeFeed, { sourceProjection: projection }).valid, false);
});

test("customer data model promotion gate CLI emits current hold state", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_customer_data_model_promotion_gate.mjs",
      "docs/contracts/ai-value-measurement-cell-snapshot-projection/examples/controlled-measurement-cell-snapshot.json"
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const gate = JSON.parse(output);
  const validation = validateCustomerDataModelPromotionGate(gate);

  assert.equal(gate.gate_state, "HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES");
  assert.equal(validation.valid, false);
  assert.equal(gate.prerequisites.measurement_cell_snapshot_projection_valid, true);
  assert.equal(gate.feeds.customer_data_model_persistence_write, false);
});

test("customer data model gate remains route, export, and UI free", () => {
  assert.ok(
    existsSync("docs/contracts/ai-value-customer-data-model-promotion-gate/README.md"),
    "customer data model promotion gate contract README must exist"
  );

  const backendRouteFiles = existsSync("backend/src")
    ? readdirSync("backend/src").filter((file) => /customer.?data.?model/i.test(file))
    : [];
  const frontendPageFiles = existsSync("frontend/src/pages")
    ? readdirSync("frontend/src/pages").filter((file) => /customer.?data.?model/i.test(file))
    : [];
  assert.deepEqual(backendRouteFiles, []);
  assert.deepEqual(frontendPageFiles, []);
});
