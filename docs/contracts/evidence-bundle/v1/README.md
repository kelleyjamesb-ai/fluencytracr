# EvidenceBundle v1 Contract

## Purpose (evidence, not compliance)
EvidenceBundle v1 is a partner-facing evidence contract for executive and operational visibility. It communicates whether evidence is present, not present, suppressed, or not computed. It does not compute, infer, or publish a compliance score.

Multi-agent readiness is a first-class design constraint. Human-operated systems and agentic systems can both produce and consume EvidenceBundle payloads for ingestion, review, and downstream reporting.

## EvidenceStatus enum: present, not_present, suppressed, not_computed
EvidenceStatus is the canonical state machine for signal-level evidence:
- `present`
- `not_present`
- `suppressed`
- `not_computed`

Signal fields MUST use EvidenceStatus directly, or use a structured object with:
- `status` (EvidenceStatus)
- optional bounded aggregate fields

## Versioning policy: additive-only for v1, breaking changes require v2
- EvidenceBundle v1 changes are additive-only.
- Existing required fields and semantics cannot be repurposed in v1.
- Any breaking change requires a new schema version line (`evidence_bundle.v2`).

Contract compatibility promise:
Partners integrating against `evidence_bundle.v1` can rely on stable required fields and stable enum meanings throughout v1. New optional fields may be added, but v1 consumers should remain forward-compatible without payload breakage.

## Suppression rules: k-min, irreducible aggregation, no org-structure slicing in exec mode
- Suppression is explicit in the `suppression` object.
- `k_min` sets the minimum aggregation floor for reportability.
- Suppression applies when privacy and safety conditions are not met.
- Executive mode is irreducibly aggregated and does not allow org-structure slicing.
- Suppression reasons are machine-readable enums for deterministic downstream handling.

## Optional forwarded distribution: surfaced aggregate evidence only
EvidenceBundle v1 may include `forwarded_distribution` only when
`suppression.suppression_applied` is `false`. This field mirrors the governed
V3 aggregate distribution that backed a surfaced verdict so downstream
consumers can perform bounded metric routing or re-check aggregate quality
signals without returning to raw telemetry.

The block is additive and optional. Legacy surfaced bundles may omit it, as
shown in `examples/minimal.json`. Suppressed bundles must omit it, as enforced
by the JSON schema and shown in `examples/suppressed.json`.

Allowed content is aggregate-only:
- cohort percentile distributions;
- distribution moments;
- governed workflow or surface taxonomy IDs;
- cohort/window/calibration metadata;
- AIVM `value_type` and `evidence_grade`; and
- an explicit privacy marker showing aggregate-only and no person-level fields.

Forbidden content remains forbidden inside the forwarded block: raw rows, raw
skill names, user IDs, actor IDs, names, email addresses, prompts, outputs,
messages, transcripts, action rows, free text, hashed or joinable person
identifiers, person-level HRIS records, or any sub-5 cohort evidence.

Aggregate HRIS-derived workforce context may be referenced only as
customer-approved source context or outcome evidence at a cohort-safe grain. It
must not become people decisioning, compensation/performance inference,
promotion/discipline inference, attrition prediction, manager/team ranking,
individual productivity, or HRIS inference from AI usage.

## Coverage map requirement: always include instrumented and missing sources
- Every payload MUST include `coverage.instrumented_sources`.
- Every payload MUST include `coverage.missing_sources`.
- Coverage notes SHOULD describe known instrumentation gaps and evidence quality caveats.
- When derived from a Glean Signal Readiness Map, only `present` readiness entries may contribute to `coverage.instrumented_sources`; `missing`, `suppressed`, and `not_computed` entries must remain visible in `coverage.missing_sources` and notes.

## Security and privacy: no raw prompt/output content, no user identifiers
- No raw prompt text, model output text, or transcript content in this contract.
- No user identifiers, email addresses, or person-level IDs.
- No hashed, pseudonymous, tokenized, or otherwise joinable person identifiers.
- Data is aggregate evidence posture only, with suppression as the default privacy-preserving fallback.

## Canonical Contract Artifacts
- Schema: `docs/contracts/evidence-bundle/v1/evidence-bundle.schema.json`
- Examples: `docs/contracts/evidence-bundle/v1/examples/minimal.json`, `docs/contracts/evidence-bundle/v1/examples/full.json`, `docs/contracts/evidence-bundle/v1/examples/suppressed.json`
- Changelog: `docs/contracts/evidence-bundle/v1/CHANGELOG.md`
