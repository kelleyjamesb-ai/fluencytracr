## Context

FluencyTracr's governance chain deliberately held durable
`measurement_cell_series_snapshots`: the durable Series read-path decision
concluded compact customer data model rows satisfy the only proven read path
(customer evidence history milestones), and the promotion gate requires a
proof that compact rows *cannot* satisfy a continuity read path before it goes
READY. The product direction now moves from governance (trust) to confidence
(quantified impact): Blueprint hypothesis → said (AI Fluency instrument) and
unsaid (VBD observed behavior) evidence → business metric movement over time →
bounded contribution-alignment confidence. The Bayesian engine that computes
that confidence exists as a held fixture-only prototype chain in `scripts/`.
Longitudinal posterior updates need an immutable observation ledger; this
change opens the governed lane for it.

## Goals / Non-Goals

- Goals:
  - Name the confidence engine as a legitimate, distinct read-path consumer
    with its own proof obligations.
  - Authorize Series persistence for that consumer only, via the same
    hold-by-default, fail-closed decision/gate pattern used everywhere else.
  - Preserve the existing customer-history decision unchanged and honest
    (compact rows still satisfy that consumer; we do not retroactively claim
    they failed).
- Non-Goals:
  - Promoting the Bayesian runtime out of fixture state (separate workstream
    and separate promotion gate).
  - Creating the physical table, schema, migration, repository, routes, UI,
    or exports (separate implementation decision, as with the customer data
    model lane).
  - Any customer-facing confidence, probability, finance, ROI, causality, or
    productivity output.

## Decisions

- Decision: introduce a *new* decision artifact for the confidence consumer
  instead of mutating the existing read-path proof to claim
  `COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONTINUITY_READ_PATH`.
  Rationale: compact rows genuinely satisfy the customer-history read path;
  reusing that proof state would make the ledger dishonest. Two consumers,
  two proofs, one gate.
- Decision: narrow `research_model_feed` to a scoped token
  (`internal_confidence_engine_only`) rather than flipping it to a bare
  `true`. Rationale: boundary tests can string-match the scope; a boolean
  would silently authorize any future model consumer.
- Decision: reuse milestone days [0, 30, 60, 90, 180, 365] as the observation
  cadence. Rationale: they are already validated through the Measurement Cell
  Series contract layer and match the posterior-update cadence the engine
  needs; no new cadence surface.
- Alternatives considered:
  - Store observations inside `evidence_snapshots` — rejected; the durable
    Series decision already forbids extending `evidence_snapshots`, and
    admission metadata does not fit its shape.
  - Let the engine read compact customer data model rows directly — rejected;
    superseding rows destroy observation history and carry no admission
    metadata, making posteriors unauditable.

## Risks / Trade-offs

- Risk: scope creep from "internal observations" toward de facto product
  storage. → Mitigation: blocked-feed list stays enumerated and tested;
  routes/UI/exports remain false; any widening requires a new exact-scope
  proposal.
- Risk: a second READY path weakens the promotion gate. → Mitigation: the
  confidence path requires its own full proof set (consumer identity,
  admission metadata, k>=10 posture, append-only boundary) — it is an
  alternative, not a shortcut.
- Risk: observation ledger grows unbounded. → Mitigation: append-only compact
  refs only; retention follows the existing sunset policy requirement in
  SCOPE_GUARDRAILS.md and must be stated in the implementation decision.

## Migration Plan

Additive only. No existing artifact changes state; the customer-history
decision output remains byte-stable. Rollback = delete the new decision/gate
acceptance path; nothing downstream depends on it until the separate
implementation decision runs.

## Open Questions

- Retention window for internal observations (proposed: match the shortest
  window that supports Day 365 posterior audit, then prune).
- Whether admission/exclusion reason codes should be shared with the planned
  backend `FailClosedReason` enum from day one (preferred) or mapped later.
