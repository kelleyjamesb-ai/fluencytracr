export type OpenAIAgentsHarnessConfig = {
  model: string;
  apiKeyAvailable: boolean;
};

export function resolveConfig(env: NodeJS.ProcessEnv = process.env): OpenAIAgentsHarnessConfig {
  return {
    model: env.OPENAI_AGENT_MODEL || "gpt-5.5",
    apiKeyAvailable: Boolean(env.OPENAI_API_KEY),
  };
}
