import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION,
  buildResearchPromotionReadinessPacketFromObject,
  researchPromotionPacketIntegrityHash,
  validateResearchPromotionReadinessPacket
} from "./run_ai_value_research_promotion_readiness_packet.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const CURRENT_CONTROLLED_PILOT_PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";

const REQUIRED_MILESTONES = [0, 30, 60, 90, 180, 365];

const FALSE_FEEDS = [
  "research_model_feed",
  "model_output",
  "numeric_weight_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "finance_context_investigation",
  "customer_facing_output",
  "customer_facing_export",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write"
];

const FALSE_POLICY_FIELDS = [
  "model_implementation_authorized",
  "statistical_model_selection_authorized",
  "numeric_weights_authorized",
  "durable_research_inputs_authorized",
  "model_outputs_authorized",
  "finance_context_investigation_authorized",
  "customer_facing_output_authorized",
  "customer_facing_export_authorized",
  "live_connector_execution_authorized",
  "route_creation_authorized",
  "ui_creation_authorized",
  "schema_creation_authorized",
  "persistence_write_authorized"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "raw_rows",
  "query_text",
  "sql_text",
  "prompt",
  "transcript",
  "user_id",
  "row_id",
  "span_id",
  "hashed_user_id",
  "source_packages",
  "source_package_payload",
  "operator_source_handoff_bundle",
  "measurement_cell_payload",
  "measurement_cell_series",
  "approved_expectation_paths",
  "payload_json",
  "validation_json",
  "source_refs_json",
  "blueprint_path_binding_json",
  "confidence_score"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function recompute(packet) {
  packet.packet_integrity_hash = researchPromotionPacketIntegrityHash(packet);
  return packet;
}

function validate(packet, options = {}) {
  return validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    ...options
  });
}

test("research promotion packet marks repeated governed evidence ready for internal research design only", () => {
  const fixture = readJson(FIXTURE_PATH);
  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validate(packet);
  const serialized = JSON.stringify(packet);

  assert.equal(packet.schema_version, RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.decision, "READY_FOR_INTERNAL_RESEARCH_DESIGN");
  assert.equal(packet.feeds.internal_research_design_review, true);
  assert.deepEqual(packet.milestone_coverage.required_milestones, REQUIRED_MILESTONES);
  assert.deepEqual(packet.milestone_coverage.observed_milestones, REQUIRED_MILESTONES);
  assert.deepEqual(packet.milestone_coverage.missing_milestones, []);
  assert.equal(packet.milestone_coverage.ready_windows, 6);
  assert.equal(packet.milestone_coverage.held_windows, 0);
  assert.equal(packet.milestone_coverage.suppressed_windows, 0);
  assert.equal(packet.milestone_coverage.blocked_windows, 0);
  assert.equal(packet.milestone_coverage.rolling_30_day_context_used_as_milestone, false);
  assert.equal(packet.measurement_cell_snapshot_refs.length, 6);
  assert.equal(
    packet.measurement_cell_snapshot_refs[0].snapshot_ref_source,
    "controlled_recomputed_measurement_cell_snapshot_candidate"
  );
  assert.equal(
    packet.measurement_cell_snapshot_refs[0].approved_blueprint_ref,
    packet.approved_blueprint_ref
  );
  assert.equal(
    packet.measurement_cell_snapshot_refs[0].approved_blueprint_payload_hash,
    packet.approved_blueprint_payload_hash
  );
  assert.equal(
    packet.measurement_cell_snapshot_refs[0].metric_direction,
    packet.expected_pathway_metadata.metric_direction
  );
  assert.equal(packet.measurement_cell_snapshot_refs[0].metric_unit, "hours");
  assert.equal(
    packet.measurement_cell_snapshot_refs[0].value_driver,
    packet.expected_pathway_metadata.value_driver
  );
  assert.ok(packet.series_contract_continuity_ref.contract_ref);
  assert.equal(packet.approval_state, "approved");
  assert.equal(packet.approved_blueprint_ref, "blueprint_parse_support_approved_day_30");
  assert.equal(packet.value_hypothesis_ref, "value_hypothesis_example_support_capacity");
  assert.equal(
    packet.expectation_path_id,
    "expectation_path_support_median_resolution_hours_capacity"
  );
  assert.match(packet.expectation_path_hash, /^[a-f0-9]{64}$/);
  assert.match(packet.approved_blueprint_payload_hash, /^[a-f0-9]{64}$/);
  assert.equal(packet.expected_pathway_metadata.value_driver, "Capacity");
  assert.equal(
    packet.ai_fluency_construct_context_ref.context_scope,
    "aggregate_construct_context_only"
  );
  assert.equal(
    packet.ai_fluency_psychological_context_ref.readiness_effect,
    "context_only_cannot_upgrade_or_rescue"
  );
  assert.equal(
    packet.observed_vbd_context_ref.behavior_source,
    "observed_telemetry_vbd"
  );
  assert.equal(
    packet.selected_metric_movement_ref.metric_id,
    "support_median_resolution_hours"
  );
  for (const feed of FALSE_FEEDS) {
    assert.equal(packet.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of FALSE_POLICY_FIELDS) {
    assert.equal(
      packet.research_boundary_policy[field],
      false,
      `${field} must remain false`
    );
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(packet, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT "), false);
  assert.equal(serialized.includes("raw transcript"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("customer-facing confidence"), false);
});

test("current controlled pilot research promotion packet stays source-fixture-bound", () => {
  const fixture = readJson(FIXTURE_PATH);
  const packet = readJson(CURRENT_CONTROLLED_PILOT_PACKET_PATH);
  const expected = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validate(packet);

  assert.deepEqual(packet, expected);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.decision, "READY_FOR_INTERNAL_RESEARCH_DESIGN");
  assert.equal(packet.validation_summary.valid, true);
  assert.equal(packet.feeds.internal_research_design_review, true);
  assert.equal(packet.feeds.research_model_feed, false);
  assert.equal(packet.feeds.model_output, false);
  assert.equal(packet.feeds.numeric_weight_output, false);
  assert.equal(packet.feeds.probability_output, false);
  assert.equal(packet.feeds.score_like_output, false);
  assert.equal(packet.feeds.finance_output, false);
  assert.equal(packet.feeds.customer_facing_output, false);
  assert.equal(packet.feeds.persistence_write, false);
  assert.deepEqual(packet.milestone_coverage.observed_milestones, REQUIRED_MILESTONES);
  assert.equal(packet.measurement_cell_snapshot_refs.length, REQUIRED_MILESTONES.length);
});

test("research promotion packet holds when Day 0 baseline milestone is missing", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH), {
    milestoneDays: [30, 60, 90, 180, 365]
  });
  const validation = validate(packet, {
    milestoneDays: [30, 60, 90, 180, 365]
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.decision, "HOLD_FOR_REPEATED_ALIGNED_EVIDENCE");
  assert.deepEqual(packet.milestone_coverage.missing_milestones, [0]);
  assert.equal(packet.milestone_coverage.ready_windows, 5);
  assert.equal(packet.feeds.internal_research_design_review, false);
});

test("research promotion packet holds when any required later milestone is missing", () => {
  for (const missingDay of [30, 60, 90, 180, 365]) {
    const milestoneDays = REQUIRED_MILESTONES.filter((day) => day !== missingDay);
    const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH), {
      milestoneDays
    });
    const validation = validate(packet, { milestoneDays });

    assert.equal(validation.valid, true, validation.gaps.join("; "));
    assert.equal(packet.decision, "HOLD_FOR_REPEATED_ALIGNED_EVIDENCE");
    assert.deepEqual(packet.milestone_coverage.missing_milestones, [missingDay]);
    assert.equal(packet.feeds.internal_research_design_review, false);
  }
});

test("research promotion packet quarantines rolling 30-day context from milestone evidence", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH), {
    windowMode: "rolling_30_day"
  });
  const validation = validate(packet, {
    windowMode: "rolling_30_day"
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.decision, "HOLD_FOR_REPEATED_ALIGNED_EVIDENCE");
  assert.equal(packet.milestone_coverage.rolling_30_day_context_used_as_milestone, false);
  assert.deepEqual(packet.milestone_coverage.observed_milestones, []);
  assert.deepEqual(packet.measurement_cell_snapshot_refs, []);
  assert.ok(
    packet.validation_summary.gaps.some((gap) => /rolling_30_day/i.test(gap)),
    packet.validation_summary.gaps.join("; ")
  );
  assert.equal(packet.feeds.internal_research_design_review, false);
});

test("research promotion packet holds when source freshness or window posture is omitted", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  for (const source of Object.values(fixture.data_spine_input.sources)) {
    delete source.freshness_state;
    delete source.window_status;
  }
  for (const record of fixture.scrubbed_glean_exports) {
    delete record.freshness_state;
    delete record.window_status;
  }

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.notEqual(packet.decision, "READY_FOR_INTERNAL_RESEARCH_DESIGN");
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.source_lane_refs.blueprint.freshness_state, null);
  assert.equal(packet.source_lane_refs.blueprint.window_status, null);
  assert.equal(packet.selected_metric_movement_ref.freshness_state, "stale");
  assert.equal(packet.selected_metric_movement_ref.window_status, "stale");
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("freshness_state")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("window_status")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet validator rejects selected path drift with recomputed hash", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH));
  packet.measurement_cell_snapshot_refs[2].expectation_path_id =
    "expectation_path_support_median_resolution_hours_other";
  recompute(packet);

  const validation = validate(packet);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expectation_path_id")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source-fixture-bound")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet validator rejects psychological-only or missing observed evidence", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH));
  packet.observed_vbd_context_ref = null;
  packet.selected_metric_movement_ref = null;
  recompute(packet);

  const validation = validate(packet);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("observed_vbd_context_ref")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("selected_metric_movement_ref")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet holds when selected metric movement is not aligned or current", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const outcomeExport = fixture.scrubbed_glean_exports.find(
    (entry) => entry.evidence_layer === "layer_3_business_system_outcomes"
  );
  outcomeExport.metric_or_signal_summary.comparison_value =
    outcomeExport.metric_or_signal_summary.baseline_value;
  outcomeExport.window_status = "stale";
  fixture.data_spine_input.sources.customerMetric.freshness_state = "stale";
  fixture.data_spine_input.sources.customerMetric.comparison_window = {
    window_start: "2026-07-01",
    window_end: "2026-07-30"
  };

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.selected_metric_movement_ref.movement_state, "held");
  assert.equal(packet.selected_metric_movement_ref.window_alignment_state, "drifted");
  assert.ok(
    packet.validation_summary.gaps.some((gap) =>
      gap.includes("selected customer metric movement")
    ),
    packet.validation_summary.gaps.join("; ")
  );
  assert.ok(
    packet.validation_summary.gaps.some((gap) => gap.includes("stale windows")),
    packet.validation_summary.gaps.join("; ")
  );
  assert.ok(
    packet.validation_summary.gaps.some((gap) => gap.includes("window must match")),
    packet.validation_summary.gaps.join("; ")
  );
});

test("research promotion packet holds when expected behavior or VBD signal is missing", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  delete fixture.blueprint_extraction_input.approvedExpectationPaths[0].expected_behavior;
  delete fixture.blueprint_extraction_input.approvedExpectationPaths[0].expected_vbd_signal;

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expected_behavior")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("observed_vbd_signal")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet holds when selected metric lag is missing", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  delete fixture.blueprint_extraction_input.approvedExpectationPaths[0]
    .expected_metric_lag_days;

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.expected_pathway_metadata.metric_lag_days, null);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("metric_lag_days")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet makes customer metric id drift visible", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources.customerMetric.metric_id =
    "support_average_wait_hours";

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.selected_metric_movement_ref.metric_id, "support_average_wait_hours");
  assert.equal(packet.selected_metric_movement_ref.movement_state, "held");
  assert.equal(packet.selected_metric_movement_ref.window_alignment_state, "drifted");
  assert.ok(
    validation.gaps.some((gap) => gap.includes("selected_metric_movement_ref.metric_id")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet holds when matching customer metric export carries the wrong metric", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const outcomeExport = fixture.scrubbed_glean_exports.find(
    (entry) => entry.evidence_layer === "layer_3_business_system_outcomes"
  );
  outcomeExport.metric_or_signal_summary.aggregate_metric_name =
    "aggregate_support_average_wait_hours";
  outcomeExport.metric_or_signal_summary.baseline_value = 20;
  outcomeExport.metric_or_signal_summary.comparison_value = 15;

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.selected_metric_movement_ref.movement_state, "held");
  assert.equal(packet.selected_metric_movement_ref.window_alignment_state, "drifted");
  assert.ok(
    validation.gaps.some((gap) => gap.includes("selected_metric_movement_ref.window")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet holds when multiple approved paths lack governed selected binding", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const existingPath = fixture.blueprint_extraction_input.approvedExpectationPaths[0];
  fixture.blueprint_extraction_input.approvedExpectationPaths.push({
    ...existingPath,
    expectation_path_id: "expectation_path_support_escalation_rate_quality",
    expected_metric_id: "support_escalation_rate",
    expected_metric_name: "Escalation rate",
    expected_metric_direction: "decrease",
    value_driver: "quality"
  });

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.ok(
    packet.validation_summary.gaps.some((gap) => gap.includes("approved expectation path")),
    packet.validation_summary.gaps.join("; ")
  );
});

test("research promotion packet validator does not trust hand-edited ready decisions", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH), {
    milestoneDays: [30, 60, 90, 180, 365]
  });
  packet.decision = "READY_FOR_INTERNAL_RESEARCH_DESIGN";
  packet.validation_summary.valid = true;
  packet.validation_summary.gaps = [];
  packet.feeds.internal_research_design_review = true;
  recompute(packet);

  const validation = validate(packet, {
    milestoneDays: [30, 60, 90, 180, 365]
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("ready packet requires all governed milestones")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source-fixture-bound")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet rejects fixture-derived model authorization aliases", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.blueprint_extraction_input.approvedExpectationPaths[0].approver_role =
    "model_outputs_authorized";
  fixture.blueprint_extraction_input.approvedExpectationPaths[0].expectation_path_id =
    "research_model_feed";

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });
  const serializedPacket = JSON.stringify(packet);
  const serializedGaps = JSON.stringify(validation.gaps);

  assert.equal(packet.decision, "REJECT_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.notEqual(packet.approved_by_role, "model_outputs_authorized");
  assert.notEqual(packet.expectation_path_id, "research_model_feed");
  assert.equal(serializedGaps.includes("model_outputs_authorized"), false);
  assert.equal(serializedGaps.includes("research_model_feed"), false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("approved_by_role")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet rejects stringified JSON smuggling in compact scalar fields", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.blueprint_extraction_input.approvedExpectationPaths[0].approver_role =
    "{\"model_outputs_authorized\":true}";
  fixture.blueprint_extraction_input.approvedExpectationPaths[0].expectation_path_id =
    "{\"research_model_feed\":true}";

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });
  const serializedPacket = JSON.stringify(packet);
  const serializedGaps = JSON.stringify(validation.gaps);

  assert.equal(packet.decision, "REJECT_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.approved_by_role, null);
  assert.equal(packet.expectation_path_id, null);
  assert.equal(serializedPacket.includes("{\\\"model_outputs_authorized\\\""), false);
  assert.equal(serializedPacket.includes("{\\\"research_model_feed\\\""), false);
  assert.equal(serializedGaps.includes("model_outputs_authorized"), false);
  assert.equal(serializedGaps.includes("research_model_feed"), false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expectation_path_id")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet suppresses unsafe source refs before packet output", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources.customerMetric.source_ref =
    "SELECT user_id FROM raw_rows";

  const packet = buildResearchPromotionReadinessPacketFromObject(fixture);
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });
  const serializedPacket = JSON.stringify(packet);
  const serializedValidation = JSON.stringify(validation);

  assert.equal(packet.decision, "HOLD_FOR_SOURCE_OR_PATH_DRIFT");
  assert.equal(validation.valid, false);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(packet.source_lane_refs.customer_metric.source_ref, null);
  assert.equal(packet.selected_metric_movement_ref.source_ref, null);
  assert.equal(serializedPacket.includes("SELECT user_id"), false);
  assert.equal(serializedPacket.includes("raw_rows"), false);
  assert.equal(serializedValidation.includes("SELECT user_id"), false);
});

test("research promotion packet keeps feed closed for invalid reviewer roles", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH), {
    reviewerRole: "external_customer"
  });
  const validation = validate(packet);

  assert.equal(packet.decision, "HOLD_FOR_GOVERNANCE_REVIEW");
  assert.equal(packet.reviewer_role, null);
  assert.equal(packet.feeds.internal_research_design_review, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("reviewer_role")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet validator returns gaps for malformed collection fields", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH));
  packet.blocked_uses = {};
  packet.required_caveats = {};
  packet.milestone_coverage.window_modes = "milestone";
  packet.measurement_cell_snapshot_refs = {};
  packet.source_lane_refs = "not_source_lanes";
  recompute(packet);

  const validation = validate(packet);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("blocked_uses must be an array")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("required_caveats must be an array")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("measurement_cell_snapshot_refs must be an array")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source_lane_refs must be an object")),
    validation.gaps.join("; ")
  );
});

test("research promotion packet rejects unsafe refs, raw rows, model, finance, score, and wrapper smuggling", () => {
  const packet = buildResearchPromotionReadinessPacketFromObject(readJson(FIXTURE_PATH));
  packet.raw_rows = [{ user_id: "user_123", transcript: "raw transcript" }];
  packet.source_lane_refs.vbd_token.source_ref =
    "https://bigquery.example/jobs/bquxjob_123";
  packet.required_caveats.push("SELECT user_id FROM raw_rows");
  packet.blocked_uses.push("customer-facing confidence score ready");
  packet.validation_summary.gaps.push("person@example.com SELECT user_id FROM raw_rows");
  packet.feeds.research_model_feed = true;
  packet.feeds.diagnostics = {
    raw_rows: [{ user_id: "user_456" }]
  };
  packet.research_boundary_policy.model_implementation_authorized = true;
  packet.research_boundary_policy.notes = {
    prompt_text: "raw prompt"
  };
  packet.expected_pathway_metadata.numeric_weight = 0.44;
  recompute(packet);

  const validation = validate(packet);
  const serializedGaps = JSON.stringify(validation.gaps);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(validation.gaps.some((gap) => gap.includes("source_lane_refs.vbd_token.source_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("required_caveats")));
  assert.ok(validation.gaps.some((gap) => gap.includes("blocked_uses")));
  assert.ok(validation.gaps.some((gap) => gap.includes("research_model_feed")));
  assert.ok(validation.gaps.some((gap) => gap.includes("feeds")));
  assert.ok(validation.gaps.some((gap) => gap.includes("model_implementation_authorized")));
  assert.ok(validation.gaps.some((gap) => gap.includes("research_boundary_policy")));
  assert.ok(validation.gaps.some((gap) => gap.includes("numeric_weight")));
  assert.equal(serializedGaps.includes("person@example.com"), false);
  assert.equal(serializedGaps.includes("SELECT user_id"), false);
  assert.equal(serializedGaps.includes("raw transcript"), false);
  assert.equal(serializedGaps.includes("customer-facing confidence"), false);
});

test("research promotion packet CLI emits compact non-persisted output", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/run_ai_value_research_promotion_readiness_packet.mjs", FIXTURE_PATH],
    { encoding: "utf8" }
  );
  const packet = JSON.parse(output);

  assert.equal(packet.decision, "READY_FOR_INTERNAL_RESEARCH_DESIGN");
  assert.equal(packet.validation_summary.valid, true);
  assert.equal(packet.feeds.internal_research_design_review, true);
  assert.equal(packet.feeds.research_model_feed, false);
  assert.equal(packet.feeds.finance_output, false);
  assert.equal(packet.feeds.customer_facing_output, false);
  assert.equal(packet.research_boundary_policy.persistence_write_authorized, false);
  assert.equal(hasNestedKey(packet, "payload_json"), false);
  assert.equal(hasNestedKey(packet, "source_packages"), false);
});
