#!/usr/bin/env node
import { buildAssuranceCases } from "./seed_lmsys_assurance_transform.mjs";
import {
  stableHash,
  transformLmsysConversationToCanonicalEvents
} from "./seed_lmsys_transform.mjs";

const SOURCE_DATASET = "lmsys/lmsys-chat-1m";

function env(name) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function headers(adminToken) {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${adminToken}`,
    "x-role": "ADMIN",
    "X-FluencyTracr-Schema-Version": "0.1"
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }
  return { response, body };
}

function normalizePattern(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pass(id, detail = {}) {
  return { id, status: "PASS", ...detail };
}

function fail(id, detail = {}) {
  return { id, status: "FAIL", ...detail };
}

function assertNoRawContent(payload) {
  const serialized = JSON.stringify(payload);
  const forbidden = ["content", "hello", "private", "hashed_ip", "192.0.2.1", "alice@example.com"];
  const leaked = forbidden.filter((token) => serialized.includes(token));
  return leaked;
}

function localChecks() {
  const checks = [];
  const record = {
    conversation_id: "verify-conv",
    model: "vicuna-13b",
    language: "English",
    tstamp: 1700000000,
    ip: "192.0.2.1",
    hashed_ip: "hash",
    redacted: true,
    conversation: [
      { role: "user", content: "hello", turn: 0 },
      { role: "assistant", content: "private", turn: 0 }
    ],
    openai_moderation: [{ flagged: false }, { flagged: true }]
  };
  const events = transformLmsysConversationToCanonicalEvents(record);
  const leaked = assertNoRawContent(events);
  checks.push(
    leaked.length === 0
      ? pass("local_transform_strips_raw_content", { event_count: events.length })
      : fail("local_transform_strips_raw_content", { leaked })
  );
  checks.push(
    events[0]?.org_id === `lmsys-org-${stableHash("English", 16)}`
      ? pass("local_transform_stable_org_hash")
      : fail("local_transform_stable_org_hash", { actual: events[0]?.org_id })
  );
  checks.push(
    events.every((event) => event.timestamp && !("event_timestamp" in event))
      ? pass("local_transform_matches_repo_canonical_timestamp_field")
      : fail("local_transform_matches_repo_canonical_timestamp_field")
  );
  checks.push(
    buildAssuranceCases().length === 8
      ? pass("local_assurance_generates_requested_cases")
      : fail("local_assurance_generates_requested_cases")
  );
  return checks;
}

async function postBatch(backendUrl, adminToken, events) {
  const url = new URL("/api/events", backendUrl);
  return fetchJson(url, {
    method: "POST",
    headers: headers(adminToken),
    body: JSON.stringify({ events })
  });
}

async function postRaw(backendUrl, adminToken, payload) {
  const url = new URL("/api/events", backendUrl);
  return fetchJson(url, {
    method: "POST",
    headers: headers(adminToken),
    body: JSON.stringify(payload)
  });
}

async function reconstructed(backendUrl, adminToken, executionId) {
  const url = new URL("/api/traces/reconstructed", backendUrl);
  url.searchParams.set("execution_id", executionId);
  url.searchParams.set("include_signals", "true");
  return fetchJson(url, {
    method: "GET",
    headers: headers(adminToken)
  });
}

async function observability(backendUrl, adminToken, orgId) {
  const url = new URL(`/api/observability/${encodeURIComponent(orgId)}`, backendUrl);
  return fetchJson(url, {
    method: "GET",
    headers: headers(adminToken)
  });
}

function firstExecutionId(events) {
  return events.find((event) => typeof event.execution_id === "string")?.execution_id ?? null;
}

function tracePattern(body) {
  const trace = Array.isArray(body?.traces) ? body.traces[0] : null;
  return normalizePattern(trace?.pattern ?? trace?.classification?.pattern ?? trace?.outcome?.pattern);
}

async function runBackendChecks({ backendUrl, adminToken }) {
  const checks = [];
  const cases = buildAssuranceCases();
  const fastCase = cases.find((entry) => entry.id === "fast_completion_no_verification");
  const fastPost = await postBatch(backendUrl, adminToken, fastCase.events);
  if (fastPost.response.ok) {
    checks.push(pass("backend_accepts_canonical_batched_post", { status: fastPost.response.status }));
  } else {
    checks.push(
      fail("backend_accepts_canonical_batched_post", {
        status: fastPost.response.status,
        body: fastPost.body
      })
    );
    return checks;
  }

  const piiCase = cases.find((entry) => entry.id === "pii_boundary_rejection");
  for (let i = 0; i < piiCase.invalid_payloads.length; i += 1) {
    const res = await postRaw(backendUrl, adminToken, piiCase.invalid_payloads[i]);
    checks.push(
      res.response.status >= 400 && res.response.status < 500
        ? pass(`pii_boundary_rejection_${i}`, { status: res.response.status })
        : fail(`pii_boundary_rejection_${i}`, { status: res.response.status, body: res.body })
    );
  }

  for (const entry of cases.filter((item) => Array.isArray(item.events))) {
    if (entry.id === fastCase.id) {
      continue;
    }
    const res = await postBatch(backendUrl, adminToken, entry.events);
    checks.push(
      res.response.ok
        ? pass(`seed_${entry.id}`, { status: res.response.status })
        : fail(`seed_${entry.id}`, { status: res.response.status, body: res.body })
    );
  }

  const patternExpectations = [
    ["fast_completion_no_verification", "BLIND_EFFICIENCY"],
    ["failure_success_recovery_maturity", "RECOVERY_MATURITY"],
    ["iteration_high_threshold_cluster", "FRICTION_LOOP"]
  ];
  for (const [caseId, expected] of patternExpectations) {
    const entry = cases.find((item) => item.id === caseId);
    const executionId = firstExecutionId(entry.events);
    const res = await reconstructed(backendUrl, adminToken, executionId);
    const actual = tracePattern(res.body);
    checks.push(
      res.response.ok && actual === expected
        ? pass(`classification_${caseId}`, { expected, actual })
        : fail(`classification_${caseId}`, {
            expected,
            actual,
            status: res.response.status,
            body: res.body
          })
    );
  }

  const outOfOrder = cases.find((entry) => entry.id === "out_of_order_timestamps");
  const outOfOrderTrace = await reconstructed(backendUrl, adminToken, firstExecutionId(outOfOrder.events));
  checks.push(
    outOfOrderTrace.response.ok && Array.isArray(outOfOrderTrace.body?.traces) && outOfOrderTrace.body.traces.length > 0
      ? pass("out_of_order_timestamps_reconstruct")
      : fail("out_of_order_timestamps_reconstruct", {
          status: outOfOrderTrace.response.status,
          body: outOfOrderTrace.body
        })
  );

  const duplicate = cases.find((entry) => entry.id === "duplicate_execution_ids_across_orgs");
  const duplicateTrace = await reconstructed(backendUrl, adminToken, firstExecutionId(duplicate.events));
  const traceCount = Array.isArray(duplicateTrace.body?.traces) ? duplicateTrace.body.traces.length : 0;
  checks.push(
    duplicateTrace.response.ok && traceCount >= 2
      ? pass("duplicate_execution_ids_across_orgs_isolated", { trace_count: traceCount })
      : fail("duplicate_execution_ids_across_orgs_isolated", {
          trace_count: traceCount,
          status: duplicateTrace.response.status,
          body: duplicateTrace.body
        })
  );

  const noTerminal = cases.find((entry) => entry.id === "no_terminal_event");
  const noTerminalTrace = await reconstructed(backendUrl, adminToken, firstExecutionId(noTerminal.events));
  const noTerminalPattern = tracePattern(noTerminalTrace.body);
  checks.push(
    ["FRICTION_LOOP", "UNDERTRUST_AVOIDANCE"].includes(noTerminalPattern)
      ? pass("no_terminal_event_resolves_to_requested_pattern", { actual: noTerminalPattern })
      : fail("no_terminal_event_resolves_to_requested_pattern", {
          actual: noTerminalPattern || null,
          status: noTerminalTrace.response.status,
          body: noTerminalTrace.body
        })
  );

  const subThreshold = cases.find((entry) => entry.id === "sub_threshold_workflow");
  const subOrg = subThreshold.events[0]?.org_id;
  const obs = await observability(backendUrl, adminToken, subOrg);
  const bodyText = JSON.stringify(obs.body ?? {});
  const suppressed = bodyText.includes("SUPPRESSED") || bodyText.includes("suppressed");
  checks.push(
    obs.response.ok && suppressed
      ? pass("sub_threshold_workflow_suppressed")
      : fail("sub_threshold_workflow_suppressed", { status: obs.response.status, body: obs.body })
  );

  return checks;
}

async function main() {
  const pureOnly = process.argv.includes("--pure");
  const checks = [...localChecks()];
  const backendUrl = env("BACKEND_URL");
  const adminToken = env("ADMIN_TOKEN");
  if (!pureOnly) {
    if (!backendUrl || !adminToken) {
      checks.push(
        fail("backend_env_present", {
          missing: ["BACKEND_URL", "ADMIN_TOKEN"].filter((name) => !env(name))
        })
      );
    } else {
      checks.push(pass("backend_env_present", { backend_url: backendUrl }));
      checks.push(...(await runBackendChecks({ backendUrl, adminToken })));
    }
  }
  const failed = checks.filter((check) => check.status !== "PASS");
  const report = {
    report: "FluencyTracr LMSYS V1 data-assurance verification",
    source_dataset: SOURCE_DATASET,
    generated_at: new Date().toISOString(),
    mode: pureOnly ? "pure" : "backend",
    status: failed.length === 0 ? "PASS" : "FAIL",
    checks
  };
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "FAIL", error: error.message }, null, 2));
  process.exit(1);
});
