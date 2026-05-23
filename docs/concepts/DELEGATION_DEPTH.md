# Delegation Depth

## 1. Purpose

This document defines Delegation Depth as a V4 Depth subdimension for
FluencyTracr. It establishes the conceptual basis before any code, schema,
endpoint, migration, or product surface depends on it.

Delegation Depth is a governed aggregate behavioral signal. It helps distinguish
retrieval-oriented AI use from work-delegation-oriented AI use without turning
that distinction into a score, person-level label, productivity measure, or
universal maturity ladder.

Delegation Depth does not add canonical events, suppression reasons, thresholds,
admin overrides, schemas, routes, storage, or frontend behavior.

## 2. Why Delegation Depth Exists

Velocity can show that a cohort is active, persistent, and broad in its AI use.
Depth can show whether that use is becoming integrated into work. But aggregate
activity can still hide a basic mode difference: a cohort may mostly use AI to
find information, mostly use AI to reshape information, or increasingly use AI
to execute and coordinate work through agents, tools, named workflows, or MCP.

Those patterns support different executive and product decisions. A
retrieval-heavy cohort may need better answer quality, verification, source
coverage, or trust calibration. A transformation-heavy cohort may need workflow
templates, review paths, or quality controls. A delegation-heavy cohort may need
agent governance, reliability evidence, reusable workflow discipline, and
clearer boundaries around when automation should proceed.

Retrieval is not bad. Delegation is not always better. Delegation Depth is
role- and workflow-relative. It asks whether the observed aggregate surface mix
supports the claim being made.

## 3. Definition: What Delegation Depth Is

Delegation Depth is a cohort-level aggregate signal that measures the share and
distribution of AI activity occurring in delegation-oriented surfaces, such as
autonomous agents, named workflow agents, and MCP/tool-mediated work, relative
to retrieval and transformation-oriented surfaces.

It is computed from governed surface taxonomy and AGENT sub-surface mappings.
Per-user computation may occur only inside the customer-side transformer or
approved internal diagnostic environment. FluencyTracr may surface only
aggregate distributions, shares, or bands after existing fail-closed gates and
taxonomy-alignment checks clear.

Delegation Depth is not a fourth universal fluency dimension. It is a
subdimension of Depth's capability-repertoire lens.

## 4. Three AI Use Modes

### Retrieval

Retrieval means AI helps find, retrieve, or answer. Examples include search and
answer lookup surfaces when the primary behavior is information access.

Retrieval-oriented use can be highly valuable, especially in knowledge-heavy
workflows. Low delegation share does not imply weak adoption.

### Transformation

Transformation means AI helps draft, summarize, rewrite, or reshape
information. Examples include chat, summaries, drafting-like workflows, and
similar surfaces where the user remains the main work sequencer.

Transformation-oriented use can support quality, speed, and consistency, but it
does not by itself prove delegated work execution.

### Delegation

Delegation means AI executes or coordinates work through agents, tools, MCP,
named workflows, or structured task execution. Examples include autonomous
agents, named workflow agents, MCP/tool-mediated work, and governed reusable
workflow patterns where the system carries more of the work sequence.

Delegation-oriented use can indicate deeper work integration only when it is
supported by reliability, verification, recovery, outcome context, and
aggregate safety.

## 5. Bucket Definitions

Delegation Depth uses the governed surface taxonomy in
[SURFACES.md](./SURFACES.md) and AGENT sub-surface definitions in
[AGENT_TYPES.md](./AGENT_TYPES.md).

| Bucket | Governed interpretation | Example surfaces |
| --- | --- | --- |
| Retrieval | AI helps find, retrieve, or answer. | `SEARCH`, `AI_ANSWER` lookup where detectable |
| Transformation | AI helps draft, summarize, rewrite, or reshape information. | `CHAT`, `AI_SUMMARY`, summarization or drafting-like workflow surfaces |
| Exploratory delegation | AI is used through one-off agent prompts or ad hoc execution patterns. | `workflow:agent:ephemeral` |
| Structured delegation | AI executes or coordinates work through governed agent or tool-mediated surfaces. | `workflow:agent:autonomous`, `workflow:agent:workflow_named`, `standalone:MCP_USAGE` |
| Reusable leverage | AI work is delegated through reusable named workflows or published Skills where detectable. | named workflow agents, reusable Skills |

If a surface cannot be confidently mapped, it should be excluded from ratio
numerators rather than assigned invented semantics. Ambiguous attribution should
default to suppression.

## 6. Empirical Foundation

This concept is motivated by an initial scio-prod 60-day diagnostic. The data
reflects internal Glean usage and should be treated as calibration-cohort
evidence, not a customer baseline or universal target.

At scio-prod, aggregate AI activity appears overwhelmingly retrieval-oriented at
the median, while delegation-oriented behavior is rare at the median and
concentrated in the top tail.

| Observation | Value |
| --- | ---: |
| Retrieval share p50 | 0.91 |
| Transformation share p50 | 0.073 |
| Delegation share p50 | 0.0018 |
| Delegation share p90 | 0.030 |
| Delegation share p99 | 0.203 |
| Delegation spread p90 / p50 | 16.68x |
| Delegation spread p99 / p50 | approximately 113x |
| Cross-window stability | pending |

The important finding is distribution shape, not product truth. Heavy-tail
variance is evidence of possible signal, not proof of signal. Cross-window
stability remains pending and must be resolved before Delegation Depth can
inform implementation, contracts, or customer-facing claims.

## 7. Governance Boundaries

Delegation Depth must preserve the FluencyTracr invariants:

1. **Aggregate-only.** Outputs may include cohort shares, percentiles, or bands,
   never person-level rows.
2. **No individual scoring.** The signal must not name, inspect, rank, or label
   any person.
3. **No team ranking.** The signal must not become a comparison mechanism for
   teams, managers, departments, or employees.
4. **No employee evaluation.** Delegation Depth is not an HR, performance, or
   compliance-enforcement input.
5. **No productivity scoring.** The signal describes aggregate surface mix, not
   worker output.
6. **No ROI claim.** Delegation Depth does not calculate or prove financial
   return.
7. **No causal claim.** Delegation Depth does not prove that delegation caused
   productivity, quality, or business outcomes.
8. **No prediction claim.** Delegation Depth does not forecast future adoption
   or future value.
9. **No new canonical events.** It reuses governed surface and Depth language.
10. **No new suppression reasons.** The existing five suppression reasons remain
    unchanged.
11. **No admin override.** A suppressed or ambiguous readout cannot be manually
    surfaced.
12. **Default suppress when attribution is ambiguous.** Unclear joins, unknown
    surfaces, or unstable bucket mappings must suppress or remain out of ratio
    numerators.
13. **Surface only with sufficient cohort size and taxonomy alignment.** The
    signal must not surface when the cohort is too small or bucket mapping is
    not defensible.

## 8. What Delegation Depth Is Not

Delegation Depth is not a measure of employee skill.

Delegation Depth is not a measure of individual AI fluency.

Delegation Depth is not proof of productivity.

Delegation Depth is not proof of automation success.

Delegation Depth is not inherently better than retrieval or transformation.

Delegation Depth is not a replacement for Trust Calibration or Reliability
Factor.

Delegation Depth is not a standalone product feature.

Delegation Depth is not a way to rescue suppressed evidence.

## 9. Relationship to Depth

Depth measures whether AI use is becoming integrated into real workflows.
Delegation Depth contributes to that picture by showing whether the cohort's
capability repertoire is moving beyond retrieval and transformation into
structured work delegation where appropriate.

Delegation Depth sits inside the Depth capability-repertoire family alongside:

- Surface Depth,
- Workflow Repertoire Depth,
- Capability Diversity Depth,
- Agentic Depth,
- Delegation Depth,
- Reuse Depth.

This family is role- and workflow-relative. A legal research workflow may remain
appropriately retrieval-heavy. A recurring operations workflow may justify more
delegation evidence. The signal is useful only when interpreted against the
workflow decision being made.

## 10. Relationship to Velocity

Velocity measures adoption energy: frequency, engagement, and breadth.
Delegation Depth measures mode mix inside work integration.

High Velocity with low Delegation Depth may indicate broad, persistent
retrieval or transformation use. That can still be valuable. It does not imply
failure.

Lower Velocity with higher Delegation Depth may indicate a narrower cohort using
structured agents or tools for specific recurring work. That can be meaningful
when the workflow warrants delegation, but it still requires reliability,
verification, and outcome context.

Velocity and Delegation Depth should be interpreted together, not collapsed into
a universal ladder.

## 11. Relationship to Trust Calibration

Delegation changes trust risk. When AI is finding or reshaping information, the
main trust question may be source quality, verification behavior, and output
review. When AI is executing or coordinating work, the trust question expands to
tool boundaries, recovery paths, human override, and whether the workflow risk
allows delegation.

Delegation Depth can inform Trust Calibration interpretation, but it cannot
replace it. Higher delegation share without appropriate verification, recovery,
or override evidence may lower confidence rather than increase it.

## 12. Relationship to Value Confidence

Delegation Depth can influence V4 Value Confidence by modifying confidence in
whether AI use is moving toward work delegation:

- **AI Scale Readiness Portfolio:** helps distinguish workflows ready for scale,
  harvest, coaching, redesign, governance, or suppression.
- **AI Value Leakage Map:** helps identify places where high activity may not
  be converting into delegated operating leverage.
- **Time-Saved Defensibility Range:** can add caveats around whether a
  time-saved claim is supported by retrieval, transformation, or delegated work
  patterns.
- **Trust Calibration interpretation:** helps evaluate whether delegation-heavy
  workflows carry sufficient review, recovery, and override evidence.

Delegation Depth alone does not generate economic value. It only modifies
confidence in whether AI use is moving toward work delegation.

## 13. Suppression and Confidence Boundaries

Default state is `SUPPRESS`.

Delegation Depth can surface only when existing cohort-size, time-window,
convergence, baseline, ambiguity, and taxonomy-alignment requirements clear.

Suppressed Delegation Depth readouts must not expose hidden reconstructed
dimension values, economic values, hours saved, upside estimates, portfolio
totals, person-level fields, raw prompts, raw outputs, transcripts, or raw event
rows.

Delegation Depth cannot override suppression. It cannot add suppression
reasons. It cannot upgrade evidence grade by itself. It cannot create a product
claim from distribution shape alone.

## 14. Open Questions

- What minimum cross-window stability is required before implementation can
  begin?
- Should delegation share remain a standalone aggregate distribution or map
  into bounded Depth bands?
- How should MCP usage be counted when one work episode produces multiple tool
  calls?
- Which named workflow and Skill fields are reliable enough across customers to
  support reusable leverage classification?
- How should workflow risk determine when delegation is appropriate versus when
  retrieval or transformation is the safer mode?
- How should Delegation Depth interact with suppressed Velocity or Reliability
  Factor outputs?

## 15. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The
Delegation Depth concept is credited to James Kelley and grounded in the
scio-prod 60-day diagnostic summarized above: retrieval, transformation, and
delegation surface mix can help V4 distinguish activity from work delegation,
provided the signal remains aggregate-only, role-relative, and governed by
fail-closed interpretation.
