/**
 * Governance regression: executive output surface must not expose individual, rank, trend, score, or ROI language.
 */

import { handleGetObservability } from "../../src/controllers/observability.controller";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";
import { BehaviorPattern } from "../../src/services/pattern-classifier";
import {
  expectGovernanceSafeObservabilityBody,
  expectNoForbiddenKeys,
  expectNoRankingLanguage,
  expectNoScoreLikeLanguage,
  expectNoTrendLanguage
} from "./helpers/governance-matchers";
import {
  GOV_ORG,
  GOV_WF_ALPHA,
  LEAKY_OBSERVABILITY_BODY,
  RANK_LEAK_STRINGS,
  TREND_LEAK_STRINGS
} from "./fixtures/governance.fixtures";

describe("governance regression — output surface", () => {
  it("matchers reject leaky observability-shaped payloads (negative control)", () => {
    expect(() => expectNoForbiddenKeys(LEAKY_OBSERVABILITY_BODY)).toThrow(/forbidden key/);
    expect(() => expectGovernanceSafeObservabilityBody(LEAKY_OBSERVABILITY_BODY)).toThrow();
  });

  it("trend / rank / score language scanners reject polluted JSON text", () => {
    expect(() =>
      expectNoTrendLanguage(JSON.stringify({ narrative: TREND_LEAK_STRINGS[0]! }).toLowerCase())
    ).toThrow();
    expect(() =>
      expectNoRankingLanguage(JSON.stringify({ x: RANK_LEAK_STRINGS[0]! }).toLowerCase())
    ).toThrow();
    expect(() =>
      expectNoScoreLikeLanguage(JSON.stringify({ label: "team fluency score" }).toLowerCase())
    ).toThrow();
  });

  it("trend scanner accepts benign observability-shaped JSON", () => {
    expectNoTrendLanguage('{"org_id":"x","workflows":[]}');
  });

  it("real observability handler output passes governance matchers", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    await repo.upsertAggregate(
      {
        workflow_id: GOV_WF_ALPHA,
        classified_execution_count: 2,
        suppressed_execution_count: 1,
        prevalence_mode: "CATEGORICAL_PREVALENCE",
        pattern_distribution: [
          { pattern: BehaviorPattern.BLIND_EFFICIENCY, count: 1, prevalence_band: "LOW" },
          { pattern: BehaviorPattern.RECOVERY_MATURITY, count: 1, prevalence_band: "MODERATE" }
        ]
      },
      GOV_ORG
    );

    const res = await handleGetObservability(GOV_ORG, { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    expectGovernanceSafeObservabilityBody(res.body);

    const json = JSON.stringify(res.body).toLowerCase();
    expect(json).not.toMatch(/"execution_id"\s*:/);
    expect(json).not.toMatch(/chat_id|actor_id|user_id/);
  });
});
