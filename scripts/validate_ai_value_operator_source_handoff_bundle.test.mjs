import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_SCHEMA_VERSION,
  buildAIFluencyAggregateExportParseRun,
  buildAIFluencyDashboardImportRun,
  buildAIFluencyOperatorSourceHandoff,
  buildAssumptionGovernanceOperatorSourceHandoff,
  buildBlueprintExtractionDraft,
  buildBlueprintOperatorSourceHandoff,
  buildCustomerMetricIntake,
  buildCustomerMetricOperatorSourceHandoff,
  buildOperatorSourceHandoffBundle,
  buildVbdTokenAggregateIntake,
  buildVbdTokenOperatorSourceHandoff,
  validateOperatorSourceHandoffBundle
} from "../shared/dist/aiValueEngine/index.js";

const PLAN_PATH =
  "docs/contracts/ai-value-measurement-plan/examples/full-playbook-ready-plan.json";

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function plan() {
  return readJson(PLAN_PATH);
}

function baseAlignment() {
  const measurementPlan = plan();
  return {
    orgId: measurementPlan.org_id,
    clientId: "client_example",
    workflowFamily: measurementPlan.workflow_scope.workflow_family,
    workflowId: "workflow_customer_support_case_resolution",
    functionArea: measurementPlan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baselineWindow: {
      window_start: measurementPlan.windows.baseline_window_start,
      window_end: measurementPlan.windows.baseline_window_end
    },
    comparisonWindow: {
      window_start: measurementPlan.windows.comparison_window_start,
      window_end: measurementPlan.windows.comparison_window_end
    },
    metricId: measurementPlan.metric_selection.primary_metric.metric_id,
    measurementPlan
  };
}

function vbdTokenInput(overrides = {}) {
  const alignment = baseAlignment();
  return {
    intakeId: "vbd_token_aggregate_intake_support_day_30",
    orgId: alignment.orgId,
    clientId: alignment.clientId,
    sourceRef: "scrubbed_glean_vbd_token_summary_support_day_30",
    sourceOwnerRole: "glean_data_owner",
    ownerApprovalState: "approved",
    reviewState: "clear",
    workflowFamily: alignment.workflowFamily,
    workflowId: alignment.workflowId,
    functionArea: alignment.functionArea,
    cohortKey: alignment.cohortKey,
    baselineWindow: alignment.baselineWindow,
    comparisonWindow: alignment.comparisonWindow,
    vbd: {
      velocity: 72,
      breadth: 68,
      depth: 74,
      threshold: 60
    },
    tokenSummary: {
      total_tokens: 860000,
      aggregate_interaction_count: 740,
      aggregate_workflow_count: 186,
      high_intensity_workflow_share: 0.22,
      average_tokens_per_interaction: 1162,
      average_tokens_per_workflow: 4624,
      token_intensity_band: "moderate"
    },
    kMinPosture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 8,
      k_min_clear_slices: 8,
      suppressed_or_unknown_slices: 0
    },
    sourceOwnerAttestation: {
      attestation_state: "attested",
      attested_by_role: "glean_data_owner",
      attested_at: "2026-06-22T00:00:00.000Z"
    },
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function customerMetricInput(overrides = {}) {
  const alignment = baseAlignment();
  return {
    measurementPlan: alignment.measurementPlan,
    orgId: alignment.orgId,
    clientId: alignment.clientId,
    workflowFamily: alignment.workflowFamily,
    functionArea: alignment.functionArea,
    cohortKey: alignment.cohortKey,
    intakeMode: "customer_metric_aggregate_export",
    metric: {
      metric_id: alignment.metricId,
      metric_name: alignment.measurementPlan.metric_selection.primary_metric.metric_name,
      metric_category: alignment.measurementPlan.metric_selection.primary_metric.metric_category,
      metric_unit: "hours",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      source_system_type:
        alignment.measurementPlan.metric_selection.primary_metric.source_system_type,
      source_system_name: "customer_support_system",
      normalization_denominator: "eligible_case_count"
    },
    baselineWindow: alignment.baselineWindow,
    comparisonWindow: alignment.comparisonWindow,
    baselineValue: 18,
    comparisonValue: 14,
    sourceRef: "support_metric_resolution_hours_day_30",
    sourceOwnerRole: "customer_data_owner",
    metricOwnerRole:
      alignment.measurementPlan.metric_selection.primary_metric.metric_owner_role,
    ownerApprovalState: "approved",
    reviewState: "clear",
    freshnessState: "current",
    aggregateOnly: true,
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function blueprintInput(overrides = {}) {
  const alignment = baseAlignment();
  return {
    draftId: "blueprint_extraction_draft_support_day_0",
    orgId: alignment.orgId,
    clientId: alignment.clientId,
    documentSourceRef: "blueprint_upload_doc_ref_support_001",
    extractionState: "parsed",
    approvalState: "approved",
    ownerRole: "workflow_owner",
    approverRole: "customer_business_owner",
    workflowFamily: alignment.workflowFamily,
    workflowName: "Support case resolution",
    functionArea: alignment.functionArea,
    cohortKey: alignment.cohortKey,
    valueHypothesis:
      "Support can improve aggregate case resolution flow when governed AI-assisted triage becomes repeatable.",
    valueRoute: "CAPACITY_CREATION",
    baselineWindow: alignment.baselineWindow,
    comparisonWindow: alignment.comparisonWindow,
    metricCandidates: [
      {
        metric_id: alignment.metricId,
        metric_name:
          alignment.measurementPlan.metric_selection.primary_metric.metric_name,
        expected_direction: "decrease",
        system_recommended: true,
        customer_selected: true,
        value_driver: "capacity"
      }
    ],
    assumptions: [
      {
        assumption_id: "case_mix_stability",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "volume_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "staffing_and_coverage_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "channel_mix_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "process_or_policy_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "knowledge_base_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "metric_definition_stability",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "ai_rollout_context",
        owner: "support_ops_owner",
        state: "submitted"
      }
    ],
    sourceRefs: {
      document_source_ref: "blueprint_upload_doc_ref_support_001",
      extraction_run_ref: "blueprint_extraction_run_support_001"
    },
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function aiFluencyRecord(overrides = {}) {
  const alignment = baseAlignment();
  return {
    client_id: alignment.clientId,
    org_id: alignment.orgId,
    instrument_id: "ai-fluency-instrument-24",
    instrument_version: "2.3",
    collection_mode: "aggregated_dashboard_export",
    dashboard_export_id: "ai_fluency_dashboard_export_support_day_30",
    baseline_window_start: alignment.baselineWindow.window_start,
    baseline_window_end: alignment.baselineWindow.window_end,
    comparison_window_start: alignment.comparisonWindow.window_start,
    comparison_window_end: alignment.comparisonWindow.window_end,
    function_area: alignment.functionArea,
    workflow_family: alignment.workflowFamily,
    cohort_key: alignment.cohortKey,
    eligible_population_count: 1200,
    response_count: 720,
    response_rate: 0.6,
    suppression_state: "none",
    k_min_posture: "k_min_20_function_level",
    overall_ai_fluency_score: 72,
    confidence_score: 75,
    usage_quality_score: 73,
    behavior_change_score: 70,
    leadership_reinforcement_score: 69,
    capability_growth_score: 74,
    baseline_overall_ai_fluency_score: 59,
    comparison_overall_ai_fluency_score: 72,
    movement_delta: 13,
    movement_direction: "improved",
    source_ref: "ai_fluency_aggregate_export_support_day_30",
    source_owner_role: "people_analytics_owner",
    owner_approval_state: "approved",
    review_state: "approved_for_import",
    caveats: "Aggregate-only descriptive movement, not causal or financial.",
    ...overrides
  };
}

function aiFluencyRuns(overrides = {}) {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "json",
    sourceObject: {
      records: [aiFluencyRecord(overrides.record)]
    },
    parseId: "ai_fluency_parse_support_day_30",
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const dashboardImportRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_support_day_30",
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  return {
    parseRun,
    dashboardImportRun,
    sourceRef: "ai_fluency_aggregate_export_support_day_30"
  };
}

function assumptionSource(overrides = {}) {
  const alignment = baseAlignment();
  return {
    state: "present",
    intake_mode: "assumption_approval",
    source_ref: "support_assumption_approval_day_30",
    org_id: alignment.orgId,
    client_id: alignment.clientId,
    workflow_family: alignment.workflowFamily,
    function_area: alignment.functionArea,
    cohort_key: alignment.cohortKey,
    baseline_window: alignment.baselineWindow,
    comparison_window: alignment.comparisonWindow,
    metric_id: alignment.metricId,
    owner_role: "finance_or_business_owner",
    owner_approval_state: "approved",
    review_state: "clear",
    aggregate_only: true,
    ...overrides
  };
}

function governanceSource(overrides = {}) {
  return assumptionSource({
    intake_mode: "governance_attestation",
    source_ref: "support_governance_attestation_day_30",
    owner_role: "governance_owner",
    ...overrides
  });
}

function readyLaneEntries(overrides = {}) {
  const blueprint = buildBlueprintExtractionDraft(
    blueprintInput(overrides.blueprintInput)
  );
  const aiFluency = aiFluencyRuns(overrides.aiFluencyInput);
  const vbdInput = buildVbdTokenAggregateIntake(
    vbdTokenInput(overrides.vbdTokenInput)
  );
  const customerInput = buildCustomerMetricIntake(
    customerMetricInput(overrides.customerMetricInput)
  );
  const assumption = assumptionSource(overrides.assumptionSource);
  const governance = governanceSource(overrides.governanceSource);

  return {
    blueprint: {
      draft: blueprint,
      handoff: buildBlueprintOperatorSourceHandoff({
        draft: blueprint,
        generatedAt: "2026-06-22T00:00:00.000Z"
      })
    },
    ai_fluency: {
      parseRun: aiFluency.parseRun,
      dashboardImportRun: aiFluency.dashboardImportRun,
      sourceRef: aiFluency.sourceRef,
      handoff: buildAIFluencyOperatorSourceHandoff({
        parseRun: aiFluency.parseRun,
        dashboardImportRun: aiFluency.dashboardImportRun,
        sourceRef: aiFluency.sourceRef,
        generatedAt: "2026-06-22T00:00:00.000Z"
      })
    },
    vbd_token: {
      aggregateIntake: vbdInput,
      handoff: buildVbdTokenOperatorSourceHandoff({
        aggregateIntake: vbdInput,
        generatedAt: "2026-06-22T00:00:00.000Z"
      })
    },
    customer_metric: {
      customerMetricIntake: customerInput,
      handoff: buildCustomerMetricOperatorSourceHandoff({
        customerMetricIntake: customerInput,
        generatedAt: "2026-06-22T00:00:00.000Z"
      })
    },
    assumption: {
      lane: "assumption",
      source: assumption,
      handoff: buildAssumptionGovernanceOperatorSourceHandoff({
        lane: "assumption",
        source: assumption,
        generatedAt: "2026-06-22T00:00:00.000Z"
      })
    },
    governance: {
      lane: "governance",
      source: governance,
      handoff: buildAssumptionGovernanceOperatorSourceHandoff({
        lane: "governance",
        source: governance,
        generatedAt: "2026-06-22T00:00:00.000Z"
      })
    }
  };
}

function readyBundle(overrides = {}) {
  return buildOperatorSourceHandoffBundle({
    bundleId: "operator_source_handoff_bundle_support_day_30",
    generatedAt: "2026-06-22T00:00:00.000Z",
    lanes: readyLaneEntries(overrides)
  });
}

test("valid aligned bundle prepares compact operator and package alignment manifest only", () => {
  const bundle = readyBundle();
  const result = validateOperatorSourceHandoffBundle(bundle);

  assert.equal(
    bundle.schema_version,
    AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_SCHEMA_VERSION
  );
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(bundle.decision, "READY_FOR_OPERATOR_PREPARATION");
  assert.deepEqual(Object.keys(bundle.operator_sources).sort(), [
    "ai_fluency",
    "assumption",
    "blueprint",
    "customer_metric",
    "governance",
    "vbd_token"
  ]);
  assert.equal(bundle.operator_sources.blueprint.source_ref, "blueprint_extraction_draft_support_day_0");
  assert.equal(bundle.operator_sources.ai_fluency.source_ref, "ai_fluency_aggregate_export_support_day_30");
  assert.equal(bundle.operator_sources.vbd_token.source_ref, "scrubbed_glean_vbd_token_summary_support_day_30");
  assert.equal(bundle.operator_sources.customer_metric.source_ref, "support_metric_resolution_hours_day_30");
  assert.equal(bundle.operator_sources.assumption.source_ref, "support_assumption_approval_day_30");
  assert.equal(bundle.operator_sources.governance.source_ref, "support_governance_attestation_day_30");
  assert.equal(bundle.measurement_cell_context_fragments.blueprint.blueprint_alignment_context.expected_metric_id, "support_median_resolution_hours");
  assert.equal(bundle.measurement_cell_context_fragments.ai_fluency.ai_fluency_context.source_ref, bundle.operator_sources.ai_fluency.source_ref);
  assert.equal("dimension_scores" in bundle.measurement_cell_context_fragments.ai_fluency.ai_fluency_context, false);
  assert.equal("confidence" in bundle.measurement_cell_context_fragments.ai_fluency.ai_fluency_context, false);
  assert.equal(bundle.measurement_cell_context_fragments.vbd_token.vbd_context.source_ref, bundle.operator_sources.vbd_token.source_ref);
  assert.equal(bundle.measurement_cell_context_fragments.vbd_token.token_context.source_ref, bundle.operator_sources.vbd_token.source_ref);
  assert.equal(bundle.measurement_cell_context_fragments.customer_metric.selected_metric_context.metric_id, "support_median_resolution_hours");
  assert.equal(bundle.measurement_cell_context_fragments.assumption.assumption_context.source_ref, bundle.operator_sources.assumption.source_ref);
  assert.equal(bundle.measurement_cell_context_fragments.governance.governance_context.source_ref, bundle.operator_sources.governance.source_ref);
  assert.equal(bundle.source_package_references.length, 5);
  assert.equal(bundle.source_package_references.some((reference) => reference.lane_key === "blueprint"), false);
  assert.ok(bundle.source_package_references.some((reference) => reference.lane_key === "ai_fluency"));
  assert.equal(bundle.alignment_manifest.org_id, "org_example");
  assert.equal(bundle.alignment_manifest.client_id, "client_example");
  assert.equal(bundle.alignment_manifest.workflow_family, "customer_support_case_resolution");
  assert.equal(bundle.alignment_manifest.function_area, "customer_support");
  assert.equal(bundle.alignment_manifest.metric_id, "support_median_resolution_hours");
  assert.equal(bundle.alignment_manifest.lane_count, 6);
  assert.equal(bundle.alignment_manifest.source_package_reference_count, 5);
  assert.equal(bundle.feeds.operator_preparation, true);
  assert.equal(bundle.feeds.package_alignment_preparation, true);
  assert.equal(bundle.feeds.source_package_review_queue, false);
  assert.equal(bundle.feeds.measurement_cell, false);
  assert.equal(bundle.feeds.finance_context_investigation, false);
  assert.equal(bundle.feeds.confidence_model, false);
  assert.equal(bundle.feeds.customer_facing_output, false);
  assert.equal(bundle.feeds.customer_facing_financial_output, false);
  assert.equal("lane_handoffs" in bundle, false);
  assert.equal("lane_inputs" in bundle, false);
});

test("stale or tampered valid=true lane handoff is rejected by recomputation", () => {
  const lanes = readyLaneEntries();
  lanes.vbd_token.handoff.valid = true;
  lanes.vbd_token.handoff.source_ref = "scrubbed_glean_vbd_token_summary_other_day_30";
  lanes.vbd_token.handoff.operator_source.source_ref =
    "scrubbed_glean_vbd_token_summary_other_day_30";
  lanes.vbd_token.handoff.source_package_reference.source_refs.aggregate_probe_id =
    "scrubbed_glean_vbd_token_summary_other_day_30";

  const bundle = buildOperatorSourceHandoffBundle({
    bundleId: "operator_source_handoff_bundle_tampered",
    generatedAt: "2026-06-22T00:00:00.000Z",
    lanes
  });
  const result = validateOperatorSourceHandoffBundle(bundle);

  assert.equal(bundle.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("vbd_token handoff does not match recomputed handoff")
    ),
    result.gaps.join("; ")
  );
  assert.equal(result.feeds.operator_preparation, false);
  assert.equal(result.feeds.package_alignment_preparation, false);
});

test("Source Package Review Queue bypass attempts are rejected", () => {
  const bypass = clone(readyBundle());
  bypass.source_package_review_queue = {
    valid: true,
    clearance: "clear"
  };
  bypass.alignment_manifest.source_package_review_queue_clearance = true;
  bypass.feeds.source_package_review_queue = true;

  const result = validateOperatorSourceHandoffBundle(bypass);

  assert.equal(result.valid, false);
  for (const token of [
    "source_package_review_queue",
    "alignment_manifest.source_package_review_queue_clearance",
    "feeds.source_package_review_queue"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing ${token}`);
  }
  assert.equal(result.feeds.source_package_review_queue, false);
  assert.equal(result.feeds.measurement_cell, false);
});

test("duplicate source refs, held evidence, or cross-lane drift block the bundle", () => {
  const duplicateRefBundle = buildOperatorSourceHandoffBundle({
    bundleId: "operator_source_handoff_bundle_duplicate_ref",
    generatedAt: "2026-06-22T00:00:00.000Z",
    lanes: readyLaneEntries({
      governanceSource: {
        source_ref: "support_assumption_approval_day_30"
      }
    })
  });
  const duplicateResult = validateOperatorSourceHandoffBundle(duplicateRefBundle);

  assert.equal(duplicateRefBundle.decision, "BLOCKED");
  assert.equal(duplicateResult.valid, false);
  assert.ok(duplicateResult.gaps.some((gap) => gap.includes("duplicate source_ref")));

  const heldBundle = buildOperatorSourceHandoffBundle({
    bundleId: "operator_source_handoff_bundle_held",
    generatedAt: "2026-06-22T00:00:00.000Z",
    lanes: readyLaneEntries({
      assumptionSource: {
        review_state: "held"
      }
    })
  });
  const heldResult = validateOperatorSourceHandoffBundle(heldBundle);

  assert.equal(heldBundle.decision, "BLOCKED");
  assert.equal(heldResult.valid, false);
  assert.ok(heldResult.gaps.some((gap) => gap.includes("assumption decision must be READY_FOR_OPERATOR_INTAKE")));

  const driftBundle = buildOperatorSourceHandoffBundle({
    bundleId: "operator_source_handoff_bundle_drift",
    generatedAt: "2026-06-22T00:00:00.000Z",
    lanes: readyLaneEntries({
      governanceSource: {
        function_area: "sales"
      }
    })
  });
  const driftResult = validateOperatorSourceHandoffBundle(driftBundle);

  assert.equal(driftBundle.decision, "BLOCKED");
  assert.equal(driftResult.valid, false);
  assert.ok(driftResult.gaps.some((gap) => gap.includes("function_area drift")));
});

test("unsafe fields, identifiers, raw values, finance, confidence, probability, and override language are rejected", () => {
  const unsafe = clone(readyBundle());
  unsafe.raw_rows = [{ user_id: "user_123", response: "raw transcript" }];
  unsafe.alignment_manifest.sql_text = "select employee_email from raw_events";
  unsafe.operator_sources.vbd_token.source_ref = "raw_sql_roi_probability_export";
  unsafe.measurement_cell_context_fragments.customer_metric.selected_metric_context.employee_email =
    "person@example.com";
  unsafe.finance_context_investigation = true;
  unsafe.confidence_percentage = 93;
  unsafe.contribution_probability = 0.91;
  unsafe.roi_value = 1200000;
  unsafe.governance_override = "force ready for finance output";
  unsafe.allowed_uses.push("finance_context_investigation");

  const result = validateOperatorSourceHandoffBundle(unsafe);

  assert.equal(result.valid, false);
  for (const token of [
    "raw_rows",
    "alignment_manifest.sql_text",
    "operator_sources.vbd_token.source_ref",
    "employee_email",
    "finance_context_investigation",
    "confidence_percentage",
    "contribution_probability",
    "roi_value",
    "governance_override",
    "allowed_uses contains unsupported use: finance_context_investigation"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing ${token}`);
  }
  assert.equal(result.feeds.operator_preparation, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("bundle feeds cannot imply Measurement Cell, finance, confidence, or customer-facing clearance", () => {
  const escalated = clone(readyBundle());
  escalated.feeds.measurement_cell = true;
  escalated.feeds.finance_context_investigation = true;
  escalated.feeds.confidence_model = true;
  escalated.feeds.customer_facing_output = true;
  escalated.feeds.customer_facing_financial_output = true;

  const result = validateOperatorSourceHandoffBundle(escalated);

  assert.equal(result.valid, false);
  for (const token of [
    "feeds.measurement_cell",
    "feeds.finance_context_investigation",
    "feeds.confidence_model",
    "feeds.customer_facing_output",
    "feeds.customer_facing_financial_output"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing ${token}`);
  }
  assert.equal(result.feeds.operator_preparation, false);
  assert.equal(result.feeds.package_alignment_preparation, false);
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_output, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});
