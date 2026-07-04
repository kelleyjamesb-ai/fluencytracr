import { sha256Json } from "./internal/hashing";

export function inferenceProofArtifactSelfHashBody(artifact: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(artifact)) as {
    hash_bindings?: Record<string, unknown>;
  };
  if (clone.hash_bindings && typeof clone.hash_bindings === "object") {
    delete clone.hash_bindings.artifact_self_hash;
  }
  return clone;
}

export function inferenceProofArtifactSelfHash(artifact: unknown): string {
  return sha256Json(inferenceProofArtifactSelfHashBody(artifact));
}
