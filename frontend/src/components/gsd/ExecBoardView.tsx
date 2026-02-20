// ExecBoardView — CEO / EXEC_VIEWER board layer.
// Governance: org-aggregate signals only. No individual attribution.
import { useEffect, useMemo, useState } from "react";
import { GovernanceApiError, governanceApi } from "../../lib/governanceApi";
import { useGovernanceContext } from "../../hooks/useGovernanceContext";
import { FreshnessChip } from "./FreshnessChip";
import { RagChip } from "./RagChip";
import { WhatChangedPanel } from "./WhatChangedPanel";
import type {
  ComplianceEventsResponse,
  ComplianceStatusResponse,
} from "../../types/governance";

const CONTROL_LABELS: Record<string, string> = {
  ai_enabled_status:                "AI Tool Access",
  data_retention_policy_status:     "Data Retention",
  model_training_opt_out_status:    "Training Opt-Out",
  external_sharing_disabled_status: "External Data Sharing",
};

const momentumLabel = (
  events: ComplianceEventsResponse["events"],
  status: ComplianceStatusResponse | null
) => {
  const disabled = status?.counts?.disabled ?? 0;
  const recentDisableEvents = events.filter(
    (e) => e.event_type === "control_state_updated" && e.status === "disabled"
  ).length;
  if (disabled > 0 && recentDisableEvents > 0) return "Declining";
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

const deriveFocusAreas = (status: ComplianceStatusResponse): string[] => {
  const controls = status.controls ?? [];
  const items = [
    ...controls
      .filter((c) => c.status === "disabled" && CONTROL_LABELS[c.control_name])
      .map((c) => `${CONTROL_LABELS[c.control_name]} is disabled — remediation needed.`),
    ...controls
      .filter((c) => c.status === "partial" && CONTROL_LABELS[c.control_name])
      .map((c) => `${CONTROL_LABELS[c.control_name]} needs a confidence review.`),
    ...controls
      .filter((c) => c.status === "unknown" && CONTROL_LABELS[c.control_name])
      .map((c) => `${CONTROL_LABELS[c.control_name]} has no policy coverage yet.`),
    status.freshness?.stale ? "Signal freshness is stale — check recent activity." : null,
  ].filter(Boolean) as string[];
  return items.length > 0 ? items.slice(0, 3) : ["No critical focus areas identified."];
};

type Props = {
  onRequestSection?: (section: string) => void;
};

export function ExecBoardView({ onRequestSection }: Props) {
  const { orgId, role } = useGovernanceContext();
  const [status, setStatus] = useState<ComplianceStatusResponse | null>(null);
  const [events, setEvents] = useState<ComplianceEventsResponse["events"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgNotFound, setOrgNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      setOrgNotFound(false);
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
        if (!cancelled) {
          if (err instanceof GovernanceApiError && err.status === 404) {
            setOrgNotFound(true);
          } else {
            setError(err instanceof Error ? err.message : "Unable to load board signals.");
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orgId, role]);

  const momentum = useMemo(() => momentumLabel(events, status), [events, status]);
  const focusAreas = useMemo(
    () => (status ? deriveFocusAreas(status) : []),
    [status]
  );
  const namedControls = useMemo(
    () => (status?.controls ?? []).filter((c) => CONTROL_LABELS[c.control_name]),
    [status]
  );

  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Board View</h2>
          <p>Your organization's AI governance health — high-level signals, not individual tracking.</p>
        </div>
      </div>

      {isLoading && <p style={{ color: "#888" }}>Loading board signals…</p>}

      {!isLoading && orgNotFound && (
        <div className="gc-card" style={{ borderColor: "#f7dfaf" }}>
          <p className="gc-mono" style={{ marginBottom: 8 }}>Organization Not Initialized</p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
            Your organization hasn't been set up yet. An Admin needs to initialize it
            and optionally seed demo data before signals appear here.
          </p>
          {onRequestSection && (
            <button
              type="button"
              className="gc-btn"
              onClick={() => onRequestSection("enablement")}
            >
              Go to Enablement →
            </button>
          )}
        </div>
      )}

      {!isLoading && !orgNotFound && error && (
        <div className="gc-card" style={{ borderColor: "#ffc5d1" }}>
          <p style={{ color: "#8c1930" }}>Unavailable — {error}</p>
        </div>
      )}

      {!isLoading && !orgNotFound && !error && status && (
        <div className="gsd-board-grid">

          {/* Overall Posture */}
          <article className="gc-card">
            <p className="gc-mono" style={{ marginBottom: 10 }}>Overall Posture</p>
            <div className="gsd-posture-row">
              <RagChip status={status.overall_status} />
              <FreshnessChip
                lastEventAt={status.freshness?.last_event_at ?? null}
                isStale={status.freshness?.stale ?? true}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <span className={`gsd-mode-badge ${status.mode === "enforced" ? "gsd-mode-enforced" : "gsd-mode-shadow"}`}>
                {status.mode === "enforced" ? "Enforced" : "Shadow Mode"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              Aggregate control posture — no individual inference.
            </p>
          </article>

          {/* Momentum */}
          <article className="gc-card">
            <p className="gc-mono" style={{ marginBottom: 10 }}>Momentum (30d)</p>
            <span className={momentumCls(momentum)}>{momentum}</span>
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              Based on policy mapping activity and control state changes.
            </p>
          </article>

          {/* Control Coverage — spans full width */}
          <article className="gc-card" style={{ gridColumn: "span 2" }}>
            <p className="gc-mono" style={{ marginBottom: 14 }}>Control Coverage</p>
            {namedControls.length === 0 ? (
              <p style={{ fontSize: 13, color: "#888" }}>
                No controls mapped yet — upload and map a policy in the{" "}
                {onRequestSection ? (
                  <button
                    type="button"
                    onClick={() => onRequestSection("enablement")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#343CED", fontSize: 13, padding: 0, textDecoration: "underline" }}
                  >
                    Enablement
                  </button>
                ) : (
                  "Enablement"
                )}{" "}
                section.
              </p>
            ) : (
              <div className="gsd-controls-grid">
                {namedControls.map((c) => (
                  <div key={c.control_name} className="gsd-control-row">
                    <span className="gsd-control-name">{CONTROL_LABELS[c.control_name]}</span>
                    <RagChip status={c.status} />
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
              Derived from policy mapping — never from individual usage data.
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

          {/* What Changed */}
          <article className="gc-card">
            <WhatChangedPanel events={events} isLoading={isLoading} />
          </article>

        </div>
      )}
    </section>
  );
}
