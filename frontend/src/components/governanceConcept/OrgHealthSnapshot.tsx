export function OrgHealthSnapshot() {
  return (
    <article className="gc-card">
      <p className="gc-mono">Org Health Snapshot</p>
      <div className="gc-kpi-row">
        <div className="gc-kpi">
          <p className="gc-kpi-label">Signal Confidence</p>
          <p className="gc-kpi-value">74%</p>
        </div>
        <div className="gc-kpi">
          <p className="gc-kpi-label">Suppression Rate</p>
          <p className="gc-kpi-value">19%</p>
        </div>
        <div className="gc-kpi">
          <p className="gc-kpi-label">Governance Posture</p>
          <p className="gc-kpi-value">Shadow</p>
        </div>
      </div>
      <div className="gc-timeline">
        <div className="gc-event">
          <strong>Pattern surfaced (org scope)</strong>
          <div className="gc-mono">Directional: delegation-with-review increased over last 60d</div>
        </div>
        <div className="gc-event">
          <strong>Suppression applied</strong>
          <div className="gc-mono">Reason: insufficient volume at team slice, rolled up safely</div>
        </div>
        <div className="gc-event">
          <strong>Mode update requested</strong>
          <div className="gc-mono">Pending admin confirmation and policy evidence check</div>
        </div>
      </div>
    </article>
  );
}

