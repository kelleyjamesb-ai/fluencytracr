CREATE TABLE "outcome_evidence" (
  "evidence_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workflow_id" TEXT NOT NULL,
  "outcome_metric" TEXT NOT NULL,
  "outcome_unit" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "aggregate_value" DOUBLE PRECISION NOT NULL,
  "cohort_size" INTEGER NOT NULL,
  "source_system" TEXT NOT NULL,
  "jbtd_id" VARCHAR(64),
  "persona_id" VARCHAR(64),
  "aggregate_kind" TEXT DEFAULT NULL,
  "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_attestation" JSONB,

  CONSTRAINT "outcome_evidence_pkey" PRIMARY KEY ("evidence_id"),
  CONSTRAINT "outcome_evidence_jbtd_id_check"
    CHECK ("jbtd_id" IS NULL OR "jbtd_id" ~ '^[a-z0-9_-]{1,64}$'),
  CONSTRAINT "outcome_evidence_persona_id_check"
    CHECK ("persona_id" IS NULL OR "persona_id" ~ '^[a-z0-9_-]{1,64}$'),
  CONSTRAINT "outcome_evidence_period_check"
    CHECK ("period_end" > "period_start"),
  CONSTRAINT "outcome_evidence_cohort_size_check"
    CHECK ("cohort_size" >= 1)
);

CREATE INDEX "outcome_evidence_workflow_id_idx"
  ON "outcome_evidence"("workflow_id");

CREATE INDEX "outcome_evidence_jbtd_id_idx"
  ON "outcome_evidence"("jbtd_id");

CREATE INDEX "outcome_evidence_persona_id_idx"
  ON "outcome_evidence"("persona_id");

CREATE INDEX "outcome_evidence_workflow_id_period_start_period_end_idx"
  ON "outcome_evidence"("workflow_id", "period_start", "period_end");

ALTER TABLE public."outcome_evidence" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name text;
  restricted_roles text[] := ARRAY['anon', 'authenticated'];
BEGIN
  FOREACH role_name IN ARRAY restricted_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', 'outcome_evidence', role_name);
    END IF;
  END LOOP;
END
$$;
