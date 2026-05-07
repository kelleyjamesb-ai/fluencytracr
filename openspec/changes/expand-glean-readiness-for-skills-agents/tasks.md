## 1. Source fixtures and adapter

- [x] 1.1 Add `agent_run` and `skill_lifecycle` source record support.
- [x] 1.2 Add Auto Mode Agent and Skill lifecycle source fixtures.
- [x] 1.3 Update source-derived readiness generator defaults and CLI args.
- [x] 1.4 Update adapter and CLI tests for new signal families.

## 2. Validation

- [x] 2.1 Regenerate source-derived readiness map.
- [x] 2.2 Run targeted backend readiness tests.
- [x] 2.3 Run `npm run build --workspace shared`.
- [x] 2.4 Run `node scripts/validate_glean_readiness_examples.mjs`.
- [x] 2.5 Run `npx openspec validate expand-glean-readiness-for-skills-agents --strict`.
- [x] 2.6 Run `git diff --check`.
