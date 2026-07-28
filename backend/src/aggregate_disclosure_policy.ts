import type { BehavioralSignalRecord } from "./store";

export type AggregateDisclosureDiagnostic =
  | "MISSING_SERVER_AUTHORITY"
  | "COMPLEMENTARY_SUPPRESSION"
  | "AMBIGUOUS_LINEAGE"
  | "UNSAFE_WINDOW"
  | "CHANGED_REPLAY";

export type AggregateDisclosureCandidate = {
  org_id: string;
  workflow_id: string | null;
  jbtd_id: string | null;
  persona_id: string | null;
  privacy_slot_id: string;
  content_fingerprint: string;
  atomic_lineage_fingerprint: string;
  public_projection_hash: string;
  temporal_grid_id: string;
  window_id: string;
  release_version: number;
  hierarchy_axis: string;
  source_mode: string;
  atomic_cell_ids: ReadonlyArray<string>;
};

export type ServerAggregatePrivacyManifest = {
  org_id: string;
  workflow_id: string;
  jbtd_id: string;
  persona_id: string;
  privacy_slot_id: string;
  content_fingerprint: string;
  atomic_lineage_fingerprint: string;
  public_projection_hash: string;
  temporal_grid_id: string;
  window_id: string;
  release_version: number;
  hierarchy_axis: string;
  source_mode: string;
  atomic_cell_ids: ReadonlyArray<string>;
  complete_partition: boolean;
  canonical_contributions: boolean;
  canonical_contribution_fingerprint: string;
  canonical_contribution_count: number;
  canonical_contribution_ids: ReadonlyArray<string>;
  has_suppressed_child: boolean;
  has_ambiguous_lineage: boolean;
  has_overlapping_equation: boolean;
  is_multi_window: boolean;
  verified: boolean;
};

export type AggregateDisclosureReceipt = Pick<
  AggregateDisclosureCandidate,
  | "org_id"
  | "workflow_id"
  | "jbtd_id"
  | "persona_id"
  | "privacy_slot_id"
  | "content_fingerprint"
  | "atomic_lineage_fingerprint"
  | "public_projection_hash"
  | "temporal_grid_id"
  | "window_id"
  | "release_version"
> & {
  canonical_contribution_fingerprint: string;
  decision: "RELEASE" | "HOLD";
};

export type AggregateDisclosureDecision = {
  decision: "RELEASE" | "HOLD";
  diagnostic: AggregateDisclosureDiagnostic | null;
};

const isNonEmpty = (value: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

const sameOrderedCells = (
  candidateCells: ReadonlyArray<string>,
  manifestCells: ReadonlyArray<string>
): boolean =>
  candidateCells.length === manifestCells.length &&
  candidateCells.every((cell, index) => cell === manifestCells[index]);

const isCanonicalCellSet = (cells: ReadonlyArray<string>): boolean =>
  cells.length > 0 &&
  cells.every((cell) => cell.trim().length > 0) &&
  new Set(cells).size === cells.length;

const MIN_CANONICAL_CONTRIBUTIONS = 5;

export const evaluateAggregateDisclosure = (
  candidate: AggregateDisclosureCandidate,
  manifest: ServerAggregatePrivacyManifest | null,
  priorReceipts: ReadonlyArray<AggregateDisclosureReceipt>
): AggregateDisclosureDecision => {
  if (
    manifest === null ||
    !manifest.verified ||
    !manifest.complete_partition ||
    !manifest.canonical_contributions ||
    !isNonEmpty(manifest.canonical_contribution_fingerprint) ||
    !Number.isInteger(manifest.canonical_contribution_count) ||
    manifest.canonical_contribution_count < MIN_CANONICAL_CONTRIBUTIONS ||
    !isCanonicalCellSet(manifest.canonical_contribution_ids) ||
    manifest.canonical_contribution_ids.length !== manifest.canonical_contribution_count ||
    !isNonEmpty(candidate.workflow_id) ||
    !isNonEmpty(candidate.jbtd_id) ||
    !isNonEmpty(candidate.persona_id) ||
    !isNonEmpty(candidate.privacy_slot_id) ||
    !isNonEmpty(candidate.content_fingerprint) ||
    !isNonEmpty(candidate.atomic_lineage_fingerprint) ||
    !isNonEmpty(candidate.public_projection_hash) ||
    !isNonEmpty(candidate.temporal_grid_id) ||
    !isNonEmpty(candidate.window_id) ||
    !isNonEmpty(candidate.hierarchy_axis) ||
    !isNonEmpty(candidate.source_mode) ||
    !isCanonicalCellSet(manifest.atomic_cell_ids) ||
    !isCanonicalCellSet(candidate.atomic_cell_ids) ||
    manifest.org_id !== candidate.org_id ||
    manifest.workflow_id !== candidate.workflow_id ||
    manifest.jbtd_id !== candidate.jbtd_id ||
    manifest.persona_id !== candidate.persona_id ||
    manifest.privacy_slot_id !== candidate.privacy_slot_id ||
    manifest.content_fingerprint !== candidate.content_fingerprint ||
    manifest.atomic_lineage_fingerprint !== candidate.atomic_lineage_fingerprint ||
    manifest.public_projection_hash !== candidate.public_projection_hash ||
    manifest.temporal_grid_id !== candidate.temporal_grid_id ||
    manifest.window_id !== candidate.window_id ||
    manifest.release_version !== candidate.release_version ||
    manifest.hierarchy_axis !== candidate.hierarchy_axis ||
    manifest.source_mode !== candidate.source_mode ||
    !sameOrderedCells(candidate.atomic_cell_ids, manifest.atomic_cell_ids)
  ) {
    return { decision: "HOLD", diagnostic: "MISSING_SERVER_AUTHORITY" };
  }
  if (manifest.has_suppressed_child) {
    return { decision: "HOLD", diagnostic: "COMPLEMENTARY_SUPPRESSION" };
  }
  if (manifest.has_ambiguous_lineage || manifest.has_overlapping_equation) {
    return { decision: "HOLD", diagnostic: "AMBIGUOUS_LINEAGE" };
  }
  if (manifest.is_multi_window) {
    return { decision: "HOLD", diagnostic: "UNSAFE_WINDOW" };
  }

  // The durable repository supplies only receipts that collide by slot,
  // lineage, or the server-derived exact-slice privacy domain. Re-filtering
  // here would discard adjacent-window collisions that intentionally use a
  // different slot and lineage.
  const relevantReceipts = priorReceipts.filter(
    (receipt) => receipt.org_id === candidate.org_id
  );
  const isExactReplay = (receipt: AggregateDisclosureReceipt) =>
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
    receipt.canonical_contribution_fingerprint ===
      manifest.canonical_contribution_fingerprint &&
    receipt.decision === "RELEASE";

  if (relevantReceipts.some((receipt) => !isExactReplay(receipt))) {
    return { decision: "HOLD", diagnostic: "CHANGED_REPLAY" };
  }
  return { decision: "RELEASE", diagnostic: null };
};

export type NumericBucket<T> = T & {
  bucket_start: string;
  value: number | null;
  suppressed: boolean;
};

/**
 * Current behavioral rows predate the server-owned privacy manifest required
 * by Slice C. They remain valid storage records but cannot feed a disclosure
 * or a derived aggregate.
 */
export const privacyAdmittedBehavioralSignals = (
  _signals: ReadonlyArray<BehavioralSignalRecord>
): BehavioralSignalRecord[] => [];

/**
 * Derived safety gates may retain only the fact that legacy evidence is held.
 * Counts and original values remain unavailable.
 */
export const privacyHeldBehavioralPosture = (
  _signals: ReadonlyArray<BehavioralSignalRecord>
): BehavioralSignalRecord[] => [];

/**
 * Moving and multi-window numeric releases remain held until a separately
 * governed comparison contract exists.
 */
export const holdMultiWindowNumericBuckets = <T>(
  buckets: ReadonlyArray<NumericBucket<T>>
): Array<NumericBucket<T>> => {
  const distinctWindows = new Set(buckets.map((bucket) => bucket.bucket_start));
  if (distinctWindows.size <= 1) {
    return [...buckets];
  }
  return buckets.map((bucket) => ({
    ...bucket,
    value: null,
    suppressed: true
  }));
};

export const holdStorageOnlyNumericBuckets = <T>(
  buckets: ReadonlyArray<NumericBucket<T>>
): Array<NumericBucket<T>> =>
  buckets.map((bucket) => ({
    ...bucket,
    value: null,
    suppressed: true
  }));

export const valueIndependentCounts = (
  disclosure: "ALLOWED" | "SUPPRESSED",
  counts: { total: number; disclosed: number; suppressed: number }
) =>
  disclosure === "ALLOWED"
    ? counts
    : {
        total: 0,
        disclosed: 0,
        suppressed: 0
      };
