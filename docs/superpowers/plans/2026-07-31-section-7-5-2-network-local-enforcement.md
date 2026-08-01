# Section 7.5.2 Network and Local Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close only the Section 7.5.2 documentation contract for whole-interval
network, channel, transport, and local ephemeral enforcement while preserving
the immutable Section 7.5A registry and keeping runtime authority held.

**Architecture:** Add one contract package, one offline verifier, one focused
test module, and one OpenSpec change. The contract projects exactly the five
Section 7.4 acceptance nodes owned by 7.5.2 plus P09 and P18; it does not copy or
amend the 20-row Section 7.5A registry. Every structurally valid record remains
non-authorizing because live approval and evidence registries stay empty.

**Tech Stack:** Markdown, canonical JSON, Python 3 offline verification,
pytest, OpenSpec, repository governance and documentation checks.

## Global Constraints

- Start only after explicit human activation of queue item
  `gcp-canonical-runtime-section-7-5-network-local` from current `main`.
- Preserve all nine invariants in `AGENTS.md`.
- Do not modify the canonical event set, suppression reasons, thresholds, or
  product/runtime behavior.
- Keep
  `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/constraints-open-obligations-contract.json`
  byte-identical at SHA-256
  `2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0`.
- Consume the merged Section 7.5.1 projection at SHA-256
  `275dbfabae763830047950ccddf5557fc2d6b5f4fb80cda62e45971be9051414`.
- Consume parent contracts at exact SHA-256 values:
  - Section 7.2:
    `450946eca205f190482b644ef02ad79547f44e1a0eb4689f1807123382516587`;
  - Section 7.3:
    `96ae43764b78189735c65e0b257971faa31a9f98a31a2c58fb00ef75f805716a`;
  - Section 7.4:
    `a9cddaf665f72d8cbb415fa15c6004663e7a33125fc589ced55a186e27e7cbf2`.
- Section 7.5.2 owns exactly `S75A-P09`, `S75A-P18`, and these P07 nodes:
  `trust_distribution_acceptance_hash`,
  `channel_enforcement_acceptance_hash`,
  `pre_quote_transport_acceptance_hash`,
  `terminal_quote_transport_acceptance_hash`, and
  `kms_sign_transport_acceptance_hash`.
- Exclude P07 audit mapping, owned by Section 7.5.4, and all three P07 replay
  retention nodes, owned by Section 7.5.3.
- Do not add persistence mechanics, attempt-ledger semantics, a runtime SUT,
  live GCP access, credentials, provisioning, deployment, qualification, model
  execution, customer/live data, or Sections 7.5.3-7.8 work.
- Missing, stale, partial, unauthenticated, ambiguous, or conflicting evidence
  must produce `HOLD` or rejection. No override exists.
- One implementation commit receives exact-tree CODE, BUG, and ADVERSARIAL
  review. Only executable authorization, privacy, invariant, or contract-
  closure failures block; suggestions become follow-up work.

---

### Task 1: Activate and freeze the exact slice

**Files:**
- Modify after explicit human activation: `.project/WORK_QUEUE.json`
- Modify after explicit human activation: `.project/PROGRESS.md`
- Create:
  `openspec/changes/add-gcp-section-7-5-2-network-local-enforcement/proposal.md`
- Create:
  `openspec/changes/add-gcp-section-7-5-2-network-local-enforcement/tasks.md`

**Interfaces:**
- Consumes: merged `main` at or after
  `8949107da5e1c4769f129b15237a8ad1fe1e23f1`.
- Produces: one active queue item with every later 7.5-7.8 item still pending.

- [ ] **Step 1: Verify predecessor and immutable inputs**

Run:

```bash
git fetch origin main --prune
git merge-base --is-ancestor \
  7efdf82a9aaefb7e78fcc253f2705ea2b8061a67 origin/main
shasum -a 256 \
  docs/contracts/canonical-inference-gcp-transport-persistence-constraints/constraints-open-obligations-contract.json \
  docs/contracts/canonical-inference-gcp-transport-persistence-constraints/section-7-5-1-parent-interface-closure-projection.json \
  docs/contracts/canonical-inference-gcp-runtime-object/runtime-object-contract.json \
  docs/contracts/canonical-inference-gcp-security-authority/security-authority-contract.json \
  docs/contracts/canonical-inference-gcp-attestation-receipt/attestation-receipt-contract.json
```

Expected: Section 7.5.1 is an ancestor of current main and every digest equals
the value in Global Constraints.

- [ ] **Step 2: Activate only Section 7.5.2**

Set `gcp-canonical-runtime-section-7-5-network-local.status` to `in_progress`.
Record the current base SHA and the exact included/excluded ownership above.
Do not change another queue item.

- [ ] **Step 3: Write the OpenSpec proposal and checklist**

The proposal must state the only terminal structural decision:

```text
GCP_SECTION_7_5_2_NETWORK_LOCAL_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD
```

It must state that a provider conflict, parent mismatch, privacy violation, or
ownership expansion prevents closure.

- [ ] **Step 4: Validate activation mechanically**

Run:

```bash
jq empty .project/WORK_QUEUE.json
npx openspec validate add-gcp-section-7-5-2-network-local-enforcement --strict
git diff --check
```

Expected: all commands exit `0`.

### Task 2: Add fail-first ownership and shape tests

**Files:**
- Create: `tests/test_gcp_section_7_5_2_network_local_enforcement_contract.py`

**Interfaces:**
- Consumes: the immutable registry and exact Section 7.2-7.5.1 inputs.
- Produces: executable assertions for the only contract shape this slice may
  implement.

- [ ] **Step 1: Add exact ownership constants**

```python
OWNED_PREREQUISITES = {"S75A-P09", "S75A-P18"}
OWNED_P07_NODES = {
    "trust_distribution_acceptance_hash",
    "channel_enforcement_acceptance_hash",
    "pre_quote_transport_acceptance_hash",
    "terminal_quote_transport_acceptance_hash",
    "kms_sign_transport_acceptance_hash",
}
EXCLUDED_P07_NODES = {
    "audit_mapping_acceptance_hash",
    "initial_section_7_4_replay_retention_acceptance_hash",
    "current_section_7_4_replay_retention_acceptance_hash",
    "final_consumer_replay_retention_acceptance_hash",
}
```

- [ ] **Step 2: Add the absent-contract test**

Assert that the future contract path is required and that the immutable
registry digest remains exactly the value in Global Constraints.

- [ ] **Step 3: Run the test and observe the intended failure**

Run:

```bash
.venv/bin/python -m pytest \
  tests/test_gcp_section_7_5_2_network_local_enforcement_contract.py -q
```

Expected: fail because
`docs/contracts/canonical-inference-gcp-network-local-enforcement/network-local-enforcement-contract.json`
does not exist. No other assertion may fail first.

### Task 3: Define the smallest authoritative contract package

**Files:**
- Create:
  `docs/contracts/canonical-inference-gcp-network-local-enforcement/README.md`
- Create:
  `docs/contracts/canonical-inference-gcp-network-local-enforcement/network-local-enforcement-contract.json`
- Create:
  `docs/contracts/canonical-inference-gcp-network-local-enforcement/canonicalization-vectors.json`

**Interfaces:**
- Consumes: exact target identity and approval interfaces from Sections
  7.2-7.5.1.
- Produces: closed schemas and hash formulas for five P07 nodes plus P09/P18.

- [ ] **Step 1: Define six closed record schemas**

Use these exact schema names:

```text
GCP_SECTION_7_5_2_TRUST_DISTRIBUTION_ENFORCEMENT_RECORD_V1
GCP_SECTION_7_5_2_CHANNEL_INTERVAL_ENFORCEMENT_RECORD_V1
GCP_SECTION_7_5_2_QUOTE_TRANSPORT_ENFORCEMENT_RECORD_V1
GCP_SECTION_7_5_2_KMS_SIGN_TRANSPORT_ENFORCEMENT_RECORD_V1
GCP_SECTION_7_5_2_NETWORK_CONTROL_OBSERVATION_RECORD_V1
GCP_SECTION_7_5_2_LOCAL_EPHEMERAL_ENFORCEMENT_RECORD_V1
```

Every schema must reject unknown nested fields and bind the exact full-Section-
7.5 target, observation interval, authentication verification hash, freshness/
anti-replay hash, and approved Section 7.5 contract hash.

- [ ] **Step 2: Encode whole-interval network requirements**

Require private ingress and egress for the full observation interval, UDS-only
local delivery, no relay process, complete caller-by-method authentication,
exact TLS target and certificate binding, and complete DNS, firewall, route,
and perimeter observations. A missing interval edge, method, route, or control
must map to `HOLD`.

- [ ] **Step 3: Encode whole-interval local requirements**

Require authenticated observations proving approved disk policy, tmpfs-only
ephemeral material, swap disabled, prohibited logging disabled, and no
unapproved local persistence for the full interval. A point-in-time setting is
not sufficient evidence of interval coverage.

- [ ] **Step 4: Bind the Section 7.4 clock exactly once**

The trust record and token-freshness interface must use the same exact
`section_7_5_trust_record_verified_at` value and trusted UTC clock policy hash.
No conversion, rounding, alternate timezone, or caller-provided replacement is
allowed.

- [ ] **Step 5: Define fail-closed precedence**

Use this order:

```text
privacy/boundary reject
parent/target/source conflict reject
schema/canonicalization reject
authentication/freshness reject
interval completeness HOLD
network/channel/local mechanism HOLD
approval/evidence absent HOLD
contract closed with runtime authority held
```

- [ ] **Step 6: Add canonicalization vectors**

Include one valid vector and mutations for an unknown field, wrong type,
noncanonical time, changed target, changed parent hash, unequal trust time,
excluded P07 node, and authority-bearing field.

### Task 4: Implement the offline verifier and adversarial corpus

**Files:**
- Create: `scripts/verify_gcp_section_7_5_2_network_local_enforcement.py`
- Modify: `tests/test_gcp_section_7_5_2_network_local_enforcement_contract.py`

**Interfaces:**
- Consumes: contract bytes, vectors, and exact immutable parent inputs.
- Produces: exit `0` with zero stdout/stderr only for the canonical closed
  docs-only package.

- [ ] **Step 1: Add safe artifact loading**

Use descriptor-relative traversal with `O_NOFOLLOW`, `O_NONBLOCK`, regular-file
checks, one descriptor read, and parsing from the same bytes that were hashed.
Reject a symlinked component, FIFO, socket, device, directory, concurrent
replacement, or second-read substitution.

- [ ] **Step 2: Add exact schema and hash verification**

Recompute canonical JSON, every domain-separated hash, parent binding, target
binding, vector result, decision, and owned-node projection. Reject an extra or
missing field before evaluating a positive decision.

- [ ] **Step 3: Add adversarial cases**

Cover at least these mutations:

```text
unknown or missing nested field
Boolean/integer alias
duplicate method or observation tuple
public ingress or egress interval
UDS bypass or relay process
incomplete caller-by-method map
TLS target/certificate mismatch
DNS, firewall, route, or perimeter gap
disk policy gap
tmpfs interval gap
swap enabled
prohibited logging enabled
trust/token time mismatch
stale or future observation
P07 retention or audit ownership injection
Section 7.5A target substitution
identifier-like public field
runtime-authority or live-evidence claim
```

- [ ] **Step 4: Run the focused suite**

Run:

```bash
.venv/bin/python -m pytest \
  tests/test_gcp_section_7_5_2_network_local_enforcement_contract.py -q
python3 scripts/verify_gcp_section_7_5_2_network_local_enforcement.py
```

Expected: all tests pass and the verifier emits no output.

### Task 5: Synchronize OpenSpec and durable documentation

**Files:**
- Create:
  `openspec/changes/add-gcp-section-7-5-2-network-local-enforcement/design.md`
- Create:
  `openspec/changes/add-gcp-section-7-5-2-network-local-enforcement/specs/gcp-section-7-5-2-network-local-enforcement/spec.md`
- Modify:
  `openspec/changes/add-gcp-section-7-5-2-network-local-enforcement/tasks.md`
- Modify: `.project/PROGRESS.md`
- Modify only at closeout: `.project/WORK_QUEUE.json`

**Interfaces:**
- Consumes: the passing contract/verifier/test tree.
- Produces: synchronized docs and an explicit docs-only closure state.

- [ ] **Step 1: Document ownership and exclusions**

State the exact five included P07 nodes and four excluded P07 nodes. State that
P09/P18 are structurally closed only by this package and that the immutable
registry rows, owners, states, and edges are unchanged.

- [ ] **Step 2: Validate the pinned provider-source posture**

Run:

```bash
shasum -a 256 \
  docs/contracts/canonical-inference-gcp-transport-persistence-constraints/provider-source-evidence.json \
  docs/contracts/canonical-inference-gcp-transport-persistence-constraints/provider-revalidation.json \
  docs/contracts/canonical-inference-gcp-transport-persistence-constraints/audit-method-inventory.json
jq -e '
  .revalidation_basis.source_count == 53 and
  .revalidation_basis.claim_count == 30 and
  .revalidation_basis.live_configuration_state == "UNOBSERVED_BLOCKING" and
  .revalidation_basis.semantic_classifier_state == "UNCLOSED_BLOCKING" and
  .runtime_authority == "HELD"
' docs/contracts/canonical-inference-gcp-transport-persistence-constraints/provider-revalidation.json
```

Expected file digests, in command order:

```text
b86aefff90355bb5a0621bf84ead642c783badb3e35ac5eb20f1790728f05c8c
523dd8fe73dfe78569e2299720af47b7ffecbaca0502247f86fe8b64ea562d44
e13cf9889947115859d684f7377fd38caa6e5207969eda073f534bc94af87bbf
```

Reuse the existing pinned source packet and keep live configuration unobserved.
Do not invent a mechanism from the public-source summaries. If a separately
performed official-source refresh contradicts a required claim, emit
`HOLD_FOR_PROVIDER_REVALIDATION` and stop this slice.

- [ ] **Step 3: Validate the synchronized change**

Run:

```bash
npx openspec validate add-gcp-section-7-5-2-network-local-enforcement --strict
bash scripts/ci_docs_contract_sweep.sh
bash scripts/ci_linkcheck_fluency_docs.sh
python3 scripts/ci_v1_governance_gates.py
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 4: Record closure without future activation**

If the exact-tree review in Task 6 returns GO, set only the Section 7.5.2 queue
item to `done`. Keep Section 7.5.3 `pending`; do not activate it in this slice.

### Task 6: Freeze, review, and hand off the exact tree

**Files:**
- Modify: `.project/PROGRESS.md`
- Modify: `.project/WORK_QUEUE.json`

**Interfaces:**
- Consumes: one fully synchronized candidate tree.
- Produces: one immutable local commit eligible for separate push/PR authority.

- [ ] **Step 1: Run focused verification on the final tree**

Run the focused suite, verifier, strict OpenSpec validation, docs checks,
governance gate, JSON validation, and whitespace check once more.

- [ ] **Step 2: Commit the exact candidate locally**

```bash
git add \
  .project/WORK_QUEUE.json \
  .project/PROGRESS.md \
  docs/contracts/canonical-inference-gcp-network-local-enforcement \
  openspec/changes/add-gcp-section-7-5-2-network-local-enforcement \
  scripts/verify_gcp_section_7_5_2_network_local_enforcement.py \
  tests/test_gcp_section_7_5_2_network_local_enforcement_contract.py
git commit -m "docs(gcp): close Section 7.5.2 network-local contract"
```

- [ ] **Step 3: Run parallel exact-commit review**

Run CODE, BUG, and ADVERSARIAL review against the commit and tree from Step 2.
A new `HOLD` must identify an executable authorization, privacy, invariant, or
contract-closure failure. Record non-blocking improvements separately.

- [ ] **Step 4: Stop at the authority boundary**

Do not push, create a PR, merge, access GCP, deploy, migrate, qualify, implement
a runtime SUT, or begin Section 7.5.3 without separate authorization.

## Definition of Done

- Exactly P09, P18, and the five owned P07 nodes are closed structurally.
- The four later-owned P07 nodes remain pending with their owners unchanged.
- The immutable 20-row registry is byte-identical.
- The contract and verifier are closed-schema, canonical, fail-closed, and
  privacy-safe.
- All live approval/evidence registries remain empty and authority remains
  `NONE`.
- Focused tests, strict OpenSpec, docs checks, governance, and exact-tree review
  are green.
- The exact reviewed commit exists locally; no external action has occurred.
