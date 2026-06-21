export const AI_VALUE_LANGUAGE_SYSTEM_VERSION = "FT_AI_VALUE_LANGUAGE_SYSTEM_2026_06";

const DISPLAY_LABELS: Record<string, string> = {
  AI_FLUENCY_BASELINE: "AI Capability Baseline",
  VBD_OPERATING_MAP: "Operating Adoption Map",
  VALUE_EVIDENCE_CASE: "Value Evidence Case",
  EVIDENCE_READINESS: "Measurement Readiness",
  ROI_SCENARIO: "Value Scenario",
  VALUE_SCENARIO: "Value Scenario",
  FINANCIAL_CLAIM_GATE: "Financial Claim Review",
  EBITA_IMPACT_BRIDGE: "Financial Translation",
  EXECUTIVE_PACKET: "Executive Readout",
  INTERVENTION_ENGINE: "Next Actions",
  EVIDENCE_QUALITY: "Evidence Quality",
  FAST_BUT_SHALLOW: "Fast but shallow",
  HIGH_FLUENCY_FLOW: "High-fluency flow",
  LOW_INTEGRATION: "Low integration",
  DEEP_BUT_SLOW: "Deep but slow",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",

  DIRECTIONAL: "Estimate",
  DIRECTIONAL_EBITA_BRIDGE: "Financial Translation",
  CAVEATED: "Emerging Evidence",
  CAVEATED_VALUE_INVESTIGATION: "Emerging Evidence",
  SUPPORTED: "Measured Value",
  SUPPORTED_VALUE_MOVEMENT: "Measured Value",
  FINANCE_VALIDATED: "Finance-Context Reviewed",
  FINANCE_VALIDATED_EBITA_CASE: "Finance-Context Reviewed",
  VALIDATED_VALUE_REALIZATION: "Finance-Context Review Eligible",
  FINANCE_CONTEXT_REVIEW_ELIGIBLE: "Finance-Context Review Eligible",
  CUSTOMER_FACING_APPROVED: "Customer Evidence Status",
  MODELED_EBITA_SCENARIO: "Financial Translation",
  NO_FINANCIAL_TRANSLATION: "No Financial Translation",

  READY_FOR_EXECUTIVE_VALIDATION: "Ready for sponsor validation",
  HOLD_FOR_ASSUMPTIONS: "Needs client assumptions before validation",
  HOLD_FOR_SOURCE_COVERAGE: "Needs evidence sources before validation",
  HOLD_FOR_BASELINE: "Needs a baseline window before validation",
  STOP_FOR_GOVERNANCE_REVIEW: "Paused for governance review",
  INTERNAL_ONLY: "Internal planning only",
  MISSING: "Not available yet",
  BLOCKED: "Blocked",

  EXECUTIVE_CAVEATED: "Executive Caveated",
  INTERNAL_MODELING: "Internal Modeling",
  FINANCE_VALIDATED_MODE: "Finance Validated",

  CAPACITY_CREATION: "Capacity Created",
  CAPACITY_REALLOCATION: "Capacity Reallocated",
  OPERATING_COST_REDUCTION: "Operating Cost Reduction",
  REVENUE_GROWTH: "Revenue Growth",
  QUALITY_PREMIUM: "Quality Improvement",
  RISK_REDUCTION: "Risk Reduction",
  CUSTOMER_EXPERIENCE: "Customer Experience",

  adoption_evidence: "Adoption Evidence",
  workflow_evidence: "Workflow Evidence",
  outcome_evidence: "Outcome Evidence",
  financial_evidence: "Financial Evidence",
  overall_ebita_confidence: "Overall Financial Confidence",

  dollarized_output: "Financial Translation",
  realized_roi_calculation: "Value Accounting",
  customer_facing_economic_output: "Blocked Customer-Facing Economic Output",
  causality_language: "Causal Language",
  aggregate_workflow_productivity: "Aggregate Workflow Capacity",
  ebita_impact_bridge: "Financial Translation",

  roi_proof: "Proven ROI",
  causality_claim: "AI caused the improvement",
  individual_scoring: "Individual performance scoring",
  team_or_manager_ranking: "Team or manager ranking",
  manager_or_team_ranking: "Team or manager ranking",
  hr_analytics: "Individual-level people analytics",
  hris_inference: "HRIS inference",
  productivity_measurement: "Individual productivity measurement",
  individual_productivity_measurement: "Individual productivity measurement",
  individual_productivity_claim: "Individual productivity claim",
  named_employee_productivity: "Named employee productivity claim",
  realized_roi_proof: "Realized ROI proof",
  dashboard_or_runtime_implementation: "Always-on dashboarding",
  usage_proves_ebita: "Usage proves EBITA",
  ai_caused_ebita_without_causal_design: "AI-caused EBITA without causal design",
  headcount_reduction_from_usage: "Headcount reduction from usage"
};

const normalizeToken = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/[\s-]+/g, "_");

const humanizeToken = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getAiValueDisplayLabel(value: unknown): string {
  const raw = normalizeToken(value);
  if (!raw) return "";
  return DISPLAY_LABELS[raw] ?? DISPLAY_LABELS[raw.toUpperCase()] ?? humanizeToken(raw);
}

export function getAiValueDisplayLabels(values: unknown[] | null | undefined): string[] {
  return (values ?? []).map(getAiValueDisplayLabel).filter(Boolean);
}

export const AI_VALUE_EXECUTIVE_CONCEPT_HIERARCHY = [
  "Value Hypothesis",
  "Measurement Plan",
  "Evidence Collection",
  "Value Realization",
  "Financial Translation",
  "Value Accounting",
  "Renewal Evidence"
] as const;

export const AI_VALUE_EVIDENCE_LANGUAGE = [
  {
    internal_state: "DIRECTIONAL",
    executive_label: "Estimate",
    definition: "Early signal or directional estimate that needs stronger evidence before value language expands."
  },
  {
    internal_state: "CAVEATED",
    executive_label: "Emerging Evidence",
    definition: "Aggregate evidence exists, but assumptions, source coverage, or review caveats still constrain claims."
  },
  {
    internal_state: "SUPPORTED",
    executive_label: "Measured Value",
    definition: "Accepted aggregate outcome evidence supports measured, caveated value movement."
  },
  {
    internal_state: "FINANCE_VALIDATED",
    executive_label: "Validated Value",
    definition: "Finance-attested assumptions and evidence support validated value language within a governed scope."
  }
] as const;
