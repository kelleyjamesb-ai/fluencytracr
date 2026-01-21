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
  const [window, setWindow] = useState<FluencyWindow>("60d");
  const [activePage, setActivePage] = useState<(typeof navItems)[number]["key"]>("overview");
  const [patterns, setPatterns] = useState<FluencyPattern[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<DecisionLedgerEntry[]>([]);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [cohortMessage, setCohortMessage] = useState<string | null>(null);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  const [isLoadingCoverage, setIsLoadingCoverage] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [openLedgerId, setOpenLedgerId] = useState<string | null>(null);

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

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        secondaryItems={secondaryNavItems}
        activeKey={activePage}
        onSelect={setActivePage}
      />
      <main className="main">
        <header className="topbar">
          <div>
            <h2>{navItems.find((item) => item.key === activePage)?.label}</h2>
            <p>Signals indicate directional movement across aggregated workflows.</p>
          </div>
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
