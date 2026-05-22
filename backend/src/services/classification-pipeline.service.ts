/**
 * Orchestrates execution-level classification: build → FSC → min signal → signals → classify → suppress → persist → aggregate.
 */

import type { CanonicalEvent } from "../domain/canonical-event.schema";
import type { ClassificationRepository } from "../repositories/classification.repository";
import type { ExecutionClassificationOutcome } from "../repositories/classification.repository";
import type { WorkflowAggregateRepository } from "../repositories/workflow-aggregate.repository";
import { evaluateFsc } from "./fsc-evaluator";
import { evaluateMinimumSignalGate } from "./minimum-signal-gate";
import { classifyBehaviorPattern, type BehaviorPattern, type SignalBucket } from "./pattern-classifier";
import { detectSignals, type LatencyDetectionResult } from "./signal-detectors";
import { evaluateSuppression, type SuppressionReason } from "./suppression-engine";
import {
  aggregateWorkflowClassifications,
  DEFAULT_PREVALENCE_MODE,
  type ExecutionClassificationRecord
} from "./workflow-aggregate.service";
import { buildExecutionFromEvents, type ExecutionBuildResult } from "./execution-builder.service";

export interface ClassificationPipelineInput {
  readonly org_id: string;
  readonly workflow_id: string;
  readonly jbtd_id?: string | null;
  readonly persona_id?: string | null;
  readonly execution_id: string;
  readonly events: ReadonlyArray<CanonicalEvent>;
}

export interface ClassificationPipelineDeps {
  readonly classificationRepository: ClassificationRepository;
  readonly workflowAggregateRepository: WorkflowAggregateRepository;
}

export interface ClassificationPipelineResult {
  readonly outcome: ExecutionClassificationOutcome;
  readonly build: ExecutionBuildResult | null;
}

function isoNow(): string {
  return new Date().toISOString();
}

/** Aligns with workflow aggregate / Phase-2 scale: deterministic ms bands, not ML. */
const LATENCY_HIGH_MS = 10 * 60 * 1000;
const LATENCY_LOW_MS = 60 * 1000;

function structuralLatencyBucketFromMs(ms: number): "LOW" | "NORMAL" | "HIGH" {
  if (ms >= LATENCY_HIGH_MS) {
    return "HIGH";
  }
  if (ms <= LATENCY_LOW_MS) {
    return "LOW";
  }
  return "NORMAL";
}

function resolveLatencyBucketForClassification(
  detected: LatencyDetectionResult
): "LOW" | "NORMAL" | "HIGH" | "UNKNOWN" {
  if (detected.latency_bucket !== "UNKNOWN") {
    return detected.latency_bucket;
  }
  if (detected.total_execution_ms === null) {
    return "UNKNOWN";
  }
  return structuralLatencyBucketFromMs(detected.total_execution_ms);
}

function signalProfileToDiagnostics(
  profile: ReturnType<typeof detectSignals>
): Readonly<Record<string, unknown>> {
  return JSON.parse(JSON.stringify(profile)) as Readonly<Record<string, unknown>>;
}

async function refreshWorkflowAggregate(
  orgId: string,
  workflowId: string,
  classificationRepository: ClassificationRepository,
  workflowAggregateRepository: WorkflowAggregateRepository
): Promise<void> {
  const outcomes = await classificationRepository.findByOrgIdAndWorkflowId(orgId, workflowId);
  const bySlice = new Map<string, ExecutionClassificationRecord[]>();
  for (const o of outcomes) {
    const record: ExecutionClassificationRecord = {
      workflow_id: o.workflow_id,
      jbtd_id: o.jbtd_id,
      persona_id: o.persona_id,
      execution_id: o.execution_id,
      status: o.status,
      pattern: o.pattern,
      suppression_reason: o.suppression_reason
    };
    const key = `${record.jbtd_id ?? ""}::${record.persona_id ?? ""}`;
    const records = bySlice.get(key) ?? [];
    records.push(record);
    bySlice.set(key, records);
  }
  const aggregates = [];
  for (const records of bySlice.values()) {
    const agg = aggregateWorkflowClassifications({
      records,
      prevalence_mode: DEFAULT_PREVALENCE_MODE
    });
    if (agg.success) {
      aggregates.push(agg.result);
    }
  }
  await workflowAggregateRepository.replaceWorkflowAggregates(orgId, workflowId, aggregates);
}

function hasOwnJoinKey(input: ClassificationPipelineInput, field: "jbtd_id" | "persona_id"): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function resolveExecutionJoinKeys(
  input: ClassificationPipelineInput
): { readonly ok: true; readonly jbtd_id: string | null; readonly persona_id: string | null } | { readonly ok: false } {
  const inputJbtd = hasOwnJoinKey(input, "jbtd_id") ? input.jbtd_id ?? null : undefined;
  const inputPersona = hasOwnJoinKey(input, "persona_id") ? input.persona_id ?? null : undefined;
  let resolvedJbtd: string | null | undefined = inputJbtd;
  let resolvedPersona: string | null | undefined = inputPersona;

  for (const event of input.events) {
    const eventJbtd = event.jbtd_id ?? null;
    const eventPersona = event.persona_id ?? null;
    if (resolvedJbtd === undefined) {
      resolvedJbtd = eventJbtd;
    }
    if (resolvedPersona === undefined) {
      resolvedPersona = eventPersona;
    }
    if (eventJbtd !== resolvedJbtd || eventPersona !== resolvedPersona) {
      return { ok: false };
    }
  }

  return {
    ok: true,
    jbtd_id: resolvedJbtd ?? null,
    persona_id: resolvedPersona ?? null
  };
}

function buildSuppressedOutcome(params: {
  org_id: string;
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  execution_id: string;
  suppression_reason: SuppressionReason;
  diagnostics: ReadonlyArray<string>;
  signal_profile?: Readonly<Record<string, unknown>>;
}): ExecutionClassificationOutcome {
  return {
    org_id: params.org_id,
    workflow_id: params.workflow_id,
    jbtd_id: params.jbtd_id,
    persona_id: params.persona_id,
    execution_id: params.execution_id,
    status: "SUPPRESSED",
    suppression_reason: params.suppression_reason,
    signal_profile: params.signal_profile,
    diagnostics: params.diagnostics,
    processed_at: isoNow()
  };
}

export async function runClassificationPipeline(
  input: ClassificationPipelineInput,
  deps: ClassificationPipelineDeps
): Promise<ClassificationPipelineResult> {
  const { org_id, workflow_id, execution_id, events } = input;
  const { classificationRepository, workflowAggregateRepository } = deps;
  const joinKeys = resolveExecutionJoinKeys(input);
  const jbtd_id = joinKeys.ok ? joinKeys.jbtd_id : input.jbtd_id ?? null;
  const persona_id = joinKeys.ok ? joinKeys.persona_id : input.persona_id ?? null;

  if (!joinKeys.ok) {
    const outcome = buildSuppressedOutcome({
      org_id,
      workflow_id,
      jbtd_id,
      persona_id,
      execution_id,
      suppression_reason: "INCOMPLETE_EXECUTION",
      diagnostics: Object.freeze(["join_key_mismatch", "fail_closed_join_key"])
    });
    await classificationRepository.upsertOutcome(outcome);
    await refreshWorkflowAggregate(org_id, workflow_id, classificationRepository, workflowAggregateRepository);
    return { outcome, build: null };
  }

  const build = buildExecutionFromEvents({ events, execution_id });
  if (build === null) {
    const outcome = buildSuppressedOutcome({
      org_id,
      workflow_id,
      jbtd_id,
      persona_id,
      execution_id,
      suppression_reason: "INCOMPLETE_EXECUTION",
      diagnostics: Object.freeze(["execution_build_failed", "fail_closed_build"])
    });
    await classificationRepository.upsertOutcome(outcome);
    await refreshWorkflowAggregate(org_id, workflow_id, classificationRepository, workflowAggregateRepository);
    return { outcome, build: null };
  }

  const fsc = evaluateFsc({
    start_event_present: build.start_event_present,
    terminal_or_abandonment_present: build.terminal_or_abandonment_present,
    valid_timestamp_ratio: build.valid_timestamp_ratio,
    ordering_reconstructable: build.ordering_reconstructable,
    trace_count: build.trace_count,
    retry_sequences_linkable: build.retry_sequences_linkable,
    error_occurred: build.error_occurred,
    error_event_present: build.error_event_present
  });

  const minGate = evaluateMinimumSignalGate({
    execution_boundary_present: build.execution_boundary_present,
    retry_visibility: build.retry_visibility_present,
    step_logs_present: build.step_logs_present,
    error_visibility: build.error_visibility_present
  });

  const signals = detectSignals({
    ordered_events: build.ordered_events,
    retry_sequences: build.retry_sequences,
    execution_state: build.execution_state_snapshot
  });

  const itBucket = signals.iteration.iteration_bucket;
  const latBucket = resolveLatencyBucketForClassification(signals.latency);
  let classification_possible = false;
  let classification_reason: string | undefined;
  let pattern: BehaviorPattern | undefined;

  if (itBucket === "UNKNOWN") {
    classification_possible = false;
    classification_reason = "AMBIGUITY";
  } else {
    const cr = classifyBehaviorPattern({
      abandonment_present: signals.abandonment.abandonment_present,
      iteration_bucket: itBucket,
      raw_iteration_count: signals.iteration.raw_iteration_count,
      verification_present: signals.verification.verification_present,
      recovery_present: signals.recovery.recovery_present,
      latency_bucket: latBucket
    });
    if (cr.classified && cr.pattern !== undefined) {
      classification_possible = true;
      pattern = cr.pattern;
    } else {
      classification_possible = false;
      classification_reason = cr.reason ?? "AMBIGUITY";
    }
  }

  const suppression = evaluateSuppression({
    fsc_eligible: fsc.eligible,
    minimum_signal_allowed: minGate.allowed,
    classification_possible,
    classification_reason
  });

  const diag: string[] = [
    ...fsc.failed_checks.map((c) => `fsc:${c}`),
    ...minGate.failed_checks.map((c) => `min_signal:${c}`),
    ...suppression.diagnostics
  ];

  const outcome: ExecutionClassificationOutcome =
    suppression.status === "ALLOWED" && pattern !== undefined
      ? {
          org_id,
          workflow_id,
          jbtd_id,
          persona_id,
          execution_id,
          status: "ALLOWED",
          pattern,
          signal_profile: signalProfileToDiagnostics(signals),
          diagnostics: Object.freeze(diag),
          processed_at: isoNow()
        }
      : {
          org_id,
          workflow_id,
          jbtd_id,
          persona_id,
          execution_id,
          status: "SUPPRESSED",
          suppression_reason: suppression.reason,
          signal_profile: signalProfileToDiagnostics(signals),
          diagnostics: Object.freeze(diag),
          processed_at: isoNow()
        };

  await classificationRepository.upsertOutcome(outcome);
  await refreshWorkflowAggregate(org_id, workflow_id, classificationRepository, workflowAggregateRepository);
  return { outcome, build };
}
