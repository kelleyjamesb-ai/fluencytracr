/**
 * Thin facade: post ingest + read observability against controller handlers (no HTTP server).
 */

import { handlePostEvents } from "../../src/controllers/events.controller";
import { handleGetObservability } from "../../src/controllers/observability.controller";
import type { E2eInMemoryStack } from "./in-memory-dependencies";

export async function postIngestPayload(stack: E2eInMemoryStack, rawBody: unknown) {
  return handlePostEvents(rawBody, stack.postEventsDeps);
}

export async function getObservabilityForOrg(stack: E2eInMemoryStack, orgId: string) {
  return handleGetObservability(orgId, stack.observabilityDeps);
}
