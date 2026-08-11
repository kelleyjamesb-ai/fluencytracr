"""Sanitized internal summary artifacts for the VBD joint synthetic proof."""

from __future__ import annotations

import math
import re

from .hashing import sha256_json
from .vbd_joint_model import VBDJointFit, vbd_joint_sampler_settings
from .vbd_joint_preparation import validate_prepared_vbd_joint_data
from .vbd_joint_types import (
    VBD_JOINT_ARTIFACT_SCHEMA,
    VBD_JOINT_BLOCKED_OUTPUTS,
    VBD_JOINT_FULL_ESS_MIN,
    VBD_JOINT_FULL_RHAT_MAX,
    VBD_JOINT_MODEL_FAMILY,
    VBD_JOINT_MODEL_VERSION,
    VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
    VBD_JOINT_NULL_SEED,
    VBD_JOINT_PRIMARY_SEED,
    VBD_JOINT_TRUTH,
    VBDJointStructureError,
    require_sha256,
)


_TOP_LEVEL_KEYS = {
    "schema_version",
    "model_family",
    "model_version",
    "internal_state",
    "synthetic_case",
    "input_bindings",
    "fit_states",
    "coefficient_summaries",
    "truth_recovery_absolute_error",
    "predictive_comparison",
    "limitations",
    "blocked_outputs",
    "artifact_self_hash",
}
_PROHIBITED_KEY = re.compile(
    r"(?:posterior_draw|latent_path|family_id|member_|workflow_id|jbtd_id|"
    r"persona_id|panel_estimate|slice_estimate|raw_observation|raw_event|"
    r"prompt|transcript|action_row|user_id|email|employee)",
    re.IGNORECASE,
)
_UNSAFE_STRING_VALUE = re.compile(
    r"(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:prompt|transcript|"
    r"employee|respondent|user[_ ]?id|family[_ ]?id|member row|raw event)\b|"
    r"\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b)",
    re.IGNORECASE,
)
_LIMITATIONS = [
    "synthetic aggregate evidence only",
    "association and predictive relevance only",
    "smoke fits are permanently nonqualifying",
    "no real data or product integration authority",
    "no causal impact or percent-of-change interpretation",
]
_SHARED_COEFFICIENT_NAMES = (
    "capability_retention",
    "capability_embedding",
    "capability_active_nonembedded",
    "outcome_capability",
    "outcome_time",
    "control_seasonality_index",
    "control_customer_demand_index",
)
_FULL_ONLY_COEFFICIENT_NAMES = (
    "outcome_embedded",
    "outcome_active_nonembedded",
    "outcome_capability_by_embedded",
)
_FIT_STATE_KEYS = {
    "variant",
    "fit_seed",
    "fit_summary_hash",
    "sampler_settings",
    "diagnostics",
    "bayesian_r_squared_mean",
    "future_window_rmse",
    "future_window_log_score",
}
_DIAGNOSTIC_KEYS = {
    "state",
    "failing_diagnostics",
    "max_r_hat",
    "min_bulk_ess",
    "min_tail_ess",
    "divergence_count",
    "max_treedepth_count",
    "full_run_required_for_qualification",
}
_DIAGNOSTIC_FAILURES = {
    "smoke_settings_nonqualifying",
    "r_hat",
    "bulk_ess",
    "tail_ess",
    "divergences",
    "max_treedepth",
    "summary_nonfinite",
}
_PREDICTIVE_KEYS = {
    "bayesian_r_squared_difference_full_minus_restricted",
    "future_window_rmse_improvement_restricted_minus_full",
    "future_window_log_score_difference_full_minus_restricted",
    "internal_predictive_relevance_only",
    "causal_variance_decomposition",
}


def _require_finite_float(name: str, value: object, *, nonnegative: bool = False) -> None:
    if type(value) is not float or not math.isfinite(value):
        raise VBDJointStructureError(f"{name} must be a finite float")
    if nonnegative and value < 0.0:
        raise VBDJointStructureError(f"{name} must be nonnegative")


def _validate_diagnostics(diagnostics: object, sampler_settings: dict) -> None:
    if type(diagnostics) is not dict or set(diagnostics) != _DIAGNOSTIC_KEYS:
        raise VBDJointStructureError("artifact diagnostics shape is invalid")
    if diagnostics["state"] not in ("PASS", "HOLD"):
        raise VBDJointStructureError("artifact diagnostic state is invalid")
    failures = diagnostics["failing_diagnostics"]
    if (
        type(failures) is not list
        or any(type(item) is not str or item not in _DIAGNOSTIC_FAILURES for item in failures)
        or failures != sorted(set(failures))
    ):
        raise VBDJointStructureError("artifact diagnostic failures are invalid")
    for name in ("max_r_hat", "min_bulk_ess", "min_tail_ess"):
        _require_finite_float(f"artifact diagnostics {name}", diagnostics[name])
    for name in ("divergence_count", "max_treedepth_count"):
        if type(diagnostics[name]) is not int or diagnostics[name] < 0:
            raise VBDJointStructureError(f"artifact diagnostics {name} is invalid")
    if diagnostics["full_run_required_for_qualification"] is not True:
        raise VBDJointStructureError("artifact diagnostic qualification gate is invalid")
    expected_failures = []
    if sampler_settings["qualifying_settings"] is not True:
        expected_failures.append("smoke_settings_nonqualifying")
    diagnostic_values = tuple(
        diagnostics[name] for name in ("max_r_hat", "min_bulk_ess", "min_tail_ess")
    )
    sentinel_count = diagnostic_values.count(VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL)
    if sentinel_count:
        if sentinel_count != len(diagnostic_values):
            raise VBDJointStructureError("artifact nonfinite diagnostic sentinel is inconsistent")
        expected_failures.append("summary_nonfinite")
    else:
        if any(value < 0.0 for value in diagnostic_values):
            raise VBDJointStructureError("artifact diagnostic summary is invalid")
        if diagnostics["max_r_hat"] > VBD_JOINT_FULL_RHAT_MAX:
            expected_failures.append("r_hat")
        if diagnostics["min_bulk_ess"] < VBD_JOINT_FULL_ESS_MIN:
            expected_failures.append("bulk_ess")
        if diagnostics["min_tail_ess"] < VBD_JOINT_FULL_ESS_MIN:
            expected_failures.append("tail_ess")
    if diagnostics["divergence_count"]:
        expected_failures.append("divergences")
    if diagnostics["max_treedepth_count"]:
        expected_failures.append("max_treedepth")
    expected_failures = sorted(expected_failures)
    if failures != expected_failures:
        raise VBDJointStructureError("artifact diagnostic failures are inconsistent")
    if diagnostics["state"] != ("PASS" if not expected_failures else "HOLD"):
        raise VBDJointStructureError("artifact diagnostic state is inconsistent")


def _validate_json_value(value: object, *, path: str = "artifact") -> None:
    if value is None or type(value) is bool:
        return
    if isinstance(value, str):
        if _UNSAFE_STRING_VALUE.search(value):
            raise VBDJointStructureError(f"{path} contains unsafe string content")
        return
    if type(value) is int:
        return
    if type(value) is float:
        if not math.isfinite(value):
            raise VBDJointStructureError(f"{path} contains a nonfinite number")
        return
    if type(value) is list:
        for index, item in enumerate(value):
            _validate_json_value(item, path=f"{path}[{index}]")
        return
    if type(value) is dict:
        for key, item in value.items():
            if type(key) is not str:
                raise VBDJointStructureError(f"{path} contains a nonstring key")
            if _PROHIBITED_KEY.search(key):
                raise VBDJointStructureError(f"{path}.{key} is a prohibited output field")
            _validate_json_value(item, path=f"{path}.{key}")
        return
    raise VBDJointStructureError(f"{path} contains a non-JSON value")


def validate_vbd_joint_artifact(artifact: dict) -> None:
    if type(artifact) is not dict or set(artifact) != _TOP_LEVEL_KEYS:
        raise VBDJointStructureError("artifact shape does not match the frozen schema")
    if artifact["schema_version"] != VBD_JOINT_ARTIFACT_SCHEMA:
        raise VBDJointStructureError("artifact schema version is invalid")
    if artifact["model_family"] != VBD_JOINT_MODEL_FAMILY:
        raise VBDJointStructureError("artifact model family is invalid")
    if artifact["model_version"] != VBD_JOINT_MODEL_VERSION:
        raise VBDJointStructureError("artifact model version is invalid")
    blocked = artifact["blocked_outputs"]
    if type(blocked) is not dict or tuple(blocked) != VBD_JOINT_BLOCKED_OUTPUTS:
        raise VBDJointStructureError("artifact blocked-output ledger is invalid")
    if any(type(value) is not bool or value is not False for value in blocked.values()):
        raise VBDJointStructureError("artifact cannot authorize a blocked output")
    if artifact["internal_state"] not in (
        "HOLD_SMOKE_NONQUALIFYING",
        "HOLD_DIAGNOSTIC_FAILURE",
        "SYNTHETIC_FULL_RUN_PENDING_INDEPENDENT_REVIEW",
    ):
        raise VBDJointStructureError("artifact internal state is invalid")
    if artifact["synthetic_case"] not in ("primary", "behavior_pathway_null"):
        raise VBDJointStructureError("artifact synthetic case is invalid")
    input_bindings = artifact["input_bindings"]
    if type(input_bindings) is not dict or set(input_bindings) != {
        "prepared_input_hash",
        "dataset_hash",
        "plan_hash",
        "alignment_receipt_hash",
        "freeze_receipt_hash",
        "synthetic_scenario",
        "fit_seed",
    }:
        raise VBDJointStructureError("artifact input bindings are invalid")
    for name in (
        "prepared_input_hash",
        "dataset_hash",
        "plan_hash",
        "alignment_receipt_hash",
        "freeze_receipt_hash",
    ):
        require_sha256("artifact input binding", input_bindings[name])
    if input_bindings["synthetic_scenario"] != artifact["synthetic_case"]:
        raise VBDJointStructureError("artifact scenario binding is invalid")
    expected_seed = (
        VBD_JOINT_PRIMARY_SEED
        if artifact["synthetic_case"] == "primary"
        else VBD_JOINT_NULL_SEED
    )
    if type(input_bindings["fit_seed"]) is not int or input_bindings["fit_seed"] != expected_seed:
        raise VBDJointStructureError("artifact seed binding is invalid")
    from .vbd_joint_preparation import prepare_vbd_joint_dataset
    from .vbd_joint_synthetic import generate_vbd_joint_synthetic_dataset

    expected_prepared = prepare_vbd_joint_dataset(
        generate_vbd_joint_synthetic_dataset(
            scenario=artifact["synthetic_case"],
            seed=expected_seed,
        )
    )
    expected_bindings = {
        "prepared_input_hash": expected_prepared.prepared_input_hash,
        "dataset_hash": expected_prepared.dataset_hash,
        "plan_hash": expected_prepared.plan_hash,
        "alignment_receipt_hash": expected_prepared.alignment_receipt_hash,
        "freeze_receipt_hash": expected_prepared.freeze_receipt_hash,
        "synthetic_scenario": expected_prepared.synthetic_scenario,
        "fit_seed": expected_prepared.seed,
    }
    if input_bindings != expected_bindings:
        raise VBDJointStructureError("artifact provenance bindings are invalid")
    fit_states = artifact["fit_states"]
    if type(fit_states) is not dict or set(fit_states) != {"full", "restricted"}:
        raise VBDJointStructureError("artifact fit-state shape is invalid")
    for variant in ("full", "restricted"):
        state = fit_states[variant]
        if type(state) is not dict or set(state) != _FIT_STATE_KEYS:
            raise VBDJointStructureError("artifact fit-state fields are invalid")
        if state["variant"] != variant:
            raise VBDJointStructureError("artifact fit-state variant is invalid")
        if type(state["fit_seed"]) is not int or state["fit_seed"] != expected_seed:
            raise VBDJointStructureError("artifact fit-state seed is invalid")
        require_sha256("artifact fit-summary hash", state["fit_summary_hash"])
        sampler_settings = state["sampler_settings"]
        if type(sampler_settings) is not dict or sampler_settings.get("mode") not in (
            "smoke",
            "full",
        ):
            raise VBDJointStructureError("artifact sampler settings are invalid")
        if sampler_settings != vbd_joint_sampler_settings(
            sampler_settings["mode"]
        ).to_dict():
            raise VBDJointStructureError("artifact sampler settings are off profile")
        _validate_diagnostics(state["diagnostics"], sampler_settings)
        if sampler_settings["mode"] == "smoke" and state["diagnostics"]["state"] != "HOLD":
            raise VBDJointStructureError("smoke artifact cannot clear diagnostics")
        for name in (
            "bayesian_r_squared_mean",
            "future_window_rmse",
            "future_window_log_score",
        ):
            _require_finite_float(f"artifact fit-state {name}", state[name])
        if state["future_window_rmse"] < 0.0:
            raise VBDJointStructureError("artifact future-window RMSE is invalid")
    if fit_states["full"]["sampler_settings"] != fit_states["restricted"][
        "sampler_settings"
    ]:
        raise VBDJointStructureError("artifact sampler settings do not match")
    diagnostics_pass = all(
        fit_states[variant]["diagnostics"]["state"] == "PASS"
        for variant in ("full", "restricted")
    )
    mode = fit_states["full"]["sampler_settings"]["mode"]
    expected_internal_state = (
        "HOLD_SMOKE_NONQUALIFYING"
        if mode == "smoke"
        else (
            "SYNTHETIC_FULL_RUN_PENDING_INDEPENDENT_REVIEW"
            if diagnostics_pass
            else "HOLD_DIAGNOSTIC_FAILURE"
        )
    )
    if artifact["internal_state"] != expected_internal_state:
        raise VBDJointStructureError("artifact internal state is inconsistent")
    coefficient_summaries = artifact["coefficient_summaries"]
    if type(coefficient_summaries) is not dict or set(coefficient_summaries) != {
        "full",
        "restricted",
    }:
        raise VBDJointStructureError("artifact coefficient summary shape is invalid")
    expected_names = {
        "full": (*_SHARED_COEFFICIENT_NAMES, *_FULL_ONLY_COEFFICIENT_NAMES),
        "restricted": _SHARED_COEFFICIENT_NAMES,
    }
    for variant, names in expected_names.items():
        rows = coefficient_summaries[variant]
        if type(rows) is not list or tuple(
            row.get("coefficient_name") if type(row) is dict else None for row in rows
        ) != names:
            raise VBDJointStructureError("artifact coefficient names are invalid")
        for row in rows:
            if set(row) != {
                "coefficient_name",
                "posterior_mean",
                "posterior_sd",
                "interval_80",
            } or type(row["interval_80"]) is not dict or set(row["interval_80"]) != {
                "lower",
                "upper",
            }:
                raise VBDJointStructureError("artifact coefficient row is invalid")
            _require_finite_float(
                "artifact coefficient posterior_mean", row["posterior_mean"]
            )
            _require_finite_float(
                "artifact coefficient posterior_sd",
                row["posterior_sd"],
                nonnegative=True,
            )
            lower = row["interval_80"]["lower"]
            upper = row["interval_80"]["upper"]
            _require_finite_float("artifact coefficient interval lower", lower)
            _require_finite_float("artifact coefficient interval upper", upper)
            if lower > upper:
                raise VBDJointStructureError("artifact coefficient interval is invalid")
    truth_recovery = artifact["truth_recovery_absolute_error"]
    if type(truth_recovery) is not dict or set(truth_recovery) != set(VBD_JOINT_TRUTH):
        raise VBDJointStructureError("artifact truth-recovery shape is invalid")
    for value in truth_recovery.values():
        _require_finite_float(
            "artifact truth-recovery error", value, nonnegative=True
        )
    predictive = artifact["predictive_comparison"]
    if type(predictive) is not dict or set(predictive) != _PREDICTIVE_KEYS:
        raise VBDJointStructureError("artifact predictive comparison shape is invalid")
    for name in (
        "bayesian_r_squared_difference_full_minus_restricted",
        "future_window_rmse_improvement_restricted_minus_full",
        "future_window_log_score_difference_full_minus_restricted",
    ):
        _require_finite_float(f"artifact predictive comparison {name}", predictive[name])
    if predictive["internal_predictive_relevance_only"] is not True:
        raise VBDJointStructureError("artifact predictive-use boundary is invalid")
    if predictive["causal_variance_decomposition"] is not False:
        raise VBDJointStructureError("artifact causal boundary is invalid")
    if artifact["limitations"] != _LIMITATIONS:
        raise VBDJointStructureError("artifact limitations are not the frozen safe text")
    expected_hash = sha256_json(
        {key: value for key, value in artifact.items() if key != "artifact_self_hash"}
    )
    if artifact["artifact_self_hash"] != expected_hash:
        raise VBDJointStructureError("artifact self-hash is invalid")
    require_sha256("artifact self-hash", artifact["artifact_self_hash"])
    _validate_json_value(artifact)


def _fit_state(fit: VBDJointFit) -> dict:
    return {
        "variant": fit.variant,
        "fit_seed": fit.seed,
        "fit_summary_hash": fit.fit_summary_hash(),
        "sampler_settings": fit.settings.to_dict(),
        "diagnostics": fit.diagnostics,
        "bayesian_r_squared_mean": fit.bayesian_r_squared_mean,
        "future_window_rmse": fit.future_window_rmse,
        "future_window_log_score": fit.future_window_log_score,
    }


def emit_vbd_joint_artifact(
    *,
    full_fit: VBDJointFit,
    restricted_fit: VBDJointFit,
    synthetic_case: str,
) -> dict:
    """Emit only model-level summaries and immutable commitments."""

    if type(full_fit) is not VBDJointFit or type(restricted_fit) is not VBDJointFit:
        raise VBDJointStructureError("artifact requires exact joint fit types")
    if full_fit.variant != "full" or restricted_fit.variant != "restricted":
        raise VBDJointStructureError("artifact requires one full and one restricted fit")
    validate_prepared_vbd_joint_data(full_fit.prepared)
    validate_prepared_vbd_joint_data(restricted_fit.prepared)
    if full_fit.prepared.prepared_input_hash != restricted_fit.prepared.prepared_input_hash:
        raise VBDJointStructureError("full and restricted fits do not bind the same input")
    if full_fit.settings.to_dict() != restricted_fit.settings.to_dict():
        raise VBDJointStructureError("full and restricted sampler settings differ")
    if full_fit.seed != restricted_fit.seed:
        raise VBDJointStructureError("full and restricted fit seeds differ")
    if synthetic_case not in ("primary", "behavior_pathway_null"):
        raise VBDJointStructureError("synthetic case is invalid")
    if (
        full_fit.prepared.synthetic_scenario != synthetic_case
        or restricted_fit.prepared.synthetic_scenario != synthetic_case
    ):
        raise VBDJointStructureError("synthetic case does not bind the prepared input")
    expected_seed = (
        VBD_JOINT_PRIMARY_SEED
        if synthetic_case == "primary"
        else VBD_JOINT_NULL_SEED
    )
    if full_fit.seed != expected_seed:
        raise VBDJointStructureError("fit seed does not bind the synthetic case")
    diagnostics_pass = (
        full_fit.diagnostics["state"] == "PASS"
        and restricted_fit.diagnostics["state"] == "PASS"
    )
    if full_fit.settings.mode == "smoke":
        internal_state = "HOLD_SMOKE_NONQUALIFYING"
    elif not diagnostics_pass:
        internal_state = "HOLD_DIAGNOSTIC_FAILURE"
    else:
        internal_state = "SYNTHETIC_FULL_RUN_PENDING_INDEPENDENT_REVIEW"

    full_summaries = full_fit.summary_by_name()
    truth = dict(VBD_JOINT_TRUTH)
    if synthetic_case == "behavior_pathway_null":
        for name in (
            "capability_retention",
            "capability_embedding",
            "capability_active_nonembedded",
            "outcome_embedded",
            "outcome_active_nonembedded",
            "outcome_capability_by_embedded",
        ):
            truth[name] = 0.0
    truth_error = {
        name: abs(full_summaries[name].posterior_mean - expected)
        for name, expected in truth.items()
        if name in full_summaries
    }
    body = {
        "schema_version": VBD_JOINT_ARTIFACT_SCHEMA,
        "model_family": VBD_JOINT_MODEL_FAMILY,
        "model_version": VBD_JOINT_MODEL_VERSION,
        "internal_state": internal_state,
        "synthetic_case": synthetic_case,
        "input_bindings": {
            "prepared_input_hash": full_fit.prepared.prepared_input_hash,
            "dataset_hash": full_fit.prepared.dataset_hash,
            "plan_hash": full_fit.prepared.plan_hash,
            "alignment_receipt_hash": full_fit.prepared.alignment_receipt_hash,
            "freeze_receipt_hash": full_fit.prepared.freeze_receipt_hash,
            "synthetic_scenario": full_fit.prepared.synthetic_scenario,
            "fit_seed": full_fit.seed,
        },
        "fit_states": {
            "full": _fit_state(full_fit),
            "restricted": _fit_state(restricted_fit),
        },
        "coefficient_summaries": {
            "full": [item.to_dict() for item in full_fit.coefficient_summaries],
            "restricted": [
                item.to_dict() for item in restricted_fit.coefficient_summaries
            ],
        },
        "truth_recovery_absolute_error": truth_error,
        "predictive_comparison": {
            "bayesian_r_squared_difference_full_minus_restricted": (
                full_fit.bayesian_r_squared_mean
                - restricted_fit.bayesian_r_squared_mean
            ),
            "future_window_rmse_improvement_restricted_minus_full": (
                restricted_fit.future_window_rmse - full_fit.future_window_rmse
            ),
            "future_window_log_score_difference_full_minus_restricted": (
                full_fit.future_window_log_score
                - restricted_fit.future_window_log_score
            ),
            "internal_predictive_relevance_only": True,
            "causal_variance_decomposition": False,
        },
        "limitations": list(_LIMITATIONS),
        "blocked_outputs": {name: False for name in VBD_JOINT_BLOCKED_OUTPUTS},
    }
    artifact = {**body, "artifact_self_hash": sha256_json(body)}
    validate_vbd_joint_artifact(artifact)
    return artifact
