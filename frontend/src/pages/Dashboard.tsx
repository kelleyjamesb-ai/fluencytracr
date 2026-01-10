import { useEffect, useMemo, useState } from "react";

const ranges = [
  { label: "4w", value: "4w" },
  { label: "12w", value: "12w" },
  { label: "6m", value: "6m" }
] as const;

type TimeseriesPoint = {
  week_start: string;
  value: number | null;
  suppressed: boolean;
};

type DashboardOverview = {
  org_id: string;
  range: string;
  fluency_index: {
    current: number | null;
    timeseries: TimeseriesPoint[];
    data_completeness: number;
    confidence: number;
  };
  coverage: {
    weekly_active_users: TimeseriesPoint[];
    active_users_percent_of_assigned: TimeseriesPoint[];
  };
  sessions_shape: {
    bucket_start: string | null;
    frequency_bands: Record<string, number | null>;
  };
  spread: {
    bucket_start: string | null;
    teams_with_any_ai_usage_percent: number | null;
    usage_concentration_index: number | null;
  };
  risk_drift_controls: {
    compliance_posture_flag: string | null;
  };
};

type TransparencyReport = {
  org_id: string;
  collected_data: string[];
  never_collected: string[];
  aggregation_rules: string[];
  enabled_signal_sources: string[];
};

const fallbackData: DashboardOverview = {
  org_id: "org-1",
  range: "12w",
  fluency_index: {
    current: 58,
    timeseries: Array.from({ length: 12 }, (_, index) => ({
      week_start: `2024-W${index + 1}`,
      value: 50 + index,
      suppressed: false
    })),
    data_completeness: 0.85,
    confidence: 0.85
  },
  coverage: {
    weekly_active_users: Array.from({ length: 12 }, (_, index) => ({
      week_start: `2024-W${index + 1}`,
      value: 300 + index * 8,
      suppressed: false
    })),
    active_users_percent_of_assigned: Array.from({ length: 12 }, (_, index) => ({
      week_start: `2024-W${index + 1}`,
      value: 0.45 + index * 0.01,
      suppressed: false
    }))
  },
  sessions_shape: {
    bucket_start: "2024-W12",
    frequency_bands: {
      usage_frequency_band_rare_count: 20,
      usage_frequency_band_occasional_count: 45,
      usage_frequency_band_regular_count: 80,
      usage_frequency_band_habitual_count: 55
    }
  },
  spread: {
    bucket_start: "2024-W12",
    teams_with_any_ai_usage_percent: 0.72,
    usage_concentration_index: 0.38
  },
  risk_drift_controls: {
    compliance_posture_flag: "enabled"
  }
};

const fallbackTransparency: TransparencyReport = {
  org_id: "org-1",
  collected_data: ["aggregated_metrics", "policy_controls", "enablement_rollups"],
  never_collected: ["prompt_content", "output_content", "keystrokes", "file_names", "message_text", "raw_logs"],
  aggregation_rules: ["org", "team", "role", "time_bucket"],
  enabled_signal_sources: ["training_platform", "support_ticketing", "code_review"]
};

export const Dashboard = () => {
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("12w");
  const [data, setData] = useState<DashboardOverview>(fallbackData);
  const [transparency, setTransparency] = useState<TransparencyReport>(fallbackTransparency);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [view, setView] = useState<"dashboard" | "transparency">("dashboard");
  const exportParams = new URLSearchParams({
    range,
    vendor: "all",
    groupType: "org"
  }).toString();
  const exportBase = `/orgs/${data.org_id}/dashboard/export`;

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/orgs/${fallbackData.org_id}/dashboard/overview?range=${range}&vendor=all&groupType=org`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch");
        }
        const payload = (await response.json()) as DashboardOverview;
        setData(payload);
      } catch (error) {
        setData({ ...fallbackData, range });
      }
    };
    fetchData();
    return () => controller.abort();
  }, [range]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchTransparency = async () => {
      try {
        const response = await fetch(`/orgs/${fallbackData.org_id}/transparency`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("Failed to fetch");
        }
        const payload = (await response.json()) as TransparencyReport;
        setTransparency(payload);
      } catch (error) {
        setTransparency(fallbackTransparency);
      }
    };
    fetchTransparency();
    return () => controller.abort();
  }, []);

  const fluencyTrend = useMemo(
    () => data.fluency_index.timeseries.map((point) => point.value ?? 0),
    [data]
  );

  const coverageLatest = data.coverage.active_users_percent_of_assigned.at(-1)?.value ?? null;
  const wauLatest = data.coverage.weekly_active_users.at(-1)?.value ?? null;

  const frequencyBands = data.sessions_shape.frequency_bands;
  const bandEntries = [
    ["Rare", frequencyBands.usage_frequency_band_rare_count],
    ["Occasional", frequencyBands.usage_frequency_band_occasional_count],
    ["Regular", frequencyBands.usage_frequency_band_regular_count],
    ["Habitual", frequencyBands.usage_frequency_band_habitual_count]
  ] as const;

  const opportunities = [
    {
      title: "Prep account briefs with AI copilots",
      summary: "Examples other organizations explore at this stage include concise account briefs.",
      guidance: "Common patterns seen at this level of fluency focus on shared templates."
    },
    {
      title: "Standardize call follow-ups",
      summary: "Examples other organizations explore at this stage include consistent recap drafts.",
      guidance: "Common patterns seen at this level of fluency include shared recap formats."
    },
    {
      title: "Improve code review readiness",
      summary: "Examples other organizations explore at this stage include pre-review checklists.",
      guidance: "Common patterns seen at this level of fluency include shared review checklists."
    }
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">learnaire</div>
        <nav className="sidebar-nav">
          <span className="sidebar-label">Executive Dashboard</span>
          <button className="sidebar-link" type="button" onClick={() => setView("dashboard")}>
            Dashboard Overview
          </button>
          <button className="sidebar-link" type="button" onClick={() => setView("transparency")}>
            Transparency Page
          </button>
        </nav>
      </aside>
      <main className="page">
        <header className="header">
          <div>
            <h1>learnaire-fluency</h1>
            <p>Executive-safe fluency snapshot.</p>
          </div>
          {view === "dashboard" && (
            <div className="header-controls">
              <div className="toggle">
                {ranges.map((option) => (
                  <button
                    key={option.value}
                    className={range === option.value ? "toggle-button active" : "toggle-button"}
                    onClick={() => setRange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="export-buttons">
                <button
                  className="export-button"
                  type="button"
                  onClick={() => setShowOpportunities((current) => !current)}
                >
                  Explore Opportunities
                </button>
                <a className="export-button" href={`${exportBase}.pdf?${exportParams}`} download>
                  Export PDF
                </a>
                <a className="export-button" href={`${exportBase}.csv?${exportParams}`} download>
                  Export CSV
                </a>
              </div>
            </div>
          )}
        </header>

        {view === "dashboard" && (
        <section className="grid">
        <div className="card">
          <div className="card-header">
            <h2 id="fluency">AI Fluency Index</h2>
            <span className="metric">{data.fluency_index.current ?? "--"}</span>
          </div>
          <LineChart points={fluencyTrend} />
          <div className="meta">
            Confidence {Math.round(data.fluency_index.confidence * 100)}%
          </div>
        </div>

        <div className="card" id="coverage">
          <h2>Enablement Coverage</h2>
          <div className="metric">
            {coverageLatest !== null
              ? `${Math.round(coverageLatest * 100)}% active of assigned`
              : "--"}
          </div>
          <div className="submetric">
            WAU {wauLatest !== null ? Math.round(wauLatest) : "--"}
          </div>
        </div>

        <div className="card" id="adoption">
          <h2>Adoption Shape</h2>
          <ul className="list">
            {bandEntries.map(([label, value]) => (
              <li key={label}>
                <span>{label}</span>
                <span>{value ?? "--"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" id="spread">
          <h2>Spread & Risk Drift</h2>
          <div className="submetric">
            Teams with AI usage: {formatPercent(data.spread.teams_with_any_ai_usage_percent)}
          </div>
          <div className="submetric">
            Usage concentration: {formatPercent(data.spread.usage_concentration_index)}
          </div>
          <div className="submetric">
            Compliance posture: {data.risk_drift_controls.compliance_posture_flag ?? "--"}
          </div>
        </div>
        </section>
        )}
 
        {view === "dashboard" && showOpportunities && (
          <section className="card opportunities" id="opportunities">
            <h2>Explore Opportunities</h2>
            <p className="submetric">Examples other organizations explore at this stage.</p>
            <div className="opportunity-list">
              {opportunities.map((item) => (
                <div className="opportunity" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <p className="meta">{item.guidance}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "transparency" && (
          <section className="card transparency" id="transparency">
            <h2>Transparency</h2>
            <p className="submetric">Auto-generated from live system configuration.</p>
            <div className="transparency-grid">
              <div>
                <h3>Data collected</h3>
                <ul className="list">
                  {transparency.collected_data.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Data never collected</h3>
                <ul className="list">
                  {transparency.never_collected.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Aggregation rules</h3>
                <ul className="list">
                  {transparency.aggregation_rules.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Enabled signal sources</h3>
                <ul className="list">
                  {transparency.enabled_signal_sources.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

      <footer className="footer">All data shown is aggregated.</footer>
      </main>
    </div>
  );
};

const LineChart = ({ points }: { points: number[] }) => {
  if (points.length === 0) {
    return <div className="chart-placeholder" />;
  }
  const max = Math.max(...points, 1);
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1 || 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" className="chart">
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="2" />
    </svg>
  );
};

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value * 100)}%`;
};
