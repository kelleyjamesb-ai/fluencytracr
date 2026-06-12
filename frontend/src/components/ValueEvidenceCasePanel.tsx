import { useEffect, useMemo, useState } from "react";

import { fetchAiValueObject, listAiValueObjects } from "../lib/aiValueApi";

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
  hr_analytics: "HR analytics",
  productivity_measurement: "Productivity measurement",
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

const humanizeWindow = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "Not set";
  return value.replace(/_to_/g, " to ").replace(/_/g, " ");
};

interface EvidenceCasePayload {
  value_evidence_case_id: string;
  client_context?: { engagement_label?: string; function_area?: string; sponsor_role?: string };
  workflow?: { workflow_name?: string; workflow_family?: string; function_area?: string };
  ai_fluency_summary?: { readiness?: string };
  vbd_summary?: {
    velocity?: { status?: string };
    breadth?: { status?: string };
    depth?: { status?: string };
  };
  outcome_metric?: {
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
    validation_statement?: string;
  } | null;
  sponsor_decision?: { decision_state?: string; decision_owner_role?: string; decision_basis?: string };
  intervention_retest?: {
    next_action?: string;
    retest_window_label?: string;
    retest_measurement_plan?: string;
  };
}

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

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

export const ValueEvidenceCasePanel = () => {
  const [cases, setCases] = useState<EvidenceCasePayload[]>([]);
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
        setCases(payloads);
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
        <p role="alert">
          The value evidence cases could not be loaded. Check the workspace connection and try again.
        </p>
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
              An evidence case is assembled once a workflow has a chosen outcome metric, a data
              boundary, and an evidence review path. Complete the earlier steps, then assemble the
              case from the evidence page.
            </p>
          </div>
        </div>
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
              (selected.blocked_claims ?? []).includes(claim)
            ).map((blockedClaim) => (
              <li key={blockedClaim}>{blockedClaimCopy[blockedClaim] ?? blockedClaim.replace(/_/g, " ")}</li>
            ))}
          </ul>
        </div>
      </div>

      {(selected.claim_gates ?? []).length > 0 && (
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
