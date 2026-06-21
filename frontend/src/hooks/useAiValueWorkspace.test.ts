import { describe, expect, it } from "vitest";

import { selectAiValueWorkspaceChain } from "../lib/aiValueFlowSelection";
import type { AiValueObjectSummary } from "../lib/aiValueApi";

const summary = (
  object_type: string,
  object_id: string,
  workflow_family: string | null,
  valid = true
): AiValueObjectSummary => ({
  object_type,
  object_id,
  schema_version: "TEST",
  workflow_family,
  valid,
  validation: {},
  updated_at: "2026-06-17T00:00:00.000Z"
});

describe("selectAiValueWorkspaceChain", () => {
  it("prefers the complete Northstar evidence-case-backed chain over older generic objects", () => {
    const selection = selectAiValueWorkspaceChain({
      blueprints: [
        summary("blueprint", "bp_generic_customer_support", "customer_support_case_resolution"),
        summary("blueprint", "bp_sales_proposal_response", "sales_proposal_response")
      ],
      libraries: [
        summary("metrics_library", "metrics_customer_support_v1", "customer_support_case_resolution"),
        summary("metrics_library", "metrics_sales_v1", "sales_proposal_response")
      ],
      engagements: [summary("engagement", "engagement_northstar_enterprise_v1", null)],
      baselines: [
        summary("fluency_baseline", "fluency_baseline_customer_support_kickoff", null),
        summary("fluency_baseline", "fluency_baseline_sales_kickoff", null)
      ],
      evidenceCases: [
        summary(
          "value_evidence_case",
          "value_evidence_case_sales_proposal_response_v1",
          "sales_proposal_response"
        )
      ],
      preferredBlueprintId: null,
      preferredEngagementId: null
    });

    expect(selection?.blueprint.object_id).toBe("bp_sales_proposal_response");
    expect(selection?.metricsLibrary.object_id).toBe("metrics_sales_v1");
    expect(selection?.engagement?.object_id).toBe("engagement_northstar_enterprise_v1");
    expect(selection?.fluencyBaseline?.object_id).toBe("fluency_baseline_sales_kickoff");
  });

  it("keeps a user-selected blueprint but still matches the library and baseline by workflow", () => {
    const selection = selectAiValueWorkspaceChain({
      blueprints: [
        summary("blueprint", "bp_sales_proposal_response", "sales_proposal_response"),
        summary("blueprint", "bp_customer_support_case_resolution", "customer_support_case_resolution")
      ],
      libraries: [
        summary("metrics_library", "metrics_customer_support_v1", "customer_support_case_resolution"),
        summary("metrics_library", "metrics_sales_v1", "sales_proposal_response")
      ],
      engagements: [summary("engagement", "engagement_northstar_enterprise_v1", null)],
      baselines: [
        summary("fluency_baseline", "fluency_baseline_customer_support_kickoff", null),
        summary("fluency_baseline", "fluency_baseline_sales_kickoff", null)
      ],
      evidenceCases: [],
      preferredBlueprintId: "bp_customer_support_case_resolution",
      preferredEngagementId: null
    });

    expect(selection?.blueprint.object_id).toBe("bp_customer_support_case_resolution");
    expect(selection?.metricsLibrary.object_id).toBe("metrics_customer_support_v1");
    expect(selection?.fluencyBaseline?.object_id).toBe(
      "fluency_baseline_customer_support_kickoff"
    );
  });
});
