# FluencyTracr Git/Runtime Stability Remediation

Date: 2026-02-20

## Summary
This report records forensic evidence and remediation actions taken to stabilize Git runtime behavior by moving the repository from an iCloud-backed Desktop path to a stable local development path.

## Key Evidence
- Old path: /Users/jkelley/Desktop/FluencyTracr
- New stable path: /Users/jkelley/Code/FluencyTracr
- Old path showed iCloud File Provider attributes and restrictive ACLs on Desktop/Documents.
- Old repo was in detached HEAD + interactive rebase state.
- Old environment showed concurrent orphan/stuck git and jest processes.
- New stable path responds to status/diff in ~0.01-0.02s with no hangs.

## Preservation
- Pre-migration uncommitted status and patch artifacts were captured in /tmp (empty diffs at time of capture).
- Local commit recovery patch retained at /tmp/a9bf920.patch for manual replay if needed.

## Operational Guidance
- Use /Users/jkelley/Code/FluencyTracr as canonical working clone.
- Avoid active development from iCloud-managed Desktop/Documents paths.
