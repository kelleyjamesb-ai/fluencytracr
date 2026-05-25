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

## Purpose

This readout records dogfood findings for the V4 signal discovery probes. It is
research-only. It does not productize V4, add a canonical event, change
suppression behavior, introduce a score, or create a customer-facing claim.

All findings are aggregate-only. They must not be used for person-level
interpretation, team comparison, productivity measurement, ROI calculation,
causal claims, or prediction.

## Window And Source

- Window: 2026-03-23 through 2026-05-22.
- Source: scio-prod scrubbed GCE export.
- Schema note: working diagnostics use native BigQuery `STRUCT` access for
  `jsonPayload`. Invalid JSON-style or alias paths were removed after live
  query failures.

## Probe Summary

| Probe | Current disposition | Reason |
| --- | --- | --- |
| Depth Repertoire | HOLD, promising | Strong aggregate distribution variance across surface-repertoire buckets; needs multi-window stability before promotion. |
| Delegation Depth | HOLD, promising | Strong aggregate distribution spread, but reusable leverage still needs join/path validation. |
| Rapid Refinement Behavior | HOLD, promising | Repeat-depth evidence appears on multiple surfaces, but interpretation needs stability checks and clearer same-session boundaries. |
| Reusable Workflow Propagation | UNRESOLVED | Current join/path does not yet surface named workflow volume reliably; propagation diagnostics must be repeated before interpretation. |
| Skill Read Evidence | AVAILABLE, not governed | Agent span logs appear to carry skill-read telemetry, but identity, version, invocation mode, and unspecified-share gaps block reusable leverage promotion. |

## Skill Read Evidence Availability

Status: `AVAILABLE_BUT_NOT_GOVERNED`

New internal evidence indicates that Glean's current Skills usage metrics are
powered primarily by skill reads logged from agent execution. Two read
mechanisms are expected:

- legacy `skill_reader` tool reads, where the skill name may appear in action
  input fields;
- shell-based reads, where the skill name lands in
  `jsonPayload.action.skill_reader_attributes.skill_name`.

The usage source is BigQuery, not the skill definition directories. Raw usage
evidence lives in `scio-apps.scrubbed_agentspan.scrubbed_agentspan_*`, with dbt
extraction available through `action_runs_v2` / `action_runs` via
`skill_reader_skill_name`. The Sigma Assistant runtime metrics dashboard can be
used as a cross-check for aggregate skill-read rates. The `data/skills/`,
`data/plugin_skills/`, PluginSkillStore, and UGC `ListAccessibleSkills` paths
remain catalog, eligibility, or definition layers rather than usage fact
tables.

This changes the V4 research interpretation. Earlier reusable-leverage probes
looked for named workflow metadata through GCE `PRODUCT_SNAPSHOT` workflow
fields. That path did not surface named reusable workflow volume. The new
evidence suggests Skills are not necessarily absent; they are likely observable
through agent span logs instead of the GCE workflow snapshot path.

The new diagnostic at
`sql/dogfood/skill_read_availability_diagnostic.sql` tests the agent-span path
without emitting raw skill names. It reports aggregate availability,
unspecified-share, distinct specified skill-name cardinality, and parent join
coverage for workflow, action, and session identifiers.

The diagnostic was run across the three fixed 60-day dogfood windows against
`scio-apps.scrubbed_agentspan.scrubbed_agentspan_*`. Result CSVs were saved
under `dogfood-output/v4-skill-read-availability/` and are intentionally
ignored as generated dogfood cache files.

Aggregate results:

| Window | Skill read rows | Group-level distinct specified skill-name count | Parent join key share | Unspecified share | Availability |
| --- | ---: | ---: | ---: | ---: | --- |
| 2026-03-23 to 2026-05-22 | 1,473,686 | 85 | 100.00% | 0.00% | `SKILL_READ_EVIDENCE_AVAILABLE` |
| 2026-02-21 to 2026-04-22 | 601,178 | 78 | 99.27% | 0.00% | `SKILL_READ_EVIDENCE_AVAILABLE` |
| 2026-01-22 to 2026-03-23 | 145,477 | 18 | 96.35% | 0.00% | `SKILL_READ_EVIDENCE_AVAILABLE` |

The usage signal is therefore available, specified, and mostly joinable. The
distinct-name column is an aggregate cardinality check only; no raw skill names
are emitted and no per-skill ranking is supported. The sharp window-to-window
volume growth means the signal should still be treated as an availability
finding rather than a stable reusable-leverage signal.

This is enough to move the research state from "Skills may be unavailable" to:

```text
SKILL_READ_EVIDENCE_AVAILABLE_BUT_NOT_YET_GOVERNED
```

It is not enough to promote Reusable Workflow Propagation or Named Workflow
Leverage. Current gaps remain material:

- detection is name-based rather than canonical `skill_id` based;
- native/platform skill detection depends on the skill-reader proto enum and
  skill-reader mapping;
- skill names cannot yet reliably distinguish duplicate display names;
- version, entrypoint, invocation mode, and trigger method are not yet governed;
- a large share of reads may still log as `unspecified`;
- UGC/user-created Skills are not yet logged by canonical ID;
- personal, shared, and org Skills cannot yet be cleanly separated in the usage
  readout;
- Plugin/MCP `find_skills` downloads may create observability gaps after the
  first download.

Reusable Workflow Propagation therefore remains `HOLD`. The next research
question is whether skill-read evidence is available, joinable, stable across
fixed windows, and metadata-complete enough to become a governed reuse-depth
input.

## Depth Repertoire Diagnostic

The depth repertoire diagnostic at
`sql/dogfood/depth_repertoire_diagnostic.sql` succeeded against the 60-day
scio-prod window. It scanned about 0.72 TB and returned aggregate bucket rows
only.

The diagnostic directly tests the V4 Depth spine:

```text
Depth = Surface Repertoire x Repeat Use / Refinement
```

Overall aggregate findings:

| Metric | p50 | p90 | p99 |
| --- | ---: | ---: | ---: |
| Surface repertoire | 2 | 6 | 9 |
| Repeated surfaces | 2 | 5 | 8 |
| Multi-day surfaces | 1 | 5 | 7 |
| Depth candidate | 4 | 30 | 64 |

Repertoire bucket findings:

| Segment | Users | Repertoire p50 | Repeated surfaces p50 | Depth candidate p50 |
| --- | ---: | ---: | ---: | ---: |
| Single surface | 995,800 | 1 | 1 | 1 |
| 2-3 surfaces | 388,962 | 3 | 2 | 6 |
| 4-6 surfaces | 730,335 | 5 | 4 | 20 |
| 7-10 surfaces | 119,875 | 7 | 7 | 49 |
| 11+ surfaces | 3,599 | 11 | 10 | 110 |

Interpretation: HOLD, promising. The result shows meaningful variance that does
not collapse into generic usage volume. It separates single-surface habitual use
from repeated cross-surface work integration. Promotion would require the same
shape to hold across additional fixed windows or comparable cohorts.

This is not a customer-facing score, rank, maturity label, productivity
measure, ROI claim, causal claim, or prediction. It is aggregate-only research
evidence that the revised Depth definition is observable.

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

The `agent_snapshot_join_key_diagnostic.sql` diagnostic is required before
reusable workflow propagation can be promoted. It compares aggregate match
coverage for candidate join keys and reports whether matched snapshots carry
workflow names, autonomous flags, unlisted flags, and draft-state metadata.

## Delegation Depth Diagnostic

The delegation depth diagnostic succeeded after native `STRUCT` path fixes.
The current aggregate findings are:

| Bucket | Aggregate users | Aggregate events | Event share | p50 | p90 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Retrieval | 1,318,236 | 234,063,902 | 19.68% | 20 | 148 | 688 |
| Transformation | 980,218 | 92,511,910 | 7.78% | 30 | 251 | 852 |
| Structured delegation | 120,305 | 10,675,699 | 0.90% | 11 | 113 | 654 |
| Exploratory delegation | 279,567 | 10,415,895 | 0.88% | 4 | 55 | 500 |

Reusable leverage returned no row in this run. That should not be interpreted
as evidence that reusable workflows are absent. It means the current join/path
does not yet surface named workflow volume reliably enough for a readout.

Interpretation: HOLD, promising. The shape suggests meaningful aggregate
variance across retrieval, transformation, exploratory delegation, and
structured delegation. Promotion would require stable results across additional
windows and a resolved reusable workflow path.

## Refinement Depth Diagnostic

The refinement depth diagnostic returned 50 aggregate rows and scanned about
2.96 TB. Notable aggregate findings:

| Surface / evidence type | p50 | p90 | p99 |
| --- | ---: | ---: | ---: |
| `standalone:MCP_USAGE` rapid same-surface reuse | 20 | 150 | 810 |
| `standalone:AI_SUMMARY` rapid same-surface reuse | 3 | 31 | 248 |
| `workflow:CHAT` confirmed same-session refinement | 2 | 5 | 17 |
| `workflow:agent:autonomous` confirmed same-session refinement | 1 | 5 | 20 |
| `workflow:agent:ephemeral` confirmed same-session refinement | 1 | 5 | 13 |

`workflow:agent:workflow_named` did not appear in the refinement output and
remains unresolved. That should not be interpreted as absence of named workflow
behavior. It is a signal that the current join/path needs more validation.

Interpretation: HOLD, promising. MCP usage and AI Summary show heavy-tail repeat
depth. CHAT and AGENT sub-surfaces show same-session refinement evidence, but
the meaning of repeat behavior remains surface-specific and must not be treated
as a product signal without stability checks.

## Reusable Workflow Propagation Diagnostic

Reusable workflow propagation remains unresolved until the diagnostics are run
across fixed windows. The propagation diagnostic separates:

- named workflow candidates: non-autonomous AGENT workflows with a populated
  workflow name and `unlisted = FALSE`;
- confirmed reusable candidates: named workflow candidates with `isdraftonly =
  FALSE`;
- autonomous agents;
- ephemeral or unlisted agents;
- unclassified agent workflows;
- unmatched workflow runs.

This separation matters because requiring a not-draft proxy for all named
workflow analysis can hide named workflow behavior when draft-state metadata is
sparse, delayed, or unavailable. The candidate layer should be inspected before
the confirmed reusable layer is interpreted.

The diagnostic also reports snapshot join coverage, including
`snapshot_match_rate`, `named_candidate_count`,
`confirmed_reusable_candidate_count`, and `unmatched_agent_workflow_count`.

Interpretation: UNRESOLVED. Run the join-key and propagation diagnostics against
the same fixed window, then repeat across additional windows before deciding
whether the signal deserves a concept document or should remain a research
footnote.

## Safety Boundary

These probes do not claim causality, ROI, prediction, productivity, maturity
labels, comparisons between teams, or individual performance.

The supported conclusion today is narrow: the first two probes show enough
aggregate distribution shape to remain in research as HOLD, promising.
Reusable workflow propagation remains blocked on join/path validation.
