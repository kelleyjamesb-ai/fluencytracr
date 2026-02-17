import { useEffect, useMemo, useState } from "react";
import { governanceApi } from "../../lib/governanceApi";
import { useGovernanceContext } from "../../hooks/useGovernanceContext";
import type { ComplianceStatus, ComplianceStatusResponse, PolicySummary } from "../../types/governance";

type HeatState = "aligned" | "watch" | "blocked" | "unknown";

type HeatRow = {
  area: string;
  posture: HeatState;
  confidence: HeatState;
  freshness: HeatState;
  nextAction: string;
};

const toHeatState = (status: ComplianceStatus): HeatState => {
  if (status === "enabled") {
    return "aligned";
  }
  if (status === "partial") {
    return "watch";
  }
  if (status === "disabled") {
    return "blocked";
  }
  return "unknown";
};

const confidenceState = (counts: ComplianceStatusResponse["counts"]): HeatState => {
  const total = counts.enabled + counts.disabled + counts.partial + counts.unknown;
  if (total <= 0) {
    return "unknown";
  }
  const unknownRate = counts.unknown / total;
  const disabledRate = counts.disabled / total;
  if (unknownRate >= 0.4) {
    return "unknown";
  }
  if (disabledRate >= 0.3) {
    return "blocked";
  }
  if (counts.partial > 0 || unknownRate >= 0.15) {
    return "watch";
  }
  return "aligned";
};

const freshnessState = (freshness?: ComplianceStatusResponse["freshness"]): HeatState => {
  if (!freshness || !freshness.last_event_at) {
    return "unknown";
  }
  return freshness.stale ? "watch" : "aligned";
};

const mappingState = (policies: PolicySummary[]): HeatState => {
  if (policies.length === 0) {
    return "unknown";
  }
  const mapped = policies.filter((policy) => policy.latest_mapping).length;
  if (mapped === 0) {
    return "blocked";
  }
  if (mapped < policies.length) {
    return "watch";
  }
  const unresolved = policies.reduce(
    (acc, policy) => acc + (policy.latest_mapping?.unresolved_clauses ?? 0),
    0
  );
  if (unresolved > 0) {
    return "watch";
  }
  return "aligned";
};

const chipLabel = (state: HeatState) => {
  if (state === "aligned") {
    return "Aligned";
  }
  if (state === "watch") {
    return "Watch";
  }
  if (state === "blocked") {
    return "Blocked";
  }
  return "Unknown";
};

export function ExecutiveHeatmapV1() {
  const { orgId, role } = useGovernanceContext();
  const [status, setStatus] = useState<ComplianceStatusResponse | null>(null);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const ctx = { orgId, role };
        const [compliance, policyPayload] = await Promise.all([
          governanceApi.getComplianceStatus(ctx),
          governanceApi.listPolicies(ctx)
        ]);
        if (!isCancelled) {
          setStatus(compliance);
          setPolicies(policyPayload.policies ?? []);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load heatmap signals.");
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
  }, [orgId, role]);

  const rows = useMemo<HeatRow[]>(() => {
    if (!status) {
      return [];
    }
    const posture = toHeatState(status.overall_status);
    const confidence = confidenceState(status.counts);
    const freshness = freshnessState(status.freshness);
    const mapping = mappingState(policies);
    return [
      {
        area: "Enterprise Governance Posture",
        posture,
        confidence,
        freshness,
        nextAction: "Review blocked controls and unresolved mappings."
      },
      {
        area: "Policy Mapping Reliability",
        posture: mapping,
        confidence: mapping === "aligned" ? confidence : "watch",
        freshness,
        nextAction: "Complete mapping coverage across uploaded policy versions."
      },
      {
        area: "Operational Freshness",
        posture: freshness === "aligned" ? "aligned" : "watch",
        confidence,
        freshness,
        nextAction: "Resolve stale feeds before leadership review."
      }
    ];
  }, [status, policies]);

  return (
    <section className="gc-heatmap">
      <div className="gc-heatmap-head">
        <p className="gc-mono">Executive Heatmap V1</p>
        <p>Aggregate-only posture by control confidence, freshness, and mapping readiness.</p>
      </div>
      {isLoading ? (
        <p>Loading heatmap...</p>
      ) : error ? (
        <p className="gc-workspace-message">{error}</p>
      ) : rows.length === 0 ? (
        <p>No heatmap data available yet.</p>
      ) : (
        <div className="gc-heatmap-grid" role="table" aria-label="Executive governance heatmap">
          <div className="gc-heatmap-row gc-heatmap-header" role="row">
            <span role="columnheader">Focus Area</span>
            <span role="columnheader">Posture</span>
            <span role="columnheader">Confidence</span>
            <span role="columnheader">Freshness</span>
            <span role="columnheader">Next Action</span>
          </div>
          {rows.map((row) => (
            <div className="gc-heatmap-row" role="row" key={row.area}>
              <span role="cell">{row.area}</span>
              <span role="cell" className={`gc-heat gc-heat-${row.posture}`}>{chipLabel(row.posture)}</span>
              <span role="cell" className={`gc-heat gc-heat-${row.confidence}`}>{chipLabel(row.confidence)}</span>
              <span role="cell" className={`gc-heat gc-heat-${row.freshness}`}>{chipLabel(row.freshness)}</span>
              <span role="cell">{row.nextAction}</span>
            </div>
          ))}
        </div>
      )}
      <p className="gc-subtle">
        Interpretation: these cells reflect aggregate governance evidence and never person-level performance.
      </p>
    </section>
  );
}
