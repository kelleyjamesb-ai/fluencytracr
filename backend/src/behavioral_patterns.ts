import { BehavioralPattern } from "@learnaire/shared";
import { BehavioralSignal } from "./behavioral_signals";

export const detectPatterns = (
  _currentWeek: BehavioralSignal[],
  _previousWeek: BehavioralSignal[],
  _groupId: string,
  _bucketStart: string
): BehavioralPattern[] => {
  return [];
};

export const getPreviousWeekBucket = (_currentBucket: string): string | null => {
  return null;
};
