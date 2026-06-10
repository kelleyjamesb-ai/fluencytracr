#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAiValueBlueprint } from "./validate_ai_value_blueprint.mjs";
import { recommendMetricsForBlueprint } from "./validate_ai_value_metrics.mjs";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_SCENARIO_VALIDATION_2026_06";

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const ALLOWED_CLAIM_STATES = new Set([
  "CAVEATED_VALUE_INVESTIGATION",
  "SOURCE_READINESS_ONLY",
  "INTERNAL_ONLY",
  "BLOCKED"
]);

const ALLOWED_OUTPUT_UNITS = new Set([
  "hours",
  "cases",
  "share",
  "score",
  "rate",
  "count",
  "directional_index"
]);

const REQUIRED_SCENARIO_BANDS = ["CONSERVATIVE", "BASE_CASE", "EXPANDED"];

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "realized_roi_calculation",
  "customer_facing_economic_output"
];

const GOVERNANCE_BOUNDARIES = [
  "requires_connector",
  "requires_dashboard",
  "requires_realized_roi_calculation",
  "requires_causality_claim",
  "requires_individual_scoring",
  "requires_hr_analytics",
  "requires_runtime_service",
  "customer_facing_economic_output"
];

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /manager/i,
  /ticket_text/i,
  /sample_ticket_text/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /person_level/i,
  /raw_/i,
  /hris/i,
  /realized_roi/i,
  /roi_calculation/i,
  /dollar/i,
  /currency/i,
  /cost_savings/i,
  /productivity/i,
  /causal/i
];

const FORBIDDEN_CLAIM_PATTERNS = [
  /prov(?:ed|es) ROI/i,
  /caused productivity/i,
  /caused .*lift/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
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
        "Usage: node scripts/validate_ai_value_scenario.mjs [--input path] [--output path]"
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

function isForbiddenKey(key) {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value, fields = new Set()) {
  if (!value || typeof value !== "object") {
    return fields;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectForbiddenFields(item, fields);
    }
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "governance_boundaries") {
      continue;
    }
    if (isForbiddenKey(key)) {
      fields.add(key);
    }
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function containsForbiddenClaimLanguage(claims) {
  return (claims ?? []).some((claim) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(claim)))
  );
}

function collectTopLevelGaps(scenario) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "scenario_id",
    "source",
    "input",
    "output",
    "blocked_claims",
    "governance_boundaries"
  ]) {
    requireField(scenario?.[field], field, gaps);
  }
  if (scenario?.schema_version &&
      scenario.schema_version !== "FT_AI_VALUE_SCENARIO_2026_06") {
    gaps.push(`schema_version is invalid: ${scenario.schema_version}`);
  }
  return gaps;
}

function collectInputGaps(scenario) {
  const gaps = [];
  const input = scenario?.input ?? {};

  requireField(input.workflow_family, "input.workflow_family", gaps);
  requireField(input.value_route, "input.value_route", gaps);
  if (input.value_route && !ALLOWED_VALUE_ROUTES.has(input.value_route)) {
    gaps.push(`input.value_route is invalid: ${input.value_route}`);
  }

  if (!Array.isArray(input.metric_references) ||
      input.metric_references.length === 0) {
    gaps.push("input.metric_references must include at least one metric");
  } else {
    input.metric_references.forEach((metric, index) => {
      requireField(metric.metric_id, `input.metric_references[${index}].metric_id`, gaps);
      requireField(
        metric.measurement_unit,
        `input.metric_references[${index}].measurement_unit`,
        gaps
      );
      if (metric.allowed_claim_level &&
          !ALLOWED_CLAIM_STATES.has(metric.allowed_claim_level)) {
        gaps.push(
          `input.metric_references[${index}].allowed_claim_level is invalid: ${metric.allowed_claim_level}`
        );
      }
    });
  }

  if (!Array.isArray(input.customer_owned_assumptions) ||
      input.customer_owned_assumptions.length === 0) {
    gaps.push("input.customer_owned_assumptions must include at least one assumption");
  } else {
    input.customer_owned_assumptions.forEach((assumption, index) => {
      requireField(
        assumption.assumption_id,
        `input.customer_owned_assumptions[${index}].assumption_id`,
        gaps
      );
      requireField(
        assumption.owner,
        `input.customer_owned_assumptions[${index}].owner`,
        gaps
      );
      requireField(
        assumption.state,
        `input.customer_owned_assumptions[${index}].state`,
        gaps
      );
    });
  }

  if (!Array.isArray(input.scenario_bands) ||
      input.scenario_bands.length === 0) {
    gaps.push("input.scenario_bands must include governed scenario bands");
  } else {
    const bands = new Set(input.scenario_bands.map((band) => band.band));
    for (const band of REQUIRED_SCENARIO_BANDS) {
      if (!bands.has(band)) {
        gaps.push(`input.scenario_bands missing ${band}`);
      }
    }
    input.scenario_bands.forEach((band, index) => {
      requireField(band.band, `input.scenario_bands[${index}].band`, gaps);
      requireField(
        band.interpretation,
        `input.scenario_bands[${index}].interpretation`,
        gaps
      );
      if (!Array.isArray(band.included_metric_ids) ||
          band.included_metric_ids.length === 0) {
        gaps.push(
          `input.scenario_bands[${index}].included_metric_ids must include at least one metric`
        );
      }
    });
  }

  if (!Array.isArray(input.output_units) || input.output_units.length === 0) {
    gaps.push("input.output_units must include at least one unit");
  } else {
    for (const unit of input.output_units) {
      if (!ALLOWED_OUTPUT_UNITS.has(unit)) {
        gaps.push(`input.output_units contains invalid unit: ${unit}`);
      }
    }
  }

  return gaps;
}

function collectOutputGaps(scenario) {
  const gaps = [];
  const output = scenario?.output ?? {};
  requireField(output.claim_state, "output.claim_state", gaps);
  if (output.claim_state && !ALLOWED_CLAIM_STATES.has(output.claim_state)) {
    gaps.push(`output.claim_state is invalid: ${output.claim_state}`);
  }
  requireField(output.scenario_summary, "output.scenario_summary", gaps);
  if (!Array.isArray(output.required_caveats) ||
      output.required_caveats.length === 0) {
    gaps.push("output.required_caveats must include at least one caveat");
  }
  if (!Array.isArray(output.safe_claims)) {
    gaps.push("output.safe_claims must be an array");
  } else if (containsForbiddenClaimLanguage(output.safe_claims)) {
    gaps.push("output.safe_claims contains forbidden claim language");
  }
  return gaps;
}

function collectBlockedClaimGaps(scenario) {
  const gaps = [];
  const claims = new Set(scenario?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!claims.has(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  return gaps;
}

function collectGovernanceGaps(scenario) {
  const gaps = [];
  for (const field of [...collectForbiddenFields(scenario)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const boundaries = scenario?.governance_boundaries ?? {};
  for (const boundary of GOVERNANCE_BOUNDARIES) {
    if (boundaries[boundary] === true) {
      gaps.push(`governance_boundaries.${boundary} is true`);
    }
  }
  return gaps;
}

function uniqueValues(values) {
  return values.filter(
    (value, index, allValues) => value && allValues.indexOf(value) === index
  );
}

function metricReferencesForPrimaryRoute(recommendation, primaryRoute) {
  return recommendation.recommended_metrics
    .filter((metric) => metric.value_route === primaryRoute)
    .map((metric) => ({
      metric_id: metric.metric_id,
      name: metric.name,
      value_route: metric.value_route,
      measurement_unit: metric.measurement_unit,
      source_system: metric.source_system,
      allowed_claim_level: metric.allowed_claim_level
    }));
}

function buildScenarioBands(metricReferences) {
  const metricIds = metricReferences.map((metric) => metric.metric_id);
  const firstMetricId = metricIds[0];
  return [
    {
      band: "CONSERVATIVE",
      interpretation:
        "Directional scenario using the narrowest customer-owned assumption set.",
      included_metric_ids: firstMetricId ? [firstMetricId] : []
    },
    {
      band: "BASE_CASE",
      interpretation:
        "Directional scenario using all recommended metrics for the primary value route.",
      included_metric_ids: metricIds
    },
    {
      band: "EXPANDED",
      interpretation:
        "Directional scenario for later customer-owned validation after assumptions are reviewed.",
      included_metric_ids: metricIds
    }
  ];
}

export function validateAiValueScenario(scenario) {
  const gaps = [
    ...collectTopLevelGaps(scenario),
    ...collectInputGaps(scenario),
    ...collectOutputGaps(scenario),
    ...collectBlockedClaimGaps(scenario),
    ...collectGovernanceGaps(scenario)
  ];

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    scenario_id: scenario?.scenario_id ?? null,
    workflow_family: scenario?.input?.workflow_family ?? null,
    value_route: scenario?.input?.value_route ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      executive_validation: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

export function buildValueScenarioDraftFromBlueprintAndMetrics(
  blueprint,
  metricsLibrary
) {
  const blueprintValidation = validateAiValueBlueprint(blueprint);
  const recommendation = recommendMetricsForBlueprint(blueprint, metricsLibrary);
  const primaryRoute = blueprint?.value_routes?.primary ?? "UNCLASSIFIED";
  const metricReferences = metricReferencesForPrimaryRoute(
    recommendation,
    primaryRoute
  );
  const outputUnits = uniqueValues(
    metricReferences.map((metric) => metric.measurement_unit)
  );
  const workflowFamily = blueprint?.workflow_family ?? null;

  return {
    schema_version: "FT_AI_VALUE_SCENARIO_2026_06",
    scenario_id: `scenario_${workflowFamily ?? "unknown"}_${primaryRoute.toLowerCase()}_draft`,
    source: {
      blueprint_id: blueprint?.blueprint_id ?? null,
      metrics_library_id: metricsLibrary?.library_id ?? null,
      metric_recommendation_decision: recommendation.decision,
      blueprint_valid: blueprintValidation.valid
    },
    input: {
      workflow_family: workflowFamily,
      value_route: primaryRoute,
      metric_references: metricReferences,
      customer_owned_assumptions: (blueprint?.assumption_ledger ?? []).map(
        (assumption) => ({
          assumption_id: assumption.assumption_id,
          state: assumption.state,
          owner: assumption.owner,
          source: "blueprint_assumption_ledger"
        })
      ),
      scenario_bands: buildScenarioBands(metricReferences),
      output_units: outputUnits
    },
    output: {
      claim_state:
        blueprintValidation.valid && recommendation.feeds.metrics_mapping
          ? "CAVEATED_VALUE_INVESTIGATION"
          : "BLOCKED",
      scenario_summary:
        "Governed value scenario draft for customer-owned validation of aggregate workflow metrics.",
      required_caveats: [
        "Scenario bands are planning ranges, not realized ROI.",
        "Metric movement cannot be attributed to AI without separate customer-owned validation.",
        "This scenario is local and pre-readout; it does not create customer-facing economic output."
      ],
      safe_claims: [
        "Aggregate metrics can support a caveated value investigation when assumptions are reviewed."
      ]
    },
    blocked_claims: REQUIRED_BLOCKED_CLAIMS,
    governance_boundaries: {
      requires_connector: false,
      requires_dashboard: false,
      requires_realized_roi_calculation: false,
      requires_causality_claim: false,
      requires_individual_scoring: false,
      requires_hr_analytics: false,
      requires_runtime_service: false,
      customer_facing_economic_output: false
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const scenario = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueScenario(scenario);
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
