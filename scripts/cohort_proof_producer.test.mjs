import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  randomBytes,
  verify
} from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import shared from "../shared/dist/index.js";
import {
  createCohortEqualityProof,
  parseStrictProducerJson
} from "../transformer/cohort_proof_producer.mjs";

const {
  CohortEqualityProofSchema,
  unsignedCohortProofBytes
} = shared;

const members = ["member-a", "member-b", "member-c", "member-d", "member-e"];
const baselineEvidence = {
  org_id: "org_alpha",
  evidence_id: "evidence_baseline",
  workflow_id: "workflow:renewal",
  outcome_metric: "cycle_time",
  outcome_unit: "days",
  period_start: "2026-01-01T00:00:00.000Z",
  period_end: "2026-03-02T00:00:00.000Z",
  aggregate_value: 12.5,
  cohort_size: 5,
  source_system: "customer_crm",
  jbtd_id: "renewal",
  persona_id: "account_exec",
  aggregate_kind: "mean",
  source_attestation: { approved: true },
  ingested_at: "2026-03-03T00:00:00.000Z"
};
const comparisonEvidence = {
  ...baselineEvidence,
  evidence_id: "evidence_comparison",
  period_start: "2026-03-02T00:00:00.000Z",
  period_end: "2026-05-01T00:00:00.000Z",
  aggregate_value: 10.25,
  ingested_at: "2026-05-02T00:00:00.000Z"
};
const metadata = {
  proof_id: "proof_alpha",
  org_id: "org_alpha",
  producer_key_id: "producer_primary",
  authority_version: 1,
  issued_at: "2026-05-02T01:00:00.000Z",
  expires_at: "2026-05-02T01:15:00.000Z",
  workflow_id: "workflow:renewal",
  jbtd_id: "renewal",
  persona_id: "account_exec",
  outcome_metric: "cycle_time",
  outcome_unit: "days",
  source_system: "customer_crm",
  baseline_window: {
    period_start: baselineEvidence.period_start,
    period_end: baselineEvidence.period_end,
    cohort_size: 5
  },
  comparison_window: {
    period_start: comparisonEvidence.period_start,
    period_end: comparisonEvidence.period_end,
    cohort_size: 5
  }
};
const admissionReceipt = {
  policy_version: "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07",
  workflow_id: metadata.workflow_id,
  jbtd_id: metadata.jbtd_id,
  persona_id: metadata.persona_id,
  baseline_window: {
    period_start: baselineEvidence.period_start,
    period_end: baselineEvidence.period_end,
    evidence_ids: [baselineEvidence.evidence_id]
  },
  comparison_window: {
    period_start: comparisonEvidence.period_start,
    period_end: comparisonEvidence.period_end,
    evidence_ids: [comparisonEvidence.evidence_id]
  }
};

const fixture = () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    publicKey,
    input: {
      metadata,
      baseline_members: members,
      comparison_members: [...members].reverse(),
      baseline_evidence: baselineEvidence,
      comparison_evidence: comparisonEvidence,
      admission_receipt: admissionReceipt,
      population_key: randomBytes(32),
      private_key_pem: privateKey.export({ format: "pem", type: "pkcs8" })
    }
  };
};

test("producer creates a strict Ed25519 proof without member leakage", () => {
  const { input, publicKey } = fixture();
  const proof = createCohortEqualityProof(input);
  assert.equal(CohortEqualityProofSchema.safeParse(proof).success, true);
  const { signature, ...unsigned } = proof;
  assert.equal(
    verify(
      null,
      unsignedCohortProofBytes(unsigned),
      publicKey,
      Buffer.from(signature, "base64url")
    ),
    true
  );
  const output = JSON.stringify(proof);
  for (const member of members) assert.equal(output.includes(member), false);
  assert.equal(output.includes(String(input.private_key_pem)), false);
  assert.equal(output.includes(input.population_key.toString("hex")), false);
});

test("producer rejects unequal populations, count mismatch, and duplicate members", () => {
  const unequal = fixture().input;
  unequal.comparison_members = [...members.slice(0, 4), "member-x"];
  assert.throws(
    () => createCohortEqualityProof(unequal),
    /COHORT_PRODUCER_POPULATION_MISMATCH/
  );

  const wrongCount = fixture().input;
  wrongCount.comparison_members = members.slice(0, 4);
  assert.throws(
    () => createCohortEqualityProof(wrongCount),
    /COHORT_PRODUCER_CARDINALITY_MISMATCH/
  );

  const duplicate = fixture().input;
  duplicate.comparison_members = ["member-a", "member-a", "member-c", "member-d", "member-e"];
  assert.throws(
    () => createCohortEqualityProof(duplicate),
    /COHORT_CODEC_DUPLICATE_MEMBER/
  );
});

test("producer rejects wrong signing algorithms without echoing key material", () => {
  const input = fixture().input;
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  input.private_key_pem = privateKey.export({ format: "pem", type: "pkcs8" });
  assert.throws(
    () => createCohortEqualityProof(input),
    /COHORT_PRODUCER_INVALID_SIGNING_KEY/
  );
});

test("strict producer parser rejects duplicate raw JSON keys", () => {
  assert.throws(
    () => parseStrictProducerJson('{"metadata":{"org_id":"a","org_id":"b"}}'),
    /COHORT_PRODUCER_DUPLICATE_JSON_KEY/
  );
  assert.deepEqual(
    parseStrictProducerJson('{"metadata":{"org_id":"a"},"members":["b"]}'),
    { metadata: { org_id: "a" }, members: ["b"] }
  );
});

test("CLI success and failure transcripts never expose members or keys", () => {
  const directory = mkdtempSync(join(tmpdir(), "cohort-proof-cli-"));
  try {
    const success = fixture().input;
    const inputPath = join(directory, "input.json");
    const populationKeyPath = join(directory, "population.key");
    const privateKeyPath = join(directory, "private.pem");
    const {
      population_key: populationKey,
      private_key_pem: privateKeyPem,
      ...serializableInput
    } = success;
    writeFileSync(inputPath, JSON.stringify(serializableInput), { mode: 0o600 });
    writeFileSync(populationKeyPath, populationKey, { mode: 0o600 });
    writeFileSync(privateKeyPath, privateKeyPem, { mode: 0o600 });

    const run = (path = inputPath) =>
      spawnSync(
        process.execPath,
        [
          "transformer/cohort_proof_producer.mjs",
          "--input",
          path,
          "--population-key-file",
          populationKeyPath,
          "--private-key-file",
          privateKeyPath
        ],
        { cwd: process.cwd(), encoding: "utf8" }
      );
    const accepted = run();
    assert.equal(accepted.status, 0);
    assert.equal(accepted.stderr, "");
    assert.equal(CohortEqualityProofSchema.safeParse(JSON.parse(accepted.stdout)).success, true);

    const failedInputPath = join(directory, "failed.json");
    writeFileSync(
      failedInputPath,
      JSON.stringify({
        ...serializableInput,
        comparison_members: [...members.slice(0, 4), "member-secret-x"]
      }),
      { mode: 0o600 }
    );
    const rejected = run(failedInputPath);
    assert.notEqual(rejected.status, 0);
    assert.equal(rejected.stdout, "");
    assert.match(rejected.stderr, /^COHORT_PRODUCER_POPULATION_MISMATCH\n$/);

    const transcripts = `${accepted.stdout}${accepted.stderr}${rejected.stdout}${rejected.stderr}`;
    for (const member of [...members, "member-secret-x"]) {
      assert.equal(transcripts.includes(member), false);
    }
    assert.equal(transcripts.includes(populationKey.toString("hex")), false);
    assert.equal(transcripts.includes(String(privateKeyPem)), false);
    assert.deepEqual(
      readdirSync(directory).sort(),
      ["failed.json", "input.json", "population.key", "private.pem"]
    );
    assert.equal(readFileSync(populationKeyPath).equals(populationKey), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
