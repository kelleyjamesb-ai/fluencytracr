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
        <button type="button" className="gc-btn gc-btn-primary">View Org Signal Board</button>
        <button type="button" className="gc-btn gc-btn-secondary">Open Governance Timeline</button>
        <button type="button" className="gc-btn gc-btn-outline">Admin: Request Mode Change</button>
      </div>
      <div className="gc-pulse" aria-hidden="true" />
    </article>
  );
}

