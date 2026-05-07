import { store } from "../store";
import { mapLegacyEvents } from "./map_legacy_events";
import { filterByWindow, windowBounds, type WindowSize } from "./windowing";
import { gateInference } from "./gating";
import { classifyPattern } from "./classifier";
import { getTopDrivers } from "./drivers";
import { INFERENCE_VERSION, parameterHash } from "./versioning";
import { buildAuditRecord } from "./audit";
import type { JudgmentEvent, PatternInferenceRecord } from "./types";

const surfaceMixFromEvents = (events: JudgmentEvent[]) => {
  return events.reduce(
    (acc, event) => {
      acc[event.surface_type] += 1;
      return acc;
    },
    { CHAT: 0, DOC_BLOCK: 0, CODE_BLOCK: 0, SUMMARY: 0 }
  );
};

const coverageDaysFromEvents = (events: JudgmentEvent[]) => {
  const days = new Set(
    events.map((event) => event.human_action_timestamp.slice(0, 10))
  );
  return days.size;
};

const buildRecord = (
  scopeType: PatternInferenceRecord["scope_type"],
  scopeKey: string,
  events: JudgmentEvent[],
  window: WindowSize
): PatternInferenceRecord => {
  const { window_start, window_end } = windowBounds(window);
  const evidenceCount = events.length;
  const coverageDays = coverageDaysFromEvents(events);
  const baseRecord: PatternInferenceRecord = {
    scope_key: scopeKey,
    scope_type: scopeType,
    window_start,
    window_end,
    pattern: "NO_PATTERN",
    confidence_level: "WITHHOLD",
    evidence_count: evidenceCount,
    coverage_days: coverageDays,
    surface_mix: surfaceMixFromEvents(events),
    top_drivers: [],
    inference_version: INFERENCE_VERSION,
    parameter_hash: parameterHash(),
    code_commit_hash: "placeholder",
    generated_at: new Date().toISOString()
  };

  const classified = classifyPattern(baseRecord, events);
  const gated = gateInference(classified);
  return {
    ...gated,
    top_drivers: getTopDrivers(gated.pattern)
  };
};

const groupByScope = (events: JudgmentEvent[]) => {
  const byWorkflowRisk = new Map<string, JudgmentEvent[]>();
  const byWorkflowRoleRisk = new Map<string, JudgmentEvent[]>();

  events.forEach((event) => {
    const workflowRiskKey = `${event.workflow_id}:${event.workflow_risk_level}`;
    const workflowRoleRiskKey = `${event.workflow_id}:${event.role_context}:${event.workflow_risk_level}`;

    const listRisk = byWorkflowRisk.get(workflowRiskKey) ?? [];
    listRisk.push(event);
    byWorkflowRisk.set(workflowRiskKey, listRisk);

    const listRoleRisk = byWorkflowRoleRisk.get(workflowRoleRiskKey) ?? [];
    listRoleRisk.push(event);
    byWorkflowRoleRisk.set(workflowRoleRiskKey, listRoleRisk);
  });

  return { byWorkflowRisk, byWorkflowRoleRisk };
};

export const runInference = (windows: WindowSize[] = ["30d", "60d"]) => {
  const judgmentEvents = mapLegacyEvents(Array.from(store.fluencyEvents.values()));

  let withheldCount = 0;
  let scopesProcessed = 0;

  windows.forEach((window) => {
    const windowed = filterByWindow(judgmentEvents, window);
    const { byWorkflowRisk, byWorkflowRoleRisk } = groupByScope(windowed);

    byWorkflowRisk.forEach((events, key) => {
      const record = buildRecord("WORKFLOW_RISK", key, events, window);
      if (record.confidence_level === "WITHHOLD") {
        withheldCount += 1;
      }
      scopesProcessed += 1;
      store.patternInferenceRecords.push(record);
    });

    byWorkflowRoleRisk.forEach((events, key) => {
      const record = buildRecord("WORKFLOW_ROLE_RISK", key, events, window);
      if (record.confidence_level === "WITHHOLD") {
        withheldCount += 1;
      }
      scopesProcessed += 1;
      store.patternInferenceRecords.push(record);
    });
  });

  store.inferenceAuditLogs.push(buildAuditRecord(scopesProcessed, withheldCount));
};
