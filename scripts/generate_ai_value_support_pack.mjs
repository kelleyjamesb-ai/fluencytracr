#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-seeded-input.json";
const DEFAULT_OUTPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-pack.json";
const DEFAULT_MARKDOWN =
  "docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-pack.md";

const SCHEMA_VERSION = "FT_AI_VALUE_SUPPORT_PACK_2026_06";
const ALLOWED_SUPPRESSION_REASONS = new Set([
  "INSUFFICIENT_TIME",
  "INSUFFICIENT_VOLUME",
  "NO_CONVERGENCE",
  "BASELINE_UNSTABLE",
  "HIGH_AMBIGUITY"
]);

const ALLOWED_AI_WORK_VERDICTS = new Set(["SURFACE", "SUPPRESS"]);

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /manager_chain/i,
  /ticket_text/i,
  /sample_ticket_text/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /person_level/i,
  /raw_/i
];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    markdown: DEFAULT_MARKDOWN,
    stdout: false
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
    if (arg === "--markdown") {
      args.markdown = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--stdout") {
      args.stdout = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_ai_value_support_pack.mjs [--input path] [--output path] [--markdown path] [--stdout]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
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
    if (isForbiddenKey(key)) {
      fields.add(key);
    }
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

export function validateSupportValueInput(input) {
  const errors = [];
  const forbiddenFields = [...collectForbiddenFields(input)].sort();
  for (const field of forbiddenFields) {
    errors.push(`Forbidden field detected: ${field}`);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    errors.push("Input must be an object");
  }
  if (!input?.org_id) {
    errors.push("Missing required field: org_id");
  }
  if (!input?.window_id) {
    errors.push("Missing required field: window_id");
  }
  if (!input?.workflow_family) {
    errors.push("Missing required field: workflow_family");
  }
  if (!input?.ai_work_evidence?.verdict) {
    errors.push("Missing required field: ai_work_evidence.verdict");
  } else if (!ALLOWED_AI_WORK_VERDICTS.has(input.ai_work_evidence.verdict)) {
    errors.push(`Invalid ai_work_evidence.verdict: ${input.ai_work_evidence.verdict}`);
  }
  if (input?.ai_work_evidence?.verdict === "SURFACE") {
    if (Number(input.ai_work_evidence.cohort_size ?? 0) < 5) {
      errors.push("ai_work_evidence.cohort_size must be at least 5 before SURFACE");
    }
    if (Number(input.ai_work_evidence.window_days ?? 0) < 60) {
      errors.push("ai_work_evidence.window_days must be at least 60 before SURFACE");
    }
  }
  if (
    input?.ai_work_evidence?.suppression_reason &&
    !ALLOWED_SUPPRESSION_REASONS.has(input.ai_work_evidence.suppression_reason)
  ) {
    errors.push(
      `Invalid suppression reason: ${input.ai_work_evidence.suppression_reason}`
    );
  }

  return { valid: errors.length === 0, errors };
}

function metricDelta(metric) {
  if (!metric || typeof metric.baseline !== "number" || typeof metric.comparison !== "number") {
    return null;
  }
  return {
    baseline: metric.baseline,
    comparison: metric.comparison,
    delta: Number((metric.baseline - metric.comparison).toFixed(4)),
    unit: metric.unit
  };
}

function buildOutcomeSignals(outcomeEvidence) {
  const metrics = outcomeEvidence?.metrics ?? {};
  return [
    {
      signal_id: "median_resolution_hours",
      value_route: "COST_REDUCTION",
      formula_family: "cycle_time_delta",
      result: metricDelta(metrics.median_resolution_hours),
      interpretation:
        "Tests whether aggregate support case resolution time moved in the expected direction."
    },
    {
      signal_id: "escalation_rate",
      value_route: "CAPACITY_CREATION",
      formula_family: "friction_rate_delta",
      result: metricDelta(metrics.escalation_rate),
      interpretation:
        "Tests whether fewer cases required escalation in the comparison window."
    },
    {
      signal_id: "reopen_rate",
      value_route: "QUALITY_IMPROVEMENT",
      formula_family: "quality_rate_delta",
      result: metricDelta(metrics.reopen_rate),
      interpretation:
        "Tests whether fewer resolved cases reopened after AI-assisted support work."
    },
    {
      signal_id: "backlog_count",
      value_route: "EXPERIENCE_IMPROVEMENT",
      formula_family: "throughput_context",
      result: metricDelta(metrics.backlog_count),
      interpretation:
        "Provides directional context for whether support backlog moved with the workflow change."
    }
  ].filter((signal) => signal.result);
}

function buildWorkChangeEvidence(input) {
  const patterns = input.ai_work_evidence?.aggregate_patterns ?? {};
  const evidence = [];
  if (patterns.assistant_sessions || patterns.search_sessions) {
    evidence.push({
      evidence_id: "support-ai-assist-coverage",
      observed_pattern:
        "Search and Assistant activity are present in the support workflow slice.",
      aggregate_count: Number(patterns.assistant_sessions ?? 0) + Number(patterns.search_sessions ?? 0),
      interpretation: "Indicates AI-assisted knowledge access is observable."
    });
  }
  if (patterns.skill_invocations || patterns.agent_runs) {
    evidence.push({
      evidence_id: "support-reusable-or-agentic-work",
      observed_pattern: "Skills or agent runs are present in aggregate support work.",
      aggregate_count: Number(patterns.skill_invocations ?? 0) + Number(patterns.agent_runs ?? 0),
      interpretation: "Indicates reusable or delegated support workflows may be emerging."
    });
  }
  if (patterns.verification_attached_episodes) {
    evidence.push({
      evidence_id: "support-verification-coverage",
      observed_pattern: "Verification-attached episodes are present.",
      aggregate_count: Number(patterns.verification_attached_episodes),
      interpretation: "Supports quality and trust review, but does not prove correctness."
    });
  }
  if (patterns.recovery_episodes || patterns.abandonment_episodes) {
    evidence.push({
      evidence_id: "support-friction-signals",
      observed_pattern: "Recovery and abandonment signals are visible.",
      aggregate_count:
        Number(patterns.recovery_episodes ?? 0) + Number(patterns.abandonment_episodes ?? 0),
      interpretation: "Provides caveats around friction and workflow reliability."
    });
  }
  return evidence;
}

function baseBlockedClaims(extra = []) {
  return [
    {
      claim_type: "roi_proof",
      claim: "Glean proved ROI for the support organization.",
      reason: "Outcome movement and AI work evidence do not establish realized ROI."
    },
    {
      claim_type: "causal_productivity_lift",
      claim: "Glean caused productivity lift.",
      reason: "The MVP preserves NOT_CAUSAL posture unless separately governed."
    },
    {
      claim_type: "individual_productivity",
      claim: "Named employees or creators saved a specific number of hours.",
      reason: "The evidence pack is aggregate-only."
    },
    {
      claim_type: "team_ranking",
      claim: "One team or manager group performs better with AI.",
      reason: "Comparative team or manager ranking is outside the governance boundary."
    },
    ...extra
  ];
}

function baseBlockedClaimStates() {
  return [
    {
      claim_type: "roi_proof",
      state: "BLOCKED",
      reason: "The packet does not prove ROI or realized business value."
    },
    {
      claim_type: "causal_productivity_lift",
      state: "BLOCKED",
      reason: "The packet does not establish causality or productivity lift."
    }
  ];
}

function missingOutcomePack(input, evidenceReadiness) {
  return {
    schema_version: SCHEMA_VERSION,
    org_id: input.org_id,
    window_id: input.window_id,
    workflow_family: input.workflow_family,
    generated_at: input.generated_at ?? "2026-06-09T12:00:00.000Z",
    verdict: "SURFACE",
    suppression_reason: null,
    workflow_value_hypothesis: input.workflow_value_hypothesis,
    value_routes: ["UNCLASSIFIED"],
    evidence_readiness: evidenceReadiness,
    ai_work_evidence_summary: {
      verdict: input.ai_work_evidence.verdict,
      cohort_size: input.ai_work_evidence.cohort_size,
      window_days: input.ai_work_evidence.window_days
    },
    work_change_evidence: buildWorkChangeEvidence(input),
    outcome_signal_recommendations: [
      {
        signal_id: "support_outcome_export",
        recommended_source_type: "support_system",
        recommended_metrics:
          "resolution_time;escalation_rate;reopen_rate;backlog_movement;CSAT",
        formula_template:
          "Compare aggregate baseline and AI-assisted support workflow metrics for the same approved slice."
      }
    ],
    claim_confidence: {
      overall_state: "MISSING",
      reason: "Outcome evidence is missing, so value language cannot be emitted.",
      claim_states: [
        {
          claim_type: "support_value_claim",
          state: "MISSING",
          reason: "Customer-owned support outcome evidence is not attached."
        },
        ...baseBlockedClaimStates()
      ]
    },
    safe_claims: [],
    blocked_claims: baseBlockedClaims(),
    required_caveats: [
      "Outcome evidence is missing; do not claim cost, capacity, quality, risk, experience, ROI, or causality.",
      "AI work evidence can support instrumentation planning only."
    ],
    next_actions: [
      {
        action:
          "Request an aggregate support outcome export for resolution time, escalation rate, reopen rate, and backlog movement.",
        owner: "customer_support_ops",
        priority: "high"
      }
    ],
    executive_summary:
      "AI work evidence is observable for this support slice, but outcome evidence is missing. Value claims are blocked until customer-owned support metrics are attached."
  };
}

function suppressedPack(input, evidenceReadiness) {
  return {
    schema_version: SCHEMA_VERSION,
    org_id: input.org_id,
    window_id: input.window_id,
    workflow_family: input.workflow_family,
    generated_at: input.generated_at ?? "2026-06-09T12:00:00.000Z",
    verdict: "SUPPRESS",
    suppression_reason: input.ai_work_evidence.suppression_reason,
    workflow_value_hypothesis: input.workflow_value_hypothesis,
    value_routes: ["UNCLASSIFIED"],
    evidence_readiness: evidenceReadiness,
    ai_work_evidence_summary: {
      verdict: "SUPPRESS",
      cohort_size: input.ai_work_evidence.cohort_size,
      window_days: input.ai_work_evidence.window_days
    },
    work_change_evidence: [],
    outcome_signal_recommendations: [],
    claim_confidence: {
      overall_state: "SUPPRESSED",
      reason: "Suppressed AI work evidence blocks downstream value language.",
      claim_states: [
        {
          claim_type: "support_value_claim",
          state: "SUPPRESSED",
          reason: "Existing suppression blocks downstream value interpretation."
        },
        {
          claim_type: "suppressed_value_claim",
          state: "BLOCKED",
          reason: "Suppressed evidence cannot support value language."
        },
        ...baseBlockedClaimStates()
      ]
    },
    safe_claims: [],
    blocked_claims: baseBlockedClaims([
      {
        claim_type: "suppressed_value_claim",
        claim: "Suppressed evidence supports a value claim.",
        reason: "Suppression must propagate to value evidence outputs."
      }
    ]),
    required_caveats: [
      `AI work evidence is suppressed for ${input.ai_work_evidence.suppression_reason}; no value interpretation is allowed.`
    ],
    next_actions: [
      {
        action: "Repair the suppressed evidence slice before generating a value evidence pack.",
        owner: "data_governance",
        priority: "high"
      }
    ],
    executive_summary:
      "The support workflow slice is suppressed, so FluencyTracr emits no safe value claims."
  };
}

export function buildSupportValueEvidencePack(input) {
  const validation = validateSupportValueInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const coverage = input.source_coverage ?? {};
  const evidenceReadiness = [
    { lane: "ai_activity", state: coverage.ai_activity ?? "not_computed" },
    { lane: "workflow", state: coverage.workflow ?? "not_computed" },
    { lane: "outcome", state: coverage.outcome ?? "not_computed" },
    { lane: "baseline", state: coverage.baseline ?? "not_computed" },
    { lane: "trust", state: coverage.trust ?? "not_computed" }
  ];

  if (input.ai_work_evidence.verdict === "SUPPRESS") {
    return suppressedPack(input, evidenceReadiness);
  }

  if (coverage.outcome !== "present" || !input.outcome_evidence) {
    return missingOutcomePack(input, evidenceReadiness);
  }

  const outcomeSignals = buildOutcomeSignals(input.outcome_evidence);
  if (outcomeSignals.length === 0) {
    return missingOutcomePack(input, evidenceReadiness);
  }

  return {
    schema_version: SCHEMA_VERSION,
    org_id: input.org_id,
    window_id: input.window_id,
    workflow_family: input.workflow_family,
    generated_at: input.generated_at ?? "2026-06-09T12:00:00.000Z",
    verdict: "SURFACE",
    suppression_reason: null,
    workflow_value_hypothesis: input.workflow_value_hypothesis,
    value_routes: [
      "COST_REDUCTION",
      "CAPACITY_CREATION",
      "QUALITY_IMPROVEMENT",
      "EXPERIENCE_IMPROVEMENT"
    ],
    evidence_readiness: evidenceReadiness,
    ai_work_evidence_summary: {
      verdict: input.ai_work_evidence.verdict,
      cohort_size: input.ai_work_evidence.cohort_size,
      window_days: input.ai_work_evidence.window_days,
      aggregate_patterns: input.ai_work_evidence.aggregate_patterns
    },
    work_change_evidence: buildWorkChangeEvidence(input),
    outcome_signal_recommendations: outcomeSignals,
    claim_confidence: {
      overall_state: "CAVEATED",
      reason:
        "AI work evidence and customer-owned support outcome signals align directionally, but causality and realized ROI are not established.",
      claim_states: [
        {
          claim_type: "support_value_investigation",
          state: "SUPPORTED",
          reason:
            "Aggregate AI work evidence and support outcome context support a bounded value-investigation claim."
        },
        {
          claim_type: "capacity_creation_hypothesis",
          state: "CAVEATED",
          reason:
            "Capacity movement is directionally aligned but remains associational and assumption-bound."
        },
        {
          claim_type: "roi_proof",
          state: "BLOCKED",
          reason: "The packet does not prove ROI or causality."
        }
      ]
    },
    safe_claims: [
      {
        claim_type: "support_value_investigation",
        claim:
          "Aggregate support evidence suggests this workflow is a candidate for value investigation.",
        required_caveat: "Directionally aligned evidence does not prove ROI or causality."
      },
      {
        claim_type: "capacity_creation_hypothesis",
        claim:
          "Observed AI work patterns align with a capacity-creation hypothesis for support case resolution.",
        required_caveat: "Customer-owned outcome data must remain attached to the same aggregate slice."
      },
      {
        claim_type: "quality_improvement_hypothesis",
        claim:
          "Support workflow data can test whether AI-assisted work is associated with lower reopen or escalation rates.",
        required_caveat: "Case mix, staffing, channel mix, and process changes may explain movement."
      }
    ],
    blocked_claims: baseBlockedClaims(),
    required_caveats: [
      "This is a caveated value evidence pack, not ROI proof.",
      "Outcome movement is associational and must not be described as causal.",
      "All interpretation is aggregate-only and scoped to the approved support workflow slice."
    ],
    confounders: [
      "support volume mix",
      "staffing changes",
      "channel mix",
      "seasonality",
      "process or policy changes",
      "knowledge base content changes"
    ],
    next_actions: [
      {
        action:
          "Review the support outcome export with the business owner and confirm the same workflow slice, baseline, and comparison windows.",
        owner: "ai_outcomes_manager",
        priority: "high"
      },
      {
        action:
          "Decide whether capacity, quality, cost, or experience should be the primary pilot story.",
        owner: "business_sponsor",
        priority: "medium"
      }
    ],
    executive_summary:
      "Customer Support is a caveated AI Value Intelligence pilot candidate: aggregate AI work evidence is present, support outcome metrics moved in the expected direction, and claim language must remain bounded to value investigation rather than ROI proof."
  };
}

export function renderSupportValueEvidenceMarkdown(pack) {
  const claimStates = pack.claim_confidence.claim_states
    .map((claim) => `- ${claim.state}: ${claim.claim_type} - ${claim.reason}`)
    .join("\n");
  const safeClaims = pack.safe_claims.length
    ? pack.safe_claims.map((claim) => `- ${claim.claim}`).join("\n")
    : "- No safe value claims emitted.";
  const blockedClaims = pack.blocked_claims
    .map((claim) => `- ${claim.claim_type}: ${claim.claim}`)
    .join("\n");
  const nextActions = pack.next_actions
    .map((action) => `- ${action.action} (${action.owner}, ${action.priority})`)
    .join("\n");

  return `# Customer Support AI Value Evidence Pack

## Executive Summary

${pack.executive_summary}

## Claim Confidence

- State: ${pack.claim_confidence.overall_state}
- Verdict: ${pack.verdict}
- Suppression reason: ${pack.suppression_reason ?? "none"}

${claimStates}

## Safe Claims

${safeClaims}

## Blocked Claims

${blockedClaims}

## Next Actions

${nextActions}
`;
}

function writeOutput(path, content) {
  const outputPath = resolve(process.cwd(), path);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const input = JSON.parse(readFileSync(inputPath, "utf8"));
  const pack = buildSupportValueEvidencePack(input);
  const json = `${JSON.stringify(pack, null, 2)}\n`;

  if (args.stdout) {
    process.stdout.write(json);
    return;
  }

  writeOutput(args.output, json);
  if (args.markdown) {
    writeOutput(args.markdown, renderSupportValueEvidenceMarkdown(pack));
  }
  console.log(`Generated ${args.output}`);
  if (args.markdown) {
    console.log(`Generated ${args.markdown}`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
