#!/usr/bin/env node
const DEFAULT_ORG_ID = "lmsys-org-assurance";
// Source of truth: backend/src/inference/confidence_layer.ts.
// Ghost-use persists when a current 60-day window has an adjacent qualifying previous window.
const GHOST_USE_REQUIRED_WINDOWS = 2;
const GHOST_USE_SURFACING_WINDOW_DAYS = 60;
const GHOST_USE_AMBIGUITY_DOMINANCE_THRESHOLD = 0.2;

function iso(baseMs, offsetMs) {
  return new Date(baseMs + offsetMs).toISOString();
}

function orgUnit(orgId) {
  return `org:${orgId}`;
}

function runId(runLabel, caseId, index) {
  return `lmsys-assurance-${runLabel}-${caseId}-${index}`;
}

function eventBase({
  orgId,
  workflowId,
  executionRunId,
  at,
  riskClass = "medium",
  ambiguityFlag = false,
  ambiguityReasonCode
}) {
  const event = {
    timestamp: at,
    risk_class: riskClass,
    org_unit: orgUnit(orgId),
    workflow_id: workflowId,
    run_id: executionRunId
  };
  if (ambiguityFlag) {
    event.ambiguity_flag = true;
    event.ambiguity_reason_code = ambiguityReasonCode ?? "AMB_EVIDENCE_INSUFFICIENT";
  }
  return event;
}

function stage(params, stageFrom, stageTo, aiAssisted) {
  return {
    ...eventBase(params),
    event_type: "workflow_stage_transition",
    stage_from: stageFrom,
    stage_to: stageTo,
    ai_assisted: aiAssisted
  };
}

function disposition(params, dispositionValue, options = {}) {
  return {
    ...eventBase(params),
    event_type: "ai_output_disposition",
    disposition: dispositionValue,
    edit_distance_bucket: options.editDistanceBucket ?? "none",
    verification_present: options.verificationPresent === true,
    time_to_action_ms: options.timeToActionMs ?? 0
  };
}

function recovery(params, options = {}) {
  return {
    ...eventBase(params),
    event_type: "ai_recovery_loop",
    recovery_type: options.recoveryType ?? "re_prompt",
    cycles: options.cycles ?? 1,
    resolution_time_ms: options.resolutionTimeMs ?? 0
  };
}

function verification(params, options = {}) {
  return {
    ...eventBase(params),
    event_type: "verification_signal",
    verification_type: options.verificationType ?? "policy_check",
    verification_latency_ms: options.verificationLatencyMs ?? 100
  };
}

function abandonment(params, stageValue = "generated") {
  return {
    ...eventBase(params),
    event_type: "ai_abandonment",
    abandonment_stage: stageValue,
    reason_bucket: "low_trust"
  };
}

function executionParams({
  orgId,
  workflowId,
  executionRunId,
  baseMs,
  offsetMs = 0,
  ambiguityFlag = false,
  ambiguityReasonCode
}) {
  return (stepMs) => ({
    orgId,
    workflowId,
    executionRunId,
    at: iso(baseMs, offsetMs + stepMs),
    ambiguityFlag,
    ambiguityReasonCode
  });
}

function calibratedExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(30_000), "started", "attempt", true),
    verification(p(45_000)),
    disposition(p(60_000), "accepted", { verificationPresent: true, timeToActionMs: 60_000 })
  ];
}

function blindExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(15_000), "started", "attempt", true),
    disposition(p(30_000), "accepted", { verificationPresent: false, timeToActionMs: 30_000 })
  ];
}

function recoveryExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    disposition(p(30_000), "rejected", { verificationPresent: false, timeToActionMs: 30_000 }),
    recovery(p(45_000), { cycles: 1, resolutionTimeMs: 45_000 }),
    disposition(p(90_000), "accepted", { verificationPresent: false, timeToActionMs: 90_000 })
  ];
}

function frictionExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    disposition(p(60_000), "rejected", { verificationPresent: false, timeToActionMs: 60_000 }),
    stage(p(120_000), "attempt", "attempt", true),
    disposition(p(300_000), "rejected", { verificationPresent: false, timeToActionMs: 300_000 }),
    stage(p(360_000), "attempt", "attempt", true),
    disposition(p(660_000), "accepted", { verificationPresent: false, timeToActionMs: 660_000 })
  ];
}

function undertrustExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(30_000), "started", "attempt", true),
    abandonment(p(60_000), "generated")
  ];
}

function ghostUseWorkActivityExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(30_000), "started", "human_work_observed", false)
  ];
}

function ghostUsePositiveEvidenceExecution(input) {
  const p = executionParams(input);
  return [
    ...ghostUseWorkActivityExecution(input),
    stage(p(45_000), "human_work_observed", "attempt", true),
    verification(p(60_000), { verificationType: "policy_check", verificationLatencyMs: 100 })
  ];
}

function buildExecutions({ orgId, workflowId, caseId, count, baseMs, runLabel, factory }) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(
      ...factory({
        orgId,
        workflowId,
        executionRunId: runId(runLabel, caseId, i),
        baseMs,
        offsetMs: i * 15 * 60_000
      })
    );
  }
  return out;
}

function buildGhostUseScenario({ orgId, workflowPrefix, scenarioId, runLabel, baseMs, count, expected, overrides = {} }) {
  const workflowId = `${workflowPrefix}-${scenarioId.replaceAll("_", "-")}`;
  const factory = overrides.positiveEvidence === true
    ? ghostUsePositiveEvidenceExecution
    : ghostUseWorkActivityExecution;
  const windowCount = overrides.persistAcrossRequiredWindows === false ? 1 : GHOST_USE_REQUIRED_WINDOWS;
  const events = [];

  for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
    const windowOffsetMs =
      (windowIndex - (windowCount - 1)) * GHOST_USE_SURFACING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    for (let i = 0; i < count; i += 1) {
      events.push(
        ...factory({
          orgId,
          workflowId,
          executionRunId: runId(runLabel, `${scenarioId}-window-${windowIndex + 1}`, i),
          baseMs,
          offsetMs: windowOffsetMs + i * 15 * 60_000,
          ambiguityFlag: overrides.ambiguityDominant === true,
          ambiguityReasonCode: "AMB_EVIDENCE_INSUFFICIENT"
        })
      );
    }
  }

  return {
    id: scenarioId,
    org_id: orgId,
    workflow_id: workflowId,
    description: "Ghost-use residual evaluation scenario. This fixture uses canonical metadata only and carries no message content.",
    expected: {
      ghost_use: expected,
      framing: "observability_only"
    },
    ghost_use_manifest: {
      source_contract: "docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md#ghost-use-residual-policy",
      inference_source: "backend/src/inference/confidence_layer.ts",
      required_windows: GHOST_USE_REQUIRED_WINDOWS,
      surfacing_window_days: GHOST_USE_SURFACING_WINDOW_DAYS,
      ambiguity_dominance_threshold: GHOST_USE_AMBIGUITY_DOMINANCE_THRESHOLD,
      ai_exposure_exists: true,
      work_activity_observed: true,
      positive_evidence_present: overrides.positiveEvidence === true,
      ambiguity_dominant: overrides.ambiguityDominant === true,
      persists_across_required_windows: overrides.persistAcrossRequiredWindows !== false,
      acceptable_language_hint: "no observed AI evidence in window"
    },
    events
  };
}

function buildCausalDeltaScenario({
  orgId,
  workflowPrefix,
  scenarioId,
  runLabel,
  eventAtMs,
  preFactory,
  postFactory,
  preCount,
  postCount,
  expectedShift
}) {
  const workflowId = `${workflowPrefix}-${scenarioId.replaceAll("_", "-")}`;
  const events = [];
  const preBaseMs = eventAtMs - 15 * 24 * 60 * 60 * 1000;
  const postBaseMs = eventAtMs + 15 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < preCount; i += 1) {
    events.push(
      ...preFactory({
        orgId,
        workflowId,
        executionRunId: runId(runLabel, `${scenarioId}-pre`, i),
        baseMs: preBaseMs,
        offsetMs: i * 15 * 60_000
      })
    );
  }

  for (let i = 0; i < postCount; i += 1) {
    events.push(
      ...postFactory({
        orgId,
        workflowId,
        executionRunId: runId(runLabel, `${scenarioId}-post`, i),
        baseMs: postBaseMs,
        offsetMs: i * 15 * 60_000
      })
    );
  }

  return {
    id: scenarioId,
    org_id: orgId,
    workflow_id: workflowId,
    description: "Causal Delta pre/post pattern-shift scenario. This fixture carries aggregate workflow metadata only.",
    expected: {
      causal_delta_shift: expectedShift
    },
    causal_delta_manifest: {
      endpoint: "/api/v1/causal-delta",
      event_at: iso(eventAtMs, 0),
      pre_window_days: 30,
      post_window_days: 30,
      methodology: "pre/post aggregate pattern shift; correlation only, not causation",
      no_statistical_claims: true
    },
    events
  };
}

function buildFrictionThresholdExecutions({ orgId, workflowId, caseId, baseMs, runLabel, count }) {
  const out = [];
  const frictionStart = Math.floor(count / 2);
  for (let i = 0; i < count; i += 1) {
    const factory = i < frictionStart ? blindExecution : frictionExecution;
    out.push(
      ...factory({
        orgId,
        workflowId,
        executionRunId: runId(runLabel, caseId, i),
        baseMs,
        offsetMs: i * 15 * 60_000
      })
    );
  }
  return out;
}

function validPiiProbeBase({ orgId, workflowId, executionRunId, baseMs }) {
  return {
    events: [
      {
        timestamp: iso(baseMs, 0),
        risk_class: "medium",
        org_unit: orgUnit(orgId),
        workflow_id: workflowId,
        run_id: executionRunId,
        event_type: "workflow_stage_transition",
        stage_from: "not_started",
        stage_to: "started",
        ai_assisted: false
      }
    ]
  };
}

export function buildAssuranceCases(options = {}) {
  const minCohortSize = options.minCohortSize ?? 5;
  const runLabel = options.runLabel ?? "selftest";
  const baseMs = Date.parse(options.baseTimestamp ?? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());
  const orgId = options.orgId ?? DEFAULT_ORG_ID;
  const workflowPrefix = `lmsys-assurance-${runLabel}`;
  const caseCount = Math.max(minCohortSize, 5);
  const frictionCaseCount = Math.max(caseCount, 50);
  const causalDeltaEventAtMs = baseMs - 45 * 24 * 60 * 60 * 1000;

  const subThresholdEvents = buildExecutions({
    orgId,
    workflowId: `${workflowPrefix}-sub-threshold`,
    caseId: "sub-threshold",
    count: Math.max(1, minCohortSize - 1),
    baseMs,
    runLabel,
    factory: blindExecution
  });

  const duplicateRun = `lmsys-assurance-${runLabel}-duplicate-shared-run`;
  const duplicateEvents = [
    ...blindExecution({
      orgId: "lmsys-org-tenant-a",
      workflowId: `${workflowPrefix}-shared-model`,
      executionRunId: duplicateRun,
      baseMs,
      offsetMs: 0
    }),
    ...blindExecution({
      orgId: "lmsys-org-tenant-b",
      workflowId: `${workflowPrefix}-shared-model`,
      executionRunId: duplicateRun,
      baseMs,
      offsetMs: 15 * 60_000
    })
  ];

  return [
    {
      id: "sub_threshold_workflow",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-sub-threshold`,
      description: "Workflow has fewer disclosed executions than MIN_COHORT_SIZE and must suppress aggregate surfacing.",
      expected: { aggregate: "SUPPRESSED" },
      events: subThresholdEvents
    },
    {
      id: "pii_boundary_rejection",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-pii-probe`,
      description: "Forbidden raw-content and direct-identifier fields must be rejected before persistence.",
      expected: { post_status: "4xx" },
      invalid_payloads: [
        {
          ...validPiiProbeBase({
            orgId,
            workflowId: `${workflowPrefix}-pii-probe`,
            executionRunId: `lmsys-assurance-${runLabel}-pii-name`,
            baseMs
          }),
          name: "Alice"
        },
        {
          events: [
            {
              ...validPiiProbeBase({
                orgId,
                workflowId: `${workflowPrefix}-pii-probe`,
                executionRunId: `lmsys-assurance-${runLabel}-pii-content`,
                baseMs
              }).events[0],
              message_text: "raw prompt body"
            }
          ]
        },
        {
          ...validPiiProbeBase({
            orgId,
            workflowId: `${workflowPrefix}-pii-probe`,
            executionRunId: `lmsys-assurance-${runLabel}-pii-email`,
            baseMs
          }),
          email: "alice@example.com"
        }
      ]
    },
    {
      id: "calibrated_fluency",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-calibrated-fluency`,
      expected: { pattern: "Calibrated Fluency" },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-calibrated-fluency`,
        caseId: "calibrated-fluency",
        count: caseCount,
        baseMs,
        runLabel,
        factory: calibratedExecution
      })
    },
    {
      id: "fast_completion_no_verification",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-blind-efficiency`,
      expected: { pattern: "Blind Efficiency" },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-blind-efficiency`,
        caseId: "blind-efficiency",
        count: caseCount,
        baseMs,
        runLabel,
        factory: blindExecution
      })
    },
    {
      id: "failure_success_recovery_maturity",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-recovery-maturity`,
      expected: { pattern: "Recovery Maturity" },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-recovery-maturity`,
        caseId: "recovery-maturity",
        count: caseCount,
        baseMs,
        runLabel,
        factory: recoveryExecution
      })
    },
    {
      id: "friction_loop",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-friction-loop`,
      expected: { pattern: "Friction Loop", iteration_high_threshold: options.iterationHighThreshold ?? 2 },
      events: buildFrictionThresholdExecutions({
        orgId,
        workflowId: `${workflowPrefix}-friction-loop`,
        caseId: "friction-loop",
        count: frictionCaseCount,
        baseMs,
        runLabel
      })
    },
    {
      id: "undertrust_avoidance",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-undertrust-avoidance`,
      expected: { pattern: "Undertrust Avoidance" },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-undertrust-avoidance`,
        caseId: "undertrust-avoidance",
        count: caseCount,
        baseMs,
        runLabel,
        factory: undertrustExecution
      })
    },
    buildGhostUseScenario({
      orgId: `${orgId}-residual-fires`,
      workflowPrefix,
      scenarioId: "ghost_use_residual_fires",
      runLabel,
      baseMs,
      count: caseCount,
      expected: "SURFACE"
    }),
    buildGhostUseScenario({
      orgId: `${orgId}-residual-positive-bypass`,
      workflowPrefix,
      scenarioId: "ghost_use_bypassed_by_positive_evidence",
      runLabel,
      baseMs,
      count: caseCount,
      expected: "BYPASS",
      overrides: { positiveEvidence: true }
    }),
    buildGhostUseScenario({
      orgId: `${orgId}-residual-ambiguity`,
      workflowPrefix,
      scenarioId: "ghost_use_suppressed_by_ambiguity",
      runLabel,
      baseMs,
      count: caseCount,
      expected: "SUPPRESS",
      overrides: { ambiguityDominant: true }
    }),
    buildGhostUseScenario({
      orgId: `${orgId}-residual-no-persistence`,
      workflowPrefix,
      scenarioId: "ghost_use_does_not_persist",
      runLabel,
      baseMs,
      count: caseCount,
      expected: "SUPPRESS_PERSISTENCE",
      overrides: { persistAcrossRequiredWindows: false }
    }),
    buildCausalDeltaScenario({
      orgId,
      workflowPrefix,
      scenarioId: "causal_delta_improved",
      runLabel,
      eventAtMs: causalDeltaEventAtMs,
      preFactory: blindExecution,
      postFactory: calibratedExecution,
      preCount: caseCount,
      postCount: caseCount,
      expectedShift: "IMPROVED"
    }),
    buildCausalDeltaScenario({
      orgId,
      workflowPrefix,
      scenarioId: "causal_delta_held",
      runLabel,
      eventAtMs: causalDeltaEventAtMs,
      preFactory: calibratedExecution,
      postFactory: calibratedExecution,
      preCount: caseCount,
      postCount: caseCount,
      expectedShift: "HELD"
    }),
    buildCausalDeltaScenario({
      orgId,
      workflowPrefix,
      scenarioId: "causal_delta_regressed",
      runLabel,
      eventAtMs: causalDeltaEventAtMs,
      preFactory: calibratedExecution,
      postFactory: frictionExecution,
      preCount: caseCount,
      postCount: caseCount,
      expectedShift: "REGRESSED"
    }),
    buildCausalDeltaScenario({
      orgId,
      workflowPrefix,
      scenarioId: "causal_delta_indeterminate",
      runLabel,
      eventAtMs: causalDeltaEventAtMs,
      preFactory: calibratedExecution,
      postFactory: calibratedExecution,
      preCount: Math.max(1, minCohortSize - 1),
      postCount: caseCount,
      expectedShift: "INDETERMINATE"
    }),
    {
      id: "duplicate_execution_ids_across_orgs",
      org_id: "lmsys-org-tenant-a",
      workflow_id: `${workflowPrefix}-shared-model`,
      expected: { tenant_isolation: "PASS", duplicate_run_id: duplicateRun },
      events: duplicateEvents
    }
  ];
}

export function buildAssuranceEvents(options = {}) {
  return buildAssuranceCases(options).flatMap((entry) => entry.events ?? []);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cases = buildAssuranceCases({ runLabel: process.env.ASSURANCE_RUN_ID ?? "preview" });
  console.log(JSON.stringify({ cases, event_count: buildAssuranceEvents().length }, null, 2));
}
