import type { FluencyEvent } from "@fluencytracr/shared";
import type { FluencyEventRecord } from "./store";

/** Aligns with PRD §13 default inactivity window for retry adjacency (not abandonment). */
export const RETRY_SEQUENCE_WINDOW_MS = 15 * 60 * 1000;

export type RetrySequence = {
  failure_event_id: string;
  subsequent_event_id: string;
};

export type StepGroup = {
  group_id: string;
  event_ids: string[];
};

export type ToolGroup = {
  group_id: string;
  event_ids: string[];
};

export type ReconstructedTrace = {
  execution_id: string;
  workflow_id: string;
  ordered_event_ids: string[];
  retry_sequences: RetrySequence[];
  step_groups: StepGroup[];
  tool_groups: ToolGroup[];
};

const toTime = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

export const isFailureSignal = (event: FluencyEvent): boolean => {
  if (event.event_type === "ai_output_disposition") {
    return event.disposition === "rejected" || event.disposition === "abandoned";
  }
  if (event.event_type === "ai_recovery_loop") {
    return event.cycles > 0;
  }
  return false;
};

export const sortEventsByTimestamp = (events: FluencyEventRecord[]): FluencyEventRecord[] =>
  [...events].sort((a, b) => {
    const ta = toTime(a.timestamp) ?? 0;
    const tb = toTime(b.timestamp) ?? 0;
    if (ta !== tb) {
      return ta - tb;
    }
    return a.event_id.localeCompare(b.event_id);
  });

/**
 * First subsequent event after a failure signal within RETRY_SEQUENCE_WINDOW_MS.
 */
export const detectRetrySequences = (ordered: FluencyEventRecord[]): RetrySequence[] => {
  const out: RetrySequence[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    if (!isFailureSignal(ordered[i])) {
      continue;
    }
    const t0 = toTime(ordered[i].timestamp);
    if (t0 === null) {
      continue;
    }
    for (let j = i + 1; j < ordered.length; j += 1) {
      const t1 = toTime(ordered[j].timestamp);
      if (t1 === null || t1 <= t0) {
        continue;
      }
      if (t1 - t0 > RETRY_SEQUENCE_WINDOW_MS) {
        break;
      }
      out.push({
        failure_event_id: ordered[i].event_id,
        subsequent_event_id: ordered[j].event_id
      });
      break;
    }
  }
  return out;
};

/**
 * Consecutive workflow_stage_transition events form one step group; other events break the run.
 */
export const groupStageSteps = (ordered: FluencyEventRecord[]): StepGroup[] => {
  const groups: StepGroup[] = [];
  let current: string[] = [];
  let groupIndex = 0;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    groups.push({
      group_id: `stage_group_${groupIndex}`,
      event_ids: [...current]
    });
    groupIndex += 1;
    current = [];
  };

  for (const e of ordered) {
    if (e.event_type === "workflow_stage_transition") {
      current.push(e.event_id);
    } else {
      flush();
    }
  }
  flush();
  return groups;
};

/**
 * MCP / tool-call shaped events are not in the FluencyEvent union yet; reserved for Phase 1 extension.
 */
export const groupToolCalls = (_ordered: FluencyEventRecord[]): ToolGroup[] => [];

export const reconstructTrace = (events: FluencyEventRecord[]): ReconstructedTrace | null => {
  if (events.length === 0) {
    return null;
  }
  const execution_id = events[0].execution_id;
  const workflow_id = events[0].workflow_id;
  if (!events.every((e) => e.execution_id === execution_id && e.workflow_id === workflow_id)) {
    return null;
  }
  const ordered = sortEventsByTimestamp(events);
  return {
    execution_id,
    workflow_id,
    ordered_event_ids: ordered.map((e) => e.event_id),
    retry_sequences: detectRetrySequences(ordered),
    step_groups: groupStageSteps(ordered),
    tool_groups: groupToolCalls(ordered)
  };
};

export const groupEventsByExecution = (
  events: FluencyEventRecord[]
): Map<string, FluencyEventRecord[]> => {
  const map = new Map<string, FluencyEventRecord[]>();
  for (const e of events) {
    const list = map.get(e.execution_id) ?? [];
    list.push(e);
    map.set(e.execution_id, list);
  }
  return map;
};

export type TraceQuery = {
  workflow_id?: string;
  execution_id?: string;
};

export const reconstructTracesForQuery = (
  allEvents: FluencyEventRecord[],
  query: TraceQuery
): ReconstructedTrace[] => {
  let filtered = allEvents;
  if (query.execution_id) {
    filtered = filtered.filter((e) => e.execution_id === query.execution_id);
  }
  if (query.workflow_id) {
    filtered = filtered.filter((e) => e.workflow_id === query.workflow_id);
  }
  const byExec = groupEventsByExecution(filtered);
  const traces: ReconstructedTrace[] = [];
  for (const [, group] of byExec) {
    const t = reconstructTrace(group);
    if (t) {
      traces.push(t);
    }
  }
  traces.sort((a, b) => a.execution_id.localeCompare(b.execution_id));
  return traces;
};
