/**
 * AI Value Engine — executive readout HTML renderer.
 *
 * Deterministic generation of the sponsor-ready readout document from
 * validated objects. Claim governance is rendered into the document: the
 * value-readiness banner, required caveats, and blocked claims are structural.
 * Callers must validate inputs through the engine before rendering.
 */

import { getAiValueDisplayLabel, getAiValueDisplayLabels } from "./language";

const DECISION_LABELS: Record<string, string> = {
  READY_FOR_EXECUTIVE_VALIDATION: "Ready for sponsor validation",
  HOLD_FOR_ASSUMPTIONS: "Needs client assumptions before validation",
  HOLD_FOR_SOURCE_COVERAGE: "Needs evidence sources before validation",
  HOLD_FOR_BASELINE: "Needs a baseline window before validation",
  STOP_FOR_GOVERNANCE_REVIEW: "Paused for governance review"
};

const CLAIM_STATE_LABELS: Record<string, string> = {
  CAVEATED: "Shareable with the caveats below",
  INTERNAL_ONLY: "Internal planning only",
  MISSING: "Not shareable yet",
  BLOCKED: "Not shareable yet"
};

const BLOCKED_CLAIM_LABELS: Record<string, string> = {
  roi_proof: "Proven ROI",
  causality_claim: "AI caused the improvement",
  individual_scoring: "Individual performance scoring",
  team_or_manager_ranking: "Team or org comparisons",
  hr_analytics: "Individual-level people analytics",
  productivity_measurement: "Productivity measurement",
  realized_roi_calculation: "Value Accounting",
  customer_facing_economic_output: "Customer-Facing Value Evidence",
  dashboard_or_runtime_implementation: "Always-on dashboarding"
};

const CONSTRUCT_LABELS: Record<string, string> = {
  confidence: "Confidence",
  usage_quality: "Usage quality",
  behavior_change: "Behavior change",
  leadership_reinforcement: "Leadership reinforcement",
  capability_growth: "Capability growth",
  ai_attitude: "AI attitude",
  behavioral_intent: "Intent to use AI more",
  perceived_ai_impact: "Perceived AI impact"
};


function escapeHtml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const list = (items: any) =>
  (items ?? []).map((item: any) => `<li>${escapeHtml(item)}</li>`).join("");

const DIRECTION_LABELS: Record<string, string> = {
  IMPROVE: "Improve",
  REDUCE: "Reduce",
  MAINTAIN: "Hold steady"
};

export type ExecutiveReadoutEvidenceReviewState =
  | "MISSING"
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED";

export interface ExecutiveReadoutEvidenceReview {
  reviewState?: string | null;
  metricNames?: string[] | null;
  sourceSystemName?: string | null;
  approvedGrain?: string | null;
  baselineWindow?: string | null;
  comparisonWindow?: string | null;
  reviewerRole?: string | null;
  dataOwner?: string | null;
}

function engagementSection(engagement: any): string {
  if (!engagement) return "";
  const client = engagement.client ?? {};
  const objectives = Array.isArray(engagement.business_objectives)
    ? engagement.business_objectives
    : engagement.business_objective
      ? [engagement.business_objective]
      : [];
  const objectiveBlocks = objectives
    .map((objective: any) => {
      const measures = (objective.success_measures ?? [])
        .map(
          (entry: any) =>
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

function fluencySection(summary: any): string {
  if (!summary) return "";
  const rows = Object.entries(summary.construct_means ?? {})
    .map(
      ([construct, mean]: [string, any]) =>
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

const humanize = (value: unknown): string =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function normalizeEvidenceReviewState(
  value: unknown
): ExecutiveReadoutEvidenceReviewState {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "ACCEPTED") return "ACCEPTED";
  if (normalized === "SUBMITTED") return "SUBMITTED";
  if (normalized === "REJECTED") return "REJECTED";
  return "MISSING";
}

function evidenceReviewCopy(
  review: ExecutiveReadoutEvidenceReview | null | undefined
): {
  status: string;
  sponsorDecision: string;
  nextAction: string;
  caveat: string;
} {
  const state = normalizeEvidenceReviewState(review?.reviewState);
  const owner = humanize(review?.dataOwner) || "the data owner";
  const reviewer = humanize(review?.reviewerRole) || "the reviewer";

  if (state === "ACCEPTED") {
    return {
      status: "Customer export accepted for caveated review",
      sponsorDecision:
        "Decide whether the accepted evidence is ready for a caveated sponsor readout, expansion planning, or a hold for stronger assumptions.",
      nextAction:
        "Prepare the caveated sponsor readout with accepted evidence, customer assumptions, and blocked value language attached.",
      caveat:
        "Accepted aggregate evidence supports only caveated value review. It is not ROI proof and does not establish causality."
    };
  }

  if (state === "SUBMITTED") {
    return {
      status: "Customer export awaiting review",
      sponsorDecision:
        "Hold stronger value language until the submitted customer export is accepted or rejected.",
      nextAction: `Review is pending with ${reviewer}; have them check the submitted aggregate export against the requested metric, source, approved grain, and windows.`,
      caveat: "Submission alone does not support ROI or causality claims."
    };
  }

  if (state === "REJECTED") {
    return {
      status: "Customer export needs correction",
      sponsorDecision:
        "Keep stronger value language blocked until corrected aggregate evidence is accepted.",
      nextAction: `Request a corrected aggregate export from ${owner}.`,
      caveat: "Rejected evidence stays out of the value story."
    };
  }

  return {
    status: "Customer outcome evidence needed",
    sponsorDecision:
      "Hold stronger value language until a customer-owned aggregate export is submitted and reviewed.",
    nextAction: `Ask the data owner for the approved aggregate export for the selected value metric.${owner === "the data owner" ? "" : ` Owner: ${owner}.`}`,
    caveat:
      "Stronger value language stays held until source, window, and metric evidence are attached."
  };
}

function evidenceReviewSection(
  review: ExecutiveReadoutEvidenceReview | null | undefined
): string {
  const copy = evidenceReviewCopy(review);
  const details = [
    Array.isArray(review?.metricNames) && review?.metricNames.length
      ? `Metric(s): ${review.metricNames.join(", ")}`
      : null,
    review?.sourceSystemName ? `Source: ${review.sourceSystemName}` : null,
    review?.approvedGrain ? `Approved export level: ${humanize(review.approvedGrain)}` : null,
    review?.baselineWindow && review?.comparisonWindow
      ? `Windows: ${review.baselineWindow} compared with ${review.comparisonWindow}`
      : null
  ].filter(Boolean);

  const detailList = details.length
    ? `<ul>${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>`
    : "";

  return `
  <section>
    <h2>Evidence Collection</h2>
    <div class="band">
      <h4>${escapeHtml(copy.status)}</h4>
      <p><strong>Sponsor decision:</strong> ${escapeHtml(copy.sponsorDecision)}</p>
      <p><strong>Next action:</strong> ${escapeHtml(copy.nextAction)}</p>
      <p class="muted">${escapeHtml(copy.caveat)}</p>
      ${detailList}
    </div>
  </section>`;
}

function ebitaImpactSection(summary: any): string {
  if (!summary) return "";
  const realizedLine = summary.realized_ebita_claim_allowed
    ? "Realized financial language is allowed only within the finance-validated workflow and window."
    : "No realized financial claim is allowed.";
  const customerFacingLine = summary.customer_facing_allowed
    ? "Customer-facing economic language is approved for the stated scope."
    : "Customer-facing economic language is not approved.";
  const causalityLine = summary.causality_claim_allowed
    ? "Causality language is approved by the evidence design."
    : "Causality language is not approved.";
  const evidenceRows = Object.entries(summary.evidence_quality ?? {})
    .map(
      ([field, value]) =>
        `<tr><td>${escapeHtml(getAiValueDisplayLabel(field))}</td><td>${escapeHtml(
          getAiValueDisplayLabel(value)
        )}</td></tr>`
    )
    .join("");
  const blocked = (summary.blocked_claims ?? [])
    .map((claim: any) => `<span class="chip">${escapeHtml(getAiValueDisplayLabel(claim))}</span>`)
    .join("");
  return `
  <section>
    <h2>Financial Translation</h2>
    <div class="band">
      <h4>${escapeHtml(getAiValueDisplayLabel(summary.status))}</h4>
      <p>${escapeHtml(realizedLine)}</p>
      <p>${escapeHtml(customerFacingLine)}</p>
      <p>${escapeHtml(causalityLine)}</p>
    </div>
    <div class="bands">
      <div class="band"><h4>Primary financial levers</h4><ul>${list(getAiValueDisplayLabels(summary.primary_ebita_levers))}</ul></div>
      <div class="band"><h4>Allowed language</h4><ul>${list(summary.allowed_phrases)}</ul></div>
      <div class="band"><h4>Required caveats</h4><ul>${list(summary.required_caveats)}</ul></div>
      <div class="band"><h4>Next evidence actions</h4><ul>${list(summary.next_evidence_actions)}</ul></div>
    </div>
    <table><tr><td><strong>Evidence</strong></td><td><strong>Quality</strong></td></tr>${evidenceRows}</table>
    <p><strong>Blocked claims</strong></p>
    <div>${blocked}</div>
  </section>`;
}

const stripTrailingSpaces = (html: string): string =>
  html.split("\n").map((line) => line.replace(/\s+$/, "")).join("\n");

export interface RenderExecutiveReadoutInputs {
  packet: any;
  engagement?: any | null;
  fluencySummary?: any | null;
  evidenceReview?: ExecutiveReadoutEvidenceReview | null;
}

export function renderExecutiveReadoutHtml({
  packet,
  engagement,
  fluencySummary,
  evidenceReview
}: RenderExecutiveReadoutInputs): string {
  const sections = packet.sections;
  const decisionLabel = DECISION_LABELS[packet.decision] ?? packet.decision;
  const claimLabel = CLAIM_STATE_LABELS[packet.claim_state] ?? packet.claim_state;
  const metrics = sections.metrics
    .map(
      (metric: any) =>
        `<tr><td>${escapeHtml(metric.name)}</td><td>${escapeHtml(metric.measurement_unit)}</td><td>${escapeHtml(
          String(metric.owner ?? "").replace(/_/g, " ")
        )}</td></tr>`
    )
    .join("");
  const bands = (sections.scenario.bands ?? [])
    .map(
      (band: any) =>
        `<div class="band"><h4>${escapeHtml(
          ({ CONSERVATIVE: "Most cautious", BASE_CASE: "Working case", EXPANDED: "Expansion case" } as Record<string, string>)[band.band] ??
            band.band
        )}</h4><p>${escapeHtml(band.interpretation)}</p></div>`
    )
    .join("");
  const blocked = (sections.claim_boundary.blocked_claims ?? [])
    .map(
      (claim: any) => `<span class="chip">${escapeHtml(BLOCKED_CLAIM_LABELS[claim] ?? claim)}</span>`
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
    <p class="muted">Value realization readout</p>
    <h1>${escapeHtml(packet.workflow_name)}</h1>
    <div class="statusrow">
      <span class="pill warn">${escapeHtml(decisionLabel)}</span>
      <span class="pill">${escapeHtml(claimLabel)}</span>
    </div>
    <div class="banner"><strong>Value realization planning artifact.</strong> This readout presents value evidence under stated caveats. It is not realized ROI, does not establish causality, and never reflects individual performance.</div>
  </header>
  ${engagementSection(engagement)}
  <section>
    <h2>Value hypothesis</h2>
    <p class="lead">${escapeHtml(sections.workflow.hypothesis)}</p>
    <div class="bands">
      <div class="band"><h4>Today</h4><ul>${list(sections.workflow.current_state_steps)}</ul></div>
      <div class="band"><h4>Target workflow</h4><ul>${list(sections.workflow.future_state_steps)}</ul></div>
    </div>
  </section>
  ${evidenceReviewSection(evidenceReview)}
  ${fluencySection(fluencySummary)}
  <section>
    <h2>Measurement plan</h2>
    <table><tr><td><strong>Signal</strong></td><td><strong>Unit</strong></td><td><strong>Owner</strong></td></tr>${metrics}</table>
  </section>
  <section>
    <h2>Value scenario options</h2>
    <div class="bands">${bands}</div>
    <p class="muted">Scenario bands are planning ranges only. They are not realized ROI.</p>
  </section>
  ${ebitaImpactSection(packet.ebita_impact_summary)}
  <section>
    <h2>Readiness decision</h2>
    <p><strong>${escapeHtml(decisionLabel)}</strong></p>
    <ul>${list(sections.readiness.rationale)}</ul>
  </section>
  <section>
    <h2>Value realization language</h2>
    <ul>${list(sections.claim_boundary.safe_claims)}</ul>
    <h2>Required caveats</h2>
    <ul>${list(sections.claim_boundary.required_caveats)}</ul>
    <h2>Governance boundaries</h2>
    <div>${blocked}</div>
  </section>
  <section>
    <h2>Next actions</h2>
    <ul>${list(sections.next_actions)}</ul>
  </section>
  <footer>
    <p class="muted">Generated from validated AI value packet inputs. Claim governance applied; caveats are part of this document and must travel with it.</p>
  </footer>
</body>
</html>
`);
}
