"""
Tests for specialist agent artifact schemas (task 1.8).

These are pure-Python tests with no external dependency — the artifacts
module uses only stdlib dataclasses. They pass in any environment.
"""

from src.agents.artifacts import (
    BackendChangeSummary,
    QATestPlan,
    IntegrationWiringSummary,
    DevOpsReleaseArtifact,
    SecurityAssessment,
    ARTIFACT_REGISTRY,
)


class TestBackendChangeSummary:
    def test_defaults(self):
        a = BackendChangeSummary(task="Add /users endpoint")
        assert a.task == "Add /users endpoint"
        assert a.api_changes == []
        assert a.schema_changes == []
        assert a.error_handling_notes == []
        assert a.config_requirements == []
        assert a.test_areas == []
        assert a.raw_output == ""

    def test_populated(self):
        a = BackendChangeSummary(
            task="Add /users endpoint",
            api_changes=["POST /users"],
            schema_changes=["users: add email column"],
            error_handling_notes=["Return 409 on duplicate email"],
            test_areas=["happy path", "duplicate"],
        )
        assert "POST /users" in a.api_changes
        assert "409" in a.error_handling_notes[0]
        assert len(a.test_areas) == 2


class TestQATestPlan:
    def test_defaults(self):
        a = QATestPlan(task="Test login flow")
        assert a.verification_status == "NOT_RUN"
        assert a.test_cases == []
        assert a.risks == []

    def test_populated(self):
        a = QATestPlan(
            task="Test login flow",
            test_cases=["Valid credentials → 200", "Invalid password → 401"],
            edge_cases=["Expired token"],
            verification_status="PASS",
        )
        assert len(a.test_cases) == 2
        assert a.verification_status == "PASS"

    def test_verification_status_values(self):
        for status in ("NOT_RUN", "PASS", "FAIL", "PARTIAL"):
            a = QATestPlan(task="t", verification_status=status)
            assert a.verification_status == status


class TestIntegrationWiringSummary:
    def test_defaults(self):
        a = IntegrationWiringSummary(task="Wire GitHub MCP")
        assert a.config_changes == []
        assert a.affected_tools == []
        assert a.credential_flags == []
        assert a.validation_steps == []

    def test_populated(self):
        a = IntegrationWiringSummary(
            task="Wire GitHub MCP",
            config_changes=["mcp_servers.json: add github"],
            credential_flags=["GITHUB_TOKEN required"],
        )
        assert "GITHUB_TOKEN required" in a.credential_flags


class TestDevOpsReleaseArtifact:
    def test_defaults(self):
        a = DevOpsReleaseArtifact(task="Update CI")
        assert a.pipeline_changes == []
        assert a.rollback_steps == []
        assert a.release_note == ""

    def test_populated(self):
        a = DevOpsReleaseArtifact(
            task="Update CI",
            pipeline_changes=["Add lint gate"],
            rollback_steps=["Revert workflow YAML"],
            release_note="v1.2.0 — adds lint gate",
        )
        assert "lint" in a.release_note
        assert len(a.rollback_steps) == 1


class TestSecurityAssessment:
    def test_defaults(self):
        a = SecurityAssessment(task="Threat model auth")
        assert a.threats == []
        assert a.mitigations == []
        assert a.follow_ups == []
        assert a.secrets_requirements == []
        assert a.assumptions == []

    def test_populated(self):
        a = SecurityAssessment(
            task="Threat model auth",
            threats=["JWT token leakage via logs"],
            mitigations=["Scrub tokens from logs"],
            secrets_requirements=["JWT_SECRET >= 256 bits"],
        )
        assert len(a.threats) == 1
        assert "256 bits" in a.secrets_requirements[0]


class TestArtifactRegistry:
    def test_all_specialist_roles_present(self):
        for role in ("backend", "qa", "integration", "devops", "security"):
            assert role in ARTIFACT_REGISTRY, f"Missing artifact type for '{role}'"

    def test_instantiation_with_task_only(self):
        for role, cls in ARTIFACT_REGISTRY.items():
            instance = cls(task=f"task for {role}")
            assert instance.task == f"task for {role}"
            assert hasattr(instance, "raw_output")
            assert instance.raw_output == ""

    def test_no_cross_contamination_between_instances(self):
        """Mutable default fields must not share state between instances."""
        a1 = BackendChangeSummary(task="task1")
        a2 = BackendChangeSummary(task="task2")
        a1.api_changes.append("GET /foo")
        assert a2.api_changes == [], "Default list fields must not be shared"
