/**
 * Governance regression: workflow-scoped aggregates only — no cross-workflow comparison artifacts.
 */

import { handleGetObservability } from "../../src/controllers/observability.controller";
import { BehaviorPattern } from "../../src/services/pattern-classifier";
import { runClassificationPipeline } from "../../src/services/classification-pipeline.service";
import { createE2eInMemoryStack } from "../helpers/in-memory-dependencies";
import { expectGovernanceSafeObservabilityBody } from "./helpers/governance-matchers";
import {
  fixtureIds,
  happyPathExecution,
  happyPathWorkflowB
} from "../fixtures/canonical-events.fixtures";
import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";

describe("governance regression — aggregation safety", () => {
  it("observability exposes per-workflow rows only; no cross-workflow comparison fields", async () => {
    const { classificationRepository, workflowAggregateRepository, observabilityDeps } = createE2eInMemoryStack();
    for (let i = 0; i < 5; i += 1) {
      const executionA = `gov-wf-a-${i}`;
      const executionB = `gov-wf-b-${i}`;
      const eventsA: CanonicalEvent[] = happyPathExecution(executionA, fixtureIds.workflowA);
      const eventsB: CanonicalEvent[] = happyPathWorkflowB(executionB);

      await runClassificationPipeline(
        {
          org_id: fixtureIds.org,
          workflow_id: fixtureIds.workflowA,
          execution_id: executionA,
          events: eventsA
        },
        { classificationRepository, workflowAggregateRepository }
      );
      await runClassificationPipeline(
        {
          org_id: fixtureIds.org,
          workflow_id: fixtureIds.workflowB,
          execution_id: executionB,
          events: eventsB
        },
        { classificationRepository, workflowAggregateRepository }
      );
    }

    const res = await handleGetObservability(fixtureIds.org, observabilityDeps);
    expect(res.status).toBe(200);
    expectGovernanceSafeObservabilityBody(res.body);

    const body = res.body as { workflows: ReadonlyArray<{ workflow_id: string }> };
    expect(body.workflows.length).toBe(2);
    const ids = body.workflows.map((w) => w.workflow_id).sort();
    expect(ids).toEqual([fixtureIds.workflowA, fixtureIds.workflowB].sort());

    const raw = JSON.stringify(res.body).toLowerCase();
    expect(raw).not.toMatch(/cross_workflow|workflow_comparison|relative_performance|delta_vs/);
  });

  it("default prevalence mode from pipeline refresh remains categorical (executive-safe default)", async () => {
    const { classificationRepository, workflowAggregateRepository, observabilityDeps } = createE2eInMemoryStack();
    for (let i = 0; i < 5; i += 1) {
      const executionId = `gov-prev-default-${i}`;
      await runClassificationPipeline(
        {
          org_id: fixtureIds.org,
          workflow_id: fixtureIds.workflowA,
          execution_id: executionId,
          events: happyPathExecution(executionId)
        },
        { classificationRepository, workflowAggregateRepository }
      );
    }
    const res = await handleGetObservability(fixtureIds.org, observabilityDeps);
    const w = (res.body as { workflows: ReadonlyArray<{ prevalence_mode: string }> }).workflows[0]!;
    expect(w.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
  });

  it("numeric share stored in aggregate is converted at controller boundary — categorical mode and no share in JSON", async () => {
    const { workflowAggregateRepository, observabilityDeps } = createE2eInMemoryStack();
    await workflowAggregateRepository.upsertAggregate(
      {
        workflow_id: fixtureIds.workflowA,
        jbtd_id: null,
        persona_id: null,
        verdict: "SURFACE",
        suppression_reason: null,
        classified_execution_count: 1,
        suppressed_execution_count: 0,
        prevalence_mode: "NUMERIC_SHARE",
        pattern_distribution: [{ pattern: BehaviorPattern.BLIND_EFFICIENCY, count: 1, share: 1 }]
      },
      fixtureIds.org
    );
    const res = await handleGetObservability(fixtureIds.org, observabilityDeps);
    expect(res.status).toBe(200);
    expectGovernanceSafeObservabilityBody(res.body);
    const body = res.body as {
      workflows: ReadonlyArray<{
        prevalence_mode: string;
        pattern_distribution: ReadonlyArray<{ prevalence_band?: string; share?: number }>;
      }>;
    };
    expect(body.workflows[0]!.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
    const row = body.workflows[0]!.pattern_distribution[0]!;
    expect(row.prevalence_band).toBe("HIGH");
    expect(row).not.toHaveProperty("share");
    const raw = JSON.stringify(res.body).toLowerCase();
    expect(raw).not.toMatch(/\brank\b|\btrend\b|diagnostic/);
    expect(raw).not.toMatch(/"share"/);
  });
});
