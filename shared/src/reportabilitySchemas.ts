import { z } from "zod";

import {
  GleanReadinessStatusSchema,
  GleanSignalFamilySchema,
  GleanSignalReadinessMapSchema
} from "./gleanSignalReadinessSchemas";

export const ReportabilitySchemaVersionSchema = z.literal("FT_REPORTABILITY_2026_05");

export const ReportContextSchema = z.enum([
  "roi",
  "agent_insights",
  "skills_reporting",
  "mcp_reporting",
  "transformation_narrative"
]);

export const ReportabilityStateSchema = z.enum([
  "REPORTABLE",
  "REPORTABLE_WITH_CAVEATS",
  "INTERNAL_ONLY",
  "SUPPRESSED",
  "UNSUPPORTED"
]);

export const EvidenceConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW", "UNVERIFIED"]);

export const ReportSurfaceSchema = z.enum([
  "chat",
  "search",
  "ai_answers",
  "agents",
  "skills",
  "mcp",
  "apis",
  "gleanbot"
]);

export const ClaimTypeSchema = z.enum([
  "covered_time_saved",
  "surface_adoption",
  "workflow_coverage",
  "agent_observability",
  "skill_lifecycle_visibility",
  "mcp_tool_observability",
  "agent_roi_included",
  "skill_roi_included",
  "mcp_roi_included",
  "api_roi_included",
  "gleanbot_roi_included",
  "total_productivity_impact",
  "causal_productivity_lift",
  "individual_productivity",
  "team_ranking"
]);

export const ClaimDispositionSchema = z.enum(["allowed", "blocked"]);

const ReportabilityClaimSchema = z
  .object({
    claim_type: ClaimTypeSchema,
    claim: z.string().min(1).max(500)
  })
  .strict();

export const ReportabilityClaimTaxonomyEntrySchema = z
  .object({
    claim_type: ClaimTypeSchema,
    claim: z.string().min(1).max(500),
    default_disposition: ClaimDispositionSchema,
    report_contexts: z.array(ReportContextSchema).min(1),
    rationale: z.string().min(1).max(500)
  })
  .strict();

const SurfaceReadinessSchema = z
  .object({
    surface: ReportSurfaceSchema,
    required_for_context: z.boolean(),
    signal_families: z.array(GleanSignalFamilySchema).min(1),
    readiness_status: GleanReadinessStatusSchema,
    caveats: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

export const ReportabilityDecisionSchema = z
  .object({
    schema_version: ReportabilitySchemaVersionSchema,
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    report_context: ReportContextSchema,
    reportability: ReportabilityStateSchema,
    evidence_confidence: EvidenceConfidenceSchema,
    included_surfaces: z.array(ReportSurfaceSchema).default([]),
    excluded_surfaces: z.array(ReportSurfaceSchema).default([]),
    surface_readiness: z.array(SurfaceReadinessSchema).default([]),
    required_caveats: z.array(z.string().min(1).max(500)).default([]),
    allowed_claims: z.array(ReportabilityClaimSchema).default([]),
    blocked_claims: z.array(ReportabilityClaimSchema).default([]),
    next_actions: z
      .array(
        z
          .object({
            action: z.string().min(1).max(500),
            owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
            priority: z.enum(["high", "medium", "low"])
          })
          .strict()
      )
      .default([])
  })
  .strict();

export const ReportabilityEvaluationRequestSchema = z
  .object({
    report_context: ReportContextSchema,
    readiness_map: GleanSignalReadinessMapSchema,
    generated_at: z.string().datetime().optional()
  })
  .strict();

export const CustomerEvidenceAppendixSchemaVersionSchema = z.literal("FT_EVIDENCE_APPENDIX_2026_05");

const AppendixExcludedSurfaceSchema = z
  .object({
    surface: ReportSurfaceSchema,
    reason: z.string().min(1).max(500)
  })
  .strict();

export const CustomerEvidenceAppendixSchema = z
  .object({
    schema_version: CustomerEvidenceAppendixSchemaVersionSchema,
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    report_context: ReportContextSchema,
    reportability: ReportabilityStateSchema,
    evidence_confidence: EvidenceConfidenceSchema,
    summary: z.string().min(1).max(500),
    covered_surfaces: z.array(ReportSurfaceSchema).default([]),
    excluded_surfaces: z.array(AppendixExcludedSurfaceSchema).default([]),
    required_caveats: z.array(z.string().min(1).max(500)).default([]),
    blocked_claims: z.array(ReportabilityClaimSchema).default([]),
    evidence_gaps: z.array(z.string().min(1).max(500)).default([]),
    governance_posture: z.array(z.string().min(1).max(500)).default([]),
    next_actions: z
      .array(
        z
          .object({
            action: z.string().min(1).max(500),
            owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
            priority: z.enum(["high", "medium", "low"])
          })
          .strict()
      )
      .default([])
  })
  .strict();

export const ReportabilityGateSchemaVersionSchema = z.literal("FT_REPORTABILITY_GATE_2026_05");

export const ReportabilityCallerSystemSchema = z.enum([
  "roi_model",
  "agent_insights",
  "skills_reporting",
  "mcp_reporting",
  "transformation_report",
  "customer_evidence_appendix"
]);

export const ReportabilityGateRequestSchema = z
  .object({
    schema_version: ReportabilityGateSchemaVersionSchema,
    caller_system: ReportabilityCallerSystemSchema,
    report_context: ReportContextSchema,
    requested_claims: z.array(ClaimTypeSchema).default([]),
    readiness_map: GleanSignalReadinessMapSchema,
    generated_at: z.string().datetime().optional()
  })
  .strict();

const RequestedClaimResultSchema = z
  .object({
    claim_type: ClaimTypeSchema,
    disposition: ClaimDispositionSchema,
    reason: z.string().min(1).max(500)
  })
  .strict();

export const ReportabilityGateResponseSchema = z
  .object({
    schema_version: ReportabilityGateSchemaVersionSchema,
    caller_system: ReportabilityCallerSystemSchema,
    report_context: ReportContextSchema,
    decision: ReportabilityDecisionSchema,
    appendix: CustomerEvidenceAppendixSchema,
    requested_claim_results: z.array(RequestedClaimResultSchema).default([])
  })
  .strict();

export type ReportabilityDecision = z.infer<typeof ReportabilityDecisionSchema>;
export type ReportabilityEvaluationRequest = z.infer<typeof ReportabilityEvaluationRequestSchema>;
export type ReportSurface = z.infer<typeof ReportSurfaceSchema>;
export type ReportabilityClaim = z.infer<typeof ReportabilityClaimSchema>;
export type ReportabilityClaimTaxonomyEntry = z.infer<typeof ReportabilityClaimTaxonomyEntrySchema>;
export type CustomerEvidenceAppendix = z.infer<typeof CustomerEvidenceAppendixSchema>;
export type ReportabilityGateRequest = z.infer<typeof ReportabilityGateRequestSchema>;
export type ReportabilityGateResponse = z.infer<typeof ReportabilityGateResponseSchema>;

type GleanReadinessStatus = z.infer<typeof GleanReadinessStatusSchema>;
type GleanSignalFamily = z.infer<typeof GleanSignalFamilySchema>;
type ReportContext = z.infer<typeof ReportContextSchema>;

const ROI_SURFACE_REQUIREMENTS: Array<{
  surface: ReportSurface;
  required_for_context: boolean;
  signal_families: GleanSignalFamily[];
}> = [
  { surface: "chat", required_for_context: true, signal_families: ["assistant"] },
  { surface: "search", required_for_context: true, signal_families: ["search_document_retrieval"] },
  { surface: "ai_answers", required_for_context: true, signal_families: ["insights"] },
  { surface: "agents", required_for_context: false, signal_families: ["agent_run", "agent_step"] },
  { surface: "skills", required_for_context: false, signal_families: ["skill_lifecycle"] },
  { surface: "mcp", required_for_context: false, signal_families: ["mcp_usage"] },
  { surface: "apis", required_for_context: false, signal_families: ["api_usage"] },
  { surface: "gleanbot", required_for_context: false, signal_families: ["gleanbot"] }
];

const AGENT_INSIGHTS_SURFACE_REQUIREMENTS: Array<{
  surface: ReportSurface;
  required_for_context: boolean;
  signal_families: GleanSignalFamily[];
}> = [
  { surface: "agents", required_for_context: true, signal_families: ["agent_run", "agent_step"] },
  { surface: "mcp", required_for_context: false, signal_families: ["mcp_usage"] },
  { surface: "skills", required_for_context: false, signal_families: ["skill_lifecycle"] }
];

const SKILLS_REPORTING_SURFACE_REQUIREMENTS: Array<{
  surface: ReportSurface;
  required_for_context: boolean;
  signal_families: GleanSignalFamily[];
}> = [
  { surface: "skills", required_for_context: true, signal_families: ["skill_lifecycle"] },
  { surface: "agents", required_for_context: false, signal_families: ["agent_run", "agent_step"] },
  { surface: "mcp", required_for_context: false, signal_families: ["mcp_usage"] }
];

const MCP_REPORTING_SURFACE_REQUIREMENTS: Array<{
  surface: ReportSurface;
  required_for_context: boolean;
  signal_families: GleanSignalFamily[];
}> = [
  { surface: "mcp", required_for_context: true, signal_families: ["mcp_usage"] },
  { surface: "agents", required_for_context: false, signal_families: ["agent_run", "agent_step"] },
  { surface: "skills", required_for_context: false, signal_families: ["skill_lifecycle"] }
];

const SURFACE_REQUIREMENTS_BY_CONTEXT: Record<ReportContext, Array<{
  surface: ReportSurface;
  required_for_context: boolean;
  signal_families: GleanSignalFamily[];
}>> = {
  roi: ROI_SURFACE_REQUIREMENTS,
  agent_insights: AGENT_INSIGHTS_SURFACE_REQUIREMENTS,
  skills_reporting: SKILLS_REPORTING_SURFACE_REQUIREMENTS,
  mcp_reporting: MCP_REPORTING_SURFACE_REQUIREMENTS,
  transformation_narrative: []
};

export const REPORTABILITY_CLAIM_TAXONOMY: ReportabilityClaimTaxonomyEntry[] = [
  {
    claim_type: "covered_time_saved",
    claim: "Estimated time saved on covered Glean surfaces.",
    default_disposition: "allowed",
    report_contexts: ["roi"],
    rationale: "Allowed only when at least one required ROI surface is present and required caveats travel with the estimate."
  },
  {
    claim_type: "surface_adoption",
    claim: "Observed usage coverage for included Glean surfaces.",
    default_disposition: "allowed",
    report_contexts: ["roi", "agent_insights", "skills_reporting", "mcp_reporting", "transformation_narrative"],
    rationale: "Surface coverage can be reported as observation, not as maturity, causality, or productivity."
  },
  {
    claim_type: "agent_observability",
    claim: "Agent workflows are structurally observable for covered agent surfaces.",
    default_disposition: "allowed",
    report_contexts: ["agent_insights"],
    rationale: "Allowed when agent run or step evidence is present; this is observability, not agent success or business impact."
  },
  {
    claim_type: "workflow_coverage",
    claim: "Workflow-level coverage is available for included agent evidence.",
    default_disposition: "allowed",
    report_contexts: ["agent_insights"],
    rationale: "Allowed as coverage posture for included evidence, not as workflow quality or outcome success."
  },
  {
    claim_type: "skill_lifecycle_visibility",
    claim: "Skill lifecycle activity is visible for covered skills reporting surfaces.",
    default_disposition: "allowed",
    report_contexts: ["skills_reporting"],
    rationale: "Allowed when skill lifecycle evidence is present; this does not claim skill invocation, quality, or business impact."
  },
  {
    claim_type: "mcp_tool_observability",
    claim: "MCP tool usage is structurally observable for covered MCP reporting surfaces.",
    default_disposition: "allowed",
    report_contexts: ["mcp_reporting"],
    rationale: "Allowed when MCP usage evidence is present; this does not claim MCP success, productivity, or value."
  },
  {
    claim_type: "agent_roi_included",
    claim: "Agent ROI is included in the estimate.",
    default_disposition: "blocked",
    report_contexts: ["roi"],
    rationale: "Agent evidence coverage does not authorize agent ROI inclusion without explicit value-estimation rules."
  },
  {
    claim_type: "skill_roi_included",
    claim: "Skills ROI is included in the estimate.",
    default_disposition: "blocked",
    report_contexts: ["roi"],
    rationale: "Skill evidence coverage does not authorize skills ROI inclusion without explicit value-estimation rules."
  },
  {
    claim_type: "mcp_roi_included",
    claim: "MCP ROI is included in the estimate.",
    default_disposition: "blocked",
    report_contexts: ["roi"],
    rationale: "MCP evidence coverage does not authorize MCP ROI inclusion without explicit value-estimation rules."
  },
  {
    claim_type: "api_roi_included",
    claim: "API ROI is included in the estimate.",
    default_disposition: "blocked",
    report_contexts: ["roi"],
    rationale: "API evidence coverage does not authorize API ROI inclusion without explicit value-estimation rules."
  },
  {
    claim_type: "gleanbot_roi_included",
    claim: "Gleanbot ROI is included in the estimate.",
    default_disposition: "blocked",
    report_contexts: ["roi"],
    rationale: "Gleanbot evidence coverage does not authorize Gleanbot ROI inclusion without explicit value-estimation rules."
  },
  {
    claim_type: "total_productivity_impact",
    claim: "Total AI productivity impact across the organization.",
    default_disposition: "blocked",
    report_contexts: ["roi", "agent_insights", "skills_reporting", "mcp_reporting", "transformation_narrative"],
    rationale: "A covered-surface estimate cannot support total organizational AI productivity claims."
  },
  {
    claim_type: "causal_productivity_lift",
    claim: "Glean caused a productivity lift.",
    default_disposition: "blocked",
    report_contexts: ["roi", "agent_insights", "skills_reporting", "mcp_reporting", "transformation_narrative"],
    rationale: "Readiness and usage evidence do not establish causality."
  },
  {
    claim_type: "individual_productivity",
    claim: "Individual productivity or performance score.",
    default_disposition: "blocked",
    report_contexts: ["roi", "agent_insights", "skills_reporting", "mcp_reporting", "transformation_narrative"],
    rationale: "FluencyTracr is aggregate-first and does not report individual performance."
  },
  {
    claim_type: "team_ranking",
    claim: "Team or manager ranking based on AI usage.",
    default_disposition: "blocked",
    report_contexts: ["roi", "agent_insights", "skills_reporting", "mcp_reporting", "transformation_narrative"],
    rationale: "Ranking teams or managers creates governance risk and exceeds the evidence boundary."
  }
];

const STATUS_PRIORITY: Record<GleanReadinessStatus, number> = {
  present: 4,
  not_computed: 3,
  suppressed: 2,
  missing: 1
};

function combineStatuses(statuses: GleanReadinessStatus[]): GleanReadinessStatus {
  if (statuses.length === 0) {
    return "missing";
  }
  return statuses.reduce((best, status) => (STATUS_PRIORITY[status] > STATUS_PRIORITY[best] ? status : best));
}

function caveatForStatus(surface: ReportSurface, status: GleanReadinessStatus): string[] {
  if (status === "present") {
    return [];
  }
  if (status === "suppressed") {
    return [`${surface} evidence exists but is suppressed by governance or evidence safety policy.`];
  }
  if (status === "not_computed") {
    return [`${surface} evidence is not yet computed or validated for this reporting window.`];
  }
  return [`${surface} evidence is not available for this reporting window.`];
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function claimForType(claim_type: z.infer<typeof ClaimTypeSchema>): ReportabilityClaimTaxonomyEntry {
  const claim = REPORTABILITY_CLAIM_TAXONOMY.find((entry) => entry.claim_type === claim_type);
  if (!claim) {
    throw new Error(`Missing reportability claim taxonomy entry for ${claim_type}`);
  }
  return claim;
}

function assertCompleteClaimTaxonomy(): void {
  ClaimTypeSchema.options.forEach((claim_type) => claimForType(claim_type));
}

function taxonomyClaimsForContext(
  reportContext: ReportContext,
  disposition: z.infer<typeof ClaimDispositionSchema>
): ReportabilityClaim[] {
  return REPORTABILITY_CLAIM_TAXONOMY
    .filter((entry) => entry.default_disposition === disposition && entry.report_contexts.includes(reportContext))
    .map((entry) => ({
      claim_type: entry.claim_type,
      claim: entry.claim
    }));
}

function claimLabelForContext(reportContext: ReportContext): string {
  if (reportContext === "roi") {
    return "ROI claims";
  }
  if (reportContext === "agent_insights") {
    return "Agent insight claims";
  }
  if (reportContext === "skills_reporting") {
    return "Skills reporting claims";
  }
  if (reportContext === "mcp_reporting") {
    return "MCP reporting claims";
  }
  return "Transformation narrative claims";
}

export function buildReportabilityDecision(raw: unknown): ReportabilityDecision {
  return ReportabilityDecisionSchema.parse(raw);
}

export function generateReportabilityDecision(raw: unknown): ReportabilityDecision {
  const request = ReportabilityEvaluationRequestSchema.parse(raw);
  const requirements = SURFACE_REQUIREMENTS_BY_CONTEXT[request.report_context];
  if (requirements.length === 0) {
    throw new Error(`Report context ${request.report_context} is not implemented in FT_REPORTABILITY_2026_05.`);
  }

  const entriesByFamily = new Map(
    request.readiness_map.entries.map((entry) => [entry.signal_family, entry])
  );

  const surface_readiness = requirements.map((requirement) => {
    const statuses = requirement.signal_families.map(
      (family) => entriesByFamily.get(family)?.readiness_status ?? "missing"
    );
    const readiness_status = combineStatuses(statuses);
    return {
      surface: requirement.surface,
      required_for_context: requirement.required_for_context,
      signal_families: requirement.signal_families,
      readiness_status,
      caveats: caveatForStatus(requirement.surface, readiness_status)
    };
  });

  const requiredSurfaces = surface_readiness.filter((surface) => surface.required_for_context);
  const presentRequiredSurfaces = requiredSurfaces.filter((surface) => surface.readiness_status === "present");
  const suppressedRequiredSurfaces = requiredSurfaces.filter((surface) => surface.readiness_status === "suppressed");
  const unavailableRequiredSurfaces = requiredSurfaces.filter((surface) => surface.readiness_status !== "present");
  const excludedSurfaces = surface_readiness.filter((surface) => surface.readiness_status !== "present");
  const presentOptionalSurfaces = surface_readiness.filter(
    (surface) => !surface.required_for_context && surface.readiness_status === "present"
  );

  let reportability: z.infer<typeof ReportabilityStateSchema>;
  if (presentRequiredSurfaces.length === 0 && suppressedRequiredSurfaces.length > 0) {
    reportability = "SUPPRESSED";
  } else if (presentRequiredSurfaces.length === 0) {
    reportability = "UNSUPPORTED";
  } else if (unavailableRequiredSurfaces.length > 0 || excludedSurfaces.length > 0) {
    reportability = "REPORTABLE_WITH_CAVEATS";
  } else {
    reportability = "REPORTABLE";
  }

  const evidence_confidence: z.infer<typeof EvidenceConfidenceSchema> =
    reportability === "REPORTABLE"
      ? "HIGH"
      : reportability === "REPORTABLE_WITH_CAVEATS"
        ? "MEDIUM"
        : "UNVERIFIED";

  const required_caveats = uniqueValues([
    ...surface_readiness.flatMap((surface) => surface.caveats),
    ...(excludedSurfaces.length > 0
      ? [
          `${claimLabelForContext(request.report_context)} must be limited to covered surfaces; excluded surfaces: ${excludedSurfaces
            .map((surface) => surface.surface)
            .join(", ")}.`
        ]
      : []),
    ...(request.report_context === "roi" && presentOptionalSurfaces.length > 0
      ? [
          `Included optional surfaces (${presentOptionalSurfaces
            .map((surface) => surface.surface)
            .join(", ")}) describe evidence coverage only; they do not authorize advanced-surface ROI inclusion claims.`
        ]
      : []),
    "Do not claim total AI productivity impact, individual productivity, team ranking, or causal productivity lift."
  ]);

  const included_surfaces = surface_readiness
    .filter((surface) => surface.readiness_status === "present")
    .map((surface) => surface.surface);

  const blocked_claims = taxonomyClaimsForContext(request.report_context, "blocked");

  const allowed_claims =
    reportability === "REPORTABLE" || reportability === "REPORTABLE_WITH_CAVEATS"
      ? taxonomyClaimsForContext(request.report_context, "allowed")
      : [];

  assertCompleteClaimTaxonomy();

  return ReportabilityDecisionSchema.parse({
    schema_version: "FT_REPORTABILITY_2026_05",
    org_id: request.readiness_map.org_id,
    window: request.readiness_map.window,
    generated_at: request.generated_at ?? request.readiness_map.generated_at,
    source_system: "FluencyTracr",
    report_context: request.report_context,
    reportability,
    evidence_confidence,
    included_surfaces,
    excluded_surfaces: excludedSurfaces.map((surface) => surface.surface),
    surface_readiness,
    required_caveats,
    allowed_claims,
    blocked_claims,
    next_actions: request.readiness_map.next_actions.map((action) => ({
      action: action.action,
      owner: action.owner,
      priority: action.priority
    }))
  });
}

function appendixSummaryFor(decision: ReportabilityDecision): string {
  if (decision.reportability === "REPORTABLE") {
    return "Evidence supports customer-facing reporting for covered Glean surfaces.";
  }
  if (decision.reportability === "REPORTABLE_WITH_CAVEATS") {
    return "Evidence supports a bounded customer-facing claim only when required caveats travel with the report.";
  }
  if (decision.reportability === "INTERNAL_ONLY") {
    return "Evidence may support internal analysis, but it is not approved for customer-facing reporting.";
  }
  if (decision.reportability === "SUPPRESSED") {
    return "Evidence is suppressed and should not be used in customer-facing reporting.";
  }
  return "Evidence is unsupported for this customer-facing report context.";
}

function surfaceExclusionReason(decision: ReportabilityDecision, surface: ReportSurface): string {
  const readiness = decision.surface_readiness.find((entry) => entry.surface === surface);
  if (!readiness) {
    return `${surface} evidence is not mapped for this report context.`;
  }
  if (readiness.caveats.length > 0) {
    return readiness.caveats.join(" ");
  }
  return `${surface} evidence is not included in this report context.`;
}

export function buildCustomerEvidenceAppendix(raw: unknown): CustomerEvidenceAppendix {
  return CustomerEvidenceAppendixSchema.parse(raw);
}

export function generateCustomerEvidenceAppendix(raw: unknown): CustomerEvidenceAppendix {
  const decision = ReportabilityDecisionSchema.parse(raw);
  const excluded_surfaces = decision.excluded_surfaces.map((surface) => ({
    surface,
    reason: surfaceExclusionReason(decision, surface)
  }));

  const evidence_gaps = uniqueValues([
    ...excluded_surfaces.map((surface) => `${surface.surface}: ${surface.reason}`),
    ...decision.next_actions.map((action) => action.action)
  ]);

  return CustomerEvidenceAppendixSchema.parse({
    schema_version: "FT_EVIDENCE_APPENDIX_2026_05",
    org_id: decision.org_id,
    window: decision.window,
    generated_at: decision.generated_at,
    source_system: "FluencyTracr",
    report_context: decision.report_context,
    reportability: decision.reportability,
    evidence_confidence: decision.evidence_confidence,
    summary: appendixSummaryFor(decision),
    covered_surfaces: decision.included_surfaces,
    excluded_surfaces,
    required_caveats: decision.required_caveats,
    blocked_claims: decision.blocked_claims,
    evidence_gaps,
    governance_posture: [
      "Aggregate-only output; no individual productivity or performance scoring.",
      "Customer-facing claims must stay within covered surfaces and required caveats.",
      "Raw prompts, outputs, transcripts, message text, and file content are outside the appendix boundary.",
      "Suppressed or unsupported evidence cannot be converted into a customer-facing claim."
    ],
    next_actions: decision.next_actions
  });
}

export function evaluateReportabilityGate(raw: unknown): ReportabilityGateResponse {
  const request = ReportabilityGateRequestSchema.parse(raw);
  const decision = generateReportabilityDecision({
    report_context: request.report_context,
    readiness_map: request.readiness_map,
    generated_at: request.generated_at
  });
  const appendix = generateCustomerEvidenceAppendix(decision);

  const allowed = new Map(decision.allowed_claims.map((claim) => [claim.claim_type, claim.claim]));
  const blocked = new Map(decision.blocked_claims.map((claim) => [claim.claim_type, claim.claim]));
  const requested_claim_results = request.requested_claims.map((claim_type) => {
    if (allowed.has(claim_type)) {
      return {
        claim_type,
        disposition: "allowed" as const,
        reason: `Allowed only within ${claimLabelForContext(request.report_context).toLowerCase()} and required caveats.`
      };
    }
    if (blocked.has(claim_type)) {
      return {
        claim_type,
        disposition: "blocked" as const,
        reason: blocked.get(claim_type) ?? "Blocked by reportability policy."
      };
    }
    return {
      claim_type,
      disposition: "blocked" as const,
      reason: "No allowed claim rule exists for this report context."
    };
  });

  return ReportabilityGateResponseSchema.parse({
    schema_version: "FT_REPORTABILITY_GATE_2026_05",
    caller_system: request.caller_system,
    report_context: request.report_context,
    decision,
    appendix,
    requested_claim_results
  });
}
