"""
Core data models for FluencyTracr Harness
Following Anthropic's long-running agent pattern
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class StepStatus(Enum):
    """Status of individual analysis steps"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_HUMAN = "requires_human"


class BatchStatus(Enum):
    """Overall batch status"""
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AnalysisStep:
    """
    Single step in the analysis pipeline

    Key pattern from Anthropic:
    - Discrete: Each step is independent
    - Resumable: Can restart from any step
    - Observable: Complete logging of state
    """
    step_id: str
    step_type: str  # "pattern_detection" | "contextualization" | "trend_analysis" | "report_generation"
    status: StepStatus
    attempts: int = 0
    max_attempts: int = 3
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tokens_used: Dict[str, int] = field(default_factory=lambda: {"input": 0, "output": 0})
    cost_usd: float = 0.0

    def mark_started(self):
        """Mark step as in progress"""
        self.status = StepStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
        self.attempts += 1

    def mark_completed(self, result: Dict[str, Any], tokens: Dict[str, int], cost: float):
        """Mark step as successfully completed"""
        self.status = StepStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.result = result
        self.tokens_used = tokens
        self.cost_usd = cost

    def mark_failed(self, error: str):
        """Mark step as failed"""
        self.status = StepStatus.FAILED
        self.error = error
        self.completed_at = datetime.now(timezone.utc)

    def mark_requires_human(self, reason: str):
        """Mark step as requiring human intervention"""
        self.status = StepStatus.REQUIRES_HUMAN
        self.error = reason

    def can_retry(self) -> bool:
        """Check if step can be retried"""
        return self.attempts < self.max_attempts

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage"""
        return {
            "step_id": self.step_id,
            "step_type": self.step_type,
            "status": self.status.value,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
            "result": self.result,
            "error": self.error,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "tokens_used": self.tokens_used,
            "cost_usd": self.cost_usd
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AnalysisStep':
        """Deserialize from dictionary"""
        return cls(
            step_id=data["step_id"],
            step_type=data["step_type"],
            status=StepStatus(data["status"]),
            attempts=data["attempts"],
            max_attempts=data["max_attempts"],
            result=data["result"],
            error=data["error"],
            started_at=datetime.fromisoformat(data["started_at"]) if data["started_at"] else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data["completed_at"] else None,
            tokens_used=data["tokens_used"],
            cost_usd=data["cost_usd"]
        )


@dataclass
class AnalysisBatch:
    """
    Complete batch state

    Key pattern from Anthropic:
    - Comprehensive state tracking
    - Persists between steps
    - Recoverable from any point
    """
    batch_id: str
    org_id: str
    bucket_start: str  # ISO 8601 week start
    status: BatchStatus

    # Input data
    signal_aggregates: List[Dict[str, Any]]
    context: Dict[str, Any] = field(default_factory=dict)

    # Pipeline
    steps: List[AnalysisStep] = field(default_factory=list)
    current_step_index: int = 0

    # Human interaction
    approval_requests: List[Dict[str, Any]] = field(default_factory=list)
    clarification_requests: List[Dict[str, Any]] = field(default_factory=list)

    # Results
    final_report: Optional[Dict[str, Any]] = None

    # Metadata
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    total_cost_usd: float = 0.0
    total_tokens: Dict[str, int] = field(default_factory=lambda: {"input": 0, "output": 0})

    def get_current_step(self) -> Optional[AnalysisStep]:
        """Get the currently executing step"""
        if self.current_step_index < len(self.steps):
            return self.steps[self.current_step_index]
        return None

    def advance_step(self):
        """Move to next step in pipeline"""
        self.current_step_index += 1
        self.updated_at = datetime.now(timezone.utc)

    def is_complete(self) -> bool:
        """Check if all steps are complete"""
        return self.current_step_index >= len(self.steps)

    def accumulate_cost(self, cost: float, tokens: Dict[str, int]):
        """Accumulate costs and tokens from step"""
        self.total_cost_usd += cost
        self.total_tokens["input"] += tokens.get("input", 0)
        self.total_tokens["output"] += tokens.get("output", 0)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage"""
        return {
            "batch_id": self.batch_id,
            "org_id": self.org_id,
            "bucket_start": self.bucket_start,
            "status": self.status.value,
            "signal_aggregates": self.signal_aggregates,
            "context": self.context,
            "steps": [step.to_dict() for step in self.steps],
            "current_step_index": self.current_step_index,
            "approval_requests": self.approval_requests,
            "clarification_requests": self.clarification_requests,
            "final_report": self.final_report,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "total_cost_usd": self.total_cost_usd,
            "total_tokens": self.total_tokens
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AnalysisBatch':
        """Deserialize from dictionary"""
        return cls(
            batch_id=data["batch_id"],
            org_id=data["org_id"],
            bucket_start=data["bucket_start"],
            status=BatchStatus(data["status"]),
            signal_aggregates=data["signal_aggregates"],
            context=data["context"],
            steps=[AnalysisStep.from_dict(s) for s in data["steps"]],
            current_step_index=data["current_step_index"],
            approval_requests=data["approval_requests"],
            clarification_requests=data["clarification_requests"],
            final_report=data["final_report"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            total_cost_usd=data["total_cost_usd"],
            total_tokens=data["total_tokens"]
        )


@dataclass
class AdoptionClassification:
    """Adoption level classification from normalizer"""
    level: str  # "low" | "medium" | "high" | "saturated"
    penetration: float  # 0.0 to 1.0
    penetration_pct: float  # 0.0 to 100.0
    segment: str
    group_size: int
    interpretation: str
    statistical_note: str

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for JSON output"""
        return {
            "level": self.level,
            "penetration": self.penetration,
            "penetration_pct": self.penetration_pct,
            "segment": self.segment,
            "group_size": self.group_size,
            "interpretation": self.interpretation,
            "statistical_note": self.statistical_note
        }
