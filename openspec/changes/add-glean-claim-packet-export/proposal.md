# Change: Add Glean Claim Packet Export

## Why
CS, Value Engineering, Finance, and Governance reviewers need one methodology-governed QBR-prep artifact that brings together methodology review, strongest safe claim language, evidence posture, caveats, suppression, and upgrade actions for QBR preparation.

## What Changes
- Add a shared Claim Packet Export schema and helper for Glean value evidence.
- Package a selected methodology review memo, Strongest Safe Claim result, Value Evidence Pack or AI Work Value Graph posture, evidence gaps, and upgrade actions into one privacy-safe artifact.
- Add a synthetic QBR-style example and backend tests; Nielsen-style inputs are fixtures only.
- Add real-source readiness documentation for replacing synthetic fixtures without implementing ingestion.
- Keep the packet as claim packaging, not an ROI calculator or strongest-possible-claim selector.
- Optionally expose the generated packet in `/methodology-review` as copyable JSON.

## Impact
- Affected specs: glean-claim-packet-export, methodology-review-workspace
- Affected code: shared claim packet schema/helper, backend tests, methodology review UI
