type WorkflowStepRailProps = {
  nextStepText: string;
  hasPendingParsedUploads: boolean;
  hasPolicies: boolean;
  hasSelectedPolicy: boolean;
  hasMapping: boolean;
};

const stepState = (step: "upload" | "map", flags: Omit<WorkflowStepRailProps, "nextStepText">) => {
  if (step === "upload") {
    if (flags.hasPendingParsedUploads) {
      return "active";
    }
    return flags.hasPolicies ? "done" : "active";
  }
  if (!flags.hasPolicies || !flags.hasSelectedPolicy) {
    return "pending";
  }
  return flags.hasMapping ? "done" : "active";
};

export function WorkflowStepRail({
  nextStepText,
  hasPendingParsedUploads,
  hasPolicies,
  hasSelectedPolicy,
  hasMapping
}: WorkflowStepRailProps) {
  const flags = { hasPendingParsedUploads, hasPolicies, hasSelectedPolicy, hasMapping };
  const steps = [
    { id: "upload", label: "Upload and Manage Policies" },
    { id: "map", label: "Map Selected Policy" }
  ] as const;

  return (
    <section className="gc-step-rail">
      <div className="gc-step-head">
        <p className="gc-mono">Workflow State</p>
        <p>{nextStepText}</p>
      </div>
      <ol className="gc-step-list">
        {steps.map((step) => {
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
