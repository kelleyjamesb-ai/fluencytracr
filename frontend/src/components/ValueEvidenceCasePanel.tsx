import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { fetchAiValueObject, listAiValueObjects } from "../lib/aiValueApi";
import {
  readSelectedOutcomeMetricSelection,
  type SelectedOutcomeMetricSelection
} from "../lib/aiValueMetricSelection";

// Client-facing translations — internal tokens never reach the screen.
const EVIDENCE_LEVELS = [
  "MISSING",
  "DIRECTIONAL",
  "CAVEATED",
  "SUPPORTED",
  "STRONG",
  "BLOCKED"
] as const;

const evidenceLevelCopy: Record<string, { label: string; meaning: string; tone: "neutral" | "warn" | "good" }> = {
  MISSING: {
    label: "Evidence missing",
    meaning: "We can describe AI activity, but the customer outcome evidence is not in place yet.",
    tone: "neutral"
  },
  DIRECTIONAL: {
    label: "Directional",
    meaning: "Early signals move the right way, but the evidence has not been accepted yet.",
    tone: "warn"
  },
  CAVEATED: {
    label: "Caveated",
    meaning: "Accepted outcome evidence exists for this workflow, with open assumptions to resolve.",
    tone: "warn"
  },
  SUPPORTED: {
    label: "Supported",
    meaning: "Accepted outcome evidence and resolved assumptions support bounded movement.",
    tone: "good"
  },
  STRONG: {
    label: "Validated",
    meaning:
      "Accepted evidence, resolved assumptions, and customer-approved economic inputs back realized-value language for this slice.",
    tone: "good"
  },
  BLOCKED: {
    label: "Blocked",
    meaning: "A governance or privacy gate failed; value language is held until it passes.",
    tone: "warn"
  }
};

const claimLevelCopy: Record<string, string> = {
  OBSERVED_AI_ACTIVITY_ONLY: "We can describe observed AI activity only.",
  INTERNAL_HYPOTHESIS_ONLY: "We can discuss an internal hypothesis, not a client-facing value claim.",
  CAVEATED_VALUE_INVESTIGATION: "We can present a caveated value investigation for this workflow.",
  SUPPORTED_VALUE_MOVEMENT: "We can present bounded value movement for this workflow slice.",
  VALIDATED_VALUE_REALIZATION:
    "We can present customer-validated realized value for this workflow slice.",
  BLOCKED: "Value language is blocked until governance gates pass."
};

const reviewStateCopy: Record<string, { label: string; tone: "neutral" | "warn" | "good" }> = {
  ACCEPTED: { label: "Accepted by the customer reviewer", tone: "good" },
  SUBMITTED: { label: "Received, awaiting customer review", tone: "warn" },
  CAVEATED: { label: "Accepted with caveats", tone: "warn" },
  MISSING: { label: "Not yet provided", tone: "neutral" },
  REJECTED: { label: "Rejected by the customer reviewer", tone: "warn" }
};

const vbdStatusCopy: Record<string, string> = {
  INCREASING: "Increasing",
  STALLING: "Stalling",
  DECLINING: "Declining",
  EXPANDING: "Expanding",
  LIMITED: "Limited",
  NARROWING: "Narrowing",
  DEEPENING: "Deepening",
  SHALLOW: "Shallow",
  FRAGMENTED: "Fragmented",
  UNKNOWN: "Not measured yet"
};

const decisionStateCopy: Record<string, string> = {
  PENDING: "Awaiting sponsor decision",
  SCALE: "Scale this workflow",
  COACH: "Coach the team",
  REDESIGN_WORKFLOW: "Redesign the workflow",
  STRENGTHEN_EVIDENCE: "Strengthen the evidence",
  HOLD: "Hold and remeasure"
};

const blockedClaimCopy: Record<string, string> = {
  roi_proof: "ROI proof",
  causality_claim: "Causality claims",
  individual_scoring: "Individual scoring",
  team_or_manager_ranking: "Team or manager ranking",
  hr_analytics: "Individual-level HR analytics",
  productivity_measurement: "Person-level productivity measurement",
  realized_roi_calculation: "Realized ROI calculation",
  customer_facing_economic_output: "Customer-facing dollar figures"
};

// Privacy boundaries protect people and never relax, regardless of evidence.
const PRIVACY_BOUNDARY_CLAIMS = [
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement"
];

const claimGateUnlockCopy: Record<string, string> = {
  roi_proof: "Unlocks with accepted evidence, resolved assumptions, and customer-approved economic inputs.",
  realized_roi_calculation:
    "Unlocks when the customer computes realized ROI from its own approved inputs.",
  customer_facing_economic_output:
    "Unlocks for customer-computed, customer-approved figures referenced by this case.",
  causality_claim:
    "Unlocks with an approved baseline/comparison evidence design reviewed by the customer."
};

interface ClaimGate {
  claim?: string;
  state?: string;
  unlock_requirements?: string;
}

type StrategicChoice = {
  id: string;
  label: string;
  summary: string;
  nextStep: string;
  tone: "neutral" | "warn" | "good";
  recommended?: boolean;
};

const humanizeWindow = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "Not set";
  return value.replace(/_to_/g, " to ").replace(/_/g, " ");
};

interface EvidenceCasePayload {
  value_evidence_case_id: string;
  source_refs?: { outcome_export_id?: string | null };
  client_context?: { engagement_label?: string; function_area?: string; sponsor_role?: string };
  workflow?: { workflow_name?: string; workflow_family?: string; function_area?: string };
  ai_fluency_summary?: { readiness?: string };
  vbd_summary?: {
    velocity?: { status?: string };
    breadth?: { status?: string };
    depth?: { status?: string };
  };
  outcome_metric?: {
    metric_id?: string;
    metric_name?: string;
    measurement_unit?: string;
    source_system?: string;
    expected_direction?: string;
  };
  outcome_evidence_status?: { review_state?: string; statement?: string };
  baseline_comparison?: { baseline_window?: string | null; comparison_window?: string | null };
  customer_owned_assumptions?: Array<{ assumption_id?: string; state?: string; owner?: string }>;
  evidence_quality?: { evidence_level?: string; rationale?: string };
  safe_value_language?: {
    allowed_claim_level?: string;
    allowed_phrases?: string[];
    required_caveats?: string[];
  };
  blocked_claims?: string[];
  claim_gates?: ClaimGate[];
  customer_validation?: {
    approved_by_role?: string;
    validation_reference?: string;
  } | null;
  sponsor_decision?: { decision_state?: string; decision_owner_role?: string; decision_basis?: string };
  intervention_retest?: {
    next_action?: string;
    retest_window_label?: string;
    retest_measurement_plan?: string;
  };
}

interface OutcomeEvidenceMetricPayload {
  metric_id?: string;
  measurement_unit?: string;
  baseline_value?: number | null;
  comparison_value?: number | null;
  eligible_population?: number | null;
}

interface OutcomeEvidenceExportPayload {
  export_id?: string;
  source_system?: { source_name?: string; approved_grain?: string };
  windows?: { baseline?: string; comparison?: string };
  metrics?: OutcomeEvidenceMetricPayload[];
}

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

type MetricEvidenceDraft = {
  outcomeMetric: string;
  sourceSystem: string;
  measurementUnit: string;
  baselineWindow: string;
  comparisonWindow: string;
  baselineValue: string;
  currentValue: string;
  eligiblePopulation: string;
  owner: string;
};

const defaultMetricEvidenceDraft: MetricEvidenceDraft = {
  outcomeMetric: "Median resolution time",
  sourceSystem: "Support case management system",
  measurementUnit: "hours",
  baselineWindow: "Pre-Glean comparison window",
  comparisonWindow: "Current reporting window",
  baselineValue: "",
  currentValue: "",
  eligiblePopulation: "",
  owner: "Support Operations"
};

const metricEvidenceDraftFromSelection = (
  selection: SelectedOutcomeMetricSelection | null
): MetricEvidenceDraft => {
  const metric = selection?.metrics[0];
  if (!metric) return defaultMetricEvidenceDraft;
  return {
    ...defaultMetricEvidenceDraft,
    outcomeMetric: metric.name,
    sourceSystem: metric.sourceSystem,
    measurementUnit: metric.measurementUnit,
    owner: metric.owner
  };
};

const MetricEvidenceIntake = ({
  metricSelection
}: {
  metricSelection: SelectedOutcomeMetricSelection | null;
}) => {
  const [draft, setDraft] = useState<MetricEvidenceDraft>(() =>
    metricEvidenceDraftFromSelection(metricSelection)
  );
  const [fileName, setFileName] = useState("");
  const selectedMetrics = metricSelection?.metrics ?? [];
  const evidenceReady = Boolean(
    draft.baselineValue.trim() &&
      draft.currentValue.trim() &&
      draft.eligiblePopulation.trim() &&
      draft.owner.trim()
  );

  useEffect(() => {
    setDraft(metricEvidenceDraftFromSelection(metricSelection));
  }, [metricSelection]);

  const updateDraft =
    (field: keyof MetricEvidenceDraft) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
    };

  return (
    <section className="ai-value-case-intake" aria-label="Metric evidence intake">
      <div className="ai-value-case-intake-head">
        <div>
          <p className="eyebrow">Evidence intake</p>
          <h3>Add aggregate metric evidence</h3>
          <p>
            Enter the customer-owned metric selected on the Outcome Metrics page, or attach an
            aggregate export from the system of record.
          </p>
        </div>
        <StatusPill
          label={evidenceReady ? "Evidence staged locally" : "Needs metric values"}
          tone={evidenceReady ? "good" : "warn"}
        />
      </div>

      {selectedMetrics.length > 0 && (
        <div className="ai-value-case-metric-handoff" aria-label="Selected outcome metrics">
          <div>
            <span className="ai-value-map-label">Selected on Outcome Metrics</span>
            <strong>{metricSelection?.functionArea}</strong>
            <p>{metricSelection?.vbdBaseline}</p>
          </div>
          <div>
            <span className="ai-value-map-label">
              {selectedMetrics.length} outcome metric{selectedMetrics.length === 1 ? "" : "s"} selected
            </span>
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
          </div>
        </div>
      )}

      <div className="ai-value-case-intake-grid">
        <label>
          Outcome metric
          <input value={draft.outcomeMetric} onChange={updateDraft("outcomeMetric")} />
        </label>
        <label>
          Source system
          <input value={draft.sourceSystem} onChange={updateDraft("sourceSystem")} />
        </label>
        <label>
          Measurement unit
          <input value={draft.measurementUnit} onChange={updateDraft("measurementUnit")} />
        </label>
        <label>
          Evidence owner
          <input value={draft.owner} onChange={updateDraft("owner")} />
        </label>
        <label>
          Baseline window
          <input value={draft.baselineWindow} onChange={updateDraft("baselineWindow")} />
        </label>
        <label>
          Comparison window
          <input value={draft.comparisonWindow} onChange={updateDraft("comparisonWindow")} />
        </label>
        <label>
          Baseline value
          <input
            inputMode="decimal"
            value={draft.baselineValue}
            onChange={updateDraft("baselineValue")}
          />
        </label>
        <label>
          Current value
          <input
            inputMode="decimal"
            value={draft.currentValue}
            onChange={updateDraft("currentValue")}
          />
        </label>
        <label>
          Eligible population
          <input
            inputMode="numeric"
            value={draft.eligiblePopulation}
            onChange={updateDraft("eligiblePopulation")}
          />
        </label>
        <label>
          Import aggregate evidence file
          <input
            accept=".csv,.json,.xlsx"
            type="file"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>

      <div className="ai-value-case-intake-preview" aria-label="Evidence package preview">
        <div>
          <span className="ai-value-map-label">Staged package</span>
          <strong>{draft.outcomeMetric || "Outcome metric"}</strong>
          <p>
            {draft.baselineValue && draft.currentValue
              ? `${draft.baselineValue} to ${draft.currentValue} ${draft.measurementUnit}`.trim()
              : "Add baseline and current values to preview movement."}
          </p>
        </div>
        <div>
          <span className="ai-value-map-label">Review boundary</span>
          <p>No person-level rows, names, or manager rankings.</p>
          <small>
            {fileName
              ? `Attached locally: ${fileName}`
              : "Accepted files: aggregate CSV, JSON, or spreadsheet exports."}
          </small>
        </div>
        <div>
          <span className="ai-value-map-label">Next gate</span>
          <p>Submit for customer evidence review before stronger value language unlocks.</p>
        </div>
      </div>
    </section>
  );
};

const humanizeRole = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "Business sponsor";
  const text = value.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const sessionRole = () => {
  try {
    return (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";
  } catch {
    return "ADMIN";
  }
};

const outcomeExportIdForCase = (evidenceCase?: EvidenceCasePayload): string | null => {
  const sourceRef = evidenceCase?.source_refs?.outcome_export_id;
  const statusRef = evidenceCase?.outcome_evidence_status?.export_id;
  if (typeof sourceRef === "string" && sourceRef) return sourceRef;
  if (typeof statusRef === "string" && statusRef) return statusRef;
  return null;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const formatPlainNumber = (value: number): string => numberFormatter.format(value);

const formatMetricValue = (value: unknown, unit: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not connected";
  const unitText = typeof unit === "string" ? unit : "";
  if (unitText === "share" || unitText === "rate") {
    return `${percentFormatter.format(value * 100)}%`;
  }
  return unitText ? `${formatPlainNumber(value)} ${unitText}` : formatPlainNumber(value);
};

const formatPopulation = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not connected";
  return `${formatPlainNumber(value)} aggregate records`;
};

const formatMovement = (
  metric: OutcomeEvidenceMetricPayload | null,
  expectedDirection: unknown
): string => {
  const baseline = metric?.baseline_value;
  const comparison = metric?.comparison_value;
  if (
    typeof baseline !== "number" ||
    !Number.isFinite(baseline) ||
    typeof comparison !== "number" ||
    !Number.isFinite(comparison)
  ) {
    return "Not connected";
  }

  const direction = String(expectedDirection ?? "");
  const rawDelta = comparison - baseline;
  const expectedDelta = direction === "REDUCE" ? baseline - comparison : rawDelta;
  const unit = metric?.measurement_unit;
  const movementWord =
    direction === "REDUCE"
      ? expectedDelta >= 0
        ? "lower"
        : "higher"
      : rawDelta >= 0
        ? "higher"
        : "lower";
  const absoluteDelta = Math.abs(direction === "REDUCE" ? expectedDelta : rawDelta);
  const percent =
    baseline === 0 ? null : `${percentFormatter.format((absoluteDelta / Math.abs(baseline)) * 100)}%`;
  const valueText = formatMetricValue(absoluteDelta, unit);
  return percent ? `${valueText} ${movementWord} (${percent} movement)` : `${valueText} ${movementWord}`;
};

const selectedOutcomeMetric = (
  evidenceCase: EvidenceCasePayload,
  outcomeExport: OutcomeEvidenceExportPayload | null
): OutcomeEvidenceMetricPayload | null => {
  const metricId = evidenceCase.outcome_metric?.metric_id;
  const metrics = outcomeExport?.metrics ?? [];
  if (!metricId) return null;
  return metrics.find((metric) => metric.metric_id === metricId) ?? null;
};

const claimGateState = (
  evidenceCase: EvidenceCasePayload,
  claim: string
): "UNLOCKED" | "LOCKED" | null => {
  const gate = (evidenceCase.claim_gates ?? []).find((item) => item.claim === claim);
  if (gate?.state === "UNLOCKED" || gate?.state === "LOCKED") return gate.state;
  return null;
};

const strategicChoicesForCase = (evidenceCase: EvidenceCasePayload): StrategicChoice[] => {
  const reviewState = evidenceCase.outcome_evidence_status?.review_state ?? "MISSING";
  const acceptedEvidence = reviewState === "ACCEPTED" || reviewState === "CAVEATED";
  const openAssumptions = (evidenceCase.customer_owned_assumptions ?? []).filter(
    (assumption) => assumption.state !== "PRESENT"
  );
  const allowedClaimLevel = evidenceCase.safe_value_language?.allowed_claim_level;
  const customerFacingUnlocked =
    claimGateState(evidenceCase, "customer_facing_economic_output") === "UNLOCKED";
  const realizedValueUnlocked =
    customerFacingUnlocked ||
    claimGateState(evidenceCase, "realized_roi_calculation") === "UNLOCKED" ||
    claimGateState(evidenceCase, "roi_proof") === "UNLOCKED" ||
    allowedClaimLevel === "VALIDATED_VALUE_REALIZATION";
  const causalityUnlocked = claimGateState(evidenceCase, "causality_claim") === "UNLOCKED";
  const customerValidated = Boolean(evidenceCase.customer_validation?.approved_by_role);

  const holdChoice: StrategicChoice = {
    id: "hold",
    label: "Hold value language",
    summary: "Pause external value language when evidence, assumptions, or owner review are not ready.",
    nextStep: "Resolve the missing item, confirm the baseline and comparison windows, then rerun the case.",
    tone: "neutral"
  };
  const internalModelingChoice: StrategicChoice = {
    id: "internal-modeling",
    label: "Model internally",
    summary: "Use the numbers for planning and sensitivity checks, not as a client-facing value claim.",
    nextStep: "Document assumptions, costs, and confounds before stronger language moves forward.",
    tone: "neutral"
  };
  const caveatedReadoutChoice: StrategicChoice = {
    id: "caveated-readout",
    label: "Use caveated executive readout",
    summary: "Share directional value movement with caveats.",
    nextStep: "Do not present realized ROI yet. Resolve open assumptions and confirm the value model with the customer owner.",
    tone: "warn"
  };
  const financeValidationChoice: StrategicChoice = {
    id: "finance-validation",
    label: "Validate with Finance",
    summary: "Ask the customer Finance or data owner to approve assumptions, costs, and the baseline/comparison logic.",
    nextStep: "Use Finance validation before customer-facing economic language appears in the readout.",
    tone: "warn"
  };
  const validatedStoryChoice: StrategicChoice = {
    id: "validated-story",
    label: "Use validated value story",
    summary: "Use customer-approved realized-value language for this workflow slice.",
    nextStep: causalityUnlocked
      ? "Keep the approved evidence design attached when using causality language."
      : "Keep causality blocked unless the evidence design supports it.",
    tone: "good"
  };
  const interventionChoice: StrategicChoice = {
    id: "intervene-retest",
    label: "Intervene and retest",
    summary: "If the metric is not moving enough, change the AI Fluency or workflow intervention.",
    nextStep:
      evidenceCase.intervention_retest?.next_action ??
      "Remeasure the same function and workflow after the next retest window.",
    tone: "neutral"
  };

  let recommendedId = "hold";
  if (realizedValueUnlocked && customerValidated) {
    recommendedId = "validated-story";
  } else if (!acceptedEvidence) {
    recommendedId = "hold";
  } else if (openAssumptions.length > 0 || allowedClaimLevel === "CAVEATED_VALUE_INVESTIGATION") {
    recommendedId = "caveated-readout";
  } else if (!customerValidated) {
    recommendedId = "finance-validation";
  } else {
    recommendedId = "internal-modeling";
  }

  return [
    holdChoice,
    internalModelingChoice,
    caveatedReadoutChoice,
    financeValidationChoice,
    validatedStoryChoice,
    interventionChoice
  ]
    .filter((choice) => {
      if (choice.id === recommendedId) return true;
      if (choice.id === "validated-story") return realizedValueUnlocked || recommendedId === "validated-story";
      if (choice.id === "finance-validation") return acceptedEvidence && !customerValidated;
      if (choice.id === "caveated-readout") return acceptedEvidence;
      if (choice.id === "hold") return !acceptedEvidence || openAssumptions.length > 0;
      if (choice.id === "internal-modeling") return acceptedEvidence && !realizedValueUnlocked;
      return true;
    })
    .map((choice) => ({ ...choice, recommended: choice.id === recommendedId }))
    .sort((a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)));
};

export const ValueEvidenceCasePanel = () => {
  const [cases, setCases] = useState<EvidenceCasePayload[]>([]);
  const [outcomeExports, setOutcomeExports] = useState<Record<string, OutcomeEvidenceExportPayload>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const role = sessionRole();
        const { objects: summaries } = await listAiValueObjects(role, "value_evidence_case");
        const valid = summaries.filter((summary) => summary.valid);
        if (valid.length === 0) {
          if (!cancelled) setState("empty");
          return;
        }
        const details = await Promise.all(
          valid.map((summary) =>
            fetchAiValueObject(role, "value_evidence_case", summary.object_id)
          )
        );
        if (cancelled) return;
        const payloads = details
          .map((detail) => detail.payload as unknown as EvidenceCasePayload)
          .filter((payload) => payload && payload.value_evidence_case_id)
          .sort((a, b) =>
            String(a.client_context?.function_area ?? "").localeCompare(
              String(b.client_context?.function_area ?? "")
            )
          );
        const exportIds = Array.from(
          new Set(
            payloads
              .map((payload) => outcomeExportIdForCase(payload))
              .filter((exportId): exportId is string => Boolean(exportId))
          )
        );
        const exportEntries = await Promise.all(
          exportIds.map(async (exportId) => {
            try {
              const detail = await fetchAiValueObject(role, "outcome_evidence_export", exportId);
              return [exportId, detail.payload as unknown as OutcomeEvidenceExportPayload] as const;
            } catch {
              return [exportId, null] as const;
            }
          })
        );
        setCases(payloads);
        setOutcomeExports(
          Object.fromEntries(
            exportEntries.filter(
              (entry): entry is readonly [string, OutcomeEvidenceExportPayload] => Boolean(entry[1])
            )
          )
        );
        setSelectedId(payloads[0]?.value_evidence_case_id ?? null);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => cases.find((item) => item.value_evidence_case_id === selectedId) ?? cases[0],
    [cases, selectedId]
  );
  const metricSelection = useMemo(() => readSelectedOutcomeMetricSelection(), []);

  if (state === "loading") {
    return (
      <section className="ai-value-panel" aria-label="Value evidence case">
        <p>Loading the value evidence cases…</p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="ai-value-panel" aria-label="Value evidence case">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Value Evidence Case</p>
            <h2>Evidence case not connected yet</h2>
            <p>
              Start by staging the aggregate metric evidence for the outcome selected on the
              previous page. The governed case can be assembled once the evidence service is
              available.
            </p>
          </div>
          <StatusPill label="Needs evidence connection" tone="warn" />
        </div>
        <p className="ai-value-inline-alert" role="alert">
          Case records are unavailable in this local session, so this page is showing the evidence
          intake instead.
        </p>
        <MetricEvidenceIntake metricSelection={metricSelection} />
      </section>
    );
  }

  if (state === "empty" || !selected) {
    return (
      <section className="ai-value-panel" aria-label="Value evidence case">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Value Evidence Case</p>
            <h2>No evidence case yet</h2>
            <p>
              Start by staging the aggregate metric evidence for the outcome selected on the
              previous page. Once the customer reviewer accepts the evidence package, this page can
              assemble the case and show what value language is allowed.
            </p>
          </div>
        </div>
        <MetricEvidenceIntake metricSelection={metricSelection} />
      </section>
    );
  }

  const level = selected.evidence_quality?.evidence_level ?? "MISSING";
  const levelCopy = evidenceLevelCopy[level] ?? evidenceLevelCopy.MISSING;
  const review = reviewStateCopy[selected.outcome_evidence_status?.review_state ?? "MISSING"] ??
    reviewStateCopy.MISSING;
  const claim = claimLevelCopy[selected.safe_value_language?.allowed_claim_level ?? ""] ??
    claimLevelCopy.OBSERVED_AI_ACTIVITY_ONLY;
  const openAssumptions = (selected.customer_owned_assumptions ?? []).filter(
    (assumption) => assumption.state !== "PRESENT"
  );
  const blockedClaims = selected.blocked_claims ?? [];
  const hasClaimGates = (selected.claim_gates ?? []).length > 0;
  const legacyBlockedValueClaims = hasClaimGates
    ? []
    : blockedClaims.filter((claim) => !PRIVACY_BOUNDARY_CLAIMS.includes(claim));
  const selectedExportId = outcomeExportIdForCase(selected);
  const outcomeExport = selectedExportId ? outcomeExports[selectedExportId] ?? null : null;
  const primaryMetricOutput = selectedOutcomeMetric(selected, outcomeExport);
  const additionalMetricCount = Math.max(
    (outcomeExport?.metrics ?? []).length - (primaryMetricOutput ? 1 : 0),
    0
  );
  const strategicChoices = strategicChoicesForCase(selected);
  const recommendedChoice = strategicChoices.find((choice) => choice.recommended) ?? strategicChoices[0];

  return (
    <section className="ai-value-panel ai-value-evidence-case-panel" aria-label="Value evidence case">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Value Evidence Case</p>
          <h2>What can we safely say about this workflow?</h2>
          <p>
            One governed view per workflow: the proof we have, the language it allows, what stays
            blocked, and what to do next.
          </p>
        </div>
        <StatusPill label={levelCopy.label} tone={levelCopy.tone} />
      </div>

      <div className="ai-value-case-function-row" role="tablist" aria-label="Functions with evidence cases">
        {cases.map((item) => {
          const itemLevel = evidenceLevelCopy[item.evidence_quality?.evidence_level ?? "MISSING"] ??
            evidenceLevelCopy.MISSING;
          const active = item.value_evidence_case_id === selected.value_evidence_case_id;
          return (
            <button
              key={item.value_evidence_case_id}
              type="button"
              role="tab"
              aria-selected={active}
              className={
                active
                  ? "ai-value-step ai-value-case-function active"
                  : "ai-value-step ai-value-case-function"
              }
              onClick={() => setSelectedId(item.value_evidence_case_id)}
            >
              <strong>{item.client_context?.function_area ?? item.workflow?.function_area ?? "Function"}</strong>
              <span className={`ai-value-workspace-card-status ai-value-workspace-card-status-${itemLevel.tone}`}>
                {itemLevel.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ai-value-case-ladder" aria-label="Evidence ladder">
        {EVIDENCE_LEVELS.filter((rung) => rung !== "BLOCKED").map((rung) => {
          const rungCopy = evidenceLevelCopy[rung];
          const isCurrent = rung === level;
          return (
            <div
              key={rung}
              className={
                isCurrent
                  ? "ai-value-case-rung ai-value-case-rung-current"
                  : "ai-value-case-rung"
              }
              aria-current={isCurrent ? "step" : undefined}
            >
              <strong>{rungCopy.label}</strong>
              {isCurrent && <p>{rungCopy.meaning}</p>}
            </div>
          );
        })}
      </div>

      <section className="ai-value-case-output" aria-label="Data outputs on file">
        <div className="ai-value-case-output-head">
          <div>
            <p className="eyebrow">Aggregate output</p>
            <h3>Data outputs on file</h3>
            <p>
              Customer-owned aggregate numbers for the selected workflow metric. These show
              observed movement; they do not prove ROI or causality.
            </p>
          </div>
          <StatusPill label={review.label} tone={review.tone} />
        </div>
        {primaryMetricOutput ? (
          <>
            <div className="ai-value-case-output-title">
              <span className="ai-value-map-label">Selected metric</span>
              <strong>{selected.outcome_metric?.metric_name ?? primaryMetricOutput.metric_id}</strong>
              <small>
                {outcomeExport?.source_system?.source_name ??
                  selected.outcome_metric?.source_system ??
                  "Customer-owned system"}{" "}
                at {humanizeRole(outcomeExport?.source_system?.approved_grain ?? "aggregate workflow window")}.
              </small>
            </div>
            <div className="ai-value-case-output-grid">
              <div className="ai-value-case-output-stat">
                <span>Baseline</span>
                <strong>
                  {formatMetricValue(
                    primaryMetricOutput.baseline_value,
                    primaryMetricOutput.measurement_unit ?? selected.outcome_metric?.measurement_unit
                  )}
                </strong>
                <small>
                  {humanizeWindow(outcomeExport?.windows?.baseline ?? selected.baseline_comparison?.baseline_window)}
                </small>
              </div>
              <div className="ai-value-case-output-stat">
                <span>Comparison</span>
                <strong>
                  {formatMetricValue(
                    primaryMetricOutput.comparison_value,
                    primaryMetricOutput.measurement_unit ?? selected.outcome_metric?.measurement_unit
                  )}
                </strong>
                <small>
                  {humanizeWindow(
                    outcomeExport?.windows?.comparison ?? selected.baseline_comparison?.comparison_window
                  )}
                </small>
              </div>
              <div className="ai-value-case-output-stat">
                <span>Movement</span>
                <strong>{formatMovement(primaryMetricOutput, selected.outcome_metric?.expected_direction)}</strong>
                <small>Aggregate change for this window pair.</small>
              </div>
              <div className="ai-value-case-output-stat">
                <span>Population</span>
                <strong>{formatPopulation(primaryMetricOutput.eligible_population)}</strong>
                <small>No person-level data shown.</small>
              </div>
            </div>
            {additionalMetricCount > 0 && (
              <p className="ai-value-case-output-note">
                {additionalMetricCount} more aggregate metric{additionalMetricCount === 1 ? "" : "s"} on file
                for this export.
              </p>
            )}
          </>
        ) : (
          <div className="ai-value-case-output-empty">
            <strong>Numbers not connected yet</strong>
            <p>
              Attach an accepted outcome evidence export with the selected metric ID to show
              baseline, comparison, movement, and population.
            </p>
          </div>
        )}
      </section>

      {recommendedChoice && (
        <section className="ai-value-case-strategy" aria-label="Strategic value choice">
          <div className="ai-value-case-strategy-head">
            <div>
              <p className="eyebrow">Strategic choice</p>
              <h3>What should the client do next?</h3>
              <p>
                Use the evidence level and claim gates to choose the next safe value move.
              </p>
            </div>
            <StatusPill label={`Recommended: ${recommendedChoice.label}`} tone={recommendedChoice.tone} />
          </div>
          <div className="ai-value-case-strategy-grid">
            {strategicChoices.map((choice) => (
              <article
                className={
                  choice.recommended
                    ? "ai-value-case-strategy-card ai-value-case-strategy-card-recommended"
                    : "ai-value-case-strategy-card"
                }
                key={choice.id}
              >
                <span className="ai-value-map-label">
                  {choice.recommended ? "Recommended" : "Option"}
                </span>
                <h4>{choice.label}</h4>
                <p>{choice.summary}</p>
                <small>{choice.nextStep}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="ai-value-map-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Workflow</span>
          <strong>{selected.workflow?.workflow_name ?? "Workflow"}</strong>
          <p>{selected.client_context?.engagement_label}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Outcome metric</span>
          <strong>{selected.outcome_metric?.metric_name ?? "Outcome metric"}</strong>
          <p>
            From {selected.outcome_metric?.source_system ?? "the customer-owned system"}, measured
            in {selected.outcome_metric?.measurement_unit ?? "approved units"}.
          </p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Customer outcome evidence</span>
          <StatusPill label={review.label} tone={review.tone} />
          <p>
            Baseline {humanizeWindow(selected.baseline_comparison?.baseline_window)} vs comparison{" "}
            {humanizeWindow(selected.baseline_comparison?.comparison_window)}.
          </p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Work pattern (VBD)</span>
          <p>
            Velocity: {vbdStatusCopy[selected.vbd_summary?.velocity?.status ?? "UNKNOWN"]} · Breadth:{" "}
            {vbdStatusCopy[selected.vbd_summary?.breadth?.status ?? "UNKNOWN"]} · Depth:{" "}
            {vbdStatusCopy[selected.vbd_summary?.depth?.status ?? "UNKNOWN"]}
          </p>
          <small>The work-pattern map guides what to change next; it is not value proof.</small>
        </div>
      </div>

      <div className="ai-value-case-language">
        <div className="ai-value-case-language-col">
          <h3>What we can say now</h3>
          <p className="ai-value-case-claim">{claim}</p>
          <ul>
            {(selected.safe_value_language?.allowed_phrases ?? []).map((phrase) => (
              <li key={phrase}>{phrase}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-case-language-col">
          <h3>Always said with</h3>
          <ul>
            {(selected.safe_value_language?.required_caveats ?? []).map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-case-language-col">
          <h3>Privacy boundaries — never claimed</h3>
          <ul>
            {PRIVACY_BOUNDARY_CLAIMS.filter((claim) =>
              blockedClaims.includes(claim)
            ).map((blockedClaim) => (
              <li key={blockedClaim}>{blockedClaimCopy[blockedClaim] ?? blockedClaim.replace(/_/g, " ")}</li>
            ))}
          </ul>
        </div>
        {legacyBlockedValueClaims.length > 0 && (
          <div className="ai-value-case-language-col">
            <h3>Value claims still blocked</h3>
            <ul>
              {legacyBlockedValueClaims.map((blockedClaim) => (
                <li key={blockedClaim}>
                  {blockedClaimCopy[blockedClaim] ?? blockedClaim.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {hasClaimGates && (
        <div className="ai-value-case-gates" aria-label="Evidence-gated claims">
          <h3>Claims that unlock with evidence</h3>
          <p className="ai-value-case-gates-intro">
            These are gated, not banned: each opens once the data supports it. Figures stay
            customer-computed and customer-approved.
            {selected.customer_validation?.approved_by_role && (
              <>
                {" "}
                Economic inputs approved by{" "}
                {humanizeRole(selected.customer_validation.approved_by_role)}.
              </>
            )}
          </p>
          <div className="ai-value-case-gate-grid">
            {(selected.claim_gates ?? []).map((gate) => {
              const unlocked = gate.state === "UNLOCKED";
              return (
                <div
                  className={
                    unlocked
                      ? "ai-value-case-gate ai-value-case-gate-unlocked"
                      : "ai-value-case-gate"
                  }
                  key={gate.claim}
                >
                  <div className="ai-value-case-gate-head">
                    <strong>{blockedClaimCopy[gate.claim ?? ""] ?? gate.claim}</strong>
                    <StatusPill
                      label={unlocked ? "Unlocked" : "Locked"}
                      tone={unlocked ? "good" : "neutral"}
                    />
                  </div>
                  <p>
                    {unlocked
                      ? "The evidence behind this case supports this claim, within its caveats."
                      : claimGateUnlockCopy[gate.claim ?? ""] ?? gate.unlock_requirements}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openAssumptions.length > 0 && (
        <div className="ai-value-case-assumptions">
          <h3>Open items holding back stronger language</h3>
          <ul>
            {openAssumptions.map((assumption) => (
              <li key={assumption.assumption_id}>
                {humanizeRole(assumption.assumption_id)} — owned by {humanizeRole(assumption.owner)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ai-value-map-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Sponsor decision</span>
          <strong>
            {decisionStateCopy[selected.sponsor_decision?.decision_state ?? "PENDING"] ??
              decisionStateCopy.PENDING}
          </strong>
          <p>Owner: {humanizeRole(selected.sponsor_decision?.decision_owner_role)}</p>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Next action and retest</span>
          <p>{selected.intervention_retest?.next_action}</p>
          <small>
            Remeasure {selected.intervention_retest?.retest_window_label?.toLowerCase() ?? "after the next window"}.
          </small>
        </div>
      </div>
    </section>
  );
};
