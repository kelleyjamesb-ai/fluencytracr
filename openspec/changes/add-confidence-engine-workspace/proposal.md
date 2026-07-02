# Change: Promote the contribution-alignment Bayesian execution spine into a versioned confidence-engine workspace

## Why

The trust→confidence product direction (Blueprint hypothesis → said/unsaid
evidence → metric movement over time → bounded contribution-alignment
confidence) runs on the contribution-alignment Bayesian chain, which today
lives as 29 runner scripts plus 31 test files in `scripts/` — outside backend
versioning, outside TypeScript type checking, and wired together through
fragile relative imports. The approved change
`add-ai-value-series-confidence-read-path` opened the governed observation
lane for this engine; before real observations ever flow, the engine itself
must live in a typed, workspace-versioned module with the same CI gates as
the rest of the product spine.

The import graph splits into two clusters with different obligations:

1. **Research/prototype decision lineage** (internal prototype runner →
   runner review packet → model prototype design review → internal model
   prototype → review packet → research design gate review → method prototype
   decision → research math finalization review → research math data model
   promotion decision → internal research math data model). These are
   immutable, hash-chained decision records. They stay in `scripts/`
   untouched.
2. **Bayesian execution spine** (feature stability review → internal numeric
   weight decision → versioned weight object → weighted internal model frame
   → Bayesian model specification → internal Bayesian readiness review →
   internal Bayesian execution gate → internal Bayesian execution runtime →
   governed diagnostics sufficiency evidence source → diagnostics evidence
   packet → internal diagnostics model adequacy review → posterior output
   review gate → Bayesian promotion decision gate → promotion-gate-passed
   artifact handoff → Bayesian hardening orchestrator; ~15 modules). This is
   the live engine chain and the promotion target.

## What Changes

- Add a new npm workspace `packages/confidence-engine` (TypeScript + Zod,
  mirroring the `shared/` workspace conventions) hosting the execution-spine
  modules listed above.
- **Byte-compatible outputs are a hard requirement**: every schema version
  string, state token, hash algorithm, field order-independent stable
  stringification, and hash-chain binding is preserved exactly. Golden-fixture
  parity tests run each ported module against its existing `.mjs` counterpart
  and assert identical output objects (including hashes) before any cutover.
- The existing spine `run_ai_value_contribution_alignment_*.mjs` scripts
  become thin CLI wrappers that import the workspace build, so every current
  `npm run run:*` / `test:*` entry point and CI invocation keeps working
  unchanged.
- Add a `ConfidenceModel` contract module (types + Zod schemas only): prior
  (Blueprint-derived; the current standard-normal placeholder is named as a
  placeholder), evidence admission (gate-cleared observations only, with
  machine-readable admission/exclusion reason codes aligned to the
  confidence-engine series read-path decision), and posterior representation
  (credible intervals, never point estimates). Contract only — no new
  execution behavior.
- Migrate the spine's 15+ validation test suites into the workspace test
  runner; root npm script names stay as aliases.
- **No behavior change**: the runtime stays
  `INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW`; no gate
  semantics change; no live inputs; all blocked outputs (model output,
  confidence/probability/score output, finance output, ROI, causality,
  productivity, customer-facing output, routes, UI, exports, persistence,
  live connectors) remain blocked.

## Impact

- Affected specs: `confidence-engine` (new capability spec)
- Affected code:
  - New: `packages/confidence-engine/` (source, tests, build config)
  - Modified: the ~15 spine `scripts/run_ai_value_contribution_alignment_*.mjs`
    files (become wrappers), root `package.json` (workspace entry + script
    aliases), CI workflow test invocation if needed
  - Untouched: the research/prototype decision-record scripts, all
    non-contribution-alignment scripts, backend routes, frontend, schemas of
    emitted artifacts
- Explicitly out of scope: executing the model on real observations, changing
  priors, Series snapshot implementation decision, backend routes/UI, and the
  model methodology itself (separate methodology workstream).
