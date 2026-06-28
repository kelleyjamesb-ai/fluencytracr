import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";

const REQUIRED_SECTIONS = [
  "## 1. Source Gate",
  "## 2. Research Question",
  "## 3. Conceptual Model Frame",
  "## 4. Eligible Inputs",
  "## 5. AI Fluency And VBD Separation",
  "## 6. Excluded Inputs",
  "## 7. Comparison Design",
  "## 8. Design-Strength Cap",
  "## 9. Missing Evidence And Suppression Behavior",
  "## 10. Output Audience",
  "## 11. Blocked Output Language",
  "## 12. Internal Report Shape",
  "## 13. Validation Checks",
  "## 14. Legal And Trust Posture",
  "## 15. Next Decision"
];

const REQUIRED_TERMS = [
  "Status: internal research-design draft only.",
  "Decision: `RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT`",
  "Implementation posture: `HOLD_RESEARCH_MODEL_IMPLEMENTATION`",
  "READY_FOR_INTERNAL_RESEARCH_DESIGN",
  "controlled-fixture-bound",
  "METHOD_DESIGN_ONLY",
  "Contribution_Alignment_Candidate",
  "Usage Quality",
  "Behavior Change",
  "Leadership Reinforcement",
  "Capability Growth",
  "stated AI behavior orientation",
  "Velocity",
  "Breadth",
  "Depth",
  "Psychological context can add caveats or hold the design",
  "It cannot substitute for observed VBD context or selected customer metric movement.",
  "The controlled packet is ready for internal research-design drafting.",
  "PROMOTE_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_DESIGN__HOLD_RUNNER_IMPLEMENTATION"
];

const BLOCKED_AUTHORIZATION_PATTERNS = [
  /model implementation (?:is )?authorized/i,
  /numeric weights (?:are )?authorized/i,
  /customer-facing output (?:is )?authorized/i,
  /finance-context investigation (?:is )?authorized/i,
  /probability output (?:is )?authorized/i,
  /durable research-model input storage (?:is )?authorized/i,
  /Gate\s*=\s*1/i,
  /\bw\d+\s*=/i,
  /coefficient\s*=/i,
  /posterior\s*=/i,
  /default weight/i,
  /\bpoints?\s*=/i,
  /\balpha\s*=/i,
  /\bbeta\s*=/i,
  /\bprior\s*=/i,
  /calibration constant/i,
  /design strength weight/i,
  /contribution percentage/i
];

const UNSAFE_CONFIDENCE_PATTERNS = [
  /contribution confidence\s*(?:is|=|:|\d)/i,
  /confidence level\s*(?:is|=|:|\d)/i,
  /confidence percent(?:age)?\s*(?:is|=|:|\d)/i,
  /model confidence\s*(?:is|=|:|\d)/i,
  /customer-facing confidence\s+(?:is|ready|authorized|approved)/i,
  /probability of contribution\s*(?:is|=|:|\d)/i,
  /posterior\s*(?:is|=|:|\d)/i,
  /model score\s*(?:is|=|:|\d)/
];

const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function sectionBetween(text, startHeader, endHeader) {
  const start = text.indexOf(startHeader);
  assert.notEqual(start, -1, `missing section start: ${startHeader}`);
  const end = text.indexOf(endHeader, start + startHeader.length);
  assert.notEqual(end, -1, `missing section end: ${endHeader}`);
  return text.slice(start, end);
}

test("AI Value internal research design cites the passed controlled packet and stays non-implementation", () => {
  const design = readText(DESIGN_PATH);
  const packet = readJson(PACKET_PATH);
  const aiFluencySection = sectionBetween(
    design,
    "## 5. AI Fluency And VBD Separation",
    "## 6. Excluded Inputs"
  );
  const blockedLanguageSection = sectionBetween(
    design,
    "## 11. Blocked Output Language",
    "## 12. Internal Report Shape"
  );
  const outsideAllowedConfidenceSections = design
    .replace(aiFluencySection, "")
    .replace(blockedLanguageSection, "");

  for (const section of REQUIRED_SECTIONS) {
    assert.ok(design.includes(section), `missing section: ${section}`);
  }
  for (const term of REQUIRED_TERMS) {
    assert.ok(design.includes(term), `missing term: ${term}`);
  }

  assert.ok(
    design.includes(packet.research_promotion_packet_id),
    "design must cite packet id"
  );
  assert.ok(
    design.includes(packet.packet_integrity_hash),
    "design must cite packet integrity hash"
  );
  assert.ok(
    aiFluencySection.includes("1. Confidence"),
    "AI Fluency Confidence must be limited to the construct section"
  );
  assert.ok(
    blockedLanguageSection.includes("customer-facing confidence output."),
    "blocked confidence output language must remain explicitly blocked"
  );

  assert.equal(packet.decision, "READY_FOR_INTERNAL_RESEARCH_DESIGN");
  assert.equal(packet.validation_summary.valid, true);
  assert.equal(packet.feeds.internal_research_design_review, true);
  for (const feed of [
    "research_model_feed",
    "model_output",
    "numeric_weight_output",
    "probability_output",
    "score_like_output",
    "finance_output",
    "finance_context_investigation",
    "customer_facing_output",
    "customer_facing_export",
    "live_connector_execution",
    "route_creation",
    "ui_creation",
    "schema_creation",
    "persistence_write"
  ]) {
    assert.equal(packet.feeds[feed], false, `${feed} must remain false`);
  }

  for (const pattern of BLOCKED_AUTHORIZATION_PATTERNS) {
    assert.equal(pattern.test(design), false, `blocked authorization leaked: ${pattern}`);
  }
  for (const pattern of UNSAFE_CONFIDENCE_PATTERNS) {
    assert.equal(
      pattern.test(outsideAllowedConfidenceSections),
      false,
      `unsafe confidence/probability wording leaked outside allowed sections: ${pattern}`
    );
  }
});
