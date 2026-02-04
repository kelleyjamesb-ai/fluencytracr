#!/usr/bin/env ts-node
import { AddressInfo } from "net";
import { app } from "../backend/src/app";
import { runInference } from "../backend/src/inference/run_inference";
import { store } from "../backend/src/store";
import {
  enforceV1EvaluationDecision,
  type EvaluationDecisionInput
} from "../backend/src/v1/evaluationDecision";

type CohortConfig = {
  label: string;
  workflowId: string;
  cardinality: number;
  daySpan: number;
  dispositionPattern?: string[];
  verificationRate?: number;
  riskClass?: "low" | "medium" | "high";
};

const now = new Date();

const buildDispositionEvent = (
  workflowId: string,
  dayOffset: number,
  overrides: Partial<{
    disposition: string;
    editDistanceBucket: "none" | "light" | "heavy";
    verificationPresent: boolean;
    riskClass: "low" | "medium" | "high";
    timeToActionMs: number;
  }> = {}
) => {
  const timestamp = new Date(now.getTime());
  timestamp.setDate(now.getDate() - dayOffset);
  timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 60));
  return {
    event_type: "ai_output_disposition" as const,
    timestamp: timestamp.toISOString(),
    risk_class: overrides.riskClass ?? "medium",
    org_unit: `org:cohort:${workflowId}`,
    workflow_id: workflowId,
    disposition: overrides.disposition ?? "accepted",
    edit_distance_bucket: overrides.editDistanceBucket ?? "none",
    verification_present: overrides.verificationPresent ?? true,
    time_to_action_ms: overrides.timeToActionMs ?? 120000
  };
};

const buildEventsForCohort = (config: CohortConfig) => {
  const events = [];
  const dispositions = config.dispositionPattern ?? ["accepted"];
  for (let day = 0; day < config.daySpan; day++) {
    for (let instance = 0; instance < config.cardinality; instance++) {
      const disposition = dispositions[(day + instance) % dispositions.length];
      events.push(
        buildDispositionEvent(config.workflowId, day, {
          disposition,
          editDistanceBucket: disposition === "accepted" ? "none" : "light",
          verificationPresent: Math.random() < (config.verificationRate ?? 0.9),
          riskClass: config.riskClass ?? "medium"
        })
      );
    }
  }
  return events;
};

const startServer = async () => {
  const listener = await new Promise<{ server: ReturnType<typeof app.listen>; port: number }>(
    (resolve) => {
      const server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        resolve({ server, port: address.port });
      });
    }
  );
  return {
    url: `http://127.0.0.1:${listener.port}`,
    close: () => listener.server.close()
  };
};

const ingestEvents = async (url: string, events: unknown[]) => {
  const response = await fetch(`${url}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-role": "ADMIN",
      "X-FluencyTracr-Schema-Version": "0.1"
    },
    body: JSON.stringify({ events })
  });
  if (!response.ok) {
    throw new Error(`Ingestion failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<{ ingested: number }>;
};

const queryPatterns = async (url: string) => {
  const response = await fetch(`${url}/api/patterns?window=60d&scope=org`, {
    headers: {
      "x-role": "EXEC_VIEWER"
    }
  });
  return response.json() as Promise<{ cohort_size: number; patterns: any[] }>;
};

const queryCoverage = async (url: string) => {
  const response = await fetch(`${url}/api/coverage?window=60d&scope=org`, {
    headers: {
      "x-role": "EXEC_VIEWER"
    }
  });
  return response.json() as Promise<{ coverage: any }>;
};

const evaluationInputs: { label: string; input: EvaluationDecisionInput }[] = [
  {
    label: "healthy",
    input: {
      schema_version: "FT_V1_2026_01",
      artifact_name: "FT_V1_EVALUATION_DECISION",
      org_id: "org:demo",
      function_id: "function:eng",
      role_class: "executive",
      window_id: "2025-12-01__2026-01-30",
      window_length_days: 60,
      ambiguity_flag: false,
      behavioral_classes_present: 3,
      positive_evidence_present: true,
      ghost_use_candidate: false,
      candidate_decision: "SURFACE"
    }
  },
  {
    label: "suppressed (low diversity)",
    input: {
      schema_version: "FT_V1_2026_01",
      artifact_name: "FT_V1_EVALUATION_DECISION",
      org_id: "org:demo",
      function_id: "function:eng",
      role_class: "executive",
      window_id: "2025-12-01__2026-01-30",
      window_length_days: 60,
      ambiguity_flag: false,
      behavioral_classes_present: 1,
      positive_evidence_present: true,
      ghost_use_candidate: false
    }
  },
  {
    label: "low coverage",
    input: {
      schema_version: "FT_V1_2026_01",
      artifact_name: "FT_V1_EVALUATION_DECISION",
      org_id: "org:demo",
      function_id: "function:eng",
      role_class: "executive",
      window_id: "2026-01-01__2026-01-30",
      window_length_days: 30,
      ambiguity_flag: false,
      behavioral_classes_present: 2,
      positive_evidence_present: false,
      ghost_use_candidate: true
    }
  }
];

const main = async () => {
  const server = await startServer();
  console.log("[INFO] Backend server available at", server.url);

  const cohorts: CohortConfig[] = [
    {
      label: "healthy",
      workflowId: "cohort-healthy",
      cardinality: 4,
      daySpan: 20,
      dispositionPattern: ["accepted"],
      verificationRate: 0.95,
      riskClass: "medium"
    },
    {
      label: "suppressed",
      workflowId: "cohort-suppressed",
      cardinality: 3,
      daySpan: 15,
      dispositionPattern: ["accepted", "edited"],
      verificationRate: 0.6,
      riskClass: "medium"
    },
    {
      label: "low-coverage",
      workflowId: "cohort-low",
      cardinality: 2,
      daySpan: 3,
      dispositionPattern: ["edited"],
      verificationRate: 0.2,
      riskClass: "high"
    }
  ];

  const events = cohorts.flatMap(buildEventsForCohort);

  console.log("[INFO] Submitting", events.length, "synthetic events via POST /api/events");
  const ingestionResult = await ingestEvents(server.url, events);
  console.log("[INFO] Ingested event count:", ingestionResult.ingested);

  runInference(["60d"]);
  console.log("[INFO] Inference run completed (window=60d). Records created:", store.patternInferenceRecords.length);

  const recordsByCohort = new Map<string, typeof store.patternInferenceRecords>();
  store.patternInferenceRecords.forEach((record) => {
    const workflowId = record.scope_key.split(":")[0];
    const list = recordsByCohort.get(workflowId) ?? [];
    list.push(record);
    recordsByCohort.set(workflowId, list);
  });

  for (const cohort of cohorts) {
    const records = (recordsByCohort.get(cohort.workflowId) ?? []).filter(
      (record) => record.scope_type === "WORKFLOW_RISK"
    );
    const latest = records.sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0];
    if (!latest) {
      console.warn(`[WARN] No inference records for ${cohort.label}`);
      continue;
    }
    console.log(
      `[SUMMARY] [${cohort.label}] pattern=${latest.pattern} confidence=${latest.confidence_level} coverage=${latest.coverage_days} evidence=${latest.evidence_count} withheld=${latest.confidence_level === "WITHHOLD"}`
    );
    if (latest.confidence_level === "WITHHOLD") {
      console.log(`  reason hints: ${latest.top_drivers.join(", ")}`);
    }
  }

  const patternPayload = await queryPatterns(server.url);
  console.log("[INFO] /api/patterns response cohort_size =", patternPayload.cohort_size);
  console.log("[INFO] /api/patterns patterns:", patternPayload.patterns?.map((p: any) => p.pattern_name) ?? "none");

  const coveragePayload = await queryCoverage(server.url);
  console.log("[INFO] /api/coverage coverage =", coveragePayload.coverage);

  evaluationInputs.forEach(({ label, input }) => {
    const decision = enforceV1EvaluationDecision(input);
    console.log(
      `[EVAL] ${label} -> decision=${decision.decision} renderable=${decision.renderable} ${
        decision.suppress_reason_code ? `reason=${decision.suppress_reason_code}` : ""
      }`
    );
  });

  server.close();
};

main().catch((err) => {
  console.error("[ERROR] Synthetic ingestion test failed:", err);
  process.exit(1);
});
