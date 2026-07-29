DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fluency') THEN
    CREATE ROLE fluency
      LOGIN PASSWORD 'fluency'
      SUPERUSER CREATEDB CREATEROLE INHERIT
      NOREPLICATION NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;

END
$$;

ALTER DATABASE fluency OWNER TO fluency;

SET ROLE fluency;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
RESET ROLE;
ALTER ROLE fluency
  NOSUPERUSER CREATEDB CREATEROLE INHERIT
  NOREPLICATION NOBYPASSRLS;

SET ROLE fluency;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'fluencytracr_slice_e_runtime'
  ) THEN
    CREATE ROLE fluencytracr_slice_e_runtime
      LOGIN PASSWORD 'slice_e_assurance_runtime_2026'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
      NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
RESET ROLE;

ALTER DEFAULT PRIVILEGES FOR ROLE fluency IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE fluency IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE fluency IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
