import {
  GleanSignalReadinessMapSchema,
  type GleanSignalReadinessMap
} from "@fluencytracr/shared";
import { z } from "zod";

const GleanReadinessStatusSchema = z.enum(["present", "missing", "suppressed", "not_computed"]);
const NonPresentReadinessStatusSchema = z.enum(["missing", "suppressed", "not_computed"]);

const ReadinessCountsSchema = z
  .object({
    present: z.number().int().nonnegative(),
    missing: z.number().int().nonnegative(),
    suppressed: z.number().int().nonnegative(),
    not_computed: z.number().int().nonnegative()
  })
  .strict();

const ReadinessNextActionSchema = z
  .object({
    signal_family: z.string().min(1),
    action: z.string().min(1),
    owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

export const AgentReadinessSummarySchema = z
  .object({
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().min(1),
    source_system: z.literal("Glean"),
    readiness_counts: ReadinessCountsSchema,
    ready_signal_families: z.array(z.string().min(1)),
    non_computable_signal_families: z.array(
      z
        .object({
          signal_family: z.string().min(1),
          readiness_status: NonPresentReadinessStatusSchema,
          suppression_reasons: z.array(z.string())
        })
        .strict()
    ),
    next_actions: z.array(ReadinessNextActionSchema),
    suppression_applied: z.boolean(),
    suppression_reasons: z.array(z.string()),
    decision_safe_guidance: z.string().min(1)
  })
  .strict();

export type AgentReadinessSummary = z.infer<typeof AgentReadinessSummarySchema>;

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function guidanceFor(map: GleanSignalReadinessMap): string {
  const hasSuppression = map.entries.some((entry) => entry.readiness_status === "suppressed");
  const hasNotComputed = map.entries.some((entry) => entry.readiness_status === "not_computed");
  const parts = ["Use this as aggregate readiness only; do not infer unavailable signal values."];
  if (hasSuppression) {
    parts.push("Suppression is active for at least one signal family; preserve reason codes only.");
  }
  if (hasNotComputed) {
    parts.push("Not-computed families require export, scrub, or join-key confirmation before use.");
  }
  parts.push("Do not request or expose raw source records, prompts, transcripts, users, teams, or rankings.");
  return parts.join(" ");
}

export function buildAgentReadinessSummary(raw: unknown): AgentReadinessSummary {
  const map = GleanSignalReadinessMapSchema.parse(raw);
  const counts: Record<z.infer<typeof GleanReadinessStatusSchema>, number> = {
    present: 0,
    missing: 0,
    suppressed: 0,
    not_computed: 0
  };
  for (const entry of map.entries) {
    counts[entry.readiness_status] += 1;
  }
  const nonComputableEntries = map.entries.filter((entry) => entry.readiness_status !== "present");
  const suppressionReasons = unique(
    map.entries.flatMap((entry) =>
      entry.suppression_applied || entry.readiness_status === "suppressed" ? entry.suppression_reasons : []
    )
  );

  return AgentReadinessSummarySchema.parse({
    org_id: map.org_id,
    window: map.window,
    generated_at: map.generated_at,
    source_system: map.source_system,
    readiness_counts: counts,
    ready_signal_families: map.entries
      .filter((entry) => entry.readiness_status === "present")
      .map((entry) => entry.signal_family),
    non_computable_signal_families: nonComputableEntries.map((entry) => ({
      signal_family: entry.signal_family,
      readiness_status: entry.readiness_status,
      suppression_reasons: entry.suppression_reasons
    })),
    next_actions: map.next_actions,
    suppression_applied: suppressionReasons.length > 0,
    suppression_reasons: suppressionReasons,
    decision_safe_guidance: guidanceFor(map)
  });
}

export function validateAgentReadinessSummary(raw: unknown): AgentReadinessSummary {
  return AgentReadinessSummarySchema.parse(raw);
}
