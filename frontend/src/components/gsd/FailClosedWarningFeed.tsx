// FailClosedWarningFeed — surfaces controls in "disabled" state, which are the
// operational blockers that trigger fail-closed behaviour in enforced mode.
// Governance: org-aggregate only. No individual attribution.
import type { ComplianceStatusResponse } from "../../types/governance";

type Props = {
  controls: ComplianceStatusResponse["controls"];
};

const CONTROL_LABELS: Record<string, string> = {
  ai_enabled_status:                "AI Tool Access",
  data_retention_policy_status:     "Data Retention",
  model_training_opt_out_status:    "Training Opt-Out",
  external_sharing_disabled_status: "External Data Sharing",
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function FailClosedWarningFeed({ controls }: Props) {
  const blockers = (controls ?? []).filter(
    (c) => c.status === "disabled" && c.control_name !== "compliance_posture_flag"
  );

  if (blockers.length === 0) {
    return (
      <div className="gc-card">
        <p className="gc-mono" style={{ marginBottom: 12 }}>Fail-Closed Warning Feed</p>
        <p style={{ fontSize: 13, color: "#3a6000" }}>No fail-closed triggers detected — all controls aligned.</p>
      </div>
    );
  }

  return (
    <div className="gc-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <p className="gc-mono" style={{ margin: 0 }}>Fail-Closed Warning Feed</p>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          background: "#fce8e8",
          color: "#8c1930",
          borderRadius: 10,
          padding: "2px 8px",
        }}>
          {blockers.length} blocker{blockers.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
        These controls are disabled and will trigger fail-closed in enforced mode.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {blockers.map((c) => {
          const age = daysSince(c.updated_at);
          return (
            <div
              key={c.control_name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                padding: "7px 10px",
                background: "#fef8f8",
                borderRadius: 4,
                border: "1px solid #f4d4d4",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: "#8c1930" }}>
                  {CONTROL_LABELS[c.control_name] ?? c.control_name}
                </span>
                {c.source === "legacy_import" && (
                  <span style={{ fontSize: 10, color: "#aaa", marginLeft: 6 }}>legacy</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: age > 30 ? "#8c1930" : "#888", flexShrink: 0 }}>
                {age === 0 ? "today" : `${age}d ago`}
                {age > 30 && <span title="Stale — not updated in 30+ days"> ⚠</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
