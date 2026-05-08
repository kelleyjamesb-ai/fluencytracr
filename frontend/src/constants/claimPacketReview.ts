export const NIELSEN_CLAIM_PACKET_STRONGEST_SAFE_CLAIM = {
  schema_version: "SSC_2026_05",
  generated_at: "2026-05-07T00:00:00.000Z",
  source_system: "FluencyTracr",
  roi_positioning: "final_claim_layer",
  strongest_claim: {
    claim_id: "claim:cs_response_time_improvement",
    hypothesis_id: "cs_response_time_improvement",
    outcome_domain: "customer_success",
    work_pattern: "troubleshoot",
    maturity_stage: "outcome_linked",
    claim_readiness: "caveated",
    safe_claim_language:
      "Covered evidence supports a contribution story for faster customer-response workflows, with attribution and baseline caveats attached.",
    evidence_used: ["product_telemetry", "artifact_output", "business_outcome"],
    aggregate_metric_refs: ["cs.covered_glean_activity.window", "cs.response_time_delta.window"],
    caveats: [
      "Response-time movement may reflect customer mix, staffing, or process changes.",
      "Do not claim Glean caused customer health improvement without stronger design."
    ]
  },
  evidence_gaps: [
    {
      evidence_type: "financial_model",
      blocks: "finance_approved",
      action: "Attach a finance-approved value model before ROI, payback, or finance-approved value language is enabled."
    }
  ],
  blocked_stronger_claims: [
    "Do not claim ROI, payback, or finance-approved value until financial_model evidence is present and approved."
  ],
  blocked_methodology_claims: [],
  upgrade_actions: [
    "Ask Finance to approve recapture, role-rate, and cost assumptions for CS response-time movement.",
    "Validate baseline/control logic with Data Science before causal language is considered."
  ],
  governance_boundaries: [
    "No raw prompts, raw responses, transcripts, query text, tool payloads, or file contents.",
    "No direct identifiers, manager views, team rankings, or productivity scoring.",
    "ROI is downstream of evidence, controls, outcomes, and finance approval."
  ]
} as const;

export const NIELSEN_CLAIM_PACKET_AI_WORK_VALUE_GRAPH = {
  schema_version: "AIWVG_2026_05",
  graph_id: "ai-work-value-graph:nielsen-synthetic:qbr-preview",
  org_id: "org-nielsen-synthetic",
  window: "quarterly",
  generated_at: "2026-05-07T00:00:00.000Z",
  source_system: "FluencyTracr",
  summary: {
    overall_claim_readiness: "caveated",
    highest_maturity_stage: "outcome_linked",
    covered_surfaces: ["search", "chat", "ai_answers", "agents", "skills"],
    covered_outcome_domains: ["customer_success", "finance"],
    blocked_claims: [
      "Do not claim ROI or payback until the selected methodology snapshot and finance model are customer-safe."
    ],
    next_evidence_actions: [
      "Attach approved financial model evidence before upgrading QBR language from caveated to finance-approved."
    ]
  },
  nodes: [
    {
      id: "surface:chat",
      kind: "surface",
      label: "Chat",
      claim_readiness: "evidence_present",
      evidence: [
        {
          evidence_type: "product_telemetry",
          evidence_strength: "medium",
          claim_readiness: "evidence_present",
          source_surface: "chat",
          validation_status: "validated",
          aggregate_metric_ref: "cs.covered_glean_activity.window"
        }
      ],
      surface: "chat",
      observed_patterns: ["summarize", "draft", "troubleshoot"],
      maturity_stage: "outcome_linked"
    },
    {
      id: "pattern:troubleshoot",
      kind: "work_pattern",
      label: "Troubleshoot",
      claim_readiness: "caveated",
      evidence: [
        {
          evidence_type: "business_outcome",
          evidence_strength: "medium",
          claim_readiness: "caveated",
          maturity_stage: "outcome_linked",
          validation_status: "in_review",
          aggregate_metric_ref: "cs.response_time_delta.window"
        }
      ],
      work_pattern: "troubleshoot",
      supported_surfaces: ["search", "chat", "ai_answers"],
      maturity_stage: "outcome_linked",
      value_hypotheses: ["customer_experience"]
    },
    {
      id: "outcome:customer_success",
      kind: "outcome",
      label: "Customer success",
      claim_readiness: "caveated",
      evidence: [
        {
          evidence_type: "business_outcome",
          evidence_strength: "medium",
          claim_readiness: "caveated",
          maturity_stage: "outcome_linked",
          validation_status: "in_review",
          aggregate_metric_ref: "cs.response_time_delta.window"
        }
      ],
      outcome_domain: "customer_success",
      value_hypotheses: ["customer_experience"],
      supported_patterns: ["troubleshoot"],
      maturity_stage: "outcome_linked"
    }
  ],
  edges: [
    {
      id: "edge:chat_troubleshoot",
      edge_type: "surface_supports_pattern",
      from_node_id: "surface:chat",
      to_node_id: "pattern:troubleshoot",
      evidence_types: ["product_telemetry"],
      claim_readiness: "evidence_present",
      evidence_strength: "medium",
      value_hypotheses: ["customer_experience"],
      required_caveats: ["Covered surfaces only."]
    },
    {
      id: "edge:troubleshoot_customer_success",
      edge_type: "pattern_links_outcome",
      from_node_id: "pattern:troubleshoot",
      to_node_id: "outcome:customer_success",
      evidence_types: ["business_outcome"],
      claim_readiness: "caveated",
      evidence_strength: "medium",
      value_hypotheses: ["customer_experience"],
      required_caveats: ["Attribution and baseline caveats required."]
    }
  ]
} as const;

export const NIELSEN_CLAIM_PACKET_VALUE_EVIDENCE_PACK = {
  schema_version: "GVE_2026_05",
  org_id: "org-nielsen-synthetic",
  window: "quarterly",
  generated_at: "2026-05-07T00:00:00.000Z",
  source_system: "Glean",
  value_posture: "directional",
  executive_summary: {
    summary:
      "Synthetic Nielsen-style evidence shows covered search, chat, AI Answers, skills, and agent activity with financial language still governed by methodology approval.",
    approved_language:
      "Covered Glean surfaces show directional contribution evidence for recurring work acceleration, with financial claims held to the methodology gate.",
    caveats: [
      "Financial value language depends on the selected methodology snapshot.",
      "Agentic and MCP/action evidence remains incomplete for customer-facing claims."
    ]
  },
  coverage_lanes: [
    {
      lane: "surface_usage",
      evidence_state: "present",
      covered_surfaces: ["ui_chat", "ui_search", "ai_answers"],
      missing_surfaces: ["chat_api", "search_api"],
      notes: ["Covered UI surfaces are present; API surfaces are excluded from this packet."]
    },
    {
      lane: "skill_lifecycle",
      evidence_state: "present",
      covered_surfaces: ["skills"],
      missing_surfaces: [],
      notes: ["Skill enablement and reuse are present as aggregate evidence."]
    },
    {
      lane: "agent_lifecycle",
      evidence_state: "present",
      covered_surfaces: ["auto_mode_agents", "content_triggered_agents"],
      missing_surfaces: ["scheduled_agents"],
      notes: ["Agent run evidence is present but not sufficient for finance-approved outcome language."]
    },
    {
      lane: "mcp_action_boundary",
      evidence_state: "not_computed",
      covered_surfaces: [],
      missing_surfaces: ["mcp_actions", "embedded_hosts"],
      notes: ["Governed action evidence is not computed in this QBR packet."]
    },
    {
      lane: "artifact_output",
      evidence_state: "present",
      covered_surfaces: ["canvas_artifacts"],
      missing_surfaces: [],
      notes: ["Artifact output evidence is aggregate-only."]
    },
    {
      lane: "control_evidence",
      evidence_state: "suppressed",
      covered_surfaces: [],
      missing_surfaces: ["protect_runtime_controls"],
      notes: ["Control evidence is suppressed until policy and review states are attached."]
    },
    {
      lane: "assumptions",
      evidence_state: "present",
      covered_surfaces: [],
      missing_surfaces: [],
      notes: ["Assumptions are present but not approved for customer-safe ROI language."]
    }
  ],
  skill_lifecycle: {
    evidence_state: "present",
    skill_types: ["org", "platform"],
    enabled_skill_count: 18,
    invocation_count: 1240,
    successful_invocation_count: 1030,
    reused_skill_count: 11,
    associated_agent_count: 6,
    notes: ["Aggregate skill reuse supports reusable expertise language."]
  },
  agent_lifecycle: {
    evidence_state: "present",
    agent_types: ["auto_mode", "content_triggered"],
    created_count: 12,
    tested_count: 10,
    enabled_count: 8,
    run_count: 420,
    completed_run_count: 344,
    failed_run_count: 31,
    retried_run_count: 45,
    triggered_run_count: 260,
    artifact_output_count: 72,
    action_invocation_count: 0,
    notes: ["Agent evidence supports internal planning, not customer-safe financial language."]
  },
  mcp_action_boundary: {
    evidence_state: "not_computed",
    host_classes: ["managed_saas", "embedded_host"],
    operation_classes: ["read", "write"],
    approved_tool_count: 0,
    hitl_state: "not_computed",
    activity_log_state: "not_computed",
    policy_decision_state: "not_computed",
    host_attribution_confidence: "not_computed",
    notes: ["No MCP/action claim should be upgraded from this packet."]
  },
  artifact_outputs: {
    evidence_state: "present",
    artifact_types: ["document", "slide", "interactive_page"],
    artifact_count: 96,
    created_count: 78,
    refreshed_artifact_count: 18,
    externally_shared_count: 14,
    notes: ["Artifacts are counted as aggregate outputs only."]
  },
  control_evidence: {
    evidence_state: "suppressed",
    control_families: ["runtime_ai_guardrail", "agent_alignment"],
    policy_surfaces: ["assistant", "interactive_agents", "mcp_actions"],
    policy_coverage_state: "not_computed",
    blocked_event_state: "suppressed",
    flagged_event_state: "suppressed",
    review_event_state: "not_computed",
    alignment_check_state: "not_computed",
    notes: ["Control claims require approved policy evidence before they become customer-facing."]
  },
  assumptions: {
    evidence_state: "present",
    assumption_count: 9,
    low_confidence_count: 2,
    low_confidence_assumption_count: 2,
    high_sensitivity_count: 3,
    high_sensitivity_assumption_count: 3,
    approved_for_customer_claims: false,
    approval_state: "internal_only",
    notes: ["High-sensitivity assumptions remain internal-only for this packet."]
  },
  claim_readiness: [
    {
      claim_id: "glean.time_saved.covered_surfaces",
      claim_type: "time_saved",
      evaluation_state: "surface",
      evidence_state: "present",
      confidence_basis: "derived_aggregate",
      readiness_state: "customer_safe_with_caveats",
      language_mode: "customer_safe_with_caveats",
      reason_codes: ["directional_only", "coverage_limited"],
      contributing_lanes: ["surface_usage", "assumptions"],
      approved_language:
        "Covered UI surfaces show directional time-savings evidence with methodology caveats attached.",
      customer_safe_language:
        "Covered Glean surfaces show directional time-savings evidence, limited to the measured surfaces and methodology assumptions."
    },
    {
      claim_id: "glean.roi.customer_value_to_cost",
      claim_type: "roi",
      evaluation_state: "suppress",
      evidence_state: "not_safe_to_claim",
      confidence_basis: "assumption_backed",
      readiness_state: "suppressed",
      language_mode: "suppressed",
      reason_codes: ["roi_translation_not_approved", "assumption_dominates_result"],
      contributing_lanes: ["assumptions"]
    },
    {
      claim_id: "glean.mcp.governed_action_boundary",
      claim_type: "governed_action",
      evaluation_state: "suppress",
      evidence_state: "not_computed",
      confidence_basis: "insufficient",
      readiness_state: "not_computed",
      language_mode: "suppressed",
      reason_codes: ["missing_source", "governance_approval_missing"],
      contributing_lanes: ["mcp_action_boundary", "control_evidence"]
    }
  ],
  next_instrumentation_actions: [
    {
      lane: "mcp_action_boundary",
      action: "Attach governed MCP/action activity logs before making action-execution claims.",
      owner: "data_governance",
      priority: "high"
    },
    {
      lane: "control_evidence",
      action: "Attach policy coverage and review evidence before making security posture claims.",
      owner: "customer_admin",
      priority: "high"
    },
    {
      lane: "assumptions",
      action: "Ask Finance to approve the value model before ROI or payback language is customer-facing.",
      owner: "fluencytracr_operator",
      priority: "high"
    }
  ]
} as const;
