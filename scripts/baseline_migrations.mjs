#!/usr/bin/env node
// One-time Prisma migration baseline.
//
// The local dev database was bootstrapped outside Prisma (the schema was
// applied via `prisma db execute`/`db push`), so it has no `_prisma_migrations`
// history table. Prisma then refuses to apply any migration on the non-empty
// schema with `P3005: The database schema is not empty` - including the
// committed ai_value_objects migration.
//
// This script records every existing migration as already-applied
// (`prisma migrate resolve --applied <name>`), which creates the history table
// and makes a subsequent `prisma migrate deploy` a clean no-op. It does NOT run
// any DDL, so it is safe against a database whose tables already exist.
//
//   - Existing dev DB built outside Prisma  -> run this once, then deploy.
//   - Truly fresh / empty database          -> skip this; plain
//                                               `prisma migrate deploy` works.
//
// Requires DATABASE_URL (and DIRECT_URL) in the environment.
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const MIGRATIONS_DIR = "backend/prisma/migrations";
const SCHEMA = "backend/prisma/schema.prisma";

function listMigrations() {
  const dir = resolve(process.cwd(), MIGRATIONS_DIR);
  return readdirSync(dir)
    .filter((name) => statSync(resolve(dir, name)).isDirectory())
    .sort();
}

function prisma(argsList) {
  // Use the workspace-local prisma so the version matches the schema.
  return execFileSync("npx", ["prisma", ...argsList, "--schema", SCHEMA], {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8"
  });
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error("x DATABASE_URL is not set. Export it (and DIRECT_URL) before baselining.");
    process.exit(1);
  }

  const migrations = listMigrations();
  if (migrations.length === 0) {
    console.error(`x No migrations found under ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  console.log(`Baselining ${migrations.length} migration(s) as applied...`);
  let recorded = 0;
  for (const name of migrations) {
    try {
      prisma(["migrate", "resolve", "--applied", name]);
      console.log(`  OK ${name}`);
      recorded += 1;
    } catch (error) {
      // Already recorded (history exists) - Prisma exits non-zero. Treat as a
      // no-op so the script is idempotent.
      const out = `${error.stdout ?? ""}${error.stderr ?? ""}`;
      if (/already recorded|P3008|is already applied/i.test(out)) {
        console.log(`  - ${name} already recorded`);
      } else {
        console.error(`\nx Failed to resolve ${name}:`);
        console.error(out.trim() || String(error));
        process.exit(1);
      }
    }
  }

  console.log(`\nBaseline complete (${recorded} newly recorded). Verifying with migrate deploy...`);
  try {
    const out = prisma(["migrate", "deploy"]);
    console.log(out.trim());
    console.log("\nOK Migration history is consistent; `prisma migrate deploy` is now a no-op.");
  } catch (error) {
    const out = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    console.error("\nx migrate deploy still failing after baseline:");
    console.error(out.trim() || String(error));
    process.exit(1);
  }
}

main();
