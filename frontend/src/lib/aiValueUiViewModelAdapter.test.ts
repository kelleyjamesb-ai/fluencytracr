import { describe, expect, it } from "vitest";

import {
  AI_VALUE_UI_VIEW_MODEL_STATE_IDS,
  buildAiValueUiViewModelAdapter
} from "./aiValueUiViewModelAdapter";

const unsafeTerms = [
  "reviewer_owned_payload",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "select * from raw_rows",
  "prompt transcript",
  "employee_id",
  "person@example.com",
  "posterior",
  "high confidence",
  "probability",
  "ROI",
  "productivity",
  "causality"
];

const expectedLabels: Record<string, string> = {
  NO_BLUEPRINT: "Blueprint Needed",
  BLUEPRINT_RECEIVED: "Blueprint Received",
  METRICS_RECOMMENDED: "Metrics Recommended",
  MEASUREMENT_PLAN_DRAFTED: "Measurement Plan Drafted",
  MEASUREMENT_PLAN_APPROVED: "Measurement Plan Approved",
  DATA_COLLECTION_PLANNING_READY: "Data Collection Planning Ready",
  SOURCE_PACKAGE_COLLECTION_READY: "Source Package Ready",
  COMPARISON_DESIGN_REVIEWED: "Comparison Design Reviewed",
  EVIDENCE_ALIGNMENT_HELD: "Evidence Alignment Held",
  EVIDENCE_ALIGNMENT_PARTIAL: "Evidence Partially Aligned",
  EVIDENCE_ALIGNMENT_ALIGNED: "Evidence Aligned for Review",
  EVIDENCE_ALIGNMENT_DIVERGENT: "Evidence Divergent for Review",
  MODEL_REVIEW_BLOCKED: "Model Review Blocked"
};

function stateModel(stateId = "NO_BLUEPRINT", overrides = {}) {
  return {
    measurement_journey_state: {
      state_id: stateId,
      status_label: "Internal contract status",
      plain_language_description: "Internal contract description",
      next_action: "internal_raw_next_action",
      user_should_do_next: "Internal contract next step"
    },
    model_review_posture: "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE",
    current_blocker: "missing_blueprint_hypothesis",
    next_allowed_action: "complete_blueprint_hypothesis",
    blocked_claims: ["journey_state_is_not_evidence", "bayesian_promotion"],
    not_yet_evidence: ["measurement_journey_state", "model_review_posture"],
    creates_evidence: false,
    diagnostics_evidence_satisfied: false,
    bayesian_readiness_authorized: false,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    confidence_probability_authorized: false,
    customer_economic_output_authorized: false,
    source_contract_refs: {
      blueprint: "blueprint_hypothesis.customer_support.case_resolution.2026_06"
    },
    source_contract_hashes: {
      state_model_hash: "b".repeat(64)
    },
    ui_language_policy: {
      allowed_ui_language: ["planning input", "review only"],
      blocked_ui_language: ["confidence", "probability", "ROI"]
    },
    blocked_outputs: {
      confidence_output: false,
      probability_output: false,
      roi_output: false,
      productivity_output: false,
      causality_output: false,
      export_creation: false,
      persistence_write: false
    },
    feeds: {
      governed_diagnostics_sufficiency_evidence_source: false,
      bayesian_promotion_decision_gate: false,
      route_or_ui_creation: false,
      schema_persistence_or_export_creation: false
    },
    ...overrides
  };
}

const visibleStreamLabels = [
  "AI Fluency Instrument (SED)",
  "VBD Observed Behavior",
  "Operational / Business Outcomes",
  "Governance & Review Status"
];

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(stringValues);
  }
  return [];
}

describe("AI Value UI View Model Adapter", () => {
  it("maps every Measurement Journey state to one product-safe UI state", () => {
    for (const stateId of AI_VALUE_UI_VIEW_MODEL_STATE_IDS) {
      const viewModel = buildAiValueUiViewModelAdapter({
        measurementJourneyStateModel: stateModel(stateId)
      });

      expect(viewModel.journey_state_id).toBe(stateId);
      expect(viewModel.status_label).toBe(expectedLabels[stateId]);
      expect(viewModel.progress_step_total).toBe(AI_VALUE_UI_VIEW_MODEL_STATE_IDS.length);
      expect(viewModel.progress_step_index).toBe(
        AI_VALUE_UI_VIEW_MODEL_STATE_IDS.indexOf(stateId) + 1
      );
      expect(viewModel.model_review_posture).toBe(
        "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE"
      );
      expect(viewModel.governance_banner).toMatch(/planning/i);
      expect(viewModel.allowed_user_message).not.toMatch(/[A-Z_]{3,}/);
      expect(viewModel.blocked_language_message).not.toMatch(/[A-Z_]{3,}/);
    }
  });

  it("keeps model-review posture blocked and separate when evidence refs align", () => {
    const viewModel = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("EVIDENCE_ALIGNMENT_ALIGNED")
    });

    expect(viewModel.journey_state_id).toBe("EVIDENCE_ALIGNMENT_ALIGNED");
    expect(viewModel.status_label).toBe("Evidence Aligned for Review");
    expect(viewModel.model_review_posture).toBe(
      "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE"
    );
    expect(viewModel.can_show_model_review_status).toBe(true);
    expect(viewModel.can_show_confidence).toBe(false);
    expect(viewModel.can_show_probability).toBe(false);
    expect(viewModel.can_show_roi).toBe(false);
    expect(viewModel.can_show_productivity).toBe(false);
    expect(viewModel.can_show_causality).toBe(false);
    expect(viewModel.status_description).not.toMatch(
      /causal|causality|confidence|probability|roi|productivity|bayesian readiness/i
    );
  });

  it("keeps divergent evidence refs from reading as failure", () => {
    const viewModel = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("EVIDENCE_ALIGNMENT_DIVERGENT")
    });

    expect(viewModel.journey_state_id).toBe("EVIDENCE_ALIGNMENT_DIVERGENT");
    expect(viewModel.status_label).toBe("Evidence Divergent for Review");
    expect(JSON.stringify(viewModel).toLowerCase()).not.toContain("failure");
  });

  it("always emits false safety booleans and high-level evidence stream labels only", () => {
    const viewModel = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("COMPARISON_DESIGN_REVIEWED")
    });

    expect(viewModel.visible_evidence_streams).toEqual(visibleStreamLabels);
    expect(viewModel.can_show_confidence).toBe(false);
    expect(viewModel.can_show_probability).toBe(false);
    expect(viewModel.can_show_roi).toBe(false);
    expect(viewModel.can_show_productivity).toBe(false);
    expect(viewModel.can_show_causality).toBe(false);
    expect(viewModel.can_export).toBe(false);
    expect(viewModel.can_persist_customer_output).toBe(false);
  });

  it("does not expose raw payloads, source refs, hashes, nested internals, or unsafe text", () => {
    const viewModel = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("MODEL_REVIEW_BLOCKED", {
        current_blocker: "select * from raw_rows where employee_id = 123",
        reviewer_owned_payload: {
          reviewer_name: "Ada Lovelace",
          source_ref: "source_ref.internal.payload",
          source_hash: "a".repeat(64)
        },
        source_contract_refs: {
          reviewer_owned_source_package_ref:
            "reviewer_owned_comparison_design_source_package.secret.2026_06"
        },
        source_contract_hashes: {
          comparison_design_hash: "a".repeat(64)
        }
      }),
      upstreamPosture: {
        missing_requirements: [
          "safe label",
          "source_ref.internal.secret",
          "a".repeat(64),
          { nested: "raw_rows" }
        ],
        held_requirements: ["reviewer-owned package missing"],
        suppressed_requirements: ["employee_id"],
        source_state_summary: {
          reviewer_name: "Ada Lovelace",
          nested: { prompt: "raw prompt" }
        }
      }
    });

    const renderedText = stringValues(viewModel).join(" ");
    for (const term of unsafeTerms) {
      expect(renderedText).not.toContain(term);
    }
    expect(renderedText).not.toMatch(/[0-9a-f]{64}/i);
    expect(renderedText).not.toMatch(/source_ref|source_hash|reviewer_name/i);
    expect(viewModel.missing_requirements).toContain("safe label");
  });

  it("fails closed for unknown or unsafe upstream state and does not advance beyond the source model", () => {
    const unknown = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("MADE_UP_STATE")
    });
    const unsafe = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("EVIDENCE_ALIGNMENT_ALIGNED", {
        measurement_journey_state: {
          state_id: "EVIDENCE_ALIGNMENT_ALIGNED",
          status_label: "high confidence ROI caused productivity",
          plain_language_description: "posterior probability output",
          next_action: "export_customer_output",
          user_should_do_next: "persist customer-facing economic output"
        }
      })
    });

    expect(unknown.journey_state_id).toBe("NO_BLUEPRINT");
    expect(unknown.status_label).toBe("Blueprint Needed");
    expect(unsafe.journey_state_id).toBe("NO_BLUEPRINT");
    expect(unsafe.can_show_metrics).toBe(false);
    expect(unsafe.can_show_evidence_alignment_status).toBe(false);
  });

  it("fails closed when required non-authorization gates are missing or true", () => {
    const trueGate = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("EVIDENCE_ALIGNMENT_ALIGNED", {
        promotion_authorized: true
      })
    });
    const missingGateModel = stateModel("EVIDENCE_ALIGNMENT_ALIGNED");
    delete (missingGateModel as Record<string, unknown>).confidence_probability_authorized;
    const missingGate = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: missingGateModel
    });
    const trueBlockedOutput = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("EVIDENCE_ALIGNMENT_ALIGNED", {
        blocked_outputs: {
          confidence_output: false,
          probability_output: true,
          roi_output: false,
          productivity_output: false,
          causality_output: false,
          export_creation: false,
          persistence_write: false
        }
      })
    });

    for (const viewModel of [trueGate, missingGate, trueBlockedOutput]) {
      expect(viewModel.journey_state_id).toBe("NO_BLUEPRINT");
      expect(viewModel.status_label).toBe("Blueprint Needed");
      expect(viewModel.can_show_confidence).toBe(false);
      expect(viewModel.can_show_probability).toBe(false);
      expect(viewModel.can_show_roi).toBe(false);
      expect(viewModel.can_export).toBe(false);
      expect(viewModel.can_persist_customer_output).toBe(false);
    }
  });

  it("uses safe upstream posture only for labels and does not recompute active state", () => {
    const viewModel = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("BLUEPRINT_RECEIVED"),
      upstreamPosture: {
        metricsRecommendationState: "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE",
        measurementPlanState: "REVIEWER_APPROVED_MEASUREMENT_PLAN_READY",
        triangulatedEvidenceAlignmentState: "ALIGNED_FOR_REVIEW",
        missing_requirements: ["Complete candidate metric recommendation"]
      }
    });

    expect(viewModel.journey_state_id).toBe("BLUEPRINT_RECEIVED");
    expect(viewModel.status_label).toBe("Blueprint Received");
    expect(viewModel.can_show_metrics).toBe(false);
    expect(viewModel.missing_requirements).toContain(
      "Complete candidate metric recommendation"
    );
  });
});
