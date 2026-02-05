export type AmbiguityMatch = {
  path: string;
  key: string;
};

const formatPath = (base: string, segment: string | number) => {
  if (typeof segment === "number") {
    return `${base}[${segment}]`;
  }
  return base ? `${base}.${segment}` : segment;
};

export const findAmbiguitySignal = (payload: unknown): AmbiguityMatch | null => {
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
      if (key === "ambiguity_flag" && value === true) {
        return { path: formatPath(current.path, key), key };
      }
      if (key === "ambiguity_reason_code") {
        return { path: formatPath(current.path, key), key };
      }
      if (value && typeof value === "object") {
        stack.push({ value, path: formatPath(current.path, key) });
      }
    }
  }

  return null;
};
