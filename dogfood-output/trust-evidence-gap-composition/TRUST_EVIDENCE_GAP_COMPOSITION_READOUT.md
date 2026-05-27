# Trust Evidence Gap Composition Readout

Status: `RESEARCH_CONTEXT_ONLY`

Scope: Glean dogfood aggregate run-first sample

Window: Seven approved business days

The public evidence gap is 37,959,260 aggregate episodes (43.1% of the pilot episode total).

This readout decomposes the aggregate evidence-gap bucket. It does not call a backend API, persist customer telemetry, or inspect raw event rows.

## What The Gap Is Comprised Of

- True downstream-evidence gap: 37,484,844 aggregate episodes.
- Ambiguous boundary fold-in: 474,414 aggregate episodes.
- Small-cell safety fold-in: present below the aggregate safety floor; exact count withheld.

## Interpretation

The largest visible component is the true downstream-evidence gap: episodes exist, but the aggregate record does not yet show enough downstream behavior to interpret whether AI-assisted work resolved, recovered, stalled, or was verified.

The ambiguous boundary fold-in captures rows where the pattern shape looked interpretable, but trace, run, session, or action keys could overlap. Those rows stay in evidence-gap language until the boundary is safer.

The small-cell safety fold-in preserves aggregate safety: rare composition cells can be acknowledged as present below the aggregate safety floor without publishing exact values.

## What This Does Not Mean

- This is not a trust score.
- This is not a correctness detector.
- It does not identify, score, rank, or evaluate employees.
- It does not calculate ROI.
- It does not establish causality.
- It does not add canonical events.
- It does not add suppression reasons.
- It does not rank teams or managers.

## Recommended Next Diagnostic

Run the BigQuery gap-composition diagnostic against customer-approved aggregate exports to split the true downstream-evidence gap into source-readiness buckets such as verification-only episodes, AI activity without terminal outcome, span/LLM activity without governed outcome, skill or agent activity without downstream outcome, and weak parent linkage.
