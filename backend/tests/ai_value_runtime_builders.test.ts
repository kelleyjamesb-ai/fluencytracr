import fs from "node:fs";
import path from "node:path";

import {
  aiValueEngine,
  evaluateReportabilityGate,
  ReportabilityGateResponseSchema
} from "@learnaire/shared";
import {
  buildAiValueClaimReadinessHandoffInternal,
  AiValueRuntimeBuilderError
} from "../src/services/ai-value-runtime-builders.service";
import {
  persistAiValueHypothesisFromMeasurementPlan,
  persistAiValueMeasurementPlan,
  persistAiValueSourcePackageRef
} from "../src/repositories/ai-value-minimal-persistence.repository";
import { store } from "../src/store";

const EXAMPLE_ROOT = path.resolve(__dirname, "../../docs/contracts");
const REPO_ROOT = path.resolve(__dirname, "../..");

const readJson = (relativePath: string) =>
  JSON.parse(fs.readFileSync(path.join(EXAMPLE_ROOT, relativePath), "utf8"));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const layer1Plan = () =>
  readJson("ai-value-measurement-plan/examples/layer-1-only-draft-plan.json");

const fullPlan = () =>
  readJson("ai-value-measurement-plan/examples/full-playbook-ready-plan.json");

const sourcePackage = (name: string) =>
  readJson(`ai-value-source-packages/examples/${name}.json`);

const layer1Package = () => sourcePackage("layer-1-bigquery-telemetry-package");
const layer2Package = () => sourcePackage("layer-2-user-voice-package");
const layer3Package = () => sourcePackage("layer-3-system-of-record-outcome-package");
const governancePackage = () => sourcePackage("governance-control-package");
const assumptionPackage = () => sourcePackage("assumption-approval-package");
const workforcePackage = () => sourcePackage("aggregate-workforce-context-package");

const REQUIRED_SUPPORT_PILOT_METRIC_IDS = [
  "support_median_resolution_hours",
  "support_backlog_count",
  "support_reopen_rate",
  "support_escalation_rate"
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

const buildAiFluencyBaseline = () => ({
  schema_version: aiValueEngine.FLUENCY_BASELINE_SCHEMA_VERSION,
  baseline_id: "fluency_baseline_support_pilot_e2e_2026_05",
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
});

const presentReadinessEntry = (
  signal_family: string,
  stable_join_keys: string[],
  derived_dimensions: string[] = ["coverage"]
) => ({
  signal_family,
  source_availability: "available",
  export_channel: "customer_event_logs",
  scrub_status: "scrubbed",
  stable_join_keys,
  derived_dimensions,
  readiness_status: "present",
  suppression_applied: false,
  suppression_reasons: [],
  data_quality: {
    completeness: "verified",
    latency: "known",
    join_reliability: "stable"
  },
  validation_evidence: []
});

const supportPilotReadinessMap = (evidenceSnapshot: any) => ({
  schema_version: "GSR_2026_05",
  org_id: evidenceSnapshot.org_id,
  window: `${evidenceSnapshot.window.window_start}_${evidenceSnapshot.window.window_end}`,
  generated_at: "2026-06-13T18:09:00.000Z",
  source_system: "Glean",
  entries: [
    presentReadinessEntry(
      "assistant",
      ["chat_session_id", "session_tracking_token"],
      ["usage_quality", "coverage"]
    ),
    presentReadinessEntry(
      "search_document_retrieval",
      ["session_tracking_token", "event_timestamp"],
      ["usage_quality", "coverage"]
    ),
    presentReadinessEntry("insights", ["event_timestamp"]),
    presentReadinessEntry("agent_run", ["workflow_run_id"], ["behavior_change"]),
    presentReadinessEntry("agent_step", ["workflow_run_id", "step_id"], ["behavior_change"]),
    presentReadinessEntry("skill_lifecycle", ["skill_artifact_id", "event_timestamp"], ["capability_growth"]),
    presentReadinessEntry("mcp_usage", ["workflow_run_id", "tool_id"], ["capability_growth", "calibration"])
  ],
  next_actions: []
});

beforeEach(() => {
  store.reset();
});

const persistPlan = async (plan: any) => {
  const hypothesis = await persistAiValueHypothesisFromMeasurementPlan({
    measurementPlan: plan,
    version: 1,
    createdByRole: "value_realization_pm"
  });
  return persistAiValueMeasurementPlan({
    measurementPlan: plan,
    version: 1,
    valueHypothesisId: hypothesis.value_hypothesis_id,
    createdByRole: "value_realization_pm"
  });
};

const persistRefs = async (plan: any, packages: any[]) => {
  for (const pkg of packages) {
    await persistAiValueSourcePackageRef({
      sourcePackage: pkg,
      version: 1,
      measurementPlanId: plan.measurement_plan_id,
      workflowFamily: plan.workflow_scope.workflow_family,
      createdByRole: "data_platform_owner"
    });
  }
};

describe("AI Value runtime builders internal service", () => {
  it("builds a telemetry-only caveated handoff without full coverage or persisted handoff state", async () => {
    const plan = layer1Plan();
    const layer1 = layer1Package();
    await persistPlan(plan);
    await persistRefs(plan, [layer1]);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: [layer1],
      evidenceSnapshotId: "runtime_snapshot_telemetry_only",
      handoffId: "runtime_handoff_telemetry_only",
      generatedAt: "2026-06-13T18:00:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe("layer_1_only");
    expect(result.evidenceSnapshot.required_caveats).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Layer 2/i),
        expect.stringMatching(/Layer 3/i)
      ])
    );
    expect(result.persistedEvidenceSnapshot.evidence_snapshot_id).toBe(
      "runtime_snapshot_telemetry_only"
    );
    expect(result.handoff.persistence_policy.persisted).toBe(false);
    expect(result.handoff.financial_boundary.roi_claim_allowed).toBe(false);
    expect(result.handoff.financial_boundary.ebita_claim_allowed).toBe(false);
    expect(result.handoff.financial_boundary.customer_facing_financial_output_allowed).toBe(false);
    expect(store.aiValueEvidenceSnapshots.size).toBe(1);
  });

  it("builds full Playbook coverage only when all required evidence packages are bound", async () => {
    const plan = fullPlan();
    const packages = [
      layer1Package(),
      layer2Package(),
      layer3Package(),
      governancePackage(),
      assumptionPackage()
    ];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: packages,
      evidenceSnapshotId: "runtime_snapshot_full_playbook",
      handoffId: "runtime_handoff_full_playbook",
      generatedAt: "2026-06-13T18:01:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe(
      "full_playbook_coverage"
    );
    expect(result.handoff.playbook_coverage.coverage_status).toBe(
      "full_playbook_coverage"
    );
    expect(result.handoff.executive_readout_boundary.customer_facing_readout_allowed).toBe(false);
    expect(result.handoff.financial_boundary.customer_facing_financial_output_allowed).toBe(false);
  });

  it("builds the support pilot runtime chain and validates downstream exposure and reportability boundaries", async () => {
    const plan = fullPlan();
    const pilotMetricIds = [
      plan.metric_selection.primary_metric.metric_id,
      ...plan.metric_selection.supporting_metrics.map((metric: any) => metric.metric_id)
    ];
    expect(pilotMetricIds).toEqual(
      expect.arrayContaining(REQUIRED_SUPPORT_PILOT_METRIC_IDS)
    );

    const packages = [
      layer1Package(),
      layer2Package(),
      layer3Package(),
      governancePackage(),
      assumptionPackage()
    ];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: packages,
      evidenceSnapshotId: "runtime_snapshot_support_pilot_e2e",
      handoffId: "runtime_handoff_support_pilot_e2e",
      generatedAt: "2026-06-13T18:09:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.workflow.workflow_family).toBe(
      "customer_support_case_resolution"
    );
    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe(
      "full_playbook_coverage"
    );
    expect(result.persistedEvidenceSnapshot.evidence_snapshot_id).toBe(
      "runtime_snapshot_support_pilot_e2e"
    );
    expect(store.aiValueEvidenceSnapshots.size).toBe(1);
    expect(result.handoff.persistence_policy.persisted).toBe(false);
    expect(result.handoff.financial_boundary.roi_claim_allowed).toBe(true);
    expect(result.handoff.financial_boundary.ebita_claim_allowed).toBe(false);
    expect(
      result.handoff.financial_boundary.customer_facing_financial_output_allowed
    ).toBe(false);
    expect(result.handoff.blocked_claims).toEqual(
      expect.arrayContaining([
        "ebita_claim",
        "causality_claim",
        "productivity_claim",
        "headcount_reduction_claim",
        "customer_facing_economic_output"
      ])
    );

    const claimSnapshot =
      aiValueEngine.buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
        result.evidenceSnapshot,
        result.handoff,
        {
          claimReadinessSnapshotId: "claim_readiness_snapshot_support_pilot_e2e",
          createdAt: "2026-06-13T18:09:00.000Z"
        }
      );
    const claimSnapshotValidation =
      aiValueEngine.validateClaimReadinessSnapshot(claimSnapshot);

    expect(claimSnapshotValidation.valid).toBe(true);
    expect(claimSnapshotValidation.feeds.claim_readiness_snapshot).toBe(true);
    expect(claimSnapshotValidation.feeds.executive_readout_snapshot).toBe(false);
    expect(claimSnapshotValidation.feeds.customer_facing_financial_output).toBe(false);
    expect(claimSnapshot.persistence_policy.persisted).toBe(false);
    expect(claimSnapshot.allowed_claim_modes).toContain(
      "governed_roi_scenario_review"
    );
    expect(claimSnapshot.financial_boundary.customer_facing_financial_output_allowed).toBe(false);

    const orchestrator = aiValueEngine.buildPostSalesWorkflowOrchestrator({
      orgId: plan.org_id,
      workflowFamily: plan.workflow_scope.workflow_family,
      workflowName: plan.workflow_scope.workflow_name,
      functionArea: plan.workflow_scope.function_area,
      hypothesisStatement: plan.value_hypothesis.hypothesis_statement,
      businessObjective: plan.value_hypothesis.business_objective,
      valueRoute: plan.value_hypothesis.value_route,
      primaryMetricId: plan.metric_selection.primary_metric.metric_id,
      primaryMetricName: plan.metric_selection.primary_metric.metric_name,
      baselineWindowStart: plan.windows.baseline_window_start,
      baselineWindowEnd: plan.windows.baseline_window_end,
      comparisonWindowStart: plan.windows.comparison_window_start,
      comparisonWindowEnd: plan.windows.comparison_window_end,
      generatedAt: "2026-06-13T18:09:00.000Z",
      orchestratorId: "post_sales_workflow_orchestrator_support_pilot_e2e",
      customerJourneyId: "customer_journey_support_pilot_e2e",
      bridgeId: "ai_fluency_intake_bridge_support_pilot_e2e",
      measurementPlanId: plan.measurement_plan_id,
      evidenceSnapshotId: result.evidenceSnapshot.evidence_snapshot_id,
      assemblyId: "evidence_collection_assembly_support_pilot_e2e",
      handoffId: result.handoff.handoff_id,
      aiFluencyBaseline: buildAiFluencyBaseline(),
      initialSourcePackages: packages
    });
    const orchestratorValidation =
      aiValueEngine.validatePostSalesWorkflowOrchestrator(orchestrator);

    expect(orchestratorValidation.valid).toBe(true);
    expect(orchestrator.coverage_summary.coverage_status).toBe(
      "full_playbook_coverage"
    );
    expect(orchestrator.evidence_snapshot.evidence_snapshot_id).toBe(
      result.evidenceSnapshot.evidence_snapshot_id
    );
    expect(orchestrator.claim_readiness_handoff.handoff_id).toBe(
      result.handoff.handoff_id
    );
    expect(orchestrator.coverage_summary.financial_translation_allowed).toBe(true);
    expect(
      orchestrator.coverage_summary.customer_facing_financial_output_allowed
    ).toBe(false);

    const customerExposurePolicy =
      aiValueEngine.buildCustomerExposurePolicyFromPostSalesWorkflow(orchestrator, {
        policyId: "customer_exposure_policy_support_pilot_e2e",
        createdAt: "2026-06-13T18:09:00.000Z",
        financeOrBusinessApprovalPresent: true,
        customerAssumptionApprovalPresent: true,
        exportGovernance: {
          approved: true,
          governance_document_ref: "export_governance_review_support_pilot_e2e",
          approver_role: "value_governance_lead"
        }
      });
    const exposureValidation =
      aiValueEngine.validateCustomerExposurePolicy(customerExposurePolicy);

    expect(exposureValidation.valid).toBe(true);
    expect(exposureValidation.feeds.customer_visible_posture).toBe(true);
    expect(exposureValidation.feeds.customer_facing_financial_output).toBe(false);
    expect(customerExposurePolicy.coverage_status).toBe("full_playbook_coverage");
    expect(customerExposurePolicy.source_binding.evidence_snapshot_id).toBe(
      result.evidenceSnapshot.evidence_snapshot_id
    );
    expect(customerExposurePolicy.source_binding.claim_readiness_handoff_id).toBe(
      result.handoff.handoff_id
    );
    expect(customerExposurePolicy.financial_claim_policy.financial_claims_allowed).toBe(true);
    expect(
      customerExposurePolicy.financial_claim_policy.customer_facing_financial_output_allowed
    ).toBe(false);
    expect(customerExposurePolicy.export_policy.export_allowed).toBe(false);
    expect(customerExposurePolicy.blocked_uses).toEqual(
      expect.arrayContaining(REQUIRED_BLOCKED_USES)
    );

    const reportabilityResponse = evaluateReportabilityGate({
      schema_version: "FT_REPORTABILITY_GATE_2026_05",
      caller_system: "roi_model",
      report_context: "roi",
      requested_claims: [
        "covered_time_saved",
        "surface_adoption",
        "total_productivity_impact",
        "causal_productivity_lift",
        "individual_productivity",
        "team_ranking",
        "agent_roi_included",
        "skill_roi_included",
        "mcp_roi_included"
      ],
      readiness_map: supportPilotReadinessMap(result.evidenceSnapshot),
      generated_at: "2026-06-13T18:09:00.000Z"
    });

    expect(ReportabilityGateResponseSchema.parse(reportabilityResponse)).toEqual(
      reportabilityResponse
    );
    expect(reportabilityResponse.decision.reportability).toBe(
      "REPORTABLE_WITH_CAVEATS"
    );
    expect(reportabilityResponse.decision.org_id).toBe(result.evidenceSnapshot.org_id);
    expect(reportabilityResponse.decision.window).toBe(
      `${result.evidenceSnapshot.window.window_start}_${result.evidenceSnapshot.window.window_end}`
    );
    expect(reportabilityResponse.decision.required_caveats.join(" ")).toContain(
      "excluded surfaces"
    );
    expect(reportabilityResponse.requested_claim_results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claim_type: "covered_time_saved",
          disposition: "allowed"
        }),
        expect.objectContaining({
          claim_type: "surface_adoption",
          disposition: "allowed"
        }),
        expect.objectContaining({
          claim_type: "total_productivity_impact",
          disposition: "blocked"
        }),
        expect.objectContaining({
          claim_type: "causal_productivity_lift",
          disposition: "blocked"
        }),
        expect.objectContaining({
          claim_type: "individual_productivity",
          disposition: "blocked"
        }),
        expect.objectContaining({
          claim_type: "team_ranking",
          disposition: "blocked"
        }),
        expect.objectContaining({
          claim_type: "agent_roi_included",
          disposition: "blocked"
        }),
        expect.objectContaining({
          claim_type: "skill_roi_included",
          disposition: "blocked"
        }),
        expect.objectContaining({
          claim_type: "mcp_roi_included",
          disposition: "blocked"
        })
      ])
    );
    expect(reportabilityResponse.appendix.governance_posture.join(" ")).toContain(
      "Aggregate-only"
    );
  });

  it("fails closed when a full Playbook plan is missing required source packages", async () => {
    const plan = fullPlan();
    const packages = [layer1Package(), layer2Package(), governancePackage(), assumptionPackage()];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: packages,
        evidenceSnapshotId: "runtime_snapshot_missing_layer_3",
        handoffId: "runtime_handoff_missing_layer_3",
        generatedAt: "2026-06-13T18:02:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed on unsafe source package privacy before evidence persistence", async () => {
    const plan = layer1Plan();
    const persistedLayer1 = layer1Package();
    const unsafeLayer1 = clone(persistedLayer1);
    unsafeLayer1.privacy_boundary.contains_direct_identifiers = true;
    await persistPlan(plan);
    await persistRefs(plan, [persistedLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [unsafeLayer1],
        evidenceSnapshotId: "runtime_snapshot_unsafe_privacy",
        handoffId: "runtime_handoff_unsafe_privacy",
        generatedAt: "2026-06-13T18:03:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed on k-min or suppression before evidence persistence", async () => {
    const plan = layer1Plan();
    const suppressedLayer1 = layer1Package();
    suppressedLayer1.evidence_state = "suppressed";
    suppressedLayer1.k_min_posture.cohort_threshold_met = false;
    suppressedLayer1.k_min_posture.k_min_clear_slices = 0;
    suppressedLayer1.k_min_posture.suppressed_or_unknown_slices = 1;
    suppressedLayer1.caveats = [
      "Layer 1 package failed k-min and must remain suppressed."
    ];
    await persistPlan(plan);
    await persistRefs(plan, [suppressedLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [suppressedLayer1],
        evidenceSnapshotId: "runtime_snapshot_suppressed",
        handoffId: "runtime_handoff_suppressed",
        generatedAt: "2026-06-13T18:04:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("keeps VBD and aggregate workforce context from upgrading coverage or financial flags", async () => {
    const plan = layer1Plan();
    const packages = [layer1Package(), workforcePackage()];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: packages,
      evidenceSnapshotId: "runtime_snapshot_workforce_context",
      handoffId: "runtime_handoff_workforce_context",
      generatedAt: "2026-06-13T18:05:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe("layer_1_only");
    expect(result.evidenceSnapshot.aggregate_workforce_context.context_state).toBe(
      "provided_aggregate_safe"
    );
    expect(result.handoff.financial_boundary.financial_translation_allowed).toBe(false);
    expect(result.handoff.blocked_claims).toEqual(
      expect.arrayContaining([
        "roi_proof",
        "ebita_claim",
        "customer_facing_economic_output"
      ])
    );
  });

  it("requires source packages to be bound to persisted source package refs", async () => {
    const plan = layer1Plan();
    const layer1 = layer1Package();
    await persistPlan(plan);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [layer1],
        evidenceSnapshotId: "runtime_snapshot_unbound_source",
        handoffId: "runtime_handoff_unbound_source",
        generatedAt: "2026-06-13T18:06:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed when a runtime source package drifts from the persisted ref", async () => {
    const plan = layer1Plan();
    const persistedLayer1 = layer1Package();
    const driftedLayer1 = clone(persistedLayer1);
    driftedLayer1.privacy_boundary.aggregate_only = false;
    await persistPlan(plan);
    await persistRefs(plan, [persistedLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [driftedLayer1],
        evidenceSnapshotId: "runtime_snapshot_drifted_source",
        handoffId: "runtime_handoff_drifted_source",
        generatedAt: "2026-06-13T18:07:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed on ambiguous duplicate source package types", async () => {
    const plan = layer1Plan();
    const layer1 = layer1Package();
    const duplicateLayer1 = clone(layer1);
    duplicateLayer1.source_package_id = "source_package_layer_1_duplicate";
    duplicateLayer1.source_refs.aggregate_probe_id = "aggregate_probe_duplicate";
    await persistPlan(plan);
    await persistRefs(plan, [layer1, duplicateLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [layer1, duplicateLayer1],
        evidenceSnapshotId: "runtime_snapshot_duplicate_source_type",
        handoffId: "runtime_handoff_duplicate_source_type",
        generatedAt: "2026-06-13T18:08:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("adds no public backend route or frontend UI", () => {
    const appSource = fs.readFileSync(path.join(REPO_ROOT, "backend/src/app.ts"), "utf8");
    expect(appSource).not.toContain("ai-value-runtime-builders.service");

    const frontendFiles = fs.readdirSync(path.join(REPO_ROOT, "frontend/src"));
    expect(frontendFiles).not.toContain("AiValueRuntimeBuilder.tsx");
  });
});
