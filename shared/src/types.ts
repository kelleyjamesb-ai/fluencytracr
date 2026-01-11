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
