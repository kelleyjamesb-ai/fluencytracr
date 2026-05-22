# AGENTS.md

## 1. Purpose

This file is the canonical context for any AI agent making changes in this repository. Read it at the start of every session before making any modifications.

## 2. What FluencyTracr Is (current positioning)

FluencyTracr is the behavioral evidence layer that makes Glean's value-realization claims defensible. It consumes GCE-shaped workflow telemetry, applies fail-closed suppression gates, and emits SURFACE or SUPPRESS verdicts on aggregate workflow patterns. It is NOT an AI fluency scoring tool, NOT a surveillance product, and NOT a replacement for Glean Insights, MUSE, or Sigma. Audience: AIOMs, value-realization PMs, CIOs.

## 3. The Nine Invariants (hard constraints - never violate)

1. No new canonical events beyond the existing six.
2. No new suppression reasons beyond the existing five.
3. No tunable thresholds. Constants are compiled into code.
4. No admin overrides of suppression decisions.
5. No individual scoring. No user-identifiable fields anywhere in inputs, storage, or outputs.
6. Default verdict is SUPPRESS. SURFACE requires all gates clearing.
7. Latency is corroborative only, never a surfacing trigger.
8. Every PR must keep the Assurance Harness CI workflow green.
9. Suppression gates apply independently per slice (workflow_id, jbtd_id, persona_id) - no cross-slice aggregation that could re-identify.

## 4. Canonical Events (the six, locked)

- FT_V1_DISPOSITION_OBSERVED
- ITERATION_DEPTH_OBSERVED
- VERIFICATION_PRESENCE_OBSERVED
- RECOVERY_OBSERVED
- LATENCY_OBSERVED
- ABANDONMENT_OBSERVED

## 5. Suppression Reasons (the five, locked)

- INSUFFICIENT_TIME (window < 60d)
- INSUFFICIENT_VOLUME (cohort_size < 5)
- NO_CONVERGENCE
- BASELINE_UNSTABLE
- HIGH_AMBIGUITY

## 6. Out of Scope (do not implement without explicit human approval)

- New canonical events or suppression reasons
- Statistical significance scoring or p-values in verdict outputs
- Built-in JBTD or persona taxonomies
- Connectors to Veeva, Jira, ServiceNow, or other systems of record
- Correlation or causation engines on outcome evidence
- Dollarized ROI computation
- Individual user attribution under any framing
- Admin UI for adjusting thresholds

### Future V2 Concepts

Velocity is a defined V2 concept (see docs/concepts/VELOCITY.md). It is not yet implemented and does not modify any V1 invariants. Implementation will require a separate governance review and explicit AGENTS.md update.

## 7. Value-Realization Vocabulary (use this language in code, docs, and commits)

- AIVM grammar: value_type in {ACCELERATION, QUALITY_PREMIUM, NET_NEW, UNCLASSIFIED}; evidence_grade in {OBJECTIVE, CALIBRATED, QUALITATIVE}
- Quality Multiplier: behavioral discount/amplifier on time-saved estimates
- Causal Delta: pre/post window pattern shift verdict
- Reliability Factor: composite of abandonment, friction loop, recovery, verification
- Outcome Evidence: customer-attested aggregate KPI ingestion (storage only)

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
- Never modify the canonical event set or suppression reason set without an explicit human instruction citing this section.
- Every new endpoint must respect existing fail-closed gates.
- Every new field must be additive - do not break existing consumers.
- Add LMSYS assurance harness fixtures for every new behavior.
- Verdict shape changes require updates to schemas/, openspec/, and docs/contracts/ in the same PR.
- Commits must reference which invariant or roadmap prompt they implement.
- When implementing a roadmap prompt that derives from external work, reference the relevant entry in ATTRIBUTION.md in the PR description. Add new entries when new sources are introduced.

## 11. When in Doubt

If a request appears to violate any invariant, stop and ask the human. Do not soften invariants under feature pressure. The governance posture is the product.
