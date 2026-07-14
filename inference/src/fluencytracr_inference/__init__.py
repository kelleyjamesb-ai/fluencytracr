"""FluencyTracr inference proof harness (internal-only, synthetic data only).

This package is the Python side of the Python/TypeScript boundary defined in
``docs/contracts/confidence-inference-methodology/README.md``:

- Python (this package) owns ALL statistical computation: model
  specification, NUTS sampling (PyMC), and diagnostics (ArviZ).
- TypeScript (``packages/confidence-engine``) owns ALL governance and
  validation. Artifacts cross the boundary only as JSON validated by the
  ``ConfidenceModel`` Zod schemas.

Slice 2 Phase B2 layout (Phase A shipped the skeleton + pinned environment):

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
- ``synthetic_study`` — computed synthetic calibration/null/floor study inputs
  for the artifact gate, with a full >=200-replication path and a smoke path
  that cannot be converted into artifact inputs; null false-eligibility is
  measured two-sided with a compiled finite-sample correction
- ``negative_control_study`` — internal sidecar report for required task-3.3
  negative controls and floor controls; it validates emitted artifacts and
  does not extend the artifact schema or authorize task completion
- ``acceptance_study`` — internal sidecar metadata for the remaining task-3.3
  acceptance gap; it labels aggregate approximation versus sampler-artifact
  evidence, supports reduced-draw smoke batches and full-settings
  sampler-artifact batches for required effect/cohort cells, combines
  non-overlapping batches in memory or from sanitized sidecar reports, emits a
  deterministic stdout-only full-run plan, verifies the exact planned
  replication slot grid, computes aggregate coverage/null summaries, requires
  a runner-generation proof hash for in-process full evidence, marks
  an in-process runner token so manually constructed dataclasses cannot
  impersonate generated evidence, marks rehydrated report evidence
  non-authorizing, counts runner exceptions as invalid/unusable rows, and
  still does not authorize artifact inputs or task completion
- ``task_3_3_evidence`` — internal recompute-first required-evidence ledger
  binding sampler-artifact acceptance to freshly recomputed negative-control
  and floor-control artifact reports; it summarizes and hashes component
  reports but still authorizes no artifact input or task completion
- ``artifact``   — the ``InferenceProofArtifactSchema``-shaped emitter
  (eligible only when every gate passes; otherwise HOLD naming every failure;
  contribution-estimate authorization additionally requires the compiled null
  false-eligibility guard to exclude zero)
- ``ai_fluency_measurement_*`` and ``ai_fluency_ordinal_measurement`` —
  separate synthetic-only aggregate ordinal measurement proof for the frozen
  24-item long form. Smoke/partial evidence HOLDS; the full fixed 800-slot
  evidence run remains pending and authorizes no real-data or customer output.
- ``design_router`` and ``longitudinal_*`` — sibling synthetic-only Phase 2B
  prototype for ``first_longitudinal_synthetic_model_slice``. It emits a
  separate internal smoke artifact for aggregate historical longitudinal
  outcome proof mechanics, not a DiD artifact and not replicated calibration
  or production promotion.

The Phase B2 calibration study (>= 200 replications per cell) consumes the
generators and feeds computed study sections into the ``artifact.run_proof``
entry point; Phase B3 proves the Python-to-TypeScript round trip.

Posture pins (normative, per the contract): synthetic generators only, no
real observations, no network or connector imports, ``internal_only: true``,
``customer_output_authorized: false``, ``probability_output_authorized:
false``, ``confidence_output_authorized: false``.
"""

__version__ = "0.1.0"
