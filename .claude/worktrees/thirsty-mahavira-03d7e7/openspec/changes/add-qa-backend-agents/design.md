## Context
The swarm currently supports router, coder, reviewer, and researcher agents. New work often needs explicit QA/test coverage, backend implementation ownership, integration/MCP wiring, DevOps/release coordination, and security review, which are not well captured by the current roles.

## Goals / Non-Goals
- Goals: Add QA, backend, integration/MCP, DevOps/release, and security specialist agents; enable router to delegate tasks correctly; define expected artifacts for each role.
- Non-Goals: Redesign the memory system, change LLM providers, or modify MCP tool discovery.

## Decisions
- Decision: Create five new agents (`qa`, `backend`, `integration`, `devops`, `security`) with explicit system prompts and responsibilities.
- Decision: Extend router delegation with keyword and plan-based routing to include the new agents.
- Decision: Document artifacts to standardize outputs (`artifacts/qa/`, `artifacts/backend/`, `artifacts/integration/`, `artifacts/devops/`, `artifacts/security/`).

## Risks / Trade-offs
- Risk: Ambiguous tasks could be routed incorrectly. Mitigation: clear keyword rules and fallback behavior.
- Risk: Additional agents increase orchestration latency. Mitigation: keep prompts concise and delegate only when relevant.

## Migration Plan
1. Add new agent classes.
2. Register agents in the swarm orchestrator.
3. Update routing logic and tests.
4. Update documentation for artifact expectations.

## Open Questions
- Should QA agent be able to execute tests or only propose them?
- Should backend agent own schema migrations and deployment notes?
- Should integration agent be allowed to modify `mcp_servers.json` directly?
- Should devops agent be allowed to modify `docker-compose.yml` and infra configs?
- Should security agent create threat models as artifacts or inline?
