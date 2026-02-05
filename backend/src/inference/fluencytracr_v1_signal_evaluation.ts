import {
  FluencyTracrV1EventSchema,
  FluencyTracrV1Event,
  FluencyTracrV1EvaluationDecision
} from "@learnaire/shared";

import { enforceV1EvaluationDecision } from "../v1/evaluationDecision";

type WindowedCohortKey = {
  org_id: string;
  function_id: string;
  role_class: string;
  window_id: string;
};

type WindowEvaluationContext = {
  cohort: WindowedCohortKey;
  events: FluencyTracrV1Event[];
  schema_valid: boolean;
  ambiguity_present: boolean;
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

const buildDecision = (context: WindowEvaluationContext): FluencyTracrV1EvaluationDecision | null => {
  if (!context.schema_valid) {
    return null;
  }

  return enforceV1EvaluationDecision({
    schema_version: "FT_V1_2026_01",
    artifact_name: "FT_V1_EVALUATION_DECISION",
    org_id: context.cohort.org_id,
    function_id: context.cohort.function_id,
    role_class: context.cohort.role_class,
    window_id: context.cohort.window_id,
    ambiguity_flag: context.ambiguity_present,
    evidence_present: context.events.length > 0
  });
};

export const evaluateV1SignalDecisions = (
  rawEvents: unknown[]
): FluencyTracrV1EvaluationDecision[] => {
  const contexts = new Map<string, WindowEvaluationContext>();

  const ensureContext = (key: WindowedCohortKey): WindowEvaluationContext => {
    const mapKey = buildCohortWindowKey(key);
    const existing = contexts.get(mapKey);
    if (existing) {
      return existing;
    }
    const context: WindowEvaluationContext = {
      cohort: key,
      events: [],
      schema_valid: true,
      ambiguity_present: false
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

  const decisions: FluencyTracrV1EvaluationDecision[] = [];
  contexts.forEach((context) => {
    const decision = buildDecision(context);
    if (decision) {
      decisions.push(decision);
    }
  });

  return decisions;
};
