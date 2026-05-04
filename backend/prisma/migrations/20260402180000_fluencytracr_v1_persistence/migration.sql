-- FluencyTracr v1 pipeline persistence: canonical events, snapshots, outcomes, aggregates, calibrations, suppression audit.
-- Append-only enforcement on canonical_events and suppression_audit_log via triggers.
-- Down migrations: not provided (Prisma deploy is forward-only; rollback = new migration).

-- ---------------------------------------------------------------------------
-- canonical_events (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE "canonical_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_version" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "event_timestamp" TIMESTAMP(3) NOT NULL,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_payload_json" JSONB NOT NULL,
    "source_identity_json" JSONB NOT NULL DEFAULT '{}',
    "ingest_sequence" BIGSERIAL NOT NULL,

    CONSTRAINT "canonical_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "canonical_events_actor_type_check" CHECK ("actor_type" IN ('human', 'ai', 'system'))
);

CREATE UNIQUE INDEX "canonical_events_ingest_sequence_key" ON "canonical_events"("ingest_sequence");

CREATE INDEX "canonical_events_org_id_idx" ON "canonical_events"("org_id");

CREATE INDEX "canonical_events_execution_id_idx" ON "canonical_events"("execution_id");

CREATE INDEX "canonical_events_workflow_id_idx" ON "canonical_events"("workflow_id");

CREATE INDEX "canonical_events_org_id_workflow_id_idx" ON "canonical_events"("org_id", "workflow_id");

CREATE INDEX "canonical_events_execution_event_time_seq_idx" ON "canonical_events"("execution_id", "event_timestamp", "ingest_sequence");

COMMENT ON TABLE "canonical_events" IS 'FluencyTracr v1 append-only canonical ingest. Rebuild snapshots/outcomes from this table. Retention: org policy / batch archive (not enforced in schema).';

-- ---------------------------------------------------------------------------
-- execution_snapshots (recomputable cache)
-- ---------------------------------------------------------------------------
CREATE TABLE "execution_snapshots" (
    "org_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "current_state" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "trace_count" INTEGER NOT NULL DEFAULT 0,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "fsc_eligible" BOOLEAN NOT NULL,
    "minimum_signal_allowed" BOOLEAN NOT NULL,
    "last_processed_at" TIMESTAMP(3) NOT NULL,
    "source_event_count" INTEGER NOT NULL,
    "snapshot_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "execution_snapshots_pkey" PRIMARY KEY ("org_id", "execution_id")
);

CREATE INDEX "execution_snapshots_org_id_workflow_id_idx" ON "execution_snapshots"("org_id", "workflow_id");

COMMENT ON TABLE "execution_snapshots" IS 'Derived execution-level state; safe to truncate/rebuild from canonical_events.';

-- ---------------------------------------------------------------------------
-- classification_outcomes
-- ---------------------------------------------------------------------------
CREATE TABLE "classification_outcomes" (
    "org_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pattern" TEXT,
    "suppression_reason" TEXT,
    "diagnostics_json" JSONB NOT NULL,
    "signal_profile_json" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classification_outcomes_pkey" PRIMARY KEY ("org_id", "execution_id"),
    CONSTRAINT "classification_outcomes_status_check" CHECK ("status" IN ('ALLOWED', 'SUPPRESSED')),
    CONSTRAINT "classification_outcomes_suppression_reason_check" CHECK (
        "suppression_reason" IS NULL
        OR "suppression_reason" IN ('INCOMPLETE_EXECUTION', 'INSUFFICIENT_SIGNAL', 'AMBIGUITY')
    ),
    CONSTRAINT "classification_outcomes_pattern_check" CHECK (
        "pattern" IS NULL
        OR "pattern" IN (
            'UNDERTRUST_AVOIDANCE',
            'FRICTION_LOOP',
            'RECOVERY_MATURITY',
            'BLIND_EFFICIENCY',
            'CALIBRATED_FLUENCY'
        )
    ),
    -- ALLOWED: must have a pattern and no suppression_reason.
    -- SUPPRESSED: must have suppression_reason and no classified pattern (invalid to store both).
    CONSTRAINT "classification_outcomes_allowed_requires_pattern" CHECK (
        ("status" = 'ALLOWED' AND "pattern" IS NOT NULL AND "suppression_reason" IS NULL)
        OR ("status" = 'SUPPRESSED' AND "suppression_reason" IS NOT NULL AND "pattern" IS NULL)
    )
);

CREATE INDEX "classification_outcomes_org_workflow_processed_idx" ON "classification_outcomes"("org_id", "workflow_id", "processed_at");

COMMENT ON TABLE "classification_outcomes" IS 'Per-execution classification; no ranking/score columns. Internal diagnostics in JSON only.';

-- ---------------------------------------------------------------------------
-- workflow_aggregates
-- ---------------------------------------------------------------------------
CREATE TABLE "workflow_aggregates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "prevalence_mode" TEXT NOT NULL,
    "classified_execution_count" INTEGER NOT NULL,
    "suppressed_execution_count" INTEGER NOT NULL,
    "pattern_distribution_json" JSONB NOT NULL,
    "recomputed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_aggregates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_aggregates_org_id_workflow_id_key" UNIQUE ("org_id", "workflow_id"),
    CONSTRAINT "workflow_aggregates_prevalence_mode_check" CHECK (
        "prevalence_mode" IN ('CATEGORICAL_PREVALENCE', 'NUMERIC_SHARE')
    )
);

CREATE INDEX "workflow_aggregates_org_id_idx" ON "workflow_aggregates"("org_id");

COMMENT ON TABLE "workflow_aggregates" IS 'Workflow-scoped observability cache; no cross-workflow or time-series columns. Recompute from classification_outcomes.';

-- ---------------------------------------------------------------------------
-- threshold_calibrations (internal)
-- ---------------------------------------------------------------------------
CREATE TABLE "threshold_calibrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "reference_window_size" INTEGER NOT NULL,
    "iteration_low_threshold" INTEGER NOT NULL,
    "iteration_high_threshold" INTEGER NOT NULL,
    "latency_high_threshold" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "calibration_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "threshold_calibrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "threshold_calibrations_org_id_workflow_id_computed_at_idx" ON "threshold_calibrations"("org_id", "workflow_id", "computed_at");

COMMENT ON TABLE "threshold_calibrations" IS 'Internal calibration only; do not expose via executive observability API. latency_high_threshold is milliseconds.';

-- ---------------------------------------------------------------------------
-- suppression_audit_log (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE "suppression_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "suppression_reason" TEXT NOT NULL,
    "diagnostics_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppression_audit_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suppression_audit_log_reason_check" CHECK (
        "suppression_reason" IN ('INCOMPLETE_EXECUTION', 'INSUFFICIENT_SIGNAL', 'AMBIGUITY')
    )
);

CREATE INDEX "suppression_audit_log_org_id_workflow_id_created_at_idx" ON "suppression_audit_log"("org_id", "workflow_id", "created_at");

CREATE INDEX "suppression_audit_log_org_id_execution_id_idx" ON "suppression_audit_log"("org_id", "execution_id");

COMMENT ON TABLE "suppression_audit_log" IS 'Append-only suppression audit for governance/debug; not for executive API surfaces.';

-- ---------------------------------------------------------------------------
-- Append-only triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fluencytracr_v1_forbid_row_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only (UPDATE and DELETE are forbidden)', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canonical_events_append_only
    BEFORE UPDATE OR DELETE ON "canonical_events"
    FOR EACH ROW EXECUTE PROCEDURE fluencytracr_v1_forbid_row_mutation();

CREATE TRIGGER suppression_audit_log_append_only
    BEFORE UPDATE OR DELETE ON "suppression_audit_log"
    FOR EACH ROW EXECUTE PROCEDURE fluencytracr_v1_forbid_row_mutation();
