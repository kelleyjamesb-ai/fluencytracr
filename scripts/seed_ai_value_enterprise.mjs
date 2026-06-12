#!/usr/bin/env node
// AI Value enterprise seeder — Northstar Enterprise, a synthetic 5,000-employee
// organization, pushed through the full North Star spine:
//
//   AI Fluency Baseline -> VBD Operating Map -> Function Outcome Metric
//   -> Value Evidence Case -> Intervention / Retest
//
// Person-level data exists only inside this process as an upstream simulation.
// Only aggregate, suppression-checked packages cross into FluencyTracr, and
// every object lands through the governed /api/v1/ai-value API (fail-closed,
// validated server-side). The five focus functions land at different rungs of
// the evidence ladder on purpose, so the product shows MISSING, DIRECTIONAL,
// CAVEATED, and SUPPORTED cases side by side.
//
// Requires a running backend with header auth (npm run dev --workspace backend)
// and a built shared workspace (npm run build --workspace shared).
//
// Env / flags:
//   --base | AI_VALUE_API_BASE  default http://localhost:4000
//   --org  | AI_VALUE_ORG       default org-northstar-enterprise
//   --role | AI_VALUE_ROLE      default ADMIN
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildValueImprovementLoopFromRoiScenario,
  validateValueImprovementLoop
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-intelligence/examples";

// Deterministic PRNG so every run produces the same enterprise.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260611);
const jitter = (base, spread) => base + (rand() * 2 - 1) * spread;
const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;

const WINDOWS = {
  baseline: "2026-02-01_to_2026-03-31",
  comparison: "2026-04-01_to_2026-05-31"
};

// ---------------------------------------------------------------------------
// The synthetic organization: 5,000 employees across twelve functions.
// `maturity` (0..1) drives simulated fluency scores and adoption signals.
// ---------------------------------------------------------------------------
const ORG_FUNCTIONS = [
  {
    key: "engineering",
    label: "Engineering",
    maturity: 0.62,
    roleFamilies: [
      { id: "software_engineers", label: "Software engineers", headcount: 980 },
      { id: "platform_engineers", label: "Platform engineers", headcount: 240 },
      { id: "engineering_leads", label: "Engineering leads", headcount: 180 }
    ]
  },
  {
    key: "customer_support",
    label: "Customer Support",
    maturity: 0.48,
    roleFamilies: [
      { id: "support_agents", label: "Support agents", headcount: 430 },
      { id: "support_specialists", label: "Support specialists", headcount: 140 },
      { id: "knowledge_owners", label: "Knowledge owners", headcount: 5 },
      { id: "support_leads", label: "Support leads", headcount: 25 }
    ]
  },
  {
    key: "operations",
    label: "Operations",
    maturity: 0.34,
    roleFamilies: [
      { id: "operations_analysts", label: "Operations analysts", headcount: 310 },
      { id: "logistics_coordinators", label: "Logistics coordinators", headcount: 150 },
      { id: "operations_leads", label: "Operations leads", headcount: 40 }
    ]
  },
  {
    key: "sales",
    label: "Sales",
    maturity: 0.71,
    roleFamilies: [
      { id: "account_executives", label: "Account executives", headcount: 260 },
      { id: "sales_engineers", label: "Sales engineers", headcount: 90 },
      { id: "sales_operations", label: "Sales operations", headcount: 70 },
      { id: "sales_leads", label: "Sales leads", headcount: 30 }
    ]
  },
  {
    key: "customer_success",
    label: "Customer Success",
    maturity: 0.55,
    roleFamilies: [
      { id: "customer_success_managers", label: "Customer success managers", headcount: 290 },
      { id: "renewal_specialists", label: "Renewal specialists", headcount: 110 }
    ]
  },
  {
    key: "marketing",
    label: "Marketing",
    maturity: 0.58,
    roleFamilies: [
      { id: "content_marketers", label: "Content marketers", headcount: 160 },
      { id: "demand_generation", label: "Demand generation", headcount: 120 },
      { id: "product_marketers", label: "Product marketers", headcount: 70 }
    ]
  },
  {
    key: "finance",
    label: "Finance",
    maturity: 0.29,
    roleFamilies: [
      { id: "financial_analysts", label: "Financial analysts", headcount: 180 },
      { id: "accounting", label: "Accounting", headcount: 120 }
    ]
  },
  {
    key: "product",
    label: "Product",
    maturity: 0.66,
    roleFamilies: [
      { id: "product_managers", label: "Product managers", headcount: 150 },
      { id: "product_designers", label: "Product designers", headcount: 120 }
    ]
  },
  {
    key: "information_technology",
    label: "IT",
    maturity: 0.52,
    roleFamilies: [
      { id: "it_service_desk", label: "IT service desk", headcount: 140 },
      { id: "it_systems", label: "IT systems", headcount: 110 }
    ]
  },
  {
    key: "people_team",
    label: "People Team",
    maturity: 0.31,
    roleFamilies: [
      { id: "people_partners", label: "People partners", headcount: 110 },
      { id: "recruiters", label: "Recruiters", headcount: 70 }
    ]
  },
  {
    key: "legal",
    label: "Legal",
    maturity: 0.27,
    roleFamilies: [{ id: "legal_counsel", label: "Legal counsel", headcount: 100 }]
  },
  {
    key: "general_administration",
    label: "G&A",
    maturity: 0.25,
    roleFamilies: [
      { id: "executive_team", label: "Executive team", headcount: 60 },
      { id: "administrative_staff", label: "Administrative staff", headcount: 140 }
    ]
  }
];

// ---------------------------------------------------------------------------
// Focus functions: each gets a full chain and lands at a different rung of the
// evidence ladder. evidencePath drives the outcome-evidence review state and
// the customer-owned assumption states.
//   ACCEPTED_SUPPORTED -> accepted + all assumptions present  -> SUPPORTED
//   ACCEPTED_CAVEATED  -> accepted + open assumptions          -> CAVEATED
//   SUBMITTED          -> uploaded, awaiting human acceptance  -> DIRECTIONAL
//   REJECTED           -> reviewer rejected the export         -> MISSING (held)
//   NONE               -> no outcome evidence yet              -> MISSING (held)
// ---------------------------------------------------------------------------
const FOCUS_FUNCTIONS = [
  {
    functionKey: "sales",
    workflowFamily: "sales_proposal_response",
    workflowName: "Sales proposal and RFP response",
    valueRoute: "REVENUE_EXPANSION",
    sponsorRole: "sales_business_sponsor",
    ownerRole: "revenue_operations",
    systems: ["crm_system", "proposal_workspace", "glean_assistant"],
    evidencePath: "ACCEPTED_SUPPORTED",
    vbd: {
      fluencyReadiness: "READY",
      velocityStatus: "INCREASING",
      breadthStatus: "EXPANDING",
      depthStatus: "DEEPENING",
      evidenceConfidence: "HIGH"
    },
    hypothesis:
      "AI-assisted proposal work may be associated with faster RFP turnaround and higher coverage of qualified requests.",
    currentSteps: [
      "Account executive searches past proposals and product collateral",
      "Sales engineer drafts technical responses from scratch",
      "Deal desk reviews and approves the final response"
    ],
    futureSteps: [
      "Account executive uses Search and Assistant to assemble approved content",
      "Approved Skills draft first-pass technical responses for expert review",
      "Aggregate verification and reuse signals are reviewed by revenue operations"
    ],
    objective: {
      statement:
        "Expand qualified pipeline coverage by reducing proposal turnaround time.",
      challenge:
        "Proposal and RFP response time limits how many qualified requests the team can pursue.",
      initiative: "AI-assisted proposal workflows on approved content sources.",
      outcome: "More qualified requests answered per quarter without quality loss."
    },
    metrics: [
      {
        id: "sales_proposal_turnaround_days",
        name: "Proposal turnaround time",
        unit: "days",
        route: "REVENUE_EXPANSION",
        definition:
          "Median elapsed days from qualified proposal request to submitted response for eligible aggregate requests.",
        sourceType: "crm_system",
        sourceName: "CRM and proposal workspace",
        baseline: 9.4,
        comparison: 6.8,
        direction: "REDUCE",
        priority: "P0",
        role: "PRIMARY"
      },
      {
        id: "sales_rfp_coverage_share",
        name: "Qualified RFP coverage",
        unit: "share",
        route: "REVENUE_EXPANSION",
        definition:
          "Share of qualified RFP requests answered within the approved window.",
        sourceType: "crm_system",
        sourceName: "CRM and proposal workspace",
        baseline: 0.64,
        comparison: 0.79,
        direction: "IMPROVE",
        priority: "P1",
        role: "CONTEXT"
      }
    ],
    assumptions: [
      { assumption_id: "deal_mix_stability", state: "PRESENT", owner: "revenue_operations" },
      { assumption_id: "territory_coverage_context", state: "PRESENT", owner: "sales_leader" },
      { assumption_id: "pricing_policy_context", state: "PRESENT", owner: "deal_desk_owner" }
    ]
  },
  {
    functionKey: "customer_support",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    valueRoute: "CAPACITY_CREATION",
    sponsorRole: "customer_support_business_sponsor",
    ownerRole: "support_operations",
    systems: ["support_case_management", "knowledge_base", "glean_assistant"],
    evidencePath: "ACCEPTED_CAVEATED",
    vbd: {
      fluencyReadiness: "MIXED",
      velocityStatus: "STALLING",
      breadthStatus: "LIMITED",
      depthStatus: "SHALLOW",
      evidenceConfidence: "MEDIUM"
    },
    hypothesis:
      "AI-assisted support work may be associated with faster case resolution, lower escalation, and improved knowledge reuse.",
    currentSteps: [
      "Support agent searches knowledge sources",
      "Support agent drafts response",
      "Support agent escalates unresolved cases"
    ],
    futureSteps: [
      "Support agent uses Search and Assistant for knowledge access",
      "Approved Skills support repeatable resolution workflows",
      "Verification and recovery signals are reviewed in aggregate"
    ],
    objective: {
      statement:
        "Create support capacity by reducing time spent locating trusted answers and drafting responses.",
      challenge:
        "Case volume is growing faster than the support team can scale, and knowledge is fragmented.",
      initiative: "AI-assisted support workflows on Search, Assistant, and approved Skills.",
      outcome: "Faster resolution and lower escalation pressure without quality loss."
    },
    metrics: [
      {
        id: "support_median_resolution_hours",
        name: "Median resolution time",
        unit: "hours",
        route: "CAPACITY_CREATION",
        definition:
          "Median elapsed hours from support case creation to resolved state for eligible aggregate support cases.",
        sourceType: "support_system",
        sourceName: "Support case management system",
        baseline: 18.4,
        comparison: 15.1,
        direction: "REDUCE",
        priority: "P0",
        role: "PRIMARY"
      },
      {
        id: "support_backlog_count",
        name: "Open backlog count",
        unit: "cases",
        route: "CAPACITY_CREATION",
        definition:
          "Count of eligible unresolved support cases remaining open at the end of the approved measurement window.",
        sourceType: "support_system",
        sourceName: "Support case management system",
        baseline: 1240,
        comparison: 1102,
        direction: "REDUCE",
        priority: "P1",
        role: "CONTEXT"
      },
      {
        id: "support_escalation_rate",
        name: "Escalation rate",
        unit: "share",
        route: "COST_REDUCTION",
        definition:
          "Share of eligible support cases escalated from first-line support to advanced support.",
        sourceType: "support_system",
        sourceName: "Support case management system",
        baseline: 0.18,
        comparison: 0.14,
        direction: "REDUCE",
        priority: "P1",
        role: "GUARDRAIL"
      }
    ],
    assumptions: [
      { assumption_id: "case_mix_stability", state: "PRESENT", owner: "support_operations" },
      { assumption_id: "volume_context", state: "CAVEATED", owner: "support_operations" },
      { assumption_id: "staffing_and_coverage_context", state: "MISSING", owner: "support_leader" }
    ]
  },
  {
    functionKey: "engineering",
    workflowFamily: "engineering_incident_resolution",
    workflowName: "Incident triage and resolution",
    valueRoute: "QUALITY_IMPROVEMENT",
    sponsorRole: "engineering_business_sponsor",
    ownerRole: "platform_operations",
    systems: ["incident_management", "runbook_repository", "glean_assistant"],
    evidencePath: "SUBMITTED",
    vbd: {
      fluencyReadiness: "READY",
      velocityStatus: "INCREASING",
      breadthStatus: "EXPANDING",
      depthStatus: "SHALLOW",
      evidenceConfidence: "MEDIUM"
    },
    hypothesis:
      "AI-assisted incident work may be associated with faster triage and more consistent runbook reuse.",
    currentSteps: [
      "On-call engineer searches runbooks and prior incidents",
      "On-call engineer drafts an incident summary by hand",
      "Postmortems are assembled manually after resolution"
    ],
    futureSteps: [
      "On-call engineer uses Search and Assistant to locate runbooks and prior incidents",
      "Approved Skills draft incident summaries and postmortem outlines for review",
      "Recovery and verification signals are reviewed in aggregate"
    ],
    objective: {
      statement: "Reduce incident resolution time while keeping postmortem quality high.",
      challenge:
        "Incident knowledge is scattered across runbooks, dashboards, and prior tickets.",
      initiative: "AI-assisted incident triage on approved engineering sources.",
      outcome: "Faster mitigation with consistent, reviewable incident records."
    },
    metrics: [
      {
        id: "engineering_incident_mttr_hours",
        name: "Mean time to resolve",
        unit: "hours",
        route: "QUALITY_IMPROVEMENT",
        definition:
          "Mean elapsed hours from incident declaration to resolution for eligible aggregate incidents.",
        sourceType: "incident_system",
        sourceName: "Incident management system",
        baseline: 6.2,
        comparison: 5.1,
        direction: "REDUCE",
        priority: "P0",
        role: "PRIMARY"
      },
      {
        id: "engineering_repeat_incident_rate",
        name: "Repeat incident rate",
        unit: "share",
        route: "RISK_REDUCTION",
        definition:
          "Share of eligible incidents recurring with the same root-cause class within the approved window.",
        sourceType: "incident_system",
        sourceName: "Incident management system",
        baseline: 0.11,
        comparison: 0.09,
        direction: "REDUCE",
        priority: "P1",
        role: "GUARDRAIL"
      }
    ],
    assumptions: [
      { assumption_id: "incident_severity_mix", state: "PRESENT", owner: "platform_operations" },
      { assumption_id: "service_change_context", state: "CAVEATED", owner: "engineering_leader" },
      { assumption_id: "on_call_rotation_context", state: "MISSING", owner: "platform_operations" }
    ]
  },
  {
    functionKey: "marketing",
    workflowFamily: "marketing_content_production",
    workflowName: "Campaign content production",
    valueRoute: "CAPACITY_CREATION",
    sponsorRole: "marketing_business_sponsor",
    ownerRole: "marketing_operations",
    systems: ["content_management", "campaign_platform", "glean_assistant"],
    evidencePath: "NONE",
    vbd: {
      fluencyReadiness: "MIXED",
      velocityStatus: "INCREASING",
      breadthStatus: "LIMITED",
      depthStatus: "SHALLOW",
      evidenceConfidence: "LOW"
    },
    hypothesis:
      "AI-assisted content work may be associated with faster campaign asset production at consistent brand quality.",
    currentSteps: [
      "Content marketer researches positioning and prior assets",
      "Content marketer drafts campaign assets from scratch",
      "Brand review iterates on drafts over multiple cycles"
    ],
    futureSteps: [
      "Content marketer uses Search and Assistant over approved brand sources",
      "Approved Skills draft first-pass campaign assets for brand review",
      "Reuse and revision signals are reviewed in aggregate"
    ],
    objective: {
      statement: "Increase campaign asset throughput without lowering brand quality.",
      challenge:
        "Campaign production is bottlenecked on first-draft creation and review cycles.",
      initiative: "AI-assisted content drafting on approved brand sources.",
      outcome: "More campaigns shipped per quarter at consistent quality."
    },
    metrics: [
      {
        id: "marketing_asset_cycle_days",
        name: "Asset production cycle time",
        unit: "days",
        route: "CAPACITY_CREATION",
        definition:
          "Median elapsed days from campaign brief approval to published asset for eligible aggregate assets.",
        sourceType: "content_system",
        sourceName: "Content management system",
        baseline: 12.5,
        comparison: 12.1,
        direction: "REDUCE",
        priority: "P0",
        role: "PRIMARY"
      },
      {
        id: "marketing_revision_cycles",
        name: "Brand revision cycles",
        unit: "count",
        route: "QUALITY_IMPROVEMENT",
        definition:
          "Mean count of brand review cycles per eligible asset in the approved window.",
        sourceType: "content_system",
        sourceName: "Content management system",
        baseline: 3.4,
        comparison: 3.2,
        direction: "REDUCE",
        priority: "P1",
        role: "GUARDRAIL"
      }
    ],
    assumptions: [
      { assumption_id: "campaign_mix_stability", state: "MISSING", owner: "marketing_operations" },
      { assumption_id: "agency_usage_context", state: "MISSING", owner: "marketing_leader" }
    ]
  },
  {
    functionKey: "operations",
    workflowFamily: "operations_exception_handling",
    workflowName: "Order exception handling",
    valueRoute: "COST_REDUCTION",
    sponsorRole: "operations_business_sponsor",
    ownerRole: "operations_excellence",
    systems: ["order_management", "logistics_platform", "glean_assistant"],
    evidencePath: "REJECTED",
    vbd: {
      fluencyReadiness: "LOW",
      velocityStatus: "DECLINING",
      breadthStatus: "NARROWING",
      depthStatus: "FRAGMENTED",
      evidenceConfidence: "LOW"
    },
    hypothesis:
      "AI-assisted exception work may be associated with faster resolution of order exceptions and fewer aged exceptions.",
    currentSteps: [
      "Operations analyst investigates exceptions across systems",
      "Operations analyst emails teams to resolve blockers",
      "Aged exceptions accumulate in a manual queue"
    ],
    futureSteps: [
      "Operations analyst uses Search and Assistant to trace exception context",
      "Approved Skills draft resolution recommendations for analyst review",
      "Aging and recovery signals are reviewed in aggregate"
    ],
    objective: {
      statement: "Reduce the cost of order exception handling by resolving exceptions faster.",
      challenge:
        "Exception context is spread across order, logistics, and finance systems.",
      initiative: "AI-assisted exception triage on approved operations sources.",
      outcome: "Fewer aged exceptions and lower handling cost per order."
    },
    metrics: [
      {
        id: "operations_exception_resolution_hours",
        name: "Exception resolution time",
        unit: "hours",
        route: "COST_REDUCTION",
        definition:
          "Median elapsed hours from exception creation to resolution for eligible aggregate exceptions.",
        sourceType: "order_system",
        sourceName: "Order management system",
        baseline: 31.0,
        comparison: 30.2,
        direction: "REDUCE",
        priority: "P0",
        role: "PRIMARY"
      },
      {
        id: "operations_aged_exception_count",
        name: "Aged exception count",
        unit: "count",
        route: "COST_REDUCTION",
        definition:
          "Count of eligible exceptions older than the approved aging threshold at window end.",
        sourceType: "order_system",
        sourceName: "Order management system",
        baseline: 420,
        comparison: 405,
        direction: "REDUCE",
        priority: "P1",
        role: "CONTEXT"
      }
    ],
    assumptions: [
      { assumption_id: "order_volume_context", state: "MISSING", owner: "operations_excellence" },
      { assumption_id: "carrier_change_context", state: "MISSING", owner: "logistics_leader" }
    ]
  }
];

// ---------------------------------------------------------------------------
// Upstream simulation: aggregate the synthetic population into cohorts. The
// person-level loop below never leaves this function — only cohort aggregates
// (with small cohorts suppressed) are returned.
// ---------------------------------------------------------------------------
const SUPPRESSION_MINIMUM = 5;
const CONSTRUCTS = [
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth",
  "ai_attitude",
  "behavioral_intent",
  "perceived_ai_impact"
];

function simulateFluencyCohorts(orgFunction) {
  return orgFunction.roleFamilies.map((roleFamily) => {
    const responseRate = 0.62 + rand() * 0.18;
    const respondentCount = Math.max(
      0,
      Math.round(roleFamily.headcount * responseRate)
    );
    if (respondentCount < SUPPRESSION_MINIMUM) {
      return {
        cohort_id: `cohort_${roleFamily.id}`,
        cohort_label: roleFamily.label,
        respondent_count: respondentCount,
        suppressed: true
      };
    }
    const base = 2.2 + orgFunction.maturity * 1.6;
    const constructScores = {};
    for (const construct of CONSTRUCTS) {
      // Simulate respondent-level scores, keep only the cohort mean.
      let total = 0;
      for (let i = 0; i < respondentCount; i += 1) {
        total += Math.min(5, Math.max(1, jitter(base, 0.9)));
      }
      constructScores[construct] = { mean: round1(total / respondentCount) };
    }
    return {
      cohort_id: `cohort_${roleFamily.id}`,
      cohort_label: roleFamily.label,
      respondent_count: respondentCount,
      construct_scores: constructScores
    };
  });
}

const headcountOf = (orgFunction) =>
  orgFunction.roleFamilies.reduce((sum, role) => sum + role.headcount, 0);

// ---------------------------------------------------------------------------
// API plumbing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {
    base: process.env.AI_VALUE_API_BASE ?? "http://localhost:4000",
    org: process.env.AI_VALUE_ORG ?? "org-northstar-enterprise",
    role: process.env.AI_VALUE_ROLE ?? "ADMIN"
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base") args.base = argv[++i];
    else if (arg === "--org") args.org = argv[++i];
    else if (arg === "--role") args.role = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/seed_ai_value_enterprise.mjs [--base url] [--org orgId] [--role ADMIN]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

function readExample(file) {
  return JSON.parse(readFileSync(resolve(process.cwd(), EXAMPLES, file), "utf8"));
}

const clone = (value) => JSON.parse(JSON.stringify(value));

async function api(args, method, path, body) {
  const response = await fetch(`${args.base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-role": args.role,
      "x-org-id": args.org
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, ok: response.ok, payload };
}

function fail(step, res) {
  console.error(`\nx ${step} failed: HTTP ${res.status}`);
  if (res.payload) console.error(JSON.stringify(res.payload, null, 2));
  process.exit(1);
}

async function putObject(args, type, idField, payload) {
  const objectId = String(payload[idField]);
  const res = await api(
    args,
    "PUT",
    `/api/v1/ai-value/objects/${type}/${encodeURIComponent(objectId)}`,
    payload
  );
  if (res.ok) return objectId;
  if (
    type === "outcome_evidence_export" &&
    res.status === 409 &&
    res.payload?.reason === "TERMINAL_REVIEW_STATE"
  ) {
    console.log(`    - ${type} ${objectId} already reviewed (kept)`);
    return objectId;
  }
  fail(`PUT ${type} ${objectId}`, res);
}

// ---------------------------------------------------------------------------
// Object builders (template-transformed so every engine validator passes)
// ---------------------------------------------------------------------------
const blueprintTemplate = readExample("customer-support-blueprint.json");
const roiScenarioTemplate = readExample("customer-support-roi-scenario.json");
const dataBoundaryTemplate = readExample(
  "customer-support-data-boundary-roi-evidence.json"
);

const metricBlockedClaims = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement"
];

function buildEngagement(args) {
  const objectives = [];
  const useCases = [];
  for (const focus of FOCUS_FUNCTIONS) {
    const orgFunction = ORG_FUNCTIONS.find((f) => f.key === focus.functionKey);
    const objectiveId = `objective_${focus.workflowFamily}_v1`;
    objectives.push({
      objective_id: objectiveId,
      objective_statement: focus.objective.statement,
      challenge: focus.objective.challenge,
      initiative: focus.objective.initiative,
      positive_business_outcome: focus.objective.outcome,
      decision_timeline: "2026_h2_renewal_cycle",
      owner_role: focus.sponsorRole,
      success_measures: focus.metrics.map((metric) => ({
        measure: metric.name,
        expected_direction: metric.direction
      }))
    });
    useCases.push({
      use_case_id: `uc_${focus.workflowFamily}`,
      name: focus.workflowName,
      description: focus.hypothesis,
      impacted_functions: [focus.functionKey],
      impact_rationale: focus.objective.challenge,
      effort_rationale:
        "Workflows and approved sources already exist; change concentrates in work habits.",
      data_sources: focus.systems,
      uncertainties: ["Concurrent operating changes during the comparison window"],
      priority_state: "PILOT_SELECTED",
      workflow_family: focus.workflowFamily,
      objective_id: objectiveId,
      function_headcount: headcountOf(orgFunction)
    });
  }
  return {
    schema_version: "FT_AI_VALUE_ENGAGEMENT_2026_06",
    engagement_id: "engagement_northstar_enterprise_v1",
    org_id: args.org,
    client: {
      client_id: "client_northstar",
      client_name: "Northstar Enterprise",
      industry: "business_services",
      company_size: "5000_to_10000",
      strategic_objectives: [
        "Make AI part of real work in every revenue and service function",
        "Prove value movement on customer-owned outcome metrics before scaling spend"
      ],
      executive_sponsor_role: "chief_operating_officer",
      technical_champion_role: "ai_program_owner",
      account_team_roles: ["account_executive", "solutions_architect", "value_consultant"]
    },
    business_objectives: objectives,
    workstream: {
      workstream_id: "workstream_enterprise_ai_value_v1",
      function: "enterprise_ai_value_program",
      role_families: FOCUS_FUNCTIONS.map((focus) => focus.functionKey),
      users_in_scope: ORG_FUNCTIONS.reduce((sum, f) => sum + headcountOf(f), 0),
      systems_in_scope: ["glean_search", "glean_assistant", "approved_skills"],
      sponsor_role: "chief_operating_officer"
    },
    use_cases: useCases
  };
}

function buildFluencyBaseline(args, orgFunction) {
  return {
    schema_version: "FT_AI_VALUE_FLUENCY_BASELINE_2026_06",
    baseline_id: `fluency_baseline_${orgFunction.key}_kickoff`,
    org_id: args.org,
    instrument: { instrument_id: "ai_fluency_long_v1", item_count: 24 },
    window: "2026-03-15_to_2026-03-31",
    collection_mode: "kickoff",
    cohorts: simulateFluencyCohorts(orgFunction),
    governance: {
      respondent_identifiers_included: false,
      person_level_results_shared: false,
      used_for_individual_scoring: false,
      used_for_team_ranking: false
    }
  };
}

function buildBlueprint(args, focus, orgFunction) {
  const blueprint = clone(blueprintTemplate);
  const headcount = headcountOf(orgFunction);
  const population = Math.round(headcount * (8 + rand() * 6));
  const eligible = Math.round(population * (0.88 + rand() * 0.08));
  blueprint.blueprint_id = `bp_${focus.workflowFamily}`;
  blueprint.org_id = args.org;
  blueprint.workflow_family = focus.workflowFamily;
  blueprint.workflow_name = focus.workflowName;
  blueprint.business_owner = { role: focus.sponsorRole, approval_state: "PRESENT" };
  blueprint.process_discovery = {
    current_state_steps: focus.currentSteps,
    future_state_steps: focus.futureSteps
  };
  blueprint.value_hypothesis = focus.hypothesis;
  blueprint.value_routes = {
    primary: focus.valueRoute,
    secondary: Array.from(
      new Set(
        focus.metrics.map((metric) => metric.route).filter((r) => r !== focus.valueRoute)
      )
    )
  };
  blueprint.windows = { ...WINDOWS };
  const adoption = orgFunction.maturity;
  blueprint.source_requirements.approved_aggregate_inputs = {
    case_population: {
      total_cases: population,
      eligible_cases: eligible,
      excluded_cases: population - eligible
    },
    ai_activity: {
      assistant_sessions: Math.round(eligible * adoption * (0.6 + rand() * 0.3)),
      search_sessions: Math.round(eligible * adoption * (0.8 + rand() * 0.4)),
      skill_invocations: Math.round(eligible * adoption * (0.08 + rand() * 0.08)),
      agent_runs: Math.round(eligible * adoption * (0.03 + rand() * 0.05))
    },
    trust_and_friction: {
      verification_attached_episodes: Math.round(eligible * adoption * (0.25 + rand() * 0.15)),
      recovery_episodes: Math.round(eligible * (0.02 + rand() * 0.03)),
      abandonment_episodes: Math.round(eligible * (0.01 + rand() * 0.02))
    },
    outcome_signals: Object.fromEntries(
      focus.metrics.map((metric) => [
        metric.id,
        { baseline: metric.baseline, comparison: metric.comparison, unit: metric.unit }
      ])
    )
  };
  // The blueprint validator requires the canonical assumption ledger ids;
  // set their states from the function's evidence path instead of renaming.
  const ledgerState =
    focus.evidencePath === "ACCEPTED_SUPPORTED"
      ? () => "PRESENT"
      : focus.evidencePath === "ACCEPTED_CAVEATED"
        ? (index) => (index < 2 ? "PRESENT" : index < 4 ? "CAVEATED" : "MISSING")
        : (index) => (index < 1 ? "PRESENT" : index < 3 ? "CAVEATED" : "MISSING");
  blueprint.assumption_ledger = blueprintTemplate.assumption_ledger.map(
    (assumption, index) => ({
      ...assumption,
      state: ledgerState(index),
      owner: focus.ownerRole
    })
  );
  return blueprint;
}

function buildMetricsLibrary(focus) {
  return {
    schema_version: "FT_AI_VALUE_METRICS_LIBRARY_2026_06",
    library_id: `metrics_${focus.functionKey}_v1`,
    workflow_family: focus.workflowFamily,
    metrics: focus.metrics.map((metric) => ({
      metric_id: metric.id,
      workflow_family: focus.workflowFamily,
      name: metric.name,
      definition: metric.definition,
      value_route: metric.route,
      metric_priority: metric.priority,
      source_system: {
        source_type: metric.sourceType,
        source_name: metric.sourceName,
        approved_grain: "aggregate_workflow_window"
      },
      measurement_unit: metric.unit,
      baseline_rule:
        "Compare against an approved pre-period window for the same workflow family.",
      comparison_rule:
        "Compare against the approved post-period window; report directional movement only.",
      owner: focus.ownerRole,
      allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
      blocked_claims: metricBlockedClaims
    }))
  };
}

function buildOutcomeExport(args, focus, orgFunction) {
  const headcount = headcountOf(orgFunction);
  return {
    schema_version: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
    export_id: `outcome_export_${focus.functionKey}_2026_06`,
    org_id: args.org,
    workflow_family: focus.workflowFamily,
    source_system: {
      source_type: focus.metrics[0].sourceType,
      source_name: focus.metrics[0].sourceName,
      approved_grain: "aggregate_workflow_window"
    },
    attestation: {
      exported_by_role: `${focus.functionKey}_data_analyst`,
      approved_by_role: focus.sponsorRole,
      export_date: "2026-06-08",
      contains_person_level_data: false,
      contains_raw_content: false
    },
    windows: { ...WINDOWS },
    metrics: focus.metrics.map((metric) => ({
      metric_id: metric.id,
      measurement_unit: metric.unit,
      baseline_value: metric.baseline,
      comparison_value: metric.comparison,
      eligible_population: Math.round(headcount * (7 + rand() * 5))
    })),
    review: { review_state: "SUBMITTED" }
  };
}

function buildRoiScenario(focus, refs) {
  const scenario = clone(roiScenarioTemplate);
  scenario.roi_scenario_id = `roi_scenario_${focus.workflowFamily}_v1`;
  scenario.source_refs = {
    blueprint_id: refs.blueprintId,
    metrics_library_id: refs.metricsLibraryId,
    value_scenario_id: refs.valueScenarioId,
    readiness_id: refs.readinessId
  };
  scenario.workflow = {
    workflow_family: focus.workflowFamily,
    workflow_name: focus.workflowName,
    value_route: focus.valueRoute
  };
  const reviewStateByPath = {
    ACCEPTED_SUPPORTED: "ACCEPTED",
    ACCEPTED_CAVEATED: "ACCEPTED",
    SUBMITTED: "SUBMITTED",
    REJECTED: "REJECTED",
    NONE: "MISSING"
  };
  scenario.evidence_status.outcome_evidence_review_state =
    reviewStateByPath[focus.evidencePath];
  scenario.evidence_status.source_coverage.assumptions = focus.assumptions.every(
    (assumption) => assumption.state === "PRESENT"
  )
    ? "PRESENT"
    : "CAVEATED";
  scenario.metric_models = focus.metrics.map((metric) => ({
    metric_id: metric.id,
    name: metric.name,
    value_route: metric.route,
    measurement_unit: metric.unit,
    source_system: {
      source_type: metric.sourceType,
      source_name: metric.sourceName,
      approved_grain: "aggregate_workflow_window"
    },
    baseline_rule:
      "Compare against an approved pre-period window for the same workflow family.",
    comparison_rule:
      "Compare against the approved post-period window; report directional movement only.",
    formula_template: "aggregate comparison only; customer computes directional delta",
    allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
    value_model_role: metric.role
  }));
  scenario.customer_owned_assumptions = focus.assumptions.map((assumption) => ({
    ...assumption
  }));
  const allMetricIds = focus.metrics.map((metric) => metric.id);
  scenario.scenario_bands = [
    {
      band: "CONSERVATIVE",
      interpretation: "Use the narrowest customer-owned assumption set.",
      included_metric_ids: [allMetricIds[0]]
    },
    {
      band: "BASE_CASE",
      interpretation: "Use approved baseline and comparison windows with current caveats.",
      included_metric_ids: allMetricIds
    },
    {
      band: "EXPANDED",
      interpretation: "Use only after customer assumptions and outcome evidence are accepted.",
      included_metric_ids: allMetricIds
    }
  ];
  return scenario;
}

function buildDataBoundary(args) {
  const boundary = clone(dataBoundaryTemplate);
  boundary.contract_id = "data_boundary_northstar_enterprise_roi_evidence_v1";
  return boundary;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const totalHeadcount = ORG_FUNCTIONS.reduce((sum, f) => sum + headcountOf(f), 0);
  console.log(
    `Seeding Northstar Enterprise (${totalHeadcount} employees, ${ORG_FUNCTIONS.length} functions) into ${args.base} for org ${args.org}`
  );

  // Org-wide context: engagement (all objectives) + data boundary contract.
  const engagement = buildEngagement(args);
  await putObject(args, "engagement", "engagement_id", engagement);
  console.log(`  OK engagement ${engagement.engagement_id} (${engagement.business_objectives.length} objectives)`);

  const dataBoundary = buildDataBoundary(args);
  await putObject(args, "data_boundary", "contract_id", dataBoundary);
  console.log(`  OK data_boundary ${dataBoundary.contract_id}`);

  // Fluency baselines for every function — the org-wide capability map.
  const baselineIds = {};
  for (const orgFunction of ORG_FUNCTIONS) {
    const baseline = buildFluencyBaseline(args, orgFunction);
    baselineIds[orgFunction.key] = await putObject(
      args,
      "fluency_baseline",
      "baseline_id",
      baseline
    );
    const suppressed = baseline.cohorts.filter((cohort) => cohort.suppressed).length;
    console.log(
      `  OK fluency_baseline ${baseline.baseline_id} (${baseline.cohorts.length} cohorts, ${suppressed} suppressed)`
    );
  }

  // Full chain per focus function.
  const summary = [];
  for (const focus of FOCUS_FUNCTIONS) {
    const orgFunction = ORG_FUNCTIONS.find((f) => f.key === focus.functionKey);
    console.log(`\n  == ${orgFunction.label}: ${focus.workflowName} (${focus.evidencePath}) ==`);

    const blueprint = buildBlueprint(args, focus, orgFunction);
    const blueprintId = await putObject(args, "blueprint", "blueprint_id", blueprint);
    console.log(`    OK blueprint ${blueprintId}`);

    const metricsLibrary = buildMetricsLibrary(focus);
    const metricsLibraryId = await putObject(args, "metrics_library", "library_id", metricsLibrary);
    console.log(`    OK metrics_library ${metricsLibraryId} (${metricsLibrary.metrics.length} metrics)`);

    let exportId = null;
    if (focus.evidencePath !== "NONE") {
      const outcomeExport = buildOutcomeExport(args, focus, orgFunction);
      exportId = await putObject(args, "outcome_evidence_export", "export_id", outcomeExport);
      console.log(`    OK outcome_evidence_export ${exportId} (SUBMITTED)`);
      if (focus.evidencePath.startsWith("ACCEPTED") || focus.evidencePath === "REJECTED") {
        const decision = focus.evidencePath === "REJECTED" ? "REJECTED" : "ACCEPTED";
        const review = await api(
          args,
          "POST",
          `/api/v1/ai-value/objects/outcome_evidence_export/${encodeURIComponent(exportId)}/review`,
          { decision }
        );
        if (review.ok) console.log(`    OK review ${decision}`);
        else if (review.status === 409) console.log(`    - review already terminal`);
        else fail(`review ${exportId}`, review);
      }
    } else {
      console.log("    - no outcome evidence yet (held by design)");
    }

    const run = await api(args, "POST", "/api/v1/ai-value/value-chain/run", {
      blueprint_id: blueprintId,
      metrics_library_id: metricsLibraryId,
      engagement_id: engagement.engagement_id,
      fluency_baseline_id: baselineIds[focus.functionKey],
      outcome_evidence_export_id: exportId ?? undefined
    });
    if (!run.ok) fail(`value-chain/run ${focus.workflowFamily}`, run);
    const persisted = run.payload?.persisted ?? [];
    const persistedIds = Object.fromEntries(
      persisted.map((obj) => [obj.object_type, obj.object_id])
    );
    console.log(
      `    OK value chain (decision ${run.payload?.run?.decision ?? "UNKNOWN"}, ${persisted.length} derived objects)`
    );

    const roiScenario = buildRoiScenario(focus, {
      blueprintId,
      metricsLibraryId,
      valueScenarioId: persistedIds.value_scenario ?? `scenario_${focus.workflowFamily}_v1`,
      readinessId: persistedIds.evidence_readiness ?? `readiness_${focus.workflowFamily}_v1`
    });
    const roiScenarioId = await putObject(args, "roi_scenario", "roi_scenario_id", roiScenario);
    console.log(`    OK roi_scenario ${roiScenarioId}`);

    const improvementLoop = buildValueImprovementLoopFromRoiScenario(roiScenario, {
      improvementLoopId: `improvement_loop_${focus.workflowFamily}_v1`,
      valueTargetStatus:
        focus.evidencePath === "ACCEPTED_SUPPORTED" ? "IMPROVING" : "NOT_IMPROVING",
      fluencyReadiness: focus.vbd.fluencyReadiness,
      velocityStatus: focus.vbd.velocityStatus,
      breadthStatus: focus.vbd.breadthStatus,
      depthStatus: focus.vbd.depthStatus,
      evidenceConfidence: focus.vbd.evidenceConfidence
    });
    const loopValidation = validateValueImprovementLoop(improvementLoop);
    if (!loopValidation.valid) {
      fail(`improvement loop build ${focus.workflowFamily}`, {
        status: 422,
        payload: loopValidation
      });
    }
    const improvementLoopId = await putObject(
      args,
      "value_improvement_loop",
      "improvement_loop_id",
      improvementLoop
    );
    console.log(`    OK value_improvement_loop ${improvementLoopId}`);

    const readinessId = persistedIds.evidence_readiness;
    if (!readinessId) {
      fail(`evidence_readiness missing from value-chain run for ${focus.workflowFamily}`, {
        status: 500,
        payload: run.payload
      });
    }
    const assemble = await api(args, "POST", "/api/v1/ai-value/evidence-case/assemble", {
      data_boundary_contract_id: dataBoundary.contract_id,
      roi_scenario_id: roiScenarioId,
      readiness_id: readinessId,
      outcome_export_id: exportId ?? undefined,
      improvement_loop_id: improvementLoopId,
      case_id: `value_evidence_case_${focus.workflowFamily}_v1`,
      engagement_label: `Northstar Enterprise ${orgFunction.label} value engagement`,
      function_area: orgFunction.label
    });
    if (!assemble.ok) fail(`evidence-case/assemble ${focus.workflowFamily}`, assemble);
    const evidenceCase = assemble.payload?.payload ?? {};
    console.log(
      `    OK value_evidence_case ${assemble.payload?.object_id} -> ${evidenceCase.evidence_quality?.evidence_level} / ${evidenceCase.safe_value_language?.allowed_claim_level}`
    );

    summary.push({
      function: orgFunction.label,
      headcount: headcountOf(orgFunction),
      workflow: focus.workflowName,
      review: evidenceCase.outcome_evidence_status?.review_state,
      evidence: evidenceCase.evidence_quality?.evidence_level,
      claim: evidenceCase.safe_value_language?.allowed_claim_level
    });
  }

  console.log("\nEvidence ladder across the seeded enterprise:");
  for (const row of summary) {
    console.log(
      `  ${row.function.padEnd(18)} ${String(row.headcount).padStart(5)} ppl  ${String(row.review).padEnd(10)} -> ${String(row.evidence).padEnd(12)} (${row.claim})`
    );
  }
  console.log(
    `\nDone. ${totalHeadcount} employees simulated upstream; only aggregates crossed the boundary.`
  );
  console.log(`Open the workspace with org ${args.org}.`);
}

main().catch((error) => {
  console.error(`\nx Enterprise seeder error: ${error.message}`);
  console.error(
    "Is the backend running with DEV_HEADER_AUTH=true? (npm run dev --workspace backend)"
  );
  process.exit(1);
});
