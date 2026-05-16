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

function suppressionAuditMatches(logs, suppressedWorkflows) {
  const serializedLogs = JSON.stringify(logs ?? []).toLowerCase();
  return suppressedWorkflows.filter((workflowId) => {
    const workflowHit = serializedLogs.includes(workflowId.toLowerCase());
    const suppressionHit = serializedLogs.includes("suppression") || serializedLogs.includes("suppressed");
    return !(workflowHit && suppressionHit);
  });
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
