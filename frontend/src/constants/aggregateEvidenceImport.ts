import { GLEAN_CLAIM_PACKET_REAL_SOURCE_READINESS } from "./realSourceReadiness";

export const GLEAN_AGGREGATE_EVIDENCE_IMPORT = {
  schema_version: "AEI_2026_05",
  import_id: "aggregate_evidence_import:org-nielsen-synthetic:quarterly:2026_05",
  org_id: "org-nielsen-synthetic",
  window: "quarterly",
  generated_at: "2026-05-08T00:00:00.000Z",
  import_path: "admin_exported_aggregate_upload",
  real_source_readiness_manifest: GLEAN_CLAIM_PACKET_REAL_SOURCE_READINESS,
  aggregate_evidence: [
    {
      evidence_record_id: "aggregate:methodology_snapshot:approval_state",
      source_input_id: "source:methodology_snapshot",
      evidence_type: "methodology_approval",
      evidence_state: "present",
      aggregate_metric_refs: ["methodology.approval_state.window"],
      aggregate_values: [
        {
          metric_name: "approved_snapshot_count",
          value: 1,
          unit: "count",
          aggregation_level: "methodology"
        }
      ],
      notes: ["Methodology snapshot metadata is ready for review."]
    },
    {
      evidence_record_id: "aggregate:value_evidence_pack:surface_coverage",
      source_input_id: "source:value_evidence_pack",
      evidence_type: "source_coverage",
      evidence_state: "present",
      aggregate_metric_refs: ["glean.surface_coverage.window"],
      aggregate_values: [
        {
          metric_name: "covered_surface_count",
          value: 3,
          unit: "count",
          aggregation_level: "surface"
        }
      ],
      notes: ["Presented for review but withheld until aggregate export fields are confirmed."]
    },
    {
      evidence_record_id: "aggregate:mcp_action_boundary:coverage",
      source_input_id: "source:mcp_action_boundary",
      evidence_type: "action_log",
      evidence_state: "not_computed",
      aggregate_metric_refs: ["glean.mcp_action_boundary.window"],
      aggregate_values: [
        {
          metric_name: "approved_tool_count",
          value: 0,
          unit: "count",
          aggregation_level: "source_input"
        }
      ],
      notes: ["MCP/action evidence is withheld behind host attribution and activity coverage blockers."]
    },
    {
      evidence_record_id: "aggregate:financial_approval:customer_safe_effect",
      source_input_id: "source:customer_safe_financial_approval",
      evidence_type: "financial_model",
      evidence_state: "missing",
      aggregate_metric_refs: ["methodology.customer_safe_claim_effect.window"],
      aggregate_values: [
        {
          metric_name: "customer_safe_financial_model_count",
          value: 0,
          unit: "count",
          aggregation_level: "methodology"
        }
      ],
      notes: ["Customer-safe financial approval is not present."]
    }
  ],
  governance_boundaries: [
    "Aggregate Evidence Import v1 is review only and writes no persistent records.",
    "No raw events, raw content, direct identifiers, rankings, manager views, or productivity scoring.",
    "Accepted aggregate evidence does not upgrade claim readiness."
  ]
} as const;
