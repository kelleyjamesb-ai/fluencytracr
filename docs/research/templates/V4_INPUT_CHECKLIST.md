# V4 Internal Readout Input Checklist

## Purpose

Use this checklist before creating or refreshing an internal AI Scale Readiness
readout.

## Required CSV Inputs

| Input | Present | Notes |
| --- | --- | --- |
| Depth Repertoire window 1 |  |  |
| Depth Repertoire window 2 |  |  |
| Depth Repertoire window 3 |  |  |
| Trust signal availability summary-safe export |  |  |
| AGENT feedback availability |  |  |
| Skill Read Evidence all windows |  |  |

## Allowlist Check

| Check | Pass | Notes |
| --- | --- | --- |
| Every CSV path appears in `dogfood-output/V4_RESEARCH_EXPORTS.md` |  |  |
| No broad glob such as `dogfood-output/**/*.csv` was used |  |  |
| Scratch query files were excluded |  |  |

## Optional Inputs

| Input | Present | Notes |
| --- | --- | --- |
| Velocity window exports |  |  |
| Quality Multiplier inputs |  |  |
| Reliability Factor inputs |  |  |
| Surface taxonomy outputs |  |  |
| AGENT sub-surface outputs |  |  |
| Outcome Evidence |  |  |
| Approved aggregate segmentation |  |  |

## Safety Checks

| Check | Pass | Notes |
| --- | --- | --- |
| CSVs are aggregate-only |  |  |
| No raw skill names |  |  |
| No user IDs, emails, names, or stable hashed user IDs |  |  |
| No prompts, outputs, transcripts, action rows, or raw event rows |  |  |
| No surfaced row has user or cohort count below 5 |  |  |
| Held signals remain caveated |  |  |
| Suppressed evidence is not reconstructed |  |  |
| No customer-facing economic output |  |  |

## Decision

Input package status:

- `READY_FOR_INTERNAL_READOUT`
- `HOLD_FOR_MISSING_INPUTS`
- `HOLD_FOR_PRIVACY_REVIEW`
- `HOLD_FOR_GOVERNANCE_REVIEW`
