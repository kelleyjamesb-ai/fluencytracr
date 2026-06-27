export const AI_VALUE_UI_VIEW_MODEL_STATE_IDS = [
  "NO_BLUEPRINT",
  "BLUEPRINT_RECEIVED",
  "METRICS_RECOMMENDED",
  "MEASUREMENT_PLAN_DRAFTED",
  "MEASUREMENT_PLAN_APPROVED",
  "DATA_COLLECTION_PLANNING_READY",
  "SOURCE_PACKAGE_COLLECTION_READY",
  "COMPARISON_DESIGN_REVIEWED",
  "EVIDENCE_ALIGNMENT_HELD",
  "EVIDENCE_ALIGNMENT_PARTIAL",
  "EVIDENCE_ALIGNMENT_ALIGNED",
  "EVIDENCE_ALIGNMENT_DIVERGENT",
  "MODEL_REVIEW_BLOCKED"
] as const;

export type AiValueUiViewModelStateId =
  (typeof AI_VALUE_UI_VIEW_MODEL_STATE_IDS)[number];

export type AiValueUiViewModelInputRecord = Record<string, unknown>;

export interface AiValueUiViewModelAdapterInput {
  measurementJourneyStateModel?: AiValueUiViewModelInputRecord | null;
  upstreamPosture?: AiValueUiViewModelInputRecord | null;
}

export interface AiValueUiViewModel {
  journey_state_id: AiValueUiViewModelStateId;
  model_review_posture: "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE";
  status_label: string;
  status_description: string;
  progress_step_index: number;
  progress_step_total: number;
  next_action_label: string;
  next_action_description: string;
  user_should_do_next: string;
  blocked_claims: string[];
  not_yet_evidence: string[];
  visible_evidence_streams: string[];
  missing_requirements: string[];
  held_requirements: string[];
  suppressed_requirements: string[];
  governance_banner: string;
  allowed_user_message: string;
  blocked_language_message: string;
  source_state_summary: string[];
  can_show_blueprint: boolean;
  can_show_metrics: boolean;
  can_show_measurement_plan: boolean;
  can_show_data_collection_plan: boolean;
  can_show_source_package_status: boolean;
  can_show_comparison_design_status: boolean;
  can_show_evidence_alignment_status: boolean;
  can_show_model_review_status: boolean;
  can_show_confidence: false;
  can_show_probability: false;
  can_show_roi: false;
  can_show_productivity: false;
  can_show_causality: false;
  can_export: false;
  can_persist_customer_output: false;
}

interface UiStateDefinition {
  status_label: string;
  status_description: string;
  next_action_label: string;
  next_action_description: string;
  user_should_do_next: string;
}

const MODEL_REVIEW_POSTURE =
  "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE" as const;

const HIGH_LEVEL_EVIDENCE_STREAMS = [
  "AI Fluency Instrument (SED)",
  "VBD Observed Behavior",
  "Operational / Business Outcomes",
  "Governance & Review Status"
];

const BLOCKED_CLAIM_LABELS = [
  "Model outputs stay hidden.",
  "Stronger value statements stay held.",
  "Outcome interpretation stays review-only.",
  "Scoring views stay hidden.",
  "Internal payload details stay hidden.",
  "Download and saved-output actions stay disabled."
];

const NOT_YET_EVIDENCE_LABELS = [
  "Journey state",
  "Metric recommendations",
  "Measurement plan posture",
  "Collection package posture",
  "Comparison design review posture",
  "Aggregate alignment posture",
  "Model review posture"
];

const DEFAULT_MISSING_REQUIREMENTS = {
  NO_BLUEPRINT: ["Blueprint hypothesis"],
  BLUEPRINT_RECEIVED: ["Candidate metric recommendation"],
  METRICS_RECOMMENDED: ["Reviewer metric selection draft"],
  MEASUREMENT_PLAN_DRAFTED: ["Reviewer-approved measurement plan"],
  MEASUREMENT_PLAN_APPROVED: ["Aggregate data collection planning"],
  DATA_COLLECTION_PLANNING_READY: ["Reviewer-owned source package"],
  SOURCE_PACKAGE_COLLECTION_READY: ["Comparison design adequacy review"],
  COMPARISON_DESIGN_REVIEWED: ["Governed aggregate alignment inputs"],
  EVIDENCE_ALIGNMENT_HELD: ["Complete governed aggregate inputs"],
  EVIDENCE_ALIGNMENT_PARTIAL: ["Reviewer follow-up on incomplete aggregate inputs"],
  EVIDENCE_ALIGNMENT_ALIGNED: ["Governed diagnostics evidence for model review"],
  EVIDENCE_ALIGNMENT_DIVERGENT: ["Reviewer interpretation of divergent aggregate inputs"],
  MODEL_REVIEW_BLOCKED: ["Governed diagnostics sufficiency evidence"]
} satisfies Record<AiValueUiViewModelStateId, string[]>;

const UI_STATE_DEFINITIONS = {
  NO_BLUEPRINT: {
    status_label: "Blueprint Needed",
    status_description: "The measurement story starts after the Blueprint hypothesis is supplied.",
    next_action_label: "Add Blueprint hypothesis",
    next_action_description: "Capture the client hypothesis, value route, workflow scope, cohort, and approved metric library posture.",
    user_should_do_next: "Supply the Blueprint hypothesis and approved planning context."
  },
  BLUEPRINT_RECEIVED: {
    status_label: "Blueprint Received",
    status_description: "The Blueprint exists and metric recommendation planning is next.",
    next_action_label: "Recommend candidate metrics",
    next_action_description: "Use approved metric library posture to recommend aggregate metric options.",
    user_should_do_next: "Run candidate metric recommendation from approved metric libraries."
  },
  METRICS_RECOMMENDED: {
    status_label: "Metrics Recommended",
    status_description: "Candidate aggregate metrics are available as planning inputs only.",
    next_action_label: "Prepare metric-selection draft",
    next_action_description: "Choose one candidate for reviewed measurement-plan draft intake.",
    user_should_do_next: "Prepare the reviewer metric-selection draft."
  },
  MEASUREMENT_PLAN_DRAFTED: {
    status_label: "Measurement Plan Drafted",
    status_description: "A draft plan exists and still needs reviewer approval.",
    next_action_label: "Approve measurement plan",
    next_action_description: "Review the selected metric, direction, lag, windows, cohort, workflow identity, and aggregate grain.",
    user_should_do_next: "Complete reviewer approval for the measurement plan."
  },
  MEASUREMENT_PLAN_APPROVED: {
    status_label: "Measurement Plan Approved",
    status_description: "The approved plan is ready for aggregate data collection planning.",
    next_action_label: "Plan aggregate collection",
    next_action_description: "Define aggregate-only collection posture against the approved plan.",
    user_should_do_next: "Complete aggregate data collection planning."
  },
  DATA_COLLECTION_PLANNING_READY: {
    status_label: "Data Collection Planning Ready",
    status_description: "Collection planning is ready for reviewed source package preparation.",
    next_action_label: "Collect source package",
    next_action_description: "Collect only reviewed, aggregate-only comparison-design source package posture.",
    user_should_do_next: "Collect the reviewed comparison-design source package."
  },
  SOURCE_PACKAGE_COLLECTION_READY: {
    status_label: "Source Package Ready",
    status_description: "A reviewed source package is ready for comparison-design review.",
    next_action_label: "Review comparison design",
    next_action_description: "Run the comparison-design adequacy review against the collected source package.",
    user_should_do_next: "Run comparison-design adequacy review."
  },
  COMPARISON_DESIGN_REVIEWED: {
    status_label: "Comparison Design Reviewed",
    status_description: "Comparison design has been reviewed for source binding only.",
    next_action_label: "Review aggregate alignment",
    next_action_description: "Review stated, behavioral, and outcome aggregate inputs for internal posture.",
    user_should_do_next: "Complete aggregate alignment review."
  },
  EVIDENCE_ALIGNMENT_HELD: {
    status_label: "Evidence Alignment Held",
    status_description: "Aggregate alignment is held until governed aggregate inputs are complete.",
    next_action_label: "Complete governed aggregate inputs",
    next_action_description: "Supply reviewed stated, behavioral, and outcome aggregate inputs.",
    user_should_do_next: "Complete the missing governed aggregate inputs."
  },
  EVIDENCE_ALIGNMENT_PARTIAL: {
    status_label: "Evidence Partially Aligned",
    status_description: "Some aggregate inputs share context and some still need reviewer attention.",
    next_action_label: "Review partial posture",
    next_action_description: "Review which aggregate input streams remain incomplete or mismatched.",
    user_should_do_next: "Resolve the partial aggregate alignment posture."
  },
  EVIDENCE_ALIGNMENT_ALIGNED: {
    status_label: "Evidence Aligned for Review",
    status_description: "Reviewed aggregate inputs share the expected context for review only.",
    next_action_label: "Hold for model-review inputs",
    next_action_description: "Keep model review blocked until governed diagnostics evidence is supplied elsewhere.",
    user_should_do_next: "Do not start model review until governed diagnostics evidence exists."
  },
  EVIDENCE_ALIGNMENT_DIVERGENT: {
    status_label: "Evidence Divergent for Review",
    status_description: "Reviewed aggregate inputs need interpretation before model-review input.",
    next_action_label: "Review divergent posture",
    next_action_description: "Review the aggregate input posture before any model-review input is considered.",
    user_should_do_next: "Resolve the divergent aggregate alignment posture."
  },
  MODEL_REVIEW_BLOCKED: {
    status_label: "Model Review Blocked",
    status_description: "The journey has reached model-review posture, and governed diagnostics evidence is still missing.",
    next_action_label: "Complete diagnostics evidence",
    next_action_description: "Complete governed diagnostics sufficiency evidence outside this UI adapter.",
    user_should_do_next: "Complete governed diagnostics sufficiency evidence before model review."
  }
} satisfies Record<AiValueUiViewModelStateId, UiStateDefinition>;

const SOURCE_SUMMARY_LABELS = [
  ["Blueprint", "can_show_blueprint"],
  ["Metric options", "can_show_metrics"],
  ["Measurement plan", "can_show_measurement_plan"],
  ["Collection planning", "can_show_data_collection_plan"],
  ["Source package", "can_show_source_package_status"],
  ["Comparison design", "can_show_comparison_design_status"],
  ["Source-ref alignment", "can_show_evidence_alignment_status"],
  ["Model review", "can_show_model_review_status"]
] as const;

const UNSAFE_TEXT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bselect\b[\s\S]{0,120}\bfrom\b/i,
  /\bsql\b/i,
  /\b(raw_rows?|row[-_\s]?level|raw\s+event|raw\s+record)\b/i,
  /\b(user_id|employee_id|identifier|reviewer_name|source_ref|source_hash)\b/i,
  /\b(prompt|transcript)\b/i,
  /\bposterior\b/i,
  /\b(confidence|probability)\b/i,
  /\b(?:roi|finance|financial|economic|causal|causality|caused|attribution|productivity)\b/i,
  /\bcustomer[-_\s]?facing\b/i,
  /\b[a-f0-9]{64}\b/i,
  /\b(route|schema|persistence|export|live connector)\b/i
];

const REQUIRED_FALSE_MODEL_FIELDS = [
  "creates_evidence",
  "diagnostics_evidence_satisfied",
  "bayesian_readiness_authorized",
  "promotion_authorized",
  "posterior_interpretation_authorized",
  "confidence_probability_authorized",
  "customer_economic_output_authorized"
];

function isRecord(value: unknown): value is AiValueUiViewModelInputRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function compactText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text || null;
}

function isUnsafeText(value: unknown): boolean {
  const text = compactText(value);
  return !text || UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function safeLabel(value: unknown): string | null {
  const text = compactText(value);
  if (!text || isUnsafeText(text)) return null;
  return text;
}

function safeLabelList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const item of value) {
    const label = safeLabel(item);
    if (label) labels.push(label);
  }
  return labels;
}

function sourceStateId(model: AiValueUiViewModelInputRecord | null): string | null {
  const state = isRecord(model?.measurement_journey_state)
    ? model.measurement_journey_state
    : null;
  return compactText(state?.state_id);
}

function sourceModelHasUnsafeDisplayText(model: AiValueUiViewModelInputRecord | null): boolean {
  if (!model) return false;
  const state = isRecord(model.measurement_journey_state)
    ? model.measurement_journey_state
    : {};
  for (const field of [
    state.status_label,
    state.plain_language_description,
    state.user_should_do_next,
    state.next_action
  ]) {
    const text = compactText(field);
    if (text && isUnsafeText(text)) return true;
  }
  return false;
}

function sourceModelHasSafeGates(model: AiValueUiViewModelInputRecord | null): boolean {
  if (!model) return false;
  for (const field of REQUIRED_FALSE_MODEL_FIELDS) {
    if (model[field] !== false) return false;
  }
  for (const container of [model.blocked_outputs, model.feeds]) {
    if (!isRecord(container)) return false;
    for (const value of Object.values(container)) {
      if (value !== false) return false;
    }
  }
  return true;
}

function resolveStateId(
  model: AiValueUiViewModelInputRecord | null
): AiValueUiViewModelStateId {
  const stateId = sourceStateId(model);
  if (
    stateId &&
    (AI_VALUE_UI_VIEW_MODEL_STATE_IDS as readonly string[]).includes(stateId) &&
    !sourceModelHasUnsafeDisplayText(model) &&
    sourceModelHasSafeGates(model)
  ) {
    return stateId as AiValueUiViewModelStateId;
  }
  return "NO_BLUEPRINT";
}

function isAtLeast(stateId: AiValueUiViewModelStateId, minimum: AiValueUiViewModelStateId) {
  return (
    AI_VALUE_UI_VIEW_MODEL_STATE_IDS.indexOf(stateId) >=
    AI_VALUE_UI_VIEW_MODEL_STATE_IDS.indexOf(minimum)
  );
}

function visibility(stateId: AiValueUiViewModelStateId) {
  return {
    can_show_blueprint: isAtLeast(stateId, "BLUEPRINT_RECEIVED"),
    can_show_metrics: isAtLeast(stateId, "METRICS_RECOMMENDED"),
    can_show_measurement_plan: isAtLeast(stateId, "MEASUREMENT_PLAN_DRAFTED"),
    can_show_data_collection_plan: isAtLeast(stateId, "DATA_COLLECTION_PLANNING_READY"),
    can_show_source_package_status: isAtLeast(stateId, "SOURCE_PACKAGE_COLLECTION_READY"),
    can_show_comparison_design_status: isAtLeast(stateId, "COMPARISON_DESIGN_REVIEWED"),
    can_show_evidence_alignment_status: isAtLeast(stateId, "EVIDENCE_ALIGNMENT_HELD"),
    can_show_model_review_status: true
  };
}

function sourceSummary(flags: ReturnType<typeof visibility>): string[] {
  return SOURCE_SUMMARY_LABELS.map(([label, key]) =>
    `${label}: ${flags[key] ? "visible" : "held"}`
  );
}

function safeUpstreamRequirements(
  upstreamPosture: AiValueUiViewModelInputRecord | null,
  key: string
): string[] {
  return safeLabelList(upstreamPosture?.[key]);
}

export function buildAiValueUiViewModelAdapter({
  measurementJourneyStateModel = null,
  upstreamPosture = null
}: AiValueUiViewModelAdapterInput = {}): AiValueUiViewModel {
  const model = isRecord(measurementJourneyStateModel)
    ? measurementJourneyStateModel
    : null;
  const upstream = isRecord(upstreamPosture) ? upstreamPosture : null;
  const journeyStateId = resolveStateId(model);
  const definition = UI_STATE_DEFINITIONS[journeyStateId];
  const flags = visibility(journeyStateId);
  const upstreamMissing = safeUpstreamRequirements(upstream, "missing_requirements");
  const upstreamHeld = safeUpstreamRequirements(upstream, "held_requirements");
  const upstreamSuppressed = safeUpstreamRequirements(upstream, "suppressed_requirements");

  return {
    journey_state_id: journeyStateId,
    model_review_posture: MODEL_REVIEW_POSTURE,
    status_label: definition.status_label,
    status_description: definition.status_description,
    progress_step_index: AI_VALUE_UI_VIEW_MODEL_STATE_IDS.indexOf(journeyStateId) + 1,
    progress_step_total: AI_VALUE_UI_VIEW_MODEL_STATE_IDS.length,
    next_action_label: definition.next_action_label,
    next_action_description: definition.next_action_description,
    user_should_do_next: definition.user_should_do_next,
    blocked_claims: [...BLOCKED_CLAIM_LABELS],
    not_yet_evidence: [...NOT_YET_EVIDENCE_LABELS],
    visible_evidence_streams: [...HIGH_LEVEL_EVIDENCE_STREAMS],
    missing_requirements:
      upstreamMissing.length > 0 ? upstreamMissing : [...DEFAULT_MISSING_REQUIREMENTS[journeyStateId]],
    held_requirements: upstreamHeld,
    suppressed_requirements: upstreamSuppressed,
    governance_banner:
      "Planning and review posture only. Model review remains blocked.",
    allowed_user_message:
      "Show planning status, reviewer action, aggregate alignment posture, and held requirements.",
    blocked_language_message:
      "Only planning and review posture language is visible.",
    source_state_summary: sourceSummary(flags),
    ...flags,
    can_show_confidence: false,
    can_show_probability: false,
    can_show_roi: false,
    can_show_productivity: false,
    can_show_causality: false,
    can_export: false,
    can_persist_customer_output: false
  };
}
