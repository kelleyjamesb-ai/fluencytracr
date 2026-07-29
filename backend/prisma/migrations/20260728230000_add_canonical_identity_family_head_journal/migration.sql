BEGIN;

LOCK TABLE public.value_hypotheses, public.measurement_plans, public.measurement_cell_snapshots
  IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'fluencytracr_slice_e_owner'
  ) THEN
    CREATE ROLE fluencytracr_slice_e_owner
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
      NOREPLICATION NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'fluencytracr_slice_e_runtime'
  ) THEN
    CREATE ROLE fluencytracr_slice_e_runtime
      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
      NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

CREATE TABLE "ai_value_canonical_identity_family_head_journal" (
  "source_kind" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "stable_source_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "source_row_id" UUID NOT NULL,
  "predecessor_row_id" UUID,
  "source_semantic_commitment" TEXT,
  "source_attestation_commitment" TEXT,
  "attestation_state" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_value_canonical_identity_family_head_journal_pkey"
    PRIMARY KEY ("source_kind", "org_id", "stable_source_id", "version"),
  CONSTRAINT "canonical_identity_family_source_kind_check"
    CHECK (
      "source_kind" IN (
        'VALUE_HYPOTHESIS',
        'MEASUREMENT_PLAN',
        'MEASUREMENT_CELL'
      )
    ),
  CONSTRAINT "canonical_identity_family_identity_check"
    CHECK (
      char_length("org_id") BETWEEN 1 AND 180
      AND char_length("stable_source_id") BETWEEN 1 AND 512
      AND "version" >= 1
    ),
  CONSTRAINT "canonical_identity_family_root_check"
    CHECK (
      ("version" = 1 AND "predecessor_row_id" IS NULL)
      OR ("version" > 1 AND "predecessor_row_id" IS NOT NULL)
    ),
  CONSTRAINT "canonical_identity_family_attestation_check"
    CHECK (
      (
        "attestation_state" = 'UNATTESTED_LEGACY'
        AND "source_semantic_commitment" IS NULL
        AND "source_attestation_commitment" IS NULL
      )
      OR (
        "attestation_state" = 'ATTESTATION_PRESENT'
        AND "source_semantic_commitment" ~ '^[0-9a-f]{64}$'
        AND "source_attestation_commitment" ~ '^[0-9a-f]{64}$'
      )
    )
);

CREATE UNIQUE INDEX "canonical_identity_family_source_row_key"
  ON "ai_value_canonical_identity_family_head_journal"(
    "source_kind",
    "source_row_id"
  );

CREATE INDEX "canonical_identity_family_tail_idx"
  ON "ai_value_canonical_identity_family_head_journal"(
    "source_kind",
    "org_id",
    "stable_source_id",
    "version" DESC
  );

CREATE OR REPLACE FUNCTION public.canonical_identity_family_lock_key(
  source_kind_value TEXT,
  org_id_value TEXT,
  stable_source_id_value TEXT
)
RETURNS TEXT AS $function$
  SELECT
    '['
    || pg_catalog.to_json('FT_CANONICAL_IDENTITY_FAMILY_LOCK_V1'::TEXT)::TEXT
    || ',' || pg_catalog.to_json(source_kind_value)::TEXT
    || ',' || pg_catalog.to_json(org_id_value)::TEXT
    || ',' || pg_catalog.to_json(stable_source_id_value)::TEXT
    || ']';
$function$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION public.canonical_identity_source_commitments(
  source_kind_value TEXT,
  validation_value JSONB
)
RETURNS TABLE (
  source_semantic_commitment TEXT,
  source_attestation_commitment TEXT,
  attestation_state TEXT
) AS $function$
DECLARE
  envelope JSONB;
  semantic_field_name TEXT;
  key_id_value TEXT;
  mac_value TEXT;
  semantic_value TEXT;
BEGIN
  CASE source_kind_value
    WHEN 'VALUE_HYPOTHESIS' THEN
      envelope := validation_value -> 'canonical_value_hypothesis_creation_attestation_v1';
      semantic_field_name := 'hypothesis_semantic_commitment';
    WHEN 'MEASUREMENT_PLAN' THEN
      envelope := validation_value -> 'canonical_hypothesis_edge_v1';
      semantic_field_name := 'plan_semantic_commitment';
    WHEN 'MEASUREMENT_CELL' THEN
      envelope := validation_value -> 'canonical_measurement_lineage_v1';
      semantic_field_name := 'measurement_cell_semantic_commitment';
    ELSE
      RAISE EXCEPTION 'unsupported canonical identity source kind'
        USING ERRCODE = 'integrity_constraint_violation';
  END CASE;

  IF envelope IS NULL THEN
    RETURN QUERY
      SELECT NULL::TEXT, NULL::TEXT, 'UNATTESTED_LEGACY'::TEXT;
    RETURN;
  END IF;

  IF pg_catalog.jsonb_typeof(envelope) <> 'object' THEN
    RAISE EXCEPTION 'canonical identity source attestation must be an object'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  semantic_value := envelope ->> semantic_field_name;
  key_id_value := envelope ->> 'key_id';
  mac_value := envelope ->> 'mac';

  IF semantic_value IS NULL
     OR semantic_value !~ '^[0-9a-f]{64}$'
     OR key_id_value IS NULL
     OR key_id_value !~ '^FT_E_HMAC_[A-Z0-9_]{1,48}$'
     OR mac_value IS NULL
     OR mac_value !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'canonical identity source attestation has invalid shape'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN QUERY
    SELECT semantic_value, mac_value, 'ATTESTATION_PRESENT'::TEXT;
END;
$function$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION public.append_canonical_identity_family_head()
RETURNS TRIGGER AS $function$
DECLARE
  source_kind_value TEXT;
  stable_source_id_value TEXT;
  tail_version INTEGER;
  tail_source_row_id UUID;
  commitment_row RECORD;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'value_hypotheses' THEN
      source_kind_value := 'VALUE_HYPOTHESIS';
      stable_source_id_value := NEW.value_hypothesis_id;
    WHEN 'measurement_plans' THEN
      source_kind_value := 'MEASUREMENT_PLAN';
      stable_source_id_value := NEW.measurement_plan_id;
    WHEN 'measurement_cell_snapshots' THEN
      source_kind_value := 'MEASUREMENT_CELL';
      stable_source_id_value := NEW.measurement_cell_id;
    ELSE
      RAISE EXCEPTION 'unsupported canonical identity source table'
        USING ERRCODE = 'integrity_constraint_violation';
  END CASE;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      public.canonical_identity_family_lock_key(
        source_kind_value,
        NEW.org_id,
        stable_source_id_value
      ),
      0
    )
  );

  SELECT journal.version, journal.source_row_id
  INTO tail_version, tail_source_row_id
  FROM public.ai_value_canonical_identity_family_head_journal AS journal
  WHERE journal.source_kind = source_kind_value
    AND journal.org_id = NEW.org_id
    AND journal.stable_source_id = stable_source_id_value
  ORDER BY journal.version DESC
  LIMIT 1;

  IF tail_version IS NULL THEN
    IF NEW.version <> 1 OR NEW.supersedes_id IS NOT NULL THEN
      RAISE EXCEPTION 'canonical identity family root must be exact version 1'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  ELSIF NEW.version <> tail_version + 1
        OR NEW.supersedes_id IS DISTINCT FROM tail_source_row_id THEN
    RAISE EXCEPTION 'canonical identity family successor is not the exact tail child'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  SELECT *
  INTO commitment_row
  FROM public.canonical_identity_source_commitments(
    source_kind_value,
    NEW.validation_json
  );

  INSERT INTO public.ai_value_canonical_identity_family_head_journal (
    source_kind,
    org_id,
    stable_source_id,
    version,
    source_row_id,
    predecessor_row_id,
    source_semantic_commitment,
    source_attestation_commitment,
    attestation_state
  ) VALUES (
    source_kind_value,
    NEW.org_id,
    stable_source_id_value,
    NEW.version,
    NEW.id,
    NEW.supersedes_id,
    commitment_row.source_semantic_commitment,
    commitment_row.source_attestation_commitment,
    commitment_row.attestation_state
  );

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION public.reject_canonical_identity_source_mutation()
RETURNS TRIGGER AS $function$
BEGIN
  RAISE EXCEPTION 'canonical identity source and journal rows are append-only'
    USING ERRCODE = 'insufficient_privilege';
END;
$function$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION
  public.canonical_identity_family_lock_key(TEXT, TEXT, TEXT)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.canonical_identity_source_commitments(TEXT, JSONB)
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.append_canonical_identity_family_head()
FROM PUBLIC;
REVOKE ALL ON FUNCTION
  public.reject_canonical_identity_source_mutation()
FROM PUBLIC;

DO $backfill$
DECLARE
  invalid_row RECORD;
BEGIN
  WITH source_rows AS (
    SELECT
      'VALUE_HYPOTHESIS'::TEXT AS source_kind,
      org_id,
      value_hypothesis_id AS stable_source_id,
      version,
      id AS source_row_id,
      supersedes_id AS predecessor_row_id
    FROM public.value_hypotheses
    UNION ALL
    SELECT
      'MEASUREMENT_PLAN'::TEXT,
      org_id,
      measurement_plan_id,
      version,
      id,
      supersedes_id
    FROM public.measurement_plans
    UNION ALL
    SELECT
      'MEASUREMENT_CELL'::TEXT,
      org_id,
      measurement_cell_id,
      version,
      id,
      supersedes_id
    FROM public.measurement_cell_snapshots
  ),
  sequenced AS (
    SELECT
      source_rows.*,
      pg_catalog.row_number() OVER (
        PARTITION BY source_kind, org_id, stable_source_id
        ORDER BY version
      ) AS expected_version,
      pg_catalog.lag(source_row_id) OVER (
        PARTITION BY source_kind, org_id, stable_source_id
        ORDER BY version
      ) AS expected_predecessor_row_id
    FROM source_rows
  )
  SELECT *
  INTO invalid_row
  FROM sequenced
  WHERE version <> expected_version
     OR (
       version = 1
       AND predecessor_row_id IS NOT NULL
     )
     OR (
       version > 1
       AND predecessor_row_id IS DISTINCT FROM expected_predecessor_row_id
     )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'canonical identity historical lineage is inconsistent for %, %, %, version %',
      invalid_row.source_kind,
      invalid_row.org_id,
      invalid_row.stable_source_id,
      invalid_row.version
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END
$backfill$;

INSERT INTO public.ai_value_canonical_identity_family_head_journal (
  source_kind,
  org_id,
  stable_source_id,
  version,
  source_row_id,
  predecessor_row_id,
  source_semantic_commitment,
  source_attestation_commitment,
  attestation_state
)
SELECT
  source_row.source_kind,
  source_row.org_id,
  source_row.stable_source_id,
  source_row.version,
  source_row.source_row_id,
  source_row.predecessor_row_id,
  commitments.source_semantic_commitment,
  commitments.source_attestation_commitment,
  commitments.attestation_state
FROM (
  SELECT
    'VALUE_HYPOTHESIS'::TEXT AS source_kind,
    org_id,
    value_hypothesis_id AS stable_source_id,
    version,
    id AS source_row_id,
    supersedes_id AS predecessor_row_id,
    validation_json
  FROM public.value_hypotheses
  UNION ALL
  SELECT
    'MEASUREMENT_PLAN'::TEXT,
    org_id,
    measurement_plan_id,
    version,
    id,
    supersedes_id,
    validation_json
  FROM public.measurement_plans
  UNION ALL
  SELECT
    'MEASUREMENT_CELL'::TEXT,
    org_id,
    measurement_cell_id,
    version,
    id,
    supersedes_id,
    validation_json
  FROM public.measurement_cell_snapshots
) AS source_row
CROSS JOIN LATERAL public.canonical_identity_source_commitments(
  source_row.source_kind,
  source_row.validation_json
) AS commitments
ORDER BY
  source_row.source_kind,
  source_row.org_id,
  source_row.stable_source_id,
  source_row.version;

CREATE TRIGGER "value_hypotheses_canonical_identity_append"
AFTER INSERT ON public.value_hypotheses
FOR EACH ROW EXECUTE FUNCTION public.append_canonical_identity_family_head();

CREATE TRIGGER "measurement_plans_canonical_identity_append"
AFTER INSERT ON public.measurement_plans
FOR EACH ROW EXECUTE FUNCTION public.append_canonical_identity_family_head();

CREATE TRIGGER "measurement_cell_snapshots_canonical_identity_append"
AFTER INSERT ON public.measurement_cell_snapshots
FOR EACH ROW EXECUTE FUNCTION public.append_canonical_identity_family_head();

CREATE TRIGGER "value_hypotheses_canonical_identity_append_only"
BEFORE UPDATE OR DELETE ON public.value_hypotheses
FOR EACH ROW EXECUTE FUNCTION public.reject_canonical_identity_source_mutation();

CREATE TRIGGER "measurement_plans_canonical_identity_append_only"
BEFORE UPDATE OR DELETE ON public.measurement_plans
FOR EACH ROW EXECUTE FUNCTION public.reject_canonical_identity_source_mutation();

CREATE TRIGGER "measurement_cell_snapshots_canonical_identity_append_only"
BEFORE UPDATE OR DELETE ON public.measurement_cell_snapshots
FOR EACH ROW EXECUTE FUNCTION public.reject_canonical_identity_source_mutation();

CREATE TRIGGER "canonical_identity_family_head_journal_append_only"
BEFORE UPDATE OR DELETE
ON public.ai_value_canonical_identity_family_head_journal
FOR EACH ROW EXECUTE FUNCTION public.reject_canonical_identity_source_mutation();

ALTER TABLE public.value_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_cell_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_value_canonical_identity_family_head_journal
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.value_hypotheses
  FROM fluencytracr_slice_e_runtime;
REVOKE ALL ON TABLE public.measurement_plans
  FROM fluencytracr_slice_e_runtime;
REVOKE ALL ON TABLE public.measurement_cell_snapshots
  FROM fluencytracr_slice_e_runtime;
REVOKE ALL ON TABLE public.ai_value_canonical_identity_family_head_journal
  FROM PUBLIC, fluencytracr_slice_e_runtime;
REVOKE CREATE ON SCHEMA public FROM fluencytracr_slice_e_runtime;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      public.ai_value_canonical_identity_family_head_journal
    FROM anon;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated'
  ) THEN
    REVOKE ALL ON TABLE
      public.ai_value_canonical_identity_family_head_journal
    FROM authenticated;
  END IF;
END
$$;

GRANT SELECT, INSERT ON TABLE
  public.value_hypotheses,
  public.measurement_plans,
  public.measurement_cell_snapshots
TO fluencytracr_slice_e_runtime;
GRANT SELECT ON TABLE
  public.ai_value_canonical_identity_family_head_journal
TO fluencytracr_slice_e_runtime;
GRANT EXECUTE ON FUNCTION
  public.canonical_identity_family_lock_key(TEXT, TEXT, TEXT)
TO fluencytracr_slice_e_runtime;

CREATE POLICY "value_hypotheses_slice_e_runtime_select"
ON public.value_hypotheses FOR SELECT
TO fluencytracr_slice_e_runtime USING (true);
CREATE POLICY "value_hypotheses_slice_e_runtime_insert"
ON public.value_hypotheses FOR INSERT
TO fluencytracr_slice_e_runtime WITH CHECK (true);
CREATE POLICY "measurement_plans_slice_e_runtime_select"
ON public.measurement_plans FOR SELECT
TO fluencytracr_slice_e_runtime USING (true);
CREATE POLICY "measurement_plans_slice_e_runtime_insert"
ON public.measurement_plans FOR INSERT
TO fluencytracr_slice_e_runtime WITH CHECK (true);
CREATE POLICY "measurement_cell_snapshots_slice_e_runtime_select"
ON public.measurement_cell_snapshots FOR SELECT
TO fluencytracr_slice_e_runtime USING (true);
CREATE POLICY "measurement_cell_snapshots_slice_e_runtime_insert"
ON public.measurement_cell_snapshots FOR INSERT
TO fluencytracr_slice_e_runtime WITH CHECK (true);
CREATE POLICY "canonical_identity_family_head_slice_e_runtime_select"
ON public.ai_value_canonical_identity_family_head_journal FOR SELECT
TO fluencytracr_slice_e_runtime USING (true);

ALTER FUNCTION public.canonical_identity_family_lock_key(TEXT, TEXT, TEXT)
  OWNER TO fluencytracr_slice_e_owner;
ALTER FUNCTION public.canonical_identity_source_commitments(TEXT, JSONB)
  OWNER TO fluencytracr_slice_e_owner;
ALTER FUNCTION public.append_canonical_identity_family_head()
  OWNER TO fluencytracr_slice_e_owner;
ALTER FUNCTION public.reject_canonical_identity_source_mutation()
  OWNER TO fluencytracr_slice_e_owner;
ALTER TABLE public.value_hypotheses OWNER TO fluencytracr_slice_e_owner;
ALTER TABLE public.measurement_plans OWNER TO fluencytracr_slice_e_owner;
ALTER TABLE public.measurement_cell_snapshots OWNER TO fluencytracr_slice_e_owner;
ALTER TABLE public.ai_value_canonical_identity_family_head_journal
  OWNER TO fluencytracr_slice_e_owner;

COMMIT;
