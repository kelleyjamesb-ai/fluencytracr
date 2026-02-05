import fs from "fs";
import path from "path";

describe("non-ordinal labels", () => {
  it("pattern labels are categorical strings", () => {
    const schemaPath = path.join(__dirname, "../src/contracts/pattern_inference_record.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    const pattern = schema.properties.pattern;

    expect(pattern.type).toBe("string");
    expect(Array.isArray(pattern.enum)).toBe(true);
    const numeric = pattern.enum.filter((value: string) => /^\d+$/.test(value));
    expect(numeric).toHaveLength(0);
  });
});
