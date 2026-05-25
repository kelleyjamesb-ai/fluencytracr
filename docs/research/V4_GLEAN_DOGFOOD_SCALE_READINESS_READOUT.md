# V4 Glean Dogfood Scale Readiness Readout

## Purpose

This document summarizes the internal Glean dogfood run for the V4 Scale
Readiness to Economic Value plan. It records what the three-window evidence
shows, what remains blocked, and what V4 can safely claim before any contract
hardening decision.

Current status: `DOGFOOD_EXPORTS_REVIEWED`

This readout is not customer-facing. It adds no runtime behavior, APIs, schemas,
Prisma migrations, frontend surfaces, ROI calculation, causal claim, prediction
claim, individual scoring, comparative team evaluation, comparative department
evaluation, productivity assessment, or maturity label.

## Inputs Reviewed

The dogfood run used three fixed 60-day windows:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

Aggregate-only BigQuery exports were produced for:

- V2 Velocity,
- surface taxonomy,
- AGENT sub-surfaces,
- Depth Repertoire,
- Quality Multiplier inputs,
- Reliability Factor inputs,
- Trust Calibration evidence where observable.

The run scanned approximately 17.49 TB. Generated CSV outputs were written
outside the repository and were not committed.

## Data Readiness Status

Current status: `PARTIAL_READY_WITH_EVIDENCE_GAPS`

The run confirms that the core V4 dogfood queries execute across three
60-day-compliant windows and produce aggregate-only outputs. Surface coverage is
strong for the high-volume taxonomy surfaces: GLEAN_BOT_ACTIVITY,
AUTOCOMPLETE, SEARCH, CHAT, AI_ANSWER, GLEANBOT, and AGENT sub-surfaces.

The data is not yet sufficient for full V4 economic interpretation because:

- verification and feedback signals are not surfacing in the current outputs,
- the follow-up trust availability probe confirms signal volume exists, but
  parent-surface attribution is not clean enough for a governed trust readout,
- reusable workflow / named workflow leverage remains unresolved,
- MCP usage is highly unstable across windows,
- approved organizational metadata joins were not included in this run,
- Depth Repertoire is useful as aggregate caveat/context but is not promoted
  for economic confidence bands.

Missing evidence is treated as a data readiness gap, not as low readiness.

## Overall Glean AI Scale Readiness Portfolio

Current status: `CAVEAT_READY_ONLY`

The evidence supports a limited internal conclusion:

> Glean shows broad, repeated AI use across many surfaces, but the current V4
> evidence is not yet complete enough to support economic value readouts.

The portfolio can safely organize findings into readiness, enablement, workflow
design, trust calibration, adoption expansion, and hold zones. It should not yet
drive customer-facing recommendations, economic values, or automated decisions.

## Surface-Level Readiness

Surface taxonomy enforcement appears usable for dogfood analysis. The dominant
surfaces were stable across windows:

| Surface | Window 1 Events | Window 2 Events | Window 3 Events | Readout |
| --- | ---: | ---: | ---: | --- |
| standalone:GLEAN_BOT_ACTIVITY | 571,640,204 | 567,723,325 | 568,276,353 | Stable high-volume conversational work |
| standalone:AUTOCOMPLETE | 250,514,779 | 239,840,830 | 223,796,441 | Stable high-volume embedded assist |
| standalone:SEARCH | 228,417,770 | 200,132,240 | 174,555,863 | Stable but declining retrieval volume |
| workflow:CHAT | 90,572,206 | 73,088,714 | 55,789,452 | Stable core workflow, declining volume |
| workflow:agent:ephemeral | 10,415,895 | 10,191,547 | 8,314,576 | Stable exploratory agent use |
| workflow:AI_ANSWER | 5,646,132 | 6,462,701 | 7,412,444 | Increasing retrieval workflow use |
| workflow:GLEANBOT | 4,269,207 | 3,562,846 | 3,013,927 | Stable but declining conversational bot use |

MCP usage should remain held as a stable V4 signal until rollout or query
coverage is understood:

| Surface | Window 1 Events | Window 2 Events | Window 3 Events | Readout |
| --- | ---: | ---: | ---: | --- |
| standalone:MCP_USAGE | 9,625,802 | 139,675 | 0 | Unstable; do not promote yet |

## Depth Repertoire vs Velocity Interpretation

Current status: `PROMOTE_SCALE_READINESS_CONTEXT`

Depth Repertoire is the most promising V4 depth candidate from this run. It
captures whether aggregate AI use spans multiple surfaces and returns to those
surfaces repeatedly.

| Window | Cohort Size | Repertoire p50 / p90 / p99 | Repeat p50 / p90 / p99 | Depth Candidate p50 / p90 / p99 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 2,238,571 | 2 / 6 / 9 | 2 / 5 / 8 | 4 / 30 / 64 |
| 2 | 2,222,551 | 2 / 6 / 8 | 1 / 5 / 7 | 3 / 28 / 63 |
| 3 | 2,219,505 | 1 / 6 / 8 | 1 / 5 / 7 | 1 / 25 / 63 |

The p90 and p99 distribution shape is stable enough to be useful as aggregate
context. The p50 moves downward in older windows, so Depth Repertoire should not
yet drive eligibility, confidence bands, or economic value ranges.

Depth Repertoire does appear to explain something Velocity alone does not:
Velocity shows how much and how often a surface is used, while Depth Repertoire
shows whether use is spreading across surfaces and repeating across that
repertoire. That distinction is useful for scale readiness, but it is still a
research signal.

The practical impact path is intervention selection, not economic calculation:

| Pattern | Useful action question | Economic bridge posture |
| --- | --- | --- |
| High Velocity + high Depth Repertoire | Where is AI use integrated enough to scale playbooks? | Candidate value investigation |
| High Velocity + low Depth Repertoire | Where is adoption active but shallow? | Enablement or workflow redesign before value claim |
| Low Velocity + high Depth Repertoire | Where is focused use potentially meaningful despite lower volume? | Business-context review before scale decision |
| Unstable Depth Repertoire | Where is evidence too noisy? | Hold economic interpretation |

This is the bridge we should use next. Depth Repertoire helps decide where to
investigate value, but it must not itself become a dollar estimate,
productivity measure, maturity label, or comparative evaluation mechanism.

Depth Repertoire should now be carried into the V4 decision model with these
bounded classifications:

| Classification | Evidence pattern | Action posture |
| --- | --- | --- |
| Integrated Repertoire | Stable cross-surface repertoire and repeat use | Candidate value investigation |
| Active But Shallow | Strong activity with weak repertoire or repeat depth | Enablement or workflow redesign first |
| Focused Integration | Lower activity with coherent repeated repertoire | Business-context review before scaling |
| Unstable / Insufficient | Window movement, sparse evidence, or suppression | Hold economic interpretation |

These classifications are action postures. They do not compare groups, label
people, or create economic values.

## User-Level Computation Boundary

Depth Repertoire requires per-user computation inside BigQuery or the
customer-side transformer. That is acceptable only if the per-user rows remain
inside the governed boundary and are reduced to aggregate distributions before
anything crosses into FluencyTracr.

Allowed:

- compute per-user surface repertoire inside BigQuery,
- compute per-user repeat-use counts inside BigQuery,
- assign users to aggregate segments inside the customer or Glean boundary,
- emit cohort percentiles, bucket counts, suppression status, and aggregate
  segment distributions.

Not allowed:

- exporting user-level rows into FluencyTracr,
- storing user identifiers, emails, names, or stable hashed user IDs,
- treating anonymized user rows as safe product inputs,
- ranking individuals, teams, departments, managers, or customers.

The safer framing is not "capture individuals and anonymize them." The safer
framing is "compute individual statistics privately, then emit only aggregate
distributions." Hashing or anonymization can still create re-identification risk
when combined with sparse behavior patterns, so it should not be the product
boundary.

## Trust Calibration Findings

Current status: `HOLD_FOR_ATTRIBUTION_REFINEMENT`

The first three-window outputs showed `verification_rate = 0.0` across the
major surfaces. A follow-up trust signal availability probe confirms that this
does not mean trust behavior is absent. Verification and feedback event volume
is present in the export.

Aggregate signal counts from the trust probe:

| Signal | Window 1 | Window 2 | Window 3 | Readout |
| --- | ---: | ---: | ---: | --- |
| CHAT_CITATION_CLICK | 1,211,558 | 127,143 | 248,304 | Present, but joins primarily through SEARCH token paths |
| CHAT_CITATIONS | 281,920 | 439,811 | 289,950 | Present, but weak direct parent joins |
| CHAT_FEEDBACK | 312,589 | 313,122 | 243,439 | Present, but broad aliasing creates multi-surface joins |
| AI_ANSWER_VOTE | 3,422 | 3,643 | 4,424 | Present, but joins primarily through SEARCH token paths |
| AI_SUMMARY_VOTE | 320 | 393 | 501 | Present, partial AI_SUMMARY / SEARCH joins |
| SEARCH_FEEDBACK | 2,616 | 3,158 | 8,675 | Present, partial SEARCH joins |

An AGENT-focused follow-up probe confirmed that `CHAT_FEEDBACK` carries
thumbs-style values and AGENT-related join fields. In the March 23-May 22,
2026 window, the aggregate probe found 43,070 AGENT-related upvote events and
33,257 AGENT-related downvote events across `UPVOTE`, `DOWNVOTE`, and
`MANUAL_FEEDBACK` rows. The same probe found `chatfeedback.agentid`,
`chatfeedback.runid`, `chatfeedback.workflowid`, `chatfeedback.chatsessionid`,
and `chatfeedback.sessiontrackingtoken` paths. This is enough to treat AGENT
feedback as a promising trust-evidence availability signal, but not enough to
promote Trust Calibration until strict one-parent attribution is validated.

The correct conclusion is:

> Trust signals exist, but the current attribution logic is not precise enough
> to score, rank, or interpret trust behavior.

Trust Calibration remains blocked until verification and feedback joins are
validated with stricter parent-surface attribution. It may become a data
readiness/caveat input before it becomes a governed V4 readout.

Trust evidence should be carried forward with these classifications:

| Classification | Evidence pattern | Action posture |
| --- | --- | --- |
| Trust Evidence Available | Verification or feedback volume exists | Continue attribution testing |
| Attribution Hold | Signal volume exists but parent joins are noisy | Use as caveat only |
| Parent Attribution Ready | Signals attach to exactly one governed parent surface | Eligible for Trust Calibration review |
| Trust Calibration Ready | Attribution is stable and risk context is available | Future governed readout candidate |

Current classification: `Attribution Hold`.

When trust attribution is held, V4 should fall back to existing V1/V2 behavior
signals: completion, abandonment, recovery, verification presence where already
valid, Quality Multiplier, and Reliability Factor. Those signals are already
inside the governed behavior layer and should carry the trust caveat until
strict attribution is ready.

## Reusable Leverage Status

Current status: `HOLD`

No `workflow:agent:workflow_named` rows appeared in the three-window outputs.
This does not prove named reusable workflows are absent. Earlier diagnostics
showed that AGENT snapshot joins are healthy, but the expected name/reuse
metadata is not observable through the current export path.

New internal evidence changes the likely observability path for Skills. Skills
usage appears to be measured today through agent span skill-read telemetry,
including legacy skill-name inputs where present and shell-based
`jsonPayload.action.skill_reader_attributes.skill_name` reads. That means the current
absence of named workflow rows in GCE outputs should be treated as a path
mismatch, not as evidence that Skills or reusable patterns are absent.

The usage layer is BigQuery: raw `scrubbed_agentspan_*` tables and the dbt
`action_runs_v2` / `action_runs` fact tables with `skill_reader_skill_name`.
The `skills/`, `plugin_skills/`, PluginSkillStore, and UGC
`ListAccessibleSkills` paths are definition, eligibility, and catalog layers.
They may matter later for governed identity and access metadata, but they should
not be confused with the usage fact source.

The updated research state is:

```text
SKILL_READ_EVIDENCE_AVAILABLE_BUT_NOT_YET_GOVERNED
```

The three-window skill-read availability run confirms meaningful usage volume:

| Window | Skill read rows | Group-level distinct specified skill-name count | Parent join key share |
| --- | ---: | ---: | ---: |
| 2026-03-23 to 2026-05-22 | 1,473,686 | 85 | 100.00% |
| 2026-02-21 to 2026-04-22 | 601,178 | 78 | 99.27% |
| 2026-01-22 to 2026-03-23 | 145,477 | 18 | 96.35% |

No unspecified skill-read rows appeared in this diagnostic. That is a strong
availability result. The distinct-name column is an aggregate cardinality check
only; it does not emit skill names or support per-skill ranking. The diagnostic
also shows sharp window-to-window growth, so the signal is not yet stable
enough to infer reusable leverage maturity or automation spread.

This does not yet promote reusable leverage. The agent-span path still needs
fixed-window validation for unspecified skill reads, parent workflow/action
joins, canonical skill identity, versioning, invocation mode, and separation of
personal, shared, and org Skills. Until that is proven, Skill Read Evidence can
serve only as a data-readiness finding and candidate V4 research input.

Known logging caveats remain: native/platform skill coverage depends on the
skill-reader enum and mapping, UGC/user-created Skills are not yet logged by
canonical ID, and Plugin/MCP `find_skills` usage may not generate repeat
skill-reader spans after download.

Reusable Workflow Propagation and Named Workflow Leverage remain held until
metadata observability is resolved.

Reusable leverage should be carried forward with these classifications:

| Classification | Evidence pattern | Action posture |
| --- | --- | --- |
| Workflow Metadata Hold | GCE workflow metadata does not expose named/reuse fields reliably | Do not interpret reusable workflow spread |
| Skill Read Evidence Available | Agent span logs show skill-read availability | Run aggregate availability tests |
| Skill Read Ungoverned | Reads are name-based, unspecified, or lack governed identity | Caveat only |
| Governed Reuse Ready | Canonical identity, version, invocation mode, and stable joins exist | Future reuse-depth candidate |

Current classification: `Skill Read Evidence Available`, with reusable leverage
still held until the agent-span path proves governed identity and join coverage.

## Quality And Reliability Findings

The taxonomy / Quality Multiplier / Reliability Factor export produced stable
aggregate coverage across the major surfaces. Most high-volume workflow surfaces
show high completion rates.

The clearest workflow-design watch areas are:

- `workflow:UNSPECIFIED`, which showed elevated abandonment in windows 1 and 2,
- `workflow:agent:autonomous`, which showed higher abandonment than ephemeral
  agent use across all three windows,
- `workflow:AGENT_LIVE_PREVIEW`, which showed lower completion and higher error
  rate in window 1.

These are workflow-design investigation areas, not performance conclusions.

## Economic Impact Bridge Findings

Current status: `PROMOTE_INVESTIGATION_ROUTING_ONLY`

The run supports economic questions, not economic claims.

Safe questions:

- Which high-volume surfaces may warrant value investigation?
- Where could workflow friction consume capacity?
- Where does broad repeated use suggest scale readiness?
- Where does missing trust evidence weaken any value claim?
- Which surfaces require better metadata before reusable leverage can be
  evaluated?

Not supported:

- ROI,
- guaranteed savings,
- causal productivity lift,
- Time-Saved Defensibility Range productization,
- customer-facing economic value readouts.

The Economic Impact Bridge may be used internally as investigation routing:

| Evidence pattern | Investigation route |
| --- | --- |
| Integrated Repertoire + stable Velocity + low friction | Candidate value investigation |
| Active But Shallow + high activity | Enablement or workflow redesign before value investigation |
| Focused Integration + lower activity | Business-context review before scale decision |
| Trust Attribution Hold | Trust caveat blocks strong value claim |
| Reusable Leverage Hold | Do not claim automation playbook spread |
| Suppressed or unstable evidence | Hold economic interpretation |

This routing is the usable V4 impact layer today. It tells AIOMs and value
realization PMs where to investigate, where to intervene, and where to hold. It
does not produce a defensibility range or dollar estimate.

## Evidence Gaps

Remaining blockers:

- verification and feedback signal joins,
- strict trust-signal parent attribution,
- named reusable workflow metadata observability,
- MCP stability explanation,
- aggregate organizational segmentation,
- customer-attested Outcome Evidence.

## Recommended Enablement Actions

Internal dogfood actions that are safe from the current evidence:

- use the AI Scale Readiness Portfolio as the organizing readout,
- use Depth Repertoire as the scale-readiness context layer,
- investigate high-volume workflow-design friction areas,
- prioritize Trust Calibration signal joins,
- keep reusable leverage held until metadata observability is solved,
- defer economic value ranges until the evidence gaps close.

Recommendations must not compare people, managers, teams, departments, or
customers.

## What Remains Blocked

Blocked until a later decision promotes:

- Organizational Segmentation aggregate contract,
- Economic Impact Bridge runtime support beyond investigation routing language,
- Trust Calibration product work,
- V4 economic APIs,
- customer-facing V4 readouts,
- Time-Saved Defensibility Range productization,
- automated recommendations,
- ROI range engine.

## Recommended Decision

Recommended current V4 decision:

`PROMOTE_AI_SCALE_READINESS_WITH_DEPTH_REPERTOIRE_CONTEXT`

Supporting decisions:

- Depth Repertoire: `PROMOTE_SCALE_READINESS_CONTEXT`,
- Trust Calibration: `HOLD_FOR_ATTRIBUTION_REFINEMENT`,
- Reusable Workflow Leverage: `HOLD_FOR_GOVERNED_IDENTITY_AND_JOIN_COVERAGE`,
- Economic Impact Bridge: `PROMOTE_INVESTIGATION_ROUTING_ONLY`.

The next durable artifact is the internal readout contract in
[scale-readiness-portfolio.md](../contracts/value-confidence/scale-readiness-portfolio.md).
