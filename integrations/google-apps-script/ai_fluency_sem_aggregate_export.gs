/**
 * FluencyTracr AI Fluency ordinal SEM aggregate-evidence adapter.
 *
 * Paste this file into the Apps Script project attached to the AI Fluency
 * workbook. Edit ADAPTER_CONTEXT once for one approved cohort wave, then run
 * rebuildAiFluencySemAggregateExport. Only aggregate count sheets are written.
 */

var FluencyTracrSemAggregateExport = (function() {
const SOURCE_SHEET_NAME = "Answer Detail";
const METADATA_SHEET_NAME = "SEM Aggregate Metadata";
const ITEM_COUNTS_SHEET_NAME = "SEM Item Category Counts";
const PAIR_COUNTS_SHEET_NAME = "SEM Pairwise Counts";
const EXPORT_SCHEMA_VERSION = "FT_AI_FLUENCY_SEM_AGGREGATE_EXPORT_2026_07_V1";
const FORM_ID = "ai_fluency_long_v1";
const MEASUREMENT_MODE = "long";
const ITEM_COUNT = 24;
const PAIR_COUNT = 276;
const OBSERVED_N_MINIMUM = 20;
const DOCUMENT_LOCK_TIMEOUT_MS = 30000;
const APPROVED_AGGREGATE_COHORT_REF = "organization_overall";
const APPROVED_OWNER_REVIEW_STATE = "approved_for_internal_calibration_review";
const CANONICAL_FORM_MANIFEST_HASH =
  "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434";
const CATEGORY_VALUES = Object.freeze([1, 2, 3, 4, 5]);

// This is edit-time source binding, not runtime configuration.
const ADAPTER_CONTEXT = Object.freeze({
  source_ref: "replace-with-immutable-source-ref",
  source_cohort_id: "organization_overall",
  aggregate_cohort_ref: "organization_overall",
  source_form_definition_hash: "replace-with-reviewed-source-form-definition-hash",
  wave_id: "replace-with-wave-id",
  wave_role: "replace-with-baseline-or-formal_followup",
  wave_index: "",
  window_start: "replace-with-yyyy-mm-dd",
  window_end: "replace-with-yyyy-mm-dd",
  eligible_population_count: "replace-with-eligible-population-count",
  owner_review_state: "replace-with-owner-review-state"
});

const FORM_ITEMS = Object.freeze([
  [1, "confidence"],
  [2, "confidence"],
  [3, "confidence"],
  [4, "usage_quality"],
  [5, "usage_quality"],
  [6, "usage_quality"],
  [7, "behavior_change"],
  [8, "behavior_change"],
  [9, "behavior_change"],
  [10, "leadership_reinforcement"],
  [11, "leadership_reinforcement"],
  [12, "leadership_reinforcement"],
  [13, "capability_growth"],
  [14, "capability_growth"],
  [15, "capability_growth"],
  [16, "ai_attitude"],
  [17, "ai_attitude"],
  [18, "ai_attitude"],
  [19, "behavioral_intent"],
  [20, "behavioral_intent"],
  [21, "behavioral_intent"],
  [22, "perceived_ai_impact"],
  [23, "perceived_ai_impact"],
  [24, "perceived_ai_impact"]
]);

const SOURCE_COLUMN_ALIASES = Object.freeze({
  received_at: ["received_at", "receivedAt"],
  measurement_mode: ["measurement_mode", "measurementMode"],
  version_identifier: ["version_identifier", "versionIdentifier"],
  cohort_id: ["cohort_id", "cohortId"],
  respondent_id: ["respondent_id", "respondentId"],
  question_id: ["question_id", "questionId"],
  item_index: ["item_index", "itemIndex"],
  item_construct: ["item_construct", "itemConstruct"],
  value: ["value"]
});

const METADATA_HEADERS = Object.freeze([
  "schema_version",
  "evidence_state",
  "hold_codes",
  "source_type",
  "source_sheet_name",
  "source_ref",
  "source_hash",
  "source_cohort_binding_hash",
  "source_form_definition_hash",
  "form_id",
  "form_manifest_hash",
  "aggregate_cohort_ref",
  "wave_id",
  "wave_role",
  "wave_index",
  "window_start",
  "window_end",
  "eligible_population_count",
  "wave_context_hash",
  "wave_observed_n",
  "privacy_minimum_observed_n",
  "privacy_posture",
  "item_table_count",
  "item_category_row_count",
  "pair_table_count",
  "pair_cell_row_count",
  "item_counts_hash",
  "pair_counts_hash",
  "evidence_hash",
  "metadata_hash",
  "owner_review_state",
  "customer_output_authorized"
]);

const ITEM_COUNT_HEADERS = Object.freeze([
  "evidence_hash",
  "form_manifest_hash",
  "wave_context_hash",
  "item_id",
  "item_index",
  "construct_id",
  "category",
  "count",
  "observed_n",
  "missing_n"
]);

const PAIR_COUNT_HEADERS = Object.freeze([
  "evidence_hash",
  "form_manifest_hash",
  "wave_context_hash",
  "left_item_id",
  "right_item_id",
  "item_i_index",
  "item_i_construct_id",
  "item_j_index",
  "item_j_construct_id",
  "category_i",
  "category_j",
  "count",
  "observed_n",
  "missing_n"
]);

const BEHAVIOR_EVIDENCE_PATTERN = /(?:usage_behavior|real_work_task|first_draft_with_ai|improved_ai_output|summarized_insights_using_ai|decision_support|repeatable_ai_workflow)/i;
const UNSAFE_TEXT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}[-_.]\d{2}[-_.]\d{4}\b|\b(?:\+?1[-_.]?)?\d{3}[-_.]\d{3}[-_.]\d{4}\b|\b(?:respondent|invite|employee|person|user)[-_ ]?(?:id|identifier|name)?\b|\b(?:raw answer|raw text|free text|open text|prompt|transcript)\b)/i;

function rebuildAggregateEvidence() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(DOCUMENT_LOCK_TIMEOUT_MS)) {
    throw new Error("Could not acquire the aggregate-evidence document lock.");
  }
  let evidence;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SOURCE_SHEET_NAME);
    if (!sourceSheet) {
      evidence = buildHoldEvidence_(ADAPTER_CONTEXT, ["SOURCE_SHEET_MISSING"]);
    } else {
      try {
        evidence = buildAggregateEvidence_(readAnswerDetailRows_(sourceSheet), ADAPTER_CONTEXT);
      } catch (_error) {
        evidence = buildHoldEvidence_(ADAPTER_CONTEXT, ["SOURCE_READ_FAILED"]);
      }
    }

    try {
      writeAggregateEvidence_(ss, evidence);
    } catch (_error) {
      evidence = buildHoldEvidence_(ADAPTER_CONTEXT, ["AGGREGATE_WRITE_FAILED"]);
      writeAggregateEvidence_(ss, evidence);
    }

    return {
      evidence_state: evidence.metadata.evidence_state,
      hold_codes: evidence.metadata.hold_codes.slice(),
      metadata_sheet_name: METADATA_SHEET_NAME,
      item_counts_sheet_name: ITEM_COUNTS_SHEET_NAME,
      pair_counts_sheet_name: PAIR_COUNTS_SHEET_NAME,
      written_item_category_rows: evidence.metadata.item_category_row_count,
      written_pair_cell_rows: evidence.metadata.pair_cell_row_count,
      evidence_hash: evidence.metadata.evidence_hash
    };
  } finally {
    lock.releaseLock();
  }
}

function readAnswerDetailRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error("Answer Detail has no headers.");
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const columnsByKey = {};
  Object.keys(SOURCE_COLUMN_ALIASES).forEach(function(key) {
    const accepted = SOURCE_COLUMN_ALIASES[key].map(normalizeHeader_);
    const matches = [];
    headers.forEach(function(header, index) {
      if (accepted.indexOf(normalizeHeader_(header)) !== -1) {
        matches.push(index + 1);
      }
    });
    if (matches.length !== 1) {
      throw new Error("Answer Detail must contain one exact " + key + " column.");
    }
    columnsByKey[key] = matches[0];
  });

  if (lastRow < 2) return [];
  const rows = Array.from({ length: lastRow - 1 }, function() {
    return {};
  });
  Object.keys(columnsByKey).forEach(function(key) {
    const values = sheet.getRange(2, columnsByKey[key], lastRow - 1, 1).getValues();
    values.forEach(function(row, index) {
      rows[index][key] = row[0];
    });
  });
  return rows;
}

function projectAnswerRows_(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(function(row) {
    const projected = {};
    Object.keys(SOURCE_COLUMN_ALIASES).forEach(function(key) {
      projected[key] = firstOwnValue_(row || {}, SOURCE_COLUMN_ALIASES[key]);
    });
    return projected;
  });
}

function buildAggregateEvidence_(inputRows, inputContext) {
  const formManifestHash = CANONICAL_FORM_MANIFEST_HASH;
  const contextReview = validateContext_(inputContext);
  if (!contextReview.valid) {
    return buildHoldEvidence_(inputContext, contextReview.hold_codes, formManifestHash);
  }

  const assembly = assembleWave_(projectAnswerRows_(inputRows), contextReview.context);
  if (assembly.hold_codes.length > 0) {
    return buildHoldEvidence_(contextReview.context, assembly.hold_codes, formManifestHash);
  }

  const waveN = assembly.respondents.size;
  if (waveN < OBSERVED_N_MINIMUM) {
    return buildHoldEvidence_(
      contextReview.context,
      ["WAVE_OBSERVED_N_BELOW_MINIMUM"],
      formManifestHash
    );
  }
  if (contextReview.context.eligible_population_count < waveN) {
    return buildHoldEvidence_(
      contextReview.context,
      ["ELIGIBLE_POPULATION_BELOW_RESPONSE_COUNT"],
      formManifestHash
    );
  }
  const itemTables = buildItemTables_(assembly.respondents, waveN);
  const pairTables = buildPairTables_(assembly.respondents, waveN);
  const privacyHolds = [];
  if (itemTables.some(function(table) { return table.observed_n < OBSERVED_N_MINIMUM; })) {
    privacyHolds.push("ITEM_OBSERVED_N_BELOW_MINIMUM");
  }
  if (pairTables.some(function(table) { return table.observed_n < OBSERVED_N_MINIMUM; })) {
    privacyHolds.push("PAIR_OBSERVED_N_BELOW_MINIMUM");
  }
  if (privacyHolds.length > 0) {
    return buildHoldEvidence_(contextReview.context, privacyHolds, formManifestHash);
  }

  const waveContextHash = waveContextHash_(contextReview.context, formManifestHash);
  const sourceCohortBindingHash = sourceCohortBindingHash_(contextReview.context);
  const itemCountsHash = sha256_(canonicalStringify_(itemTables));
  const pairCountsHash = sha256_(canonicalStringify_(pairTables));
  const sourceHash = sourceAggregateHash_(
    waveContextHash,
    itemCountsHash,
    pairCountsHash
  );
  const evidenceHash = sha256_(canonicalStringify_({
    schema_version: EXPORT_SCHEMA_VERSION,
    source_ref: contextReview.context.source_ref,
    source_hash: sourceHash,
    source_cohort_binding_hash: sourceCohortBindingHash,
    source_form_definition_hash: contextReview.context.source_form_definition_hash,
    form_id: FORM_ID,
    form_manifest_hash: formManifestHash,
    aggregate_cohort_ref: contextReview.context.aggregate_cohort_ref,
    wave_id: contextReview.context.wave_id,
    wave_role: contextReview.context.wave_role,
    wave_index: contextReview.context.wave_index,
    window_start: contextReview.context.window_start,
    window_end: contextReview.context.window_end,
    eligible_population_count: contextReview.context.eligible_population_count,
    wave_context_hash: waveContextHash,
    wave_observed_n: waveN,
    privacy_minimum_observed_n: OBSERVED_N_MINIMUM,
    item_counts_hash: itemCountsHash,
    pair_counts_hash: pairCountsHash
  }));

  const metadata = baseMetadata_(contextReview.context, formManifestHash, waveContextHash);
  metadata.evidence_state = "READY";
  metadata.source_hash = sourceHash;
  metadata.source_cohort_binding_hash = sourceCohortBindingHash;
  metadata.source_form_definition_hash = contextReview.context.source_form_definition_hash;
  metadata.eligible_population_count = contextReview.context.eligible_population_count;
  metadata.wave_observed_n = waveN;
  metadata.privacy_posture = "WAVE_ITEM_PAIR_N_MINIMUM_MET";
  metadata.item_table_count = itemTables.length;
  metadata.item_category_row_count = itemTables.length * CATEGORY_VALUES.length;
  metadata.pair_table_count = pairTables.length;
  metadata.pair_cell_row_count = pairTables.length * CATEGORY_VALUES.length * CATEGORY_VALUES.length;
  metadata.item_counts_hash = itemCountsHash;
  metadata.pair_counts_hash = pairCountsHash;
  metadata.evidence_hash = evidenceHash;
  metadata.metadata_hash = metadataHash_(metadata);

  return {
    metadata: metadata,
    item_tables: itemTables,
    pair_tables: pairTables
  };
}

function assembleWave_(rows, context) {
  const respondents = new Map();
  const holdCodes = [];
  const startMs = dateStartMs_(context.window_start);
  const endMs = dateEndMs_(context.window_end);

  rows.forEach(function(row) {
    if (rowIsBlank_(row)) return;
    const sourceCohortId = cleanString_(row.cohort_id);
    const receivedAtMs = timestampMs_(row.received_at);
    if (!sourceCohortId || receivedAtMs === null) {
      holdCodes.push("MALFORMED_ANSWER_DETAIL");
      return;
    }
    if (sourceCohortId !== context.source_cohort_id) return;
    if (receivedAtMs < startMs || receivedAtMs > endMs) return;

    if (
      cleanString_(row.measurement_mode) !== MEASUREMENT_MODE ||
      cleanString_(row.version_identifier) !== FORM_ID
    ) {
      holdCodes.push("WRONG_FORM");
      return;
    }

    const respondentId = cleanString_(row.respondent_id);
    const questionId = cleanString_(row.question_id);
    const itemIndex = exactInteger_(row.item_index);
    const itemConstruct = cleanString_(row.item_construct);
    const value = exactInteger_(row.value);
    if (!respondentId || itemIndex === null || itemIndex < 1 || itemIndex > ITEM_COUNT) {
      holdCodes.push("MALFORMED_ANSWER_DETAIL");
      return;
    }
    if (questionId !== itemId_(itemIndex)) {
      holdCodes.push("SOURCE_ITEM_IDENTITY_MISMATCH");
      return;
    }
    if (BEHAVIOR_EVIDENCE_PATTERN.test(itemConstruct)) {
      holdCodes.push("BEHAVIOR_EVIDENCE_NOT_ACCEPTED");
      return;
    }
    if (itemConstruct !== expectedConstruct_(itemIndex)) {
      holdCodes.push("MALFORMED_ANSWER_DETAIL");
      return;
    }
    if (value === null || CATEGORY_VALUES.indexOf(value) === -1) {
      holdCodes.push("UNSAFE_ANSWER_VALUE");
      return;
    }

    const answers = respondents.get(respondentId) || {};
    if (Object.prototype.hasOwnProperty.call(answers, String(itemIndex))) {
      holdCodes.push("DUPLICATE_ITEM_RESPONSE");
      return;
    }
    answers[String(itemIndex)] = value;
    respondents.set(respondentId, answers);
  });

  return {
    respondents: respondents,
    hold_codes: uniqueSorted_(holdCodes)
  };
}

function buildItemTables_(respondents, waveN) {
  return FORM_ITEMS.map(function(item) {
    const counts = CATEGORY_VALUES.map(function() { return 0; });
    let observedN = 0;
    respondents.forEach(function(answers) {
      const value = answers[String(item[0])];
      if (value === undefined) return;
      counts[value - 1] += 1;
      observedN += 1;
    });
    return {
      item_id: itemId_(item[0]),
      item_index: item[0],
      construct_id: item[1],
      observed_n: observedN,
      missing_n: waveN - observedN,
      category_counts: CATEGORY_VALUES.map(function(category, index) {
        return { category: category, count: counts[index] };
      })
    };
  });
}

function buildPairTables_(respondents, waveN) {
  const tables = [];
  for (let itemI = 1; itemI <= ITEM_COUNT; itemI += 1) {
    for (let itemJ = itemI + 1; itemJ <= ITEM_COUNT; itemJ += 1) {
      const counts = CATEGORY_VALUES.map(function() {
        return CATEGORY_VALUES.map(function() { return 0; });
      });
      let observedN = 0;
      respondents.forEach(function(answers) {
        const valueI = answers[String(itemI)];
        const valueJ = answers[String(itemJ)];
        if (valueI === undefined || valueJ === undefined) return;
        counts[valueI - 1][valueJ - 1] += 1;
        observedN += 1;
      });
      const cells = [];
      CATEGORY_VALUES.forEach(function(categoryI) {
        CATEGORY_VALUES.forEach(function(categoryJ) {
          cells.push({
            category_i: categoryI,
            category_j: categoryJ,
            count: counts[categoryI - 1][categoryJ - 1]
          });
        });
      });
      tables.push({
        left_item_id: itemId_(itemI),
        right_item_id: itemId_(itemJ),
        item_i_index: itemI,
        item_i_construct_id: expectedConstruct_(itemI),
        item_j_index: itemJ,
        item_j_construct_id: expectedConstruct_(itemJ),
        observed_n: observedN,
        missing_n: waveN - observedN,
        cell_counts: cells
      });
    }
  }
  return tables;
}

function buildHoldEvidence_(inputContext, holdCodes, formManifestHash) {
  const resolvedFormHash = formManifestHash || CANONICAL_FORM_MANIFEST_HASH;
  const contextReview = validateContext_(inputContext);
  const combinedCodes = uniqueSorted_(
    (holdCodes || []).concat(contextReview.hold_codes || [])
  );
  const safeContext = contextReview.valid ? contextReview.context : null;
  const waveContextHash = safeContext
    ? waveContextHash_(safeContext, resolvedFormHash)
    : "";
  const metadata = baseMetadata_(safeContext, resolvedFormHash, waveContextHash);
  metadata.evidence_state = "HOLD";
  metadata.hold_codes = combinedCodes.length > 0 ? combinedCodes : ["UNSPECIFIED_HOLD"];
  metadata.privacy_posture = "HOLD_NO_COUNT_TABLES_EMITTED";
  metadata.metadata_hash = metadataHash_(metadata);
  return {
    metadata: metadata,
    item_tables: [],
    pair_tables: []
  };
}

function baseMetadata_(context, formManifestHash, waveContextHash) {
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    evidence_state: "HOLD",
    hold_codes: [],
    source_type: "google_sheets_answer_detail",
    source_sheet_name: SOURCE_SHEET_NAME,
    source_ref: context ? context.source_ref : "",
    source_hash: "",
    source_cohort_binding_hash: context ? sourceCohortBindingHash_(context) : "",
    source_form_definition_hash: context ? context.source_form_definition_hash : "",
    form_id: FORM_ID,
    form_manifest_hash: formManifestHash,
    aggregate_cohort_ref: context ? context.aggregate_cohort_ref : "",
    wave_id: context ? context.wave_id : "",
    wave_role: context ? context.wave_role : "",
    wave_index: context ? context.wave_index : "",
    window_start: context ? context.window_start : "",
    window_end: context ? context.window_end : "",
    eligible_population_count: context ? context.eligible_population_count : "",
    wave_context_hash: waveContextHash || "",
    wave_observed_n: "",
    privacy_minimum_observed_n: OBSERVED_N_MINIMUM,
    privacy_posture: "HOLD_NO_COUNT_TABLES_EMITTED",
    item_table_count: 0,
    item_category_row_count: 0,
    pair_table_count: 0,
    pair_cell_row_count: 0,
    item_counts_hash: "",
    pair_counts_hash: "",
    evidence_hash: "",
    metadata_hash: "",
    owner_review_state: context ? context.owner_review_state : "",
    customer_output_authorized: false
  };
}

function validateContext_(inputContext) {
  const input = inputContext && typeof inputContext === "object" ? inputContext : {};
  const context = {
    source_ref: cleanString_(input.source_ref),
    source_cohort_id: cleanString_(input.source_cohort_id),
    aggregate_cohort_ref: cleanString_(input.aggregate_cohort_ref),
    source_form_definition_hash: cleanString_(input.source_form_definition_hash),
    wave_id: cleanString_(input.wave_id),
    wave_role: cleanString_(input.wave_role),
    wave_index: exactInteger_(input.wave_index),
    window_start: cleanString_(input.window_start),
    window_end: cleanString_(input.window_end),
    eligible_population_count: exactInteger_(input.eligible_population_count),
    owner_review_state: cleanString_(input.owner_review_state)
  };
  const holdCodes = [];
  const requiredText = [
    context.source_ref,
    context.source_cohort_id,
    context.aggregate_cohort_ref,
    context.source_form_definition_hash,
    context.wave_id,
    context.wave_role,
    context.window_start,
    context.window_end,
    context.owner_review_state
  ];
  if (requiredText.some(function(value) { return !value || isPlaceholder_(value); })) {
    holdCodes.push("ADAPTER_CONTEXT_INCOMPLETE");
  }
  if (
    context.wave_index === null ||
    context.wave_index < 0 ||
    context.eligible_population_count === null ||
    context.eligible_population_count < OBSERVED_N_MINIMUM ||
    context.source_cohort_id !== APPROVED_AGGREGATE_COHORT_REF ||
    context.aggregate_cohort_ref !== APPROVED_AGGREGATE_COHORT_REF ||
    context.source_cohort_id !== context.aggregate_cohort_ref ||
    context.source_form_definition_hash !== CANONICAL_FORM_MANIFEST_HASH ||
    !validOpaqueSourceRef_(context.source_ref) ||
    !validOpaqueWaveId_(context.wave_id) ||
    context.owner_review_state !== APPROVED_OWNER_REVIEW_STATE ||
    ["baseline", "formal_followup"].indexOf(context.wave_role) === -1 ||
    !validDateString_(context.window_start) ||
    !validDateString_(context.window_end) ||
    (
      validDateString_(context.window_start) &&
      validDateString_(context.window_end) &&
      dateStartMs_(context.window_start) > dateStartMs_(context.window_end)
    )
  ) {
    holdCodes.push("ADAPTER_CONTEXT_INVALID");
  }
  const emittedText = [
    context.source_ref,
    context.aggregate_cohort_ref,
    context.source_form_definition_hash,
    context.wave_id,
    context.wave_role,
    context.owner_review_state
  ];
  if (emittedText.some(function(value) { return value && !safeMetadataText_(value); })) {
    holdCodes.push("UNSAFE_ADAPTER_CONTEXT");
  }
  return {
    valid: holdCodes.length === 0,
    context: context,
    hold_codes: uniqueSorted_(holdCodes)
  };
}

function waveContextHash_(context, formManifestHash) {
  return sha256_(canonicalStringify_({
    source_type: "google_sheets_answer_detail",
    source_sheet_name: SOURCE_SHEET_NAME,
    source_ref: context.source_ref,
    source_cohort_binding_hash: sourceCohortBindingHash_(context),
    source_form_definition_hash: context.source_form_definition_hash,
    form_id: FORM_ID,
    form_manifest_hash: formManifestHash,
    aggregate_cohort_ref: context.aggregate_cohort_ref,
    wave_id: context.wave_id,
    wave_role: context.wave_role,
    wave_index: context.wave_index,
    window_start: context.window_start,
    window_end: context.window_end,
    eligible_population_count: context.eligible_population_count,
    owner_review_state: context.owner_review_state
  }));
}

function sourceCohortBindingHash_(context) {
  return sha256_(canonicalStringify_({
    source_ref: context.source_ref,
    source_cohort_id: context.source_cohort_id,
    aggregate_cohort_ref: context.aggregate_cohort_ref
  }));
}

function sourceAggregateHash_(waveContextHash, itemCountsHash, pairCountsHash) {
  return sha256_(canonicalStringify_({
    source_type: "google_sheets_answer_detail",
    wave_context_hash: waveContextHash,
    item_counts_hash: itemCountsHash,
    pair_counts_hash: pairCountsHash
  }));
}

function metadataHash_(metadata) {
  const copy = {};
  Object.keys(metadata).forEach(function(key) {
    if (key !== "metadata_hash") copy[key] = metadata[key];
  });
  return sha256_(canonicalStringify_(copy));
}

function writeAggregateEvidence_(ss, evidence) {
  const metadataSheet = getOrCreateSheet_(ss, METADATA_SHEET_NAME);
  const itemSheet = getOrCreateSheet_(ss, ITEM_COUNTS_SHEET_NAME);
  const pairSheet = getOrCreateSheet_(ss, PAIR_COUNTS_SHEET_NAME);

  [metadataSheet, itemSheet, pairSheet].forEach(function(sheet) {
    sheet.clearContents();
  });

  writeRows_(itemSheet, ITEM_COUNT_HEADERS, flattenItemRows_(evidence));
  writeRows_(pairSheet, PAIR_COUNT_HEADERS, flattenPairRows_(evidence));
  writeRows_(metadataSheet, METADATA_HEADERS, [metadataRow_(evidence.metadata)]);
}

function metadataRow_(metadata) {
  return METADATA_HEADERS.map(function(header) {
    const value = metadata[header];
    if (Array.isArray(value)) return value.join("|");
    return value === null || value === undefined ? "" : value;
  });
}

function flattenItemRows_(evidence) {
  const rows = [];
  evidence.item_tables.forEach(function(table) {
    table.category_counts.forEach(function(categoryCount) {
      rows.push([
        evidence.metadata.evidence_hash,
        evidence.metadata.form_manifest_hash,
        evidence.metadata.wave_context_hash,
        table.item_id,
        table.item_index,
        table.construct_id,
        categoryCount.category,
        categoryCount.count,
        table.observed_n,
        table.missing_n
      ]);
    });
  });
  return rows;
}

function flattenPairRows_(evidence) {
  const rows = [];
  evidence.pair_tables.forEach(function(table) {
    table.cell_counts.forEach(function(cell) {
      rows.push([
        evidence.metadata.evidence_hash,
        evidence.metadata.form_manifest_hash,
        evidence.metadata.wave_context_hash,
        table.left_item_id,
        table.right_item_id,
        table.item_i_index,
        table.item_i_construct_id,
        table.item_j_index,
        table.item_j_construct_id,
        cell.category_i,
        cell.category_j,
        cell.count,
        table.observed_n,
        table.missing_n
      ]);
    });
  });
  return rows;
}

function writeRows_(sheet, headers, rows) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function expectedConstruct_(itemIndex) {
  return FORM_ITEMS[itemIndex - 1][1];
}

function itemId_(itemIndex) {
  return "ai-fluency-q" + String(itemIndex).padStart(2, "0");
}

function firstOwnValue_(record, aliases) {
  for (let index = 0; index < aliases.length; index += 1) {
    if (Object.prototype.hasOwnProperty.call(record, aliases[index])) {
      return record[aliases[index]];
    }
  }
  const normalized = {};
  Object.keys(record).forEach(function(key) {
    normalized[normalizeHeader_(key)] = record[key];
  });
  for (let index = 0; index < aliases.length; index += 1) {
    const key = normalizeHeader_(aliases[index]);
    if (Object.prototype.hasOwnProperty.call(normalized, key)) return normalized[key];
  }
  return "";
}

function normalizeHeader_(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function canonicalStringify_(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalStringify_).join(",") + "]";
  }
  if (typeof value === "object") {
    return "{" + Object.keys(value).sort().map(function(key) {
      return JSON.stringify(key) + ":" + canonicalStringify_(value[key]);
    }).join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha256_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    const unsigned = byte < 0 ? byte + 256 : byte;
    return unsigned.toString(16).padStart(2, "0");
  }).join("");
}

function exactInteger_(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/.test(value.trim())) {
    return null;
  }
  const numeric = Number(value.trim());
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function cleanString_(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function rowIsBlank_(row) {
  return Object.keys(row).every(function(key) {
    return cleanString_(row[key]) === "";
  });
}

function isPlaceholder_(value) {
  return /^replace-with-/i.test(String(value || ""));
}

function safeMetadataText_(value) {
  const text = String(value || "");
  return (
    text.length <= 240 &&
    !/[\u0000-\u001f\u007f]/.test(text) &&
    !/^[=+@]/.test(text) &&
    !UNSAFE_TEXT_PATTERN.test(text)
  );
}

function validOpaqueSourceRef_(value) {
  return /^google-sheets-answer-detail:\/\/sha256\/[a-f0-9]{64}$/.test(
    String(value || "")
  );
}

function validOpaqueWaveId_(value) {
  return /^wave-sha256\/[a-f0-9]{64}$/.test(String(value || ""));
}

function validDateString_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parts = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return (
    date.getUTCFullYear() === parts[0] &&
    date.getUTCMonth() === parts[1] - 1 &&
    date.getUTCDate() === parts[2]
  );
}

function dateStartMs_(value) {
  return Date.parse(String(value) + "T00:00:00.000Z");
}

function dateEndMs_(value) {
  return Date.parse(String(value) + "T23:59:59.999Z");
}

function timestampMs_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    const dateMs = value.getTime();
    return isFinite(dateMs) ? dateMs : null;
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Date.parse(String(value));
  return isFinite(parsed) ? parsed : null;
}

function uniqueSorted_(values) {
  const seen = {};
  values.forEach(function(value) {
    if (value) seen[String(value)] = true;
  });
  return Object.keys(seen).sort();
}

return {
  rebuildAggregateEvidence: rebuildAggregateEvidence,
  buildAggregateEvidence_: buildAggregateEvidence_,
  buildHoldEvidence_: buildHoldEvidence_,
  projectAnswerRows_: projectAnswerRows_,
  canonicalStringify_: canonicalStringify_,
  sha256_: sha256_
};
})();

function rebuildAiFluencySemAggregateExport() {
  return FluencyTracrSemAggregateExport.rebuildAggregateEvidence();
}
