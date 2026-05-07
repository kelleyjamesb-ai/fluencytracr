export type JudgmentEvent = {
  event_id: string;
  schema_version: string;
  source_system: "legacy_fluency";
  workflow_id: string;
  role_context: "EXEC" | "MANAGER" | "IC" | "UNKNOWN";
  workflow_risk_level: "LOW" | "MEDIUM" | "HIGH";
  surface_type: "CHAT" | "DOC_BLOCK" | "CODE_BLOCK" | "SUMMARY";
  event_type: "ACCEPT" | "EDIT" | "REJECT" | "ABANDON" | "OVERRIDE";
  human_action_timestamp: string;
  latency_bucket: "IMMEDIATE" | "SHORT_DELAY" | "LONG_DELAY";
};

export type PatternInferenceRecord = {
  scope_key: string;
  scope_type: "WORKFLOW_ROLE_RISK" | "WORKFLOW_RISK" | "ROLE_RISK";
  window_start: string;
  window_end: string;
  pattern:
    | "CALIBRATED_FLUENCY"
    | "BLIND_EFFICIENCY"
    | "RECOVERY_MATURITY"
    | "FRICTION_LOOP"
    | "UNDERTRUST_AVOIDANCE"
    | "NO_PATTERN";
  confidence_level: "WITHHOLD" | "LOW" | "MEDIUM" | "HIGH";
  evidence_count: number;
  coverage_days: number;
  surface_mix: Record<JudgmentEvent["surface_type"], number>;
  top_drivers: string[];
  inference_version: string;
  parameter_hash: string;
  code_commit_hash: string;
  generated_at: string;
};

export type InferenceAuditRecord = {
  inference_version: string;
  parameter_hash: string;
  generated_at: string;
  scopes_processed: number;
  withheld_count: number;
};
