# AI Value Engine Contract

## Purpose

The AI Value Engine is the local deterministic module that owns the canonical
AI value object spine:

```text
Workflow Blueprint
-> Metrics Library
-> Value Scenario
-> Evidence Readiness
-> Claim Boundary
-> Executive Packet
```

It is the software boundary for turning value-realization artifacts into
validated, governed objects. Validators, generators, the agent handoff harness,
and the local workspace UI should consume the engine instead of re-implementing
pipeline ordering, validation, or claim governance.

## Engine Boundary

The engine owns:

- object validation for each spine stage;
- pipeline ordering between spine stages;
- suppression and missing-evidence propagation;
- blocked-claim detection and enforcement;
- safe/caveated/blocked claim-state decisions;
- deterministic local generation of downstream objects from validated upstream
  objects.

The engine does not own:

- artifact ingestion from Google Drive, decks, sheets, or customer systems;
- production connectors;
- storage;
- APIs or runtime services;
- dashboards or customer-facing surfaces;
- economic output, ROI calculation, causality, productivity measurement,
  individual scoring, ranking, or HR analytics.

## Required Entry Points

Phase 1 should expose per-stage engine entries before adding broader pipeline
helpers:

- `validateBlueprint(input)`
- `validateMetricsLibrary(input)`
- `validateValueScenario(input)`
- `validateEvidenceReadiness(input)`
- `validateClaimBoundary(input)`
- `validateExecutivePacket(input)`

Later phases may add a `runSpine(objects)` helper only if it delegates to the
same per-stage entries and preserves every fail-closed gate.

## Pipeline Ordering Rules

Downstream objects must not be generated from unvalidated upstream objects.

- Metrics mapping requires a valid Workflow Blueprint and Metrics Library.
- Value Scenario generation requires valid Blueprint-derived metric references.
- Evidence Readiness requires valid Blueprint, Metrics, and Scenario objects.
- Claim Boundary generation requires valid Evidence Readiness.
- Executive Packet generation requires a valid Claim Boundary that is not
  blocked or missing.

If any upstream stage is missing, invalid, suppressed, blocked, or ambiguous,
the engine must return an explicit held, suppressed, blocked, or missing result
instead of silently proceeding.

## Governance Rules

The engine must preserve the existing AI Value governance posture:

- fail closed by default;
- surface only when every required gate clears;
- propagate suppression and missing evidence downstream;
- reject raw prompts, raw responses, raw file content, direct identifiers, and
  user/person/employee-level fields;
- block ROI proof, causality claims, productivity measurement, individual
  scoring, team or manager ranking, HR analytics, and customer-facing economic
  output;
- require explicit false values for customer-facing economic output and
  governed harness permission boundaries;
- keep all outputs aggregate-only and scoped to approved workflow slices.

## Determinism

The engine must be deterministic and local:

- no network access;
- no production access;
- no customer telemetry;
- no storage side effects;
- no background runtime service;
- identical input objects produce identical validation decisions and generated
  objects.

## Migration Contract

Migration from standalone scripts must be behavior-preserving.

Each existing validator or generator keeps its CLI shape and tests while its
internal logic moves behind the engine. A stage is considered migrated only
when its existing tests pass against the engine-backed path without weakening
governance assertions.

Recommended migration order:

1. Workflow Blueprint.
2. Metrics Library.
3. Value Scenario.
4. Evidence Readiness.
5. Claim Boundary.
6. Executive Packet.
7. Support Value Evidence Pack.
8. Agent handoff harness.
9. Local workspace UI.

## Acceptance Bar

Any future implementation change that claims to add or migrate the engine must
prove:

- existing stage tests still pass;
- suppression and blocked-claim regressions are covered;
- no new canonical events or suppression reasons are introduced;
- no production connector, runtime service, storage layer, ROI calculation,
  causality claim, productivity measurement, HR analytics, individual scoring,
  ranking surface, or customer-facing economic output is introduced.

## Existing Workspace Adapter Containment

The existing local API and Workspace adapters do not expand the engine boundary.
They may request an in-memory run only with `persist: false`. The Workspace must
not seed missing objects, persist generated stages, select a separately stored
packet, or open a legacy HTML readout as if it were the result of the current
request.

A live Workspace report is eligible only when the exact response:

- reports no persisted objects, no halted stage, the exact
  `READY_FOR_EXECUTIVE_VALIDATION` decision, and
  `customer_facing_economic_output: false`;
- carries valid Blueprint and Metrics stages plus valid generated Scenario,
  Evidence Readiness, Claim Boundary, and Executive Packet stages;
- binds every stage identifier, source reference, workflow identity, value
  route, decision, and claim state through that same response; and
- projects no internal identifiers or source references into rendered output.

The only accurate label for that projection is **internal, request-bound
preview**. It is not source-bound, canonical, customer-facing, or audit-ready.
Illustrative example content must remain visibly illustrative. Loading, error,
held, and live modes must never substitute illustrative or previously loaded
report content.

This section restores fail-closed behavior in existing adapters. It does not
authorize a new runtime service, storage contract, schema, customer-facing
report, or economic output.
