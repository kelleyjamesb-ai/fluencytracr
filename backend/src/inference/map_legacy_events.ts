import crypto from "crypto";
import type { FluencyEvent } from "@learnaire/shared";
import type { JudgmentEvent } from "./types";

const latencyBucketFromMs = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "SHORT_DELAY" as const;
  }
  if (value <= 60_000) {
    return "IMMEDIATE" as const;
  }
  if (value <= 300_000) {
    return "SHORT_DELAY" as const;
  }
  return "LONG_DELAY" as const;
};

const roleContextFromOrgUnit = (orgUnit?: string) => {
  if (!orgUnit) {
    return "UNKNOWN" as const;
  }
  if (orgUnit.startsWith("exec:") || orgUnit.includes("executive")) {
    return "EXEC" as const;
  }
  if (orgUnit.startsWith("manager:") || orgUnit.includes("manager")) {
    return "MANAGER" as const;
  }
  return "IC" as const;
};

const surfaceTypeFromEvent = (event: FluencyEvent) => {
  if (event.event_type === "verification_signal") {
    return "SUMMARY" as const;
  }
  return "CHAT" as const;
};

const riskLevelFromEvent = (event: FluencyEvent) => {
  if (event.risk_class === "high") {
    return "HIGH" as const;
  }
  if (event.risk_class === "low") {
    return "LOW" as const;
  }
  return "MEDIUM" as const;
};

const eventTypeFromFluency = (event: FluencyEvent) => {
  if (event.event_type === "ai_output_disposition") {
    if (event.disposition === "accepted") {
      return "ACCEPT" as const;
    }
    if (event.disposition === "edited") {
      return "EDIT" as const;
    }
    if (event.disposition === "rejected") {
      return "REJECT" as const;
    }
    return "ABANDON" as const;
  }
  if (event.event_type === "ai_recovery_loop") {
    return "OVERRIDE" as const;
  }
  if (event.event_type === "ai_abandonment") {
    return "ABANDON" as const;
  }
  return "EDIT" as const;
};

export const mapLegacyEvents = (events: FluencyEvent[]): JudgmentEvent[] => {
  return events.map((event) => ({
    event_id: crypto.randomUUID(),
    schema_version: "v0.2",
    source_system: "legacy_fluency",
    workflow_id: event.workflow_id,
    role_context: roleContextFromOrgUnit(event.org_unit),
    workflow_risk_level: riskLevelFromEvent(event),
    surface_type: surfaceTypeFromEvent(event),
    event_type: eventTypeFromFluency(event),
    human_action_timestamp: event.timestamp,
    latency_bucket: latencyBucketFromMs(event.time_to_action_ms)
  }));
};
