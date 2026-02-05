export const NON_COLLECTABLE_FIELDS = [
  "prompt_content",
  "output_content",
  "keystrokes",
  "file_names",
  "message_text",
  "raw_logs"
] as const;

export const GOVERNANCE_FORBIDDEN_FIELDS = [
  "rank",
  "index",
  "position",
  "percentile",
  "count",
  "sum",
  "avg",
  "average",
  "total",
  "rate",
  "ratio",
  "score",
  "points",
  "window_start",
  "window_end",
  "previous_window",
  "trend",
  "delta",
  "change",
  "top_k",
  "histogram",
  "distribution",
  "leaderboard"
] as const;

export const PERSON_IDENTIFIER_FIELDS = [
  "user_id",
  "userid",
  "userId",
  "email",
  "name",
  "full_name",
  "first_name",
  "last_name",
  "employee_id",
  "employeeId",
  "person_id",
  "username"
] as const;

export const FORBIDDEN_FIELDS = [
  ...NON_COLLECTABLE_FIELDS,
  ...GOVERNANCE_FORBIDDEN_FIELDS,
  ...PERSON_IDENTIFIER_FIELDS
] as const;

export function containsForbiddenFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const forbidden = new Set(
    (FORBIDDEN_FIELDS as readonly string[]).map((field) => field.toLowerCase())
  );
  const stack: unknown[] = [payload];

  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;

    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if (forbidden.has(k.toLowerCase())) return true;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return false;
}

export function containsPersonIdentifiers(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const normalized = new Set(PERSON_IDENTIFIER_FIELDS.map((field) => field.toLowerCase()));
  const stack: unknown[] = [payload];

  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;

    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if (normalized.has(k.toLowerCase())) return true;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return false;
}
