# V4 Signal Discovery Readout

## AGENT Metadata Field Discovery Status

Status: `HOLD`

The root workflow snapshot join is validated for the current scio-prod export:
`WORKFLOW_RUN.rootworkflowid` matched `PRODUCT_SNAPSHOT.workflow.workflowid` for
99.89% of AGENT workflow-run rows in the observed 60-day window.

That means the join itself is healthy. The blocker is metadata availability:
`productsnapshot.workflow.name` is not populated for matched AGENT runs in this
export path. The current absence of named reusable workflow rows is therefore an
observability gap, not evidence that named reusable workflows are absent.

The metadata discovery diagnostic at
`sql/dogfood/agent_metadata_field_discovery.sql` inspects matched AGENT
snapshots only and reports aggregate field presence for known-valid native
STRUCT paths:

- `productsnapshot.workflow.name`
- `productsnapshot.workflow.isautonomousagent`
- `productsnapshot.workflow.unlisted`
- `productsnapshot.workflow.isdraftonly`
- `workflowrun.workflowexecutions`

Reusable Workflow Propagation remains `HOLD` until a reliable metadata field is
found for named or reusable AGENT workflow classification. Delegation Depth can
still use autonomous vs non-autonomous and exploratory vs structured buckets,
but named reusable leverage must remain unresolved.

This readout is dogfood/research-only. It does not add canonical events,
suppression reasons, thresholds, APIs, schemas, product surfaces, customer-facing
claims, or economic-value calculations. Outputs must remain aggregate-only and
must not emit user IDs, emails, names, prompts, outputs, transcripts, or raw
event rows.
