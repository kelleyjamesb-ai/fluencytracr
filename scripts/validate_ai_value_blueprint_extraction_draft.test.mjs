import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_SCHEMA_VERSION,
  buildBlueprintExtractionDraft,
  validateBlueprint,
  validateBlueprintExtractionDraft
} from "../shared/dist/aiValueEngine/index.js";

function baseInput(overrides = {}) {
  return {
    draftId: "blueprint_extraction_draft_northstar_marketing_day_0",
    orgId: "org_northstar",
    clientId: "client_northstar",
    documentSourceRef: "blueprint_upload_doc_ref_northstar_001",
    extractionState: "parsed",
    approvalState: "pending_review",
    ownerRole: "value_consultant",
    approverRole: null,
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
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  };
}

test("pending Blueprint extraction is reviewable but cannot feed Measurement Cell assembly", () => {
  const draft = buildBlueprintExtractionDraft(baseInput());
  const result = validateBlueprintExtractionDraft(draft);

  assert.equal(draft.schema_version, AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(draft.approval_state, "pending_review");
  assert.equal(draft.feeds.blueprint_review_queue, true);
  assert.equal(draft.feeds.blueprint_validation_input, false);
  assert.equal(draft.feeds.data_spine_blueprint_source, false);
  assert.equal(draft.feeds.measurement_cell_input, false);
  assert.equal(draft.data_spine_source.state, "pending_approval");
});

test("approved Blueprint extraction can become a Blueprint validation input and Data Spine source", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "approved",
      approverRole: "customer_business_owner"
    })
  );
  const result = validateBlueprintExtractionDraft(draft);
  const blueprintResult = validateBlueprint(draft.blueprint_validation_input);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(blueprintResult.valid, true, blueprintResult.gaps.join("; "));
  assert.equal(draft.feeds.blueprint_validation_input, true);
  assert.equal(draft.feeds.data_spine_blueprint_source, true);
  assert.equal(draft.feeds.measurement_cell_input, false);
  assert.equal(draft.data_spine_source.state, "present");
  assert.equal(draft.data_spine_source.owner_approval_state, "approved");
  assert.equal(draft.data_spine_source.intake_mode, "blueprint_structured_import");
});

test("approved Blueprint extraction preserves customer-reviewed measurement expectations without direct Measurement Cell feed", () => {
  const expectedBehaviorPathways = [
    {
      behavior: "knowledge_retrieval",
      expected_vbd_signal: "depth",
      system_recommended: true,
      customer_selected: true
    },
    {
      behavior: "verification",
      expected_vbd_signal: "integration",
      system_recommended: true,
      customer_selected: true
    }
  ];
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "approved",
      approverRole: "customer_business_owner",
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
  const result = validateBlueprintExtractionDraft(draft);
  const blueprintResult = validateBlueprint(draft.blueprint_validation_input);
  const outcomeSignal =
    draft.blueprint_validation_input.source_requirements.approved_aggregate_inputs
      .outcome_signals[0];

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(blueprintResult.valid, true, blueprintResult.gaps.join("; "));
  assert.deepEqual(
    draft.extracted_fields.expected_behavior_pathways,
    expectedBehaviorPathways
  );
  assert.equal(outcomeSignal.expected_lag_days, 60);
  assert.equal(outcomeSignal.system_recommended, true);
  assert.equal(outcomeSignal.customer_selected, true);
  assert.equal(outcomeSignal.value_driver, "capacity");
  assert.equal(draft.feeds.measurement_cell_input, false);
  assert.equal(draft.feeds.customer_facing_financial_output, false);
});

test("Blueprint measurement expectations fail closed on unsafe or unapproved values", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "approved",
      approverRole: "customer_business_owner",
      expectedBehaviorPathways: [
        {
          behavior: "raw_prompt_review",
          expected_vbd_signal: "depth",
          system_recommended: true,
          customer_selected: true
        }
      ],
      metricCandidates: [
        {
          metric_id: "marketing_campaign_cycle_days",
          metric_name: "Campaign cycle time",
          expected_direction: "decrease",
          expected_lag_days: -1,
          system_recommended: true,
          customer_selected: false,
          value_driver: "ebitda"
        }
      ]
    })
  );
  const result = validateBlueprintExtractionDraft(draft);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.blueprint_validation_input, false);
  assert.equal(result.feeds.data_spine_blueprint_source, false);
  assert.ok(result.gaps.some((gap) => gap.includes("expected_behavior_pathways")));
  assert.ok(result.gaps.some((gap) => gap.includes("expected_metric_lag_days")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_selected")));
  assert.ok(result.gaps.some((gap) => gap.includes("value_driver")));
  assert.ok(result.gaps.every((gap) => !gap.includes("raw_prompt_review")));
  assert.ok(result.gaps.every((gap) => !gap.includes("ebitda")));
});

test("approved Blueprint extraction fails closed when metric approval is missing", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "approved",
      approverRole: "customer_business_owner",
      metricCandidates: [
        {
          metric_id: "marketing_campaign_cycle_days",
          metric_name: "Campaign cycle time",
          expected_direction: "decrease",
          value_driver: "capacity"
        }
      ]
    })
  );
  const result = validateBlueprintExtractionDraft(draft);
  const outcomeSignal =
    draft.blueprint_validation_input.source_requirements.approved_aggregate_inputs
      .outcome_signals[0];

  assert.equal(outcomeSignal.customer_selected, null);
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    gap.includes("expected_metric_customer_selected")
  ));
  assert.equal(result.feeds.blueprint_validation_input, false);
  assert.equal(result.feeds.data_spine_blueprint_source, false);
});

test("approved Blueprint extraction fails closed when expectation refs are missing", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "approved",
      approverRole: "customer_business_owner"
    })
  );
  delete draft.extracted_fields.blueprint_expectation_ref;
  delete draft.data_spine_source.blueprint_expectation_ref;

  const result = validateBlueprintExtractionDraft(draft);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    gap.includes("extracted_fields.blueprint_expectation_ref")
  ));
  assert.ok(result.gaps.some((gap) =>
    gap.includes("data_spine_source.blueprint_expectation_ref")
  ));
  assert.equal(result.feeds.blueprint_validation_input, false);
  assert.equal(result.feeds.data_spine_blueprint_source, false);
});

test("unsafe Blueprint document-derived content fails closed", () => {
  const draft = buildBlueprintExtractionDraft(
    baseInput({
      approvalState: "approved",
      approverRole: "customer_business_owner"
    })
  );
  draft.raw_document_text = "full document body";
  draft.extracted_fields.respondent_email = "person@example.com";
  draft.extracted_fields.roi_proof = "proved";
  draft.extracted_fields.confidence_percentage = 88;

  const result = validateBlueprintExtractionDraft(draft);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.blueprint_validation_input, false);
  assert.equal(result.feeds.data_spine_blueprint_source, false);
  for (const token of [
    "raw_document_text",
    "respondent_email",
    "roi_proof",
    "confidence_percentage"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
});
