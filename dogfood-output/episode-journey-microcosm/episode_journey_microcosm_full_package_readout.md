# Episode Journey Microcosm Full Package Readout

Run date: 2026-05-27

Source package:

- `scio-apps.scrubbed_glean_customer_event.scrubbed_glean_customer_event`
- `scio-apps.scrubbed_agentspan.scrubbed_agentspan_*`

Clean aggregate output:

- `dogfood-output/episode-journey-microcosm/episode_journey_microcosm_full_package.aggregate.csv`

Governance boundary:

- Aggregate-only output.
- No raw prompts, outputs, transcripts, names, emails, user IDs, anonymized user IDs, manager fields, team fields, row-level journeys, individual scores, team ranking, ROI, productivity, causality, or prediction.
- Small cells are suppressed independently.

## Executive Readout

This run shows that the methodology can do more than count adoption. It can
separate AI work into observable behavioral patterns: velocity, depth,
trust interpretability, reliability context, quality context, and action
posture.

The strongest visible pattern is not broad shallow use. The stronger pattern is
high-velocity, integrated-repertoire work with structural verification evidence.
That means the signal is pointing at repeated, multi-surface AI work where the
system can see verification-adjacent behavior and post-friction continuation.

The most important weakness is journey classification. The system can detect the
framework bands, but many path motifs still collapse into generic event labels.
Before this becomes a client-ready executive artifact, source-event
classification needs to be sharpened so the story can explain workflow paths,
not just framework bands.

## Window Summary

| Window | Aggregate sample windows | Avg frequency | Avg active days | Avg breadth | Avg reliability context | Avg quality context |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 13 | 71.2840 | 17.1538 | 5.1538 | 0.7115 | 1.2192 |
| `window_2` | 14 | 63.4441 | 16.6429 | 4.8571 | 0.6429 | 1.1179 |
| `window_3` | 14 | 75.4401 | 19.0000 | 5.4286 | 0.6875 | 1.1804 |

Interpretation:

- Frequency and engagement are durable across the three windows.
- Breadth is consistently above five surfaces on average in windows 1 and 3.
- Reliability context stays in the mid-to-high range, but it is not uniformly
  strong enough to treat trust as solved.
- Quality context is supportive overall, but this is not ROI and not a time
  saved proof.

## Classification Findings

### Velocity

| Window | Visible velocity bands |
| --- | --- |
| `window_1` | `HIGH_VELOCITY`: 7 aggregate windows |
| `window_2` | `HIGH_VELOCITY`: 6, `MEDIUM_VELOCITY`: 6 |
| `window_3` | `HIGH_VELOCITY`: 8 |

Interpretation:

- The diagnostic does surface velocity classifications when shown as a separate
  axis.
- Lower-volume velocity cells are suppressed rather than exposed.
- The strongest visible velocity pattern is high velocity, not shallow one-time
  adoption.

### Depth Repertoire

| Window | Visible depth bands |
| --- | --- |
| `window_1` | `INTEGRATED_REPERTOIRE`: 7, `FOCUSED_INTEGRATION`: 5 |
| `window_2` | `INTEGRATED_REPERTOIRE`: 7, `FOCUSED_INTEGRATION`: 5 |
| `window_3` | `INTEGRATED_REPERTOIRE`: 9, `FOCUSED_INTEGRATION`: 5 |

Interpretation:

- This sample shows repeatable depth evidence, not just usage volume.
- Integrated repertoire appears in every window and grows in the latest window.
- Focused integration also persists, which may represent concentrated expert
  use rather than broad multi-surface fluency.

### Trust Interpretability

| Window | Visible trust bands |
| --- | --- |
| `window_1` | `STRUCTURAL_VERIFICATION_EVIDENCE`: 7, `EVIDENCE_GAP`: 6 |
| `window_2` | `STRUCTURAL_VERIFICATION_EVIDENCE`: 7, `EVIDENCE_GAP`: 7 |
| `window_3` | `STRUCTURAL_VERIFICATION_EVIDENCE`: 8, `EVIDENCE_GAP`: 5 |

Interpretation:

- Trust evidence is mixed, which is useful. This is not a false all-green story.
- Structural verification evidence is visible in every window.
- Evidence gaps remain meaningful and should be part of the executive output.
- Citation clicks alone should not be treated as the trust story.

### Reliability Context

| Window | Visible reliability bands |
| --- | --- |
| `window_1` | `HIGH_RELIABILITY_CONTEXT`: 6, `MEDIUM_RELIABILITY_CONTEXT`: 7 |
| `window_2` | `MEDIUM_RELIABILITY_CONTEXT`: 11 |
| `window_3` | `HIGH_RELIABILITY_CONTEXT`: 8, `MEDIUM_RELIABILITY_CONTEXT`: 6 |

Interpretation:

- Reliability is not flat. It changes by window and pattern.
- Window 2 is materially more medium-reliability than high-reliability.
- Window 3 improves back toward high-reliability context.

### Quality Context

| Window | Visible quality bands |
| --- | --- |
| `window_1` | `QUALITY_SUPPORTIVE_CONTEXT`: 6, `QUALITY_NEUTRAL_CONTEXT`: 7 |
| `window_2` | `QUALITY_NEUTRAL_CONTEXT`: 11 |
| `window_3` | `QUALITY_SUPPORTIVE_CONTEXT`: 8, `QUALITY_NEUTRAL_CONTEXT`: 6 |

Interpretation:

- Quality context moves with reliability context.
- This can support a value investigation, but it does not justify a dollarized
  ROI claim yet.
- The signal is useful because it can tell leaders where time-saved assumptions
  are better supported versus where they need discounting or investigation.

### Readout Zones

| Window | Visible readout zones |
| --- | --- |
| `window_1` | `SCALE_CANDIDATE`: 6, `TRUST_EVIDENCE_GAP`: 6 |
| `window_2` | `TRUST_EVIDENCE_GAP`: 7, `SCALE_CANDIDATE`: 5 |
| `window_3` | `SCALE_CANDIDATE`: 7, `TRUST_EVIDENCE_GAP`: 5 |

Interpretation:

- The new method produces an executive action split: scale candidates versus
  trust-evidence gaps.
- This is more useful than adoption reporting because it says where to expand
  and where to instrument or verify before scaling.
- Window 2 is the cautionary window: it has visible velocity and depth, but
  trust-evidence gaps and medium reliability dominate.

## Primitive Confidence Findings

Visible primitive tiers:

- `HEAVY_RETRY_OR_REFINEMENT_LOOP` appears in all three windows: 11, 12, 13.
- `DIRECT_POST_FRICTION_SUCCESS` appears in windows 2 and 3: 6 and 9.
- `STRUCTURAL_VERIFICATION_EVIDENCE` appears in all three windows: 7, 7, 8.
- `EVIDENCE_GAP` remains visible in all three windows: 6, 7, 5.
- `NO_OBSERVED_TERMINAL_EVIDENCE` remains visible in all three windows: 6, 7, 5.

Interpretation:

- The methodology is finding a real tension: heavy retry/refinement is common,
  but by itself it does not prove quality or failure.
- Post-friction success in windows 2 and 3 is a promising recovery signal.
- Trust evidence needs to be presented as a balance of verification evidence,
  continuation evidence, and gaps.

## What Is Unique Here

The unique finding is not that people use AI. The unique finding is that the
same telemetry can separate different operational conditions:

- high velocity with integrated depth and structural verification,
- velocity/depth with trust evidence gaps,
- reliability-supported work versus medium-reliability work,
- quality-supportive context versus neutral context,
- friction followed by success versus friction without enough continuation
  evidence,
- scale candidates versus areas that need trust evidence repair.

That gives leaders a better question set:

- Where can we scale AI usage with more confidence?
- Where is AI activity high but trust evidence incomplete?
- Where is retry/refinement likely productive versus potentially wasteful?
- Where do we need better source coverage before making claims?
- Which value hypotheses deserve investigation, not ROI proof?

## Weaknesses To Fix Next

1. Journey motifs are under-classified.
   The current path output still produces generic `OTHER_AI_EVENT` chains.

2. The query is too expensive for repeat client use.
   This run processed about 4.69 TB. Client use needs a cheaper two-pass shape:
   sample or pre-aggregate eligible actors first, then expand only approved
   aggregate traces.

3. Trust evidence needs source-specific sharpening.
   Citation clicks are too sparse to carry trust. We should focus on structural
   verification, feedback, post-friction continuation, terminal success, and
   source coverage caveats.

4. The executive artifact needs plain-language labels.
   Current labels are good for research but still too table-like for external
   presentation.

## Recommended Next Move

Build the client-facing package from this shape, not from the old combined
portfolio rows alone:

- one executive summary,
- one velocity x depth view,
- one trust and reliability evidence view,
- one quality/context view,
- one source coverage and evidence-gap view,
- one appendix with aggregate-safe classification distributions.

Do not add ROI, individual scoring, team ranking, causality, prediction, or new
canonical events.
