import * as shared from "@fluencytracr/shared";

const baselineRecord = {
  org_id: "org-1",
  evidence_id: "evidence-baseline",
  workflow_id: "customer_support_case_resolution",
  jbtd_id: "resolve_support_case",
  persona_id: "support_specialist",
  outcome_metric: "support_median_resolution_hours",
  outcome_unit: "hours",
  period_start: "2026-02-01T00:00:00.000Z",
  period_end: "2026-03-31T00:00:00.000Z",
  aggregate_value: 18.4,
  cohort_size: 2300,
  source_system: "Support case management system",
  ingested_at: "2026-06-01T00:00:00.000Z"
};

const comparisonRecord = {
  ...baselineRecord,
  evidence_id: "evidence-comparison",
  period_start: "2026-04-01T00:00:00.000Z",
  period_end: "2026-05-31T00:00:00.000Z",
  aggregate_value: 15.1
};

const expectedSlice = {
  workflow_id: "customer_support_case_resolution",
  jbtd_id: "resolve_support_case",
  persona_id: "support_specialist",
  baseline_window: {
    period_start: "2026-02-01T00:00:00.000Z",
    period_end: "2026-03-31T00:00:00.000Z"
  },
  comparison_window: {
    period_start: "2026-04-01T00:00:00.000Z",
    period_end: "2026-05-31T00:00:00.000Z"
  }
};

describe("Outcome Evidence exact-slice admission", () => {
  const evaluate = (
    shared as typeof shared & {
      evaluateOutcomeEvidenceAdmission: (input: unknown) => any;
    }
  ).evaluateOutcomeEvidenceAdmission;

  it("admits one exact unambiguous baseline and comparison pair", () => {
    const result = evaluate({
      expected: expectedSlice,
      records: [baselineRecord, comparisonRecord]
    });

    expect(result).toMatchObject({
      decision: "ADMITTED",
      reason_codes: [],
      receipt: {
        workflow_id: expectedSlice.workflow_id,
        jbtd_id: expectedSlice.jbtd_id,
        persona_id: expectedSlice.persona_id,
        baseline_window: {
          evidence_ids: ["evidence-baseline"]
        },
        comparison_window: {
          evidence_ids: ["evidence-comparison"]
        }
      }
    });
  });

  it("holds when a baseline and comparison would cross JBTD or persona slices", () => {
    const result = evaluate({
      expected: expectedSlice,
      records: [
        baselineRecord,
        {
          ...comparisonRecord,
          jbtd_id: "triage_support_case",
          persona_id: "support_manager"
        }
      ]
    });

    expect(result).toMatchObject({
      decision: "HELD",
      reason_codes: ["SLICE_IDENTITY_MISMATCH"],
      receipt: null
    });
  });

  it("holds legacy records that lack exact JBTD or persona identity", () => {
    const result = evaluate({
      expected: expectedSlice,
      records: [
        { ...baselineRecord, jbtd_id: null },
        { ...comparisonRecord, persona_id: null }
      ]
    });

    expect(result).toMatchObject({
      decision: "HELD",
      reason_codes: ["MISSING_EXACT_SLICE_IDENTITY"],
      receipt: null
    });
  });

  it("rejects identifying values inside an admission receipt", () => {
    const admitted = evaluate({
      expected: expectedSlice,
      records: [baselineRecord, comparisonRecord]
    });
    const identifyingPersona = {
      ...admitted.receipt,
      persona_id: "person@example.com"
    };
    const identifyingEvidenceId = {
      ...admitted.receipt,
      baseline_window: {
        ...admitted.receipt.baseline_window,
        evidence_ids: ["person@example.com"]
      }
    };

    expect(
      shared.outcomeEvidenceAdmissionReceiptGaps(identifyingPersona)
    ).toContain("admission exact slice identity is missing");
    expect(
      shared.outcomeEvidenceAdmissionReceiptGaps(identifyingEvidenceId)
    ).toContain(
      "admission.baseline_window.evidence_ids must be unique opaque aggregate-evidence IDs"
    );
  });

  it("holds same-day records whose exact observation instants drift", () => {
    const result = evaluate({
      expected: expectedSlice,
      records: [
        baselineRecord,
        {
          ...comparisonRecord,
          period_start: "2026-04-01T12:00:00.000Z"
        }
      ]
    });

    expect(result).toMatchObject({
      decision: "HELD",
      reason_codes: ["WINDOW_MISMATCH"],
      receipt: null
    });
  });

  it("holds overlapping baseline and comparison windows", () => {
    const result = evaluate({
      expected: {
        ...expectedSlice,
        comparison_window: {
          period_start: "2026-03-01T00:00:00.000Z",
          period_end: "2026-04-30T00:00:00.000Z"
        }
      },
      records: [
        baselineRecord,
        {
          ...comparisonRecord,
          period_start: "2026-03-01T00:00:00.000Z",
          period_end: "2026-04-30T00:00:00.000Z"
        }
      ]
    });

    expect(result).toMatchObject({
      decision: "HELD",
      reason_codes: ["WINDOW_MISMATCH"],
      receipt: null
    });
  });

  it("holds duplicate candidates instead of selecting by insertion order", () => {
    const result = evaluate({
      expected: expectedSlice,
      records: [
        baselineRecord,
        comparisonRecord,
        {
          ...comparisonRecord,
          evidence_id: "evidence-comparison-conflict",
          aggregate_value: 99
        }
      ]
    });

    expect(result).toMatchObject({
      decision: "HELD",
      reason_codes: ["AMBIGUOUS_EVIDENCE_PAIR"],
      receipt: null
    });
  });

  it("holds an incomplete baseline or comparison pair", () => {
    const result = evaluate({
      expected: expectedSlice,
      records: [baselineRecord]
    });

    expect(result).toMatchObject({
      decision: "HELD",
      reason_codes: ["MISSING_EVIDENCE_PAIR"],
      receipt: null
    });
  });
});
