import fs from "fs";
import path from "path";

type JsonSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
};

const loadSchema = (name: string): JsonSchema => {
  const filePath = path.join(__dirname, "../../src/contracts", name);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

describe("inference schema contracts", () => {
  it("includes required JudgmentEvent fields", () => {
    const schema = loadSchema("judgment_event.schema.json");
    expect(schema.required).toEqual(expect.arrayContaining([
      "event_id",
      "schema_version",
      "source_system",
      "workflow_id",
      "role_context",
      "workflow_risk_level",
      "surface_type",
      "event_type",
      "human_action_timestamp",
      "latency_bucket"
    ]));
  });

  it("includes required PatternInferenceRecord fields", () => {
    const schema = loadSchema("pattern_inference_record.schema.json");
    expect(schema.required).toEqual(expect.arrayContaining([
      "scope_key",
      "scope_type",
      "window_start",
      "window_end",
      "pattern",
      "confidence_level",
      "evidence_count",
      "coverage_days",
      "surface_mix",
      "top_drivers",
      "inference_version",
      "parameter_hash",
      "code_commit_hash",
      "generated_at"
    ]));
  });

  it("includes executive heuristic summary structure", () => {
    const schema = loadSchema("executive_heuristic_summary.schema.json");
    expect(schema.required).toEqual(expect.arrayContaining([
      "org_id",
      "window",
      "operational_telemetry_index"
    ]));
    expect(schema.properties).toHaveProperty("operational_telemetry_index");
  });
});
