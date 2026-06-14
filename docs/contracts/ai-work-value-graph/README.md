# AI Work Value Graph Contract

Schema version: `AIWVG_2026_05`

## Purpose

The AI Work Value Graph models how aggregate Glean activity can become CFO-legible value evidence without turning FluencyTracr into a raw activity dump, individual productivity system, manager view, or unsupported ROI model.

The graph connects:

- AI surfaces
- work patterns
- maturity stages
- evidence types
- outcome domains
- claim readiness states

It is designed to answer:

> Where is Glean plausibly creating business value, how strong is the evidence, and what can be safely claimed?

## Contract Boundary

The graph may include aggregate metadata, evidence posture, claim readiness, maturity stage, and safe references to computed metrics.

The graph must not include:

- raw prompts
- raw responses
- transcripts
- query text
- file content
- direct user identifiers
- individual, team, or manager rankings
- manager views
- productivity scores or productivity scoring fields

## Required Dimensions

### AI Surfaces

- `search`
- `chat`
- `ai_answers`
- `agents`
- `skills`
- `mcp_actions`
- `canvas_artifacts`
- `apis`
- `embedded_hosts`

### Work Patterns

- `find`
- `understand`
- `summarize`
- `draft`
- `decide`
- `analyze`
- `troubleshoot`
- `automate`
- `orchestrate`

### Maturity Stages

- `ad_hoc_assistance`
- `repeated_assistance`
- `reusable_expertise`
- `agentic_execution`
- `governed_action`
- `outcome_linked`
- `finance_approved`

### Evidence Types

- `survey`
- `product_telemetry`
- `workflow_run`
- `artifact_output`
- `action_log`
- `control_evidence`
- `business_outcome`
- `financial_model`

### Outcome Domains

- `sales`
- `customer_success`
- `support`
- `engineering`
- `product`
- `IT`
- `HR`
- `legal`
- `finance`
- `security`
- `operations`

### Claim Readiness States

- `not_measured`
- `directional`
- `evidence_present`
- `caveated`
- `internal_only`
- `customer_safe`
- `suppressed`

## Graph Shape

The graph contains:

- `summary`: overall claim posture, covered surfaces, outcome domains, blocked claims, and next evidence actions
- `nodes`: surfaces, work patterns, maturity stages, and outcome domains
- `edges`: relationships between surfaces, patterns, maturity, evidence, and outcomes

Node IDs are aggregate graph IDs such as:

- `surface:search`
- `pattern:find`
- `maturity:repeated_assistance`
- `outcome:customer_success`

They are not user IDs, employee IDs, email addresses, or manager/team ranking keys.

## Recommended CFO Interpretation

Use this graph to produce a value evidence packet:

| Section | What it explains |
| --- | --- |
| Value posture | Overall claim readiness and highest maturity stage |
| Value drivers | Surfaces and work patterns with evidence |
| Outcome linkage | Which business domains have observable support |
| Evidence confidence | Which claims are directional, caveated, customer-safe, internal-only, or suppressed |
| Blocked claims | Claims that should not appear in customer or finance reporting |
| Next evidence actions | Instrumentation, validation, or finance-review work needed to unlock stronger claims |

## Strongest Safe Claim Generator

Schema version: `SSC_2026_05`

The strongest safe claim generator is a downstream layer over the graph, maturity model, value hypothesis registry, outcome instrumentation map, and optional Methodology Snapshot Registry. It selects the highest defensible claim available from aggregate evidence and returns:

- strongest safe claim language
- evidence used
- evidence gaps
- blocked stronger claims
- blocked methodology claims
- upgrade actions
- governance boundaries

It does not create ROI or payback language unless `financial_model` evidence is present and the claim is finance-approved. When a methodology snapshot is present, financial language is gated by approval state: `customer_safe` can support customer-facing ROI/payback, `finance_approved` caps financial language at `internal_only`, and draft/rejected/expired/suppressing methodologies block or suppress financial claims. ROI is treated as the final claim layer, not the core product model.

## Demo Journey

Schema version: `AIWVG_DEMO_2026_05`

The Nielsen-style demo fixture shows the product progression from:

1. survey opportunity
2. search/chat telemetry
3. repeatable work patterns
4. skills/artifacts
5. agentic execution
6. governed action
7. outcome-linked evidence
8. finance-approved value claim

The demo is synthetic and intentionally keeps the architecture broader than a Nielsen ROI validator.

## Relationship To Other Contracts

- Glean Signal Readiness Map (`GSR_2026_05`) checks whether source telemetry is available, scrubbed, joinable, and safe.
- Reportability Contract (`FT_REPORTABILITY_2026_05`) decides whether requested claims are allowed, caveated, blocked, or suppressed.
- AI Work Value Graph (`AIWVG_2026_05`) represents how surfaces, work patterns, maturity, evidence, and outcomes connect into a value model.
- AI Work Maturity Model (`AIWMM_2026_05`) defines how evidence types advance work examples through maturity stages.
- Value Hypothesis Registry (`VHR_2026_05`) records CFO-legible hypotheses, indicators, evidence state, safe claim templates, and upgrade actions.
- Outcome Instrumentation Map (`OIM_2026_05`) defines external systems of record, metric requirements, attribution strength, privacy boundaries, and claim-readiness effects.
- Methodology Snapshot Registry (`MSR_2026_05`) records frozen methodology assumptions, exclusions, sensitivity tests, and approval state before value claims are generated.

The value graph should feed customer evidence and executive reporting only after reportability checks are applied.

## Examples

- Customer-safe example: `examples/org-northstar-ai-work-value-graph.json`
- Suppressed example: `examples/org-northstar-suppressed-ai-work-value-graph.json`
- Nielsen-style value journey demo: `demo/nielsen-style-ai-work-value-demo.json`
