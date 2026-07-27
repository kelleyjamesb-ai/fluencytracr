import { useCallback, useEffect, useRef, useState } from "react";

import { getFrontendSessionContext } from "../auth";
import {
  ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY,
  ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY,
  listAiValueObjects,
  runAiValueSpine,
  runAiValueChain,
  AiValueApiError
} from "../lib/aiValueApi";
import {
  spineRunToViewModel,
  buildKickoffContext,
  type AiValueWorkspaceViewModel
} from "../lib/aiValueViewModel";
import { selectAiValueWorkspaceChain } from "../lib/aiValueFlowSelection";
import {
  buildRequestBoundLiveReport,
  type RequestBoundLiveReport
} from "../lib/aiValueLiveReport";

export type AiValueWorkspaceMode =
  | "example"
  | "loading"
  | "held"
  | "live"
  | "error";

export interface AiValueWorkspaceState {
  mode: AiValueWorkspaceMode;
  live: AiValueWorkspaceViewModel | null;
  liveReport: RequestBoundLiveReport | null;
  errorMessage: string | null;
  connectLiveEvidence: () => Promise<void>;
}

const sessionRole = () => getFrontendSessionContext().role || "EXEC_VIEWER";
const activeValueObjectId = (queryName: string, storageKey: string) =>
  new URLSearchParams(window.location.search).get(queryName) ??
  localStorage.getItem(storageKey);

export const useAiValueWorkspace = (): AiValueWorkspaceState => {
  const [mode, setMode] = useState<AiValueWorkspaceMode>("example");
  const [live, setLive] = useState<AiValueWorkspaceViewModel | null>(null);
  const [liveReport, setLiveReport] =
    useState<RequestBoundLiveReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  useEffect(
    () => () => {
      requestGeneration.current += 1;
    },
    []
  );

  const connectLiveEvidence = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const isCurrent = () => requestGeneration.current === generation;
    setMode("loading");
    setLive(null);
    setLiveReport(null);
    setErrorMessage(null);
    const role = sessionRole();

    const hold = (message: string) => {
      if (!isCurrent()) return;
      setLive(null);
      setLiveReport(null);
      setErrorMessage(message);
      setMode("held");
    };

    try {
      const blueprints = (await listAiValueObjects(role, "blueprint")).objects;
      const libraries = (await listAiValueObjects(role, "metrics_library")).objects;
      if (!isCurrent()) return;
      if (blueprints.length === 0 || libraries.length === 0) {
        hold(
          "Live report is held because no validated Blueprint and Metrics Library are available for this session."
        );
        return;
      }

      const preferredBlueprintId = activeValueObjectId(
        "blueprintId",
        ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY
      );
      const preferredEngagementId = activeValueObjectId(
        "engagementId",
        ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY
      );
      const [engagementsResult, baselinesResult, evidenceCasesResult] =
        await Promise.all([
          listAiValueObjects(role, "engagement"),
          listAiValueObjects(role, "fluency_baseline"),
          listAiValueObjects(role, "value_evidence_case")
        ]);
      if (!isCurrent()) return;
      const selection = selectAiValueWorkspaceChain({
        blueprints,
        libraries,
        engagements: engagementsResult.objects,
        baselines: baselinesResult.objects,
        evidenceCases: evidenceCasesResult.objects,
        preferredBlueprintId,
        preferredEngagementId
      });
      if (!selection) {
        hold("Live report is held because no complete validated workshop chain is available.");
        return;
      }
      const blueprintId = selection.blueprint.object_id;
      const libraryId = selection.metricsLibrary.object_id;

      if (selection.engagement) {
        const response = await runAiValueChain(role, {
          blueprintId,
          metricsLibraryId: libraryId,
          engagementId: selection.engagement.object_id,
          fluencyBaselineId: selection.fluencyBaseline?.object_id
        });
        if (!isCurrent()) return;
        const report = buildRequestBoundLiveReport(response);
        if (!report || !response.run.spine) {
          hold(
            "Live report is held because the exact non-persistent engine response did not clear every request-binding gate."
          );
          return;
        }
        const viewModel = spineRunToViewModel(response.run.spine);
        viewModel.kickoff = buildKickoffContext(
          (response.run.engagement.object as Record<string, unknown>) ?? null,
          response.run.fluency_baseline.summary
        );
        setLive(viewModel);
        setLiveReport(report);
      } else {
        const response = await runAiValueSpine(role, blueprintId, libraryId);
        if (!isCurrent()) return;
        const report = buildRequestBoundLiveReport(response);
        if (!report) {
          hold(
            "Live report is held because the exact non-persistent engine response did not clear every request-binding gate."
          );
          return;
        }
        setLive(spineRunToViewModel(response.run));
        setLiveReport(report);
      }
      if (isCurrent()) {
        setMode("live");
      }
    } catch (error) {
      if (!isCurrent()) return;
      setLive(null);
      setLiveReport(null);
      setMode("error");
      if (error instanceof AiValueApiError && error.status === 403) {
        setErrorMessage(
          "Live report could not be loaded because the verified session lacks permission."
        );
        return;
      }
      setErrorMessage(
        "Live report could not be loaded. No illustrative report is being substituted."
      );
    }
  }, []);

  return {
    mode,
    live,
    liveReport,
    errorMessage,
    connectLiveEvidence
  };
};
