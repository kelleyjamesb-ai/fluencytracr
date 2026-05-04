# Change: Expand Glean agent tooling (governed question classes)

## Why

The initial Glean agent pack listed a minimal set of executive questions. Operators need additional **org-level, suppression-safe** question classes for coverage and operational posture without enabling rankings, team comparisons, or individual attribution.

## What Changes

- Add **expanded bounded question classes** and **callable surface** documentation while preserving prohibited outputs.
- Add machine-checkable **response template** validation tests aligned with the expanded allowlist.

## Impact

- Affected specs: `glean-agent-tooling` (new capability delta).
- Affected docs: `docs/integrations/glean/03-glean-agent-tooling.md`
- Affected code: `packages/fluencytracr-mcp` (response builder + tests) or shared validation module.
