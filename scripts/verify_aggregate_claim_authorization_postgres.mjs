import crypto from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const request = require("supertest");
const { app } = require("../backend/dist/app.js");
const { aiValueEngine } = require("../shared/dist/index.js");
const {
  authorizeAggregateClaim,
  readAuthorizedAggregateClaim
} = require("../backend/dist/services/aggregate-claim-authorization.service.js");
const {
  readAiValueClaimBundle,
  readAiValueObjectSet,
  sealAiValueClaimBundleSerializable
} = require("../backend/dist/repositories/ai-value-object.repository.js");
const {
  readOutcomeComparisonPrivacyRelease
} = require("../backend/dist/repositories/outcome-comparison-privacy.repository.js");
const {
  revokeCohortProducerAuthority
} = require("../backend/dist/repositories/cohort-producer-authority.repository.js");
const { disconnectPrisma } = require("../backend/dist/db.js");

if (process.env.D_VERIFY_EPHEMERAL_DATABASE !== "1") {
  throw new Error("Slice D PostgreSQL verification requires D_VERIFY_EPHEMERAL_DATABASE=1");
}
if (!process.env.DATABASE_URL || !process.env.C1_RUNTIME_DATABASE_URL) {
  throw new Error(
    "Slice D PostgreSQL verification requires DATABASE_URL and C1_RUNTIME_DATABASE_URL"
  );
}

const prisma = new PrismaClient();
const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const exactHeld = {
  decision: "HOLD",
  reason_family: "AGGREGATE_CLAIM_AUTHORIZATION_HELD",
  persisted: []
};
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const canonicalWindow = (start, end) => `${start.slice(0, 10)}_to_${end.slice(0, 10)}`;
const receiptFor = (row) => ({
  policy_version: row.policyVersion,
  release_id: row.id,
  proof_journal_id: row.proofJournalId,
  reservation_key: row.reservationKey,
  content_fingerprint: row.contentFingerprint,
  projection_hash: row.projectionHash,
  comparison_privacy_only: row.comparisonPrivacyOnly,
  claim_authority_effect: row.claimAuthorityEffect,
  claim_authorized: row.claimAuthorized,
  model_authorized: row.modelAuthorized,
  customer_publishable: row.customerPublishable
});
const sliceFor = (row) => ({
  org_id: row.orgId,
  workflow_id: row.workflowId,
  jbtd_id: row.jbtdId,
  persona_id: row.personaId
});
const expectHeld = (value, label) => {
  assert(
    JSON.stringify(value) === JSON.stringify(exactHeld),
    `${label} did not return the fixed redacted HOLD`
  );
};

const runtimeUrl = new URL(process.env.C1_RUNTIME_DATABASE_URL);
if (!/^[A-Za-z0-9_-]{16,128}$/.test(runtimeUrl.password)) {
  throw new Error("C1 runtime test password has invalid shape");
}
await prisma.$executeRawUnsafe(
  `ALTER ROLE fluencytracr_c1_runtime PASSWORD '${runtimeUrl.password}'`
);

const findCurrentComparison = async () => {
  const rows = await prisma.outcomeComparisonPrivacyRelease.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
  for (const row of rows) {
    const receipt = receiptFor(row);
    const slice = sliceFor(row);
    const result = await readOutcomeComparisonPrivacyRelease(receipt, slice);
    if (result.decision === "ATOMIC_COMPARISON_PRIVACY_RELEASED") {
      return { row, receipt, slice, result };
    }
  }
  throw new Error("no current C.1 comparison release was available");
};

const selected = await findCurrentComparison();
const projection = selected.result.projection;
const orgId = selected.slice.org_id;
const writeAuth = { "x-role": "ADMIN", "x-org-id": orgId };
const readoutAuth = { "x-role": "ENABLEMENT_LEAD", "x-org-id": orgId };
const comparisonWindow = canonicalWindow(
  projection.comparison_window.period_start,
  projection.comparison_window.period_end
);
const baselineWindow = canonicalWindow(
  projection.baseline_window.period_start,
  projection.baseline_window.period_end
);

await prisma.aiValueObject.deleteMany({ where: { orgId } });

const blueprint = JSON.parse(
  await readFile(
    new URL(
      "../docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json",
      import.meta.url
    ),
    "utf8"
  )
);
blueprint.blueprint_id = `bp_d_${runId}`;
blueprint.org_id = orgId;
blueprint.workflow_family = projection.workflow_id;
blueprint.workflow_name = "Slice D aggregate comparison";
blueprint.windows = {
  baseline: baselineWindow,
  comparison: comparisonWindow
};
for (const lane of ["ai_activity", "workflow", "outcome", "trust", "suppression"]) {
  blueprint.source_requirements.source_coverage[lane] = "MISSING";
}

const metricsLibrary = JSON.parse(
  await readFile(
    new URL(
      "../docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
      import.meta.url
    ),
    "utf8"
  )
);
metricsLibrary.library_id = `metrics_d_${runId}`;
metricsLibrary.workflow_family = projection.workflow_id;
metricsLibrary.metrics = [
  {
    ...metricsLibrary.metrics[0],
    metric_id: projection.outcome_metric,
    workflow_family: projection.workflow_id,
    measurement_unit: projection.outcome_unit,
    source_system: {
      ...metricsLibrary.metrics[0].source_system,
      source_name: projection.source_system
    }
  }
];

await request(app)
  .put(`/api/v1/ai-value/objects/blueprint/${blueprint.blueprint_id}`)
  .set(writeAuth)
  .send(blueprint)
  .expect(201);
await request(app)
  .put(`/api/v1/ai-value/objects/metrics_library/${metricsLibrary.library_id}`)
  .set(writeAuth)
  .send(metricsLibrary)
  .expect(201);

const aggregateWorkflowId = `workflow:d_${runId}`;
const cohortId = `cohort-d-${runId}`;
const aggregateIngest = await request(app)
  .post("/api/v3/ingest/aggregate")
  .set(writeAuth)
  .send({
    schema_version: "FT_V3_2026_05",
    cohort_id: cohortId,
    workflow_id: aggregateWorkflowId,
    jbtd_id: projection.jbtd_id,
    persona_id: projection.persona_id,
    window_start: projection.comparison_window.period_start,
    window_end: projection.comparison_window.period_end,
    cohort_size: 50,
    calibration_id: "scio-prod-60d-2026-05",
    velocity: {
      frequency: { p10: 10, p50: 71, p90: 400, p99: 701 },
      engagement: { p10: 30, p50: 61, p90: 61, p99: 61 },
      breadth: { p10: 3, p50: 7, p90: 10, p99: 12 }
    },
    quality_signals: {
      completion_rate: 0.92,
      error_rate: 0.03,
      abandonment_rate: 0.01,
      recovery_rate: 0.8,
      verification_rate: 0.4,
      p50_latency_ms: 1000,
      p95_latency_ms: 3000
    },
    privacy: { person_level_fields_included: false }
  });
assert(
  aggregateIngest.status === 202,
  `aggregate fixture was rejected: ${aggregateIngest.status} ${JSON.stringify(
    aggregateIngest.body
  )}`
);

const materialized = await request(app)
  .post("/api/v1/ai-value/materialize/real-evidence")
  .set(writeAuth)
  .send({
    blueprint_id: blueprint.blueprint_id,
    metrics_library_id: metricsLibrary.library_id,
    cohort_id: cohortId,
    workflow_id: aggregateWorkflowId,
    outcome_workflow_id: projection.workflow_id,
    jbtd_id: projection.jbtd_id,
    persona_id: projection.persona_id
  })
  .expect(200);
const outcomeExportId = materialized.body.objects?.outcome_evidence_export?.export_id;
const readinessId = materialized.body.objects?.evidence_readiness?.readiness_id;
const scenarioId = materialized.body.objects?.value_scenario?.scenario_id;
assert(outcomeExportId && readinessId && scenarioId, "materializer omitted source graph");

await request(app)
  .post(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExportId}/review`)
  .set(writeAuth)
  .send({ decision: "ACCEPTED", reviewer_role: "ADMIN" })
  .expect(200);

const authorizationRequest = {
  orgId,
  blueprintId: blueprint.blueprint_id,
  metricsLibraryId: metricsLibrary.library_id,
  scenarioId,
  outcomeEvidenceExportId: outcomeExportId,
  outcomeEvidenceReadinessId: readinessId,
  comparisonPrivacyReceipt: selected.receipt,
  persist: true
};
const authorized = await authorizeAggregateClaim(authorizationRequest);
assert(
  authorized.decision === "AUTHORIZED" &&
    authorized.customer_facing_output_authorized === false &&
    authorized.persisted.length === 3,
  "exact server-owned Slice D path did not authorize one internal bundle"
);
const packetId = authorized.packet_id;
const firstBundle = await readAiValueClaimBundle(orgId, packetId);
assert(firstBundle, "authorized bundle could not be read internally");
assert(
  aiValueEngine.aggregateClaimBundleReconciles({
    claim: firstBundle.claim.payload,
    packet: firstBundle.packet.payload,
    manifest: firstBundle.manifest.payload
  }),
  "authorized bundle did not reconcile"
);
assert(
  firstBundle.packet.payload.content.movement.claim_label === "OBSERVED_NON_ATTRIBUTABLE",
  "authorized packet used an unsupported claim label"
);

const replay = await authorizeAggregateClaim(authorizationRequest);
assert(
  replay.decision === "AUTHORIZED" && replay.packet_id === packetId,
  "exact replay did not reuse the immutable content address"
);
const internalRows = await prisma.aiValueObject.findMany({
  where: {
    orgId,
    objectType: {
      in: [...aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPES]
    }
  }
});
assert(internalRows.length === 3, "exact replay inserted duplicate artifacts");

const genericList = await request(app).get("/api/v1/ai-value/objects").set(readoutAuth).expect(200);
assert(
  genericList.body.objects.every(
    (row) => !aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPES.includes(row.object_type)
  ),
  "generic list exposed an internal Slice D artifact"
);

const html = await request(app)
  .get(`/api/v1/ai-value/readout/${packetId}/html`)
  .set(readoutAuth)
  .expect(200);
assert(
  html.headers["x-ai-value-source-bound"] === "true" &&
    html.text.includes("OBSERVED_NON_ATTRIBUTABLE") &&
    !html.text.toLowerCase().includes("caused"),
  "authorized readout did not preserve the bounded internal semantics"
);

expectHeld(
  await authorizeAggregateClaim({ ...authorizationRequest, persist: false }),
  "persist false"
);
expectHeld(
  await authorizeAggregateClaim({
    ...authorizationRequest,
    blueprintId: `${blueprint.blueprint_id}_alternate`
  }),
  "compatible-looking selector substitution"
);
expectHeld(
  await authorizeAggregateClaim({
    orgId,
    comparisonPrivacyReceipt: selected.receipt,
    persist: true
  }),
  "receipt-only authorization"
);
expectHeld(
  await authorizeAggregateClaim(authorizationRequest, {
    readComparison: async () => ({
      ...selected.result,
      projection: {
        ...selected.result.projection,
        persona_id: `${selected.result.projection.persona_id}_alternate`
      }
    })
  }),
  "cross-slice C.1 projection"
);
expectHeld(
  await authorizeAggregateClaim(authorizationRequest, {
    readComparison: async () => ({
      ...selected.result,
      projection: {
        ...selected.result.projection,
        comparison_window: {
          ...selected.result.projection.comparison_window,
          evidence_id: crypto.randomUUID()
        }
      }
    })
  }),
  "alternate evidence pair"
);
expectHeld(
  await authorizeAggregateClaim(authorizationRequest, {
    readComparison: async () => ({
      ...selected.result,
      projection: {
        ...selected.result.projection,
        outcome_metric: "employee_12345"
      }
    })
  }),
  "identifier-bearing metric projection"
);
expectHeld(
  await authorizeAggregateClaim(authorizationRequest, {
    readComparison: async () => ({
      ...selected.result,
      projection: {
        ...selected.result.projection,
        outcome_metric: "outcome_caused_by_ai"
      }
    })
  }),
  "causal metric projection"
);
expectHeld(
  await authorizeAggregateClaim(authorizationRequest, {
    readComparison: async () => ({
      ...selected.result,
      projection: {
        ...selected.result.projection,
        source_system: "james.kelley@glean.com"
      }
    })
  }),
  "identifier-bearing source-system projection"
);

const sourceRefs = [
  { objectType: "outcome_evidence_export", objectId: outcomeExportId },
  { objectType: "evidence_readiness", objectId: readinessId },
  { objectType: "blueprint", objectId: blueprint.blueprint_id },
  { objectType: "metrics_library", objectId: metricsLibrary.library_id },
  { objectType: "value_scenario", objectId: scenarioId }
];
const exactSources = await readAiValueObjectSet(orgId, sourceRefs);
assert(exactSources?.length === 5, "source snapshot was incomplete");
const scenarioRow = exactSources.find((row) => row.object_type === "value_scenario");
assert(scenarioRow, "scenario source row was missing");
const changedScenario = {
  ...scenarioRow.payload,
  source_mutation_probe: true
};

let comparisonReadCount = 0;
const interleaved = await authorizeAggregateClaim(authorizationRequest, {
  readComparison: async () => {
    comparisonReadCount += 1;
    if (comparisonReadCount === 2) {
      await prisma.aiValueObject.update({
        where: {
          ai_value_objects_unique_key: {
            orgId,
            objectType: "value_scenario",
            objectId: scenarioId
          }
        },
        data: { payloadJson: changedScenario }
      });
    }
    return selected.result;
  }
});
expectHeld(interleaved, "interleaved source mutation");
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: "value_scenario",
      objectId: scenarioId
    }
  },
  data: { payloadJson: scenarioRow.payload }
});

let postCommitReadCount = 0;
const postCommitMutation = await authorizeAggregateClaim(authorizationRequest, {
  readComparison: async () => {
    postCommitReadCount += 1;
    if (postCommitReadCount === 3) {
      await prisma.aiValueObject.update({
        where: {
          ai_value_objects_unique_key: {
            orgId,
            objectType: "value_scenario",
            objectId: scenarioId
          }
        },
        data: { payloadJson: changedScenario }
      });
    }
    return selected.result;
  }
});
expectHeld(postCommitMutation, "post-commit source mutation");
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: "value_scenario",
      objectId: scenarioId
    }
  },
  data: { payloadJson: scenarioRow.payload }
});

const blockerClient = new PrismaClient();
const mutationUrl = new URL(process.env.DATABASE_URL);
mutationUrl.searchParams.set("application_name", `slice_d_mutation_${runId}`);
const mutationClient = new PrismaClient({
  datasources: { db: { url: mutationUrl.toString() } }
});
let releaseBlocker;
let blockerLocked;
const blockerLockedPromise = new Promise((resolve) => {
  blockerLocked = resolve;
});
const releaseBlockerPromise = new Promise((resolve) => {
  releaseBlocker = resolve;
});
const blocker = blockerClient.$transaction(
  async (transaction) => {
    await transaction.$queryRawUnsafe(
      `SELECT id FROM public.ai_value_objects
       WHERE org_id = $1 AND object_type = 'value_scenario' AND object_id = $2
       FOR UPDATE`,
      orgId,
      scenarioId
    );
    blockerLocked();
    await releaseBlockerPromise;
  },
  { maxWait: 5_000, timeout: 20_000 }
);
await blockerLockedPromise;
const queuedMutation = (async () =>
  mutationClient.aiValueObject.update({
    where: {
      ai_value_objects_unique_key: {
        orgId,
        objectType: "value_scenario",
        objectId: scenarioId
      }
    },
    data: { payloadJson: changedScenario }
  }))();
const waitDeadline = Date.now() + 5_000;
let mutationQueued = false;
while (Date.now() < waitDeadline) {
  const states = await prisma.$queryRawUnsafe(
    `SELECT wait_event_type
     FROM pg_catalog.pg_stat_activity
     WHERE application_name = $1`,
    `slice_d_mutation_${runId}`
  );
  if (states.some((state) => state.wait_event_type === "Lock")) {
    mutationQueued = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
}
assert(mutationQueued, "source mutation did not queue behind the blocker");
const queuedSeal = sealAiValueClaimBundleSerializable({
  orgId,
  sourceSnapshots: exactSources,
  claim: firstBundle.claim.payload,
  packet: firstBundle.packet.payload,
  manifest: firstBundle.manifest.payload
});
releaseBlocker();
await blocker;
await queuedMutation;
const queuedSealResult = await queuedSeal;
assert(
  queuedSealResult === null,
  "queued source mutation crossed the serializable source snapshot"
);
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: "value_scenario",
      objectId: scenarioId
    }
  },
  data: { payloadJson: scenarioRow.payload }
});
await blockerClient.$disconnect();
await mutationClient.$disconnect();

const packetRow = await prisma.aiValueObject.findUniqueOrThrow({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
      objectId: packetId
    }
  }
});
const forgedPacket = deepClone(packetRow.payloadJson);
forgedPacket.content.movement.comparison_value += 1;
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
      objectId: packetId
    }
  },
  data: { payloadJson: forgedPacket }
});
expectHeld(await authorizeAggregateClaim(authorizationRequest), "immutable artifact conflict");
assert(
  (await readAuthorizedAggregateClaim(orgId, packetId)) === null,
  "artifact substitution remained renderable"
);
const heldHtml = await request(app)
  .get(`/api/v1/ai-value/readout/${packetId}/html`)
  .set(readoutAuth)
  .expect(200);
assert(
  heldHtml.headers["x-ai-value-source-bound"] === "false" &&
    heldHtml.text.includes("Claim authorization held") &&
    !heldHtml.text.includes(projection.outcome_metric),
  "artifact substitution leaked claim material"
);
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
      objectId: packetId
    }
  },
  data: { payloadJson: packetRow.payloadJson }
});
assert(
  (await readAuthorizedAggregateClaim(orgId, packetId)) !== null,
  "exact artifact restoration did not recover current readback"
);

const journal = await prisma.cohortProofJournal.findUniqueOrThrow({
  where: { id: selected.row.proofJournalId }
});
const producerAuthority = await prisma.cohortProducerAuthority.findFirstOrThrow({
  where: {
    orgId,
    producerKeyId: journal.producerKeyId
  },
  orderBy: { authorityVersion: "desc" }
});
const revoked = await revokeCohortProducerAuthority(
  {
    org_id: orgId,
    producer_key_id: journal.producerKeyId,
    authority_version: producerAuthority.authorityVersion,
    reason_code: "SLICE_D_READBACK_REVOCATION"
  },
  prisma
);
assert(revoked, "test producer authority revocation failed");
assert(
  (await readAuthorizedAggregateClaim(orgId, packetId)) === null,
  "C.1 revocation did not hold current rendering"
);

console.log(
  "Slice D PostgreSQL verification passed: exact C.1 authorization, one-movement immutable replay, reserved-type isolation, redacted holds, selector/receipt non-authority, interleaved and queued source mutation, artifact substitution, and revocation readback."
);

await prisma.$disconnect();
await disconnectPrisma();
