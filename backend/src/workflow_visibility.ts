import type { FluencyWindow, V0SignalName } from "@learnaire/shared";
import type {
  BehavioralSignalRecord,
  FluencyEventRecord,
  WorkflowRegistryRecord,
  WorkflowVisibilityPolicyConfigRecord
} from "./store";
import type { PatternInferenceRecord } from "./inference/types";

export type WorkflowVisibilityState =
  | "VISIBLE"
  | "NOT_ENOUGH_DATA_YET"
  | "NOT_SHOWN_SAFETY";

export const WORKFLOW_VISIBILITY_COPY: Record<WorkflowVisibilityState, string> = {
  VISIBLE: "Clear enough to show",
  NOT_ENOUGH_DATA_YET: "Not enough data yet",
  NOT_SHOWN_SAFETY: "Not shown (safety)"
};

const WINDOW_DAYS: Record<FluencyWindow, number> = {
  "30d": 30,
  "60d": 60,
  "90d": 90,
  "180d": 180,
  "360d": 365,
  "3m": 90,
  "6m": 180,
  "12m": 365
};

const V0_SIGNAL_SET = new Set<V0SignalName>([
  "invoke_ai",
  "delegate_to_agent",
  "revoke_agent",
  "refine_request",
  "accept_output",
  "retry_after_mismatch",
  "override_to_manual"
]);

const PHASE1_EVENT_SET = new Set([
  "ai_output_disposition",
  "ai_recovery_loop",
  "verification_signal",
  "ai_abandonment",
  "workflow_stage_transition"
]);

const isConfidentPatternLevel = (
  level: PatternInferenceRecord["confidence_level"]
) => level === "MEDIUM" || level === "HIGH";

const toDate = (raw: string) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const withinWindow = (timestamp: string, window: FluencyWindow, now: Date) => {
  const ts = toDate(timestamp);
  if (!ts) {
    return false;
  }
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - WINDOW_DAYS[window]);
  return ts >= start && ts <= now;
};

const atOrAfter = (timestamp: string, lowerBound: string) => {
  const ts = toDate(timestamp);
  const lb = toDate(lowerBound);
  if (!ts || !lb) {
    return false;
  }
  return ts >= lb;
};

const sumSignalCount = (signals: BehavioralSignalRecord[]) => {
  return signals.reduce((acc, signal) => {
    if (!V0_SIGNAL_SET.has(signal.signal_name as V0SignalName) || signal.suppressed) {
      return acc;
    }
    return acc + signal.count;
  }, 0);
};

const hasInvalidTimestamps = (
  workflowId: string,
  events: FluencyEventRecord[],
  signals: BehavioralSignalRecord[]
) => {
  const invalidEvents = events.some((event) => {
    if (event.workflow_id !== workflowId || !PHASE1_EVENT_SET.has(event.event_type)) {
      return false;
    }
    return toDate(event.timestamp) === null;
  });
  if (invalidEvents) {
    return true;
  }
  return signals.some((signal) => {
    if (signal.group_id !== workflowId || !V0_SIGNAL_SET.has(signal.signal_name as V0SignalName)) {
      return false;
    }
    return toDate(signal.bucket_start) === null;
  });
};

const hasPatternAmbiguity = (workflowId: string, records: PatternInferenceRecord[]) => {
  const candidates = new Set(
    records
      .filter((record) => record.scope_key.split(":")[0] === workflowId)
      .filter((record) => record.pattern !== "NO_PATTERN")
      .filter((record) => isConfidentPatternLevel(record.confidence_level))
      .map((record) => record.pattern)
  );
  return candidates.size > 1;
};

const hasVerificationEvidence = (events: FluencyEventRecord[]) => {
  return events.some((event) => {
    if (event.event_type === "verification_signal") {
      return true;
    }
    if (event.event_type === "ai_output_disposition") {
      return Boolean(event.verification_present);
    }
    return false;
  });
};

export const latestRegistryByWorkflow = (entries: WorkflowRegistryRecord[]) => {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.workflowId !== b.workflowId) {
        return a.workflowId.localeCompare(b.workflowId);
      }
      if (a.version !== b.version) {
        return a.version - b.version;
      }
      return a.createdAt.localeCompare(b.createdAt);
    })
    .reduce((acc, entry) => {
      acc.set(entry.workflowId, entry);
      return acc;
    }, new Map<string, WorkflowRegistryRecord>());
};

export const computeWorkflowVisibility = (
  workflowId: string,
  window: FluencyWindow,
  input: {
    now?: Date;
    registryEntry?: WorkflowRegistryRecord;
    policyConfig?: WorkflowVisibilityPolicyConfigRecord | null;
    baselineResetAt?: string | null;
    fluencyEvents: FluencyEventRecord[];
    v0Signals: BehavioralSignalRecord[];
    patternInferenceRecords?: PatternInferenceRecord[];
  }
): WorkflowVisibilityState => {
  const now = input.now ?? new Date();
  const patternInferenceRecords = input.patternInferenceRecords ?? [];

  if (!input.registryEntry) {
    return "NOT_SHOWN_SAFETY";
  }
  if (!input.policyConfig) {
    return "NOT_SHOWN_SAFETY";
  }
  if (input.baselineResetAt && toDate(input.baselineResetAt) === null) {
    return "NOT_SHOWN_SAFETY";
  }
  if (hasInvalidTimestamps(workflowId, input.fluencyEvents, input.v0Signals)) {
    return "NOT_SHOWN_SAFETY";
  }
  if (hasPatternAmbiguity(workflowId, patternInferenceRecords)) {
    return "NOT_SHOWN_SAFETY";
  }

  const filteredSignals = input.v0Signals.filter(
    (signal) =>
      signal.group_id === workflowId &&
      V0_SIGNAL_SET.has(signal.signal_name as V0SignalName) &&
      (!input.baselineResetAt || atOrAfter(signal.bucket_start, input.baselineResetAt)) &&
      withinWindow(signal.bucket_start, window, now)
  );

  if (filteredSignals.some((signal) => signal.suppressed)) {
    return "NOT_SHOWN_SAFETY";
  }

  const filteredEvents = input.fluencyEvents.filter(
    (event) =>
      event.workflow_id === workflowId &&
      PHASE1_EVENT_SET.has(event.event_type) &&
      (!input.baselineResetAt || atOrAfter(event.timestamp, input.baselineResetAt)) &&
      withinWindow(event.timestamp, window, now)
  );

  const evidenceCount = sumSignalCount(filteredSignals) + filteredEvents.length;
  const policy = input.policyConfig;
  const windowDays = WINDOW_DAYS[window];
  const requiredWindowDays = (() => {
    if (input.registryEntry.riskClass === "low") {
      return policy.windowDaysLow;
    }
    if (input.registryEntry.riskClass === "high") {
      return policy.windowDaysHigh;
    }
    return policy.windowDaysMedium;
  })();

  if (windowDays < requiredWindowDays) {
    return "NOT_ENOUGH_DATA_YET";
  }

  const minEventsByRisk = (() => {
    if (input.registryEntry.riskClass === "low") {
      return policy.minEventsLow;
    }
    if (input.registryEntry.riskClass === "high") {
      return policy.minEventsHigh;
    }
    return policy.minEventsMedium;
  })();

  if (evidenceCount < minEventsByRisk) {
    return "NOT_ENOUGH_DATA_YET";
  }

  if (input.registryEntry.riskClass === "high" && policy.requireVerificationHigh && !hasVerificationEvidence(filteredEvents)) {
    return "NOT_ENOUGH_DATA_YET";
  }

  return "VISIBLE";
};

export const computeWorkflowVisibilitySummary = (
  entries: WorkflowRegistryRecord[],
  window: FluencyWindow,
  input: {
    now?: Date;
    policyConfigs: WorkflowVisibilityPolicyConfigRecord[];
    baselineResetsByWorkflowVersion?: Record<string, string | null>;
    fluencyEvents: FluencyEventRecord[];
    v0Signals: BehavioralSignalRecord[];
    patternInferenceRecords?: PatternInferenceRecord[];
  }
) => {
  const latest = latestRegistryByWorkflow(entries);
  const latestPolicyByOrg = input.policyConfigs
    .slice()
    .sort((a, b) => {
      if (a.orgId !== b.orgId) {
        return a.orgId.localeCompare(b.orgId);
      }
      if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return a.id.localeCompare(b.id);
    })
    .reduce((acc, config) => {
      acc.set(config.orgId, config);
      return acc;
    }, new Map<string, WorkflowVisibilityPolicyConfigRecord>());
  const summary: Record<WorkflowVisibilityState, number> = {
    VISIBLE: 0,
    NOT_ENOUGH_DATA_YET: 0,
    NOT_SHOWN_SAFETY: 0
  };

  Array.from(latest.values())
    .sort((a, b) => a.workflowId.localeCompare(b.workflowId))
    .forEach((entry) => {
      const state = computeWorkflowVisibility(entry.workflowId, window, {
        now: input.now,
        registryEntry: entry,
        policyConfig: latestPolicyByOrg.get(entry.orgId) ?? null,
        baselineResetAt:
          input.baselineResetsByWorkflowVersion?.[`${entry.workflowId}:${entry.version}`] ?? null,
        fluencyEvents: input.fluencyEvents,
        v0Signals: input.v0Signals,
        patternInferenceRecords: input.patternInferenceRecords
      });
      summary[state] += 1;
    });

  return summary;
};
