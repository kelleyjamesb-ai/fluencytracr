import { ConceptHero } from "../components/governanceConcept/ConceptHero";
import { DesignStanceList } from "../components/governanceConcept/DesignStanceList";
import { ExecutiveSignalHealth } from "../components/governanceConcept/ExecutiveSignalHealth";
import { GovernanceDocumentWorkspace } from "../components/governanceConcept/GovernanceDocumentWorkspace";
import { OrgHealthSnapshot } from "../components/governanceConcept/OrgHealthSnapshot";
import { RoleAwareActions } from "../components/governanceConcept/RoleAwareActions";

export function GovernanceConcept() {
  return (
    <main className="gc-wrap">
      <section className="gc-hero">
        <ConceptHero />
        <DesignStanceList />
      </section>

      <section className="gc-grid">
        <OrgHealthSnapshot />
        <RoleAwareActions />
      </section>

      <ExecutiveSignalHealth />
      <GovernanceDocumentWorkspace />

      <section className="gc-bottom-actions">
        <a className="gc-btn gc-btn-secondary" href="/legacy-dashboard">Open Legacy Dashboard</a>
      </section>
    </main>
  );
}
