# Maturity

## 1. Purpose

This document defines Maturity as a future FluencyTracr concept for interpreting post-saturation AI use. It establishes the conceptual basis before any schema, endpoint, dashboard, or verdict behavior depends on it. Maturity is load-bearing because Velocity can show whether AI use is spreading, but it cannot always show whether use is becoming more sophisticated, more repeatable, or more economically defensible. Any future implementation must preserve the nine invariants, the scope guardrails, and the aggregate-only evidence model.

## 2. The Gap Velocity Leaves Open

Velocity observes whether AI use is frequent, persistent, and broad across a cohort. That is the right lens during growth: access expands, people return more often, and use spreads across surfaces.

But a cohort can eventually saturate. Users may be active nearly every day, touch many surfaces, and generate high volume. At that point, Velocity flattens. More usage no longer proves more capability. The diagnostic question changes from "is AI use spreading?" to "what kind of AI use is this becoming?"

That is the gap Maturity addresses. It asks whether a saturated or maturing cohort is showing deeper behaviors: verifying outputs, invoking a wider workflow repertoire, creating reusable workflows, recovering from AI failures, and moving from one-off interactions toward repeatable operating patterns.

The distinction is simple:

- **Velocity** describes adoption growth.
- **Maturity** describes depth of use.

Both are needed. A cohort can be high velocity and shallow. A different cohort can be lower volume but more mature because its AI use is verified, repeatable, and tied to durable workflows.

## 3. External Maturity Pattern

External AI maturity research generally describes the same progression in different language:

1. **Access and experimentation.** People try AI, policies emerge, and education begins.
2. **Pilots and use cases.** Teams find repeatable examples and early wins.
3. **Workflow adoption.** AI becomes part of regular work, with dashboards, platforms, and operational routines.
4. **Operating model change.** Work is redesigned around AI, agents, automation, and new decision flows.
5. **Value engine.** AI creates durable productivity, revenue, service, or operating leverage.

FluencyTracr should not copy those models as a generic maturity ladder. Its contribution is narrower and more defensible: it can show the behavioral evidence underneath the progression. It can reveal whether a cohort's AI use is still exploratory, whether it has become repeatable, and whether value claims should be treated as credible, shallow, or still emerging.

## 4. Definition: What Maturity Is

Maturity is a cohort-distribution-level observation of depth and sophistication in aggregate AI use. It is not a single raw usage count. It is not a label assigned to people. It is a lens for interpreting whether a cohort's AI behavior has moved beyond access and repetition toward verified, reusable, and workflow-embedded practice.

The initial maturity dimensions are:

- **Verification depth** - the rate and distribution of verification behavior, such as citation clicks, votes, feedback, and other approved verification joins on parent surfaces.
- **Workflow repertoire** - the distribution of distinct workflows or surfaces invoked by cohort members over the window.
- **Reusable workflow creation** - the aggregate presence of named, reusable Skills or workflow agents that are created, invoked, and reused.
- **Agent relationship mix** - the cohort distribution across autonomous, named-workflow, and ephemeral agent sub-surfaces.
- **Recovery discipline** - whether failed or low-quality AI attempts are followed by successful recovery behavior instead of abandonment.

Each dimension may be computed from lower-level records inside the approved privacy boundary, but FluencyTracr may only emit cohort distributions, aggregate rates, or fail-closed verdict metadata. The system must not name, rank, or score any person.

## 5. Why Maturity Is Separate From Velocity

Velocity and Maturity answer different questions.

Velocity asks:

- Are people showing up?
- Are they returning?
- Are they using more than one surface?
- Is AI becoming a normal part of the work rhythm?

Maturity asks:

- Are people verifying what AI returns?
- Are workflows becoming reusable?
- Are agents being used for delegation, not only exploration?
- Are failures recovered instead of abandoned?
- Are value claims supported by higher-quality behavior?

This separation matters because volume can mislead. A surface with high usage but almost no verification may represent activity without depth. A cohort with modest volume but strong verification and reusable workflows may represent a more economically defensible pattern.

The system should report Velocity and Maturity side by side. It should not hide one behind the other, and it should not use a tunable threshold to decide which one matters. Interpretation can change by context, but the evidence should remain visible.

## 6. The Maturity Map

The recommended executive framing is a two-axis diagnostic:

| | Low Maturity | High Maturity |
| --- | --- | --- |
| **High Velocity** | High adoption, emerging depth | Sophisticated AI operation |
| **Low Velocity** | Early or stalled adoption | Narrow expert use |

This map is intentionally descriptive, not punitive. It helps value-realization teams decide what intervention fits the observed pattern.

- **Low velocity, low maturity:** start with enablement, workflow discovery, and access-to-habit conversion.
- **High velocity, low maturity:** improve verification, reusable workflow design, and agent quality.
- **Low velocity, high maturity:** spread proven practices from expert pockets without exposing people.
- **High velocity, high maturity:** standardize, scale, and attach outcome evidence.

The economic "so what" is not that a maturity label creates value. The value comes from using maturity evidence to discount, preserve, or amplify claims about time saved, operating leverage, and workflow transformation.

## 7. How Maturity Preserves the Governance Posture

Maturity must preserve all nine invariants:

1. **No new canonical events by concept alone.** This document adds no event. Future implementation must either reuse existing canonical events or explicitly govern any expansion before code exists.
2. **No new suppression reasons.** Existing suppression reasons remain unchanged.
3. **No tunable thresholds.** Maturity bands, if implemented, must be compiled constants or governed artifacts, not admin-adjustable knobs.
4. **No admin overrides.** A suppressed maturity readout cannot be manually surfaced.
5. **No individual scoring.** Maturity may use per-user computation inside the privacy boundary, but only aggregate distributions may leave it.
6. **Default verdict is SUPPRESS.** Small or ambiguous cohorts suppress automatically under the existing fail-closed posture.
7. **Latency is corroborative only.** Maturity does not turn speed into a surfacing trigger.
8. **Assurance Harness stays green.** Any implementation must add harness coverage and preserve existing checks.
9. **Per-slice independence.** Maturity is computed independently per workflow, JBTD, persona, tenure cohort, or other approved aggregate slice. Small slices suppress independently.

Maturity is allowed only if these constraints remain stronger than the desire to expose a more granular story.

## 8. What Maturity Is Not

Maturity is NOT an individual score.

Maturity is NOT a user ranking.

Maturity is NOT employee productivity measurement.

Maturity is NOT a hiring, performance, or evaluation input.

Maturity is NOT a claim that AI caused revenue or margin improvement.

Maturity is NOT a replacement for the AI Fluency Instrument's stated-evidence layer.

Maturity is NOT a way to pressure teams into using more AI.

Any implementation, dashboard, or customer narrative that uses Maturity to identify, compare, pressure, or evaluate people is out of scope. That is not an analytics gap. It is a hard stop.

## 9. Connection to Cohort Slicing

Maturity becomes useful when it is read by safe aggregate cohorts. The approved direction is "cohort context," not identity analytics.

Candidate slices include:

- tenure cohort derived from first active date;
- AI tenure bucket derived from first observed AI use;
- velocity quartile or maturity band;
- adoption wave;
- customer-provided function, role family, or region, joined inside the customer privacy boundary;
- JBTD and persona IDs when supplied as opaque aggregate join keys.

The rule is unchanged: every slice must pass suppression independently. FluencyTracr may compare cohort distributions, but it must not expose individual trajectories or rescue small slices through broader aggregation.

## 10. Empirical Foundation

This concept is motivated by the scio-prod dogfood diagnostics that showed a post-saturation problem. Internal Glean usage is broad and persistent enough that Velocity can flatten, while maturity indicators still vary meaningfully.

The clearest early signals are:

- verification depth is extremely low on several high-volume surfaces;
- workflow repertoire has a heavy tail, with some cohorts invoking many more workflows than the median;
- AGENT volume separates into autonomous, named-workflow, and ephemeral sub-surfaces with different interpretations;
- reusable named workflow activity exists but is not the dominant AGENT behavior.

The headline is not that Glean is immature. The sharper read is that high adoption can still have emerging depth. That makes Maturity useful: it can identify customers or cohorts that are less active than Glean but more sophisticated in the behaviors that make value claims defensible.

## 11. Open Questions

These questions are deliberately open and must be resolved before implementation:

- Should Maturity be a standalone output, a section inside existing verdict readouts, or an input to Quality Multiplier?
- Which maturity dimensions should be visible first: verification depth, workflow repertoire, reusable workflow creation, agent mix, or recovery discipline?
- Should Maturity be reported as independent dimensions only, or should a composite Maturity Index exist later?
- How should customer-provided HR or function slices be joined inside the customer-side transformer without weakening the privacy boundary?
- Should maturity bands be descriptive labels only, or should they affect value-realization recommendations?
- How should the AI Fluency Instrument's stated-evidence dimensions converge with observed maturity dimensions?

## 12. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The post-saturation maturity framing is credited to James Kelley and grounded in the scio-prod dogfood diagnostics that showed high adoption can still have emerging verification depth, workflow reuse, and agent relationship maturity.
