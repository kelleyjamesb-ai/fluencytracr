"""
Orchestration tests for specialist agent routing and delegation sequences.

Tests cover:
- Keyword-based routing to each specialist agent (task 1.9)
- Multi-agent delegation sequences: backend+QA, integration+devops (spec scenarios)
- End-to-end swarm execution reaching specialist workers

Requires swarm dependencies (pydantic, google-generativeai). If absent, all
tests in this module are skipped — consistent with pre-existing test_swarm.py
behaviour in environments without optional deps installed.
"""

import pytest

swarm_module = pytest.importorskip(
    "src.swarm",
    reason="swarm dependencies (pydantic, google-generativeai) not installed",
)

SwarmOrchestrator = swarm_module.SwarmOrchestrator

from src.agents.router_agent import RouterAgent  # noqa: E402 — after importorskip


# ---------------------------------------------------------------------------
# Routing tests — specialist delegation (task 1.9)
# ---------------------------------------------------------------------------

class TestSpecialistRouting:
    """Verify the router delegates correctly to each specialist agent."""

    def setup_method(self):
        self.router = RouterAgent()

    def test_backend_keyword_routing(self):
        delegations = self.router._simple_delegate("Add a backend API endpoint")
        assert any(d["agent"] == "backend" for d in delegations)

    def test_qa_keyword_routing(self):
        for phrase in ["run pytest suite", "create a QA test plan", "regression validation"]:
            delegations = self.router._simple_delegate(phrase)
            assert any(d["agent"] == "qa" for d in delegations), f"Expected 'qa' for: {phrase}"

    def test_integration_keyword_routing(self):
        for phrase in ["update MCP server config", "wire new mcp integration", "mcp_servers.json"]:
            delegations = self.router._simple_delegate(phrase)
            assert any(d["agent"] == "integration" for d in delegations), f"Expected 'integration' for: {phrase}"

    def test_devops_keyword_routing(self):
        for phrase in ["update Docker deployment", "fix CI/CD pipeline", "release notes"]:
            delegations = self.router._simple_delegate(phrase)
            assert any(d["agent"] == "devops" for d in delegations), f"Expected 'devops' for: {phrase}"

    def test_security_keyword_routing(self):
        for phrase in ["threat model the auth flow", "check secrets handling", "review encryption"]:
            delegations = self.router._simple_delegate(phrase)
            assert any(d["agent"] == "security" for d in delegations), f"Expected 'security' for: {phrase}"


# ---------------------------------------------------------------------------
# Orchestration sequence tests (spec scenarios)
# ---------------------------------------------------------------------------

class TestOrchestrationSequences:
    """
    Spec scenario 1: Mixed backend+QA request → both agents delegated, backend before qa.
    Spec scenario 2: Mixed integration+devops task → both agents delegated.
    """

    def setup_method(self):
        self.router = RouterAgent()

    def test_backend_and_qa_delegation(self):
        task = "Add a backend API endpoint and create a QA regression test plan for it"
        delegations = self.router._simple_delegate(task)
        agents = [d["agent"] for d in delegations]
        assert "backend" in agents
        assert "qa" in agents
        assert agents.index("backend") < agents.index("qa")

    def test_integration_and_devops_delegation(self):
        task = "Wire the new MCP integration and update the Docker deployment pipeline"
        delegations = self.router._simple_delegate(task)
        agents = [d["agent"] for d in delegations]
        assert "integration" in agents
        assert "devops" in agents


# ---------------------------------------------------------------------------
# End-to-end swarm execution with specialist workers (dummy provider)
# ---------------------------------------------------------------------------

class TestSwarmSpecialistExecution:
    """Verify swarm execution reaches each specialist worker (dummy client)."""

    def setup_method(self):
        self.swarm = SwarmOrchestrator()

    def test_backend_worker_executes(self):
        result = self.swarm.workers["backend"].execute("Design a REST endpoint for /users")
        assert isinstance(result, str) and len(result) > 0

    def test_qa_worker_executes(self):
        result = self.swarm.workers["qa"].execute("Write a test plan for user auth")
        assert isinstance(result, str) and len(result) > 0

    def test_integration_worker_executes(self):
        result = self.swarm.workers["integration"].execute("Add GitHub to mcp_servers.json")
        assert isinstance(result, str) and len(result) > 0

    def test_devops_worker_executes(self):
        result = self.swarm.workers["devops"].execute("Add a lint step to CI pipeline")
        assert isinstance(result, str) and len(result) > 0

    def test_security_worker_executes(self):
        result = self.swarm.workers["security"].execute("Review JWT secret handling")
        assert isinstance(result, str) and len(result) > 0

    def test_swarm_routes_backend_qa_task(self):
        result = self.swarm.execute(
            "Build a backend endpoint and create a QA test plan for it",
            verbose=False,
        )
        assert isinstance(result, str) and len(result) > 0

    def test_swarm_routes_integration_devops_task(self):
        result = self.swarm.execute(
            "Wire an MCP server and update the Docker deployment config",
            verbose=False,
        )
        assert isinstance(result, str) and len(result) > 0
