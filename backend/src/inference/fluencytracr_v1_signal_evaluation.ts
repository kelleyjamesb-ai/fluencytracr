import {
  FluencyTracrV1EventSchema,
  FluencyTracrV1Event,
  FluencyTracrV1EventName,
  deriveAivmVerdictFields,
  type AivmEvidenceGrade,
  type AivmValueType,
  type ReliabilityComponents
} from "@learnaire/shared";
import {
  computeReliabilityFactor,
  reliabilityComponentsFromCanonicalEvents
} from "../value_realization/reliability_factor";

type FluencyTracrV1SuppressReasonCode =
  | "SUPP_INTERNAL_INVARIANT_FAIL"
  | "SUPP_AMBIGUITY_PRESENT"
  | "SUPP_SMALL_TEAM_LT_5"
  | "SUPP_WINDOW_LT_60D"
  | "SUPP_NOT_ADJACENT_WINDOWS"
  | "SUPP_LT_2_BEHAVIOR_CLASSES"
  | "SUPP_SPARSE_DATA"
  | "SUPP_NO_QUALIFYING_EVIDENCE";

type FluencyTracrV1EvaluationDecision =
  | {
      schema_version: "FT_V1_2026_01";
      org_id: string;
      function_id: string;
      role_class: string;
      window_id: string;
      decision: "SURFACE";
      value_type: AivmValueType;
      evidence_grade: AivmEvidenceGrade;
      reliability_factor: number;
      reliability_components: ReliabilityComponents;
    }
  | {
      schema_version: "FT_V1_2026_01";
      org_id: string;
      function_id: string;
      role_class: string;
      window_id: string;
      decision: "SUPPRESS";
      value_type: AivmValueType;
      evidence_grade: AivmEvidenceGrade;
      reliability_factor: null;
      reliability_components: null;
      suppress_reason_code: FluencyTracrV1SuppressReasonCode;
    };

const MIN_COHORT_SIZE = 5;
const MIN_SURFACING_WINDOW_DAYS = 60;

const OPERATIONAL_EVENT_NAMES = new Set<FluencyTracrV1EventName>([
  "FT_V1_DISPOSITION_OBSERVED",
  "FT_V1_ITERATION_DEPTH_OBSERVED",
  "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
  "FT_V1_RECOVERY_OBSERVED",
  "FT_V1_ABANDONMENT_OBSERVED"
]);

type CohortKey = {
  org_id: string;
  function_id: string;
  role_class: string;
};

type WindowedCohortKey = CohortKey & {
  window_id: string;
};

type WindowBounds = {
  window_start: Date;
  window_end: Date;
};

type WindowEvaluationContext = {
  cohort: WindowedCohortKey;
  events: FluencyTracrV1Event[];
  schema_valid: boolean;
  ambiguity_present: boolean;
  cohort_size: number | null;
  window_bounds: WindowBounds | null;
};

export const buildCohortWindowKey = (key: WindowedCohortKey): string => {
  return [key.org_id, key.function_id, key.role_class, key.window_id].join("::");
};

export const parseCohortWindowKey = (value: string): WindowedCohortKey | null => {
  const [org_id, function_id, role_class, window_id] = value.split("::");
  if (!org_id || !function_id || !role_class || !window_id) {
    return null;
  }
  return { org_id, function_id, role_class, window_id };
};

const parseWindowId = (windowId: string): WindowBounds | null => {
  const match = windowId.match(/^(\d{4})-(\d{2})-(\d{2})__(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = match;
  const start = new Date(Date.UTC(Number(startYear), Number(startMonth) - 1, Number(startDay)));
  const end = new Date(Date.UTC(Number(endYear), Number(endMonth) - 1, Number(endDay)));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { window_start: start, window_end: end };
};

const windowLengthDays = (bounds: WindowBounds): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = bounds.window_end.getTime() - bounds.window_start.getTime();
  if (diffMs < 0) {
    return 0;
  }
  return Math.floor(diffMs / msPerDay) + 1;
};

const aivmFieldsForContext = (context: WindowEvaluationContext) =>
  deriveAivmVerdictFields({
    canonical_events: context.events,
    cohort_size: context.cohort_size,
    window_length_days: context.window_bounds ? windowLengthDays(context.window_bounds) : null
  });

const isAdjacentWindow = (previous: WindowBounds, current: WindowBounds): boolean => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return previous.window_end.getTime() + msPerDay === current.window_start.getTime();
};

const deriveBehaviorClasses = (events: FluencyTracrV1Event[]): Set<FluencyTracrV1EventName> => {
  return new Set(events.map((event) => event.event_name));
};

const hasOperationalEvidence = (events: FluencyTracrV1Event[]): boolean => {
  return events.some((event) => OPERATIONAL_EVENT_NAMES.has(event.event_name));
};

const failClosed = (
  context: WindowEvaluationContext
): FluencyTracrV1EvaluationDecision => {
  const aivm = aivmFieldsForContext(context);
  return {
    schema_version: "FT_V1_2026_01",
    org_id: context.cohort.org_id,
    function_id: context.cohort.function_id,
    role_class: context.cohort.role_class,
    window_id: context.cohort.window_id,
    decision: "SUPPRESS",
    value_type: aivm.value_type,
    evidence_grade: aivm.evidence_grade,
    reliability_factor: null,
    reliability_components: null,
    suppress_reason_code: "SUPP_INTERNAL_INVARIANT_FAIL"
  };
};

const suppressWith = (
  context: WindowEvaluationContext,
  reason: FluencyTracrV1SuppressReasonCode
): FluencyTracrV1EvaluationDecision => {
  const aivm = aivmFieldsForContext(context);
  return {
    schema_version: "FT_V1_2026_01",
    org_id: context.cohort.org_id,
    function_id: context.cohort.function_id,
    role_class: context.cohort.role_class,
    window_id: context.cohort.window_id,
    decision: "SUPPRESS",
    value_type: aivm.value_type,
    evidence_grade: aivm.evidence_grade,
    reliability_factor: null,
    reliability_components: null,
    suppress_reason_code: reason
  };
};

const surface = (context: WindowEvaluationContext): FluencyTracrV1EvaluationDecision => {
  const aivm = aivmFieldsForContext(context);
  const reliabilityComponents = reliabilityComponentsFromCanonicalEvents(context.events);
  return {
    schema_version: "FT_V1_2026_01",
    org_id: context.cohort.org_id,
    function_id: context.cohort.function_id,
    role_class: context.cohort.role_class,
    window_id: context.cohort.window_id,
    decision: "SURFACE",
    value_type: aivm.value_type,
    evidence_grade: aivm.evidence_grade,
    reliability_factor: computeReliabilityFactor(reliabilityComponents),
    reliability_components: reliabilityComponents
  };
};

const evaluateWindow = (
  context: WindowEvaluationContext,
  previous: WindowEvaluationContext | null,
  previousQualifying: boolean
): FluencyTracrV1EvaluationDecision => {
  if (!context.schema_valid || !context.window_bounds || context.cohort_size === null) {
    return failClosed(context);
  }
  if (context.ambiguity_present) {
    return suppressWith(context, "SUPP_AMBIGUITY_PRESENT");
  }
  if (context.cohort_size < MIN_COHORT_SIZE) {
    return suppressWith(context, "SUPP_SMALL_TEAM_LT_5");
  }
  const windowDays = windowLengthDays(context.window_bounds);
  if (windowDays < MIN_SURFACING_WINDOW_DAYS) {
    return suppressWith(context, "SUPP_WINDOW_LT_60D");
  }
  if (!previous || !previous.window_bounds || !previousQualifying) {
    return suppressWith(context, "SUPP_NOT_ADJACENT_WINDOWS");
  }
  if (!isAdjacentWindow(previous.window_bounds, context.window_bounds)) {
    return suppressWith(context, "SUPP_NOT_ADJACENT_WINDOWS");
  }

  const previousClasses = deriveBehaviorClasses(previous.events);
  const currentClasses = deriveBehaviorClasses(context.events);
  const combinedClasses = new Set([...previousClasses, ...currentClasses]);
  if (combinedClasses.size < 2) {
    return suppressWith(context, "SUPP_LT_2_BEHAVIOR_CLASSES");
  }

  if (context.events.length === 0 || previous.events.length === 0) {
    return suppressWith(context, "SUPP_SPARSE_DATA");
  }

  const currentOperational = hasOperationalEvidence(context.events);
  const previousOperational = hasOperationalEvidence(previous.events);
  if (!currentOperational || !previousOperational) {
    return suppressWith(context, "SUPP_NO_QUALIFYING_EVIDENCE");
  }

  // Gate 8: Ghost-use residual handling (never causal, never overrides ambiguity).
  return surface(context);
};

export const evaluateV1SignalDecisions = (
  rawEvents: unknown[],
  cohortSizesByWindow: Map<string, number>
): FluencyTracrV1EvaluationDecision[] => {
  const contexts = new Map<string, WindowEvaluationContext>();

  const ensureContext = (key: WindowedCohortKey): WindowEvaluationContext => {
    const mapKey = buildCohortWindowKey(key);
    const existing = contexts.get(mapKey);
    if (existing) {
      return existing;
    }
    const window_bounds = parseWindowId(key.window_id);
    const context: WindowEvaluationContext = {
      cohort: key,
      events: [],
      schema_valid: true,
      ambiguity_present: false,
      cohort_size: null,
      window_bounds
    };
    contexts.set(mapKey, context);
    return context;
  };

  rawEvents.forEach((event) => {
    const parsed = FluencyTracrV1EventSchema.safeParse(event);
    if (parsed.success) {
      const key = {
        org_id: parsed.data.org_id,
        function_id: parsed.data.function_id,
        role_class: parsed.data.role_class,
        window_id: parsed.data.window_id
      };
      const context = ensureContext(key);
      context.events.push(parsed.data);
      if (parsed.data.ambiguity_flag) {
        context.ambiguity_present = true;
      }
      return;
    }

    if (typeof event !== "object" || event === null) {
      return;
    }
    const maybeEvent = event as Partial<WindowedCohortKey>;
    if (
      typeof maybeEvent.org_id === "string" &&
      typeof maybeEvent.function_id === "string" &&
      typeof maybeEvent.role_class === "string" &&
      typeof maybeEvent.window_id === "string"
    ) {
      const context = ensureContext({
        org_id: maybeEvent.org_id,
        function_id: maybeEvent.function_id,
        role_class: maybeEvent.role_class,
        window_id: maybeEvent.window_id
      });
      context.schema_valid = false;
    }
  });

  contexts.forEach((context) => {
    const key = buildCohortWindowKey(context.cohort);
    const size = cohortSizesByWindow.get(key);
    if (typeof size === "number") {
      context.cohort_size = size;
    }
  });

  cohortSizesByWindow.forEach((cohort_size, key) => {
    const parsed = parseCohortWindowKey(key);
    if (!parsed) {
      return;
    }
    const context = ensureContext(parsed);
    context.cohort_size = cohort_size;
  });

  const byCohort = new Map<string, WindowEvaluationContext[]>();
  contexts.forEach((context) => {
    const cohortKey = [context.cohort.org_id, context.cohort.function_id, context.cohort.role_class].join(
      "::"
    );
    const list = byCohort.get(cohortKey) ?? [];
    list.push(context);
    byCohort.set(cohortKey, list);
  });

  const decisions: FluencyTracrV1EvaluationDecision[] = [];

  byCohort.forEach((cohortContexts) => {
    const sorted = [...cohortContexts].sort((a, b) => {
      const aStart = a.window_bounds?.window_start.getTime() ?? 0;
      const bStart = b.window_bounds?.window_start.getTime() ?? 0;
      return aStart - bStart;
    });

    const qualifyingFlags = new Map<string, boolean>();
    sorted.forEach((context) => {
      const qualifies =
        context.schema_valid &&
        !context.ambiguity_present &&
        context.cohort_size !== null &&
        context.cohort_size >= MIN_COHORT_SIZE &&
        context.window_bounds !== null &&
        windowLengthDays(context.window_bounds) >= MIN_SURFACING_WINDOW_DAYS;
      qualifyingFlags.set(buildCohortWindowKey(context.cohort), qualifies);
    });

    sorted.forEach((context, index) => {
      const previous = index > 0 ? sorted[index - 1] : null;
      const previousQualifying = previous
        ? qualifyingFlags.get(buildCohortWindowKey(previous.cohort)) ?? false
        : false;
      decisions.push(evaluateWindow(context, previous, previousQualifying));
    });
  });

  return decisions;
};
