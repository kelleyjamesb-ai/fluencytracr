# Provenance
- Source: `../../FluencyTracr_V1_Windowing_And_Cohort_Primitives.md` — sections 1-5
- Source: `../../FluencyTracr_V1_Event_Contract.md` — Ambiguity (hard)
- Source: `../ENFORCEMENT_SPEC.md` — Deterministic order of operations (summary)
- Source: `../BEHAVIORAL_SIGNALS_SPEC.md` — Suppression Rules (k=5); Rollup Algorithm

# FluencyTracr V1 — Signal Evaluation Contract (Phase 2)

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

### Suppression Rules (k=5)

1. **Count Threshold**: If `count < 5`, set `suppressed = true` and `count = null`
2. **Implied Group Size**: We assume `count` approximates number of contributors (not always true, but conservative)
3. **Suppression Scope**: Apply to `team` and `role` groups only (not `function` or `org`)
4. **No Partial Suppression**: Either suppress entire row or expose entire row

### Rollup Algorithm

**Input**: Array of `BehavioralSignalAggregate` (team/role level, pre-aggregated by client)

**Output**: Array of `BehavioralSignalAggregate` (includes function and org rollups)

**Steps**:

1. **Validate Input**:
   - All records have valid `org_id`, `group_id`, `group_type`, `bucket_start`, `signal_name`
   - `count >= 0` for all records
   - `function_id` present for `group_type === "team"` or `"role"`

2. **Apply Suppression**:
   ```typescript
   for each record in input:
     if record.group_type in ["team", "role"] AND record.count < 5:
       record.suppressed = true
       record.count = null  // Do not expose small counts
   ```

3. **Build Function Rollups**:
   ```typescript
   // Group by: org_id, function_id, bucket_start, signal_name, tool_class
   functionRollups = {}

   for each record in input:
     if record.function_id exists:
       key = `${record.org_id}:${record.function_id}:${record.bucket_start}:${record.signal_name}:${record.tool_class}`

       if key not in functionRollups:
         functionRollups[key] = {
           org_id: record.org_id,
           group_id: record.function_id,
           group_type: "function",
           bucket_start: record.bucket_start,
           signal_name: record.signal_name,
           count: 0,
           tool_class: record.tool_class,
           suppressed: false
         }

       // Sum ALL records (including suppressed), using original count before nulling
       functionRollups[key].count += originalCount[record]
   ```

4. **Apply Suppression to Function Rollups** (if function is small):
   ```typescript
   for each rollup in functionRollups:
     if rollup.count < 5:
       rollup.suppressed = true
       rollup.count = null
   ```

5. **Build Org Rollups** (sum all functions):
   ```typescript
   orgRollups = {}

   for each rollup in functionRollups:
     key = `${rollup.org_id}:${rollup.bucket_start}:${rollup.signal_name}:${rollup.tool_class}`

     if key not in orgRollups:
       orgRollups[key] = {
         org_id: rollup.org_id,
         group_id: rollup.org_id,  // Org ID serves as group ID
         group_type: "org",
         bucket_start: rollup.bucket_start,
         signal_name: rollup.signal_name,
         count: 0,
         tool_class: rollup.tool_class,
         suppressed: false
       }

     orgRollups[key].count += originalCount[rollup]
   ```

6. **Apply Suppression to Org Rollups** (rare, but possible):
   ```typescript
   for each rollup in orgRollups:
     if rollup.count < 5:
       rollup.suppressed = true
       rollup.count = null
   ```

7. **Return Combined**:
   ```typescript
   return [
     ...input,              // Original team/role records (with suppressions)
     ...functionRollups,    // Function-level rollups
     ...orgRollups          // Org-level rollups
   ]
   ```

## 4) Sparse-data suppression (required)
If required event classes are missing due to incomplete telemetry such that sufficiency checks cannot be performed deterministically, suppress:
- decision = SUPPRESS
- suppress_reason_code = SUPP_SPARSE_DATA

## 5) UTC rule (re-stated)
All window parsing, adjacency, and length computations use UTC only. Local time is display-only.

## Ambiguity precedence (verbatim)
Ambiguity suppression takes precedence over all other inference logic, including positive evidence and persistence checks.

## Deterministic order of operations (summary)
1) Validate schema version header.
2) Validate event payload against Phase 1 contract (required fields, enums, no extra fields).
3) Enforce forbidden fields and privacy constraints (no content, no identifiers).
4) Apply ambiguity rule: ambiguity_flag true => SUPPRESS with ambiguity reason; takes precedence over all other logic.
5) Compute window length and adjacency; enforce window gating.
6) Apply cohort size gate (privacy suppression).
7) Apply confidence gating as defined in Phase 2.
8) Emit a binary decision only: SURFACE or SUPPRESS.
9) If SUPPRESS, emit exactly one suppress_reason_code; if SURFACE, emit no reason code.

## AIVM value-realization metadata (additive)

V1 verdict payloads include two additive fields for Glean Value Realization readability:

| Field | Values | Rule |
| --- | --- | --- |
| `value_type` | `ACCELERATION`, `QUALITY_PREMIUM`, `NET_NEW`, `UNCLASSIFIED` | Defaults to `UNCLASSIFIED`; derived from existing canonical event classes only. |
| `evidence_grade` | `OBJECTIVE`, `CALIBRATED`, `QUALITATIVE` | Defaults to `QUALITATIVE`; `OBJECTIVE` requires cohort size at least 30 and a window at least 90 days. |

Detailed mapping lives in [`FluencyTracr_V1_AIVM_Value_Mapping.md`](FluencyTracr_V1_AIVM_Value_Mapping.md). These fields are descriptive metadata only and do not change suppression, ambiguity precedence, persistence, or fail-closed behavior.

## Reliability Factor metadata (additive)

V1 aggregate verdict payloads include additive Reliability Factor fields for workflow-level reliability readability:

| Field | Values | Rule |
| --- | --- | --- |
| `reliability_factor` | `0.0` to `1.0`, or `null` | Populated only when the verdict/disclosure is surfaced; `null` whenever the fail-closed decision is `SUPPRESS`. |
| `reliability_components` | Object with four component rates, or `null` | Populated only when surfaced; contains `abandonment_rate`, `friction_loop_rate`, `recovery_success_rate`, and `verification_presence_rate`. |

The factor is computed from existing canonical observations only:

`clamp01(0.5 + 0.25 * verification_presence_rate + 0.25 * recovery_success_rate - 0.25 * abandonment_rate - 0.25 * friction_loop_rate)`

Detailed methodology and known limits live in [`reliability-factor.md`](reliability-factor.md). Reliability Factor is output-only and does not influence `SURFACE` / `SUPPRESS`.

**Provenance**
This section is added verbatim from Sentinel-approved V1 acceptance criteria and Astra clarification previously approved in-project. This content was not derived from existing in-repo text and is included to close explicit Phase 2 governance requirements.

#### Decision Model

* The evaluation decision model is binary: `SURFACE | SUPPRESS`
* The default decision is **SUPPRESS**
* In the absence of qualifying evidence under V1 gating rules, the system must remain suppressed

#### Minimum Evidence Requirement

* Signals require **≥ 2 independent behavioral classes** to qualify for surfacing consideration
* This requirement is a **hard gate**
* If fewer than two independent behavioral classes are present, the decision must remain `SUPPRESS`, regardless of other signals
* This requirement does not relax ambiguity, windowing, or persistence constraints

#### Ghost-Use Residual Policy

* Ghost-use is evaluated as a **residual-only pattern**
* Ghost-use evaluation is considered **only if**:

  * AI exposure exists
  * Work activity is observed
  * **No positive evidence is present**
  * Ambiguity does not dominate the evaluation window
  * The pattern persists across required windows
* The presence of **any positive evidence hard-bypasses ghost-use evaluation**
* Ghost-use is not labeled as lack of fluency, resistance, or underperformance
* Ghost-use is framed strictly as an **observability pattern**, not a human judgment
* Positive evidence is defined by existing V1 positive evidence categories referenced elsewhere in governing specifications
