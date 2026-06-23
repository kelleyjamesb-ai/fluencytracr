import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION,
  runControlledMeasurementCellAssemblyFromObject,
  validateControlledMeasurementCellAssembly
} from "./run_ai_value_controlled_measurement_cell_assembly.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_FALSE_FEEDS = [
  "source_package_clearance",
  "measurement_cell_input",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "reportability_readiness",
  "value_hypothesis_packet_runner",
  "finance_context_investigation",
  "finance_context_investigation_planning",
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
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "durable_pipeline_run_storage",
  "persistence",
  "backend_routes",
  "frontend_ui",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "runs_live_connectors",
  "parses_uploaded_documents",
  "writes_output_files",
  "stores_raw_source_data",
  "creates_schemas",
  "creates_repositories",
  "creates_routes",
  "creates_ui",
  "persists_pipeline_run",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "customer_facing_output",
  "customer_facing_financial_output"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "measurement_plan",
  "data_spine_readiness",
  "source_package_review_queue",
  "real_data_intake_packet_run",
  "pilot_intake_run",
  "source_packages",
  "client_evidence_entries",
  "evidence_collection_assembly",
  "evidence_snapshot",
  "claim_readiness_handoff",
  "blueprint_operator_source_handoff",
  "measurement_cell",
  "measurement_cell_series",
  "ai_value_objects",
  "payload_json",
  "validation_json",
  "source_refs_json",
  "blueprint_path_binding_json"
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const REVIEWED_SOURCE_REF_LANES = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
];

function recomputeCandidateIntegrityHash(candidate) {
  const { candidate_integrity_hash: _ignored, ...compactCandidate } = candidate;
  candidate.candidate_integrity_hash = createHash("sha256")
    .update(JSON.stringify(compactCandidate))
    .digest("hex");
}

function hashReviewedSourceRefs(refs) {
  const canonicalRefs = Object.fromEntries(
    REVIEWED_SOURCE_REF_LANES.map((lane) => [lane, refs?.[lane] ?? null])
  );
  return createHash("sha256")
    .update(JSON.stringify(canonicalRefs))
    .digest("hex");
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("controlled Measurement Cell assembly emits a compact internal candidate from a reviewed aggregate fixture", () => {
  const fixture = readJson(FIXTURE_PATH);
  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate, {
    sourceFixture: fixture
  });
  const serialized = JSON.stringify(candidate);

  assert.equal(
    candidate.schema_version,
    CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(candidate.review_state, "PASSED_INTERNAL_FIXTURE_REVIEW");
  assert.equal(
    candidate.assembly_state,
    "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW"
  );
  assert.equal(candidate.engine_executed, true);
  assert.equal(candidate.validation_summary.controlled_review_valid, true);
  assert.equal(candidate.validation_summary.assembly_run_valid, true);
  assert.equal(candidate.internal_candidate_metadata.assembly_decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER");
  assert.equal(candidate.internal_candidate_metadata.measurement_plan_id, "measurement_plan_example_full_playbook_ready");
  assert.equal(candidate.internal_candidate_metadata.selected_metric_id, "support_median_resolution_hours");
  assert.equal(candidate.internal_candidate_metadata.expectation_path_id, "expectation_path_support_median_resolution_hours_capacity");
  assert.equal(candidate.internal_candidate_metadata.source_package_count, 5);
  assert.equal(candidate.feeds.controlled_measurement_cell_assembly, true);
  assert.equal(candidate.feeds.measurement_cell_candidate, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(candidate.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    assert.equal(candidate.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(candidate, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("\"raw_rows\""), false);
  assert.equal(serialized.includes("\"query_text\""), false);
  assert.equal(serialized.includes("\"prompt_text\""), false);
  assert.equal(serialized.includes("\"transcript\""), false);
  assert.equal(serialized.includes("\"user_id\""), false);
});

test("controlled Measurement Cell assembly validator rejects passed candidates with held review state", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.review_state = "HELD_FOR_EVIDENCE_INPUTS";
  tampered.review_ref.controlled_review_state = "HELD_FOR_EVIDENCE_INPUTS";

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("review_state")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("review_ref.controlled_review_state")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly holds before assembly when aggregate telemetry is missing or suppressed", () => {
  const missingLayerOneSummary = clone(readJson(FIXTURE_PATH));
  delete missingLayerOneSummary.scrubbed_glean_exports[0].vbd_summary;

  const missingCandidate =
    runControlledMeasurementCellAssemblyFromObject(missingLayerOneSummary);
  const missingValidation =
    validateControlledMeasurementCellAssembly(missingCandidate);

  assert.equal(
    missingCandidate.assembly_state,
    "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW"
  );
  assert.equal(missingCandidate.engine_executed, false);
  assert.equal(missingValidation.valid, true, missingValidation.gaps.join("; "));
  assert.equal(missingCandidate.feeds.controlled_measurement_cell_assembly, false);
  assert.equal(missingCandidate.feeds.measurement_cell_candidate, false);
  assert.ok(
    missingCandidate.validation_summary.gaps.some((gap) =>
      gap.includes("vbd_summary is required")
    )
  );

  const suppressed = clone(readJson(FIXTURE_PATH));
  suppressed.scrubbed_glean_exports[1].k_min_posture.suppressed_or_unknown_slices = 1;
  const suppressedCandidate =
    runControlledMeasurementCellAssemblyFromObject(suppressed);

  assert.equal(
    suppressedCandidate.assembly_state,
    "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW"
  );
  assert.equal(suppressedCandidate.engine_executed, false);
  assert.equal(suppressedCandidate.feeds.measurement_cell_candidate, false);
  assert.ok(
    suppressedCandidate.validation_summary.gaps.some((gap) =>
      gap.includes("suppressed_or_unknown_slices")
    )
  );
});

test("controlled Measurement Cell assembly blocks unsafe fields and values before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.raw_rows = [{
    user_id: "user_123",
    prompt_text: "Summarize person@example.com",
    transcript: "raw transcript"
  }];
  fixture.data_spine_input.sources.vbdToken.source_ref =
    "query_text_employee_email_roi_probability";
  fixture.roi_value = 123000;
  fixture.confidence_score = 0.91;
  fixture.probability = 0.84;
  fixture.productivity_lift = "12 percent";
  fixture.finance_context_investigation_ready = true;
  fixture.creates_backend_routes = true;
  fixture.creates_frontend_ui = true;
  fixture.runs_bigquery = true;

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);
  const serialized = JSON.stringify(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(candidate.feeds.controlled_measurement_cell_assembly, false);
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
  for (const token of [
    "raw_rows",
    "data_spine_input.sources.vbdToken.source_ref",
    "roi_value",
    "confidence_score",
    "probability",
    "productivity_lift",
    "finance_context_investigation_ready",
    "creates_backend_routes",
    "creates_frontend_ui",
    "runs_bigquery"
  ]) {
    assert.ok(
      candidate.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("raw transcript"), false);
  assert.equal(serialized.includes("query_text_employee_email_roi_probability"), false);
});

test("controlled Measurement Cell assembly blocks reviewed source-ref drift before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.expected.reviewed_source_refs.vbd_token =
    "scrubbed_glean_vbd_token_support_other_day_30";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.ok(
    ["BLOCKED", "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW"].includes(candidate.assembly_state),
    candidate.assembly_state
  );
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("expected.reviewed_source_refs.vbd_token")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly blocks aggregate metric content drift before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const outcomeExport = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_3_business_system_outcomes"
  );
  outcomeExport.metric_or_signal_summary.aggregate_metric_name =
    "aggregate_marketing_pipeline_created";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("aggregate_metric_name")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly requires exact aggregate metric name binding", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const outcomeExport = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_3_business_system_outcomes"
  );
  outcomeExport.metric_or_signal_summary.aggregate_metric_name =
    "aggregate_support_median_resolution_hours_deprecated";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("aggregate_metric_name")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly blocks missing aggregate metric values before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const outcomeExport = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_3_business_system_outcomes"
  );
  delete outcomeExport.metric_or_signal_summary.baseline_value;
  delete outcomeExport.metric_or_signal_summary.comparison_value;

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("baseline_value")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("comparison_value")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly treats null, empty, and boolean metric values as missing", () => {
  const cases = [
    {
      name: "null baseline",
      mutate: (summary) => {
        summary.baseline_value = null;
      },
      expectedGap: "baseline_value"
    },
    {
      name: "empty comparison",
      mutate: (summary) => {
        summary.comparison_value = "";
      },
      expectedGap: "comparison_value"
    },
    {
      name: "boolean baseline",
      mutate: (summary) => {
        summary.baseline_value = false;
      },
      expectedGap: "baseline_value"
    },
    {
      name: "whitespace comparison",
      mutate: (summary) => {
        summary.comparison_value = "   ";
      },
      expectedGap: "comparison_value"
    }
  ];

  for (const { name, mutate, expectedGap } of cases) {
    const fixture = clone(readJson(FIXTURE_PATH));
    const outcomeExport = fixture.scrubbed_glean_exports.find(
      (item) => item.evidence_layer === "layer_3_business_system_outcomes"
    );
    mutate(outcomeExport.metric_or_signal_summary);

    const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);

    assert.equal(candidate.assembly_state, "BLOCKED", name);
    assert.equal(candidate.engine_executed, false, name);
    assert.ok(
      candidate.validation_summary.gaps.some((gap) => gap.includes(expectedGap)),
      `${name}: ${candidate.validation_summary.gaps.join("; ")}`
    );
    assert.equal(candidate.feeds.measurement_cell_candidate, false, name);
  }
});

test("controlled Measurement Cell assembly blocks stale expected aggregate-context hash before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.expected.reviewed_aggregate_context_hash = "stale_hash";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("expected.reviewed_aggregate_context_hash")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly requires reviewed Blueprint expectation input and hash", () => {
  const missingBlueprintInput = clone(readJson(FIXTURE_PATH));
  delete missingBlueprintInput.blueprint_extraction_input;

  const missingCandidate =
    runControlledMeasurementCellAssemblyFromObject(missingBlueprintInput);

  assert.equal(missingCandidate.assembly_state, "BLOCKED");
  assert.equal(missingCandidate.engine_executed, false);
  assert.ok(
    missingCandidate.validation_summary.gaps.some((gap) =>
      gap.includes("blueprint_extraction_input is required")
    ),
    missingCandidate.validation_summary.gaps.join("; ")
  );

  const stalePath = clone(readJson(FIXTURE_PATH));
  stalePath.blueprint_extraction_input.approvedExpectationPaths[0].expected_metric_lag_days = 60;

  const staleCandidate = runControlledMeasurementCellAssemblyFromObject(stalePath);

  assert.equal(staleCandidate.assembly_state, "BLOCKED");
  assert.equal(staleCandidate.engine_executed, false);
  assert.ok(
    staleCandidate.validation_summary.gaps.some((gap) =>
      gap.includes("expected.reviewed_blueprint_expectation_hash")
    ),
    staleCandidate.validation_summary.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly blocks lane-unsafe source refs even when refs are internally aligned", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const opaqueRef = "eyjmb28ioijiyxiifq";
  fixture.data_spine_input.sources.blueprint.source_ref = opaqueRef;
  fixture.expected.reviewed_source_refs.blueprint = opaqueRef;
  fixture.blueprint_extraction_input.draftId = opaqueRef;
  fixture.blueprint_extraction_input.approvedExpectationPaths[0].source_ref = opaqueRef;

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("safe lane-bound reviewed source ref")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly blocks provenance drift in reviewed aggregate-context hash", () => {
  const cases = [
    {
      name: "request id",
      mutate: (fixture) => {
        fixture.scrubbed_glean_exports[0].request_id = "client_evidence_request_changed";
      }
    },
    {
      name: "export id",
      mutate: (fixture) => {
        fixture.scrubbed_glean_exports[0].export_id = "controlled_fixture_layer_1_changed";
      }
    },
    {
      name: "nested source refs",
      mutate: (fixture) => {
        fixture.scrubbed_glean_exports[0].source_refs = {
          source_export_id: "source_export_changed"
        };
      }
    }
  ];

  for (const { name, mutate } of cases) {
    const fixture = clone(readJson(FIXTURE_PATH));
    mutate(fixture);

    const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);

    assert.equal(candidate.assembly_state, "BLOCKED", name);
    assert.equal(candidate.engine_executed, false, name);
    assert.ok(
      candidate.validation_summary.gaps.some((gap) =>
        gap.includes("expected.reviewed_aggregate_context_hash")
      ),
      `${name}: ${candidate.validation_summary.gaps.join("; ")}`
    );
  }
});

test("controlled Measurement Cell assembly blocks source owner and attestation drift from real-data packages", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const layerOne = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_1_platform_telemetry"
  );
  layerOne.source_owner_role = "different_owner";
  layerOne.approver_role = "different_owner";
  layerOne.attestation.attested_by_role = "different_owner";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("source_owner_role")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly blocks source package window drift before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const layerOne = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_1_platform_telemetry"
  );
  layerOne.covered_window = {
    window_start: "2026-05-01",
    window_end: "2026-05-31"
  };

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.ok(
    ["BLOCKED", "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW"].includes(candidate.assembly_state),
    candidate.assembly_state
  );
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("expected.reviewed_aggregate_context_hash")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly blocks approver-only drift before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const layerOne = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_1_platform_telemetry"
  );
  layerOne.approver_role = "different_owner";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("approver_role")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly blocks approver drift for all governed source lanes", () => {
  const layers = [
    "layer_2_user_voice_empirical",
    "governance_evidence",
    "assumption_evidence"
  ];

  for (const layer of layers) {
    const fixture = clone(readJson(FIXTURE_PATH));
    const record = fixture.scrubbed_glean_exports.find(
      (item) => item.evidence_layer === layer
    );
    record.approver_role = "different_owner";

    const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);

    assert.equal(candidate.assembly_state, "BLOCKED", layer);
    assert.equal(candidate.engine_executed, false, layer);
    assert.ok(
      candidate.validation_summary.gaps.some((gap) =>
        gap.includes(`${layer}.approver_role`)
      ),
      `${layer}: ${candidate.validation_summary.gaps.join("; ")}`
    );
    assert.equal(candidate.feeds.measurement_cell_candidate, false, layer);
  }
});

test("controlled Measurement Cell assembly blocks attestation-only drift before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  const layerOne = fixture.scrubbed_glean_exports.find(
    (item) => item.evidence_layer === "layer_1_platform_telemetry"
  );
  layerOne.attestation.attested_by_role = "different_owner";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("attestation.attested_by_role")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly reviewed aggregate-context hash is source-order stable", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.scrubbed_glean_exports = [
    fixture.scrubbed_glean_exports[2],
    fixture.scrubbed_glean_exports[0],
    fixture.scrubbed_glean_exports[4],
    fixture.scrubbed_glean_exports[1],
    fixture.scrubbed_glean_exports[3]
  ];

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate, {
    sourceFixture: fixture
  });

  assert.equal(
    candidate.assembly_state,
    "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW",
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("controlled Measurement Cell assembly blocks unsupported source-lane aggregate grain before assembly", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.data_spine_input.sources.vbdToken.approved_aggregate_grain = "person_level";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(candidate.assembly_state, "BLOCKED");
  assert.equal(candidate.engine_executed, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.ok(
    candidate.validation_summary.gaps.some((gap) =>
      gap.includes("approved_aggregate_grain")
    ),
    candidate.validation_summary.gaps.join("; ")
  );
  assert.equal(candidate.feeds.measurement_cell_candidate, false);
});

test("controlled Measurement Cell assembly validator rejects full child object smuggling", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.internal_candidate_metadata.measurement_cell = {
    measurement_cell_id: "measurement_cell_smuggled"
  };
  tampered.internal_candidate_metadata.measurementCellPayload = {
    measurement_cell_id: "measurement_cell_smuggled_alias"
  };
  tampered.internal_candidate_metadata.sourcePackagePayload = [];
  tampered.internal_candidate_metadata.finance_review_payload = {};
  tampered.internal_candidate_metadata.financial_driver = "capacity_creation";
  tampered.internal_candidate_metadata.source_packages = [];
  tampered.payload_json = { measurement_cell_input: {} };

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("measurement_cell")));
  assert.ok(validation.gaps.some((gap) => gap.includes("measurementCellPayload")));
  assert.ok(validation.gaps.some((gap) => gap.includes("sourcePackagePayload")));
  assert.ok(validation.gaps.some((gap) => gap.includes("finance_review_payload")));
  assert.ok(validation.gaps.some((gap) => gap.includes("financial_driver")));
  assert.ok(validation.gaps.some((gap) => gap.includes("source_packages")));
  assert.ok(validation.gaps.some((gap) => gap.includes("payload_json")));
});

test("controlled Measurement Cell assembly validator rejects nested metadata smuggling in compact refs", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.review_ref.extra_ref_payload = {
    benign_alias: "opaque_payload"
  };
  tampered.assembly_ref.extra_assembly_payload = {
    benign_alias: "opaque_payload"
  };
  tampered.validation_summary.extra_validation_payload = {
    benign_alias: "opaque_payload"
  };

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("review_ref.extra_ref_payload")));
  assert.ok(validation.gaps.some((gap) => gap.includes("assembly_ref.extra_assembly_payload")));
  assert.ok(validation.gaps.some((gap) => gap.includes("validation_summary.extra_validation_payload")));
});

test("controlled Measurement Cell assembly validator rejects fake ready refs on held candidates", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  delete fixture.scrubbed_glean_exports[0].vbd_summary;
  const held = runControlledMeasurementCellAssemblyFromObject(fixture);
  const tampered = clone(held);
  tampered.assembly_ref.assembly_decision = "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER";
  tampered.assembly_ref.measurement_cell_ref = "measurement_cell_fake";
  tampered.internal_candidate_metadata.assembly_decision = "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER";
  tampered.internal_candidate_metadata.measurement_cell_ref = "measurement_cell_fake";
  tampered.internal_candidate_metadata.time_window_id = "day_30";
  tampered.internal_candidate_metadata.selected_metric_id = "support_median_resolution_hours";
  tampered.internal_candidate_metadata.expectation_path_id =
    "expectation_path_support_median_resolution_hours_capacity";

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("assembly_ref.measurement_cell_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("assembly_ref.assembly_decision")));
  assert.ok(validation.gaps.some((gap) => gap.includes("internal_candidate_metadata.measurement_cell_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("internal_candidate_metadata.expectation_path_id")));
});

test("controlled Measurement Cell assembly validator rejects extra unreviewed source refs", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.review_ref.reviewed_source_refs.extra_unreviewed_ref = "blueprint_extra_ref";

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("extra_unreviewed_ref")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects extra compact metadata smuggling", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.internal_candidate_metadata.userUuid = "user_123";
  tampered.internal_candidate_metadata.roiEstimate = 100000;
  tampered.internal_candidate_metadata.causalLift = 0.2;
  tampered.internal_candidate_metadata.sourceRefs = {
    aggregate_probe_id: "scrubbed_glean_vbd_token_support_day_30"
  };
  tampered.internal_candidate_metadata.reviewed_blueprint_expectation_hash = "not_a_hash";

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  for (const key of ["userUuid", "roiEstimate", "causalLift", "sourceRefs", "reviewed_blueprint_expectation_hash"]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(key)),
      validation.gaps.join("; ")
    );
  }
});

test("controlled Measurement Cell assembly validator rejects stale Blueprint expectation hash", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.internal_candidate_metadata.reviewed_blueprint_expectation_hash =
    "a".repeat(64);

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("reviewed_blueprint_expectation_hash must match")
    ),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator requires fixture-bound validation for passed candidates", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));

  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFixture is required")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects mirrored compact hash tampering", () => {
  const fixture = readJson(FIXTURE_PATH);
  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const tampered = clone(candidate);
  tampered.review_ref.reviewed_aggregate_context_hash = "a".repeat(64);
  tampered.internal_candidate_metadata.reviewed_aggregate_context_hash = "a".repeat(64);
  tampered.review_ref.reviewed_blueprint_expectation_hash = "b".repeat(64);
  tampered.internal_candidate_metadata.reviewed_blueprint_expectation_hash =
    "b".repeat(64);
  recomputeCandidateIntegrityHash(tampered);

  const validation = validateControlledMeasurementCellAssembly(tampered, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("fixture-bound")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects hand-filled held candidates", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  delete fixture.scrubbed_glean_exports[0].vbd_summary;
  const held = runControlledMeasurementCellAssemblyFromObject(fixture);
  const passed = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(held);

  tampered.review_state = "PASSED_INTERNAL_FIXTURE_REVIEW";
  tampered.assembly_state = "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW";
  tampered.engine_executed = true;
  tampered.review_ref = clone(passed.review_ref);
  tampered.assembly_ref = clone(passed.assembly_ref);
  tampered.validation_summary = clone(passed.validation_summary);
  tampered.internal_candidate_metadata = clone(passed.internal_candidate_metadata);
  tampered.feeds.controlled_measurement_cell_assembly = true;
  tampered.feeds.measurement_cell_candidate = true;
  recomputeCandidateIntegrityHash(tampered);

  const validation = validateControlledMeasurementCellAssembly(tampered, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("fixture-bound")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator requires compact path identity on passed candidates", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  delete tampered.internal_candidate_metadata.selected_metric_id;
  delete tampered.internal_candidate_metadata.expectation_path_id;
  delete tampered.internal_candidate_metadata.time_window_id;
  delete tampered.internal_candidate_metadata.measurement_plan_id;
  tampered.internal_candidate_metadata.source_package_count = 0;

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("selected_metric_id")));
  assert.ok(validation.gaps.some((gap) => gap.includes("expectation_path_id")));
  assert.ok(validation.gaps.some((gap) => gap.includes("time_window_id")));
  assert.ok(validation.gaps.some((gap) => gap.includes("measurement_plan_id")));
  assert.ok(validation.gaps.some((gap) => gap.includes("source_package_count")));
});

test("controlled Measurement Cell assembly validator rejects unsafe text in caveats and validation gaps", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.required_caveats.push(
    "raw transcript person@example.com select secret from table"
  );
  tampered.required_caveats.push(
    "user_id u_123 employee_id e_456"
  );
  tampered.validation_summary.gaps.push(
    "prompt text user_id u_123 query_text select secret from table"
  );
  tampered.validation_summary.gaps.push(
    "respondent_identifier r_789"
  );

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("required_caveats")));
  assert.ok(validation.gaps.some((gap) => gap.includes("validation_summary.gaps")));
});

test("controlled Measurement Cell assembly validator rejects unsafe compact string leakage", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  fixture.fixture_id = "prompt text summarize call transcript";

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture);
  const validation = validateControlledMeasurementCellAssembly(candidate);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("fixture_id")));
});

test("controlled Measurement Cell assembly validator rejects unsafe claim text in validation gaps after hash recompute", () => {
  const fixture = clone(readJson(FIXTURE_PATH));
  delete fixture.scrubbed_glean_exports[0].vbd_summary;
  const held = runControlledMeasurementCellAssemblyFromObject(fixture);
  const tampered = clone(held);
  tampered.validation_summary.gaps.push(
    "ROI output $125000 EBITDA impact confidence 91 probability 84 productivity lift"
  );
  recomputeCandidateIntegrityHash(tampered);

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects plain downstream-ready text after hash recompute", () => {
  const cases = [
    {
      path: "required_caveats",
      text: "finance context investigation ready"
    },
    {
      path: "required_caveats",
      text: "confidence model enabled"
    },
    {
      path: "validation_summary.gaps",
      text: "finance context investigation ready"
    },
    {
      path: "validation_summary.gaps",
      text: "customer facing finance output ready"
    },
    {
      path: "validation_summary.gaps",
      text: "probability model enabled"
    },
    {
      path: "validation_summary.gaps",
      text: "productivity output ready"
    },
    {
      path: "validation_summary.gaps",
      text: "EBITDA ready"
    },
    {
      path: "validation_summary.gaps",
      text: "ROI ready"
    }
  ];

  for (const { path, text } of cases) {
    const fixture = clone(readJson(FIXTURE_PATH));
    delete fixture.scrubbed_glean_exports[0].vbd_summary;
    const held = runControlledMeasurementCellAssemblyFromObject(fixture);
    const tampered = clone(held);
    const target = path
      .split(".")
      .reduce((nested, key) => nested[key], tampered);
    target.push(text);
    recomputeCandidateIntegrityHash(tampered);

    const validation = validateControlledMeasurementCellAssembly(tampered);

    assert.equal(validation.valid, false, `${path}: ${text}`);
    assert.ok(
      validation.gaps.some((gap) => gap.includes(path)),
      `${path}: ${text}: ${validation.gaps.join("; ")}`
    );
  }
});

test("controlled Measurement Cell assembly validator rejects nested compact container payloads", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.validation_summary.gaps.push({ benign_alias: "opaque_payload" });
  tampered.validation_summary.missing_evidence.push({ benign_alias: "opaque_payload" });
  tampered.internal_candidate_metadata.missing_evidence.push({
    benign_alias: "opaque_payload"
  });
  tampered.required_caveats.push({ benign_alias: "opaque_payload" });

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  for (const path of [
    "validation_summary.gaps",
    "validation_summary.missing_evidence",
    "internal_candidate_metadata.missing_evidence",
    "required_caveats"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(path)),
      validation.gaps.join("; ")
    );
  }
});

test("controlled Measurement Cell assembly validator rejects extra compact policy payloads", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.feeds.extra_feed_payload = { benign_alias: "opaque_payload" };
  tampered.boundary_policy.extra_boundary_payload = {
    benign_alias: "opaque_payload"
  };

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("feeds.extra_feed_payload")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("boundary_policy.extra_boundary_payload")),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects lane-prefixed encoded-looking source refs", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.review_ref.reviewed_source_refs.blueprint =
    "blueprint_eyjmb28ioijiyxiifq";

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("safe lane-bound reviewed source ref")
    ),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects opaque lane-prefixed source refs after hash recompute", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.review_ref.reviewed_source_refs.blueprint =
    "blueprint_mzq3njm1mtkzmdg3ntkz";
  tampered.review_ref.reviewed_source_refs.ai_fluency =
    "ai_fluency_mzq3njm1mtkzmdg3ntkz";
  tampered.review_ref.reviewed_source_refs_hash = hashReviewedSourceRefs(
    tampered.review_ref.reviewed_source_refs
  );
  tampered.internal_candidate_metadata.reviewed_source_refs_hash =
    tampered.review_ref.reviewed_source_refs_hash;
  recomputeCandidateIntegrityHash(tampered);

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("safe lane-bound reviewed source ref")
    ),
    validation.gaps.join("; ")
  );
});

test("controlled Measurement Cell assembly validator rejects stale candidate feeds and source-ref hash", () => {
  const candidate = runControlledMeasurementCellAssemblyFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(candidate);
  tampered.assembly_state = "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW";
  tampered.feeds.controlled_measurement_cell_assembly = true;
  tampered.feeds.value_hypothesis_packet_runner = true;
  tampered.review_ref.reviewed_source_refs.vbd_token = "stale_ref";
  tampered.internal_candidate_metadata.reviewed_aggregate_context_hash = "stale_hash";
  tampered.validation_summary.assembly_run_valid = false;

  const validation = validateControlledMeasurementCellAssembly(tampered);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("reviewed_source_refs_hash")));
  assert.ok(validation.gaps.some((gap) => gap.includes("reviewed_aggregate_context_hash")));
  assert.ok(validation.gaps.some((gap) => gap.includes("value_hypothesis_packet_runner")));
  assert.ok(validation.gaps.some((gap) => gap.includes("assembly_run_valid")));
});
