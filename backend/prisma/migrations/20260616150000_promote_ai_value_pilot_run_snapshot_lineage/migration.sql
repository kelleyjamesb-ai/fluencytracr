ALTER TABLE "ai_value_pilot_runs"
  ADD COLUMN "claim_readiness_snapshot_id" TEXT,
  ADD COLUMN "executive_readout_snapshot_id" TEXT;

ALTER TABLE "ai_value_pilot_runs"
  DROP CONSTRAINT IF EXISTS "ai_value_pilot_runs_no_snapshot_persistence_check",
  DROP CONSTRAINT IF EXISTS "ai_value_pilot_runs_no_readout_persistence_check",
  ADD CONSTRAINT "ai_value_pilot_runs_claim_snapshot_lineage_check"
    CHECK (
      (
        "claim_readiness_snapshot_persisted" IS FALSE AND
        "claim_readiness_snapshot_id" IS NULL
      ) OR (
        "claim_readiness_snapshot_persisted" IS TRUE AND
        "claim_readiness_snapshot_id" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "ai_value_pilot_runs_executive_readout_lineage_check"
    CHECK (
      (
        "executive_readout_snapshot_persisted" IS FALSE AND
        "executive_readout_snapshot_id" IS NULL
      ) OR (
        "executive_readout_snapshot_persisted" IS TRUE AND
        "executive_readout_snapshot_id" IS NOT NULL AND
        "claim_readiness_snapshot_persisted" IS TRUE AND
        "claim_readiness_snapshot_id" IS NOT NULL
      )
    );

CREATE INDEX "ai_value_pilot_runs_org_id_claim_readiness_snapshot_id_idx"
  ON "ai_value_pilot_runs"("org_id", "claim_readiness_snapshot_id");

CREATE INDEX "ai_value_pilot_runs_org_id_executive_readout_snapshot_id_idx"
  ON "ai_value_pilot_runs"("org_id", "executive_readout_snapshot_id");
