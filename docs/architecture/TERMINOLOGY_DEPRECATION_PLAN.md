# Terminology Deprecation Plan

Status: active migration guidance

This plan deprecates confusing or over-claiming language without renaming schemas, breaking object contracts, or weakening governance rules.

| Term | Status | Replacement | Migration Timing |
| --- | --- | --- | --- |
| ROI-first language | Deprecated for user-facing surfaces | Value realization, Value Scenario, Value Accounting | Start immediately in docs, readouts, and UI labels. Keep schema names until a future contract migration. |
| ROI Scenario as a heading | Alias only | Value Scenario | Use in executive and client-facing surfaces immediately. Keep `roi_scenario` internally. |
| Financial Claim Gate as a heading | Alias only | Financial Claim Review | Use in readouts and UI labels immediately. Keep `financial_claim_gate` internally. |
| EBITA Impact Bridge as a heading | Alias only | Financial Translation | Use in readouts and UI labels immediately. Keep `ebita_impact_bridge` internally. |
| Executive Packet | Alias only | Executive Readout | Use "Executive Readout" for sponsor-facing artifact language. |
| Claim Boundary as a heading | Deprecated for user-facing surfaces | Value Realization, Governance Boundary | Replace on new user-facing screens and generated artifacts. Keep object and validator names. |
| Time-saved language | Deprecated as standalone value claim | Capacity Created, Capacity Reallocated, Productivity Recapture | Use immediately when discussing value. Time saved may appear only as an input or hypothesis. |
| Activity-only language | Deprecated as value evidence | Operating Adoption Map, Measurement Evidence | Avoid implying usage or activity proves value. |
| Maturity language | Deprecated for product spine | AI Capability Baseline, Operating Adoption Map | Avoid static maturity labels, rankings, or scorecard framing. |
| Proof language | Restricted | Evidence, Measured Value, Validated Value | Only use "proof" if a later approved contract explicitly permits it. |
| Productivity measurement | Restricted | Aggregate Workflow Capacity or Productivity Recapture | Never use for individual, named employee, manager, or team ranking surfaces. |
| HR analytics | Split / restricted | Person-level HRIS analytics, HRIS inference, or Aggregate Workforce Context | Do not use as a blanket ban. Person-level HRIS analytics, HRIS inference, people decisioning, compensation/performance inference, manager/team ranking, and individual productivity remain blocked; aggregate HRIS-derived workforce context is allowed only when cohort-safe, customer-approved, and used for workflow-level value measurement. |

## Migration Rules

1. Prefer display labels and aliases before object renames.
2. Preserve schema names, enum values, validators, and API contracts until an explicit migration is approved.
3. Do not use language cleanup to expand allowed claims.
4. Do not remove caveats when replacing old labels.
5. Treat Value Accounting and Financial Translation as gated outputs, not default readout sections.

## Examples

| Before | After |
| --- | --- |
| "ROI Scenario Readiness" | "Value Scenario Readiness" |
| "EBITA Impact Bridge" | "Financial Translation" |
| "Financial Claim Gate" | "Financial Claim Review" |
| "Pre-ROI planning artifact" | "Value realization planning artifact" |
| "Time saved equals value" | "Capacity created requires recapture and redeployment before it can become realized value." |
| "Usage proves productivity" | "Aggregate workflow evidence may support a capacity hypothesis when gates allow it." |
