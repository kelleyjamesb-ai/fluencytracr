# AI Value Contribution Alignment Governed Diagnostics Sufficiency Evidence Source

Validator/runner:
`scripts/run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_2026_06`

## Purpose

Governed Diagnostics Sufficiency Evidence Source is the internal-only,
aggregate-only source contract for reviewed diagnostics and comparison-design
evidence that may later be considered by the Diagnostics Evidence Packet.

It answers:

```text
Which governed source refs and hashes support marking diagnostics evidence as satisfied for packet review?
```

It does not answer:

```text
Should the Bayesian fixture be promoted?
Can posterior interpretation, confidence, probability, customer-facing output, ROI, finance, causality, productivity, or economic output be shown?
```

## States

```text
GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW
HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Held is the default. A ready source means only this:

```text
The source has explicit reviewed evidence refs and source evidence hashes for packet review.
```

Ready does not authorize promotion, posterior interpretation, confidence output,
probability output, customer-facing output, ROI, finance output, causality
claims, productivity measurement, live connector execution, routes, UI, schemas,
exports, or persistence.

## Source Binding

The source binds to the contained Internal Bayesian Execution Runtime:

- runtime schema, state, class, id, and hash;
- fixture artifact hash;
- aggregate Measurement Cell design metadata;
- missing, suppressed, and held window counts;
- raw-row, identifier, and query-text absence checks.

The source must hold if the runtime drifts, contains suppressed/missing/held
Measurement Cell windows, is not aggregate-only, contains raw rows, contains
identifiers, exposes query text, or fails the contained runtime validation.

## Evidence Dimensions

The source represents these dimensions:

```text
comparison_design_adequacy
convergence_diagnostics
posterior_predictive_checks
prior_sensitivity
residual_fit_checks
calibration_backtest
feature_weight_provenance
```

Each satisfied dimension requires:

```text
reviewed_source_evidence_ref=internal_diagnostics_sufficiency_evidence.<dimension>.2026_06
reviewed_source_evidence_hash
source_evidence_hash
aggregate_only_scope=true
suppressed_missing_held_windows_clear=true
eligible_for_satisfied_representation=true
placeholder_evidence=false
generated_fixture_evidence=false
evidence_satisfied=true
```

The reviewed source evidence envelope must also include a hash-bound manifest:

```text
reviewed_evidence_manifest_hash
reviewed_evidence_manifest.schema_version=FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_2026_06
reviewed_evidence_manifest.manifest_state=REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_INTERNAL_ONLY
reviewed_evidence_manifest.internal_only=true
reviewed_evidence_manifest.aggregate_only=true
reviewed_evidence_manifest.source_runtime_ref.runtime_hash=<source runtime hash>
reviewed_evidence_manifest.source_runtime_ref.fixture_artifact_hash=<fixture artifact hash>
reviewed_evidence_manifest.evidence_dimensions.<dimension>.reviewed_source_evidence_ref
reviewed_evidence_manifest.evidence_dimensions.<dimension>.reviewed_source_evidence_hash
reviewed_evidence_manifest.evidence_dimensions.<dimension>.aggregate_only_scope=true
reviewed_evidence_manifest.manifest_hash=<hash of manifest body>
```

The envelope `reviewed_evidence_manifest_hash` must match the manifest
`manifest_hash`, and each dimension's reviewed ref/hash must match the manifest
entry for that dimension. A free-standing 64-character reviewed hash is not
sufficient. Runtime-only hashes, self-manufactured hashes, placeholder hashes,
or generated fixture hashes must fail closed unless they are bound to the
explicit internal reviewed evidence manifest. A self-consistent caller-built
manifest is also insufficient: each dimension's `reviewed_source_evidence_hash`
must match the recognized governed reviewed-evidence hash family for that
dimension and source ref.

The reviewed source evidence hash must be a durable hash for explicit
internal-only reviewed evidence outside the contained runtime fixture. It must
not be derived only from the runtime hash, fixture artifact hash, dimension
name, placeholder text, generated fixture defaults, or posterior-like prototype
values.

The source evidence hash is then bound to:

```text
schema_version=FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06
evidence_dimension
source_evidence_ref
reviewed_source_evidence_hash
source_runtime_hash
source_fixture_artifact_hash
internal_only=true
aggregate_only=true
evidence_satisfied=true
```

Placeholder text, generated fixture defaults, and posterior-like prototype
values are not eligible evidence and must not mark any dimension satisfied.
Placeholder-looking refs, generated-fixture refs, confidence fields,
probability fields, score-like fields, raw rows, query text, and identifiers
must reject fail-closed.

## Default Output

Without reviewed diagnostics source evidence, the emitted source must hold:

```text
source_state=HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE
evidence_sufficiency.all_required_evidence_satisfied=false
allowed_next_step=complete_governed_diagnostics_sufficiency_evidence_source
```

All evidence dimensions remain unsatisfied, all reviewed source evidence hashes
remain null, and all source evidence hashes remain null.

The source also emits a report-only reconciliation object:

```text
evidence_readiness_reconciliation.reconciliation_state=HOLD_MISSING_GOVERNED_REVIEWED_EVIDENCE
evidence_readiness_reconciliation.governed_reviewed_evidence_supplied=false
evidence_readiness_reconciliation.source_runtime_ready=<true only when the runtime is valid and aggregate-only>
evidence_readiness_reconciliation.satisfied_dimensions=[]
evidence_readiness_reconciliation.unsatisfied_dimensions=[all required dimensions]
evidence_readiness_reconciliation.missing_evidence_by_dimension.<dimension>=[missing requirements]
evidence_readiness_reconciliation.holding_reasons=[source/runtime/evidence gaps]
```

For each unsatisfied dimension, `missing_evidence_by_dimension` names the
specific missing requirements. This metadata is diagnostic only. It does not
create evidence, does not mark dimensions satisfied, and does not feed promotion.

## Ready Output

If all governed refs and hashes validate, the source may emit:

```text
source_state=GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW
allowed_next_step=diagnostics_evidence_packet_update_only
feeds.diagnostics_evidence_packet=true
```

That feed only allows the Diagnostics Evidence Packet to accept or reject the
source in a later update path. It does not feed the Bayesian Promotion Decision
Gate directly and it does not make the reviewed source hash sufficient by
itself.

When all dimensions are complete, the reconciliation object reports:

```text
evidence_readiness_reconciliation.reconciliation_state=GOVERNED_REVIEWED_EVIDENCE_COMPLETE
evidence_readiness_reconciliation.governed_reviewed_evidence_supplied=true
evidence_readiness_reconciliation.source_runtime_ready=true
evidence_readiness_reconciliation.satisfied_dimensions=[all required dimensions]
evidence_readiness_reconciliation.unsatisfied_dimensions=[]
evidence_readiness_reconciliation.missing_evidence_by_dimension.<dimension>=[]
evidence_readiness_reconciliation.holding_reasons=[]
```

If only partial reviewed evidence is supplied, the source remains held with:

```text
evidence_readiness_reconciliation.reconciliation_state=HOLD_INCOMPLETE_GOVERNED_REVIEWED_EVIDENCE
evidence_readiness_reconciliation.governed_reviewed_evidence_supplied=true
evidence_readiness_reconciliation.satisfied_dimensions=[only dimensions with complete manifest-bound evidence]
evidence_readiness_reconciliation.unsatisfied_dimensions=[dimensions with missing or invalid evidence]
evidence_readiness_reconciliation.missing_evidence_by_dimension.<dimension>=[exact missing requirements]
evidence_readiness_reconciliation.holding_reasons=[source/runtime/evidence gaps]
```

The ready feed remains false until every required dimension has explicit
reviewed source evidence refs, reviewed source evidence hashes, source evidence
hashes bound to the runtime and fixture artifact, aggregate-only scope, clean
suppressed/missing/held window status, eligible representation, and no
placeholder or generated-fixture evidence.

The runner also exports a source-to-packet projection helper:

```text
buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source)
```

The helper returns a packet-side evidence object only when the governed source
is ready and validates. The projection uses:

```text
schema_version=FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06
evidence_state=DIAGNOSTICS_SUFFICIENCY_EVIDENCE_GOVERNED_INTERNAL_ONLY
evidence_class=diagnostics_sufficiency_evidence_only
promotion_authorized=false
```

For each packet-side dimension, the projection carries both
`reviewed_source_evidence_hash` and `source_evidence_hash`. The packet/review
path must preserve both hashes so a later Promotion Decision Gate can reject
missing or forged diagnostics evidence.

If the governed source is held or rejected, the helper returns no packet-side
evidence. This keeps the default executable path held while giving the next
Diagnostics Evidence Packet Update slice a narrow, hash-bound input to review.

## Promotion Boundary

The source must keep:

```text
promotion_authorized=false
promotion_blocked=true
posterior_interpretation_authorized=false
confidence_probability_authorized=false
customer_economic_output_authorized=false
internal_bayesian_execution_artifact_v1_authorized=false
```

The source must keep:

```text
bayesian_promotion_decision_gate=false
internal_bayesian_execution_artifact_v1=false
posterior_interpretation=false
posterior_output=false
confidence_output=false
probability_output=false
score_like_output=false
customer_facing_output=false
economic_output=false
roi_output=false
finance_output=false
causality_output=false
productivity_output=false
route_creation=false
ui_creation=false
schema_creation=false
persistence_write=false
export_creation=false
live_connector_execution=false
```

## Feature Weight Policy

Feature weight provenance remains structural and internal:

```text
weights_structural_internal_only=true
weights_not_confidence_scores=true
weight_provenance_version_present=true
weight_provenance_version=internal_structural_equal_weights_2026_06
customer_facing_weight_output=false
```

Feature weights are not confidence scores, probability outputs, model scores,
customer-facing weights, ROI inputs, or economic claims.

## Non-Authorization

This contract does not authorize:

- promotion;
- Internal Bayesian Execution Artifact v1 creation;
- posterior interpretation;
- posterior output;
- confidence output;
- probability output;
- customer-facing output;
- economic output;
- finance output;
- ROI;
- causality claims;
- productivity measurement;
- routes, UI, schemas, exports, persistence writes, or live connector execution.

## Validation

Run:

```bash
npm run test:ai-value-contribution-alignment-governed-diagnostics-sufficiency-evidence-source
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-governed-diagnostics-sufficiency-evidence-source
```
