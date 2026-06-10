import { useCallback, useEffect, useState } from "react";

import {
  listAiValueObjects,
  reviewOutcomeEvidence,
  fetchReadoutHtml,
  AiValueApiError,
  type AiValueObjectSummary
} from "../lib/aiValueApi";

export type JourneyStageKey =
  | "kickoff"
  | "discovery"
  | "workshop"
  | "evidence"
  | "readout";

export type JourneyStageState = "done" | "attention" | "todo";

export interface JourneyStage {
  key: JourneyStageKey;
  label: string;
  state: JourneyStageState;
  detail: string;
  link?: string;
}

export interface EvidenceReviewItem {
  exportId: string;
  reviewState: string;
  workflowFamily: string | null;
}

export interface AiValueJourney {
  loading: boolean;
  clientName: string | null;
  stages: JourneyStage[];
  evidenceItems: EvidenceReviewItem[];
  packetIds: string[];
  errorMessage: string | null;
  refresh: () => Promise<void>;
  review: (exportId: string, decision: "ACCEPTED" | "REJECTED") => Promise<void>;
  openReadout: (packetId: string) => Promise<void>;
}

const DECISION_LABELS: Record<string, string> = {
  READY_FOR_EXECUTIVE_VALIDATION: "Ready for sponsor validation",
  HOLD_FOR_ASSUMPTIONS: "Needs client assumptions",
  HOLD_FOR_SOURCE_COVERAGE: "Needs evidence sources",
  HOLD_FOR_BASELINE: "Needs a baseline window",
  STOP_FOR_GOVERNANCE_REVIEW: "Paused for governance review"
};

const sessionRole = () => (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";

const reviewStateOf = (summary: AiValueObjectSummary): string =>
  String((summary.validation as Record<string, unknown>)?.review_state ?? "SUBMITTED");

function deriveStages(byType: Record<string, AiValueObjectSummary[]>): JourneyStage[] {
  const baselines = byType.fluency_baseline ?? [];
  const engagements = byType.engagement ?? [];
  const blueprints = byType.blueprint ?? [];
  const readiness = byType.evidence_readiness ?? [];
  const exportsList = byType.outcome_evidence_export ?? [];
  const packets = byType.executive_packet ?? [];

  const kickoff: JourneyStage = {
    key: "kickoff",
    label: "Fluency Kickoff",
    state: baselines.length > 0 ? "done" : "todo",
    detail:
      baselines.length > 0
        ? "Kickoff fluency baseline is on file."
        : "Optional: run the fluency check with the client team."
  };

  const discovery: JourneyStage = {
    key: "discovery",
    label: "Discovery & Blueprinting",
    state: engagements.length > 0 ? (blueprints.length > 0 ? "done" : "attention") : "todo",
    detail:
      engagements.length > 0
        ? blueprints.length > 0
          ? "Engagement and workflow blueprint are captured."
          : "Engagement saved. Finish the blueprint workshop."
        : "Start with the client conversation.",
    link: "/ai-value-discovery"
  };

  const latestReadiness = readiness[readiness.length - 1];
  const readinessDecision = latestReadiness
    ? String((latestReadiness.validation as Record<string, unknown>)?.decision ?? "")
    : null;
  const workshop: JourneyStage = {
    key: "workshop",
    label: "Value Workshop",
    state: readiness.length > 0 ? "done" : blueprints.length > 0 ? "attention" : "todo",
    detail:
      readiness.length > 0
        ? DECISION_LABELS[readinessDecision ?? ""] ?? "Workshop run complete."
        : blueprints.length > 0
          ? "Blueprint ready. Connect live evidence in the workshop."
          : "Create the blueprint in discovery first.",
    link: "/ai-value-workspace"
  };

  const accepted = exportsList.filter((item) => reviewStateOf(item) === "ACCEPTED");
  const submitted = exportsList.filter((item) => reviewStateOf(item) === "SUBMITTED");
  const evidence: JourneyStage = {
    key: "evidence",
    label: "Client Evidence",
    state: accepted.length > 0 ? "done" : submitted.length > 0 ? "attention" : "todo",
    detail:
      accepted.length > 0
        ? "Client outcome evidence is attached."
        : submitted.length > 0
          ? `${submitted.length} export${submitted.length === 1 ? "" : "s"} awaiting review.`
          : "Invite the client's outcome export when windows close."
  };

  const readout: JourneyStage = {
    key: "readout",
    label: "Executive Readout",
    state: packets.length > 0 ? "done" : "todo",
    detail:
      packets.length > 0
        ? "Sponsor-ready readout is available."
        : "Run the workshop to compose the readout."
  };

  return [kickoff, discovery, workshop, evidence, readout];
}

export const useAiValueJourney = (): AiValueJourney => {
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState<string | null>(null);
  const [stages, setStages] = useState<JourneyStage[]>(deriveStages({}));
  const [evidenceItems, setEvidenceItems] = useState<EvidenceReviewItem[]>([]);
  const [packetIds, setPacketIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const role = sessionRole();
      const { objects } = await listAiValueObjects(role);
      const byType: Record<string, AiValueObjectSummary[]> = {};
      for (const summary of objects) {
        byType[summary.object_type] = byType[summary.object_type] ?? [];
        byType[summary.object_type].push(summary);
      }
      setStages(deriveStages(byType));
      setEvidenceItems(
        (byType.outcome_evidence_export ?? []).map((summary) => ({
          exportId: summary.object_id,
          reviewState: reviewStateOf(summary),
          workflowFamily: summary.workflow_family
        }))
      );
      setPacketIds((byType.executive_packet ?? []).map((summary) => summary.object_id));

      const engagementClient = (byType.engagement ?? [])[0]?.validation as
        | Record<string, unknown>
        | undefined;
      // The validation snapshot does not carry the client name; show the
      // engagement id family until the payload is needed elsewhere.
      setClientName(
        engagementClient && typeof engagementClient.client_id === "string"
          ? String(engagementClient.client_id)
              .replace(/^client_/, "")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (letter) => letter.toUpperCase())
          : null
      );
    } catch (error) {
      setErrorMessage(
        error instanceof AiValueApiError && error.status === 401
          ? "Sign in with an organization session to see the journey."
          : "Could not reach the evidence engine."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const review = useCallback(
    async (exportId: string, decision: "ACCEPTED" | "REJECTED") => {
      setErrorMessage(null);
      try {
        await reviewOutcomeEvidence(sessionRole(), exportId, decision);
        await refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof AiValueApiError && error.status === 403
            ? "Your current role can view evidence but cannot review it."
            : "The review could not be applied."
        );
      }
    },
    [refresh]
  );

  const openReadout = useCallback(async (packetId: string) => {
    setErrorMessage(null);
    try {
      const html = await fetchReadoutHtml(sessionRole(), packetId);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener");
    } catch {
      setErrorMessage("The readout could not be opened.");
    }
  }, []);

  return {
    loading,
    clientName,
    stages,
    evidenceItems,
    packetIds,
    errorMessage,
    refresh,
    review,
    openReadout
  };
};
