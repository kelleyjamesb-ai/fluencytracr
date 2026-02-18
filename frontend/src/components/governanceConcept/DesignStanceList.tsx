import { DESIGN_STANCE_ITEMS } from "../../constants/governanceConcept";

export function DesignStanceList() {
  return (
    <aside className="gc-card gc-card-tint">
      <p className="gc-mono">Design stance</p>
      <ul className="gc-state-list">
        {DESIGN_STANCE_ITEMS.map((item) => (
          <li key={item.label} className="gc-state-item">
            <span>{item.label}</span>
            <span className={`gc-tag gc-tag-${item.stateClass}`}>{item.state}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
