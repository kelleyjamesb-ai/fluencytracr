"""Fluency scoring service for executive command center."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable

from src.enablement_import import EnablementStore
from src.events import EnablementEvent
from src.passive_signals import PassiveSignalStore, SignalEvent, is_shadow_ai_signal
from src.teams_roles import Directory


MIN_GROUP_SIZE = 3
TRAILING_DAYS = 14
TRAINING_EVENT_TYPES = {"workshop"}


@dataclass(frozen=True)
class TeamFluencyScore:
    org_id: str
    team_id: str
    team_name: str
    member_count: int
    coverage: float | None
    depth: float | None
    judgment: float | None
    velocity: float | None
    fluency_index: float | None


@dataclass(frozen=True)
class ExecutiveHeatMap:
    org_id: str
    org_index: float | None
    team_deltas: list[dict[str, object]]


def suppress_metric(value: float, member_count: int) -> float | None:
    if member_count < MIN_GROUP_SIZE:
        return None
    return value


def _normalize_rate(value: int, member_count: int) -> float:
    if member_count <= 0:
        return 0.0
    return min(1.0, value / member_count)


def _coverage_score(events: Iterable[EnablementEvent], member_count: int) -> float:
    return _normalize_rate(len(list(events)), member_count)


def _depth_score(signals: Iterable[SignalEvent], member_count: int) -> float:
    return _normalize_rate(len(list(signals)), member_count)


def _privacy_score(signals: Iterable[SignalEvent], approved_ai_list: set[str]) -> float:
    signal_list = list(signals)
    if not signal_list:
        return 1.0
    shadow_count = sum(1 for signal in signal_list if is_shadow_ai_signal(signal, approved_ai_list))
    return max(0.0, 1.0 - (shadow_count / len(signal_list)))


def _velocity_score(
    events: Iterable[EnablementEvent],
    signals: Iterable[SignalEvent],
    member_count: int,
    *,
    reference_time: datetime,
) -> float:
    training_events = [event for event in events if event.event_type in TRAINING_EVENT_TYPES]
    if not training_events:
        return 0.0
    window_start = reference_time - timedelta(days=TRAILING_DAYS)
    signal_count = sum(1 for signal in signals if window_start <= signal.occurred_at <= reference_time)
    return _normalize_rate(signal_count, member_count)


def _fluency_index(coverage: float, depth: float, judgment: float, velocity: float) -> float:
    return round(
        0.20 * coverage
        + 0.40 * depth
        + 0.25 * judgment
        + 0.15 * velocity,
        4,
    )


def _team_ids_for_org(org_id: str, passive_store: PassiveSignalStore, enablement_store: EnablementStore) -> set[str]:
    team_ids = {
        event.team_id
        for event in enablement_store.by_org.get(org_id, [])
        if event.team_id
    }
    team_ids.update(
        signal.team_id
        for signal in passive_store.by_org.get(org_id, [])
        if signal.team_id
    )
    return team_ids


def compute_team_scores(
    org_id: str,
    *,
    directory: Directory,
    passive_store: PassiveSignalStore,
    enablement_store: EnablementStore,
    approved_ai_list: Iterable[str],
    reference_time: datetime | None = None,
) -> list[TeamFluencyScore]:
    reference_time = reference_time or datetime.now(tz=timezone.utc)
    approved = set(approved_ai_list)
    team_sizes = directory.team_member_counts()
    team_names = {team.team_id: team.name for team in directory.list_teams()}
    scores: list[TeamFluencyScore] = []

    for team_id in sorted(_team_ids_for_org(org_id, passive_store, enablement_store)):
        member_count = team_sizes.get(team_id, 0)
        events = enablement_store.by_team.get(team_id, [])
        signals = passive_store.by_team.get(team_id, [])
        coverage = _coverage_score(events, member_count)
        depth = _depth_score(signals, member_count)
        judgment = _privacy_score(signals, approved)
        velocity = _velocity_score(
            events,
            signals,
            member_count,
            reference_time=reference_time,
        )
        fluency_index = _fluency_index(coverage, depth, judgment, velocity)

        suppressed_index = suppress_metric(fluency_index, member_count)
        scores.append(
            TeamFluencyScore(
                org_id=org_id,
                team_id=team_id,
                team_name=team_names.get(team_id, team_id),
                member_count=member_count,
                coverage=suppress_metric(coverage, member_count),
                depth=suppress_metric(depth, member_count),
                judgment=suppress_metric(judgment, member_count),
                velocity=suppress_metric(velocity, member_count),
                fluency_index=suppressed_index,
            )
        )

    return scores


def build_executive_heat_map(
    org_id: str,
    *,
    directory: Directory,
    passive_store: PassiveSignalStore,
    enablement_store: EnablementStore,
    approved_ai_list: Iterable[str],
    reference_time: datetime | None = None,
) -> ExecutiveHeatMap:
    scores = compute_team_scores(
        org_id,
        directory=directory,
        passive_store=passive_store,
        enablement_store=enablement_store,
        approved_ai_list=approved_ai_list,
        reference_time=reference_time,
    )
    weighted: list[tuple[int, float]] = [
        (score.member_count, score.fluency_index)
        for score in scores
        if score.fluency_index is not None
    ]
    if weighted:
        total_members = sum(weight for weight, _ in weighted)
        org_index = round(
            sum(weight * value for weight, value in weighted) / total_members,
            4,
        )
    else:
        org_index = None

    team_deltas: list[dict[str, object]] = []
    for score in scores:
        delta_percent: float | None
        if org_index is None or score.fluency_index is None:
            delta_percent = None
        else:
            delta_percent = round((score.fluency_index - org_index) * 100, 2)
        label = None
        if delta_percent is not None:
            sign = "+" if delta_percent >= 0 else ""
            label = f"{score.team_name} {sign}{delta_percent}%"
        team_deltas.append(
            {
                "team_id": score.team_id,
                "team_name": score.team_name,
                "delta_percent": delta_percent,
                "delta_label": label,
            }
        )

    return ExecutiveHeatMap(org_id=org_id, org_index=org_index, team_deltas=team_deltas)
