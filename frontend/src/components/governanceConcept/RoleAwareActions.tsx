const roleRows = [
  { label: "EXEC_VIEWER can read signal summaries", state: "ALLOW", stateClass: "good" },
  { label: "ENABLEMENT_LEAD can inspect adoption trend", state: "ALLOW", stateClass: "good" },
  { label: "EXEC_VIEWER toggles compliance mode", state: "DENY", stateClass: "danger" },
  { label: "ADMIN exports governed event log", state: "CONFIRM", stateClass: "warn" }
] as const;

export function RoleAwareActions() {
  return (
    <article className="gc-card">
      <p className="gc-mono">Role-Aware Actions</p>
      <ul className="gc-state-list">
        {roleRows.map((row) => (
          <li key={row.label} className="gc-state-item">
            <span>{row.label}</span>
            <span className={`gc-tag gc-tag-${row.stateClass}`}>{row.state}</span>
          </li>
        ))}
      </ul>
      <div className="gc-foot">
        Intent-aligned UI rules: directional language, auditable actions, safe defaults, and visible suppression semantics.
      </div>
    </article>
  );
}

