DO $$
DECLARE
  tbl text;
  role_name text;
  tables text[] := ARRAY[
    'Organization',
    'AuditEvent',
    'PolicyDocument',
    'PolicyMapping',
    'CanonicalControlStateHistory',
    'ComplianceEvent',
    'ComplianceDecision'
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
