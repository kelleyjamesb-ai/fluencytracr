#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ORG_ID = "lmsys-org-assurance";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VELOCITY_BASELINE = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../calibration/velocity_baselines.json"), "utf8")
);
// Source of truth: backend/src/inference/confidence_layer.ts.
// Ghost-use persists when a current 60-day window has an adjacent qualifying previous window.
const GHOST_USE_REQUIRED_WINDOWS = 2;
const GHOST_USE_SURFACING_WINDOW_DAYS = 60;
const GHOST_USE_AMBIGUITY_DOMINANCE_THRESHOLD = 0.2;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function aivmAccelerationExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(15_000), "started", "attempt", true),
    disposition(p(30_000), "accepted", { verificationPresent: false, timeToActionMs: 30_000 })
  ];
}

function aivmQualityPremiumExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(30_000), "started", "attempt", true),
    verification(p(45_000), { verificationType: "peer_review", verificationLatencyMs: 200 }),
    recovery(p(60_000), { recoveryType: "human_correction", cycles: 1, resolutionTimeMs: 60_000 }),
    disposition(p(90_000), "accepted", { verificationPresent: true, timeToActionMs: 90_000 })
  ];
}

function aivmUnclassifiedExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(30_000), "started", "attempt", true),
    disposition(p(120_000), "edited", { verificationPresent: false, timeToActionMs: 120_000 })
  ];
}

function lowReliabilityExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false),
    stage(p(30_000), "started", "attempt", true),
    disposition(p(60_000), "rejected", { verificationPresent: false, timeToActionMs: 60_000 }),
    stage(p(120_000), "attempt", "attempt", true),
    disposition(p(300_000), "rejected", { verificationPresent: false, timeToActionMs: 300_000 }),
    stage(p(360_000), "attempt", "attempt", true),
    abandonment(p(660_000), "generated")
  ];
}

function sparseReliabilityExecution(input) {
  const p = executionParams(input);
  return [
    stage(p(0), "not_started", "started", false)
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

function buildAivmCase({
  orgId,
  workflowPrefix,
  caseId,
  runLabel,
  baseMs,
  count,
  valueType,
  evidenceGrade,
  factory,
  canonicalEvidence
}) {
  const workflowId = `${workflowPrefix}-${caseId.replaceAll("_", "-")}`;
  return {
    id: caseId,
    org_id: orgId,
    workflow_id: workflowId,
    description: "AIVM verdict-legibility fixture. Events remain canonical metadata only; expected value fields are derived from existing evidence classes.",
    expected: {
      value_type: valueType,
      evidence_grade: evidenceGrade
    },
    aivm_manifest: {
      source_contract: "docs/contracts/FluencyTracr_V1_AIVM_Value_Mapping.md",
      verdict_fields: ["value_type", "evidence_grade"],
      canonical_evidence: canonicalEvidence,
      cohort_size: evidenceGrade === "OBJECTIVE" ? 30 : count,
      window_length_days: evidenceGrade === "OBJECTIVE" ? 90 : 60,
      note: "NET_NEW and CALIBRATED are reserved hooks and are not inferred from LMSYS fixtures."
    },
    events: buildExecutions({
      orgId,
      workflowId,
      caseId,
      count,
      baseMs,
      runLabel,
      factory
    })
  };
}

function buildReliabilityFactorCase({
  orgId,
  workflowPrefix,
  caseId,
  runLabel,
  baseMs,
  count,
  factory,
  expected,
  canonicalEvidence,
  notes
}) {
  const workflowId = `${workflowPrefix}-${caseId.replaceAll("_", "-")}`;
  return {
    id: caseId,
    org_id: orgId,
    workflow_id: workflowId,
    description: "Reliability Factor assurance fixture. Events remain canonical metadata only; expected Reliability Factor fields are derived from aggregate workflow behavior.",
    expected,
    reliability_factor_manifest: {
      source_contract: "schemas/ft_v1_evaluation_decision.schema.json",
      inference_source: "backend/src/value_realization/reliability_factor.ts",
      verdict_fields: ["reliability_factor", "reliability_components"],
      formula: "clamp01(0.5 + 0.25*verification_presence_rate + 0.25*recovery_success_rate - 0.25*abandonment_rate - 0.25*friction_loop_rate)",
      rounding: "3_decimal_places",
      canonical_evidence: canonicalEvidence,
      cohort_size: count,
      notes
    },
    events: buildExecutions({
      orgId,
      workflowId,
      caseId,
      count,
      baseMs,
      runLabel,
      factory
    })
  };
}

function outcomeEvidencePayload({ workflowId, baseMs, metric, cohortSize = 12, aggregateKind = null }) {
  const payload = {
    workflow_id: workflowId,
    outcome_metric: metric,
    outcome_unit: "days",
    period_start: iso(baseMs, -14 * 24 * 60 * 60 * 1000),
    period_end: iso(baseMs, 0),
    aggregate_value: 4.2,
    cohort_size: cohortSize,
    source_system: "Jira",
    jbtd_id: null,
    persona_id: null
  };
  if (aggregateKind) {
    payload.aggregate_kind = aggregateKind;
  }
  return payload;
}

function velocityDistributionPayload({ workflowId, eventName, cohortSize, distribution, baseMs }) {
  return {
    schema_version: "FT_V2_2026_05",
    event_name: eventName,
    workflow_id: workflowId,
    window_start: iso(baseMs, -60 * DAY_MS),
    window_end: iso(baseMs, 0),
    cohort_size: cohortSize,
    distribution,
    calibration_reference: "scio-prod-60d-2026-05",
    privacy: {
      person_level_fields_included: false
    }
  };
}

function buildVelocityCase({ orgId, workflowPrefix, caseId, baseMs, cohortSize, distributions, expectedVelocityIndex }) {
  const workflowId = `${workflowPrefix}-${caseId.replaceAll("_", "-")}`;
  const payloads = [
    velocityDistributionPayload({
      workflowId,
      eventName: "USER_FREQUENCY_OBSERVED",
      cohortSize,
      distribution: distributions.frequency,
      baseMs
    }),
    velocityDistributionPayload({
      workflowId,
      eventName: "USER_ENGAGEMENT_OBSERVED",
      cohortSize,
      distribution: distributions.engagement,
      baseMs
    }),
    velocityDistributionPayload({
      workflowId,
      eventName: "USER_BREADTH_OBSERVED",
      cohortSize,
      distribution: distributions.breadth,
      baseMs
    })
  ];
  return {
    id: caseId,
    org_id: orgId,
    workflow_id: workflowId,
    expected: {
      velocity_index: expectedVelocityIndex,
      verdict: "SURFACE"
    },
    velocity_manifest: {
      source_contract: "docs/contracts/velocity-index.md",
      calibration_reference: "scio-prod-60d-2026-05",
      canonical_events: [
        "USER_FREQUENCY_OBSERVED",
        "USER_ENGAGEMENT_OBSERVED",
        "USER_BREADTH_OBSERVED"
      ],
      distribution_only: true,
      person_level_fields_included: false
    },
    velocity_distribution_payloads: payloads,
    events: []
  };
}

function velocityDistributionFromBaseline(dimension, factor = 1) {
  const p50 = VELOCITY_BASELINE[`${dimension}_p50`] * factor;
  const p99 = VELOCITY_BASELINE[`${dimension}_p99`] * factor;
  return {
    p10: Math.max(0, p50 * 0.25),
    p50,
    p90: p99,
    p99
  };
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
  const objectiveCaseCount = Math.max(30, caseCount);

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
      id: "dogfood_bq_surface_fixture",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-dogfood-bq-surface`,
      description: "Glean dogfood BigQuery adapter emits only aggregate V3 payloads for k-min eligible slices.",
      expected: {
        dogfood_bq: "SURFACE_FIXTURE",
        payload_schema_version: "FT_V3_2026_05",
        payloads_written: 3
      },
      dogfood_bq_manifest: {
        source_contract: "docs/integrations/glean/dogfood-bq-adapter.md",
        source_tables: [
          "scio-apps.scrubbed_llm_call.scrubbed_llm_call_*",
          "scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*",
          "scio-apps.scrubbed_workflows.scrubbed_workflows_*"
        ],
        aggregate_only: true,
        person_level_fields_included: false,
        uses_fixture_rows: true,
        exact_allowlist_pinned_in_code: true
      },
      events: []
    },
    {
      id: "dogfood_bq_suppress_sub_minimum_slice",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-dogfood-bq-suppress`,
      description: "Glean dogfood BigQuery adapter suppresses sub-5 slices before V3 emission.",
      expected: {
        dogfood_bq: "SUPPRESS_FIXTURE",
        suppression_reason: "INSUFFICIENT_VOLUME",
        emitted_payloads_for_slice: 0
      },
      dogfood_bq_manifest: {
        source_contract: "docs/integrations/glean/dogfood-bq-adapter.md",
        k_min: minCohortSize,
        aggregate_only: true,
        person_level_fields_included: false,
        suppress_forwards_nothing: true
      },
      events: []
    },
    {
      id: "dogfood_bq_refused_query_no_partition",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-dogfood-bq-refused-query`,
      description: "Glean dogfood BigQuery adapter refuses wildcard queries without a partition or shard suffix guard.",
      expected: {
        dogfood_bq: "REFUSED_QUERY",
        refused_reason: "MISSING_PARTITION_GUARD"
      },
      dogfood_bq_manifest: {
        source_contract: "docs/integrations/glean/dogfood-bq-adapter.md",
        partition_guard_required: true,
        max_bytes_scanned_gb: 100,
        read_only: true
      },
      invalid_payloads: [
        {
          query: "SELECT * FROM `scio-apps.scrubbed_llm_call.scrubbed_llm_call_*`"
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
    buildAivmCase({
      orgId,
      workflowPrefix,
      caseId: "aivm_acceleration_qualitative",
      runLabel,
      baseMs,
      count: caseCount,
      valueType: "ACCELERATION",
      evidenceGrade: "QUALITATIVE",
      factory: aivmAccelerationExecution,
      canonicalEvidence: ["FT_V1_LATENCY_OBSERVED", "FT_V1_ABANDONMENT_OBSERVED:false"]
    }),
    buildAivmCase({
      orgId,
      workflowPrefix,
      caseId: "aivm_acceleration_objective",
      runLabel,
      baseMs,
      count: objectiveCaseCount,
      valueType: "ACCELERATION",
      evidenceGrade: "OBJECTIVE",
      factory: aivmAccelerationExecution,
      canonicalEvidence: ["FT_V1_LATENCY_OBSERVED", "FT_V1_ABANDONMENT_OBSERVED:false"]
    }),
    buildAivmCase({
      orgId,
      workflowPrefix,
      caseId: "aivm_quality_premium_qualitative",
      runLabel,
      baseMs,
      count: caseCount,
      valueType: "QUALITY_PREMIUM",
      evidenceGrade: "QUALITATIVE",
      factory: aivmQualityPremiumExecution,
      canonicalEvidence: ["FT_V1_VERIFICATION_PRESENCE_OBSERVED:true", "FT_V1_RECOVERY_OBSERVED:true"]
    }),
    buildAivmCase({
      orgId,
      workflowPrefix,
      caseId: "aivm_quality_premium_objective",
      runLabel,
      baseMs,
      count: objectiveCaseCount,
      valueType: "QUALITY_PREMIUM",
      evidenceGrade: "OBJECTIVE",
      factory: aivmQualityPremiumExecution,
      canonicalEvidence: ["FT_V1_VERIFICATION_PRESENCE_OBSERVED:true", "FT_V1_RECOVERY_OBSERVED:true"]
    }),
    buildAivmCase({
      orgId,
      workflowPrefix,
      caseId: "aivm_unclassified_qualitative",
      runLabel,
      baseMs,
      count: caseCount,
      valueType: "UNCLASSIFIED",
      evidenceGrade: "QUALITATIVE",
      factory: aivmUnclassifiedExecution,
      canonicalEvidence: ["FT_V1_DISPOSITION_OBSERVED"]
    }),
    buildAivmCase({
      orgId,
      workflowPrefix,
      caseId: "aivm_unclassified_objective",
      runLabel,
      baseMs,
      count: objectiveCaseCount,
      valueType: "UNCLASSIFIED",
      evidenceGrade: "OBJECTIVE",
      factory: aivmUnclassifiedExecution,
      canonicalEvidence: ["FT_V1_DISPOSITION_OBSERVED"]
    }),
    buildReliabilityFactorCase({
      orgId,
      workflowPrefix,
      caseId: "reliability_factor_high_reliability_workflow",
      runLabel,
      baseMs,
      count: caseCount,
      factory: aivmQualityPremiumExecution,
      expected: {
        decision: "SURFACE",
        reliability_factor: 1,
        reliability_components: {
          abandonment_rate: 0,
          friction_loop_rate: 0,
          recovery_success_rate: 1,
          verification_presence_rate: 1
        }
      },
      canonicalEvidence: [
        "FT_V1_RECOVERY_OBSERVED",
        "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
        "FT_V1_ABANDONMENT_OBSERVED:false",
        "FT_V1_ITERATION_DEPTH_OBSERVED:below_friction_threshold"
      ],
      notes: "All disclosed executions include verification and successful recovery, with no abandonment or friction-loop evidence."
    }),
    buildReliabilityFactorCase({
      orgId,
      workflowPrefix,
      caseId: "reliability_factor_low_reliability_workflow",
      runLabel,
      baseMs,
      count: caseCount,
      factory: lowReliabilityExecution,
      expected: {
        decision: "SURFACE",
        reliability_factor: 0.25,
        reliability_components: {
          abandonment_rate: 1,
          friction_loop_rate: 0,
          recovery_success_rate: 0,
          verification_presence_rate: 0
        }
      },
      canonicalEvidence: [
        "FT_V1_ABANDONMENT_OBSERVED",
        "FT_V1_ITERATION_DEPTH_OBSERVED:friction_loop",
        "FT_V1_RECOVERY_OBSERVED:false",
        "FT_V1_VERIFICATION_PRESENCE_OBSERVED:false"
      ],
      notes: "All disclosed executions show abandonment without recovery success or verification, producing a low bounded Reliability Factor without changing disclosure."
    }),
    buildReliabilityFactorCase({
      orgId,
      workflowPrefix,
      caseId: "reliability_factor_suppressed_sparse_data_workflow",
      runLabel,
      baseMs,
      count: caseCount,
      factory: sparseReliabilityExecution,
      expected: {
        decision: "SUPPRESS",
        suppression: "sparse_data",
        reliability_factor: null,
        reliability_components: null
      },
      canonicalEvidence: [
        "FT_V1_ITERATION_DEPTH_OBSERVED:missing",
        "FT_V1_DISPOSITION_OBSERVED:missing",
        "FT_V1_VERIFICATION_PRESENCE_OBSERVED:missing",
        "FT_V1_RECOVERY_OBSERVED:missing",
        "FT_V1_ABANDONMENT_OBSERVED:missing"
      ],
      notes: "Sparse telemetry lacks enough behavioral classes to compute Reliability Factor, so expected verdict output keeps Reliability Factor fields null."
    }),
    {
      id: "outcome_evidence_surface_with_outcomes",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-outcome-surface`,
      expected: { outcome_verdict: "SURFACE", outcome_count: 1 },
      outcome_evidence_manifest: true,
      outcome_evidence: [
        outcomeEvidencePayload({
          workflowId: `${workflowPrefix}-outcome-surface`,
          baseMs,
          metric: "jira_cycle_time"
        })
      ],
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-outcome-surface`,
        caseId: "outcome-surface",
        count: caseCount,
        baseMs,
        runLabel,
        factory: calibratedExecution
      })
    },
    {
      id: "outcome_evidence_suppress_with_outcomes",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-outcome-suppress`,
      expected: { outcome_verdict: "SUPPRESS", outcome_count: 1 },
      outcome_evidence_manifest: true,
      outcome_evidence: [
        outcomeEvidencePayload({
          workflowId: `${workflowPrefix}-outcome-suppress`,
          baseMs,
          metric: "veeva_approval_time"
        })
      ],
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-outcome-suppress`,
        caseId: "outcome-suppress",
        count: Math.max(1, minCohortSize - 1),
        baseMs,
        runLabel,
        factory: blindExecution
      })
    },
    {
      id: "outcome_evidence_surface_no_outcomes",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-outcome-none`,
      expected: { outcome_verdict: "SURFACE", outcome_count: 0 },
      outcome_evidence_manifest: true,
      outcome_evidence: [],
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-outcome-none`,
        caseId: "outcome-none",
        count: caseCount,
        baseMs,
        runLabel,
        factory: calibratedExecution
      })
    },
    {
      id: "forwarded_distribution_surface_with_forwarding",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-forwarded-surface`,
      expected: {
        verdict: "SURFACE",
        forwarded_distribution: "PRESENT",
        value_type: "UNCLASSIFIED",
        quality_multiplier_value_type: "QUALITY_PREMIUM",
        quality_multiplier_evidence_grade: "CALIBRATED"
      },
      forwarded_distribution_manifest: {
        source_contract: "docs/integrations/value-realization/V3_INGEST.md",
        schema_version: "FT_V3_FORWARDED_DISTRIBUTION_2026_06",
        aggregate_only: true,
        person_level_fields_included: false,
        consumer_recheck_required: true
      },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-forwarded-surface`,
        caseId: "forwarded-surface",
        count: caseCount,
        baseMs,
        runLabel,
        factory: calibratedExecution
      })
    },
    {
      id: "forwarded_distribution_surface_without_forwarding_legacy",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-forwarded-legacy`,
      expected: {
        verdict: "SURFACE",
        forwarded_distribution: "ABSENT_LEGACY"
      },
      forwarded_distribution_manifest: {
        source_contract: "docs/contracts/evidence-bundle/v1/README.md",
        schema_version: null,
        aggregate_only: true,
        person_level_fields_included: false,
        consumer_recheck_required: false
      },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-forwarded-legacy`,
        caseId: "forwarded-legacy",
        count: caseCount,
        baseMs,
        runLabel,
        factory: calibratedExecution
      })
    },
    ...[
      "INSUFFICIENT_TIME",
      "INSUFFICIENT_VOLUME",
      "NO_CONVERGENCE",
      "BASELINE_UNSTABLE",
      "HIGH_AMBIGUITY"
    ].map((reason) => ({
      id: `forwarded_distribution_suppress_${reason.toLowerCase()}`,
      org_id: orgId,
      workflow_id: `${workflowPrefix}-forwarded-suppress-${reason.toLowerCase().replaceAll("_", "-")}`,
      expected: {
        verdict: "SUPPRESS",
        suppression_reason: reason,
        forwarded_distribution: "ABSENT"
      },
      forwarded_distribution_manifest: {
        source_contract: "docs/integrations/value-realization/V3_INGEST.md",
        schema_version: "FT_V3_FORWARDED_DISTRIBUTION_2026_06",
        aggregate_only: true,
        person_level_fields_included: false,
        suppress_forwards_nothing: true
      },
      events: buildExecutions({
        orgId,
        workflowId: `${workflowPrefix}-forwarded-suppress-${reason.toLowerCase().replaceAll("_", "-")}`,
        caseId: `forwarded-suppress-${reason.toLowerCase().replaceAll("_", "-")}`,
        count: reason === "INSUFFICIENT_VOLUME" ? Math.max(1, minCohortSize - 1) : caseCount,
        baseMs,
        runLabel,
        factory: reason === "NO_CONVERGENCE" ? blindExecution : calibratedExecution
      })
    })),
    buildVelocityCase({
      orgId,
      workflowPrefix,
      caseId: "velocity_saturated_calibration_cohort",
      baseMs,
      cohortSize: 1553,
      distributions: {
        frequency: velocityDistributionFromBaseline("frequency"),
        engagement: velocityDistributionFromBaseline("engagement"),
        breadth: velocityDistributionFromBaseline("breadth")
      },
      expectedVelocityIndex: 1
    }),
    buildVelocityCase({
      orgId,
      workflowPrefix,
      caseId: "velocity_customer_low",
      baseMs,
      cohortSize: 30,
      distributions: {
        frequency: velocityDistributionFromBaseline("frequency", 0.4),
        engagement: velocityDistributionFromBaseline("engagement", 0.4),
        breadth: velocityDistributionFromBaseline("breadth", 0.4)
      },
      expectedVelocityIndex: 0.4
    }),
    buildVelocityCase({
      orgId,
      workflowPrefix,
      caseId: "velocity_customer_above_calibration",
      baseMs,
      cohortSize: 30,
      distributions: {
        frequency: velocityDistributionFromBaseline("frequency", 1.1),
        engagement: velocityDistributionFromBaseline("engagement", 1.1),
        breadth: velocityDistributionFromBaseline("breadth", 1.1)
      },
      expectedVelocityIndex: 1.1
    }),
    {
      id: "operator_time_series_governed_references",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-operator-time-series`,
      operator_time_series_manifest: {
        source_contract:
          "docs/contracts/ai-value-operator-time-series-run/README.md",
        aggregate_only: true,
        metadata_only_run_references: true,
        required_milestone_days: [0, 30, 60, 90, 180, 365],
        rolling_30_day_context_only: true,
        child_operator_runs_revalidated: true,
        source_reference_reconciliation_required: true,
        confidence_model_feed: false,
        finance_context_investigation_feed: false,
        customer_facing_financial_output: false,
        person_level_fields_included: false
      },
      expected: {
        operator_time_series: "CONTRACT_ONLY",
        confidence_model_feed: false,
        finance_context_investigation_feed: false,
        customer_facing_financial_output: false
      },
      events: []
    },
    {
      id: "operator_workflow_internal_review",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-operator-workflow`,
      operator_workflow_manifest: {
        source_contract:
          "docs/contracts/ai-value-operator-workflow/README.md",
        aggregate_only: true,
        internal_operator_review_only: true,
        child_objects_revalidated: true,
        source_review_status_required: true,
        measurement_cell_status_required: true,
        time_series_status_required: true,
        packet_preparation_status_required: true,
        emits_missing_evidence: true,
        emits_review_queue: true,
        confidence_model_feed: false,
        finance_context_investigation_feed: false,
        customer_facing_financial_output: false,
        person_level_fields_included: false,
        creates_backend_routes: false,
        creates_frontend_ui: false,
        persists_source_data: false
      },
      expected: {
        operator_workflow: "CONTRACT_ONLY",
        confidence_model_feed: false,
        finance_context_investigation_feed: false,
        customer_facing_financial_output: false
      },
      events: []
    },
    {
      id: "operator_evidence_package_runner",
      org_id: orgId,
      workflow_id: `${workflowPrefix}-operator-evidence-package`,
      operator_evidence_package_manifest: {
        source_contract:
          "docs/contracts/ai-value-operator-evidence-package-runner/README.md",
        aggregate_only: true,
        internal_operator_review_only: true,
        composes_operator_intake_runs: true,
        composes_operator_time_series_run: true,
        composes_operator_workflow: true,
        child_objects_revalidated: true,
        stale_validation_rejected: true,
        required_milestone_days: [0, 30, 60, 90, 180, 365],
        rolling_30_day_context_only: true,
        assumptions_cannot_substitute_for_evidence: true,
        confidence_model_feed: false,
        finance_context_investigation_feed: false,
        customer_facing_financial_output: false,
        person_level_fields_included: false,
        creates_backend_routes: false,
        creates_frontend_ui: false,
        persists_source_data: false
      },
      expected: {
        operator_evidence_package: "CONTRACT_ONLY",
        confidence_model_feed: false,
        finance_context_investigation_feed: false,
        customer_facing_financial_output: false
      },
      events: []
    },
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
