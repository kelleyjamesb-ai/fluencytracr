# Plan: Fix CI/Test Failures for V0 Data Contract

## Goals
- Identify failing tests affected by new schema version and forbidden field enforcement.
- Update test harness and test cases to include required schema header.
- Ensure connector tests account for quarantine behavior.

## Steps
1. Run/inspect backend tests for ingest endpoints and update headers.
2. Update fluencytracr-harness (if it posts to ingest endpoints) to include schema version.
3. Update Python/agent tests if they call ingest endpoints.
4. Re-run affected test suites.
