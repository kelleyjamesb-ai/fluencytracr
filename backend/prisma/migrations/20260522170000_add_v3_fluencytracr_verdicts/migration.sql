-- V3 production ingest verdict persistence.
-- Stores immutable aggregate verdicts only; no person-level fields or raw GCE.

CREATE TABLE IF NOT EXISTS "fluencytracr_verdicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" VARCHAR(64),
    "persona_id" VARCHAR(64),
    "slice_key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "calibration_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "suppression_reason" TEXT,
    "cohort_size" INTEGER NOT NULL,
    "evidence_grade" TEXT NOT NULL,
    "velocity_index" DOUBLE PRECISION,
    "quality_multiplier" DOUBLE PRECISION,
    "payload_json" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fluencytracr_verdicts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fluencytracr_verdicts_verdict_chk"
      CHECK ("verdict" IN ('SURFACE', 'SUPPRESS')),
    CONSTRAINT "fluencytracr_verdicts_suppression_chk"
      CHECK (
        "suppression_reason" IS NULL OR
        "suppression_reason" IN (
          'INSUFFICIENT_TIME',
          'INSUFFICIENT_VOLUME',
          'NO_CONVERGENCE',
          'BASELINE_UNSTABLE',
          'HIGH_AMBIGUITY'
        )
      ),
    CONSTRAINT "fluencytracr_verdicts_surface_payload_chk"
      CHECK (
        ("verdict" = 'SURFACE' AND "suppression_reason" IS NULL) OR
        ("verdict" = 'SUPPRESS' AND "suppression_reason" IS NOT NULL)
      )
);

CREATE UNIQUE INDEX IF NOT EXISTS "fluencytracr_verdicts_immutable_key"
  ON "fluencytracr_verdicts"(
    "org_id",
    "cohort_id",
    "workflow_id",
    "slice_key",
    "window_start",
    "window_end",
    "calibration_id"
  );

CREATE INDEX IF NOT EXISTS "fluencytracr_verdicts_org_id_cohort_id_idx"
  ON "fluencytracr_verdicts"("org_id", "cohort_id");

CREATE INDEX IF NOT EXISTS "fluencytracr_verdicts_org_id_workflow_id_idx"
  ON "fluencytracr_verdicts"("org_id", "workflow_id");

CREATE INDEX IF NOT EXISTS "fluencytracr_verdicts_org_id_calibration_id_idx"
  ON "fluencytracr_verdicts"("org_id", "calibration_id");
