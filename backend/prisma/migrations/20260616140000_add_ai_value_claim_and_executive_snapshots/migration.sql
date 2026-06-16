CREATE TABLE "claim_readiness_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "claim_readiness_snapshot_id" TEXT NOT NULL,
  "evidence_snapshot_id" TEXT NOT NULL,
  "handoff_id" TEXT NOT NULL,
  "measurement_plan_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "derivation_version" TEXT NOT NULL,
  "coverage_status" TEXT NOT NULL,
  "claim_readiness_state" TEXT NOT NULL,
  "financial_boundary_state" TEXT NOT NULL,
  "executive_readout_allowed" BOOLEAN NOT NULL,
  "customer_facing_readout_allowed" BOOLEAN NOT NULL,
  "customer_facing_financial_output_allowed" BOOLEAN NOT NULL,
  "payload_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL,
  "required_caveats_json" JSONB NOT NULL,
  "blocked_uses_json" JSONB NOT NULL,
  "blocked_claims_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "claim_readiness_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "claim_readiness_snapshots_version_check" CHECK ("version" >= 1),
  CONSTRAINT "claim_readiness_snapshots_required_caveats_check"
    CHECK (jsonb_typeof("required_caveats_json") = 'array'),
  CONSTRAINT "claim_readiness_snapshots_blocked_uses_check"
    CHECK (jsonb_typeof("blocked_uses_json") = 'array'),
  CONSTRAINT "claim_readiness_snapshots_blocked_claims_check"
    CHECK (jsonb_typeof("blocked_claims_json") = 'array'),
  CONSTRAINT "claim_readiness_snapshots_coverage_status_check"
    CHECK ("coverage_status" IN (
      'layer_1_only',
      'layer_1_plus_partial_layer_2',
      'layer_1_plus_partial_layer_3',
      'layer_1_plus_layer_2_and_layer_3',
      'full_playbook_coverage',
      'held_for_customer_exports',
      'held_for_governance'
    )),
  CONSTRAINT "claim_readiness_snapshots_state_check"
    CHECK ("claim_readiness_state" IN (
      'held_for_full_playbook_coverage',
      'ready_for_internal_claim_review',
      'blocked_for_privacy_or_suppression',
      'held_for_governance',
      'held_for_source_binding'
    )),
  CONSTRAINT "claim_readiness_snapshots_customer_readout_blocked_check"
    CHECK ("customer_facing_readout_allowed" IS FALSE),
  CONSTRAINT "claim_readiness_snapshots_customer_financial_blocked_check"
    CHECK ("customer_facing_financial_output_allowed" IS FALSE)
);

CREATE UNIQUE INDEX "claim_readiness_snapshots_immutable_key"
  ON "claim_readiness_snapshots"("org_id", "claim_readiness_snapshot_id", "version");

CREATE INDEX "claim_readiness_snapshots_org_id_evidence_snapshot_id_idx"
  ON "claim_readiness_snapshots"("org_id", "evidence_snapshot_id");

CREATE INDEX "claim_readiness_snapshots_org_id_handoff_id_idx"
  ON "claim_readiness_snapshots"("org_id", "handoff_id");

CREATE INDEX "claim_readiness_snapshots_org_id_measurement_plan_id_idx"
  ON "claim_readiness_snapshots"("org_id", "measurement_plan_id");

CREATE INDEX "claim_readiness_snapshots_org_id_coverage_status_idx"
  ON "claim_readiness_snapshots"("org_id", "coverage_status");

CREATE INDEX "claim_readiness_snapshots_org_id_claim_readiness_state_idx"
  ON "claim_readiness_snapshots"("org_id", "claim_readiness_state");

CREATE TABLE "executive_readout_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "executive_readout_snapshot_id" TEXT NOT NULL,
  "claim_readiness_snapshot_id" TEXT NOT NULL,
  "evidence_snapshot_id" TEXT NOT NULL,
  "handoff_id" TEXT NOT NULL,
  "measurement_plan_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "derivation_version" TEXT NOT NULL,
  "readout_audience" TEXT NOT NULL,
  "readout_state" TEXT NOT NULL,
  "coverage_status" TEXT NOT NULL,
  "customer_facing_readout_allowed" BOOLEAN NOT NULL,
  "customer_facing_financial_output_allowed" BOOLEAN NOT NULL,
  "payload_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "source_refs_json" JSONB NOT NULL,
  "required_caveats_json" JSONB NOT NULL,
  "blocked_uses_json" JSONB NOT NULL,
  "blocked_claims_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "supersedes_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_role" TEXT NOT NULL,

  CONSTRAINT "executive_readout_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "executive_readout_snapshots_version_check" CHECK ("version" >= 1),
  CONSTRAINT "executive_readout_snapshots_required_caveats_check"
    CHECK (jsonb_typeof("required_caveats_json") = 'array'),
  CONSTRAINT "executive_readout_snapshots_blocked_uses_check"
    CHECK (jsonb_typeof("blocked_uses_json") = 'array'),
  CONSTRAINT "executive_readout_snapshots_blocked_claims_check"
    CHECK (jsonb_typeof("blocked_claims_json") = 'array'),
  CONSTRAINT "executive_readout_snapshots_coverage_status_check"
    CHECK ("coverage_status" IN (
      'layer_1_only',
      'layer_1_plus_partial_layer_2',
      'layer_1_plus_partial_layer_3',
      'layer_1_plus_layer_2_and_layer_3',
      'full_playbook_coverage',
      'held_for_customer_exports',
      'held_for_governance'
    )),
  CONSTRAINT "executive_readout_snapshots_state_check"
    CHECK ("readout_state" IN (
      'blocked_for_missing_claim_readiness_snapshot',
      'held_for_full_playbook_coverage',
      'internal_only_claim_review_ready',
      'internal_only_readout_ready',
      'blocked_for_privacy_or_suppression',
      'blocked_for_customer_facing_financial_output'
    )),
  CONSTRAINT "executive_readout_snapshots_customer_readout_blocked_check"
    CHECK ("customer_facing_readout_allowed" IS FALSE),
  CONSTRAINT "executive_readout_snapshots_customer_financial_blocked_check"
    CHECK ("customer_facing_financial_output_allowed" IS FALSE)
);

CREATE UNIQUE INDEX "executive_readout_snapshots_immutable_key"
  ON "executive_readout_snapshots"("org_id", "executive_readout_snapshot_id", "version");

CREATE INDEX "executive_readout_snapshots_org_id_claim_readiness_snapshot_id_idx"
  ON "executive_readout_snapshots"("org_id", "claim_readiness_snapshot_id");

CREATE INDEX "executive_readout_snapshots_org_id_evidence_snapshot_id_idx"
  ON "executive_readout_snapshots"("org_id", "evidence_snapshot_id");

CREATE INDEX "executive_readout_snapshots_org_id_handoff_id_idx"
  ON "executive_readout_snapshots"("org_id", "handoff_id");

CREATE INDEX "executive_readout_snapshots_org_id_measurement_plan_id_idx"
  ON "executive_readout_snapshots"("org_id", "measurement_plan_id");

CREATE INDEX "executive_readout_snapshots_org_id_coverage_status_idx"
  ON "executive_readout_snapshots"("org_id", "coverage_status");

CREATE INDEX "executive_readout_snapshots_org_id_readout_state_idx"
  ON "executive_readout_snapshots"("org_id", "readout_state");

ALTER TABLE public.claim_readiness_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_readout_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.claim_readiness_snapshots FROM anon;
    REVOKE ALL ON TABLE public.executive_readout_snapshots FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.claim_readiness_snapshots FROM authenticated;
    REVOKE ALL ON TABLE public.executive_readout_snapshots FROM authenticated;
  END IF;
END
$$;
