# Methodology Snapshot Registry

The Methodology Snapshot Registry records how an AI value estimate was produced before any claim language is generated. It keeps FluencyTracr positioned as the evidence governance layer: Glean or another source system may estimate value, while FluencyTracr decides whether the resulting claim is admissible, caveated, internal-only, customer-safe, or suppressed.

## Contract

- `schema_version`: `MSR_2026_05`
- `registry_id`, `org_id`, `generated_at`, `source_system`
- `snapshots[]`: frozen methodology records with source system, source model, methodology version, reporting window, covered/excluded surfaces, assumption references, approval state, customer-safe claim effect, frozen report snapshot reference, and caveats

## Approval Semantics

| Approval state | Claim effect |
| --- | --- |
| `customer_safe` | Can enable customer-facing ROI, payback, or finance-approved value language when evidence supports it |
| `finance_approved` | Can support internal-only financial language |
| `data_science_approved` / `internal_review` | Supports directional or caveated methodology language, not ROI |
| `draft` / `rejected` / `expired` | Suppresses or blocks financial value claims |

## Governance Boundaries

The registry rejects raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, and hidden reconstruction fields.

It also rejects duplicate methodology snapshot IDs, surfaces listed as both covered and excluded, and customer-safe claim effects without `customer_safe` approval.

## Nielsen-Style Fixture

`examples/nielsen-style-methodology-snapshots.json` includes Glean Time-Saves MVP as a source-system snapshot, an internal Nielsen-style ROI/payback fixture, an agentic work placeholder method, and a suppressed unapproved value model.

The intent is to show that ROI is the final claim layer, not the core product object.
