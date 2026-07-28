-- CI-only companion for the repository's db-push-and-baseline harness.
-- Production migration authority remains the matching Prisma migration.

ALTER TABLE "cohort_producer_authorities"
  ADD CONSTRAINT "cohort_producer_authority_version_check"
    CHECK ("authority_version" > 0),
  ADD CONSTRAINT "cohort_producer_authority_time_check"
    CHECK ("expires_at" > "valid_from"),
  ADD CONSTRAINT "cohort_producer_authority_fingerprint_check"
    CHECK ("public_key_fingerprint" ~ '^[0-9a-f]{64}$');

ALTER TABLE "cohort_producer_authority_revocations"
  ADD CONSTRAINT "cohort_producer_revocation_version_check"
    CHECK ("authority_version" > 0),
  ADD CONSTRAINT "cohort_producer_revocation_reason_check"
    CHECK ("reason_code" ~ '^[A-Z][A-Z0-9_]{0,63}$');

ALTER TABLE "aggregate_privacy_reservations"
  ADD CONSTRAINT "aggregate_privacy_reservation_owner_kind_check"
    CHECK ("owner_kind" IN ('SLICE_C_FIXED_WINDOW', 'OUTCOME_COMPARISON_PROOF')),
  ADD CONSTRAINT "aggregate_privacy_reservation_key_check"
    CHECK ("reservation_key" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "aggregate_privacy_reservation_content_hash_check"
    CHECK ("owner_content_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "cohort_proof_journal"
  ADD CONSTRAINT "cohort_proof_journal_decision_check"
    CHECK ("decision" = 'VERIFIED_PRIVACY_ONLY'),
  ADD CONSTRAINT "cohort_proof_journal_baseline_count_check"
    CHECK ("baseline_cohort_size" >= 5),
  ADD CONSTRAINT "cohort_proof_journal_comparison_count_check"
    CHECK ("comparison_cohort_size" >= 5),
  ADD CONSTRAINT "cohort_proof_journal_baseline_window_check"
    CHECK ("baseline_period_end" > "baseline_period_start"),
  ADD CONSTRAINT "cohort_proof_journal_comparison_window_check"
    CHECK ("comparison_period_end" > "comparison_period_start");

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

ALTER TABLE public.cohort_producer_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_producer_authority_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregate_privacy_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_proof_journal ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cohort_producer_authorities FROM PUBLIC;
REVOKE ALL ON TABLE public.cohort_producer_authority_revocations FROM PUBLIC;
REVOKE ALL ON TABLE public.aggregate_privacy_reservations FROM PUBLIC;
REVOKE ALL ON TABLE public.cohort_proof_journal FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.cohort_producer_authorities FROM anon;
    REVOKE ALL ON TABLE public.cohort_producer_authority_revocations FROM anon;
    REVOKE ALL ON TABLE public.aggregate_privacy_reservations FROM anon;
    REVOKE ALL ON TABLE public.cohort_proof_journal FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.cohort_producer_authorities FROM authenticated;
    REVOKE ALL ON TABLE public.cohort_producer_authority_revocations FROM authenticated;
    REVOKE ALL ON TABLE public.aggregate_privacy_reservations FROM authenticated;
    REVOKE ALL ON TABLE public.cohort_proof_journal FROM authenticated;
  END IF;
END
$$;
