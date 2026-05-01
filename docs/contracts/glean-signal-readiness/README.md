# Glean Signal Readiness Map

Schema version: `GSR_2026_05`

## Purpose

The Glean Signal Readiness Map records whether a Glean deployment can support FluencyTracr evidence derivation for a specific organization and reporting window. It is a computability layer between the data-access RFI and EvidenceBundle output.

The map answers:

- Which Glean signal families are available?
- Which export path or tool surface provides them?
- Which fields survive governance and scrubbing boundaries?
- Which FluencyTracr dimensions can be computed?
- Which dimensions are missing, suppressed, or not computed?
- What must be validated before using the signal in an EvidenceBundle?

## Signal Families

Allowed `signal_family` values:

- `workflow_run`
- `agent_run`
- `agent_step`
- `actions`
- `mcp_usage`
- `ai_security`
- `skill_lifecycle`
- `user_memory_tool`
- `assistant`
- `search_document_retrieval`
- `insights`

## Readiness Status

Each entry uses one of:

- `present`: verified and usable for aggregate evidence derivation.
- `missing`: unavailable for the org-window or deployment.
- `suppressed`: available but withheld by governance or suppression policy.
- `not_computed`: not yet mapped, exported, or validated.

Do not infer a missing signal from another signal family.

## Derived Dimensions

Allowed derived dimensions are:

- `confidence`
- `usage_quality`
- `behavior_change`
- `leadership_reinforcement`
- `capability_growth`
- `exposure`
- `calibration`
- `fragility`
- `coverage`

These are evidence directions, not individual or team performance judgments.

## Privacy Boundary

The readiness map is org-window scoped. It must not include:

- direct identifiers such as email, employee ID, or user ID
- team, manager, role, or person-level comparisons
- raw prompt text, model output, transcripts, message text, or file content
- ranking, scoring, or productivity fields

Entries should describe availability and computability, not raw underlying records.

## Required Top-Level Shape

```json
{
  "schema_version": "GSR_2026_05",
  "org_id": "org-1",
  "window": "weekly",
  "generated_at": "2026-05-01T12:00:00.000Z",
  "source_system": "Glean",
  "entries": [],
  "next_actions": []
}
```

Runtime validation lives in `shared/src/gleanSignalReadinessSchemas.ts` and is exported through `@learnaire/shared`.

## Seeded Generator

The seeded demo inventory lives at `examples/org-northstar-seeded-inventory.json`.

Generate the validated readiness map:

```bash
npm run glean:readiness
```

The default output is `examples/org-northstar-weekly-readiness-map.json`.

## Example

```json
{
  "schema_version": "GSR_2026_05",
  "org_id": "org-1",
  "window": "weekly",
  "generated_at": "2026-05-01T12:00:00.000Z",
  "source_system": "Glean",
  "entries": [
    {
      "signal_family": "workflow_run",
      "source_availability": "available",
      "export_channel": "customer_event_logs",
      "scrub_status": "scrubbed",
      "stable_join_keys": ["run_id", "workflow_run_id"],
      "derived_dimensions": ["usage_quality", "behavior_change"],
      "readiness_status": "present",
      "suppression_applied": false,
      "suppression_reasons": [],
      "data_quality": {
        "completeness": "verified",
        "latency": "known",
        "join_reliability": "stable"
      },
      "validation_evidence": [
        {
          "checked_at": "2026-05-01T12:30:00.000Z",
          "evidence_type": "schema_review",
          "note": "WorkflowRun fields verified without raw content or direct identifiers."
        }
      ]
    }
  ],
  "next_actions": [
    {
      "signal_family": "mcp_usage",
      "action": "Confirm export availability and scrubbed field set.",
      "owner": "glean_admin",
      "priority": "high"
    }
  ]
}
```
