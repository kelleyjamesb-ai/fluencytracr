## 1. Approval, inventory, and freeze

- [x] 1.1 Record human approval (decision owner: James Kelley) on this
      proposal before starting implementation, scaffolding, porting, cutover,
      or contract work.
- [x] 1.2 Freeze the spine module list and import graph in
      `packages/confidence-engine/PORTING.md`; record every schema version
      string and hash-chain edge that must survive byte-identically.
- [x] 1.3 Capture golden fixtures: run every spine `.mjs` runner against the
      controlled aggregate fixture and store canonical outputs under
      `packages/confidence-engine/test/golden/`.

## 2. Workspace scaffold

- [x] 2.1 Create `packages/confidence-engine` workspace (tsconfig, build,
      test runner) mirroring `shared/` conventions; add to root workspaces.
- [x] 2.2 Port the shared helpers first (stable stringify, sha256Json, safe
      ref/value patterns, boundary walker) as one internal module with unit
      tests proving identical hashing behavior.

## 3. Module-by-module port with parity gates

- [x] 3.1 Port in dependency order: feature stability review → numeric weight
      decision → versioned weight object → weighted internal model frame →
      model specification → readiness review → execution gate → execution
      runtime → diagnostics sufficiency source → diagnostics evidence packet
      → diagnostics model adequacy review → posterior output review gate →
      promotion decision gate → artifact handoff → internal Bayesian execution
      artifact V1 → hardening orchestrator.
- [x] 3.2 After each module: golden-fixture parity test (ported output ===
      `.mjs` output, including hashes) must pass before porting the next.
- [x] 3.3 Migrate each module's validation test suite into the workspace.

## 4. Cutover and contracts

- [x] 4.1 Convert spine `.mjs` runners to thin wrappers over the workspace
      build; keep CLI usage, npm script names, and the same named public
      module exports byte-for-byte compatible, or update every importer in
      the same cutover.
- [x] 4.2 Add the `ConfidenceModel` contract module (prior, evidence
      admission with reason codes aligned to the confidence-engine series
      read-path decision contract at
      `docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md`
      plus its runner/test, posterior-with-credible-intervals representation)
      — types and Zod schemas only, no execution.
- [x] 4.3 Full-suite verification: workspace tests, wrapped-CLI smoke runs,
      docs contract sweep, V1 governance gates, semantic drift guard,
      Bayesian hardening orchestrator read-only hold check.

## 5. Governance and docs

- [x] 5.1 Add `docs/contracts/confidence-engine-workspace/README.md`; update
      the README capability ledger and `.project/PROGRESS.md` per slice.
- [x] 5.2 Run `openspec validate add-confidence-engine-workspace --strict`.
