# Depth

## Purpose

Depth is a first-class V4 concept for FluencyTracr. It describes whether aggregate AI use is becoming integrated into real workflows deeply enough to make value-realization claims more defensible.

Depth complements Velocity. Velocity measures adoption energy. Depth measures work integration. Economic value confidence requires both.

This document defines the concept before implementation. It does not add canonical events, suppression reasons, thresholds, routes, schemas, storage, or product surfaces.

## Why Velocity Alone Is Insufficient

Velocity can show that a cohort is using AI frequently, persistently, and across a broader surface set. That is necessary evidence, but not sufficient evidence for economic confidence.

A cohort can have high Velocity while still using AI in shallow, repetitive, or fragile ways. Another cohort can have lower Velocity but strong integration into a few critical workflows. Velocity tells whether adoption has energy. It does not fully answer whether the work pattern is durable, reusable, verified, recoverable, or judgment-aware.

Depth exists to make that distinction explicit without turning FluencyTracr into a maturity system, ranking surface, or productivity measurement product.

## Definition: What Depth Is

Depth is aggregate evidence that AI use is becoming integrated into real workflows. It is derived from governed aggregate distributions and corroborative signals that indicate whether AI-assisted work is:

- verified when the workflow risk calls for it,
- spread across a meaningful workflow and capability repertoire,
- reused through structured patterns where appropriate,
- delegated through agents, tools, MCP, or named workflows where the work warrants it,
- recoverable when AI output is incomplete or wrong, and
- bounded by human judgment when automation confidence is not warranted.

Depth is not skill, maturity, or performance. It is an aggregate evidence primitive used to qualify claim safety.

## Depth Dimensions

### Verification Depth

Verification Depth asks whether the cohort shows appropriate verification or feedback behavior for the workflow risk and available evidence.

Citation clicks, feedback, votes, review actions, and other verification signals can support this dimension only when they are joined to parent surfaces and remain aggregate. Verification signals must not become standalone surface volume.

### Workflow Repertoire Depth

Workflow Repertoire Depth asks whether AI use is concentrated in one narrow action or integrated across a coherent set of workflow contexts.

This dimension should be interpreted with surface taxonomy and business context. Broad use is not automatically better than focused use. The question is whether the observed repertoire supports the claim being made.

### Capability Repertoire Depth

Capability Repertoire Depth asks whether aggregate AI use spans the kinds of
capabilities the workflow claim depends on. It includes:

- Surface Depth,
- Workflow Repertoire Depth,
- Capability Diversity Depth,
- Agentic Depth,
- Delegation Depth,
- Reuse Depth.

These subdimensions are not a universal ladder. Retrieval, transformation,
delegation, and reuse can each be appropriate depending on role, workflow risk,
and business context.

### Delegation Depth

Delegation Depth asks whether aggregate activity is moving into
delegation-oriented surfaces such as autonomous agents, named workflow agents,
MCP/tool-mediated work, and structured task execution, relative to retrieval and
transformation-oriented surfaces.

Delegation Depth is a V4 Depth subdimension, not a new canonical event, score,
person-level label, or standalone product feature. See
[DELEGATION_DEPTH.md](./DELEGATION_DEPTH.md).

### Skill / Reuse Depth

Skill / Reuse Depth asks whether repeatable work is moving from one-off prompting into reusable, governed patterns such as named workflows or published Skills.

Reuse is evidence of integration only when the underlying workflow is appropriate for reuse. It must not be used to judge cohorts that legitimately need exploratory or bespoke work.

### Recovery Depth

Recovery Depth asks whether users recover from friction, failed attempts, ambiguity, or poor output quality in ways that preserve workflow progress.

Recovery evidence can make value claims more defensible because it distinguishes brittle adoption from work patterns that can absorb failure.

### Judgment / Override Depth

Judgment / Override Depth asks whether the cohort shows appropriate human intervention when automation should not proceed unchallenged.

Overrides, edits, review paths, and fallback behavior can support this dimension when they are aggregate and risk-adjusted. A high override rate is not automatically good or bad; interpretation depends on workflow risk, quality, recovery, and outcome evidence.

## Depth as Aggregate Distribution, Not Individual Scoring

Depth must be computed and surfaced only at governed aggregate levels. Per-user computations, if required by a customer-side transformer, must remain inside the customer environment and cross into FluencyTracr only as cohort distributions or aggregate rates.

Depth must never be used to rank individuals, teams, managers, or departments. It must never expose user IDs, emails, names, prompts, outputs, transcripts, or row-level event records.

## What Depth Is Not

Depth is not skill, maturity, or performance.

Depth is not a person-level label.

Depth is not a team comparison mechanism.

Depth is not a productivity measure.

Depth is not a prediction of future adoption or business outcome.

Depth is not a way to rescue suppressed evidence.

## Relationship to Velocity

Velocity measures adoption energy. Depth measures work integration.

High Velocity without Depth may indicate fragile scale: many interactions, but limited reuse, verification, recovery, or workflow embedding.

High Depth with low Velocity may indicate focused expertise, constrained rollout, or a narrow but important workflow. It should not be treated as weak adoption without context.

Economic confidence requires both. V4 should use Velocity and Depth together to distinguish activity from durable operating leverage.

## Relationship to Trust Calibration

Depth provides inputs to Trust Calibration, especially verification, recovery, and judgment behavior. Trust Calibration interprets those signals against workflow risk.

More verification is not always better. Low verification may reflect earned trust, low verification need, alternative review pathways, or fragile overtrust. Depth supplies aggregate evidence; Trust Calibration supplies risk-adjusted interpretation.

## Relationship to Economic Value

Depth strengthens the defensibility of economic claims when it shows that AI use is integrated into repeatable, recoverable, risk-aware work. It does not calculate realized ROI or prove causality.

Depth should help V4 decide whether a time-saved claim is better treated as strong, caveated, scenario-based, or suppressed.

## Governance Invariants

Depth must preserve the nine FluencyTracr invariants:

1. No new canonical events.
2. No new suppression reasons.
3. No tunable thresholds.
4. No admin overrides.
5. No individual scoring or user-identifiable fields.
6. Default verdict is `SUPPRESS`.
7. Latency is corroborative only.
8. Assurance Harness CI must remain green.
9. Suppression gates apply independently per governed slice.

## Suppression and Confidence Boundaries

Suppressed Depth readouts must not expose dimension values, economic values, hours saved, upside estimates, or portfolio totals.

Depth can increase confidence only after existing fail-closed gates clear. It cannot override suppression, change suppression reasons, or create a new path around ambiguity.

## Open Questions

- Which existing aggregate signals should map to each Depth dimension first?
- Should Depth remain a set of independent dimension bands or support a bounded summary band?
- How should workflow risk be represented before Trust Calibration exists?
- What cross-window stability is required before Delegation Depth can inform implementation or contracts?
- How should reusable Skills be distinguished from brittle automation patterns?
- What evidence is required before Depth can inform reportability decisions?

## Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The V4 Depth concept is credited to James Kelley: economic value confidence requires both adoption energy and work integration, with all interpretation constrained by aggregate-only claim safety.
