"""CLI bridge entry point: emit one proof artifact as JSON on stdout.

Phase B3 (task 3.5) support: the confidence-engine Node bridge test
(``packages/confidence-engine/test/inference_proof_artifact_bridge.test.mjs``)
invokes this module as a subprocess to prove the Python-to-TypeScript round
trip against the ``InferenceProofArtifactSchema`` Zod boundary. It is a thin
wrapper around the existing entry points — :func:`~.artifact.run_proof`,
:func:`~.artifact.emit_proof_artifact`, and the computed B2 study runner;
no statistics live here.

Usage (from the repo root, with the pinned ``inference/.venv`` environment
and ``PYTHONPATH=inference/src``)::

    python -m fluencytracr_inference --scenario eligible
    python -m fluencytracr_inference --scenario hold
    python -m fluencytracr_inference --scenario null
    python -m fluencytracr_inference --scenario eligible --full
    python -m fluencytracr_inference --scenario hold --full
    python -m fluencytracr_inference --acceptance-plan
    python -m fluencytracr_inference --acceptance-full --replication-count 1
    python -m fluencytracr_inference --acceptance-combine-stdin

Modes:

- Default (bridge-fixture, seconds, deterministic): calls
  :func:`emit_proof_artifact` on a seeded synthetic dataset with clearly
  labeled BRIDGE FIXTURE fit/diagnostics carriers (the same pattern the
  harness's own gate tests use). This proves the emitter, the gate
  derivation, the governance pins, and the self-hash spine — not the
  sampler; the pytest suite proves the sampler on real NUTS fits. It uses
  computed Phase B2 calibration/null/floor study inputs, never the retired
  Phase B1 fixture values.
- ``--full`` (real fit, minutes): calls :func:`run_proof` end to end (seeded
  NUTS fit + real diagnostics) and feeds computed Phase B2 study inputs into
  the artifact gate.

Scenarios:

- ``eligible``: clean k=16 dataset with injected effect 0.5 SD; the default
  bridge-fixture mode uses fixture fit/diagnostic carriers plus computed B2
  study inputs, and ``--full`` uses real sampled diagnostics plus the same
  computed study-input path.
- ``hold``: default mode uses the missing-windows negative control (HOLD
  naming ``missing_or_suppressed_windows``); ``--full`` mode uses the clean
  dataset with naive repeated evaluation detected (HOLD naming
  ``peeking_control``) so the HOLD rides a fully real fit.
- ``null``: default mode emits an internal-valid, non-authorizing artifact
  whose posterior interval includes zero; it exists to prove the
  Python-to-TypeScript boundary accepts valid artifacts with
  ``comparison_supported_contribution_estimate_authorized: false``. ``--full``
  is intentionally unsupported for this scenario because sampled null draws are
  not deterministic enough for a bridge fixture.

Everything emitted is synthetic and internal-only; the artifact pins
``internal_only: true`` and every customer/probability/confidence output
authorization to false, with ``promotion_decision_ref: null``.

The acceptance-study modes are stdout-only internal sidecar reports. They do
not write checkpoints, read real data, emit artifact inputs, or authorize
OpenSpec task completion.
"""

from __future__ import annotations

import argparse
import json
import sys
from types import SimpleNamespace

import numpy as np

from .artifact import (
    emit_proof_artifact,
    run_proof,
)
from .acceptance_study import (
    DEFAULT_ACCEPTANCE_PLAN_CHUNK_SIZE,
    DEFAULT_SAMPLER_SMOKE_BASE_SEED,
    combine_sampler_artifact_acceptance_reports,
    plan_sampler_artifact_full_acceptance_run,
    run_sampler_artifact_full_acceptance_study,
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
from .synthetic_study import run_synthetic_study_inputs

DEFAULT_SEED = 20260706
DEFAULT_GENERATED_AT = "2026-07-06T00:00:00+00:00"

# Label recorded in the internal report for the fixture path so nobody can
# mistake bridge-fixture diagnostics for sampled ones (the artifact itself is
# schema-strict and carries no free-form provenance field).
BRIDGE_FIXTURE_LABEL = "phase-b3-bridge-fixture-diagnostics-not-sampled"


def _bridge_fixture_fit(
    dataset: SyntheticDataset,
    *,
    seed: int,
    posterior_draws: np.ndarray | None = None,
) -> FitResult:
    """BRIDGE FIXTURE: a deterministic FitResult carrier (no sampling).

    Only :meth:`FitResult.estimand_summary` is consumed by the emitter (for
    ``hash_bindings.source_posterior_hash``), so a seeded draw matrix behind
    the same dataclass is a faithful, clearly-bounded stand-in.
    """
    if posterior_draws is None:
        rng = np.random.default_rng(seed)
        draws = rng.normal(loc=0.5, scale=0.05, size=(2, 1000))
    else:
        draws = posterior_draws
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
        fit = _bridge_fixture_fit(dataset, seed=seed)
    elif scenario == "null":
        dataset = generate_did_dataset(seed=seed, k=16, injected_effect_sd=0.0)
        neutral_draws = np.tile(np.linspace(-0.1, 0.1, 1000), (2, 1))
        fit = _bridge_fixture_fit(dataset, seed=seed, posterior_draws=neutral_draws)
    else:  # hold: missing-windows negative control
        dataset = generate_missing_windows(seed=seed)
        fit = _bridge_fixture_fit(dataset, seed=seed)
    study_inputs = run_synthetic_study_inputs()
    return emit_proof_artifact(
        dataset=dataset,
        fit=fit,
        diagnostics=_bridge_fixture_diagnostics(),
        **study_inputs.as_run_proof_kwargs(),
        generated_at=generated_at,
    )


def _emit_full_mode(scenario: str, *, seed: int, generated_at: str) -> dict:
    if scenario == "null":
        raise ValueError(
            "--scenario null is a deterministic bridge-fixture mode only; "
            "do not use --full for the non-authorizing null fixture"
        )
    dataset = generate_did_dataset(seed=seed, k=16, injected_effect_sd=0.5)
    study_inputs = run_synthetic_study_inputs()
    artifact, _internal_report = run_proof(
        dataset,
        seed=seed,
        repeated_evaluation_detected=(scenario == "hold"),
        **study_inputs.as_run_proof_kwargs(),
        generated_at=generated_at,
    )
    return artifact


def _emit_acceptance_full_mode(
    *,
    base_seed: int,
    replication_start: int,
    replication_count: int,
    generated_at: str,
) -> dict:
    return run_sampler_artifact_full_acceptance_study(
        base_seed=base_seed,
        replication_start=replication_start,
        replication_count=replication_count,
        generated_at=generated_at,
    ).to_report()


def _emit_acceptance_plan_mode(*, base_seed: int, chunk_size: int | None) -> dict:
    return plan_sampler_artifact_full_acceptance_run(
        base_seed=base_seed,
        chunk_size=(
            DEFAULT_ACCEPTANCE_PLAN_CHUNK_SIZE
            if chunk_size is None
            else chunk_size
        ),
    )


def _combine_acceptance_reports_from_stdin(*, study_id: str | None = None) -> dict:
    raw = json.load(sys.stdin)
    if not isinstance(raw, list):
        raise ValueError("stdin must contain a JSON array of acceptance reports")
    return combine_sampler_artifact_acceptance_reports(
        raw,
        study_id=study_id,
    ).to_report()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m fluencytracr_inference",
        description=(
            "Emit internal-only synthetic proof JSON on stdout. Default mode "
            "emits one InferenceProofArtifact for the Python->TypeScript "
            "bridge; acceptance flags emit non-authorizing task-3.3 sidecar "
            "reports."
        ),
    )
    parser.add_argument(
        "--scenario",
        choices=("eligible", "hold", "null"),
        required=False,
        help=(
            "eligible: every gate passes and contribution estimate is "
            "authorized; hold: a named failing diagnostic; null: valid "
            "internal artifact with no contribution estimate authorized"
        ),
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="run the real seeded NUTS fit + diagnostics (minutes) instead of "
        "the deterministic bridge-fixture carriers (seconds); computed B2 "
        "calibration/null/floor study inputs are supplied to run_proof",
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument(
        "--acceptance-plan",
        action="store_true",
        help="print a deterministic, non-authorizing stdout-only plan for "
        "the full sampler-artifact acceptance run; does not call run_proof",
    )
    parser.add_argument(
        "--acceptance-full",
        action="store_true",
        help="run one full-settings sampler-artifact acceptance chunk and "
        "print the sanitized, non-authorizing sidecar report to stdout; "
        "--replication-count is required",
    )
    parser.add_argument(
        "--acceptance-combine-stdin",
        action="store_true",
        help="read a JSON array of sanitized acceptance reports from stdin, "
        "verify their hashes, combine them in memory, and print the combined "
        "non-authorizing report to stdout",
    )
    parser.add_argument(
        "--base-seed",
        type=int,
        default=DEFAULT_SAMPLER_SMOKE_BASE_SEED,
        help="acceptance-study base seed; operational seed only, not a threshold",
    )
    parser.add_argument(
        "--replication-start",
        type=int,
        default=0,
        help="acceptance-study chunk start index",
    )
    parser.add_argument(
        "--replication-count",
        type=int,
        default=None,
        help="acceptance-study chunk size; required with --acceptance-full",
    )
    parser.add_argument(
        "--chunk-replication-count",
        type=int,
        default=None,
        help="acceptance-plan chunk size; operational planning only",
    )
    parser.add_argument(
        "--study-id",
        default=None,
        help="optional study id for --acceptance-combine-stdin only",
    )
    parser.add_argument(
        "--generated-at",
        default=DEFAULT_GENERATED_AT,
        help="fixed timestamp for deterministic output",
    )
    args = parser.parse_args(argv)

    acceptance_mode_count = (
        int(args.acceptance_plan)
        + int(args.acceptance_full)
        + int(args.acceptance_combine_stdin)
    )
    if acceptance_mode_count > 1:
        parser.error("choose at most one acceptance-study mode")
    if acceptance_mode_count:
        if args.scenario is not None or args.full:
            parser.error("acceptance-study modes cannot be combined with artifact mode")
        if args.study_id is not None and not args.acceptance_combine_stdin:
            parser.error("--study-id is only valid with --acceptance-combine-stdin")
        if args.replication_start != 0 and not args.acceptance_full:
            parser.error("--replication-start is only valid with --acceptance-full")
        if args.acceptance_plan:
            if args.replication_count is not None:
                parser.error("--replication-count is only valid with --acceptance-full")
            if (
                args.chunk_replication_count is not None
                and args.chunk_replication_count <= 0
            ):
                parser.error("--chunk-replication-count must be positive")
            report = _emit_acceptance_plan_mode(
                base_seed=args.base_seed,
                chunk_size=args.chunk_replication_count,
            )
        elif args.acceptance_full:
            if args.chunk_replication_count is not None:
                parser.error(
                    "--chunk-replication-count is only valid with --acceptance-plan"
                )
            if args.replication_count is None:
                parser.error("--acceptance-full requires --replication-count")
            report = _emit_acceptance_full_mode(
                base_seed=args.base_seed,
                replication_start=args.replication_start,
                replication_count=args.replication_count,
                generated_at=args.generated_at,
            )
        else:
            if args.replication_count is not None:
                parser.error("--replication-count is only valid with --acceptance-full")
            if args.chunk_replication_count is not None:
                parser.error(
                    "--chunk-replication-count is only valid with --acceptance-plan"
                )
            report = _combine_acceptance_reports_from_stdin(study_id=args.study_id)
        json.dump(report, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0

    if args.scenario is None:
        parser.error("--scenario is required unless an acceptance-study mode is used")
    if args.scenario == "null" and args.full:
        parser.error("--scenario null is bridge-fixture only and cannot be used with --full")
    if args.study_id is not None:
        parser.error("--study-id is only valid with --acceptance-combine-stdin")
    if args.replication_count is not None:
        parser.error("--replication-count is only valid with --acceptance-full")
    if args.chunk_replication_count is not None:
        parser.error("--chunk-replication-count is only valid with --acceptance-plan")

    if args.full:
        artifact = _emit_full_mode(args.scenario, seed=args.seed, generated_at=args.generated_at)
    else:
        artifact = _emit_fixture_mode(
            args.scenario, seed=args.seed, generated_at=args.generated_at
        )

    expected_state = (
        "HOLD" if args.scenario == "hold" else "eligible_internal_only"
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
