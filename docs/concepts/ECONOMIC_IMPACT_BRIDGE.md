# Economic Impact Bridge

## 1. Purpose

This document defines the Economic Impact Bridge as a future V4 concept for FluencyTracr. It establishes the conceptual basis before any schema, endpoint, economic readout, ROI range, dashboard, or automated recommendation depends on behavioral evidence. The bridge is load-bearing on governance because it explains how FluencyTracr can connect trusted aggregate AI behavior to ROI metric routing and economic value investigation without claiming realized ROI, causality, productivity lift, or employee performance.

## 2. The Economic Interpretation Gap

Glean's time-saved pipeline can anchor a commercial value conversation, but raw time saved does not automatically become defensible economic impact. Behavioral evidence can strengthen or weaken the confidence behind a value claim, but it does not prove dollars by itself.

V4 needs a middle layer between behavior and economics. Without that layer, FluencyTracr risks either under-serving executives who need business context or overclaiming by turning activity into ROI. The Economic Impact Bridge exists to keep that path disciplined.

The bridge answers a bounded question:

```text
Where is the aggregate behavioral evidence strong enough to justify an economic value investigation?
```

It does not answer:

```text
How many dollars did AI create?
```

## 3. Definition

The Economic Impact Bridge maps governed aggregate readiness patterns to value hypotheses and customer-owned investigation paths.

It consumes:

- surfaced V3 aggregate verdicts,
- Velocity,
- Depth concepts where governance allows,
- Quality Multiplier,
- Reliability Factor,
- AI Scale Readiness zones,
- Trust Calibration,
- Outcome Evidence when customer-attested,
- customer-owned assumptions such as baseline cycle time, labor cost, throughput, or business KPI context.

It emits:

- candidate impact areas,
- ROI or value metric candidates,
- value hypotheses,
- evidence gaps,
- caveats,
- customer-owned assumptions required for dollarization,
- whether trusted data is eligible to pass into governed value-scenario modeling,
- whether a later defensibility range is allowed, held, or blocked.

It does not emit realized ROI, guaranteed savings, employee productivity, causal impact, or predictions.

## 3.1 Trusted Data Pass-Through

The bridge should not stop all ROI work by default. It should stop unsupported
ROI claims by default.

When governed aggregate work evidence, customer-owned outcome evidence, trust
coverage, source coverage, baseline/comparison rules, and assumptions are
present or explicitly caveated, the bridge may pass the record forward for:

- ROI metric routing,
- value route selection,
- governed scenario modeling,
- executive validation language, and
- customer-owned finance or operations review.

That pass-through is not a claim upgrade. It is permission to determine which
ROI metrics should be modeled and reviewed. Realized ROI, causality, dollarized
savings, productivity claims, and customer-facing economic output remain blocked
until a separate governed review explicitly approves that exact use.

## 4. Safe Economic Language

Allowed language:

- value hypothesis,
- defensibility range,
- economic value investigation,
- customer-owned assumptions,
- candidate impact area,
- confidence level,
- scenario-based estimate,
- caveated value claim,
- outcome evidence alignment.

Blocked language:

- proven ROI,
- guaranteed savings,
- causal productivity lift,
- productivity measurement,
- employee performance,
- comparative team evaluation,
- manager ranking,
- prediction,
- benchmarked value ranking.

The bridge should make economic interpretation more honest, not more aggressive.

## 5. Readiness Patterns to Economic Questions

| Readiness Pattern | Economic Question |
| --- | --- |
| High depth plus repeat use | Which workflows are becoming repeatable leverage? |
| High usage plus high abandonment | Where is friction consuming capacity? |
| High autonomous use plus low verification | Where could trust risk undermine value? |
| Reusable workflow spread | Where can automation playbooks scale? |
| Low adoption in a high-value function | Where is value unrealized? |
| Strong quality and reliability but narrow activation | Where should enablement expand access? |
| Suppressed or missing evidence | Where must economic interpretation remain blocked? |

These mappings identify investigation paths. They do not assert value realization.

## 6. Customer-Owned Assumption Ledger

Any future dollarized range must depend on customer-owned assumptions. FluencyTracr may record or reference those assumptions, but it must not silently invent them or use them to upgrade evidence grade.

Examples include:

- average loaded labor cost,
- baseline task duration,
- affected workflow volume,
- quality cost assumptions,
- cycle-time baseline,
- revenue or support KPI context,
- accepted confidence scenario.

Customer-stated assumptions are planning inputs. They are not proof.

## 7. Relationship to AI Scale Readiness

AI Scale Readiness identifies where action is supported. The Economic Impact Bridge identifies which readiness zones may support value investigation.

Ready To Scale may justify investigating scale economics. Workflow Design Opportunity may justify investigating friction cost. Trust Calibration Opportunity may justify investigating risk or rework exposure. Adoption Expansion Opportunity may justify investigating unrealized value. Hold / Insufficient Evidence blocks economic interpretation.

The portfolio determines action posture. The bridge determines economic investigation posture.

## 8. Relationship to Outcome Evidence

Outcome Evidence can strengthen the bridge when it is customer-attested, aggregate, and governed. It may show alignment between behavioral evidence and external business metrics, and it may make a record eligible for ROI metric routing or governed value-scenario modeling.

Outcome Evidence does not automatically prove causality. A support resolution metric, sales cycle metric, or onboarding metric can provide context, but the bridge must preserve `NOT_CAUSAL` unless a future governed experimental design supports stronger language.

## 9. What This Is Not

The Economic Impact Bridge is not dollarized ROI computation.

It is not a causation engine.

It is not a prediction engine.

It is not a productivity measure.

It is not a performance management tool.

It is not a leaderboard.

It is not an admin-adjustable value model.

It is not a way to assign dollars to suppressed evidence.

It is not a replacement for customer finance, operations, or systems-of-record analysis.

## 10. Glean Dogfood Validation

Before contract hardening, Glean internal dogfood should test whether the bridge adds useful business interpretation without overclaiming.

The test should use three 60-day-compliant windows and ask:

- Which readiness patterns suggest value investigation?
- Which patterns remain blocked by missing evidence?
- Does the bridge clarify economic questions without producing ROI claims?
- Do caveats travel with every candidate impact area?
- Does segmentation focus investigation without ranking groups?

If the bridge cannot answer those questions cleanly, it should remain held.

## 11. Governance Invariants Preserved

The bridge preserves all nine invariants:

1. **No new canonical events.** It composes existing aggregate evidence.
2. **No new suppression reasons.** Economic hold states do not become suppression reasons.
3. **No tunable thresholds.** Value interpretation cannot be admin-adjusted.
4. **No admin overrides.** Suppressed evidence cannot generate value investigation.
5. **No individual scoring.** Economic interpretation stays cohort-level.
6. **Default verdict is SUPPRESS.** Suppression blocks economic output.
7. **Latency is corroborative only.** It may support friction context but cannot trigger economics alone.
8. **Assurance Harness stays green.** Future implementation must test blocked claims.
9. **Per-slice independence.** Economic investigation posture applies per governed slice.

## 12. Open Questions

- Which economic investigation categories should be standardized first?
- What customer-owned assumptions are required before any defensibility range can appear?
- Should the bridge remain research-only until Outcome Evidence exists?
- How should value hypotheses attach to reportability decisions without changing reportability states?
- What evidence is enough to move from candidate impact area to bounded defensibility range?

## 13. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The Economic Impact Bridge concept is credited to James Kelley: V4 should connect aggregate behavioral readiness to business value investigation while keeping ROI, causality, productivity, and performance claims blocked unless separately governed.
