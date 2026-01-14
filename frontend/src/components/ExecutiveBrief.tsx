import { PostureChip } from "@/components/PostureChip";
import { ConfidenceChip } from "@/components/ConfidenceChip";
import type { Confidence, Posture } from "@/lib/visualTokens";

const postureHeadline = (posture: Posture) => {
  if (posture === "Scale") return "Signals indicate a scaling posture";
  if (posture === "Stabilize") return "Signals indicate a stabilizing posture";
  return "Signals indicate a study posture";
};

type ExecutiveBriefProps = {
  posture: Posture;
  confidence?: Confidence;
};

export function ExecutiveBrief({ posture, confidence }: ExecutiveBriefProps) {
  return (
    <div className="rounded-2xl border bg-background/70 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Executive brief</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {postureHeadline(posture)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PostureChip posture={posture} />
          {confidence && <ConfidenceChip confidence={confidence} />}
        </div>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        These are behavioral signals, not facts or performance metrics.
      </div>
    </div>
  );
}
