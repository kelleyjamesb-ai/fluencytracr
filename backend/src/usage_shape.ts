import { ToolClass, TOOL_CLASSES } from "./tool_inventory";

export type UsageShape = "rare" | "occasional" | "regular" | "habitual";

export type UsageShapeRecord = {
  orgId: string;
  teamId?: string;
  roleId?: string;
  toolClass: ToolClass;
  category: UsageShape;
  recordedAt: string;
};

export const USAGE_SHAPES: UsageShape[] = ["rare", "occasional", "regular", "habitual"];

export const ensureToolClass = (toolClass: string): ToolClass => {
  if (!TOOL_CLASSES.includes(toolClass as ToolClass)) {
    throw new Error("Unsupported tool class");
  }
  return toolClass as ToolClass;
};

export const ensureUsageShape = (shape: string): UsageShape => {
  if (!USAGE_SHAPES.includes(shape as UsageShape)) {
    throw new Error("Unsupported usage shape");
  }
  return shape as UsageShape;
};

export const normalizeUsageTimestamp = (input?: string): string => {
  if (!input) {
    return new Date().toISOString();
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid timestamp");
  }
  return parsed.toISOString();
};
