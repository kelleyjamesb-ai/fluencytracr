import { useEffect, useMemo, useState } from "react";
import type {
  CoverageSummary,
  DecisionLedgerEntry,
  FluencyPattern,
  FluencyScope,
  FluencyWindow
} from "@learnaire/shared";
import { Sidebar } from "../components/Sidebar";

type PatternResponse = {
  window: FluencyWindow;
  scope: FluencyScope;
  cohort_size: number;
  patterns: FluencyPattern[];
};

type LedgerResponse = {
  window: FluencyWindow;
  entries: DecisionLedgerEntry[];
};

type PolicySummary = {
  policy_id: string;
  file_name: string;
  content_type: string;
  source_format: string;
  clause_count: number;
  created_at: string;
  latest_mapping: {
    mapping_id: string;
    generated_at: string;
    controls_mapped: number;
    unresolved_clauses: number;
  } | null;
};

type PoliciesResponse = {
  org_id: string;
  mode: "shadow" | "enforced";
  policies: PolicySummary[];
};

type MappingResponse = {
  org_id: string;
  policy_id: string;
  mapping_id: string;
  generated_at: string;
  controls: Array<{
    control_name: string;
    status: "enabled" | "disabled" | "partial" | "unknown";
    confidence: number;
    rationale: string;
  }>;
  unresolved_clauses: Array<{
    clause_id: string;
    text: string;
    reason: string;
    decision?: "map" | "ignore" | "defer";
  }>;
};

type ComplianceStatusResponse = {
  org_id: string;
  mode: "shadow" | "enforced";
  as_of: string;
  freshness: {
    last_event_at: string | null;
    stale: boolean;
  };
  overall_status: "enabled" | "disabled" | "partial" | "unknown";
  counts: Record<"enabled" | "disabled" | "partial" | "unknown", number>;
  controls: Array<{
    control_name: string;
    status: "enabled" | "disabled" | "partial" | "unknown";
    source: "legacy_import" | "policy_mapping";
    updated_at: string;
  }>;
};

type ComplianceEventType =
  | "policy_uploaded"
  | "policy_mapped"
  | "control_state_updated"
  | "compliance_status_refreshed"
  | "unresolved_clause_decided"
  | "compliance_mode_updated";

type ComplianceEventsResponse = {
  org_id: string;
  mode: "shadow" | "enforced";
  total_count: number;
  limit: number;
  cursor: string;
  next_cursor: string | null;
  events: Array<{
    event_id: string;
    event_type: ComplianceEventType;
    policy_id: string | null;
    control_name: string | null;
    status: "enabled" | "disabled" | "partial" | "unknown" | null;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
};

const windows = [
  { label: "Rolling 60d", value: "60d" },
  { label: "3 months", value: "3m" },
  { label: "6 months", value: "6m" },
  { label: "12 months", value: "12m" }
] as const;

const navItems = [
  { key: "overview", label: "Overview" },
  { key: "patterns", label: "Patterns" },
  { key: "decisions", label: "Decisions" },
  { key: "implications", label: "Implications" },
  { key: "evidence", label: "Evidence" }
] as const;

const secondaryNavItems = [
  { key: "admin", label: "Admin" }
] as const;

type ActivePage = (typeof navItems)[number]["key"] | (typeof secondaryNavItems)[number]["key"];

const altitudeExamples = {
  exec: [
    "Review verification capacity planning with executive sponsors.",
    "Align on guardrail visibility for higher-risk workflows.",
    "Confirm support coverage for recovery loops that persist."
  ],
  hooks: {
    function: "Mapped examples for functional views will land here.",
    enablement: "Mapped examples for enablement views will land here."
  }
};

const buildDirectionalSeries = (patterns: FluencyPattern[]) => {
  const base = Math.max(patterns.length, 1);
  return [0.7, 0.85, 0.8, 0.9].map((scale, index) => ({
    label: `W${index + 1}`,
    value: Math.min(1, (base / 6) * scale)
  }));
};

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value * 100)}%`;
};

export const Dashboard = () => {
  const orgId = localStorage.getItem("orgId") ?? "org-1";
  const role = localStorage.getItem("role") ?? "ADMIN";

  const governanceHeaders = {
    "content-type": "application/json",
    "x-role": role,
    "X-FluencyTracr-Schema-Version": "0.1"
  };
  const [window, setWindow] = useState<FluencyWindow>("60d");
  const [activePage, setActivePage] = useState<ActivePage>("overview");
  const [patterns, setPatterns] = useState<FluencyPattern[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<DecisionLedgerEntry[]>([]);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [cohortMessage, setCohortMessage] = useState<string | null>(null);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  const [isLoadingCoverage, setIsLoadingCoverage] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [openLedgerId, setOpenLedgerId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<MappingResponse | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatusResponse | null>(null);
  const [policyFileName, setPolicyFileName] = useState("ai-policy.txt");
  const [policyContent, setPolicyContent] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isUpdatingComplianceMode, setIsUpdatingComplianceMode] = useState(false);
  const [complianceEvents, setComplianceEvents] = useState<ComplianceEventsResponse["events"]>([]);
  const [complianceEventsNextCursor, setComplianceEventsNextCursor] = useState<string | null>(null);
  const [complianceEventTypeFilter, setComplianceEventTypeFilter] = useState<ComplianceEventType | "all">("all");
  const [complianceEventPolicyFilter, setComplianceEventPolicyFilter] = useState<string | "all">("all");
  const [complianceEventSinceFilter, setComplianceEventSinceFilter] = useState("");
  const [isLoadingComplianceEvents, setIsLoadingComplianceEvents] = useState(false);
  const [isExportingComplianceEvents, setIsExportingComplianceEvents] = useState(false);

  const scope: FluencyScope = "org";

  useEffect(() => {
    const controller = new AbortController();
    const fetchPatterns = async () => {
      setIsLoadingPatterns(true);
      try {
        const response = await fetch(`/api/patterns?window=${window}&scope=${scope}`);
        if (!response.ok) {
          const payload = await response.json();
          setPatterns([]);
          setCohortMessage(payload?.error ?? "Signals are not available for this cohort size.");
          return;
        }
        const payload = (await response.json()) as PatternResponse;
        setPatterns(payload.patterns);
        setCohortMessage(null);
      } catch (error) {
        setPatterns([]);
        setCohortMessage("Signals are not available for this cohort size.");
      } finally {
        setIsLoadingPatterns(false);
      }
    };
    fetchPatterns();
    return () => controller.abort();
  }, [window, scope]);

  const loadPolicies = async () => {
    const response = await fetch(`/orgs/${orgId}/policies`, {
      headers: { "x-role": role }
    });
    if (!response.ok) {
      throw new Error("Unable to load policies");
    }
    const payload = (await response.json()) as PoliciesResponse;
    setPolicies(payload.policies ?? []);
    if (!selectedPolicyId && payload.policies.length > 0) {
      setSelectedPolicyId(payload.policies[0].policy_id);
    }
  };

  const loadCompliance = async () => {
    const response = await fetch(`/orgs/${orgId}/compliance/status`, {
      headers: { "x-role": role }
    });
    if (!response.ok) {
      throw new Error("Unable to load compliance status");
    }
    const payload = (await response.json()) as ComplianceStatusResponse;
    setComplianceStatus(payload);
  };

  const loadMapping = async (policyId: string) => {
    const response = await fetch(`/orgs/${orgId}/policies/${policyId}/mapping`, {
      headers: { "x-role": role }
    });
    if (!response.ok) {
      setMapping(null);
      return;
    }
    const payload = (await response.json()) as MappingResponse;
    setMapping(payload);
  };

  const loadComplianceEvents = async (
    cursor = "0",
    append = false,
    options?: { throwOnError?: boolean; errorMessage?: string }
  ) => {
    setIsLoadingComplianceEvents(true);
    const throwOnError = options?.throwOnError ?? true;
    try {
      const params = new URLSearchParams({
        cursor,
        limit: "10"
      });
      if (complianceEventTypeFilter !== "all") {
        params.set("event_type", complianceEventTypeFilter);
      }
      if (complianceEventPolicyFilter !== "all") {
        params.set("policy_id", complianceEventPolicyFilter);
      }
      if (complianceEventSinceFilter) {
        params.set("since", new Date(complianceEventSinceFilter).toISOString());
      }
      const response = await fetch(`/orgs/${orgId}/compliance/events?${params.toString()}`, {
        headers: { "x-role": role }
      });
      if (!response.ok) {
        throw new Error("Unable to load compliance events");
      }
      const payload = (await response.json()) as ComplianceEventsResponse;
      setComplianceEvents((current) => (append ? [...current, ...payload.events] : payload.events));
      setComplianceEventsNextCursor(payload.next_cursor);
      return true;
    } catch (error) {
      if (!append) {
        // Avoid stale timeline state after a failed refresh.
        setComplianceEvents([]);
        setComplianceEventsNextCursor(null);
      }
      setAdminMessage(options?.errorMessage ?? "Unable to load compliance events.");
      if (throwOnError) {
        throw error;
      }
      return false;
    } finally {
      setIsLoadingComplianceEvents(false);
    }
  };

  const setSincePreset = (hoursBack: number) => {
    const date = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    setComplianceEventSinceFilter(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const exportComplianceEventsCsv = async () => {
    setIsExportingComplianceEvents(true);
    setAdminMessage(null);
    try {
      let cursor = "0";
      const rows: ComplianceEventsResponse["events"] = [];
      while (true) {
        const params = new URLSearchParams({
          cursor,
          limit: "200"
        });
        if (complianceEventTypeFilter !== "all") {
          params.set("event_type", complianceEventTypeFilter);
        }
        if (complianceEventPolicyFilter !== "all") {
          params.set("policy_id", complianceEventPolicyFilter);
        }
        if (complianceEventSinceFilter) {
          params.set("since", new Date(complianceEventSinceFilter).toISOString());
        }
        const response = await fetch(`/orgs/${orgId}/compliance/events?${params.toString()}`, {
          headers: { "x-role": role }
        });
        if (!response.ok) {
          throw new Error("Unable to export compliance events");
        }
        const payload = (await response.json()) as ComplianceEventsResponse;
        rows.push(...payload.events);
        if (!payload.next_cursor) {
          break;
        }
        cursor = payload.next_cursor;
      }

      const escapeCsv = (value: unknown) => {
        const serialized = typeof value === "string" ? value : JSON.stringify(value ?? "");
        return `"${serialized.replace(/"/g, '""')}"`;
      };
      const csv = [
        [
          "event_id",
          "event_type",
          "policy_id",
          "control_name",
          "status",
          "created_at",
          "metadata"
        ].join(","),
        ...rows.map((event) =>
          [
            escapeCsv(event.event_id),
            escapeCsv(event.event_type),
            escapeCsv(event.policy_id ?? ""),
            escapeCsv(event.control_name ?? ""),
            escapeCsv(event.status ?? ""),
            escapeCsv(event.created_at),
            escapeCsv(event.metadata)
          ].join(",")
        )
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `compliance-events-${orgId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setAdminMessage(`Exported ${rows.length} compliance event rows.`);
    } catch (_error) {
      setAdminMessage("Unable to export compliance events.");
    } finally {
      setIsExportingComplianceEvents(false);
    }
  };

  useEffect(() => {
    if (activePage !== "admin") {
      return;
    }
    let cancelled = false;
    const loadAdminData = async () => {
      setIsAdminLoading(true);
      try {
        await Promise.all([loadPolicies(), loadCompliance(), loadComplianceEvents("0", false)]);
        if (!cancelled) {
          setAdminMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAdminMessage("Admin data could not be loaded. Confirm org access and role permissions.");
        }
      } finally {
        if (!cancelled) {
          setIsAdminLoading(false);
        }
      }
    };
    loadAdminData();
    return () => {
      cancelled = true;
    };
  }, [activePage, complianceEventTypeFilter, complianceEventPolicyFilter, complianceEventSinceFilter]);

  useEffect(() => {
    if (activePage === "admin" && selectedPolicyId) {
      loadMapping(selectedPolicyId).catch(() => {
        setMapping(null);
      });
    }
  }, [activePage, selectedPolicyId]);

  const uploadPolicy = async () => {
    if (!policyContent.trim()) {
      setAdminMessage("Policy text is required before upload.");
      return;
    }
    setIsSavingPolicy(true);
    setAdminMessage(null);
    try {
      const response = await fetch(`/orgs/${orgId}/policies/upload`, {
        method: "POST",
        headers: governanceHeaders,
        body: JSON.stringify({
          file_name: policyFileName,
          content_type: "text/plain",
          content: policyContent
        })
      });
      if (!response.ok) {
        throw new Error("Policy upload failed");
      }
      const payload = await response.json();
      setSelectedPolicyId(payload.policy_id);
      await Promise.all([loadPolicies(), loadCompliance()]);
      await loadComplianceEvents("0", false);
      setAdminMessage("Policy uploaded. Run mapping to generate compliance controls.");
    } catch (error) {
      setAdminMessage("Upload failed. Verify schema headers, role, and policy content.");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const mapSelectedPolicy = async () => {
    if (!selectedPolicyId) {
      setAdminMessage("Select a policy to map.");
      return;
    }
    setAdminMessage(null);
    try {
      const response = await fetch(`/orgs/${orgId}/policies/${selectedPolicyId}/map`, {
        method: "POST",
        headers: governanceHeaders,
        body: JSON.stringify({})
      });
      if (!response.ok) {
        throw new Error("Mapping failed");
      }
      await Promise.all([loadPolicies(), loadCompliance(), loadMapping(selectedPolicyId)]);
      await loadComplianceEvents("0", false);
      setAdminMessage("Policy mapped. Review unresolved clauses to improve coverage.");
    } catch (error) {
      setAdminMessage("Mapping failed. Check policy content and endpoint permissions.");
    }
  };

  const updateComplianceMode = async (mode: "shadow" | "enforced") => {
    setIsUpdatingComplianceMode(true);
    setAdminMessage(null);
    try {
      const response = await fetch(`/orgs/${orgId}/compliance/mode`, {
        method: "PATCH",
        headers: governanceHeaders,
        body: JSON.stringify({
          mode,
          rationale:
            mode === "enforced"
              ? "Internal admin promoted org to enforcement mode."
              : "Internal admin returned org to shadow mode."
        })
      });
      if (!response.ok) {
        throw new Error("Compliance mode update failed");
      }
      await loadCompliance();
      await loadComplianceEvents("0", false);
      setAdminMessage(`Compliance mode updated to ${mode}.`);
    } catch (_error) {
      setAdminMessage("Unable to update compliance mode.");
    } finally {
      setIsUpdatingComplianceMode(false);
    }
  };

  const resolveClause = async (
    clauseId: string,
    action: "map" | "ignore" | "defer",
    controlName?: string,
    status?: "enabled" | "disabled" | "partial" | "unknown"
  ) => {
    if (!selectedPolicyId) {
      return;
    }
    try {
      const body: Record<string, unknown> = {
        action,
        rationale: action === "map" ? "Admin mapped unresolved clause during beta review." : `Admin marked clause as ${action}.`
      };
      if (action === "map") {
        body.control_name = controlName ?? "compliance_posture_flag";
        body.status = status ?? "partial";
      }
      const response = await fetch(
        `/orgs/${orgId}/policies/${selectedPolicyId}/mapping/unresolved/${clauseId}`,
        {
          method: "PATCH",
          headers: governanceHeaders,
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        throw new Error("Clause resolution failed");
      }
      await Promise.all([loadCompliance(), loadMapping(selectedPolicyId), loadPolicies()]);
      await loadComplianceEvents("0", false);
      setAdminMessage("Unresolved clause decision saved.");
    } catch (error) {
      setAdminMessage("Unable to save unresolved clause decision.");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchLedger = async () => {
      setIsLoadingLedger(true);
      try {
        const response = await fetch(`/api/ledger?window=${window}`);
        if (!response.ok) {
          setLedgerEntries([]);
          return;
        }
        const payload = (await response.json()) as LedgerResponse;
        setLedgerEntries(payload.entries ?? []);
      } catch (error) {
        setLedgerEntries([]);
      } finally {
        setIsLoadingLedger(false);
      }
    };
    fetchLedger();
    return () => controller.abort();
  }, [window]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCoverage = async () => {
      setIsLoadingCoverage(true);
      try {
        const response = await fetch(`/api/coverage?window=${window}&scope=${scope}`);
        if (!response.ok) {
          setCoverage(null);
          return;
        }
        const payload = (await response.json()) as CoverageSummary;
        setCoverage(payload);
      } catch (error) {
        setCoverage(null);
      } finally {
        setIsLoadingCoverage(false);
      }
    };
    fetchCoverage();
    return () => controller.abort();
  }, [window, scope]);

  const posture = useMemo(() => {
    if (patterns.length === 0) {
      return "Study";
    }
    const counts = patterns.reduce<Record<string, number>>((acc, pattern) => {
      acc[pattern.recommended_posture] = (acc[pattern.recommended_posture] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Study";
  }, [patterns]);

  const topSignals = patterns.slice(0, 3).map((pattern) => pattern.what_we_see);
  const prevalenceSeries = buildDirectionalSeries(patterns);

  const confidenceLabel = coverage?.coverage
    ? coverage.coverage >= 0.7
      ? "High"
      : coverage.coverage >= 0.4
        ? "Medium"
        : "Withheld"
    : "Withheld";

  const selectedLedger = ledgerEntries.find((entry) => entry.ledger_id === openLedgerId) ?? null;
  const activeLabel = [...navItems, ...secondaryNavItems].find((item) => item.key === activePage)?.label ?? "Overview";
  const isAdminPage = activePage === "admin";
  const isBetaHost = typeof window !== "undefined" && window.location.hostname === "www.fluencytracr.com";
  const isAdminRole = role === "ADMIN";

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        secondaryItems={secondaryNavItems}
        activeKey={activePage}
        onSelect={(key) => setActivePage(key as ActivePage)}
      />
      <main className="main">
        <header className="topbar">
          <div>
            <h2>{activeLabel}</h2>
            <p>
              {isAdminPage
                ? "Internal admin beta for policy mapping and shadow-mode compliance."
                : "Signals indicate directional movement across aggregated workflows."}
            </p>
            {!isBetaHost && isAdminPage && (
              <p className="meta">Beta host check: expected deployment target is www.fluencytracr.com.</p>
            )}
          </div>
          {!isAdminPage && (
            <div className="window-controls">
              <div className="meta-block">
                <span className="meta-label">Coverage</span>
                <span className={isLoadingCoverage ? "meta-value skeleton" : "meta-value"}>
                  {isLoadingCoverage ? "--" : formatPercent(coverage?.coverage)}
                </span>
              </div>
              <div className="meta-block">
                <span className="meta-label">Confidence</span>
                <span className={isLoadingCoverage ? "meta-value skeleton" : "meta-value"}>
                  {isLoadingCoverage ? "--" : confidenceLabel}
                </span>
              </div>
              <div className="toggle">
                {windows.map((option) => (
                  <button
                    key={option.value}
                    className={window === option.value ? "toggle-button active" : "toggle-button"}
                    onClick={() => setWindow(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {activePage === "overview" && (
          <section className="stack">
            <div className="card hero">
              <div>
                <div className="eyebrow">Executive Brief</div>
                <h3>Posture: {posture}</h3>
                <p className="hero-copy">
                  Signals suggest where to focus attention. Silence is valid when confidence is not
                  sufficient.
                </p>
              </div>
              <div className="hero-grid">
                <div>
                  <div className="metric-label">Top signals</div>
                  <ul className="list">
                    {topSignals.length > 0 ? (
                      topSignals.map((signal) => <li key={signal}>{signal}</li>)
                    ) : (
                      <li>Insight withheld due to low confidence.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="metric-label">Window</div>
                  <div className="metric-value">{window}</div>
                  <div className="meta">Rolling windows are defaulted to 60 days.</div>
                </div>
                <div>
                  <div className="metric-label">Coverage</div>
                  <div className="metric-value">{formatPercent(coverage?.coverage)}</div>
                  <div className="meta">Cohort size: {coverage?.cohort_size ?? "--"}</div>
                </div>
              </div>
              <p className="meta">
                What this does NOT mean: This does NOT mean outcomes are guaranteed or that any
                group is ahead of another.
              </p>
            </div>

            <div className="grid">
              <div className="card">
                <h3>Pattern prevalence</h3>
                <p className="meta">Directional signals over time (confidence gated).</p>
                <DirectionalChart series={prevalenceSeries} />
              </div>
              <div className="card">
                <h3>Decision timeline</h3>
                <p className="meta">Markers show logged decisions within the window.</p>
                <TimelineLane entries={ledgerEntries} isLoading={isLoadingLedger} />
              </div>
              <div className="card">
                <h3>Coverage signal mix</h3>
                <ul className="list">
                  <li>Verification rate: {formatPercent(coverage?.verification_rate)}</li>
                  <li>Risk mix (High): {formatPercent(coverage?.risk_mix.high)}</li>
                  <li>Risk mix (Medium): {formatPercent(coverage?.risk_mix.medium)}</li>
                </ul>
                <p className="meta">
                  What this does NOT mean: This does NOT mean any team is singled out.
                </p>
              </div>
            </div>
          </section>
        )}

        {activePage === "patterns" && (
          <section className="stack">
            <div className="card banner">
              <div>
                <h3>Pattern briefing</h3>
                <p>
                  Signals indicate directional movement across aggregated workflows. Confidence gating
                  suppresses low confidence insights.
                </p>
              </div>
              <div className="banner-metrics">
                <div>
                  <div className="metric-label">Cohort guardrail</div>
                  <div className="metric-value">n ≥ 5 enforced</div>
                </div>
              </div>
            </div>

            {cohortMessage ? (
              <div className="card empty">
                <h3>Signals are quiet</h3>
                <p>{cohortMessage}</p>
                <p className="meta">What this does NOT mean: This does NOT mean activity is absent.</p>
              </div>
            ) : isLoadingPatterns ? (
              <div className="grid">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="card skeleton" key={`skeleton-${index}`} aria-hidden="true">
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-block" />
                  </div>
                ))}
              </div>
            ) : patterns.length === 0 ? (
              <div className="card empty">
                <h3>No patterns above Medium confidence</h3>
                <p>Silence is valid when signal confidence is not sufficient.</p>
                <p className="meta">What this does NOT mean: This does NOT mean activity is absent.</p>
              </div>
            ) : (
              <div className="grid">
                {patterns.map((pattern) => (
                  <details className="card accordion" key={`${pattern.pattern_name}-${pattern.window}`}>
                    <summary>
                      <div>
                        <h4>{pattern.pattern_name}</h4>
                        <p className="meta">{pattern.signal_status} signal with {Math.round(pattern.coverage * 100)}% coverage.</p>
                      </div>
                      <div className="chip-row">
                        <span className="chip">{pattern.signal_status}</span>
                        <span className="chip">Confidence: {pattern.confidence}</span>
                      </div>
                    </summary>
                    <div className="divider" />
                    <div className="copy-block">
                      <h4>What we're seeing</h4>
                      <p>{pattern.what_we_see}</p>
                      <h4>What this might suggest</h4>
                      <p>{pattern.might_suggest}</p>
                      <h4>What this does NOT mean</h4>
                      <p>{pattern.does_not_mean}</p>
                      <h4>Recommended posture</h4>
                      <p>{pattern.recommended_posture}</p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === "decisions" && (
          <section className="stack">
            <div className="card banner">
              <h3>Decision-to-Impact Ledger</h3>
              <p>
                Decisions are immutable. Evaluations append after the full observation window completes.
              </p>
            </div>
            {isLoadingLedger ? (
              <div className="card skeleton" aria-hidden="true">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-block" />
              </div>
            ) : ledgerEntries.length === 0 ? (
              <div className="card empty">
                <h3>No ledger entries yet</h3>
                <p>Use the ledger to log decisions tied to directional signals.</p>
                <p className="meta">What this does NOT mean: This does NOT mean no decisions exist.</p>
              </div>
            ) : (
              <div className="timeline">
                {ledgerEntries.map((entry) => (
                  <div className="timeline-item" key={entry.ledger_id}>
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="card">
                        <div className="card-header">
                          <div>
                            <h4>{entry.decision.title}</h4>
                            <p className="meta">{entry.decision.description}</p>
                          </div>
                          <div className="metric">
                            {entry.evaluation?.signal_movement ?? "Observing"}
                            <span className="metric-sub">signal movement</span>
                          </div>
                        </div>
                        <div className="divider" />
                        <div className="timeline-actions">
                          <div className="meta">Decision date: {entry.decision.decision_date}</div>
                          <button
                            className="secondary"
                            type="button"
                            onClick={() => setOpenLedgerId(entry.ledger_id)}
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === "implications" && (
          <section className="stack">
            <div className="card banner">
              <h3>Pattern Implications</h3>
              <p>
                Implications group signals into risk, opportunity, stability, and coverage gaps. These
                are directional cues, not causal claims.
              </p>
            </div>

            <div className="grid">
              <div className="card">
                <h4>Risk</h4>
                <ul className="list">
                  <li>Verification load may reflect concentrated exposure.</li>
                  <li>Recovery loops indicate workflows that may benefit from guidance refreshes.</li>
                </ul>
              </div>
              <div className="card">
                <h4>Opportunity</h4>
                <ul className="list">
                  <li>Stable acceptance patterns may reflect readiness to scale verified flows.</li>
                  <li>Consistent recovery resolution indicates resilient operating habits.</li>
                </ul>
              </div>
              <div className="card">
                <h4>Stability</h4>
                <ul className="list">
                  <li>Directional signals appear steady when confidence holds at Medium or High.</li>
                  <li>Silence indicates coverage or confidence gaps, not absence of activity.</li>
                </ul>
              </div>
              <div className="card">
                <h4>Coverage gaps</h4>
                <ul className="list">
                  <li>Low verification rate indicates a coverage gap for high-risk workflows.</li>
                  <li>Abandonment signals may reflect friction in early-stage handoffs.</li>
                </ul>
              </div>
            </div>

            <div className="card">
              <h4>Altitude-aware examples (executive view)</h4>
              <ul className="list">
                {altitudeExamples.exec.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="meta">
                Mapping hooks: {altitudeExamples.hooks.function} {altitudeExamples.hooks.enablement}
              </p>
              <p className="meta">What this does NOT mean: This does NOT mean any team is singled out.</p>
            </div>
          </section>
        )}

        {activePage === "evidence" && (
          <section className="stack">
            <div className="card banner">
              <h3>Confidence & Coverage</h3>
              <p>
                Confidence reflects signal density and coverage, not outcomes. Low confidence insights
                remain suppressed.
              </p>
            </div>

            <div className="grid">
              <div className="card">
                <h4>Coverage</h4>
                <div className="metric">
                  {isLoadingCoverage ? "--" : formatPercent(coverage?.coverage)}
                  <span className="metric-sub">window coverage</span>
                </div>
                <p className="meta">Cohort size: {coverage?.cohort_size ?? "--"}</p>
              </div>
              <div className="card">
                <h4>Verification rate</h4>
                <div className="metric">
                  {isLoadingCoverage ? "--" : formatPercent(coverage?.verification_rate)}
                  <span className="metric-sub">verification rate</span>
                </div>
                <p className="meta">Signals remain aggregated at org scope only.</p>
              </div>
              <div className="card">
                <h4>Withheld states</h4>
                <p>Insight withheld due to low confidence.</p>
                <p className="meta">Silence is valid when coverage is insufficient.</p>
              </div>
            </div>

            <div className="card">
              <h4>What this does NOT mean</h4>
              <p>
                Coverage and confidence do NOT mean any team or workflow is ahead or behind. These are
                directional signals meant for executive-level calibration.
              </p>
            </div>
          </section>
        )}

        {activePage === "admin" && (
          <section className="stack">
            <div className="card banner">
              <h3>Policy Governance Admin</h3>
              <p>
                Compliance is running in{" "}
                <strong>{complianceStatus?.mode ?? "shadow"} mode</strong>. Signals are advisory and non-blocking during beta.
              </p>
            </div>

            <div className="grid">
              <div className="card">
                <h4>Upload Policy</h4>
                <p className="meta">Supports text payloads now. PDF/DOCX extraction will route through this flow.</p>
                <div className="form-grid">
                  <label>
                    File Name
                    <input
                      type="text"
                      value={policyFileName}
                      onChange={(event) => setPolicyFileName(event.target.value)}
                    />
                  </label>
                  <label>
                    Policy Content
                    <textarea
                      rows={8}
                      value={policyContent}
                      onChange={(event) => setPolicyContent(event.target.value)}
                      placeholder="Paste governance/policy text..."
                    />
                  </label>
                </div>
                <button className="primary" type="button" onClick={uploadPolicy} disabled={isSavingPolicy}>
                  {isSavingPolicy ? "Uploading..." : "Upload Policy"}
                </button>
              </div>

              <div className="card">
                <h4>Compliance Snapshot</h4>
                {isAdminLoading ? (
                  <p className="meta">Loading compliance status...</p>
                ) : complianceStatus ? (
                  <>
                    <p><strong>Mode:</strong> {complianceStatus.mode}</p>
                    <p><strong>Overall status:</strong> {complianceStatus.overall_status}</p>
                    <p className="meta">As of {complianceStatus.as_of}</p>
                    <ul className="list">
                      <li>Enabled: {complianceStatus.counts.enabled}</li>
                      <li>Disabled: {complianceStatus.counts.disabled}</li>
                      <li>Partial: {complianceStatus.counts.partial}</li>
                      <li>Unknown: {complianceStatus.counts.unknown}</li>
                    </ul>
                    <p className="meta">Freshness: {complianceStatus.freshness.last_event_at ?? "No events yet"}</p>
                    {isAdminRole && (
                      <div className="inline-actions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => updateComplianceMode("shadow")}
                          disabled={isUpdatingComplianceMode || complianceStatus.mode === "shadow"}
                        >
                          Set Shadow
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => updateComplianceMode("enforced")}
                          disabled={isUpdatingComplianceMode || complianceStatus.mode === "enforced"}
                        >
                          Set Enforced
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="meta">No compliance status available yet.</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="row-between">
                <h4>Policy Mapping Review</h4>
                <div className="inline-actions">
                  <select
                    value={selectedPolicyId ?? ""}
                    onChange={(event) => setSelectedPolicyId(event.target.value || null)}
                  >
                    <option value="">Select policy</option>
                    {policies.map((policy) => (
                      <option key={policy.policy_id} value={policy.policy_id}>
                        {policy.file_name}
                      </option>
                    ))}
                  </select>
                  <button className="secondary" type="button" onClick={mapSelectedPolicy}>
                    Run Mapping
                  </button>
                </div>
              </div>

              {mapping ? (
                <>
                  <p className="meta">Mapping generated: {mapping.generated_at}</p>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Control</th>
                          <th>Status</th>
                          <th>Confidence</th>
                          <th>Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mapping.controls.map((control) => (
                          <tr key={control.control_name}>
                            <td>{control.control_name}</td>
                            <td>{control.status}</td>
                            <td>{Math.round(control.confidence * 100)}%</td>
                            <td>{control.rationale}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4>Unresolved Clauses</h4>
                  {mapping.unresolved_clauses.length === 0 ? (
                    <p className="meta">No unresolved clauses.</p>
                  ) : (
                    <div className="stack">
                      {mapping.unresolved_clauses.map((clause) => (
                        <div className="card nested" key={clause.clause_id}>
                          <p><strong>{clause.clause_id}</strong> {clause.text}</p>
                          <p className="meta">{clause.reason}</p>
                          <div className="inline-actions">
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => resolveClause(clause.clause_id, "map", "compliance_posture_flag", "partial")}
                            >
                              Map as Partial
                            </button>
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => resolveClause(clause.clause_id, "ignore")}
                            >
                              Ignore
                            </button>
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => resolveClause(clause.clause_id, "defer")}
                            >
                              Defer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="meta">Select a policy and run mapping to review controls.</p>
              )}

              {adminMessage && <p className="meta">{adminMessage}</p>}
            </div>

            <div className="card">
              <div className="row-between">
                <h4>Compliance Event Timeline</h4>
                <div className="inline-actions">
                  <select
                    value={complianceEventTypeFilter}
                    onChange={(event) => setComplianceEventTypeFilter(event.target.value as ComplianceEventType | "all")}
                  >
                    <option value="all">All events</option>
                    <option value="policy_uploaded">Policy uploaded</option>
                    <option value="policy_mapped">Policy mapped</option>
                    <option value="control_state_updated">Control state updated</option>
                    <option value="compliance_status_refreshed">Status refreshed</option>
                    <option value="unresolved_clause_decided">Unresolved decided</option>
                    <option value="compliance_mode_updated">Mode updated</option>
                  </select>
                  <select
                    value={complianceEventPolicyFilter}
                    onChange={(event) => setComplianceEventPolicyFilter(event.target.value || "all")}
                  >
                    <option value="all">All policies</option>
                    {policies.map((policy) => (
                      <option key={`event-policy-${policy.policy_id}`} value={policy.policy_id}>
                        {policy.file_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={complianceEventSinceFilter}
                    onChange={(event) => setComplianceEventSinceFilter(event.target.value)}
                    aria-label="Events since"
                  />
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setSincePreset(24)}
                  >
                    Last 24h
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setSincePreset(24 * 7)}
                  >
                    Last 7d
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setSincePreset(24 * 30)}
                  >
                    Last 30d
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setComplianceEventSinceFilter("")}
                  >
                    Clear Since
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      void loadComplianceEvents("0", false, {
                        throwOnError: false,
                        errorMessage: "Unable to refresh compliance events."
                      });
                    }}
                    disabled={isLoadingComplianceEvents}
                  >
                    Refresh
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={exportComplianceEventsCsv}
                    disabled={isExportingComplianceEvents}
                  >
                    {isExportingComplianceEvents ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </div>

              {isLoadingComplianceEvents && complianceEvents.length === 0 ? (
                <p className="meta">Loading events...</p>
              ) : complianceEvents.length === 0 ? (
                <p className="meta">No compliance events yet.</p>
              ) : (
                <div className="stack">
                  {complianceEvents.map((event) => (
                    <div className="card nested" key={event.event_id}>
                      <p>
                        <strong>{event.event_type}</strong> at {event.created_at}
                      </p>
                      <p className="meta">
                        Policy: {event.policy_id ?? "n/a"} | Control: {event.control_name ?? "n/a"} | Status:{" "}
                        {event.status ?? "n/a"}
                      </p>
                      <details>
                        <summary className="meta">Show event details</summary>
                        <pre className="meta">{JSON.stringify(event.metadata, null, 2)}</pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
              {complianceEventsNextCursor && (
                <div className="inline-actions">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      void loadComplianceEvents(complianceEventsNextCursor, true, {
                        throwOnError: false,
                        errorMessage: "Unable to load more compliance events."
                      });
                    }}
                    disabled={isLoadingComplianceEvents}
                  >
                    {isLoadingComplianceEvents ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {selectedLedger && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setOpenLedgerId(null)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <h3>{selectedLedger.decision.title}</h3>
                <p className="meta">{selectedLedger.decision.description}</p>
              </div>
              <button className="secondary" type="button" onClick={() => setOpenLedgerId(null)}>
                Close
              </button>
            </div>
            <div className="divider" />
            <div className="drawer-body">
              <section>
                <h4>Decision</h4>
                <p>Type: {selectedLedger.decision.decision_type}</p>
                <p>Scope: {selectedLedger.decision.scope}</p>
                <p>Date: {selectedLedger.decision.decision_date}</p>
                <p>Logged by: {selectedLedger.decision.logged_by_role}</p>
              </section>
              <section>
                <h4>Rationale</h4>
                <p>Primary pattern: {selectedLedger.rationale.primary_pattern}</p>
                {selectedLedger.rationale.secondary_pattern && (
                  <p>Secondary pattern: {selectedLedger.rationale.secondary_pattern}</p>
                )}
                <p>Signal status: {selectedLedger.rationale.signal_status_at_decision}</p>
                <p>Confidence: {selectedLedger.rationale.confidence_at_decision}</p>
              </section>
              <section>
                <h4>Observation</h4>
                <p>
                  Window: {selectedLedger.observation.window_length_days}d {selectedLedger.observation.window_type}
                </p>
                <p>
                  Start: {selectedLedger.observation.observation_start}
                  <br />
                  End: {selectedLedger.observation.observation_end}
                </p>
                <p>Status: {selectedLedger.observation.status}</p>
              </section>
              <section>
                <h4>Evaluation</h4>
                {selectedLedger.evaluation ? (
                  <>
                    <p>Signal movement: {selectedLedger.evaluation.signal_movement}</p>
                    <ul className="list">
                      {selectedLedger.evaluation.observed_patterns.map((pattern) => (
                        <li key={`${pattern.pattern}-${pattern.direction}`}>
                          {pattern.pattern}: {pattern.direction}
                        </li>
                      ))}
                    </ul>
                    <p>Confidence: {selectedLedger.evaluation.confidence}</p>
                    <p>{selectedLedger.evaluation.interpretation}</p>
                    {selectedLedger.evaluation.confounds.length > 0 && (
                      <p>Confounds: {selectedLedger.evaluation.confounds.join(", ")}</p>
                    )}
                  </>
                ) : (
                  <p>Observing. Evaluation will append after the window completes.</p>
                )}
                <p className="meta">
                  What this does NOT mean: This does NOT mean the decision outcome is final.
                </p>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const DirectionalChart = ({
  series
}: {
  series: { label: string; value: number }[];
}) => {
  const max = Math.max(...series.map((point) => point.value), 1);
  const path = series
    .map((point, index) => {
      const x = (index / (series.length - 1 || 1)) * 100;
      const y = 100 - (point.value / max) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="chart">
      <svg viewBox="0 0 100 40" aria-hidden="true">
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
      <div className="chart-labels">
        {series.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
};

const TimelineLane = ({
  entries,
  isLoading
}: {
  entries: DecisionLedgerEntry[];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <div className="skeleton-line" aria-hidden="true" />;
  }
  if (entries.length === 0) {
    return <p className="meta">No decisions logged in this window.</p>;
  }
  return (
    <div className="lane">
      {entries.map((entry) => (
        <span key={entry.ledger_id} className="lane-marker" aria-label={entry.decision.title} />
      ))}
    </div>
  );
};
