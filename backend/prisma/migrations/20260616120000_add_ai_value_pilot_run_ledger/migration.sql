CREATE TABLE "ai_value_pilot_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "pilot_run_id" TEXT NOT NULL,
  "measurement_plan_id" TEXT NOT NULL,
  "workflow_family" TEXT NOT NULL,
  "source_package_ids_json" JSONB NOT NULL,
  "evidence_snapshot_id" TEXT NOT NULL,
  "claim_readiness_handoff_id" TEXT NOT NULL,
  "coverage_status" TEXT NOT NULL,
  "run_status" TEXT NOT NULL,
  "validation_json" JSONB NOT NULL,
  "required_caveats_json" JSONB NOT NULL,
  "blocked_uses_json" JSONB NOT NULL,
  "claim_readiness_snapshot_persisted" BOOLEAN NOT NULL,
  "executive_readout_snapshot_persisted" BOOLEAN NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "generated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "ai_value_pilot_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_value_pilot_runs_version_check" CHECK ("version" >= 1),
  CONSTRAINT "ai_value_pilot_runs_source_package_ids_check"
    CHECK (jsonb_typeof("source_package_ids_json") = 'array'),
  CONSTRAINT "ai_value_pilot_runs_required_caveats_check"
    CHECK (jsonb_typeof("required_caveats_json") = 'array'),
  CONSTRAINT "ai_value_pilot_runs_blocked_uses_check"
    CHECK (jsonb_typeof("blocked_uses_json") = 'array'),
  CONSTRAINT "ai_value_pilot_runs_coverage_status_check"
    CHECK ("coverage_status" IN (
      'layer_1_only',
      'layer_1_plus_partial_layer_2',
      'layer_1_plus_partial_layer_3',
      'layer_1_plus_layer_2_and_layer_3',
      'full_playbook_coverage',
      'held_for_customer_exports',
      'held_for_governance'
    )),
  CONSTRAINT "ai_value_pilot_runs_run_status_check"
    CHECK ("run_status" IN (
      'started',
      'completed',
      'completed_with_caveats',
      'failed_closed',
      'held_for_governance',
      'held_for_source_binding'
    )),
  CONSTRAINT "ai_value_pilot_runs_no_snapshot_persistence_check"
    CHECK ("claim_readiness_snapshot_persisted" IS FALSE),
  CONSTRAINT "ai_value_pilot_runs_no_readout_persistence_check"
    CHECK ("executive_readout_snapshot_persisted" IS FALSE)
);

CREATE UNIQUE INDEX "ai_value_pilot_runs_immutable_key"
  ON "ai_value_pilot_runs"("org_id", "pilot_run_id", "version");

CREATE INDEX "ai_value_pilot_runs_org_id_measurement_plan_id_idx"
  ON "ai_value_pilot_runs"("org_id", "measurement_plan_id");

CREATE INDEX "ai_value_pilot_runs_org_id_evidence_snapshot_id_idx"
  ON "ai_value_pilot_runs"("org_id", "evidence_snapshot_id");

CREATE INDEX "ai_value_pilot_runs_org_id_claim_readiness_handoff_id_idx"
  ON "ai_value_pilot_runs"("org_id", "claim_readiness_handoff_id");

CREATE INDEX "ai_value_pilot_runs_org_id_workflow_family_idx"
  ON "ai_value_pilot_runs"("org_id", "workflow_family");

CREATE INDEX "ai_value_pilot_runs_org_id_coverage_status_idx"
  ON "ai_value_pilot_runs"("org_id", "coverage_status");

CREATE INDEX "ai_value_pilot_runs_org_id_run_status_idx"
  ON "ai_value_pilot_runs"("org_id", "run_status");

ALTER TABLE public.ai_value_pilot_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.ai_value_pilot_runs FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.ai_value_pilot_runs FROM authenticated;
  END IF;
END
$$;
