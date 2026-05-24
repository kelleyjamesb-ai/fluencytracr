# V4 Depth Readout Fixtures

Synthetic aggregate CSV fixtures for the dogfood-only V4 Depth Readout Engine.

These files are test fixtures only. They are not real BigQuery dogfood inputs
and should not be used as evidence for V4 Depth stability decisions.

- `complete/` covers all six allowed zones and includes optional reusable
  workflow propagation exports marked `HOLD`.
- `missing_required_file/` omits one required velocity window.
- `forbidden_field/` includes a forbidden person-level field header.

Fixtures are aggregate-only and intentionally contain no raw prompts, raw
outputs, transcripts, or raw event rows.

Real dogfood inputs belong in `dogfood-input/v4-depth-readout/` with the same
required filename pattern. Generated readout artifacts belong in
`dogfood-output/v4-depth-readout/`.
