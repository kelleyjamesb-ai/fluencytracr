"""FluencyTracr inference proof harness (internal-only, synthetic data only).

This package is the Python side of the Python/TypeScript boundary defined in
``docs/contracts/confidence-inference-methodology/README.md``:

- Python (this package) owns ALL statistical computation: model
  specification, NUTS sampling (PyMC), and diagnostics (ArviZ).
- TypeScript (``packages/confidence-engine``) owns ALL governance and
  validation. Artifacts cross the boundary only as JSON validated by the
  ``ConfidenceModel`` Zod schemas.

Slice 2 Phase A ships only this package skeleton, its pinned environment
(``requirements.lock``), and environment smoke tests. The hierarchical
Bayesian difference-in-differences model from the contract's
implementation-grade equation (estimand ``delta`` = treatment-by-post
interaction, with partially pooled expectation-path / workflow / function /
cohort / organization effects; normal continuous aggregate path with
identity link first) lands in a later phase of this slice.

Posture pins (normative, per the contract): synthetic generators only, no
real observations, no network or connector imports, ``internal_only: true``,
``customer_output_authorized: false``, ``probability_output_authorized:
false``, ``confidence_output_authorized: false``.
"""

__version__ = "0.1.0"
