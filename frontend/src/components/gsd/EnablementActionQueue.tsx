// EnablementActionQueue — policies uploaded but not yet mapped to any control.
// Governance: org-aggregate only. No individual attribution.
import type { PolicySummary } from "../../types/governance";

type Props = { policies: PolicySummary[] };

export function EnablementActionQueue({ policies }: Props) {
  const unmapped = policies.filter((p) => p.latest_mapping === null);

  return (
    <div className="gc-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <p className="gc-mono" style={{ margin: 0 }}>Action Queue</p>
        {unmapped.length > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            background: "#fce8e8",
            color: "#8c1930",
            borderRadius: 10,
            padding: "2px 8px",
          }}>
            {unmapped.length} unmapped
          </span>
        )}
      </div>

      {unmapped.length === 0 ? (
        <p style={{ fontSize: 13, color: "#3a6000" }}>All policies mapped to controls.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
            Map these policies to controls to improve coverage:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unmapped.map((p) => (
              <div
                key={p.policy_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  padding: "6px 8px",
                  background: "#fafafa",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}
                  title={p.file_name}
                >
                  {p.file_name}
                </span>
                <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>
                  {p.clause_count} clause{p.clause_count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
