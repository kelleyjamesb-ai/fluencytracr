## 1. Implementation

- [x] 1.1 Add `packages/glean-publisher` with `buildGleanDocument`, `validateGleanDocument`, and CLI (`dry-run`, `publish`)
- [x] 1.2 Add GitHub Actions workflow `glean-publisher-scheduled.yml` (schedule + workflow_dispatch, optional secrets)
- [x] 1.3 Extend CI with `validate:glean` script and fixture-based check
- [x] 1.4 Register workspace in root `package.json`

## 2. Validation

- [x] 2.1 `npx @fission-ai/openspec@latest validate add-glean-publisher-and-ci --strict --no-interactive`
