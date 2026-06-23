import { useEffect, useMemo, useState } from "react";

import type {
  SponsorDecisionLoop,
  SponsorDecisionOptionLabel
} from "../hooks/useAiValueJourney";

interface DecisionHandoffPreview {
  selectedMove: SponsorDecisionOptionLabel;
  owner: string;
  target: string;
  requiredInput: string;
  safeNextAction: string;
  caveat: string;
}

const reportDisplayCopy = (value: string) =>
  value
    .replace(/Executive Readout/g, "Executive Report")
    .replace(/executive readout/g, "executive report")
    .replace(/Readout/g, "Report")
    .replace(/readout/g, "report")
    .replace(/Value-readout/g, "Value report")
    .replace(/value-readout/g, "value report");

const handoffDraftLinesForPreview = (preview: DecisionHandoffPreview) => [
  "Decision handoff draft",
  `Selected move: ${reportDisplayCopy(preview.selectedMove)}`,
  `Owner: ${reportDisplayCopy(preview.owner)}`,
  `Target: ${reportDisplayCopy(preview.target)}`,
  `Required evidence or input: ${reportDisplayCopy(preview.requiredInput)}`,
  `Safe next action: ${reportDisplayCopy(preview.safeNextAction)}`,
  `Caveat: ${reportDisplayCopy(preview.caveat)}`,
  "No task is created; this is a local handoff draft."
];

const evidenceStateFromLoop = (
  loop: SponsorDecisionLoop
): "accepted" | "submitted" | "rejected" | "missing" | "not-ready" => {
  if (loop.statusLabel === "Caveated expansion review") return "accepted";
  if (loop.statusLabel === "Reviewer action needed") return "submitted";
  if (loop.statusLabel === "Corrected export needed") return "rejected";
  if (loop.statusLabel === "Return to Blueprint") return "not-ready";
  return "missing";
};

const previewForDecision = (
  loop: SponsorDecisionLoop,
  selectedMove: SponsorDecisionOptionLabel
): DecisionHandoffPreview => {
  const evidenceState = evidenceStateFromLoop(loop);

  if (selectedMove === "Expand workflow") {
    return {
      selectedMove,
      owner: "Sponsor and workflow owner",
      target: "Blueprint and Executive Operating Packet",
      requiredInput: "Accepted customer evidence, expansion boundary, and sponsor appetite",
      safeNextAction: "Prepare a caveated expansion handoff",
      caveat:
        "Accepted evidence is caveated support only; it is not ROI proof and does not establish causality."
    };
  }

  if (selectedMove === "Request corrected export") {
    return {
      selectedMove,
      owner: "Support Operations",
      target: "Customer Evidence Request and Evidence Review",
      requiredInput: "Corrected aggregate export matching metric, source, grain, and windows",
      safeNextAction: "Request corrected aggregate evidence before value review continues",
      caveat: "Rejected evidence cannot support value claims."
    };
  }

  if (selectedMove === "Hold value language") {
    return {
      selectedMove,
      owner: "Value report owner",
      target: "Evidence Checkpoint and Executive Report",
      requiredInput: "Blocked language, reviewed caveats, and unresolved evidence gaps",
      safeNextAction: "Prepare a hold-language handoff before sponsor sharing",
      caveat:
        "Holding value language prevents unsupported ROI, causality, or productivity claims."
    };
  }

  if (selectedMove === "Return to Blueprint") {
    return {
      selectedMove,
      owner: "Blueprint owner",
      target: "Blueprint workshop",
      requiredInput: "Sponsor feedback, workflow boundary, and agreed success measure",
      safeNextAction: "Return the decision to the workflow canvas before value modeling continues",
      caveat:
        "Blueprint updates should clarify the operating workflow; they do not create ROI proof."
    };
  }

  if (evidenceState === "submitted") {
    return {
      selectedMove,
      owner: "Support Operations",
      target: "Customer Evidence Request and Evidence Review",
      requiredInput: "Reviewer decision on the submitted aggregate evidence",
      safeNextAction: "Route reviewer action before stronger value language moves forward",
      caveat: "Submitted evidence does not validate value yet."
    };
  }

  if (evidenceState === "rejected") {
    return {
      selectedMove,
      owner: "Support Operations",
      target: "Customer Evidence Request and Evidence Review",
      requiredInput: "Corrected aggregate export matching metric, source, grain, and windows",
      safeNextAction: "Request corrected aggregate evidence before value review continues",
      caveat: "Rejected evidence cannot support value claims."
    };
  }

  if (evidenceState === "not-ready") {
    return {
      selectedMove,
      owner: "Blueprint owner",
      target: "Blueprint workshop and Metrics Mapping",
      requiredInput: "Workflow boundary, outcome signal, and customer evidence request",
      safeNextAction: "Finish the workflow canvas before evidence collection continues",
      caveat:
        "Value language stays held until the workflow and evidence request are ready."
    };
  }

  return {
    selectedMove,
    owner: "Support Operations",
    target: "Customer Evidence Request and Evidence Review",
    requiredInput: "Requested aggregate export from the customer-owned outcome system",
    safeNextAction: "Send the data-owner request before value language changes",
    caveat: "Missing evidence keeps value language in planning status."
  };
};

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const SponsorDecisionLoopPanel = ({
  loop
}: {
  loop: SponsorDecisionLoop;
}) => {
  const [selectedOptionLabel, setSelectedOptionLabel] =
    useState<SponsorDecisionOptionLabel>(loop.recommendedOptionLabel);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "unavailable">(
    "idle"
  );

  useEffect(() => {
    setSelectedOptionLabel(loop.recommendedOptionLabel);
  }, [loop.recommendedOptionLabel]);

  const preview = useMemo(
    () => previewForDecision(loop, selectedOptionLabel),
    [loop, selectedOptionLabel]
  );
  const handoffDraftLines = useMemo(
    () => handoffDraftLinesForPreview(preview),
    [preview]
  );
  const handoffDraftText = useMemo(
    () => handoffDraftLines.join("\n"),
    [handoffDraftLines]
  );

  useEffect(() => {
    setCopyStatus("idle");
  }, [handoffDraftText]);

  const copyHandoffDraft = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(handoffDraftText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("unavailable");
    }
  };

  return (
    <section
      className="ai-value-panel ai-value-sponsor-decision-panel"
      aria-label="Sponsor decision loop"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Decision Loop</p>
          <h2>Sponsor Decision</h2>
          <p>
            Turn the report into the next operating move: expand, strengthen
            evidence, correct the export, hold language, or return to Blueprint.
          </p>
        </div>
        <StatusPill label={loop.statusLabel} tone={loop.statusTone} />
      </div>

      <div className="ai-value-map-grid">
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Recommended next move</span>
          <strong>Recommended: {loop.recommendedOptionLabel}</strong>
          <p>{reportDisplayCopy(loop.recommendedReason)}</p>
          <small>{reportDisplayCopy(loop.nextAction)}</small>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Agent follow-up boundary</span>
          <p>{reportDisplayCopy(loop.agentFollowUp)}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Caveat that stays attached</span>
          <p>{reportDisplayCopy(loop.caveat)}</p>
        </div>
      </div>

      <section
        className="ai-value-decision-preview"
        aria-label="Decision handoff preview"
      >
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Handoff Draft</p>
            <h3>Decision Handoff Preview</h3>
          </div>
          <StatusPill label={preview.selectedMove} tone="neutral" />
        </div>
        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Selected move</span>
            <p>{reportDisplayCopy(preview.selectedMove)}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Owner</span>
            <p>{reportDisplayCopy(preview.owner)}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Where this goes next</span>
            <p>{reportDisplayCopy(preview.target)}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Required evidence or input</span>
            <p>{reportDisplayCopy(preview.requiredInput)}</p>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Safe next action</span>
            <p>{reportDisplayCopy(preview.safeNextAction)}</p>
            <small>{reportDisplayCopy(preview.caveat)}</small>
          </div>
        </div>
        <p className="ai-value-decision-preview-note">
          No task is created; this preview only prepares the handoff.
        </p>
      </section>

      <section
        className="ai-value-decision-bundle"
        aria-label="Copy-ready decision handoff"
      >
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Local Draft</p>
            <h3>Copy-ready handoff</h3>
          </div>
          <button
            className="toggle-button ai-value-decision-copy"
            type="button"
            onClick={() => void copyHandoffDraft()}
          >
            Copy handoff draft
          </button>
        </div>
        <div className="ai-value-decision-draft">
          {handoffDraftLines.slice(1, -1).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="ai-value-decision-preview-note" aria-live="polite">
          {copyStatus === "copied"
            ? "Handoff draft copied."
            : copyStatus === "unavailable"
              ? "Copy unavailable; the draft is still visible here."
              : "No task is created; this is a local handoff draft."}
        </p>
      </section>

      <div className="ai-value-agent-handoff-grid">
        {loop.options.map((option) => (
          <article
            className="ai-value-agent-handoff"
            key={option.label}
            aria-current={option.label === selectedOptionLabel ? "true" : undefined}
          >
            <div className="ai-value-section-head">
              <h3>{option.label}</h3>
              {option.recommended && <StatusPill label="Recommended move" tone="good" />}
            </div>
            <p>{reportDisplayCopy(option.detail)}</p>
            <small>{reportDisplayCopy(option.action)}</small>
            <div className="ai-value-chip-row">
              {option.feedsNext.map((target) => (
                <StatusPill key={target} label={`Feeds ${target}`} />
              ))}
            </div>
            <button
              className={`toggle-button ai-value-decision-select ${
                option.label === selectedOptionLabel ? "active" : ""
              }`}
              type="button"
              onClick={() => setSelectedOptionLabel(option.label)}
            >
              Select {option.label}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
