# V4 Depth Readout Fixtures

Synthetic aggregate CSV fixtures for the dogfood-only V4 Depth Readout Engine.

- `complete/` covers all six allowed zones and includes optional reusable
  workflow propagation exports marked `HOLD`.
- `missing_required_file/` omits one required velocity window.
- `forbidden_field/` includes a forbidden person-level field header.

Fixtures are aggregate-only and intentionally contain no raw prompts, raw
outputs, transcripts, or raw event rows.
