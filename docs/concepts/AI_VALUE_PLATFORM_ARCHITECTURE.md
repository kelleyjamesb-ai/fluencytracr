# AI Value Platform Architecture

## Purpose

This document defines the architecture spine for turning Glean value-realization
artifacts into reusable software.

The source artifacts include Blueprint consultation decks, Day-in-the-Life
workshops, process libraries, metrics libraries, value calculators, executive
validation checklists, and business-case readouts.

The platform should not become a deck generator. It should convert those
artifacts into governed software objects that help a client move from business
objective to validated AI value hypothesis.

## Architecture Spine

The reusable spine is:

```text
Client Context
-> Business Objective
-> Workstream
-> Use Case
-> Workflow Blueprint
-> Metrics And Data Sources
-> Assumptions And Risks
-> Evidence Readiness
-> Governed Value Scenario
-> Executive Validation
-> Action Plan
```

Every deck, spreadsheet, worksheet, and checklist should either create, enrich,
validate, or report on one of these objects.

## Source Artifact Roles

| Source artifact | Software role |
| --- | --- |
| Blueprint consultation template | Guided workspace for client, objective, workstream, use case, prioritization, and validation flow. |
| Day-in-the-Life workshop | Workflow discovery engine for current state, future state, time/friction points, tools, tasks, and business consequences. |
| Process mapping library | Seed library of reusable workflow templates by function, role, industry, and work pattern. |
| Metrics library | Governed catalog of allowed metrics, definitions, source systems, measurement rules, and value routes. |
| ROI/value calculator | Customer-owned scenario engine for cost, capacity, revenue, productivity, TCO, payback, and assumptions. |
| Executive validation checklist | Stage-gate workflow for pre-work, meeting execution, post-work, ownership, and decision path. |
| Business-case readout | Generated artifact composed from validated objects and claim boundaries. |

## Core Objects

### Client

Captures the account context for a value-realization motion.

Required fields:

- `client_id`
- `client_name`
- `industry`
- `company_size`
- `strategic_objectives`
- `executive_sponsor`
- `technical_champion`
- `account_team`

### Business Objective

Connects AI use to a business priority.

Required fields:

- `objective_id`
- `client_id`
- `objective_statement`
- `challenge`
- `initiative`
- `positive_business_outcome`
- `decision_timeline`
- `owner`

### Workstream

Defines the department, function, or operating area being analyzed.

Required fields:

- `workstream_id`
- `client_id`
- `business_objective_id`
- `function`
- `role_families`
- `users_in_scope`
- `systems_in_scope`
- `sponsor`

### Use Case

Represents a candidate AI-enabled workflow or capability.

Required fields:

- `use_case_id`
- `workstream_id`
- `name`
- `description`
- `impacted_functions`
- `impact_rationale`
- `effort_rationale`
- `data_sources`
- `uncertainties`
- `priority_state`

### Workflow Blueprint

Turns Day-in-the-Life discovery into structured workflow data.

Required fields:

- `blueprint_id`
- `use_case_id`
- `current_state_steps`
- `future_state_steps`
- `friction_points`
- `handoffs`
- `tools_used`
- `time_observations`
- `risk_or_quality_observations`
- `expected_work_change`

### Metric Definition

Defines what can be measured and how.

Required fields:

- `metric_id`
- `name`
- `definition`
- `value_route`
- `metric_priority`
- `source_system`
- `measurement_unit`
- `baseline_rule`
- `comparison_rule`
- `owner`
- `allowed_claim_level`

### Data Source

Captures whether a required system or signal is available.

Required fields:

- `source_id`
- `source_name`
- `source_type`
- `coverage_state`
- `data_owner`
- `access_state`
- `quality_notes`
- `privacy_boundary`

### Assumption

Captures customer-owned assumptions used in value scenarios.

Required fields:

- `assumption_id`
- `object_id`
- `assumption_type`
- `state`
- `owner`
- `value`
- `rationale`
- `evidence_or_source`

### Value Scenario

Represents modeled value, not proven ROI.

Required fields:

- `scenario_id`
- `use_case_id`
- `value_route`
- `model_type`
- `inputs`
- `assumptions`
- `scenario_band`
- `output_units`
- `customer_owned`
- `claim_state`

Value scenarios may model cost, capacity, revenue, quality, risk, experience, or
technology consolidation. They must not claim causality or realized ROI without
customer-owned evidence and explicit claim governance.

### Evidence Readiness

Determines whether the platform can safely move from scenario to readout.

Required fields:

- `readiness_id`
- `object_id`
- `ai_activity_state`
- `workflow_state`
- `metric_state`
- `baseline_state`
- `outcome_state`
- `assumption_state`
- `governance_state`
- `decision`

### Claim Boundary

Prevents unsupported value language.

Required fields:

- `claim_boundary_id`
- `object_id`
- `safe_claims`
- `caveated_claims`
- `blocked_claims`
- `required_caveats`
- `review_state`

### Executive Readout

Composes the validated story for executives.

Required fields:

- `readout_id`
- `client_id`
- `workstream_ids`
- `recommended_use_cases`
- `workflow_findings`
- `value_scenarios`
- `evidence_readiness`
- `blocked_claims`
- `decision_path`
- `next_actions`

## System Layers

### 1. Artifact Intake Layer

Purpose: ingest decks, sheets, docs, and manual workshop outputs into structured
objects.

Initial adapters:

- Blueprint deck adapter
- Day-in-the-Life deck adapter
- Process library adapter
- Metrics library adapter
- Value calculator adapter
- Executive validation checklist adapter

V1 should support manual JSON fixtures before live Google Drive ingestion.

### 2. Canonical Object Layer

Purpose: store and validate the objects listed above.

This is the platform spine. UI modules should read and write these objects
instead of directly manipulating deck-like structures.

### 3. Library Layer

Purpose: provide reusable templates.

Libraries:

- Process Library
- Metrics Library
- Value Route Library
- Assumption Library
- Claim Boundary Library
- Readout Template Library

### 4. Workflow Layer

Purpose: guide the user through a value-realization motion.

Primary workflows:

- Visioning
- Use Case Discovery
- Day-in-the-Life Capture
- Prioritization
- Metrics Mapping
- Scenario Modeling
- Evidence Readiness Review
- Executive Validation
- Readout Generation

### 5. Evidence And Governance Layer

Purpose: separate modeled value from defensible evidence.

This layer should:

- validate source coverage;
- preserve baseline and comparison windows;
- check assumption completeness;
- propagate suppression and missing evidence;
- block ROI proof, causality, productivity measurement, ranking, HR analytics,
  and individual scoring claims;
- label outputs as modeled, caveated, supported, missing, or blocked.

### 6. Readout Layer

Purpose: produce stakeholder-ready artifacts from governed objects.

Outputs:

- use-case inventory;
- prioritized roadmap;
- workflow blueprint;
- metrics and data-source plan;
- value scenario summary;
- executive validation packet;
- next-action plan.

## UI Architecture

The UI should be a workbench, not a dashboard.

Recommended modules:

1. Client Setup
2. Workstream Workspace
3. Use Case Inventory
4. Prioritization Board
5. Workflow Blueprint Editor
6. Metrics Mapper
7. Source Readiness Panel
8. Assumption Ledger
9. Governed Value Scenario Builder
10. Claim Boundary Checker
11. Executive Readout Builder

Each module should operate on the canonical object layer.

## Data Flow

```text
Source Artifact
-> Adapter
-> Canonical Object
-> Validator
-> Library Match
-> Evidence Readiness
-> Value Scenario
-> Claim Boundary
-> Executive Readout
```

The value calculator should sit behind the Value Scenario object, not at the
center of the platform. The calculator models value; the evidence layer
determines what can be claimed.

## MVP Slice

The first software slice should be:

```text
Customer Support Blueprint Workbench
```

It should support:

- one client;
- one workstream;
- one support workflow;
- current and future state workflow steps;
- metrics selected from a small metrics library;
- source readiness;
- assumption ledger;
- governed value scenario;
- claim boundary review;
- generated evidence/readout packet.

The existing Phase 7 Blueprint Engine is the first object-level implementation
of this architecture.

## What To Build Next

### Phase 8: Metrics Library Engine

Convert the Metrics Library deck into structured software.

Deliverables:

- [metric-definition.schema.json](../../schemas/ai-value-intelligence/metric-definition.schema.json);
- [customer-support-metrics-library.json](../contracts/ai-value-intelligence/examples/customer-support-metrics-library.json);
- [`scripts/validate_ai_value_metrics.mjs`](../../scripts/validate_ai_value_metrics.mjs);
- [`scripts/validate_ai_value_metrics.test.mjs`](../../scripts/validate_ai_value_metrics.test.mjs).

### Phase 9: Value Scenario Engine

Convert the value calculator into a governed scenario engine.

Deliverables:

- scenario input schema;
- assumption schema;
- scenario output schema;
- calculator adapter for selected use cases;
- explicit claim-state output;
- tests that distinguish modeled value from proven ROI.

### Phase 10: Workbench UI

Build the local UI only after the object spine is stable.

The UI should load and edit canonical objects, run validators, and show readiness
states. It should not implement new value logic directly in React components.

## Guardrails

The platform must not:

- ingest raw prompts, responses, transcripts, ticket text, emails, or file
  content;
- require HRIS or person-level data;
- score employees, managers, teams, or departments;
- rank groups by productivity or AI maturity;
- calculate or claim realized ROI as a product output;
- claim causality;
- bypass suppression or claim-governance checks;
- turn calculator outputs into customer-facing proof without customer-owned
  validation.

## Open Architecture Questions

1. Should the Process Library be a fixed seeded catalog first, or should users
   create custom workflows from scratch?
2. Should metrics be globally governed, customer-specific, or both?
3. Which calculator formulas are safe to port into code, and which should remain
   customer-owned spreadsheet logic?
4. What is the minimum evidence needed to move from a modeled value scenario to a
   caveated executive readout?
5. Should readouts export to Slides/Docs first, or should the first output be a
   local HTML/JSON packet?

## Principle

Documents are source material. Software is the structured system that preserves
their intent, validates their assumptions, governs their claims, and makes the
workflow repeatable.
