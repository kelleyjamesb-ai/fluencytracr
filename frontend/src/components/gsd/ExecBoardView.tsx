// ExecBoardView — CEO / EXEC_VIEWER board layer.
// Governance: org-aggregate signals only. No individual attribution.
import { useEffect, useMemo, useState } from "react";
import { governanceApi } from "../../lib/governanceApi";
import { useGovernanceContext } from "../../hooks/useGovernanceContext";
import { FreshnessChip } from "./FreshnessChip";
import { RagChip } from "./RagChip";
import { WhatChangedPanel } from "./WhatChangedPanel";
import type {
  ComplianceEventsResponse,
  ComplianceStatusResponse,
} from "../../types/governance";

const momentumLabel = (events: ComplianceEventsResponse["events"]) => {
  if (events.length === 0) return "Stable";
  const mapped = events.filter((e) => e.event_type === "policy_mapped").length;
  const modeUpdates = events.filter(
    (e) => e.event_type === "compliance_mode_updated"
  ).length;
  if (mapped >= 2 || modeUpdates > 0) return "Improving";
  return "Stable";
};

const momentumCls = (label: string) => {
  if (label === "Improving") return "gsd-momentum gsd-momentum-improving";
  if (label === "Declining") return "gsd-momentum gsd-momentum-declining";
  return "gsd-momentum gsd-momentum-stable";
};

const deriveFocusAreas = (
  status: ComplianceStatusResponse
): string[] => {
  const items = [
    status.counts.disabled > 0
      ? "Disabled controls are scheduled for remediation."
      : null,
    status.counts.partial > 0
      ? "Partial controls need confidence review."
      : null,
    status.freshness?.stale ? "Signal freshness needs attention." : null,
  ].filter(Boolean) as string[];
  return items.length > 0 ? items.slice(0, 3) : ["No critical focus areas identified."];
};


export function ExecBoardView() {
  const { orgId, role } = useGovernanceContext();
  const [status, setStatus] = useState<ComplianceStatusResponse | null>(null);
  const [events, setEvents] = useState<ComplianceEventsResponse["events"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const ctx = { orgId, role };
        const [compliance, eventsPayload] = await Promise.all([
          governanceApi.getComplianceStatus(ctx),
          governanceApi.getComplianceEvents(ctx, 30),
        ]);
        if (!cancelled) {
          setStatus(compliance);
          setEvents(eventsPayload.events ?? []);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unable to load board signals.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orgId, role]);

  const momentum = useMemo(() => momentumLabel(events), [events]);
  const focusAreas = useMemo(
    () => (status ? deriveFocusAreas(status) : []),
    [status]
  );

  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Board View</h2>
          <p>Enterprise governance posture — directional signals, not individual surveillance.</p>
        </div>
      </div>

      {isLoading && <p style={{ color: "#888" }}>Loading board signals…</p>}
      {!isLoading && error && (
        <div className="gc-card" style={{ borderColor: "#ffc5d1" }}>
          <p style={{ color: "#8c1930" }}>Unavailable — {error}</p>
        </div>
      )}

      {!isLoading && !error && status && (
        <div className="gsd-board-grid">
          {/* Enterprise Governance Posture */}
          <article className="gc-card">
            <p className="gc-mono" style={{ marginBottom: 10 }}>Enterprise Governance Posture</p>
            <div className="gsd-posture-row">
              <RagChip status={status.overall_status} />
              <FreshnessChip
                lastEventAt={status.freshness?.last_event_at ?? null}
                isStale={status.freshness?.stale ?? true}
              />
            </div>
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              Reflects aggregate control posture — never individual inference.
            </p>
          </article>

          {/* Momentum */}
          <article className="gc-card">
            <p className="gc-mono" style={{ marginBottom: 10 }}>Momentum (30-60d)</p>
            <span className={momentumCls(momentum)}>{momentum}</span>
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              Based on governance event cadence and mode changes.
            </p>
          </article>

          {/* Top Focus Areas */}
          <article className="gc-card">
            <p className="gc-mono" style={{ marginBottom: 10 }}>Top Focus Areas</p>
            <ul className="gsd-focus-list">
              {focusAreas.map((area) => (
                <li key={area}>
                  <span className="gsd-focus-dot" aria-hidden="true" />
                  {area}
                </li>
              ))}
            </ul>
          </article>

          {/* What Changed Since Last Review */}
          <article className="gc-card" style={{ gridColumn: "span 1" }}>
            <WhatChangedPanel events={events} isLoading={isLoading} />
          </article>
        </div>
      )}
    </section>
  );
}
