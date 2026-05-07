import { FORBIDDEN_FIELDS as SHARED_FORBIDDEN_FIELDS } from "./privacy";

export const FORBIDDEN_FIELDS = SHARED_FORBIDDEN_FIELDS;

export type ForbiddenField = (typeof FORBIDDEN_FIELDS)[number];

const forbiddenSet = new Set<string>(
  (FORBIDDEN_FIELDS as readonly string[]).map((field) => field.toLowerCase())
);

export const containsForbiddenFields = (input: unknown): boolean => {
  if (!input) {
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => containsForbiddenFields(item));
  }
  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (forbiddenSet.has(key.toLowerCase())) {
        return true;
      }
      if (containsForbiddenFields(value)) {
        return true;
      }
    }
  }
  return false;
};
