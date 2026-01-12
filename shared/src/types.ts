export const TOOL_CLASSES = [
  "llm_chat",
  "research",
  "coding",
  "workflow_automation",
  "embedded_ai"
] as const;

export type ToolClass = (typeof TOOL_CLASSES)[number];

export type Role =
  | "ADMIN"
  | "EXEC_VIEWER"
  | "ENABLEMENT_LEAD"
  | "MANAGER"
  | "EMPLOYEE";

export const ALLOWED_CAPABILITIES = [
  "VIEW_ORG_AGGREGATES",
  "VIEW_TEAM_AGGREGATES",
  "MANAGE_ORG_CONFIG",
  "INGEST_DATA"
] as const;

export type Capability = (typeof ALLOWED_CAPABILITIES)[number];

export const FORBIDDEN_CAPABILITIES = [
  "VIEW_INDIVIDUAL_ACTIVITY",
  "VIEW_RAW_EVENTS"
] as const;

export const SIGNAL_NAMES = [
  "delegate_send_message",
  "delegate_file_update",
  "delegate_record_create",
  "delegate_record_update",
  "delegate_approval_request",
  "delegate_data_fetch",
  "delegate_code_commit",
  "delegate_schedule_event",
  "delegate_task_assign",
  "delegate_payment_initiate"
] as const;

export type SignalName = (typeof SIGNAL_NAMES)[number];

// v0 Agentic Behavioral Signals - Universal signal set for connector layer
export const V0_SIGNAL_NAMES = [
  "invoke_ai",
  "delegate_to_agent",
  "revoke_agent",
  "refine_request",
  "accept_output",
  "retry_after_mismatch",
  "override_to_manual"
] as const;

export type V0SignalName = (typeof V0_SIGNAL_NAMES)[number];

// Combined signal names type for compatibility
export type AnySignalName = SignalName | V0SignalName;

export const GROUP_TYPES = ["team", "role", "function", "org"] as const;

export type GroupType = (typeof GROUP_TYPES)[number];

export const PATTERN_TYPES = [
  "automation_emerging",
  "approval_workflow_mature",
  "cross_system_integration",
  "human_review_dominant",
  "data_intensive"
] as const;

export type PatternType = (typeof PATTERN_TYPES)[number];

export type PatternConfidence = "low" | "medium" | "high";

export type TrendDirection = "increasing" | "stable" | "decreasing";

export type TrendMagnitude = "slight" | "moderate" | "significant";
