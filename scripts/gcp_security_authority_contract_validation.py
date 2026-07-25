from __future__ import annotations

import calendar
import hashlib
import json
import re
import unicodedata
from datetime import datetime
from typing import Any

HEX64 = re.compile(r"^[0-9a-f]{64}$")
HEX32 = re.compile(r"^[0-9a-f]{32}$")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
RFC3339_UTC = re.compile(
    r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-5][0-9](?:\.[0-9]{1,9})?Z$"
)

def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def _validate_canonical_value(value: Any) -> None:
    if value is None or isinstance(value, float):
        raise ValueError("null/float prohibited")
    if type(value) is int:
        if not -(2**63) <= value <= 2**63 - 1:
            raise ValueError("integer outside signed 64-bit domain")
        return
    if type(value) is bool:
        return
    if isinstance(value, str):
        if unicodedata.normalize("NFC", value) != value:
            raise ValueError("non-NFC string")
        if any(unicodedata.category(char) in {"Cc", "Cs"} for char in value):
            raise ValueError("control/surrogate string")
        return
    if isinstance(value, list):
        for item in value:
            _validate_canonical_value(item)
        return
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise ValueError("non-string object key")
        for key, item in value.items():
            _validate_canonical_value(key)
            _validate_canonical_value(item)
        return
    raise ValueError("unsupported JSON value")

def strict_load_json_bytes(data: bytes) -> Any:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate JSON key")
            result[key] = value
        return result

    def parse_integer(value: str) -> int:
        if value == "-0":
            raise ValueError("negative zero")
        parsed = int(value)
        if not -(2**63) <= parsed <= 2**63 - 1:
            raise ValueError("integer outside signed 64-bit domain")
        return parsed

    result = json.loads(
        data.decode("utf-8"),
        object_pairs_hook=pairs,
        parse_constant=lambda value: (_ for _ in ()).throw(
            ValueError(f"non-finite JSON constant: {value}")
        ),
        parse_float=lambda value: (_ for _ in ()).throw(
            ValueError(f"floating JSON number: {value}")
        ),
        parse_int=parse_integer,
    )
    _validate_canonical_value(result)
    if not isinstance(result, dict):
        raise ValueError("JSON root must be object")
    return result


def _canonical(value: Any) -> bytes:
    _validate_canonical_value(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")

def _nodes(contract: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {node["node_id"]: node for node in contract["hash_graph"]}

def _verify_stored_hash(stored: dict[str, Any], node: dict[str, Any], field: str) -> None:
    if field not in stored:
        raise ValueError("stored hash field missing")
    body = dict(stored)
    observed = body.pop(field)
    if not isinstance(observed, str) or not HEX64.fullmatch(observed):
        raise ValueError("invalid stored hash")
    expected = _sha(node["domain_separator"].encode("ascii") + b"\x00" + _canonical(body))
    if observed != expected:
        raise ValueError("stale self hash")

def _parse_utc(value: str) -> int:
    if not isinstance(value, str) or not RFC3339_UTC.fullmatch(value):
        raise ValueError("strict RFC3339 UTC timestamp required")
    main, dot, fraction = value[:-1].partition(".")
    try:
        parsed = datetime.strptime(main, "%Y-%m-%dT%H:%M:%S")
    except ValueError as exc:
        raise ValueError("invalid calendar timestamp") from exc
    seconds = calendar.timegm(parsed.utctimetuple())
    nanoseconds = int(fraction.ljust(9, "0")) if dot else 0
    return seconds * 1_000_000_000 + nanoseconds


def _reject_identifier_bearing_values(value: Any) -> None:
    if isinstance(value, str):
        if EMAIL.search(value) or any(
            token in value
            for token in (
                "principalSet://",
                "serviceAccount:",
                "/serviceAccounts/",
                "projects/",
                "/Users/",
            )
        ):
            raise ValueError("identifier-bearing value")
        return
    if isinstance(value, list):
        for item in value:
            _reject_identifier_bearing_values(item)
    elif isinstance(value, dict):
        for item in value.values():
            _reject_identifier_bearing_values(item)


def validate_live_evidence_shape(
    stored: dict[str, Any], contract: dict[str, Any]
) -> None:
    _validate_canonical_value(stored)
    _reject_identifier_bearing_values(stored)
    schema = contract["live_evidence_contract"]
    if set(stored) != set(schema["required_top_level_keys"]):
        raise ValueError("live evidence keys are not closed")
    domains = schema["domains"]
    for key in ("schema_version", "canonicalization_version", "evidence_state", "authority_effect"):
        if stored[key] not in domains[key]:
            raise ValueError(f"live evidence domain mismatch: {key}")
    if domains["state_authority_pairs"].get(stored["evidence_state"]) != stored[
        "authority_effect"
    ]:
        raise ValueError("evidence state/authority mismatch")
    policy_hash = stored["security_authority_policy_hash"]
    if not isinstance(policy_hash, str) or not HEX64.fullmatch(policy_hash):
        raise ValueError("policy hash malformed")
    if stored["evidence_state"] == "SYNTHETIC_COMPLETE_SCHEMA_EXERCISE_NO_AUTHORITY":
        if policy_hash not in contract["policy_schema"]["synthetic_test_hashes"]:
            raise ValueError("synthetic evidence policy hash mismatch")
    elif policy_hash not in contract["policy_schema"]["runtime_approved_hashes"]:
        raise ValueError("live policy hash is not runtime-approved")
    if not isinstance(stored["security_authority_evidence_snapshot_hash"], str) or not HEX64.fullmatch(
        stored["security_authority_evidence_snapshot_hash"]
    ):
        raise ValueError("evidence hash malformed")
    if not re.fullmatch(domains["rfc3339_utc_pattern"], stored["observation_point"]):
        raise ValueError("observation timestamp malformed")
    _parse_utc(stored["observation_point"])
    if type(stored["mutation_counter"]) is not int or stored["mutation_counter"] < 0:
        raise ValueError("mutation counter malformed")
    if not isinstance(stored["alias_context_id"], str) or not HEX32.fullmatch(
        stored["alias_context_id"]
    ):
        raise ValueError("alias context malformed")
    if stored["alias_generation_method"] not in domains[
        "alias_generation_method"
    ]:
        raise ValueError("alias generation method mismatch")
    if not isinstance(stored["alias_generation_attestation_sha256"], str) or not HEX64.fullmatch(
        stored["alias_generation_attestation_sha256"]
    ):
        raise ValueError("alias generation attestation malformed")

    all_aliases: list[str] = []
    for field, definition in (
        ("project_role_aliases", schema["project_role_aliases"]),
        ("principal_role_aliases", schema["principal_role_aliases"]),
        ("alternate_route_aliases", schema["alternate_route_aliases"]),
    ):
        aliases = stored[field]
        if not isinstance(aliases, dict) or set(aliases) != set(
            definition["required_keys"]
        ):
            raise ValueError(f"alias key mismatch: {field}")
        if any(
            not isinstance(value, str) or not HEX32.fullmatch(value)
            for value in aliases.values()
        ):
            raise ValueError(f"alias grammar mismatch: {field}")
        if len(set(aliases.values())) != len(aliases):
            raise ValueError(f"alias collision: {field}")
        all_aliases.extend(aliases.values())
    if len(set(all_aliases)) != len(all_aliases):
        raise ValueError("cross-role alias collision")
    credential_controller_aliases = stored["credential_controller_aliases"]
    if (
        not isinstance(credential_controller_aliases, list)
        or credential_controller_aliases != sorted(credential_controller_aliases)
        or len(credential_controller_aliases)
        != len(set(credential_controller_aliases))
        or any(
            not isinstance(alias, str) or not HEX32.fullmatch(alias)
            for alias in credential_controller_aliases
        )
        or set(credential_controller_aliases).intersection(all_aliases)
    ):
        raise ValueError("credential controller alias domain mismatch")
    all_aliases.extend(credential_controller_aliases)
    alias_material = {
        "alias_context_id": stored["alias_context_id"],
        "alias_generation_method": stored["alias_generation_method"],
        "alias_generation_attestation_sha256": stored[
            "alias_generation_attestation_sha256"
        ],
        "project_role_aliases": stored["project_role_aliases"],
        "principal_role_aliases": stored["principal_role_aliases"],
        "alternate_route_aliases": stored["alternate_route_aliases"],
        "credential_controller_aliases": credential_controller_aliases,
    }
    if stored["alias_assignment_sha256"] != _sha(_canonical(alias_material)):
        raise ValueError("alias assignment commitment mismatch")
    if not isinstance(stored["privacy_alias_mapping_evidence_sha256"], str) or not HEX64.fullmatch(
        stored["privacy_alias_mapping_evidence_sha256"]
    ):
        raise ValueError("privacy alias mapping evidence malformed")
    if not isinstance(stored["effective_policy_snapshot_sha256"], str) or not HEX64.fullmatch(
        stored["effective_policy_snapshot_sha256"]
    ):
        raise ValueError("effective policy snapshot malformed")
    privacy = stored["privacy_boundary_evidence"]
    privacy_schema = schema["privacy_boundary_evidence"]
    if not isinstance(privacy, dict) or set(privacy) != set(
        privacy_schema["required_keys"]
    ):
        raise ValueError("privacy boundary evidence keys mismatch")
    for key, expected in privacy_schema["exact"].items():
        if privacy[key] != expected:
            raise ValueError(f"privacy boundary evidence mismatch: {key}")
    for field in (
        "privacy_boundary_policy_hash",
        "alias_generation_attestation_sha256",
        "alias_mapping_evidence_sha256",
        "identifier_commitment_verification_receipt_sha256",
    ):
        if not isinstance(privacy[field], str) or not HEX64.fullmatch(privacy[field]):
            raise ValueError("privacy boundary commitment malformed")
    if privacy["alias_generation_attestation_sha256"] != stored[
        "alias_generation_attestation_sha256"
    ] or privacy["alias_mapping_evidence_sha256"] != stored[
        "privacy_alias_mapping_evidence_sha256"
    ]:
        raise ValueError("privacy alias evidence binding mismatch")
    approval_domains = schema["approval_domains"]
    synthetic_mode = stored["evidence_state"] == (
        "SYNTHETIC_COMPLETE_SCHEMA_EXERCISE_NO_AUTHORITY"
    )
    privacy_approved = (
        approval_domains["synthetic_test_privacy_boundary_policy_hashes"]
        if synthetic_mode
        else approval_domains["runtime_approved_privacy_boundary_policy_hashes"]
    )
    if privacy["privacy_boundary_policy_hash"] not in privacy_approved:
        raise ValueError("privacy boundary policy is not approved")

    closure = stored["controller_closure"]
    closure_schema = schema["controller_closure"]
    if not isinstance(closure, dict) or set(closure) != set(
        closure_schema["required_keys"]
    ):
        raise ValueError("controller closure keys mismatch")
    for field in (
        "source_inventory_sha256",
        "edge_inventory_sha256",
        "completeness_witness_sha256",
        "cycle_set_sha256",
        "credential_controller_sets_sha256",
        "authority_mutator_influence_edges_sha256",
    ):
        if not isinstance(closure[field], str) or not HEX64.fullmatch(closure[field]):
            raise ValueError("controller commitment malformed")
    if closure["source_types"] != closure_schema["source_types_exact"]:
        raise ValueError("controller source universe mismatch")
    source_records = closure["authority_source_records"]
    source_record_schema = set(
        closure_schema["authority_source_record_required_keys"]
    )
    if (
        not isinstance(source_records, list)
        or len(source_records) != len(closure_schema["source_types_exact"])
        or {item.get("source_type") for item in source_records if isinstance(item, dict)}
        != set(closure_schema["source_types_exact"])
    ):
        raise ValueError("authority source record coverage mismatch")
    if (
        closure_schema[
            "external_mutator_record_count_independent_of_source_record_count"
        ]
        is not True
        or closure_schema[
            "one_source_record_may_emit_multiple_external_mutators"
        ]
        is not True
    ):
        raise ValueError("external mutator count cardinality contract mismatch")
    if closure_schema["credential_control_disposition_manifest_fields"] != [
        "source_type",
        "record_count",
        "external_mutator_record_count",
        "snapshot_sha256",
        "credential_control_dispositions",
    ]:
        raise ValueError("credential disposition manifest field contract mismatch")
    source_records_by_type: dict[str, dict[str, Any]] = {}
    for record in source_records:
        if set(record) != source_record_schema:
            raise ValueError("authority source record keys mismatch")
        if type(record["record_count"]) is not int or record["record_count"] < 0:
            raise ValueError("authority source record count malformed")
        if (
            type(record["external_mutator_record_count"]) is not int
            or record["external_mutator_record_count"] < 0
        ):
            raise ValueError("authority source external mutator count malformed")
        if (
            type(record["credential_control_edge_count"]) is not int
            or record["credential_control_edge_count"] < 0
        ):
            raise ValueError("authority source credential edge count malformed")
        if not isinstance(record["snapshot_sha256"], str) or not HEX64.fullmatch(
            record["snapshot_sha256"]
        ):
            raise ValueError("authority source snapshot malformed")
        if not isinstance(
            record["credential_control_edge_output_sha256"], str
        ) or not HEX64.fullmatch(
            record["credential_control_edge_output_sha256"]
        ):
            raise ValueError("authority source credential edge output malformed")
        dispositions = record["credential_control_dispositions"]
        disposition_key_set = set(
            closure_schema["credential_control_disposition_required_keys"]
        )
        if (
            not isinstance(dispositions, list)
            or len(dispositions) != record["record_count"]
            or [item.get("source_record_ordinal") for item in dispositions]
            != list(range(record["record_count"]))
        ):
            raise ValueError("credential control disposition coverage mismatch")
        for disposition in dispositions:
            if set(disposition) != disposition_key_set:
                raise ValueError("credential control disposition keys mismatch")
            links = disposition["edge_source_link_sha256s"]
            if (
                disposition["disposition"]
                not in closure_schema["credential_control_disposition_domain"]
                or not isinstance(links, list)
                or links != sorted(links)
                or len(links) != len(set(links))
                or any(
                    not isinstance(link, str) or not HEX64.fullmatch(link)
                    for link in links
                )
                or not isinstance(disposition["disposition_evidence_sha256"], str)
                or not HEX64.fullmatch(
                    disposition["disposition_evidence_sha256"]
                )
            ):
                raise ValueError("credential control disposition malformed")
            expected_disposition = (
                "EDGES_ENUMERATED"
                if links
                else "NO_CREDENTIAL_CONTROL_EDGE"
            )
            if disposition["disposition"] != expected_disposition:
                raise ValueError("credential control disposition/edge mismatch")
        manifest_material = {
            "source_type": record["source_type"],
            "record_count": record["record_count"],
            "external_mutator_record_count": record[
                "external_mutator_record_count"
            ],
            "snapshot_sha256": record["snapshot_sha256"],
            "credential_control_dispositions": dispositions,
        }
        expected_manifest_hash = _sha(
            closure_schema[
                "credential_control_disposition_manifest_domain_separator"
            ].encode("ascii")
            + b"\x00"
            + _canonical(manifest_material)
        )
        if record["credential_control_disposition_manifest_sha256"] != (
            expected_manifest_hash
        ):
            raise ValueError("credential control disposition manifest mismatch")
        if (
            not synthetic_mode
            and expected_manifest_hash
            not in approval_domains[
                "runtime_approved_credential_control_disposition_manifest_hashes"
            ]
        ):
            raise ValueError(
                "credential control disposition manifest is not runtime-approved"
            )
        source_records_by_type[record["source_type"]] = record
    if closure["source_inventory_sha256"] != _sha(_canonical(source_records)):
        raise ValueError("authority source inventory commitment mismatch")
    cycles = closure["cycle_records"]
    if cycles != [] or closure["cycle_set_sha256"] != _sha(_canonical([])):
        raise ValueError("credential-control cycles are not admitted")
    edges = closure["credential_control_edges"]
    edge_key_set = set(closure_schema["credential_control_edge_required_keys"])
    all_credential_nodes = set(stored["principal_role_aliases"].values()) | set(
        credential_controller_aliases
    )
    if not isinstance(edges, list):
        raise ValueError("credential control edges malformed")
    edge_tuples: list[tuple[str, str]] = []
    edge_sort_keys: list[tuple[str, int, str, str, str]] = []
    edge_type_map = closure_schema["credential_control_edge_type_by_source_type"]
    source_link_domain = closure_schema[
        "credential_control_edge_source_link_domain_separator"
    ].encode("ascii")
    for edge in edges:
        if set(edge) != edge_key_set:
            raise ValueError("credential control edge keys mismatch")
        controller = edge["controller_alias"]
        controlled = edge["controlled_alias"]
        source_type = edge["source_type"]
        source_record = source_records_by_type.get(source_type)
        if (
            source_record is None
            or edge["edge_type"] != edge_type_map.get(source_type)
            or type(edge["source_record_ordinal"]) is not int
            or edge["source_record_ordinal"] < 0
            or edge["source_record_ordinal"] >= source_record["record_count"]
            or controller not in all_credential_nodes
            or controlled not in all_credential_nodes
            or controller == controlled
            or not isinstance(edge["evidence_sha256"], str)
            or not HEX64.fullmatch(edge["evidence_sha256"])
            or not isinstance(edge["source_link_sha256"], str)
            or not HEX64.fullmatch(edge["source_link_sha256"])
        ):
            raise ValueError("credential control edge domain mismatch")
        source_link_material = {
            "source_type": source_type,
            "source_snapshot_sha256": source_record["snapshot_sha256"],
            "source_record_ordinal": edge["source_record_ordinal"],
            "edge_type": edge["edge_type"],
            "controller_alias": controller,
            "controlled_alias": controlled,
            "evidence_sha256": edge["evidence_sha256"],
        }
        if edge["source_link_sha256"] != _sha(
            source_link_domain + b"\x00" + _canonical(source_link_material)
        ):
            raise ValueError("credential control edge source link mismatch")
        edge_tuples.append((controller, controlled))
        edge_sort_keys.append(
            (
                source_type,
                edge["source_record_ordinal"],
                edge["edge_type"],
                controller,
                controlled,
            )
        )
    if edge_sort_keys != sorted(edge_sort_keys) or len(edge_sort_keys) != len(
        set(edge_sort_keys)
    ):
        raise ValueError("credential control edges not sorted unique")
    source_output_domain = closure_schema[
        "credential_control_source_output_domain_separator"
    ].encode("ascii")
    for source_type, source_record in source_records_by_type.items():
        source_edges = [edge for edge in edges if edge["source_type"] == source_type]
        if source_record["credential_control_edge_count"] != len(source_edges):
            raise ValueError("credential edge/source count mismatch")
        for disposition in source_record["credential_control_dispositions"]:
            actual_links = sorted(
                edge["source_link_sha256"]
                for edge in source_edges
                if edge["source_record_ordinal"]
                == disposition["source_record_ordinal"]
            )
            if disposition["edge_source_link_sha256s"] != actual_links:
                raise ValueError("credential disposition/global edge mismatch")
        source_output_material = {
            "source_type": source_type,
            "record_count": source_record["record_count"],
            "snapshot_sha256": source_record["snapshot_sha256"],
            "credential_control_edges": source_edges,
        }
        if source_record["credential_control_edge_output_sha256"] != _sha(
            source_output_domain + b"\x00" + _canonical(source_output_material)
        ):
            raise ValueError("credential edge/source output mismatch")
    parents: dict[str, set[str]] = {node: set() for node in all_credential_nodes}
    for controller, controlled in edge_tuples:
        parents[controlled].add(controller)

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            raise ValueError("credential control graph contains cycle")
        if node in visited:
            return
        visiting.add(node)
        for parent in parents[node]:
            visit(parent)
        visiting.remove(node)
        visited.add(node)

    for node in sorted(all_credential_nodes):
        visit(node)

    def upstream(node: str) -> set[str]:
        result = {node}
        pending = list(parents[node])
        while pending:
            parent = pending.pop()
            if parent in result:
                continue
            result.add(parent)
            pending.extend(parents[parent])
        return result

    derived_controller_map = {
        role: sorted(upstream(alias))
        for role, alias in stored["principal_role_aliases"].items()
    }
    derived_auxiliary_aliases = set().union(
        *(set(aliases) for aliases in derived_controller_map.values())
    ) - set(stored["principal_role_aliases"].values())
    if set(credential_controller_aliases) != derived_auxiliary_aliases:
        raise ValueError("credential controller alias is orphaned or unlisted")
    external_mutators = closure["external_authority_mutator_records"]
    if not isinstance(external_mutators, list):
        raise ValueError("external mutator records malformed")
    external_aliases: list[str] = []
    for record in external_mutators:
        if set(record) != set(
            closure_schema["external_authority_mutator_record_required_keys"]
        ):
            raise ValueError("external mutator record keys mismatch")
        if (
            not isinstance(record["mutator_alias"], str)
            or not HEX32.fullmatch(record["mutator_alias"])
            or record["mutator_type"]
            not in closure_schema["external_authority_mutator_type_domain"]
            or record["state"]
            != closure_schema["external_authority_mutator_state"]
            or not isinstance(record["evidence_sha256"], str)
            or not HEX64.fullmatch(record["evidence_sha256"])
        ):
            raise ValueError("external mutator record domain mismatch")
        if (
            not isinstance(record["influenced_roles"], list)
            or not record["influenced_roles"]
            or record["influenced_roles"] != sorted(record["influenced_roles"])
            or len(record["influenced_roles"])
            != len(set(record["influenced_roles"]))
            or not set(record["influenced_roles"]).issubset(
                set(schema["principal_role_aliases"]["required_keys"])
            )
        ):
            raise ValueError("external mutator influence role mismatch")
        external_aliases.append(record["mutator_alias"])
    if len(external_aliases) != len(set(external_aliases)):
        raise ValueError("external mutator alias collision")
    if set(external_aliases).intersection(set(all_aliases)):
        raise ValueError("external mutator collides with role/project/route alias")
    mapped_external_counts = {
        source_type: 0 for source_type in closure_schema["source_types_exact"]
    }
    source_map = closure_schema["external_mutator_source_type_map"]
    for record in external_mutators:
        mapped_external_counts[source_map[record["mutator_type"]]] += 1
    for source_type, observed_count in mapped_external_counts.items():
        if source_records_by_type[source_type][
            "external_mutator_record_count"
        ] != observed_count:
            raise ValueError("external mutator/source inventory count mismatch")
    if type(closure["missing_source_count"]) is not int or closure[
        "missing_source_count"
    ] != 0:
        raise ValueError("controller sources incomplete")
    if closure["fixed_point_reached"] is not True:
        raise ValueError("controller fixed point incomplete")
    if type(closure["forbidden_intersection_count"]) is not int or closure[
        "forbidden_intersection_count"
    ] != 0:
        raise ValueError("forbidden controller intersection")
    if type(closure["active_authority_mutator_count"]) is not int or closure[
        "active_authority_mutator_count"
    ] != 0:
        raise ValueError("authority mutator active")
    influence_edges = closure["authority_mutator_influence_edges"]
    if influence_edges != closure_schema[
        "authority_mutator_influence_edges_exact"
    ]:
        raise ValueError("authority mutator influence graph mismatch")
    if closure["authority_mutator_influence_edges_sha256"] != _sha(
        _canonical(
            {
                "internal_edges": influence_edges,
                "external_mutator_records": external_mutators,
            }
        )
    ):
        raise ValueError("authority mutator influence graph commitment mismatch")
    states = closure["authority_mutator_states"]
    if not isinstance(states, dict) or set(states) != set(
        closure_schema["authority_mutator_roles"]
    ) or any(value != "DORMANT" for value in states.values()):
        raise ValueError("authority mutator dormancy mismatch")
    controller_map = closure["controller_sets"]
    if not isinstance(controller_map, dict) or set(controller_map) != set(
        closure_schema["controller_sets_required_roles"]
    ):
        raise ValueError("controller role coverage mismatch")
    controller_sets: list[set[str]] = []
    for role, aliases in controller_map.items():
        if (
            not isinstance(aliases, list)
            or not aliases
            or aliases != sorted(aliases)
            or len(aliases) != len(set(aliases))
        ):
            raise ValueError("controller set ordering/uniqueness mismatch")
        if any(
            not isinstance(alias, str) or not HEX32.fullmatch(alias)
            for alias in aliases
        ):
            raise ValueError("controller alias malformed")
        if stored["principal_role_aliases"][role] not in aliases:
            raise ValueError("role alias absent from credential controller set")
        controller_sets.append(set(aliases))
    if controller_map != derived_controller_map:
        raise ValueError("credential controller fixed point is not edge-derived")
    if closure["credential_controller_sets_sha256"] != _sha(
        _canonical(controller_map)
    ):
        raise ValueError("controller set commitment mismatch")
    edge_inventory = {
        "credential_control_edges": edges,
        "credential_controller_sets": controller_map,
        "internal_authority_mutator_edges": influence_edges,
        "external_authority_mutator_records": external_mutators,
    }
    if closure["edge_inventory_sha256"] != _sha(_canonical(edge_inventory)):
        raise ValueError("authority edge inventory commitment mismatch")
    completeness_material = {
        "authority_source_records": source_records,
        "credential_control_edges": edges,
        "credential_controller_sets": controller_map,
        "cycle_records": cycles,
        "external_authority_mutator_records": external_mutators,
        "authority_mutator_states": states,
        "missing_source_count": closure["missing_source_count"],
        "fixed_point_reached": closure["fixed_point_reached"],
        "forbidden_intersection_count": closure["forbidden_intersection_count"],
        "active_authority_mutator_count": closure[
            "active_authority_mutator_count"
        ],
    }
    expected_completeness = _sha(
        closure_schema["completeness_witness_domain_separator"].encode("ascii")
        + b"\x00"
        + _canonical(completeness_material)
    )
    if closure["completeness_witness_sha256"] != expected_completeness:
        raise ValueError("controller completeness witness mismatch")
    for index, left in enumerate(controller_sets):
        for right in controller_sets[index + 1 :]:
            if left.intersection(right):
                raise ValueError("transitive credential controller collision")
    if set(external_aliases).intersection(set().union(*controller_sets)):
        raise ValueError("external mutator collides with credential controller")

    wif = stored["wif_evidence"]
    wif_schema = schema["wif_evidence"]
    if not isinstance(wif, dict) or set(wif) != set(wif_schema["required_keys"]):
        raise ValueError("WIF evidence keys mismatch")
    for key, expected in wif_schema["exact"].items():
        if type(wif[key]) is not type(expected) or wif[key] != expected:
            raise ValueError(f"WIF evidence mismatch: {key}")
    for field in (
        "pool_etag_sha256",
        "provider_etag_sha256",
        "mapping_ast_sha256",
        "condition_ast_sha256",
        "sts_endpoint_binding_sha256",
        "sts_exchange_audience_binding_sha256",
        "existing_token_denial_same_context_sha256",
        "existing_token_denial_audit_correlation_sha256",
        "wif_policy_binding_sha256",
        "existing_token_denial_binding_sha256",
    ):
        if not isinstance(wif[field], str) or not HEX64.fullmatch(wif[field]):
            raise ValueError("WIF commitment malformed")
    policy_wif = contract["policy_template"]["wif"]
    if wif["mapping_ast_sha256"] != _sha(
        _canonical(policy_wif["attribute_mapping_ast"])
    ) or wif["condition_ast_sha256"] != _sha(
        _canonical(policy_wif["condition_ast"])
    ):
        raise ValueError("WIF AST commitment mismatch")
    wif_policy_material = {
        key: value
        for key, value in wif.items()
        if key
        not in {
            "wif_policy_binding_sha256",
            "existing_token_denial_proved",
            "existing_token_denial_observed_at",
            "existing_token_denial_same_context_sha256",
            "existing_token_denial_audit_correlation_sha256",
            "existing_token_denial_cause",
            "existing_token_denial_binding_sha256",
        }
    }
    if wif["wif_policy_binding_sha256"] != _sha(
        _canonical(wif_policy_material)
    ):
        raise ValueError("WIF policy binding mismatch")
    denial_material = {
        key: wif[key]
        for key in (
            "wif_policy_binding_sha256",
            "existing_token_denial_proved",
            "existing_token_denial_observed_at",
            "existing_token_denial_same_context_sha256",
            "existing_token_denial_audit_correlation_sha256",
            "existing_token_denial_cause",
        )
    }
    if wif["existing_token_denial_binding_sha256"] != _sha(
        _canonical(denial_material)
    ):
        raise ValueError("existing-token denial binding mismatch")

    key_schema = schema["key_generation_record"]
    records = stored["key_generation_evidence"]
    if not isinstance(records, list) or len(records) != 2 or {
        record.get("key_purpose_id") for record in records if isinstance(record, dict)
    } != set(key_schema["required_key_purpose_ids"]):
        raise ValueError("key generation purpose coverage mismatch")
    key_by_purpose: dict[str, dict[str, Any]] = {}
    generation_aliases: list[str] = []
    for record in records:
        if set(record) != set(key_schema["required_keys"]):
            raise ValueError("key record keys mismatch")
        for key, expected in key_schema["exact"].items():
            if type(record[key]) is not type(expected) or record[key] != expected:
                raise ValueError(f"key evidence mismatch: {key}")
        if not isinstance(record["generation_alias"], str) or not HEX32.fullmatch(
            record["generation_alias"]
        ):
            raise ValueError("key alias malformed")
        generation_aliases.append(record["generation_alias"])
        for field in (
            "spki_der_sha256",
            "hsm_attestation_sha256",
            "certificate_chain_sha256",
        ):
            if not isinstance(record[field], str) or not HEX64.fullmatch(record[field]):
                raise ValueError("key commitment malformed")
        key_by_purpose[record["key_purpose_id"]] = record
    if len(set(generation_aliases)) != 2:
        raise ValueError("key generation alias collision")
    reserved_nonkey_aliases = set(all_aliases) | set(external_aliases)
    if set(generation_aliases).intersection(reserved_nonkey_aliases):
        raise ValueError("key generation alias collides with another alias domain")
    for field in ("spki_der_sha256", "hsm_attestation_sha256"):
        if len({record[field] for record in records}) != 2:
            raise ValueError(f"distinct HSM keys share {field}")

    provenance = stored["image_provenance_evidence"]
    provenance_schema = schema["image_provenance_evidence"]
    if not isinstance(provenance, dict) or set(provenance) != set(
        provenance_schema["required_keys"]
    ):
        raise ValueError("image provenance keys mismatch")
    for key, expected in provenance_schema["exact"].items():
        if provenance[key] != expected:
            raise ValueError(f"image provenance mismatch: {key}")
    if not re.fullmatch(
        provenance_schema["oci_manifest_digest_pattern"],
        provenance["oci_manifest_digest"],
    ):
        raise ValueError("OCI digest malformed")
    image_key = key_by_purpose["IMAGE_PROVENANCE_SIGNING_KEY"]
    if provenance["generation_alias"] != image_key["generation_alias"]:
        raise ValueError("image provenance key alias mismatch")
    if provenance["spki_der_sha256"] != image_key["spki_der_sha256"]:
        raise ValueError("image provenance SPKI mismatch")
    expected_schema_hash = contract["policy_template"]["image_provenance"][
        "payload_schema_sha256"
    ]
    if provenance["payload_schema_sha256"] != expected_schema_hash:
        raise ValueError("image provenance payload schema mismatch")
    verifier_approvals = (
        approval_domains["synthetic_test_provenance_verifier_policy_hashes"]
        if synthetic_mode
        else approval_domains["runtime_approved_provenance_verifier_policy_hashes"]
    )
    deployment_approvals = (
        approval_domains["synthetic_test_deployment_gate_policy_hashes"]
        if synthetic_mode
        else approval_domains["runtime_approved_deployment_gate_policy_hashes"]
    )
    if provenance["provenance_verifier_policy_hash"] not in verifier_approvals:
        raise ValueError("provenance verifier policy is not approved")
    if provenance["deployment_gate_policy_hash"] not in deployment_approvals:
        raise ValueError("deployment gate policy is not approved")
    identifier_receipt_material = {
        "privacy_boundary_policy_hash": privacy["privacy_boundary_policy_hash"],
        "identifier_commitment_scheme": privacy["identifier_commitment_scheme"],
        "identifier_commitment_domain": privacy["identifier_commitment_domain"],
        "alias_mapping_evidence_sha256": privacy["alias_mapping_evidence_sha256"],
        "oci_reference_keyed_commitment_sha256": provenance[
            "oci_reference_keyed_commitment_sha256"
        ],
    }
    expected_identifier_receipt = _sha(
        privacy_schema["identifier_commitment_receipt_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(identifier_receipt_material)
    )
    if (
        provenance["identifier_commitment_verification_receipt_sha256"]
        != expected_identifier_receipt
        or privacy["identifier_commitment_verification_receipt_sha256"]
        != expected_identifier_receipt
    ):
        raise ValueError("identifier commitment verification receipt mismatch")
    if provenance["verifier_alias"] != stored["principal_role_aliases"][
        "PUBLIC_KEY_VERIFIER"
    ]:
        raise ValueError("image provenance verifier alias mismatch")
    if not isinstance(provenance["deployment_attempt_alias"], str) or not HEX32.fullmatch(
        provenance["deployment_attempt_alias"]
    ):
        raise ValueError("deployment attempt alias malformed")
    if provenance["deployment_attempt_alias"] in (
        reserved_nonkey_aliases | set(generation_aliases)
    ):
        raise ValueError("deployment attempt alias collides with another alias domain")
    if _parse_utc(provenance["verification_timestamp"]) > _parse_utc(
        stored["observation_point"]
    ):
        raise ValueError("provenance verification occurs after observation")
    for field in (
        "oci_reference_keyed_commitment_sha256",
        "spki_der_sha256",
        "payload_schema_sha256",
        "canonical_payload_sha256",
        "signature_sha256",
        "provenance_verifier_policy_hash",
        "deployment_gate_policy_hash",
        "verification_receipt_sha256",
        "payload_binding_receipt_sha256",
        "identifier_commitment_verification_receipt_sha256",
        "deployment_candidate_sha256",
        "deployment_gate_consumption_sha256",
        "provenance_binding_sha256",
    ):
        if not isinstance(provenance[field], str) or not HEX64.fullmatch(
            provenance[field]
        ):
            raise ValueError("image provenance commitment malformed")
    payload_binding_material = {
        key: provenance[key]
        for key in (
            "oci_manifest_digest",
            "oci_reference_keyed_commitment_sha256",
            "payload_schema_sha256",
            "canonical_payload_sha256",
        )
    }
    expected_payload_receipt = _sha(
        provenance_schema["payload_binding_receipt_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(payload_binding_material)
    )
    if provenance["payload_binding_receipt_sha256"] != expected_payload_receipt:
        raise ValueError("payload binding receipt mismatch")
    verification_material = {
        key: provenance[key]
        for key in (
            "provenance_verifier_policy_hash",
            "oci_manifest_digest",
            "generation_alias",
            "version_id",
            "algorithm",
            "spki_der_sha256",
            "canonical_payload_sha256",
            "signature_sha256",
            "payload_binding_receipt_sha256",
            "identifier_commitment_verification_receipt_sha256",
            "verifier_alias",
            "verification_timestamp",
            "verification_result",
        )
    }
    expected_verification_receipt = _sha(
        provenance_schema["verification_receipt_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(verification_material)
    )
    if provenance["verification_receipt_sha256"] != expected_verification_receipt:
        raise ValueError("provenance verification receipt mismatch")
    deployment_material = {
        key: provenance[key]
        for key in (
            "deployment_gate_policy_hash",
            "deployment_candidate_sha256",
            "deployment_attempt_alias",
            "verification_receipt_sha256",
            "payload_binding_receipt_sha256",
            "deployment_gate_result",
        )
    }
    expected_gate_consumption = _sha(
        provenance_schema["deployment_gate_consumption_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(deployment_material)
    )
    if provenance["deployment_gate_consumption_sha256"] != expected_gate_consumption:
        raise ValueError("deployment gate consumption mismatch")
    provenance_material = {
        key: value
        for key, value in provenance.items()
        if key != "provenance_binding_sha256"
    }
    if provenance["provenance_binding_sha256"] != _sha(
        _canonical(provenance_material)
    ):
        raise ValueError("image provenance binding mismatch")

    access_schema = schema["effective_access_record"]
    access = stored["effective_access_records"]
    if not isinstance(access, list):
        raise ValueError("effective access records absent")
    expected_by_id = {
        item["tuple_id"]: item for item in access_schema["tuple_universe"]
    }
    if len(access) != len(expected_by_id) or {
        item.get("tuple_id") for item in access if isinstance(item, dict)
    } != set(expected_by_id):
        raise ValueError("effective access tuple universe incomplete")
    context_hashes: dict[str, str] = {}
    for record in access:
        if set(record) != set(access_schema["required_keys"]):
            raise ValueError("access record keys mismatch")
        expected = expected_by_id[record["tuple_id"]]
        for field in (
            "tuple_id",
            "principal_role",
            "resource_purpose",
            "permission",
            "expected",
            "context_group_id",
        ):
            if type(record[field]) is not str or record[field] != expected[field]:
                raise ValueError(f"access tuple mismatch: {field}")
        if not re.fullmatch(access_schema["tuple_id_pattern"], record["tuple_id"]):
            raise ValueError("access tuple ID malformed")
        if record["principal_alias"] != stored["principal_role_aliases"][
            record["principal_role"]
        ]:
            raise ValueError("access principal alias mismatch")
        purpose_for_resource = {
            "IMAGE_PROVENANCE_SIGNING_CRYPTOKEY": "IMAGE_PROVENANCE_SIGNING_KEY",
            "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY": "RUNTIME_RECEIPT_SIGNING_KEY",
        }[record["resource_purpose"]]
        if record["key_generation_alias"] != key_by_purpose[
            purpose_for_resource
        ]["generation_alias"]:
            raise ValueError("access key generation alias mismatch")
        if record["policy_snapshot_sha256"] != stored[
            "effective_policy_snapshot_sha256"
        ]:
            raise ValueError("access policy snapshot spliced")
        expected_wif_binding = (
            wif["wif_policy_binding_sha256"]
            if record["principal_role"] == "RUNTIME_SIGNER"
            else "0" * 64
        )
        if record["wif_policy_binding_sha256"] != expected_wif_binding:
            raise ValueError("access WIF policy binding mismatch")
        if record["observed"] != record["expected"]:
            raise ValueError("access outcome mismatch")
        _parse_utc(record["observed_at"])
        required_cause = (
            "NOT_APPLICABLE_ALLOWED"
            if record["observed"] == "ALLOW"
            else "AUTHORIZATION_PERMISSION_DENIED"
        )
        if record["denial_cause"] != required_cause:
            raise ValueError("ambiguous access denial cause")
        for field in (
            "same_context_sha256",
            "policy_snapshot_sha256",
            "audit_correlation_sha256",
            "access_record_binding_sha256",
        ):
            if not isinstance(record[field], str) or not HEX64.fullmatch(record[field]):
                raise ValueError("access commitment malformed")
        record_material = {
            key: value
            for key, value in record.items()
            if key != "access_record_binding_sha256"
        }
        if record["access_record_binding_sha256"] != _sha(
            _canonical(record_material)
        ):
            raise ValueError("access record binding mismatch")
        prior_context = context_hashes.setdefault(
            record["context_group_id"], record["same_context_sha256"]
        )
        if prior_context != record["same_context_sha256"]:
            raise ValueError("same-context group commitment mismatch")
    audit_correlations = [record["audit_correlation_sha256"] for record in access]
    if len(audit_correlations) != len(set(audit_correlations)):
        raise ValueError("access audit correlation reused")

    alternate_schema = schema["alternate_credential_record"]
    alternate = stored["alternate_credential_records"]
    expected_alternate = {
        (item["route_id"], item["resource_purpose"])
        for item in alternate_schema["record_universe"]
    }
    if not isinstance(alternate, list) or {
        (item.get("route_id"), item.get("resource_purpose"))
        for item in alternate
        if isinstance(item, dict)
    } != expected_alternate or len(alternate) != len(expected_alternate):
        raise ValueError("alternate credential coverage mismatch")
    alternate_contexts: dict[str, str] = {}
    for record in alternate:
        if set(record) != set(alternate_schema["required_keys"]):
            raise ValueError("alternate credential keys mismatch")
        if (
            type(record["route_id"]) is not str
            or record["observed"] != "DENY"
            or record["denial_cause"] != "AUTHORIZATION_PERMISSION_DENIED"
        ):
            raise ValueError("alternate credential route not denied")
        _parse_utc(record["observed_at"])
        if record["resource_purpose"] not in alternate_schema[
            "resource_purposes_exact"
        ]:
            raise ValueError("alternate resource purpose mismatch")
        if record["principal_alias"] != stored["alternate_route_aliases"][
            record["route_id"]
        ]:
            raise ValueError("alternate principal alias mismatch")
        purpose_for_resource = {
            "IMAGE_PROVENANCE_SIGNING_CRYPTOKEY": "IMAGE_PROVENANCE_SIGNING_KEY",
            "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY": "RUNTIME_RECEIPT_SIGNING_KEY",
        }[record["resource_purpose"]]
        if record["key_generation_alias"] != key_by_purpose[
            purpose_for_resource
        ]["generation_alias"]:
            raise ValueError("alternate key generation alias mismatch")
        if record["policy_snapshot_sha256"] != stored[
            "effective_policy_snapshot_sha256"
        ]:
            raise ValueError("alternate policy snapshot spliced")
        for field in (
            "same_context_sha256",
            "policy_snapshot_sha256",
            "audit_correlation_sha256",
            "alternate_record_binding_sha256",
        ):
            if not isinstance(record[field], str) or not HEX64.fullmatch(record[field]):
                raise ValueError("alternate credential commitment malformed")
        binding_material = {
            key: value
            for key, value in record.items()
            if key != "alternate_record_binding_sha256"
        }
        if record["alternate_record_binding_sha256"] != _sha(
            _canonical(binding_material)
        ):
            raise ValueError("alternate credential binding mismatch")
        prior_alternate_context = alternate_contexts.setdefault(
            record["route_id"], record["same_context_sha256"]
        )
        if prior_alternate_context != record["same_context_sha256"]:
            raise ValueError("alternate route same-context mismatch")
    alternate_audits = [
        record["audit_correlation_sha256"] for record in alternate
    ]
    if len(alternate_audits) != len(set(alternate_audits)):
        raise ValueError("alternate audit correlation reused")
    all_audit_correlations = (
        audit_correlations
        + alternate_audits
        + [wif["existing_token_denial_audit_correlation_sha256"]]
    )
    if len(all_audit_correlations) != len(set(all_audit_correlations)):
        raise ValueError("audit correlation reused across evidence classes")

    rollover = stored["rollover_evidence"]
    rollover_schema = schema["rollover_evidence"]
    if not isinstance(rollover, dict) or set(rollover) != set(
        rollover_schema["required_keys"]
    ):
        raise ValueError("rollover keys mismatch")
    if rollover["state"] not in rollover_schema["state_domain"]:
        raise ValueError("rollover state mismatch")
    events = rollover["events"]
    expected_states = rollover_schema["state_domain"][
        : rollover_schema["state_domain"].index(rollover["state"]) + 1
    ]
    if not isinstance(events, list) or [event.get("state") for event in events] != expected_states:
        raise ValueError("rollover transition sequence incomplete")
    event_times: list[int] = []
    event_hashes: list[str] = []
    for event in events:
        if set(event) != set(rollover_schema["event_record_required_keys"]):
            raise ValueError("rollover event keys mismatch")
        event_times.append(_parse_utc(event["observed_at"]))
        if not isinstance(event["evidence_sha256"], str) or not HEX64.fullmatch(
            event["evidence_sha256"]
        ):
            raise ValueError("rollover event commitment malformed")
        event_hashes.append(event["evidence_sha256"])
    if any(left >= right for left, right in zip(event_times, event_times[1:])):
        raise ValueError("rollover event times not strictly increasing")
    if len(event_hashes) != len(set(event_hashes)):
        raise ValueError("rollover event commitment reused")
    if rollover["key_purpose_id"] not in rollover_schema["key_purpose_domain"]:
        raise ValueError("rollover key purpose mismatch")
    if rollover["two_approved_generations"] is not False:
        raise ValueError("dual key generations approved")
    for field in (
        "old_generation_alias",
        "new_generation_alias",
        "approver_alias",
        "executor_alias",
    ):
        if not isinstance(rollover[field], str) or not HEX32.fullmatch(
            rollover[field]
        ):
            raise ValueError("rollover alias malformed")
    if rollover["old_generation_alias"] == rollover["new_generation_alias"]:
        raise ValueError("rollover generation alias collision")
    if rollover["old_generation_alias"] in generation_aliases:
        raise ValueError("rollover old generation collides with active key")
    if rollover["old_generation_alias"] in reserved_nonkey_aliases or rollover[
        "old_generation_alias"
    ] == provenance["deployment_attempt_alias"]:
        raise ValueError("rollover old generation collides with another alias domain")
    if rollover["new_generation_alias"] != key_by_purpose[
        rollover["key_purpose_id"]
    ]["generation_alias"]:
        raise ValueError("rollover new generation does not match key evidence")
    if rollover["approver_alias"] != stored["principal_role_aliases"][
        rollover_schema["approver_role"]
    ] or rollover["executor_alias"] != stored["principal_role_aliases"][
        rollover_schema["executor_role"]
    ]:
        raise ValueError("rollover approver/executor role binding mismatch")
    for field in (
        "old_denial_sha256",
        "new_allow_sha256",
        "cross_key_denial_sha256",
        "same_context_sha256",
        "policy_snapshot_sha256",
        "rollover_binding_sha256",
    ):
        if not isinstance(rollover[field], str) or not HEX64.fullmatch(
            rollover[field]
        ):
            raise ValueError("rollover commitment malformed")
    if len(
        {
            rollover["old_denial_sha256"],
            rollover["new_allow_sha256"],
            rollover["cross_key_denial_sha256"],
        }
    ) != 3:
        raise ValueError("rollover proof commitment collision")
    if rollover["policy_snapshot_sha256"] != stored[
        "effective_policy_snapshot_sha256"
    ]:
        raise ValueError("rollover policy snapshot spliced")
    rollover_material = {
        key: value
        for key, value in rollover.items()
        if key != "rollover_binding_sha256"
    }
    if rollover["rollover_binding_sha256"] != _sha(
        _canonical(rollover_material)
    ):
        raise ValueError("rollover binding mismatch")

    audit = stored["audit_interface_evidence"]
    audit_schema = schema["audit_interface_evidence"]
    if not isinstance(audit, dict) or set(audit) != set(audit_schema["required_keys"]):
        raise ValueError("audit evidence keys mismatch")
    if audit["section_7_5_decision"] != audit_schema["section_7_5_decision"]:
        raise ValueError("Section 7.5 decision mismatch")
    if audit["operation_inventory_sha256"] != audit_schema[
        "operation_inventory_sha256_expected"
    ]:
        raise ValueError("authority operation inventory commitment mismatch")
    section75_binding_material = {
        "operation_inventory_sha256": audit["operation_inventory_sha256"],
        "section_7_5_contract_sha256": audit["section_7_5_contract_sha256"],
        "section_7_5_decision": audit["section_7_5_decision"],
        "section_7_5_method_mapping_sha256": audit[
            "section_7_5_method_mapping_sha256"
        ],
    }
    expected_section75_binding = _sha(
        audit_schema["section_7_5_approval_binding_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(section75_binding_material)
    )
    if audit["section_7_5_approval_binding_sha256"] != expected_section75_binding:
        raise ValueError("Section 7.5 approval binding mismatch")
    if (
        not synthetic_mode
        and audit["section_7_5_approval_binding_sha256"]
        not in approval_domains["runtime_approved_section_7_5_binding_hashes"]
    ):
        raise ValueError("Section 7.5 binding is not approved")
    for field in (
        "operation_inventory_sha256",
        "section_7_5_contract_sha256",
        "section_7_5_method_mapping_sha256",
        "audit_interface_binding_sha256",
    ):
        if not isinstance(audit[field], str) or not HEX64.fullmatch(audit[field]):
            raise ValueError("audit commitment malformed")
    start = _parse_utc(audit["completeness_window_start"])
    end = _parse_utc(audit["completeness_window_end"])
    observation = _parse_utc(stored["observation_point"])
    evidence_times = [
        _parse_utc(provenance["verification_timestamp"]),
        _parse_utc(wif["existing_token_denial_observed_at"]),
        *[_parse_utc(record["observed_at"]) for record in access],
        *[_parse_utc(record["observed_at"]) for record in alternate],
        *event_times,
    ]
    if (
        start > end
        or end > observation
        or start > min(evidence_times)
        or end < max(evidence_times)
    ):
        raise ValueError("audit window chronology mismatch")
    if type(audit["missing_operation_count"]) is not int or audit[
        "missing_operation_count"
    ] != 0:
        raise ValueError("audit operation evidence missing")
    if audit["raw_logs_retained_in_fluencytracr"] is not False:
        raise ValueError("raw logs retained")
    audit_material = {
        key: value
        for key, value in audit.items()
        if key != "audit_interface_binding_sha256"
    }
    if audit["audit_interface_binding_sha256"] != _sha(
        _canonical(audit_material)
    ):
        raise ValueError("audit interface binding mismatch")

    node = _nodes(contract)["security_authority_evidence_snapshot_hash"]
    _verify_stored_hash(
        stored, node, "security_authority_evidence_snapshot_hash"
    )
    if (
        not synthetic_mode
        and stored["security_authority_evidence_snapshot_hash"]
        not in contract["evidence_snapshot_schema"]["runtime_approved_hashes"]
    ):
        raise ValueError("live evidence snapshot hash is not runtime-approved")
