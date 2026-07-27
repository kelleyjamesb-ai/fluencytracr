## 1. Contract

- [x] 1.1 Add the exact-slice admission evaluator, types, reason codes, and
      bounded receipt.
- [x] 1.2 Add schema and contract documentation for the admission receipt.
- [x] 1.3 Reconcile the storage JSON schema with optional legacy join keys.

## 2. Materializer and consumers

- [x] 2.1 Route materializer pairing through the authoritative evaluator.
- [x] 2.2 Bind generated exports to the exact admission receipt and avoid stale
      family-only export reuse.
- [x] 2.3 Require a valid admission receipt plus human acceptance before
      downstream evidence attachment.
- [x] 2.4 Keep storage, privacy, suppression, review, readiness, model, and
      claim decisions independently fail-closed.

## 3. Verification

- [x] 3.1 Add fail-first shared and materializer tests for missing, cross-slice,
      shifted-window, missing-pair, duplicate, and conflicting evidence.
- [x] 3.2 Add regression coverage for storage-only legacy records and direct
      unbound export review.
- [x] 3.3 Run focused shared/backend tests, applicable builds, Assurance
      Harness, governance checks, strict OpenSpec validation, and exact
      CODE/BUG/ADVERSARIAL review.
