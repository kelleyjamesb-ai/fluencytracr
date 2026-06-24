import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildResearchPromotionReadinessPacketFromObject,
  researchPromotionPacketIntegrityHash,
  validateResearchPromotionReadinessPacket
} from "./run_ai_value_research_promotion_readiness_packet.mjs";

const DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_DESIGN_DECISION.md";
const DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";

const REQUIRED_SECTIONS = [
  "## 1. Decision",
  "## 2. Source Binding",
  "## 3. Promoted Design Scope",
  "## 4. Non-Goals",
  "## 5. Future Runner Contract Shape",
  "## 6. Eligible Inputs",
  "## 7. Output Envelope",
  "## 8. Interpretation Cap",
  "## 9. Fail-Closed Conditions",
  "## 10. Validation Requirements",
  "## 11. Security And Boundary Review",
  "## 12. Legal And Trust Review",
  "## 13. Productization Meaning",
  "## 14. Next Implementation Gate",
  "## 15. Verification"
];

const REQUIRED_TERMS = [
  "Status: exact-scope design decision only.",
  "Decision:\n`PROMOTE_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_DESIGN__HOLD_RUNNER_IMPLEMENTATION`",
  "Implementation posture: `HOLD_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION`",
  "This decision does not authorize implementing the runner.",
  "READY_FOR_INTERNAL_RESEARCH_DESIGN",
  "RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT",
  "HOLD_RESEARCH_MODEL_IMPLEMENTATION",
  "PROMOTE_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_DESIGN__HOLD_RUNNER_IMPLEMENTATION",
  "METHOD_DESIGN_ONLY",
  "compact, source-bound packet refs only",
  "non-persistent internal prototype runner design",
  "AI Fluency Confidence, Usage Quality, Behavior Change, Leadership",
  "aggregate psychological context ref for attitude, stated AI behavior",
  "observed VBD context ref for telemetry-derived Velocity, Breadth, and Depth",
  "reject AI Fluency construct context used as observed VBD",
  "reject psychological context used as observed VBD or selected metric",
  "Research Promotion Readiness Packet\n-> Internal Research Design\n-> Internal Prototype Runner Design Decision"
];

const BLOCKED_AUTHORIZATION_PATTERNS = [
  /authorizes?\s+(?:implementing|implementation|code implementation|model implementation)/i,
  /runner implementation (?:is )?authorized/i,
  /model math (?:is )?authorized/i,
  /numeric weights (?:are )?authorized/i,
  /model outputs? (?:are|is) authorized/i,
  /customer-facing output (?:is )?authorized/i,
  /finance output (?:is )?authorized/i,
  /probability output (?:is )?authorized/i,
  /score-like output (?:is )?authorized/i,
  /live (?:BigQuery|Sigma|Glean) execution (?:is )?authorized/i,
  /persistence writes? (?:are|is) authorized/i,
  /routes? (?:are|is) authorized/i,
  /UI (?:is )?authorized/i,
  /schemas? (?:are|is) authorized/i
];

const REQUIRED_BLOCKED_BOUNDARY_TERMS = [
  "raw rows",
  "query text or SQL text",
  "prompts, responses, transcripts",
  "user identifiers",
  "model math",
  "numeric weights",
  "probability output",
  "score-like output",
  "finance output",
  "ROI",
  "EBITDA",
  "causality",
  "productivity measurement",
  "customer-facing output",
  "live BigQuery execution",
  "live Sigma execution",
  "live Glean execution",
  "credential handling",
  "query execution",
  "persistence writes",
  "exports"
];

const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256Text = (text) => createHash("sha256").update(text).digest("hex");

test("AI Value prototype runner design decision promotes only design and holds implementation", () => {
  const decision = readText(DECISION_PATH);
  const design = readText(DESIGN_PATH);
  const fixture = readJson(FIXTURE_PATH);
  const packet = readJson(PACKET_PATH);
  const expectedPacket = buildResearchPromotionReadinessPacketFromObject(fixture);
  const packetValidation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture
  });
  const designHash = sha256Text(design);
  const affirmativeAuthorizationText = decision.replace(
    /does not authorize[^\n.]*\./gi,
    ""
  );

  for (const section of REQUIRED_SECTIONS) {
    assert.ok(decision.includes(section), `missing section: ${section}`);
  }
  for (const term of REQUIRED_TERMS) {
    assert.ok(decision.includes(term), `missing term: ${term}`);
  }
  for (const term of REQUIRED_BLOCKED_BOUNDARY_TERMS) {
    assert.ok(decision.includes(term), `missing blocked boundary term: ${term}`);
  }

  assert.deepEqual(packet, expectedPacket);
  assert.equal(packetValidation.valid, true, packetValidation.gaps.join("; "));
  assert.equal(
    researchPromotionPacketIntegrityHash(packet),
    packet.packet_integrity_hash
  );
  assert.equal(packet.decision, "READY_FOR_INTERNAL_RESEARCH_DESIGN");
  assert.equal(packet.validation_summary.valid, true);
  assert.equal(packet.feeds.internal_research_design_review, true);
  assert.equal(packet.feeds.research_model_feed, false);
  assert.equal(packet.feeds.model_output, false);
  assert.equal(packet.feeds.numeric_weight_output, false);
  assert.equal(packet.feeds.probability_output, false);
  assert.equal(packet.feeds.score_like_output, false);
  assert.equal(packet.feeds.finance_output, false);
  assert.equal(packet.feeds.customer_facing_output, false);
  assert.equal(packet.feeds.persistence_write, false);

  assert.ok(
    decision.includes(packet.research_promotion_packet_id),
    "decision must cite packet id"
  );
  assert.ok(
    decision.includes(packet.packet_integrity_hash),
    "decision must cite packet integrity hash"
  );
  assert.ok(
    decision.includes(designHash),
    "decision must cite current internal research design hash"
  );
  assert.ok(
    design.includes("Decision: `RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT`"),
    "source design must remain a design draft"
  );
  assert.ok(
    design.includes("Implementation posture: `HOLD_RESEARCH_MODEL_IMPLEMENTATION`"),
    "source design must keep model implementation held"
  );

  for (const pattern of BLOCKED_AUTHORIZATION_PATTERNS) {
    assert.equal(
      pattern.test(affirmativeAuthorizationText),
      false,
      `blocked authorization language leaked: ${pattern}`
    );
  }
});
