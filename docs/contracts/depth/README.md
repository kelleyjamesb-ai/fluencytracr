# Depth Readout Contract

## Purpose

The Depth readout contract defines how FluencyTracr may represent aggregate evidence that AI use is becoming integrated into real workflows.

Depth is not skill, maturity, or performance. It is a governed aggregate input to V4 value confidence.

## Contract Status

Status: documentation-stage concept contract. No runtime implementation exists in this PR.

## Schema Version

Proposed schema version: `FT_DEPTH_2026_05_DOCS_ONLY`.

This is a documentation marker, not a shipped API schema.

## Inputs

Depth may consume governed aggregate evidence from:

- V3 aggregate verdicts,
- verification and feedback attribution,
- workflow and surface taxonomy,
- AGENT sub-surface composition,
- reusable workflow or Skill aggregate usage,
- recovery and friction-loop aggregate evidence,
- Quality Multiplier and Reliability Factor outputs.

Inputs must already satisfy aggregate-only privacy constraints.

## Output Shape

A Depth readout should include:

- `schema_version`,
- `org_id`,
- `workflow_id`,
- `cohort_id`,
- `verdict`,
- `suppression_reason`,
- `depth`,
- `depth_band`,
- `required_caveats`.

Suppressed readouts must keep dimension values null or absent.

## Depth Dimensions

- `verification_depth`
- `workflow_repertoire_depth`
- `skill_reuse_depth`
- `recovery_depth`
- `judgment_override_depth`

Each dimension should be expressed as a governed band or aggregate status. A future schema may add bounded aggregate fields, but it must not expose person-level records.

## Allowed Bands

### HIGH

Aggregate evidence strongly supports the dimension for the declared workflow and cohort.

### MEDIUM

Aggregate evidence partially supports the dimension, with caveats.

### LOW

Aggregate evidence is present but weak for the dimension. LOW is not a negative judgment.

### INSUFFICIENT_EVIDENCE

Evidence is missing, incomplete, or not stable enough to interpret.

### SUPPRESSED

The readout failed fail-closed gates. Dimension values and economic interpretation must not be exposed.

## Suppression Behavior

Default state is `SUPPRESS`. Depth can surface only after existing governance gates clear.

Suppression reasons remain the existing five. This contract does not add new suppression reasons.

Suppressed Depth readouts must not include hidden reconstructed values, economic values, hours saved, upside estimates, portfolio totals, user identifiers, or row-level evidence.

## Privacy Constraints

Depth must be computed and surfaced only at governed aggregate levels.

Depth must never include:

- user IDs,
- emails,
- names,
- raw prompts,
- raw outputs,
- transcripts,
- team rankings,
- individual productivity,
- raw event rows.

## Required Caveats

Every Depth readout should carry caveats explaining that:

- Depth is aggregate evidence, not skill, maturity, or performance.
- Depth must not be used to rank individuals, teams, managers, or departments.
- Depth supports claim confidence only when paired with fail-closed verdicts and evidence grades.
- Suppressed evidence cannot support economic interpretation.

## Non-Capabilities

Depth does not calculate ROI.

Depth does not prove causality.

Depth does not predict future behavior.

Depth does not create person-level labels.

Depth does not override suppression.

## Example Readout

```json
{
  "schema_version": "FT_DEPTH_2026_05_DOCS_ONLY",
  "org_id": "org-northstar-enterprise",
  "workflow_id": "workflow:CHAT",
  "cohort_id": "customer-aiom-60d",
  "verdict": "SURFACE",
  "suppression_reason": null,
  "depth": {
    "verification_depth": "MEDIUM",
    "workflow_repertoire_depth": "HIGH",
    "skill_reuse_depth": "LOW",
    "recovery_depth": "MEDIUM",
    "judgment_override_depth": "INSUFFICIENT_EVIDENCE"
  },
  "depth_band": "MEDIUM",
  "required_caveats": [
    "Depth is aggregate evidence of workflow integration, not skill, maturity, or performance.",
    "Do not rank individuals, teams, managers, or departments from this readout.",
    "Economic interpretation requires separate V4 value-confidence caveats."
  ]
}
```

## Future Schema Work

Future work may add a minimal JSON schema after the Markdown contract stabilizes. Schema work must preserve aggregate-only output, existing suppression reasons, and fail-closed behavior.
