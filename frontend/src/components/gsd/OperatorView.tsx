// OperatorView — CTO / CISO operator layer (ADMIN only).
// Governance: org-aggregate heatmap only. No individual attribution.
import { useEffect, useState } from "react";
import { governanceApi } from "../../lib/governanceApi";
import { useGovernanceContext } from "../../hooks/useGovernanceContext";
import { ExecutiveHeatmapV1 } from "../governanceConcept/ExecutiveHeatmapV1";
import { PolicyMappingReliabilityCard } from "./PolicyMappingReliabilityCard";
import { FailClosedWarningFeed } from "./FailClosedWarningFeed";
import type { ComplianceStatusResponse, PolicySummary } from "../../types/governance";

const CONTROL_LABELS: Record<string, string> = {
  ai_enabled_status:                "AI Tool Access",
  data_retention_policy_status:     "Data Retention",
  model_training_opt_out_status:    "Training Opt-Out",
  external_sharing_disabled_status: "External Data Sharing",
};

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

function ControlDriftPanel({ status }: { status: ComplianceStatusResponse | null }) {
  if (!status) {
    return (
      <div className="gsd-stub-card">
        <h4>Control Drift</h4>
        <p style={{ fontSize: 13, color: "#888" }}>Loading control state…</p>
      </div>
    );
  }
  const controls = (status.controls ?? []).filter((c) => CONTROL_LABELS[c.control_name]);
  if (controls.length === 0) {
    return (
      <div className="gsd-stub-card">
        <h4>Control Drift</h4>
        <p style={{ fontSize: 13, color: "#888" }}>No controls mapped yet.</p>
      </div>
    );
  }
  return (
    <div className="gc-card">
      <p className="gc-mono" style={{ marginBottom: 12 }}>Control Drift</p>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "#888", textAlign: "left" }}>
            <th style={{ paddingBottom: 6, fontWeight: 500 }}>Control</th>
            <th style={{ paddingBottom: 6, fontWeight: 500 }}>Status</th>
            <th style={{ paddingBottom: 6, fontWeight: 500 }}>Age</th>
          </tr>
        </thead>
        <tbody>
          {controls.map((c) => {
            const age = daysSince(c.updated_at);
            const stale = age !== null && age > 30;
            return (
              <tr key={c.control_name} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={{ padding: "6px 0" }}>{CONTROL_LABELS[c.control_name]}</td>
                <td style={{ padding: "6px 8px" }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: c.status === "enabled" ? "#e6f4ea" : c.status === "disabled" ? "#fce8e8" : "#fff3cd",
                    color: c.status === "enabled" ? "#1e7e34" : c.status === "disabled" ? "#8c1930" : "#856404",
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: "6px 0", color: stale ? "#8c1930" : "#555" }}>
                  {age === null ? "—" : age === 0 ? "today" : `${age}d ago`}
                  {stale && <span title="Stale — no update in 30+ days"> ⚠</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: "#aaa", marginTop: 10 }}>
        Age = days since last control state change. ⚠ = stale (&gt;30d).
      </p>
    </div>
  );
}

export function OperatorView() {
  const { orgId, role } = useGovernanceContext();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatusResponse | null>(null);
  const [modeToggling, setModeToggling] = useState(false);
  const [modeError, setModeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPoliciesLoading(true);
      try {
        const [policiesPayload, statusPayload] = await Promise.all([
          governanceApi.listPolicies({ orgId, role }),
          governanceApi.getComplianceStatus({ orgId, role }),
        ]);
        if (!cancelled) {
          setPolicies(policiesPayload.policies ?? []);
          setComplianceStatus(statusPayload);
        }
      } catch {
        if (!cancelled) setPolicies([]);
      } finally {
        if (!cancelled) setPoliciesLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orgId, role]);

  const handleModeToggle = async () => {
    if (!complianceStatus || modeToggling) return;
    const nextMode = complianceStatus.mode === "enforced" ? "shadow" : "enforced";
    setModeToggling(true);
    setModeError("");
    try {
      const result = await governanceApi.patchComplianceMode(
        { orgId, role },
        nextMode,
        `Operator switched mode to ${nextMode} via dashboard`
      );
      setComplianceStatus((prev) => prev ? { ...prev, mode: result.mode } : prev);
    } catch (err) {
      setModeError(err instanceof Error ? err.message : "Mode switch failed.");
    } finally {
      setModeToggling(false);
    }
  };

  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Operator View</h2>
          <p>
            Governance heatmap and control posture — aggregate signals only,
            traceable to auditable event lineage.
          </p>
        </div>

        {/* Compliance Mode Toggle */}
        {complianceStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`gsd-mode-badge ${complianceStatus.mode === "enforced" ? "gsd-mode-enforced" : "gsd-mode-shadow"}`}>
              {complianceStatus.mode === "enforced" ? "Enforced" : "Shadow Mode"}
            </span>
            <button
              type="button"
              className="gc-btn"
              disabled={modeToggling}
              onClick={handleModeToggle}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              {modeToggling ? "Switching…" : `Switch to ${complianceStatus.mode === "enforced" ? "Shadow" : "Enforced"}`}
            </button>
            {modeError && <span style={{ fontSize: 12, color: "#8c1930" }}>{modeError}</span>}
          </div>
        )}
      </div>

      {/* Governance Heatmap — reuses existing ExecutiveHeatmapV1 */}
      <ExecutiveHeatmapV1 />

      {/* V1.1 widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <PolicyMappingReliabilityCard policies={policies} isLoading={policiesLoading} />

        <div style={{ display: "grid", gap: 16 }}>
          <ControlDriftPanel status={complianceStatus} />
          <FailClosedWarningFeed controls={complianceStatus?.controls} />
        </div>
      </div>
    </section>
  );
}
