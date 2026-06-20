import test from "node:test";
import assert from "node:assert/strict";

import { aggregateFluencySessions } from "./aggregate_ai_fluency_sessions.mjs";

const CONSTRUCTS = [
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth",
  "ai_attitude",
  "behavioral_intent",
  "perceived_ai_impact"
];

function makeSession(respondent, functionArea, ratingByConstruct = {}) {
  const answers = [];
  let item = 1;
  for (const construct of CONSTRUCTS) {
    for (let i = 0; i < 3; i += 1) {
      answers.push({
        questionId: `ai-fluency-q${String(item).padStart(2, "0")}`,
        value: String(ratingByConstruct[construct] ?? 3),
        itemIndex: item,
        construct,
        itemTitle: `Item ${item}`,
        answeredAt: "2026-06-02T10:00:00.000Z"
      });
      item += 1;
    }
  }
  return {
    schemaVersion: "ai-fluency-beta-response/v1",
    measurementMode: "long",
    versionIdentifier: "ai_fluency_long_v1",
    submittedAt: "2026-06-02T10:30:00.000Z",
    respondentId: `anon-${respondent}`,
    profile: {
      company: "Northstar Enterprise",
      roleLevel: "individual_contributor",
      functionArea,
      tenure: "2_to_5_years",
      priorExperience: "some"
    },
    calibration: { level: 2, label: "Working user", description: "..." },
    answers,
    result: { summary: "personal readout text that must never leave the boundary" }
  };
}

const options = {
  orgId: "org-northstar-enterprise",
  baselineId: "fluency_baseline_test",
  collectionMode: "kickoff",
  window: null,
  groupBy: "functionArea"
};

test("aggregates sessions into an engine-valid baseline with cohort means", () => {
  const sessions = [
    ...Array.from({ length: 6 }, (_, i) => makeSession(`agent-${i}`, "customer_support", { confidence: 4 })),
    ...Array.from({ length: 5 }, (_, i) => makeSession(`seller-${i}`, "sales", { confidence: 2 }))
  ];
  const { baseline, validation, session_gaps } = aggregateFluencySessions(sessions, options);
  assert.deepEqual(session_gaps, []);
  assert.equal(validation.valid, true);
  assert.equal(baseline.cohorts.length, 2);
  const support = baseline.cohorts.find((c) => c.cohort_id === "cohort_customer_support");
  assert.equal(support.respondent_count, 6);
  assert.equal(support.construct_scores.confidence.mean, 4);
  assert.equal(baseline.window, "2026-06-02_to_2026-06-02");
});

test("can bind aggregate AI Fluency output to a client id without leaking respondent data", () => {
  const sessions = Array.from({ length: 5 }, (_, i) =>
    makeSession(`client-${i}`, "customer_support", { confidence: 4 })
  );
  const { baseline, validation } = aggregateFluencySessions(sessions, {
    ...options,
    clientId: "client_northstar"
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(validation.client_id, "client_northstar");
  assert.equal(baseline.client_id, "client_northstar");
  assert.equal(baseline.source_binding.import_key.client_id, "client_northstar");
  assert.equal(JSON.stringify(baseline).includes("anon-"), false);
});

test("suppresses cohorts below the minimum size at export time", () => {
  const sessions = [
    ...Array.from({ length: 5 }, (_, i) => makeSession(`a-${i}`, "customer_support")),
    ...Array.from({ length: 3 }, (_, i) => makeSession(`b-${i}`, "finance"))
  ];
  const { baseline, validation } = aggregateFluencySessions(sessions, options);
  assert.equal(validation.valid, true);
  const finance = baseline.cohorts.find((c) => c.cohort_id === "cohort_finance");
  assert.equal(finance.suppressed, true);
  assert.equal(finance.construct_scores, undefined);
  assert.equal(validation.suppressed_cohort_count, 1);
});

test("the aggregate carries no respondent-level data across the boundary", () => {
  const sessions = Array.from({ length: 5 }, (_, i) => makeSession(`x-${i}`, "customer_support"));
  const { baseline } = aggregateFluencySessions(sessions, options);
  const serialized = JSON.stringify(baseline);
  assert.ok(!serialized.includes("anon-"));
  assert.ok(!serialized.includes("respondentId"));
  assert.ok(!serialized.includes("personal readout"));
  assert.ok(!serialized.includes("Northstar Enterprise"));
  assert.ok(!serialized.includes("calibration"));
  assert.ok(!serialized.includes("answers"));
});

test("refuses mixed instrument versions and unknown schemas", () => {
  const good = makeSession("a", "customer_support");
  const otherVersion = { ...makeSession("b", "customer_support"), versionIdentifier: "ai_fluency_short_v1" };
  const mixed = aggregateFluencySessions([good, otherVersion], options);
  assert.equal(mixed.baseline, null);
  assert.ok(mixed.session_gaps[0].includes("mix instrument versions"));

  const unknown = aggregateFluencySessions([{ schemaVersion: "other/v9" }], options);
  assert.equal(unknown.baseline, null);
  assert.ok(unknown.session_gaps.some((gap) => gap.includes("unsupported schemaVersion")));
});

test("is deterministic for identical inputs", () => {
  const sessions = Array.from({ length: 7 }, (_, i) => makeSession(`d-${i}`, "customer_support", { usage_quality: 3 }));
  const first = aggregateFluencySessions(sessions, options);
  const second = aggregateFluencySessions(sessions, options);
  assert.deepEqual(first, second);
});
