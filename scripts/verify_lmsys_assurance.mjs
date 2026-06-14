#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildAssuranceCases } from "./seed_lmsys_assurance_transform.mjs";
import {
  backendUrlFromEnv,
  ensureOrg,
  fetchJson,
  orgIdFromEvent,
  postEventsGroupedByOrg,
  requestHeaders
} from "./seed_lmsys.mjs";
import { resolvedBackendExecutionId } from "./seed_lmsys_transform.mjs";

const SOURCE_DATASET = "lmsys/lmsys-chat-1m";
const REPORT_PATH = resolve(process.cwd(), "scripts/assurance-report.md");
const EXPECTED_PATTERNS = [
  "Calibrated Fluency",
  "Blind Efficiency",
  "Recovery Maturity",
  "Friction Loop",
  "Undertrust Avoidance"
];
const PREVALENCE_BANDS = new Set(["LOW", "MODERATE", "HIGH"]);
const GHOST_USE_CHECK_IDS = new Set([
  "ghost_use_residual_fires",
  "ghost_use_bypassed_by_positive_evidence",
  "ghost_use_suppressed_by_ambiguity",
  "ghost_use_does_not_persist"
]);
const GHOST_USE_JUDGMENT_TERMS = [
  "resistance",
  "underperformance",
  "lack of fluency"
];
const RELIABILITY_COMPONENT_KEYS = [
  "abandonment_rate",
  "friction_loop_rate",
  "recovery_success_rate",
  "verification_presence_rate"
];

function pass(id, detail = {}) {
  return { id, ...detail, status: "PASS" };
}

function fail(id, detail = {}) {
  return { id, ...detail, status: "FAIL" };
}

function uniqueOrgIds(cases) {
  const ids = new Set();
  for (const entry of cases) {
    if (entry.org_id) {
      ids.add(entry.org_id);
    }
    for (const event of entry.events ?? []) {
      ids.add(orgIdFromEvent(event));
    }
  }
  return [...ids].sort();
}

function normalizePattern(value) {
  const raw = String(value ?? "").trim();
  const byMachine = {
    CALIBRATED_FLUENCY: "Calibrated Fluency",
    BLIND_EFFICIENCY: "Blind Efficiency",
    RECOVERY_MATURITY: "Recovery Maturity",
    FRICTION_LOOP: "Friction Loop",
    UNDERTRUST_AVOIDANCE: "Undertrust Avoidance"
  };
  return byMachine[raw] ?? raw;
}

function firstExecutionId(events) {
  const first = events.find((event) => resolvedBackendExecutionId(event));
  return first ? resolvedBackendExecutionId(first) : null;
}

async function postInvalidPayload(backendUrl, orgId, payload) {
  const url = new URL("/api/events", backendUrl);
  return fetchJson(url, {
    method: "POST",
    headers: requestHeaders(orgId),
    body: JSON.stringify(payload)
  });
}

async function getReconstructedByWorkflow(backendUrl, orgId, workflowId) {
  const url = new URL("/api/traces/reconstructed", backendUrl);
  url.searchParams.set("workflow_id", workflowId);
  url.searchParams.set("include_signals", "true");
  url.searchParams.set("baseline_window", "90d");
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function getReconstructedByExecution(backendUrl, orgId, executionId) {
  const url = new URL("/api/traces/reconstructed", backendUrl);
  url.searchParams.set("execution_id", executionId);
  url.searchParams.set("include_signals", "true");
  url.searchParams.set("baseline_window", "90d");
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function getObservability(backendUrl, orgId) {
  const url = new URL(`/api/observability/${encodeURIComponent(orgId)}`, backendUrl);
  url.searchParams.set("window", "60d");
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function getAuditLog(backendUrl, orgId) {
  const url = new URL(`/orgs/${encodeURIComponent(orgId)}/suppression-audit-log`, backendUrl);
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function getPatternsEndpoint(backendUrl, orgId) {
  const url = new URL("/api/patterns", backendUrl);
  url.searchParams.set("window", "60d");
  url.searchParams.set("scope", "org");
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function getBoardSnapshot(backendUrl, orgId) {
  const url = new URL(`/api/board-snapshot/${encodeURIComponent(orgId)}`, backendUrl);
  url.searchParams.set("window", "60d");
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function getCoverageEndpoint(backendUrl, orgId) {
  const url = new URL("/api/coverage", backendUrl);
  url.searchParams.set("window", "60d");
  url.searchParams.set("scope", "org");
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

async function postOutcomeEvidence(backendUrl, orgId, payload) {
  const url = new URL("/api/v1/outcome-evidence", backendUrl);
  return fetchJson(url, {
    method: "POST",
    headers: requestHeaders(orgId),
    body: JSON.stringify(payload)
  });
}

async function getOutcomeEvidence(backendUrl, orgId, payload) {
  const url = new URL("/api/v1/outcome-evidence", backendUrl);
  url.searchParams.set("workflow_id", payload.workflow_id);
  url.searchParams.set("period_start", payload.period_start);
  url.searchParams.set("period_end", payload.period_end);
  return fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
}

function findWorkflow(observabilityBody, workflowId) {
  return (observabilityBody?.workflows ?? []).find((workflow) => workflow.workflow_id === workflowId) ?? null;
}

function collectPatternsFromTraceBodies(traceResponses) {
  const observed = new Set();
  for (const res of traceResponses) {
    for (const trace of res.body?.traces ?? []) {
      const pattern = normalizePattern(trace?.pattern ?? trace?.classification?.pattern ?? trace?.outcome?.pattern);
      if (EXPECTED_PATTERNS.includes(pattern)) {
        observed.add(pattern);
      }
    }
  }
  return observed;
}

function prevalenceValuesAreCategorical(observabilityBody) {
  const violations = [];
  for (const workflow of observabilityBody?.workflows ?? []) {
    const distribution = workflow.pattern_distribution;
    if (!distribution) {
      continue;
    }
    if (Array.isArray(distribution)) {
      for (const row of distribution) {
        const value = row.prevalence_band ?? row.prevalence ?? row.value ?? row.share ?? row.count;
        if (!PREVALENCE_BANDS.has(String(value))) {
          violations.push({ workflow_id: workflow.workflow_id, pattern: row.pattern, value });
        }
      }
      continue;
    }
    for (const [pattern, value] of Object.entries(distribution)) {
      if (!PREVALENCE_BANDS.has(String(value))) {
        violations.push({ workflow_id: workflow.workflow_id, pattern, value });
      }
    }
  }
  return violations;
}

function boundedNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function reliabilityComponentsValid(components) {
  if (components === null || typeof components !== "object" || Array.isArray(components)) {
    return false;
  }
  return RELIABILITY_COMPONENT_KEYS.every((key) => boundedNumber(components[key]));
}

function reliabilityMatchesExpected(row, entry) {
  if (!row) {
    return { ok: false, reason: "workflow_not_found" };
  }
  if (row.disclosure === "SUPPRESSED") {
    return {
      ok: row.reliability_factor === null && row.reliability_components === null,
      reason: "suppressed_rows_must_null_reliability_fields"
    };
  }
  const factorValid = boundedNumber(row.reliability_factor);
  const componentsValid = reliabilityComponentsValid(row.reliability_components);
  if (!factorValid || !componentsValid) {
    return { ok: false, reason: "surface_rows_require_bounded_reliability_fields" };
  }
  if (typeof entry.expected?.reliability_factor === "number") {
    const delta = Math.abs(row.reliability_factor - entry.expected.reliability_factor);
    if (delta > 0.001) {
      return { ok: false, reason: "factor_mismatch", delta };
    }
  }
  for (const key of RELIABILITY_COMPONENT_KEYS) {
    const expectedValue = entry.expected?.reliability_components?.[key];
    if (typeof expectedValue === "number") {
      const delta = Math.abs(row.reliability_components[key] - expectedValue);
      if (delta > 0.001) {
        return { ok: false, reason: `component_mismatch:${key}`, delta };
      }
    }
  }
  return { ok: true, reason: "matched" };
}

function suppressionAuditMatches(logs, suppressedWorkflows) {
  const serializedLogs = JSON.stringify(logs ?? []).toLowerCase();
  return suppressedWorkflows.filter((workflowId) => {
    const workflowHit = serializedLogs.includes(workflowId.toLowerCase());
    const suppressionHit = serializedLogs.includes("suppression") || serializedLogs.includes("suppressed");
    return !(workflowHit && suppressionHit);
  });
}

function bodySlice(value, max = 1200) {
  const serialized = JSON.stringify(value);
  if (serialized.length <= max) {
    return value;
  }
  return `${serialized.slice(0, max)}...`;
}

function containsAnyTerm(value, terms) {
  const serialized = JSON.stringify(value ?? "").toLowerCase();
  return terms.some((term) => serialized.includes(term));
}

function isIdentifierPath(path) {
  return /\.(workflow_id|run_id|execution_id|id)$/.test(path);
}

function collectGhostUseSurfacing(value, workflowId, path = "$", hits = []) {
  if (value === null || value === undefined) {
    return hits;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const mentionsGhostUse =
      normalized.includes("ghost_use") ||
      normalized.includes("ghost-use") ||
      normalized.includes("ghost use") ||
      normalized.includes("no observed ai evidence") ||
      normalized.includes("no positive ai evidence");
    if (mentionsGhostUse && !isIdentifierPath(path)) {
      hits.push({ path, value });
    }
    return hits;
  }

  if (typeof value === "boolean" && path.toLowerCase().endsWith(".ghost_use_evaluated") && value === true) {
    hits.push({ path, value });
    return hits;
  }

  if (typeof value !== "object") {
    return hits;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectGhostUseSurfacing(entry, workflowId, `${path}[${index}]`, hits));
    return hits;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key === "ghost_use_evaluated" && entry === true) {
      hits.push({ path: `${path}.${key}`, value: entry });
      continue;
    }
    collectGhostUseSurfacing(entry, workflowId, `${path}.${key}`, hits);
  }
  return hits;
}

function collectExplicitGateEvidence(value, workflowId, terms, path = "$", hits = []) {
  if (value === null || value === undefined) {
    return hits;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const mentionsTerm = terms.some((term) => normalized.includes(term));
    if (mentionsTerm && !isIdentifierPath(path)) {
      hits.push({ path, value });
    }
    return hits;
  }

  if (typeof value === "boolean") {
    const normalizedPath = path.toLowerCase();
    const mentionsTerm = terms.some((term) => normalizedPath.includes(term.replaceAll(" ", "_")));
    if (mentionsTerm) {
      hits.push({ path, value });
    }
    return hits;
  }

  if (typeof value !== "object") {
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectExplicitGateEvidence(entry, workflowId, terms, `${path}[${index}]`, hits));
    return hits;
  }
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (terms.some((term) => normalizedKey.includes(term.replaceAll(" ", "_")))) {
      hits.push({ path: `${path}.${key}`, value: entry });
    }
    collectExplicitGateEvidence(entry, workflowId, terms, `${path}.${key}`, hits);
  }
  return hits;
}

function summarizeReadAttempt(name, res, workflowId) {
  let body = res.body;
  if (name === "observability") {
    body = findWorkflow(res.body, workflowId) ?? {
      org_id: res.body?.org_id,
      workflow_count: res.body?.workflows?.length ?? 0
    };
  } else if (name === "board_snapshot") {
    body = (res.body?.workflows ?? []).find((workflow) => workflow.workflow_id === workflowId) ?? {
      org_id: res.body?.org_id,
      header: res.body?.header,
      workflow_count: res.body?.workflows?.length ?? 0
    };
  }
  return {
    endpoint: name,
    status: res.response.status,
    body: bodySlice(body)
  };
}

async function readGhostUseSurfaces(backendUrl, orgId, workflowId) {
  const attempts = [];
  const observability = await getObservability(backendUrl, orgId);
  attempts.push({ name: "observability", res: observability });
  const patterns = await getPatternsEndpoint(backendUrl, orgId);
  attempts.push({ name: "patterns", res: patterns });
  const board = await getBoardSnapshot(backendUrl, orgId);
  attempts.push({ name: "board_snapshot", res: board });
  const coverage = await getCoverageEndpoint(backendUrl, orgId);
  attempts.push({ name: "coverage", res: coverage });

  const bodies = attempts.map((attempt) => attempt.res.body);
  return {
    attempts,
    ghost_hits: bodies.flatMap((body, index) =>
      collectGhostUseSurfacing(body, workflowId).map((hit) => ({
        endpoint: attempts[index].name,
        path: hit.path,
        value: hit.value
      }))
    ),
    summaries: attempts.map((attempt) => summarizeReadAttempt(attempt.name, attempt.res, workflowId))
  };
}

function markdownReport({ backendUrl, runLabel, checks, verdictLine }) {
  const rows = checks
    .map((check) => {
      const detail = { ...check };
      delete detail.id;
      delete detail.status;
      return `| ${check.status} | \`${check.id}\` | ${JSON.stringify(detail)} |`;
    })
    .join("\n");

  return [
    "# LMSYS Data-Assurance Verification Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source dataset: ${SOURCE_DATASET}`,
    `Backend: ${backendUrl}`,
    `Assurance run: ${runLabel}`,
    "",
    "| Status | Check | Detail |",
    "| --- | --- | --- |",
    rows,
    "",
    verdictLine,
    ""
  ].join("\n");
}

async function main() {
  const backendUrl = backendUrlFromEnv();
  const runLabel = process.env.ASSURANCE_RUN_ID ?? `verify-${Date.now().toString(36)}`;
  const cases = buildAssuranceCases({ runLabel });
  const checks = [];

  for (const orgId of uniqueOrgIds(cases)) {
    await ensureOrg({ backendUrl, orgId, name: `LMSYS Assurance ${orgId}` });
  }

  const validEvents = cases.flatMap((entry) => entry.events ?? []);
  const posted = await postEventsGroupedByOrg({ backendUrl, events: validEvents });
  checks.push(pass("seed_valid_assurance_events", posted));

  const piiCase = cases.find((entry) => entry.id === "pii_boundary_rejection");
  const piiStatuses = [];
  for (const payload of piiCase?.invalid_payloads ?? []) {
    const res = await postInvalidPayload(backendUrl, piiCase.org_id, payload);
    piiStatuses.push(res.response.status);
  }
  checks.push(
    piiStatuses.length > 0 && piiStatuses.every((status) => status >= 400 && status < 500)
      ? pass("pii_probes_rejected_at_boundary", { statuses: piiStatuses })
      : fail("pii_probes_rejected_at_boundary", { statuses: piiStatuses })
  );

  const assuranceOrgId = cases.find((entry) => entry.id === "sub_threshold_workflow")?.org_id;
  const observability = await getObservability(backendUrl, assuranceOrgId);
  checks.push(
    observability.response.ok
      ? pass("observability_endpoint_read", { status: observability.response.status })
      : fail("observability_endpoint_read", { status: observability.response.status, body: observability.body })
  );

  const subThreshold = cases.find((entry) => entry.id === "sub_threshold_workflow");
  const subThresholdRow = findWorkflow(observability.body, subThreshold.workflow_id);
  checks.push(
    subThresholdRow?.disclosure === "SUPPRESSED"
      ? pass("sub_threshold_cohort_suppressed", {
          workflow_id: subThreshold.workflow_id,
          disclosure: subThresholdRow.disclosure,
          suppression_reasons: subThresholdRow.suppression_reasons
        })
      : fail("sub_threshold_cohort_suppressed", {
          workflow_id: subThreshold.workflow_id,
          row: subThresholdRow
        })
  );

  const patternCases = cases.filter((entry) => entry.expected?.pattern);
  const traceResponses = [];
  for (const entry of patternCases) {
    const res = await getReconstructedByWorkflow(backendUrl, entry.org_id, entry.workflow_id);
    traceResponses.push(res);
    checks.push(
      res.response.ok
        ? pass(`trace_read_${entry.id}`, { status: res.response.status, traces: res.body?.traces?.length ?? 0 })
        : fail(`trace_read_${entry.id}`, { status: res.response.status, body: res.body })
    );
  }
  const observedPatterns = collectPatternsFromTraceBodies(traceResponses);
  const missingPatterns = EXPECTED_PATTERNS.filter((pattern) => !observedPatterns.has(pattern));
  checks.push(
    missingPatterns.length === 0
      ? pass("all_five_classification_patterns_observed", { observed: [...observedPatterns].sort() })
      : fail("all_five_classification_patterns_observed", {
          observed: [...observedPatterns].sort(),
          missing: missingPatterns
        })
  );

  const duplicate = cases.find((entry) => entry.id === "duplicate_execution_ids_across_orgs");
  const duplicateExecutionId = firstExecutionId(duplicate.events);
  const tenantA = await getReconstructedByExecution(backendUrl, "lmsys-org-tenant-a", duplicateExecutionId);
  const tenantB = await getReconstructedByExecution(backendUrl, "lmsys-org-tenant-b", duplicateExecutionId);
  const tenantACount = tenantA.body?.traces?.length ?? 0;
  const tenantBCount = tenantB.body?.traces?.length ?? 0;
  checks.push(
    tenantA.response.ok && tenantB.response.ok && tenantACount === 1 && tenantBCount === 1
      ? pass("duplicate_execution_ids_isolated_by_org", {
          execution_id: duplicateExecutionId,
          tenant_a_traces: tenantACount,
          tenant_b_traces: tenantBCount
        })
      : fail("duplicate_execution_ids_isolated_by_org", {
          execution_id: duplicateExecutionId,
          tenant_a_status: tenantA.response.status,
          tenant_a_traces: tenantACount,
          tenant_b_status: tenantB.response.status,
          tenant_b_traces: tenantBCount
        })
  );

  const audit = await getAuditLog(backendUrl, assuranceOrgId);
  const suppressedWorkflowIds = (observability.body?.workflows ?? [])
    .filter((workflow) => workflow.disclosure === "SUPPRESSED")
    .map((workflow) => workflow.workflow_id);
  const missingAuditWorkflows = suppressionAuditMatches(audit.body?.logs ?? [], suppressedWorkflowIds);
  checks.push(
    audit.response.ok && missingAuditWorkflows.length === 0
      ? pass("audit_log_entries_exist_for_each_suppression", { suppressed_workflows: suppressedWorkflowIds })
      : fail("audit_log_entries_exist_for_each_suppression", {
          status: audit.response.status,
          suppressed_workflows: suppressedWorkflowIds,
          missing_audit_workflows: missingAuditWorkflows,
          audit_log_count: audit.body?.logs?.length ?? 0
        })
  );

  const prevalenceViolations = prevalenceValuesAreCategorical(observability.body);
  checks.push(
    prevalenceViolations.length === 0
      ? pass("prevalence_values_are_categorical", { allowed_values: [...PREVALENCE_BANDS] })
      : fail("prevalence_values_are_categorical", { violations: prevalenceViolations.slice(0, 10) })
  );

  const reliabilityCases = cases.filter((entry) => entry.reliability_factor_manifest);
  for (const entry of reliabilityCases) {
    const row = findWorkflow(observability.body, entry.workflow_id);
    const match = reliabilityMatchesExpected(row, entry);
    checks.push(
      match.ok
        ? pass(entry.id, {
            workflow_id: entry.workflow_id,
            disclosure: row?.disclosure,
            reliability_factor: row?.reliability_factor ?? null
          })
        : fail(entry.id, {
            workflow_id: entry.workflow_id,
            expected: entry.expected,
            reason: match.reason,
            delta: match.delta,
            row: bodySlice(row)
          })
    );
  }

  const outcomeEvidenceCases = cases.filter((entry) => entry.outcome_evidence_manifest);
  for (const entry of outcomeEvidenceCases) {
    for (const payload of entry.outcome_evidence ?? []) {
      const postedOutcome = await postOutcomeEvidence(backendUrl, entry.org_id, payload);
      checks.push(
        postedOutcome.response.ok
          ? pass(`post_${entry.id}`, { workflow_id: entry.workflow_id, status: postedOutcome.response.status })
          : fail(`post_${entry.id}`, {
              workflow_id: entry.workflow_id,
              status: postedOutcome.response.status,
              body: postedOutcome.body
            })
      );
    }

    const queryPayload =
      entry.outcome_evidence?.[0] ?? {
        workflow_id: entry.workflow_id,
        period_start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };
    const replay = await getOutcomeEvidence(backendUrl, entry.org_id, queryPayload);
    const outcomeCount = replay.body?.outcome_evidence?.length ?? 0;
    checks.push(
      replay.response.ok &&
        replay.body?.verdict === entry.expected?.outcome_verdict &&
        outcomeCount === entry.expected?.outcome_count
        ? pass(entry.id, {
            workflow_id: entry.workflow_id,
            verdict: replay.body.verdict,
            outcome_count: outcomeCount
          })
        : fail(entry.id, {
            workflow_id: entry.workflow_id,
            expected: entry.expected,
            status: replay.response.status,
            body: bodySlice(replay.body)
          })
    );
  }

  const ghostUseCases = cases.filter((entry) => GHOST_USE_CHECK_IDS.has(entry.id));
  const allGhostHits = [];
  for (const entry of ghostUseCases) {
    const surfaces = await readGhostUseSurfaces(backendUrl, entry.org_id, entry.workflow_id);
    allGhostHits.push(...surfaces.ghost_hits);
    const hasJudgmentLanguage = containsAnyTerm(surfaces.ghost_hits, GHOST_USE_JUDGMENT_TERMS);

    if (entry.id === "ghost_use_residual_fires") {
      checks.push(
        surfaces.ghost_hits.length > 0 && !hasJudgmentLanguage
          ? pass(entry.id, { workflow_id: entry.workflow_id, ghost_use_surfacings: surfaces.ghost_hits.length })
          : fail(entry.id, {
              workflow_id: entry.workflow_id,
              expected: "ghost-use residual surfaces as observability-only pattern",
              ghost_use_surfacings: surfaces.ghost_hits.length,
              judgment_language_detected: hasJudgmentLanguage,
              read_attempts: surfaces.summaries
            })
      );
      continue;
    }

    if (entry.id === "ghost_use_bypassed_by_positive_evidence") {
      const bypassEvidence = surfaces.attempts.flatMap((attempt) =>
        collectExplicitGateEvidence(attempt.res.body, entry.workflow_id, [
          "positive_evidence_present",
          "positive evidence",
          "hard-bypass",
          "hard bypass"
        ])
      );
      checks.push(
        surfaces.ghost_hits.length === 0 && bypassEvidence.length > 0
          ? pass(entry.id, { workflow_id: entry.workflow_id, bypass_evidence: bypassEvidence.length })
          : fail(entry.id, {
              workflow_id: entry.workflow_id,
              expected: "ghost-use not surfaced and positive-evidence hard-bypass is observable",
              ghost_use_surfacings: surfaces.ghost_hits.length,
              bypass_evidence: bypassEvidence.length,
              read_attempts: surfaces.summaries
            })
      );
      continue;
    }

    if (entry.id === "ghost_use_suppressed_by_ambiguity") {
      const ambiguityEvidence = surfaces.attempts.flatMap((attempt) =>
        collectExplicitGateEvidence(attempt.res.body, entry.workflow_id, [
          "ambiguity",
          "high_ambiguity",
          "supp_ambiguity_present",
          "suppressed by ambiguity"
        ])
      );
      checks.push(
        surfaces.ghost_hits.length === 0 && ambiguityEvidence.length > 0
          ? pass(entry.id, { workflow_id: entry.workflow_id, ambiguity_evidence: ambiguityEvidence.length })
          : fail(entry.id, {
              workflow_id: entry.workflow_id,
              expected: "ghost-use evaluation suppressed by ambiguity-dominant window",
              ghost_use_surfacings: surfaces.ghost_hits.length,
              ambiguity_evidence: ambiguityEvidence.length,
              read_attempts: surfaces.summaries
            })
      );
      continue;
    }

    const persistenceEvidence = surfaces.attempts.flatMap((attempt) =>
      collectExplicitGateEvidence(attempt.res.body, entry.workflow_id, [
        "persist",
        "required windows",
        "no_convergence",
        "not_adjacent_windows",
        "adjacent"
      ])
    );
    checks.push(
      surfaces.ghost_hits.length === 0 && persistenceEvidence.length > 0
        ? pass(entry.id, { workflow_id: entry.workflow_id, persistence_evidence: persistenceEvidence.length })
        : fail(entry.id, {
            workflow_id: entry.workflow_id,
            expected: "ghost-use not surfaced because persistence gate is not met",
            ghost_use_surfacings: surfaces.ghost_hits.length,
            persistence_evidence: persistenceEvidence.length,
            read_attempts: surfaces.summaries
          })
    );
  }

  const judgmentHits = allGhostHits.filter((hit) => containsAnyTerm(hit.value, GHOST_USE_JUDGMENT_TERMS));
  checks.push(
    judgmentHits.length === 0
      ? pass("ghost_use_framed_as_observability_only", {
          ghost_use_surfacings_inspected: allGhostHits.length,
          forbidden_terms: GHOST_USE_JUDGMENT_TERMS
        })
      : fail("ghost_use_framed_as_observability_only", {
          forbidden_terms: GHOST_USE_JUDGMENT_TERMS,
          violations: judgmentHits.slice(0, 10).map((hit) => ({
            endpoint: hit.endpoint,
            path: hit.path,
            value: bodySlice(hit.value, 400)
          }))
        })
  );

  const patternsEndpoint = await getPatternsEndpoint(backendUrl, assuranceOrgId);
  checks.push(
    patternsEndpoint.response.ok || patternsEndpoint.response.status === 400
      ? pass("patterns_endpoint_read_attempted", {
          status: patternsEndpoint.response.status,
          body_summary: patternsEndpoint.response.ok ? "ok" : patternsEndpoint.body?.error
        })
      : fail("patterns_endpoint_read_attempted", {
          status: patternsEndpoint.response.status,
          body: patternsEndpoint.body
        })
  );

  const failed = checks.filter((check) => check.status !== "PASS");
  const status = failed.length === 0 ? "PASS" : "FAIL";
  const verdictLine = `FluencyTracr operates as a data-assurance layer: ${status === "PASS" ? "YES" : "NO"}`;
  await writeFile(REPORT_PATH, markdownReport({ backendUrl, runLabel, checks, verdictLine }), "utf8");

  console.log(
    JSON.stringify(
      {
        status,
        backend_url: backendUrl,
        run_label: runLabel,
        report_path: REPORT_PATH,
        verdict_line: verdictLine,
        checks
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "FAIL", error: error.message }, null, 2));
  process.exit(1);
});
