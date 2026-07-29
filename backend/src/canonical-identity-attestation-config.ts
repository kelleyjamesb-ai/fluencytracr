import { aiValueEngine } from "@fluencytracr/shared";

const ACTIVE_WRITE_KEY_ID_ENV = "SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID";
const ACTIVE_WRITE_SECRET_ENV = "SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET";
const RETAINED_READ_KEYS_ENV = "SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON";
const CANONICAL_BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/;
const { CanonicalIdentityAttestationKeyIdSchema } = aiValueEngine;

type Environment = Record<string, string | undefined>;

export interface CanonicalIdentityAttestationConfig {
  activeWriteKeyId: string;
  activeWriteSecret: Buffer;
  retainedReadKeys: ReadonlyMap<string, Buffer>;
}

const decodeSecret = (encoded: unknown): Buffer | null => {
  if (typeof encoded !== "string" || !CANONICAL_BASE64URL_32_BYTES.test(encoded)) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64url");
    if (decoded.byteLength !== 32 || decoded.toString("base64url") !== encoded) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const parseRetainedKeys = (encoded: string): Map<string, Buffer> | null => {
  try {
    const parsed: unknown = JSON.parse(encoded);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      Object.getPrototypeOf(parsed) !== Object.prototype
    ) {
      return null;
    }

    const retained = new Map<string, Buffer>();
    for (const [keyId, encodedSecret] of Object.entries(parsed)) {
      if (!CanonicalIdentityAttestationKeyIdSchema.safeParse(keyId).success) {
        return null;
      }
      const secret = decodeSecret(encodedSecret);
      if (secret === null) {
        return null;
      }
      retained.set(keyId, secret);
    }
    return retained;
  } catch {
    return null;
  }
};

export const parseCanonicalIdentityAttestationConfig = (
  env: Environment = process.env
): CanonicalIdentityAttestationConfig | null => {
  const activeWriteKeyId = env[ACTIVE_WRITE_KEY_ID_ENV];
  const activeWriteSecret = decodeSecret(env[ACTIVE_WRITE_SECRET_ENV]);
  const retainedKeysJson = env[RETAINED_READ_KEYS_ENV];

  if (
    !CanonicalIdentityAttestationKeyIdSchema.safeParse(activeWriteKeyId).success ||
    activeWriteSecret === null ||
    retainedKeysJson === undefined
  ) {
    return null;
  }

  const retainedReadKeys = parseRetainedKeys(retainedKeysJson);
  if (retainedReadKeys === null || retainedReadKeys.has(activeWriteKeyId as string)) {
    return null;
  }

  const knownSecrets = new Set<string>([activeWriteSecret.toString("hex")]);
  for (const retainedSecret of retainedReadKeys.values()) {
    const encodedSecret = retainedSecret.toString("hex");
    if (knownSecrets.has(encodedSecret)) {
      return null;
    }
    knownSecrets.add(encodedSecret);
  }

  return {
    activeWriteKeyId: activeWriteKeyId as string,
    activeWriteSecret: Buffer.from(activeWriteSecret),
    retainedReadKeys
  };
};

export const canonicalIdentityAttestationWriteKey = (
  config: CanonicalIdentityAttestationConfig | null
): { keyId: string; secret: Buffer } | null =>
  config === null
    ? null
    : {
        keyId: config.activeWriteKeyId,
        secret: Buffer.from(config.activeWriteSecret)
      };

export const resolveCanonicalIdentityAttestationReadKey = (
  config: CanonicalIdentityAttestationConfig | null,
  keyId: string
): Buffer | null => {
  if (config === null) {
    return null;
  }
  if (keyId === config.activeWriteKeyId) {
    return Buffer.from(config.activeWriteSecret);
  }
  const retainedSecret = config.retainedReadKeys.get(keyId);
  return retainedSecret === undefined ? null : Buffer.from(retainedSecret);
};
