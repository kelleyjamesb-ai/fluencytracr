/**
 * AI Value Engine — Outcome Evidence Export stage (Phase 5 Slice 2).
 *
 * Governs the aggregate outcome package a customer's operations team exports
 * from their own system (support case management, CRM, etc.). Rules:
 *
 * - Generic: metric values are keyed to metric_ids that must exist in the
 *   org's metrics library with matching units; the template works for any
 *   domain the library covers.
 * - Exact windows: the export's baseline/comparison windows must equal the
 *   blueprint's windows or the export cannot attach.
 * - Explicit human accept: a validated export starts as SUBMITTED. Only a
 *   reviewed, ACCEPTED export may upgrade evidence readiness; validation
 *   proves shape, acceptance proves trust.
 * - Aggregate only: attestation flags must be explicitly false for
 *   person-level data and raw content, and person-level or raw keys are
 *   rejected outright.
 * - Evidence never proves ROI or causality; it upgrades the outcome lane
 *   and grounds scenario baselines, nothing more.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_VALIDATION_2026_06";

export const OUTCOME_EVIDENCE_EXPORT_SCHEMA_VERSION =
  "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06";

export const OUTCOME_EVIDENCE_REVIEW_STATES = new Set([
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED"
]);

const FORBIDDEN_KEY_PATTERNS = [
  /ticket_text/i,
  /case_text/i,
  /message/i,
  /transcript/i,
  /prompt/i,
  /response_text/i,
  /file_content/i,
  /raw_/i,
  /email/i,
  /(^|_)user(_|$)/i,
  /^user[A-Z]/,
  /employee/i,
  /agent_id/i,
  /person/i,
  /respondent/i,
  /(^|_)name(_|$)/i,
  /hris/i,
  /dollar/i,
  /currency/i,
  /causal/i
];

const FORBIDDEN_KEY_EXCEPTIONS = new Set(["source_name"]);

export interface OutcomeEvidenceExportValidationResult {
  schema_version: string;
  export_id: string | null;
  org_id: string | null;
  workflow_family: string | null;
  review_state: string;
  metric_count: number;
  valid: boolean;
  gaps: string[];
  cross_check_gaps: string[];
  feeds: {
    /** True only for a valid AND human-accepted export with clean cross-checks. */
    evidence_attachment: boolean;
    roi_proof: false;
    causality_claim: false;
    customer_facing_economic_output: false;
  };
}

export interface OutcomeEvidenceCrossCheckContext {
  metricsLibrary?: any;
  blueprint?: any;
}

function isForbiddenKey(key: string): boolean {
  if (FORBIDDEN_KEY_EXCEPTIONS.has(key)) return false;
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "attestation") continue;
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

export function reviewStateOf(exportObject: any): string {
  return exportObject?.review?.review_state ?? "SUBMITTED";
}

function collectBaseGaps(exportObject: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "export_id",
    "org_id",
    "workflow_family",
    "source_system",
    "attestation",
    "windows",
    "metrics"
  ]) {
    if (!exportObject?.[field]) gaps.push(`${field} is missing`);
  }
  if (exportObject?.schema_version &&
      exportObject.schema_version !== OUTCOME_EVIDENCE_EXPORT_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${exportObject.schema_version}`);
  }

  const source = exportObject?.source_system ?? {};
  for (const field of ["source_type", "source_name", "approved_grain"]) {
    if (!source[field]) gaps.push(`source_system.${field} is missing`);
  }

  const attestation = exportObject?.attestation ?? {};
  for (const field of ["exported_by_role", "approved_by_role", "export_date"]) {
    if (!attestation[field]) gaps.push(`attestation.${field} is missing`);
  }
  for (const flag of ["contains_person_level_data", "contains_raw_content"]) {
    if (attestation[flag] !== false) {
      gaps.push(`attestation.${flag} must be explicitly false`);
    }
  }

  if (!exportObject?.windows?.baseline) gaps.push("windows.baseline is missing");
  if (!exportObject?.windows?.comparison) gaps.push("windows.comparison is missing");

  const metrics = exportObject?.metrics;
  if (exportObject?.metrics !== undefined) {
    if (!Array.isArray(metrics) || metrics.length === 0) {
      gaps.push("metrics must include at least one metric value");
    } else {
      metrics.forEach((metric: any, index: number) => {
        const path = `metrics[${index}]`;
        if (!metric?.metric_id) gaps.push(`${path}.metric_id is missing`);
        if (!metric?.measurement_unit) gaps.push(`${path}.measurement_unit is missing`);
        for (const field of ["baseline_value", "comparison_value"]) {
          if (typeof metric?.[field] !== "number" || !Number.isFinite(metric[field])) {
            gaps.push(`${path}.${field} must be a number`);
          }
        }
        if (typeof metric?.eligible_population !== "number" ||
            metric.eligible_population <= 0) {
          gaps.push(`${path}.eligible_population must be a positive aggregate count`);
        }
      });
    }
  }

  const review = exportObject?.review;
  if (review !== undefined && review !== null) {
    if (!OUTCOME_EVIDENCE_REVIEW_STATES.has(review?.review_state)) {
      gaps.push(`review.review_state is invalid: ${review?.review_state}`);
    }
    if (review?.review_state === "ACCEPTED" || review?.review_state === "REJECTED") {
      if (!review?.reviewer_role) gaps.push("review.reviewer_role is missing");
      if (!review?.reviewed_at) gaps.push("review.reviewed_at is missing");
    }
  }

  for (const field of [...collectForbiddenFields(exportObject)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  return gaps;
}

function collectCrossCheckGaps(
  exportObject: any,
  context: OutcomeEvidenceCrossCheckContext
): string[] {
  const gaps: string[] = [];

  const library = context.metricsLibrary;
  if (library) {
    const libraryMetrics = new Map(
      (library.metrics ?? []).map((metric: any) => [metric.metric_id, metric])
    );
    for (const metric of exportObject?.metrics ?? []) {
      const match: any = libraryMetrics.get(metric?.metric_id);
      if (!match) {
        gaps.push(`metric ${metric?.metric_id} is not in metrics library ${library.library_id}`);
        continue;
      }
      if (match.measurement_unit !== metric?.measurement_unit) {
        gaps.push(
          `metric ${metric.metric_id} unit ${metric.measurement_unit} does not match library unit ${match.measurement_unit}`
        );
      }
      if (match.source_system?.source_type &&
          exportObject?.source_system?.source_type &&
          match.source_system.source_type !== exportObject.source_system.source_type) {
        gaps.push(
          `metric ${metric.metric_id} expects source type ${match.source_system.source_type}, export declares ${exportObject.source_system.source_type}`
        );
      }
    }
  }

  const blueprint = context.blueprint;
  if (blueprint) {
    if (blueprint.workflow_family !== exportObject?.workflow_family) {
      gaps.push(
        `export workflow_family ${exportObject?.workflow_family} does not match blueprint ${blueprint.workflow_family}`
      );
    }
    // Exact window discipline: evidence must cover the agreed windows.
    if (blueprint.windows?.baseline !== exportObject?.windows?.baseline) {
      gaps.push(
        `export baseline window ${exportObject?.windows?.baseline} must exactly match blueprint baseline ${blueprint.windows?.baseline}`
      );
    }
    if (blueprint.windows?.comparison !== exportObject?.windows?.comparison) {
      gaps.push(
        `export comparison window ${exportObject?.windows?.comparison} must exactly match blueprint comparison ${blueprint.windows?.comparison}`
      );
    }
  }

  return gaps;
}

export function validateOutcomeEvidenceExport(
  exportObject: any,
  context: OutcomeEvidenceCrossCheckContext = {}
): OutcomeEvidenceExportValidationResult {
  const gaps = collectBaseGaps(exportObject);
  const crossCheckGaps = collectCrossCheckGaps(exportObject, context);
  const reviewState = reviewStateOf(exportObject);
  const valid = gaps.length === 0;

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    export_id: exportObject?.export_id ?? null,
    org_id: exportObject?.org_id ?? null,
    workflow_family: exportObject?.workflow_family ?? null,
    review_state: reviewState,
    metric_count: Array.isArray(exportObject?.metrics) ? exportObject.metrics.length : 0,
    valid,
    gaps,
    cross_check_gaps: crossCheckGaps,
    feeds: {
      evidence_attachment:
        valid && crossCheckGaps.length === 0 && reviewState === "ACCEPTED",
      roi_proof: false,
      causality_claim: false,
      customer_facing_economic_output: false
    }
  };
}

/**
 * Applies a review decision. Returns a new export object; never mutates.
 * Only SUBMITTED exports can be reviewed, and decisions are terminal in v1.
 */
export function applyOutcomeEvidenceReview(
  exportObject: any,
  decision: "ACCEPTED" | "REJECTED",
  reviewerRole: string,
  reviewedAt: string
): { exportObject: any | null; error: string | null } {
  if (!["ACCEPTED", "REJECTED"].includes(decision)) {
    return { exportObject: null, error: `invalid review decision: ${decision}` };
  }
  if (!reviewerRole) {
    return { exportObject: null, error: "reviewer_role is required" };
  }
  const currentState = reviewStateOf(exportObject);
  if (currentState !== "SUBMITTED") {
    return {
      exportObject: null,
      error: `export is ${currentState}; only SUBMITTED exports can be reviewed`
    };
  }
  return {
    exportObject: {
      ...exportObject,
      review: {
        review_state: decision,
        reviewer_role: reviewerRole,
        reviewed_at: reviewedAt
      }
    },
    error: null
  };
}
