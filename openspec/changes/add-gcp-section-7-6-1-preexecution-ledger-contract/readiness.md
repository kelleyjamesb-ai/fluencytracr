# Section 7.6.1 preimplementation readiness packet

## Packet identity

| Field | Value |
| --- | --- |
| Protocol version and SHA-256 | `CANONICAL_RUNTIME_PHASE_READINESS_V1` / `f1e66d7323d5ca383de1bfd22d343928c2332cfe84795d01da60a705fd13a77d` |
| Packet state | `PREIMPLEMENTATION_EVIDENCE_READY` |
| Human queue item / risk | `gcp-canonical-runtime-section-7-6-preexecution-ledger` / `high` |
| Phase / scope kind | `Section 7.6.1` / `DOCS_CONTRACT` |
| Base commit | `66fc4d89f4e2084ec4a4fc07d392d04692d18239` |
| Authority effect | `NONE` |

## 1. Scope and authority

authority_effect: NONE

### Changed-path allowlist

- `.project/WORK_QUEUE.json` and `.project/PROGRESS.md`
- `openspec/changes/add-gcp-section-7-6-1-preexecution-ledger-contract/`
- `tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/`
- `tests/test_gcp_section_7_6_1_preexecution_ledger_readiness.py`
- After readiness GO only: `docs/contracts/canonical-inference-gcp-preexecution-ledger/`,
  `scripts/verify_gcp_section_7_6_1_preexecution_ledger.py`, and
  `tests/test_gcp_section_7_6_1_preexecution_ledger_contract.py`

### Allowed actions

- Pin the exact Section 7.2-7.5 contracts and unique human queue projection.
- Define and test closed plan, allocation, accepted parent-envelope, lineage,
  reservation, write-ahead, attempt-head, expected-request, and opaque-record
  schemas for one docs-only pre-execution transition.
- Derive ordinals and a canonical single-use reservation key offline.

### Non-goals and prohibited actions

- No Section 7.4 acceptance issuance or actual boot/runtime assertion.
- No Section 7.6.2 terminal ledger, crash classification, retry eligibility,
  favorable-retry decision, retry-token issuance, terminal proof, or authority
  mutation; no Sections 7.6.3, 7.7, or 7.8.
- No runtime SUT, attempt/model execution, live GCP, credentials, provisioning,
  persistence creation, migration, deployment, qualification, evidence
  production, customer/live data, or runtime authority.
- No raw identifiers, tokens, credentials, keys, signatures, prompts, results,
  request bodies, model/plan bytes, or restricted authentication references.

### Ownership

| Concern | Owner | Section 7.6.1 use | Missing outcome |
| --- | --- | --- | --- |
| Runtime profile and expected instance | 7.2 | Bind authenticated expected allocation | `HOLD` |
| Producer/key/policy authority | 7.3 | Authenticate producer roles | `HOLD` |
| Opaque acceptance and actual boot truth | 7.4 | Exact consumer interface only | `HOLD` |
| Storage/anchor mechanisms | 7.5 | Consume closed mechanism contract | `HOLD` |
| Parent attempt envelope production | parent | Validate accepted closed shape | `HOLD` |
| Initial admission | parent authority | Authenticate and consume once | `HOLD` |
| Opaque retry authorization | 7.6.2 | Authenticate and consume once only | `HOLD` |
| Reservation semantics and ordinals | 7.6.1 | Derive and model atomically | `HOLD` |
| Terminal/retry/authority decisions | 7.6.2 | Opaque later; never current acceptance | `HOLD` |

Next gate: exact-packet CODE, BUG, and ADVERSARIAL semantic review. A GO has
authority effect `NONE` and authorizes only the bounded docs-contract and
offline-verifier implementation.

## 2. Trust and field ledger

The exhaustive compact ledger is
`tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/packet-rules.json`.
It names every predecessor, queue field, authenticated root, derived record,
closed schema, consumer boundary, attack, and environment cell. The readiness
test mechanically proves that every candidate leaf maps to exactly one ledger
pattern, every ledger attack reference exists, and all 19 mandatory attack
classes are represented.

The independent roots are compile-pinned predecessor bytes, the unique human
queue projection, approved producer/key policies, authenticated parent/token/
head records, a trusted currentness source, and the Section 7.5 independent
anti-rollback mechanism contract. Candidate hashes are recomputed consistency
nodes only. The parent envelope remains parent-produced; Section 7.6.1 defines
only its accepted closed shape. The expected runtime allocation is not actual
boot truth, which remains Section 7.4-owned.

### Atomic transition

One serializable modeled transition SHALL:

1. authenticate plan, allocation, parent envelope, and initial or opaque retry lineage;
2. read the authenticated attempt-family head;
3. derive the next attempt/retry ordinals and reject caller ordinals, including JSON Booleans;
4. prove token and reservation absence;
5. write exactly reservation, token-consumption marker, write-ahead marker,
   new head, and expected-request link;
6. commit and read back the exact bytes; and
7. expose only the opaque pre-execution record to Section 7.4.

Unknown commit permits same-reservation-key readback only. It never allocates a
new ordinal. Duplicate or concurrent reservations admit at most one winner.
Crash outcome and retry eligibility remain unclassified for Section 7.6.2.

### Ledger-to-attack reconciliation

| Boundary | Required attacks | Status |
| --- | --- | --- |
| predecessor bytes and queue authority | A002,A007,A008,A010,A014-A018 | `BOUND` |
| authenticated plan/allocation/parent/lineage/head | A003-A010,A018,A019 | `BOUND` |
| derived ordinals and expected request | A003,A006,A007,A009,A010,A017,A018 | `BOUND` |
| reservation/token/write-ahead/head/transition | A002,A003,A006,A009-A012,A017,A018 | `BOUND` |
| opaque handoff, privacy, and authority | A001,A003,A010-A013,A018,A019 | `BOUND` |

## 3. Environment truth table

The fixture contains the exact 12 rows, commands, controlled prerequisites,
inner dispositions, claims, and `authority_effect: NONE`. Each executable row
copies only explicit sources and the queue into an isolated root, prepares the
ABSENT/PARTIAL/CORRUPT/EXACT state, and compiles the expected result before the
future verifier is loaded.

| Environment | Resource | Command exit | Inner result | Claim |
| --- | --- | --- | --- | --- |
| CLEAN_CI | ABSENT | `0` | `HOLD_SOURCE_SET_ABSENT` | `STRUCTURAL_ONLY` |
| CLEAN_CI | PARTIAL | `0` | `HOLD_SOURCE_SET_PARTIAL` | `STRUCTURAL_ONLY` |
| CLEAN_CI | CORRUPT | `0` | `HOLD_SOURCE_SET_CORRUPT` | `STRUCTURAL_ONLY` |
| CLEAN_CI | EXACT | `0` | `PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION` | `STRUCTURAL_ONLY` |
| ARCHIVE_CLOSEOUT | ABSENT/PARTIAL/CORRUPT | `0` | matching archive HOLD | `ARCHIVE_CLOSEOUT_ONLY` |
| ARCHIVE_CLOSEOUT | EXACT | `0` | `HOLD_ARCHIVE_CLOSEOUT_ONLY` | `ARCHIVE_CLOSEOUT_ONLY` |
| LIVE_RUNTIME | all four states | `NOT_RUN` | `HOLD_LIVE_RUNTIME_NOT_AUTHORIZED` | `DESIGN_ONLY` |

Hermetic controls are an isolated task root, explicit source locators, no
ambient fallback, controlled Python/PATH/PYTHONPATH/locale/timezone/thread
settings, disabled network, and no external or privileged action.

## 4. Requirements and oracle inventory

The fixture contains 16 stable requirements. Each has a named independent
oracle and exact test function. Coverage includes source/queue admission,
closed schemas, producer/authenticator/consumer separation, literal integer
ordinals, reservation preimage, fixed write order, exact readback,
unknown-commit recovery, replay/concurrency, Section 7.4-only consumption,
later-section ownership, expected-not-actual runtime, privacy/authority, the 12
environment cells, and numerical/statistical noninterference.

| Oracle class | Status | Independent evidence | Later blocked |
| --- | --- | --- | --- |
| Schema/canonicalization | `BOUND` | closed field sets and literal vectors | no |
| Hash/dependency DAG | `BOUND` | independent roots plus complete reseal | no |
| Decision totality | `BOUND` | literal READY-or-HOLD oracle | no |
| Source replay | `BOUND` | exact bytes and explicit locators | no |
| Trust/cryptographic | `BOUND` | role-separated authenticated inputs | live proof |
| Environment isolation | `BOUND` | 12 cells | live runtime |
| Privacy/nonauthorization | `BOUND` | recursive injections and authority ceiling | no |
| Exact numerical | `DEFERRED_BLOCKING` | changed-closure noninterference | execution/qualification |
| Statistical methodology | `DEFERRED_BLOCKING` | changed-closure noninterference | execution/qualification |

Math semantics touched: `false`. The change contains no equations, priors,
likelihoods, model/plan bytes, numerical dependencies, seeds, thresholds,
diagnostics, canonical numerical fixtures, or inference outputs.

## 5. Attack-to-oracle matrix

The fixture is normative for literal mutations, roots, descendants, variants,
ledger rows, and test-node templates. Each future-SUT case constructs and
proves its mutation, stateful replay plan, concurrency barrier, or atomic
replacement before loading the absent verifier. The future verifier receives
only prepared candidate/resources/mode/state/interleaving; it never receives
an attack ID or expected result.

A001-A019 cover unknown field, missing field, wrong type, nested extra,
truncation, substitution, splice, forged provenance, stateful replay/reuse,
coordinated full-closure reseal, global-time reseal, stale/future time, mode
confusion, ambient fallback, partial resource, corrupt resource, concurrency/
interleaving, privacy leakage, and authority escalation. Variants expand across
all nested record boundaries, Boolean ordinals, caller status/identity,
misordered/missing write-ahead markers, exact-one-winner concurrency,
predecessor HOLD, Section 7.4-owned acceptance/PASS fields, actual-boot claims,
and every Section 7.6.2-only output.

## 6. Cost, review, and stop controls

| Control | Value |
| --- | --- |
| Estimated / maximum wall time | 60 minutes / 150 minutes |
| Longest preimplementation command | focused pytest under 90 seconds |
| External dollar cost | `0` |
| Privileged access / network mutation | `false` / `false` |
| Checkpoint cadence | 30 minutes |
| Design roles | `CODE`, `BUG`, `ADVERSARIAL` |
| Implementation remediation batches / replacement panels | 1 / 1 |
| Material blocker after replacement | `STOP_REARCHITECT` |
| Nonblocking suggestions | separate human-created queue item |

A material finding permits false READY/authority, omits a required root,
schema, reservation edge, write-ahead transition, attack, or oracle, leaks
restricted data, introduces a causal back-edge or later-section behavior,
admits ambient state, violates an invariant, or makes evidence nonreproducible.
External review identities and verdicts are recorded only in
`.project/PROGRESS.md`; this packet contains no self-approval.
