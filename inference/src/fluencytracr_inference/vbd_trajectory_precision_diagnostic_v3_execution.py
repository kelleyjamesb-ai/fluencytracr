"""Private one-shot execution for the permanently held V3 MCSE diagnostic."""

from __future__ import annotations

from datetime import datetime, timezone
import gc
import os
from pathlib import Path
import stat

from .hashing import sha256_json
from .vbd_trajectory_nuts import (
    _VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_SAMPLING_TOKEN,
    _sample_vbd_trajectory_precision_diagnostic_v3,
    build_vbd_trajectory_nuts_precision_diagnostic_v3_binding,
)
from .vbd_trajectory_precision_diagnostic import (
    build_vbd_trajectory_precision_diagnostic_v3_record,
    project_vbd_trajectory_precision_diagnostic_v3_lane,
    validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints,
)
from .vbd_trajectory_precision_diagnostic_v3_authorization import (
    _VBD_PRECISION_DIAGNOSTIC_V3_EXECUTION_TOKEN,
    bind_vbd_precision_diagnostic_v3_input,
    preflight_vbd_precision_diagnostic_v3_fixed_roots,
    validate_vbd_precision_diagnostic_v3_authorization_manifest,
    validate_vbd_precision_diagnostic_v3_claim,
    validate_vbd_precision_diagnostic_v3_execution_authorization,
)
from .vbd_trajectory_precision_diagnostic_v3_checkpoint import (
    VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity,
    start_vbd_precision_diagnostic_v3_checkpoint_session,
    validate_vbd_precision_diagnostic_v3_checkpoint_root,
    write_vbd_precision_diagnostic_v3_checkpoint,
)
from .vbd_trajectory_preparation import prepare_vbd_trajectory_lane
from .vbd_trajectory_synthetic import (
    _PRECISION_DIAGNOSTIC_V3_GENERATION_RUNNER_TOKEN,
    generate_vbd_trajectory_precision_diagnostic_v3_case,
)
from .vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    vbd_trajectory_model_manifest_body,
)
from .vbd_trajectory_validation_resumable import (
    build_vbd_trajectory_runtime_identity,
    vbd_trajectory_runner_implementation_manifest,
)


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _create_empty_checkpoint_root(path: Path) -> None:
    try:
        path.mkdir(mode=0o700, parents=False, exist_ok=True)
        info = path.lstat()
        if path.is_symlink() or not stat.S_ISDIR(info.st_mode):
            raise OSError("checkpoint root is unsafe")
        os.chmod(path, 0o700)
    except OSError as exc:
        raise RuntimeError("precision diagnostic V3 checkpoint root is unavailable") from exc


def execute_authorized_vbd_precision_diagnostic_v3(
    *,
    manifest: dict,
    execution_authorization: dict,
    claim: dict,
    _execution_token: object,
) -> dict:
    """Execute once after the external V3 claim has already been consumed."""

    if _execution_token is not _VBD_PRECISION_DIAGNOSTIC_V3_EXECUTION_TOKEN:
        raise PermissionError("precision diagnostic V3 execution requires its token")
    manifest = validate_vbd_precision_diagnostic_v3_authorization_manifest(manifest)
    authorization_commit = execution_authorization.get("authorization_commit")
    execution_authorization = validate_vbd_precision_diagnostic_v3_execution_authorization(
        execution_authorization,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    try:
        claim = validate_vbd_precision_diagnostic_v3_claim(
            claim,
            manifest=manifest,
            execution_authorization=execution_authorization,
            authorization_commit=authorization_commit,
        )
    except Exception as exc:
        raise PermissionError("precision diagnostic V3 claim is invalid") from exc
    runtime = build_vbd_trajectory_runtime_identity()
    implementation = vbd_trajectory_runner_implementation_manifest()
    if (
        runtime["runtime_identity_hash"] != manifest["runtime_identity_hash"]
        or implementation["implementation_hash"] != manifest["implementation_hash"]
        or sha256_json(vbd_trajectory_model_manifest_body())
        != manifest["model_manifest_hash"]
    ):
        raise RuntimeError("precision diagnostic V3 runtime or model binding drifted")

    preflight_vbd_precision_diagnostic_v3_fixed_roots(
        manifest=manifest, claim_consumed=True
    )

    checkpoint_root = Path(manifest["checkpoint_root_path"])
    _create_empty_checkpoint_root(checkpoint_root)
    checkpoint_identity = VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(
        implementation_commit=manifest["implementation_commit"],
        authorization_commit=authorization_commit,
        authorization_manifest_hash=manifest["manifest_hash"],
        human_execution_authorization_hash=execution_authorization[
            "execution_authorization_hash"
        ],
        attempt_claim_hash=claim["claim_hash"],
    )
    session = start_vbd_precision_diagnostic_v3_checkpoint_session(
        root=checkpoint_root,
        identity=checkpoint_identity,
    )
    try:
        write_vbd_precision_diagnostic_v3_checkpoint(
            session,
            created_at_utc=_timestamp(),
            input_binding_hash=None,
        )
        case = generate_vbd_trajectory_precision_diagnostic_v3_case(
            _runner_token=_PRECISION_DIAGNOSTIC_V3_GENERATION_RUNNER_TOKEN
        )
        prepared = tuple(
            prepare_vbd_trajectory_lane(case.panel, lane)
            for lane in VBD_TRAJECTORY_LANES
        )
        synthetic_input_hash = sha256_json(case.panel.to_dict())
        input_binding = bind_vbd_precision_diagnostic_v3_input(
            manifest=manifest,
            claim=claim,
            synthetic_input_hash=synthetic_input_hash,
            panel_manifest_root=case.panel.ordered_panel_manifest_root,
            prepared_input_hashes=[value.prepared_input_hash for value in prepared],
            model_input_hashes=[value.model_input_hash for value in prepared],
        )
        input_binding_hash = input_binding["input_binding_hash"]
        write_vbd_precision_diagnostic_v3_checkpoint(
            session,
            created_at_utc=_timestamp(),
            input_binding_hash=input_binding_hash,
        )

        lane_records = []
        for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
            binding = build_vbd_trajectory_nuts_precision_diagnostic_v3_binding(
                generator_seed=case.panel.seed,
                lane=lane,
                lane_ordinal=lane_ordinal,
                plan_hash=case.panel.study_plan_root,
            )
            write_vbd_precision_diagnostic_v3_checkpoint(
                session,
                created_at_utc=_timestamp(),
                input_binding_hash=input_binding_hash,
            )
            idata = _sample_vbd_trajectory_precision_diagnostic_v3(
                prepared[lane_ordinal],
                case.panel,
                binding=binding,
                _runner_token=(
                    _VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_SAMPLING_TOKEN
                ),
            )
            write_vbd_precision_diagnostic_v3_checkpoint(
                session,
                created_at_utc=_timestamp(),
                input_binding_hash=input_binding_hash,
            )
            try:
                lane_records.append(
                    project_vbd_trajectory_precision_diagnostic_v3_lane(
                        idata,
                        lane=lane,
                        lane_ordinal=lane_ordinal,
                        binding=binding,
                        prepared_input_hash=(
                            prepared[lane_ordinal].prepared_input_hash
                        ),
                        model_input_hash=prepared[lane_ordinal].model_input_hash,
                    )
                )
            finally:
                del idata
                gc.collect()
            write_vbd_precision_diagnostic_v3_checkpoint(
                session,
                created_at_utc=_timestamp(),
                input_binding_hash=input_binding_hash,
            )

        terminal = write_vbd_precision_diagnostic_v3_checkpoint(
            session,
            created_at_utc=_timestamp(),
            input_binding_hash=input_binding_hash,
        )
        checkpoints = validate_vbd_precision_diagnostic_v3_checkpoint_root(
            root=checkpoint_root,
            identity=checkpoint_identity,
        )
        if checkpoints[-1] != terminal:
            raise RuntimeError("precision diagnostic V3 terminal checkpoint drifted")
        provenance = {
            "authorization_commit": authorization_commit,
            "authorization_manifest_hash": manifest["manifest_hash"],
            "execution_authorization_hash": execution_authorization[
                "execution_authorization_hash"
            ],
            "implementation_commit": manifest["implementation_commit"],
            "implementation_tree": manifest["implementation_tree"],
            "implementation_review_refs": manifest["implementation_review_refs"],
            "canonical_workspace_identity_hash": manifest[
                "canonical_workspace_identity_hash"
            ],
            "external_claim_hash": claim["claim_hash"],
            "input_binding_hash": input_binding_hash,
            "runtime_identity_hash": manifest["runtime_identity_hash"],
            "requirements_lock_hash": manifest["requirements_lock_hash"],
            "implementation_hash": manifest["implementation_hash"],
            "native_library_manifest_hash": manifest[
                "native_library_manifest_hash"
            ],
            "model_manifest_hash": manifest["model_manifest_hash"],
            "synthetic_input_hash": synthetic_input_hash,
            "panel_manifest_root": case.panel.ordered_panel_manifest_root,
        }
        record = build_vbd_trajectory_precision_diagnostic_v3_record(
            provenance=provenance,
            lane_records=lane_records,
            terminal_checkpoint_hash=terminal["checkpoint_hash"],
        )
        return validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
            record,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
    finally:
        session.close()
