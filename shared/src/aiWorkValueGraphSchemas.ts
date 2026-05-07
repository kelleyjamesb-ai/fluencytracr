import { z } from "zod";

export const AiWorkValueGraphSchemaVersionSchema = z.literal("AIWVG_2026_05");

export const AiSurfaceSchema = z.enum([
  "search",
  "chat",
  "ai_answers",
  "agents",
  "skills",
  "mcp_actions",
  "canvas_artifacts",
  "apis",
  "embedded_hosts"
]);

export const WorkPatternSchema = z.enum([
  "find",
  "understand",
  "summarize",
  "draft",
  "decide",
  "analyze",
  "troubleshoot",
  "automate",
  "orchestrate"
]);

export const MaturityStageSchema = z.enum([
  "ad_hoc_assistance",
  "repeated_assistance",
  "reusable_expertise",
  "agentic_execution",
  "governed_action",
  "outcome_linked",
  "finance_approved"
]);

export const ValueEvidenceTypeSchema = z.enum([
  "survey",
  "product_telemetry",
  "workflow_run",
  "artifact_output",
  "action_log",
  "control_evidence",
  "business_outcome",
  "financial_model"
]);

export const OutcomeDomainSchema = z.enum([
  "sales",
  "customer_success",
  "support",
  "engineering",
  "product",
  "IT",
  "HR",
  "legal",
  "finance",
  "security",
  "operations"
]);

export const ClaimReadinessStateSchema = z.enum([
  "not_measured",
  "directional",
  "evidence_present",
  "caveated",
  "internal_only",
  "customer_safe",
  "suppressed"
]);

export const ValueHypothesisSchema = z.enum([
  "productivity_capacity",
  "revenue_acceleration",
  "cost_avoidance",
  "risk_reduction",
  "capability_leverage",
  "customer_experience",
  "quality_improvement"
]);

export const EvidenceStrengthSchema = z.enum(["unverified", "weak", "medium", "strong"]);

export const ValueGraphNodeKindSchema = z.enum(["surface", "work_pattern", "maturity_stage", "outcome"]);

export const ValueGraphEdgeTypeSchema = z.enum([
  "surface_supports_pattern",
  "pattern_advances_maturity",
  "pattern_links_outcome",
  "evidence_supports_claim",
  "claim_blocked_by_gap"
]);

export const AiWorkMaturityModelSchemaVersionSchema = z.literal("AIWMM_2026_05");
export const ValueHypothesisRegistrySchemaVersionSchema = z.literal("VHR_2026_05");
export const OutcomeInstrumentationMapSchemaVersionSchema = z.literal("OIM_2026_05");
export const MethodologySnapshotRegistrySchemaVersionSchema = z.literal("MSR_2026_05");
export const StrongestSafeClaimSchemaVersionSchema = z.literal("SSC_2026_05");
export const AiWorkValueDemoSchemaVersionSchema = z.literal("AIWVG_DEMO_2026_05");

export const OutcomeSystemOfRecordSchema = z.enum([
  "crm",
  "customer_success_platform",
  "support_platform",
  "engineering_system",
  "security_system",
  "finance_system",
  "hris",
  "project_system",
  "data_warehouse"
]);

export const OutcomeAggregationLevelSchema = z.enum([
  "org",
  "function",
  "department",
  "workflow",
  "account",
  "cohort",
  "domain"
]);

export const OutcomeWindowSchema = z.enum(["weekly", "28d", "30d", "60d", "90d", "quarterly"]);

export const CounterfactualRequirementSchema = z.enum([
  "none",
  "baseline_only",
  "pre_post",
  "matched_cohort",
  "holdout_or_control",
  "finance_approved_counterfactual"
]);

export const AttributionStrengthSchema = z.enum([
  "none",
  "weak_proxy",
  "contribution",
  "quasi_experimental",
  "causal_validated"
]);

export const OutcomePrivacyBoundarySchema = z.enum([
  "aggregate_only",
  "k_min_cohort",
  "account_aggregate",
  "workflow_aggregate",
  "function_aggregate"
]);

export const ClaimReadinessEffectSchema = z.enum([
  "no_effect",
  "enables_directional",
  "enables_evidence_present",
  "enables_caveated",
  "enables_internal_only",
  "enables_customer_safe",
  "suppresses_claim"
]);

export const MethodologySourceSystemSchema = z.enum([
  "Glean",
  "FluencyTracr",
  "external_finance_model",
  "synthetic_fixture"
]);

export const MethodologyApprovalStateSchema = z.enum([
  "draft",
  "internal_review",
  "data_science_approved",
  "finance_approved",
  "customer_safe",
  "rejected",
  "expired"
]);

export const MethodologyDedupePolicySchema = z.enum([
  "none",
  "session_highest_value",
  "workflow_highest_value",
  "event_level",
  "external_method"
]);

export const MethodologyConfidenceTreatmentSchema = z.enum([
  "none",
  "point_estimate",
  "range",
  "confidence_interval",
  "sensitivity_only"
]);

export const MethodologyCustomerSafeClaimEffectSchema = z.enum([
  "no_effect",
  "enables_directional",
  "enables_caveated",
  "enables_internal_only",
  "enables_customer_safe",
  "suppresses_claim"
]);

const nodeIdRegex = /^(surface|pattern|maturity|outcome):[a-z0-9][a-z0-9_-]*$/;
const edgeIdRegex = /^edge:[a-z0-9][a-z0-9_-]*$/;

const forbiddenGraphKeyFragments = [
  "prompt",
  "raw_prompt",
  "response",
  "raw_response",
  "transcript",
  "query_text",
  "tool_payload",
  "file_content",
  "email",
  "user_id",
  "employee_id",
  "person_id",
  "direct_identifier",
  "ranking",
  "manager",
  "productivity_score",
  "productivity_scoring",
  "hidden_reconstruction"
];

const rejectForbiddenGraphKeys = (
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number> = []
) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenGraphKeys(entry, ctx, [...path, index]));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const keyLower = key.toLowerCase();
    const matchesForbidden = forbiddenGraphKeyFragments.some((fragment) => keyLower.includes(fragment));
    const nextPath = [...path, key];
    if (matchesForbidden) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `forbidden AI Work Value Graph field: ${key}`,
        path: nextPath
      });
    }
    rejectForbiddenGraphKeys(nestedValue, ctx, nextPath);
  }
};

const SafeClaimBoundarySchema = z
  .object({
    allowed_language: z.string().min(1).max(500),
    blocked_language: z.string().min(1).max(500),
    required_caveats: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

const ValueEvidenceRefSchema = z
  .object({
    evidence_type: ValueEvidenceTypeSchema,
    evidence_strength: EvidenceStrengthSchema,
    claim_readiness: ClaimReadinessStateSchema,
    source_surface: AiSurfaceSchema.optional(),
    maturity_stage: MaturityStageSchema.optional(),
    validation_status: z.enum(["not_started", "in_review", "validated", "rejected"]).default("not_started"),
    aggregate_metric_ref: z.string().min(1).max(120).optional()
  })
  .strict();

const BaseValueGraphNodeSchema = z
  .object({
    id: z.string().regex(nodeIdRegex),
    kind: ValueGraphNodeKindSchema,
    label: z.string().min(1).max(120),
    claim_readiness: ClaimReadinessStateSchema,
    evidence: z.array(ValueEvidenceRefSchema).default([]),
    claim_boundary: SafeClaimBoundarySchema.optional()
  })
  .strict();

const SurfaceNodeSchema = BaseValueGraphNodeSchema.extend({
  kind: z.literal("surface"),
  surface: AiSurfaceSchema,
  observed_patterns: z.array(WorkPatternSchema).default([]),
  maturity_stage: MaturityStageSchema
}).strict();

const WorkPatternNodeSchema = BaseValueGraphNodeSchema.extend({
  kind: z.literal("work_pattern"),
  work_pattern: WorkPatternSchema,
  supported_surfaces: z.array(AiSurfaceSchema).default([]),
  maturity_stage: MaturityStageSchema,
  value_hypotheses: z.array(ValueHypothesisSchema).default([])
}).strict();

const MaturityStageNodeSchema = BaseValueGraphNodeSchema.extend({
  kind: z.literal("maturity_stage"),
  maturity_stage: MaturityStageSchema,
  supported_surfaces: z.array(AiSurfaceSchema).default([]),
  supported_patterns: z.array(WorkPatternSchema).default([])
}).strict();

const OutcomeNodeSchema = BaseValueGraphNodeSchema.extend({
  kind: z.literal("outcome"),
  outcome_domain: OutcomeDomainSchema,
  value_hypotheses: z.array(ValueHypothesisSchema).default([]),
  supported_patterns: z.array(WorkPatternSchema).default([]),
  maturity_stage: MaturityStageSchema
}).strict();

export const AiWorkValueGraphNodeSchema = z.discriminatedUnion("kind", [
  SurfaceNodeSchema,
  WorkPatternNodeSchema,
  MaturityStageNodeSchema,
  OutcomeNodeSchema
]);

export const AiWorkValueGraphEdgeSchema = z
  .object({
    id: z.string().regex(edgeIdRegex),
    edge_type: ValueGraphEdgeTypeSchema,
    from_node_id: z.string().regex(nodeIdRegex),
    to_node_id: z.string().regex(nodeIdRegex),
    evidence_types: z.array(ValueEvidenceTypeSchema).default([]),
    claim_readiness: ClaimReadinessStateSchema,
    evidence_strength: EvidenceStrengthSchema,
    value_hypotheses: z.array(ValueHypothesisSchema).default([]),
    required_caveats: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

export const AiWorkValueGraphSchema = z
  .object({
    schema_version: AiWorkValueGraphSchemaVersionSchema,
    graph_id: z.string().min(1).max(120),
    org_id: z.string().min(1).max(120),
    window: z.string().min(1).max(80),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    summary: z
      .object({
        overall_claim_readiness: ClaimReadinessStateSchema,
        highest_maturity_stage: MaturityStageSchema,
        covered_surfaces: z.array(AiSurfaceSchema).default([]),
        covered_outcome_domains: z.array(OutcomeDomainSchema).default([]),
        blocked_claims: z.array(z.string().min(1).max(500)).default([]),
        next_evidence_actions: z.array(z.string().min(1).max(500)).default([])
      })
      .strict(),
    nodes: z.array(AiWorkValueGraphNodeSchema).min(1),
    edges: z.array(AiWorkValueGraphEdgeSchema).default([])
  })
  .strict()
  .superRefine((graph, ctx) => {
    rejectForbiddenGraphKeys(graph, ctx);

    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.from_node_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge references missing from_node_id: ${edge.from_node_id}`,
          path: ["edges", edge.id, "from_node_id"]
        });
      }
      if (!nodeIds.has(edge.to_node_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edge references missing to_node_id: ${edge.to_node_id}`,
          path: ["edges", edge.id, "to_node_id"]
        });
      }
    }
  });

export type AiSurface = z.infer<typeof AiSurfaceSchema>;
export type WorkPattern = z.infer<typeof WorkPatternSchema>;
export type MaturityStage = z.infer<typeof MaturityStageSchema>;
export type ValueEvidenceType = z.infer<typeof ValueEvidenceTypeSchema>;
export type OutcomeDomain = z.infer<typeof OutcomeDomainSchema>;
export type ClaimReadinessState = z.infer<typeof ClaimReadinessStateSchema>;
export type AiWorkValueGraph = z.infer<typeof AiWorkValueGraphSchema>;
export type AiWorkValueGraphNode = z.infer<typeof AiWorkValueGraphNodeSchema>;
export type AiWorkValueGraphEdge = z.infer<typeof AiWorkValueGraphEdgeSchema>;

export function buildAiWorkValueGraph(raw: unknown): AiWorkValueGraph {
  return AiWorkValueGraphSchema.parse(raw);
}

export const AI_WORK_MATURITY_EVIDENCE_TO_STAGE_MAP = [
  {
    evidence_type: "survey",
    default_stage: "ad_hoc_assistance",
    supported_maturity_stages: ["ad_hoc_assistance", "repeated_assistance"]
  },
  {
    evidence_type: "product_telemetry",
    default_stage: "repeated_assistance",
    supported_maturity_stages: ["ad_hoc_assistance", "repeated_assistance", "reusable_expertise"]
  },
  {
    evidence_type: "workflow_run",
    default_stage: "agentic_execution",
    supported_maturity_stages: ["repeated_assistance", "agentic_execution", "outcome_linked"]
  },
  {
    evidence_type: "artifact_output",
    default_stage: "reusable_expertise",
    supported_maturity_stages: ["reusable_expertise", "outcome_linked"]
  },
  {
    evidence_type: "action_log",
    default_stage: "agentic_execution",
    supported_maturity_stages: ["agentic_execution", "governed_action", "outcome_linked"]
  },
  {
    evidence_type: "control_evidence",
    default_stage: "governed_action",
    supported_maturity_stages: ["governed_action", "outcome_linked", "finance_approved"]
  },
  {
    evidence_type: "business_outcome",
    default_stage: "outcome_linked",
    supported_maturity_stages: ["outcome_linked", "finance_approved"]
  },
  {
    evidence_type: "financial_model",
    default_stage: "finance_approved",
    supported_maturity_stages: ["finance_approved"]
  }
] as const;

const AiWorkMaturityEvidenceToStageMapEntrySchema = z
  .object({
    evidence_type: ValueEvidenceTypeSchema,
    default_stage: MaturityStageSchema,
    supported_maturity_stages: z.array(MaturityStageSchema).min(1)
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (!entry.supported_maturity_stages.includes(entry.default_stage)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `default_stage ${entry.default_stage} must be included in supported_maturity_stages`,
        path: ["default_stage"]
      });
    }
  });

export const AiWorkMaturityEvidenceToStageMapSchema = z
  .array(AiWorkMaturityEvidenceToStageMapEntrySchema)
  .length(ValueEvidenceTypeSchema.options.length);

const MaturityEvidencePresentSchema = z
  .object({
    evidence_type: ValueEvidenceTypeSchema,
    evidence_strength: EvidenceStrengthSchema,
    claim_readiness: ClaimReadinessStateSchema,
    source_surfaces: z.array(AiSurfaceSchema).default([]),
    validation_status: z.enum(["not_started", "in_review", "validated", "rejected"]).default("not_started"),
    aggregate_metric_ref: z.string().min(1).max(120).optional()
  })
  .strict();

const MaturityEvidenceMissingSchema = z
  .object({
    evidence_type: ValueEvidenceTypeSchema,
    needed_for_stage: MaturityStageSchema,
    reason: z.string().min(1).max(500)
  })
  .strict();

const MaturityUpgradeStepSchema = z
  .object({
    from_stage: MaturityStageSchema,
    to_stage: MaturityStageSchema,
    required_evidence: z.array(ValueEvidenceTypeSchema).min(1),
    action: z.string().min(1).max(500),
    claim_readiness_after_upgrade: ClaimReadinessStateSchema
  })
  .strict();

const MaturitySafeClaimLanguageSchema = z
  .object({
    current_safe_claim: z.string().min(1).max(500),
    blocked_claim: z.string().min(1).max(500),
    next_safe_claim_after_upgrade: z.string().min(1).max(500).optional()
  })
  .strict();

export const AiWorkMaturityExampleSchema = z
  .object({
    example_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    label: z.string().min(1).max(160),
    outcome_domain: OutcomeDomainSchema,
    ai_surfaces: z.array(AiSurfaceSchema).min(1),
    work_patterns: z.array(WorkPatternSchema).min(1),
    current_maturity_stage: MaturityStageSchema,
    claim_readiness: ClaimReadinessStateSchema,
    evidence_present: z.array(MaturityEvidencePresentSchema).default([]),
    evidence_missing: z.array(MaturityEvidenceMissingSchema).default([]),
    upgrade_path: z.array(MaturityUpgradeStepSchema).default([]),
    safe_claim_language: MaturitySafeClaimLanguageSchema
  })
  .strict()
  .superRefine((example, ctx) => {
    const presentEvidenceTypes = new Set(example.evidence_present.map((evidence) => evidence.evidence_type));
    if (example.current_maturity_stage === "outcome_linked" && !presentEvidenceTypes.has("business_outcome")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "outcome_linked examples require business_outcome evidence_present",
        path: ["evidence_present"]
      });
    }
    if (example.current_maturity_stage === "finance_approved" && !presentEvidenceTypes.has("financial_model")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "finance_approved examples require financial_model evidence_present",
        path: ["evidence_present"]
      });
    }
    if (example.current_maturity_stage === "governed_action") {
      const hasGovernedEvidence = presentEvidenceTypes.has("action_log") || presentEvidenceTypes.has("control_evidence");
      if (!hasGovernedEvidence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "governed_action examples require action_log or control_evidence evidence_present",
          path: ["evidence_present"]
        });
      }
    }
  });

export const AiWorkMaturityModelSchema = z
  .object({
    schema_version: AiWorkMaturityModelSchemaVersionSchema,
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    evidence_to_stage_map: AiWorkMaturityEvidenceToStageMapSchema,
    examples: z.array(AiWorkMaturityExampleSchema).min(1)
  })
  .strict()
  .superRefine((model, ctx) => {
    rejectForbiddenGraphKeys(model, ctx);
    const mappedEvidenceTypes = new Set(model.evidence_to_stage_map.map((entry) => entry.evidence_type));
    for (const evidenceType of ValueEvidenceTypeSchema.options) {
      if (!mappedEvidenceTypes.has(evidenceType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `missing maturity evidence mapping for ${evidenceType}`,
          path: ["evidence_to_stage_map"]
        });
      }
    }
  });

export type AiWorkMaturityEvidenceToStageMap = z.infer<typeof AiWorkMaturityEvidenceToStageMapSchema>;
export type AiWorkMaturityExample = z.infer<typeof AiWorkMaturityExampleSchema>;
export type AiWorkMaturityModel = z.infer<typeof AiWorkMaturityModelSchema>;

export function buildAiWorkMaturityModel(raw: unknown): AiWorkMaturityModel {
  return AiWorkMaturityModelSchema.parse(raw);
}

const IndicatorSchema = z.string().min(1).max(200);

const CurrentEvidenceStateSchema = z
  .object({
    evidence_type: ValueEvidenceTypeSchema,
    evidence_present: z.boolean(),
    claim_readiness: ClaimReadinessStateSchema,
    evidence_strength: EvidenceStrengthSchema,
    aggregate_metric_ref: z.string().min(1).max(120).optional(),
    note: z.string().min(1).max(500)
  })
  .strict();

export const ValueHypothesisSchemaEntrySchema = z
  .object({
    hypothesis_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    outcome_domain: OutcomeDomainSchema,
    work_pattern: WorkPatternSchema,
    target_maturity_stage: MaturityStageSchema,
    expected_value_mechanism: z.string().min(1).max(500),
    leading_indicators: z.array(IndicatorSchema).min(1),
    lagging_indicators: z.array(IndicatorSchema).min(1),
    required_evidence: z.array(ValueEvidenceTypeSchema).min(1),
    current_evidence_state: z.array(CurrentEvidenceStateSchema).min(1),
    claim_templates_enabled: z.array(z.string().min(1).max(500)).default([]),
    upgrade_actions: z.array(z.string().min(1).max(500)).default([]),
    risks_and_caveats: z.array(z.string().min(1).max(500)).default([])
  })
  .strict()
  .superRefine((hypothesis, ctx) => {
    const requiredEvidence = new Set(hypothesis.required_evidence);
    const currentEvidenceTypes = new Set(hypothesis.current_evidence_state.map((evidence) => evidence.evidence_type));

    for (const evidenceType of requiredEvidence) {
      if (!currentEvidenceTypes.has(evidenceType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `required evidence ${evidenceType} must appear in current_evidence_state`,
          path: ["current_evidence_state"]
        });
      }
    }

    if (hypothesis.target_maturity_stage === "outcome_linked" && !requiredEvidence.has("business_outcome")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "outcome_linked hypotheses require business_outcome evidence",
        path: ["required_evidence"]
      });
    }

    if (hypothesis.target_maturity_stage === "finance_approved" && !requiredEvidence.has("financial_model")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "finance_approved hypotheses require financial_model evidence",
        path: ["required_evidence"]
      });
    }
  });

export const ValueHypothesisRegistrySchema = z
  .object({
    schema_version: ValueHypothesisRegistrySchemaVersionSchema,
    org_id: z.string().min(1).max(120),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    registry_id: z.string().min(1).max(120),
    hypotheses: z.array(ValueHypothesisSchemaEntrySchema).min(1)
  })
  .strict()
  .superRefine((registry, ctx) => {
    rejectForbiddenGraphKeys(registry, ctx);
    const seen = new Set<string>();
    registry.hypotheses.forEach((hypothesis, index) => {
      if (seen.has(hypothesis.hypothesis_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate hypothesis_id: ${hypothesis.hypothesis_id}`,
          path: ["hypotheses", index, "hypothesis_id"]
        });
      }
      seen.add(hypothesis.hypothesis_id);
    });
  });

export type ValueHypothesisRegistry = z.infer<typeof ValueHypothesisRegistrySchema>;
export type ValueHypothesisRegistryEntry = z.infer<typeof ValueHypothesisSchemaEntrySchema>;

export function buildValueHypothesisRegistry(raw: unknown): ValueHypothesisRegistry {
  return ValueHypothesisRegistrySchema.parse(raw);
}

export const OutcomeInstrumentationEntrySchema = z
  .object({
    instrumentation_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    label: z.string().min(1).max(160),
    outcome_domain: OutcomeDomainSchema,
    related_hypothesis_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
    system_of_record: OutcomeSystemOfRecordSchema,
    metric_name: z.string().min(1).max(120),
    aggregation_level: OutcomeAggregationLevelSchema,
    window: OutcomeWindowSchema,
    baseline_required: z.boolean(),
    counterfactual_requirement: CounterfactualRequirementSchema,
    attribution_strength: AttributionStrengthSchema,
    privacy_boundary: OutcomePrivacyBoundarySchema,
    minimum_sample_size: z.number().int().min(5),
    claim_readiness_effect: ClaimReadinessEffectSchema
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.baseline_required && entry.counterfactual_requirement === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "baseline_required entries require a counterfactual_requirement other than none",
        path: ["counterfactual_requirement"]
      });
    }

    if (entry.attribution_strength === "causal_validated" && entry.counterfactual_requirement !== "holdout_or_control") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "causal_validated attribution requires holdout_or_control counterfactual evidence",
        path: ["attribution_strength"]
      });
    }

    if (entry.claim_readiness_effect === "enables_customer_safe" && entry.attribution_strength === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customer-safe claim readiness requires non-none attribution strength",
        path: ["claim_readiness_effect"]
      });
    }
  });

export const OutcomeInstrumentationMapSchema = z
  .object({
    schema_version: OutcomeInstrumentationMapSchemaVersionSchema,
    org_id: z.string().min(1).max(120),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    map_id: z.string().min(1).max(120),
    entries: z.array(OutcomeInstrumentationEntrySchema).min(1)
  })
  .strict()
  .superRefine((map, ctx) => {
    rejectForbiddenGraphKeys(map, ctx);
    const seen = new Set<string>();
    map.entries.forEach((entry, index) => {
      if (seen.has(entry.instrumentation_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate instrumentation_id: ${entry.instrumentation_id}`,
          path: ["entries", index, "instrumentation_id"]
        });
      }
      seen.add(entry.instrumentation_id);

      const metricNameParts = entry.metric_name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const personLevelTerms = new Set(["person", "employee", "user", "rep", "agent", "manager", "individual"]);
      if (metricNameParts.some((part) => personLevelTerms.has(part))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `person-level metric_name is not allowed: ${entry.metric_name}`,
          path: ["entries", index, "metric_name"]
        });
      }
    });
  });

export type OutcomeInstrumentationEntry = z.infer<typeof OutcomeInstrumentationEntrySchema>;
export type OutcomeInstrumentationMap = z.infer<typeof OutcomeInstrumentationMapSchema>;

export function buildOutcomeInstrumentationMap(raw: unknown): OutcomeInstrumentationMap {
  return OutcomeInstrumentationMapSchema.parse(raw);
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const MethodologyAssumptionSchema = z
  .object({
    assumption_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    label: z.string().min(1).max(160),
    value_summary: z.string().min(1).max(500),
    sensitivity: z.enum(["low", "medium", "high", "unknown"]),
    approval_state: MethodologyApprovalStateSchema.optional()
  })
  .strict();

const MethodologySensitivityTestSchema = z
  .object({
    sensitivity_test_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    variable: z.string().min(1).max(160),
    change: z.string().min(1).max(160),
    modeled_effect: z.string().min(1).max(500),
    claim_effect: z.string().min(1).max(500)
  })
  .strict();

export const MethodologySnapshotEntrySchema = z
  .object({
    methodology_snapshot_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    label: z.string().min(1).max(180),
    source_system: MethodologySourceSystemSchema,
    source_model: z.string().min(1).max(160),
    methodology_version: z.string().min(1).max(160),
    effective_date: z.string().regex(dateRegex),
    reporting_window: z.string().min(1).max(80),
    covered_surfaces: z.array(AiSurfaceSchema).min(1),
    excluded_surfaces: z.array(AiSurfaceSchema).default([]),
    base_rate_table_ref: z.string().min(1).max(180).optional(),
    quality_multiplier_ref: z.string().min(1).max(180).optional(),
    dedupe_policy: MethodologyDedupePolicySchema,
    confidence_treatment: MethodologyConfidenceTreatmentSchema,
    recapture_policy: z.string().min(1).max(240),
    cost_model_ref: z.string().min(1).max(180).optional(),
    dominant_assumptions: z.array(MethodologyAssumptionSchema).min(1),
    sensitivity_tests: z.array(MethodologySensitivityTestSchema).default([]),
    approval_state: MethodologyApprovalStateSchema,
    approved_by_role: z.enum(["none", "data_science", "finance", "legal", "product", "gtm"]).default("none"),
    customer_safe_claim_effect: MethodologyCustomerSafeClaimEffectSchema,
    frozen_report_snapshot_ref: z.string().min(1).max(180).optional(),
    caveats: z.array(z.string().min(1).max(500)).min(1)
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const covered = new Set(snapshot.covered_surfaces);
    snapshot.excluded_surfaces.forEach((surface, index) => {
      if (covered.has(surface)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `surface cannot be both covered and excluded: ${surface}`,
          path: ["excluded_surfaces", index]
        });
      }
    });

    if (
      snapshot.customer_safe_claim_effect === "enables_customer_safe" &&
      snapshot.approval_state !== "customer_safe"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "enables_customer_safe requires customer_safe methodology approval",
        path: ["customer_safe_claim_effect"]
      });
    }

    if (snapshot.approval_state === "customer_safe" && !snapshot.frozen_report_snapshot_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customer_safe methodology snapshots require a frozen_report_snapshot_ref",
        path: ["frozen_report_snapshot_ref"]
      });
    }
  });

export const MethodologySnapshotRegistrySchema = z
  .object({
    schema_version: MethodologySnapshotRegistrySchemaVersionSchema,
    registry_id: z.string().min(1).max(120),
    org_id: z.string().min(1).max(120),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    snapshots: z.array(MethodologySnapshotEntrySchema).min(1)
  })
  .strict()
  .superRefine((registry, ctx) => {
    rejectForbiddenGraphKeys(registry, ctx);
    const seen = new Set<string>();
    registry.snapshots.forEach((snapshot, index) => {
      if (seen.has(snapshot.methodology_snapshot_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate methodology_snapshot_id: ${snapshot.methodology_snapshot_id}`,
          path: ["snapshots", index, "methodology_snapshot_id"]
        });
      }
      seen.add(snapshot.methodology_snapshot_id);
    });
  });

export type MethodologyApprovalState = z.infer<typeof MethodologyApprovalStateSchema>;
export type MethodologySnapshotEntry = z.infer<typeof MethodologySnapshotEntrySchema>;
export type MethodologySnapshotRegistry = z.infer<typeof MethodologySnapshotRegistrySchema>;

export function buildMethodologySnapshotRegistry(raw: unknown): MethodologySnapshotRegistry {
  return MethodologySnapshotRegistrySchema.parse(raw);
}

const ClaimReadinessRank: Record<ClaimReadinessState, number> = {
  suppressed: 0,
  not_measured: 1,
  directional: 2,
  evidence_present: 3,
  caveated: 4,
  internal_only: 5,
  customer_safe: 6
};

const MaturityStageRank: Record<MaturityStage, number> = {
  ad_hoc_assistance: 1,
  repeated_assistance: 2,
  reusable_expertise: 3,
  agentic_execution: 4,
  governed_action: 5,
  outcome_linked: 6,
  finance_approved: 7
};

const inferCurrentMaturityStage = (evidenceTypes: Set<ValueEvidenceType>): MaturityStage => {
  if (evidenceTypes.has("financial_model")) {
    return "finance_approved";
  }
  if (evidenceTypes.has("business_outcome")) {
    return "outcome_linked";
  }
  if (evidenceTypes.has("control_evidence")) {
    return "governed_action";
  }
  if (evidenceTypes.has("workflow_run") || evidenceTypes.has("action_log")) {
    return "agentic_execution";
  }
  if (evidenceTypes.has("artifact_output")) {
    return "reusable_expertise";
  }
  if (evidenceTypes.has("product_telemetry")) {
    return "repeated_assistance";
  }
  return "ad_hoc_assistance";
};

const inferClaimReadiness = (
  evidenceStates: ValueHypothesisRegistryEntry["current_evidence_state"],
  requiredEvidence: ValueEvidenceType[],
  maturityStage: MaturityStage
): ClaimReadinessState => {
  const presentRequiredEvidence = evidenceStates.filter(
    (evidence) => requiredEvidence.includes(evidence.evidence_type) && evidence.evidence_present
  );

  if (presentRequiredEvidence.length === 0) {
    return "not_measured";
  }

  const weakestReadiness = presentRequiredEvidence.reduce<ClaimReadinessState>((weakest, evidence) => {
    return ClaimReadinessRank[evidence.claim_readiness] < ClaimReadinessRank[weakest] ? evidence.claim_readiness : weakest;
  }, presentRequiredEvidence[0].claim_readiness);

  if (maturityStage === "finance_approved") {
    const financialEvidence = presentRequiredEvidence.find((evidence) => evidence.evidence_type === "financial_model");
    return financialEvidence?.claim_readiness === "customer_safe" ? weakestReadiness : "internal_only";
  }

  return weakestReadiness;
};

const capClaimReadiness = (readiness: ClaimReadinessState, ceiling: ClaimReadinessState): ClaimReadinessState => {
  return ClaimReadinessRank[readiness] <= ClaimReadinessRank[ceiling] ? readiness : ceiling;
};

const isFinancialClaimCandidate = (
  candidate: ValueHypothesisRegistryEntry,
  maturityStage: MaturityStage,
  evidenceTypes: Set<ValueEvidenceType>
) => {
  return (
    maturityStage === "finance_approved" ||
    candidate.target_maturity_stage === "finance_approved" ||
    evidenceTypes.has("financial_model") ||
    candidate.claim_templates_enabled.some((template) => /roi|payback|net benefit|financial|finance-approved/i.test(template))
  );
};

const methodologyCaveatsForSnapshot = (snapshot: MethodologySnapshotEntry) => [
  ...snapshot.caveats,
  ...snapshot.excluded_surfaces.map((surface) => `Methodology excludes ${surface} from this estimate.`)
];

const applyMethodologyClaimGate = (
  readiness: ClaimReadinessState,
  safeClaimLanguage: string,
  isFinancialClaim: boolean,
  methodologySnapshot?: MethodologySnapshotEntry
) => {
  if (!methodologySnapshot) {
    return {
      claimReadiness: readiness,
      safeClaimLanguage,
      blockedMethodologyClaims: isFinancialClaim
        ? ["Customer-facing ROI/payback requires a selected methodology snapshot with customer_safe approval."]
        : [],
      methodologyCaveats: []
    };
  }

  const methodologyCaveats = methodologyCaveatsForSnapshot(methodologySnapshot);
  const blockedMethodologyClaims: string[] = [];
  let claimReadiness = readiness;
  let gatedSafeClaimLanguage = safeClaimLanguage;

  const suppressesClaim =
    methodologySnapshot.customer_safe_claim_effect === "suppresses_claim" ||
    ["draft", "rejected", "expired"].includes(methodologySnapshot.approval_state);

  if (suppressesClaim) {
    return {
      claimReadiness: "suppressed" as ClaimReadinessState,
      safeClaimLanguage: `No customer-safe value claim is available because methodology snapshot ${methodologySnapshot.methodology_snapshot_id} is ${methodologySnapshot.approval_state}.`,
      blockedMethodologyClaims: [
        `Financial value language is suppressed by methodology snapshot ${methodologySnapshot.methodology_snapshot_id}.`
      ],
      methodologyCaveats
    };
  }

  if (isFinancialClaim) {
    if (methodologySnapshot.approval_state === "customer_safe") {
      return {
        claimReadiness,
        safeClaimLanguage: gatedSafeClaimLanguage,
        blockedMethodologyClaims,
        methodologyCaveats
      };
    }

    if (methodologySnapshot.approval_state === "finance_approved") {
      claimReadiness = capClaimReadiness(claimReadiness, "internal_only");
      blockedMethodologyClaims.push("Customer-facing ROI/payback requires customer-safe methodology approval.");
    } else {
      claimReadiness = capClaimReadiness(claimReadiness, "caveated");
      blockedMethodologyClaims.push(
        `Finance-approved value language requires finance_approved or customer_safe methodology approval; current approval is ${methodologySnapshot.approval_state}.`
      );
    }
  } else if (methodologySnapshot.customer_safe_claim_effect === "enables_caveated") {
    claimReadiness = capClaimReadiness(claimReadiness, "caveated");
  } else if (methodologySnapshot.customer_safe_claim_effect === "enables_internal_only") {
    claimReadiness = capClaimReadiness(claimReadiness, "internal_only");
  }

  return {
    claimReadiness,
    safeClaimLanguage: gatedSafeClaimLanguage,
    blockedMethodologyClaims,
    methodologyCaveats
  };
};

const StrongestSafeClaimInputSchema = z
  .object({
    graph: AiWorkValueGraphSchema,
    maturity_model: AiWorkMaturityModelSchema,
    value_hypothesis_registry: ValueHypothesisRegistrySchema,
    outcome_instrumentation_map: OutcomeInstrumentationMapSchema,
    methodology_snapshot_registry: MethodologySnapshotRegistrySchema.optional(),
    preferred_hypothesis_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
    preferred_methodology_snapshot_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).optional()
  })
  .strict()
  .superRefine((input, ctx) => {
    rejectForbiddenGraphKeys(input, ctx);

    if (input.preferred_methodology_snapshot_id && !input.methodology_snapshot_registry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "preferred_methodology_snapshot_id requires methodology_snapshot_registry",
        path: ["preferred_methodology_snapshot_id"]
      });
    }

    if (
      input.preferred_methodology_snapshot_id &&
      input.methodology_snapshot_registry &&
      !input.methodology_snapshot_registry.snapshots.some(
        (snapshot) => snapshot.methodology_snapshot_id === input.preferred_methodology_snapshot_id
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown methodology snapshot: ${input.preferred_methodology_snapshot_id}`,
        path: ["preferred_methodology_snapshot_id"]
      });
    }
  });

const StrongestSafeClaimDetailSchema = z
  .object({
    claim_id: z.string().regex(/^claim:[a-z0-9][a-z0-9_-]*$/),
    hypothesis_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    outcome_domain: OutcomeDomainSchema,
    work_pattern: WorkPatternSchema,
    maturity_stage: MaturityStageSchema,
    claim_readiness: ClaimReadinessStateSchema,
    safe_claim_language: z.string().min(1).max(800),
    evidence_used: z.array(ValueEvidenceTypeSchema).default([]),
    aggregate_metric_refs: z.array(z.string().min(1).max(120)).default([]),
    methodology_snapshot_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
    methodology_approval_state: MethodologyApprovalStateSchema.optional(),
    methodology_caveats: z.array(z.string().min(1).max(500)).default([]),
    caveats: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

export const StrongestSafeClaimEvidenceGapSchema = z
  .object({
    evidence_type: ValueEvidenceTypeSchema,
    blocks: MaturityStageSchema,
    action: z.string().min(1).max(500)
  })
  .strict();

export const StrongestSafeClaimSchema = z
  .object({
    schema_version: StrongestSafeClaimSchemaVersionSchema,
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    roi_positioning: z.literal("final_claim_layer"),
    strongest_claim: StrongestSafeClaimDetailSchema,
    evidence_gaps: z.array(StrongestSafeClaimEvidenceGapSchema).default([]),
    blocked_stronger_claims: z.array(z.string().min(1).max(500)).default([]),
    blocked_methodology_claims: z.array(z.string().min(1).max(500)).default([]),
    upgrade_actions: z.array(z.string().min(1).max(500)).default([]),
    governance_boundaries: z.array(z.string().min(1).max(500)).default([])
  })
  .strict()
  .superRefine((result, ctx) => {
    rejectForbiddenGraphKeys(result, ctx);

    if (
      result.strongest_claim.maturity_stage === "finance_approved" &&
      !result.strongest_claim.evidence_used.includes("financial_model")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "finance_approved claims require financial_model evidence",
        path: ["strongest_claim", "evidence_used"]
      });
    }
  });

export type StrongestSafeClaimInput = z.infer<typeof StrongestSafeClaimInputSchema>;
export type StrongestSafeClaim = z.infer<typeof StrongestSafeClaimSchema>;

export function generateStrongestSafeClaim(raw: unknown): StrongestSafeClaim {
  const input = StrongestSafeClaimInputSchema.parse(raw);
  const hypotheses = input.value_hypothesis_registry.hypotheses;
  const candidate =
    (input.preferred_hypothesis_id
      ? hypotheses.find((hypothesis) => hypothesis.hypothesis_id === input.preferred_hypothesis_id)
      : undefined) ??
    [...hypotheses].sort((left, right) => {
      const leftEvidence = new Set(
        left.current_evidence_state.filter((evidence) => evidence.evidence_present).map((evidence) => evidence.evidence_type)
      );
      const rightEvidence = new Set(
        right.current_evidence_state.filter((evidence) => evidence.evidence_present).map((evidence) => evidence.evidence_type)
      );
      const leftStage = inferCurrentMaturityStage(leftEvidence);
      const rightStage = inferCurrentMaturityStage(rightEvidence);
      const stageDiff = MaturityStageRank[rightStage] - MaturityStageRank[leftStage];
      if (stageDiff !== 0) {
        return stageDiff;
      }
      return right.current_evidence_state.filter((evidence) => evidence.evidence_present).length -
        left.current_evidence_state.filter((evidence) => evidence.evidence_present).length;
    })[0];

  if (!candidate) {
    throw new Error("No value hypotheses available for safe claim generation.");
  }

  const presentEvidence = candidate.current_evidence_state.filter((evidence) => evidence.evidence_present);
  const presentEvidenceTypes = new Set(presentEvidence.map((evidence) => evidence.evidence_type));
  const maturityStage = inferCurrentMaturityStage(presentEvidenceTypes);
  const inferredClaimReadiness = inferClaimReadiness(candidate.current_evidence_state, candidate.required_evidence, maturityStage);
  const methodologySnapshot = input.methodology_snapshot_registry
    ? input.preferred_methodology_snapshot_id
      ? input.methodology_snapshot_registry.snapshots.find(
          (snapshot) => snapshot.methodology_snapshot_id === input.preferred_methodology_snapshot_id
        )
      : input.methodology_snapshot_registry.snapshots.find(
          (snapshot) => snapshot.customer_safe_claim_effect !== "suppresses_claim"
        )
    : undefined;
  const evidenceGaps = candidate.required_evidence
    .filter((evidenceType) => !presentEvidenceTypes.has(evidenceType))
    .map((evidenceType) => ({
      evidence_type: evidenceType,
      blocks: evidenceType === "financial_model" ? "finance_approved" : candidate.target_maturity_stage,
      action:
        evidenceType === "financial_model"
          ? "Attach a finance-approved value model before ROI, payback, or finance-approved value language is enabled."
          : `Collect ${evidenceType} evidence before upgrading this hypothesis to ${candidate.target_maturity_stage}.`
    }));

  const hasFinancialModel = presentEvidenceTypes.has("financial_model");
  const isFinancialClaim = isFinancialClaimCandidate(candidate, maturityStage, presentEvidenceTypes);
  const safeClaimLanguage =
    maturityStage === "finance_approved" && hasFinancialModel
      ? candidate.claim_templates_enabled[0]
      : maturityStage === "outcome_linked"
        ? `Covered evidence supports a contribution story for ${candidate.expected_value_mechanism}`
        : `Evidence shows AI participation in ${candidate.work_pattern} work, but outcome and finance claims remain unproven.`;

  const methodologyGate = applyMethodologyClaimGate(
    inferredClaimReadiness,
    safeClaimLanguage,
    isFinancialClaim,
    methodologySnapshot
  );

  const blockedStrongerClaims = [
    ...candidate.risks_and_caveats.filter((caveat) => /do not/i.test(caveat)),
    ...(hasFinancialModel
      ? ["Do not generalize this value claim beyond the approved workflow, window, and financial assumptions."]
      : ["Do not claim ROI, payback, or finance-approved value until financial_model evidence is present and approved."])
  ];

  const aggregateMetricRefs = presentEvidence
    .map((evidence) => evidence.aggregate_metric_ref)
    .filter((metricRef): metricRef is string => Boolean(metricRef));

  const result: StrongestSafeClaim = {
    schema_version: "SSC_2026_05",
    generated_at: input.graph.generated_at,
    source_system: "FluencyTracr",
    roi_positioning: "final_claim_layer",
    strongest_claim: {
      claim_id: `claim:${candidate.hypothesis_id}`,
      hypothesis_id: candidate.hypothesis_id,
      outcome_domain: candidate.outcome_domain,
      work_pattern: candidate.work_pattern,
      maturity_stage: maturityStage,
      claim_readiness: methodologyGate.claimReadiness,
      safe_claim_language: methodologyGate.safeClaimLanguage,
      evidence_used: Array.from(presentEvidenceTypes),
      aggregate_metric_refs: aggregateMetricRefs,
      methodology_snapshot_id: methodologySnapshot?.methodology_snapshot_id,
      methodology_approval_state: methodologySnapshot?.approval_state,
      methodology_caveats: methodologyGate.methodologyCaveats,
      caveats: [...candidate.risks_and_caveats, ...methodologyGate.methodologyCaveats]
    },
    evidence_gaps: evidenceGaps,
    blocked_stronger_claims: blockedStrongerClaims,
    blocked_methodology_claims: methodologyGate.blockedMethodologyClaims,
    upgrade_actions: candidate.upgrade_actions,
    governance_boundaries: [
      "No raw prompts, raw responses, transcripts, query text, tool payloads, or file contents.",
      "No direct identifiers, manager views, team rankings, or productivity scoring.",
      "ROI is downstream of evidence, controls, outcomes, and finance approval."
    ]
  };

  return StrongestSafeClaimSchema.parse(result);
}

const AiWorkValueDemoJourneyStepIdSchema = z.enum([
  "survey_opportunity",
  "search_chat_telemetry",
  "repeatable_work_patterns",
  "skills_artifacts",
  "agentic_execution",
  "governed_action",
  "outcome_linked_evidence",
  "finance_approved_value_claim"
]);

const AiWorkValueDemoJourneyStepSchema = z
  .object({
    step_id: AiWorkValueDemoJourneyStepIdSchema,
    label: z.string().min(1).max(160),
    maturity_stage: MaturityStageSchema,
    ai_surfaces: z.array(AiSurfaceSchema).default([]),
    work_patterns: z.array(WorkPatternSchema).default([]),
    evidence_types: z.array(ValueEvidenceTypeSchema).min(1),
    claim_readiness: ClaimReadinessStateSchema,
    what_it_shows: z.string().min(1).max(700),
    evidence_present: z.array(z.string().min(1).max(300)).default([]),
    evidence_missing: z.array(z.string().min(1).max(300)).default([]),
    safe_claim: z.string().min(1).max(700),
    blocked_claims: z.array(z.string().min(1).max(500)).default([]),
    next_upgrade_actions: z.array(z.string().min(1).max(500)).default([]),
    roi_position: z.enum(["not_roi", "final_layer"])
  })
  .strict();

export const AiWorkValueDemoSchema = z
  .object({
    schema_version: AiWorkValueDemoSchemaVersionSchema,
    demo_id: z.string().min(1).max(120),
    org_id: z.string().min(1).max(120),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    positioning: z
      .object({
        thesis: z.string().min(1).max(800),
        roi_role: z.literal("final_claim_layer"),
        core_product_questions: z.array(z.string().min(1).max(200)).min(1)
      })
      .strict(),
    journey_steps: z.array(AiWorkValueDemoJourneyStepSchema).length(8),
    strongest_safe_claim: StrongestSafeClaimSchema
  })
  .strict()
  .superRefine((demo, ctx) => {
    rejectForbiddenGraphKeys(demo, ctx);

    const expectedSteps = AiWorkValueDemoJourneyStepIdSchema.options;
    const actualSteps = demo.journey_steps.map((step) => step.step_id);
    expectedSteps.forEach((expectedStep, index) => {
      if (actualSteps[index] !== expectedStep) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `journey step ${index} must be ${expectedStep}`,
          path: ["journey_steps", index, "step_id"]
        });
      }
    });

    const finalStep = demo.journey_steps[demo.journey_steps.length - 1];
    if (finalStep.maturity_stage !== "finance_approved" || finalStep.roi_position !== "final_layer") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "final journey step must position ROI as the finance-approved final layer",
        path: ["journey_steps", demo.journey_steps.length - 1]
      });
    }
  });

export type AiWorkValueDemo = z.infer<typeof AiWorkValueDemoSchema>;

export function buildAiWorkValueDemo(raw: unknown): AiWorkValueDemo {
  return AiWorkValueDemoSchema.parse(raw);
}
