# GSD-Build (Major Build Planning Protocol)

Use this protocol for major builds. If uncertain, treat as major.

## When GSD-Build is required

GSD-Build is mandatory if any are true:

- Multi-file change spanning components or layers
- New feature or workflow
- Architectural or dependency change
- Cross-agent dependency (backend plus frontend plus tests)
- Any Tier A trigger (db schema, auth, payments, concurrency, external integrations, security, governance)

## Output format (Strict)

Produce a GSD-Build Plan using the following headings, in order.

### 1. Goal
What is being built and why.

### 2. Success Definition
Observable, testable exit criteria.
Write these as verifiable statements.

### 3. Dependencies
Systems, data, people, prerequisites.
Call out any unknowns.

### 4. Execution Strategy
Sequencing logic, milestones, ownership.
If slice protocol applies, define Slice 1, Slice 2, Slice 3.

### 5. Failure Modes
What could break or stall.
Include likely integration risks and regressions.

### 6. Rollback or Recovery
How to limit damage if assumptions fail.
Include how to revert changes and how to restore a known-good state.

### 7. Scope Boundaries
- In scope: explicit list
- Out of scope: explicit list

This section constrains overdevelopment.

### 8. Stop Conditions
Discoveries that force stop and re-seek agreement.
Examples: new coupling, missing requirements, fragile APIs, test signal missing.

### 9. Slice Plan (Mandatory when applicable)
For each slice:
- Slice objective
- Files and components expected
- Verification plan
- Expected blast radius

### 10. Blast Radius Budget
Declare caps per slice.
Default caps are defined in `/docs/slice-and-blast-radius.md`.

## Agreement Gate

GSD-Build must be presented at the Agreement Gate.
It becomes binding once approved.
No execution begins before approval.

## Notes for speed

- Keep the plan short but specific.
- Prefer early working slices over exhaustive upfront detail.
- Non-goals and stop conditions are required because they prevent rework.
