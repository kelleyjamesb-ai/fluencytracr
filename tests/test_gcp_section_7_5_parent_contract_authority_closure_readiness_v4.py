from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import threading

import pytest

import tests.gcp_s751_v4.bundle as bundle_module
from tests.gcp_s751_v4.bundle import (
    BundleAdmissionError,
    admit_parent_bundle,
    open_harness_bundle,
    reopen_owned_bundle,
)
from tests.gcp_s751_v4.ledger import (
    build_rule_ledger,
    reconcile_rule_ledger,
    serialize_rule_ledger,
)
from tests.gcp_s751_v4.crypto import (
    anchor_key_id,
    sign_ephemeral_batch,
    verify_batch,
)
from tests.gcp_s751_v4.model import (
    canonical_json,
    enumerate_all_dynamic_paths,
    load_exact_parents,
    load_packet,
    strict_load_json,
)


ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / (
    "tests/fixtures/"
    "gcp_section_7_5_parent_contract_authority_closure_readiness_v4/"
    "packet-rules.json"
)
EXACT_MEMBER_NAMES = tuple(
    entry.member_name for entry in load_packet().parent_manifest
)


@pytest.fixture
def exact_parent_bytes() -> dict[str, bytes]:
    packet = load_packet()
    return load_exact_parents(packet)


@pytest.fixture
def exact_bundle(
    tmp_path: Path,
    exact_parent_bytes: dict[str, bytes],
) -> Path:
    bundle = tmp_path / "exact-parent-bundle"
    bundle.mkdir()
    for member_name, data in exact_parent_bytes.items():
        (bundle / member_name).write_bytes(data)
    return bundle


def test_v4_packet_is_compact_closed_and_has_no_sut() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    assert packet["schema_version"] == (
        "GCP_SECTION_7_5_1_READINESS_RULE_PACKET_V4"
    )
    assert packet["authority_effect"] == "NONE"
    assert len(packet["parent_manifest"]) == 5
    assert "generated_ledger" not in packet
    assert "parent_snapshots" not in packet
    assert "signature" not in packet
    assert not (
        ROOT / "scripts/"
        "gcp_section_7_5_parent_contract_authority_closure_v4.py"
    ).exists()


def test_v4_packet_enumerates_all_eight_dynamic_boundaries() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    schemas = packet["closed_schemas"]
    assert set(schemas) == {
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
        "replay_record",
        "parent_bundle_descriptor",
        "result",
    }
    expected_pointers = {
        "candidate": {
            "/schema_version", "/requested_action", "/observation",
            "/observation/governed_roles", "/observation/governed_roles/*",
            "/observation/synthetic_aliases",
            "/observation/synthetic_aliases/*",
            "/observation/controller_edges",
            "/observation/controller_edges/*",
            "/observation/controller_edges/*/controller",
            "/observation/controller_edges/*/controlled",
            "/observation/controller_cycles",
            "/observation/controller_cycles/*",
            "/observation/controller_cycles/*/*",
            "/observation/unknown_edge_count",
        },
        "signed_context_payload": {
            "/schema_version", "/policy_id", "/candidate_sha256", "/mode",
            "/parent_manifest", "/parent_manifest/*",
            "/parent_manifest/*/member_name", "/parent_manifest/*/sha256",
            "/registry_sha256", "/receipt_sha256", "/approval_target_sha256",
            "/current_head_sha256", "/anti_rollback_sha256",
            "/role_matrix_sha256", "/signer_purpose", "/key_id",
            "/nonce_time", "/authority_effect",
        },
        "signed_context_envelope": {
            "/schema_version", "/algorithm", "/payload",
            "/signature_der_base64",
        },
        "verifier_anchor": {"/spki_der_base64", "/key_id"},
        "nonce_time": {"/nonce", "/valid_from", "/valid_until", "/trusted_time"},
        "replay_record": {"/key_id", "/nonce", "/candidate_sha256", "/accepted_at"},
        "parent_bundle_descriptor": {"/fd", "/device", "/inode", "/member_names"},
        "result": {
            "/schema_version", "/decision", "/reason", "/authority_effect",
            "/claim_grade",
        },
    }
    for name, schema in schemas.items():
        assert schema["strict_object"] is True, name
        assert schema["additional_properties"] is False, name
        assert schema["fields"], name
        pointers = [field["pointer"] for field in schema["fields"]]
        assert set(pointers) == expected_pointers[name], name
        assert len(pointers) == len(set(pointers)), name
        for field in schema["fields"]:
            assert set(field) >= {
                "pointer",
                "type",
                "required",
                "cardinality",
                "value_rule",
            }, (name, field)
    metadata = {
        (name, field["pointer"]): (
            field["type"], field["cardinality"], field["value_rule"]
        )
        for name, schema in schemas.items()
        for field in schema["fields"]
    }
    assert metadata[("candidate", "/observation/synthetic_aliases/*")] == (
        "STRING", "ONE_PER_MEMBER",
        "PATTERN:^[0-9a-f]{32}$;CONTEXT_BOUND_SYNTHETIC_ONLY",
    )
    assert metadata[("signed_context_payload", "/parent_manifest")] == (
        "ARRAY", "EXACTLY_FIVE", "ORDERED_EXACT_PARENT_MANIFEST",
    )
    assert metadata[("signed_context_envelope", "/payload")] == (
        "OBJECT", "ONE", "REF:signed_context_payload",
    )
    assert metadata[("verifier_anchor", "/key_id")] == (
        "STRING", "ONE",
        "PATTERN:^P256_SPKI_SHA256:[0-9a-f]{64}$;DERIVED_FROM_SPKI",
    )
    assert metadata[("nonce_time", "/valid_until")] == (
        "STRING", "ONE", "UTC_RFC3339_SECONDS_Z;STRICTLY_AFTER:valid_from",
    )
    assert metadata[("parent_bundle_descriptor", "/fd")] == (
        "INTEGER", "ONE", "NONNEGATIVE_INTEGER;NONSEMANTIC",
    )
    assert metadata[("result", "/claim_grade")] == (
        "STRING", "ONE",
        "ENUM:NONE|STRUCTURAL_ONLY|ARCHIVE_CLOSEOUT_ONLY|DESIGN_ONLY",
    )


def test_v4_rule_failures_are_closed_and_deterministic() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    rules = {rule["rule_id"]: rule for rule in packet["rule_templates"]}
    assert {rule["failure"] for rule in rules.values()} <= {"REJECT", "HOLD"}
    assert rules["RULE-SECTION-7-3-AUTHORITY-INVALID"]["failure"] == "REJECT"
    assert rules["RULE-CURRENT-BLOCKERS"]["failure"] == "HOLD"


def test_closed_schemas_cover_every_dynamic_boundary() -> None:
    packet = load_packet()

    paths = enumerate_all_dynamic_paths(packet)

    assert {path.boundary for path in paths} == {
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
        "replay",
        "bundle_capability",
        "result",
    }
    assert len(paths) == len({(path.boundary, path.pointer) for path in paths})
    assert all("locator" not in path.pointer for path in paths)
    for path in paths:
        if path.json_type == "STRING":
            assert path.value_rule.startswith(
                (
                    "ENUM:",
                    "PATTERN:",
                    "EXACT_",
                    "BASE64_",
                    "UTC_",
                    "FIXED_CLOSED_",
                )
            ), path

    result_paths = {
        path.pointer for path in paths if path.boundary == "result"
    }
    assert result_paths == {
        "/schema_version",
        "/decision",
        "/reason",
        "/authority_effect",
        "/claim_grade",
    }
    assert next(
        path for path in paths
        if path.boundary == "result" and path.pointer == "/authority_effect"
    ).value_rule == "ENUM:NONE"


def test_strict_json_rejects_duplicate_keys_floats_and_noncanonical_bytes() -> None:
    for raw in (
        b'{"a":1,"a":2}',
        b'{"a":1.0}',
        b'{ "a": 1 }',
    ):
        with pytest.raises(ValueError):
            strict_load_json(raw)


def test_exact_parents_match_packet_hashes_and_canonical_manifest_bytes() -> None:
    packet = load_packet()

    parents = load_exact_parents(packet)

    assert tuple(parents) == tuple(entry.member_name for entry in packet.parent_manifest)
    assert len(parents) == 5
    for entry in packet.parent_manifest:
        assert hashlib.sha256(parents[entry.member_name]).hexdigest() == entry.sha256
        manifest_bytes = canonical_json(
            {"member_name": entry.member_name, "sha256": entry.sha256}
        )
        assert strict_load_json(manifest_bytes) == {
            "member_name": entry.member_name,
            "sha256": entry.sha256,
        }


def test_rule_ledger_reconciles_static_and_dynamic_paths() -> None:
    packet = load_packet()

    rows = build_rule_ledger(packet)

    reconcile_rule_ledger(packet, rows)
    keys = [(row.resource, row.pointer) for row in rows]
    assert len(keys) == len(set(keys))
    assert all(row.dependencies for row in rows if not row.is_root)
    assert all(row.anchor_rule for row in rows)
    assert not any(row.instance_value for row in rows if row.dynamic)


def test_rule_ledger_is_cold_process_deterministic_and_in_memory_only() -> None:
    def workspace_files() -> set[Path]:
        return {
            path.relative_to(ROOT)
            for path in ROOT.rglob("*")
            if path.is_file()
            and not {".git", ".pytest_cache", "__pycache__"}.intersection(
                path.relative_to(ROOT).parts
            )
        }

    script = "\n".join(
        (
            "import sys",
            "from tests.gcp_s751_v4.ledger import build_rule_ledger, serialize_rule_ledger",
            "from tests.gcp_s751_v4.model import load_packet",
            "sys.stdout.buffer.write(serialize_rule_ledger(build_rule_ledger(load_packet())))",
        )
    )
    command = [sys.executable, "-c", script]
    environment = {**os.environ, "PYTHONHASHSEED": "0"}
    files_before = workspace_files()

    first = subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
    )
    second = subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
    )

    assert first.stdout == second.stdout
    assert workspace_files() == files_before


def test_ephemeral_batches_bind_an_out_of_band_anchor() -> None:
    first = sign_ephemeral_batch([b"one", b"two"])
    second = sign_ephemeral_batch([b"one", b"two"])

    assert first.anchor_spki_der != second.anchor_spki_der
    assert first.key_id == anchor_key_id(first.anchor_spki_der)
    assert first.key_id.startswith("P256_SPKI_SHA256:")
    assert verify_batch(first.anchor_spki_der, first.vectors) == (True, True)
    assert verify_batch(first.anchor_spki_der, second.vectors) == (False, False)


def test_private_material_is_absent_from_helper_fixture_environment_and_arguments(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sentinel = "s751-v4-private-material-must-not-cross-the-boundary"
    monkeypatch.setenv("GCP_S751_V4_TEST_SECRET", sentinel)

    batch = sign_ephemeral_batch([b"canonical-preimage"])
    public_artifacts = (
        batch.anchor_spki_der,
        batch.key_id.encode("ascii"),
        batch.vectors[0].preimage,
        batch.vectors[0].signature_der,
    )
    prohibited_fragments = (
        b"-----BEGIN " + b"PRIVATE " + b"KEY-----",
        b"private" + b"_scalar",
        b"fixed" + b"_signing_seed",
        b"signer" + b"_capable_key",
        b"third" + b"_hsm_purpose",
        sentinel.encode("ascii"),
    )

    for artifact in public_artifacts:
        assert not any(fragment in artifact for fragment in prohibited_fragments)

    fixture_and_boundary_sources = (
        PACKET.read_bytes(),
        (ROOT / "tests/gcp_s751_v4/crypto.py").read_bytes(),
        (ROOT / "tests/helpers/gcp_s751_v4_crypto.mjs").read_bytes(),
    )
    for source in fixture_and_boundary_sources:
        assert not any(fragment in source for fragment in prohibited_fragments[:-1])


def test_hermetic_node_uses_a_pre_resolved_executable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PATH", "")
    monkeypatch.setenv("NODE_OPTIONS", "--require=/not-a-real-s751-v4-module")

    batch = sign_ephemeral_batch([b"hermetic"])

    assert batch.key_id == anchor_key_id(batch.anchor_spki_der)


def test_bundle_admission_uses_an_independent_open_description(
    exact_bundle: Path,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    owned = reopen_owned_bundle(incoming)
    try:
        incoming_stat = os.fstat(incoming)
        owned_stat = os.fstat(owned)
        assert (incoming_stat.st_dev, incoming_stat.st_ino) == (
            owned_stat.st_dev,
            owned_stat.st_ino,
        )
        os.lseek(incoming, 7, os.SEEK_SET)
        assert os.lseek(owned, 0, os.SEEK_CUR) == 0
        os.listdir(incoming)
        assert set(os.listdir(owned)) == set(EXACT_MEMBER_NAMES)
    finally:
        os.close(owned)
        os.close(incoming)


@pytest.mark.parametrize(
    ("capability_state", "member_count", "corrupt", "accepted"),
    (
        ("ABSENT", 0, False, False),
        ("PARTIAL", 4, False, False),
        ("CORRUPT", 5, True, False),
        ("EXACT", 5, False, True),
    ),
)
def test_bundle_capability_cells_require_exact_parent_bytes(
    tmp_path: Path,
    exact_parent_bytes: dict[str, bytes],
    capability_state: str,
    member_count: int,
    corrupt: bool,
    accepted: bool,
) -> None:
    bundle = tmp_path / capability_state.lower()
    bundle.mkdir()
    for member_name in EXACT_MEMBER_NAMES[:member_count]:
        data = exact_parent_bytes[member_name]
        if corrupt and member_name == EXACT_MEMBER_NAMES[-1]:
            data += b"\n"
        (bundle / member_name).write_bytes(data)
    incoming = open_harness_bundle(bundle)
    try:
        if accepted:
            assert admit_parent_bundle(
                incoming, load_packet().parent_manifest
            ) == exact_parent_bytes
        else:
            with pytest.raises(
                BundleAdmissionError,
                match=r"^INVALID_PARENT_RESOURCE_SET$",
            ):
                admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_an_extra_member(
    exact_bundle: Path,
) -> None:
    (exact_bundle / "unexpected.json").write_bytes(b"{}")
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


@pytest.mark.parametrize("replacement_kind", ("directory", "fifo"))
def test_bundle_admission_rejects_non_regular_members(
    exact_bundle: Path,
    replacement_kind: str,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    member.unlink()
    if replacement_kind == "directory":
        member.mkdir()
    else:
        os.mkfifo(member)
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_a_symlink_member(
    exact_bundle: Path,
    tmp_path: Path,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    target = tmp_path / "symlink-target"
    target.write_bytes(member.read_bytes())
    member.unlink()
    member.symlink_to(target)
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_a_renamed_member(
    exact_bundle: Path,
    tmp_path: Path,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    member.rename(tmp_path / "renamed-parent")
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_harness_path_admission_rejects_every_symlink_component(
    exact_bundle: Path,
    tmp_path: Path,
) -> None:
    final_link = tmp_path / "final-link"
    final_link.symlink_to(exact_bundle, target_is_directory=True)
    with pytest.raises(
        BundleAdmissionError,
        match=r"^INVALID_PARENT_RESOURCE_SET$",
    ):
        open_harness_bundle(final_link)

    real_ancestor = tmp_path / "real-ancestor"
    real_ancestor.mkdir()
    nested_bundle = real_ancestor / "nested-bundle"
    exact_bundle.rename(nested_bundle)
    ancestor_link = tmp_path / "ancestor-link"
    ancestor_link.symlink_to(real_ancestor, target_is_directory=True)
    with pytest.raises(
        BundleAdmissionError,
        match=r"^INVALID_PARENT_RESOURCE_SET$",
    ):
        open_harness_bundle(ancestor_link / nested_bundle.name)


def test_harness_path_admission_closes_new_descriptor_if_prior_close_fails(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    real_open = os.open
    real_close = os.close
    real_fstat = os.fstat
    opened_descriptors: list[int] = []
    injected_failure = False

    def recording_open(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        flags: int,
        mode: int = 0o777,
        *,
        dir_fd: int | None = None,
    ) -> int:
        opened_fd = real_open(path, flags, mode, dir_fd=dir_fd)
        opened_descriptors.append(opened_fd)
        return opened_fd

    def fail_first_close(fd: int) -> None:
        nonlocal injected_failure
        if not injected_failure:
            injected_failure = True
            real_close(fd)
            raise OSError("injected close failure")
        real_close(fd)

    monkeypatch.setattr(bundle_module.os, "open", recording_open)
    monkeypatch.setattr(bundle_module.os, "close", fail_first_close)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            open_harness_bundle(exact_bundle)
        assert len(opened_descriptors) >= 2
        for opened_fd in set(opened_descriptors):
            with pytest.raises(OSError):
                real_fstat(opened_fd)
    finally:
        for opened_fd in set(opened_descriptors):
            try:
                real_close(opened_fd)
            except OSError:
                pass


def test_evaluator_boundary_starts_at_the_admitted_final_directory_object(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
    tmp_path: Path,
) -> None:
    real_ancestor = tmp_path / "real-evaluator-ancestor"
    real_ancestor.mkdir()
    nested_bundle = real_ancestor / "nested-bundle"
    exact_bundle.rename(nested_bundle)
    ancestor_link = tmp_path / "evaluator-ancestor-link"
    ancestor_link.symlink_to(real_ancestor, target_is_directory=True)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    incoming = os.open(ancestor_link / nested_bundle.name, flags)
    try:
        assert admit_parent_bundle(
            incoming, load_packet().parent_manifest
        ) == exact_parent_bytes
    finally:
        os.close(incoming)


@pytest.mark.parametrize("invalid_population", (False, True))
def test_bundle_admission_closes_owned_descriptors_but_not_the_callers(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
    invalid_population: bool,
) -> None:
    if invalid_population:
        corrupt_member = exact_bundle / EXACT_MEMBER_NAMES[-1]
        corrupt_member.write_bytes(corrupt_member.read_bytes() + b"\n")
    owned_descriptors: list[int] = []
    real_open = os.open

    def recording_open(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        flags: int,
        mode: int = 0o777,
        *,
        dir_fd: int | None = None,
    ) -> int:
        opened_fd = real_open(path, flags, mode, dir_fd=dir_fd)
        owned_descriptors.append(opened_fd)
        return opened_fd

    incoming = open_harness_bundle(exact_bundle)
    monkeypatch.setattr(bundle_module.os, "open", recording_open)
    try:
        if invalid_population:
            with pytest.raises(BundleAdmissionError):
                admit_parent_bundle(incoming, load_packet().parent_manifest)
        else:
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
        assert len(owned_descriptors) == 6
        for owned_fd in set(owned_descriptors):
            with pytest.raises(OSError):
                os.fstat(owned_fd)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_a_closed_caller_descriptor(
    exact_bundle: Path,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    os.close(incoming)

    with pytest.raises(
        BundleAdmissionError,
        match=r"^INVALID_PARENT_RESOURCE_SET$",
    ):
        admit_parent_bundle(incoming, load_packet().parent_manifest)


@pytest.mark.parametrize("changed_field", ("device", "inode"))
def test_bundle_admission_rejects_pre_post_directory_identity_change(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
    changed_field: str,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    real_fstat = os.fstat
    incoming_fstat_calls = 0

    def changing_fstat(fd: int) -> os.stat_result:
        nonlocal incoming_fstat_calls
        result = real_fstat(fd)
        if fd != incoming:
            return result
        incoming_fstat_calls += 1
        if incoming_fstat_calls < 3:
            return result
        fields = list(result)
        index = 2 if changed_field == "device" else 1
        fields[index] += 1
        return os.stat_result(fields)

    monkeypatch.setattr(bundle_module.os, "fstat", changing_fstat)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_fifo_swap_in_stat_open_gap_without_blocking(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    member_name = EXACT_MEMBER_NAMES[0]
    member = exact_bundle / member_name
    incoming = open_harness_bundle(exact_bundle)
    real_open = os.open
    real_stat = os.stat
    real_fstat = os.fstat
    stat_complete = threading.Event()
    fifo_ready = threading.Event()
    intercepted = False
    owned_descriptors: list[int] = []
    outcomes: list[BaseException] = []

    def pausing_stat(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        *,
        dir_fd: int | None = None,
        follow_symlinks: bool = True,
    ) -> os.stat_result:
        nonlocal intercepted
        result = real_stat(
            path,
            dir_fd=dir_fd,
            follow_symlinks=follow_symlinks,
        )
        if path == member_name and dir_fd is not None and not intercepted:
            intercepted = True
            stat_complete.set()
            assert fifo_ready.wait(timeout=5)
        return result

    def recording_open(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        flags: int,
        mode: int = 0o777,
        *,
        dir_fd: int | None = None,
    ) -> int:
        opened_fd = real_open(path, flags, mode, dir_fd=dir_fd)
        owned_descriptors.append(opened_fd)
        return opened_fd

    def run_admission() -> None:
        try:
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        except BaseException as exc:
            outcomes.append(exc)

    monkeypatch.setattr(bundle_module.os, "stat", pausing_stat)
    monkeypatch.setattr(bundle_module.os, "open", recording_open)
    worker = threading.Thread(target=run_admission)
    worker.start()
    assert stat_complete.wait(timeout=5)
    member.unlink()
    os.mkfifo(member)
    assert member.is_fifo()
    fifo_ready.set()

    worker.join(timeout=1)
    completed_without_blocking = not worker.is_alive()
    if worker.is_alive():
        unblock_fd = real_open(member, os.O_RDWR | os.O_NONBLOCK)
        os.close(unblock_fd)
        worker.join(timeout=5)

    try:
        assert completed_without_blocking
        assert len(outcomes) == 1
        assert isinstance(outcomes[0], BundleAdmissionError)
        assert str(outcomes[0]) == "INVALID_PARENT_RESOURCE_SET"
        real_fstat(incoming)
        assert owned_descriptors
        for owned_fd in set(owned_descriptors):
            with pytest.raises(OSError):
                real_fstat(owned_fd)
    finally:
        os.close(incoming)
    assert not worker.is_alive()


def test_bundle_admission_rejects_concurrent_exact_content_replacement(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    member_name = EXACT_MEMBER_NAMES[0]
    member = exact_bundle / member_name
    member_inode = member.stat().st_ino
    replacement = exact_bundle.parent / "exact-replacement"
    replacement.write_bytes(exact_parent_bytes[member_name])
    member_opened = threading.Event()
    replacement_done = threading.Event()
    real_read = os.read

    def pausing_read(fd: int, size: int) -> bytes:
        if os.fstat(fd).st_ino == member_inode and not member_opened.is_set():
            member_opened.set()
            assert replacement_done.wait(timeout=5)
        return real_read(fd, size)

    def replace_member() -> None:
        assert member_opened.wait(timeout=5)
        os.replace(replacement, member)
        replacement_done.set()

    monkeypatch.setattr(bundle_module.os, "read", pausing_read)
    replacer = threading.Thread(target=replace_member)
    replacer.start()
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
    finally:
        os.close(incoming)
        replacement_done.set()
        replacer.join(timeout=5)
    assert not replacer.is_alive()


def test_bundle_admission_rejects_concurrent_content_mutation(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    member_inode = member.stat().st_ino
    member_opened = threading.Event()
    mutation_done = threading.Event()
    real_read = os.read

    def pausing_read(fd: int, size: int) -> bytes:
        if os.fstat(fd).st_ino == member_inode and not member_opened.is_set():
            member_opened.set()
            assert mutation_done.wait(timeout=5)
        return real_read(fd, size)

    def mutate_member() -> None:
        assert member_opened.wait(timeout=5)
        member.write_bytes(b"concurrently-corrupted")
        mutation_done.set()

    monkeypatch.setattr(bundle_module.os, "read", pausing_read)
    mutator = threading.Thread(target=mutate_member)
    mutator.start()
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
    finally:
        os.close(incoming)
        mutation_done.set()
        mutator.join(timeout=5)
    assert not mutator.is_alive()


def test_concurrent_caller_directory_iteration_does_not_perturb_admission(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    started = threading.Event()
    stop = threading.Event()
    failures: list[BaseException] = []

    def iterate_caller_descriptor() -> None:
        try:
            started.set()
            while not stop.is_set():
                assert set(os.listdir(incoming)) == set(EXACT_MEMBER_NAMES)
        except BaseException as exc:
            failures.append(exc)

    iterator = threading.Thread(target=iterate_caller_descriptor)
    iterator.start()
    assert started.wait(timeout=5)
    try:
        assert admit_parent_bundle(
            incoming, load_packet().parent_manifest
        ) == exact_parent_bytes
    finally:
        stop.set()
        iterator.join(timeout=5)
        os.close(incoming)
    assert not iterator.is_alive()
    assert failures == []


def test_bundle_admission_ignores_fd_numbers_and_filesystem_names(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
    tmp_path: Path,
) -> None:
    differently_named = tmp_path / "absent-corrupt-hold-answer-key-name"
    differently_named.mkdir()
    for member_name, data in exact_parent_bytes.items():
        (differently_named / member_name).write_bytes(data)

    first = open_harness_bundle(exact_bundle)
    second = open_harness_bundle(differently_named)
    try:
        assert first != second
        assert admit_parent_bundle(
            first, load_packet().parent_manifest
        ) == admit_parent_bundle(second, load_packet().parent_manifest)
    finally:
        os.close(second)
        os.close(first)


def test_bundle_admission_errors_are_fixed_and_silent(
    exact_bundle: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    (exact_bundle / "extra").write_bytes(b"extra")
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(BundleAdmissionError) as raised:
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        assert str(raised.value) == "INVALID_PARENT_RESOURCE_SET"
    finally:
        os.close(incoming)
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""
