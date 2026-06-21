import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = path.resolve(import.meta.dirname, "..");
const adapterPath = path.join(
  repoRoot,
  "integrations/google-apps-script/ai_fluency_aggregate_readiness_export.gs"
);
const contractPath = path.join(
  repoRoot,
  "docs/contracts/ai-value-google-sheets-aggregate-export/README.md"
);

function readArtifact(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function loadAdapterContext() {
  const source = readArtifact(adapterPath);
  const context = {
    Utilities: {
      formatDate(date, _timeZone, format) {
        const value = date instanceof Date ? date : new Date(date);
        const yyyy = String(value.getUTCFullYear());
        const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(value.getUTCDate()).padStart(2, "0");
        return format === "yyyy-MM-dd" ? `${yyyy}-${mm}-${dd}` : `${yyyy}${mm}${dd}`;
      }
    },
    Session: {
      getScriptTimeZone() {
        return "Etc/UTC";
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.FluencyTracrAggregateReadinessExport;
}

function scoreRow(overrides = {}) {
  return {
    client_id: "client-001",
    org_id: "org-001",
    function_area: "Marketing",
    workflow_family: "ai_fluency_readiness",
    cohort_key: "pilot-cohort",
    eligible_population_count: 50,
    overall_ai_fluency_score: 80,
    confidence_score: 82,
    usage_quality_score: 78,
    behavior_change_score: 79,
    leadership_reinforcement_score: 76,
    capability_growth_score: 85,
    ...overrides
  };
}

function mergedRows(count, scoreOverrides = {}) {
  return Array.from({ length: count }, () => ({
    score: scoreRow(scoreOverrides),
    response: {}
  }));
}

function responseRows(count, overrides = {}) {
  return Array.from({ length: count }, (_unused, index) => ({
    client_id: "client-001",
    cohort_id: "beta-2026",
    respondent_id: `response-${String(index + 1).padStart(2, "0")}`,
    function_area: "Marketing",
    overall_score: 80,
    ...overrides
  }));
}

function responseRowsForFunction(functionArea, count, startIndex = 0, overrides = {}) {
  return Array.from({ length: count }, (_unused, index) => ({
    client_id: "client-001",
    cohort_id: "beta-2026",
    respondent_id: `response-${String(startIndex + index + 1).padStart(3, "0")}`,
    function_area: functionArea,
    ...overrides
  }));
}

function longScoreRowsForResponses(rows, scoreValue = null, scoreOverrides = {}) {
  const valueFor = (defaultValue) => scoreValue === null ? defaultValue : scoreValue;
  const scoreKeys = [
    ["confidence", valueFor(82)],
    ["usage_quality", valueFor(78)],
    ["behavior_change", valueFor(79)],
    ["leadership_reinforcement", valueFor(76)],
    ["capability_growth", valueFor(85)]
  ];
  return rows.flatMap((row) =>
    scoreKeys.map(([scoreKey, score]) => ({
      client_id: row.client_id,
      cohort_id: row.cohort_id,
      respondent_id: row.respondent_id,
      score_key: scoreKey,
      score,
      ...scoreOverrides
    }))
  );
}

test("Google Sheets aggregate export adapter is additive and aggregate-only", () => {
  const source = readArtifact(adapterPath);

  assert.match(source, /AGGREGATE_EXPORT_SHEET_NAME\s*=\s*["']Aggregate Readiness Export["']/);
  assert.match(source, /RESPONSE_COUNT_MINIMUM\s*=\s*20/);
  assert.match(source, /k_min_posture:\s*["']k_min_20_function_level["']/);
  assert.match(source, /function rebuildAggregateReadinessExport\(/);
  assert.match(source, /FluencyTracrAggregateReadinessExport\s*=\s*\(function\(\)/);
  assert.doesNotMatch(source, /function onOpen\(/);
  assert.match(source, /SOURCE_RESPONSES_SHEET_NAME\s*=\s*["']Responses["']/);
  assert.match(source, /SOURCE_SCORES_SHEET_NAME\s*=\s*["']Scores["']/);
  assert.match(source, /getSheetByName\(SOURCE_RESPONSES_SHEET_NAME\)/);
  assert.match(source, /getSheetByName\(SOURCE_SCORES_SHEET_NAME\)/);
  assert.match(source, /clearContents\(\)/);
  assert.doesNotMatch(source, /deleteSheet\(/);
  assert.doesNotMatch(source, /getSheetByName\(["']Responses["']\)[\s\S]{0,240}\.clear/);
  assert.doesNotMatch(source, /getSheetByName\(["']Scores["']\)[\s\S]{0,240}\.clear/);
  assert.doesNotMatch(source, /getSheetByName\(["']Answer Detail["']\)[\s\S]{0,240}\.clear/);
  assert.doesNotMatch(source, /getSheetByName\(["']Audit["']\)[\s\S]{0,240}\.clear/);
  assert.doesNotMatch(source, /getSheetByName\(["']Answer Detail["']\)/);
  assert.doesNotMatch(source, /getSheetByName\(["']Audit["']\)/);

  const headerBlock = source.match(/AGGREGATE_EXPORT_HEADERS\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(headerBlock, "missing AGGREGATE_EXPORT_HEADERS");
  for (const unsafe of [
    "respondentId",
    "respondent_id",
    "resultJson",
    "employee_email",
    "employee_name",
    "user_id",
    "raw_answers",
    "raw_rows",
    "confidence_percentage",
    "probability",
    "realized_roi",
    "financial_attribution",
    "person_level"
  ]) {
    assert.doesNotMatch(headerBlock[1], new RegExp(`["']${unsafe}["']`, "i"));
  }
});

test("Google Sheets aggregate export adapter derives client and org identity from source rows", () => {
  const source = readArtifact(adapterPath);

  assert.match(source, /CLIENT_ID_ALIASES\s*=\s*\[/);
  assert.match(source, /ORG_ID_ALIASES\s*=\s*\[/);
  assert.match(source, /"clientId"/);
  assert.match(source, /"orgId"/);
  assert.match(source, /responseInputAliases_[\s\S]*CLIENT_ID_ALIASES/);
  assert.match(source, /responseInputAliases_[\s\S]*ORG_ID_ALIASES/);
  assert.match(source, /scoreInputAliases_[\s\S]*CLIENT_ID_ALIASES/);
  assert.match(source, /scoreInputAliases_[\s\S]*ORG_ID_ALIASES/);
  assert.match(source, /const clientId\s*=\s*resolvedClientId_/);
  assert.match(source, /const orgId\s*=\s*resolvedOrgId_/);
  assert.match(source, /\[clientId,\s*orgId,\s*functionArea,\s*workflowFamily,\s*cohortKey\]/);
  assert.match(source, /clientId:\s*clientId/);
  assert.match(source, /orgId:\s*orgId/);
  assert.match(source, /client_id:\s*group\.clientId/);
  assert.match(source, /org_id:\s*group\.orgId/);
  assert.doesNotMatch(source, /client_id:\s*EXPORT_CONTEXT\.client_id/);
  assert.doesNotMatch(source, /org_id:\s*EXPORT_CONTEXT\.org_id/);
});

test("Google Sheets aggregate export records use dynamic client and org identity", () => {
  const adapter = loadAdapterContext();
  const records = adapter.buildAggregateExportRecords_(mergedRows(20));
  const marketing = records.find((record) => record.function_area === "Marketing");

  assert.equal(records.length, 2);
  assert.ok(marketing);
  assert.ok(records.every((record) => record.client_id === "client-001"));
  assert.ok(records.every((record) => record.org_id === "org-001"));
  assert.equal(marketing.response_count, 20);
  assert.equal(marketing.suppression_state, "none");
  assert.match(marketing.source_ref, /client_001\/org_001/);
});

test("Google Sheets aggregate export joins current long Scores rows to Responses internally", () => {
  const adapter = loadAdapterContext();
  const responses = responseRows(20).reverse();
  const scores = longScoreRowsForResponses(responseRows(20));
  const merged = adapter.buildMergedRows_(scores, responses);
  const records = adapter.buildAggregateExportRecords_(merged);
  const marketing = records.find((record) => record.function_area === "Marketing");

  assert.ok(marketing);
  assert.equal(marketing.client_id, "client-001");
  assert.equal(marketing.org_id, "client-001");
  assert.equal(marketing.function_area, "Marketing");
  assert.equal(marketing.cohort_key, "beta-2026");
  assert.equal(marketing.response_count, 20);
  assert.equal(marketing.overall_ai_fluency_score, 80);
  assert.equal(marketing.confidence_score, 82);
  assert.equal(marketing.capability_growth_score, 85);
});

test("Google Sheets aggregate export preserves function metadata carried only on long Scores rows", () => {
  const adapter = loadAdapterContext();
  const responses = responseRowsForFunction("", 20, 0);
  const scores = longScoreRowsForResponses(responses, 80, {
    function_area: "Marketing",
    workflow_family: "go_to_market"
  });
  const merged = adapter.buildMergedRows_(scores, responses);
  const records = adapter.buildAggregateExportRecords_(merged);
  const functionAreas = records.map((record) => record.function_area);

  assert.ok(functionAreas.includes("Marketing"));
  assert.ok(functionAreas.includes("Organization Overall"));
  assert.ok(!functionAreas.includes("Organization"));
  assert.equal(records.find((record) => record.function_area === "Marketing").workflow_family, "go_to_market");
});

test("Google Sheets aggregate export includes response-backed functions when Scores are sparse", () => {
  const adapter = loadAdapterContext();
  const marketingResponses = responseRowsForFunction("Marketing", 20, 0);
  const salesResponses = responseRowsForFunction("Sales", 20, 20);
  const scores = longScoreRowsForResponses(marketingResponses, 80);
  const merged = adapter.buildMergedRows_(scores, [...marketingResponses, ...salesResponses]);
  const records = adapter.buildAggregateExportRecords_(merged);
  const marketing = records.find((record) => record.function_area === "Marketing");
  const sales = records.find((record) => record.function_area === "Sales");
  const overall = records.find((record) => record.function_area === "Organization Overall");

  assert.ok(marketing, "Marketing row should be present");
  assert.ok(sales, "Sales row should be present even without complete Scores rows");
  assert.ok(overall, "Organization Overall row should be present");
  assert.equal(marketing.overall_ai_fluency_score, 80);
  assert.equal(sales.response_count, 20);
  assert.equal(sales.overall_ai_fluency_score, null);
  assert.equal(sales.review_state, "held_incomplete_score_coverage");
  assert.equal(overall.response_count, 40);
  assert.equal(overall.overall_ai_fluency_score, null);
  assert.equal(overall.review_state, "held_incomplete_score_coverage");
});

test("Google Sheets aggregate export writes an organization overall row from complete respondent score bundles", () => {
  const adapter = loadAdapterContext();
  const marketingResponses = responseRowsForFunction("Marketing", 20, 0);
  const salesResponses = responseRowsForFunction("Sales", 20, 20);
  const scores = [
    ...longScoreRowsForResponses(marketingResponses, 80),
    ...longScoreRowsForResponses(salesResponses, 60)
  ];
  const merged = adapter.buildMergedRows_(scores, [...marketingResponses, ...salesResponses]);
  const records = adapter.buildAggregateExportRecords_(merged);
  const overall = records.find((record) => record.function_area === "Organization Overall");

  assert.ok(overall, "Organization Overall row should be present");
  assert.equal(overall.response_count, 40);
  assert.equal(overall.overall_ai_fluency_score, 70);
  assert.equal(overall.confidence_score, 70);
  assert.equal(overall.review_state, "held_organization_overall_review_only");
  assert.equal(overall.suppression_state, "none");
  assert.match(overall.caveats, /review-only organization overall/i);
});

test("Google Sheets aggregate export masks sub-five function labels and counts", () => {
  const adapter = loadAdapterContext();
  const marketingResponses = responseRowsForFunction("Marketing", 6, 0);
  const engineeringResponses = responseRowsForFunction("Engineering", 4, 6);
  const scores = [
    ...longScoreRowsForResponses(marketingResponses, 80),
    ...longScoreRowsForResponses(engineeringResponses, 60)
  ];
  const merged = adapter.buildMergedRows_(scores, [...marketingResponses, ...engineeringResponses]);
  const records = adapter.buildAggregateExportRecords_(merged);
  const smallCohort = records.find(
    (record) => record.function_area === "Suppressed Small Cohort Group"
  );
  const overall = records.find((record) => record.function_area === "Organization Overall");

  assert.ok(records.find((record) => record.function_area === "Marketing"));
  assert.ok(smallCohort);
  assert.ok(overall);
  assert.ok(!records.find((record) => record.function_area === "Engineering"));
  assert.equal(smallCohort.response_count, "");
  assert.equal(smallCohort.overall_ai_fluency_score, null);
  assert.equal(smallCohort.review_state, "held_suppressed_low_n");
  assert.equal(overall.response_count, 10);
  assert.equal(overall.overall_ai_fluency_score, null);
  assert.equal(overall.review_state, "held_suppressed_low_n");
});

test("Google Sheets aggregate export keeps respondent join keys out of serialized records", () => {
  const adapter = loadAdapterContext();
  const responses = responseRowsForFunction("Marketing", 20, 0);
  const records = adapter.buildAggregateExportRecords_(
    adapter.buildMergedRows_(longScoreRowsForResponses(responses, 80), responses)
  );
  const serialized = JSON.stringify(records);

  for (const unsafe of [
    "respondent_id",
    "respondentId",
    "person@example.com",
    "raw_answers"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(unsafe, "i"));
  }
});

test("Google Sheets aggregate export fails closed when client identity is missing", () => {
  const adapter = loadAdapterContext();
  assert.throws(
    () => adapter.buildAggregateExportRecords_(mergedRows(20, { client_id: "", org_id: "" })),
    /Missing required client_id/
  );
});

test("Google Sheets aggregate export fails closed on conflicting score and response identity", () => {
  const adapter = loadAdapterContext();
  assert.throws(
    () =>
      adapter.buildAggregateExportRecords_([
        {
          score: scoreRow({ client_id: "client-001" }),
          response: { client_id: "client-002" }
        }
      ]),
    /Conflicting client_id/
  );
});

test("Google Sheets aggregate export fails closed on mixed client or org identity", () => {
  const adapter = loadAdapterContext();
  const rows = [
    ...mergedRows(20, { client_id: "client-001", org_id: "org-001" }),
    ...mergedRows(20, { client_id: "client-002", org_id: "org-002" })
  ];

  assert.throws(
    () => adapter.buildAggregateExportRecords_(rows),
    /single client_id and org_id/
  );
});

test("Google Sheets aggregate export blocks unsafe values inside allowed fields", () => {
  const adapter = loadAdapterContext();
  assert.throws(
    () => adapter.buildAggregateExportRecords_(mergedRows(20, { client_id: "person@example.com" })),
    /Unsafe export value blocked/
  );
  assert.throws(
    () => adapter.buildAggregateExportRecords_(mergedRows(20, { cohort_key: "respondent-12345" })),
    /Unsafe export value blocked/
  );
});

test("Google Sheets aggregate export contract preserves the current analysis sheet boundary", () => {
  const contract = readArtifact(contractPath);

  for (const phrase of [
    "does not replace the current AI Fluency Instrument workbook",
    "FluencyTracr consumes only the Aggregate Readiness Export tab",
    "k-minimum suppression",
    "not ROI proof",
    "not a confidence model",
    "not a financial attribution model",
    "AI Fluency Dashboard Import Runner"
  ]) {
    assert.ok(contract.includes(phrase), `missing phrase: ${phrase}`);
  }
  assert.match(
    contract,
    /Responses, Scores, Answer Detail, and Audit tabs\s+can continue to store respondent-level data/
  );
});
