import {
  TaskEpisode,
  FunctionWindowAggregate,
  SignalClass,
  SuppressionReason,
  AmbiguityState,
  AmbiguityReasonCode,
  IterationDepth,
  deriveAivmVerdictFields
} from "@learnaire/shared";

export const CONFIDENCE_SCHEMA_VERSION = "v1" as const;

const OBSERVATION_WINDOW_DAYS = 30;
const SURFACING_WINDOW_DAYS = 60;
const MIN_ELIGIBLE_CONTRIBUTORS = 5;
const MIN_POPULATION_EPISODES = 10;
const AMBIGUITY_RATE_THRESHOLD = 0.2;
const CALIBRATION_DOMINANCE_THRESHOLD = 0.7;

const LATENCY_INELIGIBLE_ROLE_CLASSES = new Set(["EXEC", "EXEC_VIEWER", "ADMIN"]);

export type EpisodeDisposition = "accepted" | "edited" | "rejected" | "abandoned";

export type AmbiguitySignals = {
  no_advance: boolean;
  timeout: boolean;
  conflict: boolean;
  instrumentation_gap: boolean;
};

export type WindowDefinition = {
  window_start: string;
  window_end: string;
};

export type AggregationInputs = {
  contributor_counts: Map<string, number>;
  parent_function_map?: Map<string, string>;
  ai_exposure_enabled: boolean;
  ai_amenable_functions: Set<string>;
  adjacency_signals_by_function?: Map<string, boolean>;
  dispositions_by_episode?: Map<string, EpisodeDisposition>;
  ambiguity_signals_by_episode?: Map<string, AmbiguitySignals>;
};

export type FunctionWindowMetrics = {
  org_id: string;
  function_id: string;
  window_start: string;
  window_end: string;
  population_episodes: number;
  non_ambiguous_episodes: number;
  ambiguity_rate: number;
  signal_classes: SignalClass[];
  eligible_contributors: number;
  rolled_up: boolean;
  calibration_present: boolean;
  verification_present: boolean;
  recovery_present: boolean;
  directed_iteration_present: boolean;
  aivm_events: Array<{
    event_name: string;
    abandonment_present?: boolean;
    verification_present?: boolean;
    recovery_present?: boolean;
    latency_ms?: number | null;
  }>;
};

export const isLatencyEligibleRole = (roleClass: string): boolean => {
  return !LATENCY_INELIGIBLE_ROLE_CLASSES.has(roleClass);
};

export const deriveIterationDepthLabel = (iterationCount: number): IterationDepth => {
  if (iterationCount <= 0) {
    return "None";
  }
  if (iterationCount <= 2) {
    return "Light";
  }
  return "Heavy";
};

const toDate = (value: string): Date => {
  return new Date(value);
};

const daysBetween = (start: string, end: string): number => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const buildAmbiguityState = (
  current: AmbiguityState,
  signals: AmbiguitySignals | undefined
): AmbiguityState => {
  if (current.status === "AMBIGUOUS") {
    return current;
  }
  if (!signals) {
    return current;
  }

  let reason: AmbiguityReasonCode | null = null;
  if (signals.instrumentation_gap) {
    reason = "INSTRUMENTATION";
  } else if (signals.conflict) {
    reason = "CONFLICT";
  } else if (signals.timeout) {
    reason = "TIMEOUT";
  } else if (signals.no_advance) {
    reason = "NO_ADVANCE";
  }

  if (!reason) {
    return current;
  }

  return {
    status: "AMBIGUOUS",
    reason_code: reason
  };
};

export const resolveEpisodeAmbiguity = (
  episode: TaskEpisode,
  signals: AmbiguitySignals | undefined
): TaskEpisode => {
  const ambiguity_state = buildAmbiguityState(episode.ambiguity_state, signals);
  return {
    ...episode,
    ambiguity_state,
    closure_reason: ambiguity_state.status === "AMBIGUOUS" ? "AMBIGUOUS" : episode.closure_reason
  };
};

const sanitizeLatency = (episode: TaskEpisode): TaskEpisode => {
  const shouldNullLatency =
    episode.ambiguity_state.status === "AMBIGUOUS" || !isLatencyEligibleRole(episode.role_class);
  if (!shouldNullLatency) {
    return episode;
  }
  return {
    ...episode,
    signal_primitives: {
      ...episode.signal_primitives,
      latency_ms: null
    }
  };
};

const filterEpisodesByWindow = (episodes: TaskEpisode[], window: WindowDefinition): TaskEpisode[] => {
  const start = toDate(window.window_start);
  const end = toDate(window.window_end);
  return episodes.filter((episode) => {
    const ts = toDate(episode.start_ts);
    return !Number.isNaN(ts.getTime()) && ts >= start && ts <= end;
  });
};

const deriveSignalClasses = (episodes: TaskEpisode[]): SignalClass[] => {
  const classes = new Set<SignalClass>();
  if (episodes.length > 0) {
    classes.add("INTERACTION");
  }
  if (episodes.some((episode) => episode.signal_primitives.iteration_count > 0)) {
    classes.add("ITERATION");
  }
  if (episodes.some((episode) => episode.signal_primitives.verification_present)) {
    classes.add("VERIFICATION");
  }
  if (episodes.some((episode) => episode.signal_primitives.recovery_present)) {
    classes.add("RECOVERY");
  }
  if (episodes.some((episode) => episode.signal_primitives.latency_ms !== null)) {
    classes.add("LATENCY");
  }
  if (episodes.some((episode) => episode.signal_primitives.abandonment)) {
    classes.add("ABANDONMENT");
  }
  return Array.from(classes);
};

const detectCalibration = (
  episodes: TaskEpisode[],
  dispositionsByEpisode: Map<string, EpisodeDisposition> | undefined
): boolean => {
  if (!dispositionsByEpisode || dispositionsByEpisode.size === 0) {
    return false;
  }
  const counts: Record<EpisodeDisposition, number> = {
    accepted: 0,
    edited: 0,
    rejected: 0,
    abandoned: 0
  };

  let total = 0;
  episodes.forEach((episode) => {
    const disposition = dispositionsByEpisode.get(episode.episode_id);
    if (!disposition) {
      return;
    }
    counts[disposition] += 1;
    total += 1;
  });

  if (total === 0) {
    return false;
  }

  const values = Object.values(counts);
  const maxShare = Math.max(...values) / total;
  const distinct = values.filter((value) => value > 0).length;
  return distinct >= 2 && maxShare <= CALIBRATION_DOMINANCE_THRESHOLD;
};

const detectDirectedIteration = (episodes: TaskEpisode[]): boolean => {
  return episodes.some(
    (episode) =>
      episode.signal_primitives.iteration_count > 0 && !episode.signal_primitives.abandonment
  );
};

const buildWindowMetrics = (
  episodes: TaskEpisode[],
  window: WindowDefinition,
  functionId: string,
  orgId: string,
  inputs: AggregationInputs,
  rolledUp: boolean,
  contributorCount: number
): FunctionWindowMetrics => {
  const nonAmbiguous = episodes.filter((episode) => episode.ambiguity_state.status === "CLEAR");
  const populationEpisodes = episodes.length;
  const nonAmbiguousEpisodes = nonAmbiguous.length;
  const ambiguityRate = populationEpisodes === 0
    ? 0
    : (populationEpisodes - nonAmbiguousEpisodes) / populationEpisodes;

  const signalClasses = deriveSignalClasses(nonAmbiguous);
  const calibrationPresent = detectCalibration(nonAmbiguous, inputs.dispositions_by_episode);
  const verificationPresent = nonAmbiguous.some(
    (episode) => episode.signal_primitives.verification_present
  );
  const recoveryPresent = nonAmbiguous.some((episode) => episode.signal_primitives.recovery_present);
  const directedIterationPresent = detectDirectedIteration(nonAmbiguous);
  const aivm_events = nonAmbiguous.flatMap((episode) => {
    const events: FunctionWindowMetrics["aivm_events"] = [
      {
        event_name: "FT_V1_ABANDONMENT_OBSERVED",
        abandonment_present: episode.signal_primitives.abandonment
      }
    ];
    if (episode.signal_primitives.latency_ms !== null) {
      events.push({
        event_name: "FT_V1_LATENCY_OBSERVED",
        latency_ms: episode.signal_primitives.latency_ms
      });
    }
    if (episode.signal_primitives.verification_present) {
      events.push({
        event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
        verification_present: true
      });
    }
    if (episode.signal_primitives.recovery_present) {
      events.push({
        event_name: "FT_V1_RECOVERY_OBSERVED",
        recovery_present: true
      });
    }
    return events;
  });

  return {
    org_id: orgId,
    function_id: functionId,
    window_start: window.window_start,
    window_end: window.window_end,
    population_episodes: populationEpisodes,
    non_ambiguous_episodes: nonAmbiguousEpisodes,
    ambiguity_rate: ambiguityRate,
    signal_classes: signalClasses,
    eligible_contributors: contributorCount,
    rolled_up: rolledUp,
    calibration_present: calibrationPresent,
    verification_present: verificationPresent,
    recovery_present: recoveryPresent,
    directed_iteration_present: directedIterationPresent,
    aivm_events
  };
};

const buildSuppressionDecision = (
  metrics: FunctionWindowMetrics,
  previous: FunctionWindowMetrics | null
): { decision: "SURFACE" | "SUPPRESS"; suppression_reason: SuppressionReason | null } => {
  const observationDays = daysBetween(metrics.window_start, metrics.window_end);
  const surfacingDays = observationDays;
  const nonLatencyClasses = metrics.signal_classes.filter(
    (signalClass) => signalClass !== "LATENCY" && signalClass !== "INTERACTION"
  );
  const hasSufficientSignalClasses =
    metrics.signal_classes.length >= 2 && nonLatencyClasses.length >= 1;

  if (observationDays < OBSERVATION_WINDOW_DAYS) {
    return { decision: "SUPPRESS", suppression_reason: "INSUFFICIENT_TIME" };
  }
  if (surfacingDays < SURFACING_WINDOW_DAYS) {
    return { decision: "SUPPRESS", suppression_reason: "INSUFFICIENT_TIME" };
  }
  if (metrics.ambiguity_rate > AMBIGUITY_RATE_THRESHOLD) {
    return { decision: "SUPPRESS", suppression_reason: "HIGH_AMBIGUITY" };
  }
  if (!hasSufficientSignalClasses) {
    return { decision: "SUPPRESS", suppression_reason: "NO_CONVERGENCE" };
  }

  const populationInsufficient =
    metrics.eligible_contributors < MIN_ELIGIBLE_CONTRIBUTORS ||
    metrics.non_ambiguous_episodes < MIN_POPULATION_EPISODES;
  if (populationInsufficient) {
    return { decision: "SUPPRESS", suppression_reason: "INSUFFICIENT_VOLUME" };
  }

  const previousNonLatency = previous
    ? previous.signal_classes.filter(
      (signalClass) => signalClass !== "LATENCY" && signalClass !== "INTERACTION"
    )
    : [];
  const previousHasSufficientClasses =
    previous !== null && previous.signal_classes.length >= 2 && previousNonLatency.length >= 1;
  const convergenceMet =
    previousHasSufficientClasses &&
    previous !== null &&
    previous.ambiguity_rate <= AMBIGUITY_RATE_THRESHOLD;
  if (!convergenceMet) {
    return { decision: "SUPPRESS", suppression_reason: "NO_CONVERGENCE" };
  }

  const baselineUnstable =
    previous !== null &&
    (previous.signal_classes.length !== metrics.signal_classes.length ||
      metrics.signal_classes.some((signalClass) => !previous.signal_classes.includes(signalClass)));
  if (baselineUnstable) {
    return { decision: "SUPPRESS", suppression_reason: "BASELINE_UNSTABLE" };
  }

  return { decision: "SURFACE", suppression_reason: null };
};

const isPositiveEvidencePersistent = (
  current: FunctionWindowMetrics,
  previous: FunctionWindowMetrics | null
): boolean => {
  if (!previous) {
    return false;
  }

  const calibration = current.calibration_present && previous.calibration_present;
  const verification = current.verification_present && previous.verification_present;
  const recovery = current.recovery_present && previous.recovery_present;
  const directed = current.directed_iteration_present && previous.directed_iteration_present;

  return calibration || verification || recovery || directed;
};

const ghostUseEligible = (
  current: FunctionWindowMetrics,
  previous: FunctionWindowMetrics | null,
  inputs: AggregationInputs
): boolean => {
  if (!inputs.ai_exposure_enabled) {
    return false;
  }
  if (!inputs.ai_amenable_functions.has(current.function_id)) {
    return false;
  }
  const adjacency = inputs.adjacency_signals_by_function?.get(current.function_id) ?? false;
  if (!adjacency) {
    return false;
  }
  if (current.ambiguity_rate > AMBIGUITY_RATE_THRESHOLD) {
    return false;
  }
  if (!previous) {
    return false;
  }
  return previous.ambiguity_rate <= AMBIGUITY_RATE_THRESHOLD;
};

const resolveFunctionTarget = (
  functionId: string,
  inputs: AggregationInputs
): { targetFunctionId: string; rolledUp: boolean } => {
  const count = inputs.contributor_counts.get(functionId) ?? 0;
  if (count >= MIN_ELIGIBLE_CONTRIBUTORS) {
    return { targetFunctionId: functionId, rolledUp: false };
  }
  const parent = inputs.parent_function_map?.get(functionId);
  if (parent) {
    const parentCount = inputs.contributor_counts.get(parent) ?? 0;
    if (parentCount >= MIN_ELIGIBLE_CONTRIBUTORS) {
      return { targetFunctionId: parent, rolledUp: true };
    }
  }
  return { targetFunctionId: functionId, rolledUp: false };
};

export const aggregateFunctionWindows = (
  episodes: TaskEpisode[],
  windows: WindowDefinition[],
  inputs: AggregationInputs
): FunctionWindowAggregate[] => {
  const aggregates: FunctionWindowAggregate[] = [];
  const previousMetricsByFunction = new Map<string, { metrics: FunctionWindowMetrics; index: number }>();

  const preparedEpisodes = episodes.map((episode) => {
    const signals = inputs.ambiguity_signals_by_episode?.get(episode.episode_id);
    const resolved = resolveEpisodeAmbiguity(episode, signals);
    return sanitizeLatency(resolved);
  });

  const sortedWindows = [...windows].sort((a, b) => {
    return toDate(a.window_start).getTime() - toDate(b.window_start).getTime();
  });

  sortedWindows.forEach((window, windowIndex) => {
    const episodesInWindow = filterEpisodesByWindow(preparedEpisodes, window);
    const byFunction = new Map<string, TaskEpisode[]>();
    const rolledUpFunctions = new Set<string>();
    const suppressedChildren = new Map<string, { orgId: string; functionId: string }>();

    episodesInWindow.forEach((episode) => {
      const routing = resolveFunctionTarget(episode.function_id, inputs);
      if (routing.rolledUp) {
        rolledUpFunctions.add(routing.targetFunctionId);
        suppressedChildren.set(episode.function_id, {
          orgId: episode.org_id,
          functionId: episode.function_id
        });
      }
      const targetId = routing.targetFunctionId;
      const list = byFunction.get(targetId) ?? [];
      list.push(episode);
      byFunction.set(targetId, list);
    });

    const metricsByFunction = new Map<string, FunctionWindowMetrics>();

    byFunction.forEach((functionEpisodes, functionId) => {
      const orgId = functionEpisodes[0]?.org_id ?? "";
      const contributorCount = inputs.contributor_counts.get(functionId) ?? 0;
      const rolledUp = rolledUpFunctions.has(functionId);
      const metrics = buildWindowMetrics(
        functionEpisodes,
        window,
        functionId,
        orgId,
        inputs,
        rolledUp,
        contributorCount
      );
      metricsByFunction.set(functionId, metrics);
    });

    const sortedFunctionIds = Array.from(metricsByFunction.keys()).sort();

    sortedFunctionIds.forEach((functionId) => {
      const metrics = metricsByFunction.get(functionId);
      if (!metrics) {
        return;
      }
      const previousEntry = previousMetricsByFunction.get(functionId);
      const previous =
        previousEntry && previousEntry.index === windowIndex - 1 ? previousEntry.metrics : null;
      const positiveEvidence = isPositiveEvidencePersistent(metrics, previous);
      const decision = buildSuppressionDecision(metrics, previous);
      const ghostUseEvaluated = !positiveEvidence && ghostUseEligible(metrics, previous, inputs);
      const aivm = deriveAivmVerdictFields({
        canonical_events: metrics.aivm_events,
        cohort_size: metrics.eligible_contributors,
        window_length_days: daysBetween(metrics.window_start, metrics.window_end)
      });

      aggregates.push({
        org_id: metrics.org_id,
        function_id: metrics.function_id,
        schema_version: CONFIDENCE_SCHEMA_VERSION,
        window_start: metrics.window_start,
        window_end: metrics.window_end,
        decision: decision.decision,
        suppression_reason: decision.suppression_reason,
        value_type: aivm.value_type,
        evidence_grade: aivm.evidence_grade,
        signal_classes: metrics.signal_classes,
        positive_evidence_present: positiveEvidence,
        ghost_use_evaluated: ghostUseEvaluated,
        rolled_up: metrics.rolled_up,
        ambiguity_rate: metrics.ambiguity_rate,
        eligible_contributors: metrics.eligible_contributors,
        population_episodes: metrics.population_episodes,
        non_ambiguous_episodes: metrics.non_ambiguous_episodes
      });

      previousMetricsByFunction.set(functionId, { metrics, index: windowIndex });
    });

    suppressedChildren.forEach((child, functionId) => {
      const contributorCount = inputs.contributor_counts.get(functionId) ?? 0;
      aggregates.push({
        org_id: child.orgId,
        function_id: child.functionId,
        schema_version: CONFIDENCE_SCHEMA_VERSION,
        window_start: window.window_start,
        window_end: window.window_end,
        decision: "SUPPRESS",
        suppression_reason: "INSUFFICIENT_VOLUME",
        value_type: "UNCLASSIFIED",
        evidence_grade: "QUALITATIVE",
        signal_classes: [],
        positive_evidence_present: false,
        ghost_use_evaluated: false,
        rolled_up: true,
        ambiguity_rate: 0,
        eligible_contributors: contributorCount,
        population_episodes: 0,
        non_ambiguous_episodes: 0
      });
    });
  });

  return aggregates;
};
