import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FLUENCY_BASELINE_SCHEMA_VERSION,
  buildPostSalesWorkflowOrchestrator,
  validateEvidenceSnapshot,
  validatePostSalesWorkflowOrchestrator
} from "../shared/dist/aiValueEngine/index.js";

const ENTRY_EXAMPLES = "docs/contracts/ai-value-client-evidence-entry/examples";
const SOURCE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";

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
    baseline_id: "fluency_baseline_post_sales_orchestrator_2026_05",
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
    orchestratorId: "post_sales_workflow_orchestrator_test",
    customerJourneyId: "customer_journey_post_sales_orchestrator_test",
    bridgeId: "ai_fluency_intake_bridge_post_sales_orchestrator_test",
    measurementPlanId: "measurement_plan_post_sales_orchestrator_test",
    evidenceSnapshotId: "evidence_snapshot_post_sales_orchestrator_test",
    assemblyId: "evidence_collection_assembly_post_sales_orchestrator_test",
    handoffId: "claim_readiness_handoff_post_sales_orchestrator_test",
    aiFluencyBaseline: buildBaseline(),
    ...overrides
  };
}

function entryExample(file, measurementPlanId = "measurement_plan_post_sales_orchestrator_test") {
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

function sourcePackageExample(file) {
  const pkg = readJson(`${SOURCE_EXAMPLES}/${file}`);
  pkg.org_id = "org_example";
  pkg.covered_window = {
    window_start: "2026-05-01",
    window_end: "2026-05-31"
  };
  pkg.approved_aggregate_grain = "workflow_family";
  return pkg;
}

function expectValid(orchestrator) {
  const result = validatePostSalesWorkflowOrchestrator(orchestrator);
  assert.equal(result.valid, true, result.gaps.join("; "));
  const snapshotResult = validateEvidenceSnapshot(orchestrator.evidence_snapshot);
  assert.equal(snapshotResult.valid, true, snapshotResult.gaps.join("; "));
  return result;
}

function expectInvalid(orchestrator, expectedGapPattern) {
  const result = validatePostSalesWorkflowOrchestrator(orchestrator);
  assert.equal(result.valid, false, "Expected orchestrator to fail validation");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("AI Fluency-only journey produces Measurement Plan, evidence snapshot, evidence requests, and caveated handoff", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs());
  const result = expectValid(orchestrator);

  assert.equal(result.feeds.measurement_plan_draft, true);
  assert.equal(result.feeds.evidence_gap_review, true);
  assert.equal(result.feeds.client_evidence_requests, true);
  assert.equal(result.feeds.evidence_snapshot, true);
  assert.equal(result.feeds.claim_readiness_handoff, true);
  assert.equal(result.feeds.claim_readiness_snapshot, false);
  assert.equal(result.feeds.executive_readout_snapshot, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.equal(
    orchestrator.initial_evidence_snapshot.playbook_coverage.coverage_status,
    "layer_1_only"
  );
  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.coverage_status,
    "layer_1_only"
  );
  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.layer_2_user_voice_empirical.status,
    "missing"
  );
  assert.equal(
    orchestrator.ai_fluency_intake_bridge.evidence_gap_review.evidence_gaps.find(
      (gap) => gap.playbook_layer === "layer_2_user_voice_empirical"
    ).evidence_state,
    "partial"
  );
  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.layer_3_business_system_outcomes.status,
    "missing"
  );
  assert.equal(
    orchestrator.claim_readiness_handoff.financial_boundary.customer_facing_financial_output_allowed,
    false
  );
  assert.ok(orchestrator.client_evidence_requests.initial_requests.length >= 4);
  assert.ok(orchestrator.client_evidence_requests.current_requests.length >= 2);
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(orchestrator.blocked_uses.includes(use), `missing ${use}`);
    assert.ok(
      orchestrator.claim_readiness_handoff.blocked_uses.includes(use),
      `handoff missing ${use}`
    );
  }
});

test("adding valid Layer 2 evidence improves Layer 2 state but not full coverage without Layer 3", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    clientEvidenceEntries: [
      entryExample("manual-layer-2-user-voice-entry.json")
    ]
  }));
  expectValid(orchestrator);

  assert.equal(orchestrator.client_evidence_entry_reviews.length, 1);
  assert.equal(orchestrator.client_evidence_entry_reviews[0].accepted_for_source_package, true);
  assert.equal(
    orchestrator.initial_evidence_snapshot.playbook_coverage.layer_2_user_voice_empirical.status,
    "missing"
  );
  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.layer_2_user_voice_empirical.status,
    "present"
  );
  assert.notEqual(
    orchestrator.evidence_snapshot.playbook_coverage.coverage_status,
    "full_playbook_coverage"
  );
  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.layer_3_business_system_outcomes.status,
    "missing"
  );
});

test("adding valid Layer 3 evidence improves Layer 3 state but not financial permission without assumptions and governance", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    clientEvidenceEntries: [
      entryExample("manual-layer-3-outcome-entry.json")
    ]
  }));
  expectValid(orchestrator);

  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.layer_3_business_system_outcomes.status,
    "present"
  );
  assert.notEqual(
    orchestrator.evidence_snapshot.playbook_coverage.coverage_status,
    "full_playbook_coverage"
  );
  assert.equal(
    orchestrator.claim_readiness_handoff.financial_boundary.financial_translation_allowed,
    false
  );
  assert.equal(
    orchestrator.claim_readiness_handoff.financial_boundary.roi_claim_allowed,
    false
  );
  assert.equal(
    orchestrator.claim_readiness_handoff.financial_boundary.ebita_claim_allowed,
    false
  );
});

test("invalid client evidence is rejected and cannot become a Source Package", () => {
  const unsafeEntry = entryExample("manual-layer-3-outcome-entry.json");
  unsafeEntry.raw_rows = [{ ticket_id: "raw-row-not-allowed" }];
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    clientEvidenceEntries: [unsafeEntry]
  }));
  expectValid(orchestrator);

  assert.equal(orchestrator.client_evidence_entry_reviews.length, 1);
  assert.equal(orchestrator.client_evidence_entry_reviews[0].accepted_for_source_package, false);
  assert.equal(orchestrator.client_evidence_entry_reviews[0].source_package_id, null);
  assert.ok(
    orchestrator.client_evidence_entry_reviews[0].rejection_reasons.some(
      (reason) => /raw_rows/i.test(reason)
    )
  );
  assert.deepEqual(orchestrator.source_packages, []);

  const tampered = clone(orchestrator);
  const injectedPackage = sourcePackageExample("layer-3-system-of-record-outcome-package.json");
  injectedPackage.source_refs.client_evidence_entry_id =
    tampered.client_evidence_entry_reviews[0].entry_id;
  tampered.source_packages = [injectedPackage];
  tampered.feeds.source_packages = true;
  expectInvalid(
    tampered,
    /source_packages\[0\] references client evidence entry .* without an accepted review/
  );
});

test("suppressed evidence remains blocked", () => {
  const layer1 = sourcePackageExample("layer-1-bigquery-telemetry-package.json");
  layer1.k_min_posture.cohort_threshold_met = false;
  layer1.k_min_posture.k_min_clear_slices = 9;
  layer1.k_min_posture.suppressed_or_unknown_slices = 3;
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    initialSourcePackages: [layer1]
  }));
  expectValid(orchestrator);

  assert.equal(
    orchestrator.evidence_snapshot.playbook_coverage.layer_1_platform_telemetry.status,
    "suppressed"
  );
  assert.ok(orchestrator.evidence_snapshot.suppression.reason_codes.includes("INSUFFICIENT_VOLUME"));
  assert.notEqual(
    orchestrator.evidence_snapshot.playbook_coverage.coverage_status,
    "full_playbook_coverage"
  );
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(orchestrator.evidence_snapshot.blocked_uses.includes(use), use);
  }
});

test("VBD remains Layer 1 only", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    initialSourcePackages: [
      sourcePackageExample("layer-1-bigquery-telemetry-package.json")
    ]
  }));
  expectValid(orchestrator);

  assert.equal(
    orchestrator.evidence_snapshot.vbd_operating_map.contributes_to_playbook_layer,
    "layer_1_platform_telemetry"
  );
  assert.ok(
    orchestrator.evidence_snapshot.vbd_operating_map.blocked_interpretation.includes("realized_roi")
  );
  assert.notEqual(
    orchestrator.evidence_snapshot.playbook_coverage.coverage_status,
    "full_playbook_coverage"
  );
});

test("workforce context does not upgrade coverage by itself", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    clientEvidenceEntries: [
      entryExample("manual-workforce-context-entry.json")
    ]
  }));
  expectValid(orchestrator);

  assert.equal(
    orchestrator.coverage_summary.aggregate_workforce_context_state,
    "provided_aggregate_safe"
  );
  assert.notEqual(
    orchestrator.evidence_snapshot.playbook_coverage.coverage_status,
    "full_playbook_coverage"
  );
  assert.equal(orchestrator.coverage_summary.financial_translation_allowed, false);
  assert.ok(orchestrator.blocked_uses.includes("people_decisioning"));
});

test("orchestrator preserves ordered post-sales workflow phases", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs());
  expectValid(orchestrator);

  const reordered = clone(orchestrator);
  const first = reordered.workflow_phases[0];
  reordered.workflow_phases[0] = reordered.workflow_phases[1];
  reordered.workflow_phases[1] = first;
  expectInvalid(reordered, /workflow_phases\[0\]\.phase_id must be ai_fluency_intake/);

  const missing = clone(orchestrator);
  missing.workflow_phases.pop();
  expectInvalid(missing, /workflow_phases must include every required phase exactly once/);
});

test("orchestrator cannot create claims, readouts, persistence, routes, UI, or ingestion", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs());
  expectValid(orchestrator);

  const claimFeed = clone(orchestrator);
  claimFeed.feeds.claim_readiness_snapshot = true;
  expectInvalid(claimFeed, /feeds\.claim_readiness_snapshot must be false/);

  const routePolicy = clone(orchestrator);
  routePolicy.persistence_policy.creates_backend_routes = true;
  expectInvalid(routePolicy, /persistence_policy\.creates_backend_routes must be false/);

  const uiPolicy = clone(orchestrator);
  uiPolicy.persistence_policy.creates_frontend_ui = true;
  expectInvalid(uiPolicy, /persistence_policy\.creates_frontend_ui must be false/);

  const unsafeUse = clone(orchestrator);
  unsafeUse.allowed_uses.push("realized_roi");
  expectInvalid(unsafeUse, /Unsafe allowed or produced output detected|allowed_uses contains unsupported use/);
});

test("orchestrator rejects raw or person-level client evidence if inserted into the workflow object", () => {
  const raw = buildPostSalesWorkflowOrchestrator(baseInputs());
  raw.raw_rows = [{ event_name: "blocked" }];
  expectInvalid(raw, /Forbidden field detected: raw_rows/);

  const person = buildPostSalesWorkflowOrchestrator(baseInputs());
  person.client_evidence_entry_reviews[0] = {
    employee_id: "employee-123",
    accepted_for_source_package: false
  };
  expectInvalid(person, /Forbidden field detected: employee_id/);

  const privacy = buildPostSalesWorkflowOrchestrator(baseInputs());
  privacy.privacy_boundary.contains_hashed_or_joinable_person_identifiers = true;
  expectInvalid(
    privacy,
    /privacy_boundary\.contains_hashed_or_joinable_person_identifiers must be false/
  );

  const emailValue = buildPostSalesWorkflowOrchestrator(baseInputs());
  emailValue.required_caveats.push("Contact jane@example.com for the source row.");
  expectInvalid(emailValue, /Forbidden identifier value detected: required_caveats/);

  const identifierValue = buildPostSalesWorkflowOrchestrator(baseInputs());
  identifierValue.required_caveats.push("employee_id employee-123 was reviewed.");
  expectInvalid(identifierValue, /Forbidden identifier value detected: required_caveats/);
});

test("orchestrator rejects cross-object provenance drift", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs({
    clientEvidenceEntries: [
      entryExample("manual-layer-3-outcome-entry.json")
    ]
  }));
  expectValid(orchestrator);

  const handoffDrift = clone(orchestrator);
  handoffDrift.claim_readiness_handoff.evidence_snapshot_id = "evidence_snapshot_other";
  expectInvalid(
    handoffDrift,
    /claim_readiness_handoff\.evidence_snapshot_id must match evidence_snapshot/
  );

  const assemblyDrift = clone(orchestrator);
  assemblyDrift.evidence_collection_assembly.draft_evidence_snapshot_input.evidence_snapshot_id =
    "evidence_snapshot_other";
  expectInvalid(
    assemblyDrift,
    /evidence_collection_assembly draft evidence snapshot must match top-level evidence_snapshot/
  );

  const initialGapDrift = clone(orchestrator);
  initialGapDrift.initial_evidence_gap_review.measurement_plan_id =
    "measurement_plan_other";
  expectInvalid(
    initialGapDrift,
    /initial_evidence_gap_review must match ai_fluency_intake_bridge evidence_gap_review/
  );

  const requestDrift = clone(orchestrator);
  requestDrift.source_packages[0].source_refs.client_evidence_request_id =
    "client_evidence_request_other";
  expectInvalid(
    requestDrift,
    /source_packages\[0\] source_refs\.client_evidence_request_id must match accepted entry review request_id/
  );

  const reviewDrift = clone(orchestrator);
  reviewDrift.client_evidence_entry_reviews[0].validation_result.org_id = "org_other";
  expectInvalid(
    reviewDrift,
    /client_evidence_entry_reviews\[0\]\.validation_result\.org_id must match orchestrator org_id/
  );
});

test("orchestrator rejects unsafe financial, productivity, causality, and ranking outputs", () => {
  const orchestrator = buildPostSalesWorkflowOrchestrator(baseInputs());

  const financialOutput = clone(orchestrator);
  financialOutput.workflow_phases[0].produced_outputs.push("customer_facing_financial_output");
  expectInvalid(financialOutput, /Unsafe allowed or produced output detected/);

  const productivityOutput = clone(orchestrator);
  productivityOutput.workflow_phases[0].produced_outputs.push("productivity_claim");
  expectInvalid(productivityOutput, /Unsafe allowed or produced output detected/);

  const rankingOutput = clone(orchestrator);
  rankingOutput.workflow_phases[0].produced_outputs.push("manager_or_team_ranking");
  expectInvalid(rankingOutput, /Unsafe allowed or produced output detected/);
});

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return [full];
  });
}

test("filesystem guard confirms Phase 5 is sidecar-only", () => {
  const forbiddenDirs = [
    "backend/src",
    "backend/prisma/migrations",
    "frontend/src",
    "schemas"
  ];
  const orchestratorPathPattern =
    /post[-_]?sales.*workflow.*orchestrator|workflow.*orchestrator/i;
  const forbiddenMatches = forbiddenDirs.flatMap((dir) =>
    filesUnder(dir).filter((file) => orchestratorPathPattern.test(file))
  );
  assert.deepEqual(forbiddenMatches, []);

  const changedFiles = execFileSync(
    "git",
    ["diff", "--name-only", "HEAD", "--"],
    { encoding: "utf8" }
  )
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
  const forbiddenChangedFiles = changedFiles.filter((file) =>
    file.startsWith("backend/src/") ||
    file.startsWith("backend/prisma/") ||
    file.startsWith("frontend/src/") ||
    file.startsWith("schemas/") ||
    file.includes("/routes/") ||
    /route|router|ingest|migration|prisma/i.test(path.basename(file))
  );
  assert.deepEqual(forbiddenChangedFiles, []);

  const packageJson = readJson("package.json");
  const scriptNames = Object.keys(packageJson.scripts ?? {}).filter((name) =>
    /post-sales-workflow-orchestrator|post_sales_workflow_orchestrator|workflow-orchestrator/i.test(name)
  );
  assert.deepEqual(scriptNames, ["test:ai-value-post-sales-workflow-orchestrator"]);
  assert.equal(
    packageJson.scripts["test:ai-value-post-sales-workflow-orchestrator"],
    "npm run build --workspace shared && node --test scripts/validate_ai_value_post_sales_workflow_orchestrator.test.mjs"
  );
});
