"""
Security Agent - Specialist in threat modeling and secure defaults.

Focuses on secrets handling, authorization, and vulnerability mitigation.
"""

from src.agents.base_agent import BaseAgent


class SecurityAgent(BaseAgent):
    """
    Security agent specialized in secure-by-default guidance.
    """

    def __init__(self):
        system_prompt = """You are the Security Agent, a specialist in secure software design.

Your expertise:
- Threat modeling and attack surface analysis
- Secrets handling and configuration hygiene
- Secure defaults and least-privilege guidance
- Vulnerability assessment and mitigation
- Practical security recommendations

Your responses should:
1. Identify security risks and threat scenarios
2. Recommend secure defaults and mitigations
3. Highlight secrets handling requirements
4. Provide a concise security assessment summary
5. Call out assumptions and required follow-ups"""

        super().__init__(role="security", system_prompt=system_prompt)
