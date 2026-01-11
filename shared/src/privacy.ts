export const NON_COLLECTABLE_FIELDS = [
  "prompt_content",
  "output_content",
  "keystrokes",
  "file_names",
  "message_text",
  "raw_logs"
] as const;

export function containsForbiddenFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const stack: unknown[] = [payload];

  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;

    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if ((NON_COLLECTABLE_FIELDS as readonly string[]).includes(k)) return true;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return false;
}
