import { run } from "@openai/agents";

import { resolveConfig } from "./config.js";
import { createFluencyTracrHarnessAgent } from "./agents.js";

const prompt = process.argv.slice(2).join(" ").trim();
const config = resolveConfig();

if (!config.apiKeyAvailable) {
  console.error("OPENAI_API_KEY is required to run the OpenAI Agents SDK harness.");
  process.exit(1);
}

if (!prompt) {
  console.error('Usage: npm run agent:dev -- "Summarize current harness state and next slice"');
  process.exit(1);
}

const result = await run(createFluencyTracrHarnessAgent(), prompt);
console.log(result.finalOutput);
