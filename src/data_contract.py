"""Data contract enforcement for non-collectable fields."""

from __future__ import annotations

from collections.abc import Iterable, Mapping

from src.exceptions import PrivacyViolationError


NON_COLLECTABLE_FIELDS = frozenset(
    {
        "prompt_content",
        "output_content",
        "keystrokes",
        "file_names",
        "message_text",
        "raw logs",
    }
)


def validate_schema_fields(fields: Iterable[str]) -> None:
    """Reject schemas that include any non-collectable fields."""
    prohibited = NON_COLLECTABLE_FIELDS.intersection(fields)
    if prohibited:
        raise PrivacyViolationError(
            "Schema includes non-collectable fields: "
            + ", ".join(sorted(prohibited))
        )


def _find_prohibited_fields(payload: object) -> set[str]:
    prohibited: set[str] = set()
    if isinstance(payload, Mapping):
        for key, value in payload.items():
            if isinstance(key, str) and key in NON_COLLECTABLE_FIELDS:
                prohibited.add(key)
            prohibited.update(_find_prohibited_fields(value))
    elif isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
        for item in payload:
            prohibited.update(_find_prohibited_fields(item))
    return prohibited


def validate_payload(payload: Mapping[str, object]) -> None:
    """Reject payloads containing non-collectable fields."""
    prohibited = _find_prohibited_fields(payload)
    if prohibited:
        raise PrivacyViolationError(
            "Payload includes non-collectable fields: "
            + ", ".join(sorted(prohibited))
        )
