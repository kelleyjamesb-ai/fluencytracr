# Calibration Changelog

Calibration baselines are immutable once shipped. Additions must create a new
JSON file under `calibration/baselines/` and record the governance rationale
here.

## scio-prod-60d-2026-05

- Source: scio-prod scrubbed GCE, 1,553 distinct users, 60-day window.
- Purpose: initial V3 Velocity calibration reference for frequency,
  engagement, and breadth.
- Governance note: this is a versioned reference baseline, not a tunable
  threshold or admin override.
