# Current Slice Contract

- Work item id: `openspec-cli-enable-and-publish-vercel-proposal`
- Title: `Add OpenSpec CLI, validate the Vercel Services proposal, and publish the planning slice`
- Status: `completed`

## Summary

Add the OpenSpec CLI as a durable repo tool, validate the new Vercel Services consolidation proposal, and publish the planning slice without starting implementation.

## Scope Paths

- `package.json`
- `package-lock.json`
- `openspec/changes/update-vercel-single-project-services/proposal.md`
- `openspec/changes/update-vercel-single-project-services/design.md`
- `openspec/changes/update-vercel-single-project-services/tasks.md`
- `openspec/changes/update-vercel-single-project-services/specs/deployment/spec.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Adding the CLI could create unnecessary lockfile churn outside the planning scope.
- OpenSpec validation may fail because the existing `deployment` spec is legacy and underspecified.
- Proposal scope can still drift into implementation if validation feedback is handled too broadly.

## Planned Checks

- Install the same OpenSpec CLI already referenced elsewhere in the repo (`@fission-ai/openspec`).
- Run strict validation for `update-vercel-single-project-services`.
- Re-read any files changed to satisfy validation and confirm the scope remains planning-only.

## Evaluator Command Profile

`targeted` for this tooling/planning slice:

- `source ~/.nvm/nvm.sh && npx openspec validate update-vercel-single-project-services --strict`
- `sed -n '1,220p' openspec/changes/update-vercel-single-project-services/proposal.md`
- `sed -n '1,260p' openspec/changes/update-vercel-single-project-services/design.md`
- `sed -n '1,220p' openspec/changes/update-vercel-single-project-services/tasks.md`
- `sed -n '1,220p' openspec/changes/update-vercel-single-project-services/specs/deployment/spec.md`

Escalate to `strict` only when implementation begins:

- `npm run build --workspace frontend`
- `npm run build --workspace backend`
- Vercel preview deployment verification on the single canonical project

## Evaluator Pass Criteria

- Only declared tooling/planning paths are changed.
- Root package metadata cleanly includes the OpenSpec CLI.
- Proposal states one canonical Vercel project and preserves current public routes.
- Design identifies migration steps, risks, rollback shape, and dashboard cleanup.
- `openspec validate ... --strict` passes for the new change.
- Tasks are bounded to the future implementation slice rather than broad architecture theater.
- No blocker remains unrecorded in `.project/PROGRESS.md`.

## Specialists To Consult

- Vercel/deployment specialist if validation reveals missing deployment-spec context.

## Next Handoff Note

Completed: `@fission-ai/openspec` was added at the repo root and `npx openspec validate update-vercel-single-project-services --strict` passed. The next slice should implement the root Vercel Services config and remove external backend rewrites without changing public URLs.
