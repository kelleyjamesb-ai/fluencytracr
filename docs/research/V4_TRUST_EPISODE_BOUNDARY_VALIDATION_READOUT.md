# V4 Trust Episode Boundary Validation Readout

## Run Date

Run date: 2026-05-26

Operator: Codex

Review meeting date: pending human review

Candidate signal: Trust Episode Boundary

Decision: `PROMOTE`

`PROMOTE` means eligible for later productization review, not automatically
productized. This readout does not add product behavior, schemas, APIs,
canonical events, suppression reasons, tunable thresholds, ROI calculation,
causal claims, prediction claims, or customer-facing runtime output.

## Data Windows

The promotion evidence uses seven completed business-day windows. Each window
uses the same approved dogfood source families, comparable UTC day boundaries,
and aggregate-only output shape.

| window | start | end | cohort_definition | comparable | notes |
| --- | --- | --- | --- | --- | --- |
| window_1 | 2026-05-15 00:00 UTC | 2026-05-16 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |
| window_2 | 2026-05-18 00:00 UTC | 2026-05-19 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |
| window_3 | 2026-05-19 00:00 UTC | 2026-05-20 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |
| window_4 | 2026-05-20 00:00 UTC | 2026-05-21 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |
| window_5 | 2026-05-21 00:00 UTC | 2026-05-22 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |
| window_6 | 2026-05-22 00:00 UTC | 2026-05-23 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |
| window_7 | 2026-05-26 00:00 UTC | 2026-05-27 00:00 UTC | dogfood aggregate AI work episodes | yes | business day |

Weekend days 2026-05-16 and 2026-05-17 were excluded. The 2026-05-25 U.S.
holiday was excluded because it would likely distort normal working-day volume.

## Tables Queried

| table_or_export | purpose | owner | notes |
| --- | --- | --- | --- |
| `scio-apps.scrubbed_glean_customer_event.scrubbed_glean_customer_event` | GCE/customer event trust, citation, feedback, and action metadata | Glean dogfood | queried with timestamp partition filters |
| `scio-apps.scrubbed_agentspan.scrubbed_agentspan_*` | agent span, run, trace, action, skill, citation, and completion metadata | Glean dogfood | queried for matching business-day suffixes |
| [TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md) | initial three-window pattern readout | FluencyTracr dogfood | candidate episode-key counts only |
| [TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md) | seven-working-day dedup readout | FluencyTracr dogfood | deduped product-episode normalization |
| [TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md) | key-confidence coverage readout | FluencyTracr dogfood | decision-grade coverage overlay |

## Signal Promotion Table

| signal_name | decision | confidence | evidence_summary | primary_reason | product_destination | required_followup |
| --- | --- | --- | --- | --- | --- | --- |
| trust_episode_boundary | PROMOTE | medium | Seven comparable business-day windows show stable recovered-after-failure behavior after deduplication; key-confidence overlay shows about 99.95% of product episodes have trace/run/action coverage; recovered-after-failure remains about 18%; citation-click-only and session/workflow-only tiers do not carry the signal. | Behavioral signal is meaningful, stable enough for productization review, and aggregate-safe when used as Trust Calibration context. | Trust Calibration Index | Product contract proposal defining caveated aggregate input behavior, coverage requirements, and fail-closed output language. |

## Promotion Criteria Review

| criterion | result | evidence |
| --- | --- | --- |
| Behavioral face validity | pass | Recovered-after-failure has a defensible behavioral interpretation: AI-assisted work hit friction, failure, skip, pause, or cancellation, then observable work continued inside the episode boundary. |
| Alignment with governed taxonomy | pass | Uses existing trust, recovery, verification, action, agent-span, and work-episode evidence without adding canonical events or suppression reasons. |
| Meaningful distribution variance | pass | Deduped product episodes distribute across resolved, recovered, stalled, and evidence-gap patterns; recovery and evidence-gap shares remain materially different from citation-click and explicit-feedback shares. |
| Stability across windows or cohorts | pass | Seven comparable business-day windows show recovered-after-failure in a stable band. The dedup readout shows daily recovered-after-failure from 15.22% to 21.46% for `run_first` and 15.95% to 20.26% for `trace_first`; key-confidence coverage confirms the seven-day high-confidence aggregate remains about 18%. |
| Support for a specific decision | pass | Supports aggregate Trust Calibration decisions: which workflows need trust-loop repair, source-coverage improvement, workflow redesign, or outcome-evidence follow-up. |
| Aggregate-safe surfacing without misuse | pass | Final output is aggregate-only and contains no user IDs, emails, names, prompts, raw outputs, transcripts, row-level events, person labels, team rankings, or manager rankings. |

## Distribution Evidence

The initial candidate-key diagnostic showed the signal was not citation-only.
Citation clicks were visible but small, while recovered-after-failure appeared
at meaningful volume across three comparable business-day windows.

The deduplication diagnostic then compressed 246,962,102 raw candidate keys into
about 87.6M to 88.0M aggregate product episodes. The raw-key overcount was
about 2.8x, but the signal shape survived deduplication.

Seven-day deduped product-episode result:

| Strategy | Deduped product episodes | Recovered after failure | Citation-click episodes | Explicit feedback episodes | Evidence gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| `run_first` | 88,028,657 | 15,826,000 (17.98%) | 551,171 (0.63%) | 65,654 (0.07%) | 37,484,844 (42.58%) |
| `trace_first` | 87,634,905 | 15,798,137 (18.03%) | 508,206 (0.58%) | 84,452 (0.10%) | 36,937,104 (42.15%) |

Key-confidence overlay:

| Strategy | High trace/run/action coverage | High-coverage recovered after failure | High-coverage evidence gap |
| --- | ---: | ---: | ---: |
| `run_first` | 87,985,613 (99.95%) | 15,826,000 (17.99%) | 37,441,800 (42.55%) |
| `trace_first` | 87,591,400 (99.95%) | 15,798,046 (18.04%) | 36,894,060 (42.12%) |

Medium tracking-token-only coverage was 0.05% and did not carry completion,
recovery, or stall patterns. Low session/workflow-only coverage was negligible.

## Stability Result

Multi-window stability classification: directionally_stable

Evidence:

- recovered-after-failure remained meaningful across all seven business-day
  windows,
- the two dedup strategies landed close enough to preserve interpretation,
- the key-confidence overlay showed broad fallback keys are not carrying the
  signal,
- citation-click-only behavior remained secondary and should not be treated as
  the trust anchor.

Instrumentation or taxonomy drift:

- No taxonomy mapping change was introduced during this validation.
- The diagnostic uses current scrubbed GCE and agent-span metadata.
- Existing evidence does not prove whether all product surfaces expose equal
  trace/run/action completeness.

Unresolved stability questions:

- Repeat this readout across a later business-week window before customer
  rollout.
- Segment by approved aggregate workflow family and AI surface before executive
  packaging.

## Coverage Result

Included surfaces:

- approved dogfood aggregate AI work episodes visible through GCE/customer
  events and scrubbed agent spans,
- feedback signals,
- citation availability and citation clicks,
- action metadata,
- agent completion, failure, pause, cancellation, skipped-step, skill, and trace
  metadata.

Excluded surfaces:

- enablement systems,
- training systems,
- survey joins,
- HR/person data,
- raw content systems,
- any source that would require direct employee-level output.

Unmapped or ambiguous surfaces:

- episodes with evidence gap,
- citation-click-only tracking-token episodes without completion/recovery
  context,
- surface families that lack comparable action, trace, or run metadata.

Suppressed windows or slices:

- No failed query windows were used in the decision.
- Customer-facing interpretation must fail closed when approved aggregate
  workflow, cohort, or source coverage is insufficient.

Missing exports:

- customer-owned outcome evidence,
- approved aggregate workflow taxonomy,
- approved aggregate cohort or segment definitions,
- workflow risk context.

Coverage risks:

- The evidence gap is still about 42%.
- Recovery does not prove correctness or value.
- Citation behavior is optional corroboration, not required proof of trust.

## Relationship To Velocity

Trust Episode Boundary is complementary to Velocity.

Velocity explains aggregate adoption energy across frequency, engagement, and
breadth. Trust Episode Boundary explains whether aggregate AI work episodes
resolve, recover, stall, or lack enough trust evidence after AI assistance.

This readout does not collapse Velocity into a score, does not use Velocity as a
productivity target, and does not convert Trust Episode Boundary into a maturity
ladder.

## Relationship To Value-Realization Primitives

| primitive | relationship |
| --- | --- |
| Trust Calibration Index | promoted as an eligible aggregate evidence input for later productization review |
| Reliability Factor | can supply recovery/stall context when future contracts define exact behavior |
| Quality Multiplier | can caveat quality-confidence interpretation but cannot prove output quality |
| Outcome Evidence | needs customer-owned aggregate outcome evidence before value claims can move beyond evidence-readiness |
| Causal Delta | no direct causal role in this readout |
| Time-Saved Defensibility Range | no direct economic role until separate economic validation allows it |
| AI Value Leakage Map | can identify aggregate evidence gaps and stalled-after-AI patterns after product contract review |
| AI Scale Readiness Portfolio | can help distinguish scale candidates from trust-loop repair candidates after product contract review |

## Governance Safety Review

- Aggregate-only output.
- No user IDs, names, emails, prompts, outputs, transcripts, or row-level events.
- No new canonical events.
- No new suppression reasons.
- No tunable thresholds.
- No admin overrides.
- No individual scoring.
- No team, manager, department, or employee ranking.
- No maturity scoring.
- No productivity scoring.
- No ROI claim.
- No causal claim.
- No prediction claim.
- Default suppression when attribution, taxonomy, coverage, or stability is
  ambiguous.

Safety notes:

Trust Episode Boundary may be used only as aggregate context.

- It must not be presented as a trust score.
- It must not be presented as an employee score.
- It must not be presented as a productivity score.
- It must not be presented as ranking.
- It must not be presented as ROI calculation.
- It must not be presented as causal lift.
- It must not be presented as a correctness detector.

Citation behavior is optional corroboration, not required proof of healthy
trust.

## Customer-Safe Output Language

Approved direction for future product output, after a separate product contract
proposal:

> FluencyTracr observes aggregate AI work episodes and shows where AI-assisted
> work resolves, recovers after friction, stalls, or lacks enough evidence for
> confident interpretation.

> Trust Episode Boundary does not identify, score, rank, or evaluate employees.
> It cannot prove output correctness, ROI, productivity lift, or causality.

> Use this signal to find aggregate workflow areas where trust loops, source
> coverage, recovery behavior, or outcome-readiness evidence need improvement.

Prohibited output phrases:

- "trust score",
- "employee trust",
- "team ranking",
- "manager ranking",
- "AI maturity score",
- "productivity lift",
- "ROI calculation",
- "causal proof",
- "correctness proof".

## Decision

Overall decision: `PROMOTE`

Rationale:

Trust Episode Boundary satisfies the six signal-promotion criteria as a
governed, aggregate-only candidate for later Trust Calibration productization
review. The strongest evidence is that recovered-after-failure persists after
product-episode deduplication, remains about 18% in the high trace/run/action
coverage tier, and is not carried by citation-click-only or broad
session/workflow-only fallback keys.

Decision owner: pending human governance approval

Required caveats:

- promoted for later productization review, not automatically productized,
- Trust Calibration input only after a separate product contract proposal,
- aggregate-only,
- no individual scoring or ranking,
- no ROI, causality, prediction, or productivity claim,
- evidence gap must remain visible.

## Next Phase Recommendation

Recommended next phase: product contract proposal

Recommended destination: Trust Calibration Index

Required follow-up PRs:

1. Propose a Trust Calibration contract update defining Trust Episode Boundary
   as a caveated aggregate input.
2. Define fail-closed coverage behavior for evidence-gap, low-coverage, and
   ambiguous-attribution cases without adding canonical events or suppression
   reasons.
3. Add customer-safe output examples to the relevant executive readout artifact
   only after the contract proposal is approved.

## Open Questions

- What workflow taxonomy should be used for customer-approved aggregate
  segmentation?
- Which surfaces expose enough trace/run/action coverage outside this dogfood
  window?
- What customer-owned outcome evidence is available to pair with recovered,
  stalled, and evidence-gap patterns?
- Should the first productized output be an executive caveat, a Trust
  Calibration input, or an instrumentation-readiness panel?
