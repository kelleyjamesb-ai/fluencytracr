# Change: Add Causal Delta endpoint

## Why
Paul's ROI Framework needs a pre/post workflow comparator that can say whether an aggregate pattern moved after a known change moment without making statistical or causal claims inside FluencyTracr.

## What Changes
- Add `POST /api/v1/causal-delta`.
- Compare pre and post workflow windows around `event_at`.
- Reuse existing pattern detection and suppression gates.
- Return a coarse pattern-shift verdict: `IMPROVED`, `HELD`, `REGRESSED`, or `INDETERMINATE`.

## Impact
- Affected specs: value-realization
- Affected code: backend read/analysis route and derive-on-read causal delta service
- No persistence or Prisma migration required.
