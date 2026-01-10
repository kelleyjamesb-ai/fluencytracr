import crypto from "crypto";

export type EnablementEventType =
  | "assessment_pre"
  | "assessment_post"
  | "session_attended"
  | "everboarding_touch";

export type EnablementEventInput = {
  event_id?: string;
  org_id: string;
  team_id: string;
  role_id: string;
  timestamp: string;
  event_type: EnablementEventType;
  payload?: unknown;
};

export type ParsedEnablementRow = {
  raw: Record<string, string>;
  index: number;
};

export const generateEventId = () => `evt-${crypto.randomUUID()}`;

export const parseEnablementCsv = (csv: string): Record<string, string>[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
};

export const parsePayload = (payload: unknown): Record<string, unknown> => {
  if (payload === undefined || payload === null || payload === "") {
    return {};
  }
  if (typeof payload === "string") {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("Payload must be a JSON object");
  }
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  throw new Error("Payload must be a JSON object");
};
