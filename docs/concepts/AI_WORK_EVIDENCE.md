# AI Work Evidence

## 1. Purpose

This document defines AI Work Evidence as the org-agnostic core layer for
FluencyTracr commercialization. It separates reusable aggregate evidence
primitives from source-specific adapters such as the current Glean dogfood and
value-evidence work.

AI Work Evidence answers:

```text
What aggregate AI work patterns can an organization safely interpret, what
intervention do they support, and what evidence is still missing?
```

It does not answer:

```text
Which people, teams, departments, managers, customers, or skills perform best?
How many dollars did AI create?
```

This concept is documentation-stage only. It adds no canonical events,
suppression reasons, thresholds, schemas, APIs, storage, frontend surfaces,
economic readouts, customer-facing claims, or productized V4 behavior.

## 2. Current Glean Adapter Boundary

The recent Glean work is useful proof, but it must remain an adapter and
dogfood path rather than the universal FluencyTracr ontology.

Glean-specific adapter and dogfood artifacts include:

- `docs/integrations/glean/`;
- `docs/contracts/glean-*`;
- `sql/dogfood/` diagnostics that read Glean warehouse tables;
- `dogfood-output/` retained Glean dogfood CSVs and readouts;
- Glean surface names, Glean Agent labels, Skill Read Evidence, and
  Glean-specific claim templates;
- examples that use Glean Time-Saves, Glean Value Evidence, or Glean claim
  readiness language.

Reusable FluencyTracr primitives include:

- the nine canonical events;
- the five suppression reasons;
- fail-closed `SURFACE` / `SUPPRESS` verdicting;
- customer-side aggregate ingest;
- surface taxonomy;
- work mode taxonomy;
- Velocity;
- Depth and Depth Repertoire as aggregate context where governance allows;
- Quality Multiplier;
- Reliability Factor;
- Causal Delta;
- Outcome Evidence;
- AI Scale Readiness;
- Organizational Segmentation;
- Economic Impact Bridge;
- V4 value-hypothesis and strategy-routing language.

Mixed artifacts that need clearer separation include:

- V4 strategy-routing research, which is reusable as a source-neutral action
  grammar but currently uses Glean dogfood inputs such as Glean Agent and Skill
  Read signals;
- V4 Velocity x Depth zone diagnostics, which demonstrate reusable aggregate
  evidence zones but are currently backed by Glean warehouse tables and fixed
  dogfood windows;
- Glean AI Work Evidence and Glean Value Evidence contracts, which contain
  useful adapter structure but also embed Glean-specific claim language,
  readiness labels, and source assumptions;
- README and value-realization overview language, which should keep Glean as
  the first adapter example without making Glean the core ontology.

Future source adapters should map their local telemetry into the AI Work
Evidence core. The core must not inherit Glean-only names, source assumptions,
claim IDs, surface availability, or dogfood values as universal defaults.

## 3. Core Model

### AI surfaces

AI surfaces are governed, user-initiated AI work interactions. They should use
source-neutral labels such as:

- `workflow:<surface_id>` for first-class workflow surfaces;
- `standalone:<surface_id>` for first-class non-workflow surfaces;
- `attribute:<signal_id>` for verification or feedback signals that join to a
  parent surface without adding surface volume;
- `corroborative:<telemetry_id>` for infrastructure or UI telemetry that may
  enrich parent interpretation but cannot surface independently.

The source adapter owns local mapping from product event names to these
governed surface IDs. AI Work Evidence owns the interpretation boundary.

### Workflows

Workflows are aggregate work patterns, not application event names. A workflow
may represent a recurring task, a source-defined workflow run, a reusable
automation, a conversational task path, or a business-owned process.

Workflow keys must be opaque and non-identifying. Built-in taxonomies for
JBTD, persona, function, customer, team, or skill are not part of the core
model. Approved customer or source adapters may provide safe aggregate labels
only after local governance review.

### Cohorts and approved segments

Cohorts are approved aggregate slices. They may include:

- organization-window;
- workflow;
- surface;
- `jbtd_id`;
- `persona_id`;
- customer-approved function or role-family context, only when coarse enough to
  be aggregate-safe;
- behavior-derived Velocity band;
- behavior-derived Depth Repertoire band.

AI Work Evidence must not assume access to HR systems, directory exports,
enablement systems, training records, surveys, stated-evidence joins, or
person-level employee data. If a customer approves role-family or function
context, FluencyTracr may receive only aggregate distributions and safe segment
labels. Raw HR data, raw directory records, raw titles, manager chains,
employee IDs, emails, user IDs, and person-level usage rows must remain outside
FluencyTracr.

Every cohort gates independently. A suppressed slice must not be rescued by a
broader org-level aggregate.

### Role families and functions

Role families and functions are intervention contexts, not performance groups.
They are optional, customer-approved aggregate labels that help answer where
workflow redesign, trust calibration, source coverage repair, or a declared
intervention review may be needed.

Allowed interpretation:

- "This approved aggregate function has a trust-evidence gap."
- "This role-family band needs workflow redesign review."
- "This segment is suppressed and cannot be interpreted."

Blocked interpretation:

- "This team is better at AI."
- "This manager's group is underperforming."
- "This department has lower productivity."
- "This role family should be ranked."

### Interventions

Interventions are customer-declared changes that may explain future aggregate
movement. The core model should recognize intervention context without turning
it into causal proof and without inferring interventions from system access.

Allowed intervention families include:

- customer-declared enablement, training, or rollout event;
- workflow redesign;
- prompt, template, or playbook rollout;
- reusable workflow or Skill packaging;
- agent deployment;
- trust-loop repair;
- verification or feedback instrumentation;
- source coverage repair;
- policy or governance change.

Intervention records should support Causal Delta-style pre/post review only
when windows, cohorts, and caveats are explicit. They must not imply
statistical causality by default. FluencyTracr must not infer interventions
from enablement-system access, training records, survey responses, stated
evidence, or person-level activity.

### Trust and verification signals

Trust and verification signals strengthen or caveat parent evidence. They are
not standalone surface volume.

Allowed signal classes include:

- citation or source inspection;
- feedback;
- approval or rejection;
- correction;
- recovery;
- escalation;
- reuse;
- accepted output;
- abandoned output;
- downstream outcome attestation.

These signals should join to parent workflow, surface, session, or aggregate
keys only through governed adapter logic. Missing trust signal coverage is a
source readiness gap, not proof that users did not verify.

### Source coverage

Every AI Work Evidence readout needs source coverage. Coverage should report:

- available surface families;
- unavailable surface families;
- verification signal availability;
- unresolved join rate;
- missing metadata rate;
- suppressed slice count;
- not-computed lanes;
- whether interpretation is approved for the source family.

Missing source coverage must produce hold or instrumentation language, not
negative readiness claims.

### Outcome evidence

Outcome Evidence remains customer-attested aggregate KPI context. It can be
attached to workflow, segment, and window, but it does not change a suppressed
verdict and does not prove correlation, causation, attribution, dollar value,
hours saved, or productivity lift.

Valid outcome examples include aggregate cycle time, rework rate, review-pass
rate, support resolution time, escalation rate, quality score, or customer
experience KPI. The customer owns the metric definition and any economic model
that later uses it.

### Value hypotheses

Value hypotheses route investigation after governed behavior evidence exists.
They use AIVM language:

- `ACCELERATION`;
- `QUALITY_PREMIUM`;
- `NET_NEW`;
- `UNCLASSIFIED`.

A value hypothesis must include:

- evidence basis;
- missing evidence;
- required outcome evidence;
- required customer-owned assumptions;
- stakeholder evidence needs;
- blocked claims.

No value hypothesis may include dollars, ROI, guaranteed savings, causality,
prediction, productivity lift, or ranking language.

## 4. Org-Agnostic Readout Grammar

AI Work Evidence should preserve the existing V4 strategy grammar while making
the ontology source-neutral:

| Evidence zone | Strategy posture | Source-neutral meaning |
| --- | --- | --- |
| `SCALE_CANDIDATE` | `SCALE_AND_MEASURE` | Aggregate work pattern is stable enough for scale-and-measure review. |
| `SHALLOW_ADOPTION` | `COACH_OR_REDESIGN` | Activity exists, but work integration or reliability is weak. |
| `FOCUSED_EXPERT_USE` | `STUDY_AND_PACKAGE` | A narrower aggregate pocket shows integrated use worth business review. |
| `TRUST_EVIDENCE_GAP` | `REPAIR_TRUST_LOOP` | Behavior exists, but verification or feedback attribution blocks interpretation. |
| `INSTRUMENTATION_HOLD` | `FIX_INSTRUMENTATION` | Source coverage, key alignment, or metadata is too incomplete. |
| `SUPPRESSED` | `HOLD_NO_INTERPRETATION` | Existing gates block interpretation. |

These are action postures, not scores or automated recommendations.

## 5. Commercialization Path

The safest next commercialization package is an org-agnostic AI Work Evidence
pilot package:

1. Define source-neutral intake templates for surfaces, workflows, approved
   segments, source coverage, interventions, outcome evidence, and assumptions.
2. Keep Glean as the first adapter example, not the core model.
3. Produce a synthetic or sanitized team-demo artifact using three to five
   aggregate examples that each show evidence zone, intervention posture,
   missing evidence, blocked claims, and pilot prerequisites.
4. Require customer-side aggregate transformation for any live customer pilot.
5. Keep monetary interpretation blocked until customer-owned outcome evidence,
   assumptions, and governance approval exist.

## 6. Non-Goals

AI Work Evidence does not permit:

- individual scoring;
- employee attribution;
- user-identifiable fields;
- raw prompts, outputs, transcripts, query text, file contents, tool payloads,
  or action rows;
- raw HR data, employee IDs, emails, names, titles, manager chains, or
  person-level usage rows;
- enablement-system, training-record, survey, stated-evidence, or HR-system
  assumptions;
- survey or stated-evidence joins until that evidence exists and a separate
  governance decision approves it;
- no team ranking;
- no manager ranking;
- no department ranking;
- no customer ranking;
- no skill ranking;
- productivity measurement;
- maturity scoring;
- Glean-only ontology in core contracts;
- new canonical events;
- new suppression reasons;
- tunable thresholds;
- admin suppression overrides;
- ROI calculation;
- guaranteed savings;
- causal productivity lift;
- prediction claims;
- customer-facing V4 economic readouts from dogfood evidence.

## 7. Relationship To Source Adapters

Each source adapter should provide:

- local source-to-surface mapping;
- local source-to-work-mode mapping where needed;
- aggregate cohort and segment outputs;
- source coverage and hold states;
- verification and trust attribution logic;
- outcome evidence templates if available;
- adapter-specific examples and claim templates.

The adapter must not redefine the core invariants. If an adapter cannot map a
source safely, it should emit `not_computed`, `suppressed`, or source-coverage
hold language rather than inventing a new core concept.

## 8. Governance Invariants Preserved

AI Work Evidence preserves all nine invariants:

1. No new canonical events.
2. No new suppression reasons.
3. No tunable thresholds.
4. No admin overrides.
5. No individual scoring or identifiers.
6. Default verdict is `SUPPRESS`.
7. Latency remains corroborative only.
8. Future implementation must keep the Assurance Harness green.
9. Each workflow, surface, cohort, segment, and approved slice gates
   independently.

## 9. Pilot Package

The bounded pilot package is documented in
`docs/integrations/value-realization/AI_WORK_EVIDENCE_PILOT_PACKAGE.md`.

`org-agnostic-ai-work-evidence-pilot-package`

Bound:

- create docs-only pilot templates for source coverage, approved segments,
  interventions, outcome evidence, and value hypotheses;
- map the existing Glean Value Evidence and dogfood readouts into adapter
  examples;
- do not add runtime schemas, endpoints, SQL, UI, ingestion, or customer-facing
  economic output;
- verify with docs contract sweep, governance gates, linkcheck, and whitespace
  checks.

Acceptance criteria:

- the core model is source-neutral;
- Glean is documented as an adapter example;
- non-goals are explicit;
- live customer use remains blocked until aggregate source templates and
  customer-side transformer approval exist.
