# FluencyTracr
![Assurance Harness](https://github.com/kelleyjamesb-ai/fluencytracr/actions/workflows/assurance-harness.yml/badge.svg)

> **Agents and contributors:** Read [AGENTS.md](./AGENTS.md) before making any changes. It defines the V1 invariants, the canonical event and suppression sets, and the ordered prompt roadmap.
> Influences and credits: see [ATTRIBUTION.md](./ATTRIBUTION.md).

FluencyTracr is the behavioral evidence layer for Glean value realization.
It exists because the current time-saved pipeline can show acceleration while
leaving a critical question unanswered: roughly 64% of chat runs have no
quality signal today.

FluencyTracr sits on top of that pipeline as bounded evidence services and
documented value-realization layers:

- **AI Work Evidence:** org-agnostic core layer that separates reusable
  aggregate evidence primitives from source-specific adapters such as Glean
  dogfood and value-evidence mappings. It defines surfaces, workflows,
  approved cohorts, interventions, trust evidence, source coverage, outcome
  evidence, and value hypotheses without adding events, suppression reasons,
  individual scoring, rankings, or ROI calculation.
- **Quality Multiplier:** discounts, preserves, or amplifies time-saved estimates
  when aggregate workflow behavior shows enough evidence quality.
- **Causal Delta:** compares pre/post workflow patterns around a known change
  moment so value teams can ask what changed after rollout without claiming
  statistical causality.
- **Reliability Factor:** qualifies whether surfaced workflow evidence looks
  operationally dependable based on verification, recovery, abandonment, and
  friction-loop behavior.
- **Outcome Evidence:** stores and replays customer-attested aggregate KPI
  outcomes next to the unchanged workflow verdict so external consumers can do
  their own correlation.
- **Velocity Index:** adds V2 aggregate usage-distribution context across
  frequency, engagement, and breadth, surfaced only as cohort percentiles after
  the same fail-closed gates clear. Dogfood velocity coverage now follows the
  full surface taxonomy in [docs/concepts/SURFACES.md](docs/concepts/SURFACES.md),
  spanning workflow and standalone AI surfaces without adding person-level output.
- **Depth:** frames cross-surface work integration through surface repertoire
  and repeated meaningful use, then qualifies that evidence with verification,
  delegation, reuse, recovery, and judgment behavior. Depth is aggregate
  evidence that adoption is becoming durable enough to support defensible value
  claims.
- **AGENT sub-surfaces:** V2.3 splits AGENT into `agent:autonomous`,
  `agent:workflow_named`, and `agent:ephemeral` so delegation, reusable Skill,
  and exploratory agent behavior can be evaluated independently.
- **Skill Read Evidence:** V4 research path for Skills usage in agent span
  logs. It treats raw span skill-reader attributes, legacy skill-name inputs
  where present, plus dbt
  `skill_reader_skill_name`, as availability signals only until
  unspecified-share, parent attribution, canonical identity, versioning,
  invocation mode, UGC coverage, and personal/shared/org Skill separation are
  validated.
- **V3 production ingest:** moves beyond manual CSV dogfood by running a
  customer-side transformer in the customer's cloud, sending only aggregate
  cohort distributions to FluencyTracr, and storing immutable verdicts against
  governed calibration baselines.
- **V4 Value Confidence Layer:** combines Velocity and Depth with governed V3
  verdicts to qualify the defensibility of AI value claims.
- **AI Scale Readiness Portfolio:** V4 internal readout contract that turns
  aggregate evidence into action postures for scale, enablement, workflow
  redesign, trust calibration, adoption expansion, value investigation, or hold.
  It is not customer-facing and does not calculate economic value.
- **Organizational Segmentation:** future V4 concept for aggregate-only
  intervention contexts such as tenure, function, role family, or behavior
  bands; never person, manager, or comparative team evaluation.
- **Economic Impact Bridge:** future V4 concept that maps readiness patterns to
  customer-owned value investigations without proving ROI or causality.
- **Work Mode Taxonomy:** maps governed surfaces into durable AI work patterns
  such as retrieval, conversation, transformation, embedded assist, delegation,
  reuse, exploration, verification, and corroborative telemetry.

V4 is the Value Confidence Layer. It combines Velocity and Depth with governed
V3 verdicts to qualify the defensibility of AI value claims.

The aggregate verdict layer uses AIVM vocabulary consistently: `value_type`
communicates the kind of value claim, and `evidence_grade` communicates whether
the support is `OBJECTIVE`, `CALIBRATED`, or `QUALITATIVE`. Value-realization
services should preserve those fields when they consume verdict metadata, and
suppression remains fail-closed.

The audience is AIOMs, value-realization PMs, and CIOs deciding which Glean
value claims are defensible. This is not an HR, learning, or individual
measurement product.

## AI assistants — start every session here

Long-form or multi-session coding **must** begin with **[`docs/agent/SESSION_START.md`](docs/agent/SESSION_START.md)** so work stays bounded, verified, and grounded in repo memory (queue + harness + git), not chat context alone. That doc aligns with [Anthropic’s guidance on long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) as implemented under [`harness/`](harness/README.md).

## Scope Guardrails
This project intentionally rejects surveillance and scope creep. Please read and follow
the guardrails in [SCOPE_GUARDRAILS.md](SCOPE_GUARDRAILS.md) before proposing changes.

## Evidence Layer Invariants
The governance invariants are the proof of seriousness behind the value
realization story. They are not the headline, but they make the headline
credible:

- Outputs are signals, not facts, and are strictly binary: `SURFACE` or `SUPPRESS`.
- Default state is `SUPPRESS`; ambiguity is first-class and always suppressive.
- No content storage or individual attribution is permitted.
- Latency is corroborative only and never triggers surfacing on its own.
- No tunable thresholds or admin overrides are allowed; constants are compiled into code.

Suppression reason codes (one-hot, immutable):
- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

## Complementary Stated-Evidence Layer
The AI Fluency Instrument remains useful as a stated-evidence layer: it captures
what people report about adoption, confidence, and practice. FluencyTracr should
be paired with that instrument when value teams want to compare stated evidence
with observed aggregate workflow evidence. The instrument is complementary; it
is not the lead positioning for this repository.

## Canonical Docs
- **Every session (mandatory for agents):** [docs/agent/SESSION_START.md](docs/agent/SESSION_START.md)
- AI / agent navigation (harness, evaluation, task contracts): [docs/agent/README.md](docs/agent/README.md)
- Agentic execution harness concept: [docs/concepts/AGENTIC_EXECUTION_HARNESS.md](docs/concepts/AGENTIC_EXECUTION_HARNESS.md)
- Cursor agent harness rules: [docs/agent/cursor-agent-harness.md](docs/agent/cursor-agent-harness.md)
- Optional OpenAI Agents SDK development harness: [docs/agent/openai-agents-harness.md](docs/agent/openai-agents-harness.md)
- Partner ingestion facade: [docs/api/ingest.md](docs/api/ingest.md)
- Unified telemetry ingest (UT_2026_04, feature-flagged): [docs/api/ingest-unified-telemetry.md](docs/api/ingest-unified-telemetry.md)
- Trace reconstruction (PRD Phase 1, admin): [docs/api/traces-reconstructed.md](docs/api/traces-reconstructed.md)
- Workflow observability rollup (PRD Phase 4): [docs/api/observability-org.md](docs/api/observability-org.md)
- Architecture map: [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md)
- Connector mapping spec: [docs/CONNECTOR_MAPPING_SPEC.md](docs/CONNECTOR_MAPPING_SPEC.md)
- EvidenceBundle v1 contract: [docs/contracts/evidence-bundle/v1/README.md](docs/contracts/evidence-bundle/v1/README.md)
- Reportability contract: [docs/contracts/reportability/README.md](docs/contracts/reportability/README.md)
- Agent-run development harness contract: [docs/contracts/agent-run/README.md](docs/contracts/agent-run/README.md)
- Agent-run ledger contract framing: [docs/contracts/agent-run/ledger.md](docs/contracts/agent-run/ledger.md)
- Unified cross-surface telemetry (UT_2026_04): [docs/contracts/unified-telemetry/README.md](docs/contracts/unified-telemetry/README.md)
- Glean integration pack: [docs/integrations/glean/01-overview.md](docs/integrations/glean/01-overview.md)
- Glean readiness demo guide: [docs/integrations/glean/06-readiness-demo-guide.md](docs/integrations/glean/06-readiness-demo-guide.md)
- Glean executive readiness prototype: [docs/integrations/glean/prototypes/executive-readiness-demo.html](docs/integrations/glean/prototypes/executive-readiness-demo.html)
- Glean live-data decision gate: [docs/integrations/glean/07-live-data-access-decision-gate.md](docs/integrations/glean/07-live-data-access-decision-gate.md)
- Value-realization contract index: [docs/integrations/value-realization/INDEX.md](docs/integrations/value-realization/INDEX.md)
- V3 production ingest walkthrough: [docs/integrations/value-realization/V3_INGEST.md](docs/integrations/value-realization/V3_INGEST.md)
- V4 value confidence integration: [docs/integrations/value-realization/V4_VALUE_CONFIDENCE.md](docs/integrations/value-realization/V4_VALUE_CONFIDENCE.md)
- AI Work Evidence concept: [docs/concepts/AI_WORK_EVIDENCE.md](docs/concepts/AI_WORK_EVIDENCE.md)
- AI Work Evidence pilot package: [docs/integrations/value-realization/AI_WORK_EVIDENCE_PILOT_PACKAGE.md](docs/integrations/value-realization/AI_WORK_EVIDENCE_PILOT_PACKAGE.md)
- Velocity concept and V2 reference: [docs/concepts/VELOCITY.md](docs/concepts/VELOCITY.md)
- Depth concept and V4 reference: [docs/concepts/DEPTH.md](docs/concepts/DEPTH.md)
- Delegation Depth concept and V4 Depth subdimension: [docs/concepts/DELEGATION_DEPTH.md](docs/concepts/DELEGATION_DEPTH.md)
- Work Mode Taxonomy concept: [docs/concepts/WORK_MODES.md](docs/concepts/WORK_MODES.md)
- V4 Value Confidence Layer concept: [docs/concepts/V4_VALUE_CONFIDENCE_LAYER.md](docs/concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- AI Scale Readiness Portfolio concept: [docs/concepts/AI_SCALE_READINESS_PORTFOLIO.md](docs/concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- Organizational Segmentation concept: [docs/concepts/ORG_SEGMENTATION.md](docs/concepts/ORG_SEGMENTATION.md)
- Economic Impact Bridge concept: [docs/concepts/ECONOMIC_IMPACT_BRIDGE.md](docs/concepts/ECONOMIC_IMPACT_BRIDGE.md)
- Signal promotion criteria: [docs/research/SIGNAL_PROMOTION_CRITERIA.md](docs/research/SIGNAL_PROMOTION_CRITERIA.md)
- V4 signal discovery probes: [docs/research/V4_SIGNAL_DISCOVERY_PROBES.md](docs/research/V4_SIGNAL_DISCOVERY_PROBES.md)
- V4 signal discovery readout: [docs/research/V4_SIGNAL_DISCOVERY_READOUT.md](docs/research/V4_SIGNAL_DISCOVERY_READOUT.md)
- V4 signal validation gate: [docs/research/V4_SIGNAL_VALIDATION_GATE.md](docs/research/V4_SIGNAL_VALIDATION_GATE.md)
- V4 signal validation runbook: [docs/research/V4_SIGNAL_VALIDATION_RUNBOOK.md](docs/research/V4_SIGNAL_VALIDATION_RUNBOOK.md)
- V4 signal validation readout template: [docs/research/V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md](docs/research/V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md)
- V4 Depth readout runbook: [docs/research/V4_DEPTH_READOUT_RUNBOOK.md](docs/research/V4_DEPTH_READOUT_RUNBOOK.md)
- V4 Depth stability decision: [docs/research/V4_DEPTH_STABILITY_DECISION.md](docs/research/V4_DEPTH_STABILITY_DECISION.md)
- V4 Depth Repertoire stability readout: [docs/research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md](docs/research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)
- V4 Depth Repertoire value-confidence review: [docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md](docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md)
- V4 Depth Repertoire calibration plan: [docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md](docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md)
- V4 Depth Repertoire calibration decision: [docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md](docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)
- V4 Scale Readiness caveat propagation decision: [docs/research/V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
- V4 Trust Calibration caveat propagation decision: [docs/research/V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
- V4 Glean dogfood scale readiness readout: [docs/research/V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md](docs/research/V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md)
- V4 full dogfood rehearsal readout: [docs/research/V4_FULL_DOGFOOD_REHEARSAL_READOUT.md](docs/research/V4_FULL_DOGFOOD_REHEARSAL_READOUT.md)
- V4 behavior cohort classification readout: [docs/research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md](docs/research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md)
- V4 data analysis closeout: [docs/research/V4_DATA_ANALYSIS_CLOSEOUT.md](docs/research/V4_DATA_ANALYSIS_CLOSEOUT.md)
- V4 next sprint plan: [docs/research/V4_NEXT_SPRINT_PLAN.md](docs/research/V4_NEXT_SPRINT_PLAN.md)
- V4 readout zone model: [docs/research/V4_READOUT_ZONE_MODEL.md](docs/research/V4_READOUT_ZONE_MODEL.md)
- V4 behavior feature backlog: [docs/research/V4_BEHAVIOR_FEATURE_BACKLOG.md](docs/research/V4_BEHAVIOR_FEATURE_BACKLOG.md)
- V4 value hypothesis map: [docs/research/V4_VALUE_HYPOTHESIS_MAP.md](docs/research/V4_VALUE_HYPOTHESIS_MAP.md)
- V4 value realization strategy layer: [docs/research/V4_VALUE_REALIZATION_STRATEGY_LAYER.md](docs/research/V4_VALUE_REALIZATION_STRATEGY_LAYER.md)
- V4 readout zone data test: [docs/research/V4_READOUT_ZONE_DATA_TEST.md](docs/research/V4_READOUT_ZONE_DATA_TEST.md)
- V4 Velocity x Depth zone test: [docs/research/V4_VELOCITY_DEPTH_ZONE_TEST.md](docs/research/V4_VELOCITY_DEPTH_ZONE_TEST.md)
- V4 Glean dogfood decision: [docs/research/V4_GLEAN_DOGFOOD_DECISION.md](docs/research/V4_GLEAN_DOGFOOD_DECISION.md)
- V4 closeout decision: [docs/research/V4_CLOSEOUT_DECISION.md](docs/research/V4_CLOSEOUT_DECISION.md)
- V4 internal readout runbook: [docs/research/V4_INTERNAL_READOUT_RUNBOOK.md](docs/research/V4_INTERNAL_READOUT_RUNBOOK.md)
- V4 internal readout rehearsal: [docs/research/V4_INTERNAL_READOUT_REHEARSAL.md](docs/research/V4_INTERNAL_READOUT_REHEARSAL.md)
- V4 Trust Attribution method: [docs/research/V4_TRUST_ATTRIBUTION_METHOD.md](docs/research/V4_TRUST_ATTRIBUTION_METHOD.md)
- V4 Trust Attribution test readout: [docs/research/V4_TRUST_ATTRIBUTION_TEST_READOUT.md](docs/research/V4_TRUST_ATTRIBUTION_TEST_READOUT.md)
- V4 Trust and Cohort classification plan: [docs/research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md](docs/research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md)
- V4 value-confidence caveat propagation runbook: [docs/research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md](docs/research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
- V4 TSDR caveat propagation decision: [docs/research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md)
- V4 AI Value Leakage Map caveat propagation decision: [docs/research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md)
- V4 validation plan: [docs/research/V4_VALIDATION_PLAN.md](docs/research/V4_VALIDATION_PLAN.md)
- Surface taxonomy concept: [docs/concepts/SURFACES.md](docs/concepts/SURFACES.md)
- Agent types concept: [docs/concepts/AGENT_TYPES.md](docs/concepts/AGENT_TYPES.md)
- Production ingest concept: [docs/concepts/INGEST.md](docs/concepts/INGEST.md)
- Calibration governance concept: [docs/concepts/CALIBRATION.md](docs/concepts/CALIBRATION.md)
- Depth readout contract: [docs/contracts/depth/README.md](docs/contracts/depth/README.md)
- Depth Repertoire contract: [docs/contracts/depth/depth-repertoire.md](docs/contracts/depth/depth-repertoire.md)
- Value Confidence contract: [docs/contracts/value-confidence/README.md](docs/contracts/value-confidence/README.md)
- Time-Saved Defensibility Range: [docs/contracts/value-confidence/time-saved-defensibility-range.md](docs/contracts/value-confidence/time-saved-defensibility-range.md)
- Trust Calibration Index: [docs/contracts/value-confidence/trust-calibration-index.md](docs/contracts/value-confidence/trust-calibration-index.md)
- AI Value Leakage Map: [docs/contracts/value-confidence/value-leakage-map.md](docs/contracts/value-confidence/value-leakage-map.md)
- AI Scale Readiness Portfolio: [docs/contracts/value-confidence/scale-readiness-portfolio.md](docs/contracts/value-confidence/scale-readiness-portfolio.md)
- Velocity Index contract: [docs/contracts/velocity-index.md](docs/contracts/velocity-index.md)
- Behavioral Signals spec: [docs/BEHAVIORAL_SIGNALS_SPEC.md](docs/BEHAVIORAL_SIGNALS_SPEC.md)
- MCP adapter server: [docs/mcp/fluencytracr-mcp-server.md](docs/mcp/fluencytracr-mcp-server.md)
- API reference: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)
- System architecture overview: [docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md](docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md)
