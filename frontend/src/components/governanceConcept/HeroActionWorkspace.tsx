import { useEffect, useState } from "react";
import { GovernanceHeroActionId } from "../../constants/governanceConcept";

type ComplianceStatusResponse = {
  mode: "shadow" | "enforced";
  as_of: string;
  overall_status: "enabled" | "disabled" | "partial" | "unknown";
  counts: Record<"enabled" | "disabled" | "partial" | "unknown", number>;
};

type ComplianceEventsResponse = {
  events: Array<{
    event_id: string;
    event_type: string;
    created_at: string;
    policy_id: string | null;
    status: string | null;
  }>;
};

type HeroActionWorkspaceProps = {
  activeAction: GovernanceHeroActionId;
};

export function HeroActionWorkspace({ activeAction }: HeroActionWorkspaceProps) {
  const orgId = localStorage.getItem("orgId") ?? "org-1";
  const role = localStorage.getItem("role") ?? "ADMIN";
  const isAdmin = role === "ADMIN";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState<ComplianceStatusResponse | null>(null);
  const [events, setEvents] = useState<ComplianceEventsResponse["events"]>([]);
  const [mode, setMode] = useState<"shadow" | "enforced">("shadow");
  const [rationale, setRationale] = useState("Governance review requested mode transition.");
  const [modeMessage, setModeMessage] = useState("");
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        if (activeAction === "org_signals" || activeAction === "mode_change") {
          const response = await fetch(`/orgs/${orgId}/compliance/status`, {
            headers: { "x-role": role }
          });
          if (!response.ok) {
            throw new Error("Unable to load compliance status");
          }
          const payload = (await response.json()) as ComplianceStatusResponse;
          if (!isCancelled) {
            setStatus(payload);
            setMode(payload.mode);
          }
        } else if (activeAction === "timeline") {
          const response = await fetch(`/orgs/${orgId}/compliance/events?limit=8`, {
            headers: { "x-role": role }
          });
          if (!response.ok) {
            throw new Error("Unable to load governance timeline");
          }
          const payload = (await response.json()) as ComplianceEventsResponse;
          if (!isCancelled) {
            setEvents(payload.events ?? []);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load section data.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      isCancelled = true;
    };
  }, [activeAction, orgId, role]);

  const updateMode = async () => {
    setIsUpdatingMode(true);
    setModeMessage("");
    try {
      const response = await fetch(`/orgs/${orgId}/compliance/mode`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-role": role,
          "X-FluencyTracr-Schema-Version": "0.1"
        },
        body: JSON.stringify({ mode, rationale })
      });
      if (!response.ok) {
        throw new Error("Mode update blocked by preconditions or role policy.");
      }
      setModeMessage(`Mode update submitted: ${mode}`);
    } catch (error) {
      setModeMessage(error instanceof Error ? error.message : "Unable to update mode.");
    } finally {
      setIsUpdatingMode(false);
    }
  };

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

