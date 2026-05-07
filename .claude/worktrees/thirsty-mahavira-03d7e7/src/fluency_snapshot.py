"""Daily fluency snapshot generation and storage."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from src.fluency import DimensionScores, FluencyInputs, FluencyWeights, normalize_dimension_scores, weighted_fluency_score


@dataclass(frozen=True)
class FluencySnapshot:
    org_id: str
    day: date
    score: float
    dimensions: DimensionScores
    inputs: FluencyInputs
    data_complete: bool


@dataclass
class FluencySnapshotStore:
    snapshots: list[FluencySnapshot] = field(default_factory=list)
    by_org: dict[str, list[FluencySnapshot]] = field(default_factory=dict)

    def add(self, snapshot: FluencySnapshot) -> None:
        self.snapshots.append(snapshot)
        self.by_org.setdefault(snapshot.org_id, []).append(snapshot)

    def list_by_org(self, org_id: str) -> list[FluencySnapshot]:
        return list(self.by_org.get(org_id, []))


def generate_daily_snapshot(
    *,
    org_id: str,
    day: date,
    inputs: FluencyInputs,
    data_complete: bool,
    weights: FluencyWeights | None = None,
    store: FluencySnapshotStore,
) -> FluencySnapshot:
    weights = weights or FluencyWeights()
    dimensions = normalize_dimension_scores(inputs)
    score = weighted_fluency_score(dimensions, weights)
    snapshot = FluencySnapshot(
        org_id=org_id,
        day=day,
        score=score,
        dimensions=dimensions,
        inputs=inputs,
        data_complete=data_complete,
    )
    store.add(snapshot)
    return snapshot
