CREATE TABLE "cohort_producer_authorities" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "producer_key_id" TEXT NOT NULL,
    "authority_version" INTEGER NOT NULL,
    "proof_policy_version" TEXT NOT NULL,
    "producer_policy_version" TEXT NOT NULL,
    "public_key_der_base64" TEXT NOT NULL,
    "public_key_fingerprint" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_producer_authorities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cohort_producer_authority_version_check"
      CHECK ("authority_version" > 0),
    CONSTRAINT "cohort_producer_authority_time_check"
      CHECK ("expires_at" > "valid_from"),
    CONSTRAINT "cohort_producer_authority_fingerprint_check"
      CHECK ("public_key_fingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "cohort_producer_authority_epoch_key"
ON "cohort_producer_authorities"("org_id", "producer_key_id", "authority_version");

CREATE UNIQUE INDEX "cohort_producer_authorities_public_key_fingerprint_key"
ON "cohort_producer_authorities"("public_key_fingerprint");

CREATE INDEX "cohort_producer_authorities_org_id_producer_key_id_idx"
ON "cohort_producer_authorities"("org_id", "producer_key_id");

CREATE TABLE "cohort_producer_authority_revocations" (
    "id" UUID NOT NULL,
    "authority_id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "producer_key_id" TEXT NOT NULL,
    "authority_version" INTEGER NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL,
    "reason_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_producer_authority_revocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cohort_producer_revocation_version_check"
      CHECK ("authority_version" > 0),
    CONSTRAINT "cohort_producer_revocation_reason_check"
      CHECK ("reason_code" ~ '^[A-Z][A-Z0-9_]{0,63}$'),
    CONSTRAINT "cohort_producer_authority_revocations_authority_id_fkey"
      FOREIGN KEY ("authority_id") REFERENCES "cohort_producer_authorities"("id")
      ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "cohort_producer_authority_revocations_authority_id_key"
ON "cohort_producer_authority_revocations"("authority_id");

CREATE UNIQUE INDEX "cohort_producer_revocation_epoch_key"
ON "cohort_producer_authority_revocations"("org_id", "producer_key_id", "authority_version");

CREATE TABLE "aggregate_privacy_reservations" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "reservation_key" TEXT NOT NULL,
    "owner_kind" TEXT NOT NULL,
    "owner_reference" TEXT NOT NULL,
    "owner_content_hash" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregate_privacy_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "aggregate_privacy_reservation_owner_kind_check"
      CHECK ("owner_kind" IN ('SLICE_C_FIXED_WINDOW', 'OUTCOME_COMPARISON_PROOF')),
    CONSTRAINT "aggregate_privacy_reservation_key_check"
      CHECK ("reservation_key" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "aggregate_privacy_reservation_content_hash_check"
      CHECK ("owner_content_hash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "aggregate_privacy_reservation_key"
ON "aggregate_privacy_reservations"("org_id", "reservation_key");

CREATE UNIQUE INDEX "aggregate_privacy_reservation_owner_key"
ON "aggregate_privacy_reservations"("org_id", "owner_kind", "owner_reference");

CREATE TABLE "cohort_proof_journal" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "proof_id" TEXT NOT NULL,
    "proof_hash" TEXT NOT NULL,
    "producer_key_id" TEXT NOT NULL,
    "authority_version" INTEGER NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "outcome_metric" TEXT NOT NULL,
    "outcome_unit" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "baseline_period_start" TIMESTAMP(3) NOT NULL,
    "baseline_period_end" TIMESTAMP(3) NOT NULL,
    "baseline_cohort_size" INTEGER NOT NULL,
    "baseline_evidence_id" TEXT NOT NULL,
    "baseline_evidence_hash" TEXT NOT NULL,
    "comparison_period_start" TIMESTAMP(3) NOT NULL,
    "comparison_period_end" TIMESTAMP(3) NOT NULL,
    "comparison_cohort_size" INTEGER NOT NULL,
    "comparison_evidence_id" TEXT NOT NULL,
    "comparison_evidence_hash" TEXT NOT NULL,
    "evidence_pair_hash" TEXT NOT NULL,
    "admission_receipt_hash" TEXT NOT NULL,
    "reservation_key" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_proof_journal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cohort_proof_journal_decision_check"
      CHECK ("decision" = 'VERIFIED_PRIVACY_ONLY'),
    CONSTRAINT "cohort_proof_journal_baseline_count_check"
      CHECK ("baseline_cohort_size" >= 5),
    CONSTRAINT "cohort_proof_journal_comparison_count_check"
      CHECK ("comparison_cohort_size" >= 5),
    CONSTRAINT "cohort_proof_journal_baseline_window_check"
      CHECK ("baseline_period_end" > "baseline_period_start"),
    CONSTRAINT "cohort_proof_journal_comparison_window_check"
      CHECK ("comparison_period_end" > "comparison_period_start")
);

CREATE UNIQUE INDEX "cohort_proof_journal_proof_id_key"
ON "cohort_proof_journal"("org_id", "proof_id");

CREATE UNIQUE INDEX "cohort_proof_journal_proof_hash_key"
ON "cohort_proof_journal"("org_id", "proof_hash");

CREATE UNIQUE INDEX "cohort_proof_journal_admission_hash_key"
ON "cohort_proof_journal"("org_id", "admission_receipt_hash");

CREATE UNIQUE INDEX "cohort_proof_journal_evidence_pair_key"
ON "cohort_proof_journal"("org_id", "evidence_pair_hash");

CREATE UNIQUE INDEX "cohort_proof_journal_reservation_key"
ON "cohort_proof_journal"("org_id", "reservation_key");

CREATE OR REPLACE FUNCTION "reject_mcii_privacy_authority_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'MCII privacy authority rows are append-only'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cohort_producer_authorities_append_only"
BEFORE UPDATE OR DELETE ON "cohort_producer_authorities"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "cohort_producer_authority_revocations_append_only"
BEFORE UPDATE OR DELETE ON "cohort_producer_authority_revocations"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "aggregate_privacy_reservations_append_only"
BEFORE UPDATE OR DELETE ON "aggregate_privacy_reservations"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "cohort_proof_journal_append_only"
BEFORE UPDATE OR DELETE ON "cohort_proof_journal"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "aggregate_privacy_release_journal_append_only"
BEFORE UPDATE OR DELETE ON "aggregate_privacy_release_journal"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "aggregate_privacy_manifests_append_only"
BEFORE UPDATE OR DELETE ON "aggregate_privacy_manifests"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "aggregate_privacy_contribution_claims_append_only"
BEFORE UPDATE OR DELETE ON "aggregate_privacy_contribution_claims"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();
