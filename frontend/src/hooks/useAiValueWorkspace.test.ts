import { aiValueEngine } from "@fluencytracr/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  selectAiValueJourneyObjects,
  selectAiValueWorkspaceChain,
  selectBestBaselineForWorkflow
} from "../lib/aiValueFlowSelection";
import type { AiValueObjectSummary } from "../lib/aiValueApi";
import {
  AiValueApiError,
  listAiValueObjects,
  runAiValueSpine
} from "../lib/aiValueApi";
import { useAiValueWorkspace } from "./useAiValueWorkspace";
import blueprint from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json";
import metricsLibrary from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

vi.mock("../lib/aiValueApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/aiValueApi")>();
  return {
    ...actual,
    listAiValueObjects: vi.fn(),
    runAiValueChain: vi.fn(),
    runAiValueSpine: vi.fn()
  };
});

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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const readyRun = () => {
  const run = structuredClone(
    aiValueEngine.runSpine({ blueprint, metricsLibrary })
  );
  run.decision = "READY_FOR_EXECUTIVE_VALIDATION";
  (run.stages.readiness.object as Record<string, any>).decision =
    "READY_FOR_EXECUTIVE_VALIDATION";
  (run.stages.claim_boundary.object as Record<string, any>).source_decision =
    "READY_FOR_EXECUTIVE_VALIDATION";
  (run.stages.executive_packet.object as Record<string, any>).decision =
    "READY_FOR_EXECUTIVE_VALIDATION";
  (run.stages.executive_packet.object as Record<string, any>).sections.readiness.decision =
    "READY_FOR_EXECUTIVE_VALIDATION";
  return run;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(listAiValueObjects).mockImplementation(async (_role, objectType) => ({
    objects:
      objectType === "blueprint"
        ? [summary("blueprint", blueprint.blueprint_id, blueprint.workflow_family)]
        : objectType === "metrics_library"
          ? [summary("metrics_library", metricsLibrary.library_id, metricsLibrary.workflow_family)]
          : []
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAiValueWorkspace", () => {
  it("clears live context and requires sign-in after an unauthorized refresh", async () => {
    vi.mocked(listAiValueObjects).mockRejectedValueOnce(
      new AiValueApiError("Unauthorized", 401)
    );
    const { result } = renderHook(() => useAiValueWorkspace());

    await act(async () => {
      await result.current.connectLiveEvidence();
    });

    expect(result.current.mode).toBe("error");
    expect(result.current.live).toBeNull();
    expect(result.current.errorMessage).toMatch(/Sign in with an organization session/i);
  });
});

describe("selectAiValueWorkspaceChain", () => {
  it("falls back to a valid canonical unscoped baseline when no exact match exists", () => {
    const selected = selectBestBaselineForWorkflow(
      [
        summary("fluency_baseline", "fluency_baseline_sales_case_kickoff", null),
        summary("fluency_baseline", "fluency_baseline_customer_support_ticket_triage", null),
        summary("fluency_baseline", "baseline_wrong_family", "sales_case_resolution")
      ],
      "customer_support_case_resolution"
    );

    expect(selected?.object_id).toBe("fluency_baseline_customer_support_ticket_triage");
  });

  it("prefers an exact workflow baseline over an unscoped canonical baseline", () => {
    const selected = selectBestBaselineForWorkflow(
      [
        summary("fluency_baseline", "fluency_baseline_canonical", null),
        summary("fluency_baseline", "fluency_baseline_sales_case_kickoff", "sales_case_resolution")
      ],
      "sales_case_resolution"
    );

    expect(selected?.object_id).toBe("fluency_baseline_sales_case_kickoff");
  });

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
        summary("fluency_baseline", "fluency_baseline_customer_support_kickoff", "customer_support_case_resolution"),
        summary("fluency_baseline", "fluency_baseline_sales_kickoff", "sales_proposal_response")
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
        summary("fluency_baseline", "fluency_baseline_customer_support_kickoff", "customer_support_case_resolution"),
        summary("fluency_baseline", "fluency_baseline_sales_kickoff", "sales_proposal_response")
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

describe("useAiValueWorkspace request lifecycle", () => {
  it("ignores an older overlapping result after a newer request wins", async () => {
    const first = deferred<any>();
    const second = deferred<any>();
    vi.mocked(runAiValueSpine)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAiValueWorkspace());

    let firstRequest!: Promise<void>;
    let secondRequest!: Promise<void>;
    act(() => {
      firstRequest = result.current.connectLiveEvidence();
    });
    await vi.waitFor(() => expect(runAiValueSpine).toHaveBeenCalledTimes(1));
    act(() => {
      secondRequest = result.current.connectLiveEvidence();
    });
    await vi.waitFor(() => expect(runAiValueSpine).toHaveBeenCalledTimes(2));
    await act(async () => {
      second.resolve({ run: readyRun(), persisted: [] });
      await secondRequest;
    });
    expect(result.current.mode).toBe("live");
    const winningReport = result.current.liveReport;

    await act(async () => {
      first.resolve({
        run: { ...readyRun(), decision: "HOLD_FOR_ASSUMPTIONS" },
        persisted: []
      });
      await firstRequest;
    });

    expect(result.current.mode).toBe("live");
    expect(result.current.liveReport).toBe(winningReport);
  });

  it("does not publish a result after unmount", async () => {
    const pending = deferred<any>();
    vi.mocked(runAiValueSpine).mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useAiValueWorkspace());
    let request!: Promise<void>;
    act(() => {
      request = result.current.connectLiveEvidence();
    });
    unmount();

    await act(async () => {
      pending.resolve({ run: readyRun(), persisted: [] });
      await request;
    });

    expect(runAiValueSpine).not.toHaveBeenCalled();
  });
});

describe("selectAiValueJourneyObjects", () => {
  it("honors the preferred valid case and ignores an invalid preferred blueprint", () => {
    const byType = {
      blueprint: [
        summary("blueprint", "bp_alpha", "workflow_alpha"),
        summary("blueprint", "bp_beta", "workflow_beta"),
        summary("blueprint", "bp_invalid", "workflow_invalid", false)
      ],
      metrics_library: [
        summary("metrics_library", "metrics_alpha", "workflow_alpha"),
        summary("metrics_library", "metrics_beta", "workflow_beta"),
        summary("metrics_library", "metrics_invalid", "workflow_invalid")
      ],
      engagement: [],
      fluency_baseline: []
    };

    expect(
      selectAiValueJourneyObjects(byType, { preferredBlueprintId: "bp_beta" }).blueprint
        ?.object_id
    ).toBe("bp_beta");
    expect(
      selectAiValueJourneyObjects(byType, { preferredBlueprintId: "bp_invalid" }).blueprint
        ?.object_id
    ).not.toBe("bp_invalid");
  });

  it("does not treat missing workflow identity as a valid object match", () => {
    const selection = selectAiValueJourneyObjects({
      blueprint: [summary("blueprint", "bp_unscoped", null)],
      metrics_library: [summary("metrics_library", "metrics_unscoped", null)],
      engagement: [],
      fluency_baseline: []
    });

    expect(selection.workflowFamily).toBeNull();
    expect(selection.blueprint).toBeNull();
    expect(selection.metricsLibrary).toBeNull();
  });

  it("does not stitch a preferred blueprint to unrelated libraries or readiness", () => {
    const selection = selectAiValueJourneyObjects(
      {
        blueprint: [
          summary("blueprint", "bp_beta", "workflow_beta"),
          summary("blueprint", "bp_alpha", "workflow_alpha")
        ],
        metrics_library: [summary("metrics_library", "metrics_alpha", "workflow_alpha")],
        evidence_readiness: [
          summary("evidence_readiness", "readiness_alpha", "workflow_alpha")
        ],
        value_evidence_case: [
          summary("value_evidence_case", "case_alpha", "workflow_alpha")
        ],
        engagement: [],
        fluency_baseline: []
      },
      { preferredBlueprintId: "bp_beta" }
    );

    expect(selection.blueprint).toBeNull();
    expect(selection.metricsLibrary).toBeNull();
    expect(selection.readiness).toBeNull();
  });
});
