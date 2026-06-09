export const aiValueWorkspace = {
  packetId: "executive_packet_customer_support_v1",
  title: "Customer Support AI Value Validation Packet",
  workflowName: "Customer support case resolution",
  workflowFamily: "customer_support_case_resolution",
  valueRoute: "CAPACITY_CREATION",
  decision: "HOLD_FOR_ASSUMPTIONS",
  claimState: "INTERNAL_ONLY",
  blueprint: {
    hypothesis:
      "AI-assisted support work may be associated with faster case resolution, lower escalation, and improved knowledge reuse.",
    currentStateSteps: [
      "Support agent searches knowledge sources",
      "Support agent drafts response",
      "Support agent escalates unresolved cases"
    ],
    futureStateSteps: [
      "Support agent uses Search and Assistant for knowledge access",
      "Approved Skills and agents support repeatable resolution workflows",
      "Verification and recovery signals are reviewed in aggregate"
    ]
  },
  metrics: [
    {
      metricId: "support_median_resolution_hours",
      name: "Median resolution time",
      unit: "hours",
      owner: "support_operations"
    },
    {
      metricId: "support_backlog_count",
      name: "Open backlog count",
      unit: "cases",
      owner: "support_operations"
    }
  ],
  scenarioBands: [
    {
      band: "CONSERVATIVE",
      interpretation:
        "Directional capacity scenario using the narrowest customer-owned assumption set."
    },
    {
      band: "BASE_CASE",
      interpretation: "Directional capacity scenario using all recommended capacity metrics."
    },
    {
      band: "EXPANDED",
      interpretation:
        "Directional capacity scenario for later customer-owned validation after assumptions are reviewed."
    }
  ],
  readinessChecks: [
    ["workflow_state", "PRESENT"],
    ["metric_state", "PRESENT"],
    ["baseline_state", "PRESENT"],
    ["assumption_state", "CAVEATED"],
    ["scenario_state", "PRESENT"],
    ["governance_state", "PRESENT"]
  ],
  safeClaims: [
    "Aggregate support metrics and AI work evidence can support internal planning for a capacity-creation investigation."
  ],
  caveatedClaims: [
    "Customer-owned assumptions must be reviewed before executive validation."
  ],
  requiredCaveats: [
    "This is a pre-ROI planning artifact.",
    "Missing or caveated assumptions prevent external economic claims."
  ],
  blockedClaims: [
    "roi_proof",
    "causality_claim",
    "individual_scoring",
    "team_or_manager_ranking",
    "hr_analytics",
    "productivity_measurement",
    "customer_facing_economic_output"
  ],
  nextActions: [
    "Review missing staffing, channel mix, process, knowledge, metric definition, and rollout assumptions with customer owners."
  ],
  markdownPreview: `# Customer Support AI Value Validation Packet

Decision: HOLD_FOR_ASSUMPTIONS

Claim state: INTERNAL_ONLY

Required caveat: Missing or caveated assumptions prevent external economic claims.`
};
