import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSupportPilotGleanReadinessMapFromRuntimeEvidence,
  buildTelemetryEvidenceSnapshotDraft,
  validateEvidenceSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const SOURCE_PACKAGE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";

const EXPECTED_COVERAGE_SIGNALS = {
  layer_1_platform_telemetry: [
    "workflow_run_count",
    "search_activity",
    "chat_or_assistant_activity",
    "ai_answer_activity",
    "active_user_aggregate",
    "eligible_cohort_size",
    "connector_or_source_coverage",
    "skill_lifecycle_activity",
    "agent_lifecycle_activity",
    "artifact_output_metadata",
    "mcp_action_boundary_metadata",
    "control_or_policy_telemetry",
    "suppression_or_blocked_event_posture"
  ],
  layer_2_user_voice_empirical: [
    "aggregate_ai_fluency_baseline",
    "aggregate_ai_fluency_retest",
    "aggregate_confidence_or_readiness_survey",
    "aggregate_knowledge_access_satisfaction",
    "aggregate_workflow_observation",
    "aggregate_qualitative_proof_points",
    "customer_approved_time_and_motion_summary"
  ],
  layer_3_business_system_outcomes: [
    "customer_attested_kpi_baseline",
    "customer_attested_kpi_comparison",
    "source_system_name",
    "source_owner_attestation",
    "metric_owner_review",
    "finance_or_business_owner_approval",
    "aggregate_outcome_metric_movement",
    "minimum_cohort_threshold",
    "system_of_record_export_availability"
  ],
  governance_evidence: [
    "suppression_state",
    "k_min_posture",
    "source_readiness_state",
    "data_boundary_state",
    "approved_aggregate_grain",
    "held_suppressed_missing_lanes",
    "forbidden_field_checks",
    "raw_content_exclusion"
  ],
  assumption_evidence: [
    "customer_owned_assumptions",
    "productivity_recapture_assumption_if_relevant",
    "aggregate_workforce_context_approval_if_provided",
    "financial_assumption_approval_if_requested",
    "low_confidence_assumptions",
    "high_sensitivity_assumptions",
    "customer_facing_approval_state"
  ]
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function buildValidTelemetrySnapshot() {
  return buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_customer_support_2026_05",
    measurementPlanId: "measurement_plan_customer_support_2026_05",
    aggregateTelemetrySummary: {
      probe_window_start: "2026-05-01",
      probe_window_end: "2026-05-31",
      aggregate_event_count: 125000,
      table_families_checked: [
        "scrubbed_llm_call",
        "scrubbed_client_analytics",
        "scrubbed_workflows"
      ],
      approved_field_coverage_summary: {
        approved_fields_expected: 24,
        approved_fields_found: 18,
        approved_fields_missing: 6
      },
      k_min_summary: {
        total_slices: 12,
        k_min_clear_slices: 12,
        suppressed_or_unknown_slices: 0,
        minimum_cohort_threshold: 5
      }
    },
    sourceRefs: {
      bigquery_probe_result_id: "bq_probe_ready_for_caveated_snapshot",
      source_readiness_ids: ["source_readiness_example"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    }
  });
}

function promoteToFullPlaybookCoverage(snapshot, sourcePackages) {
  snapshot.snapshot_type = "FULL_STACK_EVIDENCE";
  snapshot.playbook_coverage.coverage_status = "full_playbook_coverage";
  snapshot.playbook_coverage.layer_1_platform_telemetry.status = "present";
  snapshot.playbook_coverage.layer_1_platform_telemetry.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.layer_1_platform_telemetry;
  snapshot.playbook_coverage.layer_1_platform_telemetry.missing_signals = [];
  snapshot.playbook_coverage.layer_1_platform_telemetry.held_signals = [];
  snapshot.playbook_coverage.layer_2_user_voice_empirical.status = "present";
  snapshot.playbook_coverage.layer_2_user_voice_empirical.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.layer_2_user_voice_empirical;
  snapshot.playbook_coverage.layer_2_user_voice_empirical.missing_signals = [];
  snapshot.playbook_coverage.layer_2_user_voice_empirical.held_signals = [];
  snapshot.playbook_coverage.layer_3_business_system_outcomes.status = "present";
  snapshot.playbook_coverage.layer_3_business_system_outcomes.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.layer_3_business_system_outcomes;
  snapshot.playbook_coverage.layer_3_business_system_outcomes.missing_signals = [];
  snapshot.playbook_coverage.layer_3_business_system_outcomes.held_signals = [];
  snapshot.playbook_coverage.governance_evidence.status = "present";
  snapshot.playbook_coverage.governance_evidence.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.governance_evidence;
  snapshot.playbook_coverage.governance_evidence.missing_signals = [];
  snapshot.playbook_coverage.governance_evidence.held_signals = [];
  snapshot.playbook_coverage.assumption_evidence.status = "present";
  snapshot.playbook_coverage.assumption_evidence.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.assumption_evidence;
  snapshot.playbook_coverage.assumption_evidence.missing_signals = [];
  snapshot.playbook_coverage.assumption_evidence.held_signals = [];
  snapshot.playbook_layers.layer_2_user_voice_empirical.evidence_state = "present";
  snapshot.playbook_layers.layer_3_business_system_outcomes.evidence_state = "present";
  snapshot.playbook_layers.governance_evidence.evidence_state = "present";
  snapshot.playbook_layers.assumption_evidence.evidence_state = "present";
  snapshot.source_refs.outcome_evidence_ids = ["outcome_evidence_customer_support_2026_06"];
  snapshot.source_refs.source_package_ids = sourcePackages.map(
    (sourcePackage) => sourcePackage.source_package_id
  );
  snapshot.aggregate_telemetry_summary.k_min_summary = {
    total_slices: 12,
    k_min_clear_slices: 12,
    suppressed_or_unknown_slices: 0,
    minimum_cohort_threshold: 5
  };
}

function sourcePackages({ layer1Overrides = {} } = {}) {
  const packages = [
    readJson(`${SOURCE_PACKAGE_EXAMPLES}/layer-1-bigquery-telemetry-package.json`),
    readJson(`${SOURCE_PACKAGE_EXAMPLES}/layer-2-user-voice-package.json`),
    readJson(`${SOURCE_PACKAGE_EXAMPLES}/layer-3-system-of-record-outcome-package.json`),
    readJson(`${SOURCE_PACKAGE_EXAMPLES}/governance-control-package.json`),
    readJson(`${SOURCE_PACKAGE_EXAMPLES}/assumption-approval-package.json`)
  ].map(clone);
  Object.assign(packages[0], layer1Overrides);
  packages[0].source_refs = {
    ...packages[0].source_refs,
    ...(layer1Overrides.source_refs ?? {})
  };
  return packages;
}

function fullCoverageInput({ layer1Overrides = {} } = {}) {
  const packages = sourcePackages({ layer1Overrides });
  const snapshot = buildValidTelemetrySnapshot();
  promoteToFullPlaybookCoverage(snapshot, packages);
  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return { evidenceSnapshot: snapshot, sourcePackages: packages };
}

function buildMap(input) {
  return buildSupportPilotGleanReadinessMapFromRuntimeEvidence({
    ...input,
    generatedAt: "2026-06-13T00:00:00.000Z"
  });
}

test("telemetry-only snapshots cannot build support pilot reportability readiness", () => {
  const packages = sourcePackages({
    layer1Overrides: {
      source_refs: {
        covered_signal_families: ["assistant", "search_document_retrieval", "agent_run"]
      }
    }
  });
  const snapshot = buildValidTelemetrySnapshot();
  snapshot.source_refs.source_package_ids = packages.map(
    (sourcePackage) => sourcePackage.source_package_id
  );

  assert.throws(
    () => buildMap({ evidenceSnapshot: snapshot, sourcePackages: packages }),
    /Full Playbook coverage is required/
  );
});

test("provided source packages must match snapshot source package refs", () => {
  const input = fullCoverageInput({
    layer1Overrides: {
      source_refs: {
        covered_signal_families: ["assistant", "search_document_retrieval", "agent_run"]
      }
    }
  });
  input.sourcePackages[0].source_package_id = "source_package_unbound_layer_1";

  assert.throws(
    () => buildMap(input),
    /Source Package binding drift detected/
  );
});

test("package-level signal family evidence is required before marking readiness present", () => {
  const map = buildMap(fullCoverageInput());

  assert.deepEqual(
    map.entries.map((entry) => [entry.signal_family, entry.readiness_status]),
    [
      ["assistant", "not_computed"],
      ["search_document_retrieval", "not_computed"],
      ["agent_run", "not_computed"]
    ]
  );
});

test("non-present source package evidence states cannot become present readiness", () => {
  const map = buildMap(
    fullCoverageInput({
      layer1Overrides: {
        evidence_state: "held",
        source_owner_attestation: {
          attestation_state: "held",
          attested_by_role: "data_platform_owner",
          attested_at: "2026-06-13T00:00:00.000Z",
          caveats: ["Layer 1 export is held for review."]
        },
        source_refs: {
          covered_signal_families: ["assistant", "search_document_retrieval", "agent_run"]
        }
      }
    })
  );

  assert.deepEqual(
    map.entries.map((entry) => entry.readiness_status),
    ["not_computed", "not_computed", "not_computed"]
  );
});

test("support pilot readiness only exposes approved pilot surfaces", () => {
  const map = buildMap(
    fullCoverageInput({
      layer1Overrides: {
        source_refs: {
          covered_signal_families: [
            "assistant",
            "search_document_retrieval",
            "agent_run",
            "skill_lifecycle",
            "insights",
            "mcp_usage"
          ]
        }
      }
    })
  );

  assert.deepEqual(
    map.entries.map((entry) => entry.signal_family),
    ["assistant", "search_document_retrieval", "agent_run"]
  );
  assert.deepEqual(
    map.entries.map((entry) => entry.readiness_status),
    ["present", "present", "present"]
  );
});
