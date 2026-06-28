# Glean Readiness Demo Guide

## Purpose

This demo shows how FluencyTracr can turn Glean-native signal availability into a safe, evidence-ready operating view without using raw prompts, model outputs, transcripts, user identifiers, team slices, manager views, rankings, or productivity scores.

The reviewer takeaway:

- FluencyTracr can show what is measurable now.
- FluencyTracr can preserve what is blocked, suppressed, or missing.
- FluencyTracr does not infer hidden values when a signal is not ready.
- Glean Agent access can use a strict readiness summary instead of raw source records.

## Demo Assets

| Asset | Path | Use |
| --- | --- | --- |
| Seeded inventory | `docs/contracts/glean-signal-readiness/examples/org-northstar-seeded-inventory.json` | Broader readiness scenario with present, missing, suppressed, and not-computed families |
| Seeded readiness map | `docs/contracts/glean-signal-readiness/examples/org-northstar-weekly-readiness-map.json` | Generated output from the seeded inventory |
| Source-derived readiness map | `docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json` | Realistic local fixture path from WorkflowRun, MCP Usage, and AI Security source records |
| Derived EvidenceBundle fixture | `docs/contracts/evidence-bundle/v1/examples/glean-readiness-derived.json` | EvidenceBundle v1 output derived from validated readiness |
| Executive clickable prototype | `docs/integrations/glean/prototypes/executive-readiness-demo.html` | Static HTML executive demo with synthetic data, top-level graphs, and drill-down click paths |
| Value Evidence Pack prototype | `docs/integrations/glean/prototypes/value-evidence-pack-demo.html` | Static HTML demo showing QBR-safe value claim readiness, evidence coverage, and instrumentation gaps |
| MCP readiness summary tool | `fluency.get_signal_readiness_summary` | Agent-safe answer path for readiness questions |
| MCP value readiness summary tool | `fluency.get_value_claim_readiness_summary` | Agent-safe answer path for value claim readiness questions |
| MCP trusted map tool | `fluency.get_signal_readiness_map` | Full aggregate readiness map for trusted systems only |

## One-Page Narrative

### Measurable now

`workflow_run` is ready in the source-derived demo. It can support aggregate usage quality, behavior change, and coverage evidence because availability, scrub status, join keys, and derived dimensions are validated.

In the broader seeded demo, `agent_run` and `search_document_retrieval` are also ready, showing how additional Glean signal families can expand behavior-change, capability-growth, usage-quality, calibration, and coverage evidence once confirmed.

### Blocked or not computed

`mcp_usage` is not computed in the source-derived demo because export availability and scrubbed fields are not yet confirmed. This is a readiness gap, not a zero value. The correct action is to confirm the export path and field set before using it for capability-growth or safe-path calibration evidence.

### Suppressed

`ai_security` is suppressed pending governance review. The demo preserves the suppression state and reason code instead of converting policy/security aggregates into exposure claims before approval.

### Missing

`skill_lifecycle` is missing in the seeded demo. This is the clearest capability-growth gap because skill creation, publication, reuse, and lifecycle events would help explain whether AI capability is becoming repeatable across workflows.

### Unlock next

The safest pilot path is admin-exported aggregate inventory upload first, then customer event-log import once field availability, scrub status, join keys, retention, and data processing terms are confirmed. The live-data gate is documented in `docs/integrations/glean/07-live-data-access-decision-gate.md`.

## Demo Flow

1. Generate the seeded readiness map:

```bash
npm run glean:readiness
```

2. Generate the source-derived readiness map:

```bash
npm run glean:readiness:sources
```

3. Validate readiness examples:

```bash
node scripts/validate_glean_readiness_examples.mjs
```

4. Validate EvidenceBundle examples:

```bash
bash scripts/validate_evidence_bundle_schema.sh
```

5. Validate the MCP readiness tools:

```bash
npm test --workspace @fluencytracr/fluencytracr-mcp -- --run src/tools.test.ts
```

6. Validate the executive clickable prototype:

```bash
node scripts/validate_glean_executive_prototype.mjs
```

7. Validate the Value Evidence Pack prototype:

```bash
node scripts/validate_glean_value_evidence_prototype.mjs
```

8. Open the static HTML prototypes directly in a browser:

```text
docs/integrations/glean/prototypes/executive-readiness-demo.html
docs/integrations/glean/prototypes/value-evidence-pack-demo.html
```

9. Run the full repository harness:

```bash
./harness/scripts/verify.sh
```

## Agent Question Examples

Use `fluency.get_signal_readiness_summary` for:

- "Which Glean signal families are ready for this org-window?"
- "Which signal families are not computed, suppressed, or missing?"
- "What needs to be validated before MCP Usage can contribute evidence?"
- "Is AI Security available for exposure evidence yet?"

Use `fluency.get_signal_readiness_map` only when the full trusted aggregate `GSR_2026_05` contract is required.

Use `fluency.get_value_claim_readiness_summary` for:

- "Which Glean value claims are safe for this QBR?"
- "Is the ROI claim customer-safe yet?"
- "Which value claims are suppressed or not computed?"
- "What instrumentation is needed before MCP action value can be claimed?"

## What This Does Not Do

- It does not connect to live Glean tenant data.
- It does not assume WorkflowRun, MCP Usage, AI Security, or Skill lifecycle fields are universally customer-accessible.
- It does not expose raw source records, prompts, model outputs, transcripts, message text, or file content.
- It does not output person, team, manager, role, ranking, productivity, or performance views.
- It does not convert `missing`, `suppressed`, or `not_computed` readiness into evidence claims.

## What To Validate First

1. Whether WorkflowRun fields are customer-accessible with scrubbed aggregate metadata.
2. Whether MCP Usage exports include stable join keys and no raw tool payloads.
3. Which AI Security aggregate fields are approved for exposure or leadership-reinforcement evidence.
4. Whether Skill lifecycle events can be exported or queried safely.
5. Whether join keys stay stable across WorkflowRun, AgentRun, Actions, and MCP Usage.
