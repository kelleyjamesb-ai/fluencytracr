import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  FLUENCY_BASELINE_SCHEMA_VERSION,
  buildCustomerExposurePolicyFromPostSalesWorkflow,
  buildPostSalesWorkflowOrchestrator,
  validateCustomerExposurePolicy
} from "../shared/dist/aiValueEngine/index.js";

const ENTRY_EXAMPLES = "docs/contracts/ai-value-client-evidence-entry/examples";

const REQUIRED_SURFACES = [
  "ai_fluency_initial_posture",
  "evidence_gap_review",
  "client_evidence_requests",
  "client_evidence_entry_statuses",
  "validated_source_packages",
  "updated_evidence_snapshot",
  "claim_readiness_preview",
  "executive_readout_preparation",
  "export_package"
];

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

function buildBaseline() {
  return {
    schema_version: FLUENCY_BASELINE_SCHEMA_VERSION,
    baseline_id: "fluency_baseline_customer_exposure_2026_05",
    org_id: "org_example",
    instrument: {
      instrument_id: "ai_fluency_long_v1",
      item_count: 24
    },
    window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    collection_mode: "kickoff",
    cohorts: [
      {
        cohort_id: "customer_support_all",
        cohort_label: "Customer Support",
        respondent_count: 42,
        suppressed: false,
        construct_scores: {
          confidence: { mean: 3.8 },
          usage_quality: { mean: 3.4 },
          behavior_change: { mean: 3.1 },
          leadership_reinforcement: { mean: 3.6 },
          capability_growth: { mean: 3.5 },
          ai_attitude: { mean: 3.9 },
          behavioral_intent: { mean: 3.7 },
          perceived_ai_impact: { mean: 3.2 }
        }
      }
    ],
    governance: {
      respondent_identifiers_included: false,
      person_level_results_shared: false,
      used_for_individual_scoring: false,
      used_for_team_ranking: false
    }
  };
}

function baseInputs(overrides = {}) {
  return {
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    hypothesisStatement:
      "AI-assisted support workflows may improve aggregate case resolution posture when paired with customer-owned evidence.",
    businessObjective:
      "Improve aggregate support case resolution experience without weakening quality controls.",
    valueRoute: "capacity_creation",
    primaryMetricId: "support_median_resolution_hours",
    primaryMetricName: "Median resolution time",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    comparisonWindowStart: "2026-06-01",
    comparisonWindowEnd: "2026-06-30",
    generatedAt: "2026-06-13T00:00:00.000Z",
    orchestratorId: "post_sales_workflow_orchestrator_customer_exposure_test",
    customerJourneyId: "customer_journey_customer_exposure_test",
    bridgeId: "ai_fluency_intake_bridge_customer_exposure_test",
    measurementPlanId: "measurement_plan_customer_exposure_test",
    evidenceSnapshotId: "evidence_snapshot_customer_exposure_test",
    assemblyId: "evidence_collection_assembly_customer_exposure_test",
    handoffId: "claim_readiness_handoff_customer_exposure_test",
    aiFluencyBaseline: buildBaseline(),
    ...overrides
  };
}

function entryExample(file, measurementPlanId = "measurement_plan_customer_exposure_test") {
  const entry = readJson(`${ENTRY_EXAMPLES}/${file}`);
  entry.org_id = "org_example";
  entry.measurement_plan_id = measurementPlanId;
  entry.request_id =
    `client_evidence_request_${measurementPlanId}_${entry.evidence_layer}`;
  entry.covered_window = {
    window_start: "2026-05-01",
    window_end: "2026-05-31"
  };
  entry.aggregate_grain = "workflow_family";
  return entry;
}

function buildPolicy(orchestratorOverrides = {}, policyOptions = {}) {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs(orchestratorOverrides));
  return buildCustomerExposurePolicyFromPostSalesWorkflow(orchestrator, {
    policyId: "customer_exposure_policy_test",
    createdAt: "2026-06-13T00:00:00.000Z",
    ...policyOptions
  });
}

function decision(policy, surfaceId) {
  return policy.exposure_decisions.find((item) => item.surface_id === surfaceId);
}

function expectValid(policy) {
  const result = validateCustomerExposurePolicy(policy);
  assert.equal(result.valid, true, result.gaps.join("; "));
  return result;
}

function expectInvalid(policy, expectedGapPattern) {
  const result = validateCustomerExposurePolicy(policy);
  assert.equal(result.valid, false, "Expected policy to fail validation");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("AI Fluency-only posture is customer-visible as posture, not value proof", () => {
  const policy = buildPolicy();
  const result = expectValid(policy);
  const posture = decision(policy, "ai_fluency_initial_posture");

  assert.equal(result.feeds.customer_visible_posture, true);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.equal(posture.customer_visible, true);
  assert.equal(posture.exposure_scope, "posture_only");
  assert.equal(posture.value_proof_allowed, false);
  assert.equal(policy.source_availability_boundary.ai_fluency_baseline_is_value_proof, false);
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(policy.blocked_uses.includes(use), `missing ${use}`);
    assert.ok(posture.blocked_customer_outputs.length > 0);
  }
});

test("policy has explicit exposure decisions for all required post-sales surfaces", () => {
  const policy = buildPolicy({
    clientEvidenceEntries: [
      entryExample("manual-layer-2-user-voice-entry.json")
    ]
  });
  expectValid(policy);

  assert.deepEqual(
    policy.exposure_decisions.map((item) => item.surface_id),
    REQUIRED_SURFACES
  );
  assert.equal(decision(policy, "evidence_gap_review").customer_visible, true);
  assert.equal(decision(policy, "client_evidence_requests").customer_visible, true);
  assert.equal(decision(policy, "client_evidence_requests").exposure_state, "allowed_with_caveats");
  assert.equal(decision(policy, "client_evidence_requests").customer_action_required, true);
  assert.equal(decision(policy, "client_evidence_entry_statuses").customer_visible, true);
  assert.equal(decision(policy, "validated_source_packages").customer_visible, true);
  assert.equal(decision(policy, "updated_evidence_snapshot").customer_visible, true);
  assert.equal(decision(policy, "claim_readiness_preview").customer_visible, true);
  assert.equal(decision(policy, "executive_readout_preparation").customer_visible, true);
  assert.equal(decision(policy, "export_package").customer_visible, false);
});

test("missing, held, suppressed, rejected, and not-computed evidence remains visible", () => {
  const unsafeEntry = entryExample("manual-layer-3-outcome-entry.json");
  unsafeEntry.raw_rows = [{ ticket_id: "raw-row-not-allowed" }];
  const policy = buildPolicy({
    clientEvidenceEntries: [unsafeEntry]
  });
  expectValid(policy);

  assert.equal(policy.missing_evidence_visibility.missing_evidence_visible, true);
  assert.equal(policy.missing_evidence_visibility.held_evidence_visible, true);
  assert.equal(policy.missing_evidence_visibility.suppressed_evidence_visible, true);
  assert.equal(policy.missing_evidence_visibility.rejected_evidence_visible, true);
  assert.equal(policy.missing_evidence_visibility.not_computed_evidence_visible, true);
  assert.equal(policy.missing_evidence_visibility.client_evidence_entry_status_count, 1);
  assert.equal(policy.missing_evidence_visibility.validated_source_package_count, 0);

  const hidden = clone(policy);
  hidden.missing_evidence_visibility.missing_evidence_visible = false;
  expectInvalid(hidden, /missing_evidence_visibility\.missing_evidence_visible/);
});

test("client evidence requests and entry status cannot upgrade claim readiness or become value proof", () => {
  const policy = buildPolicy();
  expectValid(policy);

  const requests = decision(policy, "client_evidence_requests");
  const statuses = decision(policy, "client_evidence_entry_statuses");
  assert.equal(requests.evidence_interpretation, "request_only_not_claim_readiness_upgrade");
  assert.equal(requests.value_proof_allowed, false);
  assert.equal(statuses.exposure_scope, "entry_status_only");
  assert.equal(statuses.value_proof_allowed, false);
  assert.equal(policy.source_availability_boundary.client_evidence_request_upgrades_claim_readiness, false);

  const unsafe = clone(policy);
  decision(unsafe, "client_evidence_requests").value_proof_allowed = true;
  expectInvalid(unsafe, /client_evidence_requests\.value_proof_allowed/);

  const uncaveated = clone(policy);
  decision(uncaveated, "client_evidence_requests").exposure_state = "allowed";
  expectInvalid(uncaveated, /client_evidence_requests\.exposure_state must be allowed_with_caveats/);
});

test("updated Evidence Snapshot exposure is limited to coverage posture and caveats", () => {
  const policy = buildPolicy({
    clientEvidenceEntries: [
      entryExample("manual-layer-2-user-voice-entry.json"),
      entryExample("manual-layer-3-outcome-entry.json")
    ]
  });
  expectValid(policy);

  const snapshot = decision(policy, "updated_evidence_snapshot");
  assert.equal(snapshot.exposure_scope, "coverage_status_caveats_blocked_uses_and_gap_summary");
  assert.equal(snapshot.value_proof_allowed, false);
  assert.equal(policy.source_availability_boundary.bigquery_source_availability_is_value_proof, false);
  assert.equal(policy.source_availability_boundary.vbd_is_value_proof, false);
  assert.equal(policy.source_availability_boundary.aggregate_workforce_context_upgrades_coverage, false);
});

test("full Playbook coverage and approvals still do not allow customer-facing financial output in this contract", () => {
  const policy = buildPolicy({}, {
    financeOrBusinessApprovalPresent: true,
    customerAssumptionApprovalPresent: true,
    exportGovernance: {
      approved: true,
      governance_document_ref: "export_governance_review_2026_06",
      approver_role: "value_governance_lead"
    }
  });
  policy.financial_claim_policy.full_playbook_coverage_present = true;
  policy.financial_claim_policy.upstream_financial_translation_allowed = true;
  expectValid(policy);

  assert.equal(policy.financial_claim_policy.financial_claims_allowed, false);
  assert.equal(policy.financial_claim_policy.customer_facing_financial_output_allowed, false);
  assert.equal(policy.export_policy.export_allowed, false);
  assert.equal(policy.export_policy.export_governance_approved, true);

  const unsafe = clone(policy);
  unsafe.financial_claim_policy.customer_facing_financial_output_allowed = true;
  expectInvalid(unsafe, /customer_facing_financial_output_allowed must remain false/);
});

test("customer-facing readout remains blocked or caveated until exposure policy allows it", () => {
  const policy = buildPolicy();
  expectValid(policy);

  assert.equal(policy.readout_policy.claim_readiness_preview_customer_visible, true);
  assert.equal(policy.readout_policy.claim_readiness_preview_scope, "boundary_preview_only");
  assert.equal(policy.readout_policy.executive_readout_preparation_status_customer_visible, true);
  assert.equal(policy.readout_policy.customer_facing_readout_allowed, false);
  assert.equal(policy.readout_policy.readout_caveats_required, true);

  const unsafe = clone(policy);
  unsafe.readout_policy.customer_facing_readout_allowed = true;
  unsafe.readout_policy.customer_facing_readout_state = "approved_financial_readout";
  expectInvalid(unsafe, /customer-facing readout can only be allowed/);
});

test("export remains blocked until a separate export governance contract exists", () => {
  const policy = buildPolicy({}, {
    exportGovernance: {
      approved: true,
      governance_document_ref: "export_governance_review_2026_06",
      approver_role: "value_governance_lead"
    }
  });
  expectValid(policy);

  assert.equal(policy.export_policy.export_governance_approved, true);
  assert.equal(policy.export_policy.export_allowed, false);
  assert.equal(policy.export_policy.export_state, "approved_but_financial_output_still_blocked");
  assert.equal(decision(policy, "export_package").exposure_state, "blocked");

  const unsafe = clone(policy);
  unsafe.export_policy.export_allowed = true;
  unsafe.export_policy.allowed_export_sections = ["evidence_gap_summary"];
  expectInvalid(unsafe, /export_allowed must remain false/);
});

test("raw, person-level, route, UI, ingestion, and persistence drift fails validation", () => {
  const policy = buildPolicy();
  const raw = clone(policy);
  raw.raw_rows = [{ row: "not allowed" }];
  expectInvalid(raw, /Forbidden field detected: raw_rows/);

  const person = clone(policy);
  person.notes = "Send this to employee_id 12345";
  expectInvalid(person, /Forbidden identifier value detected/);

  const route = clone(policy);
  route.persistence_policy.creates_backend_routes = true;
  expectInvalid(route, /persistence_policy\.creates_backend_routes/);

  const ui = clone(policy);
  ui.persistence_policy.creates_frontend_ui = true;
  expectInvalid(ui, /persistence_policy\.creates_frontend_ui/);

  const ingestion = clone(policy);
  ingestion.persistence_policy.creates_ingestion_jobs = true;
  expectInvalid(ingestion, /persistence_policy\.creates_ingestion_jobs/);
});

test("unsafe customer outputs and weakened blocked uses fail validation", () => {
  const policy = buildPolicy();
  const unsafeOutput = clone(policy);
  unsafeOutput.allowed_customer_outputs.push("customer_facing_financial_output");
  expectInvalid(unsafeOutput, /Unsafe allowed customer output detected/);

  const unsafeDecisionOutput = clone(policy);
  decision(unsafeDecisionOutput, "claim_readiness_preview")
    .allowed_customer_outputs.push("roi_output");
  expectInvalid(unsafeDecisionOutput, /Unsafe allowed customer output detected/);

  const weakened = clone(policy);
  weakened.blocked_uses = weakened.blocked_uses.filter(
    (use) => use !== "customer_facing_financial_output"
  );
  expectInvalid(weakened, /blocked_uses must include customer_facing_financial_output/);
});

test("unsafe economic and productivity field keys fail even outside allowed output arrays", () => {
  const policy = buildPolicy();

  const roi = clone(policy);
  roi.roi_output = { value: "not allowed" };
  expectInvalid(roi, /Forbidden field detected: roi_output/);

  const ebita = clone(policy);
  ebita.ebita_value = 1000000;
  expectInvalid(ebita, /Forbidden field detected: ebita_value/);

  const productivity = clone(policy);
  productivity.productivity_output = "not allowed";
  expectInvalid(productivity, /Forbidden field detected: productivity_output/);

  const financial = clone(policy);
  financial.customer_facing_financial_output = "not allowed";
  expectInvalid(financial, /Forbidden field detected: customer_facing_financial_output/);
});

test("source binding validation rejects status-only or mismatched policy objects", () => {
  const policy = buildPolicy();
  const invalid = clone(policy);
  invalid.source_binding.evidence_snapshot_validated = false;
  expectInvalid(invalid, /source_binding\.evidence_snapshot_validated/);

  const missingBinding = clone(policy);
  missingBinding.source_binding.evidence_snapshot_id = "";
  expectInvalid(missingBinding, /source_binding\.evidence_snapshot_id/);
});

test("documentation exists and no route or UI files were added for Phase 6", () => {
  assert.ok(
    existsSync("docs/contracts/ai-value-customer-exposure-policy/README.md"),
    "customer exposure policy README must exist"
  );

  const backendRouteFiles = readdirSync("backend/src").filter((file) =>
    /customer_exposure|post_sales_customer|customer_workflow/i.test(file)
  );
  const frontendFiles = readdirSync("frontend/src/pages").filter((file) =>
    /CustomerExposure|PostSalesCustomer|CustomerWorkflow/i.test(file)
  );
  assert.deepEqual(backendRouteFiles, []);
  assert.deepEqual(frontendFiles, []);
});
