# Motif Tier Findings

Run date: 2026-05-27

Fresh aggregate output:

- `dogfood-output/episode-journey-microcosm/episode_journey_microcosm_motif_tiers_full_package.aggregate.csv`

BigQuery job:

- `scio-apps:bqjob_raa72300bfaf3b61_0000019e6cd83ca6_1`
- Status: `SUCCESS`
- Duration: `0:05:26.970000`
- Bytes processed: `4,929,252,597,869`

Governance boundary:

- Aggregate-only motif tiers.
- No raw prompts, outputs, transcripts, names, emails, user IDs, anonymized
  user IDs, manager fields, team fields, row-level journeys, individual scores,
  team ranking, productivity claims, causality, prediction, or ROI calculation.
- Motif tiers are research readout context, not canonical events, suppression
  reasons, runtime outputs, schemas, APIs, or customer-facing economic claims.
- Small-cell suppression remains applied in the linked motif layer before tier
  summarization.

## What Changed

The diagnostic now emits `MOTIF_TIER_SUMMARY` after the linked journey motif
section.

The tiering layer groups aggregate linked path shapes into executive-readable
evidence lanes:

| Tier | Meaning |
| --- | --- |
| `HIGH_VOLUME_ASSISTIVE_SURFACE` | High-volume single-surface assistance such as autocomplete and search. Useful for reach and surface coverage, weak for workflow evidence. |
| `POST_FRICTION_CONTINUATION` | Run/action-linked paths where friction appears and work continues afterward. Strongest recovery-like evidence, without claiming intent. |
| `VERIFICATION_ATTACHED_WORKFLOW` | Run/action-linked workflow paths where verification evidence appears inside the linked path. Strongest trust-adjacent lane. |
| `EXECUTION_LINKED_WORKFLOW` | Run/action-linked agent/action/workflow execution paths without attached verification. Strong workflow evidence, weaker trust evidence. |
| `SEARCH_TO_AGENT_ESCALATION` | Session-linked search paths that reach agent trace context. Good navigation/escalation evidence, not outcome evidence. |
| `WEAK_LINKAGE_CONTEXT` | Context-only, bot, MCP, summary, or trace-context-heavy paths that need coverage caveats. |
| `OTHER_LINKED_CONTEXT` | Residual linked context that does not fit the lanes above. |

## Motif Tier Results

Counts below are aggregate linked motifs in the 20-sampled-user microcosm. They
are not person-level counts.

| Window | Tier | Aggregate count | Share of tiered motifs | Motif shapes | Avg linked events | Friction rate | Continuation rate | Verification rate |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Window 1 | High-volume assistive surface | 8,065 | 93.0% | 2 | 1.0 | 0.00 | 0.00 | 0.00 |
| Window 1 | Post-friction continuation | 202 | 2.3% | 122 | 27.9 | 1.00 | 1.00 | 0.46 |
| Window 1 | Verification-attached workflow | 146 | 1.7% | 54 | 25.1 | 0.00 | 1.00 | 0.98 |
| Window 1 | Search-to-agent escalation | 103 | 1.2% | 41 | 7.2 | 0.00 | 0.00 | 0.00 |
| Window 1 | Execution-linked workflow | 84 | 1.0% | 42 | 23.0 | 0.00 | 1.00 | 0.00 |
| Window 1 | Other linked context | 60 | 0.7% | 8 | 8.6 | 0.00 | 0.00 | 0.00 |
| Window 1 | Weak linkage context | 16 | 0.2% | 2 | 1.5 | 0.00 | 0.00 | 0.00 |
| Window 2 | High-volume assistive surface | 7,828 | 92.0% | 2 | 1.0 | 0.00 | 0.00 | 0.00 |
| Window 2 | Post-friction continuation | 305 | 3.6% | 224 | 25.6 | 1.00 | 1.00 | 0.51 |
| Window 2 | Search-to-agent escalation | 142 | 1.7% | 42 | 7.8 | 0.00 | 0.00 | 0.00 |
| Window 2 | Weak linkage context | 117 | 1.4% | 9 | 4.4 | 0.00 | 0.00 | 0.00 |
| Window 2 | Execution-linked workflow | 57 | 0.7% | 11 | 10.7 | 0.00 | 0.91 | 0.00 |
| Window 2 | Verification-attached workflow | 46 | 0.5% | 16 | 23.1 | 0.00 | 1.00 | 1.00 |
| Window 2 | Other linked context | 14 | 0.2% | 4 | 6.0 | 0.00 | 0.00 | 0.00 |
| Window 3 | High-volume assistive surface | 9,167 | 88.3% | 2 | 1.0 | 0.00 | 0.00 | 0.00 |
| Window 3 | Post-friction continuation | 384 | 3.7% | 180 | 34.6 | 1.00 | 1.00 | 0.56 |
| Window 3 | Execution-linked workflow | 334 | 3.2% | 14 | 7.1 | 0.00 | 0.93 | 0.00 |
| Window 3 | Weak linkage context | 255 | 2.5% | 9 | 3.7 | 0.00 | 0.00 | 0.00 |
| Window 3 | Search-to-agent escalation | 197 | 1.9% | 61 | 9.0 | 0.00 | 0.00 | 0.00 |
| Window 3 | Verification-attached workflow | 22 | 0.2% | 12 | 22.9 | 0.00 | 1.00 | 1.00 |
| Window 3 | Other linked context | 21 | 0.2% | 5 | 57.0 | 0.00 | 0.60 | 0.60 |

## What We Learned

The tiering layer materially improves the readout.

Before tiering, the strongest paths were visible but buried under high-volume
assistive events. After tiering, the readout separates reach from workflow
evidence:

- High-volume assistive surfaces dominate volume in every window, but they do
  not carry trust, recovery, or outcome evidence by themselves.
- Post-friction continuation is consistently visible across all three windows
  and grows from 202 to 305 to 384 aggregate motifs.
- Verification-attached workflow is smaller, but when it appears it is strongly
  linked to workflow continuation.
- Execution-linked workflow expands in Window 3, which supports the Depth
  Repertoire hypothesis more than a simple adoption-volume story.
- Search-to-agent escalation is visible, but it should remain navigation
  evidence until stronger run/action linkage or outcome evidence is attached.
- Weak linkage context is useful as a source-coverage caveat, not as a value
  claim.

## Commercialization Implication

This gets FluencyTracr closer to an executive-ready evidence package because it
can now explain different kinds of AI work without collapsing them into one
usage chart:

- `HIGH_VOLUME_ASSISTIVE_SURFACE`: where AI is present and frequently touched.
- `EXECUTION_LINKED_WORKFLOW`: where AI is attached to actual workflow
  execution.
- `POST_FRICTION_CONTINUATION`: where work continues after friction rather than
  disappearing into an evidence gap.
- `VERIFICATION_ATTACHED_WORKFLOW`: where trust-adjacent evidence attaches to
  the workflow path.
- `SEARCH_TO_AGENT_ESCALATION`: where users appear to move from discovery into
  agent context, but outcome evidence is not yet strong enough.

This is more defensible than a single fluency score because each lane has a
different evidence strength and a different appropriate executive action.

## Value Boundary

The motif tiers do not calculate ROI.

What they can support:

- value hypothesis routing,
- source-coverage discussion,
- workflow redesign targets,
- trust-evidence gap diagnosis,
- selection of customer-owned outcome joins,
- prioritization of where a pilot should investigate time/value assumptions.

What they cannot support yet:

- dollarized savings,
- productivity claims,
- causal claims,
- individual fluency scoring,
- team or manager ranking,
- customer-facing economic claims.

## Recommended Next Step

The next bounded step should be an executive pilot packet that uses this tiering
as the backbone:

1. Show the aggregate AI work evidence model.
2. Show Velocity x Depth with tier overlays.
3. Show the motif tier distribution by window.
4. Show trust/reliability/source-coverage caveats beside the tiers.
5. Route each tier to a customer-owned value hypothesis, not an ROI result.

Before customer use, the packet still needs a customer-approved aggregate export
template and a source-coverage declaration so weak-linkage and evidence-gap
lanes do not get overstated.
