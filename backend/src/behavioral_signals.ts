import { BehavioralSignalAggregate, GroupType } from "@learnaire/shared";

export type BehavioralSignal = BehavioralSignalAggregate & {
  originalCount?: number;
  includesRollup?: boolean;
};

export const applySuppression = (
  _signals: BehavioralSignalAggregate[],
  _minGroupSize?: number
): BehavioralSignal[] => {
  return [];
};

export const suppressAndRollup = (
  _signals: BehavioralSignalAggregate[],
  _minGroupSize?: number
): BehavioralSignal[] => {
  return [];
};

export const getTeamCountInFunction = (_orgId: string, _functionId: string): number => {
  return 0;
};

export const getEmployeeCount = (_orgId: string, _groupId: string, _groupType: GroupType): number => {
  return 0;
};
