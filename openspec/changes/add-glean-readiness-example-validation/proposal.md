# Change: Add Glean readiness example validation

## Why

The Glean readiness examples now include inventories, readiness maps, and source fixture records. These examples are part of the contract surface and need automatic validation so future edits cannot introduce unsafe or malformed examples.

## What Changes

- Add a Node validator for Glean readiness example JSON files.
- Validate readiness maps, seeded inventories, and source fixture records with shared Zod schemas.
- Add the validator to the docs contract sweep.
- Add a regression test that proves valid examples pass and invalid examples fail.

## Impact

- Affected specs: `glean-signal-readiness`
- Affected code: `scripts/`, backend tests
- Affected CI/docs: `scripts/ci_docs_contract_sweep.sh`
