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

Depth is a first-class V4 concept (see docs/concepts/DEPTH.md). It frames cross-surface work integration through surface repertoire and repeated meaningful use, then qualifies that evidence with verification, delegation, reuse, recovery, and judgment behavior. It is documentation-stage only unless a future implementation PR explicitly adds runtime support under the nine invariants.

Delegation Depth is a V4 concept-stage Depth subdimension (see docs/concepts/DELEGATION_DEPTH.md). It must not be implemented as a new canonical event, standalone score, or person-level label without explicit governance approval.

Work Mode Taxonomy is a V4 concept-stage interpretation layer (see docs/concepts/WORK_MODES.md). It maps governed surfaces into durable AI work patterns for taxonomy-aware calibration. It adds no canonical events, suppression reasons, thresholds, APIs, schemas, or economic readouts.

The older maturity concept is superseded for new work by Depth. Do not introduce maturity scoring, comparative team evaluation, or individual labels from that language.

Expanded surface taxonomy is a defined V2.1 concept (see docs/concepts/SURFACES.md) and is implemented in the customer-side transformer path. It does not modify any V1 or V2 invariants.

Split of AGENT surface into autonomous / named-workflow / ephemeral sub-surfaces is a defined V2.3 concept (see docs/concepts/AGENT_TYPES.md). Implemented workflow surface labels split the single AGENT bucket into governed sub-surfaces such as `workflow:agent:autonomous`, `workflow:agent:workflow_named`, and `workflow:agent:ephemeral`; they do not modify any canonical observation events or suppression reasons.

Production ingest is a defined and implemented V3 concept (see docs/concepts/INGEST.md and docs/integrations/value-realization/V3_INGEST.md). It establishes the customer-side-transformer privacy boundary: raw GCE remains in the customer environment, and only aggregate cohort distributions cross into FluencyTracr.

Calibration governance is a defined and implemented V3 concept (see docs/concepts/CALIBRATION.md). It distinguishes immutable, versioned reference baselines from prohibited tunable thresholds.

### V4 Value Confidence Layer

V4 is the Value Confidence Layer (see docs/concepts/V4_VALUE_CONFIDENCE_LAYER.md). It is documentation-stage only unless implementation already exists in a future branch. V4 combines Velocity, Depth, governed V3 verdicts, Quality Multiplier, Reliability Factor, Outcome Evidence, and Trust Calibration into executive economic decision artifacts.

AI Scale Readiness Portfolio is a defined V4 concept (see docs/concepts/AI_SCALE_READINESS_PORTFOLIO.md). It frames aggregate readiness zones as action postures for scale, enablement, workflow design, trust calibration, adoption expansion, or hold. It is not a scorecard, comparative team evaluation, maturity label, productivity measurement, ROI calculation, prediction, or causal claim.

Organizational Segmentation is a defined V4 concept (see docs/concepts/ORG_SEGMENTATION.md). It allows approved aggregate cohort slices such as function, role family, level band, manager/IC, region, tenure, Velocity band, and Depth Repertoire band only when computed inside the customer or Glean boundary and independently suppressed. Segments are intervention contexts, not performance groups.

Economic Impact Bridge is a defined V4 concept (see docs/concepts/ECONOMIC_IMPACT_BRIDGE.md). It maps aggregate readiness patterns to value hypotheses and customer-owned economic investigations. It does not calculate dollarized ROI, prove causality, predict outcomes, or infer employee performance.

Skill Read Evidence is a V4 research signal, not a governed product signal. Skills usage should be probed in BigQuery agent span usage sources such as `scrubbed_agentspan_*` and dbt `action_runs_v2` / `action_runs`, using raw span skill-reader attributes, legacy skill-name inputs where present, or extracted `skill_reader_skill_name`. GCE workflow snapshot metadata and skill definition stores are not the usage source. Reusable Workflow Propagation and Named Workflow Leverage remain `HOLD` until skill-read evidence passes validation for unspecified-share, parent join coverage, canonical skill identity, versioning, invocation mode, and personal/shared/org Skill separation.

V4 must not implement ROI calculation, customer-facing prediction claims, scoring, ranking, individual attribution, productivity measurement, admin overrides, tunable thresholds, new canonical events, or new suppression reasons. Future V4 implementation must preserve all nine invariants exactly.

## 7. Value-Realization Vocabulary (use this language in code, docs, and commits)

- AIVM grammar: value_type in {ACCELERATION, QUALITY_PREMIUM, NET_NEW, UNCLASSIFIED}; evidence_grade in {OBJECTIVE, CALIBRATED, QUALITATIVE}
- Quality Multiplier: behavioral discount/amplifier on time-saved estimates
- Causal Delta: pre/post window pattern shift verdict
- Reliability Factor: composite of abandonment, friction loop, recovery, verification
- Outcome Evidence: customer-attested aggregate KPI ingestion (storage only)
- Velocity Index: V2 aggregate-distribution output across frequency, engagement, and breadth
- Depth: V4 aggregate cross-surface work-integration lens, anchored in surface repertoire and repeated meaningful use, with verification, delegation, reuse, recovery, and judgment behavior as confidence layers
- Work Mode Taxonomy: V4 mapping layer from governed surface IDs to AI work patterns and evidence roles
- Value Confidence Layer: V4 documentation-stage executive decision layer for bounded, caveated, aggregate economic confidence
- AI Scale Readiness Portfolio: V4 aggregate action-posture readout for where to scale, coach, redesign, calibrate trust, expand adoption, or hold
- Organizational Segmentation: V4 aggregate-only cohort context for intervention planning; never a performance group or ranking surface
- Economic Impact Bridge: V4 concept for mapping aggregate readiness patterns to customer-owned value investigations without ROI proof or causality claims
- Skill Read Evidence: V4 research-only availability signal for Skills usage in agent span logs; not a governed reuse-depth or economic signal until validation promotes it

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
- Candidate behavioral signals must pass docs/research/SIGNAL_PROMOTION_CRITERIA.md before they are promoted into concept docs, contracts, or implementation work.
- Future Codex or agent work must not productize V4 signals unless docs/research/V4_SIGNAL_VALIDATION_GATE.md records `PROMOTE` for that signal. Research probes are not product contracts. Candidate signal docs are not permission to build APIs.
- V4 Depth Readout Engine is dogfood-only. It is not permission to build V4 economic APIs. Reusable Workflow Propagation remains `HOLD` unless future validation promotes it. Time-Saved Defensibility Range remains blocked until Depth readout stability is demonstrated.
- Skill Read Evidence may be probed through dogfood/research SQL only. Do not promote Skills, Reusable Workflow Propagation, Named Workflow Leverage, AI Scale Readiness, or economic interpretation based on skill reads until docs/research/V4_VALIDATION_PLAN.md records fixed-window validation and a later promotion decision. Raw skill names, user IDs, prompts, outputs, transcripts, and action rows must not be emitted.
- Trust and cohort classifications are research-only unless docs/research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md is completed by a later fixed-window readout and explicit promotion decision. Behavior-derived cohorts may be tested first; department, function, level, manager/IC, leader, region, and other org metadata cohorts remain held until an approved aggregate join exists. Classifications must not become trust scoring, manager comparison, department comparison, productivity scoring, maturity scoring, ROI, causality, prediction, or customer-facing economic output.
- V4 economic readouts remain blocked until docs/research/V4_DEPTH_STABILITY_DECISION.md promotes contract hardening. No V4 economic API, Time-Saved Defensibility Range implementation, or Depth-dependent economic readout may start unless the decision is exactly `PROMOTE_DEPTH_CONTRACT_HARDENING`. All other decision states, including `HOLD_FOR_MORE_WINDOWS`, `HOLD_FOR_SIGNAL_REFINEMENT`, `NARROW_TO_SUBSIGNALS`, and `REJECT_CURRENT_READOUT`, remain blocking states.
- Depth Repertoire is promoted for contract hardening by docs/research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md and hardened in docs/contracts/depth/depth-repertoire.md. docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md records `PROMOTE_CAVEAT_ONLY`: V4 value-confidence artifacts may use Depth Repertoire only as aggregate caveat/context. Depth Repertoire must not modify confidence bands, surfacing eligibility, Time-Saved Defensibility Range, ROI language, causal claims, prediction claims, or any customer-facing economic number unless a later calibration decision explicitly promotes that use. Glean dogfood values must not be embedded into universal V4 concepts, contracts, schemas, thresholds, or defaults. Depth Repertoire must remain aggregate-only and must not rank individuals, teams, departments, customers, or managers.
- Any V4 artifact that includes Depth Repertoire caveat/context must pass docs/research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md before further contract hardening. Passing caveat propagation does not authorize economic dependency; it only proves that caveats did not become hidden behavior.
- docs/research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md records `PASS_CAVEAT_PROPAGATION` for the Time-Saved Defensibility Range contract. This permits docs-only TSDR contract hardening for caveat/context behavior, but it does not authorize runtime implementation, schemas, endpoints, confidence-band adjustment, range adjustment, eligibility use, or customer-facing economic output.
- docs/research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md records `PASS_CAVEAT_PROPAGATION` for the AI Value Leakage Map contract. This permits docs-only leakage-map contract hardening for caveat/context behavior, but it does not authorize runtime implementation, schemas, endpoints, leakage severity adjustment, value-at-risk adjustment, eligibility use, ROI, causal claims, prediction claims, or customer-facing economic output.
- AI Scale Readiness Portfolio has passed internal readout context propagation only by docs/research/V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md, docs/research/V4_GLEAN_DOGFOOD_DECISION.md, and docs/research/V4_CLOSEOUT_DECISION.md. The promotion is locked to docs-only internal readout shape with Depth Repertoire context and value-investigation routing language. Trust Calibration Index remains held by docs/research/V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md for attribution refinement. No economic API, customer-facing readout, Time-Saved Defensibility Range productization, Organizational Segmentation runtime support, Economic Impact Bridge runtime support, Skill Read Evidence reuse-depth interpretation, or automated recommendation surface may start until a later decision promotes that exact scope.
- V4 internal readout reruns must use the explicit allowlist in dogfood-output/V4_RESEARCH_EXPORTS.md and the process in docs/research/V4_INTERNAL_READOUT_RUNBOOK.md. Do not glob-load `dogfood-output/**/*.csv`; older dogfood files and ignored scratch CSVs are not automatically safe inputs. Do not surface low-count rows, raw skill names, user identifiers, prompts, outputs, transcripts, action rows, or raw event rows.
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

### Repo-Backed Workflows and Commands

- For every long-form coding session, start with `docs/agent/SESSION_START.md`, then use `.project/WORK_QUEUE.json` and `.project/PROGRESS.md` for active scope; update durable state before stopping.
- For mechanical Python verification, run `./harness/scripts/bootstrap.sh` and `./harness/scripts/verify.sh`; when touching V1 contracts, suppression, or governance-sensitive paths, also run `python scripts/ci_v1_governance_gates.py`.
- For backend/frontend/shared changes, use `npm run build --workspace shared`, `npm run test:ci --workspace backend`, and `npm test --workspace frontend` as applicable. Use `npm run build --workspace backend` or `npm run build --workspace frontend` for build-only deployment checks.
- For OpenSpec-backed work, validate the named change with `npx openspec validate <change-id> --strict` before merge.
- For dogfood or multi-surface verdict work, keep checks narrow and canonical: `python3 -m unittest tests.test_dogfood_e2e`, relevant `tests/dogfood/*` tests, and `python3 -m compileall scripts/dogfood/run_multi_surface.py` are known-good fallbacks when full `pytest` is unavailable.
- For Vercel Services or production-routing work, use the current slice command profile as the source of truth: parse `vercel.json`, run relevant workspace builds, use `vercel build` / `vercel deploy --prebuilt` when deployment proof is required, and smoke the canonical project `learn-air-engable-tool-frontend.vercel.app`.
- For GitHub/Vercel merge follow-through, do not treat a merged PR as live proof. Confirm the latest `main` deployment in the `learn-air-engable-tool-frontend` Vercel project is current and `READY` before reporting production readiness.

## 11. When in Doubt

If a request appears to violate any invariant, stop and ask the human. Do not soften invariants under feature pressure. The governance posture is the product.
