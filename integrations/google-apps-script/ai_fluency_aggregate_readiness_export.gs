/**
 * FluencyTracr AI Fluency aggregate readiness export adapter.
 *
 * Paste this file into the Apps Script project attached to the current AI
 * Fluency Instrument workbook. It reads approved aggregate-safe columns from
 * the existing Responses and Scores tabs, then writes only the
 * Aggregate Readiness Export tab for downstream import review.
 */

var FluencyTracrAggregateReadinessExport = (function() {
const AGGREGATE_EXPORT_SHEET_NAME = "Aggregate Readiness Export";
const SOURCE_RESPONSES_SHEET_NAME = "Responses";
const SOURCE_SCORES_SHEET_NAME = "Scores";
const RESPONSE_COUNT_MINIMUM = 20;
const SMALL_COHORT_PRIVACY_FLOOR = 5;
const ORGANIZATION_OVERALL_FUNCTION_AREA = "Organization Overall";
const SMALL_COHORT_FUNCTION_AREA = "Suppressed Small Cohort Group";

const EXPORT_CONTEXT = {
  client_id: "replace-with-client-id",
  org_id: "replace-with-org-id",
  instrument_id: "ai-fluency-instrument-24",
  instrument_version: "2.3",
  collection_mode: "aggregated_dashboard_export",
  dashboard_export_id: "",
  default_workflow_family: "ai_fluency_readiness",
  default_cohort_key: "all_approved_responses",
  baseline_window_start: "",
  baseline_window_end: "",
  comparison_window_start: "",
  comparison_window_end: "",
  source_owner_role: "AI Fluency workbook owner",
  owner_approval_state: "submitted",
  review_state: "needs_review"
};

const AGGREGATE_EXPORT_HEADERS = [
  "client_id",
  "org_id",
  "instrument_id",
  "instrument_version",
  "collection_mode",
  "dashboard_export_id",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "function_area",
  "workflow_family",
  "cohort_key",
  "eligible_population_count",
  "response_count",
  "response_rate",
  "suppression_state",
  "k_min_posture",
  "overall_ai_fluency_score",
  "confidence_score",
  "usage_quality_score",
  "behavior_change_score",
  "leadership_reinforcement_score",
  "capability_growth_score",
  "baseline_overall_ai_fluency_score",
  "comparison_overall_ai_fluency_score",
  "movement_delta",
  "movement_direction",
  "source_ref",
  "source_owner_role",
  "owner_approval_state",
  "review_state",
  "caveats"
];

const CLIENT_ID_ALIASES = [
  "client_id",
  "client id",
  "clientId",
  "customer_id",
  "customer id",
  "account_id",
  "account id"
];

const ORG_ID_ALIASES = [
  "org_id",
  "org id",
  "orgId",
  "organization_id",
  "organization id"
];

const INTERNAL_JOIN_ALIASES = [
  "respondent_id",
  "respondent id",
  "respondentId"
];

const FUNCTION_ALIASES = [
  "function_area",
  "function area",
  "function",
  "business function",
  "role family",
  "role_family"
];

const WORKFLOW_ALIASES = [
  "workflow_family",
  "workflow family",
  "workflow",
  "use case",
  "use_case",
  "job to be done",
  "jtbd",
  "workstream"
];

const COHORT_ALIASES = [
  "cohort_key",
  "cohort key",
  "cohort_id",
  "cohort id",
  "cohortId",
  "cohort",
  "pilot cohort",
  "segment",
  "population"
];

const ELIGIBLE_ALIASES = [
  "eligible_population_count",
  "eligible population count",
  "eligible population",
  "eligible n",
  "invited count",
  "invited_count",
  "population count"
];

const PERIOD_ALIASES = [
  "window_type",
  "window type",
  "collection_window",
  "collection window",
  "period",
  "survey_wave",
  "survey wave",
  "wave",
  "phase"
];

const WINDOW_START_ALIASES = [
  "window_start",
  "window start",
  "collection_start",
  "collection start",
  "start_date",
  "start date"
];

const WINDOW_END_ALIASES = [
  "window_end",
  "window end",
  "collection_end",
  "collection end",
  "end_date",
  "end date"
];

const BASELINE_START_ALIASES = [
  "baseline_window_start",
  "baseline window start",
  "baseline_start",
  "baseline start"
];

const BASELINE_END_ALIASES = [
  "baseline_window_end",
  "baseline window end",
  "baseline_end",
  "baseline end"
];

const COMPARISON_START_ALIASES = [
  "comparison_window_start",
  "comparison window start",
  "comparison_start",
  "comparison start",
  "followup_start",
  "followup start"
];

const COMPARISON_END_ALIASES = [
  "comparison_window_end",
  "comparison window end",
  "comparison_end",
  "comparison end",
  "followup_end",
  "followup end"
];

const SCORE_ALIASES = {
  overall: [
    "overall_ai_fluency_score",
    "overall ai fluency score",
    "ai fluency score",
    "overall score",
    "total score",
    "average score"
  ],
  confidence: [
    "confidence_score",
    "confidence score",
    "confidence",
    "confidence mean"
  ],
  usage_quality: [
    "usage_quality_score",
    "usage quality score",
    "usage quality",
    "usage_quality"
  ],
  behavior_change: [
    "behavior_change_score",
    "behavior change score",
    "behavior change",
    "behavior_change"
  ],
  leadership_reinforcement: [
    "leadership_reinforcement_score",
    "leadership reinforcement score",
    "leadership reinforcement",
    "leadership_reinforcement"
  ],
  capability_growth: [
    "capability_growth_score",
    "capability growth score",
    "capability growth",
    "capability_growth"
  ]
};

const SCORE_KEY_ALIASES = [
  "score_key",
  "score key",
  "scoreKey"
];

const SCORE_VALUE_ALIASES = [
  "score",
  "score_value",
  "score value"
];

const SCORE_TYPE_ALIASES = [
  "score_type",
  "score type",
  "scoreType"
];

const UNSAFE_HEADER_PATTERNS = [
  /email/i,
  /employee.?id/i,
  /employee.?name/i,
  /user.?id/i,
  /person.?id/i,
  /person.?identifier/i,
  /respondent.?id/i,
  /name/i,
  /raw.?answer/i,
  /raw.?row/i,
  /raw.?text/i,
  /result.?json/i,
  /free.?text/i,
  /open.?text/i,
  /prompt/i,
  /response.?text/i,
  /transcript/i,
  /probability/i,
  /confidence.?percent/i,
  /roi/i,
  /financial.?attribution/i,
  /financial.?output/i,
  /person.?level/i
];

const UNSAFE_EXPORT_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(respondent|employee|person)[-_ ]?[A-Z0-9]{3,}\b/i,
  /\b(user|person|employee|respondent).?(id|identifier)\b/i,
  /\b(raw answer|raw row|raw text|free text|open text|prompt|transcript)\b/i,
  /\b(probability|confidence percent|confidence percentage)\b/i,
  /\b(roi|financial attribution|financial output)\b/i
];

const SOURCE_DERIVED_EXPORT_FIELDS = [
  "client_id",
  "org_id",
  "function_area",
  "workflow_family",
  "cohort_key"
];

function addMenu_() {
  SpreadsheetApp.getUi()
    .createMenu("FluencyTracr")
    .addItem("Rebuild Aggregate Readiness Export", "rebuildAggregateReadinessExport")
    .addToUi();
}

function rebuildAggregateReadinessExport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const responsesSheet = ss.getSheetByName(SOURCE_RESPONSES_SHEET_NAME);
  const scoresSheet = ss.getSheetByName(SOURCE_SCORES_SHEET_NAME);

  if (!responsesSheet) {
    throw new Error('Missing required source tab "Responses".');
  }
  if (!scoresSheet) {
    throw new Error('Missing required source tab "Scores".');
  }

  assertSafeOutputHeaders_();

  const responseRows = readSafeRows_(
    responsesSheet,
    responseInputAliases_(),
    internalInputAliases_()
  );
  const scoreRows = readSafeRows_(scoresSheet, scoreInputAliases_(), internalInputAliases_());
  const mergedRows = buildMergedRows_(scoreRows, responseRows);
  const exportRecords = buildAggregateExportRecords_(mergedRows);
  const exportRows = exportRecords.map(function(record) {
    return AGGREGATE_EXPORT_HEADERS.map(function(header) {
      return record[header] === null || record[header] === undefined ? "" : record[header];
    });
  });

  const exportSheet = getOrCreateExportSheet_(ss);
  exportSheet.clearContents();
  exportSheet
    .getRange(1, 1, 1, AGGREGATE_EXPORT_HEADERS.length)
    .setValues([AGGREGATE_EXPORT_HEADERS]);

  if (exportRows.length > 0) {
    exportSheet
      .getRange(2, 1, exportRows.length, AGGREGATE_EXPORT_HEADERS.length)
      .setValues(exportRows);
  }

  exportSheet.setFrozenRows(1);
  exportSheet.autoResizeColumns(1, AGGREGATE_EXPORT_HEADERS.length);

  return {
    sheetName: AGGREGATE_EXPORT_SHEET_NAME,
    writtenRows: exportRows.length,
    kMinimum: RESPONSE_COUNT_MINIMUM
  };
}

function responseInputAliases_() {
  return aliasSet_(
    CLIENT_ID_ALIASES,
    ORG_ID_ALIASES,
    FUNCTION_ALIASES,
    WORKFLOW_ALIASES,
    COHORT_ALIASES,
    ELIGIBLE_ALIASES,
    PERIOD_ALIASES,
    WINDOW_START_ALIASES,
    WINDOW_END_ALIASES,
    BASELINE_START_ALIASES,
    BASELINE_END_ALIASES,
    COMPARISON_START_ALIASES,
    COMPARISON_END_ALIASES,
    SCORE_ALIASES.overall
  );
}

function scoreInputAliases_() {
  return aliasSet_(
    CLIENT_ID_ALIASES,
    ORG_ID_ALIASES,
    FUNCTION_ALIASES,
    WORKFLOW_ALIASES,
    COHORT_ALIASES,
    ELIGIBLE_ALIASES,
    PERIOD_ALIASES,
    WINDOW_START_ALIASES,
    WINDOW_END_ALIASES,
    BASELINE_START_ALIASES,
    BASELINE_END_ALIASES,
    COMPARISON_START_ALIASES,
    COMPARISON_END_ALIASES,
    SCORE_KEY_ALIASES,
    SCORE_VALUE_ALIASES,
    SCORE_TYPE_ALIASES,
    SCORE_ALIASES.overall,
    SCORE_ALIASES.confidence,
    SCORE_ALIASES.usage_quality,
    SCORE_ALIASES.behavior_change,
    SCORE_ALIASES.leadership_reinforcement,
    SCORE_ALIASES.capability_growth
  );
}

function internalInputAliases_() {
  return aliasSet_(INTERNAL_JOIN_ALIASES);
}

function aliasSet_() {
  const aliases = Array.prototype.slice.call(arguments).flat();
  return new Set(aliases.map(normalizeHeader_));
}

function readSafeRows_(sheet, allowedHeaders, internalHeaders) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const safeColumns = [];
  headers.forEach(function(header, index) {
    const normalized = normalizeHeader_(header);
    const isSafePublicHeader =
      normalized &&
      allowedHeaders.has(normalized) &&
      !UNSAFE_HEADER_PATTERNS.some(function(pattern) {
        return pattern.test(String(header)) || pattern.test(normalized);
      });
    const isInternalJoinHeader = normalized && internalHeaders && internalHeaders.has(normalized);

    if (isSafePublicHeader || isInternalJoinHeader) {
      safeColumns.push({ index: index + 1, key: normalized });
    }
  });

  const rows = Array.from({ length: lastRow - 1 }, function() {
    return {};
  });

  safeColumns.forEach(function(column) {
    const values = sheet.getRange(2, column.index, lastRow - 1, 1).getValues();
    values.forEach(function(rowValue, rowIndex) {
      rows[rowIndex][column.key] = rowValue[0];
    });
  });

  return rows;
}

function buildMergedRows_(scoreRows, responseRows) {
  if (hasLongScoreRows_(scoreRows)) {
    return buildMergedRowsFromLongScores_(scoreRows, responseRows);
  }
  return mergeRowsByPosition_(scoreRows, responseRows);
}

function mergeRowsByPosition_(scoreRows, responseRows) {
  if (responseRows.length > 0 && responseRows.length !== scoreRows.length) {
    return scoreRows.map(function(scoreRow) {
      return {
        score: scoreRow,
        response: {}
      };
    });
  }

  return scoreRows.map(function(scoreRow, index) {
    return {
      score: scoreRow,
      response: responseRows[index] || {}
    };
  });
}

function hasLongScoreRows_(scoreRows) {
  return scoreRows.some(function(scoreRow) {
    return (
      !isBlank_(firstFlatValue_(scoreRow, SCORE_KEY_ALIASES)) &&
      !isBlank_(firstFlatValue_(scoreRow, SCORE_VALUE_ALIASES))
    );
  });
}

function buildMergedRowsFromLongScores_(scoreRows, responseRows) {
  const responsesByJoinKey = mapRowsByJoinKey_(responseRows);
  const rowsByJoinKey = new Map();

  responseRows.forEach(function(responseRow, index) {
    if (!hasFlatAggregateInput_(responseRow)) return;
    const joinKey =
      firstFlatString_(responseRow, INTERNAL_JOIN_ALIASES) || "__response_row_" + index;
    rowsByJoinKey.set(joinKey, {
      score: {},
      response: responseRow
    });
  });

  scoreRows.forEach(function(scoreRow) {
    const joinKey = firstFlatString_(scoreRow, INTERNAL_JOIN_ALIASES);
    if (isBlank_(joinKey)) {
      throw new Error("Long-format Scores rows require an internal respondent join key.");
    }

    const responseRow = responsesByJoinKey.get(joinKey);
    if (!responseRow) {
      throw new Error("Missing Responses row for a long-format Scores respondent join key.");
    }

    const merged = rowsByJoinKey.get(joinKey) || {
      score: copyScoreMetadata_(scoreRow),
      response: responseRow
    };
    const scoreMetadata = copyScoreMetadata_(scoreRow);
    Object.keys(scoreMetadata).forEach(function(key) {
      if (isBlank_(merged.score[key])) {
        merged.score[key] = scoreMetadata[key];
      }
    });
    const scoreKey = normalizeScoreKey_(firstFlatString_(scoreRow, SCORE_KEY_ALIASES));
    const scoreValue = firstFlatValue_(scoreRow, SCORE_VALUE_ALIASES);
    if (scoreKey) {
      merged.score[scoreKey] = scoreValue;
    }
    rowsByJoinKey.set(joinKey, merged);
  });

  return Array.from(rowsByJoinKey.values());
}

function mapRowsByJoinKey_(rows) {
  const byJoinKey = new Map();
  rows.forEach(function(row) {
    const joinKey = firstFlatString_(row, INTERNAL_JOIN_ALIASES);
    if (!isBlank_(joinKey)) {
      byJoinKey.set(joinKey, row);
    }
  });
  return byJoinKey;
}

function copyScoreMetadata_(scoreRow) {
  const metadata = {};
  [
    CLIENT_ID_ALIASES,
    ORG_ID_ALIASES,
    FUNCTION_ALIASES,
    WORKFLOW_ALIASES,
    COHORT_ALIASES,
    ELIGIBLE_ALIASES,
    PERIOD_ALIASES,
    WINDOW_START_ALIASES,
    WINDOW_END_ALIASES,
    BASELINE_START_ALIASES,
    BASELINE_END_ALIASES,
    COMPARISON_START_ALIASES,
    COMPARISON_END_ALIASES
  ].forEach(function(aliases) {
    aliases.map(normalizeHeader_).forEach(function(key) {
      if (!isBlank_(scoreRow[key])) {
        metadata[key] = scoreRow[key];
      }
    });
  });
  return metadata;
}

function normalizeScoreKey_(value) {
  const normalized = normalizeHeader_(value);
  if (normalized === "overall" || normalized === "overall_ai_fluency") {
    return "overall_ai_fluency_score";
  }
  if (normalized === "confidence") return "confidence_score";
  if (normalized === "usage_quality") return "usage_quality_score";
  if (normalized === "behavior_change") return "behavior_change_score";
  if (normalized === "leadership_reinforcement") return "leadership_reinforcement_score";
  if (normalized === "capability_growth") return "capability_growth_score";
  return "";
}

function buildAggregateExportRecords_(mergedRows) {
  const groups = new Map();

  mergedRows.forEach(function(row) {
    if (!hasAggregateRowInput_(row)) return;

    const clientId = resolvedClientId_(row);
    const orgId = resolvedOrgId_(row, clientId);
    const rawFunctionArea = firstString_(row, FUNCTION_ALIASES);
    const functionArea = rawFunctionArea || "Unspecified Function";
    const workflowFamily =
      firstString_(row, WORKFLOW_ALIASES) || EXPORT_CONTEXT.default_workflow_family;
    const cohortKey = firstString_(row, COHORT_ALIASES) || EXPORT_CONTEXT.default_cohort_key;
    const key = [clientId, orgId, functionArea, workflowFamily, cohortKey]
      .map(safeKeyPart_)
      .join("||");
    const group = groups.get(key) || {
      clientId: clientId,
      orgId: orgId,
      functionArea: functionArea,
      workflowFamily: workflowFamily,
      cohortKey: cohortKey,
      eligiblePopulationCount: null,
      baselineRows: [],
      comparisonRows: [],
      allRows: [],
      baselineStart: "",
      baselineEnd: "",
      comparisonStart: "",
      comparisonEnd: "",
      missingFunctionArea: false,
      reviewOnlyOverall: false,
      childSlicesSurfaceable: true
    };
    if (!rawFunctionArea) {
      group.missingFunctionArea = true;
    }

    const eligiblePopulationCount = firstNumber_(row, ELIGIBLE_ALIASES);
    if (eligiblePopulationCount !== null) {
      group.eligiblePopulationCount = Math.max(
        group.eligiblePopulationCount || 0,
        eligiblePopulationCount
      );
    }

    applyWindowValues_(group, row);

    const scoredRow = scoreBundleForRow_(row);
    scoredRow.complete = scoreBundleIsComplete_(scoredRow);
    const period = classifyPeriod_(firstString_(row, PERIOD_ALIASES));
    group.allRows.push(scoredRow);
    if (period === "baseline") {
      group.baselineRows.push(scoredRow);
    } else {
      group.comparisonRows.push(scoredRow);
    }
    groups.set(key, group);
  });

  const sortedGroups = publicAggregateGroups_(Array.from(groups.values())).sort(function(a, b) {
      return [a.clientId, a.orgId, a.functionArea, a.workflowFamily, a.cohortKey]
        .join("|")
        .localeCompare(
          [b.clientId, b.orgId, b.functionArea, b.workflowFamily, b.cohortKey].join("|")
        );
    });
  const records = sortedGroups.map(function(group) {
    return recordForGroup_(group);
  });
  const overallGroup = organizationOverallGroup_(sortedGroups);
  if (overallGroup) {
    records.push(recordForGroup_(overallGroup));
  }
  assertSingleExportIdentity_(records);
  records.forEach(assertSafeExportRecord_);
  return records;
}

function publicAggregateGroups_(groups) {
  const publicGroups = [];
  const smallCohortGroups = [];
  groups.forEach(function(group) {
    if (groupBelowPrivacyFloor_(group)) {
      smallCohortGroups.push(group);
    } else {
      publicGroups.push(group);
    }
  });
  const smallCohortGroup = smallCohortAggregateGroup_(smallCohortGroups);
  if (smallCohortGroup) {
    publicGroups.push(smallCohortGroup);
  }
  return publicGroups;
}

function groupBelowPrivacyFloor_(group) {
  const readiness = groupReadiness_(group);
  return (
    (readiness.comparisonCount > 0 &&
      readiness.comparisonCount < SMALL_COHORT_PRIVACY_FLOOR) ||
    (readiness.baselineCount > 0 && readiness.baselineCount < SMALL_COHORT_PRIVACY_FLOOR)
  );
}

function smallCohortAggregateGroup_(groups) {
  if (groups.length === 0) return null;
  const firstGroup = groups[0];
  return {
    clientId: firstGroup.clientId,
    orgId: firstGroup.orgId,
    functionArea: SMALL_COHORT_FUNCTION_AREA,
    workflowFamily: "suppressed_small_cohort",
    cohortKey: "suppressed_small_cohort",
    eligiblePopulationCount: null,
    baselineRows: groups.reduce(function(rows, group) {
      return rows.concat(group.baselineRows);
    }, []),
    comparisonRows: groups.reduce(function(rows, group) {
      return rows.concat(group.comparisonRows);
    }, []),
    allRows: groups.reduce(function(rows, group) {
      return rows.concat(group.allRows);
    }, []),
    baselineStart: firstNonBlank_(groups.map(function(group) {
      return group.baselineStart;
    })),
    baselineEnd: firstNonBlank_(groups.map(function(group) {
      return group.baselineEnd;
    })),
    comparisonStart: firstNonBlank_(groups.map(function(group) {
      return group.comparisonStart;
    })),
    comparisonEnd: firstNonBlank_(groups.map(function(group) {
      return group.comparisonEnd;
    })),
    missingFunctionArea: false,
    reviewOnlyOverall: false,
    childSlicesSurfaceable: false,
    privacySuppressed: true
  };
}

function organizationOverallGroup_(groups) {
  if (groups.length === 0) return null;
  const firstGroup = groups[0];
  const eligibleCounts = groups
    .map(function(group) {
      return group.eligiblePopulationCount;
    })
    .filter(function(value) {
      return typeof value === "number" && isFinite(value);
    });
  const childSlicesSurfaceable = groups.every(function(group) {
    return groupReadiness_(group).canSurfaceScores;
  });
  return {
    clientId: firstGroup.clientId,
    orgId: firstGroup.orgId,
    functionArea: ORGANIZATION_OVERALL_FUNCTION_AREA,
    workflowFamily: EXPORT_CONTEXT.default_workflow_family,
    cohortKey: EXPORT_CONTEXT.default_cohort_key,
    eligiblePopulationCount:
      eligibleCounts.length === 0
        ? null
        : eligibleCounts.reduce(function(total, value) {
            return total + value;
          }, 0),
    baselineRows: groups.reduce(function(rows, group) {
      return rows.concat(group.baselineRows);
    }, []),
    comparisonRows: groups.reduce(function(rows, group) {
      return rows.concat(group.comparisonRows);
    }, []),
    allRows: groups.reduce(function(rows, group) {
      return rows.concat(group.allRows);
    }, []),
    baselineStart: firstNonBlank_(groups.map(function(group) {
      return group.baselineStart;
    })),
    baselineEnd: firstNonBlank_(groups.map(function(group) {
      return group.baselineEnd;
    })),
    comparisonStart: firstNonBlank_(groups.map(function(group) {
      return group.comparisonStart;
    })),
    comparisonEnd: firstNonBlank_(groups.map(function(group) {
      return group.comparisonEnd;
    })),
    missingFunctionArea: false,
    reviewOnlyOverall: true,
    childSlicesSurfaceable: childSlicesSurfaceable
  };
}

function applyWindowValues_(group, row) {
  const period = classifyPeriod_(firstString_(row, PERIOD_ALIASES));
  const genericStart = firstDateString_(row, WINDOW_START_ALIASES);
  const genericEnd = firstDateString_(row, WINDOW_END_ALIASES);
  const baselineStart = firstDateString_(row, BASELINE_START_ALIASES);
  const baselineEnd = firstDateString_(row, BASELINE_END_ALIASES);
  const comparisonStart = firstDateString_(row, COMPARISON_START_ALIASES);
  const comparisonEnd = firstDateString_(row, COMPARISON_END_ALIASES);

  group.baselineStart =
    group.baselineStart ||
    baselineStart ||
    (period === "baseline" ? genericStart : "") ||
    EXPORT_CONTEXT.baseline_window_start;
  group.baselineEnd =
    group.baselineEnd ||
    baselineEnd ||
    (period === "baseline" ? genericEnd : "") ||
    EXPORT_CONTEXT.baseline_window_end;
  group.comparisonStart =
    group.comparisonStart ||
    comparisonStart ||
    (period !== "baseline" ? genericStart : "") ||
    EXPORT_CONTEXT.comparison_window_start;
  group.comparisonEnd =
    group.comparisonEnd ||
    comparisonEnd ||
    (period !== "baseline" ? genericEnd : "") ||
    EXPORT_CONTEXT.comparison_window_end;
}

function recordForGroup_(group) {
  const readiness = groupReadiness_(group);
  const canSurfaceScores = readiness.canSurfaceScores &&
    (!group.reviewOnlyOverall || group.childSlicesSurfaceable);
  const comparisonRows =
    group.comparisonRows.length > 0 ? group.comparisonRows : group.allRows;
  const comparisonCount = readiness.comparisonCount;
  const baselineCount = readiness.baselineCount;
  const dashboardExportId = dashboardExportId_(group.clientId, group.orgId);
  const eligibleCount = group.eligiblePopulationCount;
  const responseRate =
    !group.privacySuppressed && eligibleCount && eligibleCount > 0
      ? round4_(comparisonCount / eligibleCount)
      : "";
  const comparisonScores = canSurfaceScores ? meanScoreBundle_(comparisonRows) : emptyScoreBundle_();
  const baselineOverall =
    canSurfaceScores && baselineCount > 0 ? meanScoreBundle_(group.baselineRows).overall : null;
  const comparisonOverall = canSurfaceScores ? comparisonScores.overall : null;
  const movementDelta =
    baselineOverall !== null && comparisonOverall !== null
      ? round2_(comparisonOverall - baselineOverall)
      : null;
  const suppressedState =
    readiness.kMinimumMet && !readiness.privacySuppressed ? "none" : "suppressed_low_n";
  const reviewState = reviewStateForGroup_(group, readiness, canSurfaceScores);

  return {
    client_id: group.clientId,
    org_id: group.orgId,
    instrument_id: EXPORT_CONTEXT.instrument_id,
    instrument_version: EXPORT_CONTEXT.instrument_version,
    collection_mode: EXPORT_CONTEXT.collection_mode,
    dashboard_export_id: dashboardExportId,
    baseline_window_start: group.baselineStart,
    baseline_window_end: group.baselineEnd,
    comparison_window_start: group.comparisonStart,
    comparison_window_end: group.comparisonEnd,
    function_area: group.functionArea,
    workflow_family: group.workflowFamily,
    cohort_key: group.cohortKey,
    eligible_population_count: eligibleCount === null ? "" : eligibleCount,
    response_count: readiness.privacySuppressed ? "" : comparisonCount,
    response_rate: responseRate,
    suppression_state: suppressedState,
    k_min_posture: "k_min_20_function_level",
    overall_ai_fluency_score: comparisonScores.overall,
    confidence_score: comparisonScores.confidence,
    usage_quality_score: comparisonScores.usage_quality,
    behavior_change_score: comparisonScores.behavior_change,
    leadership_reinforcement_score: comparisonScores.leadership_reinforcement,
    capability_growth_score: comparisonScores.capability_growth,
    baseline_overall_ai_fluency_score: baselineOverall,
    comparison_overall_ai_fluency_score: comparisonOverall,
    movement_delta: movementDelta,
    movement_direction: movementDirection_(movementDelta, canSurfaceScores),
    source_ref: sourceRef_(dashboardExportId, group),
    source_owner_role: EXPORT_CONTEXT.source_owner_role,
    owner_approval_state: EXPORT_CONTEXT.owner_approval_state,
    review_state: reviewState,
    caveats: caveatForGroup_(group, readiness, canSurfaceScores)
  };
}

function groupReadiness_(group) {
  const comparisonRows =
    group.comparisonRows.length > 0 ? group.comparisonRows : group.allRows;
  const comparisonCount = comparisonRows.length;
  const baselineCount = group.baselineRows.length;
  const baselineWindowMet = baselineCount === 0 || baselineCount >= RESPONSE_COUNT_MINIMUM;
  const comparisonWindowMet = comparisonCount >= RESPONSE_COUNT_MINIMUM;
  const kMinimumMet = baselineWindowMet && comparisonWindowMet;
  const comparisonCompleteCount = completeScoreCount_(comparisonRows);
  const baselineCompleteCount = completeScoreCount_(group.baselineRows);
  const comparisonScoreCoverageMet =
    comparisonCount > 0 && comparisonCompleteCount === comparisonCount;
  const baselineScoreCoverageMet =
    baselineCount === 0 || baselineCompleteCount === baselineCount;
  const scoreCoverageMet = comparisonScoreCoverageMet && baselineScoreCoverageMet;
  return {
    comparisonRows: comparisonRows,
    comparisonCount: comparisonCount,
    baselineCount: baselineCount,
    kMinimumMet: kMinimumMet,
    scoreCoverageMet: scoreCoverageMet,
    missingFunctionArea: group.missingFunctionArea === true,
    privacySuppressed: group.privacySuppressed === true,
    canSurfaceScores:
      kMinimumMet &&
      scoreCoverageMet &&
      group.missingFunctionArea !== true &&
      group.privacySuppressed !== true
  };
}

function reviewStateForGroup_(group, readiness, canSurfaceScores) {
  if (readiness.privacySuppressed) return "held_suppressed_low_n";
  if (!readiness.kMinimumMet) return "held_suppressed_low_n";
  if (!readiness.scoreCoverageMet) return "held_incomplete_score_coverage";
  if (readiness.missingFunctionArea) return "held_missing_function_area";
  if (group.reviewOnlyOverall && !group.childSlicesSurfaceable) {
    return "held_child_slice_suppression";
  }
  if (group.reviewOnlyOverall) return "held_organization_overall_review_only";
  return canSurfaceScores ? EXPORT_CONTEXT.review_state : "held_incomplete_score_coverage";
}

function scoreBundleForRow_(row) {
  const scores = {
    confidence: firstScore_(row, SCORE_ALIASES.confidence),
    usage_quality: firstScore_(row, SCORE_ALIASES.usage_quality),
    behavior_change: firstScore_(row, SCORE_ALIASES.behavior_change),
    leadership_reinforcement: firstScore_(row, SCORE_ALIASES.leadership_reinforcement),
    capability_growth: firstScore_(row, SCORE_ALIASES.capability_growth)
  };
  const explicitOverall = firstScore_(row, SCORE_ALIASES.overall);
  scores.overall =
    explicitOverall !== null
      ? explicitOverall
      : mean_(Object.keys(scores).map(function(key) {
          return scores[key];
        }));
  return scores;
}

function meanScoreBundle_(rows) {
  return {
    overall: meanFor_(rows, "overall"),
    confidence: meanFor_(rows, "confidence"),
    usage_quality: meanFor_(rows, "usage_quality"),
    behavior_change: meanFor_(rows, "behavior_change"),
    leadership_reinforcement: meanFor_(rows, "leadership_reinforcement"),
    capability_growth: meanFor_(rows, "capability_growth")
  };
}

function emptyScoreBundle_() {
  return {
    overall: null,
    confidence: null,
    usage_quality: null,
    behavior_change: null,
    leadership_reinforcement: null,
    capability_growth: null
  };
}

function scoreBundleIsComplete_(scores) {
  return (
    scores.overall !== null &&
    scores.confidence !== null &&
    scores.usage_quality !== null &&
    scores.behavior_change !== null &&
    scores.leadership_reinforcement !== null &&
    scores.capability_growth !== null
  );
}

function completeScoreCount_(rows) {
  return rows.filter(function(row) {
    return row.complete === true;
  }).length;
}

function hasScoreInput_(row) {
  return Object.keys(SCORE_ALIASES).some(function(key) {
    return firstScore_(row, SCORE_ALIASES[key]) !== null;
  });
}

function hasAggregateRowInput_(row) {
  return (
    hasScoreInput_(row) ||
    !isBlank_(firstString_(row, CLIENT_ID_ALIASES)) ||
    !isBlank_(firstString_(row, ORG_ID_ALIASES)) ||
    !isBlank_(firstString_(row, FUNCTION_ALIASES)) ||
    !isBlank_(firstString_(row, WORKFLOW_ALIASES)) ||
    !isBlank_(firstString_(row, COHORT_ALIASES))
  );
}

function hasFlatAggregateInput_(row) {
  return (
    !isBlank_(firstFlatString_(row, CLIENT_ID_ALIASES)) ||
    !isBlank_(firstFlatString_(row, ORG_ID_ALIASES)) ||
    !isBlank_(firstFlatString_(row, FUNCTION_ALIASES)) ||
    !isBlank_(firstFlatString_(row, WORKFLOW_ALIASES)) ||
    !isBlank_(firstFlatString_(row, COHORT_ALIASES)) ||
    !isBlank_(firstFlatValue_(row, SCORE_ALIASES.overall))
  );
}

function meanFor_(rows, key) {
  return mean_(rows.map(function(row) {
    return row[key];
  }));
}

function mean_(values) {
  const numeric = values.filter(function(value) {
    return typeof value === "number" && isFinite(value);
  });
  if (numeric.length === 0) return null;
  return round2_(
    numeric.reduce(function(total, value) {
      return total + value;
    }, 0) / numeric.length
  );
}

function firstScore_(row, aliases) {
  const value = firstValue_(row, aliases);
  if (isBlank_(value)) return null;
  const numeric = Number(String(value).replace("%", "").trim());
  if (!isFinite(numeric)) return null;
  if (numeric > 0 && numeric <= 1) return round2_(numeric * 100);
  if (numeric > 1 && numeric <= 5) return round2_(numeric * 20);
  if (numeric >= 0 && numeric <= 100) return round2_(numeric);
  return null;
}

function firstNumber_(row, aliases) {
  const value = firstValue_(row, aliases);
  if (isBlank_(value)) return null;
  const numeric = Number(String(value).replace("%", "").trim());
  return isFinite(numeric) ? numeric : null;
}

function firstString_(row, aliases) {
  const value = firstValue_(row, aliases);
  return isBlank_(value) ? "" : String(value).trim();
}

function firstDateString_(row, aliases) {
  const value = firstValue_(row, aliases);
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return isBlank_(value) ? "" : String(value).trim();
}

function firstValue_(row, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader_);
  for (let i = 0; i < normalizedAliases.length; i += 1) {
    const key = normalizedAliases[i];
    if (!isBlank_(row.score[key])) return row.score[key];
    if (!isBlank_(row.response[key])) return row.response[key];
  }
  return "";
}

function firstConsistentString_(row, aliases, fieldName) {
  const scoreValue = firstFlatString_(row.score, aliases);
  const responseValue = firstFlatString_(row.response, aliases);
  if (!isBlank_(scoreValue) && !isBlank_(responseValue) && scoreValue !== responseValue) {
    throw new Error("Conflicting " + fieldName + " between Scores and Responses.");
  }
  return scoreValue || responseValue;
}

function firstFlatValue_(record, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader_);
  for (let i = 0; i < normalizedAliases.length; i += 1) {
    const key = normalizedAliases[i];
    if (!isBlank_(record[key])) return record[key];
  }
  return "";
}

function firstFlatString_(record, aliases) {
  const value = firstFlatValue_(record, aliases);
  return isBlank_(value) ? "" : String(value).trim();
}

function classifyPeriod_(value) {
  const normalized = normalizeHeader_(value);
  if (/baseline|pre|kickoff/.test(normalized)) return "baseline";
  return "comparison";
}

function movementDirection_(movementDelta, kMinimumMet) {
  if (!kMinimumMet || movementDelta === null) return "held";
  if (movementDelta > 0) return "improved";
  if (movementDelta < 0) return "declined";
  return "stable";
}

function caveatForGroup_(group, readiness, canSurfaceScores) {
  if (readiness.privacySuppressed) {
    return (
      "Suppressed because one or more function slices are below the hard " +
      "small-cohort privacy floor of " +
      SMALL_COHORT_PRIVACY_FLOOR +
      ". Function labels, exact small-slice counts, and construct scores are " +
      "not exported for those slices."
    );
  }
  if (!readiness.kMinimumMet) {
    return (
      "Suppressed because an aggregate slice is below k-minimum " +
      RESPONSE_COUNT_MINIMUM +
      ". No construct scores are exported. Baseline count: " +
      readiness.baselineCount +
      "; comparison count: " +
      readiness.comparisonCount +
      "."
    );
  }
  if (!readiness.scoreCoverageMet) {
    return (
      "Held because one or more aggregate respondents in this slice do not " +
      "have complete AI Fluency construct score coverage. No construct scores " +
      "are exported for this row."
    );
  }
  if (readiness.missingFunctionArea) {
    return (
      "Held because function_area could not be derived from the safe source " +
      "columns. No construct scores are exported for this row."
    );
  }
  if (group.reviewOnlyOverall && !group.childSlicesSurfaceable) {
    return (
      "Held because at least one child function slice is suppressed or held. " +
      "The organization overall row is not scored to avoid inferring held " +
      "function-level evidence."
    );
  }
  if (group.reviewOnlyOverall && canSurfaceScores) {
    return (
      "Review-only organization overall AI Fluency readiness row. Descriptive " +
      "aggregate context only; not a feedable Data Spine function source, ROI " +
      "proof, causality, productivity, probability, financial output, or " +
      "person-level evidence."
    );
  }
  return (
    "Aggregate-only AI Fluency readiness row. Descriptive movement only; not " +
    "ROI proof, causality, productivity, probability, financial output, or " +
    "person-level evidence."
  );
}

function dashboardExportId_(clientId, orgId) {
  if (EXPORT_CONTEXT.dashboard_export_id) return EXPORT_CONTEXT.dashboard_export_id;
  return (
    "ai-fluency-sheets-" +
    safeKeyPart_(clientId) +
    "-" +
    safeKeyPart_(orgId) +
    "-" +
    Utilities.formatDate(new Date(), "Etc/UTC", "yyyyMMdd")
  );
}

function sourceRef_(dashboardExportId, group) {
  return "ai-fluency-dashboard-export://" + [
    safeKeyPart_(group.clientId),
    safeKeyPart_(group.orgId),
    safeKeyPart_(dashboardExportId),
    safeKeyPart_(group.functionArea),
    safeKeyPart_(group.workflowFamily),
    safeKeyPart_(group.cohortKey)
  ].join("/");
}

function resolvedClientId_(row) {
  const clientId =
    firstConsistentString_(row, CLIENT_ID_ALIASES, "client_id") ||
    contextFallback_("client_id", "");
  if (isBlank_(clientId)) {
    throw new Error(
      "Missing required client_id. Add a safe clientId/client_id source column or set EXPORT_CONTEXT.client_id."
    );
  }
  assertSafeExportValue_("client_id", clientId);
  return clientId;
}

function resolvedOrgId_(row, clientId) {
  const orgId =
    firstConsistentString_(row, ORG_ID_ALIASES, "org_id") ||
    contextFallback_("org_id", "") ||
    clientId;
  assertSafeExportValue_("org_id", orgId);
  return orgId;
}

function contextFallback_(fieldName, fallback) {
  const value = EXPORT_CONTEXT[fieldName];
  if (isPlaceholderValue_(value)) return fallback;
  return isBlank_(value) ? fallback : String(value).trim();
}

function isPlaceholderValue_(value) {
  return /^replace-with-/i.test(String(value || "").trim());
}

function assertSingleExportIdentity_(records) {
  const clientIds = uniqueNonBlank_(records.map(function(record) {
    return record.client_id;
  }));
  const orgIds = uniqueNonBlank_(records.map(function(record) {
    return record.org_id;
  }));
  if (clientIds.length > 1 || orgIds.length > 1) {
    throw new Error(
      "Aggregate Readiness Export must contain a single client_id and org_id. Split exports by client/org."
    );
  }
}

function assertSafeExportRecord_(record) {
  SOURCE_DERIVED_EXPORT_FIELDS.forEach(function(fieldName) {
    assertSafeExportValue_(fieldName, record[fieldName]);
  });
}

function assertSafeExportValue_(fieldName, value) {
  if (isBlank_(value)) return;
  const text = String(value);
  const blocked = UNSAFE_EXPORT_VALUE_PATTERNS.some(function(pattern) {
    return pattern.test(text);
  });
  if (blocked) {
    throw new Error("Unsafe export value blocked for " + fieldName + ".");
  }
}

function uniqueNonBlank_(values) {
  const seen = {};
  const uniqueValues = [];
  values.forEach(function(value) {
    if (isBlank_(value)) return;
    const key = String(value).trim();
    if (seen[key]) return;
    seen[key] = true;
    uniqueValues.push(key);
  });
  return uniqueValues;
}

function firstNonBlank_(values) {
  for (let i = 0; i < values.length; i += 1) {
    if (!isBlank_(values[i])) return values[i];
  }
  return "";
}

function getOrCreateExportSheet_(ss) {
  return ss.getSheetByName(AGGREGATE_EXPORT_SHEET_NAME) || ss.insertSheet(AGGREGATE_EXPORT_SHEET_NAME);
}

function assertSafeOutputHeaders_() {
  const unsafeHeaders = AGGREGATE_EXPORT_HEADERS.filter(function(header) {
    return UNSAFE_HEADER_PATTERNS.some(function(pattern) {
      return pattern.test(header);
    });
  });
  if (unsafeHeaders.length > 0) {
    throw new Error("Unsafe export headers blocked: " + unsafeHeaders.join(", "));
  }
}

function normalizeHeader_(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeKeyPart_(value) {
  const normalized = normalizeHeader_(value);
  return normalized || "unknown";
}

function isBlank_(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function round2_(value) {
  return Math.round(value * 100) / 100;
}

function round4_(value) {
  return Math.round(value * 10000) / 10000;
}

return {
  addMenu_: addMenu_,
  rebuildAggregateReadinessExport: rebuildAggregateReadinessExport,
  buildAggregateExportRecords_: buildAggregateExportRecords_,
  buildMergedRows_: buildMergedRows_
};
})();

function rebuildAggregateReadinessExport() {
  return FluencyTracrAggregateReadinessExport.rebuildAggregateReadinessExport();
}

function addFluencyTracrAggregateReadinessExportMenu() {
  return FluencyTracrAggregateReadinessExport.addMenu_();
}
