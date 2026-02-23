# FluencyTracr V1 — Windowing & Cohort Primitives (Phase 2 Inputs)

This document defines the mechanical primitives Phase 2 requires. These are NOT tunable.

## 1) Window parsing and surfacing window length

### 1.1 window_id format (required)
`window_id` is the UTC window boundary string:  
`YYYY-MM-DD__YYYY-MM-DD` (inclusive bounds)

Let:
- `window_start` = first date (UTC)
- `window_end` = second date (UTC)

### 1.2 window_length_days (required)
`window_length_days = (window_end - window_start) + 1` in UTC calendar days.

### 1.3 surfacing eligibility gate (required)
If `window_length_days < 60` then:
- decision = SUPPRESS
- suppress_reason_code = SUPP_WINDOW_LT_60D

Note: windows with 30–59 days may be aggregated and evaluated, but must never surface.

## 2) Adjacent qualifying windows (deterministic)

### 2.1 Adjacent definition (required)
Two windows A and B are adjacent if and only if:
- `A.window_end + 1 day == B.window_start` (UTC), AND
- They refer to the same evaluation cohort key (see section 3).

### 2.2 Adjacent qualifying requirement (required)
Surfacing requires at least **two** adjacent qualifying windows (A,B) ending at the current window.

If fewer than two adjacent qualifying windows exist:
- decision = SUPPRESS
- suppress_reason_code = SUPP_NOT_ADJACENT_WINDOWS

## 3) Cohort sizing inputs (privacy gate)

### 3.1 Cohort key (required)
Evaluation is performed per cohort:
- `org_id`
- `function_id`
- `role_class`

No user identifiers participate in the cohort key.

### 3.2 cohort_size (required input)
The evaluation pipeline MUST be provided a single integer `cohort_size` for each cohort-window evaluation.
This value is computed upstream from source systems and/or privacy-preserving aggregation and MUST NOT include any stored user identifiers in FluencyTracr.

### 3.3 Small-team suppression (required)
If `cohort_size < 5` then:
- decision = SUPPRESS
- suppress_reason_code = SUPP_SMALL_TEAM_LT_5

## 4) Sparse-data suppression (required)
If required event classes are missing due to incomplete telemetry such that sufficiency checks cannot be performed deterministically, suppress:
- decision = SUPPRESS
- suppress_reason_code = SUPP_SPARSE_DATA

## 5) UTC rule (re-stated)
All window parsing, adjacency, and length computations use UTC only. Local time is display-only.

## 6) EvidenceBundle windows and suppression surfaces (required)

### 6.1 EvidenceBundle windows
EvidenceBundle v1 supports:
- `daily`
- `weekly`
- `30d`
- `60d`

### 6.2 Learning trend surfacing rule
Learning trend direction is surfaced only at `60d` unless a stricter policy explicitly allows additional windows.

### 6.3 Executive aggregation rule
Executive mode is irreducibly aggregated and forbids org-structure slicing.
- No team-level slicing
- No manager-level slicing
- No role-level slicing for executive evidence views

### 6.4 Suppression propagation
Suppression state and suppression reasons must propagate end-to-end into EvidenceBundle outputs for all windows where suppression applies.
