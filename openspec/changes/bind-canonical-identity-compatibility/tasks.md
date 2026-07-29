## 1. Contract and fail-first evidence

- [x] 1.1 Add a server-owned creation-attestation envelope to new E-capable
      Value Hypothesis versions, add `canonical_slice_binding_v1` as an
      optional Measurement Plan field, and add E lineage envelopes that stamp
      exact hypothesis version/commitment on the plan and exact plan plus
      hypothesis versions/commitments and aggregate grain on the Measurement
      Cell. HMAC-attest the hypothesis and both child edges under distinct
      Slice E domains at append time.
- [x] 1.2 Add optional version-bearing metric-definition refs and a separately
      named `canonical_metric_definition_commitment_v1` to E-capable plan,
      cell, and metrics-library records. Preserve the legacy cell
      `metric_definition_hash` unchanged and recompute the frozen E projection
      from exactly one authoritative metrics-library entry.
- [x] 1.3 Add strict canonical identity core, final binding, selector,
      authorized-state, and fixed hold-compatible contracts in
      `shared/src/aiValueEngine/canonicalIdentityBinding.ts`, the synchronized
      JSON Schema, and contract README.
- [x] 1.4 Add fail-first shared/backend tests for missing versions, latest-only
      lookup, foreign tenant, stale/forked supersession, compatible-field
      hypothesis/plan cross-splicing, metric/version, slice/window, evidence,
      artifact, renderer drift, forged/copied attestation, and no-downgrade
      substitution attacks.
- [x] 1.5 Run `npx openspec validate bind-canonical-identity-compatibility
      --strict`.

## 2. Exact source and compatibility authority

- [x] 2.1 Add exact-version hypothesis, plan, and Measurement Cell loaders plus
      strict semantic hashes and same-org, no-fork, no-gap, non-superseded
      validation in the minimal-persistence repository.
- [x] 2.2 HMAC-attest new E-capable hypothesis versions and stamp source-owned
      parent version/semantic commitments during new E-capable plan and cell
      creation. Bind exact internal child/parent row keys in every attestation.
      Resolve caller fields as equality selectors only and require the loaded
      sources to exact-match those stored attestations and edges.
- [x] 2.3 Exact-compare hypothesis, plan, cell, metric ref/hash, source, unit,
      direction, workflow, canonical tuple, aggregate grain, and both windows.
      Any missing or mismatched edge returns the existing fixed redacted hold.
- [x] 2.4 Prove an invalid supplied selector never falls back to the unbound
      compatibility path.
- [x] 2.5 Add the same deterministic transaction advisory lock for every
      `(org, stable source id)` family to hypothesis, plan, and cell append
      writers and to E sealing before currentness checks; retain exact-row
      locks and post-commit/readout reconstruction.
- [x] 2.6 Add one migration-backed, internal
      `ai_value_canonical_identity_family_head_journal` populated by
      source-table insert triggers for hypothesis, plan, and cell families.
      Enforce exact next-version/predecessor continuity, reject source and
      journal UPDATE/DELETE, revoke direct journal writes from runtime roles,
      and make E sealing/readout exact-match the durable head.

## 3. Append-only binding and readout truth

- [x] 3.1 Add the optional canonical core commitment to D claim, packet,
      manifest, and authorized response contracts before content-derived IDs
      are built. The core includes the fixed renderer
      schema/template/projection version so renderer upgrades receive new D
      and binding IDs.
- [x] 3.2 Add the fourth reserved internal binding object, deterministic
      packet-derived ID, generic-API isolation, and insert-or-exact semantics.
- [x] 3.3 Add a Slice-E-only service-held HMAC creation attestation to the
      binding validation envelope. Bind authenticated organization, binding
      ID, canonical core, and all four complete artifact semantic hashes;
      use separate domains to attest each E hypothesis, plan edge, and cell
      edge; support one active-write key and retained read keys without
      touching C.1 tables, roles, functions, or provisioner.
- [x] 3.4 Extend the serializable D transaction to take source-family advisory
      locks, lock exact identity sources, and atomically store all four
      artifacts plus the creation attestation, then post-commit rebuild the
      complete source, C.1, D, and E chain.
- [x] 3.5 Define a fixed deterministic readout renderer/projection version,
      bind its version into the canonical core before D IDs, hash the exact
      rendered UTF-8 body after D IDs exist, and bind that body hash into the
      final binding without a cycle.
- [x] 3.6 Revalidate the entire chain, creation attestation, renderer version,
      and exact rendered bytes on HTML readout. Set source-bound and
      canonical-identity headers true only for an exact current binding;
      preserve unbound D rendering with both labels false.
- [x] 3.7 Keep raw source selectors, attestation secrets, and row locators out
      of responses,
      rendered HTML, generic APIs, and the public-safe binding payload.

## 4. PostgreSQL and repository verification

- [x] 4.1 Add focused real-PostgreSQL probes for exact success/replay,
      deterministic conflict, generic isolation, stale/concurrent supersession
      in both commit orders, cross-tenant/cross-slice/cross-window
      substitution, compatible-version splicing, mutation races, forged/copied
      hypothesis/source-edge/bundle attestations, delete-reinsert under new row
      keys, authenticated-tail deletion rollback, fork/gap/wrong-predecessor
      inserts, head-journal privilege drift, artifact substitution, renderer
      upgrade/body drift, C.1 revocation, and readout rebuilding.
- [x] 4.2 Run focused shared/backend identity, D authorization, value-chain,
      object API, and readout tests plus shared/backend builds.
- [x] 4.3 Run V1 governance, Assurance Harness, docs sweep, JSON parsing,
      strict OpenSpec, and `git diff --check`.
- [x] 4.4 Freeze an immutable implementation candidate, obtain exact-candidate
      CODE/BUG/ADVERSARIAL review, repair only executable invariant failures,
      and run the full required suite once on the final reviewed SHA.
- [x] 4.5 Repair the confirmed post-merge findings: exact runtime
      server/database binding and runtime-target readiness, health-visible
      Slice E credential/HMAC readiness, plan hypothesis/version equality,
      canonical UTC millisecond bound windows, and write-locked source-journal
      cutover. Re-run focused tests and the PostgreSQL verifier.
- [x] 4.5 Update only the Slice E queue status/last note and canonical
      `.project/PROGRESS.md`; do not deploy or apply the Slice E migration to
      production.
