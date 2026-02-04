# TG3 Test Matrix — Adversarial Categories

Required Adversarial Test Categories (All must be executed)

Seasonal variance
- Quarter-end cycles, audits, onboarding waves
- Expected result: SUPPRESS

Cyclical workload spikes
- Bursty, volume-driven activity
- Expected result: SUPPRESS

Single-window emergence
- Signal appears in only one eligible window
- Expected result: SUPPRESS

Contradictory adjacent windows
- Mutually exclusive interpretations across time
- Expected result: SUPPRESS

Tooling or policy change mid-sequence
- Tool addition, removal, or policy update
- Expected result: SUPPRESS until fresh continuity

Logging noise and sparse data
- Partial or inconsistent instrumentation
- Expected result: SUPPRESS

No substitutions.
No normalization.
No contextual explanation.
