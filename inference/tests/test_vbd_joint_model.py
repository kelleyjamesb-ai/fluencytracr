from dataclasses import replace
from types import SimpleNamespace

import numpy as np
import pytest

import fluencytracr_inference.vbd_joint_model as joint_model

from fluencytracr_inference.vbd_joint_artifact import (
    emit_vbd_joint_artifact,
    validate_vbd_joint_artifact,
)
from fluencytracr_inference.vbd_joint_model import (
    VBDJointCoefficientSummary,
    VBDJointFit,
    VBDJointSamplerSettings,
    _sampler_diagnostics,
    _fit_vbd_joint_model_with_settings,
    _predictive_summaries,
    build_vbd_joint_model,
    fit_vbd_joint_model,
    vbd_joint_diagnostic_parameter_names,
    vbd_joint_sampler_settings,
)
from fluencytracr_inference.vbd_joint_preparation import prepare_vbd_joint_dataset
from fluencytracr_inference.vbd_joint_synthetic import generate_vbd_joint_synthetic_dataset
from fluencytracr_inference.vbd_joint_types import (
    VBD_JOINT_BLOCKED_OUTPUTS,
    VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
    VBD_JOINT_PANEL_COUNT,
    VBD_JOINT_PRIMARY_SEED,
    VBD_JOINT_WINDOW_COUNT,
    VBDJointStructureError,
)


@pytest.fixture(scope="module")
def prepared():
    return prepare_vbd_joint_dataset(
        generate_vbd_joint_synthetic_dataset(scenario="primary")
    )


def test_full_and_restricted_models_share_inputs_but_only_full_has_outcome_behavior(prepared):
    full = build_vbd_joint_model(prepared, variant="full")
    restricted = build_vbd_joint_model(prepared, variant="restricted")

    for name in (
        "capability_retention",
        "capability_embedding",
        "capability_active_nonembedded",
        "capability_innovation_scale",
        "capability_innovation_raw",
        "outcome_capability",
        "control_seasonality_index",
        "control_customer_demand_index",
        "rho",
        "residual_scale",
    ):
        assert name in full.named_vars
        assert name in restricted.named_vars
    for name in (
        "outcome_embedded",
        "outcome_active_nonembedded",
        "outcome_capability_by_embedded",
    ):
        assert name in full.named_vars
        assert name not in restricted.named_vars
    assert "outcome_mean" in full.named_vars
    assert "outcome_mean" in restricted.named_vars


def test_last_mile_v3_sampler_rejects_substituted_settings_and_seeds(prepared, monkeypatch):
    def sampler_reached(**_kwargs):
        raise AssertionError("sampler initialized")

    monkeypatch.setattr("fluencytracr_inference.vbd_joint_model.pm.sample", sampler_reached)
    with pytest.raises(VBDJointStructureError, match="frozen V3 sampler binding"):
        _fit_vbd_joint_model_with_settings(
            prepared,
            variant="full",
            settings=VBDJointSamplerSettings(
                mode="smoke",
                chains=2,
                draws=1,
                tune=1,
                target_accept=0.5,
                max_treedepth=1,
            ),
            chain_seeds=(7, 8),
            summary_seed=7,
        )


@pytest.mark.parametrize(
    "invalid_source",
    (
        "rhat",
        "bulk_ess",
        "tail_ess",
        "diverging",
        "tree_depth",
        "reached_max_treedepth",
        "empty_rhat",
        "rhat_with_divergence",
        "rhat_with_max_treedepth",
    ),
)
def test_sampler_diagnostics_hold_nonfinite_or_empty_summaries(
    monkeypatch, invalid_source
):
    class DiagnosticTree:
        data_vars = ("metric",)

        def __init__(self, values):
            self.values = np.asarray(values, dtype=float)

        def __getitem__(self, _name):
            return self.values

    sample_stats = {
        "diverging": np.asarray(
            [[
                float("nan")
                if invalid_source == "diverging"
                else 1.0 if invalid_source == "rhat_with_divergence" else 0.0
            ]]
        ),
        "tree_depth": np.asarray(
            [[
                float("nan")
                if invalid_source == "tree_depth"
                else 99.0 if invalid_source == "rhat_with_max_treedepth" else 1.0
            ]]
        ),
    }
    if invalid_source == "reached_max_treedepth":
        sample_stats["reached_max_treedepth"] = np.asarray([[float("nan")]])
    idata = SimpleNamespace(
        posterior={"outcome_embedded": np.asarray([1.0])},
        sample_stats=sample_stats,
    )
    monkeypatch.setattr(
        joint_model.az,
        "rhat",
        lambda *_args, **_kwargs: DiagnosticTree(
            []
            if invalid_source == "empty_rhat"
            else [
                float("nan")
                if invalid_source in {
                    "rhat",
                    "rhat_with_divergence",
                    "rhat_with_max_treedepth",
                }
                else 1.0
            ]
        ),
    )
    monkeypatch.setattr(
        joint_model.az,
        "ess",
        lambda *_args, **kwargs: DiagnosticTree(
            [
                float("nan")
                if invalid_source
                == ("bulk_ess" if kwargs["method"] == "bulk" else "tail_ess")
                else 1000.0
            ]
        ),
    )

    diagnostics = _sampler_diagnostics(idata, vbd_joint_sampler_settings("full"))

    assert diagnostics["state"] == "HOLD"
    assert "summary_nonfinite" in diagnostics["failing_diagnostics"]
    if invalid_source == "rhat_with_divergence":
        assert "divergences" in diagnostics["failing_diagnostics"]
    if invalid_source == "rhat_with_max_treedepth":
        assert "max_treedepth" in diagnostics["failing_diagnostics"]
    assert all(
        np.isfinite(diagnostics[name])
        for name in ("max_r_hat", "min_bulk_ess", "min_tail_ess")
    )


def test_v3_fit_wrong_type_fails_with_closed_structure_error():
    with pytest.raises(VBDJointStructureError, match="prepared data"):
        fit_vbd_joint_model(object(), variant="full", seed=VBD_JOINT_PRIMARY_SEED)


def test_evaluation_windows_are_absent_from_every_fitted_likelihood(prepared):
    model = build_vbd_joint_model(prepared, variant="full")
    capability_training_rows = VBD_JOINT_PANEL_COUNT * (VBD_JOINT_WINDOW_COUNT - 3)
    transition_training_rows = VBD_JOINT_PANEL_COUNT * (VBD_JOINT_WINDOW_COUNT - 4)

    assert model.rvs_to_values[model["capability_observed"]].data.shape == (
        capability_training_rows,
    )
    for name in (
        "retained_count",
        "newly_embedded_count",
        "active_nonembedded_count",
    ):
        assert model.rvs_to_values[model[name]].data.shape == (
            transition_training_rows,
        )
    for panel_index in range(VBD_JOINT_PANEL_COUNT):
        assert model.rvs_to_values[
            model[f"outcome_observed_panel_{panel_index}"]
        ].data.shape == (VBD_JOINT_WINDOW_COUNT - 4,)


def test_diagnostic_universe_covers_every_free_parameter(prepared):
    for variant in ("full", "restricted"):
        model = build_vbd_joint_model(prepared, variant=variant)
        assert set(vbd_joint_diagnostic_parameter_names(variant)) == {
            variable.name for variable in model.free_RVs
        }


def test_future_log_score_is_posterior_predictive_log_density(prepared):
    observed = prepared.observed_outcome
    outcome_mean = np.stack((observed, observed + 0.5), axis=0)[None, :, :]
    idata = SimpleNamespace(
        posterior={
            "outcome_mean": outcome_mean,
            "residual_scale": np.asarray([[0.2, 0.2]]),
            "rho": np.asarray([[0.0, 0.0]]),
        }
    )

    _, _, log_score = _predictive_summaries(idata, prepared)

    evaluation_count = int(prepared.evaluation.sum())
    variance = 0.2**2 + float(prepared.outcome_standard_error[0]) ** 2
    normalization = evaluation_count * np.log(2.0 * np.pi * variance)
    joint_log_density_zero_error = -0.5 * normalization
    joint_log_density_shifted = -0.5 * (
        normalization + evaluation_count * 0.5**2 / variance
    )
    expected = (
        np.logaddexp(joint_log_density_zero_error, joint_log_density_shifted)
        - np.log(2.0)
    ) / evaluation_count
    arithmetic_mean_log_density = (
        joint_log_density_zero_error + joint_log_density_shifted
    ) / (2.0 * evaluation_count)

    assert log_score == pytest.approx(expected)
    assert log_score != pytest.approx(arithmetic_mean_log_density)


def test_smoke_settings_are_permanently_nonqualifying():
    smoke = vbd_joint_sampler_settings("smoke")
    full = vbd_joint_sampler_settings("full")

    assert smoke.qualifying_settings is False
    assert full.qualifying_settings is True
    assert smoke.to_dict()["draws"] == 300
    assert full.to_dict()["draws"] == 1000


def test_fit_seed_must_bind_the_prepared_scenario(prepared):
    with pytest.raises(VBDJointStructureError, match="fit seed does not bind"):
        fit_vbd_joint_model(
            prepared,
            variant="full",
            seed=VBD_JOINT_PRIMARY_SEED + 1,
            mode="smoke",
        )


def _summary(name, value):
    return VBDJointCoefficientSummary(
        coefficient_name=name,
        posterior_mean=value,
        posterior_sd=0.1,
        interval_80_lower=value - 0.1,
        interval_80_upper=value + 0.1,
    )


def _fake_fit(prepared, variant):
    shared = (
        _summary("capability_retention", 0.3),
        _summary("capability_embedding", 0.6),
        _summary("capability_active_nonembedded", 0.4),
        _summary("outcome_capability", 0.2),
        _summary("outcome_time", 0.1),
        _summary("control_seasonality_index", 0.3),
        _summary("control_customer_demand_index", -0.2),
    )
    behavior = (
        _summary("outcome_embedded", 0.8),
        _summary("outcome_active_nonembedded", 0.2),
        _summary("outcome_capability_by_embedded", 0.35),
    )
    return VBDJointFit(
        idata=object(),
        prepared=prepared,
        variant=variant,
        settings=vbd_joint_sampler_settings("smoke"),
        seed=VBD_JOINT_PRIMARY_SEED,
        coefficient_summaries=shared + (behavior if variant == "full" else ()),
        diagnostics={
            "state": "HOLD",
            "failing_diagnostics": [
                "bulk_ess",
                "r_hat",
                "smoke_settings_nonqualifying",
                "tail_ess",
            ],
            "max_r_hat": 1.02,
            "min_bulk_ess": 200.0,
            "min_tail_ess": 180.0,
            "divergence_count": 0,
            "max_treedepth_count": 0,
            "full_run_required_for_qualification": True,
        },
        bayesian_r_squared_mean=0.6 if variant == "full" else 0.5,
        future_window_rmse=0.2 if variant == "full" else 0.3,
        future_window_log_score=-0.2 if variant == "full" else -0.4,
        wall_time_seconds=1.0,
    )


def test_nonfinite_diagnostic_hold_is_durable_in_the_sanitized_artifact(prepared):
    full_fit = _fake_fit(prepared, "full")
    full_fit.diagnostics = {
        **full_fit.diagnostics,
        "failing_diagnostics": ["smoke_settings_nonqualifying", "summary_nonfinite"],
        "max_r_hat": VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
        "min_bulk_ess": VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
        "min_tail_ess": VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
    }

    artifact = emit_vbd_joint_artifact(
        full_fit=full_fit,
        restricted_fit=_fake_fit(prepared, "restricted"),
        synthetic_case="primary",
    )

    assert artifact["internal_state"] == "HOLD_SMOKE_NONQUALIFYING"
    assert "summary_nonfinite" in artifact["fit_states"]["full"]["diagnostics"][
        "failing_diagnostics"
    ]


def test_artifact_is_summary_only_and_smoke_holds(prepared):
    artifact = emit_vbd_joint_artifact(
        full_fit=_fake_fit(prepared, "full"),
        restricted_fit=_fake_fit(prepared, "restricted"),
        synthetic_case="primary",
    )

    assert artifact["internal_state"] == "HOLD_SMOKE_NONQUALIFYING"
    assert artifact["predictive_comparison"][
        "future_window_rmse_improvement_restricted_minus_full"
    ] == pytest.approx(0.1)
    assert tuple(artifact["blocked_outputs"]) == VBD_JOINT_BLOCKED_OUTPUTS
    assert all(value is False for value in artifact["blocked_outputs"].values())
    rendered = repr(artifact)
    for prohibited in (
        "posterior_draw",
        "latent_path",
        "family_id",
        "workflow_id",
        "panel_estimate",
        "raw_observation",
    ):
        assert prohibited not in rendered
    validate_vbd_joint_artifact(artifact)


def test_artifact_rejects_authorization_or_unsafe_extra_fields(prepared):
    artifact = emit_vbd_joint_artifact(
        full_fit=_fake_fit(prepared, "full"),
        restricted_fit=_fake_fit(prepared, "restricted"),
        synthetic_case="primary",
    )
    blocked = dict(artifact["blocked_outputs"])
    blocked["customer_output_authorized"] = True
    forged = replace_dict(artifact, blocked_outputs=blocked)
    with pytest.raises(VBDJointStructureError, match="cannot authorize"):
        validate_vbd_joint_artifact(forged)

    forged = dict(artifact)
    forged["posterior_draws"] = [0.1]
    with pytest.raises(VBDJointStructureError, match="shape"):
        validate_vbd_joint_artifact(forged)

    fit_states = {
        variant: {
            **state,
            "diagnostics": {
                **state["diagnostics"],
                "failing_diagnostics": ["person@example.com"],
            },
        }
        for variant, state in artifact["fit_states"].items()
    }
    forged = replace_dict(artifact, fit_states=fit_states)
    with pytest.raises(VBDJointStructureError, match="diagnostic failures"):
        validate_vbd_joint_artifact(forged)


def test_artifact_rejects_invalid_nested_shapes_and_numbers(prepared):
    artifact = emit_vbd_joint_artifact(
        full_fit=_fake_fit(prepared, "full"),
        restricted_fit=_fake_fit(prepared, "restricted"),
        synthetic_case="primary",
    )
    fit_states = {
        **artifact["fit_states"],
        "full": {
            **artifact["fit_states"]["full"],
            "future_window_rmse": float("nan"),
        },
    }
    with pytest.raises(VBDJointStructureError, match="finite float"):
        validate_vbd_joint_artifact(replace_dict(artifact, fit_states=fit_states))

    predictive = dict(artifact["predictive_comparison"])
    predictive["unexpected_nested_field"] = 0.0
    with pytest.raises(VBDJointStructureError, match="predictive comparison shape"):
        validate_vbd_joint_artifact(
            replace_dict(artifact, predictive_comparison=predictive)
        )


def replace_dict(artifact, **changes):
    body = dict(artifact)
    body.update(changes)
    body["artifact_self_hash"] = __import__(
        "fluencytracr_inference.hashing", fromlist=["sha256_json"]
    ).sha256_json({key: value for key, value in body.items() if key != "artifact_self_hash"})
    return body


def test_artifact_rejects_mismatched_prepared_inputs(prepared):
    null_prepared = prepare_vbd_joint_dataset(
        generate_vbd_joint_synthetic_dataset(scenario="behavior_pathway_null")
    )
    with pytest.raises(VBDJointStructureError, match="same input"):
        emit_vbd_joint_artifact(
            full_fit=_fake_fit(prepared, "full"),
            restricted_fit=_fake_fit(null_prepared, "restricted"),
            synthetic_case="primary",
        )


def test_artifact_revalidates_each_fit_prepared_projection(prepared):
    replacement_source = prepared.evaluation.copy()
    replacement_source[0] = not bool(replacement_source[0])
    replacement = np.frombuffer(
        replacement_source.tobytes(order="C"), dtype=replacement_source.dtype
    ).reshape(replacement_source.shape)
    assert not replacement.flags.owndata
    assert not replacement.flags.writeable

    forged_prepared = replace(prepared, evaluation=replacement)
    with pytest.raises(VBDJointStructureError, match="prepared evaluation"):
        emit_vbd_joint_artifact(
            full_fit=_fake_fit(forged_prepared, "full"),
            restricted_fit=_fake_fit(prepared, "restricted"),
            synthetic_case="primary",
        )


def test_artifact_binds_scenario_and_fit_seed(prepared):
    with pytest.raises(VBDJointStructureError, match="synthetic case does not bind"):
        emit_vbd_joint_artifact(
            full_fit=_fake_fit(prepared, "full"),
            restricted_fit=_fake_fit(prepared, "restricted"),
            synthetic_case="behavior_pathway_null",
        )

    wrong_seed = _fake_fit(prepared, "restricted")
    wrong_seed.seed = VBD_JOINT_PRIMARY_SEED + 1
    with pytest.raises(VBDJointStructureError, match="fit seeds differ"):
        emit_vbd_joint_artifact(
            full_fit=_fake_fit(prepared, "full"),
            restricted_fit=wrong_seed,
            synthetic_case="primary",
        )


def test_artifact_recomputes_diagnostic_threshold_failures(prepared):
    artifact = emit_vbd_joint_artifact(
        full_fit=_fake_fit(prepared, "full"),
        restricted_fit=_fake_fit(prepared, "restricted"),
        synthetic_case="primary",
    )
    full_settings = vbd_joint_sampler_settings("full").to_dict()
    forged_states = {}
    for variant, state in artifact["fit_states"].items():
        forged_states[variant] = {
            **state,
            "sampler_settings": full_settings,
            "diagnostics": {
                **state["diagnostics"],
                "state": "PASS",
                "failing_diagnostics": [],
                "max_r_hat": 99.0,
                "min_bulk_ess": 0.0,
                "min_tail_ess": 0.0,
                "divergence_count": 99,
                "max_treedepth_count": 99,
            },
        }
    forged = replace_dict(
        artifact,
        fit_states=forged_states,
        internal_state="SYNTHETIC_FULL_RUN_PENDING_INDEPENDENT_REVIEW",
    )
    with pytest.raises(VBDJointStructureError, match="failures are inconsistent"):
        validate_vbd_joint_artifact(forged)
