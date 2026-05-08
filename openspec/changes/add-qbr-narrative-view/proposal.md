# Change: Add QBR Narrative View

## Why
The Claim Packet Export is structurally complete, but QBR prep needs a human-readable view that separates safe language from internal-only and suppressed claims without requiring reviewers to read JSON.

## What Changes
- Add a shared formatter that turns a `GCP_2026_05` claim packet into QBR narrative sections.
- Render those sections in `/methodology-review` using the already-generated synthetic packet.
- Preserve claim readiness exactly as emitted by the packet; no ROI calculation or readiness upgrade is introduced.

## Impact
- Affected specs: glean-claim-packet-export
- Affected code: shared claim packet formatter, methodology review UI, backend/frontend tests
