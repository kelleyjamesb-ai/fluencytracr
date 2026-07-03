import { createHash } from "node:crypto";

// Ported verbatim from the scripts/ spine helpers. The porting parity gates
// (openspec change add-confidence-engine-workspace) require these to be
// byte-equivalent: every artifact hash in the chain is
// sha256(stableStringify(object minus its own hash field)).

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Json(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function falseMap(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

export function selfHash(artifact: unknown, hashField: string): string {
  const clone = JSON.parse(JSON.stringify(artifact)) as Record<string, unknown>;
  delete clone[hashField];
  return sha256Json(clone);
}
