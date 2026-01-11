export type ToolClass =
  | "llm_chat"
  | "research"
  | "coding"
  | "workflow_automation"
  | "embedded_ai";

export type ToolInventoryRecord = {
  orgId: string;
  teamId: string;
  toolClass: ToolClass;
  firstSeen: string;
  lastSeen: string;
};

export const TOOL_CLASSES: ToolClass[] = [
  "llm_chat",
  "research",
  "coding",
  "workflow_automation",
  "embedded_ai"
];

export const normalizeSeenTimestamp = (input?: string): string => {
  if (!input) {
    return new Date().toISOString();
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid timestamp");
  }
  return parsed.toISOString();
};
