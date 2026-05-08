## Context

The Claim Packet Export currently packages methodology review, strongest safe claim language, evidence posture, and upgrade actions using synthetic fixtures. The next product gap is not ingestion. It is reviewer confidence about which synthetic fixture inputs have a real-source replacement path.

## Goals

- Make source readiness visible before ingestion exists.
- Preserve `missing`, `unknown`, `blocked`, `needs_approval`, and `synthetic_only` states.
- Show how source gaps affect claim buckets.
- Provide a clear ingestion-path decision record without implementing ingestion.

## Non-Goals

- No real Glean ingestion.
- No live MCP/read access.
- No ROI calculation.
- No claim readiness upgrades.
- No raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction.

## Decisions

- Add `RSRM_2026_05` as a separate shared contract instead of expanding `GCP_2026_05`. This keeps claim packaging stable and makes source readiness reviewable independently.
- The review helper may consume a claim packet, but it must not mutate it or emit upgraded claim language.
- The UI section lives in `/methodology-review` because reviewers are already evaluating methodology approval, claim effects, packet JSON, and QBR narrative there.
- The first recommended source path remains admin-exported aggregate upload. Glean-hosted MCP/read access and live event ingestion stay future decisions.

## Risks / Trade-Offs

- Risk: governance-heavy UI could feel like paperwork. Mitigation: keep the section plain-language and tied to affected claim buckets.
- Risk: reviewers may read "ready" as "ingested." Mitigation: use explicit copy that no ingestion is implemented and readiness is only replacement preparedness.
- Risk: claim readiness could be accidentally inferred from source readiness. Mitigation: schema/helper/tests include `claim_readiness_effect: no_readiness_upgrade`.
