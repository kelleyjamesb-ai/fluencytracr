"""
Base Agent class for all specialist agents in the swarm.

Provides common functionality for agent execution, context management,
and communication with the Gemini API.
"""

import os
from typing import Any, Dict, List, Optional
from google import genai
from src.config import settings


class BaseAgent:
    """
    Base class for all agents in the swarm.
    
    Each agent has a specific role and system prompt that defines its specialty.
    All agents share common execution logic but differ in their prompts and tools.
    """
    
    def __init__(self, role: str, system_prompt: str):
        """
        Initialize a base agent.
        
        Args:
            role: The agent's role identifier (e.g., "coder", "reviewer").
            system_prompt: The system prompt defining the agent's behavior.
        """
        self.role = role
        self.system_prompt = system_prompt
        self.conversation_history: List[Dict[str, str]] = []
        self.provider = "unknown"
        
        # Initialize Client based on available keys
        running_under_pytest = "PYTEST_CURRENT_TEST" in os.environ
        
        if running_under_pytest:
            self._init_dummy_client(role)
            return

        # Priority 1: Google Gemini
        if settings.GOOGLE_API_KEY:
            try:
                self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
                self.provider = "google"
                return
            except Exception as e:
                print(f"⚠️ {role} agent: Google client failed: {e}")

        # Priority 2: Anthropic (Claude)
        if hasattr(settings, "ANTHROPIC_API_KEY") and settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                self.provider = "anthropic"
                return
            except ImportError:
                 print(f"⚠️ {role} agent: Anthropic key found but 'anthropic' package not installed.")
            except Exception as e:
                 print(f"⚠️ {role} agent: Anthropic client failed: {e}")

        # Priority 3: OpenAI
        if hasattr(settings, "OPENAI_API_KEY") and settings.OPENAI_API_KEY:
            # We use the existing openai_proxy tool for OpenAI calls
            self.provider = "openai"
            self.client = None # execution handled in execute()
            return
            
        # Fallback
        print(f"⚠️ {role} agent: No valid API keys found. Using dummy client.")
        self._init_dummy_client(role)

    def _init_dummy_client(self, role):
        class _DummyClient:
            class _Models:
                def generate_content(self, model, contents):
                    class _R:
                        text = f"[{role}] Task completed (Dummy)"
                    return _R()
            # For Anthropic dummy
            class _Messages:
                def create(self, **kwargs):
                    class _R:
                        content = [type("Obj", (object,), {"text": f"[{role}] Task completed (Dummy)"})]
                    return _R()
            
            def __init__(self):
                self.models = self._Models()
                self.messages = self._Messages()
                
        self.client = _DummyClient()
        self.provider = "dummy"
    
    def execute(self, task: str, context: Optional[List[Dict[str, str]]] = None) -> str:
        """
        Execute a task with optional context from other agents.
        
        Args:
            task: The task description to execute.
            context: Optional list of previous messages from other agents.
            
        Returns:
            The agent's response as a string.
        """
        # Build the full prompt
        prompt_parts = [self.system_prompt, f"\n\nTask: {task}"]
        
        # Add context if provided
        if context:
            context_str = "\n\nContext from other agents:\n"
            for msg in context:
                context_str += f"[{msg.get('from', 'unknown')}]: {msg.get('content', '')}\n"
            prompt_parts.append(context_str)
        
        full_prompt = "".join(prompt_parts)
        
        # Determine provider and execute
        try:
            if self.provider == "anthropic":
                response = self.client.messages.create(
                    model=settings.ANTHROPIC_MODEL,
                    max_tokens=2048,
                    system=self.system_prompt,
                    messages=[
                        {"role": "user", "content": f"Task: {task}\n{context_str if context else ''}"}
                    ]
                )
                result = response.content[0].text.strip()
                
            elif self.provider == "openai":
                from src.tools.openai_proxy import call_openai_chat
                # OpenAI proxy handles system prompt separately
                result = call_openai_chat(
                    prompt=f"Task: {task}\n{context_str if context else ''}",
                    system=self.system_prompt,
                    model=settings.OPENAI_MODEL
                )
                
            elif self.provider == "dummy":
                 result = f"[{self.role}] Task completed (Dummy Response)"
                 
            else:
                # Default to Google Gemini (or any unknown provider that mimics the interface)
                response = self.client.models.generate_content(
                    model=settings.GEMINI_MODEL_NAME,
                    contents=full_prompt
                )
                result = getattr(response, "text", str(response)).strip()

            # Store in conversation history
            self.conversation_history.append({
                "role": "user",
                "content": task
            })
            self.conversation_history.append({
                "role": "assistant",
                "content": result
            })
            
            return result
        except Exception as e:
            return f"[{self.role}] Error executing task ({self.provider}): {str(e)}"
    
    def reset_history(self):
        """Clear the conversation history."""
        self.conversation_history = []
