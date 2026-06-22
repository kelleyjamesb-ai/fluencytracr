/**
 * AI Value Engine - Operator Source Handoff Bundle.
 *
 * Contract-only preparation manifest across governed source handoff lanes. It
 * recomputes child lane handoffs from their embedded lane inputs, rejects
 * stale or tampered child handoffs, and emits compact operator-source,
 * context-fragment, and source-package-reference manifests only. It does not
 * certify Source Package Review Queue clearance, assemble Measurement Cells,
 * persist output, create routes/UI/schemas, compute confidence, calculate ROI,
 * prove causality, emit productivity claims, or create customer-facing output.
 */

import {
  buildAssumptionGovernanceOperatorSourceHandoff,
  validateAssumptionGovernanceOperatorSourceHandoff
} from "./assumptionGovernanceOperatorSourceHandoff";
import {
  buildAIFluencyOperatorSourceHandoff,
  validateAIFluencyOperatorSourceHandoff
} from "./aiFluencyOperatorSourceHandoff";
import {
  buildBlueprintOperatorSourceHandoff,
  validateBlueprintOperatorSourceHandoff
} from "./blueprintOperatorSourceHandoff";
import {
  buildCustomerMetricOperatorSourceHandoff,
  validateCustomerMetricOperatorSourceHandoff
} from "./customerMetricOperatorSourceHandoff";
import {
  buildVbdTokenOperatorSourceHandoff,
  validateVbdTokenOperatorSourceHandoff
} from "./vbdTokenOperatorSourceHandoff";

export const AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_operator_source_handoff_bundle_2026_06";

const REQUIRED_LANES = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
] as const;

type LaneKey = (typeof REQUIRED_LANES)[number];

const PACKAGE_BACKED_LANES = [
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
] as const;

const REQUIRED_BLOCKED_USES = [
  "source_package_review_queue_clearance",
  "measurement_cell_direct_feed",
  "measurement_cell_readiness",
  "measurement_cell_assembly",
  "finance_context_investigation",
  "confidence_model",
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "individual_scoring",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_output",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output",
  "governance_override",
  "assumption_override"
];

const SAFE_ALLOWED_USES = [
  "operator_source_preparation",
  "source_package_alignment_preparation"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_glean_query",
  "runs_customer_connectors",
  "parses_uploaded_files",
  "ingests_raw_rows",
  "stores_raw_source_data",
  "contains_person_level_results",
  "contains_direct_identifiers",
  "certifies_source_package_review_queue",
  "bypasses_source_package_review_queue",
  "feeds_source_package_review_queue",
  "feeds_measurement_cell",
  "feeds_finance_context_investigation",
  "feeds_confidence_model",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_output",
  "customer_facing_financial_output",
  "allows_governance_override",
  "allows_assumption_override"
];

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_OPERATOR_PREPARATION",
  "BLOCKED"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /respondent_id/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /department_ranking/i,
  /people_decisioning/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^confidence_score$/i,
  /^confidence$/i,
  /^probability$/i,
  /probability_score/i,
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /ai_contribution_confidence/i,
  /contribution_confidence/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /cost_savings/i,
  /savings_claim/i,
  /financial_impact/i,
  /financial_attribution/i,
  /finance_context_investigation/i,
  /^financial_output$/i,
  /^customer_facing_output$/i,
  /^customer_facing_financial_output$/i,
  /causality_claim/i,
  /causal_proof/i,
  /causal_effect/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /^source_package_review_queue$/i,
  /source_package_review_queue_clearance/i,
  /source_package_review_bypass/i,
  /operator_override/i,
  /admin_override/i,
  /governance_override/i,
  /assumption_override/i,
  /force_ready/i
];

const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

const UNSAFE_VALUE_PATTERNS = [
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /(?:^|_)transcript(?:_|$)/i,
  /(?:^|_)select(?:_|$)/i,
  /(?:^|_)from_raw(?:_|$)/i,
  /(?:^|_)query_text(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)bigquery_sql(?:_|$)/i,
  /(?:^|_)confidence_model(?:_|$)/i,
  /(?:^|_)confidence_percentage(?:_|$)/i,
  /(?:^|_)probability(?:_|$)/i,
  /(?:^|_)roi(?:_|$)/i,
  /(?:^|_)ebita(?:_|$)/i,
  /(?:^|_)ebitda(?:_|$)/i,
  /(?:^|_)financial_attribution(?:_|$)/i,
  /(?:^|_)customer_facing_financial(?:_|$)/i,
  /\bforce ready\b/i,
  /\boverride\b/i,
  /\bbypass\b/i
];

export interface BuildOperatorSourceHandoffBundleInput {
  lanes: {
    blueprint?: {
      draft?: any;
      handoff?: any;
    };
    ai_fluency?: {
      parseRun?: any;
      dashboardImportRun?: any;
      sourceRef?: string;
      handoff?: any;
    };
    vbd_token?: {
      aggregateIntake?: any;
      handoff?: any;
    };
    customer_metric?: {
      customerMetricIntake?: any;
      handoff?: any;
    };
    assumption?: {
      lane?: string;
      source?: any;
      handoff?: any;
    };
    governance?: {
      lane?: string;
      source?: any;
      handoff?: any;
    };
  };
  bundleId?: string;
  generatedAt?: string;
  [key: string]: any;
}

export interface OperatorSourceHandoffBundleValidationResult {
  schema_version: string;
  bundle_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_preparation: boolean;
    package_alignment_preparation: boolean;
    source_package_review_queue: false;
    measurement_cell: false;
    finance_context_investigation: false;
    confidence_model: false;
    customer_facing_output: false;
    customer_facing_financial_output: false;
  };
}

interface RecomputedLane {
  laneKey: LaneKey;
  handoff: any;
  gaps: string[];
}

interface LaneIdentity {
  lane_key: LaneKey;
  org_id: any;
  client_id: any;
  workflow_family: any;
  workflow_id: any;
  function_area: any;
  cohort_key: any;
  baseline_window: any;
  comparison_window: any;
  metric_id: any;
  source_ref: any;
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: string): string {
  return normalizeKey(value).replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function sameJson(left: any, right: any): boolean {
  return stableStringify(left ?? null) === stableStringify(right ?? null);
}

function stableStringify(value: any): string {
  return JSON.stringify(sortForStableStringify(value));
}

function sortForStableStringify(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => sortForStableStringify(item));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortForStableStringify(nested)])
  );
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function falseFeeds(): OperatorSourceHandoffBundleValidationResult["feeds"] {
  return {
    operator_preparation: false,
    package_alignment_preparation: false,
    source_package_review_queue: false,
    measurement_cell: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_output: false,
    customer_facing_financial_output: false
  };
}

function readyFeeds(): OperatorSourceHandoffBundleValidationResult["feeds"] {
  return {
    operator_preparation: true,
    package_alignment_preparation: true,
    source_package_review_queue: false,
    measurement_cell: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_output: false,
    customer_facing_financial_output: false
  };
}

function generatedAtFor(inputGeneratedAt: any, supplied: any): string {
  return String(supplied?.generated_at ?? inputGeneratedAt ?? new Date(0).toISOString());
}

function recomputeLane(
  laneKey: LaneKey,
  entry: any,
  inputGeneratedAt: any
): RecomputedLane {
  const gaps: string[] = [];
  let handoff: any = null;
  const supplied = entry?.handoff;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return {
      laneKey,
      handoff,
      gaps: [`${laneKey} lane entry is missing`]
    };
  }
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    gaps.push(`${laneKey} handoff is missing`);
  }

  if (laneKey === "blueprint") {
    if (!entry.draft) gaps.push("blueprint draft is missing");
    handoff = buildBlueprintOperatorSourceHandoff({
      draft: entry.draft,
      handoffId: supplied?.handoff_id,
      generatedAt: generatedAtFor(inputGeneratedAt, supplied)
    });
    const recomputedValidation = validateBlueprintOperatorSourceHandoff(handoff);
    const suppliedValidation = validateBlueprintOperatorSourceHandoff(supplied);
    gaps.push(
      ...recomputedValidation.gaps.map((gap) => `blueprint recomputed: ${gap}`),
      ...suppliedValidation.gaps.map((gap) => `blueprint supplied: ${gap}`)
    );
  }

  if (laneKey === "ai_fluency") {
    if (!entry.parseRun) gaps.push("ai_fluency parseRun is missing");
    if (!entry.dashboardImportRun) {
      gaps.push("ai_fluency dashboardImportRun is missing");
    }
    handoff = buildAIFluencyOperatorSourceHandoff({
      parseRun: entry.parseRun,
      dashboardImportRun: entry.dashboardImportRun,
      sourceRef: entry.sourceRef,
      handoffId: supplied?.handoff_id,
      generatedAt: generatedAtFor(inputGeneratedAt, supplied)
    });
    const recomputedValidation = validateAIFluencyOperatorSourceHandoff(handoff);
    const suppliedValidation = validateAIFluencyOperatorSourceHandoff(supplied);
    gaps.push(
      ...recomputedValidation.gaps.map((gap) => `ai_fluency recomputed: ${gap}`),
      ...suppliedValidation.gaps.map((gap) => `ai_fluency supplied: ${gap}`)
    );
  }

  if (laneKey === "vbd_token") {
    if (!entry.aggregateIntake) gaps.push("vbd_token aggregateIntake is missing");
    handoff = buildVbdTokenOperatorSourceHandoff({
      aggregateIntake: entry.aggregateIntake,
      handoffId: supplied?.handoff_id,
      generatedAt: generatedAtFor(inputGeneratedAt, supplied)
    });
    const recomputedValidation = validateVbdTokenOperatorSourceHandoff(handoff);
    const suppliedValidation = validateVbdTokenOperatorSourceHandoff(supplied);
    gaps.push(
      ...recomputedValidation.gaps.map((gap) => `vbd_token recomputed: ${gap}`),
      ...suppliedValidation.gaps.map((gap) => `vbd_token supplied: ${gap}`)
    );
  }

  if (laneKey === "customer_metric") {
    if (!entry.customerMetricIntake) {
      gaps.push("customer_metric customerMetricIntake is missing");
    }
    handoff = buildCustomerMetricOperatorSourceHandoff({
      customerMetricIntake: entry.customerMetricIntake,
      handoffId: supplied?.handoff_id,
      generatedAt: generatedAtFor(inputGeneratedAt, supplied)
    });
    const recomputedValidation = validateCustomerMetricOperatorSourceHandoff(handoff);
    const suppliedValidation = validateCustomerMetricOperatorSourceHandoff(supplied);
    gaps.push(
      ...recomputedValidation.gaps.map((gap) => `customer_metric recomputed: ${gap}`),
      ...suppliedValidation.gaps.map((gap) => `customer_metric supplied: ${gap}`)
    );
  }

  if (laneKey === "assumption" || laneKey === "governance") {
    if (!entry.source) gaps.push(`${laneKey} source is missing`);
    handoff = buildAssumptionGovernanceOperatorSourceHandoff({
      lane: laneKey,
      source: entry.source,
      handoffId: supplied?.handoff_id,
      generatedAt: generatedAtFor(inputGeneratedAt, supplied)
    });
    const recomputedValidation =
      validateAssumptionGovernanceOperatorSourceHandoff(handoff);
    const suppliedValidation =
      validateAssumptionGovernanceOperatorSourceHandoff(supplied);
    gaps.push(
      ...recomputedValidation.gaps.map((gap) => `${laneKey} recomputed: ${gap}`),
      ...suppliedValidation.gaps.map((gap) => `${laneKey} supplied: ${gap}`)
    );
  }

  if (supplied && !sameJson(handoff, supplied)) {
    gaps.push(`${laneKey} handoff does not match recomputed handoff`);
  }
  if (handoff?.decision !== "READY_FOR_OPERATOR_INTAKE") {
    gaps.push(`${laneKey} decision must be READY_FOR_OPERATOR_INTAKE`);
  }
  if (handoff?.feeds?.operator_intake_source !== true) {
    gaps.push(`${laneKey} feeds.operator_intake_source must be true`);
  }
  if (!handoff?.operator_source) {
    gaps.push(`${laneKey} operator_source is required`);
  }
  if (!handoff?.source_ref) {
    gaps.push(`${laneKey} source_ref is required`);
  }

  return {
    laneKey,
    handoff,
    gaps
  };
}

function contextFragmentsFrom(lanes: Record<LaneKey, any>): Record<string, any> {
  return {
    blueprint: {
      blueprint_alignment_context: lanes.blueprint.blueprint_alignment_context
    },
    ai_fluency: {
      ai_fluency_context: compactAIFluencyContext(lanes.ai_fluency.ai_fluency_context)
    },
    vbd_token: {
      vbd_context: lanes.vbd_token.vbd_context,
      token_context: lanes.vbd_token.token_context
    },
    customer_metric: {
      selected_metric_context: lanes.customer_metric.selected_metric_context,
      metric_movement_context: lanes.customer_metric.metric_movement_context,
      layer_3_metric_context: lanes.customer_metric.layer_3_metric_context
    },
    assumption: {
      assumption_context: lanes.assumption.assumption_context
    },
    governance: {
      governance_context: lanes.governance.governance_context
    }
  };
}

function compactAIFluencyContext(context: any): any {
  return {
    org_id: context?.org_id ?? null,
    client_id: context?.client_id ?? null,
    workflow_family: context?.workflow_family ?? null,
    function_area: context?.function_area ?? null,
    cohort_key: context?.cohort_key ?? null,
    baseline_window: context?.baseline_window ?? null,
    comparison_window: context?.comparison_window ?? null,
    owner_approval_state: context?.owner_approval_state ?? null,
    source_review_state: context?.source_review_state ?? null,
    evidence_state: context?.evidence_state ?? null,
    response_count: context?.response_count ?? null,
    source_ref: context?.source_ref ?? null,
    suppression_state: context?.suppression_state ?? null,
    context_role: "aggregate_ai_fluency_alignment_context_only"
  };
}

function sourcePackageReferencesFrom(lanes: Record<LaneKey, any>): any[] {
  return PACKAGE_BACKED_LANES.map((laneKey) => ({
    lane_key: laneKey,
    handoff_id: lanes[laneKey].handoff_id,
    source_ref: lanes[laneKey].source_ref,
    source_package_type: lanes[laneKey].source_package_reference?.source_package_type ?? null,
    source_refs: lanes[laneKey].source_package_reference?.source_refs ?? null
  }));
}

function identityFor(laneKey: LaneKey, handoff: any): LaneIdentity {
  const source = handoff?.operator_source ?? {};
  const context =
    laneKey === "blueprint"
      ? handoff?.blueprint_alignment_context
      : laneKey === "ai_fluency"
        ? handoff?.ai_fluency_context
        : laneKey === "vbd_token"
          ? handoff?.vbd_context
          : laneKey === "customer_metric"
            ? handoff?.selected_metric_context
            : laneKey === "assumption"
              ? handoff?.assumption_context
              : handoff?.governance_context;
  return {
    lane_key: laneKey,
    org_id: handoff?.org_id ?? source?.org_id ?? context?.org_id ?? null,
    client_id: handoff?.client_id ?? source?.client_id ?? context?.client_id ?? null,
    workflow_family:
      handoff?.workflow_family ?? source?.workflow_family ?? context?.workflow_family ?? null,
    workflow_id:
      handoff?.workflow_id ?? source?.workflow_id ?? context?.workflow_id ?? null,
    function_area:
      handoff?.function_area ?? source?.function_area ?? context?.function_area ?? null,
    cohort_key: handoff?.cohort_key ?? source?.cohort_key ?? context?.cohort_key ?? null,
    baseline_window:
      source?.baseline_window ?? context?.baseline_window ?? handoff?.baseline_window ?? null,
    comparison_window:
      source?.comparison_window ?? context?.comparison_window ?? handoff?.comparison_window ?? null,
    metric_id:
      handoff?.metric_id ??
      source?.metric_id ??
      context?.metric_id ??
      context?.expected_metric_id ??
      null,
    source_ref: handoff?.source_ref ?? source?.source_ref ?? context?.source_ref ?? null
  };
}

function collectAlignmentGaps(identities: LaneIdentity[]): string[] {
  const gaps: string[] = [];
  const base = identities[0];
  if (!base) return ["alignment_manifest cannot be built without lane identities"];
  for (const field of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window"
  ] as const) {
    for (const identity of identities.slice(1)) {
      if (!sameJson(identity[field], base[field])) {
        gaps.push(`${field} drift between ${base.lane_key} and ${identity.lane_key}`);
      }
    }
  }

  for (const field of ["workflow_id", "metric_id"] as const) {
    const populated = identities.filter((identity) => identity[field] !== null);
    if (populated.length < 2) continue;
    const first = populated[0];
    for (const identity of populated.slice(1)) {
      if (!sameJson(identity[field], first[field])) {
        gaps.push(`${field} drift between ${first.lane_key} and ${identity.lane_key}`);
      }
    }
  }

  const seen = new Map<string, LaneKey>();
  for (const identity of identities) {
    const sourceRef = String(identity.source_ref ?? "");
    if (!sourceRef) {
      gaps.push(`${identity.lane_key} source_ref is missing`);
      continue;
    }
    const previous = seen.get(sourceRef);
    if (previous) {
      gaps.push(`duplicate source_ref across ${previous} and ${identity.lane_key}`);
    }
    seen.set(sourceRef, identity.lane_key);
  }
  return gaps;
}

function alignmentManifestFrom(
  lanes: Record<LaneKey, any>,
  identities: LaneIdentity[]
): any {
  const base = identities[0];
  return {
    org_id: base.org_id,
    client_id: base.client_id,
    workflow_family: base.workflow_family,
    workflow_id:
      identities.find((identity) => identity.workflow_id !== null)?.workflow_id ?? null,
    function_area: base.function_area,
    cohort_key: base.cohort_key,
    baseline_window: base.baseline_window,
    comparison_window: base.comparison_window,
    metric_id:
      identities.find((identity) => identity.metric_id !== null)?.metric_id ?? null,
    lane_count: REQUIRED_LANES.length,
    lane_source_refs: Object.fromEntries(
      identities.map((identity) => [identity.lane_key, identity.source_ref])
    ),
    lane_handoff_ids: Object.fromEntries(
      REQUIRED_LANES.map((laneKey) => [laneKey, lanes[laneKey].handoff_id])
    ),
    source_package_reference_count: PACKAGE_BACKED_LANES.length,
    package_alignment_state: "prepared_not_reviewed"
  };
}

function compactOutputsFrom(lanes: Record<LaneKey, any>): {
  operator_sources: Record<LaneKey, any>;
  measurement_cell_context_fragments: Record<string, any>;
  source_package_references: any[];
  alignment_manifest: any;
  alignment_gaps: string[];
} {
  const identities = REQUIRED_LANES.map((laneKey) => identityFor(laneKey, lanes[laneKey]));
  const alignmentGaps = collectAlignmentGaps(identities);
  return {
    operator_sources: Object.fromEntries(
      REQUIRED_LANES.map((laneKey) => [laneKey, lanes[laneKey].operator_source])
    ) as Record<LaneKey, any>,
    measurement_cell_context_fragments: contextFragmentsFrom(lanes),
    source_package_references: sourcePackageReferencesFrom(lanes),
    alignment_manifest: alignmentManifestFrom(lanes, identities),
    alignment_gaps: alignmentGaps
  };
}

export function buildOperatorSourceHandoffBundle(
  input: BuildOperatorSourceHandoffBundleInput
): any {
  const recomputed = REQUIRED_LANES.map((laneKey) =>
    recomputeLane(laneKey, input?.lanes?.[laneKey], input?.generatedAt)
  );
  const laneGaps = recomputed.flatMap((lane) => lane.gaps);
  const recomputedLanes = Object.fromEntries(
    recomputed.map((lane) => [lane.laneKey, lane.handoff])
  ) as Record<LaneKey, any>;
  const canCompact = laneGaps.length === 0;
  const compact = canCompact
    ? compactOutputsFrom(recomputedLanes)
    : {
        operator_sources: {},
        measurement_cell_context_fragments: {},
        source_package_references: [],
        alignment_manifest: null,
        alignment_gaps: []
      };
  const inputGaps = [...laneGaps, ...compact.alignment_gaps];
  const ready = inputGaps.length === 0;

  return {
    schema_version: AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_SCHEMA_VERSION,
    bundle_id: input?.bundleId ??
      `operator_source_handoff_bundle_${safeIdPart(String(compact.alignment_manifest?.client_id ?? "client"))}_${safeIdPart(String(compact.alignment_manifest?.workflow_family ?? "workflow"))}`,
    decision: ready ? "READY_FOR_OPERATOR_PREPARATION" : "BLOCKED",
    input_gaps: inputGaps,
    operator_sources: ready ? compact.operator_sources : {},
    measurement_cell_context_fragments: ready
      ? compact.measurement_cell_context_fragments
      : {},
    source_package_references: ready ? compact.source_package_references : [],
    alignment_manifest: ready ? compact.alignment_manifest : null,
    feeds: ready ? readyFeeds() : falseFeeds(),
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "Operator Source Handoff Bundle is a compact preparation manifest only.",
      "The bundle recomputes child lane handoffs from embedded lane inputs and rejects stale or tampered child handoffs.",
      "The bundle prepares operator sources and source-package alignment references only; it does not clear Source Package Review Queue, feed Measurement Cell, finance context, confidence model, or customer-facing output."
    ],
    generated_at: input?.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenFields(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isFalseBoundaryFlag = nested === false &&
      currentPath.some((part) =>
        ["boundary_policy", "feeds"].includes(normalizeKey(part))
      );
    if (
      !isAllowedForbiddenFieldPath(currentPath) &&
      !isFalseBoundaryFlag &&
      !["blocked_uses"].includes(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function isAllowedForbiddenFieldPath(path: string[]): boolean {
  const normalized = path.map((part) => normalizeKey(part));
  return normalized.join(".") ===
    "measurement_cell_context_fragments.ai_fluency.ai_fluency_context.dimension_scores.confidence";
}

function isValueExemptPath(path: string[]): boolean {
  const first = normalizeKey(path[0] ?? "");
  return ["blocked_uses", "boundary_policy", "required_caveats"].includes(first);
}

function collectForbiddenValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    if (
      !isValueExemptPath(path) &&
      (
        EMAIL_VALUE_PATTERN.test(value) ||
        DIRECT_IDENTIFIER_VALUE_PATTERN.test(value) ||
        UNSAFE_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        )
      )
    ) {
      fields.add(path.join(".") || "value");
    }
    return fields;
  }
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenValues(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, fields, [...path, key]);
  }
  return fields;
}

function collectReadyBundleGaps(bundle: any): string[] {
  const gaps: string[] = [];
  for (const laneKey of REQUIRED_LANES) {
    requireField(bundle?.operator_sources?.[laneKey], `operator_sources.${laneKey}`, gaps);
  }
  for (const laneKey of REQUIRED_LANES) {
    const source = bundle?.operator_sources?.[laneKey];
    if (source?.state !== "present") {
      gaps.push(`operator_sources.${laneKey}.state must be present`);
    }
    if (source?.aggregate_only !== true) {
      gaps.push(`operator_sources.${laneKey}.aggregate_only must be true`);
    }
    if (source?.source_ref !== bundle?.alignment_manifest?.lane_source_refs?.[laneKey]) {
      gaps.push(`operator_sources.${laneKey}.source_ref must match alignment_manifest.lane_source_refs.${laneKey}`);
    }
  }
  for (const [path, value] of [
    ["measurement_cell_context_fragments.blueprint.blueprint_alignment_context", bundle?.measurement_cell_context_fragments?.blueprint?.blueprint_alignment_context],
    ["measurement_cell_context_fragments.ai_fluency.ai_fluency_context", bundle?.measurement_cell_context_fragments?.ai_fluency?.ai_fluency_context],
    ["measurement_cell_context_fragments.vbd_token.vbd_context", bundle?.measurement_cell_context_fragments?.vbd_token?.vbd_context],
    ["measurement_cell_context_fragments.vbd_token.token_context", bundle?.measurement_cell_context_fragments?.vbd_token?.token_context],
    ["measurement_cell_context_fragments.customer_metric.selected_metric_context", bundle?.measurement_cell_context_fragments?.customer_metric?.selected_metric_context],
    ["measurement_cell_context_fragments.customer_metric.metric_movement_context", bundle?.measurement_cell_context_fragments?.customer_metric?.metric_movement_context],
    ["measurement_cell_context_fragments.customer_metric.layer_3_metric_context", bundle?.measurement_cell_context_fragments?.customer_metric?.layer_3_metric_context],
    ["measurement_cell_context_fragments.assumption.assumption_context", bundle?.measurement_cell_context_fragments?.assumption?.assumption_context],
    ["measurement_cell_context_fragments.governance.governance_context", bundle?.measurement_cell_context_fragments?.governance?.governance_context]
  ] as const) {
    requireField(value, path, gaps);
  }
  if (!Array.isArray(bundle?.source_package_references)) {
    gaps.push("source_package_references must be an array");
  } else if (bundle.source_package_references.length !== PACKAGE_BACKED_LANES.length) {
    gaps.push(`source_package_references must include ${PACKAGE_BACKED_LANES.length} lane references`);
  } else {
    for (const laneKey of PACKAGE_BACKED_LANES) {
      const reference = bundle.source_package_references.find(
        (item: any) => item?.lane_key === laneKey
      );
      if (!reference) {
        gaps.push(`source_package_references missing ${laneKey}`);
        continue;
      }
      if (reference.source_ref !== bundle?.alignment_manifest?.lane_source_refs?.[laneKey]) {
        gaps.push(`source_package_references.${laneKey}.source_ref must match alignment_manifest`);
      }
      if (!reference.source_package_type) {
        gaps.push(`source_package_references.${laneKey}.source_package_type is required`);
      }
      if (!reference.source_refs || typeof reference.source_refs !== "object") {
        gaps.push(`source_package_references.${laneKey}.source_refs is required`);
      }
    }
  }
  for (const field of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "lane_count",
    "lane_source_refs",
    "lane_handoff_ids",
    "source_package_reference_count",
    "package_alignment_state"
  ]) {
    requireField(bundle?.alignment_manifest?.[field], `alignment_manifest.${field}`, gaps);
  }
  if (bundle?.alignment_manifest?.lane_count !== REQUIRED_LANES.length) {
    gaps.push(`alignment_manifest.lane_count must be ${REQUIRED_LANES.length}`);
  }
  if (
    bundle?.alignment_manifest?.source_package_reference_count !==
    PACKAGE_BACKED_LANES.length
  ) {
    gaps.push(`alignment_manifest.source_package_reference_count must be ${PACKAGE_BACKED_LANES.length}`);
  }
  if (bundle?.alignment_manifest?.package_alignment_state !== "prepared_not_reviewed") {
    gaps.push("alignment_manifest.package_alignment_state must be prepared_not_reviewed");
  }
  const identities = REQUIRED_LANES.map((laneKey) => ({
    ...identityFor(laneKey, {
      ...bundle,
      operator_source: bundle?.operator_sources?.[laneKey],
      source_ref: bundle?.alignment_manifest?.lane_source_refs?.[laneKey],
      metric_id: ["blueprint", "customer_metric", "assumption", "governance"].includes(laneKey)
        ? bundle?.alignment_manifest?.metric_id
        : undefined
    }),
    lane_key: laneKey,
    baseline_window: bundle?.alignment_manifest?.baseline_window,
    comparison_window: bundle?.alignment_manifest?.comparison_window
  }));
  gaps.push(...collectAlignmentGaps(identities));
  return gaps;
}

function collectBlockedBundleGaps(bundle: any): string[] {
  const gaps: string[] = [];
  if (Object.keys(bundle?.operator_sources ?? {}).length > 0) {
    gaps.push("blocked bundle must not carry operator_sources");
  }
  if (Object.keys(bundle?.measurement_cell_context_fragments ?? {}).length > 0) {
    gaps.push("blocked bundle must not carry measurement_cell_context_fragments");
  }
  if (Array.isArray(bundle?.source_package_references) && bundle.source_package_references.length > 0) {
    gaps.push("blocked bundle must not carry source_package_references");
  }
  if (bundle?.alignment_manifest !== null) {
    gaps.push("blocked bundle must not carry alignment_manifest");
  }
  return gaps;
}

function recomputeFeeds(
  bundle: any,
  valid: boolean
): OperatorSourceHandoffBundleValidationResult["feeds"] {
  if (!valid || bundle?.decision !== "READY_FOR_OPERATOR_PREPARATION") {
    return falseFeeds();
  }
  return readyFeeds();
}

export function validateOperatorSourceHandoffBundle(
  bundle: any
): OperatorSourceHandoffBundleValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "bundle_id",
    "decision",
    "input_gaps",
    "operator_sources",
    "measurement_cell_context_fragments",
    "source_package_references",
    "alignment_manifest",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (bundle?.[field] === undefined || bundle?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    bundle?.schema_version &&
    bundle.schema_version !== AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${bundle.schema_version}`);
  }
  if (bundle?.decision && !ALLOWED_DECISIONS.has(String(bundle.decision))) {
    gaps.push(`decision is invalid: ${bundle.decision}`);
  }
  if (Array.isArray(bundle?.input_gaps) && bundle.input_gaps.length > 0) {
    gaps.push(...bundle.input_gaps);
  }
  if (bundle?.decision === "READY_FOR_OPERATOR_PREPARATION") {
    gaps.push(...collectReadyBundleGaps(bundle));
  } else {
    gaps.push(...collectBlockedBundleGaps(bundle));
  }
  if (bundle?.feeds?.operator_preparation !== (bundle?.decision === "READY_FOR_OPERATOR_PREPARATION")) {
    gaps.push("feeds.operator_preparation must match ready decision");
  }
  if (bundle?.feeds?.package_alignment_preparation !== (bundle?.decision === "READY_FOR_OPERATOR_PREPARATION")) {
    gaps.push("feeds.package_alignment_preparation must match ready decision");
  }
  for (const field of [
    "source_package_review_queue",
    "measurement_cell",
    "finance_context_investigation",
    "confidence_model",
    "customer_facing_output",
    "customer_facing_financial_output"
  ]) {
    if (bundle?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(bundle?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const use of SAFE_ALLOWED_USES) {
    if (!stringsOf(bundle?.allowed_uses).includes(use)) {
      gaps.push(`allowed_uses missing ${use}`);
    }
  }
  for (const use of stringsOf(bundle?.allowed_uses)) {
    if (!SAFE_ALLOWED_USES.includes(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (bundle?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(bundle)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const field of [...collectForbiddenValues(bundle)].sort()) {
    gaps.push(`Unsafe identifier value detected: ${field}`);
  }

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    bundle_id: bundle?.bundle_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(bundle, valid)
  };
}
