# AI Work Evidence Pilot Package

## 1. Purpose

This package turns the org-agnostic AI Work Evidence concept into a bounded
commercialization pilot shape. It is a docs/template-only package for
source-neutral discovery, customer-side aggregate transformation, and executive
readiness conversations.

It does not add runtime schemas, endpoints, SQL, ingestion, UI, canonical
events, suppression reasons, tunable thresholds, customer-facing economic
outputs, ROI calculation, individual scoring, no team ranking, manager ranking,
survey joins, HR-system assumptions, enablement-system assumptions, training
record assumptions, or person-level employee data.

## 2. Pilot Inputs

Use these templates before any live customer pilot. Every field should be
answered with aggregate-safe metadata, `not_available`, or `not_approved`.

### Source coverage template

| Field | Required answer |
| --- | --- |
| Source system | Customer-approved source label, not a universal FluencyTracr ontology. |
| Available AI surfaces | Aggregate surface families the source can report. |
| Unavailable AI surfaces | Known surface families not covered by this source. |
| Workflow key availability | Whether opaque workflow keys exist and how they avoid person-level identity. |
| Verification signal availability | Available citation, feedback, approval, rejection, correction, recovery, escalation, reuse, accepted-output, abandoned-output, or attestation signals. |
| Join readiness | Aggregate unresolved join rate or `not_available`. |
| Missing metadata readiness | Aggregate missing metadata rate or `not_available`. |
| Suppression readiness | Whether existing fail-closed gates can run independently per approved slice. |
| Not-computed lanes | Any lanes that must produce hold language. |
| Interpretation approval | Customer-approved interpretation boundary for this source family. |

### Surface mapping template

| Field | Required answer |
| --- | --- |
| Source-local surface name | Local source label retained in the adapter. |
| Source-neutral surface ID | `workflow:<surface_id>`, `standalone:<surface_id>`, `attribute:<signal_id>`, or `corroborative:<telemetry_id>`. |
| Surface role | Primary work surface, parent attribute, or corroborative context. |
| Work mode | Source-neutral work mode, if approved. |
| Parent relationship | Parent workflow, surface, session, or aggregate key, if applicable. |
| Volume eligibility | Whether it may contribute surface volume. |
| Hold condition | Why this surface must hold when mapping or coverage is incomplete. |

### Workflow template

| Field | Required answer |
| --- | --- |
| Opaque workflow key | Non-identifying aggregate workflow key. |
| Workflow description | Business-readable aggregate task pattern. |
| Source family | Source adapter that emits the aggregate evidence. |
| Window | Approved analysis window. |
| Eligible surfaces | Source-neutral surfaces attached to the workflow. |
| Trust evidence available | Trust and verification signals available for the workflow. |
| Suppression status | `SURFACE`, `SUPPRESS`, or `not_computed` with existing suppression reason where applicable. |
| Blocked interpretation | Claims that must not be made from this workflow. |

### Approved aggregate segment template

| Field | Required answer |
| --- | --- |
| Segment label | Customer-approved aggregate label. |
| Segment type | Organization-window, workflow, surface, `jbtd_id`, `persona_id`, function, role-family, Velocity band, or Depth Repertoire band. |
| Approval basis | Customer-approved aggregate use, or `not_approved`. |
| Minimum cohort check | Existing fail-closed cohort-size gate result. |
| Re-identification risk note | Why the label is coarse enough for aggregate interpretation. |
| Excluded fields | Person-level fields that were not sent to FluencyTracr. |
| Interpretation boundary | What this segment can and cannot support. |

Role-family and function segments are optional. They must be customer-approved,
coarse, aggregate-safe, and supplied as labels only. FluencyTracr must not
request or infer raw HR data, titles, manager chains, directory records,
employee IDs, emails, user IDs, person-level rows, survey responses, training
records, or enablement-system access.

### Customer-declared intervention template

| Field | Required answer |
| --- | --- |
| Intervention ID | Customer-declared aggregate event identifier. |
| Intervention family | Declared rollout, workflow redesign, prompt/template/playbook rollout, reusable workflow packaging, agent deployment, trust-loop repair, verification instrumentation, source coverage repair, or policy/governance change. |
| Declared date or window | Customer-declared timing. |
| Affected aggregate slice | Approved workflow, surface, or segment. |
| Pre/post review eligibility | Whether Causal Delta-style review is allowed by windows and gates. |
| Caveats | Missing evidence, hold states, or blocked interpretations. |
| Causality status | Always `not_proven` unless a separate customer-owned study exists outside FluencyTracr. |

Interventions must be declared by the customer or source owner. FluencyTracr
must not infer interventions from enablement-system activity, training records,
survey answers, calendar data, HR data, or person-level behavior.

### Outcome evidence template

| Field | Required answer |
| --- | --- |
| Outcome label | Customer-owned aggregate KPI label. |
| Metric definition owner | Customer owner of the KPI definition. |
| Aggregate slice | Approved workflow, surface, or segment. |
| Window | Customer-approved KPI window. |
| Measurement grain | Aggregate grain only. |
| Directional interpretation | Customer-owned statement of whether higher or lower is desirable. |
| FluencyTracr use | Context only; does not change suppression verdicts. |
| Blocked claims | No causality, attribution, ROI, dollar value, hours saved, or productivity lift. |

### Value hypothesis template

| Field | Required answer |
| --- | --- |
| Hypothesis ID | Source-neutral identifier. |
| Value type | `ACCELERATION`, `QUALITY_PREMIUM`, `NET_NEW`, or `UNCLASSIFIED`. |
| Evidence basis | Aggregate behavior evidence and source coverage basis. |
| Missing evidence | Trust, verification, source coverage, outcome evidence, or assumptions still missing. |
| Required outcome evidence | Customer-owned KPI evidence needed for a stronger claim. |
| Required customer assumptions | Assumptions the customer must own outside FluencyTracr. |
| Stakeholder evidence needs | What AIOM, value-realization, CIO, or business owners need next. |
| Blocked claims | Claims FluencyTracr will not make. |

## 3. Synthetic Pilot Readout Shape

Use three to five aggregate examples. The example names below are placeholders,
not canonical taxonomies.

| Example | Evidence zone | Strategy posture | What can be said | What is missing | Blocked claims |
| --- | --- | --- | --- | --- | --- |
| Support resolution workflow | `SCALE_CANDIDATE` | `SCALE_AND_MEASURE` | Aggregate work pattern is stable enough for a customer-owned scale-and-measure review. | Customer-owned resolution-time KPI and assumption ledger. | ROI, savings, causality, productivity, team comparison. |
| Research synthesis workflow | `TRUST_EVIDENCE_GAP` | `REPAIR_TRUST_LOOP` | Usage exists, but verification evidence is insufficient for confident interpretation. | Citation inspection, approval/rejection, or correction coverage. | User trust level, employee fluency, quality lift. |
| Reusable agent rollout | `SHALLOW_ADOPTION` | `COACH_OR_REDESIGN` | Activity exists, but work integration or reliability evidence is weak. | Declared rollout context, source coverage, and recovery evidence. | Agent ROI, adoption success, employee performance. |
| Specialist drafting workflow | `FOCUSED_EXPERT_USE` | `STUDY_AND_PACKAGE` | A narrow aggregate pocket may be worth customer review. | Approved packaging hypothesis and outcome evidence. | Best team, best role, manager comparison. |
| Incomplete source family | `INSTRUMENTATION_HOLD` | `FIX_INSTRUMENTATION` | Interpretation is blocked by source coverage or key alignment. | Surface mapping, join readiness, or missing metadata evidence. | Negative adoption or readiness conclusion. |

Each example must include:

- source coverage status;
- approved aggregate slice;
- suppression or hold status;
- intervention context if customer-declared;
- trust and verification evidence available;
- outcome evidence available or missing;
- value hypothesis and blocked claims.

## 4. Glean Adapter Example

Glean remains the first adapter example, not the core model.

| Glean artifact | Adapter role | Core primitive it maps to | Boundary |
| --- | --- | --- | --- |
| `docs/contracts/glean-ai-work-evidence/README.md` | Glean source adapter contract | Surfaces, workflows, trust signals, source coverage | Glean labels and readiness language stay adapter-local. |
| `docs/contracts/glean-value-evidence/README.md` | Glean value-evidence pack | Outcome evidence, value hypotheses, blocked claims | Glean claim examples do not become universal claims. |
| `docs/contracts/glean-claim-registry/README.md` | Glean claim inventory | Value hypothesis registry | Claim IDs remain Glean-specific. |
| `docs/contracts/glean-assumption-ledger/README.md` | Glean assumption record | Customer-owned assumptions | Assumptions remain customer/source-owned context. |
| `sql/dogfood/` | Glean dogfood diagnostics | Internal validation evidence | SQL is not a productized source-neutral contract. |
| `dogfood-output/` | Retained dogfood readouts | Internal examples and calibration context | Dogfood values must not become defaults or thresholds. |

For a pilot demo, translate Glean examples into the source-neutral templates
first. Do not present Glean surface names, Glean Agent states, Skill Read
Evidence, Glean Time-Saves, or Glean-specific readiness labels as the
FluencyTracr ontology.

## 5. Live Pilot Readiness Checklist

A live customer pilot is not ready unless all of the following are true:

- customer-side aggregate transformation is approved;
- only aggregate distributions and approved labels leave the customer/source
  boundary;
- source coverage is declared before interpretation;
- unavailable and not-computed lanes produce hold language;
- approved segments are coarse enough to avoid re-identification;
- role-family or function context is optional, customer-approved, and
  aggregate-safe;
- interventions are customer-declared events, not inferred from system access;
- outcome metrics are customer-owned aggregate KPIs;
- suppression gates run independently per approved slice;
- blocked claims are included in every readout.

## 6. Stop Conditions

Stop the pilot package and return to governance review if any proposed path
requires:

- new canonical events;
- new suppression reasons;
- tunable thresholds;
- admin overrides;
- person-level rows or identifiers;
- individual scoring;
- employee, team, manager, department, customer, or skill ranking;
- raw prompts, raw responses, transcripts, query text, file contents, tool
  payloads, or action rows;
- HR, directory, enablement-system, training-record, survey, or stated-evidence
  joins;
- ROI calculation, dollars, hours saved, productivity lift, causality,
  prediction, or customer-facing V4 economic claims.
