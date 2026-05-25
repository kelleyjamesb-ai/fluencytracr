## Mission lock
We only support organizational AI fluency signals that are:
- Aggregated at team/org level (no per-person scoring).
- Opt-in and transparent to participants.
- Collected from approved, minimal, and purpose-limited sources.

## Non-goals (hard stops)
We will not build, ship, or accept contributions that enable:
- Individual surveillance, monitoring, or tracking.
- Passive collection of personal or sensitive data without explicit consent.
- Expansion beyond AI fluency signals into productivity scoring, behavior profiling, or enforcement.
- Cross-system correlation intended to identify or rank individuals.

## Scope guardrails (requirements)
Any new data source or feature must satisfy all of the following:
1. **Aggregation-first:** data is aggregated before storage or analysis.
2. **Minimum necessary:** collect only what is required for AI fluency signals.
3. **Transparency:** users can see what is collected and why.
4. **Purpose limitation:** data cannot be repurposed for unrelated goals.
5. **Sunset policy:** data has an explicit retention limit.

## Review checklist (for contributors)
- [ ] Feature aligns with the Mission lock.
- [ ] No individual-level identifiers or ranking.
- [ ] Data is aggregated before storage.
- [ ] Clear opt-in and disclosure is documented.
- [ ] Retention limits are defined.

## V4 Value Confidence guardrails

V4 may qualify the defensibility of AI value claims, but it must not create:

- Realized ROI claims.
- Causal productivity lift claims.
- Forecasting claims without held-out validation.
- Maturity scoring.
- Team or individual rankings.
- Suppressed economics, including hidden dollar values, hours saved, upside estimates, or portfolio totals.

Depth Repertoire is currently caveat-only context for V4 value confidence. It
must not become a hidden multiplier, confidence-band adjustment, eligibility
input, Time-Saved Defensibility Range dependency, benchmark, default, threshold,
or ranking signal without a later explicit governance decision.

## Agentic Harness Guardrails

Development-harness telemetry may support repo execution, investigation, and verification, but it must not become customer product evidence. Agent-run logs and future ledgers must not store raw prompts, raw responses, file content, diffs, secrets, emails, direct identifiers, person-level metrics, customer raw GCE rows, customer value evidence payloads, or customer-facing economic claims.
