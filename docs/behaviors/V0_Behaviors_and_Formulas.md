# V0 Behaviors and Formulas (Canonical)

This file is the canonical list of V0 behaviors across human and agentic workflows.

All behaviors are computed from metadata and event sequences only.
No raw content required.

## Canonical behavior list

| Behavior | Measurement intent | Bias risks | Gaming vectors | Decision supported | Surfaced vs computed-only | EvidenceBundle field mapping if surfaced | Raw content requirement |
|---|---|---|---|---|---|---|---|
| `tool_first_seen` | Detect initial adoption of tool classes in workflow cohorts | Instrumentation lag can undercount first use | Emit fake first-use events | Enablement rollout prioritization | Surfaced | `coverage.instrumented_sources` / `coverage.missing_sources` | No raw content required |
| `feature_trial_sequence_started` | Detect start of exploratory feature trial sequences | Feature flags may be inconsistently labeled | Trigger synthetic trial starts | Experiment design and support allocation | Computed-only | N/A | No raw content required |
| `prompt_strategy_shift` | Detect strategy changes across attempts | Strategy tags may vary by connector | Oscillate tags without real change | Coaching for workflow stability | Surfaced (when elevated) | `fragility.friction_loops_elevated` | No raw content required |
| `verification_started` | Detect explicit verification initiation before finalization | Some tools verify implicitly and unobservably | Click-through verification markers | Verification policy reinforcement | Surfaced | `calibration.verification_presence` | No raw content required |
| `verification_latency_bucket` | Measure verification latency in bounded buckets | Clock skew and timestamp quality | Artificially delay logging | Process tuning for verification coverage | Computed-only | N/A | No raw content required |
| `counterfactual_probe` | Detect alternative-path checks before decision | Probe behavior differs by task class | Emit trivial probes to inflate trust score | Governance confidence calibration | Surfaced | `calibration.verification_presence` | No raw content required |
| `contradiction_detected` | Detect contradiction markers in evidence sequence | Contradiction definitions vary by connector | Inject false contradiction tags | Risk monitoring and remediation | Computed-only | N/A | No raw content required |
| `conflict_resolved` | Detect successful resolution after contradiction events | Resolution outcomes may be delayed outside window | Emit premature resolution marker | Recovery and incident process tuning | Surfaced | `calibration.recovery_presence` | No raw content required |
| `rapid_abandonment` | Detect early abandonment of AI-assisted flow | Abandonment may reflect valid scope changes | Force abandon/restart cycles | Fragility reduction and UX redesign | Surfaced | `fragility.rapid_abandonment_elevated` | No raw content required |
| `burst_retry_loop` | Detect dense retry loops in bounded attempts | Retry reasons may be coarse-grained | Trigger retries without meaningful work | Workflow friction reduction | Surfaced | `fragility.friction_loops_elevated` | No raw content required |
| `undo_churn` | Detect repeated reversals and undo sequences | Undo semantics differ across products | Perform superficial undo actions | Workflow stability improvement | Surfaced | `fragility.friction_loops_elevated` | No raw content required |
| `constraints_declared_early` | Detect early constraint declaration behavior | Some constraints captured outside instrumented systems | Emit placeholder constraints | Planning hygiene and enablement | Computed-only | N/A | No raw content required |
| `acceptance_criteria_set` | Detect explicit acceptance criteria before execution | Criteria may be implied but not tagged | Add low-quality criteria tags | Quality gating and readiness controls | Computed-only | N/A | No raw content required |
| `scope_narrowed` | Detect narrowing from broad scope to bounded execution | Scope-state transitions may be connector-specific | Repeated fake scope toggles | Execution discipline and risk control | Computed-only | N/A | No raw content required |
| `template_reuse` | Detect reusable template usage | Template IDs may not be globally normalized | Reuse trivial templates | Standardization and enablement library investment | Surfaced | `calibration.verification_presence` (supporting context) | No raw content required |
| `artifact_forked` | Detect branching and adaptation of existing artifacts | Fork events can be overcounted in collaborative tools | Fork without meaningful changes | Knowledge diffusion strategy | Surfaced | `exposure.shadow_ai` (context dependent) | No raw content required |
| `peer_artifact_opened` | Detect cross-peer artifact engagement | Open events do not always imply useful reuse | Open-close noise inflation | Diffusion and collaboration enablement | Computed-only | N/A | No raw content required |
| `policy_checked` | Detect explicit policy check prior to action | Policy checks may happen outside logging path | Emit non-substantive check events | Governance control tuning | Surfaced | `calibration.escalation_to_safe_path_presence` (supporting context) | No raw content required |
| `escalated_to_safe_path` | Detect routing to protected execution pathway | Escalations can reflect strict policy, not low quality | Trigger unnecessary escalations | Safe-path and escalation policy tuning | Surfaced | `calibration.escalation_to_safe_path_presence` | No raw content required |
| `sensitive_mode_enabled` | Detect activation of sensitive handling mode | Mode availability differs by tool | Toggle mode without risk context | Sensitive workflow guardrail governance | Surfaced (contextual) | `exposure.unsanctioned_tool_class` (inverse risk context) | No raw content required |
| `agent_review_present_before_execute` | Detect review before autonomous execution | Review markers may be missing from some toolchains | Superficial review acknowledgments | Agent oversight policy | Surfaced | `calibration.verification_presence` | No raw content required |
| `agent_intervention_stop` | Detect stop interventions in agent runs | Stop reasons may be under-classified | Stop/start loops to inflate intervention counts | Human override policy design | Surfaced | `calibration.recovery_presence` | No raw content required |
| `agent_override_redirect` | Detect redirect from default agent route to approved route | Redirect target taxonomy drift | Redirect noise events | Safety routing and governance control | Surfaced | `calibration.recovery_presence` | No raw content required |
| `post_run_verification_present` | Detect verification after run completion | Verification timing may fall outside window | Add ceremonial verification events | Post-run assurance policy | Surfaced | `calibration.verification_presence` | No raw content required |
| `permission_elevation_attempted` | Detect attempted scope or permission elevation by agents | Policy boundaries differ across environments | Trigger harmless elevation attempts | Access-control governance decisions | Surfaced (governance context) | `exposure.unsanctioned_tool_class` | No raw content required |
| `repeat_failure_loop_detected` | Detect repeated failures without successful terminal transition | Failure labels may be connector-specific | Force repetitive no-op failures | Reliability and intervention thresholds | Surfaced | `fragility.friction_loops_elevated` | No raw content required |
| `silent_success_risk_proxy` | Detect success markers without expected verification evidence | Some success flows may be intrinsically low risk | Mark success while skipping verification | Blind-acceptance risk governance | Surfaced | `fragility.blind_acceptance_risk_elevated` | No raw content required |

## Sequence computation primitives

- Sequence key: `(org_id, workflow_id, tool_class, bucket_start)`
- Ordering: deterministic event order from monotonic sequence index or UTC timestamp fallback
- Windowing: daily, weekly, 30d, 60d with suppression propagation
- Suppression: apply k-min policy before surfacing and preserve suppression reason metadata
