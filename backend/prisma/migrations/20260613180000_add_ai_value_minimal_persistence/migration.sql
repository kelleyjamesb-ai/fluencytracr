CREATE TABLE "value_hypotheses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "value_hypothesis_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "derivation_version" TEXT NOT NULL,
  "workflow_family" TEXT NOT NULL,
  "function_area" TEXT,
  "value_route" TEXT NOT NULL,
  "hypothesis_statement" TEXT NOT NULL,
  "business_objective" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "value_hypotheses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "value_hypotheses_version_check" CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "value_hypotheses_immutable_key"
  ON "value_hypotheses"("org_id", "value_hypothesis_id", "version");

CREATE INDEX "value_hypotheses_org_id_workflow_family_idx"
  ON "value_hypotheses"("org_id", "workflow_family");

CREATE INDEX "value_hypotheses_org_id_status_idx"
  ON "value_hypotheses"("org_id", "status");

CREATE INDEX "value_hypotheses_org_id_created_at_idx"
  ON "value_hypotheses"("org_id", "created_at");

CREATE TABLE "measurement_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "measurement_plan_id" TEXT NOT NULL,
  "value_hypothesis_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "derivation_version" TEXT NOT NULL,
  "workflow_family" TEXT NOT NULL,
  "approved_aggregate_grain" TEXT NOT NULL,
  "minimum_cohort_threshold" INTEGER NOT NULL,
  "baseline_window_start" TIMESTAMP(3) NOT NULL,
  "baseline_window_end" TIMESTAMP(3) NOT NULL,
  "comparison_window_start" TIMESTAMP(3),
  "comparison_window_end" TIMESTAMP(3),
  "coverage_goal" TEXT NOT NULL,
  "readiness_state" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "source_package_requirements_json" JSONB NOT NULL,
  "assumptions_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "measurement_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurement_plans_version_check" CHECK ("version" >= 1),
  CONSTRAINT "measurement_plans_minimum_cohort_threshold_check"
    CHECK ("minimum_cohort_threshold" >= 5),
  CONSTRAINT "measurement_plans_baseline_window_check"
    CHECK ("baseline_window_end" > "baseline_window_start"),
  CONSTRAINT "measurement_plans_comparison_window_check"
    CHECK (
      ("comparison_window_start" IS NULL AND "comparison_window_end" IS NULL) OR
      ("comparison_window_start" IS NOT NULL AND "comparison_window_end" IS NOT NULL AND "comparison_window_end" > "comparison_window_start")
    )
);

CREATE UNIQUE INDEX "measurement_plans_immutable_key"
  ON "measurement_plans"("org_id", "measurement_plan_id", "version");

CREATE INDEX "measurement_plans_org_id_value_hypothesis_id_idx"
  ON "measurement_plans"("org_id", "value_hypothesis_id");

CREATE INDEX "measurement_plans_org_id_workflow_family_idx"
  ON "measurement_plans"("org_id", "workflow_family");

CREATE INDEX "measurement_plans_org_id_baseline_window_start_baseline_window_end_idx"
  ON "measurement_plans"("org_id", "baseline_window_start", "baseline_window_end");

CREATE INDEX "measurement_plans_org_id_readiness_state_idx"
  ON "measurement_plans"("org_id", "readiness_state");

CREATE TABLE "source_package_refs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "source_package_id" TEXT NOT NULL,
  "source_package_type" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "derivation_version" TEXT NOT NULL,
  "measurement_plan_id" TEXT,
  "workflow_family" TEXT,
  "generated_at" TIMESTAMP(3) NOT NULL,
  "covered_window_start" TIMESTAMP(3) NOT NULL,
  "covered_window_end" TIMESTAMP(3) NOT NULL,
  "approved_aggregate_grain" TEXT NOT NULL,
  "minimum_cohort_threshold" INTEGER NOT NULL,
  "evidence_state" TEXT NOT NULL,
  "k_min_posture_json" JSONB NOT NULL,
  "privacy_boundary_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "caveats_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "source_package_refs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "source_package_refs_version_check" CHECK ("version" >= 1),
  CONSTRAINT "source_package_refs_type_check"
    CHECK ("source_package_type" IN (
      'layer_1_bigquery_telemetry_summary',
      'layer_2_user_voice_empirical_export',
      'layer_3_business_system_of_record_outcome_export',
      'aggregate_workforce_context_export',
      'governance_control_export',
      'assumption_approval_export'
    )),
  CONSTRAINT "source_package_refs_evidence_state_check"
    CHECK ("evidence_state" IN (
      'present',
      'partial',
      'missing',
      'held',
      'suppressed',
      'not_computed'
    )),
  CONSTRAINT "source_package_refs_minimum_cohort_threshold_check"
    CHECK ("minimum_cohort_threshold" >= 5),
  CONSTRAINT "source_package_refs_window_check"
    CHECK ("covered_window_end" > "covered_window_start")
);

CREATE UNIQUE INDEX "source_package_refs_immutable_key"
  ON "source_package_refs"("org_id", "source_package_id", "version");

CREATE INDEX "source_package_refs_org_id_measurement_plan_id_idx"
  ON "source_package_refs"("org_id", "measurement_plan_id");

CREATE INDEX "source_package_refs_org_id_source_package_type_idx"
  ON "source_package_refs"("org_id", "source_package_type");

CREATE INDEX "source_package_refs_org_id_workflow_family_idx"
  ON "source_package_refs"("org_id", "workflow_family");

CREATE INDEX "source_package_refs_org_id_covered_window_start_covered_window_end_idx"
  ON "source_package_refs"("org_id", "covered_window_start", "covered_window_end");

CREATE TABLE "evidence_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "evidence_snapshot_id" TEXT NOT NULL,
  "measurement_plan_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "derivation_version" TEXT NOT NULL,
  "workflow_family" TEXT NOT NULL,
  "snapshot_type" TEXT NOT NULL,
  "coverage_status" TEXT NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "window_end" TIMESTAMP(3) NOT NULL,
  "suppression_default_verdict" TEXT NOT NULL,
  "privacy_aggregate_only" BOOLEAN NOT NULL,
  "k_min_threshold_met" BOOLEAN NOT NULL,
  "payload_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL,
  "required_caveats_json" JSONB NOT NULL,
  "blocked_uses_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "generated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "evidence_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evidence_snapshots_version_check" CHECK ("version" >= 1),
  CONSTRAINT "evidence_snapshots_window_check" CHECK ("window_end" > "window_start"),
  CONSTRAINT "evidence_snapshots_snapshot_type_check"
    CHECK ("snapshot_type" IN (
      'TELEMETRY_SOURCE_AVAILABILITY',
      'TELEMETRY_ONLY_CAVEATED',
      'LAYER_1_PLUS_LAYER_2',
      'LAYER_1_PLUS_LAYER_3',
      'FULL_STACK_EVIDENCE',
      'HELD_FOR_GOVERNANCE'
    )),
  CONSTRAINT "evidence_snapshots_coverage_status_check"
    CHECK ("coverage_status" IN (
      'layer_1_only',
      'layer_1_plus_partial_layer_2',
      'layer_1_plus_partial_layer_3',
      'layer_1_plus_layer_2_and_layer_3',
      'full_playbook_coverage',
      'held_for_customer_exports',
      'held_for_governance'
    )),
  CONSTRAINT "evidence_snapshots_suppression_default_verdict_check"
    CHECK ("suppression_default_verdict" = 'SUPPRESS'),
  CONSTRAINT "evidence_snapshots_privacy_aggregate_only_check"
    CHECK ("privacy_aggregate_only" IS TRUE)
);

CREATE UNIQUE INDEX "evidence_snapshots_immutable_key"
  ON "evidence_snapshots"("org_id", "evidence_snapshot_id", "version");

CREATE INDEX "evidence_snapshots_org_id_measurement_plan_id_idx"
  ON "evidence_snapshots"("org_id", "measurement_plan_id");

CREATE INDEX "evidence_snapshots_org_id_workflow_family_window_start_window_end_idx"
  ON "evidence_snapshots"("org_id", "workflow_family", "window_start", "window_end");

CREATE INDEX "evidence_snapshots_org_id_coverage_status_idx"
  ON "evidence_snapshots"("org_id", "coverage_status");

CREATE INDEX "evidence_snapshots_org_id_snapshot_type_idx"
  ON "evidence_snapshots"("org_id", "snapshot_type");

DO $$
DECLARE
  role_name text;
  table_name text;
  tables text[] := ARRAY[
    'value_hypotheses',
    'measurement_plans',
    'source_package_refs',
    'evidence_snapshots'
  ];
  restricted_roles text[] := ARRAY['anon', 'authenticated'];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    FOREACH role_name IN ARRAY restricted_roles LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END
$$;
