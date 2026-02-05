import type { Phase1Event } from "./contract";

const phase1Events: Phase1Event[] = [];

export const appendPhase1Events = (events: Phase1Event[]): void => {
  events.forEach((event) => {
    phase1Events.push(event);
  });
};

export const listPhase1Events = (): Phase1Event[] => {
  return [...phase1Events];
};

export const clearPhase1Events = (): void => {
  phase1Events.length = 0;
};
