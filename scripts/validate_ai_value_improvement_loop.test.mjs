import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildValueImprovementLoopFromRoiScenario,
  validateAiValueImprovementLoop
} from "./validate_ai_value_improvement_loop.mjs";

test("seeded Customer Support value improvement loop fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-improvement-loop.json",
      "utf8"
    )
  );

  const result = validateAiValueImprovementLoop(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.improvement_loop_id, "improvement_loop_customer_support_capacity_v1");
  assert.equal(result.value_target_status, "NOT_IMPROVING");
  assert.equal(result.feeds.improvement_planning, true);
  assert.equal(result.feeds.customer_facing_economic_output, false);
  assert.equal(result.gaps.length, 0);
});

test("builds the value improvement loop from the governed ROI scenario", () => {
  const roiScenario = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json",
      "utf8"
    )
  );

  const loop = buildValueImprovementLoopFromRoiScenario(roiScenario, {
    valueTargetStatus: "NOT_IMPROVING",
    fluencyReadiness: "MIXED",
    velocityStatus: "STALLING",
    breadthStatus: "LIMITED",
    depthStatus: "SHALLOW",
    evidenceConfidence: "MEDIUM"
  });
  const result = validateAiValueImprovementLoop(loop);

  assert.equal(result.valid, true);
  assert.equal(loop.workflow.workflow_family, "customer_support_case_resolution");
  assert.equal(loop.value_target.metric_name, "Median resolution time");
  assert.ok(
    loop.likely_blockers.some((blocker) =>
      blocker.label.includes("Breadth is still limited")
    )
  );
  assert.ok(
    loop.recommended_interventions.some((intervention) =>
      intervention.label.includes("targeted workflow enablement")
    )
  );
  assert.ok(
    loop.next_data_needed.includes("Aggregate AI Fluency follow-up by function")
  );
});

test("rejects unsafe improvement loop data and missing retest plan", () => {
  const roiScenario = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json",
      "utf8"
    )
  );
  const loop = buildValueImprovementLoopFromRoiScenario(roiScenario, {
    valueTargetStatus: "NOT_IMPROVING"
  });
  loop.retest_plan = {};
  loop.safe_language.allowed_phrases = ["AI caused the improvement."];
  loop.employee_email = "person@example.com";

  const result = validateAiValueImprovementLoop(loop);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("retest_plan.window_label")));
  assert.ok(result.gaps.some((gap) => gap.includes("unsafe claim language")));
  assert.ok(result.gaps.some((gap) => gap.includes("Forbidden field")));
});
