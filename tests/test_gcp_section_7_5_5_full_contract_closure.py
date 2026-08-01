"""Focused lifecycle checks for the Section 7.5.5 docs-only closure."""

from __future__ import annotations

import copy
import json
from pathlib import Path
import shutil

from scripts import verify_gcp_section_7_5_5_full_contract_closure as verifier


ROOT = Path(__file__).resolve().parents[1]


def _isolated_root(tmp_path: Path) -> Path:
    for row in verifier.AUTHORITATIVE_CONTRACT["source_contracts"]:
        source = ROOT / row["path"]
        target = tmp_path / row["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    queue = tmp_path / verifier.QUEUE_PATH
    queue.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / verifier.QUEUE_PATH, queue)
    return tmp_path


def test_exact_docs_contract_closes_without_runtime_authority(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = copy.deepcopy(verifier.AUTHORITATIVE_CONTRACT)
    assert candidate["authority_effect"] == "NONE"
    assert candidate["runtime_evidence_registries"] == {}
    assert verifier.evaluate_candidate(root, candidate) == "SECTION_7_5_CONTRACT_CLOSED"


def test_queue_projection_drift_holds(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    queue_path = root / verifier.QUEUE_PATH
    queue = json.loads(queue_path.read_text())
    row = next(item for item in queue["items"] if item["id"] == verifier.QUEUE_ITEM_ID)
    row["risk"] = "low"
    queue_path.write_text(json.dumps(queue), encoding="utf-8")
    assert verifier.evaluate_candidate(root, verifier.AUTHORITATIVE_CONTRACT) == "HOLD"


def test_duplicate_queue_authority_holds(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    queue_path = root / verifier.QUEUE_PATH
    queue = json.loads(queue_path.read_text())
    authorized = next(
        item for item in queue["items"] if item["id"] == verifier.QUEUE_ITEM_ID
    )
    forged = dict(authorized)
    forged.update(title="FORGED DUPLICATE", bound="unauthorized", risk="low")
    queue["items"].append(forged)
    queue_path.write_text(json.dumps(queue), encoding="utf-8")
    assert verifier.evaluate_candidate(root, verifier.AUTHORITATIVE_CONTRACT) == "HOLD"


def test_private_queue_field_holds(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    queue_path = root / verifier.QUEUE_PATH
    queue = json.loads(queue_path.read_text())
    row = next(item for item in queue["items"] if item["id"] == verifier.QUEUE_ITEM_ID)
    row["user_id"] = "forbidden"
    queue_path.write_text(json.dumps(queue), encoding="utf-8")
    assert verifier.evaluate_candidate(root, verifier.AUTHORITATIVE_CONTRACT) == "HOLD"


def test_exported_contract_mutation_cannot_mutate_verifier_authority(
    tmp_path: Path,
) -> None:
    root = _isolated_root(tmp_path)
    original = copy.deepcopy(verifier.AUTHORITATIVE_CONTRACT)
    try:
        verifier.AUTHORITATIVE_CONTRACT["authority_effect"] = "RUNTIME"
        verifier.AUTHORITATIVE_CONTRACT["runtime_evidence_registries"] = {
            "forbidden": [{"authority": "RUNTIME"}]
        }
        assert verifier.evaluate_candidate(root, verifier.AUTHORITATIVE_CONTRACT) == "HOLD"
    finally:
        verifier.AUTHORITATIVE_CONTRACT.clear()
        verifier.AUTHORITATIVE_CONTRACT.update(original)


def test_unknown_mode_and_live_runtime_fail_closed(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = verifier.AUTHORITATIVE_CONTRACT
    assert verifier.evaluate_candidate(root, candidate, mode="UNKNOWN") == "HOLD"
    assert (
        verifier.evaluate_candidate(root, candidate, mode="LIVE_RUNTIME")
        == "HOLD_LIVE_RUNTIME_NOT_AUTHORIZED"
    )


def test_archive_mode_never_promotes(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    assert (
        verifier.evaluate_candidate(
            root, verifier.AUTHORITATIVE_CONTRACT, mode="ARCHIVE_CLOSEOUT"
        )
        == "HOLD_ARCHIVE_CLOSEOUT_ONLY"
    )


def test_boolean_integer_alias_cannot_clear(tmp_path: Path) -> None:
    root = _isolated_root(tmp_path)
    candidate = copy.deepcopy(verifier.AUTHORITATIVE_CONTRACT)
    candidate["edge_projection"]["orphan_constraints_allowed"] = 0
    assert verifier.evaluate_candidate(root, candidate) == "HOLD"
