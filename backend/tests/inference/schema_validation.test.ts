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
      "pattern"
    ]));
  });

  it("removes executive heuristic summary schema", () => {
    const filePath = path.join(__dirname, "../../src/contracts", "executive_heuristic_summary.schema.json");
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
