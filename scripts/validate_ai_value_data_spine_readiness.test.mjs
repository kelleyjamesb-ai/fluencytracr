import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_DATA_SPINE_READINESS_SCHEMA_VERSION,
  buildDataSpineIntakeReadiness,
  validateDataSpineIntakeReadiness
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-data-spine-readiness/examples";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function source(overrides = {}) {
  return {
    state: "present",
    intake_mode: "structured_object",
    source_ref: "source_ref_default",
    org_id: "org_northstar",
    client_id: "client_northstar",
    workflow_family: "campaign_brief_to_launch",
    function_area: "marketing",
    cohort_key: "function:marketing|eligible_seats:240",
    baseline_window: {
      window_start: "2026-06-01",
      window_end: "2026-06-30"
    },
    comparison_window: {
      window_start: "2026-09-01",
      window_end: "2026-09-30"
    },
    owner_approval_state: "approved",
    review_state: "clear",
    aggregate_only: true,
    ...overrides
  };
}

function baseInput(overrides = {}) {
  return {
    orgId: "org_northstar",
    clientId: "client_northstar",
    workflowFamily: "campaign_brief_to_launch",
    functionArea: "marketing",
    cohortKey: "function:marketing|eligible_seats:240",
    baselineWindow: {
      window_start: "2026-06-01",
      window_end: "2026-06-30"
    },
    comparisonWindow: {
      window_start: "2026-09-01",
      window_end: "2026-09-30"
    },
    sources: {
      blueprint: source({
        intake_mode: "blueprint_document_upload",
        source_ref: "blueprint_parse_approved_2026_q3"
      }),
      aiFluency: source({
        intake_mode: "ai_fluency_dashboard_export",
        source_ref: "ai_fluency_client_northstar_day_90"
      }),
      vbdToken: source({
        intake_mode: "scrubbed_glean_bigquery_export",
        source_ref: "scrubbed_glean_vbd_token_day_90",
        connector_status: "scrubbed_export_only"
      }),
      customerMetric: source({
        intake_mode: "manual_customer_metric_entry",
        source_ref: "customer_metric_campaign_cycle_day_90",
        metric_id: "marketing_campaign_cycle_days"
      }),
      assumption: source({
        intake_mode: "assumption_approval",
        source_ref: "finance_assumption_approval_day_90"
      }),
      governance: source({
        intake_mode: "governance_attestation",
        source_ref: "governance_attestation_day_90"
      })
    },
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  };
}

test("aligned approved data spine can feed Measurement Cell and packet preparation", () => {
  const spine = buildDataSpineIntakeReadiness(baseInput());
  const result = validateDataSpineIntakeReadiness(spine);

  assert.equal(spine.schema_version, AI_VALUE_DATA_SPINE_READINESS_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(spine.readiness_state, "MEASUREMENT_CELL_READY");
  assert.equal(spine.feeds.measurement_cell_input, true);
  assert.equal(spine.feeds.value_hypothesis_packet_runner, true);
  assert.equal(spine.feeds.customer_facing_financial_output, false);
  assert.equal(spine.source_readiness.vbd_token.connector_status, "scrubbed_export_only");
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(spine.blocked_uses.includes(use), `missing blocked use ${use}`);
  }
});

test("contract examples validate", () => {
  for (const file of [
    "aligned-measurement-cell-ready.json",
    "blueprint-approval-held.json"
  ]) {
    const spine = readJson(`${EXAMPLES}/${file}`);
    const result = validateDataSpineIntakeReadiness(spine);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
    assert.equal(result.feeds.customer_facing_financial_output, false);
  }
});

test("Blueprint pending approval blocks Measurement Cell preparation", () => {
  const input = baseInput();
  input.sources.blueprint.state = "pending_approval";
  input.sources.blueprint.owner_approval_state = "submitted";
  const spine = buildDataSpineIntakeReadiness(input);
  const result = validateDataSpineIntakeReadiness(spine);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(spine.readiness_state, "INTAKE_REVIEW_READY");
  assert.equal(spine.feeds.measurement_cell_input, false);
  assert.ok(spine.missing_evidence.includes("BLUEPRINT_APPROVAL_REQUIRED"));
  assert.ok(spine.next_actions.includes("Approve parsed Blueprint extraction before Measurement Cell assembly."));
});

test("AI Fluency client or org mismatch fails closed", () => {
  const input = baseInput();
  input.sources.aiFluency.client_id = "client_other";
  input.sources.aiFluency.org_id = "org_other";
  const spine = buildDataSpineIntakeReadiness(input);
  const result = validateDataSpineIntakeReadiness(spine);

  assert.equal(result.valid, false);
  assert.equal(spine.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("ai_fluency.client_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("ai_fluency.org_id")));
});

test("manual customer metric entry can align when approved and window-bound", () => {
  const input = baseInput();
  input.sources.customerMetric.intake_mode = "manual_customer_metric_entry";
  input.sources.customerMetric.owner_approval_state = "approved";
  input.sources.customerMetric.metric_id = "marketing_campaign_cycle_days";
  const spine = buildDataSpineIntakeReadiness(input);
  const result = validateDataSpineIntakeReadiness(spine);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(spine.source_readiness.customer_metric.intake_mode, "manual_customer_metric_entry");
  assert.equal(spine.source_readiness.customer_metric.aligned, true);
  assert.equal(spine.feeds.measurement_cell_input, true);
});

test("missing VBD token aggregate does not get rescued by other sources", () => {
  const input = baseInput();
  input.sources.vbdToken.state = "missing";
  input.sources.vbdToken.source_ref = null;
  const spine = buildDataSpineIntakeReadiness(input);
  const result = validateDataSpineIntakeReadiness(spine);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(spine.readiness_state, "INTAKE_REVIEW_READY");
  assert.equal(spine.feeds.measurement_cell_input, false);
  assert.ok(spine.missing_evidence.includes("VBD_TOKEN_AGGREGATE_REQUIRED"));
});

test("unsafe raw, person, connector, confidence, and financial fields fail", () => {
  const spine = buildDataSpineIntakeReadiness(baseInput());
  spine.raw_rows = [{ user_id: "u_123" }];
  spine.source_readiness.ai_fluency.respondent_email = "person@example.com";
  spine.source_readiness.vbd_token.bigquery_sql = "select * from raw_events";
  spine.confidence_percentage = 87;
  spine.financial_output = true;
  spine.backend_route = "/api/data-spine";

  const result = validateDataSpineIntakeReadiness(spine);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("respondent_email")));
  assert.ok(result.gaps.some((gap) => gap.includes("bigquery_sql")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_output")));
  assert.ok(result.gaps.some((gap) => gap.includes("backend_route")));
});
