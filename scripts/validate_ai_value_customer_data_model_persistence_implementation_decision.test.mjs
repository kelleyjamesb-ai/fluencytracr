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
  validateCustomerDataModelPromotionGate
} from "./run_ai_value_customer_data_model_promotion_gate.mjs";
import {
  buildCustomerDataModelPersistencePromotionDecisionFromObject,
  customerDataModelPersistencePromotionDecisionHash,
  validateCustomerDataModelPersistencePromotionDecision
} from "./run_ai_value_customer_data_model_persistence_promotion_decision.mjs";
import {
  buildCustomerDataModelPersistenceImplementationDecisionFromObject,
  customerDataModelPersistenceImplementationDecisionHash,
  validateCustomerDataModelPersistenceImplementationDecision
} from "./run_ai_value_customer_data_model_persistence_implementation_decision.mjs";

const SNAPSHOT_PATH =
  "docs/contracts/ai-value-measurement-cell-snapshot-projection/examples/controlled-measurement-cell-snapshot.json";

const REQUIRED_FALSE_FEEDS = [
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

function readyChain() {
  const projection = validProjection();
  const prerequisites = readyPrerequisites();
  const gate = buildCustomerDataModelPromotionGateFromObject(projection, {
    prerequisites,
    prerequisiteProofRefs: readyPrerequisiteProofRefs(prerequisites)
  });
  const gateValidation = validateCustomerDataModelPromotionGate(gate, {
    sourceProjection: projection
  });
  assert.equal(gateValidation.valid, true, gateValidation.gaps.join("; "));

  const promotionDecision = buildCustomerDataModelPersistencePromotionDecisionFromObject(gate, {
    sourceProjection: projection
  });
  const promotionValidation = validateCustomerDataModelPersistencePromotionDecision(
    promotionDecision,
    { sourceProjection: projection, sourceGate: gate }
  );
  assert.equal(promotionValidation.valid, true, promotionValidation.gaps.join("; "));

  return { projection, gate, promotionDecision };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("customer data model implementation decision rejects unsafe generated_at without echo", () => {
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject({
    source_promotion_decision: readyChain().promotionDecision,
    generated_at: "SELECT user_id FROM raw_rows",
    raw_rows: [{ employee_email: "person@example.com" }]
  });
  const serialized = JSON.stringify(decision);
  const validation = validateCustomerDataModelPersistenceImplementationDecision(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
});

test("customer data model implementation decision holds by default", () => {
  const projection = validProjection();
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(projection);
  const validation = validateCustomerDataModelPersistenceImplementationDecision(decision, {
    sourceProjection: projection
  });

  assert.equal(validation.valid, false);
  assert.equal(
    decision.decision_state,
    "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION"
  );
  assert.equal(decision.implementation_scope.persistence_table_authorized, false);
  assert.equal(decision.implementation_scope.prisma_model_authorized, false);
  assert.equal(decision.implementation_scope.migration_authorized, false);
  assert.equal(decision.implementation_scope.repository_write_authorized, false);
  assert.equal(decision.implementation_scope.repository_read_authorized, false);
  assert.equal(decision.implementation_scope.route_authorized, false);
  assert.equal(decision.implementation_scope.ui_authorized, false);
  assert.equal(decision.implementation_scope.export_authorized, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
  }
});

test("customer data model implementation decision promotes only compact persistence scope", () => {
  const { projection, gate, promotionDecision } = readyChain();
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(
    promotionDecision,
    { sourceProjection: projection, sourceGate: gate }
  );
  const validation = validateCustomerDataModelPersistenceImplementationDecision(decision, {
    sourceProjection: projection,
    sourceGate: gate,
    sourcePromotionDecision: promotionDecision
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    decision.decision_state,
    "PROMOTE_COMPACT_CUSTOMER_DATA_MODEL_SNAPSHOT_PERSISTENCE"
  );
  assert.equal(decision.physical_model.table_name, "ai_value_customer_data_model_snapshots");
  assert.equal(decision.physical_model.source_authority, "measurement_cell_snapshots");
  assert.equal(decision.implementation_scope.persistence_table_authorized, true);
  assert.equal(decision.implementation_scope.prisma_model_authorized, true);
  assert.equal(decision.implementation_scope.migration_authorized, true);
  assert.equal(decision.implementation_scope.repository_write_authorized, true);
  assert.equal(decision.implementation_scope.repository_read_authorized, true);
  assert.equal(decision.implementation_scope.route_authorized, false);
  assert.equal(decision.implementation_scope.ui_authorized, false);
  assert.equal(decision.implementation_scope.customer_facing_output_authorized, false);
  assert.equal(decision.feeds.customer_data_model_compact_persistence_table, true);
  assert.equal(decision.feeds.customer_data_model_repository_write_path, true);
  assert.equal(decision.feeds.customer_data_model_repository_read_path, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
  }
});

test("implementation decision rejects forged source decision drift after rehash", () => {
  const { projection, gate, promotionDecision } = readyChain();
  const forgedPromotionDecision = clone(promotionDecision);
  forgedPromotionDecision.source_gate_ref.metric_id = "forged_metric";
  forgedPromotionDecision.decision_hash =
    customerDataModelPersistencePromotionDecisionHash(forgedPromotionDecision);

  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(
    forgedPromotionDecision,
    { sourceProjection: projection, sourceGate: gate }
  );
  const validation = validateCustomerDataModelPersistenceImplementationDecision(decision, {
    sourceProjection: projection,
    sourceGate: gate,
    sourcePromotionDecision: forgedPromotionDecision
  });

  assert.equal(validation.valid, false);
  assert.equal(
    decision.decision_state,
    "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION"
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourcePromotionDecision")),
    validation.gaps.join("; ")
  );
});

test("implementation decision rejects unsafe wrappers without echo", () => {
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject({
    source_promotion_decision: readyChain().promotionDecision,
    raw_rows: [{ employee_email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    customer_facing_output: true,
    probability_score: 0.9,
    roi: 100
  });
  const serialized = JSON.stringify(decision);
  const validation = validateCustomerDataModelPersistenceImplementationDecision(decision);

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(hasNestedKey(decision, "raw_rows"), false);
  assert.equal(hasNestedKey(decision, "query_text"), false);
});

test("implementation decision rejects unsafe source sidecars even when clean source options are supplied", () => {
  const { projection, gate, promotionDecision } = readyChain();

  for (const sidecarField of ["source_projection", "source_gate", "source_promotion_decision"]) {
    const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(
      {
        [sidecarField]: {
          raw_rows: [{ user_id: "person-123" }],
          query_text: "SELECT user_id FROM raw_rows"
        }
      },
      {
        sourceProjection: projection,
        sourceGate: gate,
        sourcePromotionDecision: promotionDecision
      }
    );
    const serialized = JSON.stringify(decision);
    const validation = validateCustomerDataModelPersistenceImplementationDecision(decision, {
      sourceProjection: projection,
      sourceGate: gate,
      sourcePromotionDecision: promotionDecision
    });

    assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE", sidecarField);
    assert.equal(validation.valid, false, sidecarField);
    assert.equal(serialized.includes("person-123"), false, sidecarField);
    assert.equal(serialized.includes("SELECT user_id"), false, sidecarField);
  }
});

test("implementation decision validation rejects forged route and output authorization", () => {
  const { projection, gate, promotionDecision } = readyChain();
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(
    promotionDecision,
    { sourceProjection: projection, sourceGate: gate }
  );
  const forged = clone(decision);
  forged.implementation_scope.route_authorized = true;
  forged.implementation_scope.customer_facing_output_authorized = true;
  forged.feeds.backend_route = true;
  forged.feeds.customer_facing_output = true;
  forged.decision_hash = customerDataModelPersistenceImplementationDecisionHash(forged);

  const validation = validateCustomerDataModelPersistenceImplementationDecision(forged, {
    sourceProjection: projection,
    sourceGate: gate,
    sourcePromotionDecision: promotionDecision
  });

  assert.equal(validation.valid, false);
});

test("implementation decision validation rejects physical model drift", () => {
  const { projection, gate, promotionDecision } = readyChain();
  const decision = buildCustomerDataModelPersistenceImplementationDecisionFromObject(
    promotionDecision,
    { sourceProjection: projection, sourceGate: gate }
  );
  const forged = clone(decision);
  forged.physical_model.table_name = "customer_value_reports";
  forged.physical_model.required_columns.push("query_text");
  forged.decision_hash = customerDataModelPersistenceImplementationDecisionHash(forged);

  const validation = validateCustomerDataModelPersistenceImplementationDecision(forged, {
    sourceProjection: projection,
    sourceGate: gate,
    sourcePromotionDecision: promotionDecision
  });

  assert.equal(validation.valid, false);
});

test("customer data model implementation decision CLI emits hold state", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_customer_data_model_persistence_implementation_decision.mjs",
      SNAPSHOT_PATH
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const decision = JSON.parse(output);

  assert.equal(
    decision.decision_state,
    "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION"
  );
  assert.equal(decision.implementation_scope.persistence_table_authorized, false);
});
