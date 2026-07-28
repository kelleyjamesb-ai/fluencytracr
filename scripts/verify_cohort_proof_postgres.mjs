import crypto from "node:crypto";
import { createRequire } from "node:module";

import { PrismaClient } from "@prisma/client";
import { createCohortEqualityProof } from "../transformer/cohort_proof_producer.mjs";

const require = createRequire(import.meta.url);
const {
  commitCohortEqualityProof,
  verifyCohortProofPrivacyHandoff
} = require("../backend/dist/repositories/cohort-proof.repository.js");
const {
  registerCohortProducerAuthority,
  revokeCohortProducerAuthority
} = require("../backend/dist/repositories/cohort-producer-authority.repository.js");
const {
  commitAggregatePrivacyProjection,
  hashAggregateProjectionContent,
  hashCanonicalContributionIds,
  hashPrivacyDomainFingerprint,
  hashPublicProjectionShape,
  hashSharedPrivacyReservationKey
} = require("../backend/dist/repositories/aggregate-privacy-release.repository.js");
const {
  persistOutcomeEvidence
} = require("../backend/dist/repositories/outcome-evidence.repository.js");
const {
  exactOutcomeEvidenceSliceSegment
} = require("../backend/dist/outcome_evidence_admission_authority.js");
const {
  disconnectPrisma
} = require("../backend/dist/db.js");

const prisma = new PrismaClient();
const orgId = `c0-postgres-${crypto.randomUUID()}`;
const hash = (label) =>
  crypto.createHash("sha256").update(`${orgId}:${label}`).digest("hex");

const proofMembers = ["member-a", "member-b", "member-c", "member-d", "member-e"];

const setupApplicationScenario = async (label) => {
  const scenarioOrgId = `${orgId}-${label}`;
  const workflowId = "workflow:renewal";
  const jbtdId = "renewal";
  const personaId = "account_exec";
  const baseline = {
    workflow_id: workflowId,
    outcome_metric: "cycle_time",
    outcome_unit: "days",
    period_start: "2026-01-01T00:00:00.000Z",
    period_end: "2026-03-02T00:00:00.000Z",
    aggregate_value: 12.5,
    cohort_size: 5,
    source_system: "customer_crm",
    jbtd_id: jbtdId,
    persona_id: personaId,
    aggregate_kind: "mean",
    source_attestation: { approved: true }
  };
  const comparison = {
    ...baseline,
    period_start: "2026-03-02T00:00:00.000Z",
    period_end: "2026-05-01T00:00:00.000Z",
    aggregate_value: 10.25
  };
  const baselineId = crypto.randomUUID();
  const comparisonId = crypto.randomUUID();
  const acceptedAt = "2026-05-02T00:00:00.000Z";
  await persistOutcomeEvidence(
    scenarioOrgId,
    baseline,
    baselineId,
    acceptedAt,
    undefined
  );
  await persistOutcomeEvidence(
    scenarioOrgId,
    comparison,
    comparisonId,
    acceptedAt,
    undefined
  );
  const baselineRecord = {
    ...baseline,
    org_id: scenarioOrgId,
    evidence_id: baselineId,
    ingested_at: acceptedAt
  };
  const comparisonRecord = {
    ...comparison,
    org_id: scenarioOrgId,
    evidence_id: comparisonId,
    ingested_at: acceptedAt
  };
  const admissionReceipt = {
    policy_version: "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07",
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    baseline_window: {
      period_start: baseline.period_start,
      period_end: baseline.period_end,
      evidence_ids: [baselineId]
    },
    comparison_window: {
      period_start: comparison.period_start,
      period_end: comparison.period_end,
      evidence_ids: [comparisonId]
    }
  };
  const segment = exactOutcomeEvidenceSliceSegment({
    workflowId,
    jbtdId,
    personaId,
    baselineWindow: "2026-01-01_to_2026-03-02",
    comparisonWindow: "2026-03-02_to_2026-05-01"
  });
  const exportId = `outcome_export_${segment}_real_evidence_v1`;
  const readinessId = `readiness_${segment}_real_evidence_v1`;
  const createdAt = new Date("2026-05-02T00:00:00.000Z");
  const updatedAt = new Date("2026-05-02T00:30:00.000Z");
  await prisma.aiValueObject.createMany({
    data: [
      {
        orgId: scenarioOrgId,
        objectType: "outcome_evidence_export",
        objectId: exportId,
        schemaVersion: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
        workflowFamily: workflowId,
        payloadJson: {
          schema_version: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
          export_id: exportId,
          org_id: scenarioOrgId,
          workflow_family: workflowId,
          source_system: {
            source_type: "crm",
            source_name: baseline.source_system,
            approved_grain: "aggregate_workflow_window"
          },
          attestation: {
            exported_by_role: "customer_data_owner",
            approved_by_role: "customer_business_sponsor",
            export_date: "2026-05-02",
            contains_person_level_data: false,
            contains_raw_content: false
          },
          windows: {
            baseline: "2026-01-01_to_2026-03-02",
            comparison: "2026-03-02_to_2026-05-01"
          },
          admission: admissionReceipt,
          metrics: [{
            metric_id: baseline.outcome_metric,
            measurement_unit: baseline.outcome_unit,
            baseline_value: baseline.aggregate_value,
            comparison_value: comparison.aggregate_value,
            eligible_population: 5
          }],
          review: {
            review_state: "ACCEPTED",
            reviewer_role: "ADMIN",
            reviewed_at: updatedAt.toISOString()
          }
        },
        validationJson: {
          admission_authoritative: true,
          admission_receipt: admissionReceipt
        },
        valid: true,
        createdAt,
        updatedAt
      },
      {
        orgId: scenarioOrgId,
        objectType: "evidence_readiness",
        objectId: readinessId,
        schemaVersion: "FT_TEST_READINESS_V1",
        workflowFamily: workflowId,
        payloadJson: {
          source_refs: { outcome_evidence_export_id: exportId },
          workflow_family: workflowId
        },
        validationJson: {
          outcome_evidence_admission_authoritative: true,
          outcome_evidence_admission_receipt: admissionReceipt,
          outcome_evidence_export_id: exportId
        },
        valid: true,
        createdAt,
        updatedAt
      }
    ]
  });
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  const privatePem = privateKey.export({ format: "pem", type: "pkcs8" });
  if (!Buffer.isBuffer(publicDer) || typeof privatePem !== "string") {
    throw new Error("application scenario key export failed");
  }
  const now = Date.now();
  const authorityExpiresAt = new Date(now + 60 * 60_000).toISOString();
  const authority = await registerCohortProducerAuthority(
    {
      org_id: scenarioOrgId,
      producer_key_id: "producer_primary",
      authority_version: 1,
      public_key_der_base64: publicDer.toString("base64"),
      valid_from: new Date(now - 60_000).toISOString(),
      expires_at: authorityExpiresAt
    },
    prisma
  );
  if (!authority) throw new Error("application authority registration failed");
  const proof = createCohortEqualityProof({
    metadata: {
      proof_id: `proof_${label}`,
      org_id: scenarioOrgId,
      producer_key_id: "producer_primary",
      authority_version: 1,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + 10 * 60_000).toISOString(),
      workflow_id: workflowId,
      jbtd_id: jbtdId,
      persona_id: personaId,
      outcome_metric: baseline.outcome_metric,
      outcome_unit: baseline.outcome_unit,
      source_system: baseline.source_system,
      baseline_window: {
        period_start: baseline.period_start,
        period_end: baseline.period_end,
        cohort_size: 5
      },
      comparison_window: {
        period_start: comparison.period_start,
        period_end: comparison.period_end,
        cohort_size: 5
      }
    },
    baseline_members: proofMembers,
    comparison_members: [...proofMembers].reverse(),
    baseline_evidence: baselineRecord,
    comparison_evidence: comparisonRecord,
    admission_receipt: admissionReceipt,
    population_key: crypto.randomBytes(32),
    private_key_pem: privatePem
  });
  const projection = { status: "released", values: [10, 20] };
  const candidateBase = {
    org_id: scenarioOrgId,
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    privacy_slot_id: `slot_${label}`,
    atomic_lineage_fingerprint: hash(`${label}:lineage`),
    public_projection_hash: hashPublicProjectionShape(projection),
    temporal_grid_id: "fixed-grid-v1",
    window_id: "2026-01-01/2026-03-02",
    release_version: 1,
    hierarchy_axis: "workflow",
    source_mode: "canonical",
    atomic_cell_ids: ["cell-a", "cell-b"]
  };
  const candidate = {
    ...candidateBase,
    content_fingerprint: hashAggregateProjectionContent(candidateBase, projection)
  };
  const contributionIds = [
    `${label}-contribution-1`,
    `${label}-contribution-2`,
    `${label}-contribution-3`,
    `${label}-contribution-4`,
    `${label}-contribution-5`
  ];
  await prisma.aggregatePrivacyManifest.create({
    data: {
      orgId: scenarioOrgId,
      workflowId,
      jbtdId,
      personaId,
      privacySlotId: candidate.privacy_slot_id,
      contentFingerprint: candidate.content_fingerprint,
      atomicLineageFingerprint: candidate.atomic_lineage_fingerprint,
      publicProjectionHash: candidate.public_projection_hash,
      temporalGridId: candidate.temporal_grid_id,
      windowId: candidate.window_id,
      releaseVersion: candidate.release_version,
      hierarchyAxis: candidate.hierarchy_axis,
      sourceMode: candidate.source_mode,
      atomicCellIds: candidate.atomic_cell_ids,
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint:
        hashCanonicalContributionIds(contributionIds),
      canonicalContributionCount: 5,
      canonicalContributionIds: contributionIds,
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    }
  });
  return {
    orgId: scenarioOrgId,
    workflowId,
    jbtdId,
    personaId,
    baseline,
    comparison,
    baselineId,
    comparisonId,
    proof,
    publicDer,
    authorityExpiresAt,
    candidate,
    projection,
    contributionIds
  };
};

const expectMutationRejected = async (table, id) => {
  for (const verb of ["UPDATE", "DELETE"]) {
    let rejected = false;
    try {
      if (verb === "UPDATE") {
        await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "created_at" = "created_at" WHERE "id" = $1::uuid`,
          id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE "id" = $1::uuid`,
          id
        );
      }
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(`append-only guard failed for ${table} ${verb}`);
    }
  }
};

try {
  const authority = await prisma.cohortProducerAuthority.create({
    data: {
      orgId,
      producerKeyId: "producer",
      authorityVersion: 1,
      proofPolicyVersion: "FT_COHORT_EQUALITY_PRIVACY_POLICY_2026_07",
      producerPolicyVersion: "FT_CUSTOMER_BOUNDARY_COHORT_PRODUCER_2026_07",
      publicKeyDerBase64: "MCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
      publicKeyFingerprint: hash("public-key"),
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2027-01-01T00:00:00.000Z")
    }
  });
  const revocation = await prisma.cohortProducerAuthorityRevocation.create({
    data: {
      authorityId: authority.id,
      orgId,
      producerKeyId: "producer",
      authorityVersion: 1,
      revokedAt: new Date("2026-06-01T00:00:00.000Z"),
      reasonCode: "TEST_REVOCATION"
    }
  });
  const reservation = await prisma.aggregatePrivacyReservation.create({
    data: {
      orgId,
      reservationKey: hash("reservation"),
      ownerKind: "OUTCOME_COMPARISON_PROOF",
      ownerReference: "proof-journal",
      ownerContentHash: hash("proof"),
      workflowId: "workflow",
      jbtdId: "jbtd",
      personaId: "persona"
    }
  });
  const journal = await prisma.cohortProofJournal.create({
    data: {
      orgId,
      proofId: "proof",
      proofHash: hash("proof"),
      producerKeyId: "producer",
      authorityVersion: 1,
      workflowId: "workflow",
      jbtdId: "jbtd",
      personaId: "persona",
      outcomeMetric: "metric",
      outcomeUnit: "unit",
      sourceSystem: "source",
      baselinePeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      baselinePeriodEnd: new Date("2026-03-02T00:00:00.000Z"),
      baselineCohortSize: 5,
      baselineEvidenceId: "baseline",
      baselineEvidenceHash: hash("baseline"),
      comparisonPeriodStart: new Date("2026-03-02T00:00:00.000Z"),
      comparisonPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      comparisonCohortSize: 5,
      comparisonEvidenceId: "comparison",
      comparisonEvidenceHash: hash("comparison"),
      evidencePairHash: hash("pair"),
      admissionReceiptHash: hash("admission"),
      reservationKey: hash("reservation"),
      decision: "VERIFIED_PRIVACY_ONLY"
    }
  });
  const manifest = await prisma.aggregatePrivacyManifest.create({
    data: {
      orgId,
      workflowId: "legacy-workflow",
      jbtdId: "jbtd",
      personaId: "persona",
      privacySlotId: "slot",
      contentFingerprint: hash("content"),
      atomicLineageFingerprint: hash("lineage"),
      publicProjectionHash: hash("projection"),
      temporalGridId: "grid",
      windowId: "window",
      releaseVersion: 1,
      hierarchyAxis: "workflow",
      sourceMode: "canonical",
      atomicCellIds: ["cell"],
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint: hash("contributions"),
      canonicalContributionCount: 5,
      canonicalContributionIds: ["one", "two", "three", "four", "five"],
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    }
  });
  const release = await prisma.aggregatePrivacyReleaseJournal.create({
    data: {
      orgId,
      workflowId: "legacy-workflow",
      jbtdId: "jbtd",
      personaId: "persona",
      privacySlotId: "slot",
      privacyDomainFingerprint: hash("domain"),
      contentFingerprint: hash("content"),
      atomicLineageFingerprint: hash("lineage"),
      publicProjectionHash: hash("projection"),
      temporalGridId: "grid",
      windowId: "window",
      releaseVersion: 1,
      canonicalContributionFingerprint: hash("contributions"),
      decision: "RELEASE",
      projectionJson: { status: "released" }
    }
  });
  const contribution = await prisma.aggregatePrivacyContributionClaim.create({
    data: {
      orgId,
      contributionTokenHash: hash("contribution"),
      privacySlotId: "slot"
    }
  });

  for (const [table, id] of [
    ["cohort_producer_authorities", authority.id],
    ["cohort_producer_authority_revocations", revocation.id],
    ["aggregate_privacy_reservations", reservation.id],
    ["cohort_proof_journal", journal.id],
    ["aggregate_privacy_manifests", manifest.id],
    ["aggregate_privacy_release_journal", release.id],
    ["aggregate_privacy_contribution_claims", contribution.id]
  ]) {
    await expectMutationRejected(table, id);
  }

  const raceKey = hash("race");
  const race = await Promise.allSettled(
    ["owner-a", "owner-b"].map((ownerReference) =>
      prisma.aggregatePrivacyReservation.create({
        data: {
          orgId,
          reservationKey: raceKey,
          ownerKind: "OUTCOME_COMPARISON_PROOF",
          ownerReference,
          ownerContentHash: hash(ownerReference),
          workflowId: "race-workflow",
          jbtdId: "jbtd",
          personaId: "persona"
        }
      })
    )
  );
  if (race.filter((result) => result.status === "fulfilled").length !== 1) {
    throw new Error("reservation race did not converge on one owner");
  }

  let constraintRejected = false;
  try {
    await prisma.aggregatePrivacyReservation.create({
      data: {
        orgId,
        reservationKey: hash("invalid-owner"),
        ownerKind: "INVALID_OWNER",
        ownerReference: "invalid",
        ownerContentHash: hash("invalid-content"),
        workflowId: "invalid",
        jbtdId: "invalid",
        personaId: "invalid"
      }
    });
  } catch {
    constraintRejected = true;
  }
  if (!constraintRejected) {
    throw new Error("db-push companion check constraints are missing");
  }

  const c0First = await setupApplicationScenario("c0-first");
  const c0FirstProof = await commitCohortEqualityProof(c0First.proof, prisma);
  const c0FirstSlice = await commitAggregatePrivacyProjection(
    c0First.candidate,
    c0First.projection,
    prisma
  );
  if (
    c0FirstProof.decision !== "VERIFIED_PRIVACY_ONLY" ||
    c0FirstSlice.decision !== "HOLD"
  ) {
    throw new Error("C.0-first application path did not retain one owner");
  }
  const c0FirstHandoff = await prisma.$transaction(
    (transaction) =>
      verifyCohortProofPrivacyHandoff(
        c0First.proof,
        {
          org_id: c0First.orgId,
          workflow_id: c0First.workflowId,
          jbtd_id: c0First.jbtdId,
          persona_id: c0First.personaId
        },
        transaction
      ),
    { isolationLevel: "Serializable" }
  );
  if (
    !c0FirstHandoff ||
    c0FirstHandoff.proof_journal_id !== c0FirstProof.receipt.proof_journal_id
  ) {
    throw new Error("same-transaction C.1 handoff did not replay C.0");
  }
  const reusedKey = await registerCohortProducerAuthority(
    {
      org_id: `${c0First.orgId}-other`,
      producer_key_id: "producer_primary",
      authority_version: 1,
      public_key_der_base64: c0First.publicDer.toString("base64"),
      valid_from: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 60 * 60_000).toISOString()
    },
    prisma
  );
  if (reusedKey !== null) {
    throw new Error("cross-organization public-key reuse was accepted");
  }

  const sliceFirst = await setupApplicationScenario("slice-first");
  const missingHandoff = await prisma.$transaction(
    (transaction) =>
      verifyCohortProofPrivacyHandoff(
        sliceFirst.proof,
        {
          org_id: sliceFirst.orgId,
          workflow_id: sliceFirst.workflowId,
          jbtd_id: sliceFirst.jbtdId,
          persona_id: sliceFirst.personaId
        },
        transaction
      ),
    { isolationLevel: "Serializable" }
  );
  if (
    missingHandoff !== null ||
    await prisma.aggregatePrivacyReservation.count({
      where: { orgId: sliceFirst.orgId }
    }) !== 0 ||
    await prisma.cohortProofJournal.count({
      where: { orgId: sliceFirst.orgId }
    }) !== 0
  ) {
    throw new Error("missing C.0 handoff minted state");
  }
  const sliceFirstRelease = await commitAggregatePrivacyProjection(
    sliceFirst.candidate,
    sliceFirst.projection,
    prisma
  );
  const sliceFirstProof = await commitCohortEqualityProof(
    sliceFirst.proof,
    prisma
  );
  if (
    sliceFirstRelease.decision !== "RELEASE" ||
    sliceFirstProof.decision !== "HOLD"
  ) {
    throw new Error("Slice C-first application path did not retain one owner");
  }

  const concurrent = await setupApplicationScenario("concurrent");
  const [concurrentProof, concurrentSlice] = await Promise.all([
    commitCohortEqualityProof(concurrent.proof, prisma),
    commitAggregatePrivacyProjection(
      concurrent.candidate,
      concurrent.projection,
      prisma
    )
  ]);
  const concurrentWinners = [
    concurrentProof.decision === "VERIFIED_PRIVACY_ONLY",
    concurrentSlice.decision === "RELEASE"
  ].filter(Boolean).length;
  const concurrentReservations =
    await prisma.aggregatePrivacyReservation.count({
      where: { orgId: concurrent.orgId }
    });
  const concurrentProofJournals = await prisma.cohortProofJournal.count({
    where: { orgId: concurrent.orgId }
  });
  const concurrentSliceJournals =
    await prisma.aggregatePrivacyReleaseJournal.count({
      where: { orgId: concurrent.orgId }
    });
  if (
    concurrentWinners !== 1 ||
    concurrentReservations !== 1 ||
    concurrentProofJournals + concurrentSliceJournals !== 1
  ) {
    throw new Error("concurrent C.0/Slice C application paths left orphan state");
  }

  const evidenceRace = await setupApplicationScenario("evidence-race");
  const extraEvidenceId = crypto.randomUUID();
  const [evidenceRaceProof] = await Promise.all([
    commitCohortEqualityProof(evidenceRace.proof, prisma),
    persistOutcomeEvidence(
      evidenceRace.orgId,
      {
        ...evidenceRace.baseline,
        aggregate_value: 99
      },
      extraEvidenceId,
      "2026-05-02T00:01:00.000Z",
      undefined
    )
  ]);
  const evidenceRaceJournalCount = await prisma.cohortProofJournal.count({
    where: { orgId: evidenceRace.orgId }
  });
  if (
    evidenceRaceJournalCount !==
    (evidenceRaceProof.decision === "VERIFIED_PRIVACY_ONLY" ? 1 : 0)
  ) {
    throw new Error("evidence/proof race retained partial proof state");
  }
  const evidenceRaceReplay = await commitCohortEqualityProof(
    evidenceRace.proof,
    prisma
  );
  if (evidenceRaceReplay.decision !== "HOLD") {
    throw new Error("proof replay ignored a later conflicting evidence row");
  }

  const revocationRace = await setupApplicationScenario("revocation-race");
  const [revocationRaceProof, revocationResult] = await Promise.all([
    commitCohortEqualityProof(revocationRace.proof, prisma),
    revokeCohortProducerAuthority(
      {
        org_id: revocationRace.orgId,
        producer_key_id: "producer_primary",
        authority_version: 1,
        reason_code: "CI_RACE"
      },
      prisma
    )
  ]);
  if (!revocationResult) {
    throw new Error("authority revocation race did not retain revocation");
  }
  const revocationJournalCount = await prisma.cohortProofJournal.count({
    where: { orgId: revocationRace.orgId }
  });
  if (
    revocationJournalCount !==
    (revocationRaceProof.decision === "VERIFIED_PRIVACY_ONLY" ? 1 : 0)
  ) {
    throw new Error("revocation/proof race retained partial proof state");
  }
  const revokedReplay = await commitCohortEqualityProof(
    revocationRace.proof,
    prisma
  );
  if (revokedReplay.decision !== "HOLD") {
    throw new Error("revoked proof replay did not hold");
  }
  const revokedHandoff = await prisma.$transaction(
    (transaction) =>
      verifyCohortProofPrivacyHandoff(
        revocationRace.proof,
        {
          org_id: revocationRace.orgId,
          workflow_id: revocationRace.workflowId,
          jbtd_id: revocationRace.jbtdId,
          persona_id: revocationRace.personaId
        },
        transaction
      ),
    { isolationLevel: "Serializable" }
  );
  if (revokedHandoff !== null) {
    throw new Error("revoked C.1 handoff did not hold");
  }

  const rotationRace = await setupApplicationScenario("rotation-race");
  const nextKeys = crypto.generateKeyPairSync("ed25519");
  const nextPublicDer = nextKeys.publicKey.export({
    format: "der",
    type: "spki"
  });
  if (!Buffer.isBuffer(nextPublicDer)) {
    throw new Error("rotation public key export failed");
  }
  const [rotationRaceProof, rotationResult] = await Promise.all([
    commitCohortEqualityProof(rotationRace.proof, prisma),
    registerCohortProducerAuthority(
      {
        org_id: rotationRace.orgId,
        producer_key_id: "producer_primary",
        authority_version: 2,
        public_key_der_base64: nextPublicDer.toString("base64"),
        valid_from: rotationRace.authorityExpiresAt,
        expires_at: new Date(
          Date.parse(rotationRace.authorityExpiresAt) + 60 * 60_000
        ).toISOString()
      },
      prisma
    )
  ]);
  if (
    rotationRaceProof.decision !== "VERIFIED_PRIVACY_ONLY" ||
    !rotationResult
  ) {
    throw new Error("scheduled rotation/proof race did not preserve current epoch");
  }

  const legacy = await setupApplicationScenario("legacy");
  const legacyDomainFingerprint = hashPrivacyDomainFingerprint({
    org_id: legacy.orgId,
    workflow_id: legacy.workflowId,
    jbtd_id: legacy.jbtdId,
    persona_id: legacy.personaId
  });
  await prisma.aggregatePrivacyReleaseJournal.create({
    data: {
      orgId: legacy.orgId,
      workflowId: legacy.workflowId,
      jbtdId: legacy.jbtdId,
      personaId: legacy.personaId,
      privacySlotId: legacy.candidate.privacy_slot_id,
      privacyDomainFingerprint: legacyDomainFingerprint,
      contentFingerprint: legacy.candidate.content_fingerprint,
      atomicLineageFingerprint: legacy.candidate.atomic_lineage_fingerprint,
      publicProjectionHash: legacy.candidate.public_projection_hash,
      temporalGridId: legacy.candidate.temporal_grid_id,
      windowId: legacy.candidate.window_id,
      releaseVersion: legacy.candidate.release_version,
      canonicalContributionFingerprint:
        hashCanonicalContributionIds(legacy.contributionIds),
      decision: "RELEASE",
      projectionJson: legacy.projection
    }
  });
  const legacyProof = await commitCohortEqualityProof(legacy.proof, prisma);
  const legacyAdoption = await commitAggregatePrivacyProjection(
    legacy.candidate,
    legacy.projection,
    prisma
  );
  if (
    legacyProof.decision !== "HOLD" ||
    legacyAdoption.decision !== "RELEASE" ||
    await prisma.aggregatePrivacyReservation.count({
      where: {
        orgId: legacy.orgId,
        ownerKind: "SLICE_C_FIXED_WINDOW"
      }
    }) !== 1
  ) {
    throw new Error("legacy Slice C adoption boundary failed");
  }

  const collision = await setupApplicationScenario("collision");
  await prisma.aggregatePrivacyReservation.create({
    data: {
      orgId: collision.orgId,
      reservationKey: hashSharedPrivacyReservationKey({
        org_id: collision.orgId,
        workflow_id: collision.workflowId,
        jbtd_id: collision.jbtdId,
        persona_id: collision.personaId
      }),
      ownerKind: "OUTCOME_COMPARISON_PROOF",
      ownerReference: "collision-owner",
      ownerContentHash: hash("collision-owner"),
      workflowId: "collision-workflow",
      jbtdId: collision.jbtdId,
      personaId: collision.personaId
    }
  });
  const collisionProof = await commitCohortEqualityProof(
    collision.proof,
    prisma
  );
  if (
    collisionProof.decision !== "HOLD" ||
    await prisma.cohortProofJournal.count({
      where: { orgId: collision.orgId }
    }) !== 0
  ) {
    throw new Error("reservation collision tuple did not hold atomically");
  }

  const uniqueFailure = await setupApplicationScenario("unique-failure");
  await prisma.cohortProofJournal.create({
    data: {
      orgId: uniqueFailure.orgId,
      proofId: "decoy_unique_failure",
      proofHash: hash("decoy-proof"),
      producerKeyId: "producer_primary",
      authorityVersion: 1,
      workflowId: uniqueFailure.workflowId,
      jbtdId: uniqueFailure.jbtdId,
      personaId: uniqueFailure.personaId,
      outcomeMetric: uniqueFailure.proof.outcome_metric,
      outcomeUnit: uniqueFailure.proof.outcome_unit,
      sourceSystem: uniqueFailure.proof.source_system,
      baselinePeriodStart: new Date(
        uniqueFailure.proof.baseline_window.period_start
      ),
      baselinePeriodEnd: new Date(
        uniqueFailure.proof.baseline_window.period_end
      ),
      baselineCohortSize: uniqueFailure.proof.baseline_window.cohort_size,
      baselineEvidenceId: uniqueFailure.baselineId,
      baselineEvidenceHash:
        uniqueFailure.proof.baseline_window.evidence_content_hash,
      comparisonPeriodStart: new Date(
        uniqueFailure.proof.comparison_window.period_start
      ),
      comparisonPeriodEnd: new Date(
        uniqueFailure.proof.comparison_window.period_end
      ),
      comparisonCohortSize:
        uniqueFailure.proof.comparison_window.cohort_size,
      comparisonEvidenceId: uniqueFailure.comparisonId,
      comparisonEvidenceHash:
        uniqueFailure.proof.comparison_window.evidence_content_hash,
      evidencePairHash: hash("decoy-pair"),
      admissionReceiptHash: uniqueFailure.proof.admission_receipt_hash,
      reservationKey: hash("decoy-reservation"),
      decision: "VERIFIED_PRIVACY_ONLY"
    }
  });
  const uniqueFailureProof = await commitCohortEqualityProof(
    uniqueFailure.proof,
    prisma
  );
  if (
    uniqueFailureProof.decision !== "HOLD" ||
    await prisma.aggregatePrivacyReservation.count({
      where: { orgId: uniqueFailure.orgId }
    }) !== 0 ||
    await prisma.cohortProofJournal.count({
      where: { orgId: uniqueFailure.orgId }
    }) !== 1
  ) {
    throw new Error("repository unique failure left an orphan reservation");
  }

  const rollbackKey = hash("rollback");
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.aggregatePrivacyReservation.create({
        data: {
          orgId,
          reservationKey: rollbackKey,
          ownerKind: "OUTCOME_COMPARISON_PROOF",
          ownerReference: "rollback",
          ownerContentHash: hash("rollback-owner"),
          workflowId: "rollback-workflow",
          jbtdId: "jbtd",
          personaId: "persona"
        }
      });
      throw new Error("intentional rollback");
    });
  } catch {
    // Expected.
  }
  if (
    await prisma.aggregatePrivacyReservation.findUnique({
      where: {
        aggregate_privacy_reservation_key: {
          orgId,
          reservationKey: rollbackKey
        }
      }
    })
  ) {
    throw new Error("rolled-back reservation remained durable");
  }

  await prisma.$disconnect();
  const fresh = new PrismaClient();
  const durableWinner = await fresh.aggregatePrivacyReservation.findUnique({
    where: {
      aggregate_privacy_reservation_key: {
        orgId,
        reservationKey: raceKey
      }
    }
  });
  if (!durableWinner) {
    throw new Error("fresh client could not read reservation winner");
  }

  const readFreshScenarioState = async (scenario) => ({
    reservations: await fresh.aggregatePrivacyReservation.count({
      where: { orgId: scenario.orgId }
    }),
    proofs: await fresh.cohortProofJournal.count({
      where: { orgId: scenario.orgId }
    }),
    releases: await fresh.aggregatePrivacyReleaseJournal.count({
      where: { orgId: scenario.orgId }
    }),
    contributions: await fresh.aggregatePrivacyContributionClaim.count({
      where: { orgId: scenario.orgId }
    })
  });
  const expectedFreshStates = [
    [c0First, { reservations: 1, proofs: 1, releases: 0, contributions: 0 }],
    [sliceFirst, { reservations: 1, proofs: 0, releases: 1, contributions: 5 }],
    [
      concurrent,
      {
        reservations: 1,
        proofs: concurrentProofJournals,
        releases: concurrentSliceJournals,
        contributions: concurrentSliceJournals === 1 ? 5 : 0
      }
    ],
    [
      evidenceRace,
      {
        reservations: evidenceRaceJournalCount,
        proofs: evidenceRaceJournalCount,
        releases: 0,
        contributions: 0
      }
    ],
    [
      revocationRace,
      {
        reservations: revocationJournalCount,
        proofs: revocationJournalCount,
        releases: 0,
        contributions: 0
      }
    ],
    [
      rotationRace,
      { reservations: 1, proofs: 1, releases: 0, contributions: 0 }
    ],
    [legacy, { reservations: 1, proofs: 0, releases: 1, contributions: 5 }],
    [collision, { reservations: 1, proofs: 0, releases: 0, contributions: 0 }],
    [uniqueFailure, { reservations: 0, proofs: 1, releases: 0, contributions: 0 }]
  ];
  for (const [scenario, expectedState] of expectedFreshStates) {
    const actualState = await readFreshScenarioState(scenario);
    if (JSON.stringify(actualState) !== JSON.stringify(expectedState)) {
      throw new Error(
        `fresh client state mismatch for ${scenario.orgId}: ` +
          `${JSON.stringify(actualState)} !== ${JSON.stringify(expectedState)}`
      );
    }
  }
  await fresh.$disconnect();
  process.stdout.write("cohort proof postgres guards: PASS\n");
} finally {
  await prisma.$disconnect().catch(() => undefined);
  await disconnectPrisma().catch(() => undefined);
}
