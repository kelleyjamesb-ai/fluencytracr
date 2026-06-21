# Plan: VBD x Token Pilot Runner

Date: 2026-06-16

## Goal

Build a contract-only pilot runner that composes aggregate VBD posture and
Token Efficiency posture across at least two windows so a synthetic 50-person
Customer Success pilot can show movement over time.

## Scope

- Add a pure shared builder/validator.
- Add a validator-backed contract README and synthetic example.
- Add a focused node test and package script.
- Add blueprint crosswalk inventory coverage.

## Non-goals

- No migrations.
- No backend routes.
- No frontend UI.
- No ingestion jobs.
- No persistence.
- No Claim Readiness Snapshot creation.
- No Executive Readout Snapshot creation.
- No reportability readiness output.
- No ROI, productivity, causality, ranking, people-decisioning, or financial
  output.

## Acceptance Checks

- The runner sorts windows chronologically.
- The runner requires at least two windows for movement.
- Held or invalid evidence remains held.
- Downstream feeds remain false.
- The published example validates.
- Existing VBD/token/map guardrails continue to pass.
