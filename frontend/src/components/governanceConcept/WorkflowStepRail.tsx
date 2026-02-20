type WorkflowStep = { id: string; label: string };

type WorkflowStepRailProps = {
  nextStepText: string;
  hasPendingParsedUploads: boolean;
  hasPolicies: boolean;
  hasSelectedPolicy: boolean;
  hasMapping: boolean;
  /** Optional override step list. When omitted the default 2-step list is used. */
  steps?: readonly WorkflowStep[];
};

const stepState = (step: string, flags: Omit<WorkflowStepRailProps, "nextStepText" | "steps">) => {
  if (step === "upload") {
    if (flags.hasPendingParsedUploads) {
      return "active";
    }
    return flags.hasPolicies ? "done" : "active";
  }
  if (step === "map") {
    if (!flags.hasPolicies || !flags.hasSelectedPolicy) {
      return "pending";
    }
    return flags.hasMapping ? "done" : "active";
  }
  return "pending";
};

const DEFAULT_STEPS = [
  { id: "upload", label: "Upload and Manage Policies" },
  { id: "map", label: "Map Selected Policy" }
] as const;

export function WorkflowStepRail({
  nextStepText,
  hasPendingParsedUploads,
  hasPolicies,
  hasSelectedPolicy,
  hasMapping,
  steps
}: WorkflowStepRailProps) {
  const flags = { hasPendingParsedUploads, hasPolicies, hasSelectedPolicy, hasMapping };
  const resolvedSteps: readonly WorkflowStep[] = steps ?? DEFAULT_STEPS;

  return (
    <section className="gc-step-rail">
      <div className="gc-step-head">
        <p className="gc-mono">Workflow State</p>
        <p>{nextStepText}</p>
      </div>
      <ol className="gc-step-list">
        {resolvedSteps.map((step) => {
          const state = stepState(step.id, flags);
          return (
            <li key={step.id} className={`gc-step gc-step-${state}`}>
              <span className="gc-step-dot" aria-hidden="true" />
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
