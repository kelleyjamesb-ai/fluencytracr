## 1. Implementation

- [x] 1.1 Add `packages/fluencytracr-mcp` with stdio and HTTP entrypoints, Zod tool schemas, FluencyTracr `fetch` client
- [x] 1.2 Implement forbidden-field scan using `@fluencytracr/shared` field lists (parity with backend)
- [x] 1.3 Append structured audit records (stdout or `FLUENCYTRACR_MCP_AUDIT_LOG` path)
- [x] 1.4 Document Node-based MCP config in `docs/mcp/fluencytracr-mcp-server.md`
- [x] 1.5 Add Vitest contract tests for tools (mock `fetch`)
- [x] 1.6 Register workspace in root `package.json` and run CI build/test for the package

## 2. Validation

- [x] 2.1 `npx @fission-ai/openspec@latest validate add-glean-mcp-runtime --strict --no-interactive`
