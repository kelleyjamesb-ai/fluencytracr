import {
  CoverageSummary,
  FluencyEvent,
  FluencyPattern,
  FluencyPatternName,
  FluencyScope,
  FluencyWindow,
  RiskClass
} from "@learnaire/shared";

export const WINDOW_DAYS: Record<FluencyWindow, number> = {
  "60d": 60,
  "3m": 90,
  "6m": 180,
  "12m": 365
};

export const MIN_COHORT_SIZE = Number(process.env.MIN_COHORT_SIZE ?? 5);
export const COVERAGE_THRESHOLD = Number(process.env.COVERAGE_THRESHOLD ?? 0.5);

export const windowStart = (window: FluencyWindow, now = new Date()) => {
  const start = new Date(now);
  start.setDate(start.getDate() - WINDOW_DAYS[window]);
  return start;
};

export const filterEventsByWindow = (events: FluencyEvent[], window: FluencyWindow, now = new Date()) => {
  const start = windowStart(window, now);
  return events.filter((event) => {
    const ts = new Date(event.timestamp);
    return !Number.isNaN(ts.getTime()) && ts >= start && ts <= now;
  });
};

export const filterEventsByScope = (events: FluencyEvent[], scope: FluencyScope) => {
  if (scope === "org") {
    return events;
  }
  const prefix = `${scope}:`;
  return events.filter((event) => event.org_unit?.startsWith(prefix));
};

export const getCohortSize = (events: FluencyEvent[]) => {
  return new Set(events.map((event) => event.workflow_id)).size;
};

const riskContext = (events: FluencyEvent[]): RiskClass => {
  const counts = { low: 0, medium: 0, high: 0 };
  events.forEach((event) => {
    counts[event.risk_class] += 1;
  });
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "medium") as RiskClass;
};

const baseMetrics = (events: FluencyEvent[]) => {
  const outputEvents = events.filter((event) => event.event_type === "ai_output_disposition");
  const recoveryEvents = events.filter((event) => event.event_type === "ai_recovery_loop");
  const verificationSignals = events.filter((event) => event.event_type === "verification_signal");
  const abandonmentEvents = events.filter((event) => event.event_type === "ai_abandonment");
  const acceptance = outputEvents.filter((event) => event.disposition === "accepted").length;
  const edited = outputEvents.filter((event) => event.disposition === "edited").length;
  const heavyEdits = outputEvents.filter((event) => event.edit_distance_bucket === "heavy").length;
  const rejection = outputEvents.filter((event) => event.disposition === "rejected").length;
  const abandonment = abandonmentEvents.length + outputEvents.filter((event) => event.disposition === "abandoned").length;
  const verificationPresent = outputEvents.filter((event) => event.verification_present).length;
  const recoveryEscalations = recoveryEvents.filter((event) => event.recovery_type === "escalation").length;
  const recoveryCycles = recoveryEvents.reduce((acc, event) => acc + event.cycles, 0);
  const outputCount = Math.max(outputEvents.length, 1);
  const totalCount = Math.max(events.length, 1);

  return {
    outputEvents,
    recoveryEvents,
    verificationSignals,
    abandonmentEvents,
    acceptanceRate: acceptance / outputCount,
    editRate: edited / outputCount,
    heavyEditRate: heavyEdits / outputCount,
    rejectionRate: rejection / outputCount,
    abandonmentRate: abandonment / totalCount,
    verificationRate: (verificationPresent + verificationSignals.length) / outputCount,
    recoveryRate: recoveryEvents.length / totalCount,
    recoveryEscalationRate: recoveryEvents.length ? recoveryEscalations / recoveryEvents.length : 0,
    averageRecoveryCycles: recoveryEvents.length ? recoveryCycles / recoveryEvents.length : 0,
    outputCount,
    totalCount
  };
};

const deriveCoverage = (events: FluencyEvent[]) => {
  const cohortSize = Math.max(getCohortSize(events), 1);
  const expectedSignals = cohortSize * 4;
  return Math.min(1, events.length / expectedSignals);
};

const deriveConfidence = (totalEvents: number, coverage: number) => {
  if (totalEvents >= 60 && coverage >= 0.7) {
    return "High";
  }
  if (totalEvents >= 20 && coverage >= 0.4) {
    return "Medium";
  }
  return null;
};

const deriveSignalStatus = (totalEvents: number) => {
  if (totalEvents >= 80) {
    return "Sustained Pattern";
  }
  if (totalEvents >= 40) {
    return "Observed Behavioral Shift";
  }
  return "Emerging Pattern";
};

const patternTemplates: Record<
  FluencyPatternName,
  {
    what_we_see: string;
    might_suggest: string;
    does_not_mean: string;
    recommended_posture: "Scale" | "Stabilize" | "Study";
  }
> = {
  "Calibrated Fluency": {
    what_we_see:
      "Accepted outputs appear alongside regular verification touchpoints and light edits across the window.",
    might_suggest:
      "This signal may reflect steady calibration between automation and human review.",
    does_not_mean:
      "This does NOT mean outcomes are guaranteed or that any group is ahead of another.",
    recommended_posture: "Scale"
  },
  "Blind Efficiency": {
    what_we_see: "Acceptance rates appear high while verification signals remain limited.",
    might_suggest:
      "This signal may reflect a speed-first flow with lighter verification coverage.",
    does_not_mean:
      "This does NOT mean outputs are correct or that scrutiny is unnecessary.",
    recommended_posture: "Study"
  },
  "Recovery Maturity": {
    what_we_see: "Recovery loops appear with resolution and limited escalation.",
    might_suggest:
      "This signal may reflect maturing correction habits when automation needs adjustment.",
    does_not_mean:
      "This does NOT mean issues will stop appearing or that attention is no longer needed.",
    recommended_posture: "Stabilize"
  },
  "Friction Loop": {
    what_we_see: "Repeated edits or recovery cycles cluster in the current window.",
    might_suggest: "This signal may reflect friction in prompts, handoffs, or verification steps.",
    does_not_mean:
      "This does NOT mean any individual or small team is struggling.",
    recommended_posture: "Study"
  },
  "Undertrust Avoidance": {
    what_we_see: "Verification and abandonment signals rise alongside rejections.",
    might_suggest:
      "This signal may reflect cautious adoption in higher-risk moments.",
    does_not_mean:
      "This does NOT mean the system is unsafe or that the approach should be paused.",
    recommended_posture: "Stabilize"
  }
};

export const derivePatterns = (events: FluencyEvent[], window: FluencyWindow): FluencyPattern[] => {
  const metrics = baseMetrics(events);
  const coverage = deriveCoverage(events);
  const confidence = deriveConfidence(metrics.totalCount, coverage);

  if (!confidence) {
    return [];
  }

  const signalStatus = deriveSignalStatus(metrics.totalCount);
  const risk = riskContext(events);
  const patterns: FluencyPattern[] = [];

  const buildPattern = (name: FluencyPatternName) => {
    const template = patternTemplates[name];
    patterns.push({
      pattern_name: name,
      signal_status: signalStatus,
      confidence,
      window,
      risk_context: risk,
      coverage,
      what_we_see: template.what_we_see,
      might_suggest: template.might_suggest,
      does_not_mean: template.does_not_mean,
      recommended_posture: template.recommended_posture
    });
  };

  if (metrics.acceptanceRate >= 0.6 && metrics.verificationRate >= 0.4 && metrics.heavyEditRate <= 0.3) {
    buildPattern("Calibrated Fluency");
  }
  if (metrics.acceptanceRate >= 0.6 && metrics.verificationRate <= 0.15) {
    buildPattern("Blind Efficiency");
  }
  if (metrics.recoveryRate >= 0.08 && metrics.recoveryEscalationRate <= 0.2) {
    buildPattern("Recovery Maturity");
  }
  if (metrics.heavyEditRate >= 0.4 || metrics.averageRecoveryCycles >= 3) {
    buildPattern("Friction Loop");
  }
  if (metrics.verificationRate >= 0.5 && metrics.abandonmentRate >= 0.15) {
    buildPattern("Undertrust Avoidance");
  }

  return patterns;
};

export const buildCoverageSummary = (events: FluencyEvent[], window: FluencyWindow): CoverageSummary => {
  const coverage = deriveCoverage(events);
  const metrics = baseMetrics(events);
  const total = Math.max(events.length, 1);
  const riskCounts = events.reduce(
    (acc, event) => {
      acc[event.risk_class] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  return {
    window,
    cohort_size: getCohortSize(events),
    coverage,
    verification_rate: metrics.verificationRate,
    risk_mix: {
      low: riskCounts.low / total,
      medium: riskCounts.medium / total,
      high: riskCounts.high / total
    }
  };
};
