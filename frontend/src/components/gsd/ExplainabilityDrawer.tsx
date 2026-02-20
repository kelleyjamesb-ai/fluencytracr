// ExplainabilityDrawer — structured evidence panel for a heatmap row.
// Only rendered inside OperatorView (ADMIN only). Never reaches EXEC_VIEWER.
// Governance: all data is org-aggregate. Unknown counts always shown explicitly.
import type {
  ComplianceEventsResponse,
  ComplianceStatusResponse,
  PolicySummary,
} from "../../types/governance";
import { FreshnessChip } from "./FreshnessChip";

type HeatState = "aligned" | "watch" | "blocked" | "unknown";

export type HeatRowEvidence = {
  area: string;
  posture: HeatState;
  confidence: HeatState;
  freshness: HeatState;
  explainability: string;
};

type Props = {
  row: HeatRowEvidence;
  counts: ComplianceStatusResponse["counts"];
  freshness: ComplianceStatusResponse["freshness"] | undefined;
  policies: PolicySummary[];
  recentEvents: ComplianceEventsResponse["events"];
  onClose: () => void;
};

const COUNT_LABELS: Array<{ key: keyof Props["counts"]; label: string; color: string }> = [
  { key: "enabled", label: "Enabled", color: "#3a6000" },
  { key: "partial", label: "Partial", color: "#8a5a07" },
  { key: "disabled", label: "Disabled", color: "#8c1930" },
  { key: "unknown", label: "Unknown", color: "#555" },
];

const formatEventType = (raw: string) =>
  raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ExplainabilityDrawer({ row, counts, freshness, policies, recentEvents, onClose }: Props) {
  const relevantEvents = recentEvents.slice(0, 3);

  return (
    <div className="gc-heatmap-explain" role="region" aria-label={`Explainability for ${row.area}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p className="gc-mono" style={{ margin: 0 }}>
          Explainability — {row.area}
        </p>
        <button
          type="button"
          className="gc-btn gc-btn-outline"
          onClick={onClose}
          aria-label="Close explainability drawer"
          style={{ fontSize: 12 }}
        >
          Close
        </button>
      </div>

      {/* 1. Status rationale */}
      <section style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Status Rationale
        </p>
        <p style={{ fontSize: 13, margin: 0 }}>{row.explainability}</p>
      </section>

      {/* 2. Confidence breakdown — unknown always shown */}
      <section style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
          Confidence Breakdown
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {COUNT_LABELS.map(({ key, label, color }) => (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{counts[key]}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Freshness metadata */}
      <section style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Freshness
        </p>
        <FreshnessChip
          lastEventAt={freshness?.last_event_at ?? null}
          isStale={freshness?.stale ?? true}
        />
        {freshness?.last_event_at && (
          <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
            Last event: {new Date(freshness.last_event_at).toLocaleString()}
          </span>
        )}
      </section>

      {/* 4. Evidence chain */}
      <section style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Evidence Chain (last {relevantEvents.length} event{relevantEvents.length !== 1 ? "s" : ""})
        </p>
        {relevantEvents.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>No recent events available.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {relevantEvents.map((ev) => (
              <li key={ev.event_id} style={{ fontSize: 12, display: "flex", gap: 8 }}>
                <span style={{ color: "#aaa", fontFamily: "monospace" }}>
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
                <span>
                  {formatEventType(ev.event_type)}
                  {ev.policy_id && (
                    <span style={{ color: "#888" }}>
                      {" "}· policy {ev.policy_id.slice(0, 8)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Policy references */}
      <section>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Policy References ({policies.length})
        </p>
        {policies.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888" }}>No policies uploaded.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
            {policies.map((p) => (
              <li key={p.policy_id} style={{ fontSize: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", color: "#555" }}>
                  {p.policy_id.slice(0, 8)}
                </span>
                {p.latest_mapping ? (
                  <span style={{ color: "#3a6000", fontSize: 11 }}>
                    Mapped · {p.latest_mapping.unresolved_clauses} unresolved
                  </span>
                ) : (
                  <span style={{ color: "#8c1930", fontSize: 11 }}>Not mapped</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
