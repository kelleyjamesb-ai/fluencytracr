import { createHash } from "node:crypto";
import {
  GleanSignalReadinessMapSchema,
  type GleanSignalReadinessEntry
} from "./gleanSignalReadinessSchemas";
import {
  UnifiedTelemetryEventSchema,
  type UnifiedTelemetryEvent
} from "./unifiedTelemetrySchemas";

export type NonComputableGleanSignal = {
  signal_family: string;
  readiness_status: "missing" | "suppressed" | "not_computed";
  suppression_reasons: string[];
  reason: string;
};

export type GleanReadinessUnifiedTelemetryCoverage = {
  events: UnifiedTelemetryEvent[];
  non_computable_signals: NonComputableGleanSignal[];
};

function stableUuid(parts: string[]): string {
  const hex = createHash("sha256").update(parts.join("|")).digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32)
  ].join("-");
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function deriveWindowId(window: string, generatedAt: string): string {
  if (/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(window)) {
    return window;
  }
  const end = new Date(generatedAt);
  const start = new Date(end);
  const days = window === "daily" ? 1 : window === "weekly" ? 7 : Number.parseInt(window, 10);
  start.setUTCDate(end.getUTCDate() - (Number.isFinite(days) && days > 0 ? days : 7));
  return `${dateOnly(start)}__${dateOnly(end)}`;
}

function nonComputableReason(entry: GleanSignalReadinessEntry): string {
  if (entry.suppression_reasons.length > 0) {
    return entry.suppression_reasons[0];
  }
  if (entry.source_availability !== "available") {
    return entry.source_availability;
  }
  if (entry.scrub_status !== "scrubbed" && entry.scrub_status !== "not_applicable") {
    return entry.scrub_status;
  }
  if (entry.stable_join_keys.length === 0) {
    return "missing_join_keys";
  }
  if (entry.derived_dimensions.length === 0) {
    return "missing_derived_dimensions";
  }
  return entry.readiness_status;
}

export function mapReadinessToUnifiedTelemetryCoverage(
  raw: unknown
): GleanReadinessUnifiedTelemetryCoverage {
  const readinessMap = GleanSignalReadinessMapSchema.parse(raw);
  const windowId = deriveWindowId(readinessMap.window, readinessMap.generated_at);
  const events: UnifiedTelemetryEvent[] = [];
  const nonComputableSignals: NonComputableGleanSignal[] = [];

  readinessMap.entries.forEach((entry, index) => {
    if (entry.readiness_status !== "present") {
      nonComputableSignals.push({
        signal_family: entry.signal_family,
        readiness_status: entry.readiness_status,
        suppression_reasons: entry.suppression_reasons,
        reason: nonComputableReason(entry)
      });
      return;
    }

    events.push(
      UnifiedTelemetryEventSchema.parse({
        schema_version: "UT_2026_04",
        event_id: stableUuid([
          readinessMap.org_id,
          readinessMap.window,
          readinessMap.generated_at,
          entry.signal_family
        ]),
        event_name: "UT.AGENT.RUN_BOUNDARY_RECORDED.V1",
        event_category: "AGENT_EXECUTION",
        org_id: readinessMap.org_id,
        function_id: "glean_readiness_coverage",
        role_class: "ORG_AGGREGATE",
        ingress_surface: "API",
        event_timestamp: readinessMap.generated_at,
        window_id: windowId,
        trace_axes: ["resolution"],
        ambiguity_flag: false,
        correlation_id: `glean-readiness:${readinessMap.org_id}:${readinessMap.window}`,
        sequence_no: index,
        workflow_id: `glean:${entry.signal_family}`,
        emitter_version: "glean-readiness-bridge.v1",
        payload: {
          agent_run_id: `glean-readiness-${entry.signal_family}`,
          step_index: index,
          tool_class: "OTHER",
          attempt_outcome: "SUCCESS",
          latency_ms: 0
        }
      })
    );
  });

  return {
    events,
    non_computable_signals: nonComputableSignals
  };
}
