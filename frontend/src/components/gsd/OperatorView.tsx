// OperatorView — CTO / CISO operator layer (ADMIN only).
// Governance: org-aggregate heatmap only. No individual attribution.
import { useEffect, useState } from "react";
import { governanceApi } from "../../lib/governanceApi";
import { useGovernanceContext } from "../../hooks/useGovernanceContext";
import { ExecutiveHeatmapV1 } from "../governanceConcept/ExecutiveHeatmapV1";
import { PolicyMappingReliabilityCard } from "./PolicyMappingReliabilityCard";
import type { PolicySummary } from "../../types/governance";

export function OperatorView() {
  const { orgId, role } = useGovernanceContext();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPoliciesLoading(true);
      try {
        const payload = await governanceApi.listPolicies({ orgId, role });
        if (!cancelled) setPolicies(payload.policies ?? []);
      } catch {
        if (!cancelled) setPolicies([]);
      } finally {
        if (!cancelled) setPoliciesLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orgId, role]);

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

      {/* V1.1 widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <PolicyMappingReliabilityCard policies={policies} isLoading={policiesLoading} />

        <div style={{ display: "grid", gap: 16 }}>
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
      </div>
    </section>
  );
}
