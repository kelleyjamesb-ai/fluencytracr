"""CLI bridge entry point: emit one proof artifact as JSON on stdout.

Phase B3 (task 3.5) support: the confidence-engine Node bridge test
(``packages/confidence-engine/test/inference_proof_artifact_bridge.test.mjs``)
invokes this module as a subprocess to prove the Python-to-TypeScript round
trip against the ``InferenceProofArtifactSchema`` Zod boundary. It is a thin
wrapper around the existing entry points — :func:`~.artifact.run_proof` and
:func:`~.artifact.emit_proof_artifact` — with fixture inputs; no statistics
live here.

Usage (from the repo root, with the pinned ``inference/.venv`` environment
and ``PYTHONPATH=inference/src``)::

    python -m fluencytracr_inference --scenario eligible
    python -m fluencytracr_inference --scenario hold
    python -m fluencytracr_inference --scenario eligible --full
    python -m fluencytracr_inference --scenario hold --full

Modes:

- Default (bridge-fixture, seconds, deterministic): calls
  :func:`emit_proof_artifact` on a seeded synthetic dataset with clearly
  labeled BRIDGE FIXTURE fit/diagnostics carriers (the same pattern the
  harness's own gate tests use). This proves the emitter, the gate
  derivation, the governance pins, and the self-hash spine — not the
  sampler; the pytest suite proves the sampler on real NUTS fits.
- ``--full`` (real fit, minutes): calls :func:`run_proof` end to end (seeded
  NUTS fit + real diagnostics) without injecting fixture calibration/null
  study inputs. Until a caller supplies completed study inputs to
  :func:`run_proof`, the full CLI path emits a schema-valid HOLD rather than
  an eligible artifact.

Scenarios:

- ``eligible``: in default bridge-fixture mode, clean k=16 dataset with
  injected effect 0.5 SD; every fixture gate passes and the artifact parses
  ``eligible_internal_only`` at the boundary. In ``--full`` mode, the same
  clean fit fails closed until real calibration/null study inputs are supplied
  by a caller outside this CLI bridge.
- ``hold``: default mode uses the missing-windows negative control (HOLD
  naming ``missing_or_suppressed_windows``); ``--full`` mode uses the clean
  dataset with naive repeated evaluation detected (HOLD naming
  ``peeking_control``) so the HOLD rides a fully real fit.

Everything emitted is synthetic and internal-only; the artifact pins
``internal_only: true`` and every customer/probability/confidence output
authorization to false, with ``promotion_decision_ref: null``.
"""

from __future__ import annotations

import argparse
import json
import sys
from types import SimpleNamespace

import numpy as np

from .artifact import (
    emit_proof_artifact,
    phase_b1_fixture_calibration_scenarios,
    phase_b1_fixture_null_checks,
    phase_b1_fixture_floor_checks,
    run_proof,
)
from .constants import (
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_PPC_STATISTIC_NAMES,
    LIKELIHOOD_FAMILY_LINKS,
    SUPPORTED_LIKELIHOOD_FAMILY,
)
from .diagnostics import (
    DiagnosticsResult,
    ParameterDiagnostic,
    PpcStatistic,
    PreTrendResult,
    PriorSensitivityResult,
    SamplerDiagnostics,
)
from .hashing import sha256_json
from .model import PRIOR_SENSITIVITY_SCALINGS, FitResult, PriorSpec
from .synthetic import SyntheticDataset, generate_did_dataset, generate_missing_windows

DEFAULT_SEED = 20260706
DEFAULT_GENERATED_AT = "2026-07-06T00:00:00+00:00"

# Label recorded in the internal report for the fixture path so nobody can
# mistake bridge-fixture diagnostics for sampled ones (the artifact itself is
# schema-strict and carries no free-form provenance field).
BRIDGE_FIXTURE_LABEL = "phase-b3-bridge-fixture-diagnostics-not-sampled"


def _bridge_fixture_fit(dataset: SyntheticDataset, *, seed: int) -> FitResult:
    """BRIDGE FIXTURE: a deterministic FitResult carrier (no sampling).

    Only :meth:`FitResult.estimand_summary` is consumed by the emitter (for
    ``hash_bindings.source_posterior_hash``), so a seeded draw matrix behind
    the same dataclass is a faithful, clearly-bounded stand-in.
    """
    rng = np.random.default_rng(seed)
    draws = rng.normal(loc=0.5, scale=0.05, size=(2, 1000))
    idata = SimpleNamespace(posterior={INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME: draws})
    return FitResult(
        idata=idata,
        dataset=dataset,
        prior_spec=PriorSpec(),
        likelihood_family=SUPPORTED_LIKELIHOOD_FAMILY,
        link_function=LIKELIHOOD_FAMILY_LINKS[SUPPORTED_LIKELIHOOD_FAMILY],
        draws=1000,
        tune=1000,
        chains=2,
        seed=seed,
        target_accept=0.99,
        max_treedepth=12,
        wall_time_seconds=0.0,
        synthetic_input_hash=dataset.synthetic_input_hash(),
    )


def _bridge_fixture_diagnostics() -> DiagnosticsResult:
    """BRIDGE FIXTURE: gate-passing diagnostics (same pattern as the pytest
    gate-evaluator fixtures); real sampled diagnostics are proven by the
    pytest suite and the ``--full`` path."""
    prior_spec = PriorSpec()
    justification_hash = sha256_json(
        {
            "justification_ref": prior_spec.justification_ref,
            "prior_family": prior_spec.family_name,
            "prior_spec": prior_spec.describe(),
            "scalings": [1.0, *[float(s) for s in PRIOR_SENSITIVITY_SCALINGS]],
        }
    )
    return DiagnosticsResult(
        sampler=SamplerDiagnostics(
            parameters=(
                ParameterDiagnostic(
                    parameter_name=INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
                    r_hat=1.002,
                    bulk_ess=1200.0,
                    tail_ess=1100.0,
                    posterior_mean_mcse=0.001,
                    interval_endpoint_mcse=0.002,
                    posterior_sd=0.1,
                ),
            ),
            post_warmup_divergences=0,
            max_treedepth_saturation_rate=0.0,
            max_treedepth_warning=False,
            energy_bfmi_min=0.9,
            energy_bfmi_warning=False,
        ),
        posterior_predictive_checks=tuple(
            PpcStatistic(
                statistic_name=name,
                observed_value=0.0,
                predictive_mean=0.0,
                predictive_ci80_lower=-1.0,
                predictive_ci80_upper=1.0,
                p_value=0.5,
                passed=True,
            )
            for name in INFERENCE_PROOF_PPC_STATISTIC_NAMES
        ),
        prior_sensitivity=PriorSensitivityResult(
            documented=True,
            justification_ref=prior_spec.justification_ref,
            justification_hash=justification_hash,
            posterior_mean_shift_in_posterior_sd=0.1,
            passed=True,
            prior_family=prior_spec.family_name,
        ),
        pre_trend=PreTrendResult(
            ci80_lower=-0.1,
            ci80_upper=0.1,
            includes_zero=True,
            passed=True,
            wall_time_seconds=0.0,
        ),
        internal_report={"diagnostics_provenance": BRIDGE_FIXTURE_LABEL},
    )


def _emit_fixture_mode(scenario: str, *, seed: int, generated_at: str) -> dict:
    if scenario == "eligible":
        dataset = generate_did_dataset(seed=seed, k=16, injected_effect_sd=0.5)
    else:  # hold: missing-windows negative control
        dataset = generate_missing_windows(seed=seed)
    return emit_proof_artifact(
        dataset=dataset,
        fit=_bridge_fixture_fit(dataset, seed=seed),
        diagnostics=_bridge_fixture_diagnostics(),
        calibration_scenarios=phase_b1_fixture_calibration_scenarios(),
        null_checks=phase_b1_fixture_null_checks(),
        floor_checks=phase_b1_fixture_floor_checks(),
        generated_at=generated_at,
    )


def _emit_full_mode(scenario: str, *, seed: int, generated_at: str) -> dict:
    dataset = generate_did_dataset(seed=seed, k=16, injected_effect_sd=0.5)
    artifact, _internal_report = run_proof(
        dataset,
        seed=seed,
        repeated_evaluation_detected=(scenario == "hold"),
        generated_at=generated_at,
    )
    return artifact


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m fluencytracr_inference",
        description=(
            "Emit one internal-only synthetic InferenceProofArtifact as JSON on "
            "stdout (Python->TypeScript bridge proof)."
        ),
    )
    parser.add_argument(
        "--scenario",
        choices=("eligible", "hold"),
        required=True,
        help="eligible: every gate passes; hold: a named failing diagnostic",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="run the real seeded NUTS fit + diagnostics (minutes) instead of "
        "the deterministic bridge-fixture carriers (seconds); emits HOLD until "
        "real calibration/null study inputs are supplied through run_proof",
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument(
        "--generated-at",
        default=DEFAULT_GENERATED_AT,
        help="fixed timestamp for deterministic output",
    )
    args = parser.parse_args(argv)

    if args.full:
        artifact = _emit_full_mode(args.scenario, seed=args.seed, generated_at=args.generated_at)
    else:
        artifact = _emit_fixture_mode(
            args.scenario, seed=args.seed, generated_at=args.generated_at
        )

    expected_state = (
        "HOLD"
        if args.full
        else ("eligible_internal_only" if args.scenario == "eligible" else "HOLD")
    )
    actual_state = artifact["governance_state"]["state"]
    if actual_state != expected_state:
        print(
            f"scenario {args.scenario!r} produced governance state {actual_state!r} "
            f"(expected {expected_state!r}); failing diagnostics: "
            f"{artifact['governance_state']['failing_diagnostics']}",
            file=sys.stderr,
        )
        return 1

    json.dump(artifact, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
