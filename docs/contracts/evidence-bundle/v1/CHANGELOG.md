# EvidenceBundle v1 Changelog

## 2026-06-11

- Added optional `forwarded_distribution` for surfaced aggregate evidence.
- Kept the field additive and absent from legacy surfaced bundles.
- Enforced that suppressed bundles cannot include `forwarded_distribution`.
- Preserved the aggregate-only privacy boundary: no raw rows, direct
  identifiers, raw text, prompts, outputs, transcripts, raw skill names, or
  action rows.
