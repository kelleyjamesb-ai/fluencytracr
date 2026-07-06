import { useEffect, useMemo, useState } from "react";

import { fetchAiValueObject, listAiValueObjects } from "../lib/aiValueApi";

// The five dimensions shown to clients, mapped to engine construct keys.
const DIMENSIONS = [
  {
    key: "confidence",
    label: "Confidence",
    detail: "How ready people feel to use AI in real work."
  },
  {
    key: "usage_quality",
    label: "Usage Quality",
    detail: "Whether AI use is thoughtful, verified, and task-fit."
  },
  {
    key: "behavior_change",
    label: "Behavior Change",
    detail: "Where AI is starting to change how work gets done."
  },
  {
    key: "leadership_reinforcement",
    label: "Leadership Reinforcement",
    detail: "Whether managers and leaders are making AI adoption practical."
  },
  {
    key: "capability_growth",
    label: "Capability Growth",
    detail: "Which skills need reinforcement before workflow change can scale."
  }
] as const;

const SCALE_MAX = 5;
const toPercent = (mean: number) => Math.round((mean / SCALE_MAX) * 100);

interface CohortPayload {
  cohort_id?: string;
  respondent_count?: number;
  suppressed?: boolean;
  construct_scores?: Record<string, { mean?: number }>;
}

interface BaselinePayload {
  baseline_id?: string;
  cohorts?: CohortPayload[];
}

interface FunctionRow {
  label: string;
  respondents: number;
  percent: number;
}

interface AggregateResults {
  respondents: number;
  suppressedCohorts: number;
  overallPercent: number;
  dimensions: Array<{ key: string; label: string; detail: string; percent: number | null }>;
  strongest: string;
  growthEdge: string;
  functions: FunctionRow[];
}

const functionLabelFromBaselineId = (baselineId: string | undefined): string => {
  const slug = String(baselineId ?? "")
    .replace(/^fluency_baseline_/, "")
    .replace(/_kickoff$|_followup$/, "");
  const text = slug.replace(/_/g, " ").trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Function";
};

function aggregate(baselines: BaselinePayload[]): AggregateResults | null {
  const totals: Record<string, { weighted: number; weight: number }> = {};
  let respondents = 0;
  let suppressedCohorts = 0;
  const functions: FunctionRow[] = [];

  for (const baseline of baselines) {
    let functionRespondents = 0;
    let functionWeighted = 0;
    let functionWeight = 0;
    for (const cohort of baseline?.cohorts ?? []) {
      if (cohort.suppressed) {
        suppressedCohorts += 1;
        continue;
      }
      const count = Number(cohort.respondent_count ?? 0);
      if (!count || !cohort.construct_scores) continue;
      respondents += count;
      functionRespondents += count;
      for (const dimension of DIMENSIONS) {
        const mean = cohort.construct_scores[dimension.key]?.mean;
        if (typeof mean !== "number") continue;
        const entry = (totals[dimension.key] ??= { weighted: 0, weight: 0 });
        entry.weighted += mean * count;
        entry.weight += count;
        functionWeighted += mean * count;
        functionWeight += count;
      }
    }
    if (functionRespondents > 0 && functionWeight > 0) {
      functions.push({
        label: functionLabelFromBaselineId(baseline.baseline_id),
        respondents: functionRespondents,
        percent: toPercent(functionWeighted / functionWeight)
      });
    }
  }

  if (respondents === 0) return null;

  const dimensions = DIMENSIONS.map((dimension) => {
    const entry = totals[dimension.key];
    return {
      ...dimension,
      percent: entry && entry.weight > 0 ? toPercent(entry.weighted / entry.weight) : null
    };
  });
  const measured = dimensions.filter(
    (dimension): dimension is (typeof dimensions)[number] & { percent: number } =>
      dimension.percent !== null
  );
  if (measured.length === 0) return null;
  const overallPercent = Math.round(
    measured.reduce((sum, dimension) => sum + dimension.percent, 0) / measured.length
  );
  const strongest = measured.reduce((a, b) => (b.percent > a.percent ? b : a)).label;
  const growthEdge = measured.reduce((a, b) => (b.percent < a.percent ? b : a)).label;
  functions.sort((a, b) => b.percent - a.percent);

  return { respondents, suppressedCohorts, overallPercent, dimensions, strongest, growthEdge, functions };
}

const sessionRole = () => {
  try {
    return (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";
  } catch {
    return "ADMIN";
  }
};

export const FluencyBaselineResultsPanel = () => {
  const [baselines, setBaselines] = useState<BaselinePayload[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const role = sessionRole();
        const { objects } = await listAiValueObjects(role, "fluency_baseline");
        const valid = objects.filter((summary) => summary.valid);
        if (valid.length === 0) {
          if (!cancelled) setState("empty");
          return;
        }
        const details = await Promise.all(
          valid.map((summary) => fetchAiValueObject(role, "fluency_baseline", summary.object_id))
        );
        if (cancelled) return;
        const payloads = details
          .map((detail) => detail.payload as unknown as BaselinePayload)
          .filter((payload) => payload && Array.isArray(payload.cohorts));
        if (payloads.length === 0) {
          setState("empty");
          return;
        }
        setBaselines(payloads);
        setState("ready");
      } catch {
        if (!cancelled) setState("empty");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(
    () => (state === "ready" ? aggregate(baselines) : null),
    [state, baselines]
  );

  if (state === "loading") {
    return (
      <section
        className="ai-value-fluency-empty"
        aria-label="AI Fluency baseline status"
        aria-live="polite"
      >
        <strong>Loading aggregate AI Fluency baseline...</strong>
        <p>
          The workspace is checking for reviewed, aggregate baseline results
          before showing interpretation context.
        </p>
      </section>
    );
  }

  if (!results) {
    return (
      <section
        className="ai-value-fluency-empty"
        aria-label="AI Fluency baseline empty state"
        aria-live="polite"
      >
        <div>
          <strong>No aggregate AI Fluency baseline connected yet</strong>
          <p>
            Missing: reviewed, privacy-preserving baseline results for the
            selected organization or function. Why: this panel can support
            planning only after aggregate responses clear suppression and
            reviewer checks. Next action: create or connect the AI Fluency
            baseline in the previous stage, then return here to review the
            interpretation context.
          </p>
        </div>
        <div className="ai-value-client-question-grid">
          {DIMENSIONS.map((dimension) => (
            <article className="ai-value-client-question-card" key={dimension.label}>
              <span className="ai-value-map-label">What results tell us</span>
              <strong>{dimension.label}</strong>
              <p>{dimension.detail}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="ai-value-fluency-results">
      <div className="ai-value-fluency-headline">
        <div className="ai-value-fluency-overall" aria-label="Average fluency">
          <strong>{results.overallPercent}%</strong>
          <span>average fluency</span>
        </div>
        <div className="ai-value-map-grid ai-value-fluency-headline-facts">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Responses represented</span>
            <strong>{results.respondents.toLocaleString()}</strong>
            <p>
              Anonymous aggregate responses
              {results.suppressedCohorts > 0
                ? `; ${results.suppressedCohorts} small ${
                    results.suppressedCohorts === 1 ? "group" : "groups"
                  } withheld to protect privacy.`
                : "."}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Strongest signal</span>
            <strong>{results.strongest}</strong>
            <p>Momentum most ready to turn into repeatable practice.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Growth edge</span>
            <strong>{results.growthEdge}</strong>
            <p>The clearest place to unlock broader adoption.</p>
          </div>
        </div>
      </div>

      <div className="ai-value-fluency-dimensions">
        {results.dimensions.map((dimension) => (
          <div className="ai-value-fluency-dimension" key={dimension.label}>
            <div>
              <span className="ai-value-map-label">What results tell us</span>
              <strong>{dimension.label}</strong>
              <p>{dimension.detail}</p>
            </div>
            {dimension.percent !== null && (
              <div
                aria-label={`${dimension.label} ${dimension.percent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={dimension.percent}
                className="ai-value-fluency-dimension-percent"
                role="meter"
              >
                {dimension.percent}%
              </div>
            )}
          </div>
        ))}
      </div>

      {results.functions.length > 1 && (
        <div className="ai-value-fluency-functions">
          <span className="ai-value-map-label">Fluency by function</span>
          <ul>
            {results.functions.map((row) => (
              <li key={row.label}>
                <strong>{row.label}</strong>
                <span className="ai-value-fluency-function-value">
                  {row.percent}% · {row.respondents.toLocaleString()} responses
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
