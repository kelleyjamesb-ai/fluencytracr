import { NON_COLLECTABLE_FIELDS, PERSON_IDENTIFIER_FIELDS } from "@fluencytracr/shared";

export const FORBIDDEN_KEYS: string[] = Array.from(
  new Set([...NON_COLLECTABLE_FIELDS, ...PERSON_IDENTIFIER_FIELDS])
);

const FORBIDDEN_KEY_SET = new Set(FORBIDDEN_KEYS.map((key) => key.toLowerCase()));

export type ForbiddenFieldMatch = {
  path: string;
  key: string;
};

const formatPath = (base: string, segment: string | number) => {
  if (typeof segment === "number") {
    return `${base}[${segment}]`;
  }
  return base ? `${base}.${segment}` : segment;
};

export const findForbiddenField = (payload: unknown): ForbiddenFieldMatch | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const stack: Array<{ value: unknown; path: string }> = [{ value: payload, path: "" }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !current.value || typeof current.value !== "object") {
      continue;
    }

    if (Array.isArray(current.value)) {
      current.value.forEach((item, index) => {
        stack.push({ value: item, path: formatPath(current.path, index) });
      });
      continue;
    }

    for (const [key, value] of Object.entries(current.value as Record<string, unknown>)) {
      if (FORBIDDEN_KEY_SET.has(key.toLowerCase())) {
        return {
          path: formatPath(current.path, key),
          key
        };
      }
      if (value && typeof value === "object") {
        stack.push({ value, path: formatPath(current.path, key) });
      }
    }
  }

  return null;
};
