import {
  GOVERNANCE_HERO_ACTIONS,
  GOVERNANCE_HERO_COPY,
  GovernanceHeroActionId
} from "../../constants/governanceConcept";

type ConceptHeroProps = {
  activeAction: GovernanceHeroActionId;
  onSelectAction: (actionId: GovernanceHeroActionId) => void;
};

export function ConceptHero({ activeAction, onSelectAction }: ConceptHeroProps) {
  return (
    <article className="gc-card">
      <div className="gc-badge">{GOVERNANCE_HERO_COPY.badge}</div>
      <h1 className="gc-title">{GOVERNANCE_HERO_COPY.title}</h1>
      <p className="gc-sub">{GOVERNANCE_HERO_COPY.subtitle}</p>
      <div className="gc-actions">
        {GOVERNANCE_HERO_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`gc-btn gc-btn-${action.tone} ${activeAction === action.id ? "gc-btn-active" : ""}`}
            onClick={() => onSelectAction(action.id)}
            aria-pressed={activeAction === action.id}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="gc-pulse" aria-hidden="true" />
    </article>
  );
}
