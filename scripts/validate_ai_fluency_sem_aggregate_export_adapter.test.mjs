import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = path.resolve(import.meta.dirname, "..");
const adapterPath = path.join(
  repoRoot,
  "integrations/google-apps-script/ai_fluency_sem_aggregate_export.gs"
);
const manifestPath = path.join(
  repoRoot,
  "inference/config/ai_fluency_long_v1_manifest.json"
);

const CONSTRUCTS = [
  "confidence",
  "confidence",
  "confidence",
  "usage_quality",
  "usage_quality",
  "usage_quality",
  "behavior_change",
  "behavior_change",
  "behavior_change",
  "leadership_reinforcement",
  "leadership_reinforcement",
  "leadership_reinforcement",
  "capability_growth",
  "capability_growth",
  "capability_growth",
  "ai_attitude",
  "ai_attitude",
  "ai_attitude",
  "behavioral_intent",
  "behavioral_intent",
  "behavioral_intent",
  "perceived_ai_impact",
  "perceived_ai_impact",
  "perceived_ai_impact"
];

const FIXED_CONTEXT = {
  source_ref: `google-sheets-answer-detail://sha256/${"a".repeat(64)}`,
  source_cohort_id: "organization_overall",
  aggregate_cohort_ref: "organization_overall",
  source_form_definition_hash:
    "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434",
  wave_id: `wave-sha256/${"b".repeat(64)}`,
  wave_role: "baseline",
  wave_index: 0,
  window_start: "2026-01-01",
  window_end: "2026-01-31",
  eligible_population_count: 25,
  owner_review_state: "approved_for_internal_calibration_review"
};

function readAdapterSource() {
  return fs.readFileSync(adapterPath, "utf8");
}

function stableStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function loadAdapter(
  spreadsheetApp = undefined,
  embeddedContext = undefined,
  lockService = undefined
) {
  const defaultDocumentLock = {
    tryLock() { return true; },
    releaseLock() {}
  };
  const context = {
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      computeDigest(_algorithm, value) {
        const digest = crypto.createHash("sha256").update(String(value), "utf8").digest();
        return Array.from(digest, (byte) => (byte > 127 ? byte - 256 : byte));
      }
    },
    SpreadsheetApp: spreadsheetApp,
    LockService: lockService || {
      getDocumentLock() { return defaultDocumentLock; }
    }
  };
  vm.createContext(context);
  const source = embeddedContext
    ? readAdapterSource().replace(
        /const ADAPTER_CONTEXT = Object\.freeze\(\{[\s\S]*?\}\);/,
        `const ADAPTER_CONTEXT = Object.freeze(${JSON.stringify(embeddedContext)});`
      )
    : readAdapterSource();
  vm.runInContext(source, context);
  return context.FluencyTracrSemAggregateExport;
}

const ANSWER_DETAIL_HEADERS = [
  "receivedAt",
  "measurementMode",
  "versionIdentifier",
  "clientId",
  "clientName",
  "cohortId",
  "inviteCode",
  "respondentId",
  "questionId",
  "itemIndex",
  "itemConstruct",
  "itemTitle",
  "value",
  "answeredAt"
];

class MockSheet {
  constructor(name, values = []) {
    this.name = name;
    this.values = values.map((row) => row.slice());
    this.clearCount = 0;
    this.reads = [];
    this.frozenRows = 0;
    this.failDataWrites = false;
  }

  getLastRow() {
    return this.values.length;
  }

  getLastColumn() {
    return this.values.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  }

  getRange(row, column, rowCount, columnCount) {
    const sheet = this;
    return {
      getValues() {
        sheet.reads.push({ row, column, rowCount, columnCount });
        return Array.from({ length: rowCount }, (_unused, rowOffset) =>
          Array.from({ length: columnCount }, (_unusedCell, columnOffset) =>
            sheet.values[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
          )
        );
      },
      setValues(nextValues) {
        if (sheet.failDataWrites && row > 1) {
          throw new Error("simulated sheet data write failure");
        }
        for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
          const targetRow = row - 1 + rowOffset;
          while (sheet.values.length <= targetRow) sheet.values.push([]);
          for (let columnOffset = 0; columnOffset < columnCount; columnOffset += 1) {
            sheet.values[targetRow][column - 1 + columnOffset] =
              nextValues[rowOffset][columnOffset];
          }
        }
        return this;
      }
    };
  }

  clearContents() {
    this.clearCount += 1;
    this.values = [];
    return this;
  }

  setFrozenRows(count) {
    this.frozenRows = count;
    return this;
  }
}

function createMockWorkbook(answerRows, staleOutputs = false) {
  const sourceValues = [
    ANSWER_DETAIL_HEADERS,
    ...answerRows.map((row) => ANSWER_DETAIL_HEADERS.map((header) => row[header] ?? ""))
  ];
  const stale = staleOutputs ? [["stale_header"], ["STALE_PRIVATE_TABLE"]] : [];
  const sheets = new Map([
    ["Answer Detail", new MockSheet("Answer Detail", sourceValues)],
    ["SEM Aggregate Metadata", new MockSheet("SEM Aggregate Metadata", stale)],
    ["SEM Item Category Counts", new MockSheet("SEM Item Category Counts", stale)],
    ["SEM Pairwise Counts", new MockSheet("SEM Pairwise Counts", stale)]
  ]);
  const spreadsheet = {
    requestedSheetNames: [],
    getSheetByName(name) {
      this.requestedSheetNames.push(name);
      return sheets.get(name) || null;
    },
    insertSheet(name) {
      const sheet = new MockSheet(name);
      sheets.set(name, sheet);
      return sheet;
    }
  };
  return { spreadsheet, sheets };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAnswerRows(respondentCount = 20, overrides = {}) {
  const rows = [];
  for (let respondentIndex = 0; respondentIndex < respondentCount; respondentIndex += 1) {
    for (let itemIndex = 1; itemIndex <= 24; itemIndex += 1) {
      rows.push({
        receivedAt: "2026-01-15T12:00:00.000Z",
        measurementMode: "long",
        versionIdentifier: "ai_fluency_long_v1",
        clientId: "client-secret-001",
        clientName: "Sensitive Client Name",
        cohortId: FIXED_CONTEXT.source_cohort_id,
        inviteCode: `invite-secret-${respondentIndex + 1}`,
        respondentId: `respondent-secret-${String(respondentIndex + 1).padStart(3, "0")}`,
        questionId: `ai-fluency-q${String(itemIndex).padStart(2, "0")}`,
        itemIndex,
        itemConstruct: CONSTRUCTS[itemIndex - 1],
        itemTitle: "Sensitive title must never leave the source boundary.",
        value: (respondentIndex % 5) + 1,
        profile: "Sensitive profile must never leave the source boundary.",
        rawAnswer: "Sensitive raw answer must never leave the source boundary.",
        usageBehavior: "Separate behavior evidence must be ignored.",
        ...overrides
      });
    }
  }
  return rows;
}

function build(adapter, rows, context = FIXED_CONTEXT) {
  return plain(adapter.buildAggregateEvidence_(rows, context));
}

test("SEM aggregate adapter is paste-in, additive, and reads only Answer Detail", () => {
  const source = readAdapterSource();

  assert.match(source, /FluencyTracrSemAggregateExport\s*=\s*\(function\(\)/);
  assert.match(source, /SOURCE_SHEET_NAME\s*=\s*["']Answer Detail["']/);
  assert.match(source, /METADATA_SHEET_NAME\s*=\s*["']SEM Aggregate Metadata["']/);
  assert.match(source, /ITEM_COUNTS_SHEET_NAME\s*=\s*["']SEM Item Category Counts["']/);
  assert.match(source, /PAIR_COUNTS_SHEET_NAME\s*=\s*["']SEM Pairwise Counts["']/);
  assert.match(source, /OBSERVED_N_MINIMUM\s*=\s*20/);
  assert.match(
    source,
    /eligible_population_count:\s*["']replace-with-eligible-population-count["']/
  );
  assert.match(source, /question_id:\s*\[["']question_id["'],\s*["']questionId["']\]/);
  assert.doesNotMatch(source, /response_vectors_without_join_keys/);
  assert.match(source, /function rebuildAiFluencySemAggregateExport\(/);
  assert.doesNotMatch(source, /function onOpen\(/);
  assert.doesNotMatch(source, /getSheetByName\(["']Responses["']\)/);
  assert.doesNotMatch(source, /SOURCE_RESPONSES_SHEET_NAME/);
  assert.doesNotMatch(source, /deleteSheet\(/);
  assert.doesNotMatch(source, /sourceSheet\.clear(?:Contents)?\(/);
  assert.doesNotMatch(source, /PropertiesService|ScriptProperties|UserProperties/);
  assert.doesNotMatch(source, /CONTINGENCY_CELL_MINIMUM|NONZERO_CELL_MINIMUM|SMALL_CELL_FLOOR/);

  const itemHeaders = source.match(/ITEM_COUNT_HEADERS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  const pairHeaders = source.match(/PAIR_COUNT_HEADERS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(itemHeaders);
  assert.ok(pairHeaders);
  for (const unsafeHeader of [
    "respondent_id",
    "invite_code",
    "client_id",
    "client_name",
    "profile",
    "raw_answer",
    "item_title",
    "free_text",
    "question_id",
    "usage_behavior"
  ]) {
    assert.doesNotMatch(itemHeaders[1], new RegExp(`["']${unsafeHeader}["']`, "i"));
    assert.doesNotMatch(pairHeaders[1], new RegExp(`["']${unsafeHeader}["']`, "i"));
  }
});

test("adapter is pinned to the committed 24-item manifest hash and map", () => {
  const source = readAdapterSource();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifestHash = crypto
    .createHash("sha256")
    .update(stableStringify(manifest), "utf8")
    .digest("hex");
  const embeddedHash = source.match(
    /CANONICAL_FORM_MANIFEST_HASH\s*=\s*[\r\n\s]*["']([0-9a-f]{64})["']/
  );

  assert.ok(embeddedHash);
  assert.equal(embeddedHash[1], manifestHash);
  assert.equal(manifest.form_id, "ai_fluency_long_v1");
  assert.equal(manifest.items.length, 24);
  assert.deepEqual(
    manifest.items.map((item) => item.construct_id),
    CONSTRUCTS
  );
});

test("sheet entrypoint reads only required source columns and writes owned aggregate sheets", () => {
  const workbook = createMockWorkbook(buildAnswerRows());
  const adapter = loadAdapter(
    {
      getActiveSpreadsheet() {
        return workbook.spreadsheet;
      }
    },
    FIXED_CONTEXT
  );
  const summary = plain(adapter.rebuildAggregateEvidence());
  const sourceSheet = workbook.sheets.get("Answer Detail");
  const itemSheet = workbook.sheets.get("SEM Item Category Counts");
  const pairSheet = workbook.sheets.get("SEM Pairwise Counts");
  const sourceDataColumns = sourceSheet.reads
    .filter((read) => read.row === 2)
    .map((read) => read.column);

  assert.equal(summary.evidence_state, "READY");
  assert.equal(sourceSheet.clearCount, 0);
  assert.deepEqual(sourceDataColumns, [1, 2, 3, 6, 8, 9, 10, 11, 13]);
  assert.deepEqual(
    [...new Set(workbook.spreadsheet.requestedSheetNames)],
    [
      "Answer Detail",
      "SEM Aggregate Metadata",
      "SEM Item Category Counts",
      "SEM Pairwise Counts"
    ]
  );
  assert.equal(itemSheet.clearCount, 1);
  assert.equal(pairSheet.clearCount, 1);
  assert.equal(itemSheet.values.length, 121);
  assert.equal(pairSheet.values.length, 6901);
  assert.equal(itemSheet.frozenRows, 1);
  assert.equal(pairSheet.frozenRows, 1);
});

test("sheet entrypoint removes stale owned tables when the current wave HOLDS", () => {
  const workbook = createMockWorkbook(buildAnswerRows(19), true);
  const adapter = loadAdapter(
    {
      getActiveSpreadsheet() {
        return workbook.spreadsheet;
      }
    },
    FIXED_CONTEXT
  );
  const summary = plain(adapter.rebuildAggregateEvidence());
  const sourceSheet = workbook.sheets.get("Answer Detail");
  const metadataSheet = workbook.sheets.get("SEM Aggregate Metadata");
  const itemSheet = workbook.sheets.get("SEM Item Category Counts");
  const pairSheet = workbook.sheets.get("SEM Pairwise Counts");

  assert.equal(summary.evidence_state, "HOLD");
  assert.equal(sourceSheet.clearCount, 0);
  assert.equal(metadataSheet.values.length, 2);
  assert.equal(itemSheet.values.length, 1);
  assert.equal(pairSheet.values.length, 1);
  assert.doesNotMatch(JSON.stringify([...workbook.sheets.values()]), /STALE_PRIVATE_TABLE/);
});

test("sheet publication is locked and cannot leave READY metadata over partial tables", () => {
  const workbook = createMockWorkbook(buildAnswerRows(), true);
  workbook.sheets.get("SEM Pairwise Counts").failDataWrites = true;
  const lockEvents = [];
  const documentLock = {
    tryLock(timeout) {
      lockEvents.push(["try", timeout]);
      return true;
    },
    releaseLock() {
      lockEvents.push(["release"]);
    }
  };
  const adapter = loadAdapter(
    {
      getActiveSpreadsheet() {
        return workbook.spreadsheet;
      }
    },
    FIXED_CONTEXT,
    {
      getDocumentLock() { return documentLock; }
    }
  );

  const summary = plain(adapter.rebuildAggregateEvidence());
  const metadataValues = workbook.sheets.get("SEM Aggregate Metadata").values;
  const metadata = Object.fromEntries(
    metadataValues[0].map((header, index) => [header, metadataValues[1][index]])
  );

  assert.equal(summary.evidence_state, "HOLD");
  assert.ok(summary.hold_codes.includes("AGGREGATE_WRITE_FAILED"));
  assert.equal(metadata.evidence_state, "HOLD");
  assert.match(metadata.hold_codes, /AGGREGATE_WRITE_FAILED/);
  assert.equal(workbook.sheets.get("SEM Item Category Counts").values.length, 1);
  assert.equal(workbook.sheets.get("SEM Pairwise Counts").values.length, 1);
  assert.deepEqual(lockEvents, [["try", 30000], ["release"]]);
});

test("happy path emits 24 item tables and all 276 pairwise 5x5 tables", () => {
  const adapter = loadAdapter();
  const evidence = build(adapter, buildAnswerRows());

  assert.equal(evidence.metadata.evidence_state, "READY");
  assert.deepEqual(evidence.metadata.hold_codes, []);
  assert.equal(evidence.metadata.wave_observed_n, 20);
  assert.equal(evidence.metadata.privacy_minimum_observed_n, 20);
  assert.equal(evidence.metadata.item_table_count, 24);
  assert.equal(evidence.metadata.item_category_row_count, 120);
  assert.equal(evidence.metadata.pair_table_count, 276);
  assert.equal(evidence.metadata.pair_cell_row_count, 6900);
  assert.equal(evidence.item_tables.length, 24);
  assert.equal(evidence.pair_tables.length, 276);

  evidence.item_tables.forEach((table, index) => {
    assert.equal(table.item_index, index + 1);
    assert.equal(table.construct_id, CONSTRUCTS[index]);
    assert.equal(table.observed_n, 20);
    assert.equal(table.missing_n, 0);
    assert.equal(table.category_counts.length, 5);
    assert.equal(
      table.category_counts.reduce((total, cell) => total + cell.count, 0),
      table.observed_n
    );
  });

  evidence.pair_tables.forEach((table) => {
    assert.ok(table.item_i_index < table.item_j_index);
    assert.equal(table.observed_n, 20);
    assert.equal(table.missing_n, 0);
    assert.equal(table.cell_counts.length, 25);
    assert.equal(
      table.cell_counts.reduce((total, cell) => total + cell.count, 0),
      table.observed_n
    );
  });
});

test("small and zero contingency cells are valid when wave, item, and pair n meet 20", () => {
  const adapter = loadAdapter();
  const evidence = build(adapter, buildAnswerRows());
  const firstPair = evidence.pair_tables.find(
    (table) => table.item_i_index === 1 && table.item_j_index === 2
  );
  const nonzeroCounts = firstPair.cell_counts
    .map((cell) => cell.count)
    .filter((count) => count > 0);

  assert.equal(evidence.metadata.evidence_state, "READY");
  assert.deepEqual(nonzeroCounts, [4, 4, 4, 4, 4]);
  assert.ok(firstPair.cell_counts.some((cell) => cell.count === 0));
});

test("source join keys and unsafe source-only fields never enter aggregate evidence", () => {
  const adapter = loadAdapter();
  const evidence = build(adapter, buildAnswerRows());
  const serialized = JSON.stringify(evidence);

  for (const unsafeValue of [
    "respondent-secret-001",
    "invite-secret-1",
    "client-secret-001",
    "Sensitive Client Name",
    "Sensitive title",
    "Sensitive profile",
    "Sensitive raw answer",
    "Separate behavior evidence"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(unsafeValue, "i"));
  }
  for (const unsafeKey of [
    "respondent_id",
    "invite_code",
    "client_name",
    "item_title",
    "question_id",
    "raw_answer",
    "usage_behavior"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(`"${unsafeKey}"`, "i"));
  }
});

test("malformed Answer Detail rows HOLD without returning count tables", async (t) => {
  const adapter = loadAdapter();
  const cases = [
    {
      name: "out-of-range item index",
      mutate: (rows) => { rows[0].itemIndex = 25; },
      code: "MALFORMED_ANSWER_DETAIL"
    },
    {
      name: "wrong construct for item",
      mutate: (rows) => { rows[0].itemConstruct = "usage_quality"; },
      code: "MALFORMED_ANSWER_DETAIL"
    },
    {
      name: "question identity drift",
      mutate: (rows) => { rows[0].questionId = "behavior-real-work-task"; },
      code: "SOURCE_ITEM_IDENTITY_MISMATCH"
    },
    {
      name: "out-of-range ordinal value",
      mutate: (rows) => { rows[0].value = 6; },
      code: "UNSAFE_ANSWER_VALUE"
    },
    {
      name: "free-text answer",
      mutate: (rows) => { rows[0].value = "person@example.com free text"; },
      code: "UNSAFE_ANSWER_VALUE"
    },
    {
      name: "missing join key",
      mutate: (rows) => { rows[0].respondentId = ""; },
      code: "MALFORMED_ANSWER_DETAIL"
    },
    {
      name: "invalid source timestamp",
      mutate: (rows) => { rows[0].receivedAt = "not-a-date"; },
      code: "MALFORMED_ANSWER_DETAIL"
    }
  ];

  for (const candidate of cases) {
    await t.test(candidate.name, () => {
      const rows = buildAnswerRows();
      candidate.mutate(rows);
      const evidence = build(adapter, rows);
      assert.equal(evidence.metadata.evidence_state, "HOLD");
      assert.ok(evidence.metadata.hold_codes.includes(candidate.code));
      assert.deepEqual(evidence.item_tables, []);
      assert.deepEqual(evidence.pair_tables, []);
      assert.equal(evidence.metadata.wave_observed_n, "");
      assert.equal(evidence.metadata.source_hash, "");
      assert.equal(evidence.metadata.evidence_hash, "");
    });
  }
});

test("duplicate respondent-item rows fail closed", () => {
  const adapter = loadAdapter();
  const rows = buildAnswerRows();
  rows.push({ ...rows[0] });
  const evidence = build(adapter, rows);

  assert.equal(evidence.metadata.evidence_state, "HOLD");
  assert.ok(evidence.metadata.hold_codes.includes("DUPLICATE_ITEM_RESPONSE"));
  assert.equal(evidence.item_tables.length, 0);
  assert.equal(evidence.pair_tables.length, 0);
});

test("14-item pulse form and behavior evidence are not accepted", () => {
  const adapter = loadAdapter();
  const pulseRows = buildAnswerRows().map((row) => ({
    ...row,
    measurementMode: "short",
    versionIdentifier: "ai_fluency_short_v1"
  }));
  const pulseEvidence = build(adapter, pulseRows);
  const behaviorRows = buildAnswerRows();
  behaviorRows[0].itemConstruct = "real_work_task";
  const behaviorEvidence = build(adapter, behaviorRows);

  assert.equal(pulseEvidence.metadata.evidence_state, "HOLD");
  assert.ok(pulseEvidence.metadata.hold_codes.includes("WRONG_FORM"));
  assert.equal(behaviorEvidence.metadata.evidence_state, "HOLD");
  assert.ok(
    behaviorEvidence.metadata.hold_codes.includes("BEHAVIOR_EVIDENCE_NOT_ACCEPTED")
  );
  assert.equal(pulseEvidence.pair_tables.length, 0);
  assert.equal(behaviorEvidence.pair_tables.length, 0);
});

test("rows outside the fixed cohort and window cannot contaminate the aggregate", () => {
  const adapter = loadAdapter();
  const rows = buildAnswerRows();
  rows.push(
    ...buildAnswerRows(1, {
      cohortId: "different-source-cohort",
      measurementMode: "short",
      versionIdentifier: "ai_fluency_short_v1"
    }),
    ...buildAnswerRows(1, {
      receivedAt: "2026-02-15T12:00:00.000Z",
      measurementMode: "short",
      versionIdentifier: "ai_fluency_short_v1"
    })
  );
  const evidence = build(adapter, rows);

  assert.equal(evidence.metadata.evidence_state, "READY");
  assert.equal(evidence.metadata.wave_observed_n, 20);
});

test("wave, item, and pair observed-n floors independently HOLD", async (t) => {
  const adapter = loadAdapter();

  await t.test("wave n below 20", () => {
    const evidence = build(adapter, buildAnswerRows(19));
    assert.equal(evidence.metadata.evidence_state, "HOLD");
    assert.ok(evidence.metadata.hold_codes.includes("WAVE_OBSERVED_N_BELOW_MINIMUM"));
    assert.equal(evidence.metadata.wave_observed_n, "");
    assert.equal(evidence.item_tables.length, 0);
  });

  await t.test("item n below 20", () => {
    const rows = buildAnswerRows();
    const filtered = rows.filter(
      (row) => !(row.respondentId === "respondent-secret-001" && row.itemIndex === 24)
    );
    const evidence = build(adapter, filtered);
    assert.equal(evidence.metadata.evidence_state, "HOLD");
    assert.ok(evidence.metadata.hold_codes.includes("ITEM_OBSERVED_N_BELOW_MINIMUM"));
    assert.ok(evidence.metadata.hold_codes.includes("PAIR_OBSERVED_N_BELOW_MINIMUM"));
    assert.equal(evidence.item_tables.length, 0);
    assert.equal(evidence.pair_tables.length, 0);
  });

  await t.test("pair n below 20 while both item n values equal 20", () => {
    const rows = buildAnswerRows(21).filter((row) => {
      if (row.respondentId === "respondent-secret-001" && row.itemIndex === 1) return false;
      if (row.respondentId === "respondent-secret-002" && row.itemIndex === 2) return false;
      return true;
    });
    const evidence = build(adapter, rows);
    assert.equal(evidence.metadata.evidence_state, "HOLD");
    assert.ok(evidence.metadata.hold_codes.includes("PAIR_OBSERVED_N_BELOW_MINIMUM"));
    assert.ok(!evidence.metadata.hold_codes.includes("ITEM_OBSERVED_N_BELOW_MINIMUM"));
    assert.equal(evidence.item_tables.length, 0);
    assert.equal(evidence.pair_tables.length, 0);
  });
});

test("unsafe or incomplete fixed adapter context emits metadata-only HOLD", () => {
  const adapter = loadAdapter();
  const unsafe = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    aggregate_cohort_ref: "person@example.com"
  });
  const incomplete = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    wave_id: "replace-with-wave-id"
  });
  const directIdentifier = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    aggregate_cohort_ref: "123-45-6789"
  });
  const rejectedReview = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    owner_review_state: "rejected"
  });
  const driftedForm = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    source_form_definition_hash: "f".repeat(64)
  });
  const subdividedCohort = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    source_cohort_id: "function-finance",
    aggregate_cohort_ref: "function-finance"
  });
  const namedSourceRef = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    source_ref: "google-sheets-answer-detail://james-kelley"
  });
  const namedWave = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    wave_id: "baseline-james-kelley"
  });
  const unsafeInteger = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    eligible_population_count: 9007199254740992
  });

  assert.equal(unsafe.metadata.evidence_state, "HOLD");
  assert.ok(unsafe.metadata.hold_codes.includes("UNSAFE_ADAPTER_CONTEXT"));
  assert.equal(unsafe.metadata.aggregate_cohort_ref, "");
  assert.doesNotMatch(JSON.stringify(unsafe), /person@example\.com/i);
  assert.equal(incomplete.metadata.evidence_state, "HOLD");
  assert.ok(incomplete.metadata.hold_codes.includes("ADAPTER_CONTEXT_INCOMPLETE"));
  assert.equal(incomplete.item_tables.length, 0);
  assert.equal(incomplete.pair_tables.length, 0);
  assert.equal(directIdentifier.metadata.evidence_state, "HOLD");
  assert.ok(directIdentifier.metadata.hold_codes.includes("UNSAFE_ADAPTER_CONTEXT"));
  assert.doesNotMatch(JSON.stringify(directIdentifier), /123-45-6789/);
  assert.equal(rejectedReview.metadata.evidence_state, "HOLD");
  assert.ok(rejectedReview.metadata.hold_codes.includes("ADAPTER_CONTEXT_INVALID"));
  assert.deepEqual(rejectedReview.item_tables, []);
  assert.deepEqual(rejectedReview.pair_tables, []);
  assert.equal(driftedForm.metadata.evidence_state, "HOLD");
  assert.ok(driftedForm.metadata.hold_codes.includes("ADAPTER_CONTEXT_INVALID"));
  assert.equal(subdividedCohort.metadata.evidence_state, "HOLD");
  assert.ok(subdividedCohort.metadata.hold_codes.includes("ADAPTER_CONTEXT_INVALID"));
  assert.equal(namedSourceRef.metadata.evidence_state, "HOLD");
  assert.doesNotMatch(JSON.stringify(namedSourceRef), /james-kelley/i);
  assert.equal(namedWave.metadata.evidence_state, "HOLD");
  assert.doesNotMatch(JSON.stringify(namedWave), /james-kelley/i);
  assert.equal(unsafeInteger.metadata.evidence_state, "HOLD");
  assert.ok(unsafeInteger.metadata.hold_codes.includes("ADAPTER_CONTEXT_INVALID"));
});

test("eligible population is source-bound and cannot be below response count", () => {
  const adapter = loadAdapter();
  const ready = build(adapter, buildAnswerRows(), FIXED_CONTEXT);
  const belowResponses = build(adapter, buildAnswerRows(), {
    ...FIXED_CONTEXT,
    eligible_population_count: 19
  });
  const belowWaveN = build(adapter, buildAnswerRows(21), {
    ...FIXED_CONTEXT,
    eligible_population_count: 20
  });

  assert.equal(ready.metadata.eligible_population_count, 25);
  assert.equal(ready.metadata.evidence_state, "READY");
  assert.equal(belowResponses.metadata.evidence_state, "HOLD");
  assert.deepEqual(belowResponses.item_tables, []);
  assert.deepEqual(belowResponses.pair_tables, []);
  assert.ok(belowResponses.metadata.hold_codes.includes("ADAPTER_CONTEXT_INVALID"));
  assert.equal(belowWaveN.metadata.evidence_state, "HOLD");
  assert.ok(
    belowWaveN.metadata.hold_codes.includes("ELIGIBLE_POPULATION_BELOW_RESPONSE_COUNT")
  );
});

test("aggregate-safe hashes are deterministic and bind changed evidence", () => {
  const adapter = loadAdapter();
  const rows = buildAnswerRows();
  const original = build(adapter, rows);
  const reordered = build(adapter, [...rows].reverse());
  const renamed = build(
    adapter,
    rows.map((row) => ({
      ...row,
      respondentId: row.respondentId.replace("respondent-secret", "different-internal-key")
    }))
  );
  const changedRows = rows.map((row) => ({ ...row }));
  changedRows[0].value = 2;
  const changed = build(adapter, changedRows);

  for (const field of [
    "form_manifest_hash",
    "wave_context_hash",
    "source_hash",
    "item_counts_hash",
    "pair_counts_hash",
    "evidence_hash",
    "metadata_hash"
  ]) {
    assert.match(original.metadata[field], /^[a-f0-9]{64}$/);
    assert.equal(reordered.metadata[field], original.metadata[field]);
    assert.equal(renamed.metadata[field], original.metadata[field]);
  }
  assert.equal(changed.metadata.evidence_state, "READY");
  assert.equal(changed.metadata.form_manifest_hash, original.metadata.form_manifest_hash);
  assert.equal(changed.metadata.wave_context_hash, original.metadata.wave_context_hash);
  assert.notEqual(changed.metadata.source_hash, original.metadata.source_hash);
  assert.notEqual(changed.metadata.item_counts_hash, original.metadata.item_counts_hash);
  assert.notEqual(changed.metadata.pair_counts_hash, original.metadata.pair_counts_hash);
  assert.notEqual(changed.metadata.evidence_hash, original.metadata.evidence_hash);
});

test("source hash binds only emitted aggregates, not higher-order respondent linkage", () => {
  const evenParity = [[1, 1, 1], [1, 2, 2], [2, 1, 2], [2, 2, 1]];
  const oddParity = [[1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 2, 2]];
  function withParity(patterns) {
    return buildAnswerRows().map((row) => {
      const respondentIndex = Number(row.respondentId.slice(-3)) - 1;
      if (row.itemIndex <= 3) {
        return {
          ...row,
          value: patterns[respondentIndex % patterns.length][row.itemIndex - 1]
        };
      }
      return { ...row, value: 3 };
    });
  }

  const adapter = loadAdapter();
  const even = build(adapter, withParity(evenParity));
  const odd = build(adapter, withParity(oddParity));

  assert.equal(even.metadata.evidence_state, "READY");
  assert.equal(odd.metadata.evidence_state, "READY");
  assert.deepEqual(even.item_tables, odd.item_tables);
  assert.deepEqual(even.pair_tables, odd.pair_tables);
  assert.equal(even.metadata.item_counts_hash, odd.metadata.item_counts_hash);
  assert.equal(even.metadata.pair_counts_hash, odd.metadata.pair_counts_hash);
  assert.equal(even.metadata.source_hash, odd.metadata.source_hash);
  assert.equal(even.metadata.evidence_hash, odd.metadata.evidence_hash);
});
