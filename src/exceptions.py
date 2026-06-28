"""Custom exceptions for FluencyTracr."""

from __future__ import annotations


class FluencyTracrError(Exception):
    """Base exception for all FluencyTracr errors."""

    pass


class ValidationError(FluencyTracrError):
    """Raised when input validation fails."""

    pass


class NotFoundError(FluencyTracrError):
    """Raised when a requested resource is not found."""

    pass


class AlreadyExistsError(FluencyTracrError):
    """Raised when attempting to create a duplicate resource."""

    pass


class AccessDeniedError(FluencyTracrError):
    """Raised when access control checks fail."""

    pass


class PrivacyViolationError(ValidationError):
    """Raised when data contract privacy rules are violated."""

    pass
