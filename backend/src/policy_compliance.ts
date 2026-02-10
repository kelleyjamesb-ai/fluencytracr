import { z } from "zod";
import type {
  CanonicalControlSnapshotRecord,
  CanonicalControlState,
  ComplianceEventRecord,
  PolicyControlMappingRecord,
  PolicyDocumentRecord,
  PolicyUnresolvedClauseRecord
} from "./store";

export const PolicyUploadSchema = z
  .object({
    file_name: z.string().min(1),
    content_type: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    content_base64: z.string().min(1).optional()
  })
  .strict()
  .refine((value) => Boolean(value.content) || Boolean(value.content_base64), {
    message: "Provide content or content_base64"
  });

export type PolicyUploadInput = z.infer<typeof PolicyUploadSchema>;

export const UnresolvedClauseDecisionSchema = z
  .object({
    action: z.enum(["map", "ignore", "defer"]),
    rationale: z.string().min(1),
    control_name: z.string().min(1).optional(),
    status: z.enum(["enabled", "disabled", "partial", "unknown"]).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === "map") {
      if (!value.control_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "control_name is required when action is map"
        });
      }
      if (!value.status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "status is required when action is map"
        });
      }
    }
  });

export type UnresolvedClauseDecisionInput = z.infer<typeof UnresolvedClauseDecisionSchema>;

export const canonicalStatusFromLegacyBoolean = (value: boolean): CanonicalControlState => {
  return value ? "enabled" : "disabled";
};

export const canonicalStatusFromLegacyValue = (value: unknown): CanonicalControlState => {
  if (typeof value === "boolean") {
    return canonicalStatusFromLegacyBoolean(value);
  }
  if (value === "enabled" || value === "disabled" || value === "partial" || value === "unknown") {
    return value;
  }
  return "unknown";
};

const CONTROL_NAMES = [
  "ai_enabled_status",
  "data_retention_policy_status",
  "model_training_opt_out_status",
  "external_sharing_disabled_status",
  "compliance_posture_flag"
] as const;

const CONTROL_RULES: Array<{
  control: Exclude<(typeof CONTROL_NAMES)[number], "compliance_posture_flag">;
  positive: string[];
  negative: string[];
}> = [
  {
    control: "ai_enabled_status",
    positive: ["ai enabled", "allow ai", "approved ai use", "ai is permitted"],
    negative: ["ai disabled", "ban ai", "prohibit ai", "ai is not permitted"]
  },
  {
    control: "data_retention_policy_status",
    positive: ["data retention policy", "retention policy", "retention period", "retain data"],
    negative: ["no retention policy", "retention not defined", "do not retain data"]
  },
  {
    control: "model_training_opt_out_status",
    positive: ["opt out of model training", "not used for model training", "training opt-out", "do not train on"],
    negative: ["used for model training", "may train on customer data", "training data may include"]
  },
  {
    control: "external_sharing_disabled_status",
    positive: ["external sharing disabled", "no external sharing", "sharing disabled", "prohibit external sharing"],
    negative: ["external sharing allowed", "share externally", "external sharing enabled"]
  }
];

export type ExtractedClause = {
  clause_id: string;
  text: string;
};

export const normalizePolicyContent = (input: PolicyUploadInput): {
  rawText: string;
  sourceFormat: PolicyDocumentRecord["sourceFormat"];
  contentType: string;
} => {
  if (input.content) {
    return {
      rawText: input.content,
      sourceFormat: input.content_type?.includes("json") ? "json" : "text",
      contentType: input.content_type ?? "text/plain"
    };
  }
  const decoded = Buffer.from(input.content_base64 ?? "", "base64").toString("utf-8");
  return {
    rawText: decoded,
    sourceFormat: "base64",
    contentType: input.content_type ?? "application/octet-stream"
  };
};

export const extractPolicyClauses = (rawText: string): ExtractedClause[] => {
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => line.split(/[.;]/))
    .map((piece) => piece.trim())
    .filter((piece) => piece.length >= 16);

  return normalized.map((text, index) => ({
    clause_id: `clause-${index + 1}`,
    text
  }));
};

const toLower = (value: string) => value.toLowerCase();

const matchAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const buildStatusFromSignals = (positive: string[], negative: string[]): CanonicalControlState => {
  if (positive.length > 0 && negative.length > 0) {
    return "partial";
  }
  if (negative.length > 0) {
    return "disabled";
  }
  if (positive.length > 0) {
    return "enabled";
  }
  return "unknown";
};

const confidenceForStatus = (status: CanonicalControlState, matchedClauses: number): number => {
  if (status === "unknown") {
    return 0;
  }
  if (status === "partial") {
    return 0.6;
  }
  return Math.min(0.95, 0.65 + matchedClauses * 0.1);
};

const parseStructuredJsonControls = (rawText: string): PolicyControlMappingRecord[] | null => {
  try {
    const parsed = JSON.parse(rawText) as {
      controls?: Array<{ control_name?: string; status?: string; control_value?: boolean }>;
    };
    if (!Array.isArray(parsed.controls)) {
      return null;
    }
    const records: PolicyControlMappingRecord[] = [];
    parsed.controls.forEach((control, index) => {
      if (!control.control_name || typeof control.control_name !== "string") {
        return;
      }
      const status = canonicalStatusFromLegacyValue(control.status ?? control.control_value);
      records.push({
        control_name: control.control_name,
        status,
        confidence: status === "unknown" ? 0 : 0.95,
        matched_clause_ids: [`json-control-${index + 1}`],
        rationale: "Parsed from structured policy controls payload."
      });
    });
    return records.length > 0 ? records : null;
  } catch (_error) {
    return null;
  }
};

export const mapPolicyToControls = (
  rawText: string,
  clauses: ExtractedClause[]
): {
  controls: PolicyControlMappingRecord[];
  unresolvedClauses: PolicyUnresolvedClauseRecord[];
} => {
  const fromStructured = parseStructuredJsonControls(rawText);
  if (fromStructured) {
    const posture = deriveCompliancePosture(fromStructured);
    return {
      controls: [...fromStructured, posture],
      unresolvedClauses: []
    };
  }

  const controls: PolicyControlMappingRecord[] = [];
  const matchedClauseIds = new Set<string>();

  CONTROL_RULES.forEach((rule) => {
    const positiveMatches: string[] = [];
    const negativeMatches: string[] = [];
    clauses.forEach((clause) => {
      const text = toLower(clause.text);
      const hasPositive = matchAny(text, rule.positive);
      const hasNegative = matchAny(text, rule.negative);
      if (hasPositive) {
        positiveMatches.push(clause.clause_id);
        matchedClauseIds.add(clause.clause_id);
      }
      if (hasNegative) {
        negativeMatches.push(clause.clause_id);
        matchedClauseIds.add(clause.clause_id);
      }
    });

    const status = buildStatusFromSignals(positiveMatches, negativeMatches);
    controls.push({
      control_name: rule.control,
      status,
      confidence: confidenceForStatus(status, positiveMatches.length + negativeMatches.length),
      matched_clause_ids: [...positiveMatches, ...negativeMatches],
      rationale:
        status === "unknown"
          ? "No deterministic policy language matched known control phrases."
          : `Derived from deterministic keyword matches for ${rule.control}.`
    });
  });

  controls.push(deriveCompliancePosture(controls));

  const unresolvedClauses: PolicyUnresolvedClauseRecord[] = clauses
    .filter((clause) => !matchedClauseIds.has(clause.clause_id))
    .map((clause) => ({
      clause_id: clause.clause_id,
      text: clause.text,
      reason: "No deterministic control mapping found."
    }));

  // Keep unresolved output concise and actionable.
  const trimmedUnresolved = unresolvedClauses.slice(0, 50);
  if (unresolvedClauses.length > 50) {
    trimmedUnresolved.push({
      clause_id: "overflow",
      text: `${unresolvedClauses.length - 50} additional clauses omitted.`,
      reason: "Unresolved clause list truncated."
    });
  }

  return { controls, unresolvedClauses: trimmedUnresolved };
};

export const deriveCompliancePosture = (
  controls: Pick<PolicyControlMappingRecord, "control_name" | "status">[]
): PolicyControlMappingRecord => {
  const relevant = controls.filter((control) => control.control_name !== "compliance_posture_flag");
  const statuses = relevant.map((control) => control.status);
  let status: CanonicalControlState = "unknown";
  if (statuses.some((entry) => entry === "disabled")) {
    status = "disabled";
  } else if (statuses.every((entry) => entry === "enabled")) {
    status = "enabled";
  } else if (statuses.some((entry) => entry === "partial" || entry === "unknown")) {
    status = "partial";
  }
  return {
    control_name: "compliance_posture_flag",
    status,
    confidence: status === "unknown" ? 0 : 0.8,
    matched_clause_ids: [],
    rationale: "Derived from aggregate control posture."
  };
};

export const buildCanonicalSnapshots = (
  orgId: string,
  controls: PolicyControlMappingRecord[],
  now: string
): CanonicalControlSnapshotRecord[] => {
  const bucketStart = now.slice(0, 10);
  return controls.map((control) => ({
    orgId,
    control_name: control.control_name,
    status: control.status,
    source: "policy_mapping",
    bucket_start: bucketStart,
    bucket_end: bucketStart,
    updatedAt: now
  }));
};

export const buildComplianceSummary = (
  controls: Array<{ control_name: string; status: CanonicalControlState }>
) => {
  const counts = controls.reduce(
    (acc, control) => {
      acc[control.status] += 1;
      return acc;
    },
    { enabled: 0, disabled: 0, partial: 0, unknown: 0 }
  );
  const overall_status: CanonicalControlState =
    counts.disabled > 0 ? "disabled" : counts.partial > 0 ? "partial" : counts.unknown > 0 ? "unknown" : "enabled";

  return {
    counts,
    overall_status,
    controls
  };
};

export const sortComplianceEvents = (events: ComplianceEventRecord[]) =>
  [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const normalizeComplianceMode = (mode?: string): "shadow" | "enforced" => {
  return mode === "enforced" ? "enforced" : "shadow";
};
