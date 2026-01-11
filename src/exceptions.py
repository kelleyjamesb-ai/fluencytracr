"""Custom exceptions for LearnAIR Engable Tool."""

from __future__ import annotations


class LearnAIRError(Exception):
    """Base exception for all LearnAIR errors."""

    pass


class ValidationError(LearnAIRError):
    """Raised when input validation fails."""

    pass


class NotFoundError(LearnAIRError):
    """Raised when a requested resource is not found."""

    pass


class AlreadyExistsError(LearnAIRError):
    """Raised when attempting to create a duplicate resource."""

    pass


class AccessDeniedError(LearnAIRError):
    """Raised when access control checks fail."""

    pass


class PrivacyViolationError(ValidationError):
    """Raised when data contract privacy rules are violated."""

    pass
