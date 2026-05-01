import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { tool } from "@openai/agents";
import { z } from "zod";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const harnessDocuments = {
  session_start: "docs/agent/SESSION_START.md",
  harness_readme: "harness/README.md",
  evaluation: "docs/agent/EVALUATION.md",
  task_contract: "docs/agent/TASK_CONTRACT.md",
  agent_progress: "harness/agent-progress.txt",
  feature_list: "harness/feature_list.json",
} as const;

type HarnessDocument = keyof typeof harnessDocuments;

async function readRepoFile(relativePath: string): Promise<string> {
  const absolutePath = join(repoRoot, relativePath);
  return readFile(absolutePath, "utf8");
}

export const readHarnessDocument = tool({
  name: "read_harness_document",
  description: "Read an allowlisted FluencyTracr harness or agent protocol document from the local repo.",
  parameters: z.object({
    document: z.enum(Object.keys(harnessDocuments) as [HarnessDocument, ...HarnessDocument[]]),
  }),
  async execute({ document }) {
    const relativePath = harnessDocuments[document];
    const content = await readRepoFile(relativePath);
    return JSON.stringify({
      path: relativePath,
      content,
    });
  },
});

export const listHarnessFeatures = tool({
  name: "list_harness_features",
  description: "List FluencyTracr harness checklist items, optionally filtered by pass status.",
  parameters: z.object({
    passes: z.boolean().optional(),
  }),
  async execute({ passes }) {
    const content = await readRepoFile(harnessDocuments.feature_list);
    const parsed = JSON.parse(content) as {
      features?: Array<{
        id: string;
        category?: string;
        description?: string;
        passes?: boolean;
      }>;
    };
    const features = (parsed.features || []).filter((feature) =>
      typeof passes === "boolean" ? feature.passes === passes : true,
    );

    return JSON.stringify({
      path: relative(repoRoot, join(repoRoot, harnessDocuments.feature_list)),
      count: features.length,
      features,
    });
  },
});

export const repoHarnessTools = [readHarnessDocument, listHarnessFeatures];
