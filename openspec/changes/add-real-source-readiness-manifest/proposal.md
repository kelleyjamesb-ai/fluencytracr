# Change: Add Real Source Readiness Manifest

## Why

The Glean Claim Packet Export can explain synthetic QBR value posture, but reviewers need a clear bridge to real source inputs before ingestion is built. The product needs to show what source evidence is ready, unknown, blocked, or approval-dependent without upgrading claims or calculating ROI.

## What Changes

- Add a shared Real Source Readiness Manifest schema and review helper.
- Add a synthetic manifest example mapping claim-packet fixture inputs to real-source readiness requirements.
- Add `/methodology-review` real-source readiness section showing ready sources, blocked or unknown sources, approval needs, affected claim buckets, and next upgrade action.
- Add documentation for the recommended ingestion-path decision sequence: admin-exported aggregate upload first, Glean-hosted MCP/read access later, live event ingestion last.
- Keep this as source readiness and review only: no ingestion, no ROI calculation, no claim readiness upgrades.

## Impact

- Affected specs: real-source-readiness-manifest, glean-claim-packet-export, methodology-review-workspace
- Affected code: shared schemas/helpers, backend tests, frontend constants/UI/tests, docs
