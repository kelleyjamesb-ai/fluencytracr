import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
  validateSourcePackage
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-source-packages/examples";

const EXAMPLE_FILES = [
  "layer-1-bigquery-telemetry-package.json",
  "layer-2-user-voice-package.json",
  "layer-3-system-of-record-outcome-package.json",
  "aggregate-workforce-context-package.json",
  "governance-control-package.json",
  "assumption-approval-package.json"
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function validPackage(overrides = {}) {
  return {
    schema_version: AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
    source_package_id: "source_package_test_layer_1",
    org_id: "org_example",
    source_package_type: "layer_1_bigquery_telemetry_summary",
    source_owner_role: "data_platform_owner",
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: "data_platform_owner",
      attested_at: "2026-06-13T00:00:00.000Z",
      caveats: []
    },
    generated_at: "2026-06-13T00:00:00.000Z",
    covered_window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    approved_aggregate_grain: "workflow_family",
    minimum_cohort_threshold: 5,
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 12,
      k_min_clear_slices: 12,
      suppressed_or_unknown_slices: 0
    },
    source_system_type: "bigquery_telemetry",
    source_refs: {
      source_readiness_id: "source_readiness_layer_1",
      aggregate_probe_id: "probe_layer_1_summary"
    },
    evidence_state: "present",
    privacy_boundary: {
      aggregate_only: true,
      contains_direct_identifiers: false,
      contains_raw_content: false,
      contains_person_level_productivity: false,
      contains_person_level_hris_records: false,
      contains_hashed_or_joinable_person_identifiers: false,
      contains_manager_or_team_ranking: false,
      contains_people_decisioning: false,
      contains_compensation_or_performance_inference: false,
      contains_promotion_or_discipline_inference: false,
      contains_attrition_prediction: false,
      contains_hris_inference_from_ai_usage: false
    },
    allowed_uses: [
      "evidence_collection_input",
      "source_availability_summary"
    ],
    blocked_uses: [
      "realized_roi",
      "ebita_claim",
      "causality_claim",
      "productivity_claim",
      "headcount_reduction_claim",
      "individual_attribution",
      "manager_or_team_ranking",
      "people_decisioning",
      "customer_facing_financial_output"
    ],
    caveats: [
      "Source package is aggregate evidence input only and cannot create full Playbook coverage by itself."
    ],
    derivation_version: "source_package_test_2026_06",
    ...overrides
  };
}

function expectInvalid(pkg, expectedGapPattern) {
  const result = validateSourcePackage(pkg);
  assert.equal(result.valid, false, "Expected source package to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("all examples validate", () => {
  for (const file of EXAMPLE_FILES) {
    const pkg = readJson(`${EXAMPLES}/${file}`);
    const result = validateSourcePackage(pkg);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
  }
});

test("unsafe raw content fails", () => {
  const pkg = validPackage();
  pkg.raw_rows = [{ event: "do-not-store" }];
  expectInvalid(pkg, /Forbidden field/);
});

test("camelCase raw content fields fail", () => {
  const pkg = validPackage();
  pkg.rawRows = [{ aggregateCount: 12 }];
  expectInvalid(pkg, /Forbidden field/);
});

test("direct identifiers fail", () => {
  const pkg = validPackage();
  pkg.privacy_boundary.contains_direct_identifiers = true;
  expectInvalid(pkg, /privacy_boundary\.contains_direct_identifiers must be false/);
});

test("direct identifier fields fail even when privacy flag is false", () => {
  const pkg = validPackage();
  pkg.source_refs.directIdentifier = "employee-123";
  expectInvalid(pkg, /Forbidden field/);
});

test("hashed or joinable person identifiers fail", () => {
  const pkg = validPackage();
  pkg.hashed_person_id = "abc";
  expectInvalid(pkg, /Forbidden field/);
});

test("joinable identifier variants fail inside source refs", () => {
  const pkg = validPackage();
  pkg.source_refs.joinablePersonIdentifier = "hashable-person-key";
  expectInvalid(pkg, /Forbidden field/);
});

test("query and file content variants fail inside source refs", () => {
  const queryPackage = validPackage();
  queryPackage.source_refs.query = "select * from raw_events";
  expectInvalid(queryPackage, /Forbidden field/);

  const filePackage = validPackage();
  filePackage.source_refs.fileContents = "raw exported content";
  expectInvalid(filePackage, /Forbidden field/);
});

test("person-level HRIS fails", () => {
  const pkg = validPackage();
  pkg.person_level_hris_record = {};
  expectInvalid(pkg, /Forbidden field/);
});

test("person-level productivity fails", () => {
  const pkg = validPackage();
  pkg.privacy_boundary.contains_person_level_productivity = true;
  expectInvalid(pkg, /privacy_boundary\.contains_person_level_productivity must be false/);
});

test("manager or team ranking fails", () => {
  const pkg = validPackage();
  pkg.manager_ranking = ["blocked"];
  expectInvalid(pkg, /Forbidden field/);
});

test("top-level manager or team ranking authorization fails", () => {
  const pkg = validPackage();
  pkg.manager_or_team_ranking = true;
  expectInvalid(pkg, /Forbidden field/);
});

test("people decisioning fails", () => {
  const pkg = validPackage();
  pkg.privacy_boundary.contains_people_decisioning = true;
  expectInvalid(pkg, /privacy_boundary\.contains_people_decisioning must be false/);
});

test("top-level people decisioning authorization fails", () => {
  const pkg = validPackage();
  pkg.people_decisioning = true;
  expectInvalid(pkg, /Forbidden field/);
});

test("Layer 2 package must be aggregate-only", () => {
  const pkg = validPackage({
    source_package_type: "layer_2_user_voice_empirical_export",
    source_system_type: "aggregate_survey_export"
  });
  pkg.privacy_boundary.aggregate_only = false;
  expectInvalid(pkg, /privacy_boundary\.aggregate_only must be true/);
});

test("Layer 3 package requires metric owner review or caveat", () => {
  const pkg = validPackage({
    source_package_type: "layer_3_business_system_of_record_outcome_export",
    source_system_type: "customer_system_of_record"
  });
  expectInvalid(pkg, /Layer 3 package requires metric_owner_review or caveat/);

  const caveated = clone(pkg);
  caveated.caveats.push("Metric owner review is pending and must be completed before this package can support stronger evidence posture.");
  const result = validateSourcePackage(caveated);
  assert.equal(result.valid, true, result.gaps.join("; "));
});

test("assumption approval package requires approval state", () => {
  const pkg = validPackage({
    source_package_type: "assumption_approval_export",
    source_system_type: "finance_approved_assumption"
  });
  expectInvalid(pkg, /assumption_approval\.approval_state is missing/);
});

test("aggregate workforce package cannot authorize productivity or people decisions", () => {
  const pkg = validPackage({
    source_package_type: "aggregate_workforce_context_export",
    source_system_type: "aggregate_workforce_export",
    aggregate_workforce_context: {
      source_owner_approval_state: "approved",
      cohort_threshold_met: true,
      allowed_context_types: ["aggregate_role_family_context"]
    }
  });
  pkg.allowed_uses.push("people_decisioning");
  expectInvalid(pkg, /allowed_uses contains blocked use/);
});

test("source package cannot create full Playbook coverage by itself", () => {
  const pkg = validPackage({
    coverage_status: "full_playbook_coverage"
  });
  expectInvalid(pkg, /Source package cannot declare full_playbook_coverage/);
});

test("source package cannot carry ROI, EBITA, causality, or financial output fields", () => {
  for (const forbiddenField of [
    "roi",
    "ebita",
    "causality",
    "financialOutput",
    "customer_facing_financial_output"
  ]) {
    const pkg = validPackage();
    pkg[forbiddenField] = "blocked";
    expectInvalid(pkg, /Forbidden field/);
  }
});

test("source package cannot claim persistence, ingestion, claim readiness, or readout outputs", () => {
  for (const forbiddenField of [
    "claim_readiness_context",
    "executive_readout_context",
    "customer_facing_economic_output",
    "persisted",
    "creates_ingestion_job",
    "creates_backend_route",
    "creates_frontend_ui",
    "claim_readiness_snapshot",
    "executive_readout_snapshot"
  ]) {
    const pkg = validPackage();
    pkg[forbiddenField] = true;
    expectInvalid(pkg, /Forbidden field|Source package cannot/);
  }
});

test("privacy-sensitive field names fail outside privacy_boundary", () => {
  for (const forbiddenField of [
    "hashed_or_joinable_person_identifiers",
    "person_level_hris_records",
    "compensation_or_performance_inference",
    "hris_inference_from_ai_usage"
  ]) {
    const pkg = validPackage();
    pkg[forbiddenField] = false;
    expectInvalid(pkg, /Forbidden field/);
  }
});

test("generic metric containers cannot smuggle financial or causal outputs", () => {
  for (const metricName of ["roi", "customer_facing_economic_output"]) {
    const pkg = validPackage();
    pkg.metric_values = [
      {
        metric_name: metricName,
        value: 123
      }
    ];
    expectInvalid(pkg, /Forbidden value/);
  }
});

test("Layer 2 aggregate response metrics are allowed when not raw responses", () => {
  const pkg = validPackage({
    source_package_type: "layer_2_user_voice_empirical_export",
    source_system_type: "aggregate_survey_export",
    aggregate_response_count: 250,
    response_rate: 0.72
  });
  const result = validateSourcePackage(pkg);
  assert.equal(result.valid, true, result.gaps.join("; "));
});
