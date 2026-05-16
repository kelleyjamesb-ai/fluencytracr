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
