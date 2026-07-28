#!/usr/bin/env node

import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  createHash,
  sign
} from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import shared from "../shared/dist/index.js";

const {
  COHORT_PRODUCER_POLICY_VERSION,
  COHORT_PROOF_POLICY_VERSION,
  COHORT_PROOF_SCHEMA_VERSION,
  CohortEqualityProofSchema,
  cohortMemberSetBytes,
  cohortReservationBytes,
  outcomeEvidenceAdmissionReceiptBytes,
  outcomeEvidenceContentBytes,
  unsignedCohortProofBytes
} = shared;

const sha256Hex = (value) =>
  createHash("sha256").update(value).digest("hex");

const hmacSha256Hex = (key, value) =>
  createHmac("sha256", key).update(value).digest("hex");

const exactSlice = (metadata) => ({
  org_id: metadata.org_id,
  workflow_id: metadata.workflow_id,
  jbtd_id: metadata.jbtd_id,
  persona_id: metadata.persona_id
});

const evidenceMatchesMetadata = (record, metadata, window) =>
  record.org_id === metadata.org_id &&
  record.workflow_id === metadata.workflow_id &&
  record.jbtd_id === metadata.jbtd_id &&
  record.persona_id === metadata.persona_id &&
  record.outcome_metric === metadata.outcome_metric &&
  record.outcome_unit === metadata.outcome_unit &&
  record.source_system === metadata.source_system &&
  record.period_start === window.period_start &&
  record.period_end === window.period_end &&
  record.cohort_size === window.cohort_size;

const admissionMatches = (receipt, metadata, baselineEvidence, comparisonEvidence) =>
  receipt?.workflow_id === metadata.workflow_id &&
  receipt?.jbtd_id === metadata.jbtd_id &&
  receipt?.persona_id === metadata.persona_id &&
  receipt?.baseline_window?.period_start === metadata.baseline_window.period_start &&
  receipt?.baseline_window?.period_end === metadata.baseline_window.period_end &&
  receipt?.comparison_window?.period_start ===
    metadata.comparison_window.period_start &&
  receipt?.comparison_window?.period_end ===
    metadata.comparison_window.period_end &&
  Array.isArray(receipt?.baseline_window?.evidence_ids) &&
  receipt.baseline_window.evidence_ids.length === 1 &&
  receipt.baseline_window.evidence_ids[0] === baselineEvidence.evidence_id &&
  Array.isArray(receipt?.comparison_window?.evidence_ids) &&
  receipt.comparison_window.evidence_ids.length === 1 &&
  receipt.comparison_window.evidence_ids[0] === comparisonEvidence.evidence_id;

const privateEd25519Key = (privateKeyPem) => {
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("COHORT_PRODUCER_INVALID_SIGNING_KEY");
  }
  const publicKey = createPublicKey(privateKey);
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("COHORT_PRODUCER_INVALID_SIGNING_KEY");
  }
  return privateKey;
};

export const createCohortEqualityProof = ({
  metadata,
  baseline_members: baselineMembers,
  comparison_members: comparisonMembers,
  baseline_evidence: baselineEvidence,
  comparison_evidence: comparisonEvidence,
  admission_receipt: admissionReceipt,
  population_key: populationKey,
  private_key_pem: privateKeyPem
}) => {
  try {
    if (!(populationKey instanceof Uint8Array) || populationKey.byteLength < 32) {
      throw new Error("COHORT_PRODUCER_INVALID_POPULATION_KEY");
    }
    if (
      !Array.isArray(baselineMembers) ||
      !Array.isArray(comparisonMembers) ||
      baselineMembers.length !== metadata?.baseline_window?.cohort_size ||
      comparisonMembers.length !== metadata?.comparison_window?.cohort_size
    ) {
      throw new Error("COHORT_PRODUCER_CARDINALITY_MISMATCH");
    }
    if (
      !evidenceMatchesMetadata(
        baselineEvidence,
        metadata,
        metadata.baseline_window
      ) ||
      !evidenceMatchesMetadata(
        comparisonEvidence,
        metadata,
        metadata.comparison_window
      ) ||
      !admissionMatches(
        admissionReceipt,
        metadata,
        baselineEvidence,
        comparisonEvidence
      )
    ) {
      throw new Error("COHORT_PRODUCER_EVIDENCE_MISMATCH");
    }

    const slice = exactSlice(metadata);
    const baselineCommitment = hmacSha256Hex(
      populationKey,
      cohortMemberSetBytes(slice, baselineMembers)
    );
    const comparisonCommitment = hmacSha256Hex(
      populationKey,
      cohortMemberSetBytes(slice, comparisonMembers)
    );
    if (baselineCommitment !== comparisonCommitment) {
      throw new Error("COHORT_PRODUCER_POPULATION_MISMATCH");
    }

    const unsignedProof = {
      schema_version: COHORT_PROOF_SCHEMA_VERSION,
      proof_policy_version: COHORT_PROOF_POLICY_VERSION,
      producer_policy_version: COHORT_PRODUCER_POLICY_VERSION,
      proof_id: metadata.proof_id,
      org_id: metadata.org_id,
      producer_key_id: metadata.producer_key_id,
      authority_version: metadata.authority_version,
      issued_at: metadata.issued_at,
      expires_at: metadata.expires_at,
      workflow_id: metadata.workflow_id,
      jbtd_id: metadata.jbtd_id,
      persona_id: metadata.persona_id,
      outcome_metric: metadata.outcome_metric,
      outcome_unit: metadata.outcome_unit,
      source_system: metadata.source_system,
      baseline_window: {
        ...metadata.baseline_window,
        evidence_content_hash: sha256Hex(
          outcomeEvidenceContentBytes(baselineEvidence)
        )
      },
      comparison_window: {
        ...metadata.comparison_window,
        evidence_content_hash: sha256Hex(
          outcomeEvidenceContentBytes(comparisonEvidence)
        )
      },
      admission_receipt_hash: sha256Hex(
        outcomeEvidenceAdmissionReceiptBytes(admissionReceipt)
      ),
      population_commitment: baselineCommitment,
      reservation_key: sha256Hex(cohortReservationBytes(slice))
    };
    const signature = sign(
      null,
      unsignedCohortProofBytes(unsignedProof),
      privateEd25519Key(privateKeyPem)
    ).toString("base64url");
    return CohortEqualityProofSchema.parse({ ...unsignedProof, signature });
  } catch (error) {
    if (
      error instanceof Error &&
      /^COHORT_(?:PRODUCER|CODEC)_/.test(error.message)
    ) {
      throw error;
    }
    throw new Error("COHORT_PRODUCER_INVALID_INPUT");
  }
};

const scanJsonValue = (text, start) => {
  let index = start;
  while (/\s/.test(text[index] ?? "")) index += 1;
  if (text[index] === '"') {
    const stringStart = index;
    index += 1;
    while (index < text.length) {
      if (text[index] === "\\") {
        index += 2;
      } else if (text[index] === '"') {
        return { index: index + 1, value: JSON.parse(text.slice(stringStart, index + 1)) };
      } else {
        index += 1;
      }
    }
    throw new Error("COHORT_PRODUCER_INVALID_JSON");
  }
  if (text[index] === "{") {
    index += 1;
    const keys = new Set();
    while (true) {
      while (/\s/.test(text[index] ?? "")) index += 1;
      if (text[index] === "}") return { index: index + 1 };
      const key = scanJsonValue(text, index);
      if (typeof key.value !== "string") {
        throw new Error("COHORT_PRODUCER_INVALID_JSON");
      }
      if (keys.has(key.value)) {
        throw new Error("COHORT_PRODUCER_DUPLICATE_JSON_KEY");
      }
      keys.add(key.value);
      index = key.index;
      while (/\s/.test(text[index] ?? "")) index += 1;
      if (text[index] !== ":") throw new Error("COHORT_PRODUCER_INVALID_JSON");
      const nested = scanJsonValue(text, index + 1);
      index = nested.index;
      while (/\s/.test(text[index] ?? "")) index += 1;
      if (text[index] === "}") return { index: index + 1 };
      if (text[index] !== ",") throw new Error("COHORT_PRODUCER_INVALID_JSON");
      index += 1;
    }
  }
  if (text[index] === "[") {
    index += 1;
    while (true) {
      while (/\s/.test(text[index] ?? "")) index += 1;
      if (text[index] === "]") return { index: index + 1 };
      index = scanJsonValue(text, index).index;
      while (/\s/.test(text[index] ?? "")) index += 1;
      if (text[index] === "]") return { index: index + 1 };
      if (text[index] !== ",") throw new Error("COHORT_PRODUCER_INVALID_JSON");
      index += 1;
    }
  }
  const scalar = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
    text.slice(index)
  );
  if (!scalar) throw new Error("COHORT_PRODUCER_INVALID_JSON");
  return { index: index + scalar[0].length };
};

export const parseStrictProducerJson = (text) => {
  const scanned = scanJsonValue(text, 0);
  let index = scanned.index;
  while (/\s/.test(text[index] ?? "")) index += 1;
  if (index !== text.length) throw new Error("COHORT_PRODUCER_INVALID_JSON");
  return JSON.parse(text);
};

const cli = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  const inputPath = args.get("--input");
  const populationKeyPath = args.get("--population-key-file");
  const privateKeyPath = args.get("--private-key-file");
  if (!inputPath || !populationKeyPath || !privateKeyPath) {
    throw new Error("COHORT_PRODUCER_REQUIRED_FILES");
  }
  const input = parseStrictProducerJson(readFileSync(inputPath, "utf8"));
  const proof = createCohortEqualityProof({
    ...input,
    population_key: readFileSync(populationKeyPath),
    private_key_pem: readFileSync(privateKeyPath, "utf8")
  });
  process.stdout.write(`${JSON.stringify(proof)}\n`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    cli();
  } catch (error) {
    const code =
      error instanceof Error && /^COHORT_(?:PRODUCER|CODEC)_/.test(error.message)
        ? error.message
        : "COHORT_PRODUCER_FAILED";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}
