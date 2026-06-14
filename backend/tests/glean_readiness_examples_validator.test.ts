import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("validate_glean_readiness_examples.mjs", () => {
  const repoRoot = resolve(__dirname, "../..");

  it("accepts committed Glean readiness examples", () => {
    execFileSync("npm", ["run", "build", "--workspace", "shared"], {
      cwd: repoRoot,
      stdio: "pipe"
    });

    const output = execFileSync("node", ["scripts/validate_glean_readiness_examples.mjs"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(output).toContain("Glean readiness examples valid");
  });

  it("rejects invalid source fixture fields", () => {
    const invalidDir = join(tmpdir(), `glean-readiness-invalid-${Date.now()}`);
    mkdirSync(invalidDir, { recursive: true });
    writeFileSync(
      join(invalidDir, "bad-source.json"),
      JSON.stringify({
        source_type: "workflow_run",
        source_availability: "available",
        export_channel: "customer_event_logs",
        scrub_status: "scrubbed",
        join_keys_present: ["run_id"],
        derived_dimensions: ["coverage"],
        data_quality: {
          completeness: "verified",
          latency: "known",
          join_reliability: "stable"
        },
        prompt_text: "unsafe"
      })
    );

    expect(() =>
      execFileSync("node", ["scripts/validate_glean_readiness_examples.mjs", "--examples-dir", invalidDir], {
        cwd: repoRoot,
        stdio: "pipe"
      })
    ).toThrow();
  });
});
