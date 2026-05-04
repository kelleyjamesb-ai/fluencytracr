## 1. Implementation

- [x] 1.1 Extend `docs/integrations/glean/03-glean-agent-tooling.md` with expanded org-level question classes and explicit “still prohibited” list
- [x] 1.2 Add `buildAgentEvidenceResponse` helper and Zod schema for the required response template in `packages/fluencytracr-mcp`
- [x] 1.3 Add Vitest tests for allowed shape, suppression propagation, and rejection of forbidden extra fields

## 2. Validation

- [x] 2.1 `npx @fission-ai/openspec@latest validate expand-glean-agent-tooling --strict --no-interactive`
