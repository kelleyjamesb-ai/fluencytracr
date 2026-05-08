# Real-Source Readiness for Glean Claim Packet Export

This document defines what must be true before the synthetic Glean Claim Packet Export fixtures can be replaced with real source inputs.

It does not define or implement ingestion. Any live import, export, or MCP/read path requires a separate approved OpenSpec change with exact source contracts, privacy proof, and rollback behavior.

## Product Stance

The Claim Packet Export is methodology-governed claim packaging for QBR preparation. It is not an ROI calculator, not a live telemetry warehouse, and not a strongest-possible-claim generator.

Real sources may replace synthetic fixtures only when they preserve the existing claim governance behavior:

- source estimates remain source-system estimates
- financial language remains downstream of methodology approval
- unknown fields become `not_computed`, `missing`, or `suppressed`
- customer-facing language is emitted only when the evidence and approval gates allow it
- forbidden raw or person-level data never enters the packet

## Required Source Inputs

| Input | Purpose in claim packet | Minimum real-source requirement | Current fixture stand-in |
| --- | --- | --- | --- |
| Methodology snapshot | Determines approval state, claim effect, sensitivity, caveats, and blocked claim effects | Frozen snapshot id, approval state, customer-safe claim effect, effective/expiry dates, covered/excluded surfaces, high-sensitivity assumptions, caveats, and approval owner or approver role | `methodology-snapshots:nielsen-synthetic:2026-05` |
| Strongest Safe Claim result | Provides the highest admissible claim language for the selected snapshot and evidence posture | Deterministic claim state, allowed language, blocked language, reasons stronger claims are blocked, and downgrade behavior for missing snapshots | Synthetic Methodology Review Workspace output |
| Value Evidence Pack or AI Work Value Graph | Supplies evidence posture, supported claims, evidence gaps, outcome links, and upgrade actions | Aggregate account/window evidence only, with stable schema version, source surface classes, work pattern classification, evidence type, claim readiness state, and governance boundary metadata | `GVE_2026_05` and AI Work Value Graph fixtures |
| Outcome Instrumentation Map | Defines what external outcome evidence is required before outcome-linked or finance-approved claims can advance | System-of-record name, metric name, aggregation level, baseline requirement, counterfactual requirement, attribution strength, minimum sample size, and privacy boundary | Nielsen-style outcome instrumentation fixture |
| Reviewer decision memo | Converts methodology state into plain-English review context | Generated from approved snapshot and packet inputs; must include blocked claim language and upgrade actions without exposing raw content | Synthetic reviewer memo |
| Governance boundaries | States the hard limits on what the packet may include or imply | Explicit forbidden-field policy, aggregate-only rules, no direct identifiers, no ranking/manager view/productivity scoring rules, and suppression behavior | Static packet boundary list |

## Fixture-to-Real Mapping

| Fixture field or object | Real-source replacement | Replacement rule |
| --- | --- | --- |
| `org_id: org-nielsen-synthetic` | Customer/account id or stable account-window id | Must be account-level or tenant-level. Do not use direct person identifiers. |
| `claim_packet_id` | Deterministic packet id for account/window/snapshot | Must be reproducible from approved metadata, not raw source content. |
| `window` | Reporting window from approved source extracts | Must include start/end dates and align across methodology, evidence, and outcomes. |
| `selected_methodology_snapshot_id` | Approved Methodology Snapshot Registry id | Must point to a frozen snapshot. Missing snapshot downgrades financial claims by default. |
| `strongest_safe_claim` | Generated output from Strongest Safe Claim | Must preserve the selected snapshot approval state and cannot upgrade readiness. |
| `caveated_claims` | Claims with sufficient evidence but stated limitations | Must include reason codes and caveats; customer-safe caveated language requires customer-safe approval state when financial. |
| `internal_only_claims` | Claims reviewable by internal teams but not customer-facing | Finance-approved but not customer-safe financial language stays here. |
| `suppressed_claims` | Claims blocked, rejected, expired, missing, or not computed | Unknown source fields, rejected methods, expired snapshots, and missing outcome proof must land here rather than be inferred. |
| `evidence_gaps` | Derived gaps from source availability and methodology requirements | Must describe missing evidence at aggregate level only. |
| `upgrade_actions` | Next safe instrumentation or approval steps | Must be operational and reviewable; no hidden reconstruction or raw-data requests. |

## Unknown Fields

Unknowns must be explicit. They must not be backfilled from adjacent fields, inferred from raw content, or hidden in generated prose.

| Unknown | Default handling | Why it matters |
| --- | --- | --- |
| Source surface coverage | Mark missing surface as excluded or `not_computed` | Prevents overclaiming across Chat, Search, AI Answers, Agents, Skills, MCP/actions, Canvas/artifacts, APIs, or embedded hosts. |
| Join-key stability | Treat linked outcome or workflow claim as `not_computed` | Prevents accidental attribution when evidence cannot be connected safely. |
| Methodology approval state | Suppress or downgrade financial language | Prevents customer-facing value claims without review. |
| Customer-safe claim effect | Default to internal-only or suppressed | Prevents finance-approved language from becoming customer-safe by implication. |
| Outcome baseline/counterfactual | Keep outcome-linked claim caveated or suppressed | Prevents unsupported causal value language. |
| Minimum sample size | Mark claim caveated or not computed | Prevents small-sample claims from sounding generalizable. |
| Privacy boundary approval | Suppress affected evidence | Prevents raw or person-level leakage into QBR artifacts. |

## Production Blockers

Do not replace synthetic fixtures until these blockers are resolved:

- exact source field contracts are documented for each source input
- export/query path is confirmed for aggregate account/window data
- forbidden raw fields are provably absent before packet construction
- direct identifiers are either absent or irreversibly mapped upstream to safe aggregate keys
- methodology snapshots have approval, expiry, and claim-effect semantics
- missing snapshot behavior deterministically downgrades financial claims
- finance-approved and customer-safe approval states are distinct and tested
- outcome metrics have baseline, counterfactual, attribution, and sample-size rules
- suppression and not-computed states survive through memo, JSON export, QBR narrative, and readiness summary
- reviewer workflow records who approved what and when, without person-level performance views
- retention and processing terms are documented for the customer/account window

## Privacy Boundaries

Real-source inputs must stay inside the same boundary as the synthetic packet.

The packet must not include:

- raw prompts
- raw responses
- transcripts
- query text
- tool payloads
- file contents
- direct identifiers
- rankings
- manager views
- productivity scoring
- hidden reconstruction of suppressed values

Allowed inputs are aggregate, metadata-only, and account/window scoped. Examples include surface class, evidence type, claim readiness state, approval state, covered/excluded surfaces, reason codes, caveat codes, outcome metric names, aggregation level, and approved upgrade actions.

## Approval Workflow Requirements

Before a real-source packet can be customer-facing, reviewers need a workflow that records:

| Review area | Required approval evidence |
| --- | --- |
| Methodology | Snapshot approval state, effective date, expiry date, approver role, high-sensitivity assumptions, sensitivity tests, and blocked claim effects |
| Finance | Whether financial language is finance-approved, internal-only, customer-safe, expired, rejected, or suppressed |
| Governance/privacy | Confirmation that source inputs are aggregate-only and forbidden fields are excluded before packet generation |
| CS / Value Engineering | Confirmation that claim language is usable for the QBR audience and preserves caveats |
| Outcome owner | Approval that external outcome metrics, baseline windows, counterfactual requirements, and attribution strength are represented accurately |

Approval state must be machine-readable. Plain-English approval notes are useful for reviewers, but they cannot be the only source of truth for claim effect.

## Minimum Acceptance Criteria for Replacing Synthetic Fixtures

A real-source packet may replace the synthetic fixture only when all criteria below pass:

1. The packet validates against `GCP_2026_05`.
2. Every source input maps to a documented contract and schema version.
3. The selected methodology snapshot is frozen and referenced by id.
4. Missing methodology snapshot behavior downgrades financial claims deterministically.
5. Finance-approved financial language remains internal-only unless the snapshot has customer-safe approval and customer-safe claim effect.
6. Rejected, expired, draft, missing, or unknown methodology states suppress financial claims.
7. Evidence gaps and upgrade actions are derived from documented missing fields, not guessed.
8. Outcome-linked claims include baseline, counterfactual, attribution, aggregation, sample-size, and privacy-boundary status.
9. Forbidden raw or person-level fields fail validation before export.
10. The reviewer decision memo, JSON export, QBR narrative, and QBR readiness summary all show the same claim buckets.
11. Suppressed and not-computed claims remain visibly separated from caveated and customer-safe claims.
12. A human reviewer can explain why each claim is customer-safe, caveated, internal-only, suppressed, or not computed without opening raw source records.

## Non-Goals

- Do not build ingestion from this document.
- Do not calculate ROI in FluencyTracr.
- Do not upgrade claim readiness based on fixture replacement alone.
- Do not infer unavailable source fields.
- Do not introduce manager views, team rankings, or productivity scoring.
