CREATE TABLE "measurement_cell_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "client_id" TEXT,
  "measurement_cell_id" TEXT NOT NULL,
  "measurement_cell_assembly_run_id" TEXT NOT NULL,
  "measurement_plan_id" TEXT NOT NULL,
  "value_hypothesis_id" TEXT,
  "value_hypothesis_ref" TEXT,
  "value_hypothesis_binding_state" TEXT NOT NULL,
  "approved_blueprint_ref" TEXT NOT NULL,
  "approved_blueprint_payload_hash" TEXT NOT NULL,
  "blueprint_expectation_ref" TEXT NOT NULL,
  "expectation_path_id" TEXT NOT NULL,
  "expectation_path_version" INTEGER NOT NULL,
  "expectation_path_hash" TEXT NOT NULL,
  "approval_state" TEXT NOT NULL,
  "approved_at" TIMESTAMP(3) NOT NULL,
  "approved_by_role" TEXT NOT NULL,
  "value_driver" TEXT NOT NULL,
  "metric_id" TEXT NOT NULL,
  "metric_definition_ref" TEXT NOT NULL,
  "metric_definition_hash" TEXT NOT NULL,
  "metric_owner_approval_state" TEXT NOT NULL,
  "metric_direction" TEXT NOT NULL,
  "metric_unit" TEXT NOT NULL,
  "expected_metric_lag_days" INTEGER NOT NULL,
  "workflow_family" TEXT NOT NULL,
  "workflow_id" TEXT,
  "function_area" TEXT NOT NULL,
  "cohort_key" TEXT NOT NULL,
  "window_mode" TEXT NOT NULL,
  "milestone_day" INTEGER NOT NULL,
  "baseline_window_start" TIMESTAMP(3) NOT NULL,
  "baseline_window_end" TIMESTAMP(3) NOT NULL,
  "comparison_window_start" TIMESTAMP(3) NOT NULL,
  "comparison_window_end" TIMESTAMP(3) NOT NULL,
  "assembly_decision" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "assembly_payload_json" JSONB,
  "validation_json" JSONB NOT NULL,
  "assembly_validation_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL,
  "blueprint_path_binding_json" JSONB NOT NULL,
  "required_caveats_json" JSONB NOT NULL,
  "blocked_uses_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "generated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "measurement_cell_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurement_cell_snapshots_version_check" CHECK ("version" >= 1),
  CONSTRAINT "measurement_cell_snapshots_expectation_path_version_check"
    CHECK ("expectation_path_version" >= 1),
  CONSTRAINT "measurement_cell_snapshots_expected_metric_lag_days_check"
    CHECK ("expected_metric_lag_days" >= 0),
  CONSTRAINT "measurement_cell_snapshots_baseline_window_check"
    CHECK ("baseline_window_end" > "baseline_window_start"),
  CONSTRAINT "measurement_cell_snapshots_comparison_window_check"
    CHECK ("comparison_window_end" > "comparison_window_start"),
  CONSTRAINT "measurement_cell_snapshots_value_driver_check"
    CHECK ("value_driver" IN ('Revenue', 'Cost', 'Capacity', 'Quality', 'Risk')),
  CONSTRAINT "measurement_cell_snapshots_window_mode_check"
    CHECK ("window_mode" IN ('milestone')),
  CONSTRAINT "measurement_cell_snapshots_milestone_day_check"
    CHECK ("milestone_day" IN (0, 30, 60, 90, 180, 365)),
  CONSTRAINT "measurement_cell_snapshots_approval_state_check"
    CHECK ("approval_state" = 'approved'),
  CONSTRAINT "measurement_cell_snapshots_binding_state_check"
    CHECK (
      ("value_hypothesis_binding_state" = 'bound' AND ("value_hypothesis_id" IS NOT NULL OR "value_hypothesis_ref" IS NOT NULL)) OR
      ("value_hypothesis_binding_state" = 'inapplicable' AND "value_hypothesis_id" IS NULL AND "value_hypothesis_ref" IS NULL)
    ),
  CONSTRAINT "measurement_cell_snapshots_required_caveats_array_check"
    CHECK (jsonb_typeof("required_caveats_json") = 'array'),
  CONSTRAINT "measurement_cell_snapshots_blocked_uses_array_check"
    CHECK (jsonb_typeof("blocked_uses_json") = 'array'),
  CONSTRAINT "measurement_cell_snapshots_assembly_payload_null_or_object_check"
    CHECK ("assembly_payload_json" IS NULL OR jsonb_typeof("assembly_payload_json") = 'object')
);

CREATE UNIQUE INDEX "measurement_cell_snapshots_immutable_key"
  ON "measurement_cell_snapshots"("org_id", "measurement_cell_id", "version");

CREATE INDEX "measurement_cell_snapshots_org_id_measurement_plan_id_idx"
  ON "measurement_cell_snapshots"("org_id", "measurement_plan_id");

CREATE INDEX "measurement_cell_snapshots_org_id_workflow_family_function_area_idx"
  ON "measurement_cell_snapshots"("org_id", "workflow_family", "function_area");

CREATE INDEX "measurement_cell_snapshots_org_id_cohort_key_idx"
  ON "measurement_cell_snapshots"("org_id", "cohort_key");

CREATE INDEX "measurement_cell_snapshots_org_id_metric_id_expectation_path_id_idx"
  ON "measurement_cell_snapshots"("org_id", "metric_id", "expectation_path_id");

CREATE INDEX "measurement_cell_snapshots_org_id_value_driver_idx"
  ON "measurement_cell_snapshots"("org_id", "value_driver");

CREATE INDEX "measurement_cell_snapshots_org_id_window_mode_milestone_day_idx"
  ON "measurement_cell_snapshots"("org_id", "window_mode", "milestone_day");

CREATE INDEX "measurement_cell_snapshots_org_id_comparison_window_idx"
  ON "measurement_cell_snapshots"("org_id", "comparison_window_start", "comparison_window_end");

CREATE INDEX "measurement_cell_snapshots_org_id_assembly_run_idx"
  ON "measurement_cell_snapshots"("org_id", "measurement_cell_assembly_run_id");

ALTER TABLE public.measurement_cell_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name text;
  restricted_roles text[] := ARRAY['anon', 'authenticated'];
BEGIN
  FOREACH role_name IN ARRAY restricted_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.measurement_cell_snapshots FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;
