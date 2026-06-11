import type { SponsorDecisionLoop } from "../hooks/useAiValueJourney";

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
}) => (
  <section
    className="ai-value-panel ai-value-sponsor-decision-panel"
    aria-label="Sponsor decision loop"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Decision Loop</p>
        <h2>Sponsor Decision</h2>
        <p>
          Turn the readout into the next operating move: expand, strengthen
          evidence, correct the export, hold language, or return to Blueprint.
        </p>
      </div>
      <StatusPill label={loop.statusLabel} tone={loop.statusTone} />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Recommended next move</span>
        <strong>Recommended: {loop.recommendedOptionLabel}</strong>
        <p>{loop.recommendedReason}</p>
        <small>{loop.nextAction}</small>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Agent follow-up boundary</span>
        <p>{loop.agentFollowUp}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Caveat that stays attached</span>
        <p>{loop.caveat}</p>
      </div>
    </div>

    <div className="ai-value-agent-handoff-grid">
      {loop.options.map((option) => (
        <article className="ai-value-agent-handoff" key={option.label}>
          <div className="ai-value-section-head">
            <h3>{option.label}</h3>
            {option.recommended && <StatusPill label="Recommended move" tone="good" />}
          </div>
          <p>{option.detail}</p>
          <small>{option.action}</small>
          <div className="ai-value-chip-row">
            {option.feedsNext.map((target) => (
              <StatusPill key={target} label={`Feeds ${target}`} />
            ))}
          </div>
        </article>
      ))}
    </div>
  </section>
);
