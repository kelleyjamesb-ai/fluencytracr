import assert from "node:assert/strict";
import test from "node:test";

import {
  convertScrubbedGleanClientExportToEvidenceInputs,
  validateClientEvidenceEntry,
  validateSourcePackage
} from "../shared/dist/aiValueEngine/index.js";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const clone = (value) => JSON.parse(JSON.stringify(value));

function privacyBoundary(overrides = {}) {
  return {
    aggregate_only: true,
    contains_direct_identifiers: false,
    contains_raw_content: false,
    contains_raw_rows: false,
    contains_raw_files: false,
    contains_raw_prompts: false,
    contains_raw_responses: false,
    contains_transcripts: false,
    contains_query_text: false,
    contains_file_contents: false,
    contains_person_level_productivity: false,
    contains_person_level_hris_records: false,
    contains_hashed_or_joinable_person_identifiers: false,
    contains_manager_or_team_ranking: false,
    contains_people_decisioning: false,
    contains_compensation_or_performance_inference: false,
    contains_promotion_or_discipline_inference: false,
    contains_attrition_prediction: false,
    contains_hris_inference_from_ai_usage: false,
    ...overrides
  };
}

function validLayer1Export(overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: "scrubbed_glean_export_support_layer_1_2026_05",
    org_id: "org_northstar_support",
    measurement_plan_id: "measurement_plan_support_pilot_2026_05",
    evidence_layer: "layer_1_platform_telemetry",
    source_owner_role: "customer_data_platform_owner",
    approver_role: "customer_data_platform_owner",
    attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_data_platform_owner",
      attested_at: "2026-06-16T00:00:00.000Z",
      caveats: [
        "Scrubbed aggregate export summary only; no raw rows or identifiers retained."
      ]
    },
    generated_at: "2026-06-16T00:00:00.000Z",
    covered_window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    aggregate_grain: "workflow_family",
    minimum_cohort_threshold: 5,
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 12,
      k_min_clear_slices: 12,
      suppressed_or_unknown_slices: 0
    },
    evidence_state: "present",
    privacy_boundary: privacyBoundary(),
    source_tables: [
      "scrubbed_llm_call",
      "scrubbed_client_analytics",
      "scrubbed_workflows"
    ],
    table_families_checked: [
      "scrubbed_llm_call",
      "scrubbed_client_analytics",
      "scrubbed_workflows"
    ],
    source_readiness_id: "source_readiness_support_layer_1_2026_05",
    aggregate_probe_id: "bq_probe_support_layer_1_2026_05",
    signal_families: [
      "assistant",
      "search_document_retrieval",
      "agent_run"
    ],
    covered_signal_families: [
      "assistant",
      "search_document_retrieval",
      "agent_run"
    ],
    vbd_summary: {
      baseline_index: 0.42,
      comparison_index: 0.58,
      movement_direction: "improved",
      aggregate_only: true
    },
    allowed_uses: [
      "evidence_collection_input",
      "source_availability_summary"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    notes: [
      "Layer 1 support telemetry contains aggregate Glean activity and VBD posture."
    ],
    caveats: [
      "Layer 1 telemetry is source availability evidence only and cannot create full Playbook coverage by itself."
    ],
    ...overrides
  };
}

function validLayer2Export(overrides = {}) {
  return {
    ...validLayer1Export({
      export_id: "scrubbed_glean_export_support_layer_2_2026_05",
      request_id: "client_evidence_request_measurement_plan_support_pilot_2026_05_layer_2_user_voice_empirical",
      evidence_layer: "layer_2_user_voice_empirical",
      source_owner_role: "customer_research_owner",
      approver_role: "customer_research_owner",
      source_readiness_id: "source_readiness_support_layer_2_2026_05",
      aggregate_probe_id: "aggregate_ai_fluency_export_support_2026_05",
      metric_or_signal_summary: {
        summary_type: "aggregate_export_metadata_summary",
        aggregate_signal_name: "aggregate_ai_fluency_baseline_summary",
        aggregate_value_present: true,
        notes: [
          "Aggregate AI Fluency baseline was provided as metadata only."
        ]
      },
      signal_families: [
        "aggregate_ai_fluency_baseline",
        "aggregate_workflow_observation"
      ],
      covered_signal_families: [
        "aggregate_ai_fluency_baseline",
        "aggregate_workflow_observation"
      ],
      notes: [
        "Layer 2 export is aggregate user voice metadata only."
      ],
      caveats: [
        "Layer 2 export metadata cannot store survey rows or respondent identifiers."
      ],
      allowed_uses: [
        "evidence_collection_input",
        "evidence_snapshot_preparation"
      ],
      ...overrides
    })
  };
}

function validLayer3Export(overrides = {}) {
  return {
    ...validLayer1Export({
      export_id: "scrubbed_glean_export_support_layer_3_2026_05",
      request_id: "client_evidence_request_measurement_plan_support_pilot_2026_05_layer_3_business_system_outcomes",
      evidence_layer: "layer_3_business_system_outcomes",
      source_owner_role: "customer_metric_owner",
      approver_role: "customer_business_owner",
      source_readiness_id: "source_readiness_support_layer_3_2026_05",
      aggregate_probe_id: "aggregate_support_outcome_export_2026_05",
      metric_or_signal_summary: {
        summary_type: "customer_owned_aggregate_metric_summary",
        aggregate_metric_name: "aggregate_support_case_resolution_rate",
        aggregate_value_present: true,
        notes: [
          "Customer metric owner attested that this is an aggregate KPI summary."
        ]
      },
      signal_families: [
        "customer_attested_kpi_baseline",
        "customer_attested_kpi_comparison"
      ],
      covered_signal_families: [
        "customer_attested_kpi_baseline",
        "customer_attested_kpi_comparison"
      ],
      notes: [
        "Layer 3 export is customer-owned aggregate system-of-record metadata only."
      ],
      caveats: [
        "Layer 3 package is customer-attested aggregate outcome evidence and does not prove causality or financial impact by itself."
      ],
      allowed_uses: [
        "evidence_collection_input",
        "evidence_snapshot_preparation"
      ],
      ...overrides
    })
  };
}

test("scrubbed Layer 1 Glean telemetry export builds validated BigQuery Source Package", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export());

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.client_evidence_entry, null);
  assert.equal(result.feeds.client_evidence_entry, false);
  assert.equal(result.feeds.source_package, true);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.equal(result.feeds.claim_readiness_snapshot, false);
  assert.equal(result.feeds.executive_readout_snapshot, false);

  assert.equal(
    result.source_package.source_package_type,
    "layer_1_bigquery_telemetry_summary"
  );
  assert.equal(result.source_package.source_system_type, "bigquery_telemetry");
  assert.equal(result.source_package.evidence_state, "present");
  assert.equal(result.source_package.source_refs.source_export_id, "scrubbed_glean_export_support_layer_1_2026_05");
  assert.deepEqual(result.source_package.source_refs.reportability_signal_families, [
    "assistant",
    "search_document_retrieval",
    "agent_run"
  ]);
  assert.deepEqual(result.source_package.source_refs.covered_signal_families, [
    "assistant",
    "search_document_retrieval",
    "agent_run"
  ]);
  assert.equal(result.source_package.source_refs.vbd_summary.aggregate_only, true);

  const packageValidation = validateSourcePackage(result.source_package);
  assert.equal(packageValidation.valid, true, packageValidation.gaps.join("; "));
  assert.equal(packageValidation.feeds.full_playbook_coverage, false);
  assert.equal(packageValidation.feeds.customer_facing_economic_output, false);
});

test("scrubbed Layer 2 Glean aggregate export normalizes through Client Evidence Entry conversion", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer2Export());

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.client_evidence_entry, true);
  assert.equal(result.feeds.source_package, true);
  assert.equal(result.client_evidence_entry.evidence_layer, "layer_2_user_voice_empirical");
  assert.equal(result.client_evidence_entry.entry_mode, "aggregate_export_upload_metadata");

  const entryValidation = validateClientEvidenceEntry(result.client_evidence_entry);
  assert.equal(entryValidation.valid, true, entryValidation.gaps.join("; "));
  assert.equal(entryValidation.feeds.source_package, true);

  assert.equal(
    result.source_package.source_package_type,
    "layer_2_user_voice_empirical_export"
  );
  assert.equal(result.source_package.source_refs.source_export_id, "scrubbed_glean_export_support_layer_2_2026_05");
  assert.equal(result.source_package.source_refs.aggregate_export_id, "aggregate_ai_fluency_export_support_2026_05");
  assert.equal(result.source_package.source_refs.client_evidence_entry_id, result.client_evidence_entry.entry_id);

  const packageValidation = validateSourcePackage(result.source_package);
  assert.equal(packageValidation.valid, true, packageValidation.gaps.join("; "));
});

test("scrubbed Layer 3 aggregate outcome export carries outcome source refs for assembly", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer3Export());

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.client_evidence_entry, true);
  assert.equal(result.feeds.source_package, true);
  assert.equal(result.client_evidence_entry.evidence_layer, "layer_3_business_system_outcomes");
  assert.equal(
    result.source_package.source_package_type,
    "layer_3_business_system_of_record_outcome_export"
  );
  assert.equal(result.source_package.source_refs.source_export_id, "scrubbed_glean_export_support_layer_3_2026_05");
  assert.equal(result.source_package.source_refs.aggregate_outcome_export_id, "aggregate_support_outcome_export_2026_05");
  assert.equal(result.source_package.metric_owner_review.review_state, "reviewed");

  const packageValidation = validateSourcePackage(result.source_package);
  assert.equal(packageValidation.valid, true, packageValidation.gaps.join("; "));
});

test("raw rows or direct identifiers in the scrubbed export input fail closed", () => {
  const input = validLayer1Export({
    raw_rows: [
      {
        user_id: "u_123",
        prompt: "not allowed"
      }
    ]
  });
  const result = convertScrubbedGleanClientExportToEvidenceInputs(input);

  assert.equal(result.valid, false);
  assert.equal(result.client_evidence_entry, null);
  assert.equal(result.source_package, null);
  assert.equal(result.feeds.source_package, false);
  assert.ok(
    result.gaps.some((gap) => /Forbidden field detected: raw_rows/.test(gap)),
    result.gaps.join("; ")
  );
});

test("unsafe privacy flags in the scrubbed export input fail closed", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export({
    privacy_boundary: privacyBoundary({
      contains_direct_identifiers: true
    })
  }));

  assert.equal(result.valid, false);
  assert.equal(result.source_package, null);
  assert.ok(
    result.gaps.some((gap) =>
      /privacy_boundary\.contains_direct_identifiers must be false/.test(gap)
    ),
    result.gaps.join("; ")
  );
});

test("k-min failures become suppressed Layer 1 Source Packages instead of present evidence", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export({
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: false,
      total_slices: 12,
      k_min_clear_slices: 9,
      suppressed_or_unknown_slices: 3
    }
  }));

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.source_package.evidence_state, "suppressed");
  assert.equal(result.source_package.k_min_posture.cohort_threshold_met, false);
  assert.ok(
    result.source_package.caveats.some((caveat) => /k-min|suppressed/i.test(caveat)),
    result.source_package.caveats.join("; ")
  );

  const packageValidation = validateSourcePackage(result.source_package);
  assert.equal(packageValidation.valid, true, packageValidation.gaps.join("; "));
});

test("attempts to declare full coverage or customer-facing financial output fail closed", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export({
    coverage_status: "full_playbook_coverage",
    customer_facing_financial_output: true
  }));

  assert.equal(result.valid, false);
  assert.equal(result.source_package, null);
  assert.ok(
    result.gaps.some((gap) => /full_playbook_coverage|customer_facing_financial_output/.test(gap)),
    result.gaps.join("; ")
  );
});

test("row-like containers cannot be smuggled through scrubbed export metadata", () => {
  for (const field of ["rows", "events", "samples", "records", "raw_export", "metric_values"]) {
    const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export({
      [field]: [
        {
          aggregate_event_count: 123
        }
      ]
    }));
    assert.equal(result.valid, false, `${field} should fail closed`);
    assert.equal(result.source_package, null);
    assert.ok(
      result.gaps.some((gap) => new RegExp(field).test(gap)),
      `${field}: ${result.gaps.join("; ")}`
    );
  }
});

test("Layer 1 exports require explicit signal-family binding", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export({
    signal_families: [],
    covered_signal_families: []
  }));

  assert.equal(result.valid, false);
  assert.equal(result.source_package, null);
  assert.ok(
    result.gaps.some((gap) => /signal_families must contain at least one family/.test(gap)),
    result.gaps.join("; ")
  );
});

test("VBD metadata must remain aggregate context and cannot authorize value claims", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export({
    vbd_summary: {
      aggregate_only: false,
      allowed_interpretation: [
        "business_value_claim"
      ]
    }
  }));

  assert.equal(result.valid, false);
  assert.equal(result.source_package, null);
  assert.ok(
    result.gaps.some((gap) => /vbd_summary/.test(gap)),
    result.gaps.join("; ")
  );
});

test("converter output never includes downstream snapshot, route, UI, or persistence feeds", () => {
  const result = convertScrubbedGleanClientExportToEvidenceInputs(validLayer1Export());

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.evidence_snapshot, false);
  assert.equal(result.feeds.claim_readiness_snapshot, false);
  assert.equal(result.feeds.executive_readout_snapshot, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.equal(Object.hasOwn(result.source_package, "claim_readiness_context"), false);
  assert.equal(Object.hasOwn(result.source_package, "executive_readout_context"), false);
  assert.equal(Object.hasOwn(result.source_package, "customer_facing_economic_output"), false);
  assert.equal(Object.hasOwn(result.source_package, "persisted"), false);
  assert.equal(Object.hasOwn(result.source_package, "creates_ingestion_job"), false);
  assert.equal(Object.hasOwn(result.source_package, "creates_backend_routes"), false);
  assert.equal(Object.hasOwn(result.source_package, "creates_frontend_ui"), false);
});
