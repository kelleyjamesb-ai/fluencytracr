ALTER TABLE "canonical_events"
  ADD COLUMN "jbtd_id" VARCHAR(64),
  ADD COLUMN "persona_id" VARCHAR(64),
  ADD CONSTRAINT "canonical_events_jbtd_id_check"
    CHECK ("jbtd_id" IS NULL OR "jbtd_id" ~ '^[a-z0-9_-]{1,64}$'),
  ADD CONSTRAINT "canonical_events_persona_id_check"
    CHECK ("persona_id" IS NULL OR "persona_id" ~ '^[a-z0-9_-]{1,64}$');

ALTER TABLE "classification_outcomes"
  ADD COLUMN "jbtd_id" VARCHAR(64),
  ADD COLUMN "persona_id" VARCHAR(64),
  ADD CONSTRAINT "classification_outcomes_jbtd_id_check"
    CHECK ("jbtd_id" IS NULL OR "jbtd_id" ~ '^[a-z0-9_-]{1,64}$'),
  ADD CONSTRAINT "classification_outcomes_persona_id_check"
    CHECK ("persona_id" IS NULL OR "persona_id" ~ '^[a-z0-9_-]{1,64}$');

ALTER TABLE "workflow_aggregates"
  ADD COLUMN "jbtd_id" VARCHAR(64),
  ADD COLUMN "persona_id" VARCHAR(64),
  ADD CONSTRAINT "workflow_aggregates_jbtd_id_check"
    CHECK ("jbtd_id" IS NULL OR "jbtd_id" ~ '^[a-z0-9_-]{1,64}$'),
  ADD CONSTRAINT "workflow_aggregates_persona_id_check"
    CHECK ("persona_id" IS NULL OR "persona_id" ~ '^[a-z0-9_-]{1,64}$');

CREATE INDEX "canonical_events_org_id_workflow_id_jbtd_id_persona_id_idx"
  ON "canonical_events"("org_id", "workflow_id", "jbtd_id", "persona_id");

CREATE INDEX "classification_outcomes_org_id_workflow_id_jbtd_id_persona_id_idx"
  ON "classification_outcomes"("org_id", "workflow_id", "jbtd_id", "persona_id");

ALTER TABLE "workflow_aggregates"
  DROP CONSTRAINT IF EXISTS "workflow_aggregates_org_id_workflow_id_key";

CREATE UNIQUE INDEX "workflow_aggregates_org_id_workflow_id_jbtd_id_persona_id_key"
  ON "workflow_aggregates"(
    "org_id",
    "workflow_id",
    COALESCE("jbtd_id", ''),
    COALESCE("persona_id", '')
  );

CREATE INDEX "workflow_aggregates_org_id_workflow_id_jbtd_id_persona_id_idx"
  ON "workflow_aggregates"("org_id", "workflow_id", "jbtd_id", "persona_id");
