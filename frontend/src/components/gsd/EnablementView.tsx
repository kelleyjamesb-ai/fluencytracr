// EnablementView — Admin / Enablement Lead execution layer.
// Governance: org-aggregate workflows only. No individual attribution.
import { GovernanceDocumentWorkspace } from "../governanceConcept/GovernanceDocumentWorkspace";

export function EnablementView() {
  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Enablement</h2>
          <p>Upload policies, connect them to controls, and track readiness — admin and enablement leads only.</p>
        </div>
      </div>

      <GovernanceDocumentWorkspace />

      <div className="gsd-stub-card" style={{ marginTop: 24 }}>
        <h4>Enablement Focus Hotspots</h4>
        <p>
          Coming in V2 — shows where enablement effort is most needed across the org,
          without any individual attribution.
        </p>
      </div>
    </section>
  );
}
