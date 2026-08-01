# GCP Persistence and Anchor Contract (Section 7.5.3)

## Status

```text
GCP_SECTION_7_5_3_PERSISTENCE_ANCHOR_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD
```

This package closes only the documentation-level persistence, checkpoint,
replay-retention, transaction, and independent-anchor mechanisms assigned to
Section 7.5.3. It defines closed record schemas and a silent offline verifier.
It creates no runtime record, approval, evidence, credential, GCP resource,
deployment, qualification, or model-execution authority.

## Exact ownership

Section 7.5.3 owns `S75A-P04`, `S75A-P10`, `S75A-P11`, the Section 7.5
mechanism portion of `S75A-P19`, and exactly these Section 7.4 P07 nodes:

- `initial_section_7_4_replay_retention_acceptance_hash`
- `current_section_7_4_replay_retention_acceptance_hash`
- `final_consumer_replay_retention_acceptance_hash`

The six network, channel, transport, and audit P07 nodes remain excluded. The
immutable Section 7.5A registry stays byte-identical at SHA-256
`2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0`.
Its 20 rows, owners, states, and edges are not rewritten by this package.

## Persistence boundary

The seven closed schemas require:

- a checkpoint with an exact predecessor, monotonically adjacent sequence,
  authenticated current head, serializable single-successor concurrency,
  fork rejection, stale-reader rejection, and whole-state restore detection;
- an immutable GCS object bound to its exact bucket incarnation, generation,
  metageneration, bytes, hash, length, retention guarantee, region, CMEK, bucket
  lock, uniform bucket-level access, public-access prevention, and
  `ifGenerationMatch=0` no-replacement write;
- a previously begun serializable Spanner read-write transaction with an exact
  idempotency key, provider commit timestamp, prohibited transport retry, and
  `UNKNOWN` commit resolution by reread rather than blind retry;
- a nonrollbackable independent anchor with linearizable check-and-use and
  before-commit and after-commit recovery evidence; and
- three phase-distinct replay-retention records for `INITIAL`, `CURRENT`, and
  `FINAL`, each bound to its exact Section 7.4 node and formula, the immutable
  object, an authenticated one-time challenge, its phase-specific required
  retrieved bytes, and the same retention guarantee.

Unknown fields and Boolean/integer aliases are rejected. Every record hash is
recomputed from a domain-separated canonical preimage. Missing mechanisms
hold; privacy, parent, target, schema, hash, lineage, fork, replacement, retry,
or ownership conflicts reject.

## Artifacts

- `persistence-anchor-contract.json` defines exact ownership, mechanics, source
  pins, closed schemas, precedence, and the non-authorizing decision.
- `canonicalization-vectors.json` contains one synthetic valid structural
  bundle. It is not runtime evidence.
- `scripts/verify_gcp_section_7_5_3_persistence_anchor.py` reads explicit
  locators through descriptor-relative no-follow traversal, hashes and parses
  the same bytes, checks exact pins and shapes, recomputes record hashes, and
  emits no output on success.

Run:

```bash
python3 scripts/verify_gcp_section_7_5_3_persistence_anchor.py
```

## Exclusions

Section 7.6 exclusively owns attempt reservation, attempt consumption, crash
state, retry eligibility or tokens, and terminal state or precedence. This
package does not implement those semantics, audit mapping, a runtime SUT, live
GCP access, credentials, provisioning, persistent resources, deployment,
qualification, customer/live data, model execution, or Sections 7.5.4-7.8.
Runtime authority remains held.
