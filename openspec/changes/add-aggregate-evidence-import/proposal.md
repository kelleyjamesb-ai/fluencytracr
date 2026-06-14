# Change: Add Aggregate Evidence Import v1

## Why

Real-source readiness is now visible, but reviewers need the first safe bridge from synthetic fixtures to real account/window evidence. Stage 1 should validate prepared aggregate evidence packages without implementing live ingestion, raw event import, or claim readiness upgrades.

## What Changes

- Add an `AEI_2026_05` Aggregate Evidence Import package schema.
- Accept only aggregate, metadata-only source evidence records tied to `RSRM_2026_05` source inputs.
- Add an import review helper that classifies aggregate records as accepted or withheld based on source readiness.
- Add a synthetic import fixture and docs for Source Evidence Import / Aggregate Evidence Upload.
- Add `/methodology-review` import review output so reviewers can see accepted evidence, withheld evidence, top blockers, and next action.
- Keep v1 intentionally non-persistent: no live ingestion, no raw event import, no ROI calculation, no claim readiness upgrades.

## Impact

- Affected specs: aggregate-evidence-import, real-source-readiness-manifest, methodology-review-workspace
- Affected code: shared schemas/helpers, backend tests, frontend constants/UI/tests, docs
