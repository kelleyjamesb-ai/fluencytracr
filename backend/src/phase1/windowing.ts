export type WindowBounds = { start: Date; end: Date; lengthDays: number } | null;

const utcDate = (value: string) => new Date(`${value}T00:00:00Z`);

export const parseWindowId = (windowId: string): WindowBounds => {
  const parts = windowId.split("__");
  if (parts.length !== 2) {
    return null;
  }
  const [startRaw, endRaw] = parts;
  const start = utcDate(startRaw);
  const end = utcDate(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const lengthDays = diffDays + 1;
  if (lengthDays <= 0) {
    return null;
  }
  return { start, end, lengthDays };
};
