import { Link } from "react-router-dom";

import type { JourneyStage, JourneyStageKey } from "../hooks/useAiValueJourney";

const STATE_LABELS: Record<string, string> = {
  done: "Done",
  attention: "In progress",
  todo: "Not started"
};

export const AiValueJourneyRail = ({
  stages,
  current
}: {
  stages: JourneyStage[];
  current?: JourneyStageKey;
}) => (
  <nav className="ai-value-journey-rail" aria-label="Value journey">
    <Link className="ai-value-journey-home" to="/ai-value">
      Value Journey
    </Link>
    {stages.map((stage, index) => {
      const content = (
        <>
          <span className={`ai-value-journey-dot ai-value-journey-${stage.state}`} aria-hidden="true" />
          <span className="ai-value-journey-label">
            {index + 1}. {stage.label}
          </span>
          <span className="ai-value-journey-state">{STATE_LABELS[stage.state]}</span>
        </>
      );
      const className =
        current === stage.key
          ? "ai-value-journey-stage current"
          : "ai-value-journey-stage";
      return stage.link ? (
        <Link key={stage.key} className={className} to={stage.link} title={stage.detail}>
          {content}
        </Link>
      ) : (
        <span key={stage.key} className={className} title={stage.detail}>
          {content}
        </span>
      );
    })}
  </nav>
);
