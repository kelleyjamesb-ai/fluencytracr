# Skills Measurement

## 1. Purpose

This document defines the conceptual basis for measuring Skills in
FluencyTracr before any new schema, endpoint, dashboard, or production
instrumentation depends on it.

Skills Measurement exists to answer a narrow question: can Glean safely and
defensibly explain whether reusable expertise is becoming observable at the
aggregate workflow level?

It does not score skills, users, teams, creators, managers, or business units.
It is a computability and evidence-readiness concept, not a productivity
analytics concept.

## 2. The Measurement Problem

Skills are not one clean surface today. Current Glean Skills architecture has
multiple sources and resolution paths:

- platform or internal skills under `skills/`
- plugin-backed skills under `plugin_skills/`
- user-created skills
- shared or organization-managed skills
- GitHub-imported skills
- dynamically generated skills from action packs

The practical risk is that a raw "skill usage" metric can look objective while
missing an entire class of skills. For example, a path that reads only
`PluginSkillsStore` can miss skills that exist only under `skills/`, while an
Assistant discovery path based on eligible skills can miss plugin-side tool
bundling and generated skills.

Until inventory, eligibility, discovery, and invocation paths are reconciled,
FluencyTracr should not treat Skills as a value-producing metric. It should
treat Skills as a governed evidence lane that must first prove observability.

## 3. Definition: What Skills Measurement Is

Skills Measurement is an org-window, aggregate-only view of whether Skills are:

1. inventoried across known source systems
2. eligible for the right audience and launch state
3. discoverable through the relevant runtime path
4. resolved with required tool dependencies
5. activated in aggregate workflows
6. reusable across a cohort or workflow slice
7. reliable enough to support bounded reportability language

The core unit is not an individual user or an individual skill creator. The
core unit is a governed aggregate slice, such as org-window, workflow,
JBTD, persona, surface, or sub-surface, subject to existing suppression gates.

## 4. Measurement Ladder

Skills should be measured in a ladder. Higher layers are not valid unless
lower layers are known, present, and governed.

| Layer | Question | Example aggregate signals | Safe claim |
| --- | --- | --- | --- |
| 1. Inventory | What skills exist? | Count by source, owner type, import path, launch state, version state | Skills inventory is observable. |
| 2. Eligibility | Which skills could be used? | Eligible count by audience gate, launch state, org policy, user-visible scope, tool dependency gate | Skill availability can be explained. |
| 3. Discovery | Are skills surfaced in the right runtime? | Candidate set parity across Assistant discovery, slash, agents, `find_skills`, and library surfaces | Skill discovery quality is measurable. |
| 4. Activation | Are skills actually used? | Aggregate read, selected, invoked, completed, retried, abandoned, and repeated-use counts | Skills are being reused in aggregate workflows. |
| 5. Reliability | Do skill-backed workflows behave well? | Verification presence, recovery, abandonment, iteration depth, tool-resolution failure rate | Skill-backed work is operationally reliable. |
| 6. Value readiness | Can a claim be made safely? | Reportability state, caveats, unsupported lanes, suppression state, outcome-evidence adjacency | Reusable expertise is being operationalized. |

This ladder intentionally separates "available" from "used," "used" from
"reliable," and "reliable" from "valuable."

## 5. Minimum Aggregate Fields

A future Skills Measurement contract should prefer aggregate and derived fields
such as:

- `skill_source_type`: platform, plugin, user, shared, org_managed,
  github_imported, action_pack_generated
- `skill_lifecycle_state`: created, imported, enabled, disabled, shared,
  added, updated, deprecated
- `eligibility_scope`: platform, organization, audience, department, user,
  admin_only, launch_gated
- `runtime_surface`: assistant, slash, autonomous_agent, named_workflow_agent,
  plugin_runtime, library
- `tool_resolution_state`: not_required, resolved, unresolved,
  partially_resolved, gated
- `governance_state`: allowed, suppressed, disabled_by_admin,
  disabled_by_user, pending_review, security_hold
- `activation_state`: candidate, read, selected, invoked, completed, retried,
  abandoned
- `evidence_state`: present, missing, suppressed, not_computed

These fields should be emitted only as aggregate distributions or counts after
existing fail-closed gates clear.

## 6. Relationship To Existing FluencyTracr Concepts

Skills Measurement should reuse the existing `skill_lifecycle` readiness lane.
That lane already frames Skills as aggregate lifecycle metadata and rejects raw
skill instructions, prompts, responses, transcripts, file content, and direct
identifiers.

Skills Measurement may enrich these existing concepts:

- **Glean Signal Readiness Map:** records whether `skill_lifecycle` is present,
  missing, suppressed, or not computed.
- **Reportability Contract:** determines whether skills reporting claims are
  reportable, caveated, suppressed, or unsupported.
- **Value Evidence Pack:** may include Skills as a lane for reusable expertise,
  but only with required caveats.
- **Agent Types:** `agent:workflow_named` may indicate reusable Skill-backed
  workflow behavior, but it is not automatically better than autonomous or
  ephemeral agent behavior.
- **Velocity:** Skills may contribute to BREADTH only as an aggregate surface
  or sub-surface signal. Velocity remains cohort-distribution-level and
  aggregate-only.
- **Depth and Maturity:** repeated, reliable Skill-backed workflows may support
  future reuse-depth interpretation when governed by suppression and caveats.

## 7. How Skills Measurement Preserves The Governance Posture

Skills Measurement must preserve all nine invariants:

1. **No new canonical events.** Skills Measurement uses source readiness,
   aggregate lifecycle metadata, and existing behavioral signals. It does not
   add canonical observation events.
2. **No new suppression reasons.** Existing suppression reasons remain the only
   governed reasons unless a future governance review explicitly changes them.
3. **No tunable thresholds.** Any gates or percentile anchors must be compiled
   constants or governed artifacts, not admin-adjustable controls.
4. **No admin overrides.** A suppressed Skills Measurement output cannot be
   manually surfaced.
5. **No individual scoring.** No user, creator, manager, department, or team is
   scored or ranked.
6. **Default verdict is SUPPRESS.** Missing, ambiguous, low-volume, or
   unverified skills evidence remains suppressed or unsupported.
7. **Latency is corroborative only.** Skill latency can explain friction but
   cannot trigger a value claim by itself.
8. **Assurance Harness stays green.** Any implementation PR must add fixtures
   and keep the assurance harness green.
9. **Per-slice independence.** Skills evidence must suppress independently per
   governed slice; broader aggregation cannot rescue a small or risky slice.

## 8. What Skills Measurement Is Not

Skills Measurement is NOT a skill leaderboard.

Skills Measurement is NOT a skill quality score.

Skills Measurement is NOT a creator performance system.

Skills Measurement is NOT an individual productivity metric.

Skills Measurement is NOT team or manager ranking.

Skills Measurement is NOT evidence that Skills caused ROI.

Skills Measurement is NOT permission to expose skill instructions, tool
payloads, prompts, responses, transcripts, file content, or direct identifiers.

## 9. Safe Customer-Facing Language

Allowed language, when gates clear:

- "Aggregate Skill lifecycle evidence indicates reusable expertise is being
  operationalized."
- "Skill lifecycle visibility is present for this reporting window."
- "Skill-backed workflows show aggregate reuse and reliability signals with
  required caveats."

Blocked language:

- "Skills caused productivity lift."
- "Skills ROI is included in the estimate."
- "This team is better at Skills than that team."
- "This user or creator built high-value Skills."
- "Skill usage proves workflow quality."

## 10. Recommended First Implementation Slice

The first implementation slice should not be a dashboard. It should be a
contract alignment slice:

1. Define a canonical aggregate `skill_entity` inventory shape.
2. Map known source systems into that shape without storing skill contents.
3. Add parity checks for Assistant discovery, `find_skills`, slash, agent, and
   library eligibility surfaces.
4. Reconcile seeded reportability examples so `skill_lifecycle` is either
   consistently present, missing, suppressed, or not computed for each fixture.
5. Add assurance fixtures proving that raw skill instructions, prompts,
   responses, file content, and direct identifiers are rejected.

Only after this slice should FluencyTracr add activation, reliability, or
value-readiness reporting.

## 11. Open Questions

- What is the canonical stable identifier for a skill across `skills/`,
  `plugin_skills/`, user skills, GitHub imports, shared skills, and generated
  action-pack skills?
- Should `metadata.textpb` remain the canonical audience and launch-state gate
  while `glean.yaml` remains the tool dependency and bundling gate?
- Should shared-but-not-added skills be counted as visible inventory, eligible
  inventory, or excluded inventory?
- How should derived skills be treated when a chat is shared but the source
  skill is not implicitly shared?
- Which runtime path is authoritative when Assistant discovery and
  `find_skills` disagree?
- Should skill invocation remain lower-confidence than lifecycle visibility
  until triggering precision and recall evals are governed?

## 12. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. This
concept synthesizes Glean Skills architecture discussions about unified skills
storage, plugin skill resolution, user skill visibility, sharing boundaries,
and FluencyTracr's existing reportability and aggregate evidence posture.
