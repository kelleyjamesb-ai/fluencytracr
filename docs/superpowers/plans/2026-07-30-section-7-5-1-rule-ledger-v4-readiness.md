# Section 7.5.1 Rule-Ledger V4 Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline preimplementation readiness packet that proves
Approach A's rule-ledger, ephemeral-signature, final-directory-capability,
independent-oracle, and anti-answer-key design before any Section 7.5.1
evaluator is implemented.

**Architecture:** A compact packet binds the exact five current-main parent
files and closed rule templates. Small Python support modules generate the
exhaustive static/dynamic ledger, admit a harness-owned directory capability,
and compute an independent oracle; a test-only Node helper creates ephemeral
P-256 batches. Structural and reference tests pass, while every future-SUT case
constructs its mutation and oracle result before stopping only at the
intentional `MISSING_SUT` boundary.

**Tech Stack:** OpenSpec, Markdown, JSON, Python 3 standard library, pytest,
Node.js built-in `crypto`, POSIX directory descriptors, Git.

## Global Constraints

- Authority is limited to the V4 preimplementation readiness packet. Do not
  create `scripts/gcp_section_7_5_parent_contract_authority_closure_v4.py` or
  any other evaluator implementation.
- Do not amend Sections 7.2, 7.3, 7.4, or 7.5A; create a closure projection;
  access GCP or restricted evidence; create credentials, keys, signing
  services, persistent resources, or deployments; execute qualification or a
  model; or begin Sections 7.5.2-7.8.
- Preserve all nine repository invariants, the exact five-project/fourteen-role
  and two-HSM ceilings, current ownership, and every later-section owner.
- Use current-main parent files directly. Do not copy parent JSON into the
  packet and do not copy any stopped V2/V3 readiness fixture.
- Protocol identity is
  `CANONICAL_RUNTIME_PHASE_READINESS_V1` with SHA-256
  `f1e66d7323d5ca383de1bfd22d343928c2332cfe84795d01da60a705fd13a77d`.
- Base parent commit is
  `c2eb0f4c14c7aa7dfaef4d2c61605a45156ce02a`.
- Exact parent members and SHA-256 values are:
  `runtime-object-contract.json` =
  `0babaaef50d2101bcc7096308fe6adef8b56a8ff29f4c9790e2a35735cfa1125`;
  `security-authority-contract.json` =
  `b0ae3db7e424f458e4a304c804aa320f3679fd47b9ced756fb10dc9f20aa3841`;
  `role-capability-matrix.json` =
  `90209f2c60018205a3479ca38981cf8738d17813fa4e6ade4b72407bf4a8ca17`;
  `attestation-receipt-contract.json` =
  `88c58b9a07ab84fffe6a98f6c14561b522a18428e355ee2d8a636fd901d85200`;
  and `constraints-open-obligations-contract.json` =
  `2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0`.
- Candidate, envelope, anchor, descriptor, replay, and result domains are
  closed. No filesystem locator, arbitrary text, user-identifiable value,
  attack ID, fixture ID, expected result, or authority escalation enters an
  evaluator input.
- The trusted SPKI is harness-owned and out of band. Software-generated
  signatures prove structural handling only and cannot close HSM custody,
  P03, P08, P14, or production authority.
- The evaluator-facing result has exactly
  `schema_version`, `decision`, `reason`, `authority_effect`, and
  `claim_grade`; `authority_effect` is always `NONE`.
- Structural/reference output must contain no restricted input. Future
  evaluator invocation must produce zero stdout/stderr and use a dedicated
  result descriptor.
- Every future-SUT test prepares its raw mutation and independent expected
  result before checking for the absent SUT.
- `LIVE_RUNTIME × {ABSENT, PARTIAL, CORRUPT, EXACT}` remains
  `NOT_AUTHORIZED`/`NOT_RUN`.
- Freeze one clean evidence commit and run CODE, BUG, and ADVERSARIAL review
  against that exact commit, tree, packet, protocol, tests, and fixture.
  `READINESS_GO` authorizes no implementation or external action.
- Estimated wall time is 60 minutes, maximum 120 minutes, external dollar cost
  is `0`, privileged access is `false`, network mutation is `false`, and the
  checkpoint cadence is 30 minutes.

## File Structure

Create one new OpenSpec change:

- `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/proposal.md`
  states purpose, changed paths, current blockers, and `authority_effect:
  NONE`.
- `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/design.md`
  translates the approved design into exact packet interfaces and trust
  boundaries.
- `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/readiness.md`
  fills the canonical readiness template without placeholders.
- `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/tasks.md`
  tracks packet construction, verification, review, and explicit deferrals.
- `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/specs/gcp-section-7-5-parent-contract-authority-closure-readiness/spec.md`
  contains the normative requirements and scenarios.

Create one compact normative fixture:

- `tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json`
  contains protocol identity, exact parent manifest, closed schemas, rule
  templates, environment rows, oracle precedence, and attack catalog. It
  contains no copied parent bytes, generated ledger rows, frozen signature, or
  dynamic envelope hash.

Create focused test support:

- `tests/gcp_s751_v4/model.py` owns closed dataclasses, enums, strict canonical
  JSON, packet loading, parent loading, and schema-path enumeration.
- `tests/gcp_s751_v4/ledger.py` owns rule-ledger construction,
  bidirectional reconciliation, and normalized serialization.
- `tests/gcp_s751_v4/crypto.py` owns the subprocess boundary to the test-only
  Node signer/verifier and admitted-anchor fingerprint checks.
- `tests/gcp_s751_v4/bundle.py` owns harness path admission,
  evaluator-owned `"."` reopen, exact member admission, and pre/post identity
  checks.
- `tests/gcp_s751_v4/oracle.py` owns the total reference oracle and
  process-local replay state; it shares no decision helper with a future SUT.
- `tests/gcp_s751_v4/corpus.py` owns closed attack constructors,
  metamorphic variants, environment cells, and `PreparedCase`.
- `tests/helpers/gcp_s751_v4_crypto.mjs` generates one ephemeral P-256 key per
  invocation, signs a bounded preimage batch, verifies a batch, and exposes
  only DER SPKI/signatures plus the public fingerprint.
- `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`
  is the single pytest entrypoint for structural, reference, hermetic,
  metamorphic, and future-SUT red tests.

Do not create a fixture generator CLI, committed generated ledger, copied
parent snapshot, production helper, or SUT adapter.

---

### Task 1: Freeze the V4 packet contract and compact rule source

**Files:**

- Create:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/proposal.md`
- Create:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/design.md`
- Create:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/readiness.md`
- Create:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/tasks.md`
- Create:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/specs/gcp-section-7-5-parent-contract-authority-closure-readiness/spec.md`
- Create:
  `tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json`
- Create: `tests/gcp_s751_v4/__init__.py`
- Create:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`

**Interfaces:**

- Consumes: the approved design at
  `docs/superpowers/specs/2026-07-30-section-7-5-1-rule-ledger-v4-design.md`,
  the canonical readiness protocol/template, the current queue item, and the
  exact parent paths/hashes in Global Constraints.
- Produces: OpenSpec change ID
  `define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4`;
  fixture schema
  `GCP_SECTION_7_5_1_READINESS_RULE_PACKET_V4`; exact changed-path allowlist;
  closed schema/rule/environment/attack source for later tasks.

- [ ] **Step 1: Write the failing packet-structure test**

Add this initial test:

```python
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / (
    "tests/fixtures/"
    "gcp_section_7_5_parent_contract_authority_closure_readiness_v4/"
    "packet-rules.json"
)


def test_v4_packet_is_compact_closed_and_has_no_sut() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    assert packet["schema_version"] == (
        "GCP_SECTION_7_5_1_READINESS_RULE_PACKET_V4"
    )
    assert packet["authority_effect"] == "NONE"
    assert len(packet["parent_manifest"]) == 5
    assert "generated_ledger" not in packet
    assert "parent_snapshots" not in packet
    assert "signature" not in packet
    assert not (
        ROOT / "scripts/"
        "gcp_section_7_5_parent_contract_authority_closure_v4.py"
    ).exists()
```

- [ ] **Step 2: Run the test and confirm the packet is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k v4_packet_is_compact
```

Expected: `FAIL` because `packet-rules.json` does not exist.

- [ ] **Step 3: Write the OpenSpec packet and compact JSON source**

Copy the canonical readiness template into the new change and replace every
template field. The packet must name all 12 environment cells, the nine oracle
classes, the 19 mandatory attack classes plus V4 metamorphic cases, the
current parent ownership table, current open blockers, cost ceilings, and
`authority_effect: NONE`.

Use this compact JSON top-level shape:

```json
{
  "schema_version": "GCP_SECTION_7_5_1_READINESS_RULE_PACKET_V4",
  "protocol": {
    "version": "CANONICAL_RUNTIME_PHASE_READINESS_V1",
    "sha256": "f1e66d7323d5ca383de1bfd22d343928c2332cfe84795d01da60a705fd13a77d"
  },
  "base_commit": "c2eb0f4c14c7aa7dfaef4d2c61605a45156ce02a",
  "queue_item_id": "gcp-canonical-runtime-section-7-5-parent-authority",
  "risk": "high",
  "authority_effect": "NONE",
  "parent_manifest": [],
  "closed_schemas": {},
  "rule_templates": [],
  "oracle_precedence": [],
  "environment_table": [],
  "attack_catalog": []
}
```

Populate `parent_manifest` with the exact five names, repository paths, and
hashes from Global Constraints. Define only exact enum/hash/time/fingerprint/
synthetic-alias/member-name fields in `closed_schemas`. The context schema must
exclude every filesystem locator. The exact signer key ID pattern is
`^P256_SPKI_SHA256:[0-9a-f]{64}$`.

Set OpenSpec tasks for this readiness packet to unchecked until each task's
evidence exists. Keep external review tasks unchecked inside the evidence
commit.

- [ ] **Step 4: Run the packet test and strict OpenSpec validation**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k v4_packet_is_compact
npx openspec validate \
  define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4 \
  --strict
```

Expected: both commands pass.

- [ ] **Step 5: Commit the packet contract**

```bash
git add \
  openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4 \
  tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json \
  tests/gcp_s751_v4/__init__.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): define Section 7.5.1 V4 readiness packet"
```

### Task 2: Make every public shape closed and mechanically enumerable

**Files:**

- Create: `tests/gcp_s751_v4/model.py`
- Modify:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`

**Interfaces:**

- Consumes: `packet-rules.json`.
- Produces:
  `load_packet() -> RulePacket`,
  `load_exact_parents(packet: RulePacket) -> dict[str, bytes]`,
  `strict_load_json(data: bytes) -> object`,
  `canonical_json(value: object) -> bytes`,
  `enumerate_schema_paths(schema: ClosedSchema) -> tuple[SchemaPath, ...]`,
  `EvaluationResult`, `OracleInput`, `ManifestEntry`, `RulePacket`, and the
  exact candidate/context/result enums.

- [ ] **Step 1: Add failing closed-shape and path-enumeration tests**

Add tests that require:

```python
from tests.gcp_s751_v4.model import (
    canonical_json,
    enumerate_all_dynamic_paths,
    load_exact_parents,
    load_packet,
    strict_load_json,
)


def test_closed_schemas_cover_every_dynamic_boundary() -> None:
    packet = load_packet()
    paths = enumerate_all_dynamic_paths(packet)
    assert {path.boundary for path in paths} == {
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
        "replay",
        "bundle_capability",
        "result",
    }
    assert len(paths) == len({(p.boundary, p.pointer) for p in paths})
    assert all("locator" not in p.pointer for p in paths)


def test_strict_json_rejects_duplicate_keys_floats_and_noncanonical_bytes() -> None:
    for raw in (
        b'{"a":1,"a":2}',
        b'{"a":1.0}',
        b'{ "a": 1 }',
    ):
        with pytest.raises(ValueError):
            strict_load_json(raw)
```

Also assert all five parent hashes and canonical bytes match the packet, every
string schema has a closed enum or regex, and result fields are exactly the
five approved names.

- [ ] **Step 2: Run the new tests and confirm the model module is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "closed_schemas or strict_json or exact_parents"
```

Expected: collection fails with
`ModuleNotFoundError: tests.gcp_s751_v4.model`.

- [ ] **Step 3: Implement closed dataclasses and strict loaders**

Define frozen dataclasses with exact fields:

```python
ClosedSchema = Mapping[str, object]


@dataclass(frozen=True)
class SchemaPath:
    boundary: str
    pointer: str
    json_type: str
    cardinality: str
    value_rule: str


@dataclass(frozen=True)
class ManifestEntry:
    member_name: str
    repo_path: str
    sha256: str


@dataclass(frozen=True)
class RulePacket:
    schema_version: str
    protocol_version: str
    protocol_sha256: str
    base_commit: str
    queue_item_id: str
    risk: Literal["high"]
    authority_effect: Literal["NONE"]
    parent_manifest: tuple[ManifestEntry, ...]
    closed_schemas: Mapping[str, ClosedSchema]
    rule_templates: tuple[Mapping[str, object], ...]
    oracle_precedence: tuple[str, ...]
    environment_table: tuple[Mapping[str, object], ...]
    attack_catalog: tuple[Mapping[str, object], ...]


@dataclass(frozen=True)
class OracleInput:
    candidate_bytes: bytes
    signed_context_envelope_bytes: bytes
    verifier_anchor_spki: bytes
    trusted_parent_bundle_fd: int


@dataclass(frozen=True)
class EvaluationResult:
    schema_version: str
    decision: Literal["REJECT", "HOLD"]
    reason: str
    authority_effect: Literal["NONE"]
    claim_grade: Literal[
        "NONE", "STRUCTURAL_ONLY", "ARCHIVE_CLOSEOUT_ONLY", "DESIGN_ONLY"
    ]
```

Use
`json.loads(decoded, object_pairs_hook=reject_duplicates,
parse_float=reject_float, parse_constant=reject_constant)` to reject duplicate
keys, floats, and non-JSON constants. Use UTF-8 exact decoding and a byte
equality check against
`json.dumps(value, sort_keys=True, separators=(",", ":"),
ensure_ascii=True).encode("ascii")`.

Implement recursive schema traversal with RFC 6901 escaping. Closed arrays use
the pointer suffix `/*`; closed maps use their exact governed key paths.

- [ ] **Step 4: Run the focused model tests**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "closed_schemas or strict_json or exact_parents"
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit the closed model**

```bash
git add \
  tests/gcp_s751_v4/model.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): close Section 7.5.1 V4 public shapes"
```

### Task 3: Generate and reconcile the exhaustive rule ledger

**Files:**

- Create: `tests/gcp_s751_v4/ledger.py`
- Modify:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`

**Interfaces:**

- Consumes: `RulePacket`, exact parent JSON, and dynamic `SchemaPath` rows.
- Produces:
  `build_rule_ledger(packet: RulePacket) -> tuple[RuleRow, ...]`,
  `reconcile_rule_ledger(packet: RulePacket, rows: Sequence[RuleRow]) -> None`,
  and `serialize_rule_ledger(rows: Sequence[RuleRow]) -> bytes`.

- [ ] **Step 1: Add failing exhaustive-ledger tests**

Add:

```python
from tests.gcp_s751_v4.ledger import (
    build_rule_ledger,
    reconcile_rule_ledger,
    serialize_rule_ledger,
)


def test_rule_ledger_reconciles_static_and_dynamic_paths() -> None:
    packet = load_packet()
    rows = build_rule_ledger(packet)
    reconcile_rule_ledger(packet, rows)
    keys = [(row.resource, row.pointer) for row in rows]
    assert len(keys) == len(set(keys))
    assert all(row.dependencies for row in rows if not row.is_root)
    assert all(row.anchor_rule for row in rows)
    assert not any(row.instance_value for row in rows if row.dynamic)
```

Add a cold-process test that runs a short Python command twice under
`PYTHONHASHSEED=0`, compares output bytes, and asserts no generated ledger file
appears in the worktree.

- [ ] **Step 2: Run the ledger tests and confirm the module is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k rule_ledger
```

Expected: collection fails with
`ModuleNotFoundError: tests.gcp_s751_v4.ledger`.

- [ ] **Step 3: Implement the rule-ledger builder**

Define:

```python
@dataclass(frozen=True)
class RuleRow:
    rule_id: str
    resource: str
    pointer: str
    owner: str
    trust_class: str
    value_rule: str
    controller: str
    producer: str
    authenticator: str
    consumer: str
    dependencies: tuple[str, ...]
    anchor_rule: str
    decision_use: str
    attack_ids: tuple[str, ...]
    failure: str
    dynamic: bool
    is_root: bool
    instance_value: None = None
```

Walk every object, array, and leaf in each exact parent document. Join each
pointer to one closed rule template. Add dynamic rows from
`enumerate_all_dynamic_paths()`. Generate stable rule IDs from resource and
pointer, not list position.

`reconcile_rule_ledger()` must prove:

- exact equality between parent pointers and static ledger pointers;
- exact equality between closed dynamic paths and dynamic ledger paths;
- no duplicate/unknown/unmatched row;
- every dependency and anchor resolves;
- the trust-dependency graph is acyclic;
- every applicable row has attack coverage; and
- Section 7.3 controller edges are excluded from the trust DAG and sent to the
  oracle's separate least-fixed-point evaluator.

- [ ] **Step 4: Run ledger and cold-process tests**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k rule_ledger
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit the ledger generator**

```bash
git add \
  tests/gcp_s751_v4/ledger.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): generate Section 7.5.1 V4 rule ledger"
```

### Task 4: Prove ephemeral P-256 trust-root handling

**Files:**

- Create: `tests/helpers/gcp_s751_v4_crypto.mjs`
- Create: `tests/gcp_s751_v4/crypto.py`
- Modify:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`

**Interfaces:**

- Consumes: canonical preimage bytes and an absolute Node executable.
- Produces:
  `sign_ephemeral_batch(preimages: Sequence[bytes]) -> SignedBatch`,
  `verify_batch(anchor_spki_der: bytes, vectors: Sequence[VerifyVector]) ->
  tuple[bool, ...]`, and
  `anchor_key_id(anchor_spki_der: bytes) -> str`.

- [ ] **Step 1: Add failing signature and trust-root tests**

Add:

```python
def test_ephemeral_batches_bind_an_out_of_band_anchor() -> None:
    first = sign_ephemeral_batch([b"one", b"two"])
    second = sign_ephemeral_batch([b"one", b"two"])
    assert first.anchor_spki_der != second.anchor_spki_der
    assert first.key_id == anchor_key_id(first.anchor_spki_der)
    assert first.key_id.startswith("P256_SPKI_SHA256:")
    assert verify_batch(first.anchor_spki_der, first.vectors) == (True, True)
    assert verify_batch(first.anchor_spki_der, second.vectors) == (False, False)
```

Add scans proving the helper, fixture, environment, and Python arguments contain
no PEM private key, private scalar, fixed signing seed, signer-capable key, or
third HSM purpose.

- [ ] **Step 2: Run the crypto tests and confirm the helper is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "ephemeral or private_material"
```

Expected: collection fails because `tests.gcp_s751_v4.crypto` is absent.

- [ ] **Step 3: Implement the isolated Node helper and Python boundary**

The Node helper accepts only:

```json
{"operation":"sign","preimages_base64":["b25l","dHdv"]}
```

or:

```json
{
  "operation":"verify",
  "anchor_spki_der_base64":"AQID",
  "vectors":[{"preimage_base64":"b25l","signature_der_base64":"BAUG"}]
}
```

For `sign`, generate `prime256v1`, sign with SHA-256 and DER encoding, export
the public key as SPKI DER, calculate its lowercase SHA-256 fingerprint, emit
only public SPKI/signatures/fingerprint, and exit. Never accept private key
input.

The Python wrapper resolves Node before the hermetic environment, verifies the
path is absolute/regular/executable, invokes the helper with a clean
environment, strictly validates its closed JSON output, and checks
`key_id == "P256_SPKI_SHA256:" + sha256(spki_der).hexdigest()`.

- [ ] **Step 4: Run crypto, cross-anchor, and hermetic tests**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "ephemeral or private_material or hermetic_node"
```

Expected: all selected tests pass. Evidence claim remains
`STRUCTURAL_ONLY`/`HOLD`.

- [ ] **Step 5: Commit the P-256 test harness**

```bash
git add \
  tests/helpers/gcp_s751_v4_crypto.mjs \
  tests/gcp_s751_v4/crypto.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): prove ephemeral Section 7.5.1 trust roots"
```

### Task 5: Prove the final-directory capability boundary

**Files:**

- Create: `tests/gcp_s751_v4/bundle.py`
- Modify:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`

**Interfaces:**

- Consumes: a harness-admitted incoming directory FD and the exact parent
  manifest.
- Produces:
  `open_harness_bundle(path: Path) -> int`,
  `reopen_owned_bundle(incoming_fd: int) -> int`, and
  `admit_parent_bundle(incoming_fd: int, manifest: Sequence[ManifestEntry]) ->
  dict[str, bytes]`.

- [ ] **Step 1: Add failing capability tests**

Add tests for:

```python
def test_bundle_admission_uses_an_independent_open_description(
    exact_bundle: Path,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    owned = reopen_owned_bundle(incoming)
    try:
        incoming_stat = os.fstat(incoming)
        owned_stat = os.fstat(owned)
        assert (incoming_stat.st_dev, incoming_stat.st_ino) == (
            owned_stat.st_dev,
            owned_stat.st_ino,
        )
        os.listdir(incoming)
        assert set(os.listdir(owned)) == set(EXACT_MEMBER_NAMES)
    finally:
        os.close(owned)
        os.close(incoming)
```

Also add exact cases for `ABSENT`, `PARTIAL`, `CORRUPT`, and `EXACT`;
extra member; file/directory/FIFO member; symlink member; renamed/replaced
member; pre/post device/inode change; caller closure; and concurrent
replacement. Harness path admission rejects every symlink component before
the evaluator boundary. Evaluator tests make no ancestor-provenance claim.

- [ ] **Step 2: Run capability tests and confirm the module is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "bundle or capability or member"
```

Expected: collection fails because `tests.gcp_s751_v4.bundle` is absent.

- [ ] **Step 3: Implement harness and evaluator-side descriptor admission**

`open_harness_bundle()` performs a component-wise no-follow open for the
harness-owned path. `reopen_owned_bundle()` performs:

```python
flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
before = os.fstat(incoming_fd)
owned_fd = os.open(".", flags, dir_fd=incoming_fd)
owned = os.fstat(owned_fd)
if (before.st_dev, before.st_ino) != (owned.st_dev, owned.st_ino):
    os.close(owned_fd)
    raise BundleAdmissionError("INVALID_PARENT_RESOURCE_SET")
```

Use only fixed member names with `dir_fd=owned_fd` and
`O_RDONLY | O_NOFOLLOW | O_CLOEXEC`. Require regular files, exact population,
exact hashes, and stable member/directory identities before and after reads.
Close only descriptors created by the function. Catch caller closure or
identity loss and return the fixed rejection family without exception text.

- [ ] **Step 4: Run all capability and concurrency tests**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "bundle or capability or member or concurrent"
```

Expected: all selected tests pass with no stdout/stderr.

- [ ] **Step 5: Commit the capability boundary**

```bash
git add \
  tests/gcp_s751_v4/bundle.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): prove final-directory capability admission"
```

### Task 6: Implement the independent total reference oracle

**Files:**

- Create: `tests/gcp_s751_v4/oracle.py`
- Modify:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`

**Interfaces:**

- Consumes:
  `candidate_bytes`, `signed_context_envelope_bytes`,
  harness-admitted `verifier_anchor_spki`, `trusted_parent_bundle_fd`, and
  process-local `ReplayState`.
- Produces:
  `ReferenceOracle.evaluate(candidate_bytes: bytes,
  signed_context_envelope_bytes: bytes, verifier_anchor_spki: bytes,
  trusted_parent_bundle_fd: int) -> EvaluationResult` using the approved fixed
  precedence, and
  `evaluate_controller_fixed_point(observation: Mapping[str, object]) ->
  ControllerDecision`. `ControllerDecision` is the closed enum
  `Literal["VALID", "HOLD_UNKNOWN_EDGE", "REJECT_INVALID_GRAPH"]`;
  `ReplayState` is a process-local mutable set of admitted nonce bytes owned by
  each `ReferenceOracle` instance.

- [ ] **Step 1: Add failing totality and blocker-preservation tests**

Add tests that require:

```python
def test_reference_oracle_is_total_and_preserves_current_blockers(
    valid_oracle_input: OracleInput,
) -> None:
    result = ReferenceOracle().evaluate(
        candidate_bytes=valid_oracle_input.candidate_bytes,
        signed_context_envelope_bytes=(
            valid_oracle_input.signed_context_envelope_bytes
        ),
        verifier_anchor_spki=valid_oracle_input.verifier_anchor_spki,
        trusted_parent_bundle_fd=valid_oracle_input.trusted_parent_bundle_fd,
    )
    assert result == EvaluationResult(
        schema_version="GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        decision="HOLD",
        reason="CURRENT_PARENT_OBLIGATIONS_OPEN",
        authority_effect="NONE",
        claim_grade="STRUCTURAL_ONLY",
    )
```

Add cases for deterministic multi-fault precedence; clean versus archive
outcome; live not authorized; replay on second use; exact five projects,
fourteen roles, sixteen capabilities, two HSM purposes, default-deny
partitions, owner preservation; known controller cycles retained at the least
fixed point; and unknown controller edges returning `HOLD`.

- [ ] **Step 2: Run oracle tests and confirm the module is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "reference_oracle or controller or current_blockers"
```

Expected: collection fails because `tests.gcp_s751_v4.oracle` is absent.

- [ ] **Step 3: Implement the fixed oracle precedence**

Implement exactly:

1. candidate canonical JSON/closed shape;
2. envelope canonical JSON/closed shape;
3. P-256 signature under the separately admitted anchor;
4. candidate digest, policy, mode, time, key fingerprint, and authority binding;
5. replay plus registry/receipt/approval conjunctions;
6. exact parent-bundle capability and bytes;
7. Section 7.3 role/capability/controller/owner semantics;
8. privacy and nonauthorization;
9. clean-CI versus archive-closeout blocker;
10. exact five-field projection.

Return only closed reason enums. Do not share a decision function, result
builder, parser, schema validator, or replay object with the future SUT.
Controller fixed-point evaluation is a separate graph algorithm and may retain
governed cycles; it is not part of the acyclic ledger trust DAG.

- [ ] **Step 4: Run oracle and exact parent suites**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "reference_oracle or controller or current_blockers"
python3 -m pytest -q \
  tests/test_gcp_runtime_object_contract.py \
  tests/test_gcp_security_authority_contract.py \
  tests/test_gcp_attestation_receipt_contract.py
```

Expected: all selected readiness and parent tests pass.

- [ ] **Step 5: Commit the independent oracle**

```bash
git add \
  tests/gcp_s751_v4/oracle.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): add independent Section 7.5.1 V4 oracle"
```

### Task 7: Build attack, metamorphic, environment, and future-SUT red cases

**Files:**

- Create: `tests/gcp_s751_v4/corpus.py`
- Modify:
  `tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py`
- Modify:
  `tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json`
- Modify:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/readiness.md`
- Modify:
  `openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/tasks.md`

**Interfaces:**

- Consumes: the closed model, ledger, crypto harness, bundle boundary, and
  independent oracle.
- Produces:
  `PreparedCase`,
  `build_attack_cases() -> tuple[PreparedCase, ...]`,
  `build_metamorphic_groups() -> tuple[MetamorphicGroup, ...]`,
  `build_environment_cells() -> tuple[EnvironmentCell, ...]`, and
  `build_fd_discriminator_cases() -> tuple[PreparedCase, PreparedCase]`,
  `evaluate_reference_case(case: PreparedCase) -> EvaluationResult`,
  `evaluate_in_isolated_children_with_dup2(normalized_fd: int,
  cases: Sequence[PreparedCase]) -> tuple[EvaluationResult, ...]`, and
  `invoke_future_sut(case: PreparedCase) -> EvaluationResult`.

- [ ] **Step 1: Add failing attack reconciliation tests**

Add:

```python
def test_attack_catalog_and_rule_ledger_reconcile_exactly() -> None:
    packet = load_packet()
    rows = build_rule_ledger(packet)
    cases = build_attack_cases(packet)
    assert {case.attack_id for case in cases} == {
        attack["attack_id"] for attack in packet.attack_catalog
    }
    covered = {
        rule_id
        for case in cases
        for rule_id in case.covered_rule_ids
    }
    applicable = {row.rule_id for row in rows if row.attack_ids}
    assert covered == applicable
```

Require raw unknown/missing/wrong-type/nested-extra/truncation/substitution;
candidate/signature/payload/parent splice; forged provenance; replay;
complete alternate-anchor reseal while the original admitted anchor remains;
all-time reseal; stale/future time; mode confusion; ambient fallback; each
parent missing/corrupt; extra/nonregular/symlink/replacement/concurrency;
identifier-class privacy probes against every string-capable candidate,
context, anchor, and result boundary; authority; every Section 7.3
role/capability/HSM/owner boundary; and all 12 environment cells.

- [ ] **Step 2: Add failing metamorphic and anti-answer-key tests**

Add:

```python
def test_semantic_equivalence_ignores_dynamic_test_artifacts() -> None:
    for group in build_metamorphic_groups(load_packet()):
        results = [evaluate_reference_case(case)
                   for case in group.equivalent_cases]
        assert len(set(results)) == 1


def test_same_normalized_fd_number_can_produce_opposing_results() -> None:
    exact, corrupt = build_fd_discriminator_cases()
    outcomes = evaluate_in_isolated_children_with_dup2(
        normalized_fd=751,
        cases=(exact, corrupt),
    )
    assert outcomes == (
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "HOLD",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "STRUCTURAL_ONLY",
        ),
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "INVALID_PARENT_RESOURCE_SET",
            "NONE",
            "NONE",
        ),
    )
```

Equivalent semantic cases must vary ephemeral key/signature bytes, synthetic
aliases, and descriptor numbers. Test IDs, attack IDs, fixture indices, and
expected results stay only in `PreparedCase` metadata and never enter
`evaluate_reference_case()` inputs.

- [ ] **Step 3: Run the corpus tests and confirm the module is absent**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "attack_catalog or semantic_equivalence or normalized_fd"
```

Expected: collection fails because `tests.gcp_s751_v4.corpus` is absent.

- [ ] **Step 4: Implement prepared cases and future-SUT ordering**

Define:

```python
@dataclass(frozen=True)
class PreparedCase:
    case_id: str
    attack_id: str
    candidate_bytes: bytes
    envelope_bytes: bytes
    admitted_anchor_spki: bytes
    bundle_factory: Callable[[], ContextManager[int]]
    expected: EvaluationResult
    covered_rule_ids: tuple[str, ...]


def evaluate_reference_case(case: PreparedCase) -> EvaluationResult:
    with case.bundle_factory() as reference_fd:
        return ReferenceOracle().evaluate(
            candidate_bytes=case.candidate_bytes,
            signed_context_envelope_bytes=case.envelope_bytes,
            verifier_anchor_spki=case.admitted_anchor_spki,
            trusted_parent_bundle_fd=reference_fd,
        )


def invoke_future_sut(case: PreparedCase) -> EvaluationResult:
    observed_reference = evaluate_reference_case(case)
    assert case.expected == observed_reference
    if not SUT_PATH.exists():
        raise AssertionError("MISSING_SUT")
    return invoke_closed_child(case)
```

The construction function performs each mutation first, computes the oracle
result second, and only then calls `invoke_future_sut()`. The SUT child, once
it exists under separate authority, receives raw candidate/envelope bytes,
admitted SPKI, inherited final-directory FD, and a dedicated result FD. It
must emit zero stdout/stderr and return exactly one closed five-field result.

Create cell-specific directory capabilities: zero members for `ABSENT`, a
strict subset for `PARTIAL`, all members with one governed corruption for
`CORRUPT`, and the exact bundle for `EXACT`. Do not encode the cell name in a
filesystem path or evaluator input.

- [ ] **Step 5: Run structural/reference corpus tests**

Run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "not future_sut"
```

Expected: all structural, reference, environment-reference, and metamorphic
tests pass.

- [ ] **Step 6: Prove every future-SUT case reaches only `MISSING_SUT`**

First collect:

```bash
python3 -m pytest --collect-only -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
```

Expected: collection succeeds and every packet-named test ID exists.

Then run:

```bash
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k future_sut
```

Expected: command exits nonzero, every selected case fails with the literal
`MISSING_SUT`, and no case fails during mutation, oracle construction,
descriptor admission, signing, or setup.

- [ ] **Step 7: Mark packet-construction tasks truthfully complete and commit**

Check only tasks whose evidence now exists. Leave CODE, BUG, ADVERSARIAL,
aggregate decision, evaluator implementation, parent amendments, closure
projection, GCP, and later-section tasks unchecked.

```bash
git add \
  tests/gcp_s751_v4/corpus.py \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json \
  openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/readiness.md \
  openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/tasks.md
git commit -m "test(gcp): complete Section 7.5.1 V4 readiness corpus"
```

### Task 8: Freeze and review the exact preimplementation evidence

**Files:**

- Modify: `.project/PROGRESS.md`
- Modify: `.project/WORK_QUEUE.json` (`status` and `last_note` only)

**Interfaces:**

- Consumes: the complete V4 packet and tests from Tasks 1-7.
- Produces: one immutable evidence commit/tree; exact packet, fixture, test,
  protocol, and parent identities; three independent exact-SHA verdicts; and
  external aggregate `READINESS_GO` or `READINESS_HOLD`.

- [ ] **Step 1: Run the proportional final readiness checks**

Run once on the final candidate:

```bash
npx openspec validate \
  define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4 \
  --strict
python3 -m pytest -q \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py \
  -k "not future_sut"
python3 -m pytest -q \
  tests/test_gcp_runtime_object_contract.py \
  tests/test_gcp_security_authority_contract.py \
  tests/test_gcp_attestation_receipt_contract.py
python3 scripts/ci_v1_governance_gates.py
bash scripts/ci_docs_contract_sweep.sh
bash scripts/ci_linkcheck_fluency_docs.sh
node scripts/agentic_harness_guard.mjs
npm run validate:agents
git diff --check
```

Expected: every command passes.

- [ ] **Step 2: Run the intentional-red audit and static safety checks**

Run the future-SUT subset and confirm every failure is exactly
`MISSING_SUT`. Then verify:

```bash
test ! -e scripts/gcp_section_7_5_parent_contract_authority_closure_v4.py
! rg -n \
  'BEGIN (EC |RSA )?PRIVATE KEY|private_scalar|locator_components' \
  tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4 \
  openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4
git diff --name-only c2eb0f4c14c7aa7dfaef4d2c61605a45156ce02a...HEAD
```

Expected: no SUT, private material, locator field, or answer-key input; changed
paths are only the plan/design state plus the exact V4 allowlist.

- [ ] **Step 3: Record evidence identities and freeze the commit**

Update `.project/PROGRESS.md` with exact command outcomes and the external
identity fields. Update the active queue note to
`PREIMPLEMENTATION_EVIDENCE_READY`; keep its status `in_progress`.

```bash
git add \
  .project/PROGRESS.md \
  .project/WORK_QUEUE.json \
  openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4 \
  tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4 \
  tests/gcp_s751_v4 \
  tests/helpers/gcp_s751_v4_crypto.mjs \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
git commit -m "test(gcp): freeze Section 7.5.1 V4 readiness evidence"
```

Record, after committing:

```bash
git rev-parse HEAD
git rev-parse HEAD^{tree}
git rev-parse HEAD:openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/readiness.md
git rev-parse HEAD:tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json
git rev-parse HEAD:tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
shasum -a 256 \
  openspec/changes/define-gcp-section-7-5-parent-contract-authority-closure-readiness-v4/readiness.md \
  tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json \
  tests/test_gcp_section_7_5_parent_contract_authority_closure_readiness_v4.py
```

If recording the post-commit identities requires a state-only follow-up
commit, review must bind that final exact commit and tree.

- [ ] **Step 4: Run independent exact-SHA review**

Dispatch CODE, BUG, and ADVERSARIAL reviews in parallel against the same
immutable SHA. Each reviewer must report:

- reviewed commit/tree and packet SHA-256;
- commands or attack hypotheses attempted;
- observed results;
- unverified assumptions; and
- `READINESS_GO` or `READINESS_HOLD`.

A blocking hold must demonstrate an executable trust, authorization, privacy,
oracle, mutation-ordering, environment, reproducibility, or nine-invariant
failure. Suggestions without such a failure are follow-up work.

- [ ] **Step 5: Record the aggregate decision without implementing the SUT**

If all three reviews return `READINESS_GO`, record aggregate
`READINESS_GO` with `authority_effect: NONE` in `.project/PROGRESS.md` and the
existing queue note. Do not mark the queue item complete and do not begin the
evaluator until James separately authorizes that step.

If any review returns a material `READINESS_HOLD`, record the exact blocker,
leave the queue active/HOLD, and return to the approved design boundary. Do
not repair parent contracts or broaden Section 7.5.1 merely to make the packet
green.

Commit only this external state record:

```bash
git add .project/PROGRESS.md .project/WORK_QUEUE.json
git commit -m "docs(gcp): record Section 7.5.1 V4 readiness decision"
```

No push, PR, merge, deployment, GCP action, parent amendment, closure
projection, evaluator implementation, or later-section work occurs in this
plan.
