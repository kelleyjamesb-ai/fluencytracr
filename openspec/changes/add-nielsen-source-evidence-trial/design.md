## Context

The product needs to test whether customer value documents can be mapped into FluencyTracr evidence posture without confusing slideware with observed source evidence.

## Goals

- Represent Nielsen deck and Time-Saves packet observations as sanitized claim candidates.
- Generate an `AEI_2026_05` Aggregate Evidence Import package from those candidates.
- Show which candidates are accepted for review and which are withheld behind source-system, approval, or telemetry gaps.
- Preserve `claim_readiness_effect: no_readiness_upgrade`.

## Non-Goals

- No live Glean access.
- No source-system export ingestion.
- No persistence.
- No raw document text, slide notes, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or person-level metrics.
- No ROI calculation.
- No customer-safe financial language enablement.

## Decisions

- Use a separate `NSETR_2026_05` wrapper instead of expanding `AEI_2026_05` into a document parser.
- Store sanitized `source_locator` values such as slide or section references, not document content.
- Treat deck-derived claims as claim candidates. They can be accepted for review as narrative context, but external outcomes, financial claims, and telemetry-dependent claims remain withheld until the relevant source evidence is attached.
- Keep the generated import path as `admin_exported_aggregate_upload`.

## Risks / Trade-Offs

- Risk: reviewers may interpret deck-derived financial values as approved value evidence. Mitigation: financial candidates are withheld and internal-only until approval is attached.
- Risk: person-level examples in the deck could leak into fixtures. Mitigation: the fixture uses aggregate values only and tests block direct names and person-level field shapes.
- Risk: "ingestion" language may imply persistence. Mitigation: docs and helper copy use "trial", "mapping", and "review-only".

