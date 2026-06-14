# Customer Support AI Value Pilot Intake Packet

Status: customer pilot intake packet

Phase: `phase-ai-value-customer-pilot-intake-packet`

## Purpose

Use this packet before the customer validation workshop to confirm whether a
customer support pilot has enough approved aggregate evidence to enter the
governed AI Value pilot chain.

The intake decision question is:

```text
Can the customer approve the support workflow scope, aggregate source exports,
baseline/comparison windows, source-owner attestations, and assumption ledger
needed to run a governed value investigation?
```

This packet feeds the existing customer support pilot design, dry run,
validation workshop kit, local pilot validator, Evidence Snapshot path, Claim
Readiness Handoff path, Customer Exposure Policy, Glean Signal Readiness Map,
and Reportability Gate. It does not create migrations, backend routes,
frontend UI, ingestion jobs, persisted Claim Readiness Snapshots, persisted
Executive Readout Snapshots, customer-facing financial output, ROI proof,
causality claims, productivity claims, headcount claims, person-level
attribution, comparative manager/team ordering, people decisioning, or
raw-data storage.

## How This Packet Fits

| Step | Artifact | Purpose |
| --- | --- | --- |
| 1 | Intake packet | Confirm the customer can provide only aggregate, approved, source-owned evidence. |
| 2 | [Pilot design](./customer-support-pilot-design.md) | Define the support workflow evidence design and claim boundary. |
| 3 | [Dry run](./customer-support-pilot-dry-run.md) | Test the seeded packet with caveats before using customer inputs. |
| 4 | [Validation workshop kit](./customer-support-validation-workshop-kit.md) | Facilitate customer confirmation of source coverage and assumptions. |
| 5 | Local pilot validator | Convert the workshop response into a readiness decision. |
| 6 | Runtime pilot chain | Build governed internal objects only after all required source packages are present and safe. |

The intake packet should be completed before any customer-owned evidence is
used to assemble an Evidence Snapshot. BigQuery source availability, VBD
movement, or aggregate workforce context cannot upgrade the packet to full
Playbook coverage by itself.

## Intake Decision States

Choose exactly one decision at the end of intake.

| Decision | Use when | Next move |
| --- | --- | --- |
| `READY_FOR_GOVERNED_PACKET` | Workflow, windows, aggregate sources, source-owner attestations, assumptions, and governance boundaries are confirmed. | Proceed to customer validation workshop and then generate the governed packet from approved aggregate inputs. |
| `HOLD_FOR_ASSUMPTIONS` | Aggregate sources are plausible, but one or more required customer-owned assumptions is missing, held, or caveated. | Assign an owner and due date for each unresolved assumption. |
| `HOLD_FOR_SOURCE_COVERAGE` | A required evidence layer, source package, source owner, or source coverage lane is missing, held, not computed, or suppressed. | Resolve source coverage or narrow the workflow scope. |
| `HOLD_FOR_BASELINE` | Baseline and comparison windows are not comparable or were not declared before interpretation. | Select fixed windows before any value interpretation. |
| `STOP_FOR_GOVERNANCE_REVIEW` | The requested path requires raw rows, direct identifiers, hashed or joinable person identifiers, raw content, person-level HRIS/productivity data, ROI proof, causality, scoring, ranking, new routes, ingestion, or UI. | Stop the pilot motion and return to governance review. |

The local validator emits `PROCEED_TO_GOVERNED_PACKET` where this packet says
`READY_FOR_GOVERNED_PACKET`. Treat those as the same operational posture: the
intake is ready to move into the governed packet path, not ready for external
financial claims.

## Minimum Customer Inputs

| Input | Required? | Customer owner | Accepted form |
| --- | --- | --- | --- |
| Workflow scope | Required | Business sponsor and AIOM | Approved workflow family: `customer_support_case_resolution`; eligible and excluded case definitions. |
| Value route | Required | Business sponsor | Primary route: `CAPACITY_CREATION`; secondary routes only if approved. |
| Baseline window | Required | Support data owner | Fixed pre-pilot date range declared before interpretation. |
| Comparison window | Required | Support data owner | Fixed comparison date range using the same workflow and eligible population definition. |
| Layer 1 telemetry summary | Required | Glean or approved telemetry owner | Aggregate AI activity and source-readiness summary; no raw rows or user-level logs. |
| Layer 2 user voice | Required for full Playbook coverage | AIOM, survey owner, or user voice owner | Aggregate AI Fluency baseline/retest, survey aggregate, workflow observation, or approved user voice export. |
| Layer 3 system-of-record outcomes | Required for full Playbook coverage | Support operations and support data owner | Aggregate support KPI export for median resolution hours plus supporting metrics where approved. |
| Governance controls | Required | Source owner, privacy reviewer, or AIOM | Source readiness, k-min posture, raw-content exclusion, forbidden-field check, and source-owner attestation. |
| Assumption approvals | Required | Business sponsor and source owners | Required assumption ledger with state, owner, and caveat text where needed. |
| Finance/business approval | Required for internal financial translation | Finance owner or business owner | Approval state for governed scenario review; not customer-facing financial output. |

## Evidence Package Checklist

All source packages are metadata-bound evidence inputs. They cannot create full
Playbook coverage alone and cannot authorize downstream claims by themselves.

| Evidence layer | Required package type | Minimum intake evidence | Intake fail-closed state |
| --- | --- | --- | --- |
| Layer 1 telemetry | `layer_1_bigquery_telemetry_summary` | Aggregate Search, Assistant, Skill, agent, workflow, VBD, source readiness, k-min, suppression, and reporting-window posture where available. | `HOLD_FOR_SOURCE_COVERAGE` if unavailable, not approved, or telemetry-only. |
| Layer 2 user voice | `layer_2_user_voice_empirical_export` | Aggregate AI Fluency baseline, retest, survey aggregate, user voice, or workflow observation. | `HOLD_FOR_SOURCE_COVERAGE` for full Playbook coverage if absent; keep caveat explicit if comparison retest is pending. |
| Layer 3 system of record | `layer_3_business_system_of_record_outcome_export` | Aggregate support KPI baseline and comparison export for `support_median_resolution_hours`; include backlog, reopen, escalation, or CX metrics when approved. | `HOLD_FOR_SOURCE_COVERAGE` or `HOLD_FOR_BASELINE` if absent, raw-only, unaligned, or not owner-attested. |
| Governance | `governance_control_export` | Source readiness, data boundary, k-min posture, forbidden-field check, raw-content exclusion, source-owner attestation, suppression posture. | `STOP_FOR_GOVERNANCE_REVIEW` for unsafe input; otherwise `HOLD_FOR_SOURCE_COVERAGE`. |
| Assumptions | `assumption_approval_export` | Customer-owned assumption states, owners, and caveats; finance/business approval where financial translation is requested. | `HOLD_FOR_ASSUMPTIONS` unless all required assumptions are present or explicitly not applicable. |
| Aggregate workforce context | `aggregate_workforce_context_export` | Optional aggregate, cohort-safe, source-owner-approved, non-decisioning context. | Context only; cannot upgrade coverage or support people, team, manager, HRIS, or productivity claims. |

## Source Owner Attestations

Each source owner must confirm the following before the packet can move forward.

| Attestation | Required statement |
| --- | --- |
| Aggregate-only boundary | The export contains aggregate rows only and no direct identifiers, hashed or joinable person identifiers, raw content, or person-level records. |
| Source ownership | The named owner is authorized to approve the source for this pilot use. |
| Window alignment | The source covers the declared baseline and/or comparison windows and uses the approved support workflow slice. |
| Metric definition | Metric definitions are stable or caveats are recorded in the assumption ledger. |
| K-min and suppression | Minimum cohort threshold is met or suppressed/held slices remain explicit. |
| Raw-content exclusion | The export excludes raw tickets, prompts, responses, transcripts, comments, files, query text, tool payloads, and action rows. |
| Claim boundary | The source does not claim ROI proof, EBITA, causality, productivity, headcount reduction, individual attribution, manager/team ranking, people decisioning, or customer-facing financial output. |

## Approved Aggregate Inputs

The customer or approved source owner may provide only aggregate values for the
approved support workflow slice and fixed reporting windows.

| Data family | Required? | Approved aggregate fields | Blocked fields |
| --- | --- | --- | --- |
| Case population | Required | Total cases, eligible cases, excluded cases, exclusion reason counts. | Ticket IDs, ticket text, customer names, assignee names. |
| AI activity | Required if available | Aggregate Search sessions, Assistant sessions, Skill invocations, agent runs, workflow runs by approved window or workflow slice. | Prompts, responses, transcripts, user-level events, raw action rows. |
| VBD movement | Required as Layer 1 context where available | Aggregate Velocity, Breadth, and Depth movement by reporting window. | No single AI value score, individual activity, comparative people/group ordering, or productivity inference. |
| Trust and friction | Required if available | Aggregate verification-attached episodes, recovery episodes, abandonment episodes, QA exception counts, source-owner attestation. | Reviewer names, raw QA notes, raw comments, action payloads. |
| Resolution time | Required | Median or p75 resolution time by window. | Per-ticket timestamps, agent-level time rows. |
| Escalation | Recommended | Aggregate escalation rate by window. | Escalation notes, assignee identity. |
| Rework or quality | Recommended | Aggregate reopen rate, correction rate, or QA exception rate by window. | Ticket text, QA notes, reviewer identity. |
| Backlog | Recommended | Aggregate backlog count or aged-backlog share by window. | Ticket-level backlog rows. |
| Customer experience | Optional | Aggregate CSAT, NPS, or sentiment band by window. | Verbatim comments, respondent identity. |
| Aggregate workforce context | Optional | Approved cohort-safe context such as support role family or staffing band where k-min clears. | HRIS rows, manager chains, compensation, performance, attrition prediction, people decisioning. |

## Outcome Signal Definitions

Each outcome signal must be defined before the pilot interprets movement. If a
metric definition is missing or unstable, keep the outcome lane caveated or
held.

| Outcome signal | Required definition fields | Required owner | Caveat if unresolved |
| --- | --- | --- | --- |
| `support_median_resolution_hours` | Unit, start event, stop event, excluded cases, baseline value, comparison value, and source system. | Support data owner | Blocks full outcome comparison and financial translation. |
| `support_escalation_rate` | Numerator, denominator, escalation definition, baseline rate, comparison rate, and source system. | Support operations | Keeps quality and friction interpretation caveated. |
| `support_reopen_rate` | Numerator, denominator, reopen window, baseline rate, comparison rate, and source system. | Support operations or quality owner | Keeps quality interpretation caveated. |
| `support_backlog_count` | Backlog definition, aging rule where used, baseline count, comparison count, and source system. | Support operations | Keeps capacity context caveated. |
| Customer experience metric, optional | Metric name, aggregate grain, collection method, baseline value, comparison value, and approval state. | Customer experience owner | Experience route remains incomplete. |

Do not accept per-ticket records, individual agent rows, raw comments, or raw
ticket contents as outcome signal evidence.

## Required Source Coverage

Use the same lane names as the local support pilot validator.

| Lane | Accepted ready state | Hold or stop state |
| --- | --- | --- |
| `ai_activity` | `PRESENT` when aggregate AI activity is approved for the support workflow slice. | `MISSING`, `HELD`, `NOT_COMPUTED`, or `SUPPRESSED` keeps value language held or suppressed. |
| `workflow` | `PRESENT` when workflow family, eligible cases, and excluded cases are approved. | `HELD` or `MISSING` if the workflow definition is too broad, ambiguous, or not customer-approved. |
| `outcome` | `PRESENT` when aggregate support KPIs exist for both windows. | `MISSING` if outcome evidence is absent; raw-only exports trigger governance review. |
| `baseline` | `PRESENT` when baseline and comparison windows are declared before interpretation. | `HOLD_FOR_BASELINE` if windows are missing, cherry-picked, or not comparable. |
| `trust` | `PRESENT` when verification, recovery, abandonment, QA, or source attestation context is present or explicitly not applicable. | `HELD` if trust context is required but unavailable. |
| `assumptions` | `PRESENT` when all required assumptions are present or explicitly not applicable. | `HOLD_FOR_ASSUMPTIONS` for missing, held, caveated, or ownerless assumptions. |
| `suppression` | `PRESENT` when existing fail-closed verdict state is available. | `SUPPRESSED` blocks downstream value language. |

Allowed states: `PRESENT`, `MISSING`, `HELD`, `CAVEATED`, `NOT_COMPUTED`,
`NOT_APPLICABLE`, `SUPPRESSED`.

These are intake and workshop evidence states, not new suppression reasons.
Existing FluencyTracr suppression reasons remain unchanged.

## Assumption Ledger Worksheet

The pilot cannot move beyond caveated value investigation until the customer
completes the required assumption ledger. Use the underscore-form IDs below
because they are the IDs checked by the local support pilot validator.

| Assumption ID | Customer question | Required owner | Accepted state | Blocks if unresolved |
| --- | --- | --- | --- | --- |
| `case_mix_stability` | Was the baseline case mix similar enough to the comparison case mix for directional review? | Support operations | `PRESENT` or `NOT_APPLICABLE` | Stronger capacity, cost, quality, or experience language. |
| `volume_context` | Did total support volume materially change across windows? | Support operations | `PRESENT` or `NOT_APPLICABLE` | Capacity interpretation. |
| `staffing_and_coverage_context` | Did staffing, queue coverage, outsourcing, scheduling, or coverage materially change? | Support leader | `PRESENT` or `NOT_APPLICABLE` | Productivity, staffing, or capacity narrative. |
| `channel_mix_context` | Did chat, email, phone, self-service, partner, or bot-assisted channel mix materially change? | Support operations | `PRESENT` or `NOT_APPLICABLE` | Resolution-time interpretation. |
| `process_or_policy_context` | Did routing, SLA, process, policy, tooling, or support playbook changes occur? | Business sponsor | `PRESENT` or `NOT_APPLICABLE` | Causal and quality interpretation. |
| `knowledge_base_context` | Did major knowledge-base, content, enablement, or support guidance changes occur? | Knowledge owner | `PRESENT` or `NOT_APPLICABLE` | Search/Assistant value narrative. |
| `metric_definition_stability` | Were KPI definitions, filters, and measurement methods stable across windows? | Data owner | `PRESENT` or `NOT_APPLICABLE` | Any outcome comparison. |
| `ai_rollout_context` | What AI workflow, Skill, agent, enablement, or process rollout occurred, and when? | AIOM and business sponsor | `PRESENT` or `NOT_APPLICABLE` | Workflow-value hypothesis. |

For each row, record:

- `state`
- `owner`
- `approval_date`
- `caveat_text`
- `source_ref`
- `next_owner` and `due_date` when unresolved

## Financial Translation Approval

Customer input can make ROI scenario review possible, but it does not make
FluencyTracr the source of customer-facing financial output.

Internal financial translation remains blocked unless all of the following are
true:

- Layer 1 telemetry is present or partial with explicit caveats;
- Layer 2 user voice is present;
- Layer 3 system-of-record evidence is present;
- governance evidence is present;
- assumption evidence is present or explicitly not required;
- finance or business-owner approval is present when financial translation is
  requested;
- unsafe privacy flags are false;
- k-min threshold is met;
- missing, held, suppressed, or not-computed lanes are carried forward as
  caveats; and
- blocked uses remain blocked for customer-facing financial output.

BigQuery telemetry, VBD movement, or aggregate workforce context alone cannot
validate full Playbook coverage or unlock financial/customer-facing claims.

## Forbidden Input Checklist

Stop intake and return to governance review if any proposed input requires:

- raw rows;
- names, emails, employee IDs, user IDs, customer IDs, manager IDs, or manager
  chains;
- hashed, pseudonymous, tokenized, or joinable person identifiers;
- raw prompts, responses, transcripts, query text, ticket text, comments,
  documents, file contents, tool payloads, or action rows;
- person-level HRIS, directory, survey, training, enablement, compensation,
  performance, productivity, workforce-planning, promotion, discipline, or
  attrition data;
- person-level scoring, person-level attribution, comparative manager/team
  ordering, people decisioning, or comparative people analytics;
- model-generated inferred teams, roles, managers, effort, productivity,
  savings, compensation, performance, promotion, discipline, or attrition;
- customer-facing financial output, realized ROI proof, EBITA, causality,
  productivity, or headcount reduction claims;
- new migrations, backend routes, frontend UI, ingestion jobs, dashboards, or
  persisted claim/readout snapshots.

## Safe And Blocked Language

Allowed intake language:

- The support workflow is ready for a governed value investigation if source
  coverage, assumptions, and governance checks pass.
- Aggregate evidence can show VBD movement, AI Fluency/user voice posture, and
  customer-owned support metric movement over time.
- Customer-owned support metrics can test whether AI-assisted work is
  associated with movement in resolution time, escalation, rework, backlog, or
  customer experience.
- Full Playbook coverage requires Layer 1, Layer 2, Layer 3, governance, and
  assumption evidence with unresolved caveats carried forward.
- Governed ROI scenario review is internal and caveated unless a later approved
  customer-owned financial validation process explicitly supports stronger
  language.

Blocked intake language:

- Glean proved ROI.
- FluencyTracr calculated realized savings.
- Glean caused productivity lift.
- AI usage generated EBITA or customer-facing financial output.
- The support team saved a specific number of hours.
- A person, manager, team, function, department, customer, or Skill performed
  better with AI.
- BigQuery telemetry or VBD movement alone validates full Playbook coverage.
- Aggregate workforce context upgrades coverage or authorizes people decisions.

## Intake Worksheet

```markdown
# Customer Support AI Value Pilot Intake

## Intake Decision

- Decision:
- Rationale:
- Decision owner:
- Decision date:

## Approved Scope

- Customer:
- Workflow family: customer_support_case_resolution
- Workflow name:
- Business objective:
- Primary value route: CAPACITY_CREATION
- Baseline window:
- Comparison window:
- Business sponsor:
- AIOM owner:
- Support operations owner:
- Support data owner:
- Governance/privacy owner, if required:
- Finance/business approval owner, if financial translation is requested:

## Source Package Readiness

| Package type | State | Owner | Source ref | Caveat |
| --- | --- | --- | --- | --- |
| layer_1_bigquery_telemetry_summary |  |  |  |  |
| layer_2_user_voice_empirical_export |  |  |  |  |
| layer_3_business_system_of_record_outcome_export |  |  |  |  |
| governance_control_export |  |  |  |  |
| assumption_approval_export |  |  |  |  |
| aggregate_workforce_context_export, optional |  |  |  |  |

## Source Coverage

| Lane | State | Owner | Caveat |
| --- | --- | --- | --- |
| ai_activity |  |  |  |
| workflow |  |  |  |
| outcome |  |  |  |
| baseline |  |  |  |
| trust |  |  |  |
| assumptions |  |  |  |
| suppression |  |  |  |

## Approved Aggregate Inputs

| Data family | Present? | Owner | Notes |
| --- | --- | --- | --- |
| Case population |  |  |  |
| AI activity |  |  |  |
| VBD movement |  |  |  |
| Trust and friction |  |  |  |
| Median resolution hours |  |  |  |
| Escalation rate |  |  |  |
| Reopen or QA exception rate |  |  |  |
| Backlog count |  |  |  |
| Customer experience, optional |  |  |  |
| Aggregate workforce context, optional |  |  |  |

## Outcome Signal Definitions

| Outcome signal | Definition stable? | Owner | Baseline value | Comparison value | Caveat |
| --- | --- | --- | --- | --- | --- |
| support_median_resolution_hours |  |  |  |  |  |
| support_escalation_rate |  |  |  |  |  |
| support_reopen_rate |  |  |  |  |  |
| support_backlog_count |  |  |  |  |  |
| Customer experience metric, optional |  |  |  |  |  |

## Assumption Ledger

| Assumption ID | State | Owner | Caveat | Due date |
| --- | --- | --- | --- | --- |
| case_mix_stability |  |  |  |  |
| volume_context |  |  |  |  |
| staffing_and_coverage_context |  |  |  |  |
| channel_mix_context |  |  |  |  |
| process_or_policy_context |  |  |  |  |
| knowledge_base_context |  |  |  |  |
| metric_definition_stability |  |  |  |  |
| ai_rollout_context |  |  |  |  |

## Governance Stop Conditions

| Stop condition | Confirm false |
| --- | --- |
| requires_raw_data |  |
| requires_hr_analytics |  |
| requires_roi_calculation |  |
| requires_causality_claim |  |
| requires_individual_scoring |  |
| requires_dashboard |  |
| requires_runtime_service |  |

## Safe Next Message

We confirmed whether the support workflow has enough approved aggregate
evidence to enter a governed AI value investigation. This is not ROI proof,
causality, productivity measurement, team performance comparison, or
customer-facing financial output. If source coverage, baseline/comparison
windows, assumptions, and governance checks pass, the next step is the customer
validation workshop and governed packet generation. If not, the packet remains
held with explicit caveats.
```

## Validator Alignment

After the intake is translated into the workshop response shape, run:

```bash
npm run validate:ai-value-pilot
```

The validator checks:

- required fields;
- approved aggregate inputs;
- source coverage lanes;
- baseline and comparison windows;
- required assumption IDs;
- owner presence for each assumption;
- forbidden input fields; and
- governance stop conditions.

The seeded fixture currently demonstrates the expected hold posture when
assumptions remain incomplete:

```text
Decision: HOLD_FOR_ASSUMPTIONS
```

Use that hold as a feature, not a failure. It proves the pilot can keep missing
customer-owned assumptions explicit instead of converting aggregate telemetry
or outcome movement into unsupported value claims.
