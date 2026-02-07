import crypto from "crypto";

export const GENESIS_HASH = crypto.createHash("sha256").update("GENESIS").digest("hex");

/**
 * Deterministic JSON serialization: sorted keys, no whitespace.
 * Ensures identical payloads always produce identical hashes.
 */
export const canonicalize = (entry: Record<string, unknown>): string => {
  return JSON.stringify(entry, Object.keys(entry).sort());
};

/**
 * entry_hash = SHA256(previous_entry_hash || "||" || canonicalized_payload)
 */
export const computeEntryHash = (previousHash: string, canonicalPayload: string): string => {
  return crypto.createHash("sha256").update(previousHash + "||" + canonicalPayload).digest("hex");
};
