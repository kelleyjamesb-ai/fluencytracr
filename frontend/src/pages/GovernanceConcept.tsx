import { useState } from "react";
import { ConceptHero } from "../components/governanceConcept/ConceptHero";
import { DesignStanceList } from "../components/governanceConcept/DesignStanceList";
import { ExecutiveSignalHealth } from "../components/governanceConcept/ExecutiveSignalHealth";
import { GovernanceDocumentWorkspace } from "../components/governanceConcept/GovernanceDocumentWorkspace";
import { HeroActionWorkspace } from "../components/governanceConcept/HeroActionWorkspace";
import { OrgHealthSnapshot } from "../components/governanceConcept/OrgHealthSnapshot";
import { RoleAwareActions } from "../components/governanceConcept/RoleAwareActions";
import { GovernanceHeroActionId } from "../constants/governanceConcept";

export function GovernanceConcept() {
  const [activeHeroAction, setActiveHeroAction] = useState<GovernanceHeroActionId>("org_signals");

  return (
    <main className="gc-wrap">
      <section className="gc-hero">
        <ConceptHero activeAction={activeHeroAction} onSelectAction={setActiveHeroAction} />
        <DesignStanceList />
      </section>

      <HeroActionWorkspace activeAction={activeHeroAction} />

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
