# Linked Journey Motif Findings

Run date: 2026-05-27

Fresh aggregate output:

- `dogfood-output/episode-journey-microcosm/episode_journey_microcosm_linked_motifs_full_package.aggregate.csv`

Governance boundary:

- Aggregate-only linked motifs.
- No raw prompts, outputs, transcripts, names, emails, user IDs, anonymized user
  IDs, manager fields, team fields, row-level journeys, individual scores,
  team ranking, productivity claims, causality, prediction, or ROI calculation.
- Linked motifs use existing run/action, session, and trace/tracking keys only.
- Small-cell suppression still applies.

## What Changed

The pipeline now emits a `LINKED_JOURNEY_MOTIF_SUMMARY` section.

Instead of building path shapes from all events in a window, this section groups
events by the strongest available linkage key:

1. `RUN_OR_ACTION_LINKED`
2. `SESSION_LINKED`
3. `TRACE_OR_TRACKING_LINKED`

It then emits aggregate path shapes and five context metrics:

- average linked events,
- average linked categories,
- friction rate,
- continuation rate,
- verification rate.

## What We Learned

The linked approach works.

The old motif output mostly collapsed into generic or ambient paths. The linked
motif output surfaces concrete patterns such as:

- `SEARCH > AGENT_TRACE_CONTEXT`
- `SEARCH > AGENT_TRACE_CONTEXT > AGENT_TRACE_CONTEXT`
- `AGENT_TRACE_CONTEXT > AGENT_STEP_EXECUTED > AGENT_COMPLETION > WORKFLOW_RUN`
- `AGENT_STEP_EXECUTED > ACTION_SUCCESS > ... > CITATION_AVAILABLE`
- `FRICTION_STEP_SKIPPED > AGENT_STEP_EXECUTED > ... > ACTION_SUCCESS`

This is a materially better basis for behavioral interpretation than unlinked
event strings.

## Strongest Signal

Run/action-linked agent paths show the most useful behavioral evidence.

Examples observed in aggregate:

- agent trace context followed by executed steps and workflow runs,
- skipped/friction steps followed by executed steps and action success,
- agent/action paths with continuation rate equal to `1.0`,
- several agent/action paths with verification rate equal to `1.0`,
- several friction paths where continuation also equals `1.0`.

Interpretation:

- We can now identify recovery-like evidence without claiming intent.
- We can distinguish friction-with-continuation from simple abandonment.
- We can see verification-adjacent behavior attached to linked agent/action
  paths, not only standalone citation clicks.

## Search-To-Agent Evidence

The linked motif output surfaces session-linked search-to-agent trace patterns:

- `SEARCH > AGENT_TRACE_CONTEXT`
- `SEARCH > AGENT_TRACE_CONTEXT > AGENT_TRACE_CONTEXT`
- `SEARCH > SEARCH > AGENT_TRACE_CONTEXT`
- `SEARCH > SEARCH > AGENT_TRACE_CONTEXT > AGENT_TRACE_CONTEXT`

Interpretation:

- The search-to-agent transition is visible at aggregate level.
- These paths currently show weak continuation and verification metrics because
  they are session-linked context paths, not run/action-linked execution paths.
- This suggests we should report them as navigation/escalation evidence, not
  trust or outcome evidence.

## Recovery Evidence

The linked motifs show many run/action-linked paths where friction is followed
by continuation:

- friction rate: `1.0`
- continuation rate: `1.0`
- verification rate varies from low to high

Interpretation:

- This is stronger than the previous recovery proxy.
- The safer language is “post-friction continuation” or “recovery-like
  evidence,” not proof that the first answer failed or that a person intended to
  recover.

## Verification Evidence

Some linked agent/action paths show verification rate equal to `1.0`.

Interpretation:

- Trust evidence is stronger when verification appears inside a run/action
  linked motif.
- Citation clicks alone are still too sparse to carry the trust story.
- The defensible claim is that some linked workflows contain verification
  evidence, while other workflows remain evidence gaps.

## Noise To Separate

The largest linked motif counts are still single-event autocomplete paths:

- `AUTOCOMPLETE` appears as the top linked motif in all three windows.

Interpretation:

- Autocomplete is real activity, but it should not dominate executive journey
  motifs.
- It belongs in a separate “high-volume assistive surface” lane, not in the
  same lane as linked agent/workflow execution.

Single-event search and standalone action-success motifs also need separate
handling. They are useful for surface coverage but weak for journey narrative.

## Updated Hypothesis

The linked motif evidence strengthens the FluencyTracr hypothesis:

> Aggregate AI fluency is observable as linked work episodes that combine
> velocity, depth, surface breadth, trust evidence, post-friction continuation,
> and source coverage context.

It also narrows the ROI path:

- We still cannot calculate ROI from this telemetry alone.
- We can identify where value investigation is credible.
- Run/action-linked paths with continuation and verification are better
  candidates for customer-owned time/value assumptions.
- Search-to-agent paths are useful escalation evidence but should not drive ROI
  assumptions without outcome data.
- Autocomplete and unlinked bot activity should be excluded from ROI-style
  claims unless separately validated.

## Recommended Next Step

Create a motif tiering layer:

1. `EXECUTION_LINKED_WORKFLOW`
   Run/action-linked motifs with agent/action/workflow activity.

2. `SEARCH_TO_AGENT_ESCALATION`
   Session-linked search paths that reach agent trace context.

3. `POST_FRICTION_CONTINUATION`
   Linked motifs with friction rate and continuation rate both present.

4. `VERIFICATION_ATTACHED_WORKFLOW`
   Linked motifs where verification appears inside the linked path.

5. `HIGH_VOLUME_ASSISTIVE_SURFACE`
   Autocomplete and similar single-event assistive paths.

6. `WEAK_LINKAGE_CONTEXT`
   Bot, MCP, summary, or context-only paths that should remain caveated.

This tiering would make the executive readout cleaner and would prevent
high-volume assistive events from drowning out workflow evidence.
