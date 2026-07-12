## Context

The existing artifact schema is internal and synthetic-only, but it labels
analytic posterior draw batches as chains, labels a post-hoc AR(1) estimate as
the residual structure, and accepts a fit/diagnostic pair without proving that
both came from the emitted dataset.

## Decisions

- Preserve V1 validation for historical fixtures; emit V2 for all new Python
  smoke artifacts.
- Treat V1 as legacy smoke evidence that cannot satisfy V2 or future
  state-space/NUTS proof requirements.
- V2 uses a distinct nonauthorizing state and literal engine-capability pins.
- Structural or binding violations reject before artifact interpretation.
- Safe modeled HOLD conditions continue to emit HOLD artifacts with existing
  diagnostic names; privacy/data-boundary violations emit no artifact.
- Fixture scenario and ground-truth oracle fields are not model inputs. V2
  accepts only JavaScript-safe nonnegative seeds, timezone-aware RFC3339
  generation timestamps, and compiled synthetic control identity/source pairs.
- Unknown and DiD-routed designs reject before longitudinal artifact emission;
  known unsupported negative-control designs emit bridge-valid HOLD artifacts.
- Unexecuted diagnostics use `NOT_RUN` applicability rather than passing
  booleans.
- The existing early-post lag check is not a pre-period placebo. V2 therefore
  marks the placebo check `NOT_RUN` until a real placebo study exists.
- Unkeyed hashes provide consistency and drift detection, not authenticity
  against coordinated payload and hash replacement. A trusted signature or
  envelope is separate future scope.
- V2 composes input and diagnostics-fit roots from emitted evidence hashes and
  private remainder hashes, then composes the final fit-summary root from the
  synthetic-input root, diagnostics-fit root, and emitted fit-output evidence.
  Rewriting evidence beneath an unchanged root therefore rejects without
  claiming protection when every unkeyed root is replaced.

## Risks And Mitigations

- V2 changes internal JSON shape: retain an explicit V1 validator and test both
  versions.
- Tight structural validation may reject malformed test fixtures: add focused
  rejection tests and preserve all valid existing synthetic generators.
- Rehashing can make forged JSON self-consistent: derive semantic consistency
  independently in TypeScript rather than trusting the self-hash. This covers
  threshold-only rewrites, no-fit HOLD relabeling, and redacted V2 privacy
  artifacts; full coordinated operand replacement remains outside unkeyed-hash
  authenticity and requires the separately scoped trusted envelope.
