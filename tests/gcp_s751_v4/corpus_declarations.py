"""Closed packet declarations for the Section 7.5.1 readiness corpus.

This module owns declarative attack-to-ledger reconciliation.  It does not
construct mutations, evaluate the oracle, or distribute uncovered rows after
case construction.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re
from typing import Mapping, Sequence

from tests.gcp_s751_v4.ledger import RuleRow
from tests.gcp_s751_v4.model import (
    EvaluationResult,
    RulePacket,
    canonical_json,
)


_HEX_64 = re.compile(r"^[0-9a-f]{64}$")
_ORACLE_ID = "REFERENCE_ORACLE_V4"
_RULE_ID_RULE = "SHA256_RESOURCE_NUL_POINTER_V1"
_DECLARATION_FIELDS = {
    "attack_id",
    "generator",
    "mutation_id",
    "immutable_root_id",
    "immutable_root_sha256",
    "expected_results",
    "oracle_id",
    "test_id_template",
    "ledger_bindings",
}
_EXPECTED_FIELDS = {
    "test_id_rule",
    "schema_version",
    "decision",
    "reason",
    "authority_effect",
    "claim_grade",
}
_BINDING_FIELDS = {
    "resource",
    "pointer_rule",
    "template_id",
    "rule_id_rule",
}


@dataclass(frozen=True)
class LedgerBindingRule:
    resource: str
    pointer_rule: str
    template_id: str
    rule_id_rule: str


@dataclass(frozen=True)
class CaseDeclaration:
    attack_id: str
    generator: str
    mutation_id: str
    immutable_root_id: str
    immutable_root_sha256: str
    expected_results: tuple[tuple[str, EvaluationResult], ...]
    oracle_id: str
    test_id_template: str
    ledger_bindings: tuple[LedgerBindingRule, ...]


def load_case_declarations(
    packet: RulePacket,
) -> tuple[CaseDeclaration, ...]:
    """Parse exact generator records already frozen into the packet model."""
    declarations: list[CaseDeclaration] = []
    for raw_declaration in packet.case_catalog:
        attack_id = _required_text(raw_declaration, "attack_id")
        if set(raw_declaration) != _DECLARATION_FIELDS:
            raise ValueError("case declaration fields are not closed")
        expected_raw = raw_declaration["expected_results"]
        if not isinstance(expected_raw, tuple) or not expected_raw:
            raise ValueError("case declaration expected result is not closed")
        expected_results: list[tuple[str, EvaluationResult]] = []
        for raw_expected in expected_raw:
            if (
                not isinstance(raw_expected, Mapping)
                or set(raw_expected) != _EXPECTED_FIELDS
            ):
                raise ValueError(
                    "case declaration expected result is not closed"
                )
            expected_results.append(
                (
                    _required_text(raw_expected, "test_id_rule"),
                    EvaluationResult(
                        schema_version=_required_text(
                            raw_expected, "schema_version"
                        ),
                        decision=_required_text(
                            raw_expected, "decision"
                        ),
                        reason=_required_text(raw_expected, "reason"),
                        authority_effect=_required_text(
                            raw_expected, "authority_effect"
                        ),
                        claim_grade=_required_text(
                            raw_expected, "claim_grade"
                        ),
                    ),
                )
            )
        bindings_raw = raw_declaration["ledger_bindings"]
        if not isinstance(bindings_raw, tuple) or not bindings_raw:
            raise ValueError("case declaration requires ledger bindings")
        bindings: list[LedgerBindingRule] = []
        for raw_binding in bindings_raw:
            if (
                not isinstance(raw_binding, Mapping)
                or set(raw_binding) != _BINDING_FIELDS
            ):
                raise ValueError(
                    "case declaration ledger binding fields are not closed"
                )
            binding = LedgerBindingRule(
                resource=_required_text(raw_binding, "resource"),
                pointer_rule=_required_text(raw_binding, "pointer_rule"),
                template_id=_required_text(raw_binding, "template_id"),
                rule_id_rule=_required_text(raw_binding, "rule_id_rule"),
            )
            if binding.rule_id_rule != _RULE_ID_RULE:
                raise ValueError(
                    "case declaration rule ID derivation is not closed"
                )
            _parse_pointer_rule(binding.pointer_rule)
            bindings.append(binding)
        declaration = CaseDeclaration(
            attack_id=attack_id,
            generator=_required_text(raw_declaration, "generator"),
            mutation_id=_required_text(raw_declaration, "mutation_id"),
            immutable_root_id=_required_text(
                raw_declaration, "immutable_root_id"
            ),
            immutable_root_sha256=_required_text(
                raw_declaration, "immutable_root_sha256"
            ),
            expected_results=tuple(expected_results),
            oracle_id=_required_text(raw_declaration, "oracle_id"),
            test_id_template=_required_text(
                raw_declaration, "test_id_template"
            ),
            ledger_bindings=tuple(bindings),
        )
        if (
            declaration.oracle_id != _ORACLE_ID
            or not _HEX_64.fullmatch(declaration.immutable_root_sha256)
            or declaration.immutable_root_sha256
            != resolve_immutable_root_sha256(
                packet, declaration.immutable_root_id
            )
        ):
            raise ValueError(
                "case declaration oracle or immutable root is not closed"
            )
        declarations.append(declaration)
    keys = [
        (declaration.attack_id, declaration.generator)
        for declaration in declarations
    ]
    if len(keys) != len(set(keys)):
        raise ValueError("case declaration keys are not unique")
    return tuple(declarations)


def reconcile_case_declarations(
    packet: RulePacket,
    rows: Sequence[RuleRow],
    declarations: Sequence[CaseDeclaration],
) -> None:
    """Reject missing, extra, or nonmatching attack-to-ledger declarations."""
    observed = tuple(declarations)
    expected_keys = {
        (_required_text(attack, "attack_id"), generator)
        for attack in packet.attack_catalog
        for generator in _generator_names(attack)
    }
    observed_keys = {
        (declaration.attack_id, declaration.generator)
        for declaration in observed
    }
    if (
        observed_keys != expected_keys
        or len(observed_keys) != len(observed)
        or not all(isinstance(value, CaseDeclaration) for value in observed)
    ):
        raise ValueError("case declaration set does not match attack catalog")

    declared_pairs: set[tuple[str, str]] = set()
    for declaration in observed:
        for binding in declaration.ledger_bindings:
            matched = _matching_rows(declaration, binding, rows)
            if not matched:
                raise ValueError(
                    "case declaration ledger binding has no exact match"
                )
            declared_pairs.update(
                (declaration.attack_id, row.rule_id) for row in matched
            )

    ledger_pairs = {
        (attack_id, row.rule_id)
        for row in rows
        for attack_id in row.attack_ids
    }
    if declared_pairs != ledger_pairs:
        raise ValueError(
            "case declarations do not reconcile every attack ledger row"
        )


def declared_ledger_ids(
    declaration: CaseDeclaration,
    rows: Sequence[RuleRow],
    observed_resources: Sequence[str],
) -> tuple[str, ...]:
    """Resolve only bindings explicitly associated with observed mutation roots."""
    resources = set(observed_resources)
    selected: set[str] = set()
    applicable = [
        binding
        for binding in declaration.ledger_bindings
        if binding.resource in resources
    ]
    if not applicable:
        raise ValueError("observed mutation has no declared ledger binding")
    for binding in applicable:
        matched = _matching_rows(declaration, binding, rows)
        if not matched:
            raise ValueError(
                "case declaration ledger binding has no exact match"
            )
        selected.update(row.rule_id for row in matched)
    if not selected:
        raise ValueError("observed mutation has no declared ledger IDs")
    return tuple(sorted(selected))


def declared_expected_result(
    declaration: CaseDeclaration,
    test_id: str,
) -> EvaluationResult:
    """Resolve one literal packet result rule for an emitted test ID."""
    validate_declared_test_id(declaration, test_id)
    matched = [
        result
        for rule, result in declaration.expected_results
        if _test_id_matches(rule, test_id)
    ]
    if len(matched) != 1:
        raise ValueError("case test ID has no unique declared expected result")
    return matched[0]


def validate_declared_test_id(
    declaration: CaseDeclaration,
    test_id: str,
) -> None:
    """Reject emitted IDs that are not instances of the packet template."""
    expression = re.escape(declaration.test_id_template)
    replacements = {
        r"\{ordinal\}": r"[1-9][0-9]*",
        r"\{boundary\}": r"[a-z0-9]+(?:-[a-z0-9]+)*",
        r"\{semantic\}": r"(?:exact|corrupt)",
    }
    for placeholder, pattern in replacements.items():
        expression = expression.replace(placeholder, pattern)
    if r"\{" in expression or r"\}" in expression:
        raise ValueError("case test ID template is not closed")
    if re.fullmatch(expression, test_id) is None:
        raise ValueError("case test ID does not match declared template")


def resolve_immutable_root_sha256(
    packet: RulePacket,
    root_id: str,
) -> str:
    """Resolve a declaration root only from packet-pinned immutable inputs."""
    if root_id.startswith("SCHEMA:"):
        schema_name = root_id[len("SCHEMA:"):]
        try:
            value = packet.closed_schemas[schema_name]
        except KeyError as exc:
            raise ValueError("unknown case declaration immutable root") from exc
        return hashlib.sha256(canonical_json(_thaw(value))).hexdigest()
    if root_id == "PUBLIC_BOUNDARY_SCHEMA_SET_V4":
        return hashlib.sha256(
            canonical_json(_thaw(packet.closed_schemas))
        ).hexdigest()
    if root_id == "SIGNATURE_PROJECTION":
        return hashlib.sha256(
            canonical_json(_thaw(packet.signature_projection))
        ).hexdigest()
    if root_id == "EXACT_PARENT_MANIFEST":
        manifest = [
            {"member_name": entry.member_name, "sha256": entry.sha256}
            for entry in packet.parent_manifest
        ]
        return hashlib.sha256(canonical_json(manifest)).hexdigest()
    if root_id.startswith("PARENT:"):
        member_name = root_id[len("PARENT:"):]
        matches = [
            entry.sha256
            for entry in packet.parent_manifest
            if entry.member_name == member_name
        ]
        if len(matches) != 1:
            raise ValueError("unknown case declaration immutable root")
        return matches[0]

    matches = [
        root for root in packet.compile_pinned_roots
        if root.get("root_id") == root_id
    ]
    if len(matches) != 1:
        raise ValueError("unknown case declaration immutable root")
    root = matches[0]
    if set(root) != {
        "root_id",
        "schema_version",
        "trusted_time",
        "sha256",
    }:
        raise ValueError("compile-pinned root fields are not closed")
    projected = {
        "schema_version": _required_text(root, "schema_version"),
        "trusted_time": _required_text(root, "trusted_time"),
    }
    observed = hashlib.sha256(canonical_json(projected)).hexdigest()
    if observed != _required_text(root, "sha256"):
        raise ValueError("compile-pinned root hash does not match")
    return observed


def _matching_rows(
    declaration: CaseDeclaration,
    binding: LedgerBindingRule,
    rows: Sequence[RuleRow],
) -> tuple[RuleRow, ...]:
    kind, pointer = _parse_pointer_rule(binding.pointer_rule)
    return tuple(
        row
        for row in rows
        if row.resource == binding.resource
        and declaration.attack_id in row.attack_ids
        and row.decision_use.startswith(
            f"TEMPLATE:{binding.template_id};"
        )
        and (
            kind == "ALL"
            or (kind == "EXACT" and row.pointer == pointer)
            or (
                kind == "PREFIX"
                and (
                    row.pointer == pointer
                    or row.pointer.startswith(f"{pointer}/")
                )
            )
        )
    )


def _parse_pointer_rule(value: str) -> tuple[str, str]:
    if value == "ALL":
        return "ALL", ""
    for kind in ("EXACT", "PREFIX"):
        prefix = f"{kind}:"
        if value.startswith(prefix):
            pointer = value[len(prefix):]
            if not pointer.startswith("/"):
                raise ValueError(
                    "case declaration pointer rule is not closed"
                )
            return kind, pointer
    raise ValueError("case declaration pointer rule is not closed")


def _generator_names(
    attack: Mapping[str, object],
) -> tuple[str, ...]:
    raw = attack.get("generators")
    if (
        not isinstance(raw, tuple)
        or not raw
        or not all(isinstance(value, str) and value for value in raw)
    ):
        raise ValueError("attack generators must be closed names")
    return raw


def _test_id_matches(rule: str, test_id: str) -> bool:
    if rule == "ALL":
        return True
    if rule.startswith("EXACT:"):
        return test_id == rule[len("EXACT:"):]
    if rule.startswith("PREFIX:"):
        return test_id.startswith(rule[len("PREFIX:"):])
    raise ValueError("case expected-result test ID rule is not closed")


def _required_text(value: Mapping[str, object], field: str) -> str:
    result = value.get(field)
    if not isinstance(result, str) or not result:
        raise ValueError(f"{field} must be a nonempty string")
    return result


def _thaw(value: object) -> object:
    if isinstance(value, Mapping):
        return {key: _thaw(child) for key, child in value.items()}
    if isinstance(value, tuple):
        return [_thaw(child) for child in value]
    return value
