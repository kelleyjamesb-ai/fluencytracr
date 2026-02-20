// EnablementFocusHotspots — top control areas by unresolved clause count.
// Governance: org-aggregate only. No individual attribution.
import type { PolicySummary } from "../../types/governance";
import { RagChip } from "./RagChip";
import type { ComplianceStatus } from "../../types/governance";

type Props = { policies: PolicySummary[] };

function ragStatus(unresolved: number): ComplianceStatus {
  if (unresolved === 0) return "enabled";
  if (unresolved <= 3) return "partial";
  return "disabled";
}

export function EnablementFocusHotspots({ policies }: Props) {
  const ranked = policies
    .filter((p) => p.latest_mapping !== null)
    .sort((a, b) => (b.latest_mapping?.unresolved_clauses ?? 0) - (a.latest_mapping?.unresolved_clauses ?? 0))
    .slice(0, 5);

  return (
    <div className="gc-card">
      <p className="gc-mono" style={{ marginBottom: 12 }}>Focus Hotspots</p>

      {ranked.length === 0 ? (
        <p style={{ fontSize: 13, color: "#888" }}>No hotspots — all mapped clauses resolved.</p>
      ) : (
        <div role="table" aria-label="Enablement focus hotspots">
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px",
              fontSize: 11,
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              paddingBottom: 6,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span role="columnheader">Policy</span>
            <span role="columnheader">Unresolved</span>
            <span role="columnheader">Status</span>
          </div>
          {ranked.map((p) => {
            const unresolved = p.latest_mapping?.unresolved_clauses ?? 0;
            return (
              <div
                key={p.policy_id}
                role="row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px",
                  fontSize: 12,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--line)",
                  alignItems: "center",
                }}
              >
                <span
                  role="cell"
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={p.file_name}
                >
                  {p.file_name.length > 28 ? `${p.file_name.slice(0, 28)}…` : p.file_name}
                </span>
                <span role="cell" style={{ color: unresolved > 0 ? "#8a5a07" : "#888" }}>
                  {unresolved}
                </span>
                <span role="cell">
                  <RagChip status={ragStatus(unresolved)} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
