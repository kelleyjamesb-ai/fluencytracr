import numpy as np
import pytest

import fluencytracr_inference.vbd_trajectory_types as trajectory_types
from fluencytracr_inference.vbd_trajectory_bootstrap_conformance import (
    VBD_BOOTSTRAP_EXPECTED_COVARIANCE,
    VBD_BOOTSTRAP_EXPECTED_NEAREST_P50,
    VBD_BOOTSTRAP_EXPECTED_STANDARD_ERRORS,
    VBD_BOOTSTRAP_EXPECTED_TYPE7_P50,
    VBD_BOOTSTRAP_ORACLE_HASH,
    VBD_BOOTSTRAP_PRIVATE_ROOT,
    bootstrap_fixture_private_body,
    nearest_index_quantile,
    run_bootstrap_conformance,
    type7_quantile,
)
from fluencytracr_inference.hashing import sha256_json


def test_bootstrap_conformance_matches_frozen_portable_oracle():
    result = run_bootstrap_conformance()

    assert result.passed is True
    assert not hasattr(result, "private_root")
    assert not hasattr(result, "seed")
    assert result.type7_p50 == VBD_BOOTSTRAP_EXPECTED_TYPE7_P50
    assert result.nearest_index_p50 == VBD_BOOTSTRAP_EXPECTED_NEAREST_P50
    assert result.transformed_covariance == VBD_BOOTSTRAP_EXPECTED_COVARIANCE
    assert result.transformed_standard_errors == VBD_BOOTSTRAP_EXPECTED_STANDARD_ERRORS
    assert result.oracle_hash == VBD_BOOTSTRAP_ORACLE_HASH
    assert sha256_json(bootstrap_fixture_private_body()) == VBD_BOOTSTRAP_PRIVATE_ROOT
    assert "private_root" not in repr(result)
    assert "seed=" not in repr(result)


def test_bootstrap_summary_emits_no_member_material():
    summary = run_bootstrap_conformance().to_dict()

    assert summary["fixture_rows_emitted"] is False
    assert summary["member_material_emitted"] is False
    assert summary["private_root_emitted"] is False
    assert summary["bootstrap_seed_emitted"] is False
    assert summary["numerical_study_input_authorized"] is False
    assert "private_root" not in summary
    assert "seed" not in summary
    serialized = repr(summary).lower()
    assert "frequency_run_counts" not in serialized
    assert "engagement_active_days" not in serialized
    assert "breadth_distinct_surfaces" not in serialized


def test_bootstrap_conformance_rejects_unpinned_runtime(monkeypatch):
    monkeypatch.setattr(trajectory_types.np, "__version__", "2.4.4")
    with pytest.raises(ValueError, match="frozen Python/NumPy"):
        run_bootstrap_conformance()


def test_type7_and_wrong_nearest_index_algorithms_are_distinct():
    values = np.arange(1.0, 17.0)

    assert type7_quantile(values, 0.5) == 8.5
    assert nearest_index_quantile(values, 0.5) == 9.0


@pytest.mark.parametrize("function", [type7_quantile, nearest_index_quantile])
def test_quantile_helpers_reject_malformed_inputs(function):
    with pytest.raises(ValueError):
        function(np.asarray([]), 0.5)
    with pytest.raises(ValueError):
        function(np.asarray([1.0, np.nan]), 0.5)
    with pytest.raises(ValueError):
        function(np.asarray([1.0, 2.0]), -0.1)
