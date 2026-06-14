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

## Outcome Signals

| Signal | Baseline | Comparison | Use |
| --- | ---: | ---: | --- |
| Account health review cycle days | 10.8 | 7.4 | Tests whether account review work is moving faster. |
| Risk review coverage share | 0.62 | 0.81 | Tests whether more eligible accounts receive review coverage. |
| Renewal action staleness count | 146 | 92 | Tests whether follow-up actions are less stale. |
| QBR prep hours per account | 2.6 | 1.9 | Tests capacity posture only; not productivity proof. |
| Expansion signal follow-up share | 0.38 | 0.51 | Tests whether identified expansion signals receive follow-up. |

These are synthetic aggregate values. They do not prove real customer movement.

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
