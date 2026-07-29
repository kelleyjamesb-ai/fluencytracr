CREATE TABLE "aggregate_privacy_release_journal" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "privacy_slot_id" TEXT NOT NULL,
    "privacy_domain_fingerprint" TEXT NOT NULL,
    "content_fingerprint" TEXT NOT NULL,
    "atomic_lineage_fingerprint" TEXT NOT NULL,
    "public_projection_hash" TEXT NOT NULL,
    "temporal_grid_id" TEXT NOT NULL,
    "window_id" TEXT NOT NULL,
    "release_version" INTEGER NOT NULL,
    "canonical_contribution_fingerprint" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "projection_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregate_privacy_release_journal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "aggregate_privacy_release_journal_decision_check"
      CHECK ("decision" IN ('RELEASE', 'HOLD'))
);

CREATE UNIQUE INDEX "aggregate_privacy_release_slot_key"
ON "aggregate_privacy_release_journal"("org_id", "privacy_slot_id");

CREATE UNIQUE INDEX "aggregate_privacy_atomic_lineage_key"
ON "aggregate_privacy_release_journal"("org_id", "atomic_lineage_fingerprint");

CREATE UNIQUE INDEX "aggregate_privacy_domain_key"
ON "aggregate_privacy_release_journal"("org_id", "privacy_domain_fingerprint");

CREATE TABLE "aggregate_privacy_manifests" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "jbtd_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "privacy_slot_id" TEXT NOT NULL,
    "content_fingerprint" TEXT NOT NULL,
    "atomic_lineage_fingerprint" TEXT NOT NULL,
    "public_projection_hash" TEXT NOT NULL,
    "temporal_grid_id" TEXT NOT NULL,
    "window_id" TEXT NOT NULL,
    "release_version" INTEGER NOT NULL,
    "hierarchy_axis" TEXT NOT NULL,
    "source_mode" TEXT NOT NULL,
    "atomic_cell_ids" JSONB NOT NULL,
    "complete_partition" BOOLEAN NOT NULL,
    "canonical_contributions" BOOLEAN NOT NULL,
    "canonical_contribution_fingerprint" TEXT NOT NULL,
    "canonical_contribution_count" INTEGER NOT NULL,
    "canonical_contribution_ids" JSONB NOT NULL,
    "has_suppressed_child" BOOLEAN NOT NULL,
    "has_ambiguous_lineage" BOOLEAN NOT NULL,
    "has_overlapping_equation" BOOLEAN NOT NULL,
    "is_multi_window" BOOLEAN NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregate_privacy_manifests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aggregate_privacy_manifest_slot_key"
ON "aggregate_privacy_manifests"("org_id", "privacy_slot_id");

CREATE UNIQUE INDEX "aggregate_privacy_manifest_lineage_key"
ON "aggregate_privacy_manifests"("org_id", "atomic_lineage_fingerprint");

CREATE TABLE "aggregate_privacy_contribution_claims" (
    "id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "contribution_token_hash" TEXT NOT NULL,
    "privacy_slot_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregate_privacy_contribution_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aggregate_privacy_contribution_claim_key"
ON "aggregate_privacy_contribution_claims"("org_id", "contribution_token_hash");

CREATE INDEX "aggregate_privacy_contribution_claims_org_id_privacy_slot_id_idx"
ON "aggregate_privacy_contribution_claims"("org_id", "privacy_slot_id");

ALTER TABLE public.aggregate_privacy_release_journal
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregate_privacy_manifests
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregate_privacy_contribution_claims
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.aggregate_privacy_release_journal,
  public.aggregate_privacy_manifests,
  public.aggregate_privacy_contribution_claims
FROM PUBLIC;

DO $restricted_acl$
DECLARE
  restricted_role TEXT;
BEGIN
  FOREACH restricted_role IN ARRAY
    ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_roles
      WHERE rolname = restricted_role
    ) THEN
      EXECUTE pg_catalog.format(
        'REVOKE ALL ON TABLE public.aggregate_privacy_release_journal, public.aggregate_privacy_manifests, public.aggregate_privacy_contribution_claims FROM %I',
        restricted_role
      );
    END IF;
  END LOOP;
END
$restricted_acl$;
