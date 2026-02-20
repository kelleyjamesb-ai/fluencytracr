// EnablementView — Admin / Enablement Lead execution layer.
// Governance: org-aggregate workflows only. No individual attribution.
import { useEffect, useState } from "react";
import { governanceApi } from "../../lib/governanceApi";
import { useGovernanceContext } from "../../hooks/useGovernanceContext";
import { GovernanceDocumentWorkspace } from "../governanceConcept/GovernanceDocumentWorkspace";
import { ReadinessCoverageCard } from "./ReadinessCoverageCard";
import { EnablementFocusHotspots } from "./EnablementFocusHotspots";
import { EnablementActionQueue } from "./EnablementActionQueue";
import type { PolicySummary, ComplianceStatusResponse } from "../../types/governance";

export function EnablementView() {
  const { orgId, role } = useGovernanceContext();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [policiesPayload, statusPayload] = await Promise.all([
          governanceApi.listPolicies({ orgId, role }),
          governanceApi.getComplianceStatus({ orgId, role }),
        ]);
        if (!cancelled) {
          setPolicies(policiesPayload.policies ?? []);
          setComplianceStatus(statusPayload);
        }
      } catch {
        if (!cancelled) setPolicies([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orgId, role]);

  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Enablement</h2>
          <p>Upload policies, connect them to controls, and track readiness — admin and enablement leads only.</p>
        </div>
      </div>

      {/* Coverage + hotspots row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ReadinessCoverageCard controls={complianceStatus?.controls} isLoading={isLoading} />
        <EnablementFocusHotspots policies={policies} />
      </div>

      {/* Action queue */}
      <EnablementActionQueue policies={policies} />

      {/* Document workspace */}
      <div style={{ marginTop: 24 }}>
        <GovernanceDocumentWorkspace />
      </div>
    </section>
  );
}
