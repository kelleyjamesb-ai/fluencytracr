import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderExecutiveReadoutHtml } from "./generate_ai_value_readout_html.mjs";
import { summarizeFluencyBaseline } from "../shared/dist/aiValueEngine/index.js";

const readExample = (name) =>
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), `docs/contracts/ai-value-intelligence/examples/${name}`),
      "utf8"
    )
  );

const packet = readExample("customer-support-executive-packet.json");
const engagement = readExample("customer-support-engagement.json");
const baseline = readExample("customer-support-fluency-baseline.json");

test("renders a self-contained readout with claim governance intact", () => {
  const html = renderExecutiveReadoutHtml({
    packet,
    engagement,
    fluencySummary: summarizeFluencyBaseline(baseline)
  });
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(html.includes("Pre-ROI planning artifact"));
  for (const caveat of packet.sections.claim_boundary.required_caveats) {
    assert.ok(html.includes(caveat.replace(/'/g, "&#39;")), `missing caveat: ${caveat}`);
  }
  assert.ok(html.includes("What this readout never claims"));
  assert.ok(html.includes("Proven ROI"));
  assert.ok(html.includes("AI caused the improvement"));
  assert.ok(html.includes("Northstar Enterprise"));
  assert.ok(html.includes("AI fluency at kickoff"));
  assert.ok(html.includes("180 participants"));
  assert.ok(html.includes("small group(s) withheld"));
});

test("renders without optional kickoff context", () => {
  const html = renderExecutiveReadoutHtml({ packet, engagement: null, fluencySummary: null });
  assert.ok(!html.includes("Client objective"));
  assert.ok(!html.includes("AI fluency at kickoff"));
  assert.ok(html.includes("Pre-ROI planning artifact"));
});

test("renders accepted outcome evidence as caveated support only", () => {
  const html = renderExecutiveReadoutHtml({
    packet,
    engagement,
    fluencySummary: summarizeFluencyBaseline(baseline),
    evidenceReview: {
      reviewState: "ACCEPTED",
      metricNames: ["Median resolution time"],
      sourceSystemName: "Support case management system",
      approvedGrain: "aggregate_workflow_window",
      baselineWindow: "2026-02-01_to_2026-03-31",
      comparisonWindow: "2026-04-01_to_2026-05-31",
      reviewerRole: "Support Operations",
      dataOwner: "Support Operations"
    }
  });

  assert.ok(html.includes("Customer export accepted for caveated review"));
  assert.ok(
    html.includes(
      "Accepted aggregate evidence supports only caveated value review. It is not ROI proof and does not establish causality."
    )
  );
  assert.ok(!html.includes("Glean proved ROI"));
  assert.ok(!html.includes("ACCEPTED"));
  assert.ok(!html.includes("outcome_evidence_export"));
});

test("never leaks internal state names into the readout", () => {
  const html = renderExecutiveReadoutHtml({
    packet,
    engagement,
    fluencySummary: summarizeFluencyBaseline(baseline)
  });
  for (const internal of [
    "workflow_state",
    "metric_state",
    "READY_FOR_EXECUTIVE_VALIDATION",
    "HOLD_FOR_ASSUMPTIONS",
    "behavioral_intent",
    "construct_means",
    "respondent"
  ]) {
    assert.ok(!html.includes(internal), `leaked internal name: ${internal}`);
  }
});

test("escapes untrusted content", () => {
  const tampered = JSON.parse(JSON.stringify(packet));
  tampered.workflow_name = '<script>alert("x")</script>';
  const html = renderExecutiveReadoutHtml({ packet: tampered, engagement: null, fluencySummary: null });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("is deterministic for identical inputs", () => {
  const inputs = {
    packet,
    engagement,
    fluencySummary: summarizeFluencyBaseline(baseline)
  };
  assert.equal(
    renderExecutiveReadoutHtml(inputs),
    renderExecutiveReadoutHtml(inputs)
  );
});
