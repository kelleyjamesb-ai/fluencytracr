import type { OutcomeEvidenceRecord } from "./outcomeEvidenceSchemas";

export const OUTCOME_EVIDENCE_ADMISSION_POLICY_VERSION =
  "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07";

export interface OutcomeEvidenceAdmissionWindow {
  period_start: string;
  period_end: string;
}

export interface OutcomeEvidenceAdmissionExpectedSlice {
  workflow_id: string;
  jbtd_id: string;
  persona_id: string;
  baseline_window: OutcomeEvidenceAdmissionWindow;
  comparison_window: OutcomeEvidenceAdmissionWindow;
}

export interface OutcomeEvidenceAdmissionInput {
  expected: OutcomeEvidenceAdmissionExpectedSlice;
  records: OutcomeEvidenceRecord[];
}

export interface OutcomeEvidenceAdmissionReceipt {
  policy_version: typeof OUTCOME_EVIDENCE_ADMISSION_POLICY_VERSION;
  workflow_id: string;
  jbtd_id: string;
  persona_id: string;
  baseline_window: OutcomeEvidenceAdmissionWindow & { evidence_ids: string[] };
  comparison_window: OutcomeEvidenceAdmissionWindow & { evidence_ids: string[] };
}

export interface OutcomeEvidenceAdmissionResult {
  decision: "ADMITTED" | "HELD";
  reason_codes: string[];
  receipt: OutcomeEvidenceAdmissionReceipt | null;
  admitted_pairs: Array<{
    baseline: OutcomeEvidenceRecord;
    comparison: OutcomeEvidenceRecord;
  }>;
}

export const OUTCOME_EVIDENCE_ADMISSION_REASON_CODES = {
  missingIdentity: "MISSING_EXACT_SLICE_IDENTITY",
  identityMismatch: "SLICE_IDENTITY_MISMATCH",
  windowMismatch: "WINDOW_MISMATCH",
  missingPair: "MISSING_EVIDENCE_PAIR",
  ambiguousPair: "AMBIGUOUS_EVIDENCE_PAIR"
} as const;

const CANONICAL_RFC3339_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const EXACT_WORKFLOW_ID = /^[a-z0-9][a-z0-9:_-]{0,179}$/;
const EXACT_SLICE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const OPAQUE_EVIDENCE_ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;

const isCanonicalInstant = (value: string): boolean =>
  CANONICAL_RFC3339_INSTANT.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const hasExactKeys = (value: Record<string, unknown>, keys: string[]): boolean =>
  Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");

const hasExactIdentity = (
  value: {
    workflow_id?: unknown;
    jbtd_id?: unknown;
    persona_id?: unknown;
  }
): boolean =>
  typeof value.workflow_id === "string" &&
  EXACT_WORKFLOW_ID.test(value.workflow_id) &&
  typeof value.jbtd_id === "string" &&
  EXACT_SLICE_ID.test(value.jbtd_id) &&
  typeof value.persona_id === "string" &&
  EXACT_SLICE_ID.test(value.persona_id);

const matchesWindow = (
  record: OutcomeEvidenceRecord,
  window: OutcomeEvidenceAdmissionWindow
): boolean =>
  record.period_start === window.period_start &&
  record.period_end === window.period_end;

const held = (reasonCode: string): OutcomeEvidenceAdmissionResult => ({
  decision: "HELD",
  reason_codes: [reasonCode],
  receipt: null,
  admitted_pairs: []
});

const metricKey = (record: OutcomeEvidenceRecord): string =>
  JSON.stringify([
    record.outcome_metric,
    record.outcome_unit,
    record.source_system
  ]);

export function evaluateOutcomeEvidenceAdmission(
  input: OutcomeEvidenceAdmissionInput
): OutcomeEvidenceAdmissionResult {
  if (
    !hasExactIdentity(input.expected)
  ) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.missingIdentity);
  }
  const expectedWindows = [
    input.expected.baseline_window,
    input.expected.comparison_window
  ];
  if (
    expectedWindows.some(
      (window) =>
        !isCanonicalInstant(window.period_start) ||
        !isCanonicalInstant(window.period_end) ||
        Date.parse(window.period_end) <= Date.parse(window.period_start)
    ) ||
    Date.parse(input.expected.comparison_window.period_start) <
      Date.parse(input.expected.baseline_window.period_end)
  ) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.windowMismatch);
  }
  if (input.records.some((record) => !hasExactIdentity(record))) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.missingIdentity);
  }
  if (
    input.records.some(
      (record) =>
        record.workflow_id !== input.expected.workflow_id ||
        record.jbtd_id !== input.expected.jbtd_id ||
        record.persona_id !== input.expected.persona_id
    )
  ) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.identityMismatch);
  }
  if (
    input.records.some(
      (record) =>
        !isCanonicalInstant(record.period_start) ||
        !isCanonicalInstant(record.period_end) ||
        (!matchesWindow(record, input.expected.baseline_window) &&
          !matchesWindow(record, input.expected.comparison_window))
    )
  ) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.windowMismatch);
  }

  const byMetric = new Map<
    string,
    { baseline: OutcomeEvidenceRecord[]; comparison: OutcomeEvidenceRecord[] }
  >();
  for (const record of input.records) {
    const key = metricKey(record);
    const pair = byMetric.get(key) ?? { baseline: [], comparison: [] };
    if (matchesWindow(record, input.expected.baseline_window)) {
      pair.baseline.push(record);
    } else {
      pair.comparison.push(record);
    }
    byMetric.set(key, pair);
  }
  if (
    [...byMetric.values()].some(
      (pair) => pair.baseline.length > 1 || pair.comparison.length > 1
    )
  ) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.ambiguousPair);
  }
  if (
    byMetric.size === 0 ||
    [...byMetric.values()].some(
      (pair) => pair.baseline.length !== 1 || pair.comparison.length !== 1
    )
  ) {
    return held(OUTCOME_EVIDENCE_ADMISSION_REASON_CODES.missingPair);
  }

  const admittedPairs = [...byMetric.values()]
    .map((pair) => ({
      baseline: pair.baseline[0],
      comparison: pair.comparison[0]
    }))
    .sort((left, right) => metricKey(left.baseline).localeCompare(metricKey(right.baseline)));
  const baselineEvidenceIds = admittedPairs
    .map((pair) => pair.baseline.evidence_id)
    .sort();
  const comparisonEvidenceIds = admittedPairs
    .map((pair) => pair.comparison.evidence_id)
    .sort();

  return {
    decision: "ADMITTED",
    reason_codes: [],
    admitted_pairs: admittedPairs,
    receipt: {
      policy_version: OUTCOME_EVIDENCE_ADMISSION_POLICY_VERSION,
      workflow_id: input.expected.workflow_id,
      jbtd_id: input.expected.jbtd_id,
      persona_id: input.expected.persona_id,
      baseline_window: {
        ...input.expected.baseline_window,
        evidence_ids: baselineEvidenceIds
      },
      comparison_window: {
        ...input.expected.comparison_window,
        evidence_ids: comparisonEvidenceIds
      }
    }
  };
}

export function outcomeEvidenceAdmissionReceiptGaps(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["admission receipt is missing or invalid"];
  }
  const receipt = value as Record<string, unknown>;
  if (
    !hasExactKeys(receipt, [
      "policy_version",
      "workflow_id",
      "jbtd_id",
      "persona_id",
      "baseline_window",
      "comparison_window"
    ])
  ) {
    return ["admission receipt fields are invalid"];
  }
  if (receipt.policy_version !== OUTCOME_EVIDENCE_ADMISSION_POLICY_VERSION) {
    return ["admission policy_version is invalid"];
  }
  if (!hasExactIdentity(receipt)) {
    return ["admission exact slice identity is missing"];
  }
  const gaps: string[] = [];
  for (const field of ["baseline_window", "comparison_window"] as const) {
    const window = receipt[field];
    if (!window || typeof window !== "object" || Array.isArray(window)) {
      gaps.push(`admission.${field} is invalid`);
      continue;
    }
    const record = window as Record<string, unknown>;
    if (!hasExactKeys(record, ["period_start", "period_end", "evidence_ids"])) {
      gaps.push(`admission.${field} fields are invalid`);
      continue;
    }
    if (
      typeof record.period_start !== "string" ||
      typeof record.period_end !== "string" ||
      !isCanonicalInstant(record.period_start) ||
      !isCanonicalInstant(record.period_end) ||
      Date.parse(record.period_end) <= Date.parse(record.period_start)
    ) {
      gaps.push(`admission.${field} must contain an exact canonical window`);
    }
    if (
      !Array.isArray(record.evidence_ids) ||
      record.evidence_ids.length === 0 ||
      record.evidence_ids.some(
        (id) => typeof id !== "string" || !OPAQUE_EVIDENCE_ID.test(id)
      ) ||
      new Set(record.evidence_ids).size !== record.evidence_ids.length
    ) {
      gaps.push(
        `admission.${field}.evidence_ids must be unique opaque aggregate-evidence IDs`
      );
    }
  }
  const baselineWindow = receipt.baseline_window as Record<string, unknown>;
  const comparisonWindow = receipt.comparison_window as Record<string, unknown>;
  if (
    typeof baselineWindow?.period_end === "string" &&
    typeof comparisonWindow?.period_start === "string" &&
    Date.parse(comparisonWindow.period_start) < Date.parse(baselineWindow.period_end)
  ) {
    gaps.push("admission windows must not overlap");
  }
  return gaps;
}

const canonicalReceipt = (
  value: OutcomeEvidenceAdmissionReceipt
): string =>
  JSON.stringify({
    policy_version: value.policy_version,
    workflow_id: value.workflow_id,
    jbtd_id: value.jbtd_id,
    persona_id: value.persona_id,
    baseline_window: {
      period_start: value.baseline_window.period_start,
      period_end: value.baseline_window.period_end,
      evidence_ids: value.baseline_window.evidence_ids
    },
    comparison_window: {
      period_start: value.comparison_window.period_start,
      period_end: value.comparison_window.period_end,
      evidence_ids: value.comparison_window.evidence_ids
    }
  });

export function outcomeEvidenceAdmissionReceiptsMatch(
  left: unknown,
  right: unknown
): boolean {
  if (
    outcomeEvidenceAdmissionReceiptGaps(left).length > 0 ||
    outcomeEvidenceAdmissionReceiptGaps(right).length > 0
  ) {
    return false;
  }
  return canonicalReceipt(left as OutcomeEvidenceAdmissionReceipt) ===
    canonicalReceipt(right as OutcomeEvidenceAdmissionReceipt);
}
