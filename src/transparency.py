"""Transparency report generation from live configuration."""

from __future__ import annotations

from dataclasses import dataclass

from src.data_contract import NON_COLLECTABLE_FIELDS


@dataclass(frozen=True)
class TransparencyConfig:
    collectable_fields: tuple[str, ...]
    enabled_integrations: tuple[str, ...]
    aggregation_rules: tuple[str, ...]


@dataclass(frozen=True)
class TransparencyReport:
    collectable_fields: tuple[str, ...]
    non_collectable_fields: tuple[str, ...]
    enabled_integrations: tuple[str, ...]
    aggregation_rules: tuple[str, ...]


def generate_transparency_report(config: TransparencyConfig) -> TransparencyReport:
    return TransparencyReport(
        collectable_fields=tuple(sorted(set(config.collectable_fields))),
        non_collectable_fields=tuple(sorted(NON_COLLECTABLE_FIELDS)),
        enabled_integrations=tuple(sorted(set(config.enabled_integrations))),
        aggregation_rules=tuple(config.aggregation_rules),
    )
