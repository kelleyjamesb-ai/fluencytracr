"""Privacy-safe aggregate evidence for synthetic ordinal measurement proof."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import re
from types import MappingProxyType
from typing import Any
from collections.abc import Mapping

from .ai_fluency_measurement_manifest import (
    BEHAVIOR_EVIDENCE_KEYS,
    LONG_FORM_ID,
    manifest_item_ids,
    manifest_item_to_construct,
    manifest_pair_ids,
    measurement_manifest_hash,
)
from .hashing import sha256_json


EVIDENCE_SCHEMA_VERSION = "FT_AI_FLUENCY_AGGREGATE_ORDINAL_EVIDENCE_2026_07_V1"
PACKAGE_SCHEMA_VERSION = "FT_AI_FLUENCY_ORDINAL_EVIDENCE_PACKAGE_2026_07_V1"
AGGREGATE_OBSERVED_COUNT_FLOOR = 20
APPROVED_OWNER_REVIEW_STATE = "approved_for_synthetic_calibration"
APPROVED_PRIVACY_REVIEW_STATE = "aggregate_counts_floor_passed"
WAVE_ROLES = ("baseline", "formal_followup")
SYNTHETIC_COHORT_KEY = "synthetic-organization-overall"
APPROVED_SYNTHETIC_GENERATOR_ID = (
    "fluencytracr_inference.synthetic.ai_fluency_longitudinal_ordinal_measurement"
)
APPROVED_SYNTHETIC_GENERATOR_VERSION = "0.1.0"
APPROVED_SYNTHETIC_SCENARIOS = (
    "invariant",
    "invariant_latent_shift",
    "loading_drift",
    "threshold_drift",
)
OUTPUT_AUTHORIZATION_FIELDS = (
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized",
    "full_pathway_coherence_authorized",
    "creates_route",
    "creates_ui",
    "writes_persistence",
    "creates_export",
    "renders_readout",
    "executes_connector",
)

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_SAFE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._:/-]{2,159}$")
_EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
_SSN_RE = re.compile(r"\b\d{3}[-_.]\d{2}[-_.]\d{4}\b")
_PHONE_RE = re.compile(r"\b(?:\+?1[-_.]?)?\d{3}[-_.]\d{3}[-_.]\d{4}\b")
_UNSAFE_KEY_FRAGMENTS = (
    "respondent",
    "employee",
    "person_id",
    "user_id",
    "email",
    "invite",
    "raw_answer",
    "raw_row",
    "free_text",
    "item_title",
    "prompt",
    "profile",
    "manager",
    "hris",
    "tenure",
    "compensation",
    "performance",
    "usage_behavior",
    "usage_",
)
_UNSAFE_REFERENCE_FRAGMENTS = (
    "respondent",
    "employee",
    "person-id",
    "person_id",
    "user-id",
    "user_id",
    "manager",
    "hris",
)


class MeasurementEvidenceError(ValueError):
    """Aggregate evidence is malformed, unsafe, incomplete, or off-plan."""


def blocked_output_authorizations() -> dict[str, bool]:
    return {field: False for field in OUTPUT_AUTHORIZATION_FIELDS}


def _require_exact_keys(value: dict, expected: set[str], *, name: str) -> None:
    if not isinstance(value, dict):
        raise MeasurementEvidenceError(f"{name} must be an object")
    actual = set(value)
    if actual != expected:
        raise MeasurementEvidenceError(
            f"{name} keys are invalid; missing={sorted(expected - actual)}, "
            f"unknown={sorted(actual - expected)}"
        )


def _scan_unsafe_keys(value: Any, *, path: str = "root") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            lowered = str(key).lower()
            if any(fragment in lowered for fragment in _UNSAFE_KEY_FRAGMENTS):
                raise MeasurementEvidenceError(f"unsafe field at {path}.{key}")
            if any(behavior_key in lowered for behavior_key in BEHAVIOR_EVIDENCE_KEYS):
                raise MeasurementEvidenceError(f"behavior evidence is outside measurement at {path}.{key}")
            _scan_unsafe_keys(child, path=f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _scan_unsafe_keys(child, path=f"{path}[{index}]")
    elif isinstance(value, str) and _EMAIL_RE.search(value):
        raise MeasurementEvidenceError(f"direct identifier found at {path}")


def _as_nonnegative_int(value: Any, *, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise MeasurementEvidenceError(f"{name} must be a nonnegative integer")
    return value


def _as_safe_id(value: Any, *, name: str) -> str:
    if not isinstance(value, str) or not _SAFE_ID_RE.fullmatch(value):
        raise MeasurementEvidenceError(f"{name} must be a safe non-personal reference")
    if _EMAIL_RE.search(value):
        raise MeasurementEvidenceError(f"{name} must not contain an email")
    if _SSN_RE.search(value) or _PHONE_RE.search(value):
        raise MeasurementEvidenceError(f"{name} must not contain a direct identifier")
    if any(fragment in value.lower() for fragment in _UNSAFE_REFERENCE_FRAGMENTS):
        raise MeasurementEvidenceError(f"{name} must not contain a person-level reference")
    return value


def _as_sha256(value: Any, *, name: str) -> str:
    if not isinstance(value, str) or not _SHA256_RE.fullmatch(value):
        raise MeasurementEvidenceError(f"{name} must be lowercase sha256 hex")
    return value


def _as_date(value: Any, *, name: str) -> date:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise MeasurementEvidenceError(f"{name} must be a canonical ISO date")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise MeasurementEvidenceError(f"{name} must be a canonical ISO date") from exc
    if parsed.isoformat() != value:
        raise MeasurementEvidenceError(f"{name} must be a canonical ISO date")
    return parsed


@dataclass(frozen=True)
class ItemCategoryCounts:
    item_id: str
    category_counts: tuple[int, int, int, int, int]
    observed_count: int
    missing_count: int

    def to_dict(self) -> dict:
        return {
            "item_id": self.item_id,
            "category_counts": list(self.category_counts),
            "observed_count": self.observed_count,
            "missing_count": self.missing_count,
        }


@dataclass(frozen=True)
class PairCategoryCounts:
    left_item_id: str
    right_item_id: str
    cell_counts: tuple[tuple[int, int, int, int, int], ...]
    observed_pair_count: int
    missing_pair_count: int

    def to_dict(self) -> dict:
        return {
            "left_item_id": self.left_item_id,
            "right_item_id": self.right_item_id,
            "cell_counts": [list(row) for row in self.cell_counts],
            "observed_pair_count": self.observed_pair_count,
            "missing_pair_count": self.missing_pair_count,
        }


@dataclass(frozen=True)
class AggregateMeasurementWave:
    wave_id: str
    wave_role: str
    window_start: str
    window_end: str
    source_ref: str
    source_hash: str
    cohort_key: str
    eligible_population_count: int
    response_count: int
    owner_review_state: str
    privacy_review_state: str
    synthetic_scenario: str
    synthetic_generator_id: str
    synthetic_generator_version: str
    synthetic_generator_seed: int
    generator_binding_hash: str
    items: tuple[ItemCategoryCounts, ...]
    pairs: tuple[PairCategoryCounts, ...]
    schema_version: str = EVIDENCE_SCHEMA_VERSION
    form_id: str = LONG_FORM_ID
    manifest_hash: str = ""
    aggregate_only: bool = True
    person_level_data_present: bool = False
    behavior_evidence_present: bool = False
    synthetic_only: bool = True
    real_data_present: bool = False
    customer_data_present: bool = False
    production_data_present: bool = False
    live_data_source_present: bool = False

    def hash_body(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "form_id": self.form_id,
            "manifest_hash": self.manifest_hash,
            "wave_id": self.wave_id,
            "wave_role": self.wave_role,
            "window_start": self.window_start,
            "window_end": self.window_end,
            "source_ref": self.source_ref,
            "source_hash": self.source_hash,
            "cohort_key": self.cohort_key,
            "eligible_population_count": self.eligible_population_count,
            "response_count": self.response_count,
            "owner_review_state": self.owner_review_state,
            "privacy_review_state": self.privacy_review_state,
            "synthetic_scenario": self.synthetic_scenario,
            "synthetic_generator_id": self.synthetic_generator_id,
            "synthetic_generator_version": self.synthetic_generator_version,
            "synthetic_generator_seed": self.synthetic_generator_seed,
            "generator_binding_hash": self.generator_binding_hash,
            "aggregate_only": self.aggregate_only,
            "person_level_data_present": self.person_level_data_present,
            "behavior_evidence_present": self.behavior_evidence_present,
            "synthetic_only": self.synthetic_only,
            "real_data_present": self.real_data_present,
            "customer_data_present": self.customer_data_present,
            "production_data_present": self.production_data_present,
            "live_data_source_present": self.live_data_source_present,
            "items": [item.to_dict() for item in self.items],
            "pairs": [pair.to_dict() for pair in self.pairs],
        }

    def evidence_hash(self) -> str:
        return sha256_json(self.hash_body())

    def to_dict(self) -> dict:
        return {**self.hash_body(), "evidence_hash": self.evidence_hash()}


@dataclass(frozen=True)
class AggregateMeasurementPackage:
    package_id: str
    cohort_key: str
    waves: tuple[AggregateMeasurementWave, AggregateMeasurementWave]
    output_authorizations: Mapping[str, bool]
    schema_version: str = PACKAGE_SCHEMA_VERSION
    form_id: str = LONG_FORM_ID
    manifest_hash: str = ""
    aggregate_only: bool = True
    person_level_data_present: bool = False
    behavior_evidence_present: bool = False
    synthetic_only: bool = True
    real_data_present: bool = False
    customer_data_present: bool = False
    production_data_present: bool = False
    live_data_source_present: bool = False

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "output_authorizations",
            MappingProxyType(dict(self.output_authorizations)),
        )

    def hash_body(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "package_id": self.package_id,
            "form_id": self.form_id,
            "manifest_hash": self.manifest_hash,
            "cohort_key": self.cohort_key,
            "aggregate_only": self.aggregate_only,
            "person_level_data_present": self.person_level_data_present,
            "behavior_evidence_present": self.behavior_evidence_present,
            "synthetic_only": self.synthetic_only,
            "real_data_present": self.real_data_present,
            "customer_data_present": self.customer_data_present,
            "production_data_present": self.production_data_present,
            "live_data_source_present": self.live_data_source_present,
            "output_authorizations": dict(self.output_authorizations),
            "waves": [wave.to_dict() for wave in self.waves],
        }

    def package_hash(self) -> str:
        return sha256_json(self.hash_body())

    def to_dict(self) -> dict:
        return {**self.hash_body(), "package_hash": self.package_hash()}


def validate_measurement_wave(wave: AggregateMeasurementWave) -> None:
    if wave.schema_version != EVIDENCE_SCHEMA_VERSION:
        raise MeasurementEvidenceError("unsupported aggregate evidence schema")
    if wave.form_id != LONG_FORM_ID:
        raise MeasurementEvidenceError("only the exact 24-item long form is supported")
    if wave.manifest_hash != measurement_manifest_hash():
        raise MeasurementEvidenceError("measurement manifest hash mismatch")
    if wave.wave_role not in WAVE_ROLES:
        raise MeasurementEvidenceError("wave role must be baseline or formal_followup")
    _as_safe_id(wave.wave_id, name="wave_id")
    _as_safe_id(wave.source_ref, name="source_ref")
    _as_sha256(wave.source_hash, name="source_hash")
    _as_safe_id(wave.cohort_key, name="cohort_key")
    expected_wave_id = (
        "wave-baseline" if wave.wave_role == "baseline" else "wave-formal-followup"
    )
    if wave.wave_id != expected_wave_id or wave.cohort_key != SYNTHETIC_COHORT_KEY:
        raise MeasurementEvidenceError("wave synthetic identity is off-plan")
    start = _as_date(wave.window_start, name="window_start")
    end = _as_date(wave.window_end, name="window_end")
    if start > end:
        raise MeasurementEvidenceError("wave window must be ordered")
    eligible = _as_nonnegative_int(
        wave.eligible_population_count, name="eligible_population_count"
    )
    response_count = _as_nonnegative_int(wave.response_count, name="response_count")
    if response_count < AGGREGATE_OBSERVED_COUNT_FLOOR or eligible < response_count:
        raise MeasurementEvidenceError("wave does not pass the aggregate observed-count floor")
    if wave.owner_review_state != APPROVED_OWNER_REVIEW_STATE:
        raise MeasurementEvidenceError("wave owner review is not approved")
    if wave.privacy_review_state != APPROVED_PRIVACY_REVIEW_STATE:
        raise MeasurementEvidenceError("wave privacy review is not approved")
    if wave.synthetic_scenario not in APPROVED_SYNTHETIC_SCENARIOS:
        raise MeasurementEvidenceError("wave synthetic scenario is not approved")
    if (
        wave.synthetic_generator_id != APPROVED_SYNTHETIC_GENERATOR_ID
        or wave.synthetic_generator_version != APPROVED_SYNTHETIC_GENERATOR_VERSION
    ):
        raise MeasurementEvidenceError("wave synthetic generator identity is not approved")
    generator_seed = _as_nonnegative_int(
        wave.synthetic_generator_seed, name="synthetic_generator_seed"
    )
    expected_generator_binding_hash = sha256_json(
        {
            "generator_id": wave.synthetic_generator_id,
            "generator_version": wave.synthetic_generator_version,
            "scenario": wave.synthetic_scenario,
            "seed": generator_seed,
            "form_id": wave.form_id,
            "manifest_hash": wave.manifest_hash,
            "response_count": response_count,
        }
    )
    if wave.generator_binding_hash != expected_generator_binding_hash:
        raise MeasurementEvidenceError("wave synthetic generator binding hash mismatch")
    expected_source_ref = (
        f"synthetic://ai-fluency/{wave.synthetic_scenario}/"
        f"{wave.wave_role}/{generator_seed}"
    )
    if wave.source_ref != expected_source_ref:
        raise MeasurementEvidenceError("wave source ref is not bound to the synthetic generator")
    if (
        wave.aggregate_only is not True
        or wave.person_level_data_present is not False
        or wave.behavior_evidence_present is not False
        or wave.synthetic_only is not True
        or wave.real_data_present is not False
        or wave.customer_data_present is not False
        or wave.production_data_present is not False
        or wave.live_data_source_present is not False
    ):
        raise MeasurementEvidenceError("wave violates the synthetic aggregate-only boundary")

    expected_items = manifest_item_ids()
    if not isinstance(wave.items, tuple) or not isinstance(wave.pairs, tuple):
        raise MeasurementEvidenceError("wave aggregate grids must be immutable tuples")
    if tuple(item.item_id for item in wave.items) != expected_items:
        raise MeasurementEvidenceError("wave item grid is missing, duplicate, or off-plan")
    item_to_construct = manifest_item_to_construct()
    if len(item_to_construct) != len(wave.items):
        raise MeasurementEvidenceError("manifest item grid is invalid")
    for item in wave.items:
        if not isinstance(item.category_counts, tuple) or len(item.category_counts) != 5:
            raise MeasurementEvidenceError(f"{item.item_id} must have five category counts")
        counts = tuple(
            _as_nonnegative_int(value, name=f"{item.item_id}.category_count")
            for value in item.category_counts
        )
        observed = _as_nonnegative_int(item.observed_count, name=f"{item.item_id}.observed_count")
        missing = _as_nonnegative_int(item.missing_count, name=f"{item.item_id}.missing_count")
        if sum(counts) != observed or observed + missing != response_count:
            raise MeasurementEvidenceError(f"{item.item_id} counts do not reconcile")
        if observed < AGGREGATE_OBSERVED_COUNT_FLOOR:
            raise MeasurementEvidenceError(f"{item.item_id} is below the observed-count floor")

    expected_pairs = manifest_pair_ids()
    if tuple((pair.left_item_id, pair.right_item_id) for pair in wave.pairs) != expected_pairs:
        raise MeasurementEvidenceError("wave pair grid is missing, duplicate, or off-plan")
    for pair in wave.pairs:
        if (
            not isinstance(pair.cell_counts, tuple)
            or len(pair.cell_counts) != 5
            or any(not isinstance(row, tuple) or len(row) != 5 for row in pair.cell_counts)
        ):
            raise MeasurementEvidenceError("pair tables must be exactly 5x5")
        flattened = [
            _as_nonnegative_int(value, name="pair cell count")
            for row in pair.cell_counts
            for value in row
        ]
        observed = _as_nonnegative_int(pair.observed_pair_count, name="observed_pair_count")
        missing = _as_nonnegative_int(pair.missing_pair_count, name="missing_pair_count")
        if sum(flattened) != observed or observed + missing != response_count:
            raise MeasurementEvidenceError("pair counts do not reconcile")
        if observed < AGGREGATE_OBSERVED_COUNT_FLOOR:
            raise MeasurementEvidenceError("pair is below the observed-count floor")
        left_item = wave.items[expected_items.index(pair.left_item_id)]
        right_item = wave.items[expected_items.index(pair.right_item_id)]
        minimum_pair_overlap = (
            left_item.observed_count
            + right_item.observed_count
            - response_count
        )
        if observed < minimum_pair_overlap:
            raise MeasurementEvidenceError(
                "pair observed count violates the missingness overlap bound"
            )
        table = tuple(tuple(int(value) for value in row) for row in pair.cell_counts)
        row_margins = tuple(sum(row) for row in table)
        column_margins = tuple(sum(table[row][column] for row in range(5)) for column in range(5))
        if any(
            margin > category_count
            for margin, category_count in zip(row_margins, left_item.category_counts)
        ) or any(
            margin > category_count
            for margin, category_count in zip(column_margins, right_item.category_counts)
        ):
            raise MeasurementEvidenceError("pair margins exceed item category counts")
        if sum(left_item.category_counts) - sum(row_margins) != left_item.observed_count - observed:
            raise MeasurementEvidenceError("pair left margin does not reconcile to item missingness")
        if sum(right_item.category_counts) - sum(column_margins) != right_item.observed_count - observed:
            raise MeasurementEvidenceError("pair right margin does not reconcile to item missingness")

    aggregate_counts_hash = sha256_json(
        {
            "items": [item.to_dict() for item in wave.items],
            "pairs": [pair.to_dict() for pair in wave.pairs],
        }
    )
    expected_source_hash = sha256_json(
        {
            "generator_binding_hash": wave.generator_binding_hash,
            "wave_role": wave.wave_role,
            "aggregate_counts_hash": aggregate_counts_hash,
        }
    )
    if wave.source_hash != expected_source_hash:
        raise MeasurementEvidenceError("wave source hash does not bind aggregate counts")


def validate_measurement_package(package: AggregateMeasurementPackage) -> None:
    if package.schema_version != PACKAGE_SCHEMA_VERSION:
        raise MeasurementEvidenceError("unsupported measurement package schema")
    if package.form_id != LONG_FORM_ID:
        raise MeasurementEvidenceError("measurement package must use the long form")
    if package.manifest_hash != measurement_manifest_hash():
        raise MeasurementEvidenceError("package manifest hash mismatch")
    _as_safe_id(package.package_id, name="package_id")
    _as_safe_id(package.cohort_key, name="cohort_key")
    if (
        package.aggregate_only is not True
        or package.person_level_data_present is not False
        or package.behavior_evidence_present is not False
        or package.synthetic_only is not True
        or package.real_data_present is not False
        or package.customer_data_present is not False
        or package.production_data_present is not False
        or package.live_data_source_present is not False
    ):
        raise MeasurementEvidenceError("package violates the synthetic aggregate-only boundary")
    if package.output_authorizations != blocked_output_authorizations():
        raise MeasurementEvidenceError("all output authorizations must remain false")
    if not isinstance(package.waves, tuple) or len(package.waves) != 2:
        raise MeasurementEvidenceError("measurement package requires exactly two waves")
    if tuple(wave.wave_role for wave in package.waves) != WAVE_ROLES:
        raise MeasurementEvidenceError("measurement package requires baseline then formal follow-up")
    expected_package_id = (
        f"synthetic-measurement-{package.waves[0].synthetic_scenario}-"
        f"{package.waves[0].synthetic_generator_seed}"
    )
    if (
        package.package_id != expected_package_id
        or package.cohort_key != SYNTHETIC_COHORT_KEY
    ):
        raise MeasurementEvidenceError("package synthetic identity is off-plan")
    for wave in package.waves:
        validate_measurement_wave(wave)
        if wave.cohort_key != package.cohort_key:
            raise MeasurementEvidenceError("wave cohort does not match package cohort")
        if wave.form_id != package.form_id:
            raise MeasurementEvidenceError("wave form does not match package form")
    if package.waves[0].wave_id == package.waves[1].wave_id:
        raise MeasurementEvidenceError("baseline and follow-up wave ids must differ")
    baseline_end = _as_date(
        package.waves[0].window_end, name="baseline.window_end"
    )
    followup_start = _as_date(
        package.waves[1].window_start, name="formal_followup.window_start"
    )
    if baseline_end >= followup_start:
        raise MeasurementEvidenceError("formal waves must be ordered and non-overlapping")
    if (
        package.waves[0].synthetic_scenario
        != package.waves[1].synthetic_scenario
        or package.waves[0].synthetic_generator_seed
        != package.waves[1].synthetic_generator_seed
    ):
        raise MeasurementEvidenceError("package waves must share one synthetic scenario and seed")


def measurement_wave_from_dict(value: dict) -> AggregateMeasurementWave:
    _scan_unsafe_keys(value)
    _require_exact_keys(
        value,
        {
            "schema_version",
            "form_id",
            "manifest_hash",
            "wave_id",
            "wave_role",
            "window_start",
            "window_end",
            "source_ref",
            "source_hash",
            "cohort_key",
            "eligible_population_count",
            "response_count",
            "owner_review_state",
            "privacy_review_state",
            "synthetic_scenario",
            "synthetic_generator_id",
            "synthetic_generator_version",
            "synthetic_generator_seed",
            "generator_binding_hash",
            "aggregate_only",
            "person_level_data_present",
            "behavior_evidence_present",
            "synthetic_only",
            "real_data_present",
            "customer_data_present",
            "production_data_present",
            "live_data_source_present",
            "items",
            "pairs",
            "evidence_hash",
        },
        name="wave",
    )
    items: list[ItemCategoryCounts] = []
    for index, item in enumerate(value["items"]):
        _require_exact_keys(
            item,
            {"item_id", "category_counts", "observed_count", "missing_count"},
            name=f"item[{index}]",
        )
        counts = item["category_counts"]
        if not isinstance(counts, list) or len(counts) != 5:
            raise MeasurementEvidenceError("item category counts must be a five-value array")
        items.append(
            ItemCategoryCounts(
                item_id=item["item_id"],
                category_counts=tuple(counts),  # type: ignore[arg-type]
                observed_count=item["observed_count"],
                missing_count=item["missing_count"],
            )
        )
    pairs: list[PairCategoryCounts] = []
    for index, pair in enumerate(value["pairs"]):
        _require_exact_keys(
            pair,
            {
                "left_item_id",
                "right_item_id",
                "cell_counts",
                "observed_pair_count",
                "missing_pair_count",
            },
            name=f"pair[{index}]",
        )
        cells = pair["cell_counts"]
        if not isinstance(cells, list) or len(cells) != 5:
            raise MeasurementEvidenceError("pair cells must be a 5x5 array")
        pairs.append(
            PairCategoryCounts(
                left_item_id=pair["left_item_id"],
                right_item_id=pair["right_item_id"],
                cell_counts=tuple(tuple(row) for row in cells),
                observed_pair_count=pair["observed_pair_count"],
                missing_pair_count=pair["missing_pair_count"],
            )
        )
    wave = AggregateMeasurementWave(
        schema_version=value["schema_version"],
        form_id=value["form_id"],
        manifest_hash=value["manifest_hash"],
        wave_id=value["wave_id"],
        wave_role=value["wave_role"],
        window_start=value["window_start"],
        window_end=value["window_end"],
        source_ref=value["source_ref"],
        source_hash=value["source_hash"],
        cohort_key=value["cohort_key"],
        eligible_population_count=value["eligible_population_count"],
        response_count=value["response_count"],
        owner_review_state=value["owner_review_state"],
        privacy_review_state=value["privacy_review_state"],
        synthetic_scenario=value["synthetic_scenario"],
        synthetic_generator_id=value["synthetic_generator_id"],
        synthetic_generator_version=value["synthetic_generator_version"],
        synthetic_generator_seed=value["synthetic_generator_seed"],
        generator_binding_hash=value["generator_binding_hash"],
        aggregate_only=value["aggregate_only"],
        person_level_data_present=value["person_level_data_present"],
        behavior_evidence_present=value["behavior_evidence_present"],
        synthetic_only=value["synthetic_only"],
        real_data_present=value["real_data_present"],
        customer_data_present=value["customer_data_present"],
        production_data_present=value["production_data_present"],
        live_data_source_present=value["live_data_source_present"],
        items=tuple(items),
        pairs=tuple(pairs),
    )
    validate_measurement_wave(wave)
    if value["evidence_hash"] != wave.evidence_hash():
        raise MeasurementEvidenceError("wave evidence hash mismatch")
    return wave


def measurement_package_from_dict(value: dict) -> AggregateMeasurementPackage:
    _scan_unsafe_keys(value)
    _require_exact_keys(
        value,
        {
            "schema_version",
            "package_id",
            "form_id",
            "manifest_hash",
            "cohort_key",
            "aggregate_only",
            "person_level_data_present",
            "behavior_evidence_present",
            "synthetic_only",
            "real_data_present",
            "customer_data_present",
            "production_data_present",
            "live_data_source_present",
            "output_authorizations",
            "waves",
            "package_hash",
        },
        name="package",
    )
    if not isinstance(value["waves"], list) or len(value["waves"]) != 2:
        raise MeasurementEvidenceError("package waves must be a two-value array")
    package = AggregateMeasurementPackage(
        schema_version=value["schema_version"],
        package_id=value["package_id"],
        form_id=value["form_id"],
        manifest_hash=value["manifest_hash"],
        cohort_key=value["cohort_key"],
        aggregate_only=value["aggregate_only"],
        person_level_data_present=value["person_level_data_present"],
        behavior_evidence_present=value["behavior_evidence_present"],
        synthetic_only=value["synthetic_only"],
        real_data_present=value["real_data_present"],
        customer_data_present=value["customer_data_present"],
        production_data_present=value["production_data_present"],
        live_data_source_present=value["live_data_source_present"],
        output_authorizations=value["output_authorizations"],
        waves=tuple(measurement_wave_from_dict(wave) for wave in value["waves"]),  # type: ignore[arg-type]
    )
    validate_measurement_package(package)
    if value["package_hash"] != package.package_hash():
        raise MeasurementEvidenceError("measurement package hash mismatch")
    return package
