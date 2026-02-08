-- Operational bootstrap: run by DBA or CI setup, NOT by schema migration.
-- Password is injected by the calling script via psql variable, never hardcoded.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_writer') THEN
    EXECUTE format('CREATE ROLE audit_writer LOGIN PASSWORD %L', :'audit_writer_password');
  END IF;
END $$;

GRANT CONNECT ON DATABASE :dbname TO audit_writer;
GRANT USAGE ON SCHEMA public TO audit_writer;
GRANT INSERT, SELECT ON audit_log TO audit_writer;
-- Explicitly: NO UPDATE, NO DELETE, NO TRUNCATE
