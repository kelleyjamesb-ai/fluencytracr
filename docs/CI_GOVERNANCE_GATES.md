# CI Governance Gates (V1)

Purpose: define CI gates Kiln will implement to enforce V1 governance requirements. This is a specification only.

## Inputs validated by gates
- `docs/contracts/FluencyTracr_V1_Phase1_Event_Contract.md`
- `docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md`
- `docs/ENFORCEMENT_SPEC.md`

## CI integration points (paths)
- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`
- `scripts/` (contract validation scripts to be added here)

## Blocking checks (must fail PR)
1) Phase 1 event schema conformance
- Event names and required fields must match the Phase 1 contract.
- Unknown event names are rejected.

2) Reason-code invariants
- Internal candidate `SUPPRESS` => exactly one internal `SUPP_*`
  `suppress_reason_code`; `SURFACE` => no internal reason code.
- Product-facing `verdict: SUPPRESS` => exactly one of the five canonical
  suppression reasons; internal `SUPP_*` diagnostics must not cross a route,
  export, render, or customer-artifact boundary.
- `schemas/ft_v1_evaluation_decision.schema.json` remains a SURFACE-only
  render/export allowlist, not an internal SUPPRESS serialization schema.

3) Ambiguity suppression precedence
- Any ambiguity must result in SUPPRESS and must not surface.

4) Windowing gate
- Window lengths 30-59 days must never SURFACE.

5) No content or identifiers
- Build fails if forbidden fields appear in any event schema or output contract.

## Advisory checks (non-blocking, minimal)
- Documentation link integrity for the three input contracts.

## Contract Gates
- EvidenceBundle v1 schema exists and examples validate
- /api/ingest doc exists and is linked from README
- Glean integration docs exist

Contract validation command:
- `bash scripts/validate_evidence_bundle_schema.sh`

## QA appendix (required invariants and test locations)
These tests must exist and remain fail-closed. Proposed locations:
- `backend/tests/v1_contract_invariants.test.ts`
  - Ambiguity flag/reason coupling.
  - Reason-code invariants for SURFACE/SUPPRESS.
  - Windowing gate (30-59 days).
- `backend/tests/v1_privacy_invariants.test.ts`
  - No content fields or identifiers in payloads or outputs.
  - No individual-level artifacts in responses.
- `backend/tests/v1_suppression_properties.test.ts`
  - Deterministic suppression behavior with edge cases.
  - Fail-closed behavior under missing inputs.
