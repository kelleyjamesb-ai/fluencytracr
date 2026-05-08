# Change: Add Nielsen Source Evidence Trial

## Why

Stage 1 validates aggregate source evidence packages, but it does not show what happens when a real customer value narrative is mapped into FluencyTracr. The Nielsen deck is useful as a stress-test artifact, but it must not be treated as source-system telemetry.

## What Changes

- Add `NSETR_2026_05` Nielsen Source Evidence Trial package schema.
- Add a review helper that maps sanitized document-derived claim candidates into Aggregate Evidence Import review.
- Add a committed Nielsen-style sample based on the local Nielsen value deck and Time-Saves methodology packet.
- Classify deck-derived financial, survey, external outcome, and product telemetry gaps without upgrading claim readiness.

## Impact

- Affected specs: `nielsen-source-evidence-trial`
- Affected code: `shared/src/nielsenSourceEvidenceTrialSchemas.ts`, `backend/tests/nielsen_source_evidence_trial.test.ts`, `docs/contracts/nielsen-source-evidence-trial/`

