"""Deterministic, in-memory rule ledger for the Section 7.5.1 V4 packet.

The ledger describes source paths and closed dynamic paths.  It does not
evaluate a candidate, project a parent closure, or persist normalized output.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from typing import Mapping, Sequence

from tests.gcp_s751_v4.model import (
    RulePacket,
    SchemaPath,
    canonical_json,
    enumerate_all_dynamic_paths,
    load_exact_parents,
)


@dataclass(frozen=True)
class RuleRow:
    rule_id: str
    resource: str
    pointer: str
    owner: str
    trust_class: str
    value_rule: str
    controller: str
    producer: str
    authenticator: str
    consumer: str
    dependencies: tuple[str, ...]
    anchor_rule: str
    decision_use: str
    attack_ids: tuple[str, ...]
    failure: str
    dynamic: bool
    is_root: bool
    instance_value: None = None


@dataclass(frozen=True)
class _Binding:
    template_id: str
    owner: str
    controller: str
    producer: str
    authenticator: str
    consumer: str
    decision_use: str


_PARENT_BINDINGS = {
    "runtime-object-contract.json": _Binding(
        "RULE-PARENT-MANIFEST",
        "SECTION_7_2",
        "SECTION_7_2_RUNTIME_OBJECT_CONTRACT",
        "SECTION_7_2",
        "EXACT_PARENT_SHA256",
        "SECTION_7_5_1_RULE_LEDGER",
        "EXACT_PARENT_RUNTIME_OBJECT_ADMISSION",
    ),
    "security-authority-contract.json": _Binding(
        "RULE-SECTION-7-3-AUTHORITY-INVALID",
        "SECTION_7_3",
        "SECTION_7_3_SEPARATE_LEAST_FIXED_POINT_ORACLE",
        "SECTION_7_3",
        "EXACT_PARENT_SHA256",
        "SECTION_7_5_1_RULE_LEDGER",
        "SECTION_7_3_AUTHORITY_ADMISSION",
    ),
    "role-capability-matrix.json": _Binding(
        "RULE-SECTION-7-3-AUTHORITY-INVALID",
        "SECTION_7_3",
        "SECTION_7_3_SEPARATE_LEAST_FIXED_POINT_ORACLE",
        "SECTION_7_3",
        "EXACT_PARENT_SHA256",
        "SECTION_7_5_1_RULE_LEDGER",
        "SECTION_7_3_ROLE_CAPABILITY_ADMISSION",
    ),
    "attestation-receipt-contract.json": _Binding(
        "RULE-REPLAY-REGISTRY-APPROVAL",
        "SECTION_7_4",
        "SECTION_7_4_ATTESTATION_RECEIPT_CONTRACT",
        "SECTION_7_4",
        "EXACT_PARENT_SHA256",
        "SECTION_7_5_1_RULE_LEDGER",
        "RECEIPT_AND_APPROVAL_ADMISSION",
    ),
    "constraints-open-obligations-contract.json": _Binding(
        "RULE-CURRENT-BLOCKERS",
        "SECTION_7_5A",
        "SECTION_7_5A_OPEN_OBLIGATION_CONTRACT",
        "SECTION_7_5A",
        "EXACT_PARENT_SHA256",
        "SECTION_7_5_1_RULE_LEDGER",
        "OPEN_BLOCKER_HOLD",
    ),
}

_DYNAMIC_BINDINGS = {
    "candidate": _Binding(
        "RULE-CANDIDATE-SHAPE",
        "SECTION_7_5_1",
        "SECTION_7_3_SEPARATE_LEAST_FIXED_POINT_ORACLE",
        "TEST_HARNESS",
        "CANONICAL_CLOSED_SCHEMA",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "CANDIDATE_SHAPE_ADMISSION",
    ),
    "signed_context_payload": _Binding(
        "RULE-SIGNED-CONTEXT",
        "SECTION_7_5_1",
        "SECTION_7_5_1_SIGNED_CONTEXT_POLICY",
        "TEST_HARNESS",
        "P256_ANCHOR_AND_CANONICAL_PAYLOAD",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "SIGNED_CONTEXT_BINDING",
    ),
    "signed_context_envelope": _Binding(
        "RULE-SIGNED-CONTEXT",
        "SECTION_7_5_1",
        "SECTION_7_5_1_SIGNED_CONTEXT_POLICY",
        "TEST_HARNESS",
        "P256_ANCHOR_AND_CANONICAL_PAYLOAD",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "SIGNED_ENVELOPE_AUTHENTICATION",
    ),
    "verifier_anchor": _Binding(
        "RULE-SIGNED-CONTEXT",
        "SECTION_7_5_1",
        "HARNESS_ADMITTED_OUT_OF_BAND_ANCHOR",
        "TEST_HARNESS",
        "HARNESS_ADMITTED_OUT_OF_BAND_ANCHOR",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "VERIFIER_ANCHOR_AUTHENTICATION",
    ),
    "nonce_time": _Binding(
        "RULE-SIGNED-CONTEXT",
        "SECTION_7_5_1",
        "SECTION_7_5_1_SIGNED_CONTEXT_POLICY",
        "TEST_HARNESS",
        "SIGNED_CONTEXT_TIME_BINDING",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "NONCE_AND_TIME_ADMISSION",
    ),
    "replay": _Binding(
        "RULE-REPLAY-REGISTRY-APPROVAL",
        "SECTION_7_5_1",
        "PROCESS_LOCAL_REPLAY_REGISTRY",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "PROCESS_LOCAL_REPLAY_REGISTRY",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "REPLAY_REGISTRY_ADMISSION",
    ),
    "bundle_capability": _Binding(
        "RULE-PARENT-BUNDLE",
        "SECTION_7_5_1",
        "HARNESS_ADMITTED_PARENT_BUNDLE",
        "TEST_HARNESS",
        "NOFOLLOW_DESCRIPTOR_ADMISSION",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "EXACT_PARENT_BUNDLE_ADMISSION",
    ),
    "result": _Binding(
        "RULE-PRIVACY-NONAUTHORIZATION",
        "SECTION_7_5_1",
        "FIXED_CLOSED_RESULT_PROJECTION",
        "FUTURE_SECTION_7_5_1_EVALUATOR",
        "FIXED_CLOSED_RESULT_PROJECTION",
        "CALLER",
        "CLOSED_NONAUTHORIZING_RESULT",
    ),
}

_SECTION_7_3_CONTROLLER_BINDING = _Binding(
    "RULE-SECTION-7-3-UNKNOWN-CONTROLLER-EDGE",
    "SECTION_7_3",
    "SECTION_7_3_SEPARATE_LEAST_FIXED_POINT_ORACLE",
    "TEST_HARNESS",
    "CANONICAL_CLOSED_SCHEMA",
    "FUTURE_SECTION_7_5_1_EVALUATOR",
    "SECTION_7_3_CONTROLLER_GRAPH_ADMISSION",
)

_DYNAMIC_ROOT_POINTERS = {
    "candidate": "/schema_version",
    "signed_context_payload": "/schema_version",
    "signed_context_envelope": "/schema_version",
    "verifier_anchor": "/key_id",
    "nonce_time": "/nonce",
    "replay": "/key_id",
    "bundle_capability": "/fd",
    "result": "/schema_version",
}


def build_rule_ledger(packet: RulePacket) -> tuple[RuleRow, ...]:
    """Build the exhaustive ledger from exact parents and closed schema paths."""
    templates = _templates_by_id(packet)
    rows: list[RuleRow] = []
    parents = load_exact_parents(packet)
    manifest_hashes = {
        entry.member_name: entry.sha256 for entry in packet.parent_manifest
    }

    for resource, raw_parent in parents.items():
        binding = _parent_binding(resource)
        parent_value = json.loads(raw_parent)
        for pointer, value in _walk_json(parent_value):
            rows.append(
                _build_row(
                    resource=resource,
                    pointer=pointer,
                    binding=binding,
                    template=templates[binding.template_id],
                    value_rule=(
                        f"STATIC:{_json_type(value)};"
                        f"PARENT_SHA256:{manifest_hashes[resource]}"
                    ),
                    dynamic=False,
                    is_root=pointer == "",
                    root_pointer="",
                )
            )

    for path in enumerate_all_dynamic_paths(packet):
        binding = _dynamic_binding(path.boundary, path.pointer)
        rows.append(
            _build_row(
                resource=path.boundary,
                pointer=path.pointer,
                binding=binding,
                template=templates[binding.template_id],
                value_rule=(
                    f"DYNAMIC:{path.json_type};CARDINALITY:{path.cardinality};"
                    f"RULE:{path.value_rule}"
                ),
                dynamic=True,
                is_root=path.pointer == _DYNAMIC_ROOT_POINTERS[path.boundary],
                root_pointer=_DYNAMIC_ROOT_POINTERS[path.boundary],
            )
        )

    return tuple(sorted(rows, key=lambda row: (row.resource, row.pointer)))


def reconcile_rule_ledger(packet: RulePacket, rows: Sequence[RuleRow]) -> None:
    """Fail closed unless every source path and ledger relationship reconciles."""
    templates = _templates_by_id(packet)
    parents = load_exact_parents(packet)
    manifest_hashes = {
        entry.member_name: entry.sha256 for entry in packet.parent_manifest
    }
    dynamic_paths = enumerate_all_dynamic_paths(packet)

    if not all(isinstance(row, RuleRow) for row in rows):
        raise ValueError("rule ledger contains an invalid row")
    keys = [(row.resource, row.pointer) for row in rows]
    if len(keys) != len(set(keys)):
        raise ValueError("rule ledger contains duplicate resource pointers")
    rule_ids = [row.rule_id for row in rows]
    if len(rule_ids) != len(set(rule_ids)):
        raise ValueError("rule ledger contains duplicate rule IDs")

    expected_static = {
        (resource, pointer)
        for resource, raw_parent in parents.items()
        for pointer, _ in _walk_json(json.loads(raw_parent))
    }
    expected_dynamic = {(path.boundary, path.pointer) for path in dynamic_paths}
    actual_static = {
        (row.resource, row.pointer) for row in rows if not row.dynamic
    }
    actual_dynamic = {
        (row.resource, row.pointer) for row in rows if row.dynamic
    }
    if actual_static != expected_static:
        raise ValueError("static rule ledger paths do not match exact parents")
    if actual_dynamic != expected_dynamic:
        raise ValueError("dynamic rule ledger paths do not match closed schemas")

    dynamic_by_key = {
        (path.boundary, path.pointer): path for path in dynamic_paths
    }
    static_values = {
        (resource, pointer): value
        for resource, raw_parent in parents.items()
        for pointer, value in _walk_json(json.loads(raw_parent))
    }
    rows_by_key = {(row.resource, row.pointer): row for row in rows}
    rows_by_id = {row.rule_id: row for row in rows}

    for key, row in rows_by_key.items():
        if row.rule_id != _rule_id(*key):
            raise ValueError("rule ID is not derived from resource and pointer")
        if row.instance_value is not None:
            raise ValueError("rule ledger must not retain instance values")

        if row.dynamic:
            path = dynamic_by_key[key]
            binding = _dynamic_binding(row.resource, row.pointer)
            expected_value_rule = (
                f"DYNAMIC:{path.json_type};CARDINALITY:{path.cardinality};"
                f"RULE:{path.value_rule}"
            )
            expected_root = _DYNAMIC_ROOT_POINTERS[row.resource]
        else:
            binding = _parent_binding(row.resource)
            expected_value_rule = (
                f"STATIC:{_json_type(static_values[key])};"
                f"PARENT_SHA256:{manifest_hashes[row.resource]}"
            )
            expected_root = ""

        template = templates[binding.template_id]
        if (
            row.owner,
            row.trust_class,
            row.value_rule,
            row.controller,
            row.producer,
            row.authenticator,
            row.consumer,
            row.decision_use,
            row.attack_ids,
            row.failure,
        ) != (
            binding.owner,
            _template_string(template, "class"),
            expected_value_rule,
            binding.controller,
            binding.producer,
            binding.authenticator,
            binding.consumer,
            f"TEMPLATE:{binding.template_id};{binding.decision_use}",
            _template_attack_ids(template),
            _template_string(template, "failure"),
        ):
            raise ValueError("rule ledger row does not match its closed template")

        expected_root_id = _rule_id(row.resource, expected_root)
        if row.anchor_rule != expected_root_id:
            raise ValueError("rule ledger anchor does not resolve to its resource root")
        if row.is_root != (row.pointer == expected_root):
            raise ValueError("rule ledger root classification is invalid")
        expected_dependencies = () if row.is_root else (expected_root_id,)
        if row.dependencies != expected_dependencies:
            raise ValueError("rule ledger dependencies are not closed direct anchors")
        if not row.attack_ids:
            raise ValueError("rule ledger row lacks attack coverage")
        if any(attack_id not in _attack_ids(packet) for attack_id in row.attack_ids):
            raise ValueError("rule ledger references an unknown attack")

    for row in rows:
        if row.anchor_rule not in rows_by_id:
            raise ValueError("rule ledger anchor does not resolve")
        if any(dependency not in rows_by_id for dependency in row.dependencies):
            raise ValueError("rule ledger dependency does not resolve")

    _assert_acyclic(rows_by_id)
    _assert_section_7_3_controller_graph_is_separate(rows)


def serialize_rule_ledger(rows: Sequence[RuleRow]) -> bytes:
    """Return deterministic normalized bytes without writing any ledger artifact."""
    normalized = [asdict(row) for row in sorted(rows, key=lambda row: (row.resource, row.pointer))]
    return canonical_json(normalized)


def _build_row(
    *,
    resource: str,
    pointer: str,
    binding: _Binding,
    template: Mapping[str, object],
    value_rule: str,
    dynamic: bool,
    is_root: bool,
    root_pointer: str,
) -> RuleRow:
    rule_id = _rule_id(resource, pointer)
    root_rule_id = _rule_id(resource, root_pointer)
    return RuleRow(
        rule_id=rule_id,
        resource=resource,
        pointer=pointer,
        owner=binding.owner,
        trust_class=_template_string(template, "class"),
        value_rule=value_rule,
        controller=binding.controller,
        producer=binding.producer,
        authenticator=binding.authenticator,
        consumer=binding.consumer,
        dependencies=() if is_root else (root_rule_id,),
        anchor_rule=root_rule_id,
        decision_use=f"TEMPLATE:{binding.template_id};{binding.decision_use}",
        attack_ids=_template_attack_ids(template),
        failure=_template_string(template, "failure"),
        dynamic=dynamic,
        is_root=is_root,
    )


def _templates_by_id(packet: RulePacket) -> dict[str, Mapping[str, object]]:
    templates: dict[str, Mapping[str, object]] = {}
    for template in packet.rule_templates:
        rule_id = _template_string(template, "rule_id")
        if rule_id in templates:
            raise ValueError(f"duplicate rule template: {rule_id}")
        templates[rule_id] = template
    required = {
        binding.template_id
        for binding in (*_PARENT_BINDINGS.values(), *_DYNAMIC_BINDINGS.values())
    }
    required.add(_SECTION_7_3_CONTROLLER_BINDING.template_id)
    if set(templates) != required:
        raise ValueError("rule packet template set is not closed for ledger derivation")
    return templates


def _template_string(template: Mapping[str, object], field: str) -> str:
    value = template.get(field)
    if not isinstance(value, str):
        raise ValueError(f"rule template {field} must be a string")
    return value


def _template_attack_ids(template: Mapping[str, object]) -> tuple[str, ...]:
    value = template.get("attack_ids")
    if not isinstance(value, tuple) or not all(isinstance(item, str) for item in value):
        raise ValueError("rule template attack IDs must be a frozen string sequence")
    if not value:
        raise ValueError("rule template must cover at least one attack")
    return value


def _parent_binding(resource: str) -> _Binding:
    try:
        return _PARENT_BINDINGS[resource]
    except KeyError as exc:
        raise ValueError(f"parent resource has no closed ledger binding: {resource}") from exc


def _dynamic_binding(boundary: str, pointer: str) -> _Binding:
    if boundary == "candidate" and pointer.startswith("/observation/controller_"):
        return _SECTION_7_3_CONTROLLER_BINDING
    try:
        return _DYNAMIC_BINDINGS[boundary]
    except KeyError as exc:
        raise ValueError(f"dynamic boundary has no closed ledger binding: {boundary}") from exc


def _walk_json(value: object, pointer: str = "") -> tuple[tuple[str, object], ...]:
    paths: list[tuple[str, object]] = []

    def walk(current: object, current_pointer: str) -> None:
        paths.append((current_pointer, current))
        if isinstance(current, Mapping):
            for key in sorted(current):
                if not isinstance(key, str):
                    raise ValueError("parent object keys must be strings")
                walk(current[key], f"{current_pointer}/{_escape_pointer_token(key)}")
        elif isinstance(current, list):
            for index, child in enumerate(current):
                walk(child, f"{current_pointer}/{index}")

    walk(value, pointer)
    return tuple(paths)


def _escape_pointer_token(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def _json_type(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "BOOLEAN"
    if isinstance(value, int):
        return "INTEGER"
    if isinstance(value, float):
        return "NUMBER"
    if isinstance(value, str):
        return "STRING"
    if isinstance(value, list):
        return "ARRAY"
    if isinstance(value, Mapping):
        return "OBJECT"
    raise ValueError("parent JSON contains an unsupported value type")


def _rule_id(resource: str, pointer: str) -> str:
    material = f"{resource}\x00{pointer}".encode("utf-8")
    return f"RULE-LEDGER-{hashlib.sha256(material).hexdigest()}"


def _attack_ids(packet: RulePacket) -> frozenset[str]:
    result: set[str] = set()
    for attack in packet.attack_catalog:
        attack_id = attack.get("attack_id")
        if not isinstance(attack_id, str) or attack_id in result:
            raise ValueError("attack catalog must have distinct string attack IDs")
        result.add(attack_id)
    return frozenset(result)


def _assert_acyclic(rows_by_id: Mapping[str, RuleRow]) -> None:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(rule_id: str) -> None:
        if rule_id in visited:
            return
        if rule_id in visiting:
            raise ValueError("rule ledger trust dependency graph contains a cycle")
        visiting.add(rule_id)
        for dependency in rows_by_id[rule_id].dependencies:
            visit(dependency)
        visiting.remove(rule_id)
        visited.add(rule_id)

    for rule_id in rows_by_id:
        visit(rule_id)


def _assert_section_7_3_controller_graph_is_separate(rows: Sequence[RuleRow]) -> None:
    controller_rows = [
        row
        for row in rows
        if row.controller == "SECTION_7_3_SEPARATE_LEAST_FIXED_POINT_ORACLE"
    ]
    if not controller_rows:
        raise ValueError("Section 7.3 controller graph has no separate oracle binding")
    for row in controller_rows:
        if row.decision_use.endswith("AUTHORITY_ADMISSION") or row.resource == "candidate":
            if len(row.dependencies) > 1:
                raise ValueError("controller edges leaked into the trust dependency DAG")
