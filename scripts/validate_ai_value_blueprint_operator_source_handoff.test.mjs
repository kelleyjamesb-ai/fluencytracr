import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
  buildBlueprintExtractionDraft,
  buildBlueprintOperatorSourceHandoff,
  validateBlueprintExtractionDraft,
  validateBlueprintOperatorSourceHandoff
} from "../shared/dist/aiValueEngine/index.js";

function baseInput(overrides = {}) {
  return {
    draftId: "blueprint_extraction_draft_northstar_marketing_day_0",
    orgId: "org_northstar",
    clientId: "client_northstar",
    documentSourceRef: "blueprint_upload_doc_ref_northstar_001",
    extractionState: "parsed",
    approvalState: "approved",
    ownerRole: "marketing_business_owner",
    approverRole: "customer_business_owner",
    workflowFamily: "campaign_brief_to_launch",
    workflowName: "Campaign brief to launch",
    functionArea: "marketing",
    cohortKey: "function:marketing|eligible_seats:240",
    valueHypothesis:
      "Marketing can reduce campaign cycle time when governed AI-assisted briefing becomes repeatable.",
    valueRoute: "CAPACITY_CREATION",
    baselineWindow: {
      window_start: "2026-06-01",
      window_end: "2026-06-30"
    },
    comparisonWindow: {
      window_start: "2026-09-01",
      window_end: "2026-09-30"
    },
    metricCandidates: [
	      {
	        metric_id: "marketing_campaign_cycle_days",
	        metric_name: "Campaign cycle time",
	        expected_direction: "decrease",
	        system_recommended: true,
	        customer_selected: true,
	        value_driver: "capacity"
	      }
	    ],
    assumptions: [
      {
        assumption_id: "case_mix_stability",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "volume_context",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "staffing_and_coverage_context",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "channel_mix_context",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "process_or_policy_context",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "knowledge_base_context",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "metric_definition_stability",
        owner: "marketing_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "ai_rollout_context",
        owner: "marketing_ops_owner",
        state: "submitted"
      }
    ],
    sourceRefs: {
      document_source_ref: "blueprint_upload_doc_ref_northstar_001",
      extraction_run_ref: "blueprint_extraction_run_northstar_001"
    },
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("approved Blueprint extraction handoff prepares operator source and Blueprint alignment context only", () => {
  const draft = buildBlueprintExtractionDraft(baseInput());
  const draftValidation = validateBlueprintExtractionDraft(draft);
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateBlueprintOperatorSourceHandoff(handoff);

  assert.equal(draftValidation.valid, true, draftValidation.gaps.join("; "));
  assert.equal(handoff.schema_version, AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.data_spine_blueprint_source, true);
  assert.equal(handoff.feeds.measurement_cell_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
  assert.equal(handoff.operator_source.state, "present");
  assert.equal(handoff.operator_source.intake_mode, "blueprint_structured_import");
  assert.equal(handoff.operator_source.owner_role, "marketing_business_owner");
  assert.equal(handoff.operator_source.owner_approval_state, "approved");
  assert.equal(handoff.operator_source.review_state, "clear");
  assert.equal(handoff.blueprint_alignment_context.value_route, "CAPACITY_CREATION");
  assert.equal(handoff.blueprint_alignment_context.expected_metric_id, "marketing_campaign_cycle_days");
  assert.equal(handoff.blueprint_alignment_context.expected_metric_direction, "decrease");
  assert.equal(handoff.blueprint_alignment_context.source_ref, draft.data_spine_source.source_ref);
  assert.deepEqual(handoff.source_package_reference, null);
});

test("Blueprint handoff carries customer-approved expectation context for Measurement Cell alignment", () => {
  const expectedBehaviorPathways = [
    {
      behavior: "knowledge_retrieval",
      expected_vbd_signal: "depth",
      system_recommended: true,
      customer_selected: true
    },
    {
      behavior: "reuse",
      expected_vbd_signal: "breadth",
      system_recommended: true,
      customer_selected: true
    }
  ];
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      expectedBehaviorPathways,
      metricCandidates: [
        {
          metric_id: "marketing_campaign_cycle_days",
          metric_name: "Campaign cycle time",
          expected_direction: "decrease",
          expected_lag_days: 60,
          system_recommended: true,
          customer_selected: true,
          value_driver: "capacity"
        }
      ]
    })
  );
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateBlueprintOperatorSourceHandoff(handoff);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.deepEqual(
    handoff.blueprint_alignment_context.expected_behavior_pathways,
    expectedBehaviorPathways
  );
  assert.equal(handoff.blueprint_alignment_context.expected_metric_lag_days, 60);
  assert.equal(
    handoff.blueprint_alignment_context.expected_metric_system_recommended,
    true
  );
  assert.equal(
    handoff.blueprint_alignment_context.expected_metric_customer_selected,
    true
  );
  assert.equal(handoff.blueprint_alignment_context.value_driver, "capacity");
  assert.equal(handoff.feeds.measurement_cell_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
});

test("Blueprint handoff carries approved expectation path registry and selected path context", () => {
  const approvedExpectationPaths = [
    {
      expectation_path_id: "path_campaign_brief_to_cycle_time",
      expected_behavior: "knowledge_retrieval",
      expected_vbd_signal: "depth",
      expected_metric_id: "marketing_campaign_cycle_days",
      expected_metric_name: "Campaign cycle time",
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 60,
      expected_metric_system_recommended: true,
      expected_metric_customer_selected: true,
      value_driver: "capacity",
      metric_role: "primary",
      customer_approval_state: "approved",
      approver_role: "customer_business_owner",
      source_ref: "blueprint_extraction_draft_northstar_marketing_day_0"
    },
    {
      expectation_path_id: "path_campaign_brief_to_rework_rate",
      expected_behavior: "verification",
      expected_vbd_signal: "integration",
      expected_metric_id: "marketing_rework_rate",
      expected_metric_name: "Campaign rework rate",
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 90,
      expected_metric_system_recommended: true,
      expected_metric_customer_selected: true,
      value_driver: "quality",
      metric_role: "supporting",
      customer_approval_state: "approved",
      approver_role: "customer_business_owner",
      source_ref: "blueprint_extraction_draft_northstar_marketing_day_0"
    }
  ];
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvedExpectationPaths,
      metricCandidates: [
        {
          metric_id: "marketing_campaign_cycle_days",
          metric_name: "Campaign cycle time",
          expected_direction: "decrease",
          expected_lag_days: 60,
          system_recommended: true,
          customer_selected: true,
          value_driver: "capacity"
        },
        {
          metric_id: "marketing_rework_rate",
          metric_name: "Campaign rework rate",
          expected_direction: "decrease",
          expected_lag_days: 90,
          system_recommended: true,
          customer_selected: true,
          value_driver: "quality"
        }
      ]
    })
  );
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateBlueprintOperatorSourceHandoff(handoff);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.blueprint_alignment_context.expectation_path_id, "path_campaign_brief_to_cycle_time");
  assert.equal(handoff.blueprint_alignment_context.approved_expectation_paths.length, 2);
  assert.equal(
    handoff.blueprint_alignment_context.approved_expectation_path.expected_metric_id,
    "marketing_campaign_cycle_days"
  );
  assert.equal(
    handoff.blueprint_alignment_context.approved_expectation_paths[1].metric_role,
    "supporting"
  );
  assert.equal(handoff.feeds.measurement_cell_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
});

test("pending Blueprint extraction stays held and cannot feed operator intake", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "pending_review",
      approverRole: null
    })
  );
  const draftValidation = validateBlueprintExtractionDraft(draft);
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateBlueprintOperatorSourceHandoff(handoff);

  assert.equal(draftValidation.valid, true, draftValidation.gaps.join("; "));
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.decision, "HELD_FOR_BLUEPRINT_APPROVAL");
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.blueprint_alignment_context, null);
  assert.equal(handoff.feeds.operator_intake_source, false);
  assert.equal(handoff.feeds.data_spine_blueprint_source, false);
  assert.equal(handoff.feeds.measurement_cell_context_fragment, false);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
});

test("invalid Blueprint extraction blocks before operator source handoff", () => {
  const draft = buildBlueprintExtractionDraft(baseInput());
  draft.raw_document_text = "full document body";
  draft.extracted_fields.respondent_email = "person@example.com";
  draft.extracted_fields.confidence_percentage = 91;
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateBlueprintOperatorSourceHandoff(handoff);

  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.blueprint_alignment_context, null);
  assert.ok(result.gaps.some((gap) => gap.includes("raw_document_text")));
  assert.ok(result.gaps.some((gap) => gap.includes("respondent_email")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("Blueprint handoff rejects unapproved metric selection or unsafe value-driver context", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      metricCandidates: [
        {
          metric_id: "marketing_campaign_cycle_days",
          metric_name: "Campaign cycle time",
          expected_direction: "decrease",
          expected_lag_days: 60,
          system_recommended: true,
          customer_selected: true,
          value_driver: "capacity"
        }
      ]
    })
  );
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.blueprint_alignment_context.expected_metric_customer_selected = false;
  drifted.blueprint_alignment_context.value_driver = "ebitda";
  drifted.blueprint_alignment_context.expected_behavior_pathways = [
    {
      behavior: "prompt_transcript_review",
      expected_vbd_signal: "depth",
      system_recommended: true,
      customer_selected: true
    }
  ];

  const result = validateBlueprintOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("expected_metric_customer_selected")));
  assert.ok(result.gaps.some((gap) => gap.includes("value_driver")));
  assert.ok(result.gaps.some((gap) => gap.includes("expected_behavior_pathways")));
  assert.ok(result.gaps.every((gap) => !gap.includes("prompt_transcript_review")));
  assert.ok(result.gaps.every((gap) => !gap.includes("ebitda")));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("Blueprint handoff fails closed when alignment context drifts from operator source", () => {
  const draft = buildBlueprintExtractionDraft(baseInput());
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.blueprint_alignment_context.function_area = "sales";
  drifted.operator_source.expected_metric_id = "different_metric";

  const result = validateBlueprintOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("blueprint_alignment_context.function_area must match operator_source.function_area"));
  assert.ok(result.gaps.includes("blueprint_alignment_context.expected_metric_id must match operator_source.expected_metric_id"));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("Blueprint handoff rejects finance, confidence, raw, route, persistence, and customer-facing side doors", () => {
  const draft = buildBlueprintExtractionDraft(baseInput());
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  handoff.confidence_percentage = 88;
  handoff.contribution_probability = 0.9;
  handoff.raw_rows = [{ user_id: "user_123" }];
  handoff.backend_route = "/api/blueprint-handoff";
  handoff.persistence_table = "blueprint_handoffs";
  handoff.financial_attribution = true;
  handoff.feeds.finance_context_investigation = true;
  handoff.feeds.confidence_model = true;

  const result = validateBlueprintOperatorSourceHandoff(handoff);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.ok(result.gaps.some((gap) => gap.includes("contribution_probability")));
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("backend_route")));
  assert.ok(result.gaps.some((gap) => gap.includes("persistence_table")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_attribution")));
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.finance_context_investigation")));
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.confidence_model")));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});
