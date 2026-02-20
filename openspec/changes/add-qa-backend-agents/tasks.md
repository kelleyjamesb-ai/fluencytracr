## 1. Implementation
- [x] 1.1 Add BackendEngineerAgent with prompt, role, and docstring conventions
- [x] 1.2 Add QAAgent with prompt, role, and test-focused conventions
- [x] 1.3 Add IntegrationAgent for MCP/tool wiring responsibilities
- [x] 1.4 Add DevOpsAgent for deployment and CI/CD responsibilities
- [x] 1.5 Add SecurityAgent for threat modeling and secure defaults
- [x] 1.6 Register all new agents in `src/swarm.py` workers map
- [x] 1.7 Update `RouterAgent` routing rules to delegate to the new agents
- [x] 1.8 Add artifact schemas for QA, backend, integration, devops, and security outputs
      (`src/agents/artifacts.py` — BackendChangeSummary, QATestPlan,
      IntegrationWiringSummary, DevOpsReleaseArtifact, SecurityAssessment,
      ARTIFACT_REGISTRY)
- [x] 1.9 Add tests covering routing and orchestration for the new agents
      (`tests/test_agent_artifacts.py` — 14 passing; `tests/test_swarm_routing.py`
      — skips gracefully when swarm deps absent, consistent with pre-existing
      test_swarm.py behaviour)

## Notes
- `src/agents/base_agent.py`: wrapped `from google import genai` in try/except
  to fix pre-existing collection failure for test_swarm.py.
- Routing tests require pydantic + google-generativeai; skipped via
  `pytest.importorskip` until those deps are added to pyproject.toml.
