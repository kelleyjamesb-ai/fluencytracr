CREATE TABLE "ai_value_customer_data_model_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "client_id" TEXT,
  "customer_data_model_snapshot_id" TEXT NOT NULL,
  "source_snapshot_id" TEXT NOT NULL,
  "source_projection_id" TEXT NOT NULL,
  "source_projection_hash" TEXT NOT NULL,
  "source_gate_id" TEXT NOT NULL,
  "source_gate_hash" TEXT NOT NULL,
  "source_promotion_decision_id" TEXT NOT NULL,
  "source_promotion_decision_hash" TEXT NOT NULL,
  "implementation_decision_id" TEXT NOT NULL,
  "implementation_decision_hash" TEXT NOT NULL,
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
  "aggregate_source_system" TEXT NOT NULL,
  "aggregate_export_review_ref" TEXT NOT NULL,
  "aggregate_export_review_state" TEXT NOT NULL,
  "aggregate_source_export_ref" TEXT NOT NULL,
  "aggregate_export_review_hash" TEXT NOT NULL,
  "pipeline_dry_run_ref" TEXT NOT NULL,
  "pipeline_boundary_hash" TEXT NOT NULL,
  "source_refs_json" JSONB NOT NULL,
  "aggregate_boundary_ref_json" JSONB NOT NULL,
  "assembly_decision" TEXT NOT NULL,
  "validation_valid" BOOLEAN NOT NULL,
  "assembly_validation_valid" BOOLEAN NOT NULL,
  "validation_gap_count" INTEGER NOT NULL,
  "assembly_validation_gap_count" INTEGER NOT NULL,
  "required_caveats_json" JSONB NOT NULL,
  "blocked_uses_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "generated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "ai_value_customer_data_model_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_value_customer_data_model_snapshots_immutable_key"
  ON "ai_value_customer_data_model_snapshots"("org_id", "customer_data_model_snapshot_id", "version");

CREATE INDEX "ai_value_customer_data_model_snapshots_org_plan_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "measurement_plan_id");
CREATE INDEX "ai_value_customer_data_model_snapshots_source_snapshot_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "source_snapshot_id");
CREATE INDEX "ai_value_customer_data_model_snapshots_source_projection_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "source_projection_id");
CREATE INDEX "ai_value_customer_data_model_snapshots_metric_path_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "metric_id", "expectation_path_id");
CREATE INDEX "ai_value_customer_data_model_snapshots_value_driver_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "value_driver");
CREATE INDEX "ai_value_customer_data_model_snapshots_workflow_function_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "workflow_family", "function_area");
CREATE INDEX "ai_value_customer_data_model_snapshots_cohort_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "cohort_key");
CREATE INDEX "ai_value_customer_data_model_snapshots_window_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "window_mode", "milestone_day");
CREATE INDEX "ai_value_customer_data_model_snapshots_source_system_idx"
  ON "ai_value_customer_data_model_snapshots"("org_id", "aggregate_source_system", "aggregate_export_review_state");

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_value_driver_check"
  CHECK ("value_driver" IN ('Revenue', 'Cost', 'Capacity', 'Quality', 'Risk'));

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_window_mode_check"
  CHECK ("window_mode" = 'milestone');

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_milestone_day_check"
  CHECK ("milestone_day" IN (0, 30, 60, 90, 180, 365));

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_source_system_check"
  CHECK ("aggregate_source_system" IN ('bigquery_export', 'sigma_export'));

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_aggregate_review_state_check"
  CHECK (
    ("aggregate_source_system" = 'bigquery_export' AND "aggregate_export_review_state" = 'PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW') OR
    ("aggregate_source_system" = 'sigma_export' AND "aggregate_export_review_state" = 'PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW')
  );

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_baseline_window_check"
  CHECK ("baseline_window_end" > "baseline_window_start");

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_comparison_window_check"
  CHECK ("comparison_window_end" > "comparison_window_start");

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_validation_passed_check"
  CHECK (
    "validation_valid" = TRUE AND
    "assembly_validation_valid" = TRUE AND
    "validation_gap_count" = 0 AND
    "assembly_validation_gap_count" = 0
  );

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_hash_check"
  CHECK (
    "source_projection_hash" ~ '^[a-f0-9]{64}$' AND
    "source_gate_hash" ~ '^[a-f0-9]{64}$' AND
    "source_promotion_decision_hash" ~ '^[a-f0-9]{64}$' AND
    "implementation_decision_hash" ~ '^[a-f0-9]{64}$' AND
    "approved_blueprint_payload_hash" ~ '^[a-f0-9]{64}$' AND
    "expectation_path_hash" ~ '^[a-f0-9]{64}$' AND
    "metric_definition_hash" ~ '^[a-f0-9]{64}$' AND
    "aggregate_export_review_hash" ~ '^[a-f0-9]{64}$' AND
    "pipeline_boundary_hash" ~ '^[a-f0-9]{64}$'
  );

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_json_shape_check"
  CHECK (
    jsonb_typeof("source_refs_json") = 'object' AND
    jsonb_typeof("aggregate_boundary_ref_json") = 'object' AND
    jsonb_typeof("required_caveats_json") = 'array' AND
    jsonb_typeof("blocked_uses_json") = 'array'
  );

ALTER TABLE "ai_value_customer_data_model_snapshots"
  ADD CONSTRAINT "ai_value_customer_data_model_snapshots_supersedes_version_check"
  CHECK (
    ("version" = 1 AND "supersedes_id" IS NULL) OR
    ("version" > 1 AND "supersedes_id" IS NOT NULL)
  );

ALTER TABLE public.ai_value_customer_data_model_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_value_customer_data_model_snapshots FROM PUBLIC;
