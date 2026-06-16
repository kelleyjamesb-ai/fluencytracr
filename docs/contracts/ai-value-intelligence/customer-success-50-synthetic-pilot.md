# Customer Success 50-Person Synthetic Pilot

Status: synthetic rehearsal fixture

Phase: `phase-ai-value-synthetic-cs-50-pilot-data`

## Purpose

This document defines a synthetic Customer Success pilot rehearsal for an
organization with a 50-person Customer Success function.

Use it to test intake, workshop response validation, source coverage handling,
assumption completion, and caveat propagation before a real customer provides
aggregate evidence. Do not use it as customer-attested evidence, ROI proof,
causality support, productivity measurement, people analytics, or external
claim support.

## Scenario

| Field | Synthetic value |
| --- | --- |
| Organization | `org-synthetic-cs-50` |
| Function | Customer Success |
| Function headcount | 50 |
| Workflow family | `customer_success_account_health_review` |
| Primary value route | `RISK_REDUCTION` |
| Baseline window | `2026-02-01_to_2026-03-31` |
| Comparison window | `2026-04-01_to_2026-05-31` |
| Synthetic fixture | [`examples/customer-success-50-synthetic-workshop-response.json`](./examples/customer-success-50-synthetic-workshop-response.json) |
| Workshop intake | [`examples/customer-success-50-synthetic-workshop-intake.json`](./examples/customer-success-50-synthetic-workshop-intake.json) |
| Metrics library | [`examples/customer-success-50-synthetic-metrics-library.json`](./examples/customer-success-50-synthetic-metrics-library.json) |
| Engagement context | [`examples/customer-success-50-synthetic-engagement.json`](./examples/customer-success-50-synthetic-engagement.json) |
| AI Fluency baseline | [`examples/customer-success-50-synthetic-fluency-baseline.json`](./examples/customer-success-50-synthetic-fluency-baseline.json) |
| AI Fluency follow-up | [`examples/customer-success-50-synthetic-fluency-followup.json`](./examples/customer-success-50-synthetic-fluency-followup.json) |
| Outcome evidence | [`examples/customer-success-50-synthetic-outcome-evidence-export.json`](./examples/customer-success-50-synthetic-outcome-evidence-export.json) |
| Synthetic final readout | [`customer-success-50-synthetic-final-readout.md`](./customer-success-50-synthetic-final-readout.md) |

The workflow represents aggregate account health review work: preparing account
context, reviewing renewal or adoption risk, drafting next actions, and
following up on expansion or risk signals. It is a rehearsal path for Customer
Success value investigation, not a replacement for the locked first support
case-resolution pilot.

## Synthetic Evidence Shape

| Lane | Synthetic posture |
| --- | --- |
| AI activity | Aggregate Search, Assistant, Skill, and agent activity is present. |
| Workflow | Account health review scope is present. |
| Outcome | Aggregate account-health workflow metrics are present for both windows. |
| Baseline | Baseline and comparison windows are declared before interpretation. |
| Trust | Aggregate verification, recovery, and abandonment context is present. |
| Assumptions | All required assumptions are present for the synthetic ready-path rehearsal. |
| Suppression | Synthetic aggregate posture is present and not suppressed. |

## Synthetic AI Work Evidence And VBD

| Signal | Baseline | Comparison | Use |
| --- | ---: | ---: | --- |
| Assistant sessions | 240 | 480 | Shows aggregate Assistant use in the workflow window. |
| Search sessions | 390 | 590 | Shows aggregate Search use in the workflow window. |
| Skill invocations | 50 | 130 | Shows aggregate approved Skill use. |
| Governed agent runs | 18 | 66 | Shows aggregate governed agent activity. |
| Verification-attached episodes | 96 | 264 | Shows whether AI-supported work carried more verification context. |
| Recovery episodes | 28 | 14 | Shows aggregate friction recovery pressure. |
| Abandonment episodes | 13 | 5 | Shows aggregate AI-work abandonment pressure. |
| Velocity index | 0.42 | 0.61 | Tests speed to adoption. |
| Breadth active account-cohort share | 0.48 | 0.68 | Tests spread across approved account-health work contexts. |
| Depth repeat workflow share | 0.31 | 0.49 | Tests embedded repeat workflow behavior. |

These signals show AI operating posture and influence context. They do not
prove causality, ROI, productivity, or customer-facing economic value.

Pilot display rule: any client-facing rehearsal output for this fixture should
show AI activity, VBD movement, and trust/friction movement before the outcome
scorecard. Otherwise the outcome movement looks unanchored from the AI work
evidence the pilot is meant to test.

## Outcome Signals

| Signal | Baseline | Comparison | Use |
| --- | ---: | ---: | --- |
| Gross revenue retention rate | 0.88 | 0.91 | Tests aggregate retention-risk posture as a share, not a dollarized claim. |
| Net revenue retention rate | 1.03 | 1.07 | Tests expansion/retention context as a share, not ROI proof. |
| Renewal rate | 0.82 | 0.87 | Tests aggregate renewal operating posture. |
| Logo churn rate | 0.14 | 0.10 | Tests whether fewer eligible accounts churned in the window. |
| At-risk account share | 0.27 | 0.19 | Tests whether fewer eligible accounts remain in risk posture. |
| Account health review cycle days | 10.8 | 7.4 | Tests whether account review work is moving faster. |
| Risk review coverage share | 0.62 | 0.81 | Tests whether more eligible accounts receive review coverage. |
| Customer health signal coverage share | 0.71 | 0.86 | Tests whether more eligible accounts have current health signals. |
| Renewal action staleness count | 146 | 92 | Tests whether follow-up actions are less stale. |
| QBR prep hours per account | 2.6 | 1.9 | Tests capacity posture only; not productivity proof. |
| Expansion signal follow-up share | 0.38 | 0.51 | Tests whether identified expansion signals receive follow-up. |

These are synthetic aggregate values. They do not prove real customer movement.

## Synthetic AI Fluency Output

The synthetic AI Fluency fixture uses the 24-item long-form instrument
(`ai_fluency_long_v1`). The overall AI Fluency aggregate mean is the average of the
five core dimensions only: confidence, usage quality, behavior change,
leadership reinforcement, and capability growth. AI attitude, behavioral
intent, and perceived AI impact remain supporting signals.

| Signal | Baseline | Follow-up | Movement |
| --- | ---: | ---: | ---: |
| Overall core AI Fluency | 3.52 / 5 | 3.94 / 5 | +0.42 |
| Confidence | 3.7 | 4.0 | +0.3 |
| Usage quality | 3.5 | 3.9 | +0.4 |
| Behavior change | 3.2 | 3.8 | +0.6 |
| Leadership reinforcement | 3.8 | 4.1 | +0.3 |
| Capability growth | 3.4 | 3.9 | +0.5 |
| AI attitude | 4.0 | 4.2 | +0.2 |
| Behavioral intent | 4.1 | 4.3 | +0.2 |
| Perceived AI impact | 3.3 | 3.8 | +0.5 |

The synthetic aggregate posture is `emerging fluency`. It may guide enablement
and workflow intervention planning, but it does not upgrade evidence coverage,
prove business outcomes, or authorize financial/customer-facing claims.

## How To Validate

Run:

```bash
node scripts/validate_ai_value_support_pilot.mjs \
  --input docs/contracts/ai-value-intelligence/examples/customer-success-50-synthetic-workshop-response.json
```

Expected decision:

```text
PROCEED_TO_GOVERNED_PACKET
```

That decision means the synthetic fixture is structurally ready for a governed
packet rehearsal. It does not mean the organization has real full Playbook
coverage or validated economic evidence.

## What This Unlocks

This fixture can be used to rehearse:

- intake packet completion;
- validator happy-path behavior;
- domain-agnostic value-chain execution from intake through executive packet;
- VBD movement display logic;
- Layer 1, Layer 2, Layer 3, governance, and assumption source-package
  readiness planning;
- internal readout caveat language; and
- transition from synthetic rehearsal to real customer aggregate evidence.

## What Still Requires Real Customer Data

A real pilot still needs customer-owned aggregate evidence for:

- fixed baseline and comparison windows;
- approved account or case population;
- system-of-record outcome metrics;
- AI Fluency or user voice evidence;
- source-owner attestations;
- assumption approvals; and
- finance or business approval before any internal financial translation.

The synthetic fixture should be replaced, not promoted, once real customer
aggregate exports are available.
