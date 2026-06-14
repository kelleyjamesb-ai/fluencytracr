/**
 * End-to-end classification pipeline (in-memory repos, no HTTP).
 */

import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";
import { BehaviorPattern } from "../../src/services/pattern-classifier";
import { runClassificationPipeline } from "../../src/services/classification-pipeline.service";
import { createE2eInMemoryStack } from "../helpers/in-memory-dependencies";
import {
  fixtureIds,
  happyPathExecution,
  happyPathWorkflowB,
  fscMissingStartExecution,
  minimumSignalFailureExecution
} from "../fixtures/canonical-events.fixtures";

describe("v1 pipeline e2e (in-memory)", () => {
  it("Scenario 1: happy path — validate persist → reconstruct → gates → ALLOWED + aggregate", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exId = "e2e-happy-1";
    const events = happyPathExecution(exId);

    const r = await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exId,
        events
      },
      { classificationRepository, workflowAggregateRepository }
    );

    expect(r.build).not.toBeNull();
    expect(r.outcome.status).toBe("ALLOWED");
    expect(r.outcome.pattern).toBe(BehaviorPattern.BLIND_EFFICIENCY);
    expect(r.outcome.suppression_reason).toBeUndefined();

    const stored = await classificationRepository.findByExecutionId(exId);
    expect(stored?.status).toBe("ALLOWED");
    expect(stored?.pattern).toBe(BehaviorPattern.BLIND_EFFICIENCY);

    const agg = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA);
    expect(agg).not.toBeNull();
    expect(agg!.verdict).toBe("SUPPRESS");
    expect(agg!.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(agg!.classified_execution_count).toBe(0);
    expect(agg!.suppressed_execution_count).toBe(1);
    expect(agg!.pattern_distribution.length).toBe(0);
  });

  it("Scenario 2: FSC failure — INCOMPLETE_EXECUTION, no allowed pattern slot for execution", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exId = "e2e-fsc-fail";
    const events = fscMissingStartExecution(exId);

    const r = await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exId,
        events
      },
      { classificationRepository, workflowAggregateRepository }
    );

    expect(r.build).not.toBeNull();
    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("INCOMPLETE_EXECUTION");

    const agg = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA);
    expect(agg).not.toBeNull();
    expect(agg!.classified_execution_count).toBe(0);
    expect(agg!.suppressed_execution_count).toBe(1);
    expect(agg!.pattern_distribution.length).toBe(0);
  });

  it("Scenario 3: minimum signal failure — INSUFFICIENT_SIGNAL", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exId = "e2e-minsig";
    const events = minimumSignalFailureExecution(exId);

    const r = await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exId,
        events
      },
      { classificationRepository, workflowAggregateRepository }
    );

    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("INSUFFICIENT_SIGNAL");
  });

  it("Scenario 6: mixed workflows — aggregation stays workflow-scoped", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exA = "e2e-mix-a";
    const exB = "e2e-mix-b";
    const eventsA: CanonicalEvent[] = happyPathExecution(exA, fixtureIds.workflowA);
    const eventsB: CanonicalEvent[] = happyPathWorkflowB(exB);

    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exA,
        events: eventsA
      },
      { classificationRepository, workflowAggregateRepository }
    );
    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowB,
        execution_id: exB,
        events: eventsB
      },
      { classificationRepository, workflowAggregateRepository }
    );

    const aggA = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA);
    const aggB = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowB);
    expect(aggA?.verdict).toBe("SUPPRESS");
    expect(aggB?.verdict).toBe("SUPPRESS");
    expect(aggA?.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(aggB?.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(aggA?.classified_execution_count).toBe(0);
    expect(aggB?.classified_execution_count).toBe(0);
    expect(aggA?.pattern_distribution).toEqual([]);
    expect(aggB?.pattern_distribution).toEqual([]);

    const allClass = await classificationRepository.findByOrgId(fixtureIds.org);
    expect(allClass.length).toBe(2);
    expect(new Set(allClass.map((c) => c.workflow_id)).size).toBe(2);
  });

  it("gates cohort size independently within each JBTD persona bucket", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();

    for (let i = 0; i < 5; i += 1) {
      const exId = `slice-large-${i}`;
      await runClassificationPipeline(
        {
          org_id: fixtureIds.org,
          workflow_id: fixtureIds.workflowA,
          jbtd_id: "manager-review",
          persona_id: "frontline-manager",
          execution_id: exId,
          events: happyPathExecution(exId, fixtureIds.workflowA).map((event) => ({
            ...event,
            jbtd_id: "manager-review",
            persona_id: "frontline-manager"
          }))
        },
        { classificationRepository, workflowAggregateRepository }
      );
    }

    const soloId = "slice-solo";
    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        jbtd_id: "manager-review",
        persona_id: "executive-sponsor",
        execution_id: soloId,
        events: happyPathExecution(soloId, fixtureIds.workflowA).map((event) => ({
          ...event,
          jbtd_id: "manager-review",
          persona_id: "executive-sponsor"
        }))
      },
      { classificationRepository, workflowAggregateRepository }
    );

    const large = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA, {
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    const solo = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA, {
      jbtd_id: "manager-review",
      persona_id: "executive-sponsor"
    });

    expect(large?.verdict).toBe("SURFACE");
    expect(large?.classified_execution_count).toBe(5);
    expect(large?.jbtd_id).toBe("manager-review");
    expect(large?.persona_id).toBe("frontline-manager");
    expect(solo?.verdict).toBe("SUPPRESS");
    expect(solo?.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(solo?.classified_execution_count).toBe(0);
    expect(solo?.suppressed_execution_count).toBe(1);
  });
});
