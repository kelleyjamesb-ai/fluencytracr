import { GovernanceHeroActionId } from "../../constants/governanceConcept";
import { useHeroActionWorkspace } from "../../hooks/useHeroActionWorkspace";

type HeroActionWorkspaceProps = {
  activeAction: GovernanceHeroActionId;
};

export function HeroActionWorkspace({ activeAction }: HeroActionWorkspaceProps) {
  const {
    isAdmin,
    isLoading,
    errorMessage,
    status,
    events,
    mode,
    setMode,
    rationale,
    setRationale,
    modeMessage,
    isUpdatingMode,
    updateMode
  } = useHeroActionWorkspace(activeAction);

  return (
    <section className="gc-card gc-workspace">
      {activeAction === "org_signals" && (
        <div className="gc-panel-block">
          <h3>Org Signal Board</h3>
          <p className="gc-subtle">Directional governance posture across aggregate controls and review signals.</p>
          {isLoading ? (
            <p>Loading signal board...</p>
          ) : errorMessage ? (
            <p className="gc-workspace-message">{errorMessage}</p>
          ) : status ? (
            <div className="gc-kpi-row">
              <div className="gc-kpi">
                <p className="gc-kpi-label">Mode</p>
                <p className="gc-kpi-value">{status.mode}</p>
              </div>
              <div className="gc-kpi">
                <p className="gc-kpi-label">Overall Status</p>
                <p className="gc-kpi-value">{status.overall_status}</p>
              </div>
              <div className="gc-kpi">
                <p className="gc-kpi-label">As Of</p>
                <p className="gc-kpi-value gc-kpi-small">{new Date(status.as_of).toLocaleString()}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {activeAction === "timeline" && (
        <div className="gc-panel-block">
          <h3>Governance Timeline</h3>
          <p className="gc-subtle">Most recent governance events for traceability and executive-safe explainability.</p>
          {isLoading ? (
            <p>Loading timeline...</p>
          ) : errorMessage ? (
            <p className="gc-workspace-message">{errorMessage}</p>
          ) : events.length === 0 ? (
            <p>No governance events available yet.</p>
          ) : (
            <ul className="gc-policy-list">
              {events.map((event) => (
                <li key={event.event_id}>
                  <span>
                    {event.event_type} {event.policy_id ? `(policy: ${event.policy_id})` : ""}
                  </span>
                  <span className="gc-mono">{new Date(event.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeAction === "mode_change" && (
        <div className="gc-panel-block">
          <h3>Mode Change Request</h3>
          <p className="gc-subtle">
            This control creates an audit event and must satisfy allowlist and unresolved-clause guardrails.
          </p>
          {!isAdmin && (
            <p className="gc-readonly-note">
              Read-only mode. Only `ADMIN` can submit mode changes.
            </p>
          )}
          <div className="gc-form-grid">
            <label>
              Target Mode
              <select
                className="gc-input"
                value={mode}
                onChange={(event) => setMode(event.target.value as "shadow" | "enforced")}
                disabled={!isAdmin || isUpdatingMode}
              >
                <option value="shadow">shadow</option>
                <option value="enforced">enforced</option>
              </select>
            </label>
            <label>
              Rationale
              <textarea
                className="gc-input gc-textarea"
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
                disabled={!isAdmin || isUpdatingMode}
              />
            </label>
          </div>
          <button
            type="button"
            className="gc-btn gc-btn-outline"
            onClick={updateMode}
            disabled={!isAdmin || isUpdatingMode}
          >
            {isUpdatingMode ? "Submitting..." : "Submit Mode Change"}
          </button>
          {modeMessage && <p className="gc-workspace-message">{modeMessage}</p>}
        </div>
      )}
    </section>
  );
}
