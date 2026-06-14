import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildClientEvidenceRequestsFromEvidenceSnapshot,
  buildClientEvidenceRequestsFromMeasurementPlan,
  buildPlaybookMeasurementPlanDraft,
  buildTelemetryEvidenceSnapshotDraft,
  validateClientEvidenceRequest
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-client-evidence-request/examples";

const EXAMPLE_FILES = [
  "layer-2-user-voice-request.json",
  "layer-3-business-outcome-request.json",
  "assumption-approval-request.json",
  "workforce-context-request.json"
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function buildPlan() {
  return buildPlaybookMeasurementPlanDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    hypothesisStatement:
      "AI-assisted support workflows may improve aggregate case resolution posture when paired with customer-owned evidence.",
    businessObjective: "Improve aggregate support case resolution experience.",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    measurementPlanId: "measurement_plan_client_evidence_request_test"
  });
}

function buildPlanWithWorkforceRequired() {
  const plan = buildPlan();
  plan.aggregate_workforce_context_requirements.required = true;
  plan.aggregate_workforce_context_requirements.source_owner_approval_required = true;
  plan.source_package_requirements.aggregate_workforce_context_required = true;
  return plan;
}

function buildSnapshot() {
  return buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_client_evidence_request_test",
    measurementPlanId: "measurement_plan_client_evidence_request_test",
    aggregateTelemetrySummary: {
      probe_window_start: "2026-05-01",
      probe_window_end: "2026-05-31",
      aggregate_event_count: 125000,
      table_families_checked: ["scrubbed_llm_call", "scrubbed_client_analytics"],
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
      bigquery_probe_result_id: "bq_probe_client_evidence_request_test",
      source_readiness_ids: ["source_readiness_client_evidence_request_test"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    }
  });
}

function requestForLayer(requests, layer) {
  const request = requests.find((candidate) => candidate.requested_playbook_layer === layer);
  assert.ok(request, `Expected request for ${layer}`);
  return request;
}

function expectInvalid(request, expectedGapPattern) {
  const result = validateClientEvidenceRequest(request);
  assert.equal(result.valid, false, "Expected Client Evidence Request to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("all examples validate", () => {
  for (const file of EXAMPLE_FILES) {
    const request = readJson(`${EXAMPLES}/${file}`);
    const result = validateClientEvidenceRequest(request);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
  }
});

test("requests from Layer 1-only snapshot ask for Layer 2 and Layer 3 evidence", () => {
  const requests = buildClientEvidenceRequestsFromEvidenceSnapshot(buildSnapshot(), {
    createdAt: "2026-06-13T00:00:00.000Z"
  });

  const layer2 = requestForLayer(requests, "layer_2_user_voice_empirical");
  const layer3 = requestForLayer(requests, "layer_3_business_system_outcomes");
  assert.equal(validateClientEvidenceRequest(layer2).valid, true);
  assert.equal(validateClientEvidenceRequest(layer3).valid, true);
  assert.equal(layer2.allowed_claim_improvement.request_itself_upgrades_claim_readiness, false);
  assert.equal(layer3.allowed_claim_improvement.request_itself_upgrades_claim_readiness, false);
});

test("requests from Measurement Plan include required Playbook evidence requests", () => {
  const requests = buildClientEvidenceRequestsFromMeasurementPlan(buildPlanWithWorkforceRequired(), {
    createdAt: "2026-06-13T00:00:00.000Z"
  });
  for (const layer of [
    "layer_2_user_voice_empirical",
    "layer_3_business_system_outcomes",
    "governance_evidence",
    "assumption_evidence",
    "aggregate_workforce_context"
  ]) {
    const request = requestForLayer(requests, layer);
    assert.equal(validateClientEvidenceRequest(request).valid, true, layer);
  }
});

test("request forbidden fields and unsafe requested values fail", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "layer_2_user_voice_empirical"
  );

  const missingForbidden = clone(request);
  missingForbidden.forbidden_fields = missingForbidden.forbidden_fields.filter(
    (field) => field !== "raw_rows"
  );
  expectInvalid(missingForbidden, /forbidden_fields must include raw_rows/);

  const asksForRawRows = clone(request);
  asksForRawRows.required_fields.push("raw_rows");
  expectInvalid(asksForRawRows, /request asks for unsafe or unsupported field\/output: raw_rows/);

  for (const unsafeField of [
    "user_id",
    "employee_id",
    "person_id",
    "direct_ids",
    "hashed_user_id",
    "joinable_user_id"
  ]) {
    const unsafeIdentifier = clone(request);
    unsafeIdentifier.required_fields.push(unsafeField);
    expectInvalid(
      unsafeIdentifier,
      new RegExp(`request asks for unsafe or unsupported field/output: ${unsafeField}`)
    );
  }

  const directIdentifierKey = clone(request);
  directIdentifierKey.direct_identifier = "employee-123";
  expectInvalid(directIdentifierKey, /Forbidden field detected: direct_identifier/);

  const unsafePrivacy = clone(request);
  unsafePrivacy.privacy_requirements.contains_hashed_or_joinable_person_identifiers = true;
  expectInvalid(
    unsafePrivacy,
    /privacy_requirements\.contains_hashed_or_joinable_person_identifiers must be false/
  );

  const badThreshold = clone(request);
  badThreshold.minimum_cohort_threshold = "abc";
  expectInvalid(badThreshold, /minimum_cohort_threshold must be a finite number at least 5/);
});

test("camelCase forbidden request fields fail after key normalization", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "layer_2_user_voice_empirical"
  );

  for (const field of [
    "userId",
    "personId",
    "rawRows",
    "fileContents",
    "managerRanking",
    "peopleDecisioning"
  ]) {
    const unsafe = clone(request);
    unsafe[field] = "blocked";
    expectInvalid(unsafe, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("request metadata and narrative strings reject identifier values", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "layer_2_user_voice_empirical"
  );

  const emailRequestId = clone(request);
  emailRequestId.request_id = "jane.doe@example.com";
  expectInvalid(emailRequestId, /Forbidden metadata value detected: request_id/);

  const identifierInstructions = clone(request);
  identifierInstructions.customer_instructions = [
    "Ask the source owner to attach user_id_12345 for follow-up."
  ];
  expectInvalid(identifierInstructions, /Forbidden metadata value detected: customer_instructions/);
});

test("request builder fails closed when Measurement Plan validation fails", () => {
  const plan = buildPlan();
  plan.source_package_requirements.system_of_record_export_required = false;

  assert.throws(
    () => buildClientEvidenceRequestsFromMeasurementPlan(plan),
    /Measurement Plan is invalid/
  );
});

test("snapshot request builder does not ask for workforce context when it is not required or allowed", () => {
  const requests = buildClientEvidenceRequestsFromEvidenceSnapshot(buildSnapshot(), {
    createdAt: "2026-06-13T00:00:00.000Z"
  });

  assert.equal(
    requests.some((request) => request.requested_playbook_layer === "aggregate_workforce_context"),
    false
  );
});

test("Layer 2 request requires aggregate format and aggregate response summary", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "layer_2_user_voice_empirical"
  );
  const noAggregateFormat = clone(request);
  noAggregateFormat.accepted_formats = ["source_owner_attestation"];
  expectInvalid(noAggregateFormat, /Layer 2 request requires an aggregate user voice or AI Fluency format/);

  const missingSummary = clone(request);
  missingSummary.required_fields = missingSummary.required_fields.filter(
    (field) => field !== "aggregate_response_summary"
  );
  expectInvalid(missingSummary, /Layer 2 request requires aggregate_response_summary/);
});

test("Layer 3 request requires customer-owned aggregate metric and metric owner attestation", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "layer_3_business_system_outcomes"
  );
  const noMetricFormat = clone(request);
  noMetricFormat.accepted_formats = ["source_owner_attestation"];
  expectInvalid(noMetricFormat, /Layer 3 request requires a customer-owned aggregate metric format/);

  const missingMetric = clone(request);
  missingMetric.required_fields = missingMetric.required_fields.filter(
    (field) => field !== "customer_owned_aggregate_metric"
  );
  expectInvalid(missingMetric, /Layer 3 request requires customer_owned_aggregate_metric/);

  const missingAttestation = clone(request);
  missingAttestation.required_fields = missingAttestation.required_fields.filter(
    (field) => field !== "metric_owner_attestation"
  );
  expectInvalid(missingAttestation, /Layer 3 request requires metric_owner_attestation/);
});

test("workforce request requires aggregate-only and non-decisioning labels", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlanWithWorkforceRequired()),
    "aggregate_workforce_context"
  );
  const decisioning = clone(request);
  decisioning.privacy_requirements.non_decisioning_context = false;
  expectInvalid(decisioning, /aggregate_workforce_context request requires non_decisioning_context true/);

  const missingCaveat = clone(request);
  missingCaveat.required_caveats = ["Aggregate workforce context can inform interpretation only."];
  expectInvalid(missingCaveat, /aggregate_workforce_context request requires non-decisioning caveat/);

  for (const requiredField of [
    "source_owner_attestation",
    "approved_aggregate_grain",
    "minimum_cohort_threshold",
    "non_decisioning_context_label"
  ]) {
    const missingField = clone(request);
    missingField.required_fields = missingField.required_fields.filter(
      (field) => field !== requiredField
    );
    expectInvalid(
      missingField,
      new RegExp(`aggregate_workforce_context request requires ${requiredField}`)
    );
  }

  const noSourceApproval = clone(request);
  noSourceApproval.privacy_requirements.source_owner_approval_required = false;
  expectInvalid(noSourceApproval, /source_owner_approval_required true/);

  const unsafe = clone(request);
  unsafe.privacy_requirements.aggregate_only = false;
  expectInvalid(unsafe, /privacy_requirements\.aggregate_only must be true/);
});

test("assumption request requires approval owner role and approval request type", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "assumption_evidence"
  );
  const missingApprover = clone(request);
  delete missingApprover.approver_role;
  expectInvalid(missingApprover, /assumption_evidence request requires approver_role/);

  const wrongType = clone(request);
  wrongType.request_type = "manual_aggregate_entry";
  expectInvalid(wrongType, /assumption_evidence request requires finance_or_business_approval or owner_attestation/);
});

test("request cannot itself upgrade claim readiness or create downstream outputs", () => {
  const request = requestForLayer(
    buildClientEvidenceRequestsFromMeasurementPlan(buildPlan()),
    "layer_3_business_system_outcomes"
  );
  const result = validateClientEvidenceRequest(request);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.source_package, false);
  assert.equal(result.feeds.evidence_snapshot, false);
  assert.equal(result.feeds.claim_readiness_snapshot, false);
  assert.equal(result.feeds.executive_readout_snapshot, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);

  const upgraded = clone(request);
  upgraded.allowed_claim_improvement.request_itself_upgrades_claim_readiness = true;
  expectInvalid(
    upgraded,
    /allowed_claim_improvement\.request_itself_upgrades_claim_readiness must be false/
  );

  const financial = clone(request);
  financial.allowed_claim_improvement.financial_claims_allowed = true;
  expectInvalid(financial, /allowed_claim_improvement\.financial_claims_allowed must be false/);
});
