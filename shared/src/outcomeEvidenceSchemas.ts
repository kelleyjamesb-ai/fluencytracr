import { z } from "zod";

export const OutcomeEvidenceJoinKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/);

const FORBIDDEN_FIELD_NAME_RE = /(?:user|email|name|id)/i;
const MIN_PERIOD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isIsoDate = (value: string) => !Number.isNaN(Date.parse(value));

const rejectForbiddenAttestationKeys = (
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number> = ["source_attestation"]
) => {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenAttestationKeys(entry, ctx, [...path, index]));
    return;
  }
  for (const [fieldName, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, fieldName];
    if (FORBIDDEN_FIELD_NAME_RE.test(fieldName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: nextPath,
        message: "free-form source_attestation fields may not contain user, email, name, or id"
      });
    }
    rejectForbiddenAttestationKeys(nestedValue, ctx, nextPath);
  }
};

export const OutcomeEvidenceCreateSchema = z
  .object({
    workflow_id: z.string().min(1).max(180),
    outcome_metric: z.string().min(1).max(180),
    outcome_unit: z.string().min(1).max(80),
    period_start: z.string().refine(isIsoDate, "period_start must be ISO8601."),
    period_end: z.string().refine(isIsoDate, "period_end must be ISO8601."),
    aggregate_value: z.number().finite(),
    cohort_size: z.number().int().min(1),
    source_system: z.string().min(1).max(120),
    jbtd_id: OutcomeEvidenceJoinKeySchema.nullable().optional(),
    persona_id: OutcomeEvidenceJoinKeySchema.nullable().optional(),
    aggregate_kind: z.string().min(1).max(80).nullable().optional(),
    source_attestation: z.record(z.unknown()).optional()
  })
  .strict()
  .superRefine((payload, ctx) => {
    const periodStart = Date.parse(payload.period_start);
    const periodEnd = Date.parse(payload.period_end);

    if (periodEnd <= periodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period_end"],
        message: "period_end must be strictly after period_start."
      });
    }
    if (periodEnd - periodStart < MIN_PERIOD_DAYS * MS_PER_DAY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period_end"],
        message: "Outcome evidence periods must span at least 7 days."
      });
    }
    if (periodEnd > Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period_end"],
        message: "period_end may not be in the future."
      });
    }
    if (payload.cohort_size < 5 && payload.aggregate_kind !== "team_level_kpi") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cohort_size"],
        message: "INSUFFICIENT_VOLUME"
      });
    }
    rejectForbiddenAttestationKeys(payload.source_attestation, ctx);
  });

export const OutcomeEvidenceQuerySchema = z
  .object({
    workflow_id: z.string().min(1).max(180),
    period_start: z.string().refine(isIsoDate, "period_start must be ISO8601."),
    period_end: z.string().refine(isIsoDate, "period_end must be ISO8601."),
    jbtd_id: OutcomeEvidenceJoinKeySchema.nullable().optional(),
    persona_id: OutcomeEvidenceJoinKeySchema.nullable().optional()
  })
  .strict()
  .refine((query) => Date.parse(query.period_end) > Date.parse(query.period_start), {
    path: ["period_end"],
    message: "period_end must be strictly after period_start."
  });

export type OutcomeEvidenceCreate = z.infer<typeof OutcomeEvidenceCreateSchema>;
export type OutcomeEvidenceQuery = z.infer<typeof OutcomeEvidenceQuerySchema>;

export type OutcomeEvidenceRecord = OutcomeEvidenceCreate & {
  org_id: string;
  evidence_id: string;
  ingested_at: string;
};
