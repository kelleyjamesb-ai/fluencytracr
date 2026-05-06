import {
  GOVERNANCE_ROLE_ACTIONS_FOOTER_COPY,
  ROLE_AWARE_ACTION_ITEMS
} from "../../constants/governanceConcept";

export function RoleAwareActions() {
  return (
    <article className="gc-card">
      <p className="gc-mono">Role-Aware Actions</p>
      <ul className="gc-state-list">
        {ROLE_AWARE_ACTION_ITEMS.map((row) => (
          <li key={row.label} className="gc-state-item">
            <span>{row.label}</span>
            <span className={`gc-tag gc-tag-${row.stateClass}`}>{row.state}</span>
          </li>
        ))}
      </ul>
      <div className="gc-foot">{GOVERNANCE_ROLE_ACTIONS_FOOTER_COPY}</div>
    </article>
  );
}
