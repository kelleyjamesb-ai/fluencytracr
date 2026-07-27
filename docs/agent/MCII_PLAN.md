# Minimum Coherent Internal Investigation (MCII) Plan

**Status:** durable architecture sequence; non-authorizing
**Recorded:** 2026-07-27
**Plan provenance base:** `27cc0c8d74326ca5158c25b0dfa4f90120895e6b`

This document records the stable MCII objective, boundaries, A–F sequence, and
final acceptance. It is not an active-state or handoff source. Current
authorization, status, blockers, and next actions live only in
`.project/WORK_QUEUE.json` and `.project/PROGRESS.md`. This plan does not
authorize runtime work, deployment, publication, live data, customer output,
model execution, or any slice.

## 1. Objective

Demonstrate one mechanically verified internal hypothesis-to-report journey using organization-defined descriptive metrics and source-bound aggregate outputs. Until canonical lineage is established in Slice E, Slice A output is only an **internal, request-bound preview**.

The initial claim ceiling is descriptive only:

- baseline value;
- comparison value;
- absolute delta;
- mechanically valid percent change;
- declared-direction result; and
- the required label `OBSERVED_NON_ATTRIBUTABLE` on every movement statement.

The journey must not claim causality, attribution percentage, ROI, productivity, prediction, customer-facing Bayesian confidence, or individual performance.

## 2. Boundaries that apply to every slice

- Preserve all nine repository invariants, nine canonical events, and five suppression reasons.
- Keep evidence aggregate-only and suppress each `(workflow_id, jbtd_id, persona_id)` slice independently.
- No individual identifiers, scoring, ranking, cross-slice aggregation, threshold tuning, or suppression override.
- Keep privacy admission, canonical suppression, readiness, model eligibility, and claim authorization as distinct policy decisions.
- Prefer amendments to existing contracts and paths over new artifact families or broad persistence migration.
- Complete one human-created queue item at a time. A later slice starts only after the prior slice is merged and the human adds the next bounded queue item.
- Sections 7.6–7.8 remain separate later work under mandatory HOLD; MCII A–F does not authorize them.

## 3. Complete bounded sequence

### Slice 0 — Product reset and MCII selection (completed, read-only)

Slice 0 audited commit `1fe628aa6a1200ab1676c4c072ffbf2cabb83a19` (tree `d2f0529c20cbf853f9df14b63f2297b5e343d928`). Its reviewed decision packet had SHA-256 `cbc3687cc489def8eb28c0ad6d50a8f10261594777113aa050583f6828c1f035` and received CODE, BUG, and ADVERSARIAL `GO`.

Slice 0 found that the repository had many useful components but did not yet prove one coherent, safe hypothesis-to-report journey. It selected MCII A–F instead of expanding Sections 7.6–7.8 or building more Bayesian infrastructure.

Decisions carried forward:

- Position FluencyTracr as the aggregate behavioral-evidence layer for defensible value realization—not an individual fluency score, surveillance product, ROI engine, or replacement for Glean Insights, MUSE, or Sigma.
- Use a hybrid operating model: self-service investigation setup, aggregate collection, readiness, and descriptive reporting; expert-gated contribution and causal interpretation.
- Avoid a broad persistence migration. Repair existing safety and identity boundaries incrementally, then demote obsolete paths.
- Hold the initial report to organization-defined descriptive metrics labeled `OBSERVED_NON_ATTRIBUTABLE`.
- Bind immutable identity before exposing a claim trace.
- Keep privacy admission, suppression, readiness, model eligibility, and claim authorization separate.

The ordering A–F follows the P0 findings:

1. Example content and browser-selected identity could be mistaken for live, authoritative evidence.
2. Outcome evidence had parallel admission paths and insufficient exact-slice binding.
3. Rollups could permit complementary suppression or differencing leakage.
4. Import approval, model eligibility, and claim language were not cleanly separated.
5. Discovery, hypothesis, measurement, evidence, and readout lacked one append-only compatibility chain.
6. A safe read-only trace could not be exposed until the preceding boundaries were authoritative.

Slice 0 changed no runtime, schema, queue, contract, model, persistence, UI, deployment, or authorization. Its output was the bounded A–F plan; each implementation slice still requires its own human-created queue item and governed review/commit sequence.

### Slice A — Live/example and authentication containment

Separate illustrative UI content from live state and make identity server-authoritative.

Required outcome:

- Example content is persistently labeled illustrative and never seeds API objects.
- Required-auth mode strips caller-selected identity headers and never mints or retries a token from browser storage.
- Production, managed, lockdown, missing, and unknown environments are JWT-only.
- Live Decisions renders only a valid Executive Packet returned by the same successful engine run.
- Loading, error, held, or binding failures never fall back to sample report narrative.
- The output is labeled **internal, request-bound preview**, not canonical, source-bound, audit-ready, rendered readout, or customer-facing.

### Slice B — Outcome-evidence admission and exact-slice policy

Establish one authoritative admission path for organization-defined outcome evidence.

Required outcome:

- Evidence is bound to the exact workflow, JBTD, persona, and observation window.
- Admission rejects missing, conflicting, ambiguous, or cross-slice identities.
- Privacy, suppression, readiness, model eligibility, and claim authorization remain separate fail-closed decisions.
- Existing parallel admission paths are routed through or demoted behind the authoritative policy.

### Slice C — Rollup privacy and differencing protection

Close privacy gaps in aggregate rollups before any broader reporting path is trusted.

Required outcome:

- Complementary suppression prevents recovery of a suppressed cell from totals or sibling values.
- Repeated-query and adjacent-window differencing risks fail closed.
- Every approved slice is suppressed independently; no cross-slice aggregation can re-identify people.
- Rollups expose only bounded aggregate values that pass the existing privacy and suppression rules.

### Slice D — Aggregate evidence approval, claim semantics, and manifest hygiene

Separate import approval from authorization to use evidence in interpretation or model work.

Required outcome:

- Import or schema approval alone cannot authorize model use or a surfaced claim.
- Bounded semantic claim templates encode descriptive, caveated, and blocked language.
- Manifests bind the approved input, policy state, and produced artifact without mutable or ambiguous references.
- Unsupported causal, attribution, ROI, productivity, prediction, or customer-facing claims remain blocked.

### Slice E — Append-only canonical identity compatibility binding

Connect Discovery to immutable hypothesis, measurement, evidence, and readout identities.

Required outcome:

- Append-only identities bind the approved hypothesis, metric definition/version, exact slice/window, admitted evidence, and readout.
- Compatibility checks reject stale, foreign, mutable, or cross-spliced lineage.
- A readout can be called source-bound or canonical only after the complete identity chain validates.
- Existing consumers remain compatible through additive changes; obsolete mutable selectors lose authority.

### Slice F — Allowlisted read-only claim trace and legacy-path demotion

Expose the smallest internal trace needed to inspect the canonical journey.

Required outcome:

- A read-only allowlisted projection links the approved hypothesis, measurement, evidence, policy decisions, claim, and readout.
- Access is limited to `ADMIN` and `ENABLEMENT_LEAD`; all other roles are denied unless separately authorized later.
- The projection excludes user-identifiable data, raw events, internal secrets, unrestricted payloads, and mutation controls.
- Independent packet selection, legacy HTML readout, mutable lineage, and other obsolete authority paths are removed or explicitly demoted.

## 4. Final MCII acceptance

After A–F, demonstrate one internal journey in which:

1. A governed Discovery hypothesis selects an organization-defined descriptive metric.
2. Aggregate evidence is admitted for one exact approved slice and window.
3. Privacy, suppression, readiness, model, and claim policies evaluate independently and fail closed.
4. The report derives from the exact validated same-run evidence and canonical identity chain.
5. Every movement statement is labeled `OBSERVED_NON_ATTRIBUTABLE`.
6. An authorized internal reviewer can inspect the bounded read-only trace.
7. Independent reviewers reproduce the journey and return CODE, BUG, and ADVERSARIAL `GO` on the exact candidate.

This proves a coherent internal investigation path only. It does not prove causality, ROI, productivity, model qualification, production readiness, or customer-output readiness.

## 5. Governed execution protocol

This sequence defines architecture order, not current authority. For every
slice:

1. Start from canonical `main` and read `AGENTS.md` plus
   `docs/agent/SESSION_START.md`.
2. Treat `.project/WORK_QUEUE.json` as the only active-scope source and
   `.project/PROGRESS.md` as the only mutable status, blocker, evidence, and
   next-action source.
3. Work only on the single human-created `in_progress` queue item. A plan
   heading does not activate its slice.
4. Obtain the queue-required design review before implementation, then keep
   changes inside that slice's bound.
5. Run the focused and repository-governed verification recorded in canonical
   progress, followed by exact-candidate independent review.
6. Obtain fresh human confirmation before commit and separate explicit
   authorization for push, PR creation, merge, deployment, publication, or
   any other external side effect.
7. After the current slice merges and its canonical state is closed, the human
   may create the next bounded queue item. Repeat through Slice F without
   combining slices or treating this plan as authorization.
