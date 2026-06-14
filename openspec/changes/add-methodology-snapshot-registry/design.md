## Context

The AI Work Value Graph already models AI surfaces, work patterns, maturity, evidence, outcome instrumentation, value hypotheses, and claim readiness. The missing primitive is methodology lineage: a frozen record of the assumptions and approval state behind a value estimate.

The Time-Saves MVP and Nielsen-style ROI fixtures show why this matters. Time saved can be estimated by a source system, but FluencyTracr must decide whether the resulting claim is directional, caveated, internal-only, customer-safe, or suppressed.

## Goals

- Represent methodology snapshots as governed contract data.
- Treat Glean Time-Saves as an upstream source system output, not something FluencyTracr recomputes.
- Make financial claims downstream of methodology approval.
- Preserve aggregate-only, privacy-safe boundaries.

## Non-Goals

- No narrow Nielsen ROI validator.
- No person-level measurement, manager views, team rankings, or productivity scoring.
- No ingestion of raw prompts, raw responses, transcripts, query text, tool payloads, or file contents.
- No finance calculation engine in this slice.

## Design

The registry contains frozen snapshots with:

- methodology identity and source system
- covered and excluded AI surfaces
- reporting window and effective date
- base rate, multiplier, dedupe, confidence, recapture, and cost model references
- dominant assumptions and sensitivity tests
- approval state and customer-safe claim effect
- frozen report snapshot reference and caveats

Strongest Safe Claim accepts an optional registry and selected snapshot. If a financial claim is requested:

- `customer_safe` methodology approval can support customer-facing ROI/payback language.
- `finance_approved` can support internal-only financial language.
- `draft`, `internal_review`, `data_science_approved`, `expired`, `rejected`, or `suppresses_claim` cap or suppress the claim.

The registry stays contract-first in `shared/src` and can later be backed by persistence or ingestion adapters.
