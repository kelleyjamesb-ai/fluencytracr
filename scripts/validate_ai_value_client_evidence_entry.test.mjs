import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION,
  buildSourcePackageFromClientEvidenceEntry,
  validateClientEvidenceEntry,
  validateSourcePackage
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-client-evidence-entry/examples";

const EXAMPLE_FILES = [
  "aggregate-export-upload-metadata-entry.json",
  "manual-layer-3-outcome-entry.json",
  "manual-layer-2-user-voice-entry.json",
  "manual-governance-attestation-entry.json",
  "manual-assumption-approval-entry.json",
  "manual-workforce-context-entry.json",
  "rejected-person-level-entry.json"
];

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
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

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

function validEntry(overrides = {}) {
  return {
    schema_version: AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION,
    entry_id: "client_evidence_entry_test_layer_3",
    request_id: "client_evidence_request_test_layer_3",
    org_id: "org_example",
    measurement_plan_id: "measurement_plan_client_evidence_entry_test",
    evidence_layer: "layer_3_business_system_outcomes",
    entry_mode: "manual_aggregate_metric_entry",
    entered_by_role: "post_sales_value_consultant",
    source_owner_role: "customer_metric_owner",
    approver_role: "customer_business_owner",
    attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_metric_owner",
      attested_at: "2026-06-13T00:00:00.000Z",
      caveats: []
    },
    aggregate_grain: "workflow_family",
    minimum_cohort_threshold: 5,
    covered_window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    metric_or_signal_summary: {
      summary_type: "customer_owned_aggregate_metric_summary",
      aggregate_metric_name: "aggregate_support_case_resolution_rate",
      aggregate_value_present: true,
      source_refs: {
        source_readiness_id: "source_readiness_client_evidence_entry_test",
        aggregate_entry_ref: "manual_layer_3_outcome_entry_test"
      },
      notes: [
        "Customer metric owner attested that this is an aggregate KPI summary."
      ]
    },
    evidence_state: "present",
    privacy_boundary: privacyBoundary(),
    allowed_uses: [
      "evidence_collection_input",
      "evidence_snapshot_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [
      "Client evidence entry is aggregate evidence input only and cannot prove causality or financial impact by itself."
    ],
    validation_status: "validated",
    created_at: "2026-06-13T00:00:00.000Z",
    derivation_version: "ai_value_client_evidence_entry_builder_2026_06",
    ...overrides
  };
}

function expectValid(entry) {
  const result = validateClientEvidenceEntry(entry);
  assert.equal(result.valid, true, result.gaps.join("; "));
  return result;
}

function expectInvalid(entry, expectedGapPattern) {
  const result = validateClientEvidenceEntry(entry);
  assert.equal(result.valid, false, "Expected Client Evidence Entry to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
  assert.equal(result.feeds.source_package, false);
  return result;
}

test("all examples validate while rejected metadata does not feed Source Packages", () => {
  for (const file of EXAMPLE_FILES) {
    const entry = readJson(`${EXAMPLES}/${file}`);
    const result = validateClientEvidenceEntry(entry);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
    assert.equal(
      result.feeds.source_package,
      file !== "rejected-person-level-entry.json",
      `${file} Source Package feed posture`
    );
  }
});

test("valid manual Layer 3 aggregate outcome entry validates", () => {
  const entry = readJson(`${EXAMPLES}/manual-layer-3-outcome-entry.json`);
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, true);
});

test("valid manual Layer 3 aggregate business outcome KPI metric names validate", () => {
  for (const metricName of [
    "aggregate_revenue_conversion_rate",
    "aggregate_profit_margin",
    "aggregate_support_cost_savings_rate"
  ]) {
    const entry = validEntry();
    entry.metric_or_signal_summary.aggregate_metric_name = metricName;
    const result = expectValid(entry);
    assert.equal(result.feeds.source_package, true, metricName);
  }
});

test("Layer 3 aggregate business outcome KPI metric names still reject ROI and financial output claims", () => {
  for (const metricName of [
    "aggregate_revenue_roi",
    "aggregate_profit_financial_output",
    "aggregate_support_cost_savings_customer_facing_financial_output"
  ]) {
    const entry = validEntry();
    entry.metric_or_signal_summary.aggregate_metric_name = metricName;
    expectInvalid(entry, new RegExp(`Forbidden value detected: ${metricName}`));
  }
});

test("valid manual Layer 2 aggregate user voice entry validates", () => {
  const entry = readJson(`${EXAMPLES}/manual-layer-2-user-voice-entry.json`);
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, true);
});

test("valid aggregate export upload metadata entry validates", () => {
  const entry = readJson(`${EXAMPLES}/aggregate-export-upload-metadata-entry.json`);
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, true);
});

test("valid governance attestation entry validates", () => {
  const entry = readJson(`${EXAMPLES}/manual-governance-attestation-entry.json`);
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, true);
});

test("valid assumption approval entry validates", () => {
  const entry = readJson(`${EXAMPLES}/manual-assumption-approval-entry.json`);
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, true);
});

test("valid workforce context entry validates", () => {
  const entry = readJson(`${EXAMPLES}/manual-workforce-context-entry.json`);
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, true);
});

test("person-level entry fails", () => {
  const entry = validEntry({
    person_id: "person-123"
  });
  expectInvalid(entry, /Forbidden field detected: person_id/);
});

test("raw content entry fails", () => {
  const entry = validEntry({
    raw_rows: [
      { event_name: "do-not-store" }
    ]
  });
  expectInvalid(entry, /Forbidden field detected: raw_rows/);

  const rawContentFlag = validEntry({
    privacy_boundary: privacyBoundary({ contains_raw_content: true })
  });
  expectInvalid(rawContentFlag, /privacy_boundary\.contains_raw_content must be false/);
});

test("raw response and query text variants fail", () => {
  for (const field of [
    "responseBody",
    "responseContent",
    "llmResponse",
    "sqlQuery",
    "searchQuery"
  ]) {
    const entry = validEntry();
    entry[field] = "blocked";
    expectInvalid(entry, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("hashed or joinable identifier entry fails", () => {
  const hashed = validEntry({
    hashed_person_id: "hash-123"
  });
  expectInvalid(hashed, /Forbidden field detected: hashed_person_id/);

  const joinable = validEntry();
  joinable.metric_or_signal_summary.source_refs.joinable_person_identifier = "joinable-123";
  expectInvalid(joinable, /Forbidden field detected: joinable_person_identifier/);
});

test("generic hashed or joinable identifier variants fail", () => {
  for (const field of [
    "hashedIdentifier",
    "hashedId",
    "joinableIdentifier",
    "joinableId"
  ]) {
    const entry = validEntry();
    entry[field] = "blocked";
    expectInvalid(entry, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("camelCase unsafe field variants fail", () => {
  for (const field of [
    "userId",
    "personId",
    "hashedPersonId",
    "joinablePersonIdentifier",
    "rawRows",
    "fileContents",
    "managerRanking",
    "peopleDecisioning"
  ]) {
    const entry = validEntry();
    entry[field] = "blocked";
    expectInvalid(entry, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("manager or team ranking entry fails", () => {
  const ranking = validEntry({
    manager_ranking: ["blocked"]
  });
  expectInvalid(ranking, /Forbidden field detected: manager_ranking/);

  const rankingFlag = validEntry({
    privacy_boundary: privacyBoundary({ contains_manager_or_team_ranking: true })
  });
  expectInvalid(rankingFlag, /privacy_boundary\.contains_manager_or_team_ranking must be false/);
});

test("people decisioning entry fails", () => {
  const decisioning = validEntry({
    people_decisioning: true
  });
  expectInvalid(decisioning, /Forbidden field detected: people_decisioning/);

  const decisioningFlag = validEntry({
    privacy_boundary: privacyBoundary({ contains_people_decisioning: true })
  });
  expectInvalid(decisioningFlag, /privacy_boundary\.contains_people_decisioning must be false/);
});

test("entry cannot authorize ROI, EBITA, productivity, causality, or customer-facing financial output", () => {
  for (const use of [
    "realized_roi",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "customer_facing_financial_output"
  ]) {
    const entry = validEntry({
      allowed_uses: ["evidence_collection_input", use]
    });
    expectInvalid(entry, new RegExp(`allowed_uses contains blocked or unsupported use: ${use}`));
  }

  const metricClaim = validEntry();
  metricClaim.metric_or_signal_summary.aggregate_metric_name = "realized_roi";
  expectInvalid(metricClaim, /Forbidden value detected: realized_roi/);

  for (const metricName of ["roiEstimate", "realizedRoi"]) {
    const camelCaseMetricClaim = validEntry();
    camelCaseMetricClaim.metric_or_signal_summary.aggregate_metric_name = metricName;
    expectInvalid(camelCaseMetricClaim, new RegExp(`Forbidden value detected: ${metricName}`));
  }
});

test("computed financial, causality, productivity, and headcount fields fail", () => {
  for (const field of [
    "roiCalculation",
    "roiEstimate",
    "roiProjection",
    "roiForecast",
    "roiScore",
    "returnOnInvestment",
    "investmentReturn",
    "financialImpact",
    "financialResult",
    "financialCalculation",
    "economicImpact",
    "economicValue",
    "profitImpact",
    "revenueImpact",
    "costSavings",
    "dollarSavings",
    "ebitaAmount",
    "causalityResult",
    "causalEffect",
    "causalDelta",
    "causationResult",
    "causationProof",
    "productivityLift",
    "headcountReduction",
    "customerFacingFinancialOutput"
  ]) {
    const entry = validEntry();
    entry[field] = "blocked";
    expectInvalid(entry, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("nested source reference financial and economic computed fields fail", () => {
  for (const field of [
    "financialResult",
    "financialCalculation",
    "economicImpact",
    "economicValue",
    "profitImpact",
    "revenueImpact",
    "costSavings",
    "dollarSavings"
  ]) {
    const entry = validEntry();
    entry.metric_or_signal_summary.source_refs[field] = "blocked";
    expectInvalid(entry, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("unsafe metadata values fail even when field names are metadata-safe", () => {
  const emailId = validEntry({
    entry_id: "jane.doe@example.com"
  });
  expectInvalid(emailId, /Forbidden metadata value/);

  const userIdRequest = validEntry({
    request_id: "user_id_12345"
  });
  expectInvalid(userIdRequest, /Forbidden metadata value/);

  for (const value of [
    "jane.doe@example.com",
    "user_id_12345",
    "person-123",
    "employee-123",
    "userId12345",
    "raw transcript text",
    "select * from raw_events",
    "roiEstimate"
  ]) {
    const entry = validEntry();
    entry.metric_or_signal_summary.source_refs.aggregate_entry_ref = value;
    expectInvalid(entry, /Forbidden metadata value/);
  }
});

test("string array fields reject non-string elements", () => {
  const badCaveat = validEntry({
    required_caveats: [42]
  });
  expectInvalid(badCaveat, /required_caveats must contain only strings/);

  const badAttestationCaveat = validEntry();
  badAttestationCaveat.attestation.caveats = [false];
  expectInvalid(badAttestationCaveat, /attestation\.caveats must contain only strings/);

  const badNote = validEntry();
  badNote.metric_or_signal_summary.notes = [null];
  expectInvalid(badNote, /metric_or_signal_summary\.notes must contain only strings/);
});

test("caveat strings reject direct identifier values while allowing warning language", () => {
  const badRequiredCaveat = validEntry({
    required_caveats: ["jane.doe@example.com"]
  });
  expectInvalid(badRequiredCaveat, /Forbidden identifier value/);

  const badAttestationCaveat = validEntry();
  badAttestationCaveat.attestation.caveats = ["person-123"];
  expectInvalid(badAttestationCaveat, /Forbidden identifier value/);

  const safeWarning = validEntry({
    required_caveats: [
      "Entry cannot support ROI, causality, person-level productivity, or raw source content."
    ]
  });
  const result = expectValid(safeWarning);
  assert.equal(result.feeds.source_package, true);
});

test("upload metadata entries fail if raw files are retained", () => {
  const entry = validEntry({
    entry_mode: "aggregate_export_upload_metadata",
    privacy_boundary: privacyBoundary({ contains_raw_files: true })
  });
  expectInvalid(entry, /privacy_boundary\.contains_raw_files must be false/);
});

test("invalid entry cannot produce Source Package", () => {
  const entry = validEntry({
    raw_rows: [
      { event_name: "do-not-store" }
    ]
  });
  assert.throws(
    () => buildSourcePackageFromClientEvidenceEntry(entry),
    /Client Evidence Entry is invalid/
  );
});

test("submitted entry cannot produce Source Package before validation", () => {
  const entry = validEntry({
    validation_status: "submitted"
  });
  const result = expectValid(entry);
  assert.equal(result.feeds.source_package, false);
  assert.throws(
    () => buildSourcePackageFromClientEvidenceEntry(entry),
    /must be validated before Source Package creation/
  );
});

test("validated entry can produce Source Package through Source Package validator", () => {
  const entry = readJson(`${EXAMPLES}/manual-layer-3-outcome-entry.json`);
  const sourcePackage = buildSourcePackageFromClientEvidenceEntry(entry, {
    generatedAt: "2026-06-13T00:00:00.000Z",
    sourcePackageId: "source_package_from_client_evidence_entry_test"
  });

  assert.equal(
    sourcePackage.source_package_type,
    "layer_3_business_system_of_record_outcome_export"
  );
  assert.equal(sourcePackage.source_system_type, "manual_customer_attestation");
  assert.equal(sourcePackage.source_refs.client_evidence_entry_id, entry.entry_id);
  assert.deepEqual(sourcePackage.blocked_uses, REQUIRED_BLOCKED_USES);

  const result = validateSourcePackage(sourcePackage);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.evidence_collection_input, true);
  assert.equal(result.feeds.full_playbook_coverage, false);
  assert.equal(result.feeds.customer_facing_economic_output, false);
});

test("all valid entry modes build the expected Source Package type", () => {
  const expectedTypes = new Map([
    ["aggregate-export-upload-metadata-entry.json", "layer_2_user_voice_empirical_export"],
    ["manual-layer-2-user-voice-entry.json", "layer_2_user_voice_empirical_export"],
    ["manual-layer-3-outcome-entry.json", "layer_3_business_system_of_record_outcome_export"],
    ["manual-governance-attestation-entry.json", "governance_control_export"],
    ["manual-assumption-approval-entry.json", "assumption_approval_export"],
    ["manual-workforce-context-entry.json", "aggregate_workforce_context_export"]
  ]);

  for (const [file, expectedType] of expectedTypes) {
    const entry = readJson(`${EXAMPLES}/${file}`);
    const sourcePackage = buildSourcePackageFromClientEvidenceEntry(entry, {
      generatedAt: "2026-06-13T00:00:00.000Z",
      sourcePackageId: `source_package_${entry.entry_id}`
    });
    assert.equal(sourcePackage.source_package_type, expectedType, file);
    const result = validateSourcePackage(sourcePackage);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
    assert.equal(result.feeds.full_playbook_coverage, false);
    assert.equal(result.feeds.customer_facing_economic_output, false);
  }
});

test("unsafe Source Package ids are rejected by the final Source Package gate", () => {
  const entry = readJson(`${EXAMPLES}/manual-layer-3-outcome-entry.json`);
  assert.throws(
    () => buildSourcePackageFromClientEvidenceEntry(entry, {
      sourcePackageId: "jane.doe@example.com"
    }),
    /Derived Source Package is invalid/
  );
});
