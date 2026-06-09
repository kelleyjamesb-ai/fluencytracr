export const aiValueWorkspace = {
  title: "AI Value Workshop",
  workflowName: "Customer support case resolution",
  valueRouteLabel: "Capacity creation",
  decisionLabel: "Needs client assumptions",
  claimModeLabel: "Internal planning only",
  workshopSummary:
    "Build the client workflow canvas, connect it to approved value signals, and prepare sponsor-ready language without overstating ROI or causality.",
  canvas: {
    clientQuestion: "Where should AI make support resolution measurably easier?",
    today: [
      "Agent searches across knowledge sources before responding",
      "Agent drafts the customer response and verifies the answer",
      "Unresolved cases move to escalation or specialist review"
    ],
    target: [
      "Glean Search and Assistant reduce time spent locating trusted answers",
      "Approved Skills support repeatable case-resolution workflows",
      "Aggregate FluencyTracr evidence shows whether the workflow is being adopted safely"
    ],
    openDecisions: [
      "Which case categories are in scope for the pilot?",
      "Which support owner signs off on baseline and comparison windows?",
      "What process changes happened during the same period?"
    ]
  },
  valueSignals: [
    {
      question: "Are cases resolving faster?",
      measure: "Median time to resolution",
      source: "Support case management system",
      status: "Ready to map"
    },
    {
      question: "Is the open backlog moving down?",
      measure: "Open backlog count",
      source: "Support operations reporting",
      status: "Ready to map"
    },
    {
      question: "Are fewer cases escalating?",
      measure: "Escalation rate",
      source: "Escalation reporting",
      status: "Recommended next"
    },
    {
      question: "Is answer quality holding steady?",
      measure: "Reopen or quality-review rate",
      source: "Quality review process",
      status: "Needs owner"
    }
  ],
  valueStory: [
    {
      label: "Most cautious",
      interpretation: "Use only resolution-time movement and present it as an internal planning signal."
    },
    {
      label: "Working case",
      interpretation:
        "Combine resolution time, backlog, and rollout timing to frame a capacity-creation hypothesis."
    },
    {
      label: "Expansion case",
      interpretation:
        "Add escalation and quality signals after the customer validates the operating assumptions."
    }
  ],
  evidenceChecks: [
    {
      label: "Workflow canvas",
      state: "Ready",
      detail: "The customer support resolution workflow has a draft current and target state."
    },
    {
      label: "Glean work evidence",
      state: "Ready",
      detail: "Aggregate Search, Assistant, Skills, and agent activity can support adoption context."
    },
    {
      label: "Outcome source",
      state: "Ready",
      detail: "Support case data can provide resolution, backlog, escalation, and quality signals."
    },
    {
      label: "Client assumptions",
      state: "Needs input",
      detail: "Staffing, channel mix, case routing, and rollout timing need business-owner review."
    },
    {
      label: "Governance review",
      state: "Ready",
      detail: "The workspace stays aggregate-only and avoids ROI proof, causality, and people scoring."
    }
  ],
  safeLanguage: {
    canSay: [
      "The pilot has enough aggregate evidence to support an internal value-planning discussion.",
      "The strongest current route is capacity creation in support case resolution.",
      "External value claims should wait until the customer validates assumptions."
    ],
    needsValidation: [
      "Baseline and comparison windows",
      "Staffing and channel mix",
      "Concurrent support process changes",
      "Definition of in-scope case categories"
    ],
    cannotSay: [
      "ROI proof",
      "Causal productivity claims",
      "Employee, manager, or team scoring",
      "HR or performance analytics"
    ]
  },
  executiveBrief: {
    sponsorDecision: "Hold for assumptions before external value claims",
    sponsorQuestion:
      "Do we have customer-approved assumptions and outcome definitions for a defensible value readout?",
    nextAction:
      "Run a 45-minute value mapping session with Support Operations, AI program ownership, and the Glean account team.",
    summary:
      "The workshop is ready for internal planning. The next step is client validation of assumptions before any external economic narrative."
  }
};
