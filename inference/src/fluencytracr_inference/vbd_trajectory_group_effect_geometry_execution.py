"""Private one-shot execution for the permanently held geometry diagnostic."""

from __future__ import annotations

import gc

from .hashing import sha256_json
from .vbd_trajectory_group_effect_geometry_authorization import (
    _VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_EXECUTION_TOKEN,
    build_vbd_trajectory_group_effect_geometry_completion_receipt,
    build_vbd_trajectory_group_effect_geometry_input_binding,
    validate_vbd_trajectory_group_effect_geometry_authorization_manifest,
    validate_vbd_trajectory_group_effect_geometry_claim,
    validate_vbd_trajectory_group_effect_geometry_execution_authorization,
    write_vbd_trajectory_group_effect_geometry_completion_receipt,
    write_vbd_trajectory_group_effect_geometry_input_binding,
)
from .vbd_trajectory_group_effect_geometry_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER,
)
from .vbd_trajectory_group_effect_geometry_diagnostic import (
    _VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMPLETION_TOKEN,
    build_completed_vbd_trajectory_group_effect_geometry_record,
    build_vbd_trajectory_group_effect_geometry_completion_binding,
    vbd_trajectory_group_effect_geometry_plan,
    vbd_trajectory_group_effect_geometry_seed_manifest,
)
from .vbd_trajectory_group_effect_geometry_projection import (
    project_vbd_trajectory_group_effect_geometry_arm,
)
from .vbd_trajectory_nuts import (
    _VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SAMPLING_TOKEN,
    _sample_vbd_trajectory_group_effect_geometry_idata,
    build_vbd_trajectory_nuts_group_effect_geometry_binding,
)
from .vbd_trajectory_preparation import prepare_vbd_trajectory_lane
from .vbd_trajectory_state_space import (
    fit_vbd_trajectory_all_common_quantity_reference,
)
from .vbd_trajectory_synthetic import (
    _GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_GENERATION_RUNNER_TOKEN,
    generate_vbd_trajectory_group_effect_geometry_diagnostic_case,
)
from .vbd_trajectory_types import vbd_trajectory_model_manifest_body
from .vbd_trajectory_validation_resumable import (
    _RUNNER_SOURCE_PATHS as _RUNNER_SOURCE_PATHS,
    build_vbd_trajectory_runtime_identity,
    vbd_trajectory_runner_implementation_manifest,
)


def execute_authorized_vbd_trajectory_group_effect_geometry(
    *,
    manifest: dict,
    execution_authorization: dict,
    claim: dict,
    _execution_token: object,
) -> dict:
    """Run the exact twelve-arm diagnostic after the launch is spent."""

    if (
        _execution_token
        is not _VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_EXECUTION_TOKEN
    ):
        raise PermissionError("geometry execution requires its runner token")
    manifest = validate_vbd_trajectory_group_effect_geometry_authorization_manifest(
        manifest
    )
    authorization_commit = execution_authorization.get("authorization_commit")
    execution_authorization = (
        validate_vbd_trajectory_group_effect_geometry_execution_authorization(
            execution_authorization,
            manifest=manifest,
            authorization_commit=authorization_commit,
        )
    )
    try:
        claim = validate_vbd_trajectory_group_effect_geometry_claim(
            claim,
            manifest=manifest,
            execution_authorization=execution_authorization,
            authorization_commit=authorization_commit,
        )
    except Exception as exc:
        raise PermissionError("geometry attempt claim is invalid") from exc

    runtime = build_vbd_trajectory_runtime_identity()
    implementation = vbd_trajectory_runner_implementation_manifest(
        source_paths=_RUNNER_SOURCE_PATHS
    )
    plan = vbd_trajectory_group_effect_geometry_plan()
    seed_manifest = vbd_trajectory_group_effect_geometry_seed_manifest()
    if (
        runtime["runtime_identity_hash"] != manifest["runtime_identity_hash"]
        or implementation["implementation_hash"]
        != manifest["implementation_hash"]
        or sha256_json(vbd_trajectory_model_manifest_body())
        != manifest["model_manifest_hash"]
        or plan["plan_hash"] != manifest["diagnostic_plan_hash"]
        or seed_manifest["seed_manifest_hash"]
        != manifest["seed_manifest_hash"]
    ):
        raise RuntimeError("geometry runtime, model, plan, or seed binding drifted")

    generated_cases = []
    prepared_by_case = []
    references_by_case = []
    recomputations_by_case = []
    for expected_case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        case = generate_vbd_trajectory_group_effect_geometry_diagnostic_case(
            expected_case.case_ordinal,
            _runner_token=(
                _GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
            ),
        )
        prepared = tuple(
            prepare_vbd_trajectory_lane(case.panel, lane)
            for lane in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
        )
        references = tuple(
            fit_vbd_trajectory_all_common_quantity_reference(value, case.panel)
            for value in prepared
        )
        recomputations = tuple(
            fit_vbd_trajectory_all_common_quantity_reference(value, case.panel)
            for value in prepared
        )
        if tuple(value.to_dict() for value in references) != tuple(
            value.to_dict() for value in recomputations
        ):
            raise RuntimeError("geometry deterministic recomputation differs")
        generated_cases.append(case)
        prepared_by_case.append(prepared)
        references_by_case.append(references)
        recomputations_by_case.append(recomputations)

    expected_binding_hashes = [
        item["binding"]["binding_hash"] for item in plan["execution_order"]
    ]
    input_binding = build_vbd_trajectory_group_effect_geometry_input_binding(
        manifest=manifest,
        claim=claim,
        case_panel_hashes=[
            sha256_json(case.panel.to_dict()) for case in generated_cases
        ],
        ordered_panel_manifest_roots=[
            case.panel.ordered_panel_manifest_root for case in generated_cases
        ],
        prepared_input_hashes=[
            prepared.prepared_input_hash
            for values in prepared_by_case
            for prepared in values
        ],
        model_input_hashes=[
            prepared.model_input_hash
            for values in prepared_by_case
            for prepared in values
        ],
        deterministic_reference_hashes=[
            reference.reference_hash()
            for values in references_by_case
            for reference in values
        ],
        deterministic_recomputation_hashes=[
            reference.reference_hash()
            for values in recomputations_by_case
            for reference in values
        ],
        expected_sampler_binding_hashes=expected_binding_hashes,
    )
    write_vbd_trajectory_group_effect_geometry_input_binding(
        manifest=manifest,
        binding=input_binding,
        claim=claim,
    )

    arm_records = []
    for case_index, expected_case in enumerate(
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES
    ):
        case = generated_cases[case_index]
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
        ):
            for arm in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
                binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
                    case_ordinal=expected_case.case_ordinal,
                    arm=arm,
                    lane=lane,
                    lane_ordinal=lane_ordinal,
                    plan_hash=case.panel.study_plan_root,
                )
                expected_sequence = plan["execution_order"][len(arm_records)]
                if (
                    binding.binding_hash
                    != expected_sequence["binding"]["binding_hash"]
                    or binding.binding_hash
                    != input_binding["expected_sampler_binding_hashes"][
                        len(arm_records)
                    ]
                ):
                    raise RuntimeError("geometry sampler execution order drifted")
                idata = _sample_vbd_trajectory_group_effect_geometry_idata(
                    prepared_by_case[case_index][lane_ordinal],
                    case.panel,
                    binding=binding,
                    _runner_token=(
                        _VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SAMPLING_TOKEN
                    ),
                )
                try:
                    arm_records.append(
                        project_vbd_trajectory_group_effect_geometry_arm(
                            idata,
                            binding=binding,
                            prepared=prepared_by_case[case_index][lane_ordinal],
                            panel_hash=input_binding["case_panel_hashes"][
                                case_index
                            ],
                            ordered_panel_manifest_root=(
                                case.panel.ordered_panel_manifest_root
                            ),
                            deterministic_reference=(
                                references_by_case[case_index][lane_ordinal]
                            ),
                            deterministic_recomputation=(
                                recomputations_by_case[case_index][lane_ordinal]
                            ),
                        )
                    )
                finally:
                    del idata
                    gc.collect()

    receipt = build_vbd_trajectory_group_effect_geometry_completion_receipt(
        manifest=manifest,
        claim=claim,
        input_binding=input_binding,
        arm_records=arm_records,
    )
    write_vbd_trajectory_group_effect_geometry_completion_receipt(
        manifest=manifest,
        receipt=receipt,
        claim=claim,
        input_binding=input_binding,
        arm_records=arm_records,
    )
    provenance = {
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "execution_authorization_hash": execution_authorization[
            "execution_authorization_hash"
        ],
        "implementation_commit": manifest["implementation_commit"],
        "implementation_tree": manifest["implementation_tree"],
        "implementation_review_refs": manifest["implementation_review_refs"],
        "launch_permit_hash": execution_authorization["launch_permit_hash"],
        "consumed_permit_file_hash": execution_authorization[
            "launch_permit_file_sha256"
        ],
        "external_claim_hash": claim["claim_hash"],
        "input_binding_hash": input_binding["input_binding_hash"],
        "runtime_identity_hash": manifest["runtime_identity_hash"],
        "requirements_lock_hash": manifest["requirements_lock_hash"],
        "implementation_hash": manifest["implementation_hash"],
        "native_library_manifest_hash": manifest[
            "native_library_manifest_hash"
        ],
        "model_manifest_hash": manifest["model_manifest_hash"],
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "command_hash": manifest["command_hash"],
    }
    completion = build_vbd_trajectory_group_effect_geometry_completion_binding(
        provenance=provenance,
        arm_records=arm_records,
        terminal_completion_receipt_hash=receipt["completion_receipt_hash"],
    )
    return build_completed_vbd_trajectory_group_effect_geometry_record(
        arm_records=arm_records,
        runner_completion_binding=completion,
        _completion_token=(
            _VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMPLETION_TOKEN
        ),
    )
