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
  readAuthorizedAggregateClaim,
  resolveAuthoritativeSourceGraph,
  resolveCanonicalIdentityAuthority
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
  canonicalIdentitySourceSemanticCommitment,
  loadCanonicalIdentityExactSources
} = require("../backend/dist/repositories/canonical-identity-source.repository.js");
const {
  checkCanonicalIdentityFamilyHeadStructureReadiness
} = require("../backend/dist/canonical-identity-family-head-structure.js");
const {
  canonicalIdentityRuntimeCredentialIsReady,
  canonicalIdentityRuntimeTargetsPrimaryDatabase
} = require("../backend/dist/canonical-identity-runtime-client.js");
const {
  canonicalHypothesisAttestationPayload,
  canonicalPlanEdgeAttestationPayload,
  canonicalMeasurementCellAttestationPayload,
  createSliceEAttestation
} = require("../backend/dist/services/canonical-identity-attestation.service.js");
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
process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID = `FT_E_HMAC_VERIFY_${runId.toUpperCase()}`;
process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET = crypto
  .randomBytes(32)
  .toString("base64url");
process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON = "{}";
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

const expectRejected = async (operation, label) => {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  assert(rejected, `${label} was unexpectedly permitted`);
};
await expectRejected(
  async () =>
    aiValueEngine.canonicalSliceApprovalRoleCommitment(
      "james.kelley@example.com"
    ),
  "personal Slice E approving role"
);

assert(
  await checkCanonicalIdentityFamilyHeadStructureReadiness(prisma),
  "Slice E family-head structure was not ready"
);
const expectStructureDriftDetected = async (label, mutate) => {
  const rollbackMessage = `SLICE_E_STRUCTURE_DRIFT_ROLLBACK_${label}`;
  try {
    await prisma.$transaction(async (transaction) => {
      await mutate(transaction);
      assert(
        !(await checkCanonicalIdentityFamilyHeadStructureReadiness(transaction)),
        `${label} escaped Slice E structural readiness`
      );
      throw new Error(rollbackMessage);
    });
    throw new Error(`${label} drift probe did not roll back`);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== rollbackMessage) {
      throw error;
    }
  }
  assert(
    await checkCanonicalIdentityFamilyHeadStructureReadiness(prisma),
    `${label} drift probe did not restore the exact Slice E structure`
  );
};
await expectStructureDriftDetected("JOURNAL_INSERT_GRANT", (transaction) =>
  transaction.$executeRawUnsafe(
    "GRANT INSERT ON TABLE public.ai_value_canonical_identity_family_head_journal TO fluencytracr_slice_e_runtime"
  )
);
await expectStructureDriftDetected("SECURITY_DEFINER_SEARCH_PATH", (transaction) =>
  transaction.$executeRawUnsafe(
    "ALTER FUNCTION public.append_canonical_identity_family_head() SET search_path = public"
  )
);
await expectStructureDriftDetected("JOURNAL_RLS_DISABLED", (transaction) =>
  transaction.$executeRawUnsafe(
    "ALTER TABLE public.ai_value_canonical_identity_family_head_journal DISABLE ROW LEVEL SECURITY"
  )
);

const sliceERuntimePassword = "slice_e_assurance_runtime_2026";
await prisma.$executeRawUnsafe(
  `ALTER ROLE fluencytracr_slice_e_runtime PASSWORD '${sliceERuntimePassword}'`
);
const sliceERuntimeUrl = new URL(process.env.DATABASE_URL);
sliceERuntimeUrl.username = "fluencytracr_slice_e_runtime";
sliceERuntimeUrl.password = sliceERuntimePassword;
process.env.SLICE_E_RUNTIME_DATABASE_URL = sliceERuntimeUrl.toString();
const sliceERuntimePrisma = new PrismaClient({
  datasources: { db: { url: sliceERuntimeUrl.toString() } }
});
assert(
  await canonicalIdentityRuntimeCredentialIsReady(sliceERuntimePrisma),
  "configured Slice E client was not the exact least-privilege runtime role"
);
assert(
  await canonicalIdentityRuntimeTargetsPrimaryDatabase(
    prisma,
    sliceERuntimePrisma
  ),
  "configured Slice E client did not target the primary PostgreSQL database"
);
assert(
  !(await canonicalIdentityRuntimeCredentialIsReady(prisma)),
  "database-owner credential was accepted as the Slice E runtime role"
);

const mismatchedDatabaseName = `slice_e_mismatch_${runId}`;
await prisma.$executeRawUnsafe(
  `CREATE DATABASE "${mismatchedDatabaseName}"`
);
const mismatchedRuntimeUrl = new URL(sliceERuntimeUrl);
mismatchedRuntimeUrl.pathname = `/${mismatchedDatabaseName}`;
const mismatchedRuntimePrisma = new PrismaClient({
  datasources: { db: { url: mismatchedRuntimeUrl.toString() } }
});
try {
  assert(
    !(await canonicalIdentityRuntimeTargetsPrimaryDatabase(
      prisma,
      mismatchedRuntimePrisma
    )),
    "different PostgreSQL database was accepted as the Slice E runtime target"
  );
} finally {
  await mismatchedRuntimePrisma.$disconnect();
  await prisma.$executeRawUnsafe(
    `DROP DATABASE "${mismatchedDatabaseName}" WITH (FORCE)`
  );
}

const cutoverWriter = new PrismaClient();
try {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "LOCK TABLE public.value_hypotheses, public.measurement_plans, public.measurement_cell_snapshots IN SHARE ROW EXCLUSIVE MODE"
    );
    for (const sourceTable of [
      "value_hypotheses",
      "measurement_plans",
      "measurement_cell_snapshots"
    ]) {
      let lockTimedOut = false;
      try {
        await cutoverWriter.$transaction(async (writer) => {
          await writer.$executeRawUnsafe("SET LOCAL lock_timeout = '250ms'");
          await writer.$executeRawUnsafe(
            `INSERT INTO public.${sourceTable} DEFAULT VALUES`
          );
        });
      } catch (error) {
        lockTimedOut =
          error?.code === "P2010" &&
          (error?.meta?.code === "55P03" ||
            /lock timeout|canceling statement due to lock timeout/i.test(
              String(error?.meta?.message ?? error?.message ?? "")
            ));
      }
      assert(
        lockTimedOut,
        `${sourceTable} write was not blocked by the Slice E cutover lock`
      );
    }
  });
} finally {
  await cutoverWriter.$disconnect();
}
const substitutedRuntimeCredentialAccepted = await prisma.$transaction(
  async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SET LOCAL ROLE fluencytracr_slice_e_runtime"
    );
    return canonicalIdentityRuntimeCredentialIsReady(transaction);
  }
);
assert(
  !substitutedRuntimeCredentialAccepted,
  "elevated session using SET ROLE was accepted as the Slice E runtime login"
);
await expectRejected(
  () =>
    sliceERuntimePrisma.aiValueCanonicalIdentityFamilyHeadJournal.create({
      data: {
        sourceKind: "VALUE_HYPOTHESIS",
        orgId: `forbidden-${runId}`,
        stableSourceId: `forbidden-${runId}`,
        version: 1,
        sourceRowId: crypto.randomUUID(),
        predecessorRowId: null,
        sourceSemanticCommitment: null,
        sourceAttestationCommitment: null,
        attestationState: "UNATTESTED_LEGACY"
      }
    }),
  "direct Slice E runtime journal insert"
);

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
      source_name: projection.source_system,
      approved_grain: "workflow"
    },
    metric_definition_ref: `metric:${projection.outcome_metric}:v1`,
    canonical_direction:
      projection.comparison_window.aggregate_value < projection.baseline_window.aggregate_value
        ? "DECREASE"
        : projection.comparison_window.aggregate_value > projection.baseline_window.aggregate_value
          ? "INCREASE"
          : "MAINTAIN"
  }
];
metricsLibrary.metrics[0].canonical_metric_definition_commitment_v1 =
  aiValueEngine.canonicalMetricDefinitionCommitment(metricsLibrary.metrics[0]);

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

const materializationInput = {
  blueprint_id: blueprint.blueprint_id,
  metrics_library_id: metricsLibrary.library_id,
  cohort_id: cohortId,
  workflow_id: aggregateWorkflowId,
  outcome_workflow_id: projection.workflow_id,
  jbtd_id: projection.jbtd_id,
  persona_id: projection.persona_id
};
const materialized = await request(app)
  .post("/api/v1/ai-value/materialize/real-evidence")
  .set(writeAuth)
  .send(materializationInput)
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

const acceptedMaterialization = await request(app)
  .post("/api/v1/ai-value/materialize/real-evidence")
  .set(writeAuth)
  .send(materializationInput)
  .expect(200);
assert(
  acceptedMaterialization.body.objects?.outcome_evidence_export?.export_id ===
    outcomeExportId &&
    acceptedMaterialization.body.objects?.evidence_readiness?.readiness_id ===
      readinessId &&
    acceptedMaterialization.body.objects?.value_scenario?.scenario_id === scenarioId,
  "accepted rematerialization changed exact source graph identities"
);

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
assert(
  internalRows.every((row) => row.workflowFamily === null),
  "reserved Slice D artifacts duplicated raw workflow identity into workflow_family"
);
const rawArtifactIdentities = [
  orgId,
  projection.workflow_id,
  projection.jbtd_id,
  projection.persona_id,
  projection.baseline_window.evidence_id,
  projection.comparison_window.evidence_id,
  blueprint.blueprint_id,
  metricsLibrary.library_id,
  scenarioId,
  outcomeExportId,
  readinessId
];
const storedArtifactPayloads = JSON.stringify(
  internalRows.map((row) => row.payloadJson)
);
for (const identity of rawArtifactIdentities) {
  assert(
    !storedArtifactPayloads.includes(identity),
    `reserved Slice D payload retained raw identity ${identity}`
  );
}

const forgedClaim = deepClone(firstBundle.claim.payload);
const forgedPacket = deepClone(firstBundle.packet.payload);
const forgedManifest = deepClone(firstBundle.manifest.payload);
const forgedMovement = aiValueEngine.buildAggregateObservedMovement({
  metricId: projection.outcome_metric,
  measurementUnit: projection.outcome_unit,
  baselineValue: projection.baseline_window.aggregate_value,
  comparisonValue: projection.comparison_window.aggregate_value + 100
});
forgedClaim.content.movement = forgedMovement;
forgedClaim.content_hash = aiValueEngine.aggregateClaimHash(
  "FT_AGGREGATE_AUTHORIZED_CLAIM_CONTENT_V1",
  forgedClaim.content
);
forgedPacket.content.movement = forgedMovement;
forgedPacket.content.claim_content_hash = forgedClaim.content_hash;
forgedPacket.content_hash = aiValueEngine.aggregateClaimHash(
  "FT_AGGREGATE_AUTHORIZED_PACKET_CONTENT_V1",
  forgedPacket.content
);
forgedManifest.core.claim_content_hash = forgedClaim.content_hash;
forgedManifest.core.packet_content_hash = forgedPacket.content_hash;
forgedManifest.manifest_hash = aiValueEngine.aggregateClaimHash(
  "FT_AGGREGATE_CLAIM_AUTHORIZATION_MANIFEST_CORE_V1",
  forgedManifest.core
);
forgedManifest.manifest_id = `manifest_${forgedManifest.manifest_hash}`;
forgedManifest.claim_id = `aggregate_claim_${forgedManifest.manifest_hash}_${aiValueEngine.aggregateClaimHash(
  "FT_AGGREGATE_AUTHORIZED_CLAIM_ID_V1",
  { manifest_hash: forgedManifest.manifest_hash }
)}`;
forgedManifest.packet_id = `aggregate_packet_${forgedManifest.manifest_hash}_${aiValueEngine.aggregateClaimHash(
  "FT_AGGREGATE_AUTHORIZED_PACKET_ID_V1",
  { manifest_hash: forgedManifest.manifest_hash }
)}`;
forgedClaim.claim_id = forgedManifest.claim_id;
forgedClaim.manifest_id = forgedManifest.manifest_id;
forgedPacket.packet_id = forgedManifest.packet_id;
forgedPacket.manifest_id = forgedManifest.manifest_id;
forgedPacket.claim_id = forgedManifest.claim_id;
assert(
  aiValueEngine.aggregateClaimBundleReconciles({
    claim: forgedClaim,
    packet: forgedPacket,
    manifest: forgedManifest
  }),
  "coherent movement-substitution fixture was not structurally valid"
);
const forgedArtifacts = [
  {
    objectType: aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
    objectId: forgedClaim.claim_id,
    payload: forgedClaim
  },
  {
    objectType: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
    objectId: forgedPacket.packet_id,
    payload: forgedPacket
  },
  {
    objectType: aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
    objectId: forgedManifest.manifest_id,
    payload: forgedManifest
  }
];
for (const artifact of forgedArtifacts) {
  await prisma.aiValueObject.create({
    data: {
      orgId,
      objectType: artifact.objectType,
      objectId: artifact.objectId,
      schemaVersion: artifact.payload.schema_version,
      workflowFamily: null,
      payloadJson: artifact.payload,
      validationJson: {
        valid: true,
        claim_authorization_authoritative: true,
        immutable: true,
        manifest_id: forgedManifest.manifest_id
      },
      valid: true
    }
  });
}
assert(
  (await readAuthorizedAggregateClaim(orgId, forgedPacket.packet_id)) === null,
  "coherently rehashed movement substitution remained renderable"
);
await prisma.aiValueObject.deleteMany({
  where: {
    orgId,
    objectId: { in: forgedArtifacts.map((artifact) => artifact.objectId) }
  }
});

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
  html.headers["x-ai-value-source-bound"] === "false" &&
    html.headers["x-ai-value-canonical-identity-bound"] === "false" &&
    html.text.includes("OBSERVED_NON_ATTRIBUTABLE") &&
    !html.text.toLowerCase().includes("caused"),
  "legacy Slice D readout did not preserve explicit UNBOUND semantics"
);

const canonicalMetric = metricsLibrary.metrics[0];
const measurementPlan = JSON.parse(
  await readFile(
    new URL(
      "../docs/contracts/ai-value-measurement-plan/examples/full-playbook-ready-plan.json",
      import.meta.url
    ),
    "utf8"
  )
);
const hypothesisId = `hypothesis_e_${runId}`;
const measurementPlanId = `plan_e_${runId}`;
const measurementCellId = `cell_e_${runId}`;
measurementPlan.org_id = orgId;
measurementPlan.measurement_plan_id = measurementPlanId;
measurementPlan.value_hypothesis.value_hypothesis_id = hypothesisId;
measurementPlan.workflow_scope.workflow_family = projection.workflow_id;
measurementPlan.workflow_scope.approved_aggregate_grain =
  canonicalMetric.source_system.approved_grain;
measurementPlan.vbd_measurement_design.breadth.approved_aggregate_grain =
  canonicalMetric.source_system.approved_grain;
measurementPlan.metric_selection.primary_metric.metric_id = projection.outcome_metric;
measurementPlan.windows = {
  baseline_window_start: projection.baseline_window.period_start,
  baseline_window_end: projection.baseline_window.period_end,
  comparison_window_start: projection.comparison_window.period_start,
  comparison_window_end: projection.comparison_window.period_end,
  window_alignment_state: "baseline_and_comparison_selected"
};
measurementPlan.canonical_slice_binding_v1 = aiValueEngine.buildCanonicalSliceBindingV1({
  plan_version: 1,
  workflow_commitment: aiValueEngine.canonicalSliceJoinKeyCommitment(
    "workflow_id",
    projection.workflow_id
  ),
  jbtd_commitment: aiValueEngine.canonicalSliceJoinKeyCommitment(
    "jbtd_id",
    projection.jbtd_id
  ),
  persona_commitment: aiValueEngine.canonicalSliceJoinKeyCommitment(
    "persona_id",
    projection.persona_id
  ),
  baseline_window_start: projection.baseline_window.period_start,
  baseline_window_end: projection.baseline_window.period_end,
  comparison_window_start: projection.comparison_window.period_start,
  comparison_window_end: projection.comparison_window.period_end,
  metric_id: projection.outcome_metric,
  metric_definition_ref: canonicalMetric.metric_definition_ref,
  canonical_metric_definition_commitment_v1:
    canonicalMetric.canonical_metric_definition_commitment_v1,
  outcome_source_system: projection.source_system,
  measurement_unit: projection.outcome_unit,
  approved_direction: canonicalMetric.canonical_direction,
  approved_aggregate_grain: canonicalMetric.source_system.approved_grain,
  aggregate_only: true,
  approved_at: "2026-07-28T00:00:00.000Z",
  approved_by_role: "value_realization_pm"
});
const measurementPlanValidation = aiValueEngine.validateMeasurementPlan(measurementPlan);
assert(
  measurementPlanValidation.valid,
  `Slice E plan fixture was invalid: ${JSON.stringify(measurementPlanValidation.gaps)}`
);

const hypothesisRowId = crypto.randomUUID();
const hypothesisValidation = { ...measurementPlanValidation };
const hypothesisSource = {
  sourceKind: "VALUE_HYPOTHESIS",
  rowId: hypothesisRowId,
  orgId,
  stableId: hypothesisId,
  version: 1,
  predecessorRowId: null,
  validation: hypothesisValidation,
  payload: measurementPlan.value_hypothesis,
  authority: {
    status: "approved",
    workflow_family: projection.workflow_id,
    value_route: measurementPlan.value_hypothesis.value_route,
    hypothesis_statement: measurementPlan.value_hypothesis.hypothesis_statement,
    business_objective: measurementPlan.value_hypothesis.business_objective
  }
};
hypothesisSource.semanticCommitment = canonicalIdentitySourceSemanticCommitment(hypothesisSource);
const hypothesisAttestation = createSliceEAttestation(
  "hypothesis_creation",
  canonicalHypothesisAttestationPayload({
    orgId,
    rowId: hypothesisRowId,
    stableId: hypothesisId,
    version: 1,
    semanticCommitment: hypothesisSource.semanticCommitment,
    status: "approved",
    predecessor: { state: "ROOT_V1" }
  })
);
assert(hypothesisAttestation, "Slice E hypothesis attestation was unavailable");
hypothesisValidation.canonical_value_hypothesis_creation_attestation_v1 = {
  hypothesis_semantic_commitment: hypothesisSource.semanticCommitment,
  ...hypothesisAttestation
};
await prisma.valueHypothesis.create({
  data: {
    id: hypothesisRowId,
    orgId,
    valueHypothesisId: hypothesisId,
    schemaVersion: measurementPlan.schema_version,
    derivationVersion: measurementPlan.derivation_version,
    workflowFamily: projection.workflow_id,
    functionArea: measurementPlan.workflow_scope.function_area,
    valueRoute: measurementPlan.value_hypothesis.value_route,
    hypothesisStatement: measurementPlan.value_hypothesis.hypothesis_statement,
    businessObjective: measurementPlan.value_hypothesis.business_objective,
    status: "approved",
    payloadJson: measurementPlan.value_hypothesis,
    validationJson: hypothesisValidation,
    sourceRefsJson: {},
    version: 1,
    createdByRole: "value_realization_pm"
  }
});

const planRowId = crypto.randomUUID();
const planValidation = { ...measurementPlanValidation };
const planSource = {
  sourceKind: "MEASUREMENT_PLAN",
  rowId: planRowId,
  orgId,
  stableId: measurementPlanId,
  version: 1,
  predecessorRowId: null,
  validation: planValidation,
  payload: measurementPlan,
  authority: {
    value_hypothesis_id: hypothesisId,
    workflow_family: projection.workflow_id,
    approved_aggregate_grain: measurementPlan.workflow_scope.approved_aggregate_grain,
    baseline_window_start: projection.baseline_window.period_start,
    baseline_window_end: projection.baseline_window.period_end,
    comparison_window_start: projection.comparison_window.period_start,
    comparison_window_end: projection.comparison_window.period_end,
    readiness_state: measurementPlan.readiness.measurement_plan_readiness
  }
};
planSource.semanticCommitment = canonicalIdentitySourceSemanticCommitment(planSource);
const planAttestation = createSliceEAttestation(
  "plan_edge",
  canonicalPlanEdgeAttestationPayload({
    orgId,
    rowId: planRowId,
    stableId: measurementPlanId,
    version: 1,
    semanticCommitment: planSource.semanticCommitment,
    readinessState: planSource.authority.readiness_state,
    approvedAggregateGrain: measurementPlan.canonical_slice_binding_v1.approved_aggregate_grain,
    canonicalSliceCommitment: measurementPlan.canonical_slice_binding_v1.slice_commitment,
    canonicalMetricDefinitionCommitment:
      measurementPlan.canonical_slice_binding_v1.canonical_metric_definition_commitment_v1,
    hypothesis: {
      rowId: hypothesisRowId,
      stableId: hypothesisId,
      version: 1,
      semanticCommitment: hypothesisSource.semanticCommitment,
      attestationCommitment: hypothesisAttestation.mac
    }
  })
);
assert(planAttestation, "Slice E plan attestation was unavailable");
planValidation.canonical_hypothesis_edge_v1 = {
  plan_semantic_commitment: planSource.semanticCommitment,
  hypothesis_row_id: hypothesisRowId,
  hypothesis_version: 1,
  hypothesis_semantic_commitment: hypothesisSource.semanticCommitment,
  hypothesis_creation_attestation_commitment: hypothesisAttestation.mac,
  approved_aggregate_grain: measurementPlan.canonical_slice_binding_v1.approved_aggregate_grain,
  canonical_slice_commitment: measurementPlan.canonical_slice_binding_v1.slice_commitment,
  ...planAttestation
};
await prisma.measurementPlan.create({
  data: {
    id: planRowId,
    orgId,
    measurementPlanId,
    valueHypothesisId: hypothesisId,
    schemaVersion: measurementPlan.schema_version,
    derivationVersion: measurementPlan.derivation_version,
    workflowFamily: projection.workflow_id,
    approvedAggregateGrain: measurementPlan.workflow_scope.approved_aggregate_grain,
    minimumCohortThreshold: measurementPlan.workflow_scope.minimum_cohort_threshold,
    baselineWindowStart: new Date(projection.baseline_window.period_start),
    baselineWindowEnd: new Date(projection.baseline_window.period_end),
    comparisonWindowStart: new Date(projection.comparison_window.period_start),
    comparisonWindowEnd: new Date(projection.comparison_window.period_end),
    coverageGoal: measurementPlanValidation.readiness.max_snapshot_type,
    readinessState: measurementPlan.readiness.measurement_plan_readiness,
    payloadJson: measurementPlan,
    validationJson: planValidation,
    sourcePackageRequirementsJson: measurementPlan.source_package_requirements,
    assumptionsJson: measurementPlan.assumptions,
    sourceRefsJson: {},
    version: 1,
    createdByRole: "value_realization_pm"
  }
});

const cellRowId = crypto.randomUUID();
const cellValidation = { valid: true };
const cellPayload = {
  schema_version: "FT_CANONICAL_MEASUREMENT_CELL_SOURCE_V1",
  aggregate_only: true
};
const cellSource = {
  sourceKind: "MEASUREMENT_CELL",
  rowId: cellRowId,
  orgId,
  stableId: measurementCellId,
  version: 1,
  predecessorRowId: null,
  validation: cellValidation,
  payload: cellPayload,
  authority: {
    measurement_plan_id: measurementPlanId,
    aggregate_source_system: projection.source_system,
    value_hypothesis_id: hypothesisId,
    value_hypothesis_ref: `${hypothesisId}:v1`,
    approval_state: "approved",
    approved_by_role: "workflow_owner",
    metric_owner_approval_state: "approved",
    metric_id: projection.outcome_metric,
    metric_definition_ref: canonicalMetric.metric_definition_ref,
    metric_definition_hash: aiValueEngine.aggregateClaimHash(
      "FT_LEGACY_METRIC_DEFINITION_V1",
      canonicalMetric
    ),
    metric_direction: canonicalMetric.canonical_direction.toLowerCase(),
    metric_unit: projection.outcome_unit,
    workflow_id: projection.workflow_id,
    cohort_key: "aggregate_exact_slice",
    baseline_window_start: projection.baseline_window.period_start,
    baseline_window_end: projection.baseline_window.period_end,
    comparison_window_start: projection.comparison_window.period_start,
    comparison_window_end: projection.comparison_window.period_end
  }
};
cellSource.semanticCommitment = canonicalIdentitySourceSemanticCommitment(cellSource);
const cellAttestation = createSliceEAttestation(
  "measurement_cell_edge",
  canonicalMeasurementCellAttestationPayload({
    orgId,
    rowId: cellRowId,
    stableId: measurementCellId,
    version: 1,
    semanticCommitment: cellSource.semanticCommitment,
    approvalState: "approved",
    metricOwnerApprovalState: "approved",
    approvedAggregateGrain: measurementPlan.canonical_slice_binding_v1.approved_aggregate_grain,
    canonicalMetricDefinitionCommitment: canonicalMetric.canonical_metric_definition_commitment_v1,
    canonicalDirection: canonicalMetric.canonical_direction,
    plan: {
      rowId: planRowId,
      stableId: measurementPlanId,
      version: 1,
      semanticCommitment: planSource.semanticCommitment,
      attestationCommitment: planAttestation.mac
    },
    hypothesis: {
      rowId: hypothesisRowId,
      stableId: hypothesisId,
      version: 1,
      semanticCommitment: hypothesisSource.semanticCommitment,
      attestationCommitment: hypothesisAttestation.mac
    }
  })
);
assert(cellAttestation, "Slice E cell attestation was unavailable");
cellValidation.canonical_measurement_lineage_v1 = {
  measurement_cell_semantic_commitment: cellSource.semanticCommitment,
  plan_row_id: planRowId,
  plan_version: 1,
  plan_semantic_commitment: planSource.semanticCommitment,
  plan_edge_attestation_commitment: planAttestation.mac,
  hypothesis_row_id: hypothesisRowId,
  hypothesis_version: 1,
  hypothesis_semantic_commitment: hypothesisSource.semanticCommitment,
  hypothesis_creation_attestation_commitment: hypothesisAttestation.mac,
  approved_aggregate_grain: measurementPlan.canonical_slice_binding_v1.approved_aggregate_grain,
  canonical_metric_definition_commitment_v1:
    canonicalMetric.canonical_metric_definition_commitment_v1,
  canonical_direction: canonicalMetric.canonical_direction,
  ...cellAttestation
};
await prisma.measurementCellSnapshot.create({
  data: {
    id: cellRowId,
    orgId,
    measurementCellId,
    measurementCellAssemblyRunId: crypto.randomUUID(),
    measurementPlanId,
    aggregateSourceSystem: projection.source_system,
    aggregateExportReviewRef: "aggregate-review-v1",
    aggregateExportReviewState: "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW",
    aggregateSourceExportRef: "aggregate-export-v1",
    aggregateExportReviewHash: "a".repeat(64),
    pipelineDryRunRef: "pipeline-dry-run-v1",
    pipelineBoundaryHash: "b".repeat(64),
    aggregateBoundaryRefJson: { aggregate_only: true },
    valueHypothesisId: hypothesisId,
    valueHypothesisRef: `${hypothesisId}:v1`,
    valueHypothesisBindingState: "approved",
    approvedBlueprintRef: blueprint.blueprint_id,
    approvedBlueprintPayloadHash: "c".repeat(64),
    blueprintExpectationRef: "expectation-v1",
    expectationPathId: "expectation-path-v1",
    expectationPathVersion: 1,
    expectationPathHash: "d".repeat(64),
    approvalState: "approved",
    approvedAt: new Date("2026-07-28T00:00:00.000Z"),
    approvedByRole: "workflow_owner",
    valueDriver: "Capacity",
    metricId: projection.outcome_metric,
    metricDefinitionRef: canonicalMetric.metric_definition_ref,
    metricDefinitionHash: cellSource.authority.metric_definition_hash,
    metricOwnerApprovalState: "approved",
    metricDirection: canonicalMetric.canonical_direction.toLowerCase(),
    metricUnit: projection.outcome_unit,
    expectedMetricLagDays: 30,
    workflowFamily: projection.workflow_id,
    workflowId: projection.workflow_id,
    functionArea: "customer_support",
    cohortKey: "aggregate_exact_slice",
    windowMode: "fixed",
    milestoneDay: 30,
    baselineWindowStart: new Date(projection.baseline_window.period_start),
    baselineWindowEnd: new Date(projection.baseline_window.period_end),
    comparisonWindowStart: new Date(projection.comparison_window.period_start),
    comparisonWindowEnd: new Date(projection.comparison_window.period_end),
    assemblyDecision: "READY",
    payloadJson: cellPayload,
    validationJson: cellValidation,
    assemblyValidationJson: { valid: true },
    sourceRefsJson: {},
    blueprintPathBindingJson: { aggregate_only: true },
    requiredCaveatsJson: [],
    blockedUsesJson: ["customer_facing_output"],
    version: 1,
    generatedAt: new Date("2026-07-28T00:00:00.000Z"),
    createdByRole: "value_realization_pm"
  }
});

await expectRejected(
  () =>
    sliceERuntimePrisma.valueHypothesis.update({
      where: { id: hypothesisRowId },
      data: { status: "approved" }
    }),
  "Slice E runtime source update"
);
await expectRejected(
  () =>
    sliceERuntimePrisma.valueHypothesis.delete({
      where: { id: hypothesisRowId }
    }),
  "Slice E runtime source delete"
);
await expectRejected(
  () =>
    prisma.valueHypothesis.update({
      where: { id: hypothesisRowId },
      data: { status: "approved" }
    }),
  "owner-level source update trigger bypass"
);
await expectRejected(
  () =>
    prisma.valueHypothesis.delete({
      where: { id: hypothesisRowId }
    }),
  "owner-level source delete trigger bypass"
);
const hypothesisJournalKey = {
  sourceKind: "VALUE_HYPOTHESIS",
  orgId,
  stableSourceId: hypothesisId,
  version: 1
};
await expectRejected(
  () =>
    prisma.aiValueCanonicalIdentityFamilyHeadJournal.update({
      where: {
        sourceKind_orgId_stableSourceId_version: hypothesisJournalKey
      },
      data: { attestationState: "ATTESTATION_PRESENT" }
    }),
  "owner-level journal update trigger bypass"
);
await expectRejected(
  () =>
    prisma.aiValueCanonicalIdentityFamilyHeadJournal.delete({
      where: {
        sourceKind_orgId_stableSourceId_version: hypothesisJournalKey
      }
    }),
  "owner-level journal delete trigger bypass"
);
const appendHypothesisAttack = (version, supersedesId) =>
  prisma.valueHypothesis.create({
    data: {
      id: crypto.randomUUID(),
      orgId,
      valueHypothesisId: hypothesisId,
      schemaVersion: measurementPlan.schema_version,
      derivationVersion: measurementPlan.derivation_version,
      workflowFamily: projection.workflow_id,
      functionArea: measurementPlan.workflow_scope.function_area,
      valueRoute: measurementPlan.value_hypothesis.value_route,
      hypothesisStatement: measurementPlan.value_hypothesis.hypothesis_statement,
      businessObjective: measurementPlan.value_hypothesis.business_objective,
      status: "approved",
      payloadJson: measurementPlan.value_hypothesis,
      validationJson: hypothesisValidation,
      sourceRefsJson: {},
      version,
      supersedesId,
      createdByRole: "value_realization_pm"
    }
  });
await expectRejected(
  () => appendHypothesisAttack(3, hypothesisRowId),
  "Slice E family-head gap insert"
);
await expectRejected(
  () => appendHypothesisAttack(2, crypto.randomUUID()),
  "Slice E family-head wrong-predecessor insert"
);

const canonicalSelector = {
  value_hypothesis_id: hypothesisId,
  value_hypothesis_version: 1,
  measurement_plan_id: measurementPlanId,
  measurement_plan_version: 1,
  measurement_cell_id: measurementCellId,
  measurement_cell_version: 1
};
const canonicalAuthorizationRequest = {
  ...authorizationRequest,
  canonicalIdentitySelector: canonicalSelector
};
const loadedCanonicalSources = await loadCanonicalIdentityExactSources(orgId, canonicalSelector);
assert(
  loadedCanonicalSources,
  "exact Slice E source/journal reconstruction failed before authorization"
);
const canonicalGraph = await resolveAuthoritativeSourceGraph(canonicalAuthorizationRequest);
assert(canonicalGraph, "Slice E authoritative D source graph failed to resolve");
const canonicalAuthority = await resolveCanonicalIdentityAuthority(
  canonicalGraph,
  selected.result,
  canonicalSelector
);
assert(
  canonicalAuthority,
  "Slice E exact source compatibility or HMAC authority failed to resolve"
);
const canonicalAuthorized = await authorizeAggregateClaim(canonicalAuthorizationRequest);
const canonicalArtifactRows = await prisma.aiValueObject.findMany({
  where: {
    orgId,
    objectType: {
      in: [
        aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
        aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
        aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
        aiValueEngine.INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE
      ]
    }
  },
  select: { objectType: true, objectId: true }
});
assert(
  canonicalAuthorized.decision === "AUTHORIZED" &&
    canonicalAuthorized.canonical_identity_state === "BOUND" &&
    canonicalAuthorized.source_bound === true &&
    canonicalAuthorized.persisted.length === 4,
  `exact Slice E path did not authorize one four-artifact bound bundle: response=${JSON.stringify(
    canonicalAuthorized
  )} rows=${JSON.stringify(canonicalArtifactRows)}`
);
const canonicalPacketId = canonicalAuthorized.packet_id;
const canonicalBundle = await readAiValueClaimBundle(orgId, canonicalPacketId);
assert(
  canonicalBundle?.binding &&
    aiValueEngine.canonicalIdentityBundleReconciles({
      claim: canonicalBundle.claim.payload,
      packet: canonicalBundle.packet.payload,
      manifest: canonicalBundle.manifest.payload,
      binding: canonicalBundle.binding.payload
    }),
  "Slice E four-artifact bundle did not reconcile"
);
const canonicalHtml = await request(app)
  .get(`/api/v1/ai-value/readout/${canonicalPacketId}/html`)
  .set(readoutAuth)
  .expect(200);
assert(
  canonicalHtml.headers["x-ai-value-source-bound"] === "true" &&
    canonicalHtml.headers["x-ai-value-canonical-identity-bound"] === "true" &&
    canonicalHtml.text.includes("OBSERVED_NON_ATTRIBUTABLE"),
  "Slice E readout did not prove exact bound authority"
);
process.env.SLICE_E_RUNTIME_DATABASE_URL = process.env.DATABASE_URL;
assert(
  (await readAuthorizedAggregateClaim(orgId, canonicalPacketId)) === null,
  "elevated general credential revalidated an existing Slice E readout"
);
process.env.SLICE_E_RUNTIME_DATABASE_URL = sliceERuntimeUrl.toString();
assert(
  (await readAuthorizedAggregateClaim(orgId, canonicalPacketId)) !== null,
  "exact Slice E runtime restoration did not recover readback"
);
expectHeld(
  await authorizeAggregateClaim({
    ...canonicalAuthorizationRequest,
    canonicalIdentitySelector: {
      ...canonicalSelector,
      measurement_cell_version: 2
    }
  }),
  "stale or missing canonical selector"
);
const bindingRow = await prisma.aiValueObject.findUniqueOrThrow({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE,
      objectId: canonicalBundle.binding.object_id
    }
  }
});
const forgedBindingValidation = deepClone(bindingRow.validationJson);
forgedBindingValidation.canonical_artifact_creation_attestation_v1.mac = "0".repeat(64);
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE,
      objectId: canonicalBundle.binding.object_id
    }
  },
  data: { validationJson: forgedBindingValidation }
});
assert(
  (await readAuthorizedAggregateClaim(orgId, canonicalPacketId)) === null,
  "forged Slice E bundle attestation remained renderable"
);
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE,
      objectId: canonicalBundle.binding.object_id
    }
  },
  data: { validationJson: bindingRow.validationJson }
});
assert(
  (await readAuthorizedAggregateClaim(orgId, canonicalPacketId)) !== null,
  "exact Slice E attestation restoration did not recover readback"
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
expectHeld(
  await authorizeAggregateClaim(authorizationRequest, {
    readComparison: async () => ({
      ...selected.result,
      projection: {
        ...selected.result.projection,
        persona_id: "employee_12345"
      }
    })
  }),
  "identifier-bearing persona projection"
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
const substitutedPacket = deepClone(packetRow.payloadJson);
substitutedPacket.content.movement.comparison_value += 1;
await prisma.aiValueObject.update({
  where: {
    ai_value_objects_unique_key: {
      orgId,
      objectType: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
      objectId: packetId
    }
  },
  data: { payloadJson: substitutedPacket }
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

let postSealCanonicalReadCount = 0;
const postSealCanonicalSupersession = await authorizeAggregateClaim(
  canonicalAuthorizationRequest,
  {
    readComparison: async () => {
      postSealCanonicalReadCount += 1;
      if (postSealCanonicalReadCount === 3) {
        await appendHypothesisAttack(2, hypothesisRowId);
      }
      return selected.result;
    }
  }
);
expectHeld(
  postSealCanonicalSupersession,
  "post-commit Slice E source supersession"
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
  "Slice D/E PostgreSQL verification passed: exact C.1 authorization, legacy unbound replay, exact least-privilege Slice E session/effective runtime credential, same-server/database identity, wrong-database rejection, write-blocking three-source cutover lock, SET ROLE substitution rejection, elevated existing-readout rejection, canonical source/journal/HMAC authority, exact privilege-drift detection, direct journal-write denial, source/journal append-only guards, gap/wrong-predecessor rejection, one four-artifact bound bundle, post-seal canonical supersession hold, forged bundle-attestation rejection, commitment-only slice, approval-role, and artifact identity, coherent movement-substitution rejection, reserved-type isolation, redacted holds, selector/receipt non-authority, interleaved and queued source mutation, artifact substitution, and revocation readback."
);

await sliceERuntimePrisma.$disconnect();
await prisma.$disconnect();
await disconnectPrisma();
