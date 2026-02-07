import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const SUPERUSER_URL = process.env.DATABASE_URL ?? "postgresql://fluency:fluency@localhost:5432/fluency_test";
const AUDIT_WRITER_PASSWORD = process.env.AUDIT_WRITER_PASSWORD ?? "audit-ci-test-only";

let superPool: Pool | null = null;

/**
 * Bootstrap the audit database for tests.
 * Creates the audit_log table and audit_writer role.
 * Returns the superuser pool for cleanup and the audit_writer connection string.
 */
export const bootstrapAuditDb = async (): Promise<{
  superPool: Pool;
  auditWriterUrl: string;
}> => {
  superPool = new Pool({ connectionString: SUPERUSER_URL });

  // Run schema migration
  const migrationPath = path.join(__dirname, "..", "sql", "001_create_audit_log.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  await superPool.query(migrationSql);

  // Create audit_writer role (idempotent)
  await superPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_writer') THEN
        EXECUTE format('CREATE ROLE audit_writer LOGIN PASSWORD %L', '${AUDIT_WRITER_PASSWORD}');
      END IF;
    END $$;
  `);

  // Grant permissions
  await superPool.query("GRANT USAGE ON SCHEMA public TO audit_writer");
  await superPool.query("GRANT INSERT, SELECT ON audit_log TO audit_writer");

  // Build audit_writer connection string
  const url = new URL(SUPERUSER_URL);
  url.username = "audit_writer";
  url.password = AUDIT_WRITER_PASSWORD;
  const auditWriterUrl = url.toString();

  return { superPool, auditWriterUrl };
};

/**
 * Truncate audit_log using superuser (audit_writer cannot do this).
 */
export const truncateAuditLog = async (): Promise<void> => {
  if (!superPool) throw new Error("bootstrapAuditDb not called");
  await superPool.query("TRUNCATE audit_log");
};

/**
 * Cleanup: close the superuser pool.
 */
export const teardownAuditDb = async (): Promise<void> => {
  if (superPool) {
    await superPool.end();
    superPool = null;
  }
};
