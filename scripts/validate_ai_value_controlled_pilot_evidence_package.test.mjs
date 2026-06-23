import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION,
  runControlledPilotEvidencePackageFromObject,
  runControlledRepeatedPilotEvidencePackageFromObject,
  validateControlledRepeatedPilotEvidencePackage,
  validateControlledPilotEvidencePackage
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function recomputePackageHash(pilotPackage) {
  const packageWithoutHash = clone(pilotPackage);
  delete packageWithoutHash.package_integrity_hash;
  return createHash("sha256").update(stableJson(packageWithoutHash)).digest("hex");
}

const REQUIRED_FALSE_FEEDS = [
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "finance_context_investigation",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "persistence",
  "backend_routes",
  "frontend_ui",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "payload_json",
  "validation_json",
  "source_refs_json",
  "measurement_cell_payload",
  "measurement_cell_series",
  "source_packages",
  "operator_source_handoff_bundle",
  "approved_expectation_paths",
  "raw_rows",
  "query_text",
  "prompt_text",
  "transcript",
  "user_id"
];

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("controlled pilot evidence package demonstrates the saved aggregate fixture can flow through review and Measurement Cell gates", () => {
  const fixture = readJson(FIXTURE_PATH);
  const pilotPackage = runControlledPilotEvidencePackageFromObject(fixture);
  const validation = validateControlledPilotEvidencePackage(pilotPackage, {
    sourceFixture: fixture
  });
  const serialized = JSON.stringify(pilotPackage);

  assert.equal(
    pilotPackage.schema_version,
    CONTROLLED_PILOT_EVIDENCE_PACKAGE_SCHEMA_VERSION
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(pilotPackage.pilot_decision, "PILOT_PASSED_PROMOTION_REVIEW_READY");
  assert.equal(
    pilotPackage.measurement_cell_promotion_record.decision,
    "MEASUREMENT_CELL_SNAPSHOT_PROMOTION_REVIEW_READY"
  );
  assert.equal(
    pilotPackage.measurement_cell_promotion_record.next_decision,
    "RECOMMEND_REVISIT_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION"
  );
  assert.equal(
    pilotPackage.series_boundary.decision,
    "HOLD_FOR_REPEATED_MILESTONE_EVIDENCE"
  );
  assert.equal(pilotPackage.evidence_flow.controlled_aggregate_review.state, "PASSED_INTERNAL_FIXTURE_REVIEW");
  assert.equal(
    pilotPackage.evidence_flow.measurement_cell_assembly.state,
    "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW"
  );
  assert.equal(
    pilotPackage.evidence_flow.series_alignment_check.state,
    "SERIES_PERSISTENCE_NOT_PROMOTED"
  );
  assert.equal(pilotPackage.validation_summary.controlled_review_valid, true);
  assert.equal(pilotPackage.validation_summary.measurement_cell_candidate_valid, true);
  assert.equal(pilotPackage.validation_summary.source_package_count, 5);
  assert.equal(pilotPackage.validation_summary.gaps.length, 0);
  assert.ok(pilotPackage.package_integrity_hash);
  assert.ok(pilotPackage.alignment_summary.reviewed_source_refs_hash);
  assert.ok(pilotPackage.alignment_summary.reviewed_aggregate_context_hash);
  assert.ok(pilotPackage.alignment_summary.reviewed_blueprint_expectation_hash);
  assert.equal(
    pilotPackage.alignment_summary.expectation_path_id,
    "expectation_path_support_median_resolution_hours_capacity"
  );
  assert.equal(pilotPackage.feeds.measurement_cell_snapshot_promotion_review, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(pilotPackage.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "persisted",
    "creates_migrations",
    "creates_prisma_schema",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_ingestion_jobs",
    "runs_bigquery",
    "runs_sigma",
    "runs_glean_query",
    "writes_output_files",
    "stores_raw_source_data",
    "computes_confidence",
    "emits_probability",
    "computes_roi",
    "emits_financial_attribution",
    "customer_facing_output",
    "customer_facing_financial_output"
  ]) {
    assert.equal(pilotPackage.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(pilotPackage, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("PILOT_PASSED_PROMOTION_REVIEW_READY"), true);
  assert.equal(serialized.includes("confidence percentage"), false);
  assert.equal(serialized.includes("ROI proof"), false);
});

test("controlled pilot evidence package validator preserves required caveats with recomputed hash", () => {
  const fixture = readJson(FIXTURE_PATH);
  const pilotPackage = runControlledPilotEvidencePackageFromObject(fixture);
  pilotPackage.required_caveats = [];
  pilotPackage.package_integrity_hash = recomputePackageHash(pilotPackage);

  const validation = validateControlledPilotEvidencePackage(pilotPackage);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("required_caveats must include")),
    validation.gaps.join("; ")
  );
});

test("controlled pilot evidence package rejects unsafe raw, identifier, live connector, finance, and model fields", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.raw_rows = [{ user_id: "user_123", transcript: "raw transcript" }];
  fixture.data_spine_input.sources.vbdToken.source_ref =
    "scrubbed_glean_vbd_token_raw_rows_user_id_roi";
  fixture.scrubbed_glean_exports[0].source_refs = {
    aggregate_probe_id: "query_text_probability_user_id"
  };
  fixture.confidence_score = 0.91;
  fixture.probability = 0.84;
  fixture.roi_output = "$120000";
  fixture.runs_bigquery = true;
  fixture.runs_sigma = true;
  fixture.data_spine_input.sources.vbdToken.connector_status = "live_connector";

  const pilotPackage = runControlledPilotEvidencePackageFromObject(fixture);
  const validation = validateControlledPilotEvidencePackage(pilotPackage, {
    sourceFixture: fixture
  });
  const serialized = JSON.stringify(pilotPackage);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(pilotPackage.pilot_decision, "PILOT_REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(pilotPackage.engine_executed, false);
  assert.equal(
    pilotPackage.measurement_cell_promotion_record.decision,
    "HOLD_PHYSICAL_MEASUREMENT_CELL_TABLES"
  );
  assert.equal(pilotPackage.feeds.measurement_cell_snapshot_promotion_review, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(pilotPackage.feeds[feed], false, `${feed} must remain false`);
  }
  for (const token of [
    "raw_rows",
    "user_id",
    "transcript",
    "data_spine_input.sources.vbdToken.source_ref",
    "source_refs.aggregate_probe_id",
    "confidence_score",
    "probability",
    "roi_output",
    "runs_bigquery",
    "runs_sigma",
    "connector_status"
  ]) {
    assert.ok(
      pilotPackage.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
  assert.equal(serialized.includes("raw transcript"), false);
  assert.equal(serialized.includes("query_text_probability_user_id"), false);
});

test("controlled pilot evidence package holds suppressed or missing aggregate telemetry", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports[0].k_min_posture.cohort_threshold_met = false;
  fixture.scrubbed_glean_exports[0].k_min_posture.suppressed_or_unknown_slices = 2;
  fixture.scrubbed_glean_exports[0].evidence_state = "suppressed";

  const pilotPackage = runControlledPilotEvidencePackageFromObject(fixture);
  const validation = validateControlledPilotEvidencePackage(pilotPackage, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    pilotPackage.pilot_decision,
    "PILOT_HELD_FOR_SUPPRESSION_OR_MISSING_EVIDENCE"
  );
  assert.equal(
    pilotPackage.evidence_flow.controlled_aggregate_review.state,
    "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY"
  );
  assert.equal(pilotPackage.feeds.measurement_cell_snapshot_promotion_review, false);
  assert.ok(
    pilotPackage.validation_summary.gaps.some((gap) =>
      gap.includes("suppressed_or_unknown_slices")
    )
  );
});

test("controlled pilot evidence package blocks stale aggregate or Blueprint expectation hash drift", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.expected.reviewed_aggregate_context_hash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  fixture.expected.reviewed_blueprint_expectation_hash =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  const pilotPackage = runControlledPilotEvidencePackageFromObject(fixture);
  const validation = validateControlledPilotEvidencePackage(pilotPackage, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(pilotPackage.pilot_decision, "PILOT_HELD_FOR_SOURCE_ALIGNMENT");
  assert.equal(pilotPackage.feeds.measurement_cell_snapshot_promotion_review, false);
  assert.ok(
    pilotPackage.validation_summary.gaps.some((gap) =>
      gap.includes("reviewed_aggregate_context_hash")
    )
  );
  assert.ok(
    pilotPackage.validation_summary.gaps.some((gap) =>
      gap.includes("reviewed_blueprint_expectation_hash")
    )
  );
});

test("controlled pilot evidence package validator rejects tampered package shape, feeds, and integrity hash", () => {
  const fixture = readJson(FIXTURE_PATH);
  const pilotPackage = runControlledPilotEvidencePackageFromObject(fixture);
  const tampered = clone(pilotPackage);
  tampered.extra_payload = { raw_rows: [] };
  tampered.feeds.measurement_cell_series_snapshot = true;
  tampered.package_integrity_hash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  const validation = validateControlledPilotEvidencePackage(tampered, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("Unsupported controlled pilot evidence package field: extra_payload")
    )
  );
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("feeds.measurement_cell_series_snapshot must be false")
    )
  );
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("package_integrity_hash must match package contents")
    )
  );
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("controlled pilot evidence package must match source-fixture-bound output")
    )
  );
});

test("controlled repeated pilot evidence package validator rejects nested child-payload smuggling with recomputed hash", () => {
  const fixture = readJson(FIXTURE_PATH);
  const forbiddenKeys = [
    "measurement_cell_input",
    "measurement_cell",
    "data_spine_readiness",
    "source_package_review_queue",
    "real_data_intake_packet_run"
  ];

  for (const key of forbiddenKeys) {
    const repeatedPackage = runControlledRepeatedPilotEvidencePackageFromObject(fixture);
    repeatedPackage.series_boundary.compact_refs[0][key] = {
      leaked_payload: true
    };
    repeatedPackage.package_integrity_hash = recomputePackageHash(repeatedPackage);

    const validation =
      validateControlledRepeatedPilotEvidencePackage(repeatedPackage);

    assert.equal(validation.valid, false, `${key} must invalidate package`);
    assert.ok(
      validation.gaps.some((gap) => gap.includes(key)),
      `missing unsafe-field gap for ${key}`
    );
  }
});

test("controlled repeated pilot evidence package validator preserves repeated-run caveat with recomputed hash", () => {
  const fixture = readJson(FIXTURE_PATH);
  const repeatedPackage = runControlledRepeatedPilotEvidencePackageFromObject(fixture);
  repeatedPackage.required_caveats = repeatedPackage.required_caveats.filter(
    (caveat) => !/Repeated milestone evidence/i.test(caveat)
  );
  repeatedPackage.package_integrity_hash = recomputePackageHash(repeatedPackage);

  const validation =
    validateControlledRepeatedPilotEvidencePackage(repeatedPackage);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("Repeated milestone evidence")),
    validation.gaps.join("; ")
  );
});

test("controlled repeated pilot evidence package demonstrates Day 0 through Day 365 can flow through Measurement Cell Series review", () => {
  const fixture = readJson(FIXTURE_PATH);
  const repeatedPackage = runControlledRepeatedPilotEvidencePackageFromObject(fixture);
  const validation = validateControlledRepeatedPilotEvidencePackage(repeatedPackage, {
    sourceFixture: fixture
  });
  const serialized = JSON.stringify(repeatedPackage);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(repeatedPackage.pilot_decision, "PILOT_PASSED_PROMOTION_REVIEW_READY");
  assert.equal(
    repeatedPackage.series_boundary.decision,
    "HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION"
  );
  assert.equal(
    repeatedPackage.evidence_flow.series_alignment_check.decision,
    "CONTINUITY_COVERAGE_COMPLETE"
  );
  assert.deepEqual(
    repeatedPackage.series_boundary.required_milestones,
    [0, 30, 60, 90, 180, 365]
  );
  assert.deepEqual(
    repeatedPackage.series_boundary.observed_milestones,
    [0, 30, 60, 90, 180, 365]
  );
  assert.deepEqual(repeatedPackage.series_boundary.missing_milestones, []);
  assert.equal(repeatedPackage.series_boundary.ready_windows, 6);
  assert.equal(repeatedPackage.series_boundary.held_windows, 0);
  assert.equal(repeatedPackage.series_boundary.suppressed_windows, 0);
  assert.equal(repeatedPackage.series_boundary.missing_windows, 0);
  assert.equal(repeatedPackage.series_boundary.blocked_windows, 0);
  assert.equal(repeatedPackage.series_boundary.alignment_state, "aligned");
  assert.equal(repeatedPackage.series_boundary.validation_valid, true);
  assert.equal(repeatedPackage.series_boundary.compact_refs.length, 6);
  assert.equal(repeatedPackage.feeds.measurement_cell_snapshot_promotion_review, true);
  assert.equal(repeatedPackage.feeds.measurement_cell_series_snapshot, false);
  assert.equal(repeatedPackage.feeds.evidence_continuity_snapshot, false);
  assert.equal(repeatedPackage.feeds.confidence_model, false);
  assert.equal(repeatedPackage.feeds.finance_context_investigation, false);
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(repeatedPackage, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("measurement_cell_input"), false);
  assert.equal(serialized.includes("confidence percentage"), false);
  assert.equal(serialized.includes("ROI proof"), false);
});

test("controlled repeated pilot evidence package holds when Day 0 baseline milestone is missing", () => {
  const fixture = readJson(FIXTURE_PATH);
  const repeatedPackage = runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
    milestoneDays: [30, 60, 90, 180, 365]
  });
  const validation = validateControlledRepeatedPilotEvidencePackage(repeatedPackage, {
    sourceFixture: fixture,
    milestoneDays: [30, 60, 90, 180, 365]
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    repeatedPackage.pilot_decision,
    "PILOT_HELD_FOR_SUPPRESSION_OR_MISSING_EVIDENCE"
  );
  assert.equal(
    repeatedPackage.evidence_flow.series_alignment_check.decision,
    "HELD_FOR_EVIDENCE_CONTINUITY"
  );
  assert.deepEqual(repeatedPackage.series_boundary.missing_milestones, [0]);
  assert.equal(repeatedPackage.series_boundary.ready_windows, 5);
  assert.equal(repeatedPackage.series_boundary.validation_valid, true);
  assert.equal(repeatedPackage.feeds.measurement_cell_snapshot_promotion_review, false);
  assert.equal(repeatedPackage.feeds.measurement_cell_series_snapshot, false);
});

test("controlled repeated pilot evidence package blocks rolling 30-day windows from continuity evidence", () => {
  const fixture = readJson(FIXTURE_PATH);
  const repeatedPackage = runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
    windowMode: "rolling_30_day"
  });
  const validation = validateControlledRepeatedPilotEvidencePackage(repeatedPackage, {
    sourceFixture: fixture,
    windowMode: "rolling_30_day"
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(repeatedPackage.pilot_decision, "PILOT_HELD_FOR_SOURCE_ALIGNMENT");
  assert.equal(
    repeatedPackage.evidence_flow.series_alignment_check.decision,
    "BLOCKED"
  );
  assert.ok(
    repeatedPackage.validation_summary.gaps.some((gap) =>
      /rolling_30_day|window_mode/i.test(gap)
    )
  );
  assert.deepEqual(repeatedPackage.series_boundary.observed_milestones, []);
  assert.deepEqual(repeatedPackage.series_boundary.missing_milestones, []);
  assert.equal(repeatedPackage.series_boundary.complete_milestone_series, false);
  assert.equal(repeatedPackage.series_boundary.ready_windows, 0);
  assert.equal(repeatedPackage.series_boundary.held_windows, 0);
  assert.equal(repeatedPackage.series_boundary.suppressed_windows, 0);
  assert.equal(repeatedPackage.series_boundary.missing_windows, 0);
  assert.equal(repeatedPackage.series_boundary.blocked_windows, 0);
  assert.deepEqual(repeatedPackage.series_boundary.compact_refs, []);
  assert.deepEqual(
    repeatedPackage.evidence_flow.series_alignment_check.covered_milestone_days,
    []
  );
  assert.equal(repeatedPackage.feeds.measurement_cell_snapshot_promotion_review, false);
  assert.equal(repeatedPackage.feeds.measurement_cell_series_snapshot, false);
  assert.equal(repeatedPackage.feeds.confidence_model, false);
});
