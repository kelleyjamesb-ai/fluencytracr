-- Supabase hardening: every public application table should have RLS enabled.
-- The backend uses the database connection directly; anon/authenticated Data API
-- roles should not receive table access unless explicit policies are added later.

DO $$
DECLARE
  tbl text;
  role_name text;
  tables text[] := ARRAY[
    'Organization',
    'Team',
    'FluencyScore',
    'AuditEvent',
    'PolicyDocument',
    'PolicyMapping',
    'CanonicalControlStateHistory',
    'ComplianceEvent',
    'ComplianceDecision',
    'WorkflowRegistryEntry',
    'WorkflowRegistryAuditEvent',
    'WorkflowVisibilityPolicyConfig',
    'WorkflowRegistryVersion',
    'WorkflowRegistryCurrent',
    'ControlConfigVersion',
    'BaselineResetEvent',
    'canonical_events',
    'execution_snapshots',
    'classification_outcomes',
    'workflow_aggregates',
    'threshold_calibrations',
    'suppression_audit_log'
  ];
  restricted_roles text[] := ARRAY['anon', 'authenticated'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'Skipping missing table public.%', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    FOREACH role_name IN ARRAY restricted_roles LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', tbl, role_name);
      END IF;
    END LOOP;
  END LOOP;
END
$$;
