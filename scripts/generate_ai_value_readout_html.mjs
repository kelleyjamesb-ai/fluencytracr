#!/usr/bin/env node
// Executive readout exporter.
//
// Composes a sponsor-ready, self-contained HTML readout from validated AI
// value objects: the executive packet, plus optional engagement context and
// an aggregate fluency kickoff baseline. Fail-closed: every input is
// validated through the AI Value Engine before rendering, and the readout
// always renders the claim state, required caveats, and blocked claims —
// they are part of the document, not optional styling.
//
// Run `npm run build --workspace shared` first.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateExecutivePacket,
  validateEngagement,
  validateFluencyBaseline,
  summarizeFluencyBaseline
} from "../shared/dist/aiValueEngine/index.js";

const DEFAULT_PACKET =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json";
const DEFAULT_ENGAGEMENT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-engagement.json";
const DEFAULT_BASELINE =
  "docs/contracts/ai-value-intelligence/examples/customer-support-fluency-baseline.json";
const DEFAULT_OUTPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-readout.html";

const DECISION_LABELS = {
  READY_FOR_EXECUTIVE_VALIDATION: "Ready for sponsor validation",
  HOLD_FOR_ASSUMPTIONS: "Needs client assumptions before validation",
  HOLD_FOR_SOURCE_COVERAGE: "Needs evidence sources before validation",
  HOLD_FOR_BASELINE: "Needs a baseline window before validation",
  STOP_FOR_GOVERNANCE_REVIEW: "Paused for governance review"
};

const CLAIM_STATE_LABELS = {
  CAVEATED: "Shareable with the caveats below",
  INTERNAL_ONLY: "Internal planning only",
  MISSING: "Not shareable yet",
  BLOCKED: "Not shareable yet"
};

const BLOCKED_CLAIM_LABELS = {
  roi_proof: "Proven ROI",
  causality_claim: "AI caused the improvement",
  individual_scoring: "Individual performance scoring",
  team_or_manager_ranking: "Team or org comparisons",
  hr_analytics: "People analytics",
  productivity_measurement: "Productivity measurement",
  realized_roi_calculation: "Realized ROI math",
  customer_facing_economic_output: "Customer-facing economic figures",
  dashboard_or_runtime_implementation: "Always-on dashboarding"
};

const CONSTRUCT_LABELS = {
  confidence: "Confidence",
  usage_quality: "Usage quality",
  behavior_change: "Behavior change",
  leadership_reinforcement: "Leadership reinforcement",
  capability_growth: "Capability growth",
  ai_attitude: "AI attitude",
  behavioral_intent: "Intent to use AI more",
  perceived_ai_impact: "Perceived AI impact"
};

function parseArgs(argv) {
  const args = {
    packet: DEFAULT_PACKET,
    engagement: DEFAULT_ENGAGEMENT,
    baseline: DEFAULT_BASELINE,
    output: DEFAULT_OUTPUT,
    noEngagement: false,
    noBaseline: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      return argv[i];
    };
    if (arg === "--packet") args.packet = next();
    else if (arg === "--engagement") args.engagement = next();
    else if (arg === "--baseline") args.baseline = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--no-engagement") args.noEngagement = true;
    else if (arg === "--no-baseline") args.noBaseline = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_ai_value_readout_html.mjs [--packet path] [--engagement path|--no-engagement] [--baseline path|--no-baseline] [--output path]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const list = (items) =>
  (items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const DIRECTION_LABELS = {
  IMPROVE: "Improve",
  REDUCE: "Reduce",
  MAINTAIN: "Hold steady"
};

function engagementSection(engagement) {
  if (!engagement) return "";
  const client = engagement.client ?? {};
  const objectives = Array.isArray(engagement.business_objectives)
    ? engagement.business_objectives
    : engagement.business_objective
      ? [engagement.business_objective]
      : [];
  const objectiveBlocks = objectives
    .map((objective) => {
      const measures = (objective.success_measures ?? [])
        .map(
          (entry) =>
            `<li>${escapeHtml(entry.measure)} &mdash; ${escapeHtml(
              DIRECTION_LABELS[entry.expected_direction] ?? "Review"
            )}</li>`
        )
        .join("");
      return `
      <div class="band">
        <h4>${escapeHtml(objective.objective_statement)}</h4>
        <p>${escapeHtml(objective.positive_business_outcome)}</p>
        <p class="muted">Owner: ${escapeHtml(String(objective.owner_role ?? "").replace(/_/g, " "))} &middot; Decision: ${escapeHtml(String(objective.decision_timeline ?? "").replace(/_/g, " "))}</p>
        ${measures ? `<p><strong>The value review will measure:</strong></p><ul>${measures}</ul>` : ""}
      </div>`;
    })
    .join("");
  return `
  <section>
    <h2>Client objectives and the value review</h2>
    <p class="lead">${escapeHtml(client.client_name)} &mdash; ${escapeHtml(String(objectives.length))} objective${objectives.length === 1 ? "" : "s"} anchor this engagement. Every future value conversation is held against the measures below.</p>
    ${objectiveBlocks}
  </section>`;
}

function fluencySection(summary) {
  if (!summary) return "";
  const rows = Object.entries(summary.construct_means ?? {})
    .map(
      ([construct, mean]) =>
        `<tr><td>${escapeHtml(CONSTRUCT_LABELS[construct] ?? construct)}</td><td>${escapeHtml(
          mean
        )} / 5</td></tr>`
    )
    .join("");
  const withheld =
    summary.suppressed_cohorts > 0
      ? `<p class="muted">${escapeHtml(summary.suppressed_cohorts)} small group(s) withheld to protect privacy.</p>`
      : "";
  return `
  <section>
    <h2>Where the team started: AI fluency at kickoff</h2>
    <p>${escapeHtml(summary.total_respondents)} participants across ${escapeHtml(
      summary.reported_cohorts
    )} groups completed the fluency check (${escapeHtml(summary.window)}).</p>
    <table>${rows}</table>
    ${withheld}
    <p class="muted">${escapeHtml(summary.interpretation)}</p>
  </section>`;
}

const stripTrailingSpaces = (html) =>
  html.split("\n").map((line) => line.replace(/\s+$/, "")).join("\n");

export function renderExecutiveReadoutHtml({ packet, engagement, fluencySummary }) {
  const sections = packet.sections;
  const decisionLabel = DECISION_LABELS[packet.decision] ?? packet.decision;
  const claimLabel = CLAIM_STATE_LABELS[packet.claim_state] ?? packet.claim_state;
  const metrics = sections.metrics
    .map(
      (metric) =>
        `<tr><td>${escapeHtml(metric.name)}</td><td>${escapeHtml(metric.measurement_unit)}</td><td>${escapeHtml(
          String(metric.owner ?? "").replace(/_/g, " ")
        )}</td></tr>`
    )
    .join("");
  const bands = (sections.scenario.bands ?? [])
    .map(
      (band) =>
        `<div class="band"><h4>${escapeHtml(
          { CONSERVATIVE: "Most cautious", BASE_CASE: "Working case", EXPANDED: "Expansion case" }[band.band] ??
            band.band
        )}</h4><p>${escapeHtml(band.interpretation)}</p></div>`
    )
    .join("");
  const blocked = (sections.claim_boundary.blocked_claims ?? [])
    .map(
      (claim) => `<span class="chip">${escapeHtml(BLOCKED_CLAIM_LABELS[claim] ?? claim)}</span>`
    )
    .join("");

  return stripTrailingSpaces(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(packet.workflow_name)} — AI value readout</title>
<style>
  html { background: #eef1f6; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #11182e; background: #ffffff; max-width: 880px; margin: 24px auto; padding: 32px 36px 48px; line-height: 1.5; border-radius: 10px; }
  h1 { font-size: 26px; margin: 0; }
  h2 { font-size: 17px; margin: 28px 0 8px; border-bottom: 1px solid #d6dcea; padding-bottom: 4px; }
  h4 { margin: 0 0 4px; font-size: 13.5px; }
  p { margin: 6px 0; font-size: 14px; }
  .lead { font-size: 15px; }
  .muted { color: #4b5670; font-size: 12.5px; }
  .banner { background: #fff4e0; border: 1px solid #e8930c; border-radius: 8px; padding: 10px 14px; font-size: 13.5px; margin: 18px 0; }
  .statusrow { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
  .pill { border: 1px solid #d6dcea; border-radius: 999px; padding: 4px 12px; font-size: 12.5px; }
  .pill.warn { background: #fff4e0; border-color: #e8930c; }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 8px 0; }
  td { border-bottom: 1px solid #e7ebf3; padding: 6px 8px 6px 0; }
  ul { margin: 6px 0; padding-left: 20px; font-size: 13.5px; }
  .bands { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
  .band { border: 1px solid #d6dcea; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
  .chip { display: inline-block; background: #fcebeb; color: #791f1f; border-radius: 999px; padding: 3px 10px; font-size: 12px; margin: 2px 4px 2px 0; }
  footer { margin-top: 32px; border-top: 1px solid #d6dcea; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <header>
    <p class="muted">AI value validation readout</p>
    <h1>${escapeHtml(packet.workflow_name)}</h1>
    <div class="statusrow">
      <span class="pill warn">${escapeHtml(decisionLabel)}</span>
      <span class="pill">${escapeHtml(claimLabel)}</span>
    </div>
    <div class="banner"><strong>Pre-ROI planning artifact.</strong> This readout presents modeled, directional value signals under stated caveats. It is not realized ROI, does not establish causality, and never reflects individual performance.</div>
  </header>
  ${engagementSection(engagement)}
  <section>
    <h2>Workflow and hypothesis</h2>
    <p class="lead">${escapeHtml(sections.workflow.hypothesis)}</p>
    <div class="bands">
      <div class="band"><h4>Today</h4><ul>${list(sections.workflow.current_state_steps)}</ul></div>
      <div class="band"><h4>Target workflow</h4><ul>${list(sections.workflow.future_state_steps)}</ul></div>
    </div>
  </section>
  ${fluencySection(fluencySummary)}
  <section>
    <h2>Value signals to validate</h2>
    <table><tr><td><strong>Signal</strong></td><td><strong>Unit</strong></td><td><strong>Owner</strong></td></tr>${metrics}</table>
  </section>
  <section>
    <h2>Value story options</h2>
    <div class="bands">${bands}</div>
    <p class="muted">Scenario bands are planning ranges only. They are not realized ROI.</p>
  </section>
  <section>
    <h2>Readiness decision</h2>
    <p><strong>${escapeHtml(decisionLabel)}</strong></p>
    <ul>${list(sections.readiness.rationale)}</ul>
  </section>
  <section>
    <h2>What we can say</h2>
    <ul>${list(sections.claim_boundary.safe_claims)}</ul>
    <h2>Required caveats</h2>
    <ul>${list(sections.claim_boundary.required_caveats)}</ul>
    <h2>What this readout never claims</h2>
    <div>${blocked}</div>
  </section>
  <section>
    <h2>Next actions</h2>
    <ul>${list(sections.next_actions)}</ul>
  </section>
  <footer>
    <p class="muted">Generated from validated AI value objects (${escapeHtml(packet.packet_id)}). Claim governance applied; caveats are part of this document and must travel with it.</p>
  </footer>
</body>
</html>
`);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const packet = readJson(args.packet);
  const packetValidation = validateExecutivePacket(packet);
  if (!packetValidation.valid) {
    console.error("Refusing to render: executive packet failed validation:");
    for (const gap of packetValidation.gaps) console.error(`- ${gap}`);
    process.exit(1);
  }

  let engagement = null;
  if (!args.noEngagement) {
    engagement = readJson(args.engagement);
    const validation = validateEngagement(engagement);
    if (!validation.valid) {
      console.error("Refusing to render: engagement failed validation:");
      for (const gap of validation.gaps) console.error(`- ${gap}`);
      process.exit(1);
    }
  }

  let fluencySummary = null;
  if (!args.noBaseline) {
    const baseline = readJson(args.baseline);
    const validation = validateFluencyBaseline(baseline);
    if (!validation.valid) {
      console.error("Refusing to render: fluency baseline failed validation:");
      for (const gap of validation.gaps) console.error(`- ${gap}`);
      process.exit(1);
    }
    fluencySummary = summarizeFluencyBaseline(baseline);
  }

  const html = renderExecutiveReadoutHtml({ packet, engagement, fluencySummary });
  const outputPath = resolve(process.cwd(), args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, "utf8");
  console.log(`Wrote ${args.output}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
