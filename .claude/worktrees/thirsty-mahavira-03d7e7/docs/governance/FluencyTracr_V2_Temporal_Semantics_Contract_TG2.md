# FluencyTracr V2 — Temporal Semantics Contract

Task Group: TG2  
Status: Approved  
Authority: Sentinel  
Scope: Temporal semantics only. No implementation, metrics, or UI.

---

## 0. Preamble and Binding Constraints

This document defines how **time** is interpreted within FluencyTracr V2 for the
purposes of **observability, suppression, and non-evaluative interpretation**.

This contract:

- Extends V1 without reinterpretation, override, or relaxation.
- Governs how existing V1 signals may or may not be interpreted **across time**.
- Prioritizes **suppression over inference** in all ambiguous cases.

This contract does **not**:

- Introduce new signals, patterns, or behavioral primitives.
- Define metrics, scores, thresholds, or numeric deltas.
- Authorize UI rendering, dashboards, or enforcement activation.
- Enable comparison across individuals, teams, or organizations.
- Permit evaluative, developmental, or performance narratives.

V1 event contracts and behavioral definitions remain the sole source of truth
for raw observation. This document constrains **temporal meaning only**, not
signal definition.

---

## 1. Temporal Window Definitions

### 1.1 Observation Window

An **observation window** is a contiguous period of real calendar time over which
existing V1 behavioral signals may be observed.

Governance rules:

- Windows must be **continuous**, not sampled, stitched, or inferred.
- Windows must be **calendar-aligned**, not activity-triggered.
- Gaps in data invalidate continuity rather than being interpolated.

Eligibility:

- Any window that does not meet **V1 minimum duration requirements** is
  **ineligible for interpretation** and must be suppressed.
- Shorter windows may exist internally but are **non-renderable and
  non-surfaceable**.

---

### 1.2 Window Alignment and Boundary Integrity

Temporal boundaries exist to prevent false trend inference.

Rules:

- Window start and end boundaries must be explicit and immutable once closed.
- Ingestion delay, tooling lag, or backfill **must not shift boundaries**.
- Backfilled data does not retroactively alter previously closed windows for
  interpretation.

Boundary violations default to **window invalidation**, not correction.

---

### 1.3 Continuity and Persistence

Continuity is a **precondition**, not an outcome.

- Intermittent observation does not imply persistence.
- Persistence may only be asserted when a signal remains **consistently
  observable across adjacent eligible windows**.
- Absence resets continuity. There is no decay model.

Persistence carries **no implication of strength, quality, maturity, or
competence**.

---

## 2. Change Detection Across Windows (Qualitative Only)

### 2.1 Definition of Change

“Change” refers only to **qualitative state movement**, not magnitude or
direction.

Permissible descriptors:

- **Emergence:** previously absent signal becomes present.
- **Disappearance:** previously present signal is no longer observed.
- **Instability:** inconsistent presence across adjacent windows.

Explicit prohibitions:

- No directional claims (e.g. improving, declining).
- No rate, velocity, or acceleration language.
- No causal or explanatory attribution.

---

### 2.2 Adjacent Window Comparison Rules

Change may be discussed **only** when:

- Both windows independently meet eligibility requirements.
- Signal definitions are identical across windows.
- No intervening tooling, policy, or workflow changes exist.

Adjacency implies **observational continuity only**, not narrative continuity
or intent.

If any condition fails, **change interpretation is suppressed**.

---

### 2.3 Exclusivity and Instability Across Time

Where V1 enforces exclusivity within a window, V2 extends this rule across time.

- Multiple dominant interpretations across adjacent windows constitute
  **instability**.
- Instability is a **withholding condition**, not an insight.

Instability must never be reframed as transition, evolution, or learning.

---

## 3. Time-Aware Suppression Rules

### 3.1 Insufficient Persistence

Suppress when:

- A signal appears in only one eligible window.
- A signal appears sporadically across non-adjacent windows.
- Observation density varies due to workload fluctuation rather than behavior.

Single-window visibility is observational, not temporal.

---

### 3.2 Contradictory Movement

Suppress when:

- Adjacent windows imply mutually exclusive interpretations.
- A signal reverses presence without an intervening explanatory event.
- Behavioral posture alternates without stability.

Contradiction is treated as **semantic noise**, not insight.

---

### 3.3 Tooling, Policy, or Workflow Changes

Suppress when:

- AI tools are added, removed, or materially altered.
- Organizational AI policy changes.
- Workflow structure meaningfully shifts.

Such changes **break temporal comparability**.

Temporal interpretation may resume only after a fresh continuity period.

---

### 3.4 Ambiguity and Noise

Suppress when:

- Signals fall below V1 confidence gating requirements.
- Ambiguity exists that cannot be resolved via precedence rules.
- Behavior plausibly reflects logging artifacts rather than human judgment.

Ambiguity is never resolved through inference.

---

### 3.5 Seasonal and Cyclical Variance

Seasonal, cyclical, or episodic variation is **explicitly treated as ambiguity**.

Examples include:

- Quarter-end or fiscal close periods
- Onboarding or hiring waves
- Audit, compliance, or regulatory cycles
- Crisis, incident response, or anomaly periods
- Known organizational cadence shifts

Rules:

- Windows spanning or coinciding with such periods **must not be interpreted**
  for change, stability, or persistence.
- These windows are **suppressed by default**, regardless of signal presence.
- No normalization, adjustment, or contextual explanation is permitted.

**Seasonal variance → ambiguity → suppress.**

Suppression in these cases is a **governance success condition**, not a data
failure.

---

## 4. Explicit Non-Goals and Refusal Cases

V2 Temporal Semantics explicitly refuses to support:

- Trendlines, trajectories, or progress narratives.
- Before/after comparisons framed as improvement or decline.
- Time-based benchmarking of any cohort.
- Maturity models, stages, or ladders.
- ROI, efficiency, or productivity claims over time.
- Time-to-value or time-to-competence expectations.

If a time-based question cannot be answered **without implying evaluation**,
it is out of scope and must be refused.

---

## 5. Non-Renderable and Non-Surfaceable States

The following must **never surface**, even descriptively:

- Windows failing minimum duration or continuity.
- Signals marked unstable or contradictory.
- Periods spanning tooling, policy, or workflow transitions.
- Periods affected by seasonal or cyclical variance.
- Any interpretation requiring numeric change.
- Any temporal view that could be misread as performance tracking.

These states may exist internally for auditability but are **withheld from all
downstream interpretation layers**.

---

## 6. Audit and Enforcement Notes (Non-Operational)

- Every suppression decision must be explainable via this contract.
- No suppression may rely on undocumented heuristics.
- Future enforcement must be binary and deterministic.
- Duration, stability, or persistence must never be reframed as quality.

This contract is designed to withstand regulatory, labor, and partner scrutiny
without contextual explanation.

---

## Sentinel Close Condition

This document constitutes the **FluencyTracr V2 Temporal Semantics Contract (TG2)**.

TG2 is approved and closed.

No subsequent task group may begin unless explicitly authorized by Sentinel.
