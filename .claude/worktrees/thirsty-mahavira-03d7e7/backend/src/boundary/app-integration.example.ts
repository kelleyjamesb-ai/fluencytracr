/**
 * EXAMPLE: wiring boundary adapters → canonical validation → persistence → classification pipeline.
 * Not mounted as production middleware; copy/adapt into `app.ts` or route modules.
 */

import { freezeCanonicalEvent, validateCanonicalEvent } from "../domain/canonical-event.schema";
import { canonicalExecutionKey } from "../integration/v1-pipeline-types";
import type { EventRepository } from "../repositories/event.repository";
import type { ClassificationPipelineDeps } from "../services/classification-pipeline.service";
import { runClassificationPipeline } from "../services/classification-pipeline.service";
import { mapUpstreamEventToCanonical } from "./ingest-event.mapper";
import { parseUpstreamIngestEvent } from "./boundary-schemas";

export type ExampleIngestDeps = Readonly<{
  eventRepository: EventRepository;
  classificationPipelineDeps: ClassificationPipelineDeps;
}>;

/**
 * 1–2. **Boundary layer**: Zod parse + mapper (actor + execution identity).
 * 3. **Canonical validation boundary**: `validateCanonicalEvent` (strict domain rules).
 * 4. **Domain pipeline handoff**: append-only store + `runClassificationPipeline`.
 */
export async function exampleProcessIngestBody(
  rawBody: unknown,
  deps: ExampleIngestDeps
): Promise<{ readonly status: number; readonly body: unknown }> {
  const parsed = parseUpstreamIngestEvent(rawBody);
  if (!parsed.ok) {
    return {
      status: 400,
      body: { accepted: false, stage: "boundary_parse", issues: parsed.error.flatten() }
    };
  }

  const mapped = mapUpstreamEventToCanonical(parsed.data);
  if (!mapped.ok) {
    const code = mapped.reason === "unknown_actor_label" ? 422 : 400;
    return {
      status: code,
      body: { accepted: false, stage: "boundary_map", reason: mapped.reason, diagnostics: mapped.diagnostics }
    };
  }

  const validated = validateCanonicalEvent(mapped.canonical_event);
  if (!validated.ok) {
    return {
      status: 400,
      body: { accepted: false, stage: "canonical_validation", errors: validated.errors }
    };
  }

  const event = freezeCanonicalEvent(validated.value);
  const executionId = canonicalExecutionKey(event);
  if (executionId.length === 0) {
    return {
      status: 422,
      body: { accepted: false, stage: "canonical_identity", error: "missing_execution_identity" }
    };
  }

  await deps.eventRepository.append(event);
  const corpus = await deps.eventRepository.findByExecutionId(executionId);

  await runClassificationPipeline(
    {
      org_id: event.org_id,
      workflow_id: event.workflow_id,
      execution_id: executionId,
      events: corpus
    },
    deps.classificationPipelineDeps
  );

  return {
    status: 202,
    body: { accepted: true, execution_id: executionId }
  };
}
