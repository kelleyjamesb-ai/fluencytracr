import crypto from "node:crypto";

import {
  OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION,
  outcomeComparisonContentCommitmentBytes,
  outcomeComparisonProjectionBytes,
  outcomeEvidenceContentBytes,
  type ExactCohortSlice
} from "@fluencytracr/shared";

import { verifyCohortProofPrivacyHandoff } from "../src/repositories/cohort-proof.repository";
import { acquireCohortProducerAuthorityLock } from "../src/repositories/cohort-producer-authority.repository";
import { acquireOutcomeEvidenceFamilyLock } from "../src/repositories/outcome-evidence.repository";
import {
  commitOutcomeComparisonPrivacyRelease,
  readOutcomeComparisonPrivacyRelease
} from "../src/repositories/outcome-comparison-privacy.repository";
import * as comparisonPrivacyRepository from "../src/repositories/outcome-comparison-privacy.repository";
import { getOutcomeComparisonRuntimePrisma } from "../src/outcome-comparison-runtime-client";

jest.mock("../src/repositories/cohort-proof.repository", () => ({
  verifyCohortProofPrivacyHandoff: jest.fn()
}));
jest.mock("../src/repositories/cohort-producer-authority.repository", () => ({
  acquireCohortProducerAuthorityLock: jest.fn()
}));
jest.mock("../src/repositories/outcome-evidence.repository", () => {
  const actual = jest.requireActual(
    "../src/repositories/outcome-evidence.repository"
  );
  return {
    ...actual,
    acquireOutcomeEvidenceFamilyLock: jest.fn()
  };
});
jest.mock("../src/outcome-comparison-runtime-client", () => ({
  getOutcomeComparisonRuntimePrisma: jest.fn()
}));

const mockedHandoff = jest.mocked(verifyCohortProofPrivacyHandoff);
const mockedFamilyLock = jest.mocked(acquireOutcomeEvidenceFamilyLock);
const mockedProducerLock = jest.mocked(acquireCohortProducerAuthorityLock);
const mockedRuntimePrisma = jest.mocked(getOutcomeComparisonRuntimePrisma);

const sha256 = (value: crypto.BinaryLike): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const exactSlice: ExactCohortSlice = {
  org_id: "org_alpha",
  workflow_id: "workflow:renewal",
  jbtd_id: "renewal",
  persona_id: "account_exec"
};

const baseline = {
  org_id: exactSlice.org_id,
  evidence_id: "evidence_baseline",
  workflow_id: exactSlice.workflow_id,
  outcome_metric: "cycle_time",
  outcome_unit: "days",
  period_start: "2026-01-01T00:00:00.000Z",
  period_end: "2026-03-02T00:00:00.000Z",
  aggregate_value: 12.5,
  cohort_size: 5,
  source_system: "customer_crm",
  jbtd_id: exactSlice.jbtd_id,
  persona_id: exactSlice.persona_id,
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

const proofJournalId = "11111111-1111-4111-8111-111111111111";
const proofHash = "11".repeat(32);
const admissionReceiptHash = "22".repeat(32);
const reservationKey = "33".repeat(32);
const baselineHash = sha256(outcomeEvidenceContentBytes(baseline));
const comparisonHash = sha256(outcomeEvidenceContentBytes(comparison));

const handoff = {
  proof_journal_id: proofJournalId,
  proof_hash: proofHash,
  reservation_key: reservationKey,
  owner_kind: "OUTCOME_COMPARISON_PROOF" as const,
  ...exactSlice,
  outcome_metric: baseline.outcome_metric,
  outcome_unit: baseline.outcome_unit,
  source_system: baseline.source_system,
  baseline_window: {
    period_start: baseline.period_start,
    period_end: baseline.period_end,
    cohort_size: baseline.cohort_size,
    evidence_id: baseline.evidence_id,
    evidence_content_hash: baselineHash
  },
  comparison_window: {
    period_start: comparison.period_start,
    period_end: comparison.period_end,
    cohort_size: comparison.cohort_size,
    evidence_id: comparison.evidence_id,
    evidence_content_hash: comparisonHash
  },
  admission_receipt_hash: admissionReceiptHash
};

const journal = {
  id: proofJournalId,
  orgId: exactSlice.org_id,
  proofHash,
  producerKeyId: "producer_primary",
  authorityVersion: 1,
  workflowId: exactSlice.workflow_id,
  jbtdId: exactSlice.jbtd_id,
  personaId: exactSlice.persona_id,
  outcomeMetric: baseline.outcome_metric,
  outcomeUnit: baseline.outcome_unit,
  sourceSystem: baseline.source_system,
  baselinePeriodStart: new Date(baseline.period_start),
  baselinePeriodEnd: new Date(baseline.period_end),
  baselineCohortSize: baseline.cohort_size,
  baselineEvidenceId: baseline.evidence_id,
  baselineEvidenceHash: baselineHash,
  comparisonPeriodStart: new Date(comparison.period_start),
  comparisonPeriodEnd: new Date(comparison.period_end),
  comparisonCohortSize: comparison.cohort_size,
  comparisonEvidenceId: comparison.evidence_id,
  comparisonEvidenceHash: comparisonHash,
  evidencePairHash: sha256(
    Buffer.concat([
      Buffer.from("FT_COHORT_EVIDENCE_PAIR_V1\0", "ascii"),
      Buffer.from(baselineHash, "hex"),
      Buffer.from(comparisonHash, "hex")
    ])
  ),
  admissionReceiptHash,
  reservationKey,
  decision: "VERIFIED_PRIVACY_ONLY"
};
const reservation = {
  orgId: exactSlice.org_id,
  reservationKey,
  ownerKind: "OUTCOME_COMPARISON_PROOF",
  ownerReference: proofJournalId,
  ownerContentHash: proofHash,
  workflowId: exactSlice.workflow_id,
  jbtdId: exactSlice.jbtd_id,
  personaId: exactSlice.persona_id
};

const projection = {
  policy_version: OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION,
  ...exactSlice,
  outcome_metric: baseline.outcome_metric,
  outcome_unit: baseline.outcome_unit,
  source_system: baseline.source_system,
  baseline_window: {
    period_start: baseline.period_start,
    period_end: baseline.period_end,
    evidence_id: baseline.evidence_id,
    cohort_size: baseline.cohort_size,
    aggregate_value: baseline.aggregate_value
  },
  comparison_window: {
    period_start: comparison.period_start,
    period_end: comparison.period_end,
    evidence_id: comparison.evidence_id,
    cohort_size: comparison.cohort_size,
    aggregate_value: comparison.aggregate_value
  }
};
const projectionHash = sha256(outcomeComparisonProjectionBytes(projection));
const contentFingerprint = sha256(
  outcomeComparisonContentCommitmentBytes({
    commitment_version: "FT_OUTCOME_COMPARISON_CONTENT_COMMITMENT_V1",
    projection,
    proof_journal_id: proofJournalId,
    proof_hash: proofHash,
    admission_receipt_hash: admissionReceiptHash,
    baseline_evidence_hash: baselineHash,
    comparison_evidence_hash: comparisonHash,
    reservation_key: reservationKey
  })
);
const attestationKeyId = "FT_C1_HMAC_PRIMARY";
const attestationSecret =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

type FixtureOptions = {
  evidenceRows?: unknown[];
  release?: Record<string, unknown> | null;
  revoked?: boolean;
  journal?: Record<string, unknown> | null;
  reservation?: Record<string, unknown> | null;
  authority?: Record<string, unknown> | null;
  discoveryRelease?: Record<string, unknown> | null;
  discoveryJournal?: Record<string, unknown> | null;
  failAt?: string;
  attestationReady?: boolean;
};

const buildFixture = (options: FixtureOptions = {}) => {
  const order: string[] = [];
  let release: any = options.release ?? null;
  const journalRow =
    options.journal === undefined ? journal : options.journal;
  const reservationRow =
    options.reservation === undefined ? reservation : options.reservation;
  const authorityRow =
    options.authority === undefined
      ? {
          id: "33333333-3333-4333-8333-333333333333",
          orgId: exactSlice.org_id,
          producerKeyId: journal.producerKeyId,
          authorityVersion: journal.authorityVersion,
          proofPolicyVersion: "FT_COHORT_EQUALITY_PRIVACY_POLICY_2026_07",
          producerPolicyVersion:
            "FT_CUSTOMER_BOUNDARY_COHORT_PRODUCER_2026_07",
          revocation: options.revoked ? { id: "revoked" } : null
        }
      : options.authority;
  const evidenceRows =
    options.evidenceRows ?? [databaseEvidence(baseline), databaseEvidence(comparison)];
  const maybeFail = (point: string): void => {
    if (options.failAt === point) {
      throw new Error(`fixture failure at ${point}`);
    }
  };

  mockedFamilyLock.mockImplementation(async () => {
    order.push("family-lock");
  });
  mockedProducerLock.mockImplementation(async () => {
    order.push("producer-lock");
  });

  const transaction: any = {
    $executeRaw: jest.fn(async () => {
      order.push("attestation-config");
      maybeFail("attestation-config");
      return 1;
    }),
    $queryRaw: jest.fn(async (query: any) => {
      const sql = Array.isArray(query?.strings)
        ? query.strings.join(" ")
        : String(query);
      if (sql.includes("outcome_comparison_attestation_readiness")) {
        order.push("attestation-readiness");
        maybeFail("attestation-readiness");
        return [
          {
            ok: options.attestationReady !== false,
            diagnostics:
              options.attestationReady === false
                ? ["ACTIVE_KEY_INVALID"]
                : []
          }
        ];
      }
      order.push("attestation-verify");
      maybeFail("attestation-verify");
      return [{ ok: true }];
    }),
    v1OutcomeEvidence: {
      findMany: jest.fn(async () => {
        order.push("evidence-read");
        maybeFail("evidence-read");
        return evidenceRows;
      })
    },
    outcomeComparisonPrivacyRelease: {
      findUnique: jest.fn(async (query: any) => {
        if (query.select) {
          order.push("discovery-release");
          maybeFail("discovery-release");
          const discovered =
            options.discoveryRelease === undefined
              ? release
                ? {
                    orgId: release.orgId,
                    proofJournalId: release.proofJournalId
                  }
                : null
              : options.discoveryRelease;
          return discovered
            ? {
                ...discovered
              }
            : null;
        }
        order.push("release-reload");
        maybeFail("release-read");
        if (!release) return null;
        if (query.where?.id && query.where.id !== release.id) return null;
        return release;
      }),
      create: jest.fn(async ({ data }: any) => {
        order.push("release-create");
        maybeFail("release-create");
        release = {
          ...data,
          id: data.id,
          attestationKeyId,
          creationAttestation: "44".repeat(32),
          createdAt: new Date("2026-05-02T01:05:00.000Z")
        };
        return release;
      })
    },
    cohortProofJournal: {
      findUnique: jest.fn(async (query: any) => {
        if (query.select) {
          order.push("discovery-journal");
          maybeFail("discovery-journal");
          if (options.discoveryJournal !== undefined) {
            return options.discoveryJournal;
          }
          return journalRow
            ? {
                id: journalRow.id,
                orgId: journalRow.orgId,
                producerKeyId: journalRow.producerKeyId,
                authorityVersion: journalRow.authorityVersion
              }
            : null;
        }
        order.push("journal-reload");
        maybeFail("journal-read");
        return journalRow;
      })
    },
    aggregatePrivacyReservation: {
      findUnique: jest.fn(async () => {
        order.push("reservation-reload");
        maybeFail("reservation-read");
        return reservationRow;
      })
    },
    cohortProducerAuthority: {
      findUnique: jest.fn(async () => {
        order.push("authority-reload");
        maybeFail("authority-read");
        return authorityRow;
      })
    }
  };
  const client: any = {
    $transaction: jest.fn(async (operation: any, config: any) => {
      order.push(`transaction:${config?.isolationLevel ?? "missing"}`);
      maybeFail("transaction");
      const before = release;
      try {
        return await operation(transaction);
      } catch (error) {
        release = before;
        throw error;
      }
    })
  };

  return {
    client,
    transaction,
    order,
    getRelease: () => release,
    setRelease: (next: any) => {
      release = next;
    }
  };
};

describe("Outcome comparison privacy repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHandoff.mockResolvedValue(handoff);
    process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID = attestationKeyId;
    process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
      [attestationKeyId]: attestationSecret
    });
  });

  afterEach(() => {
    delete process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID;
    delete process.env.C1_CREATION_ATTESTATION_KEYS_JSON;
    delete process.env.C1_RUNTIME_DATABASE_URL;
  });

  it("uses only the dedicated runtime client on the uninjected production path", async () => {
    const fixture = buildFixture();
    process.env.C1_RUNTIME_DATABASE_URL =
      "postgresql://fluencytracr_c1_runtime:secret@localhost:5432/fluency";
    mockedRuntimePrisma.mockReturnValue(fixture.client);

    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice
      )
    ).resolves.toEqual(
      expect.objectContaining({
        decision: "ATOMIC_COMPARISON_PRIVACY_RELEASED"
      })
    );
    expect(mockedRuntimePrisma).toHaveBeenCalledTimes(1);
    expect(fixture.client.$transaction).toHaveBeenCalledTimes(1);
  });

  it("holds without consulting the general database client when runtime URL is absent", async () => {
    mockedRuntimePrisma.mockReturnValue(null);
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice
      )
    ).resolves.toEqual({
      decision: "HOLD",
      receipt: null,
      projection: null
    });
    expect(mockedRuntimePrisma).not.toHaveBeenCalled();
  });

  it("commits only one server-derived projection after the current C.0 handoff", async () => {
    const fixture = buildFixture();
    const result = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      fixture.client
    );

    expect(result).toEqual({
      decision: "ATOMIC_COMPARISON_PRIVACY_RELEASED",
      receipt: expect.objectContaining({
        release_id: expect.any(String),
        proof_journal_id: proofJournalId,
        reservation_key: reservationKey,
        projection_hash: projectionHash,
        content_fingerprint: contentFingerprint,
        claim_authorized: false
      }),
      projection
    });
    expect(mockedHandoff).toHaveBeenCalledWith(
      { signed: "proof" },
      exactSlice,
      fixture.transaction
    );
    expect(fixture.client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "ReadCommitted" }
    );
    expect(
      fixture.transaction.v1OutcomeEvidence.findMany.mock.calls[0][0]
    ).toEqual({
      where: {
        orgId: exactSlice.org_id,
        evidenceId: { in: [baseline.evidence_id, comparison.evidence_id] }
      },
      orderBy: { evidenceId: "asc" }
    });
    expect(fixture.transaction.outcomeComparisonPrivacyRelease.create).toHaveBeenCalledTimes(1);
    expect(fixture.transaction.$executeRaw).toHaveBeenCalledTimes(2);
    expect(fixture.transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(fixture.order.indexOf("attestation-readiness")).toBeLessThan(
      fixture.order.indexOf("evidence-read")
    );
    expect(fixture.order.indexOf("evidence-read")).toBeLessThan(
      fixture.order.indexOf("attestation-config")
    );
    expect(fixture.order.indexOf("release-create")).toBeLessThan(
      fixture.order.indexOf("attestation-verify")
    );
    expect(fixture.getRelease()).toEqual(
      expect.objectContaining({
        baselineAggregateValue: baseline.aggregate_value,
        comparisonAggregateValue: comparison.aggregate_value,
        projectionJson: projection,
        projectionHash,
        contentFingerprint
      })
    );
  });

  it("holds before persistence when creation-attestation configuration is absent", async () => {
    delete process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID;
    delete process.env.C1_CREATION_ATTESTATION_KEYS_JSON;
    const fixture = buildFixture();

    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(fixture.client.$transaction).not.toHaveBeenCalled();
  });

  it("holds before C.0 verification when bounded attestation readiness fails", async () => {
    const fixture = buildFixture({ attestationReady: false });

    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(mockedHandoff).not.toHaveBeenCalled();
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it("holds when exact evidence content changes and never writes", async () => {
    const changed = {
      ...databaseEvidence(comparison),
      aggregateValue: 999
    };
    const fixture = buildFixture({
      evidenceRows: [databaseEvidence(baseline), changed]
    });

    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it("holds before evidence access when the current C.0 handoff is unavailable", async () => {
    mockedHandoff.mockResolvedValueOnce(null);
    const fixture = buildFixture();

    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.v1OutcomeEvidence.findMany
    ).not.toHaveBeenCalled();
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it("returns exact replay only after reparsing all stored projection bindings", async () => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    const stored = first.getRelease();
    const replay = buildFixture({ release: stored });

    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual(committed);
    expect(
      replay.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();

    replay.setRelease({
      ...stored,
      projectionJson: {
        ...stored.projectionJson,
        baseline_window: {
          ...stored.projectionJson.baseline_window,
          aggregate_value: 999
        }
      }
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });

    replay.setRelease({
      ...stored,
      projectionJson: stored.projectionJson,
      baselineAggregateValue: 999
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });

    replay.setRelease({
      ...stored,
      projectionHash: "44".repeat(32)
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });

    replay.setRelease({
      ...stored,
      contentFingerprint: "55".repeat(32)
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it("readback discovers no values before both locks and survives proof expiry", async () => {
    const committedFixture = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      committedFixture.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const readFixture = buildFixture({ release: committedFixture.getRelease() });

    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        readFixture.client
      )
    ).resolves.toEqual(committed);
    expect(mockedHandoff).toHaveBeenCalledTimes(1);
    expect(readFixture.order).toEqual([
      "transaction:ReadCommitted",
      "attestation-readiness",
      "family-lock",
      "discovery-release",
      "discovery-journal",
      "producer-lock",
      "release-reload",
      "journal-reload",
      "reservation-reload",
      "authority-reload",
      "attestation-config",
      "attestation-config",
      "attestation-verify"
    ]);
  });

  it("holds readback before discovery when bounded attestation readiness fails", async () => {
    const committedFixture = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      committedFixture.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const readFixture = buildFixture({
      release: committedFixture.getRelease(),
      attestationReady: false
    });

    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        readFixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(readFixture.order).toEqual([
      "transaction:ReadCommitted",
      "attestation-readiness"
    ]);
  });

  it("holds readback after authority revocation or any receipt mismatch", async () => {
    const committedFixture = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      committedFixture.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");

    const revoked = buildFixture({
      release: committedFixture.getRelease(),
      revoked: true
    });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        revoked.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });

    const mismatch = buildFixture({ release: committedFixture.getRelease() });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        {
          ...committed.receipt,
          projection_hash: "44".repeat(32)
        },
        exactSlice,
        mismatch.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(mockedHandoff).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["organization", { ...exactSlice, org_id: "INVALID ORG" }],
    ["workflow", { ...exactSlice, workflow_id: "INVALID WORKFLOW" }],
    ["JBTD", { ...exactSlice, jbtd_id: "INVALID JBTD" }],
    ["persona", { ...exactSlice, persona_id: "INVALID PERSONA" }]
  ])("holds malformed %s slice before opening persistence", async (_label, slice) => {
    const fixture = buildFixture();
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        slice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(fixture.client.$transaction).not.toHaveBeenCalled();
    expect(mockedHandoff).not.toHaveBeenCalled();
  });

  it("requires a current signed C.0 handoff even for replay and rejects copied admission metadata before evidence access", async () => {
    const committedFixture = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      committedFixture.client
    );
    expect(committed.decision).toBe("ATOMIC_COMPARISON_PRIVACY_RELEASED");

    mockedHandoff.mockResolvedValueOnce(null);
    const replay = buildFixture({ release: committedFixture.getRelease() });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        {
          admission_receipt_hash: admissionReceiptHash,
          proof_journal_id: proofJournalId,
          reservation_key: reservationKey
        },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(replay.transaction.v1OutcomeEvidence.findMany).not.toHaveBeenCalled();
    expect(
      replay.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it.each([
    "expired-proof",
    "revoked-authority",
    "malformed-proof",
    "wrong-slice"
  ])(
    "holds when the %s C.0 handoff is unavailable before reading evidence",
    async () => {
      mockedHandoff.mockResolvedValueOnce(null);
      const fixture = buildFixture();
      await expect(
        commitOutcomeComparisonPrivacyRelease(
          { signed: "untrusted-proof" },
          exactSlice,
          fixture.client
        )
      ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
      expect(
        fixture.transaction.v1OutcomeEvidence.findMany
      ).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["zero", []],
    ["one", [databaseEvidence(baseline)]],
    [
      "duplicate",
      [databaseEvidence(baseline), databaseEvidence(baseline)]
    ],
    [
      "extra",
      [
        databaseEvidence(baseline),
        databaseEvidence(comparison),
        {
          ...databaseEvidence(comparison),
          evidenceId: "evidence_extra"
        }
      ]
    ]
  ])("holds on %s server-loaded evidence rows", async (_label, evidenceRows) => {
    const fixture = buildFixture({ evidenceRows });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it.each([
    ["organization", { orgId: "org_other" }],
    ["workflow", { workflowId: "workflow:other" }],
    ["JBTD", { jbtdId: "other" }],
    ["persona", { personaId: "other" }],
    ["metric", { outcomeMetric: "revenue" }],
    ["unit", { outcomeUnit: "hours" }],
    ["source", { sourceSystem: "other_crm" }],
    ["evidence ID", { evidenceId: "evidence_other" }],
    ["window start", { periodStart: new Date("2026-01-02T00:00:00.000Z") }],
    ["window end", { periodEnd: new Date("2026-03-01T00:00:00.000Z") }],
    ["cohort size", { cohortSize: 6 }],
    ["aggregate value", { aggregateValue: 12.75 }],
    ["aggregate kind", { aggregateKind: "median" }],
    ["source attestation", { sourceAttestation: { approved: false } }],
    ["ingested instant", { ingestedAt: new Date("2026-03-04T00:00:00.000Z") }]
  ])("holds when the baseline %s differs from the signed handoff", async (_label, patch) => {
    const fixture = buildFixture({
      evidenceRows: [
        { ...databaseEvidence(baseline), ...patch },
        databaseEvidence(comparison)
      ]
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it.each([
    ["organization", { orgId: "org_other" }],
    ["workflow", { workflowId: "workflow:other" }],
    ["JBTD", { jbtdId: "other" }],
    ["persona", { personaId: "other" }],
    ["metric", { outcomeMetric: "revenue" }],
    ["unit", { outcomeUnit: "hours" }],
    ["source", { sourceSystem: "other_crm" }],
    ["evidence ID", { evidenceId: "evidence_other" }],
    ["window start", { periodStart: new Date("2026-03-03T00:00:00.000Z") }],
    ["window end", { periodEnd: new Date("2026-05-02T00:00:00.000Z") }],
    ["cohort size", { cohortSize: 6 }],
    ["aggregate value", { aggregateValue: 10.75 }],
    ["aggregate kind", { aggregateKind: "median" }],
    ["source attestation", { sourceAttestation: { approved: false } }],
    ["ingested instant", { ingestedAt: new Date("2026-05-03T00:00:00.000Z") }]
  ])("holds when the comparison %s differs from the signed handoff", async (_label, patch) => {
    const fixture = buildFixture({
      evidenceRows: [
        databaseEvidence(baseline),
        { ...databaseEvidence(comparison), ...patch }
      ]
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it.each([
    ["owner kind", { owner_kind: "SLICE_C_FIXED_WINDOW" }],
    ["organization", { org_id: "org_other" }],
    ["workflow", { workflow_id: "workflow:other" }],
    ["JBTD", { jbtd_id: "other" }],
    ["persona", { persona_id: "other" }],
    [
      "baseline hash",
      {
        baseline_window: {
          ...handoff.baseline_window,
          evidence_content_hash: "aa".repeat(32)
        }
      }
    ],
    [
      "comparison hash",
      {
        comparison_window: {
          ...handoff.comparison_window,
          evidence_content_hash: "bb".repeat(32)
        }
      }
    ]
  ])("holds a mismatched C.0 %s handoff without a release", async (_label, patch) => {
    mockedHandoff.mockResolvedValueOnce({ ...handoff, ...patch } as any);
    const fixture = buildFixture();
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it.each([
    ["journal ID", { id: "22222222-2222-4222-8222-222222222222" }],
    ["organization", { orgId: "org_other" }],
    ["proof hash", { proofHash: "aa".repeat(32) }],
    ["reservation key", { reservationKey: "aa".repeat(32) }],
    ["workflow", { workflowId: "workflow:other" }],
    ["JBTD", { jbtdId: "other" }],
    ["persona", { personaId: "other" }],
    ["metric", { outcomeMetric: "revenue" }],
    ["unit", { outcomeUnit: "hours" }],
    ["source", { sourceSystem: "other_crm" }],
    ["baseline start", { baselinePeriodStart: new Date("2026-01-02T00:00:00.000Z") }],
    ["baseline end", { baselinePeriodEnd: new Date("2026-03-01T00:00:00.000Z") }],
    ["baseline evidence", { baselineEvidenceId: "evidence_other" }],
    ["baseline hash", { baselineEvidenceHash: "aa".repeat(32) }],
    ["baseline cohort", { baselineCohortSize: 6 }],
    ["comparison start", { comparisonPeriodStart: new Date("2026-03-03T00:00:00.000Z") }],
    ["comparison end", { comparisonPeriodEnd: new Date("2026-05-02T00:00:00.000Z") }],
    ["comparison evidence", { comparisonEvidenceId: "evidence_other" }],
    ["comparison hash", { comparisonEvidenceHash: "bb".repeat(32) }],
    ["comparison cohort", { comparisonCohortSize: 6 }],
    ["evidence pair hash", { evidencePairHash: "cc".repeat(32) }],
    ["admission receipt", { admissionReceiptHash: "dd".repeat(32) }],
    ["decision", { decision: "HOLD" }]
  ])("holds replay when the C.0 journal %s differs", async (_label, patch) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    expect(committed.decision).toBe("ATOMIC_COMPARISON_PRIVACY_RELEASED");
    const replay = buildFixture({
      release: first.getRelease(),
      journal: { ...journal, ...patch }
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it.each([
    ["missing", null],
    ["organization", { ...reservation, orgId: "org_other" }],
    ["key", { ...reservation, reservationKey: "aa".repeat(32) }],
    ["owner kind", { ...reservation, ownerKind: "SLICE_C_FIXED_WINDOW" }],
    ["owner reference", { ...reservation, ownerReference: "other-journal" }],
    ["owner content", { ...reservation, ownerContentHash: "aa".repeat(32) }],
    ["workflow", { ...reservation, workflowId: "workflow:other" }],
    ["JBTD", { ...reservation, jbtdId: "other" }],
    ["persona", { ...reservation, personaId: "other" }]
  ])("holds replay when the shared reservation %s differs", async (_label, reservationRow) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    expect(committed.decision).toBe("ATOMIC_COMPARISON_PRIVACY_RELEASED");
    const replay = buildFixture({
      release: first.getRelease(),
      reservation: reservationRow
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it("rolls back a newly inserted release when final chain validation fails", async () => {
    const fixture = buildFixture({
      journal: { ...journal, admissionReceiptHash: "aa".repeat(32) }
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      fixture.transaction.outcomeComparisonPrivacyRelease.create
    ).toHaveBeenCalledTimes(1);
    expect(fixture.getRelease()).toBeNull();
  });

  it.each([
    ["policy", { policyVersion: "FT_OTHER_POLICY" }],
    ["organization", { orgId: "org_other" }],
    ["workflow", { workflowId: "workflow:other" }],
    ["JBTD", { jbtdId: "other" }],
    ["persona", { personaId: "other" }],
    ["metric", { outcomeMetric: "revenue" }],
    ["unit", { outcomeUnit: "hours" }],
    ["source", { sourceSystem: "other_crm" }],
    ["proof journal", { proofJournalId: "22222222-2222-4222-8222-222222222222" }],
    ["proof hash", { proofHash: "aa".repeat(32) }],
    ["reservation", { reservationKey: "aa".repeat(32) }],
    ["admission", { admissionReceiptHash: "aa".repeat(32) }],
    ["baseline start", { baselinePeriodStart: new Date("2026-01-02T00:00:00.000Z") }],
    ["baseline end", { baselinePeriodEnd: new Date("2026-03-01T00:00:00.000Z") }],
    ["baseline evidence", { baselineEvidenceId: "evidence_other" }],
    ["baseline hash", { baselineEvidenceHash: "aa".repeat(32) }],
    ["baseline cohort", { baselineCohortSize: 6 }],
    ["baseline value", { baselineAggregateValue: 99 }],
    ["comparison start", { comparisonPeriodStart: new Date("2026-03-03T00:00:00.000Z") }],
    ["comparison end", { comparisonPeriodEnd: new Date("2026-05-02T00:00:00.000Z") }],
    ["comparison evidence", { comparisonEvidenceId: "evidence_other" }],
    ["comparison hash", { comparisonEvidenceHash: "bb".repeat(32) }],
    ["comparison cohort", { comparisonCohortSize: 6 }],
    ["comparison value", { comparisonAggregateValue: 99 }],
    ["decision", { decision: "HOLD" }],
    ["comparison-only flag", { comparisonPrivacyOnly: false }],
    ["claim effect", { claimAuthorityEffect: "SURFACE" }],
    ["claim flag", { claimAuthorized: true }],
    ["model flag", { modelAuthorized: true }],
    ["publish flag", { customerPublishable: true }]
  ])("holds when immutable release %s scalar differs", async (_label, patch) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    expect(committed.decision).toBe("ATOMIC_COMPARISON_PRIVACY_RELEASED");
    const replay = buildFixture({
      release: { ...first.getRelease(), ...patch }
    });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it("holds when proof and reservation unique lookups resolve to different releases", async () => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    expect(committed.decision).toBe("ATOMIC_COMPARISON_PRIVACY_RELEASED");
    const stored = first.getRelease();
    const replay = buildFixture({ release: stored });
    replay.transaction.outcomeComparisonPrivacyRelease.findUnique.mockImplementation(
      async (query: any) => {
        if (query.where?.outcome_comparison_release_proof_journal_key) {
          return stored;
        }
        if (query.where?.outcome_comparison_release_reservation_key) {
          return {
            ...stored,
            id: "22222222-2222-4222-8222-222222222222"
          };
        }
        return stored;
      }
    );
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        replay.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(
      replay.transaction.outcomeComparisonPrivacyRelease.create
    ).not.toHaveBeenCalled();
  });

  it("uses a value-free discovery shape and reloads the complete chain only after both locks", async () => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const readFixture = buildFixture({ release: first.getRelease() });
    await readOutcomeComparisonPrivacyRelease(
      committed.receipt,
      exactSlice,
      readFixture.client
    );

    expect(
      readFixture.transaction.outcomeComparisonPrivacyRelease.findUnique
        .mock.calls[0][0]
    ).toEqual({
      where: { id: committed.receipt.release_id },
      select: { orgId: true, proofJournalId: true }
    });
    expect(
      readFixture.transaction.cohortProofJournal.findUnique.mock.calls[0][0]
    ).toEqual({
      where: { id: committed.receipt.proof_journal_id },
      select: {
        id: true,
        orgId: true,
        producerKeyId: true,
        authorityVersion: true
      }
    });
    expect(readFixture.order.indexOf("producer-lock")).toBeLessThan(
      readFixture.order.indexOf("release-reload")
    );
    expect(readFixture.order.indexOf("producer-lock")).toBeLessThan(
      readFixture.order.indexOf("journal-reload")
    );
    expect(readFixture.order.indexOf("producer-lock")).toBeLessThan(
      readFixture.order.indexOf("reservation-reload")
    );
    expect(readFixture.order.indexOf("producer-lock")).toBeLessThan(
      readFixture.order.indexOf("authority-reload")
    );
  });

  it("holds when discovery and final producer identity differ", async () => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const fixture = buildFixture({
      release: first.getRelease(),
      discoveryJournal: {
        id: journal.id,
        orgId: journal.orgId,
        producerKeyId: "producer_changed",
        authorityVersion: 2
      }
    });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(mockedProducerLock).toHaveBeenLastCalledWith(
      fixture.transaction,
      exactSlice.org_id,
      "producer_changed"
    );
  });

  it.each([
    ["organization", { orgId: "org_other", proofJournalId }],
    ["proof journal", { orgId: exactSlice.org_id, proofJournalId: "22222222-2222-4222-8222-222222222222" }]
  ])("holds a copied receipt when discovery %s differs", async (_label, discoveryRelease) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const fixture = buildFixture({
      release: first.getRelease(),
      discoveryRelease
    });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(mockedProducerLock).not.toHaveBeenCalled();
  });

  it.each([
    ["policy version", { policy_version: "FT_OTHER_POLICY" }],
    ["release ID", { release_id: "22222222-2222-4222-8222-222222222222" }],
    ["proof journal ID", { proof_journal_id: "22222222-2222-4222-8222-222222222222" }],
    ["reservation key", { reservation_key: "aa".repeat(32) }],
    ["content fingerprint", { content_fingerprint: "aa".repeat(32) }],
    ["projection hash", { projection_hash: "bb".repeat(32) }],
    ["comparison-only flag", { comparison_privacy_only: false }],
    ["claim effect", { claim_authority_effect: "SURFACE" }],
    ["claim flag", { claim_authorized: true }],
    ["model flag", { model_authorized: true }],
    ["publish flag", { customer_publishable: true }]
  ])("holds when receipt %s is copied or changed", async (_label, patch) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const fixture = buildFixture({ release: first.getRelease() });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        { ...committed.receipt, ...patch },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it.each([
    ["release", { release: null }],
    ["journal", { journal: null }],
    ["reservation", { reservation: null }],
    ["authority", { authority: null }]
  ])("holds when the immutable %s chain element is missing", async (_label, patch) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const fixture = buildFixture({
      release: first.getRelease(),
      ...patch
    });
    if (_label === "release") fixture.setRelease(null);
    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it.each([
    "transaction",
    "evidence-read",
    "release-create",
    "release-read",
    "journal-read",
    "reservation-read"
  ])("fails closed on commit persistence failure at %s", async (failAt) => {
    const fixture = buildFixture({ failAt });
    await expect(
      commitOutcomeComparisonPrivacyRelease(
        { signed: "proof" },
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it.each([
    "transaction",
    "discovery-release",
    "discovery-journal",
    "release-read",
    "journal-read",
    "reservation-read",
    "authority-read"
  ])("fails closed on readback persistence failure at %s", async (failAt) => {
    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      { signed: "proof" },
      exactSlice,
      first.client
    );
    if (!committed.receipt) throw new Error("fixture commit failed");
    const fixture = buildFixture({
      release: first.getRelease(),
      failAt
    });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
  });

  it("does not expose list, batch, multi-receipt, caller-projection, or cross-slice composition authority", async () => {
    expect(
      (comparisonPrivacyRepository as Record<string, unknown>)
        .listOutcomeComparisonPrivacyReleases
    ).toBeUndefined();
    expect(
      (comparisonPrivacyRepository as Record<string, unknown>)
        .readOutcomeComparisonPrivacyReleases
    ).toBeUndefined();

    const first = buildFixture();
    const committed = await commitOutcomeComparisonPrivacyRelease(
      {
        signed: "proof",
        projection: {
          baseline_window: { aggregate_value: 999 },
          comparison_window: { aggregate_value: -999 }
        }
      },
      exactSlice,
      first.client
    );
    expect(committed).toEqual(expect.objectContaining({ projection }));
    if (!committed.receipt) throw new Error("fixture commit failed");

    const fixture = buildFixture({ release: first.getRelease() });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        [committed.receipt, committed.receipt],
        exactSlice,
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    await expect(
      readOutcomeComparisonPrivacyRelease(
        committed.receipt,
        { ...exactSlice, persona_id: "other_persona" },
        fixture.client
      )
    ).resolves.toEqual({ decision: "HOLD", receipt: null, projection: null });
    expect(committed.receipt.claim_authorized).toBe(false);
    expect(committed.receipt.model_authorized).toBe(false);
    expect(committed.receipt.customer_publishable).toBe(false);
  });
});
