import { useState } from "react";
import { Link } from "react-router-dom";

import { putAiValueObject, postWorkshopIntake, AiValueApiError } from "../lib/aiValueApi";

const steps = [
  "Client & Objective",
  "Workstream",
  "Use Case Discovery",
  "Prioritize",
  "Blueprint Workshop"
] as const;

type Step = (typeof steps)[number];

const VALUE_ROUTES = [
  { value: "CAPACITY_CREATION", label: "Capacity creation" },
  { value: "COST_REDUCTION", label: "Cost reduction" },
  { value: "QUALITY_IMPROVEMENT", label: "Quality improvement" },
  { value: "RISK_REDUCTION", label: "Risk reduction" },
  { value: "EXPERIENCE_IMPROVEMENT", label: "Experience improvement" },
  { value: "REVENUE_EXPANSION", label: "Revenue expansion" }
];

const PRIORITIES = [
  { value: "CANDIDATE", label: "Candidate" },
  { value: "PRIORITIZED", label: "Prioritized" },
  { value: "PILOT_SELECTED", label: "Pilot — start here" },
  { value: "DEFERRED", label: "Deferred" }
];

const COVERAGE_LANES: Array<{ key: string; label: string }> = [
  { key: "ai_activity", label: "AI activity evidence" },
  { key: "workflow", label: "Workflow evidence" },
  { key: "outcome", label: "Outcome reporting" },
  { key: "baseline", label: "Baseline window data" },
  { key: "trust", label: "Verification and trust signals" },
  { key: "assumptions", label: "Operating assumptions" },
  { key: "suppression", label: "Small-group protection" }
];

const COVERAGE_STATES = ["PRESENT", "CAVEATED", "MISSING"];

const ASSUMPTION_ROWS: Array<{ id: string; label: string }> = [
  { id: "case_mix_stability", label: "Work mix is stable across windows" },
  { id: "volume_context", label: "Volume changes are understood" },
  { id: "staffing_and_coverage_context", label: "Staffing and coverage context" },
  { id: "channel_mix_context", label: "Channel mix context" },
  { id: "process_or_policy_context", label: "Process or policy changes" },
  { id: "knowledge_base_context", label: "Knowledge base changes" },
  { id: "metric_definition_stability", label: "Metric definitions are stable" },
  { id: "ai_rollout_context", label: "AI rollout timing is known" }
];

interface UseCaseDraft {
  name: string;
  description: string;
  workflowFamily: string;
  impactRationale: string;
  effortRationale: string;
  impactedFunctions: string;
  dataSources: string;
  uncertainties: string;
  priority: string;
  objectiveIndex: string;
}

const emptyUseCase = (): UseCaseDraft => ({
  name: "",
  description: "",
  workflowFamily: "",
  impactRationale: "",
  effortRationale: "",
  impactedFunctions: "",
  dataSources: "",
  uncertainties: "",
  priority: "CANDIDATE",
  objectiveIndex: "0"
});

interface ObjectiveDraft {
  statement: string;
  challenge: string;
  initiative: string;
  outcome: string;
  timeline: string;
  ownerRole: string;
  measures: string;
}

const emptyObjective = (): ObjectiveDraft => ({
  statement: "",
  challenge: "",
  initiative: "",
  outcome: "",
  timeline: "",
  ownerRole: "",
  measures: ""
});

const MEASURE_DIRECTIONS: Record<string, string> = {
  improve: "IMPROVE",
  reduce: "REDUCE",
  hold: "MAINTAIN",
  maintain: "MAINTAIN"
};

const parseMeasures = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [measure, direction] = line.split("|").map((part) => part.trim());
      return {
        measure,
        expected_direction:
          MEASURE_DIRECTIONS[(direction ?? "improve").toLowerCase()] ?? "IMPROVE"
      };
    });

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const lines = (value: string) =>
  value.split("\n").map((line) => line.trim()).filter(Boolean);

const csv = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

const sessionRole = () => (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";
const sessionOrgId = () => (localStorage.getItem("orgId") ?? "org-1").trim() || "org-1";

const EXAMPLE = {
  clientName: "Northstar Enterprise",
  industry: "business_services",
  companySize: "5000_to_10000",
  strategicObjectives:
    "Improve customer retention through faster, higher-quality support\nScale support capacity without proportional headcount growth",
  sponsorRole: "vp_customer_experience",
  championRole: "support_systems_lead",
  ownerRole: "customer_support_business_sponsor",
  objectives: [
    {
      statement:
        "Create support capacity by reducing time spent locating trusted answers and drafting responses.",
      challenge:
        "Case volume is growing faster than the support team can scale, and knowledge is fragmented across systems.",
      initiative: "AI-assisted support workflows on Glean Search, Assistant, and approved Skills.",
      outcome: "Faster resolution and lower escalation pressure without quality loss.",
      timeline: "2026_h2_renewal_cycle",
      ownerRole: "customer_support_business_sponsor",
      measures:
        "Median case resolution time | reduce\nOpen backlog count | reduce\nSupport capacity absorbed without added headcount | improve"
    },
    {
      statement: "Hold or improve answer quality while support work accelerates.",
      challenge:
        "Faster responses are only valuable if reopen and escalation behavior does not degrade.",
      initiative: "Verification-first AI workflows with aggregate quality monitoring.",
      outcome: "Quality holds steady while resolution accelerates.",
      timeline: "2026_h2_renewal_cycle",
      ownerRole: "support_quality_owner",
      measures: "Reopen rate | hold\nEscalation rate | reduce"
    }
  ] as ObjectiveDraft[],
  workstreamFunction: "customer_support",
  roleFamilies: "support_agent, support_specialist, knowledge_owner",
  usersInScope: "240",
  systemsInScope: "support_case_management, knowledge_base, glean_assistant",
  useCases: [
    {
      name: "AI-assisted case resolution",
      description:
        "Agents use Search, Assistant, and approved Skills to locate trusted answers and draft responses for review.",
      workflowFamily: "customer_support_case_resolution",
      impactRationale:
        "Resolution time and escalation pressure are the largest drivers of support capacity.",
      effortRationale:
        "Workflows and knowledge sources already exist; change is concentrated in agent work habits.",
      impactedFunctions: "customer_support",
      dataSources: "support_case_management, glean_work_evidence",
      uncertainties:
        "Case mix shifts during the comparison window, Concurrent process changes in escalation policy",
      priority: "PILOT_SELECTED",
      objectiveIndex: "0"
    },
    {
      name: "Knowledge base upkeep assistance",
      description: "Knowledge owners use AI drafting support to keep trusted articles current.",
      workflowFamily: "support_knowledge_upkeep",
      impactRationale: "Stale knowledge drives repeat lookups and escalations.",
      effortRationale: "Smaller population; depends on the case-resolution pilot landing first.",
      impactedFunctions: "customer_support",
      dataSources: "knowledge_base",
      uncertainties: "Article quality review capacity",
      priority: "CANDIDATE",
      objectiveIndex: "1"
    }
  ] as UseCaseDraft[],
  clientQuestion: "Where should AI make support resolution measurably easier?",
  currentSteps:
    "Seller-facing agents search knowledge sources before responding\nAgents draft the customer response and verify the answer\nUnresolved cases move to escalation or specialist review",
  futureSteps:
    "Search and Assistant reduce time spent locating trusted answers\nApproved Skills support repeatable case-resolution workflows\nAggregate work evidence shows whether the workflow is adopted safely",
  frictionPoints:
    "Knowledge lives in many disconnected systems\nVerification work competes with response time",
  expectedChange: "Routine answer-finding shifts from hunting to review-and-confirm.",
  valueHypothesis:
    "AI-assisted support work may be associated with faster case resolution, lower escalation, and improved knowledge reuse.",
  primaryRoute: "CAPACITY_CREATION",
  baselineWindow: "2026-02-01_to_2026-03-31",
  comparisonWindow: "2026-04-01_to_2026-05-31",
  eligibleCases: "2300",
  assistantSessions: "1840",
  searchSessions: "2260",
  plannedSignals: "median_resolution_hours, escalation_rate, reopen_rate, backlog_count"
};

export const AIValueDiscovery = () => {
  const [activeStep, setActiveStep] = useState<Step>("Client & Objective");
  const [form, setForm] = useState({ ...EXAMPLE, objectives: [emptyObjective()], useCases: [emptyUseCase()] });
  const [coverage, setCoverage] = useState<Record<string, string>>(
    Object.fromEntries(COVERAGE_LANES.map(({ key }) => [key, key === "assumptions" ? "CAVEATED" : "PRESENT"]))
  );
  const [assumptions, setAssumptions] = useState<Record<string, { owner: string; state: string }>>(
    Object.fromEntries(ASSUMPTION_ROWS.map(({ id }) => [id, { owner: "", state: "MISSING" }]))
  );
  const [engagementSaved, setEngagementSaved] = useState(false);
  const [blueprintId, setBlueprintId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);

  const startBlank = () => {
    setForm({
      clientName: "", industry: "", companySize: "", strategicObjectives: "",
      sponsorRole: "", championRole: "", ownerRole: "",
      objectives: [emptyObjective()],
      workstreamFunction: "", roleFamilies: "", usersInScope: "", systemsInScope: "",
      useCases: [emptyUseCase()],
      clientQuestion: "", currentSteps: "", futureSteps: "", frictionPoints: "",
      expectedChange: "", valueHypothesis: "", primaryRoute: "CAPACITY_CREATION",
      baselineWindow: "", comparisonWindow: "", eligibleCases: "",
      assistantSessions: "", searchSessions: "", plannedSignals: ""
    });
    setEngagementSaved(false);
    setBlueprintId(null);
    setGaps([]);
    setNotice("Starting a fresh discovery.");
  };

  const loadExample = () => {
    setForm({ ...EXAMPLE, objectives: EXAMPLE.objectives.map((objective) => ({ ...objective })), useCases: EXAMPLE.useCases.map((useCase) => ({ ...useCase })) });
    setAssumptions(
      Object.fromEntries(
        ASSUMPTION_ROWS.map(({ id }, index) => [
          id,
          { owner: index < 2 ? "support_operations" : "customer_support_business_sponsor", state: index < 2 ? "PRESENT" : "CAVEATED" }
        ])
      )
    );
    setNotice("Loaded the example engagement. Walk the steps with the client and adjust.");
    setGaps([]);
  };

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const setUseCase = (index: number, field: keyof UseCaseDraft, value: string) =>
    setForm((prev) => {
      const useCases = prev.useCases.map((useCase, i) =>
        i === index ? { ...useCase, [field]: value } : useCase
      );
      return { ...prev, useCases };
    });

  const setObjective = (index: number, fieldName: keyof ObjectiveDraft, value: string) =>
    setForm((prev) => {
      const objectives = prev.objectives.map((objective, i) =>
        i === index ? { ...objective, [fieldName]: value } : objective
      );
      return { ...prev, objectives };
    });

  const pilotUseCase = form.useCases.find((useCase) => useCase.priority === "PILOT_SELECTED");
  const objectiveIdAt = (index: number) => {
    const objective = form.objectives[index];
    return `objective_${slug(objective?.statement ?? "").slice(0, 40) || `draft_${index + 1}`}`;
  };

  const buildEngagement = () => {
    const orgId = sessionOrgId();
    const clientId = `client_${slug(form.clientName) || "client"}`;
    return {
      schema_version: "FT_AI_VALUE_ENGAGEMENT_2026_06",
      engagement_id: `engagement_${slug(form.clientName) || "client"}_${slug(form.workstreamFunction) || "workstream"}`,
      org_id: orgId,
      client: {
        client_id: clientId,
        client_name: form.clientName,
        industry: form.industry,
        company_size: form.companySize,
        strategic_objectives: lines(form.strategicObjectives),
        executive_sponsor_role: form.sponsorRole,
        technical_champion_role: form.championRole,
        account_team_roles: ["value_consultant"]
      },
      business_objectives: form.objectives
        .filter((objective) => objective.statement)
        .map((objective, index) => ({
          objective_id: objectiveIdAt(index),
          objective_statement: objective.statement,
          challenge: objective.challenge,
          initiative: objective.initiative,
          positive_business_outcome: objective.outcome,
          decision_timeline: objective.timeline,
          owner_role: objective.ownerRole,
          ...(parseMeasures(objective.measures).length > 0
            ? { success_measures: parseMeasures(objective.measures) }
            : {})
        })),
      workstream: {
        workstream_id: `workstream_${slug(form.workstreamFunction) || "workstream"}`,
        function: form.workstreamFunction,
        role_families: csv(form.roleFamilies),
        users_in_scope: Number(form.usersInScope) || 0,
        systems_in_scope: csv(form.systemsInScope),
        sponsor_role: form.objectives[0]?.ownerRole || form.sponsorRole
      },
      use_cases: form.useCases
        .filter((useCase) => useCase.name)
        .map((useCase) => ({
          use_case_id: `uc_${slug(useCase.name)}`,
          name: useCase.name,
          description: useCase.description,
          impacted_functions: csv(useCase.impactedFunctions),
          impact_rationale: useCase.impactRationale,
          effort_rationale: useCase.effortRationale,
          data_sources: csv(useCase.dataSources),
          uncertainties: csv(useCase.uncertainties),
          priority_state: useCase.priority,
          workflow_family: useCase.workflowFamily || slug(useCase.name),
          objective_id: objectiveIdAt(Number(useCase.objectiveIndex) || 0)
        }))
    };
  };

  const saveEngagement = async () => {
    setBusy(true);
    setNotice(null);
    setGaps([]);
    try {
      const engagement = buildEngagement();
      await putAiValueObject(sessionRole(), "engagement", engagement.engagement_id, engagement);
      setEngagementSaved(true);
      setNotice("Engagement saved. The pilot use case is ready for the blueprint workshop.");
      setActiveStep("Blueprint Workshop");
    } catch (error) {
      if (error instanceof AiValueApiError && error.status === 422) {
        const payload = error.payload as { gaps?: string[] } | undefined;
        setGaps(payload?.gaps ?? []);
        setNotice("A few inputs still need attention before the engagement can be saved.");
      } else {
        setNotice("Could not reach the evidence engine. Check the session and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const createBlueprint = async () => {
    if (!pilotUseCase) {
      setNotice("Pick one use case as the pilot before running the blueprint workshop.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setGaps([]);
    try {
      const workflowFamily = pilotUseCase.workflowFamily || slug(pilotUseCase.name);
      const intake = {
        schema_version: "FT_AI_VALUE_WORKSHOP_INTAKE_2026_06",
        intake_id: `intake_${workflowFamily}_v1`,
        org_id: sessionOrgId(),
        workflow_family: workflowFamily,
        workflow_name: pilotUseCase.name,
        business_owner: { role: form.objectives[Number(pilotUseCase.objectiveIndex) || 0]?.ownerRole || form.sponsorRole, approval_state: "PRESENT" },
        client_question: form.clientQuestion,
        current_state_steps: lines(form.currentSteps),
        future_state_steps: lines(form.futureSteps),
        friction_points: lines(form.frictionPoints),
        expected_work_change: form.expectedChange,
        value_hypothesis: form.valueHypothesis,
        value_routes: { primary: form.primaryRoute, secondary: [] },
        windows: { baseline: form.baselineWindow, comparison: form.comparisonWindow },
        source_coverage: coverage,
        approved_aggregate_inputs: {
          case_population: { eligible_cases: Number(form.eligibleCases) || 0 },
          ai_activity: {
            assistant_sessions: Number(form.assistantSessions) || 0,
            search_sessions: Number(form.searchSessions) || 0
          },
          outcome_signals: { planned_signals: csv(form.plannedSignals) }
        },
        assumptions: ASSUMPTION_ROWS.map(({ id }) => ({
          assumption_id: id,
          owner: assumptions[id].owner,
          state: assumptions[id].state
        }))
      };
      const result = await postWorkshopIntake(sessionRole(), intake);
      setBlueprintId(result.blueprint.object_id);
      setNotice("Blueprint created from the workshop. Open the value workshop to continue the spine.");
    } catch (error) {
      if (error instanceof AiValueApiError && error.status === 422) {
        const payload = error.payload as { gaps?: string[] } | undefined;
        setGaps(payload?.gaps ?? []);
        setNotice("The workshop capture needs a few more inputs before the blueprint can be created.");
      } else {
        setNotice("Could not reach the evidence engine. Check the session and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, name: keyof typeof form, props: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={`f-${String(name)}`}>{label}</label>
      <input
        id={`f-${String(name)}`}
        value={String(form[name])}
        onChange={(event) => set(String(name), event.target.value)}
        {...props}
      />
    </div>
  );

  const area = (label: string, name: keyof typeof form, hint?: string) => (
    <div>
      <label htmlFor={`f-${String(name)}`}>{label}</label>
      <textarea
        id={`f-${String(name)}`}
        value={String(form[name])}
        onChange={(event) => set(String(name), event.target.value)}
      />
      {hint && <p className="ai-value-discovery-hint">{hint}</p>}
    </div>
  );

  return (
    <main className="ai-value-shell ai-value-discovery">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">Client Value Workshop</p>
          <h1>Discovery &amp; Blueprinting</h1>
          <p>Capture the client conversation: objective, use cases, priorities, and the workflow blueprint.</p>
        </div>
        <div className="ai-value-status-strip">
          <button type="button" className="ai-value-step" onClick={loadExample}>
            Load example engagement
          </button>
          <button type="button" className="ai-value-step" onClick={startBlank}>
            Start blank
          </button>
        </div>
      </header>

      {notice && <p role="status" className="ai-value-panel">{notice}</p>}
      {gaps.length > 0 && (
        <article className="ai-value-panel" role="alert">
          <h3>Still needed</h3>
          <ul>
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </article>
      )}

      <section className="ai-value-spine" aria-label="Discovery flow">
        {steps.map((step, index) => (
          <button
            key={step}
            type="button"
            className={activeStep === step ? "ai-value-step active" : "ai-value-step"}
            onClick={() => setActiveStep(step)}
            aria-current={activeStep === step ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {step}
          </button>
        ))}
      </section>

      <section className="ai-value-grid">
        {activeStep === "Client & Objective" && (
          <article className="ai-value-panel">
            <h3>Who is this for, and why now?</h3>
            <div className="ai-value-field-grid">
              {field("Client name", "clientName")}
              {field("Industry", "industry")}
              {field("Company size", "companySize")}
              {field("Executive sponsor (role)", "sponsorRole")}
              {field("Technical champion (role)", "championRole")}
            </div>
            {area("Strategic objectives (one per line)", "strategicObjectives")}
            <h4>Business objectives — the value review is held against these</h4>
            <p>
              Capture every objective the client wants measured. Each one gets owners and the
              measures the sponsor will accept later.
            </p>
            {form.objectives.map((objective, index) => (
              <div className="ai-value-usecase-card" key={index}>
                <label>Objective statement</label>
                <input
                  aria-label={`Objective ${index + 1} statement`}
                  value={objective.statement}
                  onChange={(event) => setObjective(index, "statement", event.target.value)}
                />
                <div className="ai-value-field-grid">
                  <div>
                    <label>The challenge in the client's words</label>
                    <input
                      value={objective.challenge}
                      onChange={(event) => setObjective(index, "challenge", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>The initiative</label>
                    <input
                      value={objective.initiative}
                      onChange={(event) => setObjective(index, "initiative", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>Outcome the sponsor cares about</label>
                    <input
                      value={objective.outcome}
                      onChange={(event) => setObjective(index, "outcome", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>Objective owner (role)</label>
                    <input
                      value={objective.ownerRole}
                      onChange={(event) => setObjective(index, "ownerRole", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>Decision timeline</label>
                    <input
                      value={objective.timeline}
                      onChange={(event) => setObjective(index, "timeline", event.target.value)}
                    />
                  </div>
                </div>
                <label>{`What the sponsor will measure (one per line, optionally "| improve", "| reduce", or "| hold")`}</label>
                <textarea
                  aria-label={`Objective ${index + 1} measures`}
                  value={objective.measures}
                  onChange={(event) => setObjective(index, "measures", event.target.value)}
                />
              </div>
            ))}
            <div className="ai-value-actions">
              <button
                type="button"
                className="ai-value-step"
                onClick={() =>
                  setForm((prev) => ({ ...prev, objectives: [...prev.objectives, emptyObjective()] }))
                }
              >
                Add another objective
              </button>
            </div>
          </article>
        )}

        {activeStep === "Workstream" && (
          <article className="ai-value-panel">
            <h3>Where will we look first?</h3>
            <div className="ai-value-field-grid">
              {field("Function or department", "workstreamFunction")}
              {field("People in scope (count)", "usersInScope")}
            </div>
            {area("Role families (comma separated)", "roleFamilies")}
            {area("Systems in scope (comma separated)", "systemsInScope")}
          </article>
        )}

        {activeStep === "Use Case Discovery" && (
          <article className="ai-value-panel">
            <h3>Where could AI make work measurably easier?</h3>
            {form.useCases.map((useCase, index) => (
              <div className="ai-value-usecase-card" key={index}>
                <label>Use case name</label>
                <input
                  aria-label={`Use case ${index + 1} name`}
                  value={useCase.name}
                  onChange={(event) => setUseCase(index, "name", event.target.value)}
                />
                <label>What changes for the people doing the work?</label>
                <textarea
                  value={useCase.description}
                  onChange={(event) => setUseCase(index, "description", event.target.value)}
                />
                <div className="ai-value-field-grid">
                  <div>
                    <label>Why it matters (impact)</label>
                    <input
                      value={useCase.impactRationale}
                      onChange={(event) => setUseCase(index, "impactRationale", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>What it takes (effort)</label>
                    <input
                      value={useCase.effortRationale}
                      onChange={(event) => setUseCase(index, "effortRationale", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>Functions touched (comma separated)</label>
                    <input
                      value={useCase.impactedFunctions}
                      onChange={(event) => setUseCase(index, "impactedFunctions", event.target.value)}
                    />
                  </div>
                  <div>
                    <label>Evidence sources (comma separated)</label>
                    <input
                      value={useCase.dataSources}
                      onChange={(event) => setUseCase(index, "dataSources", event.target.value)}
                    />
                  </div>
                </div>
                <label htmlFor={`uc-objective-${index}`}>Which objective does this serve?</label>
                <select
                  id={`uc-objective-${index}`}
                  value={useCase.objectiveIndex}
                  onChange={(event) => setUseCase(index, "objectiveIndex", event.target.value)}
                >
                  {form.objectives.map((objective, objectiveIndex) => (
                    <option key={objectiveIndex} value={String(objectiveIndex)}>
                      {objective.statement || `Objective ${objectiveIndex + 1}`}
                    </option>
                  ))}
                </select>
                <label>Open questions (comma separated)</label>
                <input
                  value={useCase.uncertainties}
                  onChange={(event) => setUseCase(index, "uncertainties", event.target.value)}
                />
              </div>
            ))}
            <div className="ai-value-actions">
              <button
                type="button"
                className="ai-value-step"
                onClick={() => setForm((prev) => ({ ...prev, useCases: [...prev.useCases, emptyUseCase()] }))}
              >
                Add another use case
              </button>
            </div>
          </article>
        )}

        {activeStep === "Prioritize" && (
          <article className="ai-value-panel">
            <h3>Pick the pilot with the client</h3>
            <p>One use case becomes the pilot; the rest stay on the roadmap.</p>
            {form.useCases.filter((useCase) => useCase.name).map((useCase, index) => (
              <div className="ai-value-usecase-card" key={index}>
                <h4>{useCase.name}</h4>
                <p>{useCase.impactRationale}</p>
                <label htmlFor={`priority-${index}`}>Priority</label>
                <select
                  id={`priority-${index}`}
                  value={useCase.priority}
                  onChange={(event) => setUseCase(index, "priority", event.target.value)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="ai-value-actions">
              <button type="button" className="ai-value-step" onClick={() => void saveEngagement()} disabled={busy}>
                {busy ? "Saving…" : engagementSaved ? "Engagement saved — save again" : "Save engagement"}
              </button>
            </div>
          </article>
        )}

        {activeStep === "Blueprint Workshop" && (
          <article className="ai-value-panel">
            <h3>
              Day-in-the-life workshop{pilotUseCase ? `: ${pilotUseCase.name}` : ""}
            </h3>
            {!pilotUseCase && <p>Pick a pilot use case in the Prioritize step first.</p>}
            {area("The client question on the wall", "clientQuestion")}
            <div className="ai-value-field-grid">
              <div>{area("How the work happens today (one step per line)", "currentSteps")}</div>
              <div>{area("The target workflow (one step per line)", "futureSteps")}</div>
            </div>
            {area("Friction the team named (one per line)", "frictionPoints")}
            {area("How the work itself changes", "expectedChange")}
            {area("The value hypothesis", "valueHypothesis")}
            <div className="ai-value-field-grid">
              <div>
                <label htmlFor="f-primaryRoute">Primary value route</label>
                <select
                  id="f-primaryRoute"
                  value={form.primaryRoute}
                  onChange={(event) => set("primaryRoute", event.target.value)}
                >
                  {VALUE_ROUTES.map((route) => (
                    <option key={route.value} value={route.value}>
                      {route.label}
                    </option>
                  ))}
                </select>
              </div>
              {field("Baseline window", "baselineWindow", { placeholder: "2026-02-01_to_2026-03-31" })}
              {field("Comparison window", "comparisonWindow", { placeholder: "2026-04-01_to_2026-05-31" })}
              {field("Eligible work items in scope", "eligibleCases")}
              {field("Assistant sessions (aggregate)", "assistantSessions")}
              {field("Search sessions (aggregate)", "searchSessions")}
            </div>
            {area("Outcome signals the client will report (comma separated)", "plannedSignals")}

            <h4>Evidence coverage today</h4>
            <div className="ai-value-field-grid">
              {COVERAGE_LANES.map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={`coverage-${key}`}>{label}</label>
                  <select
                    id={`coverage-${key}`}
                    value={coverage[key]}
                    onChange={(event) =>
                      setCoverage((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                  >
                    {COVERAGE_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state === "PRESENT" ? "In place" : state === "CAVEATED" ? "Partial" : "Not yet"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <h4>Operating assumptions and owners</h4>
            {ASSUMPTION_ROWS.map(({ id, label }) => (
              <div className="ai-value-field-grid" key={id}>
                <div>
                  <label htmlFor={`assumption-owner-${id}`}>{label} — owner (role)</label>
                  <input
                    id={`assumption-owner-${id}`}
                    value={assumptions[id].owner}
                    onChange={(event) =>
                      setAssumptions((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], owner: event.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`assumption-state-${id}`}>Status</label>
                  <select
                    id={`assumption-state-${id}`}
                    value={assumptions[id].state}
                    onChange={(event) =>
                      setAssumptions((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], state: event.target.value }
                      }))
                    }
                  >
                    <option value="PRESENT">Confirmed</option>
                    <option value="CAVEATED">Partly confirmed</option>
                    <option value="MISSING">Still open</option>
                  </select>
                </div>
              </div>
            ))}

            <div className="ai-value-actions">
              <button
                type="button"
                className="ai-value-step"
                onClick={() => void createBlueprint()}
                disabled={busy || !pilotUseCase}
              >
                {busy ? "Creating…" : "Create the workflow blueprint"}
              </button>
              {blueprintId && (
                <Link className="ai-value-step active" to="/ai-value-workspace">
                  Open the value workshop
                </Link>
              )}
            </div>
          </article>
        )}
      </section>
    </main>
  );
};
