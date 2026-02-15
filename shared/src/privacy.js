"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORBIDDEN_FIELDS = exports.PERSON_IDENTIFIER_FIELDS = exports.GOVERNANCE_FORBIDDEN_FIELDS = exports.NON_COLLECTABLE_FIELDS = void 0;
exports.containsForbiddenFields = containsForbiddenFields;
exports.containsPersonIdentifiers = containsPersonIdentifiers;
exports.NON_COLLECTABLE_FIELDS = [
    "prompt_content",
    "output_content",
    "keystrokes",
    "file_names",
    "message_text",
    "raw_logs"
];
exports.GOVERNANCE_FORBIDDEN_FIELDS = [
    "rank",
    "index",
    "position",
    "percentile",
    "order",
    "ordered",
    "sequence",
    "streak",
    "duration",
    "count",
    "sum",
    "avg",
    "average",
    "total",
    "rate",
    "ratio",
    "score",
    "points",
    "baseline",
    "compare",
    "comparison",
    "cumulative",
    "accumulated",
    "accumulator",
    "window_start",
    "window_end",
    "previous_window",
    "trend",
    "delta",
    "change",
    "top_k",
    "histogram",
    "distribution",
    "leaderboard"
];
exports.PERSON_IDENTIFIER_FIELDS = [
    "user_id",
    "userid",
    "userId",
    "email",
    "name",
    "full_name",
    "first_name",
    "last_name",
    "employee_id",
    "employeeId",
    "person_id",
    "username"
];
exports.FORBIDDEN_FIELDS = [
    ...exports.NON_COLLECTABLE_FIELDS,
    ...exports.GOVERNANCE_FORBIDDEN_FIELDS,
    ...exports.PERSON_IDENTIFIER_FIELDS
];
function containsForbiddenFields(payload) {
    if (!payload || typeof payload !== "object")
        return false;
    const forbidden = new Set(exports.FORBIDDEN_FIELDS.map((field) => field.toLowerCase()));
    const stack = [payload];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== "object")
            continue;
        for (const [k, v] of Object.entries(cur)) {
            if (forbidden.has(k.toLowerCase()))
                return true;
            if (v && typeof v === "object")
                stack.push(v);
        }
    }
    return false;
}
function containsPersonIdentifiers(payload) {
    if (!payload || typeof payload !== "object")
        return false;
    const normalized = new Set(exports.PERSON_IDENTIFIER_FIELDS.map((field) => field.toLowerCase()));
    const stack = [payload];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== "object")
            continue;
        for (const [k, v] of Object.entries(cur)) {
            if (normalized.has(k.toLowerCase()))
                return true;
            if (v && typeof v === "object")
                stack.push(v);
        }
    }
    return false;
}
