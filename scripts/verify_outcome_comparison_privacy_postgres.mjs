import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";
import { createCohortEqualityProof } from "../transformer/cohort_proof_producer.mjs";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const {
  commitCohortEqualityProof
} = require("../backend/dist/repositories/cohort-proof.repository.js");
const {
  acquireCohortProducerAuthorityLock,
  registerCohortProducerAuthority,
  revokeCohortProducerAuthority
} = require("../backend/dist/repositories/cohort-producer-authority.repository.js");
const {
  commitOutcomeComparisonPrivacyRelease,
  readOutcomeComparisonPrivacyRelease
} = require("../backend/dist/repositories/outcome-comparison-privacy.repository.js");
const comparisonPrivacyRepository = require(
  "../backend/dist/repositories/outcome-comparison-privacy.repository.js"
);
const {
  acquireOutcomeEvidenceFamilyLock,
  outcomeEvidenceFamilyLockKey,
  persistOutcomeEvidence
} = require("../backend/dist/repositories/outcome-evidence.repository.js");
const {
  exactOutcomeEvidenceSliceSegment
} = require("../backend/dist/outcome_evidence_admission_authority.js");
const {
  checkOutcomeComparisonAttestationStructureReadiness
} = require("../backend/dist/outcome-comparison-attestation-structure.js");
const { disconnectPrisma } = require("../backend/dist/db.js");

if (process.env.C1_VERIFY_EPHEMERAL_DATABASE !== "1") {
  throw new Error(
    "C.1 PostgreSQL verification is destructive test setup and requires C1_VERIFY_EPHEMERAL_DATABASE=1"
  );
}

const prisma = new PrismaClient();
const attestationKeyId = "FT_C1_HMAC_PRIMARY";
const attestationSecret =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";
const attestationSecretHash = crypto
  .createHash("sha256")
  .update(attestationSecret, "utf8")
  .digest("hex");
process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID = attestationKeyId;
process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
  [attestationKeyId]: attestationSecret
});
const configuredProvisionerPassword =
  process.env.C1_ATTESTATION_PROVISIONER_DATABASE_PASSWORD;
if (
  configuredProvisionerPassword &&
  !/^[A-Za-z0-9_-]{16,128}$/.test(configuredProvisionerPassword)
) {
  throw new Error(
    "C1_ATTESTATION_PROVISIONER_DATABASE_PASSWORD has invalid test shape"
  );
}
const provisionerPassword =
  configuredProvisionerPassword ?? crypto.randomBytes(24).toString("base64url");
await prisma.$executeRawUnsafe(
  `ALTER ROLE fluencytracr_c1_attestation_provisioner PASSWORD '${provisionerPassword}'`
);
const provisionerDatabaseUrl = new URL(process.env.DATABASE_URL);
provisionerDatabaseUrl.username = "fluencytracr_c1_attestation_provisioner";
provisionerDatabaseUrl.password = provisionerPassword;
const provisionerPrisma = new PrismaClient({
  datasources: { db: { url: provisionerDatabaseUrl.toString() } }
});
await provisionerPrisma.$transaction(async (transaction) => {
  await transaction.$executeRaw`
    SELECT pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0)
    )
  `;
  const keyRows = await transaction.$queryRaw`
    SELECT algorithm, secret_hash
    FROM public.outcome_comparison_attestation_keys
    WHERE key_id = ${attestationKeyId}
  `;
  if (keyRows.length === 0) {
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_keys
        (key_id, algorithm, secret_hash)
      VALUES (${attestationKeyId}, 'HMAC-SHA-256', ${attestationSecretHash})
    `;
  } else if (
    keyRows.length !== 1 ||
    keyRows[0].algorithm !== "HMAC-SHA-256" ||
    keyRows[0].secret_hash !== attestationSecretHash
  ) {
    throw new Error("C.1 verifier attestation key mismatch");
  }
  const activeRows = await transaction.$queryRaw`
    SELECT key_id
    FROM public.outcome_comparison_attestation_key_activations
    ORDER BY activation_epoch DESC
    LIMIT 1
  `;
  if (activeRows[0]?.key_id !== attestationKeyId) {
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_key_activations (key_id)
      VALUES (${attestationKeyId})
    `;
  }
});
const configuredRuntimePassword = process.env.C1_RUNTIME_DATABASE_PASSWORD;
if (
  configuredRuntimePassword &&
  !/^[A-Za-z0-9_-]{16,128}$/.test(configuredRuntimePassword)
) {
  throw new Error("C1_RUNTIME_DATABASE_PASSWORD has invalid test shape");
}
const runtimePassword =
  configuredRuntimePassword ?? crypto.randomBytes(24).toString("base64url");
await prisma.$executeRawUnsafe(
  `ALTER ROLE fluencytracr_c1_runtime PASSWORD '${runtimePassword}'`
);
const runtimeDatabaseUrl = new URL(process.env.DATABASE_URL);
runtimeDatabaseUrl.username = "fluencytracr_c1_runtime";
runtimeDatabaseUrl.password = runtimePassword;
const runtimePrisma = new PrismaClient({
  datasources: { db: { url: runtimeDatabaseUrl.toString() } }
});
const sliceERuntimePassword = crypto.randomBytes(24).toString("base64url");
await prisma.$executeRawUnsafe(
  `ALTER ROLE fluencytracr_slice_e_runtime PASSWORD '${sliceERuntimePassword}'`
);
const sliceERuntimeDatabaseUrl = new URL(process.env.DATABASE_URL);
sliceERuntimeDatabaseUrl.username = "fluencytracr_slice_e_runtime";
sliceERuntimeDatabaseUrl.password = sliceERuntimePassword;
process.env.SLICE_E_RUNTIME_DATABASE_URL =
  sliceERuntimeDatabaseUrl.toString();
process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID =
  "FT_E_HMAC_C1_VERIFY";
process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET =
  crypto.randomBytes(32).toString("base64url");
process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON =
  "{}";
const runId = crypto.randomUUID();
const attestationRaceSuffix = runId.replaceAll("-", "").slice(0, 8).toUpperCase();
const orgPrefix = `c1-postgres-${runId}`;
const verifierStartedAt = Date.now();
const ASSURANCE_WORKFLOW_ESTIMATE_MINUTES = 12;
const ASSURANCE_WORKFLOW_BUDGET_MINUTES = 15;
const FULL_ASSURANCE_WORKFLOW_BUDGET_MINUTES = 90;
const proofMembers = ["member-a", "member-b", "member-c", "member-d", "member-e"];
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 };
const hash = (label) =>
  crypto.createHash("sha256").update(`${orgPrefix}:${label}`).digest("hex");
const gate = (label, milliseconds = 12_000) => {
  let resolve;
  let reject;
  let settled = false;
  let timer;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
    timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        rejectPromise(new Error(`timed out waiting for gate: ${label}`));
      }
    }, milliseconds);
    timer.unref?.();
  });
  return {
    promise,
    resolve: (value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    },
    reject: (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    }
  };
};

const withTimeout = async (promise, label, milliseconds = 20_000) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timed out: ${label}`)),
          milliseconds
        );
        timer.unref?.();
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const waitForPidAdvisoryLock = async ({
  pid,
  lockKey,
  granted,
  label
}) => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS "matching"
      FROM "pg_locks"
      WHERE "locktype" = 'advisory'
        AND "pid" = $1
        AND "granted" = $2
        AND "database" = (
          SELECT "oid" FROM "pg_database" WHERE "datname" = current_database()
        )
        AND "classid" = (
          (pg_catalog.hashtextextended($3, 0) >> 32) & 4294967295
        )::oid
        AND "objid" = (
          pg_catalog.hashtextextended($3, 0) & 4294967295
        )::oid`,
      pid,
      granted,
      lockKey
    );
    if ((rows[0]?.matching ?? 0) === 1) return;
    await sleep(25);
  }
  throw new Error(
    `timed out waiting for ${label} pid=${pid} granted=${granted}`
  );
};

const assertPidLacksAdvisoryLock = async ({ pid, lockKey, label }) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS "matching"
     FROM "pg_locks"
     WHERE "locktype" = 'advisory'
       AND "pid" = $1
       AND "database" = (
         SELECT "oid" FROM "pg_database" WHERE "datname" = current_database()
       )
       AND "classid" = (
         (pg_catalog.hashtextextended($2, 0) >> 32) & 4294967295
       )::oid
       AND "objid" = (
         pg_catalog.hashtextextended($2, 0) & 4294967295
       )::oid`,
    pid,
    lockKey
  );
  if ((rows[0]?.matching ?? 0) !== 0) {
    throw new Error(`${label} unexpectedly acquired the higher lock`);
  }
};

const boundedTransaction = (operation) =>
  prisma.$transaction(operation, TRANSACTION_OPTIONS);

const observedTransactionClient = ({
  familyKey,
  onFamilyLock,
  onAttestationReadiness,
  onTransactionStart,
  mutateTransaction,
  baseClient = runtimePrisma
} = {}) =>
  new Proxy(baseClient, {
    get(target, property) {
      if (property === "$transaction") {
        return (operation, options = {}) =>
          target.$transaction(
            async (transaction) => {
              const pidRows = await transaction.$queryRawUnsafe(
                "SELECT pg_backend_pid()::int AS pid"
              );
              await onTransactionStart?.(pidRows[0].pid);
              let familyObserved = false;
              const wrapped = new Proxy(transaction, {
                get(transactionTarget, transactionProperty) {
                  if (transactionProperty === "$queryRaw") {
                    return async (...args) => {
                      const result =
                        await transactionTarget.$queryRaw(...args);
                      const sql = args[0]?.strings?.join(" ") ?? "";
                      if (
                        sql.includes(
                          "outcome_comparison_attestation_readiness"
                        )
                      ) {
                        await onAttestationReadiness?.({
                          pid: pidRows[0].pid,
                          transaction: wrapped
                        });
                      }
                      return result;
                    };
                  }
                  if (transactionProperty === "$executeRaw") {
                    return async (...args) => {
                      const result =
                        await transactionTarget.$executeRaw(...args);
                      const values = args[0]?.values ?? [];
                      if (
                        !familyObserved &&
                        familyKey &&
                        values.includes(familyKey)
                      ) {
                        familyObserved = true;
                        await onFamilyLock?.({
                          pid: pidRows[0].pid,
                          transaction: wrapped
                        });
                      }
                      return result;
                    };
                  }
                  const value = Reflect.get(
                    transactionTarget,
                    transactionProperty,
                    transactionTarget
                  );
                  return typeof value === "function"
                    ? value.bind(transactionTarget)
                    : value;
                }
              });
              const effective = mutateTransaction
                ? mutateTransaction(wrapped)
                : wrapped;
              return operation(effective);
            },
            {
              ...options,
              maxWait: TRANSACTION_OPTIONS.maxWait,
              timeout: TRANSACTION_OPTIONS.timeout
            }
          );
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
const boundedClient = observedTransactionClient();
const c0SetupClient = observedTransactionClient({ baseClient: prisma });

const setupScenario = async (
  label,
  { proofLifetimeMs = 10 * 60_000 } = {}
) => {
  const orgId = `${orgPrefix}-${label}`;
  const workflowId = "workflow:renewal";
  const jbtdId = "renewal";
  const personaId = "account_exec";
  const baseline = {
    workflow_id: workflowId,
    outcome_metric: "cycle_time",
    outcome_unit: "days",
    period_start: "2026-01-01T00:00:00.000Z",
    period_end: "2026-03-02T00:00:00.000Z",
    aggregate_value: 12.5,
    cohort_size: 5,
    source_system: "customer_crm",
    jbtd_id: jbtdId,
    persona_id: personaId,
    aggregate_kind: "mean",
    source_attestation: { approved: true }
  };
  const comparison = {
    ...baseline,
    period_start: "2026-03-02T00:00:00.000Z",
    period_end: "2026-05-01T00:00:00.000Z",
    aggregate_value: 10.25
  };
  const baselineId = crypto.randomUUID();
  const comparisonId = crypto.randomUUID();
  const acceptedAt = "2026-05-02T00:00:00.000Z";
  await boundedTransaction((transaction) =>
    persistOutcomeEvidence(
      orgId,
      baseline,
      baselineId,
      acceptedAt,
      transaction
    )
  );
  await boundedTransaction((transaction) =>
    persistOutcomeEvidence(
      orgId,
      comparison,
      comparisonId,
      acceptedAt,
      transaction
    )
  );
  const baselineRecord = {
    ...baseline,
    org_id: orgId,
    evidence_id: baselineId,
    ingested_at: acceptedAt
  };
  const comparisonRecord = {
    ...comparison,
    org_id: orgId,
    evidence_id: comparisonId,
    ingested_at: acceptedAt
  };
  const admissionReceipt = {
    policy_version: "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07",
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    baseline_window: {
      period_start: baseline.period_start,
      period_end: baseline.period_end,
      evidence_ids: [baselineId]
    },
    comparison_window: {
      period_start: comparison.period_start,
      period_end: comparison.period_end,
      evidence_ids: [comparisonId]
    }
  };
  const segment = exactOutcomeEvidenceSliceSegment({
    workflowId,
    jbtdId,
    personaId,
    baselineWindow: "2026-01-01_to_2026-03-02",
    comparisonWindow: "2026-03-02_to_2026-05-01"
  });
  const exportId = `outcome_export_${segment}_real_evidence_v1`;
  const readinessId = `readiness_${segment}_real_evidence_v1`;
  const createdAt = new Date("2026-05-02T00:00:00.000Z");
  const updatedAt = new Date("2026-05-02T00:30:00.000Z");
  await prisma.aiValueObject.createMany({
    data: [
      {
        orgId,
        objectType: "outcome_evidence_export",
        objectId: exportId,
        schemaVersion: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
        workflowFamily: workflowId,
        payloadJson: {
          schema_version: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
          export_id: exportId,
          org_id: orgId,
          workflow_family: workflowId,
          source_system: {
            source_type: "crm",
            source_name: baseline.source_system,
            approved_grain: "aggregate_workflow_window"
          },
          attestation: {
            exported_by_role: "customer_data_owner",
            approved_by_role: "customer_business_sponsor",
            export_date: "2026-05-02",
            contains_person_level_data: false,
            contains_raw_content: false
          },
          windows: {
            baseline: "2026-01-01_to_2026-03-02",
            comparison: "2026-03-02_to_2026-05-01"
          },
          admission: admissionReceipt,
          metrics: [
            {
              metric_id: baseline.outcome_metric,
              measurement_unit: baseline.outcome_unit,
              baseline_value: baseline.aggregate_value,
              comparison_value: comparison.aggregate_value,
              eligible_population: 5
            }
          ],
          review: {
            review_state: "ACCEPTED",
            reviewer_role: "ADMIN",
            reviewed_at: updatedAt.toISOString()
          }
        },
        validationJson: {
          admission_authoritative: true,
          admission_receipt: admissionReceipt
        },
        valid: true,
        createdAt,
        updatedAt
      },
      {
        orgId,
        objectType: "evidence_readiness",
        objectId: readinessId,
        schemaVersion: "FT_TEST_READINESS_V1",
        workflowFamily: workflowId,
        payloadJson: {
          source_refs: { outcome_evidence_export_id: exportId },
          workflow_family: workflowId
        },
        validationJson: {
          outcome_evidence_admission_authoritative: true,
          outcome_evidence_admission_receipt: admissionReceipt,
          outcome_evidence_export_id: exportId
        },
        valid: true,
        createdAt,
        updatedAt
      }
    ]
  });

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  const privatePem = privateKey.export({ format: "pem", type: "pkcs8" });
  if (!Buffer.isBuffer(publicDer) || typeof privatePem !== "string") {
    throw new Error("C.1 scenario key export failed");
  }
  const now = Date.now();
  const proofExpiresAt = new Date(now + proofLifetimeMs).toISOString();
  const authority = await registerCohortProducerAuthority(
    {
      org_id: orgId,
      producer_key_id: "producer_primary",
      authority_version: 1,
      public_key_der_base64: publicDer.toString("base64"),
      valid_from: new Date(now - 60_000).toISOString(),
      expires_at: new Date(now + 60 * 60_000).toISOString()
    },
    c0SetupClient
  );
  if (!authority) throw new Error("C.1 scenario authority registration failed");
  const proof = createCohortEqualityProof({
    metadata: {
      proof_id: `proof_${label}`,
      org_id: orgId,
      producer_key_id: "producer_primary",
      authority_version: 1,
      issued_at: new Date(now).toISOString(),
      expires_at: proofExpiresAt,
      workflow_id: workflowId,
      jbtd_id: jbtdId,
      persona_id: personaId,
      outcome_metric: baseline.outcome_metric,
      outcome_unit: baseline.outcome_unit,
      source_system: baseline.source_system,
      baseline_window: {
        period_start: baseline.period_start,
        period_end: baseline.period_end,
        cohort_size: 5
      },
      comparison_window: {
        period_start: comparison.period_start,
        period_end: comparison.period_end,
        cohort_size: 5
      }
    },
    baseline_members: proofMembers,
    comparison_members: [...proofMembers].reverse(),
    baseline_evidence: baselineRecord,
    comparison_evidence: comparisonRecord,
    admission_receipt: admissionReceipt,
    population_key: crypto.randomBytes(32),
    private_key_pem: privatePem
  });
  const c0 = await withTimeout(
    commitCohortEqualityProof(proof, c0SetupClient),
    `C.0 setup ${label}`
  );
  if (c0.decision !== "VERIFIED_PRIVACY_ONLY") {
    throw new Error(`C.0 setup did not verify for ${label}`);
  }
  return {
    orgId,
    workflowId,
    jbtdId,
    personaId,
    baseline,
    comparison,
    baselineId,
    comparisonId,
    proof,
    proofExpiresAt,
    slice: {
      org_id: orgId,
      workflow_id: workflowId,
      jbtd_id: jbtdId,
      persona_id: personaId
    },
    family: {
      orgId,
      workflowId,
      jbtdId,
      personaId
    }
  };
};

const assertSchemaPosture = async () => {
  const structural = await prisma.$queryRaw`
    SELECT
      to_regclass('public.outcome_comparison_privacy_releases') IS NOT NULL
        AS "release_table",
      EXISTS (
        SELECT 1 FROM "pg_trigger"
        WHERE "tgname" = 'outcome_comparison_privacy_releases_append_only'
          AND NOT "tgisinternal"
      ) AS "append_only_trigger",
      EXISTS (
        SELECT 1 FROM "pg_trigger"
        WHERE "tgname" = 'outcome_evidence_family_lock_before_mutation'
          AND NOT "tgisinternal"
      ) AS "family_lock_trigger",
      EXISTS (
        SELECT 1 FROM "pg_proc"
        WHERE "proname" = 'outcome_evidence_family_lock_key'
      ) AS "family_key_function",
      (
        SELECT "relrowsecurity"
        FROM "pg_class"
        WHERE "oid" = 'public.outcome_comparison_privacy_releases'::regclass
      ) AS "rls_enabled"
  `;
  if (
    structural.length !== 1 ||
    Object.values(structural[0]).some((value) => value !== true)
  ) {
    throw new Error(
      `C.1 table/trigger/readiness posture incomplete: ${JSON.stringify(structural[0])}`
    );
  }
  const indexes = await prisma.$queryRaw`
    SELECT "index_class"."relname" AS "index_name",
           "index"."indisunique" AS "is_unique",
           "index"."indisvalid" AS "is_valid"
    FROM "pg_index" AS "index"
    JOIN "pg_class" AS "index_class"
      ON "index_class"."oid" = "index"."indexrelid"
    WHERE "index_class"."relname" IN (
      'outcome_comparison_release_proof_journal_key',
      'outcome_comparison_release_reservation_key'
    )
  `;
  if (
    indexes.length !== 2 ||
    indexes.some((row) => !row.is_unique || !row.is_valid)
  ) {
    throw new Error("C.1 replay uniqueness indexes are missing or invalid");
  }
  const triggerRows = await prisma.$queryRaw`
    SELECT
      "trigger_row"."tgenabled" AS "enabled",
      "trigger_row"."tgtype"::int AS "trigger_type",
      "trigger_row"."tgattr"::text AS "trigger_columns",
      "trigger_row"."tgqual" IS NULL AS "has_no_when",
      "trigger_row"."tgnargs"::int AS "argument_count",
      "function_row"."proname" AS "function_name",
      "function_row"."prosecdef" AS "security_definer",
      "function_row"."provolatile" AS "volatility",
      "language_row"."lanname" AS "language",
      regexp_replace(
        "function_row"."prosrc",
        '[[:space:]]+',
        ' ',
        'g'
      ) AS "function_source"
    FROM "pg_trigger" AS "trigger_row"
    JOIN "pg_proc" AS "function_row"
      ON "function_row"."oid" = "trigger_row"."tgfoid"
    JOIN "pg_language" AS "language_row"
      ON "language_row"."oid" = "function_row"."prolang"
    WHERE "trigger_row"."tgname" =
      'outcome_evidence_family_lock_before_mutation'
      AND NOT "trigger_row"."tgisinternal"
  `;
  const expectedMutationSource = `
    DECLARE old_lock_key TEXT; new_lock_key TEXT; old_lock_id BIGINT;
    new_lock_id BIGINT; BEGIN IF TG_OP = 'INSERT' THEN new_lock_key :=
    public.outcome_evidence_family_lock_key( NEW.org_id, NEW.workflow_id,
    NEW.jbtd_id, NEW.persona_id ); PERFORM
    pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new_lock_key, 0) ); RETURN NEW; END IF;
    old_lock_key := public.outcome_evidence_family_lock_key( OLD.org_id,
    OLD.workflow_id, OLD.jbtd_id, OLD.persona_id ); IF TG_OP = 'DELETE'
    THEN PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(old_lock_key, 0) ); RETURN OLD; END IF;
    new_lock_key := public.outcome_evidence_family_lock_key( NEW.org_id,
    NEW.workflow_id, NEW.jbtd_id, NEW.persona_id ); old_lock_id :=
    pg_catalog.hashtextextended(old_lock_key, 0); new_lock_id :=
    pg_catalog.hashtextextended(new_lock_key, 0); IF old_lock_id <=
    new_lock_id THEN PERFORM pg_catalog.pg_advisory_xact_lock(old_lock_id);
    IF new_lock_id <> old_lock_id THEN PERFORM
    pg_catalog.pg_advisory_xact_lock(new_lock_id); END IF; ELSE PERFORM
    pg_catalog.pg_advisory_xact_lock(new_lock_id); PERFORM
    pg_catalog.pg_advisory_xact_lock(old_lock_id); END IF; RETURN NEW; END;
  `.replace(/\s+/g, " ").trim();
  const trigger = triggerRows[0];
  if (
    triggerRows.length !== 1 ||
    !["O", "A"].includes(trigger.enabled) ||
    trigger.trigger_type !== 31 ||
    trigger.trigger_columns !== "" ||
    !trigger.has_no_when ||
    trigger.argument_count !== 0 ||
    trigger.function_name !== "lock_outcome_evidence_family_mutation" ||
    trigger.security_definer ||
    trigger.volatility !== "v" ||
    trigger.language !== "plpgsql" ||
    trigger.function_source.trim() !== expectedMutationSource
  ) {
    throw new Error(
      `C.1 mutation trigger/function definition differs: ${JSON.stringify(trigger)}`
    );
  }
  const familyFunctionRows = await prisma.$queryRaw`
    SELECT
      "proc"."prosecdef" AS "security_definer",
      "proc"."provolatile" AS "volatility",
      "proc"."proparallel" AS "parallel",
      "proc"."proisstrict" AS "is_strict",
      "proc"."proconfig" AS "configuration",
      pg_catalog.oidvectortypes("proc"."proargtypes") AS "argument_types",
      pg_catalog.format_type("proc"."prorettype", NULL) AS "return_type",
      regexp_replace("proc"."prosrc", '[[:space:]]+', ' ', 'g') AS "function_source",
      "language_row"."lanname" AS "language"
    FROM "pg_proc" AS "proc"
    JOIN "pg_namespace" AS "namespace_row"
      ON "namespace_row"."oid" = "proc"."pronamespace"
    JOIN "pg_language" AS "language_row"
      ON "language_row"."oid" = "proc"."prolang"
    WHERE "namespace_row"."nspname" = 'public'
      AND "proc"."proname" = 'outcome_evidence_family_lock_key'
  `;
  const expectedKeySource =
    "SELECT '[' || pg_catalog.to_json('FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1'::TEXT)::TEXT || ',' || pg_catalog.to_json(org_id_value)::TEXT || ',' || pg_catalog.to_json(workflow_id_value)::TEXT || ',' || COALESCE(pg_catalog.to_json(jbtd_id_value)::TEXT, 'null') || ',' || COALESCE(pg_catalog.to_json(persona_id_value)::TEXT, 'null') || ']';";
  const familyFunction = familyFunctionRows[0];
  if (
    familyFunctionRows.length !== 1 ||
    familyFunction.security_definer ||
    familyFunction.volatility !== "i" ||
    familyFunction.parallel !== "s" ||
    familyFunction.is_strict ||
    familyFunction.argument_types !== "text, text, text, text" ||
    familyFunction.return_type !== "text" ||
    familyFunction.language !== "sql" ||
    familyFunction.function_source.trim() !== expectedKeySource ||
    JSON.stringify(familyFunction.configuration) !==
      JSON.stringify(["search_path=pg_catalog"])
  ) {
    throw new Error(
      `C.1 family key function definition differs: ${JSON.stringify(familyFunction)}`
    );
  }
  const constraints = await prisma.$queryRaw`
    SELECT
      "conname",
      "convalidated",
      pg_catalog.pg_get_constraintdef("oid", false) AS "definition"
    FROM "pg_constraint"
    WHERE "conrelid" = 'public.outcome_comparison_privacy_releases'::regclass
  `;
  const expectedConstraintDefinitions = {
    outcome_comparison_release_policy_check:
      "CHECK ((policy_version = 'FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07'::text))",
    outcome_comparison_release_decision_check:
      "CHECK ((decision = 'ATOMIC_COMPARISON_PRIVACY_RELEASED'::text))",
    outcome_comparison_release_identity_check:
      "CHECK (((org_id ~ '^[a-z0-9][a-z0-9:_-]{0,179}$'::text) AND (workflow_id ~ '^[a-z0-9][a-z0-9:_-]{0,179}$'::text) AND (jbtd_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'::text) AND (persona_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'::text)))",
    outcome_comparison_release_evidence_ids_check:
      "CHECK (((baseline_evidence_id ~ '^[a-z0-9][a-z0-9_-]{0,127}$'::text) AND (comparison_evidence_id ~ '^[a-z0-9][a-z0-9_-]{0,127}$'::text) AND (baseline_evidence_id <> comparison_evidence_id)))",
    outcome_comparison_release_descriptors_check:
      "CHECK ((((char_length(outcome_metric) >= 1) AND (char_length(outcome_metric) <= 180)) AND ((char_length(outcome_unit) >= 1) AND (char_length(outcome_unit) <= 80)) AND ((char_length(source_system) >= 1) AND (char_length(source_system) <= 120))))",
    outcome_comparison_release_hashes_check:
      "CHECK (((proof_hash ~ '^[0-9a-f]{64}$'::text) AND (reservation_key ~ '^[0-9a-f]{64}$'::text) AND (admission_receipt_hash ~ '^[0-9a-f]{64}$'::text) AND (baseline_evidence_hash ~ '^[0-9a-f]{64}$'::text) AND (comparison_evidence_hash ~ '^[0-9a-f]{64}$'::text) AND (projection_hash ~ '^[0-9a-f]{64}$'::text) AND (content_fingerprint ~ '^[0-9a-f]{64}$'::text)))",
    outcome_comparison_release_windows_check:
      "CHECK (((baseline_period_end > baseline_period_start) AND (comparison_period_end > comparison_period_start) AND (comparison_period_start >= baseline_period_end)))",
    outcome_comparison_release_cohort_sizes_check:
      "CHECK (((baseline_cohort_size >= 5) AND (comparison_cohort_size >= 5)))",
    outcome_comparison_release_values_check:
      "CHECK (((baseline_aggregate_value <> 'NaN'::double precision) AND (baseline_aggregate_value <> 'Infinity'::double precision) AND (baseline_aggregate_value <> '-Infinity'::double precision) AND (comparison_aggregate_value <> 'NaN'::double precision) AND (comparison_aggregate_value <> 'Infinity'::double precision) AND (comparison_aggregate_value <> '-Infinity'::double precision)))",
    outcome_comparison_release_non_authority_check:
      "CHECK (((comparison_privacy_only IS TRUE) AND (claim_authority_effect = 'NONE'::text) AND (claim_authorized IS FALSE) AND (model_authorized IS FALSE) AND (customer_publishable IS FALSE)))"
  };
  for (const [name, definition] of Object.entries(
    expectedConstraintDefinitions
  )) {
    const row = constraints.find((candidate) => candidate.conname === name);
    if (!row || !row.convalidated || row.definition !== definition) {
      throw new Error(
        `C.1 constraint ${name} differs: ${JSON.stringify(row)}`
      );
    }
  }
};

const assertFamilyKeyParity = async () => {
  const cases = [
    {
      orgId: "org_alpha",
      workflowId: "workflow:renewal",
      jbtdId: "renewal",
      personaId: "account_exec"
    },
    {
      orgId: "org_alpha",
      workflowId: "workflow:renewal",
      jbtdId: null,
      personaId: null
    },
    {
      orgId: 'org_"quoted"',
      workflowId: "workflow:\\escaped\nline",
      jbtdId: "job\tvalue",
      personaId: "persona_é"
    }
  ];
  for (const family of cases) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT public.outcome_evidence_family_lock_key($1, $2, $3, $4)
         AS "lock_key"`,
      family.orgId,
      family.workflowId,
      family.jbtdId,
      family.personaId
    );
    if (rows[0]?.lock_key !== outcomeEvidenceFamilyLockKey(family)) {
      throw new Error(`family key parity failed for ${JSON.stringify(family)}`);
    }
  }
};

const assertLiveReadiness = async () => {
  const marker = "C1_RUNTIME_READINESS_RESPONSE=";
  const childProgram = `
    const request = require("supertest");
    const { app } = require("./backend/dist/app.js");
    const { disconnectPrisma } = require("./backend/dist/db.js");
    request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "ops_readiness" })
      .then(async (response) => {
        console.log(${JSON.stringify(marker)} + JSON.stringify({
          status: response.status,
          body: response.body
        }));
        await disconnectPrisma();
      })
      .catch(async (error) => {
        console.error(error);
        await disconnectPrisma();
        process.exitCode = 1;
      });
  `;
  const { stdout } = await withTimeout(
    execFileAsync(
      process.execPath,
      ["--input-type=commonjs", "--eval", childProgram],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          DIRECT_URL: process.env.DIRECT_URL,
          C1_RUNTIME_DATABASE_URL: runtimeDatabaseUrl.toString(),
          DEV_HEADER_AUTH: "true",
          NODE_ENV: "development"
        },
        maxBuffer: 4 * 1024 * 1024
      }
    ),
    "live direct-runtime /ops/db/readiness"
  );
  const responseLine = stdout
    .split("\n")
    .find((line) => line.startsWith(marker));
  if (!responseLine) {
    throw new Error("direct-runtime readiness process omitted its response");
  }
  const response = JSON.parse(responseLine.slice(marker.length));
  if (response.status !== 200 || response.body.status !== "ready") {
    throw new Error(
      `installed schema readiness failed: ${response.status} ${JSON.stringify(response.body)}`
    );
  }
  for (const field of [
    "required_tables",
    "required_columns",
    "required_guards",
    "required_constraints",
    "required_indexes",
    "required_security"
  ]) {
    if (!Array.isArray(response.body[field])) {
      throw new Error(`readiness omitted ${field}`);
    }
  }
};

const rawInsertEvidence = async (client, scenario, evidenceId) => {
  await client.$executeRawUnsafe(
    `INSERT INTO public.outcome_evidence (
       evidence_id, org_id, workflow_id, outcome_metric, outcome_unit,
       period_start, period_end, aggregate_value, cohort_size, source_system,
       jbtd_id, persona_id, aggregate_kind, source_attestation, ingested_at
     ) VALUES (
       $1::uuid, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, $9, $10,
       $11, $12, $13, $14::jsonb, $15::timestamp
     )`,
    evidenceId,
    scenario.orgId,
    scenario.workflowId,
    scenario.baseline.outcome_metric,
    scenario.baseline.outcome_unit,
    scenario.baseline.period_start,
    scenario.baseline.period_end,
    99,
    5,
    scenario.baseline.source_system,
    scenario.jbtdId,
    scenario.personaId,
    "mean",
    JSON.stringify({ approved: true }),
    "2026-05-03T00:00:00.000Z"
  );
};

const assertReleased = async (result, scenario, label) => {
  if (
    result.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
    result.projection.org_id !== scenario.orgId ||
    result.projection.baseline_window.aggregate_value !== 12.5 ||
    result.projection.comparison_window.aggregate_value !== 10.25 ||
    result.receipt.claim_authorized !== false ||
    result.receipt.model_authorized !== false ||
    result.receipt.customer_publishable !== false
  ) {
    throw new Error(`${label} did not return the exact atomic projection`);
  }
  const rows = await prisma.outcomeComparisonPrivacyRelease.findMany({
    where: { orgId: scenario.orgId }
  });
  if (
    rows.length !== 1 ||
    rows[0].id !== result.receipt.release_id ||
    rows[0].projectionHash !== result.receipt.projection_hash
  ) {
    throw new Error(`${label} did not persist exactly one matching release`);
  }
};

const directMutation = async (
  transaction,
  scenario,
  verb,
  { evidenceId, newWorkflowId } = {}
) => {
  if (verb === "INSERT") {
    await rawInsertEvidence(
      transaction,
      scenario,
      evidenceId ?? crypto.randomUUID()
    );
  } else if (verb === "UPDATE" && newWorkflowId) {
    await transaction.$executeRawUnsafe(
      `UPDATE public.outcome_evidence
       SET workflow_id = $2
       WHERE evidence_id = $1::uuid`,
      scenario.baselineId,
      newWorkflowId
    );
  } else if (verb === "UPDATE") {
    await transaction.$executeRawUnsafe(
      `UPDATE public.outcome_evidence
       SET aggregate_value = aggregate_value + 1
       WHERE evidence_id = $1::uuid`,
      scenario.baselineId
    );
  } else {
    await transaction.$executeRawUnsafe(
      `DELETE FROM public.outcome_evidence WHERE evidence_id = $1::uuid`,
      scenario.baselineId
    );
  }
};

const assertPostMutationState = async (
  scenario,
  verb,
  { evidenceId, newWorkflowId } = {}
) => {
  if (verb === "INSERT") {
    const inserted = await prisma.v1OutcomeEvidence.findUnique({
      where: { evidenceId }
    });
    if (!inserted || inserted.aggregateValue !== 99) {
      throw new Error("direct INSERT did not commit after C.1");
    }
  } else if (verb === "UPDATE") {
    const updated = await prisma.v1OutcomeEvidence.findUnique({
      where: { evidenceId: scenario.baselineId }
    });
    if (
      !updated ||
      (newWorkflowId
        ? updated.workflowId !== newWorkflowId
        : updated.aggregateValue !== 13.5)
    ) {
      throw new Error("direct UPDATE did not commit after C.1");
    }
  } else if (
    await prisma.v1OutcomeEvidence.findUnique({
      where: { evidenceId: scenario.baselineId }
    })
  ) {
    throw new Error("direct DELETE did not commit after C.1");
  }
};

const findMovingFamily = async (scenario, relation) => {
  const oldKey = outcomeEvidenceFamilyLockKey(scenario.family);
  const oldHashRows = await prisma.$queryRawUnsafe(
    `SELECT pg_catalog.hashtextextended($1, 0) AS "lock_id"`,
    oldKey
  );
  const oldLockId = oldHashRows[0].lock_id;
  for (let index = 0; index < 200; index += 1) {
    const workflowId = `workflow:move_${relation}_${index}`;
    const family = { ...scenario.family, workflowId };
    const key = outcomeEvidenceFamilyLockKey(family);
    const rows = await prisma.$queryRawUnsafe(
      `SELECT pg_catalog.hashtextextended($1, 0) AS "lock_id"`,
      key
    );
    if (
      (relation === "before" && rows[0].lock_id < oldLockId) ||
      (relation === "after" && rows[0].lock_id > oldLockId)
    ) {
      return { workflowId, key, lockId: rows[0].lock_id, oldKey, oldLockId };
    }
  }
  throw new Error(`could not find deterministic ${relation} family key`);
};

const settleRace = async (promises, label) => {
  await withTimeout(Promise.allSettled(promises.filter(Boolean)), label, 8_000);
};

const assertC1FirstMutationRace = async (
  verb,
  { movingRelation } = {}
) => {
  const suffix = movingRelation ? `-move-${movingRelation}` : "";
  const scenario = await setupScenario(
    `c1-first-${verb.toLowerCase()}${suffix}`
  );
  const oldKey = outcomeEvidenceFamilyLockKey(scenario.family);
  const familyHeld = gate(`${verb}${suffix} C.1 family held`);
  const continueC1 = gate(`${verb}${suffix} continue C.1`);
  const writerStarted = gate(`${verb}${suffix} writer started`);
  const evidenceId = crypto.randomUUID();
  const moving = movingRelation
    ? await findMovingFamily(scenario, movingRelation)
    : null;
  let commitPromise;
  let writerPromise;
  try {
    const client = observedTransactionClient({
      familyKey: oldKey,
      onFamilyLock: async ({ pid }) => {
        familyHeld.resolve(pid);
        await continueC1.promise;
      }
    });
    commitPromise = commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      client
    );
    await familyHeld.promise;
    writerPromise = boundedTransaction(async (transaction) => {
      const pidRows = await transaction.$queryRawUnsafe(
        "SELECT pg_backend_pid()::int AS pid"
      );
      writerStarted.resolve(pidRows[0].pid);
      await directMutation(transaction, scenario, verb, {
        evidenceId,
        newWorkflowId: moving?.workflowId
      });
    });
    const writerPid = await writerStarted.promise;
    await waitForPidAdvisoryLock({
      pid: writerPid,
      lockKey: oldKey,
      granted: false,
      label: `${verb}${suffix} writer waits on old family`
    });
    if (moving && moving.lockId < moving.oldLockId) {
      await waitForPidAdvisoryLock({
        pid: writerPid,
        lockKey: moving.key,
        granted: true,
        label: `${verb}${suffix} writer acquires lower new family first`
      });
    } else if (moving) {
      await assertPidLacksAdvisoryLock({
        pid: writerPid,
        lockKey: moving.key,
        label: `${verb}${suffix} writer waits on lower old family first`
      });
    }
    continueC1.resolve();
    const [result] = await withTimeout(
      Promise.all([commitPromise, writerPromise]),
      `${verb}${suffix} actual C.1-first race`
    );
    await assertReleased(result, scenario, `${verb}${suffix} C.1-first`);
    await assertPostMutationState(scenario, verb, {
      evidenceId,
      newWorkflowId: moving?.workflowId
    });
    const replay = await withTimeout(
      commitOutcomeComparisonPrivacyRelease(
        scenario.proof,
        scenario.slice,
        boundedClient
      ),
      `${verb}${suffix} post-mutation replay`
    );
    if (replay.decision !== "HOLD") {
      throw new Error(`${verb}${suffix} stale post-mutation replay released`);
    }
  } finally {
    continueC1.resolve();
    writerStarted.resolve(-1);
    await settleRace(
      [commitPromise, writerPromise],
      `${verb}${suffix} C.1-first cleanup`
    );
  }
};

const assertWriterFirstMutationRace = async (verb) => {
  const scenario = await setupScenario(
    `writer-first-${verb.toLowerCase()}`
  );
  const oldKey = outcomeEvidenceFamilyLockKey(scenario.family);
  const evidenceId = crypto.randomUUID();
  let commitPromise;
  let writerPromise;

  if (verb === "INSERT") {
    const writerInserted = gate("writer-first INSERT statement complete");
    const releaseWriter = gate("writer-first INSERT release writer");
    const commitStarted = gate("writer-first INSERT C.1 transaction started");
    try {
      writerPromise = boundedTransaction(async (transaction) => {
        await rawInsertEvidence(transaction, scenario, evidenceId);
        writerInserted.resolve();
        await releaseWriter.promise;
      });
      await writerInserted.promise;
      const client = observedTransactionClient({
        familyKey: oldKey,
        onTransactionStart: async (pid) => commitStarted.resolve(pid)
      });
      commitPromise = commitOutcomeComparisonPrivacyRelease(
        scenario.proof,
        scenario.slice,
        client
      );
      const commitPid = await commitStarted.promise;
      await waitForPidAdvisoryLock({
        pid: commitPid,
        lockKey: oldKey,
        granted: false,
        label: "writer-first INSERT blocks actual C.1"
      });
      releaseWriter.resolve();
      const [result] = await withTimeout(
        Promise.all([commitPromise, writerPromise]),
        "writer-first INSERT actual race"
      );
      if (
        result.decision !== "HOLD" ||
        (await prisma.outcomeComparisonPrivacyRelease.count({
          where: { orgId: scenario.orgId }
        })) !== 0
      ) {
        throw new Error(
          "writer-first committed INSERT was admitted by actual C.1"
        );
      }
      await assertPostMutationState(scenario, verb, { evidenceId });
    } finally {
      releaseWriter.resolve();
      commitStarted.resolve(-1);
      await settleRace(
        [commitPromise, writerPromise],
        "writer-first INSERT cleanup"
      );
    }
    return;
  }

  const rowLocked = gate(`writer-first ${verb} row locked`);
  const startMutation = gate(`writer-first ${verb} start mutation`);
  const familyHeld = gate(`writer-first ${verb} C.1 family held`);
  const continueC1 = gate(`writer-first ${verb} continue C.1`);
  const writerPidGate = gate(`writer-first ${verb} writer pid`);
  try {
    writerPromise = boundedTransaction(async (transaction) => {
      const pidRows = await transaction.$queryRawUnsafe(
        "SELECT pg_backend_pid()::int AS pid"
      );
      writerPidGate.resolve(pidRows[0].pid);
      await transaction.$queryRawUnsafe(
        `SELECT evidence_id
         FROM public.outcome_evidence
         WHERE evidence_id = $1::uuid
         FOR UPDATE`,
        scenario.baselineId
      );
      rowLocked.resolve();
      await startMutation.promise;
      await directMutation(transaction, scenario, verb);
    });
    await rowLocked.promise;
    const client = observedTransactionClient({
      familyKey: oldKey,
      onFamilyLock: async () => {
        familyHeld.resolve();
        await continueC1.promise;
      }
    });
    commitPromise = commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      client
    );
    await familyHeld.promise;
    startMutation.resolve();
    const writerPid = await writerPidGate.promise;
    await waitForPidAdvisoryLock({
      pid: writerPid,
      lockKey: oldKey,
      granted: false,
      label: `writer-first ${verb} row owner waits on family`
    });
    continueC1.resolve();
    const [result] = await withTimeout(
      Promise.all([commitPromise, writerPromise]),
      `writer-first ${verb} actual race`
    );
    await assertReleased(result, scenario, `writer-first ${verb}`);
    await assertPostMutationState(scenario, verb);
  } finally {
    startMutation.resolve();
    continueC1.resolve();
    await settleRace(
      [commitPromise, writerPromise],
      `writer-first ${verb} cleanup`
    );
  }
};

const assertRestrictedRolePosture = async () => {
  const publicGrants = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "grant_count"
    FROM "pg_class" AS "table_row",
         LATERAL pg_catalog.aclexplode(
           COALESCE(
             "table_row"."relacl",
             pg_catalog.acldefault('r', "table_row"."relowner")
           )
         ) AS "grant_row"
    WHERE "table_row"."oid" =
      'public.outcome_comparison_privacy_releases'::regclass
      AND "grant_row"."grantee" = 0
  `;
  if ((publicGrants[0]?.grant_count ?? 0) !== 0) {
    throw new Error("PUBLIC retains C.1 table privileges");
  }
  for (const role of [
    "fluencytracr_c1_runtime",
    "fluencytracr_c1_attestation_provisioner"
  ]) {
    const schemaPrivilege = await prisma.$queryRawUnsafe(
      `SELECT pg_catalog.has_schema_privilege(
         $1,
         'public',
         'CREATE'
       ) AS "has_create"`,
      role
    );
    if (schemaPrivilege[0]?.has_create) {
      throw new Error(`${role} retains public-schema CREATE privilege`);
    }
  }
  for (const role of ["anon", "authenticated"]) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT EXISTS (
         SELECT 1 FROM pg_roles WHERE rolname = $1
       ) AS "exists"`,
      role
    );
    if (!rows[0]?.exists) {
      throw new Error(
        `${role} must exist before schema/post-push installation`
      );
    }
    const privilege = await prisma.$queryRawUnsafe(
      `SELECT has_table_privilege(
         $1,
         'public.outcome_comparison_privacy_releases',
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
       ) AS "has_privilege"`,
      role
    );
    if (privilege[0]?.has_privilege) {
      throw new Error(`${role} has C.1 table privilege`);
    }
    let denied = false;
    try {
      await boundedTransaction(async (transaction) => {
        await transaction.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`);
        await transaction.$queryRawUnsafe(
          "SELECT * FROM public.outcome_comparison_privacy_releases LIMIT 1"
        );
      });
    } catch {
      denied = true;
    }
    if (!denied) throw new Error(`${role} C.1 read unexpectedly succeeded`);
  }
};

const expectDatabaseRejection = async (label, operation, expectedPattern) => {
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!expectedPattern.test(message)) {
      throw new Error(`${label} rejected for the wrong reason: ${message}`);
    }
    return;
  }
  throw new Error(`${label} unexpectedly succeeded`);
};

const cloneReleaseWithNewId = async (transaction, releaseId) => {
  await transaction.$executeRawUnsafe(
    `INSERT INTO public.outcome_comparison_privacy_releases
     SELECT (clone.release_row).*
     FROM (
       SELECT pg_catalog.jsonb_populate_record(
         NULL::public.outcome_comparison_privacy_releases,
         pg_catalog.to_jsonb(source_row)
           || pg_catalog.jsonb_build_object(
                'id', $2::text,
                'creation_attestation', pg_catalog.repeat('0', 64)
              )
       ) AS release_row
       FROM public.outcome_comparison_privacy_releases AS source_row
       WHERE source_row.id = $1::uuid
     ) AS clone`,
    releaseId,
    crypto.randomUUID()
  );
};

const assertCreationAttestationAdversarialPosture = async () => {
  const scenario = await setupScenario("creation-attestation-adversarial");
  const committed = await commitOutcomeComparisonPrivacyRelease(
    scenario.proof,
    scenario.slice,
    boundedClient
  );
  await assertReleased(
    committed,
    scenario,
    "creation-attestation adversarial setup"
  );

  for (const tableName of [
    "outcome_comparison_attestation_keys",
    "outcome_comparison_attestation_key_activations",
    "outcome_comparison_attestation_key_revocations"
  ]) {
    await expectDatabaseRejection(
      `runtime read of ${tableName}`,
      () =>
        runtimePrisma.$queryRawUnsafe(
          `SELECT * FROM public.${tableName} LIMIT 1`
        ),
      /permission denied|insufficient privilege/i
    );
  }

  await expectDatabaseRejection(
    "missing-secret raw release clone",
    () =>
      runtimePrisma.$transaction((transaction) =>
        cloneReleaseWithNewId(transaction, committed.receipt.release_id)
      ),
    /creation attestation is unavailable|attestation key configuration is missing|creation attestation failed/i
  );
  await expectDatabaseRejection(
    "wrong-secret raw release clone",
    () =>
      runtimePrisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe(
          "SELECT pg_catalog.set_config('fluencytracr.c1_attestation_key_id', $1, true)",
          attestationKeyId
        );
        await transaction.$executeRawUnsafe(
          "SELECT pg_catalog.set_config('fluencytracr.c1_attestation_secret', $1, true)",
          "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM"
        );
        await cloneReleaseWithNewId(
          transaction,
          committed.receipt.release_id
        );
      }),
    /creation attestation authority rejected|creation attestation failed/i
  );
  const releaseCount = await prisma.outcomeComparisonPrivacyRelease.count({
    where: {
      orgId: scenario.orgId,
      proofJournalId: committed.receipt.proof_journal_id
    }
  });
  if (releaseCount !== 1) {
    throw new Error("failed raw attestation attempts occupied a release key");
  }

  await expectDatabaseRejection(
    "owner SET ROLE runtime masquerade",
    () =>
      prisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe(
          "SET LOCAL ROLE fluencytracr_c1_runtime"
        );
        await transaction.$executeRawUnsafe(
          "SELECT pg_catalog.set_config('fluencytracr.c1_attestation_key_id', $1, true)",
          attestationKeyId
        );
        await transaction.$executeRawUnsafe(
          "SELECT pg_catalog.set_config('fluencytracr.c1_attestation_secret', $1, true)",
          attestationSecret
        );
        await cloneReleaseWithNewId(
          transaction,
          committed.receipt.release_id
        );
      }),
    /direct runtime login|permission denied to set role/i
  );

  await expectDatabaseRejection(
    "runtime AI Value update",
    () =>
      runtimePrisma.$executeRawUnsafe(
        `UPDATE public.ai_value_objects
         SET updated_at = updated_at
         WHERE org_id = $1`,
        scenario.orgId
      ),
    /lock-only/i
  );

  const runtimeReadableRows = await runtimePrisma.$queryRawUnsafe(
    `SELECT
       (
         SELECT COUNT(*)::int
         FROM public.outcome_evidence
         WHERE org_id = $1
       ) AS evidence_count,
       (
         SELECT COUNT(*)::int
         FROM public.ai_value_objects
         WHERE org_id = $1
       ) AS ai_value_count`,
    scenario.orgId
  );
  if (
    runtimeReadableRows[0]?.evidence_count !== 2 ||
    runtimeReadableRows[0]?.ai_value_count !== 2
  ) {
    throw new Error(
      "runtime could not read the expected RLS-protected C.1 source rows"
    );
  }

  const runtimeLockedAiValue = await runtimePrisma.$transaction(
    (transaction) =>
      transaction.$queryRawUnsafe(
        `SELECT id
         FROM public.ai_value_objects
         WHERE org_id = $1
         ORDER BY id
         LIMIT 1
         FOR UPDATE`,
        scenario.orgId
      )
  );
  if (runtimeLockedAiValue.length !== 1) {
    throw new Error(
      "runtime could not acquire its RLS-scoped AI Value row lock"
    );
  }

  for (const tableName of ["outcome_evidence", "ai_value_objects"]) {
    await expectDatabaseRejection(
      `provisioner SELECT on ${tableName}`,
      () =>
        provisionerPrisma.$transaction(async (transaction) => {
          await transaction.$queryRawUnsafe(
            `SELECT * FROM public.${tableName} LIMIT 1`
          );
        }),
      /permission denied|insufficient privilege/i
    );
  }

  await expectDatabaseRejection(
    "provisioner release INSERT",
    () =>
      provisionerPrisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe(
          "INSERT INTO public.outcome_comparison_privacy_releases DEFAULT VALUES"
        );
      }),
    /permission denied|insufficient privilege/i
  );

  for (const tableName of [
    "aggregate_privacy_manifests",
    "aggregate_privacy_contribution_claims"
  ]) {
    await expectDatabaseRejection(
      `runtime unused SELECT on ${tableName}`,
      () =>
        runtimePrisma.$queryRawUnsafe(
          `SELECT * FROM public.${tableName} LIMIT 1`
        ),
      /permission denied|insufficient privilege/i
    );
  }

  for (const tableName of ["outcome_evidence", "ai_value_objects"]) {
    await expectDatabaseRejection(
      `runtime INSERT on ${tableName}`,
      () =>
        runtimePrisma.$executeRawUnsafe(
          `INSERT INTO public.${tableName} DEFAULT VALUES`
        ),
      /permission denied|insufficient privilege/i
    );
    await expectDatabaseRejection(
      `runtime DELETE on ${tableName}`,
      () =>
        runtimePrisma.$executeRawUnsafe(
          `DELETE FROM public.${tableName} WHERE org_id = $1`,
          scenario.orgId
        ),
      /permission denied|insufficient privilege/i
    );
  }

  await expectDatabaseRejection(
    "runtime Outcome Evidence update",
    () =>
      runtimePrisma.$executeRawUnsafe(
        `UPDATE public.outcome_evidence
         SET aggregate_value = aggregate_value
         WHERE org_id = $1`,
        scenario.orgId
      ),
    /permission denied|insufficient privilege/i
  );

  for (const tableName of [
    "cohort_producer_authorities",
    "cohort_producer_authority_revocations",
    "aggregate_privacy_reservations",
    "cohort_proof_journal"
  ]) {
    await expectDatabaseRejection(
      `runtime INSERT on ${tableName}`,
      () =>
        runtimePrisma.$executeRawUnsafe(
          `INSERT INTO public.${tableName} DEFAULT VALUES`
        ),
      /permission denied|insufficient privilege/i
    );
    await expectDatabaseRejection(
      `runtime UPDATE on ${tableName}`,
      () =>
        runtimePrisma.$executeRawUnsafe(
          `UPDATE public.${tableName} SET id = id WHERE org_id = $1`,
          scenario.orgId
        ),
      tableName === "cohort_producer_authorities"
        ? /append-only|lock-only|row-level security|permission denied|insufficient privilege/i
        : /permission denied|insufficient privilege/i
    );
    await expectDatabaseRejection(
      `runtime DELETE on ${tableName}`,
      () =>
        runtimePrisma.$executeRawUnsafe(
          `DELETE FROM public.${tableName} WHERE org_id = $1`,
          scenario.orgId
        ),
      /permission denied|insufficient privilege/i
    );
  }

  for (const timezone of ["Pacific/Honolulu", "Asia/Kathmandu"]) {
    const verified = await runtimePrisma.$transaction(
      async (transaction) => {
        await transaction.$executeRawUnsafe(
          `SET LOCAL TIME ZONE '${timezone}'`
        );
        await transaction.$executeRawUnsafe(
          "SELECT pg_catalog.set_config('fluencytracr.c1_attestation_key_id', $1, true)",
          attestationKeyId
        );
        await transaction.$executeRawUnsafe(
          "SELECT pg_catalog.set_config('fluencytracr.c1_attestation_secret', $1, true)",
          attestationSecret
        );
        const rows = await transaction.$queryRawUnsafe(
          "SELECT public.verify_outcome_comparison_creation_attestation($1::uuid) AS ok",
          committed.receipt.release_id
        );
        return rows[0]?.ok === true;
      }
    );
    if (!verified) {
      throw new Error(`creation attestation changed under TimeZone ${timezone}`);
    }
  }
};

const assertRollbackScopedStructuralDrift = async () => {
  const rollbackMarker = "C1_STRUCTURAL_DRIFT_ROLLBACK";
  const vectors = [
    {
      label: "runtime role attributes",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER ROLE fluencytracr_c1_runtime INHERIT"
        )
    },
    {
      label: "runtime role membership",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT fluencytracr_c1_attestation_provisioner TO fluencytracr_c1_runtime"
        )
    },
    {
      label: "attestation table RLS",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER TABLE public.outcome_comparison_attestation_keys DISABLE ROW LEVEL SECURITY"
        )
    },
    {
      label: "attestation foreign key",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER TABLE public.outcome_comparison_attestation_key_revocations DROP CONSTRAINT outcome_comparison_attestation_revocation_key_fkey"
        )
    },
    {
      label: "attestation policy",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "DROP POLICY outcome_comparison_attestation_keys_provisioner ON public.outcome_comparison_attestation_keys"
        )
    },
    {
      label: "attestation trigger",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER TABLE public.outcome_comparison_privacy_releases DISABLE TRIGGER outcome_comparison_creation_attestation_before_insert"
        )
    },
    {
      label: "cross-schema same-name trigger rebind",
      mutate: async (transaction) => {
        await transaction.$executeRawUnsafe(
          "CREATE SCHEMA c1_attestation_shadow"
        );
        await transaction.$executeRawUnsafe(
          `CREATE FUNCTION c1_attestation_shadow.reject_c1_runtime_lock_only_mutation()
           RETURNS TRIGGER
           LANGUAGE plpgsql
           SET search_path = pg_catalog
           AS 'BEGIN RETURN NEW; END'`
        );
        await transaction.$executeRawUnsafe(
          "DROP TRIGGER ai_value_objects_c1_runtime_lock_only ON public.ai_value_objects"
        );
        await transaction.$executeRawUnsafe(
          `CREATE TRIGGER ai_value_objects_c1_runtime_lock_only
           BEFORE UPDATE ON public.ai_value_objects
           FOR EACH ROW EXECUTE FUNCTION
             c1_attestation_shadow.reject_c1_runtime_lock_only_mutation()`
        );
      }
    },
    {
      label: "unexpected governed-table trigger",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          `CREATE TRIGGER ai_value_objects_c1_unexpected
           BEFORE UPDATE ON public.ai_value_objects
           FOR EACH ROW EXECUTE FUNCTION
             public.reject_c1_runtime_lock_only_mutation()`
        )
    },
    {
      label: "column-filtered Outcome Evidence family-lock trigger",
      mutate: async (transaction) => {
        const evidenceId = crypto.randomUUID();
        const oldFamily = {
          orgId: `${orgPrefix}-tgattr-drift`,
          workflowId: "workflow:locked",
          jbtdId: "support_case_resolution",
          personaId: "support_agent"
        };
        await transaction.$executeRawUnsafe(
          `INSERT INTO public.outcome_evidence (
             evidence_id, org_id, workflow_id, outcome_metric, outcome_unit,
             period_start, period_end, aggregate_value, cohort_size,
             source_system, jbtd_id, persona_id, aggregate_kind,
             source_attestation, ingested_at
           ) VALUES (
             $1::uuid, $2, $3, 'resolution_minutes', 'minutes',
             '2026-01-01T00:00:00.000Z'::timestamp,
             '2026-03-02T00:00:00.000Z'::timestamp,
             10, 5, 'crm', $4, $5, 'mean',
             '{"approved":true}'::jsonb,
             '2026-03-03T00:00:00.000Z'::timestamp
           )`,
          evidenceId,
          oldFamily.orgId,
          oldFamily.workflowId,
          oldFamily.jbtdId,
          oldFamily.personaId
        );
        await transaction.$executeRawUnsafe(
          "DROP TRIGGER outcome_evidence_family_lock_before_mutation ON public.outcome_evidence"
        );
        await transaction.$executeRawUnsafe(
          `CREATE TRIGGER outcome_evidence_family_lock_before_mutation
           BEFORE INSERT OR UPDATE OF aggregate_value OR DELETE
           ON public.outcome_evidence
           FOR EACH ROW EXECUTE FUNCTION
             public.lock_outcome_evidence_family_mutation()`
        );
        const pidRows = await transaction.$queryRawUnsafe(
          "SELECT pg_backend_pid()::int AS pid"
        );
        const newWorkflowId = "workflow:identity_changed";
        await transaction.$executeRawUnsafe(
          `UPDATE public.outcome_evidence
           SET workflow_id = $2
           WHERE evidence_id = $1::uuid`,
          evidenceId,
          newWorkflowId
        );
        await assertPidLacksAdvisoryLock({
          pid: pidRows[0].pid,
          lockKey: outcomeEvidenceFamilyLockKey({
            ...oldFamily,
            workflowId: newWorkflowId
          }),
          label: "column-filtered Outcome Evidence trigger"
        });
      }
    },
    {
      label: "later Outcome Evidence identity-rewrite trigger",
      mutate: async (transaction) => {
        await transaction.$executeRawUnsafe(
          `CREATE FUNCTION public.rewrite_outcome_evidence_slice_after_lock()
           RETURNS TRIGGER
           LANGUAGE plpgsql
           SET search_path = pg_catalog
           AS 'BEGIN
                 NEW.workflow_id := NEW.workflow_id || '':after_lock'';
                 RETURN NEW;
               END'`
        );
        await transaction.$executeRawUnsafe(
          `CREATE TRIGGER zz_outcome_evidence_rewrite_after_lock
           BEFORE INSERT OR UPDATE ON public.outcome_evidence
           FOR EACH ROW EXECUTE FUNCTION
             public.rewrite_outcome_evidence_slice_after_lock()`
        );
        const triggerOrder = await transaction.$queryRawUnsafe(
          `SELECT tgname
           FROM pg_catalog.pg_trigger
           WHERE tgrelid = 'public.outcome_evidence'::regclass
             AND NOT tgisinternal
           ORDER BY tgname`
        );
        const familyLockIndex = triggerOrder.findIndex(
          (row) =>
            row.tgname === "outcome_evidence_family_lock_before_mutation"
        );
        const rewriteIndex = triggerOrder.findIndex(
          (row) =>
            row.tgname === "zz_outcome_evidence_rewrite_after_lock"
        );
        if (
          familyLockIndex < 0 ||
          rewriteIndex <= familyLockIndex
        ) {
          throw new Error(
            "Outcome Evidence rewrite trigger did not sort after the family lock"
          );
        }
        const insertedRows = await transaction.$queryRawUnsafe(
          `INSERT INTO public.outcome_evidence (
             evidence_id, org_id, workflow_id, outcome_metric, outcome_unit,
             period_start, period_end, aggregate_value, cohort_size,
             source_system, jbtd_id, persona_id, aggregate_kind,
             source_attestation, ingested_at
           ) VALUES (
             $1::uuid, 'c1-trigger-drift', 'workflow:locked',
             'resolution_minutes', 'minutes',
             '2026-01-01T00:00:00.000Z'::timestamp,
             '2026-03-02T00:00:00.000Z'::timestamp,
             10, 5, 'crm', 'support_case_resolution', 'support_agent',
             'mean', '{"approved":true}'::jsonb,
             '2026-03-03T00:00:00.000Z'::timestamp
           )
           RETURNING workflow_id`,
          crypto.randomUUID()
        );
        if (
          insertedRows[0]?.workflow_id !==
          "workflow:locked:after_lock"
        ) {
          throw new Error(
            "later Outcome Evidence trigger did not demonstrate identity rewrite"
          );
        }
      }
    },
    {
      label: "Outcome Evidence family-lock function body",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION public.lock_outcome_evidence_family_mutation()
           RETURNS TRIGGER
           LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE CALLED ON NULL INPUT
           SET search_path = pg_catalog, public
           AS 'BEGIN RETURN NEW; END'`
        )
    },
    {
      label: "Outcome Evidence family-key function body",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION public.outcome_evidence_family_lock_key(
             org_id_value TEXT,
             workflow_id_value TEXT,
             jbtd_id_value TEXT,
             persona_id_value TEXT
           )
           RETURNS TEXT
           LANGUAGE SQL IMMUTABLE PARALLEL SAFE CALLED ON NULL INPUT
           SET search_path = pg_catalog
           AS 'SELECT ''FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1:drift'''`
        )
    },
    {
      label: "Outcome Evidence family-lock function ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT EXECUTE ON FUNCTION public.lock_outcome_evidence_family_mutation() TO fluencytracr_c1_runtime"
        )
    },
    {
      label: "Outcome Evidence family-key function ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT EXECUTE ON FUNCTION public.outcome_evidence_family_lock_key(TEXT, TEXT, TEXT, TEXT) TO fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime lock-only function body",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION public.reject_c1_runtime_lock_only_mutation()
           RETURNS TRIGGER
           LANGUAGE plpgsql
           SET search_path = pg_catalog
           AS 'BEGIN RETURN NEW; END'`
        )
    },
    {
      label: "pgcrypto digest config",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER FUNCTION extensions.digest(BYTEA, TEXT) SET search_path = pg_catalog"
        )
    },
    {
      label: "pgcrypto digest volatility",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER FUNCTION extensions.digest(BYTEA, TEXT) VOLATILE"
        )
    },
    {
      label: "pgcrypto HMAC ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT EXECUTE ON FUNCTION extensions.hmac(BYTEA, BYTEA, TEXT) TO fluencytracr_c1_runtime"
        )
    },
    {
      label: "Outcome Evidence RLS posture",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER TABLE public.outcome_evidence DISABLE ROW LEVEL SECURITY"
        )
    },
    {
      label: "AI Value RLS posture",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "ALTER TABLE public.ai_value_objects DISABLE ROW LEVEL SECURITY"
        )
    },
    {
      label: "Outcome Evidence runtime policy",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "DROP POLICY outcome_evidence_c1_runtime_select ON public.outcome_evidence"
        )
    },
    {
      label: "AI Value runtime lock policy",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "DROP POLICY ai_value_objects_c1_runtime_lock ON public.ai_value_objects"
        )
    },
    {
      label: "runtime release SELECT requirement",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE SELECT ON public.outcome_comparison_privacy_releases FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime release INSERT requirement",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE INSERT ON public.outcome_comparison_privacy_releases FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime authority SELECT requirement",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE SELECT ON public.cohort_producer_authorities FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime authority UPDATE requirement",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE UPDATE ON public.cohort_producer_authorities FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime AI Value SELECT requirement",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE SELECT ON public.ai_value_objects FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime AI Value UPDATE requirement",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE UPDATE ON public.ai_value_objects FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "REVOKE SELECT ON public.cohort_proof_journal FROM fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime dangerous Outcome Evidence ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT INSERT ON public.outcome_evidence TO fluencytracr_c1_runtime"
        )
    },
    {
      label: "runtime unused manifest ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT SELECT ON public.aggregate_privacy_manifests TO fluencytracr_c1_runtime"
        )
    },
    {
      label: "provisioner Outcome Evidence ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT SELECT ON public.outcome_evidence TO fluencytracr_c1_attestation_provisioner"
        )
    },
    {
      label: "provisioner AI Value ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT SELECT ON public.ai_value_objects TO fluencytracr_c1_attestation_provisioner"
        )
    },
    {
      label: "provisioner release DML ACL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT INSERT ON public.outcome_comparison_privacy_releases TO fluencytracr_c1_attestation_provisioner"
        )
    },
    {
      label: "restricted public-schema DDL",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          "GRANT CREATE ON SCHEMA public TO PUBLIC"
        )
    },
    {
      label: "provisioner activation sequence UPDATE",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          `DO $$
           DECLARE activation_sequence TEXT;
           BEGIN
             activation_sequence := pg_catalog.pg_get_serial_sequence(
               'public.outcome_comparison_attestation_key_activations',
               'activation_epoch'
             );
             EXECUTE pg_catalog.format(
               'GRANT UPDATE ON SEQUENCE %s TO fluencytracr_c1_attestation_provisioner',
               activation_sequence
             );
           END
           $$`
        )
    },
    {
      label: "provisioner unrelated sequence ACL",
      mutate: async (transaction) => {
        await transaction.$executeRawUnsafe(
          "CREATE SEQUENCE public.c1_provisioner_unexpected_sequence"
        );
        await transaction.$executeRawUnsafe(
          "GRANT USAGE ON SEQUENCE public.c1_provisioner_unexpected_sequence TO fluencytracr_c1_attestation_provisioner"
        );
      }
    },
    {
      label: "attestation function body",
      mutate: (transaction) =>
        transaction.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION public.outcome_comparison_attestation_frame(value BYTEA)
           RETURNS BYTEA
           LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
           SET search_path = pg_catalog
           AS 'SELECT value'`
        )
    }
  ];

  for (const vector of vectors) {
    let rolledBack = false;
    try {
      await prisma.$transaction(async (transaction) => {
        if (
          !(await checkOutcomeComparisonAttestationStructureReadiness(
            transaction
          ))
        ) {
          throw new Error(
            `${vector.label} baseline structure was not ready`
          );
        }
        await vector.mutate(transaction);
        if (
          await checkOutcomeComparisonAttestationStructureReadiness(
            transaction
          )
        ) {
          throw new Error(
            `${vector.label} drift remained structurally ready`
          );
        }
        throw new Error(rollbackMarker);
      });
    } catch (error) {
      if (error instanceof Error && error.message === rollbackMarker) {
        rolledBack = true;
      } else {
        throw error;
      }
    }
    if (
      !rolledBack ||
      !(await checkOutcomeComparisonAttestationStructureReadiness(prisma))
    ) {
      throw new Error(
        `${vector.label} structural rollback did not restore readiness`
      );
    }
  }
};

const provisioningLockKey = "FT_C1_ATTESTATION_PROVISIONING_V1";

const provisionAndActivateAttestationKey = async (keyId, secret) => {
  const secretHash = crypto
    .createHash("sha256")
    .update(secret, "utf8")
    .digest("hex");
  await provisionerPrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(${provisioningLockKey}, 0)
      )
    `;
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_keys
        (key_id, algorithm, secret_hash)
      VALUES (${keyId}, 'HMAC-SHA-256', ${secretHash})
    `;
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_key_activations (key_id)
      VALUES (${keyId})
    `;
  });
};

const revokeAttestationKey = async (keyId, reasonCode) => {
  await provisionerPrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(${provisioningLockKey}, 0)
      )
    `;
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_key_revocations
        (key_id, reason_code)
      VALUES (${keyId}, ${reasonCode})
    `;
  });
};

const reactivatePrimaryAttestationKey = async () => {
  await provisionerPrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(${provisioningLockKey}, 0)
      )
    `;
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_key_activations (key_id)
      VALUES (${attestationKeyId})
    `;
  });
  process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID = attestationKeyId;
  process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
    [attestationKeyId]: attestationSecret
  });
};

const assertAttestationProvisioningInterleavings = async () => {
  const activationFirstKey =
    `FT_C1_HMAC_ACTIVATION_FIRST_${attestationRaceSuffix}`;
  const activationFirstSecret =
    "BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ";
  const activationFirstHash = crypto
    .createHash("sha256")
    .update(activationFirstSecret, "utf8")
    .digest("hex");
  const activationHeld = gate("activation-first provisioning held");
  const releaseActivation = gate("release activation-first provisioning");
  let activationTransaction;
  let activationCommit;
  try {
    const scenario = await setupScenario("attestation-activation-first");
    activationTransaction = provisionerPrisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_catalog.pg_advisory_xact_lock(
          pg_catalog.hashtextextended(${provisioningLockKey}, 0)
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO public.outcome_comparison_attestation_keys
          (key_id, algorithm, secret_hash)
        VALUES (
          ${activationFirstKey},
          'HMAC-SHA-256',
          ${activationFirstHash}
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO public.outcome_comparison_attestation_key_activations (key_id)
        VALUES (${activationFirstKey})
      `;
      activationHeld.resolve();
      await releaseActivation.promise;
    });
    await activationHeld.promise;
    let creationPid;
    const creationStarted = gate("activation-first creation started");
    const creationClient = observedTransactionClient({
      onTransactionStart: async (pid) => creationStarted.resolve(pid)
    });
    activationCommit = commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      creationClient
    );
    creationPid = await creationStarted.promise;
    await waitForPidAdvisoryLock({
      pid: creationPid,
      lockKey: provisioningLockKey,
      granted: false,
      label: "activation-first queued creation"
    });
    releaseActivation.resolve();
    const [, result] = await withTimeout(
      Promise.all([activationTransaction, activationCommit]),
      "activation-first provisioning race"
    );
    if (
      result.decision !== "HOLD" ||
      (await prisma.outcomeComparisonPrivacyRelease.count({
        where: { orgId: scenario.orgId }
      })) !== 0
    ) {
      throw new Error("post-activation creation committed with the stale key");
    }
  } finally {
    releaseActivation.resolve();
    await settleRace(
      [activationTransaction, activationCommit],
      "activation-first cleanup"
    );
  }
  await revokeAttestationKey(
    activationFirstKey,
    "C1_RACE_ACTIVATION_FIRST_COMPLETE"
  );
  await reactivatePrimaryAttestationKey();

  const activationSecondKey =
    `FT_C1_HMAC_ACTIVATION_SECOND_${attestationRaceSuffix}`;
  const activationSecondSecret =
    "BQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU";
  const activationSecondHash = crypto
    .createHash("sha256")
    .update(activationSecondSecret, "utf8")
    .digest("hex");
  const creationReady = gate("creation-first readiness held");
  const releaseCreation = gate("release creation-first");
  const activationStarted = gate("creation-first activation started");
  let creationCommit;
  let activationAfterCreation;
  try {
    const scenario = await setupScenario("attestation-creation-first");
    const creationClient = observedTransactionClient({
      onAttestationReadiness: async () => {
        creationReady.resolve();
        await releaseCreation.promise;
      }
    });
    creationCommit = commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      creationClient
    );
    await creationReady.promise;
    activationAfterCreation = provisionerPrisma.$transaction(async (transaction) => {
      const pidRows = await transaction.$queryRawUnsafe(
        "SELECT pg_backend_pid()::int AS pid"
      );
      activationStarted.resolve(pidRows[0].pid);
      await transaction.$executeRaw`
        SELECT pg_catalog.pg_advisory_xact_lock(
          pg_catalog.hashtextextended(${provisioningLockKey}, 0)
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO public.outcome_comparison_attestation_keys
          (key_id, algorithm, secret_hash)
        VALUES (
          ${activationSecondKey},
          'HMAC-SHA-256',
          ${activationSecondHash}
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO public.outcome_comparison_attestation_key_activations (key_id)
        VALUES (${activationSecondKey})
      `;
    });
    const activationPid = await activationStarted.promise;
    await waitForPidAdvisoryLock({
      pid: activationPid,
      lockKey: provisioningLockKey,
      granted: false,
      label: "creation-first queued activation"
    });
    releaseCreation.resolve();
    const [created] = await withTimeout(
      Promise.all([creationCommit, activationAfterCreation]),
      "creation-first activation race"
    );
    await assertReleased(created, scenario, "creation-first activation race");
    const staleRead = await readOutcomeComparisonPrivacyRelease(
      created.receipt,
      scenario.slice,
      boundedClient
    );
    if (staleRead.decision !== "HOLD") {
      throw new Error("post-activation old-config readback did not hold");
    }
  } finally {
    releaseCreation.resolve();
    await settleRace(
      [creationCommit, activationAfterCreation],
      "creation-first activation cleanup"
    );
  }
  await revokeAttestationKey(
    activationSecondKey,
    "C1_RACE_CREATION_FIRST_COMPLETE"
  );
  await reactivatePrimaryAttestationKey();

  const revocationFirstKey =
    `FT_C1_HMAC_REVOCATION_FIRST_${attestationRaceSuffix}`;
  const revocationFirstSecret =
    "BgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgY";
  await provisionAndActivateAttestationKey(
    revocationFirstKey,
    revocationFirstSecret
  );
  process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID = revocationFirstKey;
  process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
    [attestationKeyId]: attestationSecret,
    [revocationFirstKey]: revocationFirstSecret
  });
  const revocationHeld = gate("revocation-first held");
  const releaseRevocation = gate("release revocation-first");
  let revocationTransaction;
  let creationAfterRevocation;
  try {
    const scenario = await setupScenario("attestation-revocation-first");
    revocationTransaction = provisionerPrisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_catalog.pg_advisory_xact_lock(
          pg_catalog.hashtextextended(${provisioningLockKey}, 0)
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO public.outcome_comparison_attestation_key_revocations
          (key_id, reason_code)
        VALUES (${revocationFirstKey}, 'C1_RACE_REVOCATION_FIRST')
      `;
      revocationHeld.resolve();
      await releaseRevocation.promise;
    });
    await revocationHeld.promise;
    const creationStarted = gate("revocation-first creation started");
    const creationClient = observedTransactionClient({
      onTransactionStart: async (pid) => creationStarted.resolve(pid)
    });
    creationAfterRevocation = commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      creationClient
    );
    const creationPid = await creationStarted.promise;
    await waitForPidAdvisoryLock({
      pid: creationPid,
      lockKey: provisioningLockKey,
      granted: false,
      label: "revocation-first queued creation"
    });
    releaseRevocation.resolve();
    const [, result] = await withTimeout(
      Promise.all([revocationTransaction, creationAfterRevocation]),
      "revocation-first provisioning race"
    );
    if (
      result.decision !== "HOLD" ||
      (await prisma.outcomeComparisonPrivacyRelease.count({
        where: { orgId: scenario.orgId }
      })) !== 0
    ) {
      throw new Error("post-revocation creation committed");
    }
  } finally {
    releaseRevocation.resolve();
    await settleRace(
      [revocationTransaction, creationAfterRevocation],
      "revocation-first cleanup"
    );
  }
  await reactivatePrimaryAttestationKey();

  const creationFirstRevocationKey =
    `FT_C1_HMAC_CREATION_REVOKE_${attestationRaceSuffix}`;
  const creationFirstRevocationSecret =
    "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc";
  await provisionAndActivateAttestationKey(
    creationFirstRevocationKey,
    creationFirstRevocationSecret
  );
  process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID =
    creationFirstRevocationKey;
  process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
    [attestationKeyId]: attestationSecret,
    [creationFirstRevocationKey]: creationFirstRevocationSecret
  });
  const creationBeforeRevokeReady = gate(
    "creation-first revocation readiness held"
  );
  const releaseCreationBeforeRevoke = gate(
    "release creation-first revocation"
  );
  const revokeAfterCreationStarted = gate(
    "creation-first revocation started"
  );
  let creationBeforeRevoke;
  let revokeAfterCreation;
  let creationBeforeRevokeScenario;
  try {
    creationBeforeRevokeScenario = await setupScenario(
      "attestation-creation-first-revocation"
    );
    const creationClient = observedTransactionClient({
      onAttestationReadiness: async () => {
        creationBeforeRevokeReady.resolve();
        await releaseCreationBeforeRevoke.promise;
      }
    });
    creationBeforeRevoke = commitOutcomeComparisonPrivacyRelease(
      creationBeforeRevokeScenario.proof,
      creationBeforeRevokeScenario.slice,
      creationClient
    );
    await creationBeforeRevokeReady.promise;
    revokeAfterCreation = provisionerPrisma.$transaction(async (transaction) => {
      const pidRows = await transaction.$queryRawUnsafe(
        "SELECT pg_backend_pid()::int AS pid"
      );
      revokeAfterCreationStarted.resolve(pidRows[0].pid);
      await transaction.$executeRaw`
        SELECT pg_catalog.pg_advisory_xact_lock(
          pg_catalog.hashtextextended(${provisioningLockKey}, 0)
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO public.outcome_comparison_attestation_key_revocations
          (key_id, reason_code)
        VALUES (
          ${creationFirstRevocationKey},
          'C1_RACE_CREATION_FIRST_REVOKE'
        )
      `;
    });
    const revokePid = await revokeAfterCreationStarted.promise;
    await waitForPidAdvisoryLock({
      pid: revokePid,
      lockKey: provisioningLockKey,
      granted: false,
      label: "creation-first queued revocation"
    });
    releaseCreationBeforeRevoke.resolve();
    const [created] = await withTimeout(
      Promise.all([creationBeforeRevoke, revokeAfterCreation]),
      "creation-first revocation race"
    );
    await assertReleased(
      created,
      creationBeforeRevokeScenario,
      "creation-first revocation race"
    );
    const heldRead = await readOutcomeComparisonPrivacyRelease(
      created.receipt,
      creationBeforeRevokeScenario.slice,
      boundedClient
    );
    if (heldRead.decision !== "HOLD") {
      throw new Error("post-revocation readback remained authorized");
    }
  } finally {
    releaseCreationBeforeRevoke.resolve();
    await settleRace(
      [creationBeforeRevoke, revokeAfterCreation],
      "creation-first revocation cleanup"
    );
  }
  await reactivatePrimaryAttestationKey();
};

const assertAttestationRotationAndRevocation = async () => {
  const primaryScenario = await setupScenario("attestation-primary-release");
  const primaryRelease = await commitOutcomeComparisonPrivacyRelease(
    primaryScenario.proof,
    primaryScenario.slice,
    boundedClient
  );
  await assertReleased(
    primaryRelease,
    primaryScenario,
    "primary attestation release"
  );

  const secondaryKeyId = `FT_C1_HMAC_SECONDARY_${attestationRaceSuffix}`;
  const secondarySecret =
    "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";
  const secondarySecretHash = crypto
    .createHash("sha256")
    .update(secondarySecret, "utf8")
    .digest("hex");
  await provisionerPrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0)
      )
    `;
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_keys
        (key_id, algorithm, secret_hash)
      VALUES (${secondaryKeyId}, 'HMAC-SHA-256', ${secondarySecretHash})
    `;
  });
  const stagedReadiness = await runtimePrisma.$queryRawUnsafe(
    `SELECT ok, diagnostics
     FROM public.outcome_comparison_attestation_readiness(
       $1,
       ARRAY[$2]::text[],
       ARRAY[$3]::text[]
     )`,
    attestationKeyId,
    attestationKeyId,
    attestationSecret
  );
  if (
    stagedReadiness.length !== 1 ||
    stagedReadiness[0]?.ok !== true ||
    stagedReadiness[0]?.diagnostics?.length !== 0
  ) {
    throw new Error(
      `inactive unreferenced staged key broke readiness: ${JSON.stringify(stagedReadiness)}`
    );
  }
  const omittedActiveReadiness = await runtimePrisma.$queryRawUnsafe(
    `SELECT ok, diagnostics
     FROM public.outcome_comparison_attestation_readiness(
       $1,
       ARRAY[$2]::text[],
       ARRAY[$3]::text[]
     )`,
    attestationKeyId,
    secondaryKeyId,
    secondarySecret
  );
  if (
    omittedActiveReadiness.length !== 1 ||
    omittedActiveReadiness[0]?.ok !== false ||
    !omittedActiveReadiness[0]?.diagnostics?.includes("CONFIG_INVALID")
  ) {
    throw new Error(
      `omitted active key did not fail readiness: ${JSON.stringify(omittedActiveReadiness)}`
    );
  }
  await provisionerPrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0)
      )
    `;
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_key_activations (key_id)
      VALUES (${secondaryKeyId})
    `;
  });

  const staleScenario = await setupScenario("attestation-stale-primary");
  const staleResult = await commitOutcomeComparisonPrivacyRelease(
    staleScenario.proof,
    staleScenario.slice,
    boundedClient
  );
  if (staleResult.decision !== "HOLD") {
    throw new Error("prior active key created a release after rotation");
  }

  process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID = secondaryKeyId;
  process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
    [attestationKeyId]: attestationSecret,
    [secondaryKeyId]: secondarySecret
  });
  const secondaryScenario = await setupScenario(
    "attestation-secondary-release"
  );
  const secondaryRelease = await commitOutcomeComparisonPrivacyRelease(
    secondaryScenario.proof,
    secondaryScenario.slice,
    boundedClient
  );
  await assertReleased(
    secondaryRelease,
    secondaryScenario,
    "secondary attestation release"
  );
  const secondaryRow =
    await prisma.outcomeComparisonPrivacyRelease.findUnique({
      where: { id: secondaryRelease.receipt.release_id },
      select: { attestationKeyId: true }
    });
  if (secondaryRow?.attestationKeyId !== secondaryKeyId) {
    throw new Error("rotated release did not bind the active secondary key");
  }

  const retainedPrimaryRead = await readOutcomeComparisonPrivacyRelease(
    primaryRelease.receipt,
    primaryScenario.slice,
    boundedClient
  );
  if (retainedPrimaryRead.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED") {
    throw new Error("retained primary key did not preserve old readback");
  }
  process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
    [secondaryKeyId]: secondarySecret
  });
  const missingPrimaryRead = await readOutcomeComparisonPrivacyRelease(
    primaryRelease.receipt,
    primaryScenario.slice,
    boundedClient
  );
  if (missingPrimaryRead.decision !== "HOLD") {
    throw new Error("missing referenced primary key did not hold readback");
  }
  process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
    [attestationKeyId]: attestationSecret,
    [secondaryKeyId]: secondarySecret
  });

  await provisionerPrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO public.outcome_comparison_attestation_key_revocations
        (key_id, reason_code)
      VALUES (${secondaryKeyId}, 'C1_ASSURANCE_COMPROMISE')
    `;
  });
  const revokedSecondaryRead = await readOutcomeComparisonPrivacyRelease(
    secondaryRelease.receipt,
    secondaryScenario.slice,
    boundedClient
  );
  if (revokedSecondaryRead.decision !== "HOLD") {
    throw new Error("revoked secondary key did not hold bound readback");
  }
  const readinessRows = await runtimePrisma.$queryRawUnsafe(
    `SELECT ok, diagnostics
     FROM public.outcome_comparison_attestation_readiness(
       $1,
       ARRAY[$2, $3]::text[],
       ARRAY[$4, $5]::text[]
     )`,
    secondaryKeyId,
    attestationKeyId,
    secondaryKeyId,
    attestationSecret,
    secondarySecret
  );
  if (
    readinessRows.length !== 1 ||
    readinessRows[0]?.ok !== false ||
    !readinessRows[0]?.diagnostics?.includes("ACTIVE_KEY_INVALID")
  ) {
    throw new Error(
      `revoked active key did not fail readiness: ${JSON.stringify(readinessRows)}`
    );
  }
  await reactivatePrimaryAttestationKey();
};

const assertFinalReloadRollback = async () => {
  const scenario = await setupScenario("final-reload-rollback");
  let created = false;
  let faultInjected = false;
  const faultClient = observedTransactionClient({
    mutateTransaction: (transaction) =>
      new Proxy(transaction, {
        get(target, property) {
          if (property !== "outcomeComparisonPrivacyRelease") {
            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          }
          const delegate = target.outcomeComparisonPrivacyRelease;
          return new Proxy(delegate, {
            get(delegateTarget, delegateProperty) {
              if (delegateProperty === "create") {
                return async (...args) => {
                  const row = await delegateTarget.create(...args);
                  created = true;
                  return row;
                };
              }
              if (delegateProperty === "findUnique") {
                return async (...args) => {
                  const query = args[0];
                  if (
                    created &&
                    !faultInjected &&
                    query?.where?.id
                  ) {
                    faultInjected = true;
                    return null;
                  }
                  return delegateTarget.findUnique(...args);
                };
              }
              const value = Reflect.get(
                delegateTarget,
                delegateProperty,
                delegateTarget
              );
              return typeof value === "function"
                ? value.bind(delegateTarget)
                : value;
            }
          });
        }
      })
  });
  const result = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      faultClient
    ),
    "final reload rollback injection"
  );
  const count = await prisma.outcomeComparisonPrivacyRelease.count({
    where: { orgId: scenario.orgId }
  });
  if (
    !created ||
    !faultInjected ||
    result.decision !== "HOLD" ||
    count !== 0
  ) {
    throw new Error(
      `final reload fault did not roll back: ${JSON.stringify({
        created,
        faultInjected,
        decision: result.decision,
        count
      })}`
    );
  }
};

const assertSequentialIndependentReadbacks = async () => {
  const first = await setupScenario("sequential-slice-one");
  const second = await setupScenario("sequential-slice-two");
  const firstCommit = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      first.proof,
      first.slice,
      boundedClient
    ),
    "first independent C.1 commit"
  );
  const secondCommit = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      second.proof,
      second.slice,
      boundedClient
    ),
    "second independent C.1 commit"
  );
  await assertReleased(firstCommit, first, "first independent C.1 commit");
  await assertReleased(secondCommit, second, "second independent C.1 commit");
  const firstRead = await withTimeout(
    readOutcomeComparisonPrivacyRelease(
      firstCommit.receipt,
      first.slice,
      boundedClient
    ),
    "first independent C.1 readback"
  );
  const secondRead = await withTimeout(
    readOutcomeComparisonPrivacyRelease(
      secondCommit.receipt,
      second.slice,
      boundedClient
    ),
    "second independent C.1 readback"
  );
  if (
    firstRead.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
    secondRead.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
    firstRead.receipt.release_id === secondRead.receipt.release_id ||
    firstRead.projection.org_id === secondRead.projection.org_id ||
    firstRead.receipt.claim_authorized ||
    secondRead.receipt.claim_authorized
  ) {
    throw new Error("independent single-slice readbacks were not atomic");
  }
  const combined = await withTimeout(
    readOutcomeComparisonPrivacyRelease(
      [firstRead.receipt, secondRead.receipt],
      first.slice,
      boundedClient
    ),
    "combined receipt rejection"
  );
  if (
    combined.decision !== "HOLD" ||
    comparisonPrivacyRepository.listOutcomeComparisonPrivacyReleases !==
      undefined ||
    comparisonPrivacyRepository.readOutcomeComparisonPrivacyReleases !==
      undefined
  ) {
    throw new Error("C.1 exposed cross-slice composition authority");
  }
};

const waitUntilExpired = async (canonicalInstant, label) => {
  const waitMs = Math.max(0, Date.parse(canonicalInstant) - Date.now() + 75);
  await withTimeout(sleep(waitMs), label, waitMs + 2_000);
};

const assertRealPrecommitProofFailures = async () => {
  const invalid = await setupScenario("invalid-proof-vectors");
  const replacement = invalid.proof.signature.startsWith("A") ? "B" : "A";
  const vectors = [
    {
      label: "malformed schema",
      proof: { ...invalid.proof, schema_version: "FT_WRONG_SCHEMA" },
      slice: invalid.slice
    },
    {
      label: "malformed signature",
      proof: {
        ...invalid.proof,
        signature: replacement + invalid.proof.signature.slice(1)
      },
      slice: invalid.slice
    },
    {
      label: "wrong expected slice",
      proof: invalid.proof,
      slice: { ...invalid.slice, persona_id: "other_persona" }
    }
  ];
  for (const vector of vectors) {
    const result = await withTimeout(
      commitOutcomeComparisonPrivacyRelease(
        vector.proof,
        vector.slice,
        boundedClient
      ),
      vector.label
    );
    const count = await prisma.outcomeComparisonPrivacyRelease.count({
      where: { orgId: invalid.orgId }
    });
    if (result.decision !== "HOLD" || count !== 0) {
      throw new Error(`${vector.label} created C.1 authority`);
    }
  }

  const expired = await setupScenario("expired-before-c1", {
    proofLifetimeMs: 3_000
  });
  await waitUntilExpired(
    expired.proofExpiresAt,
    "proof expiry before C.1 decision"
  );
  const expiredResult = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      expired.proof,
      expired.slice,
      boundedClient
    ),
    "expired proof C.1 decision"
  );
  if (
    expiredResult.decision !== "HOLD" ||
    (await prisma.outcomeComparisonPrivacyRelease.count({
      where: { orgId: expired.orgId }
    })) !== 0
  ) {
    throw new Error("expired proof created C.1 authority");
  }

  const revoked = await setupScenario("revoked-before-c1");
  const revocation = await withTimeout(
    revokeCohortProducerAuthority(
      {
        org_id: revoked.orgId,
        producer_key_id: "producer_primary",
        authority_version: 1,
        reason_code: "C1_PRECOMMIT_REVOCATION"
      },
      c0SetupClient
    ),
    "pre-C.1 authority revocation"
  );
  const revokedResult = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      revoked.proof,
      revoked.slice,
      boundedClient
    ),
    "revoked authority C.1 decision"
  );
  if (
    !revocation ||
    revokedResult.decision !== "HOLD" ||
    (await prisma.outcomeComparisonPrivacyRelease.count({
      where: { orgId: revoked.orgId }
    })) !== 0
  ) {
    throw new Error("revoked authority created C.1 authority");
  }
};

const assertReplayExpiryAndDurableReadback = async () => {
  const scenario = await setupScenario("expiry-replay-readback", {
    proofLifetimeMs: 3_000
  });
  const committed = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      boundedClient
    ),
    "pre-expiry C.1 commit"
  );
  await assertReleased(committed, scenario, "pre-expiry C.1 commit");
  await waitUntilExpired(
    scenario.proofExpiresAt,
    "proof expiry after C.1 commit"
  );
  const replay = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      scenario.proof,
      scenario.slice,
      boundedClient
    ),
    "expired exact C.1 replay"
  );
  const durable = await withTimeout(
    readOutcomeComparisonPrivacyRelease(
      committed.receipt,
      scenario.slice,
      boundedClient
    ),
    "durable post-expiry readback"
  );
  if (
    replay.decision !== "HOLD" ||
    durable.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
    JSON.stringify(durable.receipt) !== JSON.stringify(committed.receipt) ||
    JSON.stringify(durable.projection) !== JSON.stringify(committed.projection)
  ) {
    throw new Error(
      "proof expiry did not separate replay freshness from durable readback"
    );
  }
  const revoked = await withTimeout(
    revokeCohortProducerAuthority(
      {
        org_id: scenario.orgId,
        producer_key_id: "producer_primary",
        authority_version: 1,
        reason_code: "C1_POSTCOMMIT_REVOCATION"
      },
      c0SetupClient
    ),
    "post-C.1 authority revocation"
  );
  const held = await withTimeout(
    readOutcomeComparisonPrivacyRelease(
      committed.receipt,
      scenario.slice,
      boundedClient
    ),
    "revoked durable readback"
  );
  if (!revoked || held.decision !== "HOLD") {
    throw new Error("revoked durable C.1 readback did not hold");
  }
};

try {
  await assertSchemaPosture();
  await assertFamilyKeyParity();
  await assertRestrictedRolePosture();
  await assertLiveReadiness();
  await assertRollbackScopedStructuralDrift();
  await assertCreationAttestationAdversarialPosture();
  await assertRealPrecommitProofFailures();
  await assertReplayExpiryAndDurableReadback();

  for (const verb of ["INSERT", "UPDATE", "DELETE"]) {
    await assertC1FirstMutationRace(verb);
    await assertWriterFirstMutationRace(verb);
  }
  await assertC1FirstMutationRace("UPDATE", { movingRelation: "before" });
  await assertC1FirstMutationRace("UPDATE", { movingRelation: "after" });

  const concurrent = await setupScenario("concurrent");
  // The exact-family lock is acquired before C.1 performs either unique lookup,
  // so protocol-following concurrent calls serialize before create and cannot
  // reach a P2002 conflict. All callers must replay the one committed row.
  const attempts = await withTimeout(
    Promise.all(
      Array.from({ length: 4 }, () =>
        commitOutcomeComparisonPrivacyRelease(
          concurrent.proof,
          concurrent.slice,
          boundedClient
        )
      )
    ),
    "four concurrent exact C.1 commits"
  );
  const rows = await prisma.outcomeComparisonPrivacyRelease.findMany({
    where: { orgId: concurrent.orgId }
  });
  if (
    rows.length !== 1 ||
    attempts.some(
      (result) =>
        result.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
        result.receipt.release_id !== rows[0].id ||
        result.receipt.projection_hash !== attempts[0].receipt.projection_hash ||
        JSON.stringify(result.receipt) !== JSON.stringify(attempts[0].receipt) ||
        JSON.stringify(result.projection) !==
          JSON.stringify(attempts[0].projection)
    )
  ) {
    throw new Error(
      "concurrent exact C.1 commits did not serialize to one identical release"
    );
  }

  for (const verb of ["UPDATE", "DELETE"]) {
    let rejected = false;
    try {
      if (verb === "UPDATE") {
        await prisma.$executeRawUnsafe(
          `UPDATE public.outcome_comparison_privacy_releases
           SET created_at = created_at
           WHERE id = $1::uuid`,
          rows[0].id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `DELETE FROM public.outcome_comparison_privacy_releases
           WHERE id = $1::uuid`,
          rows[0].id
        );
      }
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(`C.1 append-only ${verb} guard did not reject mutation`);
    }
  }

  await assertFinalReloadRollback();
  await assertSequentialIndependentReadbacks();

  const revocation = await setupScenario("revocation-readback");
  const committed = await withTimeout(
    commitOutcomeComparisonPrivacyRelease(
      revocation.proof,
      revocation.slice,
      boundedClient
    ),
    "revocation/readback C.1 setup"
  );
  if (committed.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED") {
    throw new Error("revocation/readback C.1 setup failed");
  }
  const authorityKey = JSON.stringify([
    "FT_COHORT_PRODUCER_AUTHORITY_LOCK_V1",
    revocation.orgId,
    "producer_primary"
  ]);
  const releaseProducerBlocker = gate("release producer blocker");
  const producerBlockerHeld = gate("producer blocker held");
  const revokeStarted = gate("revocation transaction started");
  const readbackStarted = gate("readback transaction started");
  let producerBlocker;
  let revoke;
  let readback;
  try {
    producerBlocker = boundedTransaction(async (transaction) => {
      await acquireCohortProducerAuthorityLock(
        transaction,
        revocation.orgId,
        "producer_primary"
      );
      producerBlockerHeld.resolve();
      await releaseProducerBlocker.promise;
    });
    await producerBlockerHeld.promise;
    const revokeClient = observedTransactionClient({
      baseClient: prisma,
      onTransactionStart: async (pid) => revokeStarted.resolve(pid)
    });
    revoke = revokeCohortProducerAuthority(
      {
        org_id: revocation.orgId,
        producer_key_id: "producer_primary",
        authority_version: 1,
        reason_code: "C1_CI_SERIALIZATION"
      },
      revokeClient
    );
    const revokePid = await revokeStarted.promise;
    await waitForPidAdvisoryLock({
      pid: revokePid,
      lockKey: authorityKey,
      granted: false,
      label: "queued authority revocation"
    });
    const readClient = observedTransactionClient({
      onTransactionStart: async (pid) => readbackStarted.resolve(pid)
    });
    readback = readOutcomeComparisonPrivacyRelease(
      committed.receipt,
      revocation.slice,
      readClient
    );
    const readPid = await readbackStarted.promise;
    await waitForPidAdvisoryLock({
      pid: readPid,
      lockKey: authorityKey,
      granted: false,
      label: "queued C.1 readback"
    });
    releaseProducerBlocker.resolve();
    const [blockerResult, revokeResult, readbackResult] = await withTimeout(
      Promise.all([producerBlocker, revoke, readback]),
      "revocation/readback serialization"
    );
    void blockerResult;
    if (!revokeResult || readbackResult.decision !== "HOLD") {
      throw new Error(
        "readback serialized before the earlier queued revocation"
      );
    }
  } finally {
    releaseProducerBlocker.resolve();
    await settleRace(
      [producerBlocker, revoke, readback],
      "revocation/readback cleanup"
    );
  }

  await assertAttestationProvisioningInterleavings();
  await assertAttestationRotationAndRevocation();
  await assertLiveReadiness();

  console.log(
    `C.1 PostgreSQL verification passed in ${Date.now() - verifierStartedAt} ms: preexisting restricted roles, direct-runtime live readiness, exact schema/security, rollback-scoped role/membership/RLS/FK/policy/trigger/ACL/function drift, key-journal denial, runtime C.0 INSERT/UPDATE/DELETE denial, missing/wrong-secret pre-unique rejection, SET ROLE non-masquerade, guarded lock-only UPDATE access, cross-TimeZone HMAC stability, forced activation/revocation-versus-creation ordering in both directions, key rotation/retention/missing-key/revocation, real malformed/wrong/expired/revoked proof vectors, replay-versus-durable-readback expiry, actual commit/direct-mutation races, deterministic moving-family locks, row-lock interleaving, identical concurrent replay, rollback injection, append-only, sequential non-composition, and revocation serialization.`
  );
  console.log(
    `Assurance runtime report: estimated_required_workflow_minutes=${ASSURANCE_WORKFLOW_ESTIMATE_MINUTES}, configured_assurance_minutes=${ASSURANCE_WORKFLOW_BUDGET_MINUTES}, configured_full_assurance_minutes=${FULL_ASSURANCE_WORKFLOW_BUDGET_MINUTES}.`
  );
} finally {
  await runtimePrisma.$disconnect();
  await provisionerPrisma.$disconnect();
  await prisma.$disconnect();
  await disconnectPrisma();
}
