# Cursor Rules and Agent Run Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cursor project rules and a provider-neutral agent-run event schema that can represent Cursor, OpenAI Agents SDK, Codex, and Claude-style harness runs.

**Architecture:** Cursor guidance lives in version-controlled `.cursor/rules/*.mdc` files and points agents back to the repo harness as source of truth. The event contract lives in `shared/src/agentRunSchemas.ts`, `schemas/agent_run/agent_run_event.schema.json`, and `docs/contracts/agent-run/README.md`, with backend contract tests validating strict parsing and privacy boundaries.

**Tech Stack:** Cursor Project Rules MDC, TypeScript, Zod, JSON Schema, Jest via backend workspace, shared workspace build.

---

### Task 1: Cursor Project Rules

**Files:**
- Create: `.cursor/rules/fluencytracr-session.mdc`
- Create: `.cursor/rules/harness-slice.mdc`
- Create: `.cursor/rules/provider-boundary.mdc`
- Modify: `docs/agent/README.md`
- Modify: `docs/agent/EVALUATION.md`

- [x] **Step 1: Add Cursor rules that encode session startup, bounded harness slices, and provider boundaries.**
- [x] **Step 2: Link Cursor rules from agent docs so future agents can find them.**
- [x] **Step 3: Run docs link/sweep scripts.**

### Task 2: Agent Run Event Schema

**Files:**
- Create: `backend/tests/agent_run_schema.test.ts`
- Create: `shared/src/agentRunSchemas.ts`
- Modify: `shared/src/index.ts`
- Create: `schemas/agent_run/agent_run_event.schema.json`
- Create: `docs/contracts/agent-run/README.md`

- [x] **Step 1: Write failing Jest tests for accepted Cursor/OpenAI events and rejected raw content/direct identifiers.**
- [x] **Step 2: Run the focused test and confirm it fails because `AgentRunEventSchema` is missing.**
- [x] **Step 3: Add the Zod schema and export it from shared.**
- [x] **Step 4: Add JSON Schema and contract docs.**
- [x] **Step 5: Run focused test, shared build, docs checks, and `npm run validate:agents`.**

### Task 3: Harness Handoff

**Files:**
- Modify: `harness/agent-progress.txt`

- [x] **Step 1: Append a dated handoff entry describing Cursor rules and agent-run schema.**
- [x] **Step 2: Commit only the intended files and leave unrelated local changes unstaged.**
