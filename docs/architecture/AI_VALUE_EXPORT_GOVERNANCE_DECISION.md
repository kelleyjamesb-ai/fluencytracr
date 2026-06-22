# AI Value Export Governance Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean or BigQuery execution, export packages, rendered customer readouts,
confidence math, ROI, causality, productivity, probability, or customer-facing
financial output.

Phase: `phase-ai-value-export-governance-decision`

Decision: `EXPORT_BLOCKED_PENDING_GOVERNANCE_CONTRACT`

## 1. Purpose

Internal operator review artifacts are not export artifacts. This decision
records whether any packet, deck, PDF, HTML readout, API export, customer share
package, or downloadable evidence package may be created from the current AI
Value spine.

## 2. Decision

Do not build exports yet.

Decision value:

```text
EXPORT_BLOCKED_PENDING_GOVERNANCE_CONTRACT
```

Reason:

- source-bound customer projection is not promoted;
- source-bound Executive Readout Snapshot output is not promoted;
- legacy `executive_packet` output is not customer-safe export output;
- legal/trust review for customer-facing value language is not complete;
- export-specific audience, projection, caveat, suppression, k-min, and blocked
  field rules are not implemented;
- customer-facing financial output remains blocked.

## 3. Blocked Export Types

Do not export:

- customer-facing packet;
- deck;
- PDF;
- HTML readout;
- API export;
- customer share package;
- Claim Readiness Snapshot export;
- Executive Readout Snapshot export;
- Measurement Cell payload export;
- Measurement Cell Series payload export;
- full source package payload;
- full operator handoff bundle;
- full Blueprint expectation-path registry;
- raw rows;
- raw files;
- prompts;
- responses;
- transcripts;
- query text;
- SQL text;
- ticket contents;
- file contents;
- identifiers;
- finance, ROI, EBITDA, causality, workforce productivity measurement,
  probability, model, or score-like output.

## 4. Future Export Governance Requirements

Before any export work, a separate export contract must define:

- audience;
- allowed sections;
- blocked sections;
- source refs;
- provenance;
- caveat carry-forward;
- blocked-use carry-forward;
- blocked-claim carry-forward;
- suppression posture;
- k-min posture;
- privacy posture;
- expiration or versioning;
- legal/trust approval state;
- customer approval state;
- prohibited fields;
- validation tests;
- revocation or regeneration policy.

## 5. Required Future Tests

Export implementation must test:

- blocked raw/person-level content;
- blocked raw rows;
- blocked raw files;
- blocked query text;
- blocked SQL text;
- blocked prompts;
- blocked responses;
- blocked transcripts;
- blocked ticket contents;
- blocked file contents;
- blocked direct identifiers;
- blocked hashed or joinable person identifiers;
- blocked full source package payloads;
- blocked full operator handoff bundles;
- blocked full Blueprint expectation-path registries;
- blocked unsafe source refs;
- blocked source-ref payload smuggling;
- blocked JSONB smuggling through payload, validation, source refs, caveats,
  blocked uses, or compact posture fields;
- blocked finance/customer-facing financial output;
- blocked ROI, EBITDA, causality, workforce productivity measurement,
  probability, confidence, model, or score-like output;
- blocked missing caveats;
- blocked hidden suppressed evidence;
- blocked source-ref drift;
- blocked stale validation;
- blocked legacy `executive_packet` export;
- blocked generic `ai_value_objects` full payload export;
- blocked cross-org export;
- blocked export without legal/trust approval state;
- blocked export without explicit audience.

## 6. Recommended Next Move

Keep exports blocked. Revisit export governance only after:

1. customer projection promotion is reconsidered;
2. legacy readout isolation is resolved;
3. source-bound readout or projection contract exists;
4. legal/trust review requirements are defined.

## 7. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
