# V4 Signal Validation Fixtures

This directory anchors dogfood-only V4 signal validation test fixtures.

The test suite writes temporary CSV inputs from deterministic fixture builders so
the harness can exercise stable windows, missing columns, and governance-failure
paths without storing row-level or person-level data in the repository.
