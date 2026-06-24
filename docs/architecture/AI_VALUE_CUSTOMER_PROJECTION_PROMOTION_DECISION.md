# AI Value Customer Projection Promotion Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean or BigQuery execution, export packages, rendered customer readouts,
confidence math, ROI, causality, productivity, probability, or customer-facing
financial output.

Phase: `phase-ai-value-customer-projection-promotion-decision`

Decision: `HOLD_FOR_SOURCE_BOUND_PROJECTION_CONTRACTS`

## 1. Purpose

The Productization Gate allows internal operator review. It does not authorize
customer-facing product surfaces. This decision records whether customer-facing
projection work can start.

## 2. Decision

Do not build customer-facing projection routes or UI yet.

Decision value:

```text
HOLD_FOR_SOURCE_BOUND_PROJECTION_CONTRACTS
```

Reason:

- backend-internal Measurement Cell snapshot persistence is promoted, but
  customer-facing Measurement Cell projection is not promoted;
- source-bound Executive Readout Snapshot projection is not promoted;
- legacy readout isolation requires route and UI guard work before customer
  exposure expands;
- export governance is not promoted;
- legal/trust review for customer-facing value language is not complete;
- generic object payloads are not safe customer projections.

## 3. Projection Contract Requirements

Before customer-facing projection can be promoted, source-bound projection
contracts must define:

- allowed audience;
- role permissions;
- org-scope enforcement;
- response shape;
- source refs;
- window provenance;
- caveat carry-forward;
- blocked-use carry-forward;
- blocked-claim carry-forward;
- held evidence display;
- suppressed evidence display;
- missing evidence display;
- not-computed evidence display;
- k-min posture display;
- privacy posture display;
- export prohibition;
- legal/trust approval state when value language is customer-visible.

## 4. Customer-Visible Is Not Customer-Safe Claim

Future projection may show status or posture only when explicitly approved.

Customer-visible status must remain separate from:

- rendered executive readout output;
- value proof;
- ROI output;
- EBITDA output;
- causality output;
- workforce productivity measurement;
- probability output;
- model output;
- customer-facing financial output.

## 5. Required Future Tests

Before implementation, tests must cover:

- cross-org read denial;
- cross-org write denial;
- role denial;
- generic object payload exposure denial;
- source-ref drift rejection;
- stale validation rejection;
- caveat carry-forward;
- blocked-use carry-forward;
- blocked-claim carry-forward;
- hidden held/suppressed/missing/not-computed evidence rejection;
- raw/person-level payload rejection;
- raw rows rejection;
- raw files rejection;
- query text rejection;
- SQL text rejection;
- prompts rejection;
- responses rejection;
- transcripts rejection;
- ticket contents rejection;
- file contents rejection;
- direct identifiers rejection;
- hashed or joinable person identifiers rejection;
- full source package payload rejection;
- full operator handoff bundle rejection;
- full Blueprint expectation-path registry rejection;
- unsafe source-ref rejection;
- source-ref payload smuggling rejection;
- JSONB smuggling through payload, validation, source refs, caveats, blocked
  uses, or compact posture fields;
- customer-facing financial output denial;
- ROI, EBITDA, causality, workforce productivity measurement, probability,
  confidence, model, or score-like output denial;
- rendered readout denial unless a later readout contract explicitly allows it.

## 6. Recommended Next Move

Keep customer projection blocked until:

1. controlled aggregate pilot evidence exists;
2. backend-internal Measurement Cell snapshot projection proves safe without
   becoming a customer-facing readout;
3. legacy readout route/UI guard posture is resolved;
4. export governance decision is complete.

## 7. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
