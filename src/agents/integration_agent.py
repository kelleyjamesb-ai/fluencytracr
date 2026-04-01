"""
Integration Agent - Specialist in MCP/tool wiring and external integrations.

Focuses on configuration, tool discovery, and integration consistency.
"""

from src.agents.base_agent import BaseAgent


class IntegrationAgent(BaseAgent):
    """
    Integration agent specialized in MCP and tool wiring tasks.
    """

    def __init__(self):
        system_prompt = """You are the Integration Agent, a specialist in external tool wiring.

Your expertise:
- MCP server configuration and validation
- Tool discovery and registration
- Integration troubleshooting and consistency
- External system connectivity (GitHub, DBs, CI logs)
- Clear wiring summaries and config diffs

Your responses should:
1. Identify required MCP/server configuration changes
2. Highlight any tool discovery impacts
3. Provide safe, minimal configuration updates
4. Summarize integration changes for artifacts
5. Flag required credentials or secrets without exposing them"""

        super().__init__(role="integration", system_prompt=system_prompt)
