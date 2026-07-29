CREATE EXTENSION IF NOT EXISTS pgcrypto;
REVOKE ALL ON FUNCTION public.digest(BYTEA, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hmac(BYTEA, BYTEA, TEXT) FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'fluencytracr_c1_runtime'
  ) THEN
    CREATE ROLE fluencytracr_c1_runtime
      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'fluencytracr_c1_attestation_provisioner'
  ) THEN
    CREATE ROLE fluencytracr_c1_attestation_provisioner
      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

CREATE TABLE "outcome_comparison_attestation_keys" (
    "key_id" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "provisioned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outcome_comparison_attestation_keys_pkey" PRIMARY KEY ("key_id"),
    CONSTRAINT "outcome_comparison_attestation_key_shape_check"
      CHECK (
        "key_id" ~ '^FT_C1_HMAC_[A-Z0-9_]{1,48}$'
        AND "algorithm" = 'HMAC-SHA-256'
        AND "secret_hash" ~ '^[0-9a-f]{64}$'
      )
);

CREATE TABLE "outcome_comparison_attestation_key_activations" (
    "activation_epoch" BIGSERIAL NOT NULL,
    "key_id" TEXT NOT NULL,
    "activated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outcome_comparison_attestation_key_activations_pkey"
      PRIMARY KEY ("activation_epoch"),
    CONSTRAINT "outcome_comparison_attestation_activation_key_fkey"
      FOREIGN KEY ("key_id")
      REFERENCES "outcome_comparison_attestation_keys"("key_id")
      ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "outcome_comparison_attestation_key_revocations" (
    "key_id" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "revoked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outcome_comparison_attestation_key_revocations_pkey"
      PRIMARY KEY ("key_id"),
    CONSTRAINT "outcome_comparison_attestation_revocation_reason_check"
      CHECK ("reason_code" ~ '^[A-Z][A-Z0-9_]{0,63}$'),
    CONSTRAINT "outcome_comparison_attestation_revocation_key_fkey"
      FOREIGN KEY ("key_id")
      REFERENCES "outcome_comparison_attestation_keys"("key_id")
      ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "outcome_comparison_privacy_releases" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "proof_journal_id" UUID NOT NULL,
    "proof_hash" TEXT NOT NULL,
    "reservation_key" TEXT NOT NULL,
    "admission_receipt_hash" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "outcome_metric" TEXT NOT NULL,
    "outcome_unit" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "baseline_period_start" TIMESTAMP(3) NOT NULL,
    "baseline_period_end" TIMESTAMP(3) NOT NULL,
    "baseline_evidence_id" TEXT NOT NULL,
    "baseline_evidence_hash" TEXT NOT NULL,
    "baseline_cohort_size" INTEGER NOT NULL,
    "baseline_aggregate_value" DOUBLE PRECISION NOT NULL,
    "comparison_period_start" TIMESTAMP(3) NOT NULL,
    "comparison_period_end" TIMESTAMP(3) NOT NULL,
    "comparison_evidence_id" TEXT NOT NULL,
    "comparison_evidence_hash" TEXT NOT NULL,
    "comparison_cohort_size" INTEGER NOT NULL,
    "comparison_aggregate_value" DOUBLE PRECISION NOT NULL,
    "projection_json" JSONB NOT NULL,
    "projection_hash" TEXT NOT NULL,
    "content_fingerprint" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comparison_privacy_only" BOOLEAN NOT NULL,
    "claim_authority_effect" TEXT NOT NULL,
    "claim_authorized" BOOLEAN NOT NULL,
    "model_authorized" BOOLEAN NOT NULL,
    "customer_publishable" BOOLEAN NOT NULL,
    "attestation_key_id" TEXT NOT NULL,
    "creation_attestation" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcome_comparison_privacy_releases_pkey"
      PRIMARY KEY ("id"),
    CONSTRAINT "outcome_comparison_release_policy_check"
      CHECK ("policy_version" = 'FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07'),
    CONSTRAINT "outcome_comparison_release_decision_check"
      CHECK ("decision" = 'ATOMIC_COMPARISON_PRIVACY_RELEASED'),
    CONSTRAINT "outcome_comparison_release_identity_check"
      CHECK (
        "org_id" ~ '^[a-z0-9][a-z0-9:_-]{0,179}$'
        AND "workflow_id" ~ '^[a-z0-9][a-z0-9:_-]{0,179}$'
        AND "jbtd_id" ~ '^[a-z0-9][a-z0-9_-]{0,63}$'
        AND "persona_id" ~ '^[a-z0-9][a-z0-9_-]{0,63}$'
      ),
    CONSTRAINT "outcome_comparison_release_evidence_ids_check"
      CHECK (
        "baseline_evidence_id" ~ '^[a-z0-9][a-z0-9_-]{0,127}$'
        AND "comparison_evidence_id" ~ '^[a-z0-9][a-z0-9_-]{0,127}$'
        AND "baseline_evidence_id" <> "comparison_evidence_id"
      ),
    CONSTRAINT "outcome_comparison_release_descriptors_check"
      CHECK (
        char_length("outcome_metric") BETWEEN 1 AND 180
        AND char_length("outcome_unit") BETWEEN 1 AND 80
        AND char_length("source_system") BETWEEN 1 AND 120
      ),
    CONSTRAINT "outcome_comparison_release_hashes_check"
      CHECK (
        "proof_hash" ~ '^[0-9a-f]{64}$'
        AND "reservation_key" ~ '^[0-9a-f]{64}$'
        AND "admission_receipt_hash" ~ '^[0-9a-f]{64}$'
        AND "baseline_evidence_hash" ~ '^[0-9a-f]{64}$'
        AND "comparison_evidence_hash" ~ '^[0-9a-f]{64}$'
        AND "projection_hash" ~ '^[0-9a-f]{64}$'
        AND "content_fingerprint" ~ '^[0-9a-f]{64}$'
      ),
    CONSTRAINT "outcome_comparison_release_windows_check"
      CHECK (
        "baseline_period_end" > "baseline_period_start"
        AND "comparison_period_end" > "comparison_period_start"
        AND "comparison_period_start" >= "baseline_period_end"
      ),
    CONSTRAINT "outcome_comparison_release_cohort_sizes_check"
      CHECK (
        "baseline_cohort_size" >= 5
        AND "comparison_cohort_size" >= 5
      ),
    CONSTRAINT "outcome_comparison_release_values_check"
      CHECK (
        "baseline_aggregate_value" <> 'NaN'::DOUBLE PRECISION
        AND "baseline_aggregate_value" <> 'Infinity'::DOUBLE PRECISION
        AND "baseline_aggregate_value" <> '-Infinity'::DOUBLE PRECISION
        AND "comparison_aggregate_value" <> 'NaN'::DOUBLE PRECISION
        AND "comparison_aggregate_value" <> 'Infinity'::DOUBLE PRECISION
        AND "comparison_aggregate_value" <> '-Infinity'::DOUBLE PRECISION
      ),
    CONSTRAINT "outcome_comparison_release_non_authority_check"
      CHECK (
        "comparison_privacy_only" IS TRUE
        AND "claim_authority_effect" = 'NONE'
        AND "claim_authorized" IS FALSE
        AND "model_authorized" IS FALSE
        AND "customer_publishable" IS FALSE
      ),
    CONSTRAINT "outcome_comparison_release_attestation_shape_check"
      CHECK (
        "attestation_key_id" ~ '^FT_C1_HMAC_[A-Z0-9_]{1,48}$'
        AND "creation_attestation" ~ '^[0-9a-f]{64}$'
      )
);

CREATE UNIQUE INDEX "outcome_comparison_release_proof_journal_key"
ON "outcome_comparison_privacy_releases"("org_id", "proof_journal_id");

CREATE UNIQUE INDEX "outcome_comparison_release_reservation_key"
ON "outcome_comparison_privacy_releases"("org_id", "reservation_key");

CREATE TRIGGER "outcome_comparison_privacy_releases_append_only"
BEFORE UPDATE OR DELETE ON "outcome_comparison_privacy_releases"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

ALTER TABLE public.outcome_comparison_privacy_releases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.outcome_comparison_privacy_releases FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.outcome_comparison_privacy_releases FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.outcome_comparison_privacy_releases FROM authenticated;
  END IF;
END
$$;

CREATE TRIGGER "outcome_comparison_attestation_keys_append_only"
BEFORE UPDATE OR DELETE ON "outcome_comparison_attestation_keys"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "outcome_comparison_attestation_activations_append_only"
BEFORE UPDATE OR DELETE ON "outcome_comparison_attestation_key_activations"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

CREATE TRIGGER "outcome_comparison_attestation_revocations_append_only"
BEFORE UPDATE OR DELETE ON "outcome_comparison_attestation_key_revocations"
FOR EACH ROW EXECUTE FUNCTION "reject_mcii_privacy_authority_mutation"();

ALTER TABLE public.outcome_comparison_attestation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_comparison_attestation_key_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_comparison_attestation_key_revocations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.outcome_comparison_attestation_keys FROM PUBLIC;
REVOKE ALL ON TABLE public.outcome_comparison_attestation_key_activations FROM PUBLIC;
REVOKE ALL ON TABLE public.outcome_comparison_attestation_key_revocations FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM fluencytracr_c1_attestation_provisioner;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM fluencytracr_c1_attestation_provisioner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM fluencytracr_c1_runtime;
REVOKE CREATE ON SCHEMA public FROM fluencytracr_c1_attestation_provisioner;

GRANT SELECT, INSERT ON TABLE
  public.outcome_comparison_attestation_keys,
  public.outcome_comparison_attestation_key_activations,
  public.outcome_comparison_attestation_key_revocations
TO fluencytracr_c1_attestation_provisioner;
DO $$
DECLARE
  activation_sequence TEXT;
BEGIN
  activation_sequence := pg_catalog.pg_get_serial_sequence(
    'public.outcome_comparison_attestation_key_activations',
    'activation_epoch'
  );
  EXECUTE pg_catalog.format(
    'GRANT USAGE, SELECT ON SEQUENCE %s TO fluencytracr_c1_attestation_provisioner',
    activation_sequence
  );
END
$$;

CREATE POLICY "outcome_comparison_attestation_keys_provisioner"
ON public.outcome_comparison_attestation_keys
FOR SELECT TO fluencytracr_c1_attestation_provisioner USING (true);
CREATE POLICY "outcome_comparison_attestation_keys_provisioner_insert"
ON public.outcome_comparison_attestation_keys
FOR INSERT TO fluencytracr_c1_attestation_provisioner WITH CHECK (true);
CREATE POLICY "outcome_comparison_attestation_activations_provisioner"
ON public.outcome_comparison_attestation_key_activations
FOR SELECT TO fluencytracr_c1_attestation_provisioner USING (true);
CREATE POLICY "outcome_comparison_attestation_activations_provisioner_insert"
ON public.outcome_comparison_attestation_key_activations
FOR INSERT TO fluencytracr_c1_attestation_provisioner WITH CHECK (true);
CREATE POLICY "outcome_comparison_attestation_revocations_provisioner"
ON public.outcome_comparison_attestation_key_revocations
FOR SELECT TO fluencytracr_c1_attestation_provisioner USING (true);
CREATE POLICY "outcome_comparison_attestation_revocations_provisioner_insert"
ON public.outcome_comparison_attestation_key_revocations
FOR INSERT TO fluencytracr_c1_attestation_provisioner WITH CHECK (true);

GRANT SELECT, INSERT ON TABLE public.outcome_comparison_privacy_releases
TO fluencytracr_c1_runtime;
CREATE POLICY "outcome_comparison_privacy_releases_runtime_select"
ON public.outcome_comparison_privacy_releases
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "outcome_comparison_privacy_releases_runtime_insert"
ON public.outcome_comparison_privacy_releases
FOR INSERT TO fluencytracr_c1_runtime WITH CHECK (true);

ALTER TABLE public.outcome_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_value_objects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON TABLE
  public.cohort_producer_authorities,
  public.ai_value_objects
TO fluencytracr_c1_runtime;
GRANT SELECT ON TABLE
  public.cohort_producer_authority_revocations,
  public.aggregate_privacy_reservations,
  public.cohort_proof_journal,
  public.outcome_evidence,
  public.aggregate_privacy_release_journal
TO fluencytracr_c1_runtime;

CREATE POLICY "cohort_producer_authorities_c1_runtime"
ON public.cohort_producer_authorities
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "cohort_producer_authorities_c1_runtime_lock"
ON public.cohort_producer_authorities
FOR UPDATE TO fluencytracr_c1_runtime USING (true) WITH CHECK (false);
CREATE POLICY "cohort_producer_authority_revocations_c1_runtime"
ON public.cohort_producer_authority_revocations
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "aggregate_privacy_reservations_c1_runtime"
ON public.aggregate_privacy_reservations
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "cohort_proof_journal_c1_runtime"
ON public.cohort_proof_journal
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "outcome_evidence_c1_runtime_select"
ON public.outcome_evidence
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "ai_value_objects_c1_runtime_select"
ON public.ai_value_objects
FOR SELECT TO fluencytracr_c1_runtime USING (true);
CREATE POLICY "ai_value_objects_c1_runtime_lock"
ON public.ai_value_objects
FOR UPDATE TO fluencytracr_c1_runtime USING (true) WITH CHECK (false);

CREATE OR REPLACE FUNCTION "reject_c1_runtime_lock_only_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF session_user = 'fluencytracr_c1_runtime' THEN
    RAISE EXCEPTION 'C.1 runtime rows are lock-only'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION public.reject_c1_runtime_lock_only_mutation() FROM PUBLIC;

CREATE TRIGGER "ai_value_objects_c1_runtime_lock_only"
BEFORE UPDATE ON public.ai_value_objects
FOR EACH ROW EXECUTE FUNCTION "reject_c1_runtime_lock_only_mutation"();

CREATE TRIGGER "cohort_producer_authorities_c1_runtime_lock_only"
BEFORE UPDATE ON public.cohort_producer_authorities
FOR EACH ROW EXECUTE FUNCTION "reject_c1_runtime_lock_only_mutation"();

CREATE OR REPLACE FUNCTION "outcome_comparison_attestation_frame"(value BYTEA)
RETURNS BYTEA AS $$
  SELECT pg_catalog.int4send(pg_catalog.octet_length(value)) || value;
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION "outcome_comparison_creation_attestation_message"(
  release_row public.outcome_comparison_privacy_releases
)
RETURNS BYTEA AS $$
  SELECT
    public.outcome_comparison_attestation_frame(
      pg_catalog.convert_to('FT_C1_CREATION_ATTESTATION_V1', 'UTF8')
    )
    || public.outcome_comparison_attestation_frame(
      pg_catalog.convert_to(release_row.attestation_key_id, 'UTF8')
    )
    || public.outcome_comparison_attestation_frame(
      pg_catalog.uuid_send(release_row.id)
    )
    || public.outcome_comparison_attestation_frame(
      pg_catalog.int8send(
        (extract(epoch FROM release_row.created_at) * 1000)::BIGINT
      )
    )
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.policy_version, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.org_id, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.workflow_id, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.jbtd_id, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.persona_id, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.uuid_send(release_row.proof_journal_id))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.proof_hash, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.reservation_key, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.admission_receipt_hash, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.outcome_metric, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.outcome_unit, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.source_system, 'UTF8'))
    || public.outcome_comparison_attestation_frame(
      pg_catalog.int8send(
        (extract(epoch FROM (release_row.baseline_period_start AT TIME ZONE 'UTC')) * 1000)::BIGINT
      )
    )
    || public.outcome_comparison_attestation_frame(
      pg_catalog.int8send(
        (extract(epoch FROM (release_row.baseline_period_end AT TIME ZONE 'UTC')) * 1000)::BIGINT
      )
    )
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.baseline_evidence_id, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.baseline_evidence_hash, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.int4send(release_row.baseline_cohort_size))
    || public.outcome_comparison_attestation_frame(pg_catalog.float8send(release_row.baseline_aggregate_value))
    || public.outcome_comparison_attestation_frame(
      pg_catalog.int8send(
        (extract(epoch FROM (release_row.comparison_period_start AT TIME ZONE 'UTC')) * 1000)::BIGINT
      )
    )
    || public.outcome_comparison_attestation_frame(
      pg_catalog.int8send(
        (extract(epoch FROM (release_row.comparison_period_end AT TIME ZONE 'UTC')) * 1000)::BIGINT
      )
    )
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.comparison_evidence_id, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.comparison_evidence_hash, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.int4send(release_row.comparison_cohort_size))
    || public.outcome_comparison_attestation_frame(pg_catalog.float8send(release_row.comparison_aggregate_value))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.projection_hash, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.decode(release_row.content_fingerprint, 'hex'))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.decision, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.boolsend(release_row.comparison_privacy_only))
    || public.outcome_comparison_attestation_frame(pg_catalog.convert_to(release_row.claim_authority_effect, 'UTF8'))
    || public.outcome_comparison_attestation_frame(pg_catalog.boolsend(release_row.claim_authorized))
    || public.outcome_comparison_attestation_frame(pg_catalog.boolsend(release_row.model_authorized))
    || public.outcome_comparison_attestation_frame(pg_catalog.boolsend(release_row.customer_publishable));
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION "stamp_outcome_comparison_creation_attestation"()
RETURNS TRIGGER AS $$
DECLARE
  supplied_key_id TEXT;
  supplied_secret TEXT;
  active_key_id TEXT;
  active_secret_hash TEXT;
  active_algorithm TEXT;
  active_revoked BOOLEAN;
BEGIN
  IF session_user <> 'fluencytracr_c1_runtime' THEN
    RAISE EXCEPTION 'C.1 release insertion requires the direct runtime login'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  supplied_key_id := pg_catalog.current_setting(
    'fluencytracr.c1_attestation_key_id',
    true
  );
  supplied_secret := pg_catalog.current_setting(
    'fluencytracr.c1_attestation_secret',
    true
  );
  IF supplied_key_id IS NULL
     OR supplied_key_id !~ '^FT_C1_HMAC_[A-Z0-9_]{1,48}$'
     OR supplied_secret IS NULL
     OR supplied_secret !~ '^[A-Za-z0-9_-]{43}$' THEN
    RAISE EXCEPTION 'C.1 creation attestation is unavailable'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0)
  );

  SELECT activation.key_id, key_row.secret_hash, key_row.algorithm,
         revocation.key_id IS NOT NULL
  INTO active_key_id, active_secret_hash, active_algorithm, active_revoked
  FROM public.outcome_comparison_attestation_key_activations AS activation
  JOIN public.outcome_comparison_attestation_keys AS key_row
    ON key_row.key_id = activation.key_id
  LEFT JOIN public.outcome_comparison_attestation_key_revocations AS revocation
    ON revocation.key_id = activation.key_id
  ORDER BY activation.activation_epoch DESC
  LIMIT 1;

  IF active_key_id IS NULL
     OR active_key_id <> supplied_key_id
     OR active_algorithm <> 'HMAC-SHA-256'
     OR active_revoked
     OR active_secret_hash <>
       pg_catalog.encode(
         public.digest(pg_catalog.convert_to(supplied_secret, 'UTF8'), 'sha256'),
         'hex'
       ) THEN
    RAISE EXCEPTION 'C.1 creation attestation authority rejected'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  NEW.created_at :=
    pg_catalog.date_trunc('milliseconds', pg_catalog.clock_timestamp())::TIMESTAMPTZ(3);
  NEW.attestation_key_id := active_key_id;
  NEW.creation_attestation := pg_catalog.encode(
    public.hmac(
      public.outcome_comparison_creation_attestation_message(NEW),
      pg_catalog.convert_to(supplied_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION "verify_outcome_comparison_creation_attestation"(
  release_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  release_row public.outcome_comparison_privacy_releases%ROWTYPE;
  supplied_key_id TEXT;
  supplied_secret TEXT;
  registry_hash TEXT;
  registry_algorithm TEXT;
  is_revoked BOOLEAN;
  expected_hmac TEXT;
BEGIN
  IF session_user <> 'fluencytracr_c1_runtime' THEN
    RETURN false;
  END IF;
  supplied_key_id := pg_catalog.current_setting(
    'fluencytracr.c1_attestation_key_id',
    true
  );
  supplied_secret := pg_catalog.current_setting(
    'fluencytracr.c1_attestation_secret',
    true
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0)
  );
  SELECT * INTO release_row
  FROM public.outcome_comparison_privacy_releases
  WHERE id = release_id;
  IF NOT FOUND
     OR supplied_key_id IS NULL
     OR supplied_secret IS NULL
     OR supplied_key_id <> release_row.attestation_key_id THEN
    RETURN false;
  END IF;
  SELECT key_row.secret_hash, key_row.algorithm,
         revocation.key_id IS NOT NULL
  INTO registry_hash, registry_algorithm, is_revoked
  FROM public.outcome_comparison_attestation_keys AS key_row
  LEFT JOIN public.outcome_comparison_attestation_key_revocations AS revocation
    ON revocation.key_id = key_row.key_id
  WHERE key_row.key_id = release_row.attestation_key_id;
  IF registry_hash IS NULL
     OR registry_algorithm <> 'HMAC-SHA-256'
     OR is_revoked
     OR registry_hash <>
       pg_catalog.encode(
         public.digest(pg_catalog.convert_to(supplied_secret, 'UTF8'), 'sha256'),
         'hex'
       ) THEN
    RETURN false;
  END IF;
  expected_hmac := pg_catalog.encode(
    public.hmac(
      public.outcome_comparison_creation_attestation_message(release_row),
      pg_catalog.convert_to(supplied_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  RETURN expected_hmac = release_row.creation_attestation;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION "outcome_comparison_attestation_readiness"(
  configured_active_key_id TEXT,
  configured_key_ids TEXT[],
  configured_secrets TEXT[]
)
RETURNS TABLE(ok BOOLEAN, diagnostics TEXT[]) AS $$
DECLARE
  active_key_id TEXT;
  active_revoked BOOLEAN;
  input_index INTEGER;
  expected_hash TEXT;
  registry_hash TEXT;
  registry_algorithm TEXT;
  registry_revoked BOOLEAN;
BEGIN
  ok := true;
  diagnostics := ARRAY[]::TEXT[];
  IF session_user <> 'fluencytracr_c1_runtime' THEN
    RETURN QUERY SELECT false, ARRAY['RUNTIME_LOGIN_INVALID']::TEXT[];
    RETURN;
  END IF;
  IF configured_active_key_id IS NULL
     OR configured_active_key_id !~ '^FT_C1_HMAC_[A-Z0-9_]{1,48}$'
     OR configured_key_ids IS NULL
     OR configured_secrets IS NULL
     OR pg_catalog.cardinality(configured_key_ids) = 0
     OR pg_catalog.cardinality(configured_key_ids) <>
        pg_catalog.cardinality(configured_secrets)
     OR NOT (configured_active_key_id = ANY(configured_key_ids))
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(configured_key_ids) AS configured(key_id)
       WHERE configured.key_id IS NULL
          OR configured.key_id !~ '^FT_C1_HMAC_[A-Z0-9_]{1,48}$'
     )
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.unnest(configured_secrets) AS configured(secret)
       WHERE configured.secret IS NULL
          OR configured.secret !~ '^[A-Za-z0-9_-]{43}$'
     )
     OR (
       SELECT pg_catalog.count(*) <>
              pg_catalog.count(DISTINCT configured.key_id)
       FROM pg_catalog.unnest(configured_key_ids) AS configured(key_id)
     ) THEN
    RETURN QUERY SELECT false, ARRAY['CONFIG_INVALID']::TEXT[];
    RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0)
  );

  SELECT activation.key_id, revocation.key_id IS NOT NULL
  INTO active_key_id, active_revoked
  FROM public.outcome_comparison_attestation_key_activations AS activation
  LEFT JOIN public.outcome_comparison_attestation_key_revocations AS revocation
    ON revocation.key_id = activation.key_id
  ORDER BY activation.activation_epoch DESC
  LIMIT 1;
  IF active_key_id IS NULL
     OR active_key_id <> configured_active_key_id
     OR active_revoked THEN
    ok := false;
    diagnostics := pg_catalog.array_append(diagnostics, 'ACTIVE_KEY_INVALID');
  END IF;

  FOR input_index IN 1..pg_catalog.cardinality(configured_key_ids) LOOP
    expected_hash := pg_catalog.encode(
      public.digest(
        pg_catalog.convert_to(configured_secrets[input_index], 'UTF8'),
        'sha256'
      ),
      'hex'
    );
    SELECT key_row.secret_hash, key_row.algorithm,
           revocation.key_id IS NOT NULL
    INTO registry_hash, registry_algorithm, registry_revoked
    FROM public.outcome_comparison_attestation_keys AS key_row
    LEFT JOIN public.outcome_comparison_attestation_key_revocations AS revocation
      ON revocation.key_id = key_row.key_id
    WHERE key_row.key_id = configured_key_ids[input_index];
    IF registry_hash IS NULL
       OR registry_algorithm <> 'HMAC-SHA-256'
       OR registry_revoked
       OR registry_hash <> expected_hash THEN
      ok := false;
      diagnostics := pg_catalog.array_append(diagnostics, 'CONFIGURED_KEY_INVALID');
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.outcome_comparison_privacy_releases AS release_row
    LEFT JOIN public.outcome_comparison_attestation_key_revocations AS revocation
      ON revocation.key_id = release_row.attestation_key_id
    WHERE revocation.key_id IS NULL
      AND NOT release_row.attestation_key_id = ANY(configured_key_ids)
  ) THEN
    ok := false;
    diagnostics := pg_catalog.array_append(diagnostics, 'REFERENCED_KEY_MISSING');
  END IF;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.outcome_comparison_attestation_frame(BYTEA) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.outcome_comparison_creation_attestation_message(public.outcome_comparison_privacy_releases) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stamp_outcome_comparison_creation_attestation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_outcome_comparison_creation_attestation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.outcome_comparison_attestation_readiness(TEXT, TEXT[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_outcome_comparison_creation_attestation(UUID)
TO fluencytracr_c1_runtime;
GRANT EXECUTE ON FUNCTION public.outcome_comparison_attestation_readiness(TEXT, TEXT[], TEXT[])
TO fluencytracr_c1_runtime;

CREATE TRIGGER "outcome_comparison_creation_attestation_before_insert"
BEFORE INSERT ON "outcome_comparison_privacy_releases"
FOR EACH ROW EXECUTE FUNCTION "stamp_outcome_comparison_creation_attestation"();

CREATE OR REPLACE FUNCTION "outcome_evidence_family_lock_key"(
  org_id_value TEXT,
  workflow_id_value TEXT,
  jbtd_id_value TEXT,
  persona_id_value TEXT
)
RETURNS TEXT AS $$
  SELECT
    '['
    || pg_catalog.to_json('FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1'::TEXT)::TEXT
    || ',' || pg_catalog.to_json(org_id_value)::TEXT
    || ',' || pg_catalog.to_json(workflow_id_value)::TEXT
    || ',' || COALESCE(pg_catalog.to_json(jbtd_id_value)::TEXT, 'null')
    || ',' || COALESCE(pg_catalog.to_json(persona_id_value)::TEXT, 'null')
    || ']';
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE CALLED ON NULL INPUT
SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION "lock_outcome_evidence_family_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  old_lock_key TEXT;
  new_lock_key TEXT;
  old_lock_id BIGINT;
  new_lock_id BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_lock_key := public.outcome_evidence_family_lock_key(
      NEW.org_id,
      NEW.workflow_id,
      NEW.jbtd_id,
      NEW.persona_id
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new_lock_key, 0)
    );
    RETURN NEW;
  END IF;

  old_lock_key := public.outcome_evidence_family_lock_key(
    OLD.org_id,
    OLD.workflow_id,
    OLD.jbtd_id,
    OLD.persona_id
  );

  IF TG_OP = 'DELETE' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old_lock_key, 0)
    );
    RETURN OLD;
  END IF;

  new_lock_key := public.outcome_evidence_family_lock_key(
    NEW.org_id,
    NEW.workflow_id,
    NEW.jbtd_id,
    NEW.persona_id
  );
  old_lock_id := pg_catalog.hashtextextended(old_lock_key, 0);
  new_lock_id := pg_catalog.hashtextextended(new_lock_key, 0);

  IF old_lock_id <= new_lock_id THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(old_lock_id);
    IF new_lock_id <> old_lock_id THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(new_lock_id);
    END IF;
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(new_lock_id);
    PERFORM pg_catalog.pg_advisory_xact_lock(old_lock_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.lock_outcome_evidence_family_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.outcome_evidence_family_lock_key(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

CREATE TRIGGER "outcome_evidence_family_lock_before_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "outcome_evidence"
FOR EACH ROW EXECUTE FUNCTION "lock_outcome_evidence_family_mutation"();
