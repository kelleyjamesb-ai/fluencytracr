#!/usr/bin/env node
// Boundary aggregator for "Explore Your AI Fluency" instrument sessions.
//
// Input: individual session payloads (schemaVersion ai-fluency-beta-response/v1)
// as collected by the instrument's submission sheet — either a JSON array file
// or a directory of per-session JSON files.
//
// Output: an aggregate FT_AI_VALUE_FLUENCY_BASELINE_2026_06 package. This is
// the privacy boundary: respondent ids, profiles, calibration text, and raw
// answers never cross it. Cohorts below the engine minimum are emitted as
// suppressed and scoreless. The product is validated through the AI Value
// Engine before it is written; an invalid aggregate is never emitted.
//
// Run `npm run build --workspace shared` first.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateFluencyBaseline,
  FLUENCY_MIN_COHORT_SIZE,
  FLUENCY_CONSTRUCTS,
  FLUENCY_INSTRUMENT_IDS
} from "../shared/dist/aiValueEngine/index.js";

const SESSION_SCHEMA_VERSION = "ai-fluency-beta-response/v1";
const BASELINE_SCHEMA_VERSION = "FT_AI_VALUE_FLUENCY_BASELINE_2026_06";

const ALLOWED_GROUP_FIELDS = new Set(["functionArea", "roleLevel"]);

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    orgId: null,
    baselineId: null,
    collectionMode: "kickoff",
    window: null,
    groupBy: "functionArea"
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      return argv[i];
    };
    if (arg === "--input") args.input = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--org-id") args.orgId = next();
    else if (arg === "--baseline-id") args.baselineId = next();
    else if (arg === "--collection-mode") args.collectionMode = next();
    else if (arg === "--window") args.window = next();
    else if (arg === "--group-by") args.groupBy = next();
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/aggregate_ai_fluency_sessions.mjs --input sessions.json|dir --org-id org --baseline-id id [--collection-mode kickoff|followup] [--window A_to_B] [--group-by functionArea|roleLevel] [--output path]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.input || !args.orgId || !args.baselineId) {
    throw new Error("--input, --org-id, and --baseline-id are required");
  }
  if (!ALLOWED_GROUP_FIELDS.has(args.groupBy)) {
    throw new Error(`--group-by must be one of: ${[...ALLOWED_GROUP_FIELDS].join(", ")}`);
  }
  return args;
}

export function loadSessions(inputPath) {
  const fullPath = resolve(process.cwd(), inputPath);
  if (statSync(fullPath).isDirectory()) {
    return readdirSync(fullPath)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => JSON.parse(readFileSync(join(fullPath, name), "utf8")));
  }
  const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
  return Array.isArray(parsed) ? parsed : [parsed];
}

function sessionGaps(session, index) {
  const gaps = [];
  if (session?.schemaVersion !== SESSION_SCHEMA_VERSION) {
    gaps.push(`sessions[${index}] has unsupported schemaVersion: ${session?.schemaVersion}`);
  }
  if (!FLUENCY_INSTRUMENT_IDS.has(session?.versionIdentifier)) {
    gaps.push(`sessions[${index}] has unsupported versionIdentifier: ${session?.versionIdentifier}`);
  }
  if (!Array.isArray(session?.answers) || session.answers.length === 0) {
    gaps.push(`sessions[${index}] has no answers`);
  }
  return gaps;
}

function constructMeansForSession(session) {
  const totals = {};
  for (const answer of session.answers ?? []) {
    const construct = answer?.construct;
    const value = Number(answer?.value);
    if (!FLUENCY_CONSTRUCTS.has(construct)) continue;
    if (!Number.isFinite(value) || value < 1 || value > 5) continue;
    totals[construct] = totals[construct] ?? { sum: 0, count: 0 };
    totals[construct].sum += value;
    totals[construct].count += 1;
  }
  return Object.fromEntries(
    Object.entries(totals).map(([construct, { sum, count }]) => [construct, sum / count])
  );
}

function humanizeLabel(value) {
  const text = String(value || "unspecified").replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sanitizeCohortId(value) {
  return (
    "cohort_" +
    String(value || "unspecified")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

function deriveWindow(sessions) {
  const dates = sessions
    .map((session) => String(session?.submittedAt ?? "").slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  if (dates.length === 0) return null;
  return `${dates[0]}_to_${dates[dates.length - 1]}`;
}

/**
 * Aggregates instrument sessions into a governed fluency baseline package.
 * Returns { baseline, validation, session_gaps }. The baseline contains no
 * respondent-level data; small cohorts are suppressed and scoreless.
 */
export function aggregateFluencySessions(sessions, options) {
  const gaps = sessions.flatMap((session, index) => sessionGaps(session, index));
  if (gaps.length > 0) {
    return { baseline: null, validation: null, session_gaps: gaps };
  }

  const instrumentIds = [...new Set(sessions.map((session) => session.versionIdentifier))];
  if (instrumentIds.length > 1) {
    return {
      baseline: null,
      validation: null,
      session_gaps: [`sessions mix instrument versions: ${instrumentIds.join(", ")}`]
    };
  }

  const groups = new Map();
  for (const session of sessions) {
    const key = String(session?.profile?.[options.groupBy] || "unspecified");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(session);
  }

  const cohorts = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupValue, groupSessions]) => {
      const base = {
        cohort_id: sanitizeCohortId(groupValue),
        cohort_label: humanizeLabel(groupValue),
        respondent_count: groupSessions.length
      };
      if (groupSessions.length < FLUENCY_MIN_COHORT_SIZE) {
        // Suppression happens at export: small groups carry no scores.
        return { ...base, suppressed: true };
      }
      const totals = {};
      for (const session of groupSessions) {
        for (const [construct, mean] of Object.entries(constructMeansForSession(session))) {
          totals[construct] = totals[construct] ?? { sum: 0, count: 0 };
          totals[construct].sum += mean;
          totals[construct].count += 1;
        }
      }
      const constructScores = Object.fromEntries(
        Object.entries(totals).map(([construct, { sum, count }]) => [
          construct,
          { mean: Math.round((sum / count) * 100) / 100 }
        ])
      );
      return { ...base, construct_scores: constructScores };
    });

  const itemCount = instrumentIds[0] === "ai_fluency_long_v1" ? 24 : 14;
  const baseline = {
    schema_version: BASELINE_SCHEMA_VERSION,
    baseline_id: options.baselineId,
    org_id: options.orgId,
    instrument: {
      instrument_id: instrumentIds[0],
      item_count: itemCount
    },
    window: options.window ?? deriveWindow(sessions) ?? "unknown_window",
    collection_mode: options.collectionMode,
    cohorts,
    governance: {
      respondent_identifiers_included: false,
      person_level_results_shared: false,
      used_for_individual_scoring: false,
      used_for_team_ranking: false
    }
  };

  const validation = validateFluencyBaseline(baseline);
  return { baseline, validation, session_gaps: [] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sessions = loadSessions(args.input);
  const { baseline, validation, session_gaps } = aggregateFluencySessions(sessions, {
    orgId: args.orgId,
    baselineId: args.baselineId,
    collectionMode: args.collectionMode,
    window: args.window,
    groupBy: args.groupBy
  });

  if (session_gaps.length > 0) {
    console.error("Refusing to aggregate; session input problems:");
    for (const gap of session_gaps) console.error(`- ${gap}`);
    process.exit(1);
  }
  if (!validation.valid) {
    console.error("Refusing to emit an invalid baseline package:");
    for (const gap of validation.gaps) console.error(`- ${gap}`);
    process.exit(1);
  }

  const json = `${JSON.stringify(baseline, null, 2)}\n`;
  if (args.output) {
    writeFileSync(resolve(process.cwd(), args.output), json, "utf8");
    console.log(`Wrote ${args.output}`);
    console.log(
      `Cohorts: ${baseline.cohorts.length} (${validation.suppressed_cohort_count} suppressed)`
    );
    return;
  }
  process.stdout.write(json);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
