# LMSYS Data-Assurance Harness

The LMSYS harness seeds canonical FluencyEvent fixtures and verifies that the live backend behaves like a data-assurance layer: strict ingest boundary, suppression before disclosure, tenant isolation, audit logging, categorical executive prevalence, and pattern visibility without raw content.

## Ghost-Use Residual Evaluation

Ghost-use is covered as a residual-only observability pattern. It is not one of the five behavioral fluency patterns, and the harness must not frame it as resistance, underperformance, or lack of fluency.

The adversarial seed manifest includes four ghost-use scenarios:

| Scenario | Expected outcome |
| --- | --- |
| `ghost_use_residual_fires` | AI exposure exists, work activity is observed, no positive AI evidence appears, ambiguity does not dominate, and the condition persists across the required windows. Ghost-use should surface only as an observability pattern. |
| `ghost_use_bypassed_by_positive_evidence` | The same setup includes one positive AI evidence event. Ghost-use should not surface, and the positive-evidence hard-bypass should be observable. |
| `ghost_use_suppressed_by_ambiguity` | The same setup is ambiguity-dominant. Ghost-use evaluation should be suppressed. |
| `ghost_use_does_not_persist` | Preconditions appear for one window only. Ghost-use should not surface because the persistence gate holds. |

The verifier searches live read surfaces for ghost-use surfacing and fails if any response uses judgment-coded language such as `resistance`, `underperformance`, or `lack of fluency`. Acceptable language is observability-only, for example: `no observed AI evidence in window`.

## CI Coverage

The assurance harness now runs continuously in GitHub Actions.

| Cadence | Dataset | Checks | Expected runtime | Artifact |
| --- | --- | --- | --- | --- |
| Per PR and push to `main` | 2,000 synthetic LMSYS-shaped records from `tests/fixtures/lmsys-ci-sample.jsonl` | Current assurance suite, including the five behavioral patterns, boundary checks, suppression, tenant isolation, categorical disclosure, and ghost-use residual checks | About 5 minutes, target under 8 minutes | `scripts/assurance-report.md` uploaded as `assurance-report` |
| Weekly scheduled full-scale run | Full `lmsys/lmsys-chat-1m` download using the `HF_TOKEN` GitHub secret | Same assurance suite after full-scale seed | About 45-90 minutes | `scripts/assurance-report.md` uploaded as `assurance-report-full-scale` |

The current verifier emits 19 checks after the ghost-use framing guard. Older
notes may say 18/18; treat the workflow result as authoritative because
`scripts/verify_lmsys_assurance.mjs` exits non-zero on any failed check.
