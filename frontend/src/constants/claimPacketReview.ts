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
