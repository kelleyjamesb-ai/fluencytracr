# Change: Add QA, Backend, Integration, DevOps, and Security Agents

## Why
Teams need dedicated QA/testing, backend engineering, integration/MCP, DevOps/release, and security specialists to collaborate through the swarm, producing reliable implementations with explicit test coverage and verification.

## What Changes
- Add five specialist agents: `qa`, `backend`, `integration`, `devops`, and `security` with focused prompts and responsibilities.
- Extend router delegation rules to route testing, backend, integration, DevOps, and security tasks to the correct agent.
- Define artifact outputs for QA/test plans/results, backend change summaries, integration wiring, DevOps release notes, and security reviews.

## Impact
- Affected specs: `agents`
- Affected code: `src/agents/`, `src/swarm.py`, `src/agents/router_agent.py`, `tests/`, `mcp_servers.json`
