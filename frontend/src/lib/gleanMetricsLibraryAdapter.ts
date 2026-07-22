export const CORE_BEHAVIORAL_MIN_COHORT = 5 as const;
export const CUSTOMER_VISIBLE_SERIES_MIN_COHORT = 10 as const;

export const gleanMetricsLibrarySeedCoverage = {
  status: "illustrative_seed" as const,
  functionAreas: ["Information Technology", "Customer Success"] as const,
  source: "Glean Metrics Library workflow-mapping wireframe"
};

export type WorkflowArchetypeId =
  | "context-retrieval"
  | "multi-source-synthesis"
  | "artifact-creation"
  | "review-quality-assurance"
  | "triage-resolution"
  | "question-answering-self-service"
  | "onboarding-ramp"
  | "cross-functional-handoff"
  | "planning-prioritization"
  | "execution-launch"
  | "risk-opportunity-detection"
  | "knowledge-lifecycle"
  | "communication-follow-up";

export interface WorkflowArchetype {
  id: WorkflowArchetypeId;
  name: string;
}

export interface GleanMetricDefinition {
  id: string;
  name: string;
  suggestedSourceCategories: string[];
  suggestedOwnerRole: string;
  grain: "aggregate_workflow_or_cohort";
  customerDefinitionRequired: true;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  functionLabel: string;
  archetypeIds: WorkflowArchetypeId[];
  steps: string[];
  metricIds: string[];
  signals: {
    functions: string[];
    objects: string[];
    changes: string[];
    metrics: string[];
  };
}

export interface HypothesisElements {
  function: string;
  businessObject: string;
  expectedChange: string;
  metricIntent: string;
}

export interface WorkflowMatch {
  id: string;
  name: string;
  functionLabel: string;
  archetypes: string[];
  steps: string[];
  metrics: GleanMetricDefinition[];
  matchedSignals: string[];
  matchScore: number;
  scoreBreakdown: {
    businessObject: number;
    metric: number;
    function: number;
    expectedChange: number;
  };
}

export interface HypothesisMatchResult {
  hypothesis: string;
  elements: HypothesisElements;
  candidates: WorkflowMatch[];
}

export const workflowArchetypes: WorkflowArchetype[] = [
  { id: "context-retrieval", name: "Context retrieval and preparation" },
  { id: "multi-source-synthesis", name: "Multi-source synthesis" },
  { id: "artifact-creation", name: "Artifact creation" },
  { id: "review-quality-assurance", name: "Review and quality assurance" },
  { id: "triage-resolution", name: "Triage and resolution" },
  { id: "question-answering-self-service", name: "Question answering and self-service" },
  { id: "onboarding-ramp", name: "Onboarding and ramp" },
  { id: "cross-functional-handoff", name: "Cross-functional handoff" },
  { id: "planning-prioritization", name: "Planning and prioritization" },
  { id: "execution-launch", name: "Execution and launch" },
  { id: "risk-opportunity-detection", name: "Risk and opportunity detection" },
  { id: "knowledge-lifecycle", name: "Knowledge lifecycle management" },
  { id: "communication-follow-up", name: "Communication and follow-up" }
];

export const gleanMetricRegistry: GleanMetricDefinition[] = [
  {
    id: "it-mttr",
    name: "Mean time to resolution",
    suggestedSourceCategories: ["IT service management"],
    suggestedOwnerRole: "IT service owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "it-first-contact-resolution",
    name: "First-contact resolution rate",
    suggestedSourceCategories: ["IT service management"],
    suggestedOwnerRole: "Service desk owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "it-ticket-aging",
    name: "Ticket aging",
    suggestedSourceCategories: ["IT service management"],
    suggestedOwnerRole: "IT operations owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "it-knowledge-utilization",
    name: "Knowledge-article utilization",
    suggestedSourceCategories: ["Knowledge management", "IT service management"],
    suggestedOwnerRole: "Knowledge program owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "it-knowledge-effectiveness",
    name: "Knowledge effectiveness",
    suggestedSourceCategories: ["Knowledge management", "IT service management"],
    suggestedOwnerRole: "Knowledge program owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "it-self-service-adoption",
    name: "Self-service adoption",
    suggestedSourceCategories: ["Service portal", "IT service management"],
    suggestedOwnerRole: "Digital workplace owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "cs-qbr-preparation-time",
    name: "QBR preparation time",
    suggestedSourceCategories: ["Customer relationship management", "Work management"],
    suggestedOwnerRole: "Customer Success operations owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "cs-qbr-follow-up-completion",
    name: "QBR follow-up completion",
    suggestedSourceCategories: ["Customer relationship management", "Work management"],
    suggestedOwnerRole: "Customer Success operations owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "cs-account-research-time",
    name: "Account research time",
    suggestedSourceCategories: ["Customer relationship management", "Support", "Product analytics"],
    suggestedOwnerRole: "Customer Success operations owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "cs-success-story-identification-time",
    name: "Success-story identification time",
    suggestedSourceCategories: ["Customer relationship management", "Customer success platform"],
    suggestedOwnerRole: "Customer outcomes owner",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  },
  {
    id: "cs-risk-identification-lead-time",
    name: "Risk-identification lead time",
    suggestedSourceCategories: ["Customer success platform", "Support", "Product analytics"],
    suggestedOwnerRole: "Customer Success leader",
    grain: "aggregate_workflow_or_cohort",
    customerDefinitionRequired: true
  }
];

const workflows: WorkflowDefinition[] = [
  {
    id: "it-incident-resolution",
    name: "IT incident resolution",
    functionLabel: "Information Technology",
    archetypeIds: ["triage-resolution", "context-retrieval", "knowledge-lifecycle"],
    steps: ["Intake and classify", "Retrieve knowledge and history", "Diagnose", "Verify", "Resolve or escalate", "Document"],
    metricIds: ["it-mttr", "it-first-contact-resolution", "it-ticket-aging"],
    signals: {
      functions: ["information technology", "service desk", "it support"],
      objects: ["incident", "incidents", "ticket", "tickets", "support case", "support cases", "service request", "service requests"],
      changes: ["faster", "reduce", "shorter", "resolve", "resolution"],
      metrics: ["mttr", "mean time to resolution", "first contact resolution", "ticket aging", "resolution time"]
    }
  },
  {
    id: "it-knowledge-retrieval",
    name: "Verified IT knowledge retrieval",
    functionLabel: "Information Technology",
    archetypeIds: ["context-retrieval", "knowledge-lifecycle", "review-quality-assurance"],
    steps: ["Frame the question", "Retrieve approved knowledge", "Check incident history", "Verify currency", "Apply or route"],
    metricIds: ["it-knowledge-utilization", "it-knowledge-effectiveness", "it-mttr"],
    signals: {
      functions: ["information technology", "service desk", "it support"],
      objects: ["knowledge", "article", "documentation", "incident history"],
      changes: ["faster", "verified", "accurate", "find", "retrieve"],
      metrics: ["knowledge utilization", "knowledge effectiveness", "resolution time", "mttr"]
    }
  },
  {
    id: "it-self-service",
    name: "Employee IT self-service",
    functionLabel: "Information Technology",
    archetypeIds: ["question-answering-self-service", "context-retrieval", "cross-functional-handoff"],
    steps: ["Capture the question", "Retrieve approved answer", "Verify applicability", "Resolve or create a ticket", "Route exceptions"],
    metricIds: ["it-self-service-adoption", "it-first-contact-resolution", "it-ticket-aging"],
    signals: {
      functions: ["information technology", "service desk", "it support", "employee support"],
      objects: ["self service", "question", "service request", "service requests", "ticket", "tickets"],
      changes: ["deflect", "faster", "resolve", "reduce"],
      metrics: ["self service adoption", "ticket volume", "first contact resolution"]
    }
  },
  {
    id: "cs-qbr-preparation",
    name: "Customer QBR preparation",
    functionLabel: "Customer Success",
    archetypeIds: ["multi-source-synthesis", "artifact-creation", "review-quality-assurance"],
    steps: ["Select account and review window", "Retrieve CRM, support, and adoption context", "Synthesize outcomes and risks", "Draft", "Verify", "Review"],
    metricIds: ["cs-qbr-preparation-time", "cs-account-research-time", "cs-risk-identification-lead-time"],
    signals: {
      functions: ["customer success", "csm", "account team", "customer outcomes"],
      objects: ["qbr", "qbrs", "quarterly business review", "account context", "business review"],
      changes: ["faster", "reduce", "improve", "prepare", "prepares", "preparation"],
      metrics: ["qbr preparation time", "account research time", "risk identification", "preparation time"]
    }
  },
  {
    id: "cs-qbr-follow-up",
    name: "Customer QBR follow-up",
    functionLabel: "Customer Success",
    archetypeIds: ["communication-follow-up", "cross-functional-handoff", "execution-launch"],
    steps: ["Capture decisions", "Assign customer-owned actions", "Verify owners", "Send follow-up", "Track aggregate completion"],
    metricIds: ["cs-qbr-follow-up-completion", "cs-risk-identification-lead-time"],
    signals: {
      functions: ["customer success", "csm", "account team"],
      objects: ["qbr", "qbrs", "business review", "follow up", "follow ups", "action item", "action items"],
      changes: ["complete", "faster", "improve", "follow up"],
      metrics: ["follow up completion", "completion rate", "risk identification"]
    }
  },
  {
    id: "cs-account-context",
    name: "Customer account context assembly",
    functionLabel: "Customer Success",
    archetypeIds: ["context-retrieval", "multi-source-synthesis", "risk-opportunity-detection"],
    steps: ["Select account", "Retrieve approved sources", "Reconcile account context", "Identify outcomes and risks", "Verify", "Hand off"],
    metricIds: ["cs-account-research-time", "cs-success-story-identification-time", "cs-risk-identification-lead-time"],
    signals: {
      functions: ["customer success", "csm", "account team", "customer outcomes"],
      objects: ["customer account", "customer accounts", "account context", "customer context", "success story", "risk"],
      changes: ["faster", "identify", "synthesize", "reduce"],
      metrics: ["account research time", "success story identification", "risk identification lead time"]
    }
  }
];

const archetypeNameById = new Map(workflowArchetypes.map((item) => [item.id, item.name]));
const metricById = new Map(gleanMetricRegistry.map((item) => [item.id, item]));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchedPhrases = (hypothesis: string, phrases: string[]) => {
  const boundedHypothesis = ` ${hypothesis} `;
  return phrases.filter((phrase) => boundedHypothesis.includes(` ${normalize(phrase)} `));
};

const firstMatch = (matches: string[], fallback: string) =>
  matches.length > 0 ? matches[0] : fallback;

const unsupportedFunctionPhrases = [
  "finance",
  "financial",
  "sales",
  "human resources",
  "hr",
  "people operations",
  "procurement",
  "legal",
  "compliance",
  "marketing",
  "engineering",
  "software development",
  "product management",
  "data analytics",
  "education",
  "training",
  "communications"
];

export const matchHypothesisToGleanWorkflows = (
  rawHypothesis: string,
  limit = 3
): HypothesisMatchResult => {
  const hypothesis = normalize(rawHypothesis);
  const hasItAcronym = /\bIT\b/.test(rawHypothesis);
  const scored = workflows.map((workflow, registryIndex) => {
    const functions = matchedPhrases(hypothesis, workflow.signals.functions);
    if (hasItAcronym && workflow.functionLabel === "Information Technology") {
      functions.push("IT");
    }
    const objects = matchedPhrases(hypothesis, workflow.signals.objects);
    const changes = matchedPhrases(hypothesis, workflow.signals.changes);
    const metrics = matchedPhrases(hypothesis, workflow.signals.metrics);
    const scoreBreakdown = {
      businessObject: objects.length * 4,
      metric: metrics.length * 3,
      function: functions.length * 2,
      expectedChange: changes.length
    };
    const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
    return { workflow, registryIndex, functions, objects, changes, metrics, score, scoreBreakdown };
  });
  const matchedFunctionLabels = new Set(
    scored
      .filter((item) => item.functions.length > 0)
      .map((item) => item.workflow.functionLabel)
  );
  const hasOneRecognizedFunction = matchedFunctionLabels.size === 1;
  const functionScan = hypothesis
    .replace(/\baccount research time\b/g, " ")
    .replace(/\bit support\b/g, " ")
    .replace(/\bsupport cases?\b/g, " ")
    .replace(/\bcustomer success operations\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hasUnsupportedFunction =
    matchedPhrases(functionScan, [
      ...unsupportedFunctionPhrases,
      "operations",
      "support",
      "research"
    ]).length > 0;
  const hasNegativeConstruction =
    /\b(?:not|never|neither|nor|cannot|avoid|hardly|without|prevent|prevented|prevents|except|unless|if|slower|longer|worse|worsen)\b|n['’]t\b|\bfail(?:s|ed)?\s+to\b|\bno\s+(?:reduction|improvement)\b/i.test(
      rawHypothesis
    );
  const hasAmbiguousDirection =
    /\b(?:increase|raise|lower|decrease|decline|drop|fall)\b/i.test(rawHypothesis);
  const hasAdverseMetricDirection =
    hasAmbiguousDirection ||
    /\breduce\s+(?:first contact resolution|knowledge effectiveness|self service adoption|follow up completion|qbr follow up completion)\b/i.test(
      hypothesis
    );
  const hasUnsupportedIntent = hasNegativeConstruction || hasAdverseMetricDirection;
  const ranked = scored
    .filter((item) =>
      hasOneRecognizedFunction &&
      !hasUnsupportedFunction &&
      !hasUnsupportedIntent &&
      item.functions.length > 0 &&
      item.objects.length > 0 &&
      (item.changes.length > 0 || item.metrics.length > 0)
    )
    .sort((left, right) => right.score - left.score || left.registryIndex - right.registryIndex)
    .slice(0, Math.max(0, Math.min(limit, 3)));

  const strongest = ranked[0];
  return {
    hypothesis: rawHypothesis.trim(),
    elements: {
      function: strongest?.workflow.functionLabel ?? "Not yet explicit",
      businessObject: firstMatch(strongest?.objects ?? [], "Not yet explicit"),
      expectedChange: firstMatch(strongest?.changes ?? [], "Not yet explicit"),
      metricIntent: firstMatch(strongest?.metrics ?? [], "Customer metric not yet explicit")
    },
    candidates: ranked.map(({ workflow, functions, objects, changes, metrics, score, scoreBreakdown }) => ({
      id: workflow.id,
      name: workflow.name,
      functionLabel: workflow.functionLabel,
      archetypes: workflow.archetypeIds.map((id) => archetypeNameById.get(id) ?? id),
      steps: workflow.steps,
      metrics: workflow.metricIds
        .map((id) => metricById.get(id))
        .filter((metric): metric is GleanMetricDefinition => Boolean(metric)),
      matchedSignals: [...functions, ...objects, ...changes, ...metrics],
      matchScore: score,
      scoreBreakdown
    }))
  };
};
