# Progressive Slicing and Blast Radius Control

This document defines how to prevent big-bang changes from breaking the repo and forcing backtracking.

## When this protocol applies

Apply Progressive Slicing when any are true:

- The work is a major build
- The work includes a UI/UX overhaul or large layout rework
- More than one layer is affected (UI plus API, UI plus state, etc.)
- Coupling is unclear or rising

If uncertain, apply the protocol.

## Core rule

No big-bang rewrites.
Work must be decomposed into vertical slices that each deliver a functional end-to-end outcome.

## Default blast radius caps (per slice)

Each slice must declare and respect:

- Max files touched: 8
- Max modules or components changed: 3
- Max commits per slice: 1 to 2

If any cap is exceeded:
- Stop
- Replan
- Re-seek agreement

## Slice specification (required)

Each slice must include:

1. Slice objective
2. In scope outcomes
3. Out of scope outcomes
4. Stop conditions
5. Expected files and components
6. Verification plan
7. Rollback plan

## Functional and works gate (required per slice)

Before moving to the next slice, provide:

### A. Functional Smoke Checklist
A checklist for the slice's primary flow, including:

- entry point renders
- primary action completes
- expected result is visible or persisted
- no runtime errors observed for that flow

This checklist must be specific to the slice.

### B. Unit Test Gate
- Add or update unit tests relevant to the slice
- Run unit tests
- Report results

If unit tests cannot be run in the runtime:
- state the limitation
- run the minimum alternative verification
- document what was done and what remains unverified

## Targeted tripwire for risky UI changes

If a UI overhaul touches routing, authentication, or data fetching:
- add one targeted happy-path check using Playwright CLI if available
- if Playwright cannot be used, state why and document the alternative smoke verification performed

## Parallelism rules (multi-agent)

Multi-agent does not imply parallel implementation across slices.

Allowed parallel work:
- drafting plans
- defining interfaces
- writing unit tests for an already-fixed interface contract

Not allowed:
- multiple agents implementing different slices at the same time without an approved interface contract and explicit user agreement

## Session Memory System

### When to write a session summary

Write a session summary when any occur:

- context is approaching limits (target 80 percent usage)
- a session ends after a major build, multi-agent execution, or architectural decision
- the user requests a summary
- earlier decisions or plans are at risk of being lost

### Where to save

Save summaries to:
- `/docs/session-summaries/`

Do not overwrite prior summaries.

### File naming

Use:
- `session-summary-YYYY-MM-DD-HHMM.md`

If collision occurs, append a numeric suffix.

### Session summary format (strict)

Use these headings in order:

1. Session Metadata
2. Current Objective
3. Confirmed Decisions
4. Work Completed
5. Open Threads
6. Risks and Watchouts
7. Next Recommended Actions
8. Last Known State

Loose summaries are prohibited.
Persisted summaries are the source of truth for session continuity.
