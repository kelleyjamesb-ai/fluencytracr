import { Agent } from "@openai/agents";

import { resolveConfig } from "./config.js";
import { repoHarnessTools } from "./repoHarnessTools.js";

const baseInstructions = `
You are an optional OpenAI Agents SDK development harness for FluencyTracr.
Work from repo-local documents first. Keep implementation advice bounded to one verified slice.
Preserve the existing harness as the source of truth: docs/agent/SESSION_START.md, harness/README.md,
harness/feature_list.json, and harness/agent-progress.txt. Do not turn OpenAI tooling into the product runtime.
When recommending code work, include verification and GitHub publishing steps.
`;

export function createFluencyTracrHarnessAgent(): Agent {
  const config = resolveConfig();

  const harnessAnalyst = new Agent({
    name: "FluencyTracr harness analyst",
    model: config.model,
    instructions: `
Analyze the local FluencyTracr harness state. Summarize the active protocol, what is already verified,
what remains open, and the smallest next slice. Cite local file paths in the answer.
`,
    tools: repoHarnessTools,
  });

  const githubReadinessReviewer = new Agent({
    name: "GitHub readiness reviewer",
    model: config.model,
    instructions: `
Review whether a proposed repo change is ready to publish to GitHub. Focus on changed files, verification,
unrelated local edits that must not be staged, and concise commit or pull-request framing.
`,
    tools: repoHarnessTools,
  });

  return new Agent({
    name: "FluencyTracr OpenAI Agents harness",
    model: config.model,
    instructions: baseInstructions,
    tools: [
      ...repoHarnessTools,
      harnessAnalyst.asTool({
        toolName: "analyze_harness_state",
        toolDescription: "Analyze FluencyTracr harness status and recommend one bounded next slice.",
      }),
      githubReadinessReviewer.asTool({
        toolName: "review_github_readiness",
        toolDescription: "Review whether the current slice is ready to stage, commit, push, and open a PR.",
      }),
    ],
  });
}
