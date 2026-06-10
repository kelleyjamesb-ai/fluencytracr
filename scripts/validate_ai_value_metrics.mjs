#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_METRICS_VALIDATION_2026_06";

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const ALLOWED_METRIC_PRIORITIES = new Set(["P0", "P1", "P2"]);

const ALLOWED_CLAIM_LEVELS = new Set([
  "CAVEATED_VALUE_INVESTIGATION",
  "SOURCE_READINESS_ONLY",
  "INTERNAL_ONLY",
  "BLOCKED"
]);

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement"
];

const FORBIDDEN_SOURCE_METADATA_PATTERNS = [
  /employee/i,
  /\buser(?:_id|_email)?\b/i,
  /email/i,
  /person/i,
  /raw/i,
  /ticket_text/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /hris/i
];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: null
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
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/validate_ai_value_metrics.mjs [--input path] [--output path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function requireField(value, path, gaps) {
  if (!value) {
    gaps.push(`${path} is missing`);
  }
}

function containsForbiddenSourceMetadata(value) {
  return FORBIDDEN_SOURCE_METADATA_PATTERNS.some((pattern) =>
    pattern.test(String(value ?? ""))
  );
}

function collectTopLevelGaps(library) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "library_id",
    "workflow_family",
    "metrics"
  ]) {
    requireField(library?.[field], field, gaps);
  }
  if (library?.schema_version &&
      library.schema_version !== "FT_AI_VALUE_METRICS_LIBRARY_2026_06") {
    gaps.push(`schema_version is invalid: ${library.schema_version}`);
  }
  if (library?.metrics && !Array.isArray(library.metrics)) {
    gaps.push("metrics must be an array");
  }
  if (Array.isArray(library?.metrics) && library.metrics.length === 0) {
    gaps.push("metrics must include at least one metric");
  }
  return gaps;
}

function collectMetricFieldGaps(metric, index) {
  const gaps = [];
  const prefix = `metrics[${index}]`;

  for (const field of [
    "metric_id",
    "name",
    "definition",
    "value_route",
    "metric_priority",
    "source_system",
    "measurement_unit",
    "baseline_rule",
    "comparison_rule",
    "owner",
    "allowed_claim_level",
    "blocked_claims"
  ]) {
    requireField(metric?.[field], `${prefix}.${field}`, gaps);
  }

  if (metric?.value_route && !ALLOWED_VALUE_ROUTES.has(metric.value_route)) {
    gaps.push(`${prefix}.value_route is invalid: ${metric.value_route}`);
  }
  if (metric?.metric_priority &&
      !ALLOWED_METRIC_PRIORITIES.has(metric.metric_priority)) {
    gaps.push(`${prefix}.metric_priority is invalid: ${metric.metric_priority}`);
  }
  if (metric?.allowed_claim_level &&
      !ALLOWED_CLAIM_LEVELS.has(metric.allowed_claim_level)) {
    gaps.push(`${prefix}.allowed_claim_level is invalid: ${metric.allowed_claim_level}`);
  }

  const source = metric?.source_system ?? {};
  requireField(source.source_type, `${prefix}.source_system.source_type`, gaps);
  requireField(source.source_name, `${prefix}.source_system.source_name`, gaps);
  requireField(source.approved_grain, `${prefix}.source_system.approved_grain`, gaps);
  if (
    [
      source.source_type,
      source.source_name,
      source.approved_grain
    ].some((value) => containsForbiddenSourceMetadata(value))
  ) {
    gaps.push(`${prefix}.source_system contains forbidden identifier metadata`);
  }

  const blockedClaims = new Set(metric?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!blockedClaims.has(claim)) {
      gaps.push(`${prefix}.blocked_claims missing ${claim}`);
    }
  }

  return gaps;
}

function uniqueRoutesFromBlueprint(blueprint) {
  return [
    blueprint?.value_routes?.primary,
    ...(blueprint?.value_routes?.secondary ?? [])
  ].filter((route, index, routes) => route && routes.indexOf(route) === index);
}

export function validateAiValueMetricsLibrary(library) {
  const metricGaps = Array.isArray(library?.metrics)
    ? library.metrics.flatMap((metric, index) => collectMetricFieldGaps(metric, index))
    : [];
  const gaps = [
    ...collectTopLevelGaps(library),
    ...metricGaps
  ];

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    library_id: library?.library_id ?? null,
    workflow_family: library?.workflow_family ?? null,
    valid: gaps.length === 0,
    metric_count: Array.isArray(library?.metrics) ? library.metrics.length : 0,
    gaps,
    feeds: {
      blueprint_metrics_mapping: gaps.length === 0
    }
  };
}

export function recommendMetricsForBlueprint(blueprint, library) {
  const validation = validateAiValueMetricsLibrary(library);
  const valueRoutes = uniqueRoutesFromBlueprint(blueprint);
  const workflowFamily = blueprint?.workflow_family ?? null;
  const recommendedMetrics = validation.valid
    ? library.metrics.filter(
      (metric) =>
        (metric.workflow_family ?? library.workflow_family) === workflowFamily &&
        valueRoutes.includes(metric.value_route) &&
        metric.allowed_claim_level !== "BLOCKED"
    )
    : [];

  return {
    schema_version: "FT_AI_VALUE_METRIC_RECOMMENDATION_2026_06",
    blueprint_id: blueprint?.blueprint_id ?? null,
    library_id: library?.library_id ?? null,
    workflow_family: workflowFamily,
    value_routes: valueRoutes,
    decision:
      validation.valid && recommendedMetrics.length > 0
        ? "READY_FOR_METRICS_MAPPING"
        : "HOLD_FOR_METRIC_MAPPING",
    recommended_metrics: recommendedMetrics.map((metric) => ({
      metric_id: metric.metric_id,
      name: metric.name,
      value_route: metric.value_route,
      metric_priority: metric.metric_priority,
      source_system: metric.source_system,
      measurement_unit: metric.measurement_unit,
      allowed_claim_level: metric.allowed_claim_level
    })),
    gaps: validation.valid ? [] : validation.gaps,
    feeds: {
      metrics_mapping: validation.valid && recommendedMetrics.length > 0
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const library = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueMetricsLibrary(library);
  const json = `${JSON.stringify(result, null, 2)}\n`;

  if (args.output) {
    writeFileSync(resolve(process.cwd(), args.output), json, "utf8");
    console.log(`Wrote ${args.output}`);
    return;
  }

  process.stdout.write(json);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
