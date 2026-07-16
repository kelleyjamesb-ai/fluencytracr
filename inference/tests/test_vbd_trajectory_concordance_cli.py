import json

from fluencytracr_inference import vbd_trajectory_concordance_cli as cli


def test_concordance_plan_cli_is_exact_and_nonauthorizing(capsys):
    assert cli.main(["plan"]) == 0
    value = json.loads(capsys.readouterr().out)

    assert value["bundle_count"] == 30
    assert value["lane_fit_count_per_engine"] == 90
    assert value["execution"]["acceptance_canaries_executed"] is False
    assert value["execution"]["replicated_validation_executed"] is False
    assert value["customer_output_authorized"] is False
    assert value["task_5_6_complete"] is False
