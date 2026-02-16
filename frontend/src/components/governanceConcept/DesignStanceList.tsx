const stanceItems = [
  { label: "No user-level drilldowns", state: "ENFORCED", stateClass: "good" },
  { label: "Ambiguity defaults to suppress", state: "ENFORCED", stateClass: "good" },
  { label: "Role-gated admin actions", state: "REVIEWED", stateClass: "warn" },
  { label: "Raw content exposure risk", state: "BLOCKED", stateClass: "danger" }
] as const;

export function DesignStanceList() {
  return (
    <aside className="gc-card gc-card-tint">
      <p className="gc-mono">Design stance</p>
      <ul className="gc-state-list">
        {stanceItems.map((item) => (
          <li key={item.label} className="gc-state-item">
            <span>{item.label}</span>
            <span className={`gc-tag gc-tag-${item.stateClass}`}>{item.state}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

