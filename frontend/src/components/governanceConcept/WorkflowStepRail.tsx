type WorkflowStepRailProps = {
  nextStepText: string;
  hasPendingParsedUploads: boolean;
  hasPolicies: boolean;
  hasSelectedPolicy: boolean;
  hasMapping: boolean;
};

const stepState = (
  step: "parse" | "upload" | "select" | "map" | "review",
  flags: Omit<WorkflowStepRailProps, "nextStepText">
) => {
  if (step === "parse") {
    return flags.hasPendingParsedUploads || flags.hasPolicies ? "done" : "active";
  }
  if (step === "upload") {
    return flags.hasPendingParsedUploads ? "active" : flags.hasPolicies ? "done" : "pending";
  }
  if (step === "select") {
    if (!flags.hasPolicies) {
      return "pending";
    }
    return flags.hasSelectedPolicy ? "done" : "active";
  }
  if (step === "map") {
    if (!flags.hasSelectedPolicy) {
      return "pending";
    }
    return flags.hasMapping ? "done" : "active";
  }
  if (!flags.hasMapping) {
    return "pending";
  }
  return "active";
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
    { id: "parse", label: "Parse Documents" },
    { id: "upload", label: "Upload Policies" },
    { id: "select", label: "Select Version" },
    { id: "map", label: "Run Mapping" },
    { id: "review", label: "Review Hotspots" }
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
