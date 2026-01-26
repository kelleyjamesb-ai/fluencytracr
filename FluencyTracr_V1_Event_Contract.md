# FluencyTracr V1 — Event Contract (Input)

**Status:** Approved (Project Sentinel + Astra)  
**Owner:** Forge (Backend)  
**Schema Version:** FT_V1_2026_01  

## 1. Purpose
Defines the canonical, append-only **input event contract** for FluencyTracr V1. Downstream ingestion and evaluation MUST conform exactly.

## 2. Global prohibitions (hard)
Events MUST NOT contain:
- Any user identifiers (direct or indirect)
- Any raw/derived content (prompts, outputs, docs, embeddings)
- Any scores/ranks/probabilities or quality judgments
- Any free-text narrative fields

## 3. Time semantics
- `event_timestamp` MUST be UTC (ISO 8601). UTC is the only computation basis.
- Local-time rendering is presentation-only and MUST NOT influence gating.

## 4. Ambiguity (hard)
- `ambiguity_flag=true` indicates the system cannot deterministically observe without violating policy.
- `ambiguity_flag=true` requires exactly one `ambiguity_reason_code`.
- `ambiguity_flag=false` forbids `ambiguity_reason_code`.

**Precedence (verbatim):**  
Ambiguity suppression takes precedence over all other inference logic, including positive evidence and persistence checks.

## 5. Shared required fields (all events)
- `schema_version` (const: FT_V1_2026_01)
- `event_name` (const per schema)
- `org_id`
- `function_id`
- `role_class`
- `tool_surface` (enum: ASSISTANT | AGENT | SEARCH)
- `event_timestamp` (UTC)
- `window_id` (pattern: YYYY-MM-DD__YYYY-MM-DD, UTC window bounds)
- `ambiguity_flag` (boolean)
- `ambiguity_reason_code` (enum; required iff ambiguity_flag=true)

## 6. Canonical event names (V1)
- FT_V1_DISPOSITION_OBSERVED
- FT_V1_ITERATION_DEPTH_OBSERVED
- FT_V1_VERIFICATION_PRESENCE_OBSERVED
- FT_V1_RECOVERY_OBSERVED
- FT_V1_LATENCY_OBSERVED
- FT_V1_ABANDONMENT_OBSERVED

## 7. Closed enums
### 7.1 ambiguity_reason_code
- AMB_SCHEMA_MISSING_REQUIRED
- AMB_SCHEMA_INVALID_TYPE
- AMB_SCHEMA_OUT_OF_RANGE
- AMB_TEMPORAL_WINDOW_UNKNOWN
- AMB_TEMPORAL_EVENT_OUTSIDE_WINDOW
- AMB_EVIDENCE_CONFLICT
- AMB_EVIDENCE_INSUFFICIENT
- AMB_SOURCE_UNTRUSTED
- AMB_TOOL_SURFACE_UNKNOWN
