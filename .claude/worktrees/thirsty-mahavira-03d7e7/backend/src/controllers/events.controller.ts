/**
 * Framework-agnostic handler for `POST /api/events` — validate, append-only persist, run classification pipeline.
 */

import { freezeCanonicalEvent } from "../domain/canonical-event.schema";
import {
  canonicalExecutionKey,
  validateInboundCanonicalEvent
} from "../integration/v1-pipeline-types";
import type { EventRepository } from "../repositories/event.repository";
import type { ClassificationPipelineDeps } from "../services/classification-pipeline.service";
import { runClassificationPipeline } from "../services/classification-pipeline.service";

export interface PostEventsControllerDeps {
  readonly eventRepository: EventRepository;
  readonly classificationPipelineDeps: ClassificationPipelineDeps;
  /**
   * When true, maps upstream actor labels via `ingest-actor-map` before canonical validation.
   */
  readonly applyActorMapping?: boolean;
}

export async function handlePostEvents(
  rawBody: unknown,
  deps: PostEventsControllerDeps
): Promise<{ readonly status: number; readonly body: unknown }> {
  try {
    const validated = validateInboundCanonicalEvent(rawBody, {
      applyActorMapping: deps.applyActorMapping === true
    });
    if (!validated.ok) {
      if (validated.errors.includes("unknown_actor_label")) {
        return {
          status: 422,
          body: { accepted: false, error: "unknown_actor_label" }
        };
      }
      return {
        status: 400,
        body: { accepted: false, errors: validated.errors }
      };
    }

    const event = freezeCanonicalEvent(validated.value);
    const executionId = canonicalExecutionKey(event);
    if (executionId.length === 0) {
      return {
        status: 422,
        body: { accepted: false, error: "missing_execution_identity" }
      };
    }

    await deps.eventRepository.append(event);
    const eventsForExecution = await deps.eventRepository.findByExecutionId(executionId);

    await runClassificationPipeline(
      {
        org_id: event.org_id,
        workflow_id: event.workflow_id,
        execution_id: executionId,
        events: eventsForExecution
      },
      deps.classificationPipelineDeps
    );

    return {
      status: 202,
      body: {
        accepted: true,
        execution_id: executionId
      }
    };
  } catch {
    return {
      status: 500,
      body: { accepted: false, error: "internal_error" }
    };
  }
}
