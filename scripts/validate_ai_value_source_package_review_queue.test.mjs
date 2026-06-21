import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_SCHEMA_VERSION,
  buildDataSpineIntakeReadiness,
  buildSourcePackageReviewQueue,
  validateSourcePackageReviewQueue
} from "../shared/dist/aiValueEngine/index.js";

const SOURCE_PACKAGE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const baselineWindow = {
  window_start: "2026-06-01",
  window_end: "2026-06-30"
};

const comparisonWindow = {
  window_start: "2026-09-01",
  window_end: "2026-09-30"
};

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
    baseline_window: baselineWindow,
    comparison_window: comparisonWindow,
    owner_role: "source_owner",
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
    baselineWindow,
    comparisonWindow,
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
        source_ref: "scrubbed_glean_vbd_token_day_90"
      }),
      customerMetric: source({
        intake_mode: "customer_metric_aggregate_export",
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

function sourcePackageExample(file, overrides = {}) {
  const pkg = readJson(`${SOURCE_PACKAGE_EXAMPLES}/${file}`);
  return {
    ...pkg,
    org_id: "org_northstar",
    covered_window: comparisonWindow,
    ...overrides
  };
}

function matchingSourcePackages() {
  return [
    sourcePackageExample("layer-2-user-voice-package.json", {
      source_package_id: "source_package_layer_2_ai_fluency_day_90",
      source_refs: {
        source_readiness_id: "source_readiness_ai_fluency",
        aggregate_export_id: "ai_fluency_client_northstar_day_90"
      }
    }),
    sourcePackageExample("layer-1-bigquery-telemetry-package.json", {
      source_package_id: "source_package_layer_1_vbd_token_day_90",
      source_refs: {
        source_readiness_id: "source_readiness_vbd_token",
        aggregate_probe_id: "scrubbed_glean_vbd_token_day_90",
        reportability_signal_families: [
          "assistant",
          "search_document_retrieval",
          "agent_run"
        ]
      }
    }),
    sourcePackageExample("layer-3-system-of-record-outcome-package.json", {
      source_package_id: "source_package_layer_3_customer_metric_day_90",
      source_refs: {
        source_readiness_id: "source_readiness_customer_metric",
        aggregate_outcome_export_id: "customer_metric_campaign_cycle_day_90"
      }
    }),
    sourcePackageExample("assumption-approval-package.json", {
      source_package_id: "source_package_assumption_day_90",
      source_refs: {
        source_readiness_id: "source_readiness_assumption",
        assumption_approval_export_id: "finance_assumption_approval_day_90"
      }
    }),
    sourcePackageExample("governance-control-package.json", {
      source_package_id: "source_package_governance_day_90",
      source_refs: {
        source_readiness_id: "source_readiness_governance",
        governance_control_export_id: "governance_attestation_day_90"
      }
    })
  ];
}

test("review queue summarizes held Data Spine lanes without creating Measurement Cell or finance feeds", () => {
  const input = baseInput();
  input.sources.customerMetric.state = "submitted";
  input.sources.customerMetric.owner_approval_state = "submitted";
  input.sources.customerMetric.review_state = "needs_review";
  const dataSpineReadiness = buildDataSpineIntakeReadiness(input);

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);
  const customerMetricLane = queue.lanes.find((lane) => lane.lane_key === "customer_metric");

  assert.equal(queue.schema_version, AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(queue.lanes.length, 6);
  assert.deepEqual(queue.alignment_keys, [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window"
  ]);
  assert.deepEqual(queue.readiness_checks, [
    "metric_id",
    "source_ref",
    "owner_role",
    "review_state",
    "aggregate_only",
    "source_package_validation"
  ]);
  assert.equal(customerMetricLane.source_state, "submitted");
  assert.equal(customerMetricLane.owner_approval_state, "submitted");
  assert.equal(customerMetricLane.review_state, "needs_review");
  assert.equal(customerMetricLane.data_spine_review_clear, false);
  assert.ok(customerMetricLane.gaps.includes("CUSTOMER_METRIC_REQUIRED"));
  assert.equal(queue.feeds.source_package_status_summary, true);
  assert.equal(queue.feeds.data_spine_review_context, true);
  assert.equal(queue.feeds.measurement_cell_input, false);
  assert.equal(queue.feeds.finance_context_investigation, false);
  assert.equal(queue.feeds.customer_facing_financial_output, false);
  assert.ok(queue.blocked_uses.includes("confidence_percentage"));
  assert.ok(queue.blocked_uses.includes("probability_output"));
  assert.ok(queue.blocked_uses.includes("financial_attribution"));
});

test("suppressed source package cannot upgrade an otherwise clear VBD token lane", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());
  const suppressedLayer1 = sourcePackageExample("layer-1-bigquery-telemetry-package.json", {
    source_package_id: "source_package_layer_1_suppressed",
    evidence_state: "suppressed",
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: false,
      total_slices: 12,
      k_min_clear_slices: 11,
      suppressed_or_unknown_slices: 1
    },
    caveats: [
      "Layer 1 aggregate telemetry package is suppressed because one slice did not clear k-min."
    ]
  });

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    sourcePackages: [suppressedLayer1],
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);
  const vbdTokenLane = queue.lanes.find((lane) => lane.lane_key === "vbd_token");

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(vbdTokenLane.source_state, "present");
  assert.equal(vbdTokenLane.source_package_evidence_state, "suppressed");
  assert.equal(vbdTokenLane.source_package_valid, true);
  assert.equal(vbdTokenLane.source_package_can_feed_evidence, false);
  assert.equal(vbdTokenLane.data_spine_review_clear, false);
  assert.ok(vbdTokenLane.gaps.includes("VBD_TOKEN_SOURCE_PACKAGE_NOT_FEEDABLE"));
  assert.equal(queue.feeds.measurement_cell_input, false);
  assert.equal(queue.feeds.finance_context_investigation, false);
});

test("valid but misaligned source package cannot clear a source lane", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());
  const otherOrgLayer1 = sourcePackageExample("layer-1-bigquery-telemetry-package.json", {
    source_package_id: "source_package_layer_1_other_org",
    org_id: "org_other"
  });

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    sourcePackages: [otherOrgLayer1],
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);
  const vbdTokenLane = queue.lanes.find((lane) => lane.lane_key === "vbd_token");

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(vbdTokenLane.source_package_valid, true);
  assert.equal(vbdTokenLane.source_package_alignment_clear, false);
  assert.equal(vbdTokenLane.source_package_can_feed_evidence, false);
  assert.equal(vbdTokenLane.data_spine_review_clear, false);
  assert.ok(vbdTokenLane.gaps.includes("VBD_TOKEN_SOURCE_PACKAGE_MISALIGNED"));
  assert.equal(queue.feeds.measurement_cell_input, false);
});

test("same org and window source package must still bind to lane source ref", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());
  const wrongRefLayer1 = sourcePackageExample("layer-1-bigquery-telemetry-package.json", {
    source_package_id: "source_package_layer_1_wrong_ref",
    source_refs: {
      source_readiness_id: "source_readiness_layer_1",
      aggregate_probe_id: "other_vbd_token_export"
    }
  });

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    sourcePackages: [wrongRefLayer1],
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);
  const vbdTokenLane = queue.lanes.find((lane) => lane.lane_key === "vbd_token");

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(vbdTokenLane.source_package_valid, true);
  assert.equal(vbdTokenLane.source_package_alignment_clear, false);
  assert.equal(vbdTokenLane.source_package_can_feed_evidence, false);
  assert.ok(vbdTokenLane.gaps.includes("VBD_TOKEN_SOURCE_PACKAGE_MISALIGNED"));
});

test("clear review queue requires reviewed packages and does not expose downstream Data Spine feed flags", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    sourcePackages: matchingSourcePackages(),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "DATA_SPINE_REVIEW_READY");
  assert.equal(queue.lanes.find((lane) => lane.lane_key === "ai_fluency").source_package_ids.length, 1);
  assert.equal(queue.lanes.find((lane) => lane.lane_key === "vbd_token").source_package_ids.length, 1);
  assert.equal(queue.lanes.find((lane) => lane.lane_key === "customer_metric").source_package_ids.length, 1);
  assert.equal(queue.lanes.find((lane) => lane.lane_key === "assumption").source_package_ids.length, 1);
  assert.equal(queue.lanes.find((lane) => lane.lane_key === "governance").source_package_ids.length, 1);
  assert.equal(queue.feeds.measurement_cell_input, false);
  assert.equal(queue.feeds.finance_context_investigation, false);
  assert.equal(queue.data_spine_validation_result.feeds, undefined);
});

test("package-backed lanes cannot clear queue review without matching Source Packages", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  for (const laneKey of [
    "ai_fluency",
    "vbd_token",
    "customer_metric",
    "assumption",
    "governance"
  ]) {
    const lane = queue.lanes.find((item) => item.lane_key === laneKey);
    assert.equal(lane.data_spine_review_clear, false);
    assert.ok(lane.gaps.includes(`${laneKey.toUpperCase()}_SOURCE_PACKAGE_REQUIRED`));
  }
  assert.equal(queue.feeds.measurement_cell_input, false);
  assert.equal(queue.feeds.finance_context_investigation, false);
});

test("review queue holds lanes missing readiness checklist fields", () => {
  const input = baseInput();
  input.sources.vbdToken.owner_role = "";
  input.sources.customerMetric.metric_id = "";
  const dataSpineReadiness = buildDataSpineIntakeReadiness(input);

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);
  const vbdTokenLane = queue.lanes.find((lane) => lane.lane_key === "vbd_token");
  const customerMetricLane = queue.lanes.find((lane) => lane.lane_key === "customer_metric");

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(vbdTokenLane.data_spine_review_clear, false);
  assert.equal(customerMetricLane.data_spine_review_clear, false);
  assert.ok(vbdTokenLane.gaps.includes("VBD_TOKEN_OWNER_ROLE_REQUIRED"));
  assert.ok(customerMetricLane.gaps.includes("CUSTOMER_METRIC_METRIC_ID_REQUIRED"));
});

test("blocked Data Spine context does not echo unsafe validation gap text", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());
  dataSpineReadiness.source_readiness.vbd_token.raw_rows = [{ user_id: "u_123" }];

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateSourcePackageReviewQueue(queue);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(queue.queue_state, "BLOCKED_FOR_DATA_SPINE_VALIDATION");
  assert.equal(queue.data_spine_validation_result.valid, false);
  assert.ok(queue.data_spine_validation_result.gaps.includes("DATA_SPINE_VALIDATION_GAP_1"));
  assert.ok(!JSON.stringify(queue.data_spine_validation_result).includes("raw_rows"));
});

test("held lanes cannot hide their missing-evidence gap", () => {
  const input = baseInput();
  input.sources.customerMetric.state = "submitted";
  input.sources.customerMetric.owner_approval_state = "submitted";
  input.sources.customerMetric.review_state = "needs_review";
  const dataSpineReadiness = buildDataSpineIntakeReadiness(input);

  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const customerMetricLane = queue.lanes.find((lane) => lane.lane_key === "customer_metric");
  customerMetricLane.gaps = [];
  queue.missing_evidence = [];

  const result = validateSourcePackageReviewQueue(queue);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("lanes[3].gaps missing CUSTOMER_METRIC_REQUIRED")));
});

test("review queue fails closed on unsafe output and forbidden fields", () => {
  const dataSpineReadiness = buildDataSpineIntakeReadiness(baseInput());
  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });

  queue.feeds.measurement_cell_input = true;
  queue.feeds.finance_context_investigation = true;
  queue.confidence_percentage = 87;
  queue.confidence = "high";
  queue.confidence_score = 0.87;
  queue.probability_output = 0.91;
  queue.probability_score = 0.91;
  queue.p_value = 0.01;
  queue.roi_value = 1000000;
  queue.ebitda_impact = "up";
  queue.financial_impact = "claimed";
  queue.dollarized_value = 500000;
  queue.financial_attribution = "ai_caused_metric_change";
  queue.causality_claim = true;
  queue.causal_proof = "claimed";
  queue.productivity_claim = true;
  queue.productivity_lift = 0.2;
  queue.customer_facing_economic_output = true;
  queue.customer_facing_financial_output = true;
  queue.computes_roi = true;
  queue.manager_rank = 1;
  queue.manager_score = 95;
  queue.team_rank = 2;
  queue.team_score = 88;
  queue.data_spine_validation_result.feeds = {
    measurement_cell_input: true
  };
  queue.cohort_key = "manager_email:jane@example.com";
  queue.lanes[0].source_ref = "employee_email:james@example.com";
  queue.lanes[1].source_package_ids = ["raw_prompt_export"];
  queue.next_actions.push("select * from raw_events");
  queue.required_caveats.push("raw_prompt jane@example.com");
  queue.raw_rows = [{ user_id: "u_123" }];

  const result = validateSourcePackageReviewQueue(queue);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.measurement_cell_input")));
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.finance_context_investigation")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_score")));
  assert.ok(result.gaps.some((gap) => gap.includes("probability_output")));
  assert.ok(result.gaps.some((gap) => gap.includes("probability_score")));
  assert.ok(result.gaps.some((gap) => gap.includes("p_value")));
  assert.ok(result.gaps.some((gap) => gap.includes("roi_value")));
  assert.ok(result.gaps.some((gap) => gap.includes("ebitda_impact")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_impact")));
  assert.ok(result.gaps.some((gap) => gap.includes("dollarized_value")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_attribution")));
  assert.ok(result.gaps.some((gap) => gap.includes("causality_claim")));
  assert.ok(result.gaps.some((gap) => gap.includes("causal_proof")));
  assert.ok(result.gaps.some((gap) => gap.includes("productivity_claim")));
  assert.ok(result.gaps.some((gap) => gap.includes("productivity_lift")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_facing_economic_output")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_facing_financial_output")));
  assert.ok(result.gaps.some((gap) => gap.includes("computes_roi")));
  assert.ok(result.gaps.some((gap) => gap.includes("manager_rank")));
  assert.ok(result.gaps.some((gap) => gap.includes("manager_score")));
  assert.ok(result.gaps.some((gap) => gap.includes("team_rank")));
  assert.ok(result.gaps.some((gap) => gap.includes("team_score")));
  assert.ok(result.gaps.some((gap) => gap.includes("data_spine_validation_result.feeds")));
  assert.ok(result.gaps.some((gap) => gap.includes("cohort_key")));
  assert.ok(result.gaps.some((gap) => gap.includes("lanes.0.source_ref")));
  assert.ok(result.gaps.some((gap) => gap.includes("lanes.1.source_package_ids.0")));
  assert.ok(result.gaps.some((gap) => gap.includes("next_actions.1")));
  assert.ok(result.gaps.some((gap) => gap.includes("required_caveats.3")));
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
});
