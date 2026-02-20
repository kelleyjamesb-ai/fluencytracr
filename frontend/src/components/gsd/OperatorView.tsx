// OperatorView — CTO / CISO operator layer (ADMIN only).
// Governance: org-aggregate heatmap only. No individual attribution.
import { ExecutiveHeatmapV1 } from "../governanceConcept/ExecutiveHeatmapV1";

export function OperatorView() {
  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Operator View</h2>
          <p>
            Governance heatmap and control posture — aggregate signals only,
            traceable to auditable event lineage.
          </p>
        </div>
      </div>

      {/* Governance Heatmap — reuses existing ExecutiveHeatmapV1 */}
      <ExecutiveHeatmapV1 />

      {/* Deferred V1.1 widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div className="gsd-stub-card">
          <h4>Control Drift Panel</h4>
          <p>
            Available in V1.1 — requires backend control state history endpoint
            (<code>/orgs/:orgId/compliance/control-history</code>).
          </p>
        </div>
        <div className="gsd-stub-card">
          <h4>Fail-Closed Warning Feed</h4>
          <p>
            Available in V1.1 — requires domain-level fail-closed event filtering
            endpoint. Shows operational blockers and fail-closed reasons.
          </p>
        </div>
      </div>
    </section>
  );
}
