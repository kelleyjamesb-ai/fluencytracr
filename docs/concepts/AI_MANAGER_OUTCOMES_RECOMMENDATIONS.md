# AI Manager Outcomes Recommendations

## 1. Purpose

AI Manager Outcomes Recommendations is the docs-first product concept that
turns aggregate AI Work Evidence into recommended customer-owned outcome
signals and testing formulas.

It answers:

```text
Based on the AI work patterns FluencyTracr can already observe, which internal
outcome data should an AI program leader connect next to test value safely?
```

It does not answer:

```text
How much ROI did AI create?
Which employees, teams, departments, managers, or functions are better at AI?
```

"AI Manager" means the AI program owner, AI operations manager, value
realization owner, CIO staff, or business sponsor who decides what outcome
evidence to investigate next. It does not mean a people manager and it must not
be interpreted as manager performance, employee assessment, or workforce
surveillance.

This concept is documentation-stage only. It adds no canonical events,
suppression reasons, thresholds, schemas, APIs, storage, SQL, frontend
surfaces, ROI calculation, causal model, productivity measurement, or
customer-facing economic output.

## 2. Product Role

FluencyTracr already separates aggregate AI activity from workflow evidence,
trust evidence, source coverage, outcome readiness, and value hypotheses. AI
Manager Outcomes Recommendations adds the next executive question:

```text
What internal outcome signal should this organization use to test the value
hypothesis?
```

The layer should help a customer avoid broad, invasive data asks. Instead of
requiring HRIS, surveys, training records, business systems, or finance data at
the start of a pilot, FluencyTracr can first observe aggregate AI work patterns
and then recommend the smallest next outcome evidence needed for a defensible
business-owned value investigation.

## 3. Value Routes

Every recommendation must map to one or more executive value routes. These
routes are commercial investigation lanes, not proof of value.

| Value route | Meaning | Example outcome signals |
| --- | --- | --- |
| `COST_REDUCTION` | Same work may require less time, rework, escalation, or manual effort. | cycle time, handling time, rework rate, escalation rate, backlog movement |
| `REVENUE_EXPANSION` | AI-assisted work may support more pipeline, faster selling, better conversion, or expansion. | stage progression, sales cycle, conversion, renewal, expansion, pipeline velocity |
| `QUALITY_IMPROVEMENT` | AI-assisted work may reduce defects, reopens, corrections, or review failures. | defect rate, QA pass rate, reopen rate, correction rate, audit exceptions |
| `CAPACITY_CREATION` | Existing teams may handle more work without proportional headcount growth. | completed work volume, cases handled, tasks closed, content produced, backlog reduction |
| `RISK_REDUCTION` | AI use may become safer, more governed, more verified, or less ambiguous. | verification coverage, policy exception rate, unresolved trust gaps, approval coverage |
| `EXPERIENCE_IMPROVEMENT` | AI-assisted work may improve customer, partner, or employee experience when measured safely. | CSAT, NPS, onboarding milestone completion, support sentiment, help-request rate |

Revenue expansion and cost reduction are the two broad economic routes most
executives recognize. Quality, capacity, risk, and experience are the more
nuanced routes that often explain why revenue or cost movement may be plausible
or blocked.

## 4. Recommendation Shape

Every recommendation should use this plain-language structure:

```text
AI-service workflow family:
Which aggregate service or workflow lane produced the recommendation.

Observed pattern:
What FluencyTracr saw in aggregate AI work evidence.

Likely value route:
The executive value route that the pattern may support.

Recommended outcome data:
The customer-owned aggregate metric or system family that would test the
hypothesis.

Formula template:
How the customer can calculate the test at an approved aggregate level.

Interpretation boundary:
What the result would and would not prove.
```

Recommended internal sources must stay source-neutral. Examples include:

- support systems;
- CRM;
- QA or review systems;
- operations or workflow systems;
- onboarding or help systems;
- learning systems only when the customer approves aggregate-safe use;
- finance or workforce planning systems only when the customer approves the
  assumptions and aggregation boundary.

HRIS, directory, level, tenure, function, manager/IC, or role-family context is
optional and sensitive. It may be used only as a customer-approved aggregate
segment or milestone source. Raw HR data, employee IDs, emails, names, raw
titles, manager chains, person-level rows, and individual usage records must
not enter FluencyTracr.

AI-service workflow families are context labels for executive explanation, not
new canonical events or a Glean-only ontology. Current allowed examples are:

- assistive search or answer surface;
- search-to-agent workflow;
- agent or action execution workflow;
- verification or feedback-attached workflow;
- trust-evidence repair workflow;
- source-linkage or boundary repair;
- scale-candidate aggregate workflow.

## 5. Formula Templates

Formula templates are customer-run testing formulas. They are not ROI formulas
and they do not claim causality.

### Cost reduction

```text
Cycle-time movement =
baseline median cycle time
minus AI-assisted median cycle time
```

```text
Friction movement =
baseline escalation, fallback, or rework rate
minus AI-assisted escalation, fallback, or rework rate
```

### Revenue expansion

```text
Sales-cycle movement =
baseline median days between approved pipeline stages
minus AI-assisted median days between the same stages
```

```text
Conversion movement =
AI-assisted aggregate conversion rate
minus baseline aggregate conversion rate
```

### Quality improvement

```text
Quality movement =
baseline defect, reopen, correction, or QA-fail rate
minus AI-assisted defect, reopen, correction, or QA-fail rate
```

### Capacity creation

```text
Throughput movement =
AI-assisted completed work per period
minus baseline completed work per period
```

### Risk reduction

```text
Trust coverage movement =
AI-assisted verified, approved, or feedback-attached episodes
divided by interpretable AI work episodes
```

```text
Exception movement =
baseline policy exception or unresolved-trust-gap rate
minus AI-assisted policy exception or unresolved-trust-gap rate
```

### Experience improvement

```text
Experience movement =
AI-assisted aggregate experience metric
minus baseline aggregate experience metric
```

Experience measures need extra caveats because they are often influenced by
seasonality, staffing, channel mix, product changes, and support demand.

## 6. Recommendation Quality Gates

Each recommendation must pass all gates before it can appear as a recommended
customer-owned value test.

| Gate | Required question |
| --- | --- |
| Pattern fit | Does the observed AI work pattern actually match the proposed value route? |
| Outcome fit | Does the recommended outcome metric measure the thing the hypothesis asks about? |
| Source plausibility | Is the metric likely available in a normal customer system without requiring broad data collection? |
| Aggregate safety | Can the test run at workflow, cohort, surface, window, or approved segment level without person-level rows? |
| Formula clarity | Can the customer calculate the formula without FluencyTracr inventing assumptions? |
| Confounder awareness | Are obvious reasons for misleading interpretation named? |
| Governance safety | Does the recommendation avoid person assessment, comparative group evaluation, productivity claims, ROI proof, and causality claims? |

If a gate fails, the recommendation must be held as `RESEARCH_ONLY`,
`SOURCE_COVERAGE_HOLD`, `OUTCOME_EVIDENCE_MISSING`, or
`SUPPRESSED_NO_RECOMMENDATION` in a future docs-only contract shape. These are
recommendation states, not new suppression reasons.

## 7. Pattern To Outcome Recommendations

| AI-service workflow family | Observed AI work pattern | Likely value route | Recommended outcome data |
| --- | --- | --- | --- |
| Assistive search or answer surface | High-volume assistive use with weak workflow depth | `CAPACITY_CREATION`, held until workflow completion evidence exists | workflow completion, repeat work, cycle time, task closure |
| Search-to-agent workflow | Search-to-agent escalation | `COST_REDUCTION`, `EXPERIENCE_IMPROVEMENT`, `REVENUE_EXPANSION` depending on workflow | resolution time, stage progression, conversion, escalation rate |
| Search-to-agent workflow | Post-friction continuation | `COST_REDUCTION`, `QUALITY_IMPROVEMENT`, `RISK_REDUCTION` | fallback rate, rework rate, completion after error, escalation rate |
| Verification or feedback-attached workflow | Verification-attached workflow | `QUALITY_IMPROVEMENT`, `RISK_REDUCTION` | QA pass rate, defect rate, reopen rate, approval coverage, audit exceptions |
| Agent or action execution workflow | Execution-linked workflow | `CAPACITY_CREATION`, `COST_REDUCTION`, `REVENUE_EXPANSION` | throughput, cycle time, stage movement, backlog movement |
| Trust-evidence repair workflow | Trust evidence gap | `RISK_REDUCTION`, held until attribution improves | verification coverage, feedback-loop coverage, unresolved trust gap |
| Scale-candidate aggregate workflow | Scale candidate with outcome context | route depends on workflow | customer-owned KPI aligned to same window and aggregate slice |
| Source-linkage or boundary repair | Instrumentation hold or suppressed evidence | no value route | source coverage repair before outcome testing |

## 8. Output Boundary

Allowed output:

- "This aggregate AI work pattern suggests testing a support cycle-time
  outcome."
- "Recommended customer-owned outcome data: resolution time, reopen rate, and
  escalation rate."
- "Suggested aggregate formula: baseline median resolution time minus
  AI-assisted median resolution time."
- "Boundary: this tests value; it does not prove AI caused the movement."

Blocked output:

- "AI saved $X."
- "AI improved productivity by X%."
- "This team is more fluent."
- "This manager's group performs better."
- "Connect HRIS so FluencyTracr can score employee fluency."
- "Low citation clicks prove low trust."

## 9. Relationship To Existing Concepts

AI Work Evidence observes aggregate behavior and source coverage.

AI Scale Readiness turns that evidence into action posture.

Economic Impact Bridge turns readiness posture into value investigation
language.

AI Manager Outcomes Recommendations tells the customer which internal outcome
signals and formula templates to use next.

Outcome Evidence remains the customer-owned aggregate KPI context that may be
attached later. The recommendation layer does not require Outcome Evidence to
exist before it can recommend what should be connected.

## 10. Governance Invariants Preserved

AI Manager Outcomes Recommendations preserves all nine invariants:

1. No new canonical events.
2. No new suppression reasons.
3. No tunable thresholds.
4. No admin overrides.
5. No person-level assessment or user-identifiable fields.
6. Default verdict remains `SUPPRESS`.
7. Latency remains corroborative only.
8. Future implementation must keep the Assurance Harness green.
9. Recommendation records gate independently per approved aggregate slice.

## 11. Next Bounded Step

The next bounded step is documentation-only contract hardening:

- define the docs-only recommendation record shape;
- define allowed value-route enums;
- define formula-template families;
- define recommendation readiness states that do not become suppression
  reasons;
- apply the model manually to the current internal pilot packet;
- keep runtime, schema, endpoint, SQL, and customer-facing product output held
  until a later promotion decision explicitly authorizes that exact scope.

## 12. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. AI
Manager Outcomes Recommendations is credited to James Kelley: FluencyTracr
should use observed aggregate AI work evidence to recommend the safest internal
outcome data and formulas needed to test economic value, while keeping ROI,
causality, productivity, workforce assessment, comparative group evaluation,
and surveillance blocked unless separately governed.
