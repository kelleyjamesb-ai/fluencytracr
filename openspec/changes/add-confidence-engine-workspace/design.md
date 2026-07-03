## Context

The contribution-alignment Bayesian chain is the future core of the
trust→confidence arc, but it accreted as one script per governance slice:
29 runners + 31 test files in `scripts/`, plain JavaScript, hash-chained by
relative imports. The confidence-engine series read-path decision contract
at `docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md`
(approved 2026-07-02) now names this engine as a governed read-path consumer,
which makes its current packaging the weakest link: untyped, un-versioned,
and invisible to backend CI. This change is a packaging/promotion refactor —
the statistical methodology itself is a separate workstream and is explicitly
not redesigned here.

## Goals / Non-Goals

- Goals:
  - Move the execution spine into one typed, workspace-versioned module with
    parity-proven byte-compatible outputs.
  - Preserve every external interface: schema versions, state tokens, hashes,
    CLI entry points, npm script names.
  - Introduce the `ConfidenceModel` contract (types only) so the methodology
    workstream and the UI narrative have a stable shape to build against.
- Non-Goals:
  - Changing model math, priors, gate semantics, or held states.
  - Executing on real observations (blocked until the Series snapshot
    implementation decision and engine promotion gates clear).
  - Porting the research/prototype decision-record scripts (immutable
    history).
  - Backend routes, persistence, UI, exports.

## Decisions

- Decision: new `packages/confidence-engine` workspace rather than
  `backend/src/value_realization/`. Rationale: the backend consumes the
  engine later via a normal dependency without absorbing 16 modules into its
  build; scripts can wrap the same build for CLI use; mirrors the existing
  `shared/` precedent for cross-consumer code.
- Decision: golden-fixture parity tests as the porting gate, module by module
  in dependency order. Rationale: the chain's integrity rests on hash
  binding; any silent stringification or field-order drift would invalidate
  every downstream artifact. Parity tests make drift a test failure instead
  of a governance incident.
- Decision: spine `.mjs` scripts become thin wrappers instead of being
  deleted. Rationale: CI workflows, npm scripts, docs, and PROGRESS history
  reference them; wrappers keep every reference valid at zero duplication
  cost.
- Decision: `ConfidenceModel` contract ships in this change but execution
  does not. Rationale: the methodology review (parallel workstream) needs a
  concrete shape to critique, and the UI narrative needs it to design
  against; shipping types-only keeps the fixture-hold posture intact.
- Alternatives considered:
  - Rewrite the chain from scratch in the backend — rejected: destroys the
    audited hash lineage and re-litigates settled governance.
  - Leave scripts as-is and only add the contract — rejected: leaves the
    product spine untyped and outside CI ownership as real-data work
    approaches.

## Risks / Trade-offs

- Risk: hash drift during port (stringify order, number formatting). →
  Mitigation: shared helpers ported first with hashing-equivalence unit
  tests; per-module golden parity gates; no cutover until parity is total.
- Risk: hidden coupling to script-relative paths (fixture resolution via
  `cwd`). → Mitigation: PORTING.md records every filesystem read; workspace
  modules take explicit `cwd`/fixture options exactly as the scripts do.
- Risk: CI time grows from duplicated suites during transition. →
  Mitigation: root script aliases point at the workspace runner at cutover;
  the `.mjs` suites are retired the same slice parity is proven, not left
  running twice.
- Risk: scope creep toward "while we're here" model changes. → Mitigation:
  byte-compatibility requirement makes any behavior change a failing test;
  methodology changes require their own proposal.

## Migration Plan

Section-by-section per tasks.md: freeze + goldens, scaffold, port in
dependency order behind parity gates, then wrapper cutover in one slice.
Rollback at any point = delete the workspace and restore wrappers to
originals; emitted artifacts never change shape, so nothing downstream needs
migration.

## Open Questions

- Whether `packages/confidence-engine` should also absorb the
  confidence-engine series read-path decision runner (from
  `add-ai-value-series-confidence-read-path`) in the same cutover slice or a
  follow-up — leaning follow-up to keep this change spine-only.
- Node test runner vs Jest inside the workspace (leaning `node --test` to
  match the existing suites and avoid rewrites).
