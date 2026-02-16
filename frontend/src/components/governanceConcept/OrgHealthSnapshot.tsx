import { GOVERNANCE_KPIS, GOVERNANCE_TIMELINE_ITEMS } from "../../constants/governanceConcept";

export function OrgHealthSnapshot() {
  return (
    <article className="gc-card">
      <p className="gc-mono">Org Health Snapshot</p>
      <div className="gc-kpi-row">
        {GOVERNANCE_KPIS.map((kpi) => (
          <div key={kpi.label} className="gc-kpi">
            <p className="gc-kpi-label">{kpi.label}</p>
            <p className="gc-kpi-value">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="gc-timeline">
        {GOVERNANCE_TIMELINE_ITEMS.map((item) => (
          <div key={item.title} className="gc-event">
            <strong>{item.title}</strong>
            <div className="gc-mono">{item.detail}</div>
          </div>
        ))}
      </div>
    </article>
  );
}
