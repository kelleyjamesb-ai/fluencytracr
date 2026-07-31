# Change: Define Section 7.5.1 V4 parent-authority readiness

## Why

The stopped V3 packet treated dynamic signatures, locators, and a generated
ledger as static evidence. Section 7.5.1 needs a smaller preimplementation
packet that binds immutable parent identities while proving only the rules a
future evaluator must satisfy.

## What Changes

- Add a V4 OpenSpec readiness packet and a compact rule source for queue item
  `gcp-canonical-runtime-section-7-5-parent-authority`.
- Pin the exact five parent members, the canonical readiness protocol, closed
  public boundaries, all twelve environment cells, nine oracle classes, and
  nineteen mandatory attacks plus four V4 metamorphic cases.
- Preserve every parent owner and every current blocker as open.
- After the separately completed Section 7.2, 7.3, and 7.4 documentation
  amendments, add one compact canonical projection that records only those
  parent-interface portions as closed and keeps the full Section 7.5 contract
  open.

## Impact

- Affected spec: `gcp-section-7-5-parent-contract-authority-closure-readiness`.
- Affected test evidence: one compact JSON fixture and one structural test.
- Closure evidence is a docs-only projection and offline verifier; it is not an
  evaluator, runtime contract, new architecture layer, or governance layer.
- No GCP access, credential, signature fixture, network mutation, deployment,
  or live action.
- `authority_effect: NONE`; structural evidence cannot close HSM custody,
  actual aliases/approvals/evidence, production authority, the full Section
  7.5 contract, or any later-section obligation.
