import { useEffect, useMemo, useState } from "react";

import type { ClientQuestionMetricBridge } from "../hooks/useAiValueJourney";

type FunctionMetricOption = {
  id: string;
  name: string;
  valueRoute: string;
  sourceSystem: string;
  measurementUnit: string;
  owner: string;
  why: string;
  watches: string;
};

type FunctionMetricPlan = {
  functionArea: string;
  quadrantLabel: string;
  vbdBaseline: string;
  metrics: FunctionMetricOption[];
};

const customerSuccessMetrics = (bridge: ClientQuestionMetricBridge): FunctionMetricOption[] => {
  const bridgeMetrics = bridge.items.map((item) => ({
    id: `bridge-${item.id}`,
    name: item.metricName,
    valueRoute: item.valueRouteLabel,
    sourceSystem: item.sourceSystem,
    measurementUnit: item.measurementUnit,
    owner: item.owner,
    why: "Client-selected outcome from discovery.",
    watches: "Resolution movement as VBD changes"
  }));

  const defaults: FunctionMetricOption[] = [
    {
      id: "cs-first-contact-resolution",
      name: "First contact resolution",
      valueRoute: "Capacity creation",
      sourceSystem: "Support case management system",
      measurementUnit: "share",
      owner: "Support Operations",
      why: "Shows whether support work resolves faster without escalation.",
      watches: "Depth and quality of AI-assisted support work"
    },
    {
      id: "cs-open-backlog",
      name: "Open backlog count",
      valueRoute: "Capacity creation",
      sourceSystem: "Support case management system",
      measurementUnit: "cases",
      owner: "Support Operations",
      why: "Shows whether additional AI-enabled capacity is reducing queue pressure.",
      watches: "Velocity and breadth of adoption across support"
    },
    {
      id: "cs-csat",
      name: "Customer satisfaction",
      valueRoute: "Quality premium",
      sourceSystem: "CSAT or customer experience survey",
      measurementUnit: "score",
      owner: "Customer Experience",
      why: "Keeps speed gains tied to the customer experience.",
      watches: "Quality guardrail as VBD improves"
    }
  ];

  const seen = new Set<string>();
  return [...bridgeMetrics, ...defaults].filter((metric) => {
    const key = metric.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildFunctionMetricPlans = (bridge: ClientQuestionMetricBridge): FunctionMetricPlan[] => [
  {
    functionArea: "Customer or Account Success",
    quadrantLabel: "Deep but slow",
    vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
    metrics: customerSuccessMetrics(bridge)
  },
  {
    functionArea: "Engineering / Software Development",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 88 · Breadth 86 · Depth 88",
    metrics: [
      {
        id: "eng-pr-cycle-time",
        name: "Pull request cycle time",
        valueRoute: "Acceleration",
        sourceSystem: "GitHub and delivery tracker",
        measurementUnit: "hours",
        owner: "Engineering Operations",
        why: "Shows whether AI-enabled engineering work is moving from idea to merge faster.",
        watches: "Velocity and depth of engineering workflow integration"
      },
      {
        id: "eng-release-frequency",
        name: "Release frequency",
        valueRoute: "Acceleration",
        sourceSystem: "Release management system",
        measurementUnit: "releases",
        owner: "Engineering Operations",
        why: "Shows whether faster adoption is translating into more shipped work.",
        watches: "Breadth of adoption and repeatable delivery flow"
      },
      {
        id: "eng-escaped-defects",
        name: "Escaped defect rate",
        valueRoute: "Quality premium",
        sourceSystem: "Incident and bug tracker",
        measurementUnit: "rate",
        owner: "Quality Engineering",
        why: "Protects against speed improvements that create quality risk.",
        watches: "Quality guardrail as VBD increases"
      }
    ]
  },
  {
    functionArea: "Product Management",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 78 · Breadth 78 · Depth 84",
    metrics: [
      {
        id: "pm-feature-cycle-time",
        name: "Feature cycle time",
        valueRoute: "Acceleration",
        sourceSystem: "Product roadmap and delivery system",
        measurementUnit: "days",
        owner: "Product Operations",
        why: "Shows whether AI helps product teams move from discovery to launch faster.",
        watches: "Depth of product workflow integration"
      },
      {
        id: "pm-feature-adoption",
        name: "Feature adoption",
        valueRoute: "Revenue growth",
        sourceSystem: "Product analytics",
        measurementUnit: "active accounts",
        owner: "Product Analytics",
        why: "Connects product velocity to customer uptake.",
        watches: "Breadth of AI-enabled work across product and go-to-market"
      },
      {
        id: "pm-decision-latency",
        name: "Decision latency",
        valueRoute: "Acceleration",
        sourceSystem: "Roadmap review workflow",
        measurementUnit: "days",
        owner: "Product Operations",
        why: "Shows whether AI-supported synthesis reduces decision drag.",
        watches: "Velocity of adoption in planning work"
      }
    ]
  },
  {
    functionArea: "Sales or Business Development",
    quadrantLabel: "High-fluency flow",
    vbdBaseline: "Velocity 72 · Breadth 76 · Depth 74",
    metrics: [
      {
        id: "sales-cycle-time",
        name: "Sales cycle time",
        valueRoute: "Revenue growth",
        sourceSystem: "CRM",
        measurementUnit: "days",
        owner: "Revenue Operations",
        why: "Shows whether AI-enabled selling shortens movement from opportunity to close.",
        watches: "Velocity and breadth across sales workflows"
      },
      {
        id: "sales-proposal-turnaround",
        name: "Proposal turnaround time",
        valueRoute: "Acceleration",
        sourceSystem: "CRM and proposal workspace",
        measurementUnit: "days",
        owner: "Revenue Operations",
        why: "Tracks a concrete workflow where AI can reduce effort and waiting.",
        watches: "Depth of AI use in proposal work"
      },
      {
        id: "sales-win-rate",
        name: "Qualified opportunity win rate",
        valueRoute: "Revenue growth",
        sourceSystem: "CRM",
        measurementUnit: "share",
        owner: "Revenue Operations",
        why: "Checks whether faster work is also improving commercial outcomes.",
        watches: "Quality guardrail as VBD grows"
      }
    ]
  },
  {
    functionArea: "Marketing & Communications",
    quadrantLabel: "Fast but shallow",
    vbdBaseline: "Velocity 84 · Breadth 72 · Depth 46",
    metrics: [
      {
        id: "mktg-campaign-cycle-time",
        name: "Campaign cycle time",
        valueRoute: "Acceleration",
        sourceSystem: "Campaign management workspace",
        measurementUnit: "days",
        owner: "Marketing Operations",
        why: "Shows whether broad AI adoption is reducing launch time.",
        watches: "Depth movement after fast adoption"
      },
      {
        id: "mktg-content-throughput",
        name: "Content throughput",
        valueRoute: "Capacity creation",
        sourceSystem: "Content calendar",
        measurementUnit: "assets",
        owner: "Content Operations",
        why: "Tracks whether AI expands useful output without overclaiming revenue.",
        watches: "Breadth of tool use across content work"
      },
      {
        id: "mktg-qualified-pipeline",
        name: "Qualified pipeline influenced",
        valueRoute: "Revenue growth",
        sourceSystem: "CRM and attribution reporting",
        measurementUnit: "pipeline",
        owner: "Marketing Operations",
        why: "Connects campaign work to a business-facing outcome the client owns.",
        watches: "Outcome movement after VBD improves"
      }
    ]
  },
  {
    functionArea: "Finance or Accounting",
    quadrantLabel: "Low integration",
    vbdBaseline: "Velocity 26 · Breadth 38 · Depth 44",
    metrics: [
      {
        id: "fin-close-cycle-days",
        name: "Close cycle time",
        valueRoute: "Acceleration",
        sourceSystem: "ERP and close management system",
        measurementUnit: "days",
        owner: "Finance Operations",
        why: "Shows whether AI-enabled analysis and reconciliation reduce close time.",
        watches: "Depth and governed adoption in finance work"
      },
      {
        id: "fin-forecast-variance",
        name: "Forecast variance",
        valueRoute: "Quality premium",
        sourceSystem: "Planning system",
        measurementUnit: "variance",
        owner: "FP&A",
        why: "Connects AI-enabled analysis to better planning accuracy.",
        watches: "Quality guardrail before scaling adoption"
      },
      {
        id: "fin-invoice-cycle",
        name: "Invoice cycle time",
        valueRoute: "Acceleration",
        sourceSystem: "ERP",
        measurementUnit: "days",
        owner: "Finance Operations",
        why: "Tracks operational flow in a measurable finance workflow.",
        watches: "Velocity movement after workflow fit improves"
      }
    ]
  }
];

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const ClientQuestionMetricBridgePanel = ({
  bridge
}: {
  bridge: ClientQuestionMetricBridge;
}) => {
  const functionPlans = useMemo(() => buildFunctionMetricPlans(bridge), [bridge]);
  const initialSelections = useMemo(
    () =>
      Object.fromEntries(
        functionPlans.map((plan) => {
          const bridgeMetricIds = plan.metrics
            .filter((metric) => metric.id.startsWith("bridge-"))
            .map((metric) => metric.id);
          return [
            plan.functionArea,
            bridgeMetricIds.length > 0
              ? bridgeMetricIds
              : plan.metrics[0]
                ? [plan.metrics[0].id]
                : []
          ];
        })
      ) as Record<string, string[]>,
    [functionPlans]
  );
  const [selectedFunction, setSelectedFunction] = useState(functionPlans[0]?.functionArea ?? "");
  const [selectedMetricIdsByFunction, setSelectedMetricIdsByFunction] =
    useState<Record<string, string[]>>(initialSelections);

  useEffect(() => {
    setSelectedFunction((current) =>
      functionPlans.some((plan) => plan.functionArea === current)
        ? current
        : functionPlans[0]?.functionArea ?? ""
    );
    setSelectedMetricIdsByFunction((current) => {
      const nextSelections = { ...current };
      let changed = false;
      for (const [functionArea, selectedMetricIds] of Object.entries(initialSelections)) {
        const currentMetricIds = nextSelections[functionArea] ?? [];
        const hasBlueprintMetric = currentMetricIds.some((metricId) =>
          metricId.startsWith("bridge-")
        );
        const blueprintMetricArrived = selectedMetricIds.some((metricId) =>
          metricId.startsWith("bridge-")
        );
        if (
          currentMetricIds.length === 0 ||
          (blueprintMetricArrived && !hasBlueprintMetric)
        ) {
          nextSelections[functionArea] = selectedMetricIds;
          changed = true;
        }
      }
      return changed ? nextSelections : current;
    });
  }, [functionPlans, initialSelections]);

  const selectedPlan =
    functionPlans.find((plan) => plan.functionArea === selectedFunction) ?? functionPlans[0];
  const storedMetricIds = selectedMetricIdsByFunction[selectedPlan.functionArea] ?? [];
  const defaultMetricIds =
    initialSelections[selectedPlan.functionArea] ??
    selectedPlan.metrics.slice(0, 1).map((metric) => metric.id);
  const defaultHasBlueprintMetric = defaultMetricIds.some((metricId) =>
    metricId.startsWith("bridge-")
  );
  const storedHasBlueprintMetric = storedMetricIds.some((metricId) =>
    metricId.startsWith("bridge-")
  );
  const selectedMetricIds =
    storedMetricIds.length === 0 || (defaultHasBlueprintMetric && !storedHasBlueprintMetric)
      ? defaultMetricIds
      : storedMetricIds;
  const selectedMetrics = selectedPlan.metrics.filter((metric) =>
    selectedMetricIds.includes(metric.id)
  );

  const toggleMetric = (metricId: string) => {
    setSelectedMetricIdsByFunction((current) => {
      const nextIds = selectedMetricIds.includes(metricId)
        ? selectedMetricIds.filter((id) => id !== metricId)
        : [...selectedMetricIds, metricId];
      return {
        ...current,
        [selectedPlan.functionArea]: nextIds
      };
    });
  };

  return (
    <section
      className="ai-value-panel ai-value-question-metric-bridge-panel"
      aria-label="Outcome metric setup"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Metric Setup</p>
          <h2>Choose function and outcome metrics</h2>
          <p>
            Select the org function from the AI Fluency and VBD work, then choose
            the client-owned outcomes to watch over time.
          </p>
        </div>
        <StatusPill label={bridge.statusLabel} tone={bridge.available ? "good" : "warn"} />
      </div>

      <div className="ai-value-metric-selector">
        <div
          className="ai-value-metric-function-picker"
          role="group"
          aria-label="Select org function"
        >
          {functionPlans.map((plan) => (
            <button
              aria-label={plan.functionArea}
              aria-pressed={plan.functionArea === selectedPlan.functionArea}
              className={
                plan.functionArea === selectedPlan.functionArea
                  ? "ai-value-metric-function active"
                  : "ai-value-metric-function"
              }
              key={plan.functionArea}
              onClick={() => setSelectedFunction(plan.functionArea)}
              type="button"
            >
              <strong>{plan.functionArea}</strong>
              <span>{plan.quadrantLabel}</span>
            </button>
          ))}
        </div>

        <div className="ai-value-metric-builder">
          <div className="ai-value-metric-options">
            <div>
              <span className="ai-value-map-label">Best metrics for this function</span>
              <h3>{selectedPlan.functionArea}</h3>
              <p>{selectedPlan.vbdBaseline}</p>
            </div>

            <div className="ai-value-metric-choice-list">
              {selectedPlan.metrics.map((metric) => {
                const checked = selectedMetricIds.includes(metric.id);
                return (
                  <label
                    className={
                      checked
                        ? "ai-value-metric-choice selected"
                        : "ai-value-metric-choice"
                    }
                    key={metric.id}
                  >
                    <input
                      checked={checked}
                      onChange={() => toggleMetric(metric.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{metric.name}</strong>
                      <small>{metric.valueRoute}</small>
                      <p>{metric.why}</p>
                    </span>
                    <em>{metric.watches}</em>
                  </label>
                );
              })}
            </div>
          </div>

          <section className="ai-value-metric-watch-plan" aria-label="VBD metric watch plan">
            <span className="ai-value-map-label">Selected watch plan</span>
            <h3>{selectedPlan.functionArea}</h3>
            <p>Compare selected outcomes against Velocity, Breadth, and Depth movement over time.</p>
            {selectedMetrics.length > 0 ? (
              <ul>
                {selectedMetrics.map((metric) => (
                  <li key={metric.id}>
                    <strong>{metric.name}</strong>
                    <span>
                      {metric.sourceSystem} · {metric.measurementUnit} · {metric.owner}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Choose at least one client-owned metric for this function.</p>
            )}
          </section>
        </div>
      </div>

      {bridge.items.length > 0 ? (
        <section className="ai-value-question-metric-list" aria-label="Blueprint metric context">
          {bridge.items.map((item) => (
            <article className="ai-value-question-metric-item" key={item.id}>
              <div className="ai-value-map-grid">
                <div className="ai-value-map-cell ai-value-map-cell-wide">
                  <span className="ai-value-map-label">Sponsor question</span>
                  <strong>{item.sponsorQuestion}</strong>
                  <p>{item.successMeasure}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Outcome to measure</span>
                  <strong>{item.metricName}</strong>
                  <p>{item.valueRouteLabel}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Customer data source</span>
                  <strong>{item.sourceSystem}</strong>
                  <p>{item.measurementUnit}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Comparison window</span>
                  <p>{item.baselineRule}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Data owner</span>
                  <p>{item.owner}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Evidence status</span>
                  <p>{item.evidenceStatus}</p>
                </div>
                <div className="ai-value-map-cell ai-value-map-cell-wide">
                  <span className="ai-value-map-label">Allowed value language</span>
                  <p>{item.allowedClaimLevel}</p>
                  <small>{item.feedsNext}</small>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p>
          Add the client success measure, selected metric, data owner, and comparison window
          before Evidence Readiness can start.
        </p>
      )}
    </section>
  );
};
