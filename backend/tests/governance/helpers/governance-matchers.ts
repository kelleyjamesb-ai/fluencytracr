/**
 * Shared assertions for governance regression — fail-closed string and structural guards.
 */

import { BehaviorPattern } from "../../../src/services/pattern-classifier";

const PATTERN_LABELS = new Set<string>(Object.values(BehaviorPattern));

/** Masks canonical pattern enum strings so substring scans do not false-positive (e.g. RECOVERY_MATURITY vs "maturity score"). */
export function maskClassificationPatternLabels(input: string): string {
  let s = input;
  for (const p of PATTERN_LABELS) {
    s = s.split(p).join("__PATTERN__");
  }
  return s;
}

/** Exact key names that must never appear in executive observability JSON (case-insensitive match on key). */
const FORBIDDEN_OBSERVABILITY_KEYS_EXACT = new Set(
  [
    "execution_id",
    "chat_id",
    "workflow_run_id",
    "run_id",
    "agent_run_id",
    "actor_id",
    "actor_type",
    "user_id",
    "email",
    "payload",
    "raw_event",
    "raw_events",
    "event_payload",
    "trace_id",
    "span_id",
    "diagnostics",
    "diagnostic",
    "timeline",
    "events",
    "suppression_reason",
    "classification_trace",
    "internal_debug",
    "audit_trail"
  ].map((k) => k.toLowerCase())
);

/** Substrings that must not appear inside any object key (avoids false positives like "interaction" vs "actor"). */
const FORBIDDEN_OBSERVABILITY_KEY_SUBSTRINGS = [
  "percentile",
  "benchmark",
  "threshold",
  "calibration_window",
  "leaderboard",
  "cross_workflow",
  "timeseries",
  "time_series",
  "productivity",
  "velocity",
  "ranking",
  "roi"
] as const;

const TREND_AND_COMPARISON_SUBSTRINGS = [
  "improved",
  "declined",
  "up from",
  "down from",
  "before_after",
  "delta",
  "week_over_week",
  "mom",
  "yoy",
  "trend",
  "forecast",
  "cross_workflow",
  "versus",
  " vs ",
  "compared_to",
  "outperformed",
  "underperformed",
  "best workflow",
  "worst workflow"
] as const;

const SCORE_LIKE_SUBSTRINGS = [
  "fluency score",
  "confidence score",
  "maturity score",
  "performance index",
  "weighted rating",
  "composite score",
  "health score",
  "quality score"
] as const;

const ALLOWED_WORKFLOW_KEYS = new Set([
  "workflow_id",
  "classified_execution_count",
  "suppressed_execution_count",
  "pattern_distribution",
  "prevalence_mode"
]);

const ALLOWED_PATTERN_ROW_KEYS = new Set(["pattern", "count", "share", "prevalence_band"]);

const ALLOWED_TOP_KEYS = new Set(["org_id", "workflows"]);

/**
 * Recursively fail if any object key matches forbidden substrings (case-insensitive).
 */
export function expectNoForbiddenKeys(obj: unknown, path = "root"): void {
  if (obj === null || typeof obj !== "object") {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      expectNoForbiddenKeys(item, `${path}[${i}]`);
    });
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_OBSERVABILITY_KEYS_EXACT.has(lower)) {
      throw new Error(`Governance regression: forbidden key "${key}" at ${path}`);
    }
    for (const frag of FORBIDDEN_OBSERVABILITY_KEY_SUBSTRINGS) {
      if (lower.includes(frag)) {
        throw new Error(`Governance regression: forbidden key fragment "${frag}" in "${key}" at ${path}`);
      }
    }
    expectNoForbiddenKeys(record[key], `${path}.${key}`);
  }
}

export function expectExecutiveSafeWorkflowPayload(w: Record<string, unknown>): void {
  const keys = Object.keys(w).sort();
  for (const k of keys) {
    expect(ALLOWED_WORKFLOW_KEYS.has(k)).toBe(true);
  }
  expect(typeof w.workflow_id).toBe("string");
  expect(typeof w.classified_execution_count).toBe("number");
  expect(typeof w.suppressed_execution_count).toBe("number");
  expect(typeof w.prevalence_mode).toBe("string");
  expect(Array.isArray(w.pattern_distribution)).toBe(true);
  for (const row of w.pattern_distribution as ReadonlyArray<Record<string, unknown>>) {
    for (const pk of Object.keys(row)) {
      expect(ALLOWED_PATTERN_ROW_KEYS.has(pk)).toBe(true);
    }
  }
}

export function expectNoTrendLanguage(serializedLowercase: string): void {
  const masked = maskClassificationPatternLabels(serializedLowercase);
  for (const frag of TREND_AND_COMPARISON_SUBSTRINGS) {
    expect(masked.includes(frag)).toBe(false);
  }
}

export function expectNoScoreLikeLanguage(serializedLowercase: string): void {
  const masked = maskClassificationPatternLabels(serializedLowercase);
  for (const frag of SCORE_LIKE_SUBSTRINGS) {
    expect(masked.includes(frag)).toBe(false);
  }
}

export function expectNoRankingLanguage(serializedLowercase: string): void {
  const masked = maskClassificationPatternLabels(serializedLowercase);
  expect(masked).not.toMatch(/\brank\b|\bpercentile\b|sorted_?performance|best_?workflow|worst_?workflow/);
}

/**
 * Full governance pass on observability handler body (200 responses).
 */
export function expectGovernanceSafeObservabilityBody(body: unknown): void {
  expect(body).toBeDefined();
  expect(typeof body).toBe("object");
  const o = body as Record<string, unknown>;
  expect(Object.keys(o).sort()).toEqual([...ALLOWED_TOP_KEYS].sort());
  expectNoForbiddenKeys(body);
  expect(Array.isArray(o.workflows)).toBe(true);
  for (const w of o.workflows as ReadonlyArray<Record<string, unknown>>) {
    expectExecutiveSafeWorkflowPayload(w);
  }
  const raw = JSON.stringify(body).toLowerCase();
  expectNoTrendLanguage(raw);
  expectNoScoreLikeLanguage(raw);
  expectNoRankingLanguage(raw);
  expect(raw).not.toMatch(/"roi"\s*:|productivity|return on investment/);
}
