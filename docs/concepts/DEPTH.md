# Depth

## Purpose

Depth is a first-class V4 concept for FluencyTracr. It describes whether aggregate AI use is becoming integrated into real workflows deeply enough to make value-realization claims more defensible.

Depth complements Velocity. Velocity measures adoption energy. Depth measures
cross-surface work integration. Economic value confidence requires both.

This document defines the concept before implementation. It does not add canonical events, suppression reasons, thresholds, routes, schemas, storage, or product surfaces.

## Why Velocity Alone Is Insufficient

Velocity can show that a cohort is using AI frequently, persistently, and across a broader surface set. That is necessary evidence, but not sufficient evidence for economic confidence.

A cohort can have high Velocity while still using AI in shallow, repetitive, or fragile ways. Another cohort can have lower Velocity but strong integration into a few critical workflows. Velocity tells whether adoption has energy. It does not fully answer whether the work pattern is durable, reusable, verified, recoverable, or judgment-aware.

Depth exists to make that distinction explicit without turning FluencyTracr into a maturity system, ranking surface, or productivity measurement product.

## Definition: What Depth Is

Depth is aggregate evidence that AI use is becoming integrated into real
workflows through surface repertoire and repeated meaningful use. The core
question is not only whether a cohort uses AI often, or whether it uses many AI
surfaces once. The question is whether the cohort repeatedly brings multiple AI
surfaces into work over time in a pattern that looks durable enough to qualify a
value claim.

In shorthand:

```text
Depth = Surface Repertoire x Repeat Use / Refinement
```

Additional evidence can increase interpretive confidence when it shows that the
repertoire is delegated, verified, reusable, recoverable, or judgment-aware. It
is derived from governed aggregate distributions and corroborative signals that
indicate whether AI-assisted work is:

- distributed across a meaningful surface and workflow repertoire,
- repeated or refined enough to show more than one-off experimentation,
- verified when the workflow risk calls for it,
- reused through structured patterns where appropriate,
- delegated through agents, tools, MCP, or named workflows where the work warrants it,
- recoverable when AI output is incomplete or wrong, and
- bounded by human judgment when automation confidence is not warranted.

Depth is not skill, maturity, or performance. It is an aggregate evidence primitive used to qualify claim safety.

## Depth Dimensions

### Surface Repertoire Depth

Surface Repertoire Depth asks whether the cohort repeatedly uses more than one
AI surface in the governed taxonomy. It is the behavioral counterpart to the
intuition that durable AI work integration shows up as cross-surface use, not
only high volume in one tool.

This dimension may require per-user computation inside the customer-side
transformer, but FluencyTracr may surface only cohort distributions such as p10,
p50, p90, and p99. It must never expose an individual surface count or identify
which person used which surface.

Surface Repertoire Depth is not a reward for tool sprawl. Broad use is evidence
only when the surface mix is coherent for the workflow or cohort being examined.

### Repeat / Refinement Depth

Repeat / Refinement Depth asks whether the cohort returns to AI surfaces across
the window and, where session evidence exists, refines within a surface enough
to suggest embedded work behavior rather than isolated experimentation.

This dimension is important but insufficient on its own. Repeat use in one
surface can indicate habit, convenience, or workflow embedding; it does not by
itself prove deeper work integration. Repeat / Refinement Depth should therefore
qualify Surface Repertoire Depth, not replace it.

### Verification Depth

Verification Depth asks whether the cohort shows appropriate verification or feedback behavior for the workflow risk and available evidence.

Citation clicks, feedback, votes, review actions, and other verification signals can support this dimension only when they are joined to parent surfaces and remain aggregate. Verification signals must not become standalone surface volume.

### Workflow Repertoire Depth

Workflow Repertoire Depth asks whether AI use is concentrated in one narrow action or integrated across a coherent set of workflow contexts.

This dimension should be interpreted with surface taxonomy and business context. Broad use is not automatically better than focused use. The question is whether the observed repertoire supports the claim being made.

### Capability Repertoire Depth

Capability Repertoire Depth asks whether aggregate AI use spans the kinds of
capabilities the workflow claim depends on. It includes:

- Surface Repertoire Depth,
- Repeat / Refinement Depth,
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

Velocity's breadth dimension can show how many surfaces appear in aggregate
usage distributions. Depth asks the harder follow-on question: whether surface
repertoire persists and combines with repeated or refined use in a way that
supports a value claim.

High Velocity without Depth may indicate fragile scale: many interactions, but
limited cross-surface repertoire, repeat / refinement behavior, reuse,
verification, recovery, or workflow embedding.

High Depth with low Velocity may indicate focused expertise, constrained rollout, or a narrow but important workflow. It should not be treated as weak adoption without context.

Economic confidence requires both. V4 should use Velocity and Depth together to distinguish activity from durable operating leverage.

## Relationship to Work Modes

Depth depends on the surface taxonomy, but surface names alone are not enough
for value-confidence interpretation. Work modes describe the kind of AI work a
surface represents: retrieval, conversational work, synthesis / transformation,
embedded assist, delegated execution, reusable workflow use, exploratory agent
work, specialized workflow, verification / feedback, or corroborative telemetry.

See [WORK_MODES.md](./WORK_MODES.md).

Work modes help Depth distinguish cross-surface work integration from raw tool
sprawl. A cohort that repeatedly uses Search, Chat, AI Summary, MCP, and an
autonomous agent is showing a different aggregate pattern than a cohort with the
same number of interactions concentrated in one embedded-assist surface. This
interpretation must remain aggregate-only and must not override per-surface
suppression gates.

## Relationship to Trust Calibration

Depth provides inputs to Trust Calibration, especially verification, recovery, and judgment behavior. Trust Calibration interprets those signals against workflow risk.

More verification is not always better. Low verification may reflect earned trust, low verification need, alternative review pathways, or fragile overtrust. Depth supplies aggregate evidence; Trust Calibration supplies risk-adjusted interpretation.

## Relationship to Economic Value

Depth strengthens the defensibility of economic claims when it shows that AI use
is integrated into repeatable, cross-surface, recoverable, risk-aware work. It
does not calculate realized ROI or prove causality.

Depth should help V4 decide whether a time-saved claim is better treated as strong, caveated, scenario-based, or suppressed.

Depth should not support economic interpretation when the only stable signal is
repeat or refinement volume. A future value-confidence layer needs at least one
additional non-saturated Depth component, such as surface repertoire,
verification, delegation, or reuse evidence, before Depth can carry economic
claim weight.

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

- Should Surface Repertoire x Repeat / Refinement become the first formal
  Depth spine?
- Which existing aggregate signals should map to each Depth dimension first?
- How should Surface Repertoire Depth distinguish coherent work integration
  from incoherent tool sprawl?
- Should Depth remain a set of independent dimension bands or support a bounded summary band?
- How should workflow risk be represented before Trust Calibration exists?
- What cross-window stability is required before Delegation Depth can inform implementation or contracts?
- How should reusable Skills be distinguished from brittle automation patterns?
- What evidence is required before Depth can inform reportability decisions?

## Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The V4 Depth concept is credited to James Kelley: economic value confidence requires both adoption energy and cross-surface work integration, with all interpretation constrained by aggregate-only claim safety.
