export const FORBIDDEN_FIELDS = [
  "user_id",
  "email",
  "name",
  "employee_id",
  "device_id",
  "session_id",
  "prompt",
  "prompt_text",
  "output",
  "output_text",
  "message_text",
  "file_name",
  "file_contents",
  "transcript"
] as const;

export type ForbiddenField = (typeof FORBIDDEN_FIELDS)[number];

const forbiddenSet = new Set<string>(FORBIDDEN_FIELDS);

export const containsForbiddenFields = (input: unknown): boolean => {
  if (!input) {
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => containsForbiddenFields(item));
  }
  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (forbiddenSet.has(key)) {
        return true;
      }
      if (containsForbiddenFields(value)) {
        return true;
      }
    }
  }
  return false;
};
