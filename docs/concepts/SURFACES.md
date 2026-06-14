# Surface Taxonomy

## 1. Purpose

This document defines the AI surface taxonomy as a future V2.1 primitive for FluencyTracr. It establishes the conceptual basis before any code is written or any verdict depends on the expanded scope. The taxonomy is load-bearing on the governance posture and on the empirical accuracy of every FluencyTracr verdict: if the system only observes part of where AI work happens, its value-realization claims are necessarily partial.

## 2. The Scope Artifact in V1

V1 measured only surfaces that carried a `workflow_run` structure. That was useful for the first implementation, but it was not a principled boundary around AI use. It was a query-design artifact.

The V1 BigQuery aggregation grouped by `jsonPayload.workflowrun.feature`. That choice structurally excluded events without the `workflow_run` wrapper, even when those events represented clear user-initiated AI interactions. The exclusion was mechanical, not a deliberate decision that search, autocomplete, summary, MCP, or verification activity should sit outside FluencyTracr forever.

V2.1 treats that as a scope correction, not a governance change.

## 3. The Empirical Gap

A 60-day scio-prod diagnostic showed that the V1 query captured only a small part of measurable AI surface activity.

| Category | Event count |
| --- | ---: |
| Workflow surfaces (V1 in scope) | ~3.3M events across 13 surfaces |
| SEARCH | 13,554,934 |
| AUTOCOMPLETE | 8,613,896 |
| GLEAN_BOT_ACTIVITY | 2,879,106 |
| MCP_USAGE | 322,750 |
| AI_SUMMARY | 15,090 |
| CHAT_CITATION_CLICK | 11,154 |
| AI_ANSWER_VOTE | 17 |
| AI_SUMMARY_VOTE | 2 |
| CLIENT_EVENT | 89,526,008 |
| ACTION | 28,921,675 |
| LLM_CALL | 24,851,159 |
| PRODUCT_SNAPSHOT | 16,572,550 |

The first-class addressable AI-use set is workflow surfaces plus standalone non-workflow surfaces plus direct verification signals: roughly 28M events. V1 measured roughly 3.3M, or about 12% by event count.

The larger sub-event volumes are not ignored. They are corroborative telemetry. They are not first-class surface volume because they can represent decomposition of a parent interaction, system state, or infrastructure behavior.

## 4. Definition: What Counts as an AI Surface

A surface is any discrete user-initiated AI interaction. The expanded taxonomy has three categories.

### WORKFLOW SURFACES

Workflow surfaces are events with a populated `workflow_run` structure. This is the V1 set: AGENT, CHAT, GLEANBOT as `workflow_run`, AI_ANSWER, VOICE_CHAT, AGENT_LIVE_PREVIEW, INTERACTIVE_COMPILER, SPACES, INLINE_MENU, EMBEDDED_INTEGRATION_SUPPORT, PRISM, SUPPORT_NEXT_STEPS, and GITHUB_PR_DESCRIPTION_GENERATOR. V2.3 splits AGENT into `agent:autonomous`, `agent:workflow_named`, and `agent:ephemeral`.

These remain first-class surfaces.

See [AGENT_TYPES.md](./AGENT_TYPES.md) for the V2.3 three-way split of AGENT into autonomous, named-workflow, and ephemeral sub-surfaces.

### STANDALONE NON-WORKFLOW SURFACES

Standalone non-workflow surfaces are discrete AI interactions without a `workflow_run` wrapper:

- SEARCH: LM-ranked retrieval over enterprise content.
- AUTOCOMPLETE: LM-suggested query completion.
- AI_SUMMARY: generated summary of a document or thread.
- MCP_USAGE: user-invoked external tool calls through Glean's AI.
- GLEAN_BOT_ACTIVITY: conversational AI in Slack or Teams when not bridged to a `workflow_run`.

These are first-class surfaces in the expanded taxonomy.

### VERIFICATION AND FEEDBACK SIGNALS

Verification and feedback signals are small-volume, high-diagnostic events that close the V1 gap on `VERIFICATION_PRESENCE_OBSERVED`:

- CHAT_CITATION_CLICK
- AI_ANSWER_VOTE
- AI_SUMMARY_VOTE
- SEARCH_FEEDBACK

These are not standalone surfaces. They are attribute joins onto the parent workflow run or search session.

## 5. What Is Explicitly Not a Surface

This taxonomy rejects treating every telemetry event as a surface.

CLIENT_EVENT is not a surface. It represents UI interactions and is corroborative only. Most client events are non-AI actions such as scroll, settings, view changes, or interface state.

PRODUCT_SNAPSHOT is not a surface. It is a system-generated periodic state capture.

LLM_CALL is not a surface. It is infrastructure decomposition of a parent action. Counting it separately would double-count user behavior.

ACTION is not a surface. It is sub-step decomposition of a parent workflow run and has the same double-count concern.

These records may support latency, cost, model, or reliability analysis on parent records, but they are never standalone surface volume. They are also not a ranking basis, not an individual score, and not a user productivity measure.

## 6. The Anti-Double-Count Principle

A single user-initiated AI interaction produces one surface event plus possible sub-events. The taxonomy counts the surface event once. Sub-events enrich the parent record but are never added to surface totals.

Verification and feedback signals follow the same principle. A citation click or vote is joined to the parent workflow run or search session. It is not added as a separate surface interaction. The purpose is to improve the evidence attached to a surface, not to inflate surface volume.

This principle is especially important for GLEAN_BOT_ACTIVITY. Bot activity is first-class only when it is not already represented by a `workflow_run` in the same window. If a bot interaction bridges into a workflow run, the workflow run is the surface record.

## 7. How the Expanded Taxonomy Preserves Governance Invariants

The expanded taxonomy preserves all nine invariants:

1. **Canonical event set unchanged.** The taxonomy adds surface types, not canonical observation events. The six V1 canonical events plus the three V2 velocity events still apply per surface.
2. **No new suppression reasons.** The five suppression reasons remain unchanged.
3. **No tunable thresholds.** Surface eligibility is defined by taxonomy and query logic, not by admin-adjustable thresholds.
4. **No admin overrides.** A suppressed surface cannot be manually surfaced.
5. **No person-level scoring.** Expansion increases the number of surfaces measured per cohort, but outputs remain aggregate-only.
6. **Default verdict is SUPPRESS.** Per-surface suppression gates apply identically to new surfaces.
7. **Latency is corroborative only.** Sub-events can enrich latency context but cannot trigger surfacing by themselves.
8. **Assurance Harness stays green.** Any implementation PR must add coverage and preserve the harness.
9. **Per-slice independence.** Each surface evaluates independently by workflow, JBTD, and persona slice. Surfaces are not aggregated in a way that could re-identify people.

The expansion improves empirical coverage without weakening the governance model.

## 8. Connection to Velocity (forward-looking)

This section is forward-looking and does not commit FluencyTracr to a specific implementation.

The Velocity Index's BREADTH dimension, `USER_BREADTH_OBSERVED`, is more meaningful when the system sees the full AI touchpoint set. Under V1, the observed breadth ceiling was 12 surfaces. Under the expanded taxonomy, the potential ceiling moves to 16 or more surfaces, including SEARCH, AUTOCOMPLETE, AI_SUMMARY, MCP_USAGE, and eligible GLEAN_BOT_ACTIVITY.

A cohort that uses Chat plus Search plus AI Summary plus MCP is showing a different behavioral pattern than a cohort that uses Chat heavily but never leaves that entry point. The expanded taxonomy makes that breadth observable as a cohort distribution, not as person-level reporting.

## 9. Connection to V1 Verification Gap (forward-looking)

This section is forward-looking and does not commit FluencyTracr to a specific implementation.

Today many FluencyTracr verdicts remain at `evidence_grade = QUALITATIVE` because verification rate is not fully wired. The expanded taxonomy addresses that gap. CHAT_CITATION_CLICK, AI_ANSWER_VOTE, AI_SUMMARY_VOTE, and SEARCH_FEEDBACK are the verification and feedback signals `VERIFICATION_PRESENCE_OBSERVED` was designed to capture.

Joining those signals to parent workflow runs or search sessions can lift evidence quality for surfaces with sufficient verification volume. The important boundary is that verification signals improve the parent record; they do not become standalone surface count.

## 9a. Relationship to Depth

Surface breadth contributes to Velocity by showing how widely a cohort uses
available AI touchpoints.

Verification and feedback attribution contribute to Depth by showing whether
workflows carry corroborative evidence of review, correction, or confidence.

Sub-events remain corroborative and must not inflate either Velocity or Depth.
PRODUCT_SNAPSHOT, LLM_CALL, CLIENT_EVENT, and ACTION can enrich parent
interpretation only when governed taxonomy rules allow it.

## 9b. Relationship to Work Modes

Surface taxonomy defines what counts as a governed AI surface. Work Mode
Taxonomy defines what kind of AI work that surface represents.

See [WORK_MODES.md](./WORK_MODES.md) for the V4 interpretation layer that maps
governed surfaces into retrieval, conversational work, synthesis /
transformation, embedded assist, delegated execution, reusable workflow use,
exploratory agent work, specialized workflow, verification / feedback, and
corroborative telemetry.

The distinction is intentional. Surface IDs remain the deterministic telemetry
boundary. Work modes support taxonomy-aware interpretation for Velocity, Depth,
Quality Multiplier, and Reliability Factor calibration without adding new
surface volume or weakening per-surface gates.

## 10. Open Questions

These questions are deliberately open and must be resolved before V2.1 implementation:

- What is the exact join logic for verification signals to parent records: `workflow_run_id`, `session_token`, or both?
- Does SEARCH get its own canonical event detector, or does it reuse existing detectors with surface-aware semantics?
- How should AUTOCOMPLETE's high volume but low individual signal weight affect Velocity Index breadth?
- Does MCP_USAGE count each tool call or each tool-call session as the unit of analysis?
- How should GLEAN_BOT_ACTIVITY overlap with workflow-run-tagged bot events be deduplicated?
- If customer data shows meaningful published-Skill volume, should published
  Skills become an explicit surface family or remain represented through their
  parent workflow-run surfaces?

These are governance and methodology decisions, not bugs.

## 11. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The surface-taxonomy insight is credited to James Kelley: AI fluency must be measured across every AI touchpoint, not within an arbitrarily scoped subset. The concept is grounded in the scio-prod 60-day diagnostic summarized above.
