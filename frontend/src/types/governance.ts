export type ComplianceStatus = "enabled" | "disabled" | "partial" | "unknown";

export type ComplianceStatusResponse = {
  mode: "shadow" | "enforced";
  as_of: string;
  overall_status: ComplianceStatus;
  counts: Record<ComplianceStatus, number>;
  freshness?: {
    last_event_at: string | null;
    stale: boolean;
  };
  controls?: Array<{
    control_name: string;
    status: ComplianceStatus;
    source: "legacy_import" | "policy_mapping";
    updated_at: string;
  }>;
};

export type ComplianceEventsResponse = {
  events: Array<{
    event_id: string;
    event_type: string;
    created_at: string;
    policy_id: string | null;
    status: string | null;
  }>;
};

export type PolicySummary = {
  policy_id: string;
  file_name: string;
  content_type: string;
  source_format: string;
  clause_count: number;
  created_at: string;
  latest_mapping: {
    mapping_id: string;
    generated_at: string;
    controls_mapped: number;
    unresolved_clauses: number;
  } | null;
};

export type PoliciesResponse = {
  policies: PolicySummary[];
};

export type MappingResponse = {
  policy_id: string;
  mapping_id: string;
  generated_at: string;
  controls: Array<{
    control_name: string;
    status: "enabled" | "disabled" | "partial" | "unknown";
    confidence: number;
  }>;
  unresolved_clauses: Array<{
    clause_id: string;
    reason: string;
  }>;
};
