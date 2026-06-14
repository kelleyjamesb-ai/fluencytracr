# Work Mode Taxonomy

## 1. Purpose

This document defines the V4 work mode taxonomy for FluencyTracr. It sits above
the surface taxonomy and describes what kind of AI work a governed surface
represents. The taxonomy is documentation-stage only: it adds no canonical
events, suppression reasons, thresholds, schemas, APIs, storage, frontend
surfaces, or economic readouts. Its immediate purpose is to prepare
taxonomy-aware Quality Multiplier and Reliability Factor calibration so Velocity,
Depth, quality, and reliability can speak the same surface language.

## 2. First Principles

The unit of analysis is not an event name. The unit is a user-initiated AI work
interaction that can produce aggregate evidence without double-counting lower
level telemetry.

Event names are implementation artifacts. Work modes are interpretation
boundaries. A surface such as `standalone:SEARCH` matters because it represents
retrieval-oriented AI work, not because the literal event type is `SEARCH`.
Likewise, `workflow:agent:autonomous` matters because it represents delegated
execution, not because it is a variant of AGENT. FluencyTracr needs both layers:
surface IDs for deterministic telemetry mapping, and work modes for defensible
interpretation.

## 3. Why Surface Names Are Not Enough

The expanded surface taxonomy in [SURFACES.md](./SURFACES.md) answers what is
in scope. That is necessary but incomplete. V4 value confidence also needs to
know what the surface means.

Treating every surface as a flat peer creates three problems:

- High-volume, low-intent surfaces can overpower lower-volume but more
  diagnostically meaningful work.
- Distinct behaviors can collapse into one bucket, as the older AGENT surface
  did before the autonomous / named-workflow / ephemeral split.
- Quality and reliability can be interpreted too narrowly if standalone
  surfaces are absent from the same taxonomy used by Velocity and Depth.

Work modes solve this by grouping surfaces by the kind of work pattern they
represent while preserving the original surface IDs for gate evaluation.

## 4. Definition: Work Mode

A work mode is an aggregate interpretation category for governed AI surfaces.
It answers:

```text
What kind of work relationship with AI does this surface represent?
```

A work mode is not a canonical event. It is not a suppression reason. It is not
a score, maturity label, or hidden multiplier. It is a mapping layer that helps
V4 reason about whether observed behavior represents retrieval, conversation,
transformation, embedded assistance, delegation, reusable workflow use,
exploration, domain-specific work, verification, or corroborative telemetry.

Each governed surface may map to one primary work mode. Some surfaces may also
carry secondary evidence roles, such as verification attribution or reliability
corroboration, but those roles must not inflate surface volume.

## 5. The Final Work Mode Set

### Retrieval

Retrieval covers AI-assisted finding, ranking, or answering from enterprise
knowledge. First-class examples include `standalone:SEARCH` and
`workflow:AI_ANSWER`.

Retrieval is often the broadest entry point into AI-assisted work. It supports
Velocity and surface repertoire, but it should not automatically imply deep work
integration unless repeated use, verification, or workflow context supports
that interpretation.

### Conversational Work

Conversational Work covers interactive AI collaboration where the user works
through a task, question, or thread with an AI assistant. Examples include
`workflow:CHAT`, `workflow:GLEANBOT`, eligible
`standalone:GLEAN_BOT_ACTIVITY`, and `workflow:VOICE_CHAT`.

This mode can support transformation, reasoning, and problem solving, but the
mode itself is intentionally neutral. Conversation volume is not enough. V4 must
look for repetition, verification, recovery, and outcome context before
strengthening a value claim.

### Synthesis / Transformation

Synthesis / Transformation covers turning existing information into a new
usable form: summaries, drafts, next steps, rewritten material, or structured
outputs. Examples include `standalone:AI_SUMMARY`,
`workflow:THREAD_SUMMARIZER`, and workflow surfaces whose governed semantics
are summary, drafting, writing, or transformation.

This mode is important for time-saved claims, but it is also sensitive to
quality risk. Verification and recovery evidence matter.

### Embedded Assist

Embedded Assist covers AI assistance inside another workflow rather than AI
becoming the primary work surface. Examples include
`standalone:AUTOCOMPLETE`, `workflow:INLINE_MENU`,
`workflow:AGENT_LIVE_PREVIEW`, and embedded integration support surfaces.

This mode can create meaningful acceleration, but high volume may reflect
ambient assistance rather than durable work integration. It should contribute to
Velocity and breadth carefully, with Quality Multiplier and Reliability Factor
interpreting it against the parent workflow context.

### Delegated Execution

Delegated Execution covers cases where the user delegates multi-step execution,
tool use, or goal-directed work to AI. Examples include
`workflow:agent:autonomous`, `standalone:MCP_USAGE`, and
`workflow:MCP_AGENT_WORKFLOW`.

This mode is central to Delegation Depth. It can increase value confidence only
when the evidence also shows appropriate reliability, recovery, verification,
and governance. Delegation without dependable outcomes is not stronger evidence.

### Reusable Workflow / Skill

Reusable Workflow / Skill covers named, reusable, structured AI workflows such
as `workflow:agent:workflow_named` when the metadata is observable.

This mode is the clearest signal of repeatable AI work design, but it remains
subject to the named-workflow metadata observability gap documented in current
dogfood research. Absence of this mode in an export must be treated carefully:
it may reflect missing metadata rather than missing behavior.

### Exploratory Agent Work

Exploratory Agent Work covers one-off agentic activity without a reusable named
definition. The primary example is `workflow:agent:ephemeral`.

This mode is not a negative label. It may represent exploration, incident
response, bespoke problem solving, or early workflow discovery. It should not be
treated as weaker than reusable workflow use without context.

### Specialized Workflow

Specialized Workflow covers governed domain-specific AI workflow surfaces that
do not naturally collapse into the broader modes above. Examples include
`workflow:PRISM`, `workflow:INTERACTIVE_COMPILER`,
`workflow:SUPPORT_NEXT_STEPS`, `workflow:SPACES`, and similar product-defined
workflow surfaces.

These surfaces remain first-class. Their work mode should preserve their
domain-specific meaning until evidence supports a narrower mapping.

### Verification / Feedback

Verification / Feedback covers signals such as `CHAT_CITATION_CLICK`,
`AI_ANSWER_VOTE`, `AI_SUMMARY_VOTE`, `SEARCH_FEEDBACK`, and `CHAT_FEEDBACK`.

These are not standalone surfaces. They are attribute joins onto parent
surfaces. Their role is to strengthen or caveat evidence about the parent
surface, not to increase surface volume.

### Corroborative Telemetry

Corroborative Telemetry covers events such as `ACTION`, `LLM_CALL`,
`PRODUCT_SNAPSHOT`, and `CLIENT_EVENT`.

These are never first-class surfaces. They may enrich parent records for
latency, model, cost, reliability, or metadata interpretation when governed
join logic allows it. They must not be counted as user-initiated AI surface
volume.

## 6. Evidence Role Model

Work modes carry evidence roles:

| Role | Meaning |
| --- | --- |
| First-class surface | Counts as governed AI surface volume after taxonomy rules and gates. |
| Attribute-only | Joins to parent records and improves evidence quality without adding volume. |
| Corroborative | Enriches parent interpretation but cannot surface independently. |
| Excluded | Must not contribute to surface volume or V4 readouts. |

This role model prevents double-counting while preserving useful evidence.

## 7. Connection to Taxonomy-Aware QM/RF Calibration

The immediate V4 calibration gap is that Depth Repertoire and Velocity are now
taxonomy-aware, while Quality Multiplier and Reliability Factor still depend on
older workflow-only aggregate inputs.

Work modes define the bridge. A taxonomy-aware QM/RF diagnostic should emit
aggregate quality and reliability inputs by governed surface ID and work mode,
using the same surface boundaries as Velocity and Depth. That is what will let
V4 test whether Depth Repertoire changes value confidence beyond Velocity
alone.

This document does not implement that diagnostic. It defines the interpretation
layer it must preserve.

## 8. Devil's Advocate

The danger of this taxonomy is overclassification. Too many modes would look
precise but fail in practice. A surface can support several kinds of work, and
customer-specific context will vary.

The correction is to keep the top-level set small and stable, then let surface
IDs preserve precision below it. Work modes should help interpretation, not
replace per-surface independence. If a surface does not clearly fit, it should
remain `Specialized Workflow` until evidence supports a better mapping.

The opposite danger is underclassification. If everything becomes generic AI
usage, V4 cannot distinguish retrieval from delegation, reusable workflow use
from exploration, or verification from activity. That would make the model
easier to implement but weaker as evidence.

## 9. Governance Boundaries

The work mode taxonomy preserves all nine invariants:

1. It adds no canonical events.
2. It adds no suppression reasons.
3. It introduces no tunable thresholds.
4. It creates no admin override.
5. It emits no person-level outputs.
6. It does not weaken default `SUPPRESS`.
7. It keeps latency corroborative only.
8. It requires future implementation PRs to keep the Assurance Harness green.
9. It preserves per-slice independence by mapping each surface independently.

Work modes must not be used to rank individuals, teams, departments, customers,
or managers. They must not create productivity scoring, ROI calculation,
causal claims, or customer-facing prediction claims.

## 10. Open Questions

- Should `workflow:GLEANBOT` and eligible `standalone:GLEAN_BOT_ACTIVITY` both
  remain Conversational Work, or should bot-mediated work eventually split by
  channel context?
- Should `standalone:AUTOCOMPLETE` carry lower interpretive weight in Depth
  because it is embedded and high volume, or should that be handled only by
  downstream calibration?
- When named workflow metadata becomes reliable, should Reusable Workflow /
  Skill remain a work mode or become a deeper submode under Delegated
  Execution?
- Which specialized workflow surfaces should graduate into a narrower work mode
  after additional customer evidence?
- How should customer-specific HR or system-of-record joins, computed inside
  the customer boundary, affect work mode interpretation without weakening the
  aggregate-only posture?

## 11. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The
work-mode taxonomy framing is credited to James Kelley: value-confidence
calibration needs to classify AI work by behavioral intent and evidence role,
not by event names alone.
