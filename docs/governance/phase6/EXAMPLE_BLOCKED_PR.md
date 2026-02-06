# Phase 6 — Example Blocked PR Diff

This document demonstrates what happens when a developer attempts to modify
a governance-controlled file after governance closure.

---

## Scenario: Developer adds a new event type to the Phase 1 contract

### The diff that would be submitted:

```diff
--- a/backend/src/phase1/contract.ts
+++ b/backend/src/phase1/contract.ts
@@ -5,7 +5,8 @@ export const Phase1EventNameSchema = z.enum([
   "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
   "FT_V1_RECOVERY_OBSERVED",
   "FT_V1_LATENCY_OBSERVED",
-  "FT_V1_ABANDONMENT_OBSERVED"
+  "FT_V1_ABANDONMENT_OBSERVED",
+  "FT_V1_PRODUCTIVITY_OBSERVED"
 ]);
```

### CI Output (BLOCKED):

```
$ python scripts/ci_phase6_governance_lock.py

PHASE 6 GOVERNANCE LOCK FAILED: Governance is CLOSED. The following locked files were modified:
  [EVENT_SCHEMA] backend/src/phase1/contract.ts

No schema, signal, or semantic changes are permitted in Phase 6.
To proceed, this change must go through a new Sentinel-led governance cycle.

Error: Process completed with exit code 1.
```

### Additional CI gates that would also catch this:

```
$ python scripts/ci_phase5_guardrails.py

Phase 5A guardrail failed: unknown FT_V1_* tokens detected (not in Phase 1 contract):
backend/src/phase1/contract.ts: FT_V1_PRODUCTIVITY_OBSERVED

Error: Process completed with exit code 1.
```

---

## Scenario: Developer adds ordering fields to a schema

### The diff:

```diff
--- a/schemas/ft_v1_evaluation_decision.schema.json
+++ b/schemas/ft_v1_evaluation_decision.schema.json
@@ -25,6 +25,9 @@
       "decision": {
         "type": "string",
         "enum": ["SURFACE"]
+      },
+      "order": {
+        "type": "integer"
       }
     }
   }
```

### CI Output (BLOCKED):

```
$ python scripts/ci_phase6_governance_lock.py

PHASE 6 GOVERNANCE LOCK FAILED: Governance is CLOSED. The following locked files were modified:
  [EVENT_SCHEMA] schemas/ft_v1_evaluation_decision.schema.json

Error: Process completed with exit code 1.
```

```
$ python scripts/ci_tg5_forbidden_schema_keys.py

TG5 schema forbidden-key gate failed: forbidden keys detected in schemas:
schemas/ft_v1_evaluation_decision.schema.json: order

Error: Process completed with exit code 1.
```

```
$ python scripts/ci_phase5_guardrails.py

Phase 5A guardrail failed: Governance violation (GEM-TG5-01-NO_CROSS_WINDOW_LINKAGE,
GEM-TG5-02-NO_ORDERING_STREAKS_OR_DURATION): ordered/accumulative or multi-window
keys detected in schema:
schemas/ft_v1_evaluation_decision.schema.json: order

Error: Process completed with exit code 1.
```

**Three independent CI gates block this change.**

---

## Scenario: Developer modifies evaluation logic

### The diff:

```diff
--- a/backend/src/phase1/evaluateDecision.ts
+++ b/backend/src/phase1/evaluateDecision.ts
@@ -71,8 +71,8 @@ export const evaluateDecision = (events: Phase1Event[]): Phase1Decision => {
     };
   }

-  if (window.lengthDays < 60) {
-    return {
+  if (window.lengthDays < 30) {  // Relaxed from 60 to 30 days
+    return {
       decision: "SUPPRESS",
```

### CI Output (BLOCKED):

```
$ python scripts/ci_phase6_governance_lock.py

PHASE 6 GOVERNANCE LOCK FAILED: Governance is CLOSED. The following locked files were modified:
  [EVALUATION_LOGIC] backend/src/phase1/evaluateDecision.ts

No schema, signal, or semantic changes are permitted in Phase 6.
To proceed, this change must go through a new Sentinel-led governance cycle.

Error: Process completed with exit code 1.
```

---

## Summary

| Attempt | Files Touched | CI Gates That Block |
|---------|---------------|---------------------|
| Add new event type | `contract.ts` | governance-lock, phase5-guardrails |
| Add ordering to schema | `*.schema.json` | governance-lock, tg5-forbidden-keys, phase5-guardrails |
| Relax evaluation logic | `evaluateDecision.ts` | governance-lock |
| Add scoring fields | `privacy.ts` | governance-lock, phase5-guardrails |
| Modify signal definitions | `types.ts` | governance-lock |

**No bypass flags. No optional checks. All gates are blocking.**
