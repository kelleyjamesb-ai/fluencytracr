import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("generate_glean_readiness_from_sources.mjs", () => {
  it("generates a validated readiness map from default source fixtures", () => {
    const repoRoot = resolve(__dirname, "../..");
    const outDir = mkdtempSync(join(tmpdir(), "glean-readiness-"));
    const outputPath = join(outDir, "source-derived.json");

    execFileSync("npm", ["run", "build", "--workspace", "shared"], {
      cwd: repoRoot,
      stdio: "pipe"
    });
    execFileSync("node", ["scripts/generate_glean_readiness_from_sources.mjs", "--output", outputPath], {
      cwd: repoRoot,
      stdio: "pipe"
    });

    const map = JSON.parse(readFileSync(outputPath, "utf8"));
    const statuses = Object.fromEntries(
      map.entries.map((entry: { signal_family: string; readiness_status: string }) => [
        entry.signal_family,
        entry.readiness_status
      ])
    );

    expect(map.schema_version).toBe("GSR_2026_05");
    expect(statuses.workflow_run).toBe("present");
    expect(statuses.agent_run).toBe("present");
    expect(statuses.skill_lifecycle).toBe("present");
    expect(statuses.mcp_usage).toBe("not_computed");
    expect(statuses.ai_security).toBe("suppressed");
  });
});
