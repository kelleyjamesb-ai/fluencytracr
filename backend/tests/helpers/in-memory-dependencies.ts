/**
 * Wired in-memory repositories for v1 controller + pipeline e2e tests.
 */

import { InMemoryEventRepository } from "../../src/repositories/event.repository";
import { InMemoryClassificationRepository } from "../../src/repositories/classification.repository";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";
import type { PostEventsControllerDeps } from "../../src/controllers/events.controller";
import type { GetObservabilityControllerDeps } from "../../src/controllers/observability.controller";

export interface E2eInMemoryStack {
  readonly eventRepository: InMemoryEventRepository;
  readonly classificationRepository: InMemoryClassificationRepository;
  readonly workflowAggregateRepository: InMemoryWorkflowAggregateRepository;
  readonly postEventsDeps: PostEventsControllerDeps;
  readonly observabilityDeps: GetObservabilityControllerDeps;
}

export function createE2eInMemoryStack(applyActorMapping = false): E2eInMemoryStack {
  const eventRepository = new InMemoryEventRepository();
  const classificationRepository = new InMemoryClassificationRepository();
  const workflowAggregateRepository = new InMemoryWorkflowAggregateRepository();

  const postEventsDeps: PostEventsControllerDeps = {
    eventRepository,
    classificationPipelineDeps: {
      classificationRepository,
      workflowAggregateRepository
    },
    applyActorMapping
  };

  const observabilityDeps: GetObservabilityControllerDeps = {
    workflowAggregateRepository
  };

  return {
    eventRepository,
    classificationRepository,
    workflowAggregateRepository,
    postEventsDeps,
    observabilityDeps
  };
}
