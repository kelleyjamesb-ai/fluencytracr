-- V2 velocity persistence: aggregate-distribution observations only.
-- No person-level rows or identifiers are stored in this table.

CREATE TABLE IF NOT EXISTS "velocity_distribution_observations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" VARCHAR(64),
    "persona_id" VARCHAR(64),
    "event_name" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "cohort_size" INTEGER NOT NULL,
    "ambiguity_rate" DOUBLE PRECISION,
    "distribution_json" JSONB NOT NULL,
    "calibration_reference" TEXT NOT NULL,
    "person_level_fields_included" BOOLEAN NOT NULL DEFAULT false,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingest_sequence" BIGSERIAL NOT NULL,

    CONSTRAINT "velocity_distribution_observations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "velocity_distribution_observations_person_level_false_chk"
        CHECK ("person_level_fields_included" = false)
);

CREATE UNIQUE INDEX IF NOT EXISTS "velocity_distribution_observations_ingest_sequence_key"
    ON "velocity_distribution_observations"("ingest_sequence");

CREATE INDEX IF NOT EXISTS "velocity_distribution_observations_org_id_idx"
    ON "velocity_distribution_observations"("org_id");

CREATE INDEX IF NOT EXISTS "velocity_distribution_observations_org_id_workflow_id_idx"
    ON "velocity_distribution_observations"("org_id", "workflow_id");

CREATE INDEX IF NOT EXISTS "velocity_distribution_observations_org_id_workflow_slice_idx"
    ON "velocity_distribution_observations"("org_id", "workflow_id", "jbtd_id", "persona_id");

CREATE INDEX IF NOT EXISTS "velocity_distribution_observations_org_id_workflow_event_window_idx"
    ON "velocity_distribution_observations"("org_id", "workflow_id", "event_name", "window_start", "window_end");

CREATE INDEX IF NOT EXISTS "velocity_distribution_observations_org_id_ingested_at_idx"
    ON "velocity_distribution_observations"("org_id", "ingested_at");
