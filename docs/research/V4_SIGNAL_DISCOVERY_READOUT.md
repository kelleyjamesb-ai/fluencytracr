# V4 Signal Discovery Readout

## Purpose

This readout records dogfood findings for V4 signal discovery probes. It is
research-only. It does not productize V4, add a canonical event, change
suppression behavior, introduce a score, or create a customer-facing claim.

All findings are aggregate-only. They must not be used for person-level
interpretation, team comparison, productivity measurement, ROI calculation,
causal claims, or prediction.

## Named Reusable Workflow Join-Key Status

Reusable leverage remains unresolved.

The current AGENT metadata join path:

```text
WORKFLOW_RUN.rootworkflowid -> PRODUCT_SNAPSHOT.workflow.workflowid
```

did not recover named workflow metadata in the latest dogfood diagnostic. Under
strict criteria, `named_reusable_workflows` returned no rows.

A follow-up aggregate showed:

- `agent_runs`: 11,502,078
- `workflows`: 130,031
- `named_runs`: 0
- `named_public_runs`: 0
- `named_public_not_draft_runs`: 0
- `null_isdraftonly_runs`: 12,503
- `autonomous_runs`: 1,075,790
- `non_autonomous_runs`: 10,413,785

This does not prove named reusable workflows are absent. It proves the current
join path cannot see them reliably enough to support reusable leverage
interpretation.

The new `agent_snapshot_join_key_diagnostic.sql` diagnostic is required before
reusable workflow propagation can be promoted. It compares aggregate match
coverage for candidate join keys and reports whether matched snapshots carry
workflow names, autonomous flags, unlisted flags, and draft-state metadata.

Until that diagnostic is run and repeated across windows, reusable workflow
propagation should remain a research question, not a promoted signal.

## Safety Boundary

The reusable workflow propagation probe does not claim causality, ROI,
prediction, productivity, maturity labels, comparisons between teams, or
individual performance.

The supported conclusion today is narrow: reusable leverage is unresolved
because the current snapshot join path is insufficient.
