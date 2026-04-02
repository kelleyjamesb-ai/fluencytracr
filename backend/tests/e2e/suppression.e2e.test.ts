/**
 * Suppression hierarchy e2e — fail-closed reasons (AMBIGUITY via controlled classifier stub).
 */

import * as patternClassifier from "../../src/services/pattern-classifier";
import { runClassificationPipeline } from "../../src/services/classification-pipeline.service";
import { createE2eInMemoryStack } from "../helpers/in-memory-dependencies";
import { fixtureIds, happyPathExecution } from "../fixtures/canonical-events.fixtures";

describe("v1 suppression e2e", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Scenario 4: classification ambiguity — AMBIGUITY suppression when pattern classifier fails closed", async () => {
    jest.spyOn(patternClassifier, "classifyBehaviorPattern").mockReturnValue({
      classified: false,
      reason: "AMBIGUITY"
    });

    const { classificationRepository, workflowAggregateRepository } = createE2eInMemoryStack();
    const exId = "e2e-ambiguity";
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
    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("AMBIGUITY");

    const stored = await classificationRepository.findByExecutionId(exId);
    expect(stored?.suppression_reason).toBe("AMBIGUITY");
  });
});
