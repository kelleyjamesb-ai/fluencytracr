#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadArtifactTool() {
  const candidates = [
    process.env.ARTIFACT_TOOL_MODULE,
    "@oai/artifact-tool/dist/artifact_tool.mjs",
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs",
    ),
  ].filter(Boolean);

  const errors = [];
  for (const candidate of candidates) {
    try {
      const specifier = candidate.startsWith(".") || candidate.startsWith("/")
        ? pathToFileURL(path.resolve(candidate)).href
        : candidate;
      return await import(specifier);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(
    [
      "Unable to load @oai/artifact-tool.",
      "Install it in the local Node environment or set ARTIFACT_TOOL_MODULE to artifact_tool.mjs.",
      ...errors.map((error) => `- ${error}`),
    ].join("\n"),
  );
}

const { Presentation, PresentationFile } = await loadArtifactTool();

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "output/internal-pilot-packet-2026-05-28");
const SUMMARY_PATH = path.join(OUT_DIR, "pilot_packet_summary.json");
const PPTX_PATH = path.join(OUT_DIR, "FluencyTracr_Internal_Pilot_Deck.pptx");
const PREVIEW_DIR = path.join(OUT_DIR, "deck-preview");

const W = 1600;
const H = 900;
const C = {
  navy: "#061A44",
  blue: "#2463EB",
  green: "#0F8A45",
  teal: "#0E7490",
  purple: "#7C3AED",
  orange: "#D97706",
  red: "#C2410C",
  slate: "#334155",
  line: "#CBD5E1",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

const summary = JSON.parse(await fs.readFile(SUMMARY_PATH, "utf8"));

const glossary = [
  ["AI Work Evidence", "Aggregate telemetry showing where AI appears in work, how it connects to workflows, and where evidence is strong or weak."],
  ["AI surface", "A place where AI can be used: search, chat, autocomplete, workflow runs, agent spans, or embedded assistants."],
  ["Workflow evidence", "Aggregate signs that AI is attached to a real work path instead of a standalone interaction."],
  ["Velocity", "How quickly AI-assisted work appears to move, using aggregate frequency, engagement, and repeat-use patterns."],
  ["Depth", "How embedded AI appears to be across surfaces and workflows; not an individual skill label."],
  ["Frequency", "How often AI activity appears in the aggregate window."],
  ["Engagement", "How much aggregate interaction occurs around AI-assisted work, such as repeated use or continued activity."],
  ["Breadth", "How many distinct AI surfaces or work contexts appear in the aggregate evidence."],
  ["Reliability Factor", "A confidence lens using abandonment, friction loops, recovery, and verification before interpreting behavior."],
  ["Quality Multiplier", "A caveat lens for later time-saved assumptions; not used here to calculate ROI."],
  ["Trust evidence", "Aggregate signs that people verified, continued, corrected, recovered, or gave feedback after AI assistance."],
  ["Trust attribution", "Whether a trust signal can be attached to a workflow path with enough confidence to interpret it."],
  ["Evidence gap", "Activity exists, but source coverage, attribution, or downstream context is too weak to interpret."],
  ["AI work pattern tier", "A plain-language bucket separating raw AI activity from stronger workflow, verification, or coverage evidence."],
  ["Value-readiness zone", "An executive action lane: scale, redesign, repair trust loops, or hold interpretation."],
  ["Outcome evidence", "Customer-owned aggregate business context that can be attached later without claiming causality by default."],
  ["Value hypothesis", "A testable idea about possible value, such as acceleration, quality premium, or net-new work; not ROI proof."],
  ["Source coverage", "How complete and unambiguous the available telemetry is for a given aggregate interpretation."],
  ["Suppressed", "A fail-closed result where FluencyTracr withholds interpretation because the evidence bar is not met."],
];

const recommendationRows = [
  ["Support friction value test", "Search-to-agent workflow", "Resolution time, escalation rate, reopen rate, backlog movement, CSAT", "Outcome evidence missing"],
  ["Workflow execution capacity test", "Agent/action execution workflow", "Completed work volume, cycle time, backlog movement, stage progression", "Outcome evidence missing"],
  ["Verification quality and risk test", "Verification or feedback-attached workflow", "QA pass rate, defect rate, correction rate, approval coverage", "Trust attribution hold"],
  ["Proof-loop repair agenda", "Trust-evidence repair workflow", "Verification coverage, feedback-loop coverage, unresolved trust-gap rate", "Source coverage hold"],
  ["Source-linkage repair", "Source-linkage or boundary repair", "Source coverage, join completeness, metadata completeness", "Source coverage hold"],
];

function fmtInt(n) {
  return Math.round(Number(n || 0)).toLocaleString("en-US");
}

function fmtPct(n) {
  return `${(Number(n || 0) * 100).toFixed(1)}%`;
}

function titleCase(value) {
  return String(value).replaceAll("_", " ").replace(/\w\S*/g, (s) => s[0].toUpperCase() + s.slice(1).toLowerCase());
}

function addShape(slide, { x, y, w, h, fill = C.white, line = C.line, radius = 12 }) {
  const shape = slide.shapes.add({ geometry: "roundRect" });
  shape.position.set({ left: x, top: y, width: w, height: h });
  shape.fill = fill;
  shape.line = { fill: line, width: line === "none" ? 0 : 1.4 };
  shape.borderRadius = radius;
  return shape;
}

function addText(slide, text, { x, y, w, h, size = 28, color = C.navy, bold = false, align = "left", valign = "top" }) {
  const box = slide.shapes.add({ geometry: "rect" });
  box.position.set({ left: x, top: y, width: w, height: h });
  box.fill = { type: "none" };
  box.line = { fill: "#FFFFFF", width: 0 };
  box.text.set(String(text));
  box.text.typeface = "Arial";
  box.text.fontSize = size;
  box.text.color = color;
  box.text.bold = bold;
  box.text.alignment = align;
  box.text.verticalAlignment = valign;
  box.text.wrap = "square";
  return box;
}

function addHeader(slide, kicker, title, subtitle = "") {
  addText(slide, kicker, { x: 70, y: 40, w: 900, h: 34, size: 20, color: C.blue, bold: true });
  addText(slide, title, { x: 70, y: 78, w: 1250, h: 82, size: 46, color: C.navy, bold: true });
  if (subtitle) addText(slide, subtitle, { x: 72, y: 150, w: 1200, h: 54, size: 24, color: C.slate });
  addText(slide, "Signals, not scores. Aggregate evidence only.", { x: 1110, y: 42, w: 420, h: 36, size: 17, color: C.slate, align: "right" });
}

function addFooter(slide) {
  addShape(slide, { x: 70, y: 830, w: 1460, h: 1, fill: C.line, line: C.line, radius: 0 });
  addText(slide, "No individual scoring | No team ranking | No ROI calculation | No causality claim", {
    x: 70, y: 846, w: 1460, h: 30, size: 18, color: C.slate, align: "center",
  });
}

async function addImage(slide, imagePath, frame) {
  const data = await fs.readFile(imagePath);
  const image = slide.images.add({
    data: new Uint8Array(data),
    mime: "image/png",
    position: { left: frame.x, top: frame.y, width: frame.w, height: frame.h },
    alt: path.basename(imagePath),
    fit: "contain",
  });
  return image;
}

function addMetric(slide, label, value, x, y, color = C.blue) {
  addShape(slide, { x, y, w: 330, h: 126, fill: "#F8FAFC", line: C.line, radius: 20 });
  addText(slide, value, { x: x + 24, y: y + 20, w: 280, h: 44, size: 38, color, bold: true });
  addText(slide, label, { x: x + 24, y: y + 72, w: 280, h: 38, size: 20, color: C.slate });
}

function addGlossarySlide(deck, title, terms) {
  const slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "GLOSSARY", title, "Plain-English definitions for the terms used in this packet.");
  terms.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 90 + col * 720;
    const y = 225 + row * 105;
    addText(slide, item[0], { x, y, w: 300, h: 28, size: 20, color: C.navy, bold: true });
    addText(slide, item[1], { x, y: y + 28, w: 640, h: 62, size: 17, color: C.slate });
  });
  addFooter(slide);
}

function createDeck() {
  const deck = Presentation.create();
  const motif = summary.motif_totals || {};
  const workflowGradeCount = Number(motif.POST_FRICTION_CONTINUATION || 0)
    + Number(motif.EXECUTION_LINKED_WORKFLOW || 0)
    + Number(motif.SEARCH_TO_AGENT_ESCALATION || 0)
    + Number(motif.VERIFICATION_ATTACHED_WORKFLOW || 0);
  const supportFrictionCount = Number(motif.POST_FRICTION_CONTINUATION || 0)
    + Number(motif.SEARCH_TO_AGENT_ESCALATION || 0);

  let slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "INTERNAL PILOT REHEARSAL", "FluencyTracr AI Work Evidence Packet", "A full aggregate run using company-owned telemetry to show what an executive-ready pilot can deliver before ROI claims.");
  addMetric(slide, "Fresh BigQuery run", "4.93 TB", 90, 255, C.blue);
  addMetric(slide, "High-confidence trust coverage", "99.95%", 455, 255, C.green);
  addMetric(slide, "Trust evidence gap", "43.1%", 820, 255, C.orange);
  addMetric(slide, "Skill-read parent join coverage", fmtPct(summary.skill_read.parent_join_share), 1185, 255, C.teal);
  addShape(slide, { x: 90, y: 450, w: 1420, h: 235, fill: C.navy, line: C.navy, radius: 28 });
  addText(slide, "Executive thesis", { x: 130, y: 488, w: 430, h: 40, size: 28, color: C.white, bold: true });
  addText(slide, "The data already separates AI activity from workflow evidence, trust evidence, source coverage, and value-readiness. The current blocker is not telemetry volume; it is downstream outcome evidence and governed assumptions.", {
    x: 130, y: 542, w: 1320, h: 100, size: 31, color: C.white,
  });
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "EXECUTIVE SUMMARY", "What Leaders Should Take Away", "High-level outcomes and strategies come first; detailed evidence sits in the appendix.");
  const takeaways = [
    ["1", "Evidence layer is viable", "Existing aggregate telemetry can produce a structured AI Work Evidence packet without starting with client HR, survey, or finance data."],
    ["2", "The recommendation engine is the product", "FluencyTracr turns observed AI work patterns into the next outcome data, formula family, caveat, and blocked claim."],
    ["3", "Workflow evidence beats adoption volume", `${fmtInt(workflowGradeCount)} workflow/trust patterns are more executive-useful than broad activity alone.`],
    ["4", "ROI stays held", "The packet recommends value tests, but does not calculate ROI or claim causality without governed outcomes and assumptions."],
  ];
  takeaways.forEach((item, i) => {
    const y = 220 + i * 140;
    addShape(slide, { x: 90, y, w: 1420, h: 108, fill: "#F8FAFC", line: C.line, radius: 18 });
    addShape(slide, { x: 120, y: y + 25, w: 58, h: 58, fill: i === 1 ? C.green : C.blue, line: "none", radius: 29 });
    addText(slide, item[0], { x: 120, y: y + 34, w: 58, h: 36, size: 27, color: C.white, bold: true, align: "center" });
    addText(slide, item[1], { x: 205, y: y + 20, w: 430, h: 34, size: 27, color: C.navy, bold: true });
    addText(slide, item[2], { x: 205, y: y + 59, w: 1240, h: 38, size: 22, color: C.slate });
  });
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "RECOMMENDATION ENGINE", "From AI Work Evidence to Executive Action", "The engine is framework-driven: observe aggregate patterns, route the value hypothesis, then name the smallest outcome evidence needed next.");
  const flow = [
    ["1", "Observe", "Surfaces, workflow keys, behavioral primitives, trust signals, source coverage"],
    ["2", "Classify", "Velocity x Depth, AI-service workflow family, value-readiness zone"],
    ["3", "Recommend", "Outcome signal, source family, formula template, caveat, blocked claim"],
    ["4", "Hold or test", "Proceed only when aggregate outcome evidence and assumptions are governed"],
  ];
  flow.forEach((item, i) => {
    const x = 80 + i * 375;
    addShape(slide, { x, y: 245, w: 330, h: 205, fill: i === 2 ? "#ECFDF5" : "#F8FAFC", line: i === 2 ? "#86EFAC" : C.line, radius: 20 });
    addText(slide, item[0], { x: x + 22, y: 268, w: 48, h: 40, size: 32, color: i === 2 ? C.green : C.blue, bold: true });
    addText(slide, item[1], { x: x + 78, y: 270, w: 220, h: 36, size: 27, color: C.navy, bold: true });
    addText(slide, item[2], { x: x + 28, y: 330, w: 275, h: 88, size: 21, color: C.slate });
    if (i < 3) addText(slide, "→", { x: x + 335, y: 320, w: 40, h: 60, size: 42, color: C.blue, bold: true, align: "center" });
  });
  addShape(slide, { x: 120, y: 525, w: 1360, h: 160, fill: C.navy, line: C.navy, radius: 24 });
  addText(slide, "Example output", { x: 160, y: 552, w: 250, h: 32, size: 24, color: C.white, bold: true });
  addText(slide, `Support friction is the first value test candidate: ${fmtInt(supportFrictionCount)} aggregate patterns combine search-to-agent movement and post-friction continuation. Request resolution time, escalation rate, reopen rate, backlog movement, and CSAT. Do not claim causality or ROI yet.`, {
    x: 160, y: 598, w: 1260, h: 60, size: 26, color: C.white,
  });
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "STRATEGIC RECOMMENDATIONS", "Where This Points a Client Next", "Each recommendation names the outcome evidence needed to test value without overclaiming value.");
  recommendationRows.forEach((row, i) => {
    const y = 215 + i * 112;
    addShape(slide, { x: 80, y, w: 1440, h: 84, fill: "#FFFFFF", line: C.line, radius: 16 });
    addText(slide, row[0], { x: 110, y: y + 14, w: 315, h: 30, size: 21, color: C.navy, bold: true });
    addText(slide, row[1], { x: 445, y: y + 14, w: 290, h: 30, size: 19, color: C.blue, bold: true });
    addText(slide, row[2], { x: 755, y: y + 14, w: 500, h: 50, size: 18, color: C.slate });
    addText(slide, row[3], { x: 1285, y: y + 14, w: 190, h: 42, size: 18, color: row[3].includes("hold") ? C.orange : C.slate, bold: true });
  });
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "WHAT THE RUN OBSERVED", "Observable Variables, Not Client Requirements", "The rehearsal starts from variables already visible in company-owned telemetry, then names gaps as product readiness work.");
  const columns = [
    ["Surfaces", "Search, autocomplete, workflow runs, AI summary, bot activity, MCP, agent spans."],
    ["Workflow keys", "Run/action keys, session tokens, trace/tracking keys, workflow context."],
    ["Behavior primitives", "Frequency, engagement, breadth, iteration/refinement, recovery-like continuation, verification."],
    ["Trust signals", "Feedback, citations, citation clicks, action success, post-friction continuation."],
    ["Value context", "Velocity x Depth zones, AI work pattern tiers, source coverage, outcome-readiness gates."],
    ["Held evidence", "Outcome joins, assumption ledger, causality design, monetary range values."],
  ];
  columns.forEach((item, i) => {
    const x = 90 + (i % 3) * 485;
    const y = 245 + Math.floor(i / 3) * 220;
    addShape(slide, { x, y, w: 430, h: 165, fill: "#F8FAFC", line: C.line, radius: 18 });
    addText(slide, item[0], { x: x + 24, y: y + 22, w: 380, h: 34, size: 27, color: C.navy, bold: true });
    addText(slide, item[1], { x: x + 24, y: y + 70, w: 378, h: 76, size: 21, color: C.slate });
  });
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "FRESH RUN", "Velocity, Depth, Reliability, and Quality", "The microcosm view shows growing breadth and sustained reliability/quality context across the latest 90-day window.");
  const f = summary.framework;
  const labels = ["Frequency", "Engagement", "Breadth", "Reliability", "Quality"];
  const keys = ["avg_frequency", "avg_engagement", "avg_breadth", "avg_reliability", "avg_quality"];
  labels.forEach((label, idx) => {
    const x = 120 + idx * 290;
    addText(slide, label, { x, y: 240, w: 240, h: 30, size: 21, color: C.slate, bold: true, align: "center" });
    f.forEach((row, r) => {
      const value = row[keys[idx]];
      const max = Math.max(...f.map((v) => Number(v[keys[idx]] || 0)), 1);
      const h = idx >= 3 ? value * 250 : (value / max) * 250;
      const color = [C.blue, C.teal, C.purple, C.green, C.orange][idx];
      addShape(slide, { x: x + 45 + r * 48, y: 590 - h, w: 34, h, fill: color, line: color, radius: 8 });
      addText(slide, idx >= 3 ? value.toFixed(2) : value.toFixed(1), { x: x + 20 + r * 48, y: 610, w: 80, h: 26, size: 16, color: C.slate, align: "center" });
    });
  });
  addText(slide, "Window 1       Window 2       Window 3", { x: 610, y: 685, w: 400, h: 28, size: 19, color: C.slate, align: "center" });
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "AI WORK PATTERNS", "Activity Is Not the Same as Workflow Evidence", "Work pattern tiers prevent high-volume assistive events from drowning out stronger workflow and trust evidence.");
  slide._pendingImage = ["motif_tier_distribution.png", { x: 70, y: 205, w: 1460, h: 600 }];
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "VALUE READINESS", "Where the Evidence Points Leaders", "The largest lane is trust-evidence repair; the most commercial lane is scale-and-measure review with outcome evidence attached.");
  slide._pendingImage = ["readout_zone_distribution.png", { x: 70, y: 205, w: 1460, h: 600 }];
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "TRUST", "Trust Attribution Is the Product Problem", "The best trust evidence is workflow-attached verification and continuation, not standalone citation behavior.");
  slide._pendingImage = ["trust_attribution_distribution.png", { x: 70, y: 205, w: 1460, h: 600 }];
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "DATA READINESS", "What We Have and What Is Still Held", "Missing evidence is presented as a product-readiness gap, not as an ask that blocks the first pilot conversation.");
  slide._pendingImage = ["data_readiness_matrix.png", { x: 70, y: 190, w: 1460, h: 620 }];
  addFooter(slide);

  slide = deck.slides.add({ width: W, height: H });
  addHeader(slide, "DECISION MEMO", "Proceed, But Keep the Claim Narrow", "This is commercially useful as an evidence layer, not yet as an ROI calculator.");
  const decisions = [
    ["Proceed", "Build the external executive rehearsal packet from this internal pilot."],
    ["Promise", "Aggregate work evidence, workflow integration, trust gaps, source coverage, and value-investigation routing."],
    ["Hold", "Dollarized ROI, causal impact, productivity lift, correctness, and people/team comparison."],
    ["Next", "Use the same aggregate variable names for client pilots and add outcome/assumption lanes only when they are governed."],
  ];
  decisions.forEach((item, i) => {
    const y = 230 + i * 125;
    addShape(slide, { x: 110, y, w: 1380, h: 94, fill: "#F8FAFC", line: C.line, radius: 20 });
    addText(slide, item[0], { x: 145, y: y + 25, w: 180, h: 38, size: 28, color: i === 0 ? C.green : C.navy, bold: true });
    addText(slide, item[1], { x: 340, y: y + 24, w: 1080, h: 42, size: 25, color: C.slate });
  });
  addFooter(slide);

  addGlossarySlide(deck, "Terms That Explain the Evidence Layer", glossary.slice(0, 10));
  addGlossarySlide(deck, "Terms That Explain Readiness and Boundaries", glossary.slice(10));

  return deck;
}

const deck = createDeck();
for (const slide of deck.slides.items) {
  if (slide._pendingImage) {
    const [name, frame] = slide._pendingImage;
    await addImage(slide, path.join(OUT_DIR, "charts", name), frame);
    delete slide._pendingImage;
  }
}
const pptx = await PresentationFile.exportPptx(deck);
await fs.writeFile(PPTX_PATH, Buffer.from(pptx.data));

await fs.mkdir(PREVIEW_DIR, { recursive: true });
let i = 1;
for (const slide of deck.slides.items) {
  const png = await slide.export({ format: "png" });
  await fs.writeFile(
    path.join(PREVIEW_DIR, `slide-${String(i).padStart(2, "0")}.png`),
    Buffer.from(await png.arrayBuffer()),
  );
  i += 1;
}

console.log(PPTX_PATH);
