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
  pattern:
    | "CALIBRATED_FLUENCY"
    | "BLIND_EFFICIENCY"
    | "RECOVERY_MATURITY"
    | "FRICTION_LOOP"
    | "UNDERTRUST_AVOIDANCE";
  inference_version: string;
  parameter_hash: string;
};

export type InferenceAuditRecord = {
  inference_version: string;
  parameter_hash: string;
};
