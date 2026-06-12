#!/usr/bin/env node
// AI Value MCP server — governed real-data ingestion for the AI Value Platform.
//
// Exposes the existing fail-closed /api/v1/ai-value API as MCP tools so real
// aggregate evidence can flow in from any MCP client (Claude Code, Glean
// agents, customer-side tooling). This server adds NO new write paths: every
// ingestion lands through the same engine-validated endpoints, so invalid,
// person-level, raw-content, or claim-violating payloads are rejected with
// the engine's gap list and never stored. Outcome evidence uploads always
// enter as SUBMITTED; acceptance stays a deliberate human review action.
//
// Run:  node scripts/ai_value_mcp_server.mjs
// Env:  AI_VALUE_API_BASE (default http://localhost:4000)
//       AI_VALUE_ORG      (default org-northstar-enterprise)
//       AI_VALUE_ROLE     (default ADMIN)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.AI_VALUE_API_BASE ?? "http://localhost:4000").replace(/\/+$/, "");
const ORG = process.env.AI_VALUE_ORG ?? "org-northstar-enterprise";
const ROLE = process.env.AI_VALUE_ROLE ?? "ADMIN";

const OBJECT_TYPES = [
  "blueprint",
  "metrics_library",
  "value_scenario",
  "roi_scenario",
  "evidence_readiness",
  "claim_boundary",
  "executive_packet",
  "engagement",
  "fluency_baseline",
  "outcome_evidence_export",
  "data_boundary",
  "value_improvement_loop",
  "value_evidence_case"
];

const ID_FIELDS = {
  blueprint: "blueprint_id",
  metrics_library: "library_id",
  value_scenario: "scenario_id",
  roi_scenario: "roi_scenario_id",
  evidence_readiness: "readiness_id",
  claim_boundary: "claim_boundary_id",
  executive_packet: "packet_id",
  engagement: "engagement_id",
  fluency_baseline: "baseline_id",
  outcome_evidence_export: "export_id",
  data_boundary: "contract_id",
  value_improvement_loop: "improvement_loop_id",
  value_evidence_case: "value_evidence_case_id"
};

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-role": ROLE,
      "x-org-id": ORG
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, ok: response.ok, payload };
}

const asResult = (res) => ({
  content: [
    {
      type: "text",
      text: JSON.stringify({ http_status: res.status, ...((res.payload && typeof res.payload === "object") ? res.payload : { body: res.payload }) }, null, 2)
    }
  ],
  isError: !res.ok
});

const parsePayload = (payload) => {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error(`payload is not valid JSON: ${error.message}`);
  }
};

const server = new McpServer({
  name: "fluencytracr-ai-value",
  version: "1.0.0"
});

server.registerTool(
  "ingest_ai_value_object",
  {
    title: "Ingest a governed AI Value object",
    description:
      "Upsert one AI Value object (aggregate-only) through the fail-closed engine-validated API. " +
      `Allowed object types: ${OBJECT_TYPES.join(", ")}. ` +
      "Invalid, person-level, raw-content, or claim-violating payloads are rejected with the engine gap list and never stored. " +
      "Outcome evidence exports always enter as SUBMITTED regardless of the payload's review state.",
    inputSchema: {
      object_type: z.enum(OBJECT_TYPES),
      payload: z
        .union([z.record(z.unknown()), z.string()])
        .describe("The object payload (JSON object or JSON string). Its id field must be set.")
    }
  },
  async ({ object_type, payload }) => {
    const parsed = parsePayload(payload);
    const idField = ID_FIELDS[object_type];
    const objectId = parsed?.[idField];
    if (typeof objectId !== "string" || !objectId) {
      throw new Error(`payload.${idField} is required for object_type ${object_type}`);
    }
    return asResult(
      await api("PUT", `/api/v1/ai-value/objects/${object_type}/${encodeURIComponent(objectId)}`, parsed)
    );
  }
);

server.registerTool(
  "list_ai_value_objects",
  {
    title: "List stored AI Value objects",
    description:
      "List the org's stored AI Value objects (validation summaries, no payloads). Optionally filter by object type.",
    inputSchema: {
      object_type: z.enum(OBJECT_TYPES).optional()
    }
  },
  async ({ object_type }) =>
    asResult(
      await api(
        "GET",
        `/api/v1/ai-value/objects${object_type ? `?object_type=${object_type}` : ""}`
      )
    )
);

server.registerTool(
  "get_ai_value_object",
  {
    title: "Get one stored AI Value object",
    description: "Fetch a stored AI Value object with its full payload and validation snapshot.",
    inputSchema: {
      object_type: z.enum(OBJECT_TYPES),
      object_id: z.string()
    }
  },
  async ({ object_type, object_id }) =>
    asResult(
      await api(
        "GET",
        `/api/v1/ai-value/objects/${object_type}/${encodeURIComponent(object_id)}`
      )
    )
);

server.registerTool(
  "review_outcome_evidence",
  {
    title: "Record a human outcome-evidence review decision",
    description:
      "Record the human reviewer's ACCEPTED or REJECTED decision for an uploaded outcome evidence export. " +
      "Use only when a human reviewer has actually made the decision — acceptance is what allows evidence to move value language past directional. " +
      "Terminal states cannot be re-reviewed.",
    inputSchema: {
      export_id: z.string(),
      decision: z.enum(["ACCEPTED", "REJECTED"])
    }
  },
  async ({ export_id, decision }) =>
    asResult(
      await api(
        "POST",
        `/api/v1/ai-value/objects/outcome_evidence_export/${encodeURIComponent(export_id)}/review`,
        { decision }
      )
    )
);

server.registerTool(
  "run_value_chain",
  {
    title: "Run the governed value chain",
    description:
      "Run the deterministic value chain over stored inputs (blueprint + metrics library, optionally engagement, fluency baseline, outcome evidence export). " +
      "Generates and persists the derived objects (value scenario, evidence readiness, claim boundary, executive packet) only when each stage validates.",
    inputSchema: {
      blueprint_id: z.string(),
      metrics_library_id: z.string(),
      engagement_id: z.string().optional(),
      fluency_baseline_id: z.string().optional(),
      outcome_evidence_export_id: z.string().optional()
    }
  },
  async (input) => asResult(await api("POST", "/api/v1/ai-value/value-chain/run", input))
);

server.registerTool(
  "assemble_value_evidence_case",
  {
    title: "Assemble a Value Evidence Case",
    description:
      "Assemble the governed proof object for one workflow slice from stored objects. " +
      "The evidence ladder is fail-closed: the evidence level cannot exceed what the outcome-evidence review state, window alignment, and customer-owned assumptions support.",
    inputSchema: {
      data_boundary_contract_id: z.string(),
      roi_scenario_id: z.string(),
      readiness_id: z.string(),
      outcome_export_id: z.string().optional(),
      improvement_loop_id: z.string().optional(),
      case_id: z.string().optional(),
      engagement_label: z.string().optional()
    }
  },
  async (input) => asResult(await api("POST", "/api/v1/ai-value/evidence-case/assemble", input))
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`fluencytracr-ai-value MCP server ready (api ${BASE}, org ${ORG})`);
