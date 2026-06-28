DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.measurement_cell_snapshots LIMIT 1) THEN
    RAISE EXCEPTION 'measurement_cell_snapshots contains rows; run an explicit reviewed aggregate-boundary backfill before applying 20260623193000_bind_measurement_cell_snapshot_aggregate_boundary';
  END IF;
END
$$;

ALTER TABLE public.measurement_cell_snapshots
  ADD COLUMN "aggregate_source_system" TEXT NOT NULL,
  ADD COLUMN "aggregate_export_review_ref" TEXT NOT NULL,
  ADD COLUMN "aggregate_export_review_state" TEXT NOT NULL,
  ADD COLUMN "aggregate_source_export_ref" TEXT NOT NULL,
  ADD COLUMN "aggregate_export_review_hash" TEXT NOT NULL,
  ADD COLUMN "pipeline_dry_run_ref" TEXT NOT NULL,
  ADD COLUMN "pipeline_boundary_hash" TEXT NOT NULL,
  ADD COLUMN "aggregate_boundary_ref_json" JSONB NOT NULL,
  ADD CONSTRAINT "measurement_cell_snapshots_aggregate_source_system_check"
    CHECK ("aggregate_source_system" IN ('bigquery_export', 'sigma_export')),
  ADD CONSTRAINT "measurement_cell_snapshots_aggregate_review_state_check"
    CHECK (
      ("aggregate_source_system" = 'bigquery_export' AND "aggregate_export_review_state" = 'PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW') OR
      ("aggregate_source_system" = 'sigma_export' AND "aggregate_export_review_state" = 'PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW')
    ),
  ADD CONSTRAINT "measurement_cell_snapshots_aggregate_review_hash_check"
    CHECK ("aggregate_export_review_hash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "measurement_cell_snapshots_pipeline_boundary_hash_check"
    CHECK ("pipeline_boundary_hash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "measurement_cell_snapshots_aggregate_boundary_ref_object_check"
    CHECK (jsonb_typeof("aggregate_boundary_ref_json") = 'object');

CREATE INDEX "measurement_cell_snapshots_org_id_aggregate_review_idx"
  ON "measurement_cell_snapshots"("org_id", "aggregate_source_system", "aggregate_export_review_state");

CREATE INDEX "measurement_cell_snapshots_org_id_aggregate_source_export_idx"
  ON "measurement_cell_snapshots"("org_id", "aggregate_source_export_ref");
