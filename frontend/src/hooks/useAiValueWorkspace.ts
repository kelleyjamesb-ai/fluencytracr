import { useCallback, useState } from "react";

import {
  listAiValueObjects,
  putAiValueObject,
  runAiValueSpine,
  AiValueApiError
} from "../lib/aiValueApi";
import {
  spineRunToViewModel,
  type AiValueWorkspaceViewModel
} from "../lib/aiValueViewModel";
import seedBlueprint from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json";
import seedMetricsLibrary from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

export type AiValueWorkspaceMode = "example" | "loading" | "live" | "error";

export interface AiValueWorkspaceState {
  mode: AiValueWorkspaceMode;
  live: AiValueWorkspaceViewModel | null;
  errorMessage: string | null;
  connectLiveEvidence: () => Promise<void>;
}

const sessionRole = () => (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";
const sessionOrgId = () => (localStorage.getItem("orgId") ?? "org-1").trim() || "org-1";

export const useAiValueWorkspace = (): AiValueWorkspaceState => {
  const [mode, setMode] = useState<AiValueWorkspaceMode>("example");
  const [live, setLive] = useState<AiValueWorkspaceViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const connectLiveEvidence = useCallback(async () => {
    setMode("loading");
    setErrorMessage(null);
    const role = sessionRole();
    try {
      let blueprints = (await listAiValueObjects(role, "blueprint")).objects;
      let libraries = (await listAiValueObjects(role, "metrics_library")).objects;

      if (blueprints.length === 0 || libraries.length === 0) {
        // Seed the workshop example through the governed API so the engine
        // validates it like any client object. The org id is rewritten to the
        // active session org to respect org scoping.
        const orgId = sessionOrgId();
        const blueprintPayload = {
          ...(seedBlueprint as Record<string, unknown>),
          org_id: orgId
        };
        await putAiValueObject(
          role,
          "blueprint",
          String(blueprintPayload.blueprint_id),
          blueprintPayload
        );
        await putAiValueObject(
          role,
          "metrics_library",
          String((seedMetricsLibrary as Record<string, unknown>).library_id),
          seedMetricsLibrary as Record<string, unknown>
        );
        blueprints = (await listAiValueObjects(role, "blueprint")).objects;
        libraries = (await listAiValueObjects(role, "metrics_library")).objects;
      }

      const blueprintId = blueprints[0]?.object_id;
      const libraryId = libraries[0]?.object_id;
      if (!blueprintId || !libraryId) {
        throw new Error("No workshop objects available");
      }

      const { run } = await runAiValueSpine(role, blueprintId, libraryId);
      setLive(spineRunToViewModel(run));
      setMode("live");
    } catch (error) {
      setMode("error");
      if (error instanceof AiValueApiError && error.status === 403) {
        setErrorMessage(
          "Your current role can view the workshop but cannot refresh live evidence."
        );
        return;
      }
      setErrorMessage(
        "Could not reach the evidence engine. The workshop is showing example content."
      );
    }
  }, []);

  return { mode, live, errorMessage, connectLiveEvidence };
};
