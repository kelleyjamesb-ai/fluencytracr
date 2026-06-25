import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMeasurementCellSnapshotProjectionFromObject,
  validateMeasurementCellSnapshotProjection
} from "./run_ai_value_measurement_cell_snapshot_projection.mjs";
import {
  buildCustomerDataModelPromotionGateFromObject,
  customerDataModelPromotionGateHash,
  validateCustomerDataModelPromotionGate
} from "./run_ai_value_customer_data_model_promotion_gate.mjs";
import {
  buildCustomerDataModelPersistencePromotionDecisionFromObject,
  customerDataModelPersistencePromotionDecisionHash,
  validateCustomerDataModelPersistencePromotionDecision
} from "./run_ai_value_customer_data_model_persistence_promotion_decision.mjs";

const SNAPSHOT_PATH =
  "docs/contracts/ai-value-measurement-cell-snapshot-projection/examples/controlled-measurement-cell-snapshot.json";

const REQUIRED_FALSE_FEEDS = [
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
  "customer_data_model_migration_creation",
  "customer_data_model_repository_write_path",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
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
  "customer_data_model_migration_creation",
  "customer_data_model_repository_write_path",
  "customer_data_model_read_route",
  "customer_data_model_write_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "live_connector_execution",
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

function readyGateFor(projection) {
  const prerequisites = readyPrerequisites();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, {
    prerequisites,
    prerequisiteProofRefs: readyPrerequisiteProofRefs(prerequisites)
  });
  const validation = validateCustomerDataModelPromotionGate(gate, {
    sourceProjection: projection
  });
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return gate;
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("customer data model persistence promotion decision rejects unsafe generated_at without echo", () => {
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject({
    measurement_cell_snapshot_projection: validProjection(),
    generated_at: "SELECT user_id FROM raw_rows",
    raw_rows: [{ employee_email: "person@example.com" }]
  });
  const serialized = JSON.stringify(decision);
  const validation = validateCustomerDataModelPersistencePromotionDecision(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
});

test("customer data model persistence promotion decision holds by default", () => {
  const projection = validProjection();
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(projection);
  const validation = validateCustomerDataModelPersistencePromotionDecision(decision, {
    sourceProjection: projection
  });

  assert.equal(validation.valid, false);
  assert.equal(
    decision.decision_state,
    "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PREREQUISITES"
  );
  assert.equal(decision.source_gate_ref.gate_state, "HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES");
  assert.equal(decision.prerequisites.customer_data_model_promotion_gate_valid, true);
  assert.equal(decision.hold_reasons.includes("customer_data_model_promotion_gate_invalid"), false);
  assert.equal(decision.persistence_scope.persistence_authorized, false);
  assert.equal(decision.persistence_scope.schema_authorized, false);
  assert.equal(decision.persistence_scope.repository_write_authorized, false);
  assert.equal(decision.customer_exposure.customer_visible, false);
  assert.equal(decision.customer_exposure.exposure_state, "not_authorized_by_decision");
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    assert.ok(decision.blocked_uses.includes(blockedUse), `missing ${blockedUse}`);
  }
});

test("persistence promotion decision can only become ready for a later implementation slice", () => {
  const projection = validProjection();
  const gate = readyGateFor(projection);
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(gate, {
    sourceProjection: projection
  });
  const validation = validateCustomerDataModelPersistencePromotionDecision(decision, {
    sourceProjection: projection,
    sourceGate: gate
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    decision.decision_state,
    "READY_FOR_EXACT_SCOPE_CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION"
  );
  assert.equal(decision.feeds.customer_data_model_persistence_implementation_decision, true);
  assert.equal(decision.feeds.customer_data_model_persistence_write, false);
  assert.equal(decision.feeds.customer_data_model_schema_creation, false);
  assert.equal(decision.persistence_scope.separate_implementation_decision_required, true);
  assert.equal(decision.persistence_scope.persistence_authorized, false);
  assert.equal(decision.persistence_scope.customer_read_authorized, false);
  assert.equal(decision.persistence_scope.customer_write_authorized, false);
});

test("persistence promotion decision rejects forged ready gates with drift after rehash", () => {
  const projection = validProjection();
  const gate = readyGateFor(projection);
  const forgedGate = clone(gate);
  forgedGate.source_projection_ref.metric_id = "forged_metric";
  forgedGate.gate_hash = customerDataModelPromotionGateHash(forgedGate);

  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(forgedGate, {
    sourceProjection: projection
  });
  const validation = validateCustomerDataModelPersistencePromotionDecision(decision, {
    sourceProjection: projection,
    sourceGate: forgedGate
  });

  assert.equal(validation.valid, false);
  assert.equal(decision.decision_state, "HOLD_FOR_VALID_CUSTOMER_DATA_MODEL_PROMOTION_GATE");
  assert.ok(
    decision.hold_reasons.includes("customer_data_model_promotion_gate_invalid"),
    decision.hold_reasons.join("; ")
  );
});

test("persistence promotion decision rejects unsafe source refs from rehashed held gates without echo", () => {
  const projection = validProjection();
  const heldGate = buildCustomerDataModelPromotionGateFromObject(projection);
  heldGate.source_projection_ref.metric_id = "table_id:raw_users";
  heldGate.gate_hash = customerDataModelPromotionGateHash(heldGate);

  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(heldGate, {
    sourceProjection: projection
  });
  const serialized = JSON.stringify(decision);
  const validation = validateCustomerDataModelPersistencePromotionDecision(decision, {
    sourceProjection: projection,
    sourceGate: heldGate
  });

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_CUSTOMER_DATA_MODEL_PROMOTION_GATE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("table_id:raw_users"), false);
});

test("persistence promotion decision rejects unsafe wrappers without echo", () => {
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject({
    measurement_cell_snapshot_projection: validProjection(),
    raw_rows: [{ employee_email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    persistence_write: true,
    customer_facing_output: true,
    confidence_score: 0.9,
    roi: 100
  });
  const serialized = JSON.stringify(decision);
  const validation = validateCustomerDataModelPersistencePromotionDecision(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(hasNestedKey(decision, "raw_rows"), false);
  assert.equal(hasNestedKey(decision, "query_text"), false);
});

test("persistence promotion decision validation rejects forged implementation authorization", () => {
  const projection = validProjection();
  const gate = readyGateFor(projection);
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(gate, {
    sourceProjection: projection
  });

  const forged = clone(decision);
  forged.persistence_scope.persistence_authorized = true;
  forged.feeds.customer_data_model_persistence_write = true;
  forged.decision_hash = customerDataModelPersistencePromotionDecisionHash(forged);

  const validation = validateCustomerDataModelPersistencePromotionDecision(forged, {
    sourceProjection: projection,
    sourceGate: gate
  });

  assert.equal(validation.valid, false);
});

test("persistence promotion decision validation rejects ready decisions with non-empty validation gaps", () => {
  const projection = validProjection();
  const gate = readyGateFor(projection);
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(gate, {
    sourceProjection: projection
  });
  const forged = clone(decision);
  forged.validation_summary.gaps = ["customer_data_model_persistence_write"];
  forged.decision_hash = customerDataModelPersistencePromotionDecisionHash(forged);

  const validation = validateCustomerDataModelPersistencePromotionDecision(forged, {
    sourceProjection: projection,
    sourceGate: gate
  });

  assert.equal(validation.valid, false);
});

test("customer data model persistence promotion decision CLI emits hold state", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_customer_data_model_persistence_promotion_decision.mjs",
      SNAPSHOT_PATH
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const decision = JSON.parse(output);

  assert.equal(
    decision.decision_state,
    "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PREREQUISITES"
  );
  assert.equal(decision.feeds.customer_data_model_persistence_write, false);
});
