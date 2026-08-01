# GCP Network and Local Enforcement Contract (Section 7.5.2)

## Status

```text
GCP_SECTION_7_5_2_NETWORK_LOCAL_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD
```

This package closes only the documentation-level network, channel, transport,
and local-ephemeral mechanism contract assigned to Section 7.5.2. It defines
closed record schemas and a silent offline verifier. It creates no runtime
record, approval, evidence, credential, GCP resource, deployment, persistence,
qualification, or model-execution authority.

## Exact ownership

Section 7.5.2 owns `S75A-P09`, `S75A-P18`, and exactly these Section 7.4 P07
acceptance nodes:

- `trust_distribution_acceptance_hash`
- `channel_enforcement_acceptance_hash`
- `pre_quote_transport_acceptance_hash`
- `terminal_quote_transport_acceptance_hash`
- `kms_sign_transport_acceptance_hash`

It does not own `audit_mapping_acceptance_hash`, which remains assigned to
Section 7.5.4. It does not own the initial, current, or final replay-retention
acceptance nodes, which remain assigned to Section 7.5.3.

The immutable Section 7.5A registry stays byte-identical at SHA-256
`2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0`.
Its 20 rows, owners, states, and edges are not rewritten by this package.

## Enforcement boundary

The six closed schemas require exact target, interval, authentication,
freshness/anti-replay, and approved-contract bindings. The structural bundle
then requires:

- private ingress and egress for the whole interval;
- UDS-only local delivery with no relay;
- exact caller-by-method authentication for `KMS_ASYMMETRIC_SIGN` and
  `STS_TOKEN_EXCHANGE`, bound to the Section 7.3 authority-operation IDs;
- TLS target and certificate binding;
- complete DNS, firewall, route, and perimeter observations;
- approved disk policy, tmpfs-only ephemeral material, disabled swap, disabled
  prohibited logging, and no unapproved local persistence for the whole
  interval; and
- exact equality between the Section 7.4-assigned trust verification time and
  trusted UTC policy used by token freshness.

Missing interval coverage or mechanisms produce `HOLD`. Privacy, target,
parent, schema, canonicalization, authentication, freshness, or ownership
conflicts reject. Unknown fields and Boolean/integer aliases are rejected before
hashing. Every record hash is recomputed from a domain-separated canonical
preimage.

## Artifacts

- `network-local-enforcement-contract.json` defines the closed schemas,
  ownership projection, exact source pins, precedence, privacy posture, and
  non-authorizing decision.
- `canonicalization-vectors.json` contains one synthetic valid bundle and
  required fail-closed mutations.
- `scripts/verify_gcp_section_7_5_2_network_local_enforcement.py` reads every
  explicit locator through descriptor-relative no-follow traversal, hashes and
  parses the same bytes, validates the source pins and closed shapes, recomputes
  record hashes, and emits no output on success.

Run:

```bash
python3 scripts/verify_gcp_section_7_5_2_network_local_enforcement.py
```

## Exclusions

This package does not implement persistence mechanics, replay retention,
attempt-ledger semantics, audit mapping, a runtime SUT, live GCP access,
credentials, provisioning, deployment, qualification, model execution,
customer/live data, or Sections 7.5.3-7.8. Runtime authority remains held.
