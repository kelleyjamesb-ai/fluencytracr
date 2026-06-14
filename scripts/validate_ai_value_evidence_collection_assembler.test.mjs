import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages,
  buildPlaybookMeasurementPlanDraft,
  validateEvidenceCollectionAssembly,
  validateEvidenceSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const SOURCE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";
const ASSEMBLY_EXAMPLES = "docs/contracts/ai-value-evidence-collection-assembler/examples";

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
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function plan(overrides = {}) {
  return buildPlaybookMeasurementPlanDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    hypothesisStatement:
      "If support teams use AI for triage and answer drafting, then eligible cases should move faster while quality remains governed.",
    businessObjective: "Improve support case resolution capacity without weakening quality controls.",
    valueRoute: "capacity_creation",
    functionArea: "customer_support",
    primaryMetricId: "support_median_resolution_hours",
    primaryMetricName: "Median resolution time",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    comparisonWindowStart: "2026-06-01",
    comparisonWindowEnd: "2026-06-30",
    generatedAt: "2026-06-13T00:00:00.000Z",
    measurementPlanId: "measurement_plan_customer_support_assembly",
    ...overrides
  });
}

function sourcePackage(file) {
  return readJson(`${SOURCE_EXAMPLES}/${file}`);
}

function packageSet(names) {
  const files = {
    layer1: "layer-1-bigquery-telemetry-package.json",
    layer2: "layer-2-user-voice-package.json",
    layer3: "layer-3-system-of-record-outcome-package.json",
    workforce: "aggregate-workforce-context-package.json",
    governance: "governance-control-package.json",
    assumption: "assumption-approval-package.json"
  };
  return names.map((name) => sourcePackage(files[name]));
}

function buildAssembly(packages, options = {}) {
  return buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages(
    options.plan ?? plan(),
    packages,
    {
      assemblyId: "evidence_collection_assembly_customer_support",
      evidenceSnapshotId: "evidence_snapshot_customer_support_assembly",
      generatedAt: "2026-06-13T00:00:00.000Z"
    }
  );
}

function invalidPlan() {
  const draft = plan();
  delete draft.value_hypothesis.hypothesis_statement;
  return draft;
}

function expectValidAssembly(assembly) {
  const assemblyResult = validateEvidenceCollectionAssembly(assembly);
  assert.equal(assemblyResult.valid, true, assemblyResult.gaps.join("; "));
  const snapshotResult = validateEvidenceSnapshot(assembly.draft_evidence_snapshot_input);
  assert.equal(snapshotResult.valid, true, snapshotResult.gaps.join("; "));
}

function caveatsMention(snapshot, pattern) {
  return snapshot.required_caveats.some((caveat) => pattern.test(caveat));
}

function hasForbiddenComputedKey(value, path = []) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenComputedKey(item, path));
  return Object.entries(value).some(([key, nested]) =>
    (!(path.includes("feeds") && nested === false) &&
      /^(roi|ebita|causality|financial_impact|financial_output|customer_facing_financial_output|customer_facing_economic_output)$/i.test(key)) ||
    hasForbiddenComputedKey(nested, [...path, key])
  );
}

test("measurement plan plus no source packages produces missing evidence, not full coverage", () => {
  const assembly = buildAssembly([]);
  expectValidAssembly(assembly);
  assert.equal(
    assembly.draft_evidence_snapshot_input.playbook_coverage.coverage_status,
    "layer_1_only"
  );
  assert.notEqual(
    assembly.draft_evidence_snapshot_input.playbook_coverage.coverage_status,
    "full_playbook_coverage"
  );
  assert.equal(
    assembly.draft_evidence_snapshot_input.playbook_coverage.layer_2_user_voice_empirical.status,
    "missing"
  );
  assert.equal(
    assembly.draft_evidence_snapshot_input.playbook_coverage.layer_3_business_system_outcomes.status,
    "missing"
  );
  for (const laneName of ["surface_usage", "skill_lifecycle", "agent_lifecycle", "artifact_output"]) {
    const lane = assembly.draft_evidence_snapshot_input.evidence_lanes.find(
      (entry) => entry.lane === laneName
    );
    assert.equal(lane.evidence_state, "missing");
    assert.equal(lane.can_support_evidence_snapshot, false);
  }
});

test("assembler examples validate and preserve coverage boundaries", () => {
  const expectedCoverage = new Map([
    ["telemetry-only-assembly.json", "layer_1_only"],
    ["full-playbook-assembly.json", "full_playbook_coverage"],
    ["missing-layer-3-assembly.json", "layer_1_plus_partial_layer_2"]
  ]);

  for (const [file, coverageStatus] of expectedCoverage) {
    const assembly = readJson(`${ASSEMBLY_EXAMPLES}/${file}`);
    expectValidAssembly(assembly);
    const snapshot = assembly.draft_evidence_snapshot_input;
    assert.equal(snapshot.playbook_coverage.coverage_status, coverageStatus);
    assert.equal(assembly.feeds.claim_readiness_snapshot, false);
    assert.equal(assembly.feeds.executive_readout_snapshot, false);
    assert.equal(assembly.feeds.customer_facing_economic_output, false);
  }
});

test("measurement plan plus Layer 1 package only produces layer_1_only snapshot input", () => {
  const assembly = buildAssembly(packageSet(["layer1"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(snapshot.blocked_uses.includes(use), `missing blocked use ${use}`);
  }
  assert.equal(snapshot.playbook_layers.layer_2_user_voice_empirical.evidence_state, "missing");
  assert.equal(snapshot.playbook_layers.layer_3_business_system_outcomes.evidence_state, "missing");
  assert.equal(
    snapshot.evidence_lanes.find((lane) => lane.lane === "surface_usage").evidence_state,
    "present"
  );
  for (const laneName of ["skill_lifecycle", "agent_lifecycle", "artifact_output"]) {
    assert.notEqual(
      snapshot.evidence_lanes.find((lane) => lane.lane === laneName).evidence_state,
      "present",
      `${laneName} should not be fully present from a generic Layer 1 package`
    );
  }
});

test("full Playbook assembly removes evidence-conditioned financial blockers but keeps immutable blockers", () => {
  const assembly = buildAssembly(packageSet(["layer1", "layer2", "layer3", "governance", "assumption"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;

  assert.equal(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  for (const conditionedUse of [
    "realized_roi",
    "realized_roi_calculation",
    "roi_proof",
    "dollarized_output",
    "financial_value_claim",
    "usage_derived_financial_claim"
  ]) {
    assert.ok(
      !snapshot.blocked_uses.includes(conditionedUse),
      `${conditionedUse} should be governed by financial claim readiness, not permanently blocked after full coverage`
    );
  }
  for (const immutableUse of [
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "individual_attribution",
    "manager_or_team_ranking",
    "people_decisioning",
    "customer_facing_financial_output",
    "customer_facing_economic_output"
  ]) {
    assert.ok(snapshot.blocked_uses.includes(immutableUse), `missing immutable blocker ${immutableUse}`);
  }
});

test("missing Layer 2 remains explicit as a caveat", () => {
  const assembly = buildAssembly(packageSet(["layer1", "layer3", "governance", "assumption"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.equal(snapshot.playbook_coverage.layer_2_user_voice_empirical.status, "missing");
  assert.ok(caveatsMention(snapshot, /Layer 2 user voice|empirical evidence is missing/i));
});

test("missing Layer 3 remains explicit as a caveat", () => {
  const assembly = buildAssembly(packageSet(["layer1", "layer2", "governance", "assumption"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.equal(snapshot.playbook_coverage.layer_3_business_system_outcomes.status, "missing");
  assert.ok(caveatsMention(snapshot, /Layer 3 business system-of-record outcome evidence is missing/i));
});

test("unsafe source package fails assembly", () => {
  const unsafe = clone(sourcePackage("layer-1-bigquery-telemetry-package.json"));
  unsafe.privacy_boundary.contains_direct_identifiers = true;
  const assembly = buildAssembly([unsafe]);
  const result = validateEvidenceCollectionAssembly(assembly);
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /source package.*contains_direct_identifiers/i.test(gap)));
});

test("invalid measurement plan fails assembly validation", () => {
  const assembly = buildAssembly(packageSet(["layer1"]), { plan: invalidPlan() });
  const result = validateEvidenceCollectionAssembly(assembly);
  assert.equal(result.valid, false);
  assert.equal(assembly.feeds.evidence_snapshot_input, false);
  assert.ok(result.gaps.some((gap) => /measurement plan invalid/i.test(gap)));
});

test("assembly rejects raw rows and nested identifier fields", () => {
  const rawRowsAssembly = buildAssembly(packageSet(["layer1"]));
  rawRowsAssembly.raw_rows = [];
  const rawRowsResult = validateEvidenceCollectionAssembly(rawRowsAssembly);
  assert.equal(rawRowsResult.valid, false);
  assert.ok(rawRowsResult.gaps.some((gap) => /raw_rows/i.test(gap)));

  const identifierAssembly = buildAssembly(packageSet(["layer1"]));
  identifierAssembly.draft_evidence_snapshot_input.source_refs.user_id = "user_123";
  const identifierResult = validateEvidenceCollectionAssembly(identifierAssembly);
  assert.equal(identifierResult.valid, false);
  assert.ok(identifierResult.gaps.some((gap) => /user_id/i.test(gap)));
});

test("assembly rejects unsafe privacy, pseudonymous, tokenized, and performance inference fields outside validated snapshot boundary", () => {
  const unsafePrivacyAssembly = buildAssembly(packageSet(["layer1"]));
  unsafePrivacyAssembly.privacy_boundary = {
    aggregate_only: true,
    contains_direct_identifiers: true
  };
  const unsafePrivacyResult = validateEvidenceCollectionAssembly(unsafePrivacyAssembly);
  assert.equal(unsafePrivacyResult.valid, false);
  assert.ok(unsafePrivacyResult.gaps.some((gap) => /contains_direct_identifiers/i.test(gap)));

  const pseudonymousAssembly = buildAssembly(packageSet(["layer1"]));
  pseudonymousAssembly.extra_source_metadata = {
    pseudonymous_person_identifier: "p_123"
  };
  const pseudonymousResult = validateEvidenceCollectionAssembly(pseudonymousAssembly);
  assert.equal(pseudonymousResult.valid, false);
  assert.ok(pseudonymousResult.gaps.some((gap) => /pseudonymous_person_identifier/i.test(gap)));

  const tokenizedAssembly = buildAssembly(packageSet(["layer1"]));
  tokenizedAssembly.extra_source_metadata = {
    tokenized_employee_id: "tok_123"
  };
  const tokenizedResult = validateEvidenceCollectionAssembly(tokenizedAssembly);
  assert.equal(tokenizedResult.valid, false);
  assert.ok(tokenizedResult.gaps.some((gap) => /tokenized_employee_id/i.test(gap)));

  const performanceAssembly = buildAssembly(packageSet(["layer1"]));
  performanceAssembly.extra_source_metadata = {
    performance_inference: "unsafe"
  };
  const performanceResult = validateEvidenceCollectionAssembly(performanceAssembly);
  assert.equal(performanceResult.valid, false);
  assert.ok(performanceResult.gaps.some((gap) => /performance_inference/i.test(gap)));
});

test("source packages must match measurement plan source binding", () => {
  const wrongOrg = clone(sourcePackage("layer-1-bigquery-telemetry-package.json"));
  wrongOrg.org_id = "org_other";
  const orgAssembly = buildAssembly([wrongOrg]);
  const orgResult = validateEvidenceCollectionAssembly(orgAssembly);
  assert.equal(orgResult.valid, false);
  assert.ok(orgResult.gaps.some((gap) => /org_id.*does not match measurement plan/i.test(gap)));

  const wrongWindow = clone(sourcePackage("layer-1-bigquery-telemetry-package.json"));
  wrongWindow.covered_window.window_start = "2026-04-01";
  const windowAssembly = buildAssembly([wrongWindow]);
  const windowResult = validateEvidenceCollectionAssembly(windowAssembly);
  assert.equal(windowResult.valid, false);
  assert.ok(
    windowResult.gaps.some((gap) =>
      /covered_window\.window_start.*does not match measurement plan/i.test(gap)
    )
  );

  const wrongGrain = clone(sourcePackage("layer-1-bigquery-telemetry-package.json"));
  wrongGrain.approved_aggregate_grain = "role_family";
  const grainAssembly = buildAssembly([wrongGrain]);
  const grainResult = validateEvidenceCollectionAssembly(grainAssembly);
  assert.equal(grainResult.valid, false);
  assert.ok(
    grainResult.gaps.some((gap) =>
      /approved_aggregate_grain.*does not match measurement plan/i.test(gap)
    )
  );
});

test("aggregate workforce context may provide approved context without upgrading source grain", () => {
  const assembly = buildAssembly(packageSet(["layer1", "workforce"]));
  expectValidAssembly(assembly);
  assert.equal(assembly.source_package_plan_mismatch_gaps.length, 0);
  assert.equal(
    assembly.draft_evidence_snapshot_input.aggregate_workforce_context.context_state,
    "provided_aggregate_safe"
  );
  assert.equal(
    assembly.draft_evidence_snapshot_input.playbook_coverage.coverage_status,
    "layer_1_only"
  );
});

test("Layer 2 and Layer 3 packages cannot create layer_1_plus coverage without Layer 1", () => {
  const assembly = buildAssembly(packageSet(["layer2", "layer3", "governance", "assumption"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.playbook_coverage.layer_1_platform_telemetry.status, "missing");
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.notEqual(snapshot.snapshot_type, "LAYER_1_PLUS_LAYER_2");
  assert.notEqual(snapshot.snapshot_type, "LAYER_1_PLUS_LAYER_3");
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.ok(caveatsMention(snapshot, /Layer 1 platform telemetry source package is missing/i));
});

test("k-min failure suppresses or holds affected evidence", () => {
  const layer1 = clone(sourcePackage("layer-1-bigquery-telemetry-package.json"));
  layer1.k_min_posture.cohort_threshold_met = false;
  layer1.k_min_posture.k_min_clear_slices = 9;
  layer1.k_min_posture.suppressed_or_unknown_slices = 3;
  const assembly = buildAssembly([layer1]);
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.equal(snapshot.playbook_coverage.layer_1_platform_telemetry.status, "suppressed");
  assert.equal(snapshot.playbook_layers.layer_1_platform_telemetry.evidence_state, "suppressed");
  for (const laneName of ["surface_usage", "skill_lifecycle", "agent_lifecycle", "artifact_output"]) {
    assert.equal(
      snapshot.evidence_lanes.find((lane) => lane.lane === laneName).evidence_state,
      "suppressed"
    );
  }
  assert.equal(snapshot.vbd_operating_map.velocity.state, "not_computed");
  assert.equal(snapshot.vbd_operating_map.breadth.state, "not_computed");
  assert.equal(snapshot.vbd_operating_map.depth.state, "not_computed");
  assert.equal(snapshot.vbd_operating_map.operating_mode, "not_computed");
  assert.ok(snapshot.suppression.reason_codes.includes("INSUFFICIENT_VOLUME"));
  assert.ok(caveatsMention(snapshot, /k-min|cohort threshold/i));
});

test("Layer 2 k-min failure suppresses Layer 2 evidence instead of upgrading coverage", () => {
  const layer2 = clone(sourcePackage("layer-2-user-voice-package.json"));
  layer2.k_min_posture.cohort_threshold_met = false;
  layer2.k_min_posture.k_min_clear_slices = 6;
  layer2.k_min_posture.suppressed_or_unknown_slices = 2;
  const assembly = buildAssembly([sourcePackage("layer-1-bigquery-telemetry-package.json"), layer2]);
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.playbook_coverage.layer_2_user_voice_empirical.status, "suppressed");
  assert.deepEqual(snapshot.source_refs.fluency_baseline_ids, []);
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "layer_1_plus_partial_layer_2");
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.ok(snapshot.suppression.reason_codes.includes("INSUFFICIENT_VOLUME"));
});

test("Layer 3 k-min failure suppresses Layer 3 evidence instead of upgrading coverage", () => {
  const layer3 = clone(sourcePackage("layer-3-system-of-record-outcome-package.json"));
  layer3.k_min_posture.cohort_threshold_met = false;
  layer3.k_min_posture.k_min_clear_slices = 4;
  layer3.k_min_posture.suppressed_or_unknown_slices = 2;
  const assembly = buildAssembly([sourcePackage("layer-1-bigquery-telemetry-package.json"), layer3]);
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.playbook_coverage.layer_3_business_system_outcomes.status, "suppressed");
  assert.deepEqual(snapshot.source_refs.outcome_evidence_ids, []);
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "layer_1_plus_partial_layer_3");
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.ok(snapshot.suppression.reason_codes.includes("INSUFFICIENT_VOLUME"));
});

test("Layer 3 source refs attach only for present or partial evidence", () => {
  for (const evidenceState of ["missing", "held"]) {
    const layer3 = clone(sourcePackage("layer-3-system-of-record-outcome-package.json"));
    layer3.evidence_state = evidenceState;
    layer3.source_refs.aggregate_outcome_export_id = "outcome_evidence_must_not_attach";
    const assembly = buildAssembly([
      sourcePackage("layer-1-bigquery-telemetry-package.json"),
      layer3
    ]);
    expectValidAssembly(assembly);
    const snapshot = assembly.draft_evidence_snapshot_input;
    assert.equal(snapshot.playbook_coverage.layer_3_business_system_outcomes.status, evidenceState);
    assert.deepEqual(snapshot.source_refs.outcome_evidence_ids, []);
    assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  }
});

test("aggregate workforce package does not upgrade coverage", () => {
  const assembly = buildAssembly(packageSet(["layer1", "workforce"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.aggregate_workforce_context.context_state, "provided_aggregate_safe");
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.notEqual(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
});

test("VBD posture does not upgrade coverage", () => {
  const assembly = buildAssembly(packageSet(["layer1"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.vbd_operating_map.contributes_to_playbook_layer, "layer_1_platform_telemetry");
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
});

test("full Playbook assembly requires Layer 2, Layer 3, governance, assumptions, k-min, and safe privacy", () => {
  const assembly = buildAssembly(packageSet(["layer1", "layer2", "layer3", "governance", "assumption"]));
  expectValidAssembly(assembly);
  const snapshot = assembly.draft_evidence_snapshot_input;
  assert.equal(snapshot.snapshot_type, "FULL_STACK_EVIDENCE");
  assert.equal(snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.equal(snapshot.playbook_coverage.layer_2_user_voice_empirical.status, "present");
  assert.equal(snapshot.playbook_coverage.layer_3_business_system_outcomes.status, "present");
  assert.equal(snapshot.playbook_coverage.governance_evidence.status, "present");
  assert.equal(snapshot.playbook_coverage.assumption_evidence.status, "present");
  assert.equal(snapshot.privacy_boundary.aggregate_only, true);
  assert.equal(snapshot.aggregate_telemetry_summary.k_min_summary.suppressed_or_unknown_slices, 0);
  assert.deepEqual(snapshot.suppression.held_lanes, []);
  assert.deepEqual(snapshot.suppression.missing_lanes, []);
  assert.deepEqual(snapshot.suppression.suppressed_lanes, []);
  assert.deepEqual(snapshot.suppression.reason_codes, []);
  assert.equal(snapshot.suppression.hidden_values_exposed, false);
});

test("assembler does not compute ROI, EBITA, causality, productivity, or financial impact", () => {
  const assembly = buildAssembly(packageSet(["layer1", "layer2", "layer3", "governance", "assumption"]));
  expectValidAssembly(assembly);
  assert.equal(hasForbiddenComputedKey(assembly), false);
  assert.equal(assembly.feeds.claim_readiness_snapshot, false);
  assert.equal(assembly.feeds.executive_readout_snapshot, false);
  assert.equal(assembly.feeds.customer_facing_economic_output, false);
});
