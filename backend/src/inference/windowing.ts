export type WindowSize = "30d" | "60d";

const windowDays: Record<WindowSize, number> = {
  "30d": 30,
  "60d": 60
};

export const windowBounds = (window: WindowSize, now = new Date()) => {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - windowDays[window]);
  return {
    window_start: start.toISOString(),
    window_end: end.toISOString()
  };
};

export const filterByWindow = <T extends { human_action_timestamp: string }>(
  events: T[],
  window: WindowSize,
  now = new Date()
) => {
  const start = new Date(now);
  start.setDate(start.getDate() - windowDays[window]);
  return events.filter((event) => {
    const ts = new Date(event.human_action_timestamp);
    return !Number.isNaN(ts.getTime()) && ts >= start && ts <= now;
  });
};
