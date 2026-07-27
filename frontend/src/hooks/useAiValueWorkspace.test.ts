import { aiValueEngine } from "@fluencytracr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectAiValueWorkspaceChain } from "../lib/aiValueFlowSelection";
import type { AiValueObjectSummary } from "../lib/aiValueApi";
import {
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
