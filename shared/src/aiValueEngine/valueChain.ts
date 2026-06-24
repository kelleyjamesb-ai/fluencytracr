/**
 * AI Value Engine — full value chain runner.
 *
 * Extends runSpine with the upstream kickoff stages so a single governed
 * pass covers Client Context -> Business Objective -> Workstream -> Use Case
 * (engagement), the optional Explore Your AI Fluency kickoff baseline, and
 * then the canonical object spine. Ordering and fail-closed rules:
 *
 * - An engagement that is provided but invalid halts the chain before the
 *   blueprint stage.
 * - A provided engagement must actually cover the blueprint's workflow
 *   family, otherwise the chain halts: untraceable value stories are not
 *   allowed to reach executives.
 * - The fluency baseline is optional context. When provided it must
 *   validate; an invalid baseline halts rather than silently dropping it.
 *   It never gates the spine on its scores — only on its governance.
 */

import { validateEngagement, engagementCoversWorkflowFamily, EngagementValidationResult } from "./engagement";
import {
  validateFluencyBaseline,
  summarizeFluencyBaseline,
  FluencyBaselineValidationResult
} from "./fluencyBaseline";
import {
  validateOutcomeEvidenceExport,
  OutcomeEvidenceExportValidationResult
} from "./outcomeEvidenceExport";
import { runSpine, SpineRunInput, SpineRunResult, SpineStageResult } from "./spine";

export const VALUE_CHAIN_RESULT_SCHEMA_VERSION = "FT_AI_VALUE_CHAIN_RUN_2026_06";

export interface ValueChainRunInput extends SpineRunInput {
  /** Optional upstream engagement context (client/objective/workstream/use cases). */
  engagement?: any;
  /** Optional aggregate kickoff fluency baseline. */
  fluencyBaseline?: any;
  /** Optional customer outcome evidence export; only ACCEPTED exports attach. */
  outcomeEvidenceExport?: any;
}

export interface ValueChainRunResult {
  schema_version: string;
  decision: string;
  halted_at: string | null;
  customer_facing_economic_output: false;
  engagement: SpineStageResult<EngagementValidationResult> & {
    covers_workflow_family: boolean | null;
  };
  fluency_baseline: SpineStageResult<FluencyBaselineValidationResult> & {
    summary: any | null;
  };
  outcome_evidence: SpineStageResult<OutcomeEvidenceExportValidationResult> & {
    attached: boolean;
  };
  spine: SpineRunResult | null;
}

const notRun = () => ({
  status: "NOT_RUN" as const,
  validation: null,
  object: null,
  generated: false,
  hold_reason: null
});

function optionalWorkflowFamily(value: any): string | null {
  return typeof value?.workflow_family === "string" && value.workflow_family.trim() !== ""
    ? value.workflow_family
    : null;
}

export function runValueChain(input: ValueChainRunInput): ValueChainRunResult {
  const result: ValueChainRunResult = {
    schema_version: VALUE_CHAIN_RESULT_SCHEMA_VERSION,
    decision: "NOT_RUN",
    halted_at: null,
    customer_facing_economic_output: false,
    engagement: { ...notRun(), covers_workflow_family: null },
    fluency_baseline: { ...notRun(), summary: null },
    outcome_evidence: { ...notRun(), attached: false },
    spine: null
  };
  let evidenceRefs: Record<string, string> | undefined;
  const packetContextRefs: Record<string, string> = {};

  // Stage 0a: Engagement context (optional, but validated when provided).
  if (input.engagement !== undefined) {
    const validation = validateEngagement(input.engagement);
    const workflowFamily = input.blueprint?.workflow_family ?? null;
    const covers = validation.valid
      ? engagementCoversWorkflowFamily(input.engagement, workflowFamily)
      : false;
    result.engagement = {
      status: validation.valid ? (covers ? "VALID" : "HELD") : "INVALID",
      validation,
      object: validation.valid ? input.engagement : null,
      generated: false,
      hold_reason: validation.valid
        ? covers
          ? null
          : `no engagement use case covers workflow family ${workflowFamily}`
        : "engagement validation gaps",
      covers_workflow_family: validation.valid ? covers : null
    };
    if (!validation.valid) {
      result.decision = "HOLD_FOR_ENGAGEMENT";
      result.halted_at = "engagement";
      return result;
    }
    if (!covers) {
      result.decision = "HOLD_FOR_USE_CASE_TRACEABILITY";
      result.halted_at = "engagement";
      return result;
    }
    if (typeof input.engagement?.engagement_id === "string") {
      packetContextRefs.engagement_id = input.engagement.engagement_id;
    }
  }

  // Stage 0b: Fluency kickoff baseline (optional context, validated when provided).
  if (input.fluencyBaseline !== undefined) {
    const validation = validateFluencyBaseline(input.fluencyBaseline);
    const workflowFamily = optionalWorkflowFamily(input.blueprint);
    const baselineWorkflowFamily = optionalWorkflowFamily(input.fluencyBaseline);
    const coversWorkflowFamily =
      validation.valid &&
      (!workflowFamily || !baselineWorkflowFamily || baselineWorkflowFamily === workflowFamily);
    result.fluency_baseline = {
      status: validation.valid ? (coversWorkflowFamily ? "VALID" : "HELD") : "INVALID",
      validation,
      object: validation.valid ? input.fluencyBaseline : null,
      generated: false,
      hold_reason: validation.valid
        ? coversWorkflowFamily
          ? null
          : `fluency baseline does not cover workflow family ${workflowFamily}`
        : "fluency baseline validation gaps",
      summary: validation.valid && coversWorkflowFamily
        ? summarizeFluencyBaseline(input.fluencyBaseline)
        : null
    };
    if (!validation.valid) {
      result.decision = "HOLD_FOR_FLUENCY_BASELINE";
      result.halted_at = "fluency_baseline";
      return result;
    }
    if (!coversWorkflowFamily) {
      result.decision = "HOLD_FOR_FLUENCY_BASELINE_TRACEABILITY";
      result.halted_at = "fluency_baseline";
      return result;
    }
    if (typeof input.fluencyBaseline?.baseline_id === "string") {
      evidenceRefs = {
        ...(evidenceRefs ?? {}),
        fluency_baseline_id: input.fluencyBaseline.baseline_id
      };
      packetContextRefs.fluency_baseline_id = input.fluencyBaseline.baseline_id;
    }
  }

  // Stage 0c: customer outcome evidence (optional; only ACCEPTED attaches).
  let sourceCoverageOverrides: Record<string, string> | undefined;
  if (input.outcomeEvidenceExport !== undefined) {
    const validation = validateOutcomeEvidenceExport(input.outcomeEvidenceExport, {
      metricsLibrary: input.metricsLibrary,
      blueprint: input.blueprint
    });
    const attached = validation.feeds.evidence_attachment;
    const pendingReview = validation.valid && validation.review_state === "SUBMITTED";
    result.outcome_evidence = {
      status: validation.valid ? (attached ? "VALID" : "HELD") : "INVALID",
      validation,
      object: validation.valid ? input.outcomeEvidenceExport : null,
      generated: false,
      hold_reason: attached
        ? null
        : !validation.valid
          ? "outcome evidence export validation gaps"
          : pendingReview
            ? "export is awaiting human review"
            : validation.review_state === "REJECTED"
              ? "export was rejected in review"
              : "cross-check gaps block evidence attachment",
      attached
    };
    if (!validation.valid) {
      result.decision = "HOLD_FOR_OUTCOME_EVIDENCE";
      result.halted_at = "outcome_evidence";
      return result;
    }
    if (validation.review_state === "ACCEPTED" && validation.cross_check_gaps.length > 0) {
      // Accepted evidence that does not align with the blueprint or library
      // is a governance problem, not ignorable context.
      result.decision = "HOLD_FOR_EVIDENCE_ALIGNMENT";
      result.halted_at = "outcome_evidence";
      return result;
    }
    if (attached) {
      sourceCoverageOverrides = { outcome: "PRESENT" };
      evidenceRefs = {
        ...(evidenceRefs ?? {}),
        outcome_evidence_export_id: String(input.outcomeEvidenceExport.export_id)
      };
    }
    // SUBMITTED or REJECTED exports never halt the chain; the spine simply
    // runs without the evidence upgrade.
  }

  // Stages 1-6: the canonical object spine.
  const spine = runSpine({
    blueprint: input.blueprint,
    metricsLibrary: input.metricsLibrary,
    scenario: input.scenario,
    ids: input.ids,
    sourceCoverageOverrides,
    evidenceRefs,
    packetContextRefs
  });
  result.spine = spine;
  result.decision = spine.decision;
  result.halted_at = spine.halted_at;
  return result;
}
