# AI Value Agentic Platform Harness

## Purpose

This document defines the Phase 9.5 agentic platform harness for the AI Value
Platform. It adapts FluencyTracr's provider-neutral agent-run architecture to
the AI Value object spine without making agent activity a customer product
signal.

The harness lets specialist agents work on Blueprint, Metrics, Value Scenario,
Evidence Readiness, Claim Boundary, and Executive Readout objects through
structured handoffs, validators, and local ledger references.

## Core Pattern

Agents do not pass raw conversation content to each other. They pass governed
object references.

```text
Specialist Agent
-> Structured AI Value Object
-> Local Validator
-> Agent Handoff Record
-> Local Agent-Run Ledger Reference
-> Next Specialist Agent
```

This keeps the platform forward-leaning without turning agent orchestration into
an ungoverned runtime.

## Relationship To Existing Harness

This concept extends the existing development harness:

- canonical architecture: `docs/concepts/AGENTIC_EXECUTION_HARNESS.md`
- provider-neutral event contract: `docs/contracts/agent-run/README.md`
- local ledger writer: `scripts/agentic_harness_ledger.mjs`
- optional OpenAI adapter: `docs/agent/openai-agents-harness.md`

Phase 9.5 does not create a parallel harness, production runtime, or customer
telemetry stream. It adds an AI Value-specific handoff contract that can sit on
top of the existing `AR_2026_05` metadata layer.

## Specialist Roles

| Role | Responsibility | Primary object |
| --- | --- | --- |
| `BLUEPRINT_AGENT` | Convert process discovery into structured workflow data. | `BLUEPRINT` |
| `METRICS_AGENT` | Recommend governed metrics from workflow family and value route. | `METRICS_MAPPING` |
| `SCENARIO_AGENT` | Draft pre-ROI value scenarios from validated metrics. | `VALUE_SCENARIO` |
| `EVIDENCE_READINESS_AGENT` | Check source, baseline, metric, assumption, scenario, and governance readiness. | `EVIDENCE_READINESS` |
| `CLAIM_BOUNDARY_AGENT` | Convert readiness into safe, caveated, blocked, and required-caveat language. | `CLAIM_BOUNDARY` |
| `EXECUTIVE_READOUT_AGENT` | Compose validated packets for executive review. | `EXECUTIVE_READOUT` |
| `REVIEWER_AGENT` | Check invariants, unsupported claims, and maintainability risk. | review result |
| `EVALUATOR_AGENT` | Run validators and tests before handoff. | verification result |
| `INTEGRATOR_AGENT` | Stage intended files and produce PR evidence. | integration result |

Role names are execution roles, not durable identities or product concepts.

## Handoff Contract

Every agent handoff must declare:

- source and target agent roles;
- object type and object reference;
- workflow family and value route;
- task objective and expected output;
- validator command;
- model-selection policy;
- tool permissions;
- verification routing;
- local ledger references;
- blocked data capture list;
- governance boundaries.

The first seeded handoff is:

```text
SCENARIO_AGENT -> EVIDENCE_READINESS_AGENT
VALUE_SCENARIO -> EVIDENCE_READINESS
```

## Model Selection Policy

Model selection is policy, not a free-form agent choice.

Allowed tiers:

- `FAST`: simple validation and deterministic checks.
- `BALANCED`: ordinary object conversion and local implementation.
- `FRONTIER`: ambiguous governance, architecture, or reviewer work.

Allowed policies:

- `DEFAULT_INHERIT`
- `SMALL_FAST_VALIDATOR`
- `SPECIALIST_UPGRADE`
- `FRONTIER_REVIEW`

Escalation must be justified by ambiguity, governance risk, schema failure, or
adapter failure.

## Tool Permission Policy

Phase 9.5 handoffs are local development infrastructure. Default permissions:

- repository reads are allowed only for declared scopes;
- writes are allowed only for declared output scopes;
- test runners and local validators are allowed;
- network access is false;
- production access is false;
- secrets access is false;
- customer data access is false.

Any future MCP, Waldo, OpenAI Agents SDK, Codex, Cursor, Claude, or Glean
adapter must map back to this handoff shape instead of bypassing it.

## Verification Routing

Every handoff must name at least one validator and one test command. The
handoff cannot feed the local ledger unless the validator passes.

Recommended routing:

- object validator for the source object;
- object validator for the expected output, once implemented;
- focused unit tests for the handoff adapter;
- reviewer role for claim and invariant checks;
- evaluator role for mechanical verification.

## Blocked Capture

The handoff record must not contain or request:

- raw prompts;
- raw responses;
- message text;
- file content;
- diffs or patches;
- emails;
- user IDs;
- person IDs;
- customer telemetry;
- ROI calculations;
- causality claims;
- individual scoring.

These are blocked even when the provider runtime exposes them.

## Boundaries

Phase 9.5 is not:

- production agent runtime;
- autonomous customer action;
- customer telemetry;
- model-performance analytics;
- raw prompt or response storage;
- customer-facing economic output;
- ROI calculation;
- causality engine;
- productivity measurement;
- HR analytics;
- individual scoring.

The harness may help build and validate the AI Value Platform. It must not
become the evidence source for customer value claims.

## Current Artifacts

- Schema: `schemas/ai-value-intelligence/agent-handoff.schema.json`
- Seeded handoff: `docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json`
- Validator: `scripts/validate_ai_value_agent_harness.mjs`
- Tests: `scripts/validate_ai_value_agent_harness.test.mjs`

## Next Use

The next build phase should use this handoff pattern when implementing the
Evidence Readiness Engine:

```text
VALUE_SCENARIO
-> handoff_support_scenario_to_readiness_v1
-> EVIDENCE_READINESS
```
