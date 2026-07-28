import crypto from "node:crypto";

import { cohortReservationBytes } from "@fluencytracr/shared";
import type { Prisma, PrismaClient } from "@prisma/client";

import { getPrisma } from "../db";
import type {
  AggregateDisclosureCandidate,
  AggregateDisclosureDiagnostic,
  AggregateDisclosureReceipt,
  ServerAggregatePrivacyManifest
} from "../aggregate_disclosure_policy";
import { evaluateAggregateDisclosure } from "../aggregate_disclosure_policy";
import { acquireOutcomeEvidenceFamilyLock } from "./outcome-evidence.repository";

type AggregatePrivacyJournalRow = {
  orgId: string;
  workflowId: string;
  jbtdId: string;
  personaId: string;
  privacySlotId: string;
  privacyDomainFingerprint: string;
  contentFingerprint: string;
  atomicLineageFingerprint: string;
  publicProjectionHash: string;
  temporalGridId: string;
  windowId: string;
  releaseVersion: number;
  canonicalContributionFingerprint: string;
  decision: string;
  projectionJson: Prisma.JsonValue;
};

type AggregatePrivacyManifestRow = {
  orgId: string;
  workflowId: string;
  jbtdId: string;
  personaId: string;
  privacySlotId: string;
  contentFingerprint: string;
  atomicLineageFingerprint: string;
  publicProjectionHash: string;
  temporalGridId: string;
  windowId: string;
  releaseVersion: number;
  hierarchyAxis: string;
  sourceMode: string;
  atomicCellIds: Prisma.JsonValue;
  completePartition: boolean;
  canonicalContributions: boolean;
  canonicalContributionFingerprint: string;
  canonicalContributionCount: number;
  canonicalContributionIds: Prisma.JsonValue;
  hasSuppressedChild: boolean;
  hasAmbiguousLineage: boolean;
  hasOverlappingEquation: boolean;
  isMultiWindow: boolean;
  verified: boolean;
};

export type AggregatePrivacyCommitResult =
  | {
      decision: "RELEASE";
      receipt: AggregateDisclosureReceipt;
      projection: Prisma.JsonValue;
    }
  | {
      decision: "HOLD";
      diagnostic: AggregateDisclosureDiagnostic | "JOURNAL_UNAVAILABLE";
    };

const isPrismaUniqueConstraintError = (
  error: unknown
): error is { code: "P2002" } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const canonicalJson = (value: Prisma.InputJsonValue): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Prisma.InputJsonObject)[key]!)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const projectionShape = (value: Prisma.InputJsonValue): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => projectionShape(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((shape, key) => {
        shape[key] = projectionShape((value as Prisma.InputJsonObject)[key]!);
        return shape;
      }, {});
  }
  return value === null ? "null" : typeof value;
};

export const hashPublicProjectionShape = (projection: Prisma.InputJsonValue): string =>
  sha256(canonicalJson(projectionShape(projection) as Prisma.InputJsonValue));

export const hashCanonicalContributionIds = (
  contributionIds: ReadonlyArray<string>
): string => sha256(canonicalJson([...contributionIds].sort()));

export const hashPrivacyDomainFingerprint = (
  candidate: Pick<
    AggregateDisclosureCandidate,
    "org_id" | "workflow_id" | "jbtd_id" | "persona_id"
  >
): string =>
  sha256(canonicalJson({
    org_id: candidate.org_id,
    workflow_id: candidate.workflow_id,
    jbtd_id: candidate.jbtd_id,
    persona_id: candidate.persona_id
  }));

export const hashSharedPrivacyReservationKey = (
  candidate: {
    org_id: string;
    workflow_id: string;
    jbtd_id: string;
    persona_id: string;
  }
): string =>
  crypto
    .createHash("sha256")
    .update(
      cohortReservationBytes({
        org_id: candidate.org_id,
        workflow_id: candidate.workflow_id,
        jbtd_id: candidate.jbtd_id,
        persona_id: candidate.persona_id
      })
    )
    .digest("hex");

export const hashAggregateProjectionContent = (
  candidate: Omit<AggregateDisclosureCandidate, "content_fingerprint">,
  projection: Prisma.InputJsonValue
): string =>
  sha256(canonicalJson({
    org_id: candidate.org_id,
    workflow_id: candidate.workflow_id,
    jbtd_id: candidate.jbtd_id,
    persona_id: candidate.persona_id,
    privacy_slot_id: candidate.privacy_slot_id,
    atomic_lineage_fingerprint: candidate.atomic_lineage_fingerprint,
    public_projection_hash: candidate.public_projection_hash,
    temporal_grid_id: candidate.temporal_grid_id,
    window_id: candidate.window_id,
    release_version: candidate.release_version,
    hierarchy_axis: candidate.hierarchy_axis,
    source_mode: candidate.source_mode,
    atomic_cell_ids: [...candidate.atomic_cell_ids],
    projection
  }));

const toReceipt = (row: AggregatePrivacyJournalRow): AggregateDisclosureReceipt => ({
  org_id: row.orgId,
  workflow_id: row.workflowId,
  jbtd_id: row.jbtdId,
  persona_id: row.personaId,
  privacy_slot_id: row.privacySlotId,
  content_fingerprint: row.contentFingerprint,
  atomic_lineage_fingerprint: row.atomicLineageFingerprint,
  public_projection_hash: row.publicProjectionHash,
  temporal_grid_id: row.temporalGridId,
  window_id: row.windowId,
  release_version: row.releaseVersion,
  canonical_contribution_fingerprint: row.canonicalContributionFingerprint,
  decision: row.decision === "RELEASE" ? "RELEASE" : "HOLD"
});

const toManifest = (
  row: AggregatePrivacyManifestRow | null
): ServerAggregatePrivacyManifest | null => {
  if (
    row === null ||
    !Array.isArray(row.atomicCellIds) ||
    !row.atomicCellIds.every((cell): cell is string => typeof cell === "string") ||
    !Array.isArray(row.canonicalContributionIds) ||
    !row.canonicalContributionIds.every(
      (contribution): contribution is string => typeof contribution === "string"
    )
  ) {
    return null;
  }
  return {
    org_id: row.orgId,
    workflow_id: row.workflowId,
    jbtd_id: row.jbtdId,
    persona_id: row.personaId,
    privacy_slot_id: row.privacySlotId,
    content_fingerprint: row.contentFingerprint,
    atomic_lineage_fingerprint: row.atomicLineageFingerprint,
    public_projection_hash: row.publicProjectionHash,
    temporal_grid_id: row.temporalGridId,
    window_id: row.windowId,
    release_version: row.releaseVersion,
    hierarchy_axis: row.hierarchyAxis,
    source_mode: row.sourceMode,
    atomic_cell_ids: row.atomicCellIds,
    complete_partition: row.completePartition,
    canonical_contributions: row.canonicalContributions,
    canonical_contribution_fingerprint: row.canonicalContributionFingerprint,
    canonical_contribution_count: row.canonicalContributionCount,
    canonical_contribution_ids: row.canonicalContributionIds,
    has_suppressed_child: row.hasSuppressedChild,
    has_ambiguous_lineage: row.hasAmbiguousLineage,
    has_overlapping_equation: row.hasOverlappingEquation,
    is_multi_window: row.isMultiWindow,
    verified: row.verified
  };
};

const isExactReceipt = (
  candidate: AggregateDisclosureCandidate,
  receipt: AggregateDisclosureReceipt
): boolean =>
  receipt.org_id === candidate.org_id &&
  receipt.workflow_id === candidate.workflow_id &&
  receipt.jbtd_id === candidate.jbtd_id &&
  receipt.persona_id === candidate.persona_id &&
  receipt.privacy_slot_id === candidate.privacy_slot_id &&
  receipt.content_fingerprint === candidate.content_fingerprint &&
  receipt.atomic_lineage_fingerprint === candidate.atomic_lineage_fingerprint &&
  receipt.public_projection_hash === candidate.public_projection_hash &&
  receipt.temporal_grid_id === candidate.temporal_grid_id &&
  receipt.window_id === candidate.window_id &&
  receipt.release_version === candidate.release_version &&
  receipt.decision === "RELEASE";

/**
 * Atomically establishes one immutable release per organization/privacy slot.
 * The unique slot key and no-op upsert make concurrent first writers converge
 * on one stored row. A conflicting candidate never mutates that release.
 */
export const commitAggregatePrivacyProjection = async (
  candidate: AggregateDisclosureCandidate,
  projection: Prisma.InputJsonValue,
  client?: PrismaClient
): Promise<AggregatePrivacyCommitResult> => {
  if (!candidate.workflow_id || !candidate.jbtd_id || !candidate.persona_id) {
    return { decision: "HOLD", diagnostic: "MISSING_SERVER_AUTHORITY" };
  }
  const workflowId = candidate.workflow_id;
  const jbtdId = candidate.jbtd_id;
  const personaId = candidate.persona_id;
  const privacyDomainFingerprint = hashPrivacyDomainFingerprint(candidate);
  const reservationKey = hashSharedPrivacyReservationKey({
    org_id: candidate.org_id,
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId
  });
  if (hashPublicProjectionShape(projection) !== candidate.public_projection_hash) {
    return { decision: "HOLD", diagnostic: "MISSING_SERVER_AUTHORITY" };
  }
  const { content_fingerprint: _claimedContentFingerprint, ...contentCandidate } = candidate;
  if (hashAggregateProjectionContent(contentCandidate, projection) !== candidate.content_fingerprint) {
    return { decision: "HOLD", diagnostic: "MISSING_SERVER_AUTHORITY" };
  }
  try {
    const resolvedClient = client ?? getPrisma();
    return await resolvedClient.$transaction(async (transaction) => {
      await acquireOutcomeEvidenceFamilyLock(transaction, {
        orgId: candidate.org_id,
        workflowId,
        jbtdId,
        personaId
      });
      const manifest = toManifest(
        await transaction.aggregatePrivacyManifest.findUnique({
          where: {
            aggregate_privacy_manifest_slot_key: {
              orgId: candidate.org_id,
              privacySlotId: candidate.privacy_slot_id
            }
          }
        })
      );
      const priorRows = await transaction.aggregatePrivacyReleaseJournal.findMany({
        where: {
          orgId: candidate.org_id,
          OR: [
            { privacySlotId: candidate.privacy_slot_id },
            { atomicLineageFingerprint: candidate.atomic_lineage_fingerprint },
            { privacyDomainFingerprint }
          ]
        }
      });
      const policyDecision = evaluateAggregateDisclosure(
        candidate,
        manifest,
        priorRows.map(toReceipt)
      );
      if (policyDecision.decision === "HOLD") {
        return {
          decision: "HOLD" as const,
          diagnostic: policyDecision.diagnostic ?? "MISSING_SERVER_AUTHORITY"
        };
      }
      if (
        manifest === null ||
        hashCanonicalContributionIds(manifest.canonical_contribution_ids) !==
          manifest.canonical_contribution_fingerprint
      ) {
        return {
          decision: "HOLD" as const,
          diagnostic: "MISSING_SERVER_AUTHORITY" as const
        };
      }

      const existingReservation =
        await transaction.aggregatePrivacyReservation.findUnique({
          where: {
            aggregate_privacy_reservation_key: {
              orgId: candidate.org_id,
              reservationKey
            }
          }
        });
      const exactReservation =
        existingReservation?.ownerKind === "SLICE_C_FIXED_WINDOW" &&
        existingReservation.ownerReference === candidate.privacy_slot_id &&
        existingReservation.ownerContentHash === candidate.content_fingerprint &&
        existingReservation.workflowId === workflowId &&
        existingReservation.jbtdId === jbtdId &&
        existingReservation.personaId === personaId;
      if (existingReservation && !exactReservation) {
        return {
          decision: "HOLD" as const,
          diagnostic: "CHANGED_REPLAY" as const
        };
      }

      const existingClaims = await transaction.aggregatePrivacyContributionClaim.findMany({
        where: {
          orgId: candidate.org_id,
          contributionTokenHash: { in: [...manifest.canonical_contribution_ids] }
        }
      });
      if (existingClaims.some((claim) => claim.privacySlotId !== candidate.privacy_slot_id)) {
        return {
          decision: "HOLD" as const,
          diagnostic: "AMBIGUOUS_LINEAGE" as const
        };
      }
      if (
        existingClaims.length > 0 &&
        existingClaims.length !== manifest.canonical_contribution_ids.length
      ) {
        return {
          decision: "HOLD" as const,
          diagnostic: "AMBIGUOUS_LINEAGE" as const
        };
      }

      if (!existingReservation) {
        const legacyDomainRow = priorRows.find(
          (prior) =>
            prior.privacyDomainFingerprint === privacyDomainFingerprint
        );
        const reservationOwnerReference =
          legacyDomainRow?.privacySlotId ?? candidate.privacy_slot_id;
        const reservationOwnerContentHash =
          legacyDomainRow?.contentFingerprint ?? candidate.content_fingerprint;
        if (
          legacyDomainRow &&
          (reservationOwnerReference !== candidate.privacy_slot_id ||
            reservationOwnerContentHash !== candidate.content_fingerprint)
        ) {
          return {
            decision: "HOLD" as const,
            diagnostic: "CHANGED_REPLAY" as const
          };
        }
        await transaction.aggregatePrivacyReservation.create({
          data: {
            orgId: candidate.org_id,
            reservationKey,
            ownerKind: "SLICE_C_FIXED_WINDOW",
            ownerReference: reservationOwnerReference,
            ownerContentHash: reservationOwnerContentHash,
            workflowId,
            jbtdId,
            personaId
          }
        });
      }

      const existingRow =
        await transaction.aggregatePrivacyReleaseJournal.findUnique({
          where: {
            aggregate_privacy_release_slot_key: {
              orgId: candidate.org_id,
              privacySlotId: candidate.privacy_slot_id
            }
          }
        });
      const row = existingRow ?? await transaction.aggregatePrivacyReleaseJournal.create({
        data: {
          orgId: candidate.org_id,
          workflowId,
          jbtdId,
          personaId,
          privacySlotId: candidate.privacy_slot_id,
          privacyDomainFingerprint,
          contentFingerprint: candidate.content_fingerprint,
          atomicLineageFingerprint: candidate.atomic_lineage_fingerprint,
          publicProjectionHash: candidate.public_projection_hash,
          temporalGridId: candidate.temporal_grid_id,
          windowId: candidate.window_id,
          releaseVersion: candidate.release_version,
          canonicalContributionFingerprint:
            manifest.canonical_contribution_fingerprint,
          decision: "RELEASE",
          projectionJson: projection
        }
      });
      const receipt = toReceipt(row);
      if (
        !isExactReceipt(candidate, receipt) ||
        receipt.canonical_contribution_fingerprint !==
          manifest.canonical_contribution_fingerprint
      ) {
        return { decision: "HOLD" as const, diagnostic: "CHANGED_REPLAY" as const };
      }
      if (existingClaims.length === 0) {
        await transaction.aggregatePrivacyContributionClaim.createMany({
          data: manifest.canonical_contribution_ids.map((contributionTokenHash) => ({
            orgId: candidate.org_id,
            contributionTokenHash,
            privacySlotId: candidate.privacy_slot_id
          }))
        });
      }
      return { decision: "RELEASE" as const, receipt, projection: row.projectionJson };
    }, {
      isolationLevel: "Serializable"
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return { decision: "HOLD", diagnostic: "CHANGED_REPLAY" };
    }
    return { decision: "HOLD", diagnostic: "JOURNAL_UNAVAILABLE" };
  }
};

/**
 * Reads only the projection atomically admitted for the exact durable slot.
 * Missing storage, non-release rows, and database failures are indistinguishable
 * to public callers and therefore return null.
 */
export const readAdmittedAggregatePrivacyProjection = async (
  orgId: string,
  privacySlotId: string,
  client?: PrismaClient
): Promise<{ projection: Prisma.JsonValue; window_id: string } | null> => {
  try {
    const resolvedClient = client ?? getPrisma();
    const row = await resolvedClient.aggregatePrivacyReleaseJournal.findUnique({
      where: {
        aggregate_privacy_release_slot_key: {
          orgId,
          privacySlotId
        }
      }
    });
    return row?.decision === "RELEASE"
      ? { projection: row.projectionJson, window_id: row.windowId }
      : null;
  } catch {
    return null;
  }
};
