# AI Value Canonical Claim Trace

Schema version: `FT_CANONICAL_CLAIM_TRACE_V1`.

Slice F defines one internal, read-only, aggregate-only trace projection. An
`ADMIN` or `ENABLEMENT_LEAD` may request it only through the future exact
current canonical identity binding route. A binding identifier is a lookup
capability, never a response field. This contract adds no endpoint by itself.

The authorized variant contains only the fixed allowlisted stages: approved
hypothesis and measurement versions; admitted aggregate evidence state;
authorized policy state; one observed, non-attributable movement with the
fixed caveats; and current bound readout state. It contains no organization,
workflow, JBTD, persona, cohort, user, reviewer, actor, binding, packet,
claim, manifest, commitment, hash, attestation, journal, source locator, raw
event, prompt, transcript, email, name, secret, rendered HTML, or generic
stored-object payload.

All authenticated lookup, authority, freshness, or reconciliation failures
use the byte-identical fixed `HOLD` variant. `HOLD` is a claim-trace transport
state, not a suppression reason, and does not modify a FluencyTracr verdict.
The trace is never customer-facing, mutation-authorized, or export-authorized.

The future route must revalidate the exact current binding and all required
hypothesis, measurement, evidence, policy, claim, bundle-attestation,
renderer, and source-head authority before projection. Legacy HTML remains
non-authoritative compatibility behavior and must be explicitly demoted; it
does not become equivalent to this JSON trace.

This contract creates no database migration, persistence type, canonical event,
suppression reason, threshold, override, score, ranking, ROI, causal claim,
productivity measure, prediction, deployment, or customer-facing output.
The synchronized machine-readable contract is
[`canonical-claim-trace.schema.json`](../../../schemas/ai-value/canonical-claim-trace.schema.json).
