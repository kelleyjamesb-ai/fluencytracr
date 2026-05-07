import { buildMethodologyReviewWorkspace } from "@learnaire/shared";

export const summarizeMethodologySnapshotsForReview = (registry: unknown, selectedSnapshotId?: string) =>
  buildMethodologyReviewWorkspace(registry, selectedSnapshotId);
