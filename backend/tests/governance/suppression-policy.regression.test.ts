/**
 * Governance regression: suppression-first policy — incomplete / insufficient-signal / ambiguity must not appear as allowed patterns.
 */

import * as patternClassifier from "../../src/services/pattern-classifier";
import { runClassificationPipeline } from "../../src/services/classification-pipeline.service";
import { createE2eInMemoryStack } from "../helpers/in-memory-dependencies";
import {
  fixtureIds,
  happyPathExecution,
  fscMissingStartExecution,
  minimumSignalFailureExecution
} from "../fixtures/canonical-events.fixtures";

describe("governance regression — suppression policy", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("incomplete executions (FSC fail) are suppressed and excluded from pattern_distribution counts", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exBad = "gov-fsc";
    const exGood = "gov-good";
    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exBad,
        events: fscMissingStartExecution(exBad)
      },
      { classificationRepository, workflowAggregateRepository }
    );
    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exGood,
        events: happyPathExecution(exGood)
      },
      { classificationRepository, workflowAggregateRepository }
    );

    const agg = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA);
    expect(agg).not.toBeNull();
    expect(agg!.verdict).toBe("SUPPRESS");
    expect(agg!.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(agg!.suppressed_execution_count).toBe(2);
    expect(agg!.classified_execution_count).toBe(0);
    expect(agg!.pattern_distribution.length).toBe(0);
  });

  it("insufficient-signal executions are suppressed and not counted as classified", async () => {
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exId = "gov-minsig";
    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exId,
        events: minimumSignalFailureExecution(exId)
      },
      { classificationRepository, workflowAggregateRepository }
    );
    const o = await classificationRepository.findByExecutionId(exId);
    expect(o?.status).toBe("SUPPRESSED");
    expect(o?.suppression_reason).toBe("INSUFFICIENT_SIGNAL");
    const agg = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA);
    expect(agg!.classified_execution_count).toBe(0);
    expect(agg!.pattern_distribution.length).toBe(0);
  });

  it("ambiguous classifications are suppressed (fail-closed) and do not inflate allowed distributions", async () => {
    jest.spyOn(patternClassifier, "classifyBehaviorPattern").mockReturnValue({
      classified: false,
      reason: "AMBIGUITY"
    });
    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exId = "gov-amb";
    await runClassificationPipeline(
      {
        org_id: fixtureIds.org,
        workflow_id: fixtureIds.workflowA,
        execution_id: exId,
        events: happyPathExecution(exId)
      },
      { classificationRepository, workflowAggregateRepository }
    );
    const o = await classificationRepository.findByExecutionId(exId);
    expect(o?.status).toBe("SUPPRESSED");
    expect(o?.suppression_reason).toBe("AMBIGUITY");
    const agg = await workflowAggregateRepository.findByWorkflowId(fixtureIds.org, fixtureIds.workflowA);
    expect(agg!.classified_execution_count).toBe(0);
    expect(agg!.pattern_distribution.length).toBe(0);
  });
});
