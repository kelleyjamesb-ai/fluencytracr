"""Bounded pre-freeze VBD numerical-precision canaries."""

from __future__ import annotations

import argparse
import json

from .hashing import sha256_json
from .vbd_trajectory_concordance import (
    evaluate_vbd_trajectory_quantity_concordance,
)
from .vbd_trajectory_nuts import (
    _VBD_TRAJECTORY_PRECISION_CANARY_RUNNER_TOKEN,
    build_vbd_trajectory_nuts_precision_canary_binding,
    fit_vbd_trajectory_nuts_reference,
)
from .vbd_trajectory_preparation import prepare_vbd_trajectory_lane
from .vbd_trajectory_state_space import fit_vbd_trajectory_state_space
from .vbd_trajectory_synthetic import (
    _PRECISION_CANARY_GENERATION_RUNNER_TOKEN,
    generate_vbd_trajectory_precision_canary_case,
    vbd_trajectory_precision_canary_case_body,
)
from .vbd_trajectory_types import VBD_TRAJECTORY_LANES


VBD_TRAJECTORY_PRECISION_CANARY_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_PRECISION_CANARY_2026_07_V1"
)
VBD_TRAJECTORY_PRECISION_CANARY_TIMEOUT_SECONDS = 7_200
VBD_TRAJECTORY_PRECISION_CANARY_HOLD_REASON = (
    "precision_canary_nonacceptance"
)


class VbdTrajectoryPrecisionCanaryError(RuntimeError):
    """A precision canary was malformed or failed its bounded execution."""


def vbd_trajectory_precision_canary_plan() -> dict:
    canaries = [
        vbd_trajectory_precision_canary_case_body(ordinal)
        for ordinal in (0, 1)
    ]
    body = {
        "schema_version": "FT_AI_VALUE_VBD_TRAJECTORY_PRECISION_CANARY_PLAN_2026_07_V1",
        "canaries": canaries,
        "lane_order": list(VBD_TRAJECTORY_LANES),
        "full_sampler_settings_required": True,
        "bundle_child_timeout_seconds": VBD_TRAJECTORY_PRECISION_CANARY_TIMEOUT_SECONDS,
        "acceptance_evidence_eligible": False,
        "acceptance_counts_affected": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "plan_hash": sha256_json(body)}


def execute_vbd_trajectory_precision_canary(canary_ordinal: int) -> dict:
    """Reject every post-failure attempt to execute a precision canary."""

    vbd_trajectory_precision_canary_case_body(canary_ordinal)
    raise VbdTrajectoryPrecisionCanaryError(
        "precision canary execution is permanently tombstoned after canary 0 HOLD"
    )


def _validate_precision_canary_lane_record(
    value: object,
    *,
    canary: dict,
    study_plan_root: str,
    lane_ordinal: int,
    expected_prepared,
) -> list[str]:
    if type(value) is not dict or set(value) != {
        "lane",
        "lane_ordinal",
        "binding",
        "primary_fit",
        "reference_fit",
        "cross_engine_concordance",
        "otherwise_applicable_failing_checks",
    }:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary lane record shape is invalid"
        )
    lane = VBD_TRAJECTORY_LANES[lane_ordinal]
    if value["lane"] != lane or value["lane_ordinal"] != lane_ordinal:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary lane order is invalid"
        )
    binding = build_vbd_trajectory_nuts_precision_canary_binding(
        canary_ordinal=canary["canary_ordinal"],
        bundle_seed=canary["bundle_seed"],
        lane=lane,
        lane_ordinal=lane_ordinal,
        plan_hash=study_plan_root,
    )
    expected_binding = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    if value["binding"] != expected_binding:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary lane binding is invalid"
        )
    try:
        from .vbd_trajectory_concordance_resumable import (
            _deterministic_fit_from_dict,
            _nuts_fit_from_dict,
        )

        primary = _deterministic_fit_from_dict(value["primary_fit"])
        reference = _nuts_fit_from_dict(value["reference_fit"])
    except Exception as exc:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary fit record is invalid"
        ) from exc
    if (
        primary.lane != lane
        or reference.lane != lane
        or primary.prepared_input_hash != reference.prepared_input_hash
        or primary.model_input_hash != reference.model_input_hash
        or primary.prepared_input_hash != expected_prepared.prepared_input_hash
        or primary.model_input_hash != expected_prepared.model_input_hash
        or reference.concordance_binding_hash != binding.binding_hash
        or reference.settings.full_settings is not True
        or reference.chain_seeds != binding.chain_seeds
        or reference.ppc_seed != binding.ppc_seed
    ):
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary fit bindings are inconsistent"
        )
    concordance = evaluate_vbd_trajectory_quantity_concordance(
        primary.movement_summary, reference.movement_summary
    )
    if value["cross_engine_concordance"] != concordance:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary concordance was not independently rederived"
        )
    failures = list(reference.sampler_diagnostics.failing_diagnostics)
    if not all(check.passed for check in reference.posterior_predictive_checks):
        failures.append("posterior_predictive_check")
    if not concordance["passed"]:
        failures.append("cross_engine_concordance")
    failures = list(dict.fromkeys(failures))
    if value["otherwise_applicable_failing_checks"] != failures:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary lane failures were not independently rederived"
        )
    return failures


def validate_vbd_trajectory_precision_canary_result(value: object) -> dict:
    if type(value) is not dict:
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary result must be an object"
        )
    expected_keys = {
        "schema_version",
        "plan_hash",
        "canary",
        "panel_manifest_root",
        "study_plan_root",
        "lane_records",
        "otherwise_applicable_gates_passed",
        "otherwise_applicable_failing_checks",
        "state",
        "hold_reasons",
        "acceptance_evidence_eligible",
        "acceptance_counts_affected",
        "evidence_artifact_emitted",
        "raw_posterior_draws_emitted",
        "posterior_predictive_replicates_emitted",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_5_6_complete",
        "promotion_complete",
        "result_hash",
    }
    body = {key: item for key, item in value.items() if key != "result_hash"}
    ordinal = (
        value.get("canary", {}).get("canary_ordinal")
        if type(value.get("canary")) is dict
        else None
    )
    if type(ordinal) is not int or ordinal not in (0, 1):
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary ordinal is malformed"
        )
    canary = vbd_trajectory_precision_canary_case_body(ordinal)
    expected_case = generate_vbd_trajectory_precision_canary_case(
        ordinal,
        _runner_token=_PRECISION_CANARY_GENERATION_RUNNER_TOKEN,
    )
    expected_prepared = tuple(
        prepare_vbd_trajectory_lane(expected_case.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    )
    study_plan_root = value.get("study_plan_root")
    panel_manifest_root = value.get("panel_manifest_root")
    if (
        type(study_plan_root) is not str
        or len(study_plan_root) != 64
        or any(character not in "0123456789abcdef" for character in study_plan_root)
        or study_plan_root != sha256_json(canary)
        or study_plan_root != expected_case.panel.study_plan_root
        or type(panel_manifest_root) is not str
        or len(panel_manifest_root) != 64
        or any(
            character not in "0123456789abcdef"
            for character in panel_manifest_root
        )
        or panel_manifest_root
        != expected_case.panel.ordered_panel_manifest_root
    ):
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary panel binding is malformed"
        )
    lane_records = value.get("lane_records")
    if type(lane_records) is not list or len(lane_records) != len(
        VBD_TRAJECTORY_LANES
    ):
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary lane records are incomplete"
        )
    derived_failures: list[str] = []
    for lane_ordinal, lane_record in enumerate(lane_records):
        derived_failures.extend(
            _validate_precision_canary_lane_record(
                lane_record,
                canary=canary,
                study_plan_root=study_plan_root,
                lane_ordinal=lane_ordinal,
                expected_prepared=expected_prepared[lane_ordinal],
            )
        )
    derived_failures = list(dict.fromkeys(derived_failures))
    if (
        set(value) != expected_keys
        or value.get("schema_version")
        != VBD_TRAJECTORY_PRECISION_CANARY_SCHEMA_VERSION
        or value.get("plan_hash")
        != vbd_trajectory_precision_canary_plan()["plan_hash"]
        or value.get("canary") != canary
        or value.get("otherwise_applicable_failing_checks")
        != derived_failures
        or value.get("otherwise_applicable_gates_passed")
        is not (not derived_failures)
        or value.get("state") != "HOLD"
        or value.get("hold_reasons")
        != [VBD_TRAJECTORY_PRECISION_CANARY_HOLD_REASON]
        or value.get("acceptance_evidence_eligible") is not False
        or value.get("acceptance_counts_affected") is not False
        or value.get("evidence_artifact_emitted") is not False
        or value.get("raw_posterior_draws_emitted") is not False
        or value.get("posterior_predictive_replicates_emitted") is not False
        or value.get("internal_only") is not True
        or value.get("synthetic_only") is not True
        or value.get("aggregate_only") is not True
        or value.get("customer_output_authorized") is not False
        or value.get("acceptance_complete") is not False
        or value.get("task_5_6_complete") is not False
        or value.get("promotion_complete") is not False
        or value.get("result_hash") != sha256_json(body)
    ):
        raise VbdTrajectoryPrecisionCanaryError(
            "precision canary result is malformed or self-authorizing"
        )
    return value


def run_vbd_trajectory_precision_canary(canary_ordinal: int) -> dict:
    """Reject public retries, resumes, or extensions of either canary."""

    return execute_vbd_trajectory_precision_canary(canary_ordinal)


def _print_json(value: object) -> None:
    print(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run permanently non-admissible VBD precision canaries."
    )
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("plan")
    run = commands.add_parser("run")
    run.add_argument("--canary-ordinal", type=int, required=True)
    execute = commands.add_parser("_execute", help=argparse.SUPPRESS)
    execute.add_argument("--canary-ordinal", type=int, required=True)
    args = parser.parse_args(argv)
    if args.command == "plan":
        _print_json(vbd_trajectory_precision_canary_plan())
        return 0
    if args.command == "_execute":
        result = execute_vbd_trajectory_precision_canary(args.canary_ordinal)
        _print_json(result)
        return 0 if result["otherwise_applicable_gates_passed"] else 2
    result = run_vbd_trajectory_precision_canary(args.canary_ordinal)
    _print_json(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
