# Agent Types

## 1. Purpose

This document defines the three sub-surfaces of AGENT as a V2.3 taxonomy refinement for FluencyTracr. It establishes the conceptual basis for implementation and future governance review. The refinement is load-bearing on the diagnostic accuracy of every FluencyTracr verdict that touches AGENT.

## 2. The Conflation in V2 Surface Taxonomy

`SURFACES.md` treats AGENT as a single workflow surface. That is accurate enough for the current V2 taxonomy, but empirical evidence shows that AGENT is not one behavioral population. The surface contains at least three structurally distinct populations that differ in initiation pattern, reuse model, planning delegation, and downstream signal interpretation.

This document treats the older AGENT grouping as a useful transitional boundary, not the final taxonomy.

## 3. The Empirical Evidence

A scio-prod 60-day diagnostic in May 2026 showed that AGENT volume separates into three meaningful populations:

| Sub-surface | Runs | Share | Distinct workflows | Distinct users | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| WORKFLOW_AGENT_EPHEMERAL | 943,638 | 49% | 7 system templates | 1,422 | Ad-hoc Composer prompts and internal system templates |
| AUTONOMOUS_AGENT | 813,284 | 42% | 1,575 autonomous-agent definitions | 1,058 | Goal-driven, AI-planned execution |
| WORKFLOW_AGENT_NAMED | 180,419 | 9% | 2,584 user-named workflow agents | 1,319 | Published Skills and reusable named workflows |

The important finding is not only volume. It is shape. Nearly half of AGENT runs are ephemeral, while autonomous agents account for more than two-fifths of runs. Named workflow agents are smaller by run volume but broader by distinct workflow count.

## 4. Definition: Three AGENT Sub-Surfaces

### agent:autonomous

`agent:autonomous` covers cases where AI plans and executes toward a goal. The user delegates strategy, sequencing, and tool selection. High volume per cohort indicates comfort with goal-driven execution.

### agent:workflow_named

`agent:workflow_named` covers user-defined, named, reusable workflows with explicit steps. The user invokes a structured Skill rather than writing a one-off prompt. High volume per cohort indicates disciplined repeatable use.

### agent:ephemeral

`agent:ephemeral` covers one-off agent prompts with no persistent definition. The system may create an internal record, but the workflow is not reusable, named, or shareable. High volume per cohort indicates exploratory or reactive AI use.

## 5. Why the Distinction Matters

A cohort that is 80% autonomous and 20% named workflow has a different fluency profile than a cohort that is 100% ephemeral, even if total AGENT volume is identical. The current taxonomy makes those cohorts indistinguishable.

The split exposes the variance:

- High autonomous share = delegation fluency
- High named-workflow share = organizational and Skill fluency
- High ephemeral share = reactive or exploratory fluency
- A balanced mix = breadth of AI relationship modes

None of these modes is inherently better. AGENT volume alone says "people used agents." The sub-surface split says whether the cohort delegated goals, reused structured workflows, explored ad hoc, or mixed modes.

## 6. Detection Rules

The split should be detected using existing GCE fields:

- `is_autonomous = jsonPayload.productsnapshot.workflow.isautonomousagent`
- `workflow_name = jsonPayload.productsnapshot.workflow.name`
- `unlisted = jsonPayload.productsnapshot.workflow.unlisted`

Classification:

| Rule | Sub-surface |
| --- | --- |
| `is_autonomous = TRUE` | `agent:autonomous` |
| `is_autonomous = FALSE AND workflow_name IS NOT NULL AND unlisted = FALSE` | `agent:workflow_named` |
| `is_autonomous = FALSE AND (workflow_name IS NULL OR unlisted = TRUE)` | `agent:ephemeral` |

Detection requires joining `WORKFLOW_RUN` events to `PRODUCT_SNAPSHOT` events on `workflowid`, because `WORKFLOW_RUN` events do not carry the snapshot inline. The snapshot enriches the parent run; it does not become a separate surface.

## 7. What This Is Not

This split is NOT a ranking of which sub-surface is "better" or "more fluent."

This split is NOT a judgment about user behavior. All three modes are valid AI use.

This split is NOT a substitute for the Velocity dimensions defined in `VELOCITY.md`.

This split is NOT an individual score.

This split is NOT a way to single out users who do not use Skills.

The purpose is aggregate interpretation. Any use that turns the split into pressure on named people, performance assessment, or compliance enforcement is out of scope.

## 8. How the Split Preserves Governance Invariants

The AGENT split preserves all nine invariants:

1. **Canonical event set unchanged.** Adding sub-surface labels does not add canonical events. The existing V1 events and V2 velocity events still apply.
2. **No new suppression reasons.** The five suppression reasons remain unchanged.
3. **No tunable thresholds.** Classification is field-derived and deterministic, not an admin-adjustable control.
4. **No admin overrides.** A suppressed sub-surface cannot be manually surfaced.
5. **No person-level scoring.** Each sub-surface reports cohort distributions and aggregate verdicts only.
6. **Default verdict is SUPPRESS.** Per-sub-surface gates apply independently; a sub-surface with cohort size below five suppresses.
7. **Latency is corroborative only.** The split changes the surface label, not latency's role in surfacing.
8. **Assurance Harness stays green.** Any implementation PR must add coverage and preserve the harness.
9. **Per-slice independence.** Each sub-surface evaluates independently within and across workflow, JBTD, and persona slices.

The split increases diagnostic resolution without weakening the governance model.

## 9. Connection to Velocity (forward-looking)

This section is forward-looking and does not commit FluencyTracr to a specific implementation.

The Velocity Index BREADTH dimension currently treats AGENT as a single surface. After the split, breadth can represent a more meaningful signal: a cohort that uses both autonomous and named-workflow agents is demonstrating broader AI relationship modes than a cohort that uses one AGENT sub-surface heavily.

The split should not replace FREQUENCY, ENGAGEMENT, or BREADTH. It should refine what counts as breadth inside the AGENT family.

## 10. Connection to Customer Diagnostic Story (forward-looking)

This section is forward-looking and grounded in calibration data only.

At Glean, all three sub-surfaces have meaningful volume. At customers, the mix between autonomous and ephemeral is hypothesized to be one of the strongest aggregate signals of workflow Depth:

- High autonomous share at a customer = delegation culture
- High ephemeral share at a customer = exploratory or stalled adoption
- Low named-workflow share at a customer = no Skills culture yet

These are hypotheses, not verdict claims. Customer interpretation must still pass suppression gates and preserve aggregate-only outputs.

## 10a. Relationship to Depth

`agent:workflow_named` and reusable Skills may contribute to reuse depth when
aggregate evidence shows repeatable workflow integration.

`agent:autonomous` may contribute to delegation depth only if supported by
aggregate evidence such as recovery, verification, quality, and outcome context.

`agent:ephemeral` may indicate exploratory use, incident response, or bespoke
work. It must not be judged negatively without context.

AGENT sub-surfaces must never become person-level maturity labels, ranking
signals, or performance claims.

## 11. Open Questions

These questions are deliberately open and must be resolved before V2.3 production hardening:

- Should all three sub-surfaces share identical suppression gate thresholds, or does autonomous require different gates?
- How should verification signals, such as citation clicks, attribute across the three sub-surfaces?
- Should ephemeral runs that share a system template be grouped under the template's identity for breadth purposes?
- Should NO_SNAPSHOT runs, roughly 5,677 in the scio-prod diagnostic, be excluded entirely or treated as ephemeral?

These are governance and methodology decisions, not bugs.

## 12. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The auto-vs-workflow agent split insight is credited to James Kelley and grounded in the scio-prod 60-day diagnostic that surfaced 42% autonomous-agent volume inside the broader AGENT surface.
