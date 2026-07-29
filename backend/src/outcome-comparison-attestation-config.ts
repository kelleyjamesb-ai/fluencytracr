const KEY_ID = /^FT_C1_HMAC_[A-Z0-9_]{1,48}$/;
const CANONICAL_SECRET = /^[A-Za-z0-9_-]{43}$/;

export type OutcomeComparisonAttestationConfig = {
  activeKeyId: string;
  keys: Map<string, string>;
};

const isCanonicalSecret = (value: unknown): value is string => {
  if (typeof value !== "string" || !CANONICAL_SECRET.test(value)) {
    return false;
  }
  try {
    const bytes = Buffer.from(value, "base64url");
    return bytes.length === 32 && bytes.toString("base64url") === value;
  } catch {
    return false;
  }
};

export const parseOutcomeComparisonAttestationConfig = (
  env: Record<string, string | undefined>
): OutcomeComparisonAttestationConfig | null => {
  const activeKeyId = env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID;
  if (!activeKeyId || !KEY_ID.test(activeKeyId)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(env.C1_CREATION_ATTESTATION_KEYS_JSON ?? "");
  } catch {
    return null;
  }
  if (
    !parsed ||
    Array.isArray(parsed) ||
    Object.getPrototypeOf(parsed) !== Object.prototype
  ) {
    return null;
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (
    entries.length === 0 ||
    entries.some(
      ([keyId, secret]) => !KEY_ID.test(keyId) || !isCanonicalSecret(secret)
    )
  ) {
    return null;
  }

  const keys = new Map(entries as Array<[string, string]>);
  if (!keys.has(activeKeyId)) {
    return null;
  }
  return { activeKeyId, keys };
};

export const resolveOutcomeComparisonAttestationSecret = (
  config: OutcomeComparisonAttestationConfig | null,
  keyId: string
): string | null => config?.keys.get(keyId) ?? null;

type AttestationReadinessClient = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

export const checkOutcomeComparisonAttestationConfigReadiness = async (
  client: AttestationReadinessClient,
  config: OutcomeComparisonAttestationConfig
): Promise<{ ok: boolean; diagnostics: string[] }> => {
  const entries = [...config.keys.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  try {
    const rows = await client.$queryRaw<
      Array<{ ok: boolean; diagnostics: string[] }>
    >(
      Prisma.sql`SELECT ok, diagnostics
                 FROM public.outcome_comparison_attestation_readiness(
                   ${config.activeKeyId},
                   ${entries.map(([keyId]) => keyId)}::text[],
                   ${entries.map(([, secret]) => secret)}::text[]
                 )`
    );
    return rows.length === 1 &&
      rows[0]?.ok === true &&
      Array.isArray(rows[0].diagnostics) &&
      rows[0].diagnostics.length === 0
      ? { ok: true, diagnostics: [] }
      : {
          ok: false,
          diagnostics:
            rows.length === 1 && Array.isArray(rows[0]?.diagnostics)
              ? rows[0].diagnostics
              : ["READINESS_INVALID"]
        };
  } catch {
    return { ok: false, diagnostics: ["READINESS_UNAVAILABLE"] };
  }
};

export const checkOutcomeComparisonAttestationReadiness = async (
  client: AttestationReadinessClient,
  env: Record<string, string | undefined>
): Promise<{ ok: boolean; diagnostics: string[] }> => {
  const config = parseOutcomeComparisonAttestationConfig(env);
  return config
    ? checkOutcomeComparisonAttestationConfigReadiness(client, config)
    : { ok: false, diagnostics: ["CONFIG_INVALID"] };
};
import { Prisma } from "@prisma/client";
