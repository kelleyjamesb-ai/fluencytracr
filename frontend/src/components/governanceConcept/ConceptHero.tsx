import { GOVERNANCE_HERO_ACTIONS } from "../../constants/governanceConcept";

export function ConceptHero() {
  return (
    <article className="gc-card">
      <div className="gc-badge">Product Intent Locked</div>
      <h1 className="gc-title">Fluency signals, not surveillance.</h1>
      <p className="gc-sub">
        This governance-first concept prioritizes organizational evidence operations. Suppressed states are explicit,
        confidence is directional, and all state-changing actions are audit-aware.
      </p>
      <div className="gc-actions">
        {GOVERNANCE_HERO_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`gc-btn gc-btn-${action.tone}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="gc-pulse" aria-hidden="true" />
    </article>
  );
}
