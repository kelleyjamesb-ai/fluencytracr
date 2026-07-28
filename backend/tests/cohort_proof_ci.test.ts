import fs from "node:fs";
import path from "node:path";

describe("C.0 required CI", () => {
  it("runs the standalone cohort-proof codec and producer suite in required CI", () => {
    const workflow = fs.readFileSync(
      path.resolve(__dirname, "../../.github/workflows/ci.yml"),
      "utf8"
    );

    expect(workflow).toMatch(
      /- name: Run cohort-proof codec and producer tests\s+run: npm run test:cohort-proof/
    );
  });
});
