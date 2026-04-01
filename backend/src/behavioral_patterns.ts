import {
  BehavioralPattern,
  SIGNAL_NAMES,
  SignalName,
  PatternConfidence,
} from "@learnaire/shared";
import { BehavioralSignal } from "./behavioral_signals";

const LEGACY_SIGNAL_SET = new Set<string>(SIGNAL_NAMES);

type BehavioralSignalLegacy = BehavioralSignal & { signal_name: SignalName };

const isLegacySignal = (signal: BehavioralSignal): signal is BehavioralSignalLegacy => {
  return LEGACY_SIGNAL_SET.has(signal.signal_name);
};

/**
 * Detect "automation_emerging" pattern.
 * Triggers when delegation signals appear for the first time in a group.
 */
const detectAutomationEmerging = (
  currentWeek: BehavioralSignalLegacy[],
  previousWeek: BehavioralSignalLegacy[],
  groupId: string,
  bucketStart: string
): BehavioralPattern | null => {
  const currentTotal = currentWeek.reduce((sum, s) => sum + s.count, 0);
  const previousTotal = previousWeek.reduce((sum, s) => sum + s.count, 0);

  // Pattern: first appearance of delegation signals
  if (currentTotal > 0 && previousTotal === 0) {
    const confidence: PatternConfidence = currentTotal >= 10 ? "high" : currentTotal >= 5 ? "medium" : "low";

    const groupType = currentWeek[0]?.group_type === "function" ? "function" : "org";

    return {
      pattern_type: "automation_emerging",
      group_id: groupId,
      group_type: groupType as "function" | "org",
      bucket_start: bucketStart,
      description: `Teams are beginning to delegate tasks to AI agents`,
      confidence,
      signals: currentWeek.map((s) => ({
        signal_name: s.signal_name,
        count: s.count
      })),
      trends: {
        direction: "increasing",
        magnitude: currentTotal >= 20 ? "significant" : currentTotal >= 10 ? "moderate" : "slight"
      }
    };
  }

  return null;
};

/**
 * Detect "approval_workflow_mature" pattern.
 * Triggers when majority of delegations include approval steps.
 */
const detectApprovalWorkflowMature = (
  signals: BehavioralSignalLegacy[],
  groupId: string,
  bucketStart: string
): BehavioralPattern | null => {
  const approvalCount = signals
    .filter((s) => s.signal_name === "delegate_approval_request")
    .reduce((sum, s) => sum + s.count, 0);

  const totalCount = signals.reduce((sum, s) => sum + s.count, 0);

  // Pattern: >50% of delegations include approval
  if (totalCount > 0 && approvalCount / totalCount > 0.5) {
    const groupType = signals[0]?.group_type === "function" ? "function" : "org";

    return {
      pattern_type: "approval_workflow_mature",
      group_id: groupId,
      group_type: groupType as "function" | "org",
      bucket_start: bucketStart,
      description: `Majority of AI delegations include human approval steps`,
      confidence: "high",
      signals: signals.map((s) => ({
        signal_name: s.signal_name,
        count: s.count
      })),
      trends: {
        direction: "stable",
        magnitude: "slight"
      }
    };
  }

  return null;
};

/**
 * Detect "cross_system_integration" pattern.
 * Triggers when 3+ distinct signal types appear with cross-system metadata.
 */
const detectCrossSystemIntegration = (
  signals: BehavioralSignalLegacy[],
  groupId: string,
  bucketStart: string
): BehavioralPattern | null => {
  const crossSystemSignals = signals.filter(
    (s) => s.metadata?.is_cross_system === true
  );

  const distinctSignals = new Set(crossSystemSignals.map((s) => s.signal_name));

  // Pattern: 3+ distinct signal types with cross-system flag
  if (distinctSignals.size >= 3) {
    const groupType = signals[0]?.group_type === "function" ? "function" : "org";

    return {
      pattern_type: "cross_system_integration",
      group_id: groupId,
      group_type: groupType as "function" | "org",
      bucket_start: bucketStart,
      description: `AI agents orchestrating actions across multiple systems`,
      confidence: "medium",
      signals: crossSystemSignals.map((s) => ({
        signal_name: s.signal_name,
        count: s.count
      })),
      trends: {
        direction: "increasing",
        magnitude: "moderate"
      }
    };
  }

  return null;
};

/**
 * Detect "human_review_dominant" pattern.
 * Triggers when >75% of signals have human review metadata.
 */
const detectHumanReviewDominant = (
  signals: BehavioralSignalLegacy[],
  groupId: string,
  bucketStart: string
): BehavioralPattern | null => {
  const reviewedCount = signals.filter(
    (s) => s.metadata?.has_human_review === true
  ).length;

  const totalCount = signals.length;

  // Pattern: >75% of signals have human review
  if (totalCount > 0 && reviewedCount / totalCount > 0.75) {
    const groupType = signals[0]?.group_type === "function" ? "function" : "org";

    return {
      pattern_type: "human_review_dominant",
      group_id: groupId,
      group_type: groupType as "function" | "org",
      bucket_start: bucketStart,
      description: `Strong human oversight culture for AI delegations`,
      confidence: "high",
      signals: signals.map((s) => ({
        signal_name: s.signal_name,
        count: s.count
      })),
      trends: {
        direction: "stable",
        magnitude: "slight"
      }
    };
  }

  return null;
};

/**
 * Detect "data_intensive" pattern.
 * Triggers when data_fetch > 2x all action signals.
 */
const detectDataIntensive = (
  signals: BehavioralSignalLegacy[],
  groupId: string,
  bucketStart: string
): BehavioralPattern | null => {
  const dataFetchCount = signals
    .filter((s) => s.signal_name === "delegate_data_fetch")
    .reduce((sum, s) => sum + s.count, 0);

  const actionCount = signals
    .filter((s) => s.signal_name !== "delegate_data_fetch")
    .reduce((sum, s) => sum + s.count, 0);

  // Pattern: data_fetch > 2x action signals
  if (actionCount > 0 && dataFetchCount > 2 * actionCount) {
    const groupType = signals[0]?.group_type === "function" ? "function" : "org";

    return {
      pattern_type: "data_intensive",
      group_id: groupId,
      group_type: groupType as "function" | "org",
      bucket_start: bucketStart,
      description: `AI primarily used for data retrieval, not automation`,
      confidence: "high",
      signals: signals.map((s) => ({
        signal_name: s.signal_name,
        count: s.count
      })),
      trends: {
        direction: "stable",
        magnitude: "moderate"
      }
    };
  }

  return null;
};

/**
 * Detect all patterns for a group and time bucket.
 */
export const detectPatterns = (
  currentWeek: BehavioralSignal[],
  previousWeek: BehavioralSignal[],
  groupId: string,
  bucketStart: string
): BehavioralPattern[] => {
  const patterns: BehavioralPattern[] = [];

  // Only detect patterns for function and org levels
  const groupType = currentWeek[0]?.group_type;
  if (groupType !== "function" && groupType !== "org") {
    return patterns;
  }

  // Filter non-suppressed signals
  const validSignals = currentWeek.filter((s) => !s.suppressed && s.count > 0);
  const validPrevious = previousWeek.filter((s) => !s.suppressed && s.count > 0);
  const validLegacySignals = validSignals.filter(isLegacySignal);
  const validLegacyPrevious = validPrevious.filter(isLegacySignal);

  if (validLegacySignals.length === 0) {
    return patterns;
  }

  // Detect each pattern type
  const automationEmerging = detectAutomationEmerging(
    validLegacySignals,
    validLegacyPrevious,
    groupId,
    bucketStart
  );
  if (automationEmerging) {
    patterns.push(automationEmerging);
  }

  const approvalWorkflow = detectApprovalWorkflowMature(validLegacySignals, groupId, bucketStart);
  if (approvalWorkflow) {
    patterns.push(approvalWorkflow);
  }

  const crossSystem = detectCrossSystemIntegration(validLegacySignals, groupId, bucketStart);
  if (crossSystem) {
    patterns.push(crossSystem);
  }

  const humanReview = detectHumanReviewDominant(validLegacySignals, groupId, bucketStart);
  if (humanReview) {
    patterns.push(humanReview);
  }

  const dataIntensive = detectDataIntensive(validLegacySignals, groupId, bucketStart);
  if (dataIntensive) {
    patterns.push(dataIntensive);
  }

  return patterns;
};

/**
 * Get previous week's bucket_start from current week.
 * Assumes weekly buckets (7 days).
 */
export const getPreviousWeekBucket = (bucketStart: string): string => {
  const date = new Date(bucketStart);
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};
