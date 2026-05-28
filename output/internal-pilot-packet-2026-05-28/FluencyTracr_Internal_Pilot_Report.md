# FluencyTracr Internal Pilot Packet

Run date: 2026-05-28

Status: `INTERNAL_PILOT_REHEARSAL`

This packet uses company-owned aggregate dogfood exports and a fresh BigQuery run. It is designed to show what FluencyTracr can deliver without asking a client for additional inputs at the start of a pilot.

## Executive Summary

FluencyTracr can already produce a meaningful aggregate AI work evidence package from observed telemetry. The strongest current value is not ROI calculation; it is a governed recommendation engine that separates activity volume from workflow evidence, trust evidence, source coverage, and value-investigation readiness.

Top findings:

- AI is broadly present: 25,081 high-volume assistive work patterns show reach and surface coverage.
- Workflow-grade evidence exists but is smaller: 2,025 aggregate patterns show search-to-agent movement, post-friction continuation, execution-linked workflow, or verification-attached workflow.
- The strongest immediate value test is support friction: 1,333 aggregate patterns combine search-to-agent escalation with post-friction continuation.
- The biggest trust/product gap remains evidence quality: 37,959,260 aggregate product episodes sit in the public evidence gap.
- The current blocker is not telemetry volume; it is governed outcome evidence, attribution, and customer-owned assumptions.

## Executive Outcomes And Strategies

| Outcome | What it means | Strategy |
| --- | --- | --- |
| Evidence layer is viable | Existing aggregate telemetry can produce a structured AI Work Evidence packet. | Sell the pilot as evidence readiness and recommendation routing, not as ROI proof. |
| Workflow evidence is differentiated | FluencyTracr can distinguish broad AI use from execution-linked, verification-linked, and recovery-like work paths. | Lead with workflow/service families rather than adoption volume. |
| Trust remains the proof-loop problem | Verification and continuation exist, but attribution gaps are still material. | Make trust-loop repair a strategic workstream before quality/risk claims. |
| Outcome data should be requested selectively | The recommendation engine can name the smallest next outcome data needed. | Ask for support, CRM, QA, or workflow metrics only when the observed pattern justifies it. |
| ROI remains blocked | No governed outcome join or assumption ledger is present in this packet. | Provide formulas for customer testing, not dollarized claims. |

## Recommendation Engine Design

Yes: this packet now contains a docs-only recommendation engine shape based on the FluencyTracr frameworks. It consumes aggregate AI Work Evidence, AI-service workflow families, Velocity x Depth context, behavioral primitives, trust/source coverage, and value-readiness zones. It emits recommended customer-owned outcome signals, formula families, readiness states, caveats, and blocked claims.

It is not a runtime engine yet. It does not add APIs, schemas, canonical events, suppression reasons, scores, ROI calculation, causality claims, productivity claims, or people/team ranking.

| Recommendation | AI-service workflow family | Observed pattern | Outcome data to request | Value route | Current readiness |
| --- | --- | --- | --- | --- | --- |
| Support friction value test | Search-to-agent workflow | Search-to-agent escalation plus post-friction continuation | Resolution time, escalation rate, reopen rate, backlog movement, CSAT | Cost, experience, quality | Outcome evidence missing |
| Workflow execution capacity test | Agent or action execution workflow | Execution-linked workflow | Completed work volume, cycle time, backlog movement, stage progression | Capacity, cost, revenue | Outcome evidence missing |
| Verification quality and risk test | Verification or feedback-attached workflow | Verification-attached workflow | QA pass rate, defect rate, correction rate, reopen rate, approval coverage | Quality, risk | Trust attribution hold |
| Proof-loop repair agenda | Trust-evidence repair workflow | Trust evidence gap | Verification coverage, feedback-loop coverage, unresolved trust-gap rate | Risk, quality | Source coverage hold |
| Source-linkage repair | Source-linkage or boundary repair | Weak linkage context | Source coverage, join completeness, metadata completeness | Instrumentation | Source coverage hold |

## Recommended Executive Strategy

1. Start the client pilot with the AI Work Evidence packet, not an ROI promise.
2. Use the recommendation engine to identify which outcome system should be connected next.
3. Prioritize a support friction value test if the client has support outcomes available.
4. Treat high-volume assistive use as reach, not value, until workflow completion evidence is attached.
5. Keep trust evidence repair explicit before using quality, risk, or reliability language externally.

## Appendix A: Fresh Data Run

- BigQuery job: `scio-apps:bqjob_r68a7577f065e48e5_0000019e6ee2c806_1`
- Duration: `0:06:00.970000`
- Bytes processed: `4,926,181,266,149`
- Source: scrubbed GCE customer events + scrubbed agent spans

### Microcosm Framework Results

| Window | Sampled aggregate windows | Frequency | Engagement | Breadth | Reliability | Quality multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Window 1 | 13 | 70.2 | 17.3 | 5.7 | 0.71 | 1.22 |
| Window 2 | 15 | 62.3 | 15.7 | 5.1 | 0.64 | 1.12 |
| Window 3 | 13 | 80.6 | 20.6 | 6.5 | 0.69 | 1.18 |

### AI Work Pattern Distribution

| AI-service workflow family | Pattern tier | Aggregate AI work patterns | Share | Interpretation |
| --- | --- | ---: | ---: | --- |
| Assistive search or answer surface | High Volume Assistive Surface | 25,081 | 90.9% | Reach and surface coverage; weak workflow evidence by itself. |
| Search-to-agent workflow | Post Friction Continuation | 891 | 3.2% | Recovery-like evidence: work continues after friction without claiming intent. |
| Agent or action execution workflow | Execution Linked Workflow | 478 | 1.7% | AI is attached to actual workflow execution. |
| Search-to-agent workflow | Search To Agent Escalation | 442 | 1.6% | Navigation from search into agent context; not outcome evidence yet. |
| Source-linkage or boundary repair | Weak Linkage Context | 388 | 1.4% | Source-coverage caveat lane. |
| Verification or feedback-attached workflow | Verification Attached Workflow | 214 | 0.8% | Strongest trust-adjacent workflow lane. |
| Residual linked context | Other Linked Context | 96 | 0.3% | Residual linked context. |

## Appendix B: Value Realization Readiness

| Readout zone | Aggregate cohort rows | Signal rows | Attributed signal rows | Executive action |
| --- | ---: | ---: | ---: | --- |
| Trust Evidence Gap | 6,537,249 | 2,754,490 | 0 | Repair proof loops before value interpretation. |
| Scale Candidate | 125,100 | 683,340 | 337,775 | Scale-and-measure review; attach outcome evidence. |
| Shallow Adoption | 17,241 | 54,116 | 41,060 | Workflow redesign before scale. |
| Focused Expert Use | 1,250 | 2,004 | 1,782 | Package the expert pattern if the business confirms value. |
| Suppressed | 0 | 0 | 0 | Do not interpret. |

## Appendix C: Trust And Source Coverage

- Seven-business-day trust pilot: 87,985,613 high-confidence aggregate product episodes.
- High-confidence coverage: 100.0%.
- Recovered-after-failure pattern inside high-confidence coverage: 18.0%.
- Public evidence gap: 37,959,260 aggregate episodes (43.1%).
- True downstream-evidence gap: 37,484,844 aggregate episodes.
- Ambiguous-boundary fold-in: 474,414 aggregate episodes.

Trust evidence is strongest when verification or continuation attaches to workflow-linked paths. Citation clicks and explicit feedback are useful corroboration, but they are too sparse or too attribution-sensitive to carry the trust story alone.

## Appendix D: Outcome And ROI Boundary

The current company-owned telemetry is strong enough for value-investigation routing, but not for ROI calculation.

- Outcome metric identity: missing in saved V4 exports.
- Window-aligned outcome export: held.
- Customer-owned assumptions: missing.
- Behavior-to-outcome attribution: held.
- Time-saved range values: suppressed.

This should be presented as an evidence-readiness product, not a dollarized ROI product.

## Appendix E: Pilot Decision Memo

Decision: continue to a customer-facing rehearsal packet, but keep the claim narrow.

Recommended posture:

1. Lead with aggregate AI work evidence, not adoption dashboards.
2. Show AI work pattern tiers so executives can distinguish reach, workflow execution, recovery-like continuation, verification, and weak-linkage gaps.
3. Use Velocity x Depth as the operating map.
4. Use Trust Evidence Gap as the proof-loop repair agenda.
5. Treat ROI as blocked until outcome metrics and assumptions are available inside the governed evidence layer.

Non-goals: no individual scoring, no team ranking, no manager ranking, no productivity claim, no causality claim, no ROI calculation, no raw prompt or output inspection.

## Appendix F: Glossary

- **AI Work Evidence:** Aggregate telemetry that shows where AI is present in real work, how it is connected to workflows, and where evidence is strong or weak.
- **AI surface:** A place where AI can be used, such as search, chat, autocomplete, a workflow run, an agent span, or an embedded assistant.
- **Workflow evidence:** Aggregate signs that AI is attached to a real work path instead of a standalone interaction.
- **Velocity:** How quickly AI-assisted work appears to move, using aggregate frequency, engagement, and repeat-use patterns.
- **Depth:** How embedded AI appears to be across surfaces and workflows, not how skilled any individual person is.
- **Frequency:** How often AI activity appears in the aggregate window.
- **Engagement:** How much aggregate interaction occurs around AI-assisted work, such as repeated use or continued activity.
- **Breadth:** How many distinct AI surfaces or work contexts appear in the aggregate evidence.
- **Reliability Factor:** A confidence lens that looks for abandonment, friction loops, recovery, and verification signals before interpreting behavior.
- **Quality Multiplier:** A caveat lens that can discount or amplify time-saved assumptions later; this packet does not use it to calculate ROI.
- **Trust evidence:** Aggregate signs that people verified, continued, corrected, recovered, or gave feedback after AI assistance.
- **Trust attribution:** Whether a trust signal can be attached to a workflow path with enough confidence to interpret it.
- **Evidence gap:** A place where activity exists but the supporting source coverage, attribution, or downstream context is not strong enough to interpret.
- **AI work pattern tier:** A plain-language bucket that separates raw AI activity from stronger workflow, verification, or source-coverage evidence.
- **Value-readiness zone:** An executive action lane that says what to do next, such as scale, redesign, repair trust loops, or hold interpretation.
- **Outcome evidence:** Customer-owned aggregate business context, such as a KPI window, that can be attached later without claiming causality by default.
- **Value hypothesis:** A testable idea about where AI may create value, such as acceleration, quality premium, or net-new work. It is not ROI proof.
- **Source coverage:** How complete and unambiguous the available telemetry is for a given aggregate interpretation.
- **Suppressed:** A fail-closed result where FluencyTracr withholds interpretation because the governed evidence bar is not met.
