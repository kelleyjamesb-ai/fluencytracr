"""
Artifact schemas for specialist agent outputs.

Each specialist agent produces a typed artifact summarising its work.
These schemas define the expected structure for agent outputs so that
orchestration consumers can validate and render results consistently.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class BackendChangeSummary:
    """
    Artifact produced by BackendEngineerAgent.

    Summarises API/service changes, schema migrations, error handling
    notes, and configuration requirements from one backend task.
    """
    task: str
    api_changes: List[str] = field(default_factory=list)
    schema_changes: List[str] = field(default_factory=list)
    error_handling_notes: List[str] = field(default_factory=list)
    config_requirements: List[str] = field(default_factory=list)
    test_areas: List[str] = field(default_factory=list)
    raw_output: str = ""


@dataclass
class QATestPlan:
    """
    Artifact produced by QAAgent for a test planning or verification request.

    Contains test cases with steps and expected results, risk notes, and
    a high-level verification status derived from evidence.
    """
    task: str
    test_cases: List[str] = field(default_factory=list)
    edge_cases: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    verification_status: str = "NOT_RUN"  # NOT_RUN | PASS | FAIL | PARTIAL
    raw_output: str = ""


@dataclass
class IntegrationWiringSummary:
    """
    Artifact produced by IntegrationAgent for MCP/tool-wiring tasks.

    Documents configuration changes, affected tools, credential
    requirements, and a minimal config diff summary.
    """
    task: str
    config_changes: List[str] = field(default_factory=list)
    affected_tools: List[str] = field(default_factory=list)
    credential_flags: List[str] = field(default_factory=list)
    validation_steps: List[str] = field(default_factory=list)
    raw_output: str = ""


@dataclass
class DevOpsReleaseArtifact:
    """
    Artifact produced by DevOpsAgent for deployment and CI/CD tasks.

    Captures pipeline changes, rollback guidance, operational risks,
    and a human-readable release note entry.
    """
    task: str
    pipeline_changes: List[str] = field(default_factory=list)
    rollback_steps: List[str] = field(default_factory=list)
    operational_risks: List[str] = field(default_factory=list)
    release_note: str = ""
    raw_output: str = ""


@dataclass
class SecurityAssessment:
    """
    Artifact produced by SecurityAgent for security review or threat modelling.

    Lists identified threats, recommended mitigations, secrets-handling
    requirements, and outstanding follow-up items.
    """
    task: str
    threats: List[str] = field(default_factory=list)
    mitigations: List[str] = field(default_factory=list)
    secrets_requirements: List[str] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)
    follow_ups: List[str] = field(default_factory=list)
    raw_output: str = ""


# Registry mapping agent role name → expected artifact type
ARTIFACT_REGISTRY: dict = {
    "backend":     BackendChangeSummary,
    "qa":          QATestPlan,
    "integration": IntegrationWiringSummary,
    "devops":      DevOpsReleaseArtifact,
    "security":    SecurityAssessment,
}
