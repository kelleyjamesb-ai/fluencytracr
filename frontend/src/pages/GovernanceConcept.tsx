import { useState } from "react";
import { ConceptHero } from "../components/governanceConcept/ConceptHero";
import { DesignStanceList } from "../components/governanceConcept/DesignStanceList";
import { ExecutiveSignalHealth } from "../components/governanceConcept/ExecutiveSignalHealth";
import { GovernanceDocumentWorkspace } from "../components/governanceConcept/GovernanceDocumentWorkspace";
import { HeroActionWorkspace } from "../components/governanceConcept/HeroActionWorkspace";
import { GOVERNANCE_PAGE_COPY, GovernanceHeroActionId } from "../constants/governanceConcept";
import { AUTH_TOKEN_STORAGE_KEY } from "../auth";

export function GovernanceConcept() {
  const [activeHeroAction, setActiveHeroAction] = useState<GovernanceHeroActionId>("org_signals");
  const [activeLowerPanel, setActiveLowerPanel] = useState<"signals" | "documents">("signals");
  const [sessionOrgId, setSessionOrgId] = useState(localStorage.getItem("orgId") ?? "org-1");
  const [sessionRole, setSessionRole] = useState(localStorage.getItem("role") ?? "ADMIN");

  const applySession = async () => {
    const nextOrgId = sessionOrgId.trim() || "org-1";
    const email = localStorage.getItem("userEmail") ?? "admin@fluencytracr.com";
    const response = await fetch("/auth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        org_id: nextOrgId,
        role: sessionRole
      })
    });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { token: string };
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
    localStorage.setItem("orgId", sessionOrgId.trim() || "org-1");
    localStorage.setItem("role", sessionRole);
    window.location.reload();
  };

  const signOut = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.location.assign("/login");
  };

  return (
    <main className="gc-wrap">
      <section className="gc-card gc-session">
        <p className="gc-mono">Session Controls (Temporary)</p>
        <div className="gc-session-grid">
          <label>
            Organization ID
            <input
              className="gc-input"
              type="text"
              value={sessionOrgId}
              onChange={(event) => setSessionOrgId(event.target.value)}
            />
          </label>
          <label>
            Role
            <select
              className="gc-input"
              value={sessionRole}
              onChange={(event) => setSessionRole(event.target.value)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="EXEC_VIEWER">EXEC_VIEWER</option>
              <option value="ENABLEMENT_LEAD">ENABLEMENT_LEAD</option>
            </select>
          </label>
          <button type="button" className="gc-btn gc-btn-secondary" onClick={applySession}>
            Apply Session
          </button>
          <button type="button" className="gc-btn gc-btn-outline" onClick={signOut}>
            Go To Login
          </button>
        </div>
      </section>

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
