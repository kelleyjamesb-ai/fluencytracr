import { BehavioralSignalAggregate, GroupType, SignalName, SUPPRESSION_THRESHOLDS } from "@learnaire/shared";
import { store } from "./store";

export type BehavioralSignal = BehavioralSignalAggregate & {
  originalCount?: number;  // Preserved original count before suppression
  includesRollup?: boolean;  // Indicates this record includes rolled-up small teams
};

/**
 * Get group size for suppression decision.
 * Uses team/role roster size to determine if group should be suppressed.
 */
const getGroupSize = (orgId: string, groupId: string, groupType: GroupType): number => {
  if (groupType === "org") {
    // Org-level never suppressed by group size
    return Number.MAX_SAFE_INTEGER;
  }

  if (groupType === "function") {
    // Functions are aggregates of teams - never suppress based on size
    // In production, would count all employees across teams mapped to this function
    return Number.MAX_SAFE_INTEGER;
  }

  if (groupType === "team") {
    // Count employees in this team
    const employeesInTeam = Array.from(store.employees.values()).filter(
      (emp) => emp.orgId === orgId && emp.teamIds.has(groupId)
    );
    return employeesInTeam.length;
  }

  if (groupType === "role") {
    // Count employees with this role
    const employeesWithRole = Array.from(store.employees.values()).filter(
      (emp) => emp.orgId === orgId && emp.roleIds.has(groupId)
    );
    return employeesWithRole.length;
  }

  return 0;
};

/**
 * Apply k-anonymity suppression to team and role level signals.
 * Function and org level signals are never suppressed by group size.
 */
export const applySuppression = (
  signals: BehavioralSignal[],
  minGroupSize = SUPPRESSION_THRESHOLDS.MIN_GROUP_SIZE_BEHAVIORAL
): BehavioralSignal[] => {
  return signals.map((signal) => {
    // Only suppress team and role levels
    if (signal.group_type !== "team" && signal.group_type !== "role") {
      return signal;
    }

    const groupSize = getGroupSize(signal.org_id, signal.group_id, signal.group_type);

    if (groupSize < minGroupSize) {
      return {
        ...signal,
        originalCount: signal.count,  // Preserve original for rollup
        count: 0,  // Set to 0 (will be filtered out in queries)
        suppressed: true
      };
    }

    return {
      ...signal,
      suppressed: false
    };
  });
};

/**
 * Build function-level rollups from team/role signals.
 * Includes counts from suppressed groups.
 */
const buildFunctionRollups = (
  signals: BehavioralSignal[],
  minGroupSize = SUPPRESSION_THRESHOLDS.MIN_GROUP_SIZE_BEHAVIORAL
): BehavioralSignal[] => {
  const rollupMap: Record<string, BehavioralSignal> = {};

  for (const signal of signals) {
    // Only rollup team and role signals that have a function_id
    if (!signal.function_id) {
      continue;
    }

    if (signal.group_type !== "team" && signal.group_type !== "role") {
      continue;
    }

    const key = `${signal.org_id}:${signal.function_id}:${signal.bucket_start}:${signal.signal_name}:${signal.tool_class ?? ""}`;

    if (!rollupMap[key]) {
      rollupMap[key] = {
        org_id: signal.org_id,
        group_id: signal.function_id,
        group_type: "function",
        bucket_start: signal.bucket_start,
        signal_name: signal.signal_name,
        count: 0,
        tool_class: signal.tool_class,
        suppressed: false,
        includesRollup: false,
        metadata: signal.metadata
      };
    }

    // Use originalCount if suppressed, otherwise use count
    const countToAdd = signal.suppressed ? (signal.originalCount ?? 0) : signal.count;
    rollupMap[key].count += countToAdd;

    // Mark as including rollup if any child was suppressed
    if (signal.suppressed) {
      rollupMap[key].includesRollup = true;
    }
  }

  // Apply suppression to function rollups themselves (if function is small)
  const rollups = Object.values(rollupMap);
  return rollups.map((rollup) => {
    const functionSize = getGroupSize(rollup.org_id, rollup.group_id, "function");
    if (functionSize < minGroupSize) {
      return {
        ...rollup,
        originalCount: rollup.count,
        count: 0,
        suppressed: true
      };
    }
    return rollup;
  });
};

/**
 * Build org-level rollups from all signals (team/role/function).
 * Includes counts from suppressed groups at all levels.
 */
const buildOrgRollups = (
  signals: BehavioralSignal[],
  functionRollups: BehavioralSignal[]
): BehavioralSignal[] => {
  const rollupMap: Record<string, BehavioralSignal> = {};

  // Combine all signals for org rollup
  const allSignals = [...signals, ...functionRollups];

  for (const signal of allSignals) {
    // Use function rollups as source (to avoid double-counting)
    if (signal.group_type === "function") {
      const key = `${signal.org_id}:${signal.bucket_start}:${signal.signal_name}:${signal.tool_class ?? ""}`;

      if (!rollupMap[key]) {
        rollupMap[key] = {
          org_id: signal.org_id,
          group_id: signal.org_id,  // Org ID serves as group ID
          group_type: "org",
          bucket_start: signal.bucket_start,
          signal_name: signal.signal_name,
          count: 0,
          tool_class: signal.tool_class,
          suppressed: false,
          includesRollup: false,
          metadata: signal.metadata
        };
      }

      // Use originalCount if suppressed, otherwise use count
      const countToAdd = signal.suppressed ? (signal.originalCount ?? 0) : signal.count;
      rollupMap[key].count += countToAdd;

      // Mark as including rollup if any child was suppressed
      if (signal.suppressed || signal.includesRollup) {
        rollupMap[key].includesRollup = true;
      }
    }
  }

  return Object.values(rollupMap);
};

/**
 * Apply suppression and create rollups for behavioral signals.
 *
 * Algorithm:
 * 1. Apply k-anonymity suppression to team/role signals
 * 2. Create function rollups (including suppressed team/role counts)
 * 3. Apply suppression to function rollups
 * 4. Create org rollups (including suppressed function counts)
 *
 * Returns all signals (original with suppressions + rollups).
 */
export const suppressAndRollup = (
  signals: BehavioralSignal[],
  minGroupSize = SUPPRESSION_THRESHOLDS.MIN_GROUP_SIZE_BEHAVIORAL
): BehavioralSignal[] => {
  // Step 1: Apply suppression to team/role signals
  const suppressed = applySuppression(signals, minGroupSize);

  // Step 2: Build function rollups (includes suppressed counts)
  const functionRollups = buildFunctionRollups(suppressed, minGroupSize);

  // Step 3: Build org rollups (includes all suppressed counts)
  const orgRollups = buildOrgRollups(suppressed, functionRollups);

  // Return all signals: original (suppressed) + function rollups + org rollups
  return [...suppressed, ...functionRollups, ...orgRollups];
};

/**
 * Get team count for a function (used for suppression checks).
 * Counts all teams that belong to the specified function.
 */
export const getTeamCountInFunction = (orgId: string, functionId: string): number => {
  return Array.from(store.teams.values()).filter(
    (team) => team.orgId === orgId && team.functionId === functionId
  ).length;
};

/**
 * Get employee count for a group (team or role).
 */
export const getEmployeeCount = (orgId: string, groupId: string, groupType: GroupType): number => {
  return getGroupSize(orgId, groupId, groupType);
};
