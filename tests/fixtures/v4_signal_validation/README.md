# V4 Signal Validation Fixtures

This directory anchors dogfood-only V4 signal validation test fixtures.

- `complete/` includes three aggregate windows each for refinement, delegation,
  reusable workflow propagation, and Velocity x Depth.
- `forbidden_field/` includes an unsafe aggregate export shape with a
  person-level field header so the harness can fail closed.
- `incomplete/` includes an export missing a required aggregate column.
- `two_windows/` includes fewer than three comparable windows to prove the
  output defaults to `HOLD`, not `PROMOTE`.

These fixtures avoid raw prompts, raw outputs, transcripts, and raw event rows.
