import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import yaml from "js-yaml";

const TriggerCorrectionSchema = z
  .object({
    event: z.literal("HUMAN_CORRECTION"),
    phase: z.literal("post_ai_insertion"),
    before: z.literal("content_share")
  })
  .strict();

const TriggerAbandonmentSchema = z
  .object({
    event: z.literal("AI_OUTPUT_DISCARDED"),
    without_human_use: z.literal(true)
  })
  .strict();

const AppearanceSchema = z
  .object({
    max_duration_ms: z.number().int().positive(),
    non_deterministic: z.boolean(),
    ephemeral: z.boolean()
  })
  .strict();

const SuppressionCorrectionsSchema = z
  .object({
    repeat_within_session: z.boolean(),
    same_workflow_step: z.boolean(),
    multiple_corrections: z.boolean(),
    ambiguity: z.boolean(),
    cooldown_ms: z.number().int().positive()
  })
  .strict();

const SuppressionAbandonmentSchema = z
  .object({
    repeat_within_session: z.boolean(),
    same_workflow_step: z.boolean(),
    rapid_retries: z.boolean(),
    ambiguity: z.boolean(),
    cooldown_ms: z.number().int().positive()
  })
  .strict();

const EnforcementSchema = z
  .object({
    layer: z.array(z.enum(["client", "api"])).min(1),
    fail_closed: z.literal(true)
  })
  .strict();

const PlacementBaseSchema = z
  .object({
    id: z.string().min(1),
    role: z.string().min(1),
    workflow: z.string().min(1),
    signal: z.string().min(1),
    appearance: AppearanceSchema,
    enforcement: EnforcementSchema
  })
  .strict();

const PlacementCorrectionSchema = PlacementBaseSchema.extend({
  trigger: TriggerCorrectionSchema,
  suppression: SuppressionCorrectionsSchema
}).strict();

const PlacementAbandonmentSchema = PlacementBaseSchema.extend({
  trigger: TriggerAbandonmentSchema,
  suppression: SuppressionAbandonmentSchema
}).strict();

export const WaimSchema = z
  .object({
    version: z.literal("v1"),
    placements: z.array(z.union([PlacementCorrectionSchema, PlacementAbandonmentSchema])).min(1)
  })
  .strict();

export type Waim = z.infer<typeof WaimSchema>;
export type WaimPlacement = z.infer<typeof PlacementCorrectionSchema> | z.infer<typeof PlacementAbandonmentSchema>;

const defaultWaimPath = () =>
  process.env.WAIM_PATH ?? path.join(process.cwd(), "governance", "waim", "waim.v1.yaml");

export const loadWaim = (filePath: string = defaultWaimPath()): Waim | null => {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = yaml.load(raw);
    const result = WaimSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
};
