# Executive HTML Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, clickable, synthetic-data HTML prototype that lets an executive see FluencyTracr's Glean readiness impact through top-level graphs and clear drill-down paths.

**Architecture:** Create one self-contained HTML artifact under the Glean integration docs, with inline CSS and JavaScript so it can be opened directly in a browser. Add a lightweight validator script that checks the executive graph-first structure, required click paths, synthetic-data labeling, and forbidden raw-data fields.

**Tech Stack:** Static HTML, inline CSS/JavaScript, Node validation script, Browser Use visual QA.

---

### Task 1: Add Prototype Validation

**Files:**
- Create: `scripts/validate_glean_executive_prototype.mjs`
- Target artifact: `docs/integrations/glean/prototypes/executive-readiness-demo.html`

- [x] Write a validator that fails while the prototype file is missing.
- [x] Run `node scripts/validate_glean_executive_prototype.mjs` and confirm it fails with `Missing prototype`.

### Task 2: Build Static Executive Prototype

**Files:**
- Create: `docs/integrations/glean/prototypes/executive-readiness-demo.html`

- [x] Add a top-level executive overview with three first-screen graphs: readiness coverage, evidence coverage, and unlock value.
- [x] Add clear navigation click paths: Overview, Readiness, Evidence, Unlocks, Agent Brief.
- [x] Add drill-down panels for present, not computed, suppressed, and missing signal states.
- [x] Add a simulated Glean Agent answer using synthetic data and strict no-raw-record language.
- [x] Label the artifact as synthetic executive demo data.

### Task 3: Verify and Commit

**Files:**
- Modify: `README.md`
- Modify: `docs/integrations/glean/06-readiness-demo-guide.md`
- Modify: `.project/PROGRESS.md`
- Optionally append: `harness/agent-progress.txt`

- [x] Run `node scripts/validate_glean_executive_prototype.mjs`.
- [x] Open the HTML in the browser and visually inspect the first screen.
- [x] Run docs sweep and scoped linkcheck.
- [x] Commit the bounded slice.
