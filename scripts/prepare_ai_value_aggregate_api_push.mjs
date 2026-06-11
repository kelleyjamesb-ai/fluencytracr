#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-aggregate-api-push-package.json";

const FORBIDDEN_FIELD_NAMES = new Set([
  "action_row",
  "action_rows",
  "actor_id",
  "display_name",
  "email",
  "email_address",
  "employee_id",
  "full_name",
  "output",
  "person_id",
  "prompt",
  "raw_output",
  "raw_prompt",
  "raw_response",
  "raw_row",
  "raw_rows",
  "skill_name",
  "transcript",
  "user_id",
  "user_name",
  "username"
]);

const REQUIRED_FALSE_BOUNDARY_FLAGS = [
  "raw_source_rows_included",
  "direct_identifiers_included",
  "raw_prompts_outputs_transcripts_included",
  "raw_skill_action_rows_included"
];

const REQUIRED_FALSE_BLOCKED_OUTPUTS = [
  "customer_facing_economic_output",
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "hr_analytics",
  "ranking",
  "autonomous_customer_action"
];

const isObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const addRequiredStringGap = (gaps, input, field) => {
  if (typeof input?.[field] !== "string" || input[field].trim().length === 0) {
    gaps.push(`${field} is missing`);
  }
};

const dateIsValid = (value) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const normalizeForbiddenPath = (parts) => {
  const sourceAttestationIndex = parts.lastIndexOf("source_attestation");
  if (sourceAttestationIndex >= 0) {
    return parts.slice(sourceAttestationIndex).join(".");
  }
  return parts.join(".");
};

const findForbiddenFields = (value, gaps, path = []) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findForbiddenFields(entry, gaps, [...path, String(index)]));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (FORBIDDEN_FIELD_NAMES.has(key.toLowerCase())) {
      gaps.push(`forbidden field ${normalizeForbiddenPath(nextPath)} is not allowed`);
    }
    findForbiddenFields(nested, gaps, nextPath);
  }
};

const validateDistribution = (gaps, distribution, field) => {
  if (!isObject(distribution)) {
    gaps.push(`${field} is missing`);
    return;
  }
  for (const percentile of ["p10", "p50", "p90", "p99"]) {
    if (typeof distribution[percentile] !== "number" || distribution[percentile] < 0) {
      gaps.push(`${field}.${percentile} must be a nonnegative number`);
    }
  }
  if (
    typeof distribution.p10 === "number" &&
    typeof distribution.p50 === "number" &&
    typeof distribution.p90 === "number" &&
    typeof distribution.p99 === "number" &&
    !(distribution.p10 <= distribution.p50 &&
      distribution.p50 <= distribution.p90 &&
      distribution.p90 <= distribution.p99)
  ) {
    gaps.push(`${field} percentiles must be ordered p10 <= p50 <= p90 <= p99`);
  }
};

const validateRate = (gaps, value, field) => {
  if (typeof value !== "number" || value < 0 || value > 1) {
    gaps.push(`${field} must be between 0 and 1`);
  }
};

export function validateAggregateApiPushPackage(input) {
  const gaps = [];
  if (!isObject(input)) {
    return { valid: false, gaps: ["aggregate API push package must be an object"] };
  }

  if (input.schema_version !== "FT_AI_VALUE_AGGREGATE_API_PUSH_2026_06") {
    gaps.push("schema_version must be FT_AI_VALUE_AGGREGATE_API_PUSH_2026_06");
  }
  for (const field of [
    "package_id",
    "org_id",
    "blueprint_id",
    "metrics_library_id",
    "cohort_id",
    "workflow_id",
    "outcome_workflow_id",
    "calibration_id"
  ]) {
    addRequiredStringGap(gaps, input, field);
  }

  if (!isObject(input.source_boundary)) {
    gaps.push("source_boundary is missing");
  } else {
    for (const field of REQUIRED_FALSE_BOUNDARY_FLAGS) {
      if (input.source_boundary[field] !== false) {
        gaps.push(`source_boundary.${field} must be false`);
      }
    }
  }

  if (!isObject(input.blocked_outputs)) {
    gaps.push("blocked_outputs is missing");
  } else {
    for (const field of REQUIRED_FALSE_BLOCKED_OUTPUTS) {
      if (input.blocked_outputs[field] !== false) {
        gaps.push(`blocked_outputs.${field} must be false`);
      }
    }
  }

  const aggregate = input.ai_work_aggregate;
  if (!isObject(aggregate)) {
    gaps.push("ai_work_aggregate is missing");
  } else {
    if (!dateIsValid(aggregate.window_start)) {
      gaps.push("ai_work_aggregate.window_start must be ISO8601");
    }
    if (!dateIsValid(aggregate.window_end)) {
      gaps.push("ai_work_aggregate.window_end must be ISO8601");
    }
    if (
      dateIsValid(aggregate.window_start) &&
      dateIsValid(aggregate.window_end) &&
      Date.parse(aggregate.window_end) <= Date.parse(aggregate.window_start)
    ) {
      gaps.push("ai_work_aggregate.window_end must be after window_start");
    }
    if (!Number.isInteger(aggregate.cohort_size) || aggregate.cohort_size < 1) {
      gaps.push("ai_work_aggregate.cohort_size must be a positive integer");
    }
    if (aggregate.ambiguity_rate !== undefined) {
      validateRate(gaps, aggregate.ambiguity_rate, "ai_work_aggregate.ambiguity_rate");
    }
    validateDistribution(gaps, aggregate.velocity?.frequency, "ai_work_aggregate.velocity.frequency");
    validateDistribution(gaps, aggregate.velocity?.engagement, "ai_work_aggregate.velocity.engagement");
    validateDistribution(gaps, aggregate.velocity?.breadth, "ai_work_aggregate.velocity.breadth");
    for (const field of [
      "completion_rate",
      "error_rate",
      "abandonment_rate",
      "recovery_rate",
      "verification_rate"
    ]) {
      validateRate(gaps, aggregate.quality_signals?.[field], `ai_work_aggregate.quality_signals.${field}`);
    }
    for (const field of ["p50_latency_ms", "p95_latency_ms"]) {
      if (!Number.isInteger(aggregate.quality_signals?.[field]) || aggregate.quality_signals[field] < 0) {
        gaps.push(`ai_work_aggregate.quality_signals.${field} must be a nonnegative integer`);
      }
    }
  }

  if (!Array.isArray(input.outcome_evidence) || input.outcome_evidence.length < 2) {
    gaps.push("outcome_evidence must include baseline and comparison aggregate records");
  } else {
    const roles = new Set();
    input.outcome_evidence.forEach((record, index) => {
      const prefix = `outcome_evidence[${index}]`;
      if (!isObject(record)) {
        gaps.push(`${prefix} must be an object`);
        return;
      }
      roles.add(record.window_role);
      for (const field of [
        "workflow_id",
        "outcome_metric",
        "outcome_unit",
        "period_start",
        "period_end",
        "source_system"
      ]) {
        addRequiredStringGap(gaps, record, `${field}`);
      }
      if (!["baseline", "comparison"].includes(record.window_role)) {
        gaps.push(`${prefix}.window_role must be baseline or comparison`);
      }
      if (typeof record.aggregate_value !== "number" || !Number.isFinite(record.aggregate_value)) {
        gaps.push(`${prefix}.aggregate_value must be finite`);
      }
      if (!Number.isInteger(record.cohort_size) || record.cohort_size < 5) {
        gaps.push(`${prefix}.cohort_size must be an aggregate cohort of at least 5`);
      }
      if (dateIsValid(record.period_start) && dateIsValid(record.period_end)) {
        if (Date.parse(record.period_end) <= Date.parse(record.period_start)) {
          gaps.push(`${prefix}.period_end must be after period_start`);
        }
      } else {
        gaps.push(`${prefix}.period_start and period_end must be ISO8601`);
      }
    });
    if (!roles.has("baseline")) gaps.push("outcome_evidence baseline record is missing");
    if (!roles.has("comparison")) gaps.push("outcome_evidence comparison record is missing");
  }

  findForbiddenFields(input, gaps);
  return { valid: gaps.length === 0, gaps: [...new Set(gaps)] };
}

const withoutUndefined = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

const outcomePayload = (record) =>
  withoutUndefined({
    workflow_id: record.workflow_id,
    outcome_metric: record.outcome_metric,
    outcome_unit: record.outcome_unit,
    period_start: record.period_start,
    period_end: record.period_end,
    aggregate_value: record.aggregate_value,
    cohort_size: record.cohort_size,
    source_system: record.source_system,
    jbtd_id: record.jbtd_id ?? undefined,
    persona_id: record.persona_id ?? undefined,
    aggregate_kind: record.aggregate_kind ?? undefined,
    source_attestation: record.source_attestation ?? undefined
  });

export function buildAggregateApiPushPlan(input) {
  const validation = validateAggregateApiPushPackage(input);
  if (!validation.valid) {
    return {
      valid: false,
      gaps: validation.gaps,
      customer_facing_economic_output: false,
      api_push_sequence: [],
      v3_aggregate_ingest: null,
      outcome_evidence: [],
      materializer_request: null
    };
  }

  const v3Aggregate = withoutUndefined({
    schema_version: "FT_V3_2026_05",
    cohort_id: input.cohort_id,
    workflow_id: input.workflow_id,
    jbtd_id: input.jbtd_id ?? undefined,
    persona_id: input.persona_id ?? undefined,
    window_start: input.ai_work_aggregate.window_start,
    window_end: input.ai_work_aggregate.window_end,
    cohort_size: input.ai_work_aggregate.cohort_size,
    ambiguity_rate: input.ai_work_aggregate.ambiguity_rate,
    calibration_id: input.calibration_id,
    velocity: input.ai_work_aggregate.velocity,
    quality_signals: input.ai_work_aggregate.quality_signals,
    privacy: {
      person_level_fields_included: false
    }
  });
  const outcomeEvidence = input.outcome_evidence.map(outcomePayload);
  const materializerRequest = {
    blueprint_id: input.blueprint_id,
    metrics_library_id: input.metrics_library_id,
    cohort_id: input.cohort_id,
    workflow_id: input.workflow_id,
    outcome_workflow_id: input.outcome_workflow_id
  };

  return {
    valid: true,
    gaps: [],
    package_id: input.package_id,
    org_id: input.org_id,
    customer_facing_economic_output: false,
    v3_aggregate_ingest: v3Aggregate,
    outcome_evidence: outcomeEvidence,
    materializer_request: materializerRequest,
    api_push_sequence: [
      {
        method: "POST",
        endpoint: "/api/v3/ingest/aggregate",
        body: v3Aggregate
      },
      ...outcomeEvidence.map((body) => ({
        method: "POST",
        endpoint: "/api/v1/outcome-evidence",
        body
      })),
      {
        method: "POST",
        endpoint: "/api/v1/ai-value/materialize/real-evidence",
        body: materializerRequest
      }
    ]
  };
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: null,
    outputDir: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output-dir") {
      args.outputDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/prepare_ai_value_aggregate_api_push.mjs [--input path] [--output path] [--output-dir dir]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

const writeJson = (path, payload) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const input = JSON.parse(readFileSync(inputPath, "utf8"));
  const plan = buildAggregateApiPushPlan(input);

  if (args.outputDir && plan.valid) {
    const out = resolve(process.cwd(), args.outputDir);
    writeJson(`${out}/v3-aggregate-ingest-request.json`, plan.v3_aggregate_ingest);
    plan.outcome_evidence.forEach((payload, index) => {
      const role = input.outcome_evidence[index].window_role;
      writeJson(`${out}/outcome-evidence-api-push-${role}.json`, payload);
    });
    writeJson(`${out}/real-evidence-materializer-request.json`, plan.materializer_request);
  }

  if (args.output) {
    writeJson(resolve(process.cwd(), args.output), plan);
    return;
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  if (!plan.valid) {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
