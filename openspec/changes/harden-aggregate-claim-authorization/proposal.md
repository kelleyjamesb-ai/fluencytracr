# Change: Harden aggregate claim authorization

## Why

Validated imports, accepted evidence review, exact-slice admission,
comparison-privacy release, readiness, and model eligibility are distinct
decisions. The current AI Value spine can still generate and persist claim and
readout artifacts from adjacent gates without one server-owned
claim-authorization decision binding those states together. A schema-valid,
reviewed, or privacy-released artifact must not become an authorized claim by
implication.

## What Changes

- Add one server-owned, fail-closed aggregate claim-authorization policy for
  the bounded MCII descriptive claim ceiling.
- Use only the complete projection returned by exact C.1 two-window readback as
  the privacy-cleared metric movement input. The C.1 receipt remains an opaque,
  non-authorizing pointer.
- Emit only fixed-version descriptive metric movements labeled
  `OBSERVED_NON_ATTRIBUTABLE`; keep causality, attribution, ROI, productivity,
  prediction, model use, and customer-facing output blocked.
- Bind the authoritative admission state, C.1 receipt and returned projection,
  policy state, template version, claim artifact, and readout artifact in an
  immutable content-addressed manifest.
- Demote generic spine and direct object paths so validation, review,
  comparison privacy, readiness, or model eligibility alone cannot persist or
  render an authorized claim.
- Revalidate the manifest, artifacts, and C.1 readback before the legacy
  internal readout can render bounded claim language.

## Impact

- Affected specs: `ai-value-platform`
- Affected code: shared aggregate claim contracts; backend AI Value routes,
  C.1 comparison-privacy readback integration, immutable AI Value persistence,
  and focused backend/shared tests
- No database migration, new endpoint, customer-facing output, model
  execution, new canonical event, new suppression reason, tunable threshold,
  individual field, scoring, ranking, ROI, causality, productivity, or
  prediction
