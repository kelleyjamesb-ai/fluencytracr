# V4 Next Sprint Plan

## Purpose

This plan defines the next bounded V4 sprint after the behavior-cohort
promotion decision.

The sprint goal is to prepare a team-presentable, client-reusable readout path
that starts with aggregate AI operating fluency evidence and then routes toward
economic value hypotheses.

This plan does not authorize APIs, schemas, runtime services, frontend product
surfaces, customer-facing economic readouts, ROI calculation, causal claims,
prediction claims, individual scoring, comparative team evaluation,
comparative department evaluation, productivity measurement, maturity labels,
automated recommendations, raw skill-name readouts, or new canonical events.

## Sprint Thesis

The next sprint should prove this narrative:

```text
FluencyTracr measures aggregate AI operating fluency first. When that evidence
is stable, aggregate, and governed, it can route a customer-owned economic
value investigation. It does not invent ROI from behavior alone.
```

In this context, "aggregate AI operating fluency" means a workflow population's
observed ability to use AI with sustained activity, cross-surface integration,
verification, recovery, and narrow trust evidence. It is not a person, team,
manager, department, customer, or skill score.

## Sprint Outcomes

By the end of the sprint, the team should have:

1. A repeatable internal readout shape for Glean dogfood and client-pilot
   discussion.
2. A plain-language zone model that explains aggregate behavior patterns
   without ranking people or organizations.
3. A value-hypothesis layer that attaches economic questions only after
   governed behavior evidence exists.
4. A client-pilot gate showing what source coverage, outcome evidence, and
   customer-owned assumptions are required before any stronger economic claim.
5. A team demo artifact that can be presented as a valuable tool for Glean
   value-realization teams.

Current slice note: the first execution slice covers Workstreams 1-3 only.
Workstreams 4-5 remain future work until the team reviews the zone model,
feature backlog, and value-hypothesis map.

## Sprint Boundaries

Allowed:

- docs-only readout and planning artifacts,
- aggregate Glean dogfood analysis from retained CSVs or named narrow exports,
- behavior-derived cohort axes already promoted by
  [V4 Behavior Cohort Promotion Decision](./V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md),
- Velocity band and Depth Repertoire band as internal cohort axes,
- AGENT delegation and Skill Read presence as context-only dimensions,
- value hypotheses, candidate impact areas, evidence gaps, and customer-owned
  assumption prompts,
- proposed research math that remains interpretable and aggregate-only.

Not allowed:

- new canonical events,
- new suppression reasons,
- tunable thresholds,
- runtime economic APIs,
- Time-Saved Defensibility Range productization,
- customer-facing V4 economic readouts,
- dollarized ROI or guaranteed savings,
- causality or prediction,
- productivity measurement,
- person, team, manager, department, customer, or skill ranking,
- raw user IDs, emails, prompts, outputs, transcripts, action rows, raw skill
  names, or raw event rows in emitted artifacts.

## Workstream 1: Readout Zone Model

Goal: define the small set of aggregate zones that make the readout useful to
AIOMs, value-realization PMs, and CIOs.

Proposed zones:

| Zone | Evidence pattern | Action posture | Economic posture |
| --- | --- | --- | --- |
| Scale candidate | Stable Velocity plus stable Depth Repertoire with usable trust or reliability context. | Expand rollout or enablement. | Candidate value investigation. |
| Shallow adoption | High activity with weak Depth, weak verification, or high held/aliased trust evidence. | Coach usage quality or redesign workflow. | Hold dollarization; investigate friction. |
| Focused expert use | Strong Depth Repertoire in narrower aggregate pockets, even without broad high Velocity. | Study workflow and decide whether to expand. | Candidate value investigation only with business context. |
| Trust evidence gap | Activity or Depth exists, but trust attribution is missing, aliased, or held. | Improve verification and feedback loops. | Hold economic interpretation. |
| Instrumentation hold | AGENT, Skill, outcome, or source coverage is too incomplete for interpretation. | Improve data readiness. | No value hypothesis beyond source-gap remediation. |
| Suppressed | Time, volume, convergence, baseline, or ambiguity gates fail. | Do not interpret. | Block economic interpretation. |

Deliverables:

- A zone table with strict inputs, allowed language, blocked language, and
  example explanations.
- A one-page narrative that says why this is a value-realization operating map,
  not an adoption leaderboard.

Output artifact:

- [V4 Readout Zone Model](./V4_READOUT_ZONE_MODEL.md)

Acceptance criteria:

- Every zone is aggregate-only and fail-closed.
- No zone can be read as a person, team, manager, department, customer, or skill
  ranking.
- Every economic phrase is framed as investigation routing, not value proof.

## Workstream 2: Behavior Feature Backlog

Goal: define the derived features that strengthen the readout without changing
the canonical event set.

Priority features:

| Feature | Why it matters | Candidate method | Sprint decision |
| --- | --- | --- | --- |
| Sequence funnel | Shows whether usage reaches verification, reuse, or completion. | Aggregate transition counts between governed surfaces and canonical events. | Design only unless a narrow SQL export is approved. |
| Return pattern | Shows whether behavior persists after first successful use. | Cohort retention or survival-style aggregate curves. | Research design. |
| Friction loop | Separates busy adoption from productive work integration. | High Velocity x abandonment, recovery, or held trust rates. | Include in readout language. |
| Cross-surface concentration | Separates broad operating pattern from single-surface dependence. | Entropy or concentration over governed surface buckets. | Research design. |
| Stability band | Prevents one-window promotion. | Three-window variance or band movement over fixed 60-day windows. | Include in zone criteria. |
| Attribution quality | Keeps trust from overclaiming. | Strict/session attribution, aliasing, no-parent, and held-signal rates. | Include as gate. |

Deferred features:

- regression models,
- logistic prediction,
- causal inference,
- dollarized value modeling,
- org metadata segmentation.

These can return only after the readout proves the aggregate rule-based layer is
stable and an outcome variable is available.

Output artifact:

- [V4 Behavior Feature Backlog](./V4_BEHAVIOR_FEATURE_BACKLOG.md)

## Workstream 3: Value Hypothesis Map

Goal: attach economic questions after aggregate behavior evidence, not before.

The readout should produce value hypotheses in AIVM vocabulary:

| Evidence pattern | Allowed hypothesis | Required next evidence |
| --- | --- | --- |
| Stable Velocity plus stable Depth with reliability context | `ACCELERATION` candidate. | Customer-owned baseline cycle time and workflow volume. |
| Strong verification/recovery and low friction loops | `QUALITY_PREMIUM` candidate. | Customer-attested quality or review-pass outcome. |
| Focused expert use with repeat cross-surface pattern | `NET_NEW` or `QUALITY_PREMIUM` candidate. | Business owner confirmation of new or higher-quality workflow. |
| High activity with weak Depth or trust evidence | `UNCLASSIFIED`; investigate friction before value. | Verification, recovery, and outcome evidence. |
| Suppressed or held evidence | No value hypothesis. | Fix source coverage or wait for eligible window. |

Each hypothesis must carry:

- evidence basis,
- missing evidence,
- caveats,
- required customer-owned assumptions,
- required aggregate outcome evidence,
- blocked claims.

Acceptance criteria:

- No hypothesis includes dollars.
- No hypothesis implies causality.
- No hypothesis upgrades a suppressed or held row.
- Every hypothesis states what a customer must provide before dollarization.

Output artifact:

- [V4 Value Hypothesis Map](./V4_VALUE_HYPOTHESIS_MAP.md)

Saved-data test:

- [V4 Readout Zone Data Test](./V4_READOUT_ZONE_DATA_TEST.md)
- [V4 Velocity x Depth Zone Test](./V4_VELOCITY_DEPTH_ZONE_TEST.md)

Follow-up status: the Velocity x Depth aggregate export is complete. It proves
that strict `SCALE_CANDIDATE` rows exist across all three fixed windows, while
preserving the same internal-only, non-dollarized, aggregate readout boundary.

## Workstream 4: Team Demo Artifact

Goal: produce one artifact the team can react to.

Recommended artifact:

- `docs/research/V4_TEAM_READOUT_REHEARSAL.md`

Minimum content:

- executive framing,
- zone definitions,
- three to five aggregate example rows from saved outputs,
- what the evidence says,
- what the evidence does not say,
- economic investigation questions,
- customer-owned assumptions needed next,
- source gaps and hold states,
- objection handling for surveillance, ranking, ROI, and causality concerns.

Acceptance criteria:

- A value-realization PM can explain the readout in five minutes.
- A skeptical reviewer can see exactly why the readout is not a scorecard.
- The artifact can be reused as the first client-pilot narrative template.

## Workstream 5: Client Pilot Gate

Goal: define what must be true before this can be used with a customer.

Pilot prerequisites:

- customer-side transformer path is approved,
- only aggregate cohort distributions cross the boundary,
- fixed 60-day windows are available,
- Velocity and Depth Repertoire inputs are available,
- narrow trust evidence is available or explicitly held,
- Quality Multiplier and Reliability Factor inputs align to the same aggregate
  keys,
- Outcome Evidence template is agreed with the customer,
- customer-owned assumptions are recorded separately,
- suppressed slices stay suppressed in every artifact.

Customer-ready outputs should be limited to:

- aggregate zone distribution,
- evidence gaps,
- value hypotheses,
- customer-owned assumption prompts,
- source-readiness checklist,
- next investigation recommendation in plain language.

Customer-ready outputs should not include:

- dollarized ROI,
- productivity lift,
- person or team comparison,
- department ranking,
- skill-name ranking,
- prediction,
- causality,
- automated economic recommendation.

## Analysis Methods To Consider

Interpretable methods to prioritize:

- transition matrices for zone movement across fixed windows,
- sequence funnels for verification and reuse paths,
- retention or survival-style curves for repeated aggregate behavior,
- concentration or entropy measures over governed surfaces,
- stability bands across 60-day windows,
- attribution quality rates for trust evidence,
- backtesting or holdout design before any forecasting claim,
- Bayesian or hierarchical smoothing only as internal sparse-cohort analysis,
  never as a public score.

Methods to avoid in product outputs:

- p-value or significance framing,
- opaque scoring models,
- individual-level models,
- comparative organizational lists,
- inferred ROI from behavior alone.

## Sprint Sequence

Recommended two-week sequence:

| Day | Focus | Output |
| --- | --- | --- |
| 1 | Finalize zone model and blocked language. | Zone table and readout grammar. |
| 2-3 | Build readout rehearsal from retained CSVs. | Draft team readout with example aggregate rows. |
| 4 | Define value hypothesis map. | Hypothesis table with evidence gaps and customer assumptions. |
| 5 | Review with governance lens. | Updated blocked-claims checklist. |
| 6-7 | Add feature backlog for sequence, return, friction, concentration, and stability. | Prioritized research backlog. |
| 8 | Define client pilot gate. | Source/outcome/assumption readiness checklist. |
| 9 | Polish team demo artifact. | Presentation-ready narrative. |
| 10 | Sprint closeout decision. | Promote, hold, or narrow the next implementation slice. |

## Definition Of Done

The sprint is done when:

- the readout can explain aggregate AI operating fluency before value,
- the readout identifies economic investigations without calculating economic
  value,
- every promoted statement has a source artifact,
- every held or blocked statement has a clear reason,
- the client-pilot gate is explicit,
- verification passes,
- the durable state is updated.

## Recommended Next PRs

1. Readout zone contract and blocked-claims grammar.
2. Team readout rehearsal from retained aggregate CSVs.
3. Value hypothesis map and client pilot gate.
4. Research backlog for sequence, return, friction, concentration, and
   stability methods.

Each PR should remain docs/research-only unless a later decision explicitly
promotes a narrow implementation surface.
