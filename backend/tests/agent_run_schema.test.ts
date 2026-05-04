import { AgentRunEventSchema } from "@learnaire/shared";

const baseEvent = {
  schema_version: "AR_2026_05",
  event_id: "11111111-1111-4111-8111-111111111111",
  event_name: "AR.RUN.STARTED.V1",
  provider: "CURSOR",
  harness_surface: "CURSOR_CLI",
  event_kind: "SESSION_START",
  event_timestamp: "2026-05-01T16:00:00.000Z",
  repo_id: "fluencytracr",
  branch_name: "codex/OrgFluency-openai-agents-harness",
  session_id: "cursor-session-1",
  run_id: "run-1",
  model: "composer-2",
  permission_mode: "ASK_EVERY_TIME",
  payload: {
    cwd_present: true,
    git_status: "dirty",
    harness_docs_loaded: ["docs/agent/SESSION_START.md", "harness/README.md"]
  }
};

describe("AgentRunEventSchema", () => {
  it("accepts a Cursor session-start event without raw content", () => {
    const parsed = AgentRunEventSchema.parse(baseEvent);

    expect(parsed.provider).toBe("CURSOR");
    expect(parsed.payload.cwd_present).toBe(true);
  });

  it("accepts an OpenAI Agents SDK tool event with normalized tool status", () => {
    const parsed = AgentRunEventSchema.parse({
      ...baseEvent,
      event_id: "22222222-2222-4222-8222-222222222222",
      event_name: "AR.TOOL.CALL_RECORDED.V1",
      provider: "OPENAI_AGENTS",
      harness_surface: "OPENAI_AGENTS_SDK",
      event_kind: "TOOL_END",
      model: "gpt-5.5",
      tool_call_id: "tool-call-1",
      tool_name: "read_harness_document",
      tool_status: "SUCCESS",
      duration_ms: 42,
      payload: {
        document_key: "session_start",
        output_ref: "harness-doc:session_start"
      }
    });

    expect(parsed.provider).toBe("OPENAI_AGENTS");
    expect(parsed.tool_status).toBe("SUCCESS");
  });

  it("rejects raw prompts, responses, file content, and direct identifiers", () => {
    const forbiddenKeys = ["prompt", "raw_output", "file_content", "user_email"];

    for (const key of forbiddenKeys) {
      const parsed = AgentRunEventSchema.safeParse({
        ...baseEvent,
        event_id: "33333333-3333-4333-8333-333333333333",
        payload: {
          ...baseEvent.payload,
          [key]: "should not be collected"
        }
      });

      expect(parsed.success).toBe(false);
    }
  });
});
