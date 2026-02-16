import { useEffect, useState } from "react";
import { governanceApi } from "../lib/governanceApi";
import type { GovernanceHeroActionId } from "../constants/governanceConcept";
import { useGovernanceContext } from "./useGovernanceContext";
import type { ComplianceEventsResponse, ComplianceStatusResponse } from "../types/governance";

export function useHeroActionWorkspace(activeAction: GovernanceHeroActionId) {
  const { orgId, role, isAdmin } = useGovernanceContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState<ComplianceStatusResponse | null>(null);
  const [events, setEvents] = useState<ComplianceEventsResponse["events"]>([]);
  const [mode, setMode] = useState<"shadow" | "enforced">("shadow");
  const [rationale, setRationale] = useState("Governance review requested mode transition.");
  const [modeMessage, setModeMessage] = useState("");
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const ctx = { orgId, role };
        if (activeAction === "org_signals" || activeAction === "mode_change") {
          const payload = await governanceApi.getComplianceStatus(ctx);
          if (!isCancelled) {
            setStatus(payload);
            setMode(payload.mode);
          }
          return;
        }
        if (activeAction === "timeline") {
          const payload = await governanceApi.getComplianceEvents(ctx, 8);
          if (!isCancelled) {
            setEvents(payload.events ?? []);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load section data.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isCancelled = true;
    };
  }, [activeAction, orgId, role]);

  const updateMode = async () => {
    setIsUpdatingMode(true);
    setModeMessage("");
    try {
      await governanceApi.patchComplianceMode({ orgId, role }, mode, rationale);
      setModeMessage(`Mode update submitted: ${mode}`);
    } catch (error) {
      setModeMessage(error instanceof Error ? error.message : "Unable to update mode.");
    } finally {
      setIsUpdatingMode(false);
    }
  };

  return {
    isAdmin,
    isLoading,
    errorMessage,
    status,
    events,
    mode,
    setMode,
    rationale,
    setRationale,
    modeMessage,
    isUpdatingMode,
    updateMode
  };
}

