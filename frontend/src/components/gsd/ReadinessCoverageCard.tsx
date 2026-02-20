// ReadinessCoverageCard — shows how many controls are covered by at least
// one policy mapping. Governance: org-aggregate only, no individual attribution.
import type { ComplianceStatusResponse } from "../../types/governance";

type Props = {
  controls: ComplianceStatusResponse["controls"];
  isLoading?: boolean;
};

export function ReadinessCoverageCard({ controls, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="gc-card">
        <p className="gc-mono" style={{ marginBottom: 12 }}>Policy Coverage</p>
        <p style={{ color: "#888", fontSize: 13 }}>Loading coverage data…</p>
      </div>
    );
  }

  if (!controls || controls.length === 0) {
    return (
      <div className="gc-card">
        <p className="gc-mono" style={{ marginBottom: 12 }}>Policy Coverage</p>
        <p style={{ color: "#888", fontSize: 13 }}>No control data available yet.</p>
      </div>
    );
  }

  const total = controls.length;
  const covered = controls.filter((c) => c.source === "policy_mapping").length;
  const pct = Math.round((covered / total) * 100);
  const barColor = pct === 100 ? "#3a6000" : pct >= 50 ? "#8a5a07" : "#8c1930";

  return (
    <div className="gc-card">
      <p className="gc-mono" style={{ marginBottom: 12 }}>Policy Coverage</p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: barColor }}>{pct}%</span>
        <span style={{ fontSize: 13, color: "#888" }}>
          {covered} of {total} controls covered by policy mapping
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "#f0f0f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s" }} />
      </div>

      {covered < total && (
        <p style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
          {total - covered} control{total - covered !== 1 ? "s" : ""} still using legacy import data — map a policy to improve coverage.
        </p>
      )}
    </div>
  );
}
