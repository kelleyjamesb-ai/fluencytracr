import { buildMethodologyReviewWorkspace } from "@fluencytracr/shared";

export const summarizeMethodologySnapshotsForReview = (registry: unknown, selectedSnapshotId?: string) =>
  buildMethodologyReviewWorkspace(registry, selectedSnapshotId);
