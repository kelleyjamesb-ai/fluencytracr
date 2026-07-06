"""FluencyTracr inference proof harness (internal-only, synthetic data only).

This package is the Python side of the Python/TypeScript boundary defined in
``docs/contracts/confidence-inference-methodology/README.md``:

- Python (this package) owns ALL statistical computation: model
  specification, NUTS sampling (PyMC), and diagnostics (ArviZ).
- TypeScript (``packages/confidence-engine``) owns ALL governance and
  validation. Artifacts cross the boundary only as JSON validated by the
  ``ConfidenceModel`` Zod schemas.

Slice 2 Phase B1 layout (Phase A shipped the skeleton + pinned environment):

- ``constants``  — numeric gates and vocabularies mirrored from the TS contract
- ``hashing``    — byte-parity port of the TS ``stableStringify`` + sha256 spine
- ``synthetic``  — seeded synthetic Measurement Cell generators + negative controls
- ``model``      — the contract equation (hierarchical Bayesian DiD; estimand
  ``delta`` = treatment-by-post interaction, sampled as
  ``contribution_alignment_effect``; partially pooled expectation-path /
  workflow / function / cohort / organization effects; normal continuous
  aggregate path, identity link; seeded NUTS)
- ``diagnostics`` — every gate computed as a real value (R-hat, ESS, MCSE,
  divergences, treedepth/BFMI warnings, PPC, prior sensitivity, pre-trend)
- ``artifact``   — the ``InferenceProofArtifactSchema``-shaped emitter
  (eligible only when every gate passes; otherwise HOLD naming every failure)

The Phase B2 calibration study (>= 200 replications per cell) consumes the
generators and the ``artifact.run_proof`` entry point; Phase B3 proves the
Python-to-TypeScript round trip.

Posture pins (normative, per the contract): synthetic generators only, no
real observations, no network or connector imports, ``internal_only: true``,
``customer_output_authorized: false``, ``probability_output_authorized:
false``, ``confidence_output_authorized: false``.
"""

__version__ = "0.1.0"
