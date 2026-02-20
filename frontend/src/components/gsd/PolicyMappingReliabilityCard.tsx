// PolicyMappingReliabilityCard — per-policy mapping coverage in OperatorView.
// Governance: policy_id truncated to 8 chars. No personal identifiers rendered.
import type { PolicySummary } from "../../types/governance";

type Props = {
  policies: PolicySummary[];
  isLoading?: boolean;
};

export function PolicyMappingReliabilityCard({ policies, isLoading }: Props) {
  const mapped = policies.filter((p) => p.latest_mapping !== null);
  const unmapped = policies.filter((p) => p.latest_mapping === null);
  const totalUnresolved = mapped.reduce(
    (acc, p) => acc + (p.latest_mapping?.unresolved_clauses ?? 0),
    0
  );

  return (
    <div className="gc-card">
      <p className="gc-mono" style={{ marginBottom: 12 }}>Policy Mapping Reliability</p>

      {isLoading ? (
        <p style={{ color: "#888", fontSize: 13 }}>Loading policy data…</p>
      ) : policies.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>
          No policies uploaded yet. Start in the{" "}
          <strong>Enablement</strong> section to upload and map your first policy.
        </p>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{policies.length}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Total Policies</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#3a6000" }}>{mapped.length}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Mapped</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: unmapped.length > 0 ? "#8c1930" : "#888" }}>
                {unmapped.length}
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>Unmapped</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: totalUnresolved > 0 ? "#8a5a07" : "#3a6000" }}>
                {totalUnresolved}
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>Unresolved Clauses</div>
            </div>
          </div>

          {/* Per-policy list */}
          <div role="table" aria-label="Policy mapping status">
            <div
              role="row"
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 100px 80px",
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                paddingBottom: 6,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span role="columnheader">Policy ID</span>
              <span role="columnheader">File</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Unresolved</span>
            </div>
            {policies.map((p) => (
              <div
                key={p.policy_id}
                role="row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 100px 80px",
                  gap: 8,
                  fontSize: 12,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--line)",
                  alignItems: "center",
                }}
              >
                <span role="cell" style={{ fontFamily: "monospace", color: "#555" }}>
                  {p.policy_id.slice(0, 8)}
                </span>
                <span role="cell" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.file_name}
                </span>
                <span role="cell">
                  {p.latest_mapping ? (
                    <span style={{ color: "#3a6000", fontSize: 11, fontWeight: 600 }}>Mapped</span>
                  ) : (
                    <span style={{ color: "#8c1930", fontSize: 11, fontWeight: 600 }}>Not mapped</span>
                  )}
                </span>
                <span role="cell" style={{ color: (p.latest_mapping?.unresolved_clauses ?? 0) > 0 ? "#8a5a07" : "#888" }}>
                  {p.latest_mapping?.unresolved_clauses ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
