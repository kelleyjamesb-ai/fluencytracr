# Glean Live Data Access Decision Gate

## Current Decision

As of 2026-05-01, use **Path C: admin-exported aggregate inventory upload** for pilot work.

Do not build live Glean export ingestion or Glean-hosted MCP access until the gate checks below are confirmed with deployment-specific evidence.

## Why Path C First

Path C is the safest pilot path because it:

- keeps identity and data assembly upstream
- works with aggregate readiness snapshots
- avoids assuming unconfirmed Glean export fields
- lets reviewers validate the value story before production data integration
- preserves `missing`, `suppressed`, and `not_computed` states instead of filling gaps with inference

## Decision Inputs

| Gate | Required evidence | Current pilot stance |
| --- | --- | --- |
| WorkflowRun accessibility | Customer-accessible export or admin-confirmed aggregate fields with scrubbed metadata | Proceed only through aggregate snapshot until confirmed |
| MCP Usage accessibility | Export or query path with scrubbed metadata, stable join keys, and no raw tool payloads | `not_computed` until confirmed |
| AI Security aggregate approval | Approved fields, policy owner, retention terms, and allowed evidence dimensions | `suppressed` until governance approval |
| Skill lifecycle availability | Safe export or query path for skill creation, publication, reuse, and lifecycle events | `missing` until available |
| Join-key stability | Stable keys across WorkflowRun, AgentRun, Actions, and MCP Usage | Treat unknown joins as `not_computed` |
| Retention and processing terms | Documented retention window, processing basis, and customer approval path | No live processing until confirmed |

## Path Options

### Path A: Customer event-log import

Use when customer-accessible event logs are confirmed and scrubbed.

Pros:
- Most portable customer-owned path
- Good fit for repeatable import workflows
- Can become production ingestion once field contracts are known

Risks:
- Requires export availability and customer setup
- Join keys and scrub status must be validated per deployment
- Bad fit if raw content cannot be excluded deterministically

Go only when:
- WorkflowRun and MCP Usage metadata are confirmed
- raw prompts, outputs, transcripts, and tool payloads are excluded
- join keys are stable enough for aggregate derivation

### Path B: Glean-hosted MCP/read tool access

Use only if Glean-hosted access can return bounded aggregate readiness or evidence responses directly.

Pros:
- Lower manual export overhead
- Better user experience for Glean-native agent workflows
- Can support dynamic readiness answers

Risks:
- Requires exact tool permissions and response contracts
- Higher blast radius if raw records or unsafe dimensions are exposed
- Must preserve suppression and audit behavior end to end

Go only when:
- tool contracts are approved
- every response is aggregate and strict-schema validated
- audit records prove no raw source records are returned

### Path C: Admin-exported aggregate inventory upload

Use for pilot and stakeholder validation now.

Pros:
- Fastest safe path
- Matches the current readiness map contract
- Supports Glean Agent summary tooling without live tenant assumptions
- Keeps governance gaps visible

Risks:
- Not fully automated
- Snapshot freshness depends on admin process
- Requires a later decision before production automation

Go now:
- Use `GSR_INVENTORY_2026_05` and `GSR_2026_05`
- Validate examples locally
- Publish or expose only aggregate summaries

## Required Gate Before Live Integration

Before implementing Path A or Path B, create a new approved OpenSpec change that includes:

- exact source fields and export/query channel
- scrub status and forbidden-field proof
- stable join keys
- allowed derived dimensions
- retention and processing terms
- suppression policy
- audit behavior
- rollback plan

## Validation Commands

```bash
npm run glean:readiness:sources
node scripts/validate_glean_readiness_examples.mjs
bash scripts/validate_evidence_bundle_schema.sh
npm test --workspace @fluencytracr/fluencytracr-mcp -- --run src/tools.test.ts
./harness/scripts/verify.sh
```

## Operating Rule

If field availability, scrub status, join keys, or governance approval are unknown, the readiness state must be `not_computed` or `suppressed`. Unknown must never become present by inference.
