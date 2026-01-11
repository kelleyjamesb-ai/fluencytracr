import { z } from "zod";
import { TOOL_CLASSES } from "./types";

export const ToolClassSchema = z.enum(TOOL_CLASSES);

export const MetricObservationSchema = z.object({
  groupKey: z.string(),
  groupType: z.enum(["org", "team", "role"]),
  metricName: z.string(),
  metricValue: z.number().nullable(),
  bucketStart: z.string(),
  bucketEnd: z.string(),
  suppressed: z.boolean().optional()
});
