# AI Value Evidence Collection Assembler Contract

Schema version: `FT_AI_VALUE_EVIDENCE_COLLECTION_ASSEMBLY_2026_06`

## 1. Purpose

The AI Value Evidence Collection Assembler is a non-persisted bridge from a
validated Measurement Plan plus validated Source Packages into a draft Evidence
Snapshot input.

It exists to answer one narrow question: given the current plan and available
aggregate evidence packages, what Evidence Snapshot posture can be safely
validated?

It is not ingestion. It is not persistence. It is not a backend route. It is
not frontend UI. It does not create `claim_readiness_snapshots`,
`executive_readout_snapshots`, or customer-facing economic output.

Related contracts:

- [AI Value Measurement Plan](../ai-value-measurement-plan/README.md)
- [AI Value Source Packages](../ai-value-source-packages/README.md)
- [AI Value Evidence Snapshot](../ai-value-evidence-snapshot/README.md)
- [AI Value Claim Readiness Handoff](../ai-value-claim-readiness-handoff/README.md)

## 2. Inputs

The assembler accepts:

- one validated Measurement Plan;
- zero or more validated Source Packages.

Source Packages remain evidence inputs only. They can contribute source refs,
evidence layer posture, caveats, blocked uses, k-min posture, governance
posture, and aggregate-safe workforce context. They cannot create full Playbook
coverage by themselves.

Evidence-bearing Source Packages must match the Measurement Plan's `org_id`,
covered baseline window, and approved aggregate grain before they can feed the
draft Evidence Snapshot. Aggregate workforce context packages may use a
separate approved aggregate grain such as role family or cohort, but remain
context only and cannot upgrade coverage.

## 3. Output

The assembler returns an `EvidenceCollectionAssembly` object with:

- `schema_version`
- `evidence_collection_assembly_id`
- `org_id`
- `measurement_plan_id`
- `measurement_plan_validation_result`
- `source_package_ids`
- `source_package_validation_results`
- `source_package_plan_mismatch_gaps`
- `draft_evidence_snapshot_input`
- `feeds`
- `generated_at`
- `derivation_version`

The `feeds` object is intentionally narrow:

- `evidence_snapshot_input: true` only when the draft Evidence Snapshot validates;
- `claim_readiness_snapshot: false`;
- `executive_readout_snapshot: false`;
- `customer_facing_economic_output: false`.

## 4. Evidence Posture Rules

The assembler must classify Playbook evidence requirements as present, partial,
missing, held, suppressed, or not computed. Missing, held, suppressed, and
not-computed lanes must remain explicit as caveats in the draft Evidence
Snapshot.

Layer 1 BigQuery telemetry can support a `layer_1_only` snapshot. It cannot
validate full Playbook coverage, ROI, EBITA, causality, productivity, headcount
reduction, individual attribution, manager/team comparative ordering, people
decisioning, or customer-facing financial output.

Layer 2 evidence must come from aggregate user voice, AI Fluency, survey,
workflow observation, or empirical export packages.

Layer 3 evidence must come from customer-attested aggregate business
system-of-record outcome packages with metric-owner review or explicit caveat.

Governance evidence must remain present before full coverage can be validated.

Assumption evidence must be present and approved, or explicitly not required by
the Evidence Snapshot contract, before full coverage can be validated.

## 5. Full Coverage Gate

`coverage_status: "full_playbook_coverage"` is allowed only when all of these
conditions hold:

- Layer 1 platform telemetry is present or partial with caveats;
- Layer 2 user voice or empirical evidence is present;
- Layer 3 business system-of-record outcome evidence is present;
- governance evidence is present;
- assumption evidence is approved or explicitly not required;
- all source package k-min checks clear;
- the privacy posture is aggregate-only and safe;
- missing, held, suppressed, or not-computed lanes are still carried forward as
  caveats where relevant.

BigQuery source availability alone cannot validate `full_playbook_coverage`.
VBD remains Layer 1 platform telemetry only. Aggregate workforce context remains
context only and cannot upgrade coverage by itself.

When full Playbook coverage is validated, the draft Evidence Snapshot may stop
carrying evidence-conditioned financial blockers such as `realized_roi`,
`roi_proof`, `dollarized_output`, `financial_value_claim`, and
`usage_derived_financial_claim`. This does not compute ROI, authorize EBITA, or
create customer financial output; it only lets later claim-readiness contracts
evaluate governed financial translation under their own gates. Immutable
blockers such as causality, productivity, headcount reduction, individual
attribution, `manager_or_team_ranking`, people decisioning, and
`ebita_claim`, and customer-facing financial output must remain present.

## 6. Fail-Closed Rules

Assembly fails closed when a source package is unsafe or invalid, including:

- raw rows;
- raw prompts, responses, transcripts, query text, or file contents;
- direct identifiers;
- hashed, pseudonymous, tokenized, or joinable person identifiers;
- person-level HRIS records;
- person-level productivity data;
- manager/team comparative ordering;
- people decisioning;
- compensation, performance, promotion, discipline, attrition, or HRIS
  inference from AI usage;
- k-min posture that cannot safely support the affected evidence.

If a source package fails k-min, affected evidence must be suppressed or held and
the draft Evidence Snapshot must carry the caveat forward.

## 7. Non-Goals

The assembler must not:

- run BigQuery queries;
- ingest source exports;
- store raw rows;
- persist Measurement Plans, Source Packages, Evidence Snapshots, claim
  readiness, or executive readouts;
- create migrations;
- add backend routes;
- add frontend UI;
- create claim readiness snapshots;
- create executive readout snapshots;
- compute ROI, EBITA, productivity, causality, financial impact, or
  customer-facing financial output.

## 8. Examples

Validator-backed examples:

- [`examples/telemetry-only-assembly.json`](./examples/telemetry-only-assembly.json)
- [`examples/full-playbook-assembly.json`](./examples/full-playbook-assembly.json)
- [`examples/missing-layer-3-assembly.json`](./examples/missing-layer-3-assembly.json)

## 9. Validation

Run:

```bash
npm run test:ai-value-evidence-collection-assembler
```

The tests validate the examples, prove Layer 1 telemetry remains caveated, prove
full Playbook coverage requires Layer 2, Layer 3, governance, approved
assumptions, k-min, and safe privacy posture, and verify that the assembler
does not compute downstream financial, productivity, causality, claim
readiness, or readout outputs.
