import crypto from "node:crypto";

import {
  COHORT_PRODUCER_POLICY_VERSION,
  COHORT_PROOF_POLICY_VERSION,
  COHORT_PROOF_SCHEMA_VERSION,
  cohortPublicKeyFingerprintBytes,
  cohortReservationBytes,
  outcomeEvidenceAdmissionReceiptBytes,
  outcomeEvidenceContentBytes,
  unsignedCohortProofBytes,
  type CohortEqualityProof
} from "@fluencytracr/shared";

import {
  commitCohortEqualityProof,
  verifyCohortProofPrivacyHandoff
} from "../src/repositories/cohort-proof.repository";
import { exactOutcomeEvidenceSliceSegment } from "../src/outcome_evidence_admission_authority";

const sha256 = (value: crypto.BinaryLike): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const orgId = "org_alpha";
const workflowId = "workflow:renewal";
const jbtdId = "renewal";
const personaId = "account_exec";
const baseline = {
  org_id: orgId,
  evidence_id: "evidence_baseline",
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
  source_attestation: { approved: true },
  ingested_at: "2026-03-03T00:00:00.000Z"
};
const comparison = {
  ...baseline,
  evidence_id: "evidence_comparison",
  period_start: "2026-03-02T00:00:00.000Z",
  period_end: "2026-05-01T00:00:00.000Z",
  aggregate_value: 10.25,
  ingested_at: "2026-05-02T00:00:00.000Z"
};
const receipt = {
  policy_version: "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07" as const,
  workflow_id: workflowId,
  jbtd_id: jbtdId,
  persona_id: personaId,
  baseline_window: {
    period_start: baseline.period_start,
    period_end: baseline.period_end,
    evidence_ids: [baseline.evidence_id]
  },
  comparison_window: {
    period_start: comparison.period_start,
    period_end: comparison.period_end,
    evidence_ids: [comparison.evidence_id]
  }
};

const databaseEvidence = (record: typeof baseline) => ({
  evidenceId: record.evidence_id,
  orgId: record.org_id,
  workflowId: record.workflow_id,
  outcomeMetric: record.outcome_metric,
  outcomeUnit: record.outcome_unit,
  periodStart: new Date(record.period_start),
  periodEnd: new Date(record.period_end),
  aggregateValue: record.aggregate_value,
  cohortSize: record.cohort_size,
  sourceSystem: record.source_system,
  jbtdId: record.jbtd_id,
  personaId: record.persona_id,
  aggregateKind: record.aggregate_kind,
  sourceAttestation: record.source_attestation,
  ingestedAt: new Date(record.ingested_at)
});

const buildFixture = () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  if (!Buffer.isBuffer(publicDer)) throw new Error("test key export failed");
  const fingerprint = sha256(cohortPublicKeyFingerprintBytes(publicDer));
  const reservationKey = sha256(
    cohortReservationBytes({
      org_id: orgId,
      workflow_id: workflowId,
      jbtd_id: jbtdId,
      persona_id: personaId
    })
  );
  const unsigned = {
    schema_version: COHORT_PROOF_SCHEMA_VERSION,
    proof_policy_version: COHORT_PROOF_POLICY_VERSION,
    producer_policy_version: COHORT_PRODUCER_POLICY_VERSION,
    proof_id: "proof_alpha",
    org_id: orgId,
    producer_key_id: "producer_primary",
    authority_version: 1,
    issued_at: "2026-05-02T01:00:00.000Z",
    expires_at: "2026-05-02T01:15:00.000Z",
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    outcome_metric: baseline.outcome_metric,
    outcome_unit: baseline.outcome_unit,
    source_system: baseline.source_system,
    baseline_window: {
      period_start: baseline.period_start,
      period_end: baseline.period_end,
      cohort_size: baseline.cohort_size,
      evidence_content_hash: sha256(outcomeEvidenceContentBytes(baseline))
    },
    comparison_window: {
      period_start: comparison.period_start,
      period_end: comparison.period_end,
      cohort_size: comparison.cohort_size,
      evidence_content_hash: sha256(outcomeEvidenceContentBytes(comparison))
    },
    admission_receipt_hash: sha256(
      outcomeEvidenceAdmissionReceiptBytes(receipt)
    ),
    population_commitment: "11".repeat(32),
    reservation_key: reservationKey
  };
  const proof: CohortEqualityProof = {
    ...unsigned,
    signature: crypto
      .sign(null, unsignedCohortProofBytes(unsigned), privateKey)
      .toString("base64url")
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
  const timestamps = {
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:30:00.000Z")
  };
  const exportRow = {
    id: "11111111-1111-4111-8111-111111111111",
    orgId,
    objectType: "outcome_evidence_export",
    objectId: exportId,
    schemaVersion: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
    workflowFamily: workflowId,
    payloadJson: {
      schema_version: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
      export_id: exportId,
      org_id: orgId,
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
      admission: receipt,
      metrics: [
        {
          metric_id: baseline.outcome_metric,
          measurement_unit: baseline.outcome_unit,
          baseline_value: baseline.aggregate_value,
          comparison_value: comparison.aggregate_value,
          eligible_population: 5
        }
      ],
      review: {
        review_state: "ACCEPTED",
        reviewer_role: "ADMIN",
        reviewed_at: "2026-05-02T00:30:00.000Z"
      }
    },
    validationJson: {
      admission_authoritative: true,
      admission_receipt: receipt
    },
    valid: true,
    ...timestamps
  };
  const readinessRow = {
    id: "22222222-2222-4222-8222-222222222222",
    orgId,
    objectType: "evidence_readiness",
    objectId: readinessId,
    schemaVersion: "test",
    workflowFamily: workflowId,
    payloadJson: {
      source_refs: { outcome_evidence_export_id: exportId },
      workflow_family: workflowId
    },
    validationJson: {
      outcome_evidence_admission_authoritative: true,
      outcome_evidence_admission_receipt: receipt,
      outcome_evidence_export_id: exportId
    },
    valid: true,
    ...timestamps
  };

  let reservation: any = null;
  let journal: any = null;
  let legacy: any = null;
  let revoked = false;
  let decisionTime = new Date("2026-05-02T01:05:00.000Z");
  let publicKeyDerBase64 = publicDer.toString("base64");
  let publicKeyFingerprint = fingerprint;
  let authorityVersion = 1;
  let authorityAvailable = true;
  let evidenceRows = [
    databaseEvidence(baseline),
    databaseEvidence(comparison)
  ];
  const createdPayloads: unknown[] = [];
  let queryIndex = 0;
  const transaction = {
    $executeRaw: async () => 0,
    $queryRaw: async () => {
      queryIndex += 1;
      if (queryIndex === 1) {
        return authorityAvailable
          ? [{ id: "33333333-3333-4333-8333-333333333333" }]
          : [];
      }
      if (queryIndex === 2) {
        return [{ decision_time: decisionTime }];
      }
      return [{ id: exportRow.id }, { id: readinessRow.id }];
    },
    cohortProducerAuthority: {
      findMany: async () => [{
        id: "33333333-3333-4333-8333-333333333333",
        orgId,
        producerKeyId: proof.producer_key_id,
        authorityVersion,
        proofPolicyVersion: COHORT_PROOF_POLICY_VERSION,
        producerPolicyVersion: COHORT_PRODUCER_POLICY_VERSION,
        publicKeyDerBase64,
        publicKeyFingerprint,
        validFrom: new Date("2026-05-01T00:00:00.000Z"),
        expiresAt: new Date("2026-05-03T00:00:00.000Z"),
        revocation: revoked ? { id: "revoked" } : null
      }]
    },
    aiValueObject: {
      findMany: async () => [exportRow, readinessRow]
    },
    v1OutcomeEvidence: {
      findMany: async () => evidenceRows
    },
    aggregatePrivacyReleaseJournal: {
      findFirst: async () => legacy
    },
    cohortProofJournal: {
      findUnique: async () => journal,
      create: async ({ data }: any) => {
        journal = { ...data };
        createdPayloads.push(data);
        return journal;
      }
    },
    aggregatePrivacyReservation: {
      findUnique: async () => reservation,
      create: async ({ data }: any) => {
        reservation = { ...data };
        createdPayloads.push(data);
        return reservation;
      }
    }
  };
  const client = {
    $transaction: jest.fn(async (operation: (tx: any) => Promise<unknown>) => {
      queryIndex = 0;
      return operation(transaction);
    })
  };
  return {
    proof,
    resign: (
      overrides: Partial<Omit<CohortEqualityProof, "signature">>
    ): CohortEqualityProof => {
      const { signature: _signature, ...currentUnsigned } = proof;
      const nextUnsigned = { ...currentUnsigned, ...overrides };
      return {
        ...nextUnsigned,
        signature: crypto
          .sign(null, unsignedCohortProofBytes(nextUnsigned), privateKey)
          .toString("base64url")
      };
    },
    client,
    transaction,
    createdPayloads,
    setLegacy: (value: unknown) => {
      legacy = value;
    },
    setRevoked: (value: boolean) => {
      revoked = value;
    },
    setDecisionTime: (value: Date) => {
      decisionTime = value;
    },
    setPublicKeyDerBase64: (value: string) => {
      publicKeyDerBase64 = value;
    },
    setPublicKeyFingerprint: (value: string) => {
      publicKeyFingerprint = value;
    },
    setAuthorityVersion: (value: number) => {
      authorityVersion = value;
    },
    setAuthorityAvailable: (value: boolean) => {
      authorityAvailable = value;
    },
    setEvidenceRows: (value: typeof evidenceRows) => {
      evidenceRows = value;
    },
    mutateJournal: (value: Record<string, unknown>) => {
      journal = journal ? { ...journal, ...value } : value;
    },
    mutateReservation: (value: Record<string, unknown>) => {
      reservation = reservation ? { ...reservation, ...value } : value;
    },
    resetQuery: () => {
      queryIndex = 0;
    }
  };
};

describe("C.0 cohort proof repository", () => {
  it("commits one privacy-only journal and replays it byte-stably", async () => {
    const fixture = buildFixture();
    const first = await commitCohortEqualityProof(
      fixture.proof,
      fixture.client as never
    );
    const second = await commitCohortEqualityProof(
      fixture.proof,
      fixture.client as never
    );

    expect(first).toEqual(second);
    expect(fixture.client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "ReadCommitted" }
    );
    expect(first.decision).toBe("VERIFIED_PRIVACY_ONLY");
    expect(first.receipt).toEqual(
      expect.objectContaining({
        comparison_privacy_only: true,
        claim_authority_effect: "NONE",
        claim_authorized: false,
        model_authorized: false,
        customer_publishable: false
      })
    );
    const persisted = JSON.stringify(fixture.createdPayloads);
    expect(persisted).not.toContain(fixture.proof.population_commitment);
    expect(persisted).not.toContain(fixture.proof.signature);
  });

  it("holds legacy Slice C ownership without creating C.0 state", async () => {
    const fixture = buildFixture();
    fixture.setLegacy({ id: "legacy-slice-c" });
    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("uses one fixed hold result for revoked, malformed, and changed proofs", async () => {
    const revoked = buildFixture();
    revoked.setRevoked(true);
    const revokedResult = await commitCohortEqualityProof(
      revoked.proof,
      revoked.client as never
    );
    const malformedResult = await commitCohortEqualityProof(
      { ...revoked.proof, signature: "bad" },
      revoked.client as never
    );
    const changedResult = await commitCohortEqualityProof(
      { ...revoked.proof, outcome_unit: "hours" },
      revoked.client as never
    );
    expect(revokedResult).toEqual({ decision: "HOLD", receipt: null });
    expect(malformedResult).toEqual(revokedResult);
    expect(changedResult).toEqual(revokedResult);
  });

  it("holds at the exact proof expiry boundary", async () => {
    const fixture = buildFixture();
    fixture.setDecisionTime(new Date(fixture.proof.expires_at));

    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("holds a proof from an epoch superseded by the active authority", async () => {
    const fixture = buildFixture();
    fixture.setAuthorityVersion(2);

    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("holds when no producer authority epoch exists", async () => {
    const fixture = buildFixture();
    fixture.setAuthorityAvailable(false);

    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("holds a malformed authority key without exposing the failure", async () => {
    const fixture = buildFixture();
    fixture.setPublicKeyDerBase64(Buffer.from("not-a-der-key").toString("base64"));

    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("holds fingerprint substitution, future issuance, and overlong proofs", async () => {
    const fingerprint = buildFixture();
    fingerprint.setPublicKeyFingerprint("22".repeat(32));
    await expect(
      commitCohortEqualityProof(fingerprint.proof, fingerprint.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });

    const future = buildFixture();
    const futureProof = future.resign({
      issued_at: "2026-05-02T01:10:00.000Z",
      expires_at: "2026-05-02T01:15:00.000Z"
    });
    await expect(
      commitCohortEqualityProof(futureProof, future.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });

    const overlong = buildFixture();
    const overlongProof = overlong.resign({
      expires_at: "2026-05-02T01:16:00.000Z"
    });
    await expect(
      commitCohortEqualityProof(overlongProof, overlong.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
  });

  it("holds signed cross-organization, cross-slice, and evidence substitutions", async () => {
    const crossOrg = buildFixture();
    await expect(
      commitCohortEqualityProof(
        crossOrg.resign({ org_id: "org_other" }),
        crossOrg.client as never
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null });

    const crossSlice = buildFixture();
    await expect(
      commitCohortEqualityProof(
        crossSlice.resign({ persona_id: "other_persona" }),
        crossSlice.client as never
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null });

    const evidenceMismatch = buildFixture();
    await expect(
      commitCohortEqualityProof(
        evidenceMismatch.resign({
          baseline_window: {
            ...evidenceMismatch.proof.baseline_window,
            evidence_content_hash: "22".repeat(32)
          }
        }),
        evidenceMismatch.client as never
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
  });

  it("holds when the exact windows contain more than one metric pair", async () => {
    const fixture = buildFixture();
    fixture.setEvidenceRows([
      databaseEvidence(baseline),
      databaseEvidence(comparison),
      databaseEvidence({
        ...baseline,
        evidence_id: "evidence_baseline_extra",
        outcome_metric: "quality_rate"
      }),
      databaseEvidence({
        ...comparison,
        evidence_id: "evidence_comparison_extra",
        outcome_metric: "quality_rate"
      })
    ]);

    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("revalidates the current proof and full typed tuple for C.1 handoff", async () => {
    const fixture = buildFixture();
    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual(
      expect.objectContaining({ decision: "VERIFIED_PRIVACY_ONLY" })
    );
    fixture.resetQuery();
    let acquiredLocks = 0;
    fixture.transaction.$executeRaw = async () => {
      acquiredLocks += 1;
      return 0;
    };
    const findJournal = fixture.transaction.cohortProofJournal.findUnique;
    fixture.transaction.cohortProofJournal.findUnique = async (query: any) => {
      if (acquiredLocks < 2) {
        throw new Error("handoff read occurred before required locks");
      }
      return findJournal(query);
    };
    const handoff = await verifyCohortProofPrivacyHandoff(
      fixture.proof,
      {
        org_id: orgId,
        workflow_id: workflowId,
        jbtd_id: jbtdId,
        persona_id: personaId
      },
      fixture.transaction as never
    );
    expect(handoff).toEqual(
      expect.objectContaining({
        owner_kind: "OUTCOME_COMPARISON_PROOF",
        org_id: orgId,
        workflow_id: workflowId,
        baseline_window: expect.objectContaining({
          period_start: baseline.period_start,
          period_end: baseline.period_end,
          cohort_size: baseline.cohort_size,
          evidence_id: baseline.evidence_id
        }),
        comparison_window: expect.objectContaining({
          period_start: comparison.period_start,
          period_end: comparison.period_end,
          cohort_size: comparison.cohort_size,
          evidence_id: comparison.evidence_id
        })
      })
    );

    await expect(
      verifyCohortProofPrivacyHandoff(
        fixture.proof,
        {
          org_id: "org_other",
          workflow_id: workflowId,
          jbtd_id: jbtdId,
          persona_id: personaId
        },
        fixture.transaction as never
      )
    ).resolves.toBeNull();

    fixture.setRevoked(true);
    fixture.resetQuery();
    await expect(
      verifyCohortProofPrivacyHandoff(
        fixture.proof,
        {
          org_id: orgId,
          workflow_id: workflowId,
          jbtd_id: jbtdId,
          persona_id: personaId
        },
        fixture.transaction as never
      )
    ).resolves.toBeNull();
  });

  it("does not let the C.1 handoff mint a missing C.0 owner", async () => {
    const fixture = buildFixture();
    await expect(
      verifyCohortProofPrivacyHandoff(
        fixture.proof,
        {
          org_id: orgId,
          workflow_id: workflowId,
          jbtd_id: jbtdId,
          persona_id: personaId
        },
        fixture.transaction as never
      )
    ).resolves.toBeNull();
    expect(fixture.createdPayloads).toEqual([]);
  });

  it("holds a hash-equal replay when a stored typed tuple differs", async () => {
    const fixture = buildFixture();
    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual(
      expect.objectContaining({ decision: "VERIFIED_PRIVACY_ONLY" })
    );
    fixture.mutateJournal({
      baselinePeriodStart: new Date("2025-12-31T00:00:00.000Z")
    });

    await expect(
      commitCohortEqualityProof(fixture.proof, fixture.client as never)
    ).resolves.toEqual({ decision: "HOLD", receipt: null });

    const reservationCollision = buildFixture();
    await commitCohortEqualityProof(
      reservationCollision.proof,
      reservationCollision.client as never
    );
    reservationCollision.mutateReservation({
      workflowId: "workflow:collision"
    });
    await expect(
      commitCohortEqualityProof(
        reservationCollision.proof,
        reservationCollision.client as never
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null });
  });
});
