# AGENTS.md

## 1. Purpose

This file is the canonical context for any AI agent making changes in this repository. Read it at the start of every session before making any modifications.

## 2. What FluencyTracr Is (current positioning)

FluencyTracr is the behavioral evidence layer that makes Glean's value-realization claims defensible. It consumes GCE-shaped workflow telemetry, applies fail-closed suppression gates, and emits SURFACE or SUPPRESS verdicts on aggregate workflow patterns. It is NOT an AI fluency scoring tool, NOT a surveillance product, and NOT a replacement for Glean Insights, MUSE, or Sigma. Audience: AIOMs, value-realization PMs, CIOs.

## 3. The Nine Invariants (hard constraints - never violate)

1. No new canonical events beyond the existing nine.
2. No new suppression reasons beyond the existing five.
3. No tunable thresholds. Constants are compiled into code.
4. No admin overrides of suppression decisions.
5. No individual scoring. No user-identifiable fields anywhere in inputs, storage, or outputs.
6. Default verdict is SUPPRESS. SURFACE requires all gates clearing.
7. Latency is corroborative only, never a surfacing trigger.
8. Every PR must keep the Assurance Harness CI workflow green.
9. Suppression gates apply independently per slice (workflow_id, jbtd_id, persona_id) - no cross-slice aggregation that could re-identify.

## 4. Canonical Events (the nine, locked)

### V1 foundation (six, preserved)

- FT_V1_DISPOSITION_OBSERVED
- ITERATION_DEPTH_OBSERVED
- VERIFICATION_PRESENCE_OBSERVED
- RECOVERY_OBSERVED
- LATENCY_OBSERVED
- ABANDONMENT_OBSERVED

### V2 additions (added 2026-05)

- USER_FREQUENCY_OBSERVED
- USER_ENGAGEMENT_OBSERVED
- USER_BREADTH_OBSERVED

Future expansions require a governance-grade concept doc in docs/concepts/ before implementation, mirroring docs/concepts/VELOCITY.md.

## 5. Suppression Reasons (the five, locked)

- INSUFFICIENT_TIME (window < 60d)
- INSUFFICIENT_VOLUME (cohort_size < 5)
- NO_CONVERGENCE
- BASELINE_UNSTABLE
- HIGH_AMBIGUITY

## 6. Out of Scope (do not implement without explicit human approval)

- New canonical events beyond the existing nine or new suppression reasons
- Statistical significance scoring or p-values in verdict outputs
- Built-in JBTD or persona taxonomies
- Connectors to Veeva, Jira, ServiceNow, or other systems of record
- Correlation or causation engines on outcome evidence
- Dollarized ROI computation
- Individual user attribution under any framing
- Admin UI for adjusting thresholds

### Implemented and Future Concepts

Velocity is a defined V2 concept (see docs/concepts/VELOCITY.md) and is implemented as three aggregate-distribution canonical events plus a Velocity Index output. It preserves the V1 suppression reasons, fail-closed posture, and no-individual-scoring invariant.

Depth is a first-class V4 concept (see docs/concepts/DEPTH.md). It frames work integration through verification, workflow repertoire, reusable workflow creation, agent relationship mix, recovery discipline, and judgment behavior. It is documentation-stage only unless a future implementation PR explicitly adds runtime support under the nine invariants.

The older maturity concept is superseded for new work by Depth. Do not introduce maturity scoring, team ranking, or individual labels from that language.

Expanded surface taxonomy is a defined V2.1 concept (see docs/concepts/SURFACES.md) and is implemented in the customer-side transformer path. It does not modify any V1 or V2 invariants.

Split of AGENT surface into autonomous / named-workflow / ephemeral sub-surfaces is a defined V2.3 concept (see docs/concepts/AGENT_TYPES.md). Implemented workflow surface labels split the single AGENT bucket into governed sub-surfaces such as `workflow:agent:autonomous`, `workflow:agent:workflow_named`, and `workflow:agent:ephemeral`; they do not modify any canonical observation events or suppression reasons.

Production ingest is a defined and implemented V3 concept (see docs/concepts/INGEST.md and docs/integrations/value-realization/V3_INGEST.md). It establishes the customer-side-transformer privacy boundary: raw GCE remains in the customer environment, and only aggregate cohort distributions cross into FluencyTracr.

Calibration governance is a defined and implemented V3 concept (see docs/concepts/CALIBRATION.md). It distinguishes immutable, versioned reference baselines from prohibited tunable thresholds.

### V4 Value Confidence Layer

V4 is the Value Confidence Layer (see docs/concepts/V4_VALUE_CONFIDENCE_LAYER.md). It is documentation-stage only unless implementation already exists in a future branch. V4 combines Velocity, Depth, governed V3 verdicts, Quality Multiplier, Reliability Factor, Outcome Evidence, and Trust Calibration into executive economic decision artifacts.

V4 must not implement ROI calculation, customer-facing prediction claims, scoring, ranking, individual attribution, productivity measurement, admin overrides, tunable thresholds, new canonical events, or new suppression reasons. Future V4 implementation must preserve all nine invariants exactly.

## 7. Value-Realization Vocabulary (use this language in code, docs, and commits)

- AIVM grammar: value_type in {ACCELERATION, QUALITY_PREMIUM, NET_NEW, UNCLASSIFIED}; evidence_grade in {OBJECTIVE, CALIBRATED, QUALITATIVE}
- Quality Multiplier: behavioral discount/amplifier on time-saved estimates
- Causal Delta: pre/post window pattern shift verdict
- Reliability Factor: composite of abandonment, friction loop, recovery, verification
- Outcome Evidence: customer-attested aggregate KPI ingestion (storage only)
- Velocity Index: V2 aggregate-distribution output across frequency, engagement, and breadth
- Depth: V4 aggregate work-integration lens, including verification, reusable workflows, workflow repertoire, agent mix, recovery discipline, and judgment behavior
- Value Confidence Layer: V4 documentation-stage executive decision layer for bounded, caveated, aggregate economic confidence

## 8. Repositioning Context

FluencyTracr's narrative leads with value realization, not AI fluency. Closes the 64%-no-signal gap in Paul Li's time-saved pipeline. Governance invariants are the proof of seriousness, not the headline. Avoid the word "fluency" in new headers and section titles except where it is the literal product name. Audience is the value-realization team and CIOs, not HR or L&D.

## 9. Ordered Prompt Roadmap (the staged work plan)

The human will feed Codex these prompts in order:

1. Repository orientation
2. AIVM tagging on verdict outputs
3. Quality Multiplier API
4. Causal-delta primitive
5. Reliability Factor output
6. JBTD / persona join key
7. Outcome ingestion contract
8. README and docs repositioning
9. Glean-internal dogfood scaffold

Note: each prompt is one PR. Do not combine.

## 10. Working Rules for Agents

- Read README.md, docs/contracts/, schemas/, and openspec/ before changing code.
- For agentic development or harness work, use docs/concepts/AGENTIC_EXECUTION_HARNESS.md as the canonical architecture spine. Provider-specific Cursor, OpenAI Agents SDK, Codex, and Claude docs are adapters back to that spine, not separate sources of truth.
- Never modify the canonical event set or suppression reason set without an explicit human instruction citing this section.
- Every new endpoint must respect existing fail-closed gates.
- Every new field must be additive - do not break existing consumers.
- Add LMSYS assurance harness fixtures for every new behavior.
- Verdict shape changes require updates to schemas/, openspec/, and docs/contracts/ in the same PR.
- Commits must reference which invariant or roadmap prompt they implement.
- When implementing a roadmap prompt that derives from external work, reference the relevant entry in ATTRIBUTION.md in the PR description. Add new entries when new sources are introduced.

### Agentic Harness Boundary

Agent-run telemetry is development infrastructure only. It must not be treated as FluencyTracr customer evidence, customer telemetry, or a new value-realization signal. Any future agentic backend must preserve the nine invariants, store only metadata and references, and avoid raw prompts, raw responses, file content, diffs, secrets, emails, direct identifiers, person-level metrics, team comparisons, ROI computation, or causal claims.

Canonical harness sources are:

- docs/agent/SESSION_START.md for session startup.
- .project/WORK_QUEUE.json and .project/PROGRESS.md for active queue state.
- harness/feature_list.json and harness/agent-progress.txt for checklist and handoff state.
- docs/contracts/agent-run/README.md for provider-neutral agent-run events.
- docs/contracts/agent-run/ledger.md for future ledger semantics.

Do not commit local provider worktrees or duplicate repository copies. Use pointer docs or symlink aliases when a provider needs its own entrypoint.

## 11. When in Doubt

If a request appears to violate any invariant, stop and ask the human. Do not soften invariants under feature pressure. The governance posture is the product.
