"""Focused closure tests for the docs-only Section 7.6.1 verifier."""

from __future__ import annotations

import copy
import hashlib
from pathlib import Path
import shutil
import subprocess

from scripts import verify_gcp_section_7_6_1_preexecution_ledger as verifier
from tests import test_gcp_section_7_6_1_preexecution_ledger_readiness as readiness


ROOT = Path(__file__).resolve().parents[1]
READINESS_COMMIT = "73a61d3786bbe21484af86ba38a4fa2676aef631"
READINESS_ARTIFACTS = {
    "openspec/changes/add-gcp-section-7-6-1-preexecution-ledger-contract/readiness.md":
        "e786a66b1a8da7394df895a3a464fd10a5be74afc0cea41ca19b931f794fc307",
    "tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/packet-rules.json":
        "9da8f5469ba88b6fd4489b4a299d15401a028411610141edfdd9d65776786b27",
    "tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/trusted-context.json":
        "22a35259c758205869319fc53fac8dfdb6075c887bcd137614bae14d8fdfe2df",
    "tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/hermetic_environment_worker.py":
        "1ac84be627eee2641e55736862c334adad113465ef7adf81ec6db63014b499ac",
    "tests/test_gcp_section_7_6_1_preexecution_ledger_readiness.py":
        "e4bfad85b50f21e0b340242514b55dd94a3750075593237532c53af387389767",
}


def _isolated_root(tmp_path: Path) -> Path:
    contract = verifier.AUTHORITATIVE_CONTRACT
    for row in contract["source_contracts"]:
        target = tmp_path / row["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / row["path"], target)
    for relative in (
        contract["queue_authorization"]["path"],
        contract["trusted_context"]["path"],
    ):
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / relative, target)
    return tmp_path


def _candidate(root: Path) -> dict:
    return readiness._baseline_candidate(readiness._load_fixture(), root)


def _context() -> dict:
    return readiness._load_trusted_context(readiness._load_fixture())


def test_readiness_commit_is_ancestor_and_blobs_are_immutable() -> None:
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", READINESS_COMMIT, "HEAD"],
        cwd=ROOT,
        check=True,
    )
    for path, expected in READINESS_ARTIFACTS.items():
        raw = subprocess.run(
            ["git", "show", f"{READINESS_COMMIT}:{path}"],
            cwd=ROOT,
            check=True,
            capture_output=True,
        ).stdout
        assert hashlib.sha256(raw).hexdigest() == expected, path


def test_contract_bootstrap_is_pinned_and_nonauthorizing() -> None:
    assert verifier.BOOTSTRAP_VALID
    contract = verifier.AUTHORITATIVE_CONTRACT
    assert contract["section"] == "7.6.1"
    assert contract["scope_kind"] == "DOCS_CONTRACT"
    assert contract["authority_effect"] == "NONE"
    assert contract["consumer"] == "SECTION_7_4_ONLY"
    assert not any(contract["actual_evidence"].values())
    assert set(contract["public_projection_fields"]).isdisjoint(
        contract["prohibited_public_projection_fields"]
    )
    assert set(contract["ownership_exclusions"]) == {
        "retry_eligibility",
        "favorable_retry_decision",
        "retry_token_issuance",
        "crash_classification",
        "terminal_classification",
        "terminal_proof",
        "authority_mutation",
    }


def test_candidate_specific_replay_and_unrelated_state(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = _candidate(root)
    reservation = candidate["records"]["reservation"]["reservation_key"]
    token = candidate["records"]["lineage_input"][
        "authenticated_lineage_token_hash"
    ]
    state = {
        "used_reservation_keys": {hashlib.sha256(b"unrelated-reservation").hexdigest()},
        "used_lineage_tokens": {hashlib.sha256(b"unrelated-token").hexdigest()},
    }
    assert verifier.evaluate_candidate(
        root, candidate, "CLEAN_CI", state, None, _context()
    ) == verifier.READY
    assert reservation in state["used_reservation_keys"]
    assert token in state["used_lineage_tokens"]
    assert verifier.evaluate_candidate(
        root, candidate, "CLEAN_CI", state, None, _context()
    ) == "HOLD"


def test_exported_objects_cannot_mutate_verifier_authority(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    contract = copy.deepcopy(verifier.AUTHORITATIVE_CONTRACT)
    vectors = copy.deepcopy(verifier.CANONICALIZATION_VECTORS)
    try:
        verifier.AUTHORITATIVE_CONTRACT["authority_effect"] = "RUNTIME"
        verifier.CANONICALIZATION_VECTORS["accepted_candidates"][0][
            "candidate_sha256"
        ] = "0" * 64
        assert verifier.evaluate_candidate(
            root, _candidate(root), "CLEAN_CI", {}, None, _context()
        ) == verifier.READY
    finally:
        verifier.AUTHORITATIVE_CONTRACT.clear()
        verifier.AUTHORITATIVE_CONTRACT.update(contract)
        verifier.CANONICALIZATION_VECTORS.clear()
        verifier.CANONICALIZATION_VECTORS.update(vectors)


def test_archive_live_and_unknown_modes_fail_closed(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = _candidate(root)
    assert verifier.evaluate_candidate(
        root, candidate, "ARCHIVE_CLOSEOUT", {}, None, _context()
    ) == "HOLD_ARCHIVE_CLOSEOUT_ONLY"
    assert verifier.evaluate_candidate(
        root, candidate, "LIVE_RUNTIME", {}, None, _context()
    ) == "HOLD_LIVE_RUNTIME_NOT_AUTHORIZED"
    assert verifier.evaluate_candidate(
        root, candidate, "UNKNOWN", {}, None, _context()
    ) == "HOLD"


def test_malformed_replay_state_fails_closed(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = _candidate(root)
    for state in (
        [],
        {"used_reservation_keys": [], "used_lineage_tokens": set()},
        {"used_reservation_keys": {"not-a-digest"}, "used_lineage_tokens": set()},
    ):
        assert verifier.evaluate_candidate(
            root, candidate, "CLEAN_CI", state, None, _context()
        ) == "HOLD"


def test_transaction_exposure_reentry_has_exactly_one_ready(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = _candidate(root)
    state: dict = {}

    class ReentrantTransaction:
        def __init__(self) -> None:
            self.reentrant_result = "NOT_CALLED"

        def commit(self, _write_set: dict) -> str:
            return "UNKNOWN_AFTER_WRITE"

        def readback(self, _reservation_key: str) -> dict:
            return copy.deepcopy(candidate["records"])

        def expose(self, _opaque_record: dict) -> None:
            self.reentrant_result = verifier.evaluate_candidate(
                root, candidate, "CLEAN_CI", state, None, _context()
            )

    transaction = ReentrantTransaction()
    outer = verifier.evaluate_candidate(
        root,
        candidate,
        "CLEAN_CI",
        state,
        None,
        _context(),
        transaction=transaction,
    )
    assert outer == verifier.READY
    assert transaction.reentrant_result == "HOLD"


def test_command_line_verifier_is_silent() -> None:
    completed = subprocess.run(
        ["/usr/bin/python3", str(ROOT / "scripts/verify_gcp_section_7_6_1_preexecution_ledger.py")],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0
    assert completed.stdout == ""
    assert completed.stderr == ""
