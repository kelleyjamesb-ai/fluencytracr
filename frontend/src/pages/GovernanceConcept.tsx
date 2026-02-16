import { useState } from "react";
import { ConceptHero } from "../components/governanceConcept/ConceptHero";
import { DesignStanceList } from "../components/governanceConcept/DesignStanceList";
import { ExecutiveSignalHealth } from "../components/governanceConcept/ExecutiveSignalHealth";
import { GovernanceDocumentWorkspace } from "../components/governanceConcept/GovernanceDocumentWorkspace";
import { HeroActionWorkspace } from "../components/governanceConcept/HeroActionWorkspace";
import { GOVERNANCE_PAGE_COPY, GovernanceHeroActionId } from "../constants/governanceConcept";

export function GovernanceConcept() {
  const [activeHeroAction, setActiveHeroAction] = useState<GovernanceHeroActionId>("org_signals");
  const [activeLowerPanel, setActiveLowerPanel] = useState<"signals" | "documents">("signals");

  return (
    <main className="gc-wrap">
      <section className="gc-hero">
        <ConceptHero activeAction={activeHeroAction} onSelectAction={setActiveHeroAction} />
        <DesignStanceList />
      </section>

      <HeroActionWorkspace activeAction={activeHeroAction} />

      <section className="gc-lower-switch">
        <button
          type="button"
          className={`gc-btn gc-btn-secondary ${activeLowerPanel === "signals" ? "gc-btn-active" : ""}`}
          onClick={() => setActiveLowerPanel("signals")}
        >
          {GOVERNANCE_PAGE_COPY.lowerPanelSignalsLabel}
        </button>
        <button
          type="button"
          className={`gc-btn gc-btn-secondary ${activeLowerPanel === "documents" ? "gc-btn-active" : ""}`}
          onClick={() => setActiveLowerPanel("documents")}
        >
          {GOVERNANCE_PAGE_COPY.lowerPanelDocumentsLabel}
        </button>
      </section>

      {activeLowerPanel === "signals" ? <ExecutiveSignalHealth /> : <GovernanceDocumentWorkspace />}

      <section className="gc-bottom-actions">
        <a className="gc-btn gc-btn-secondary" href="/legacy-dashboard">
          {GOVERNANCE_PAGE_COPY.legacyDashboardLabel}
        </a>
      </section>
    </main>
  );
}
