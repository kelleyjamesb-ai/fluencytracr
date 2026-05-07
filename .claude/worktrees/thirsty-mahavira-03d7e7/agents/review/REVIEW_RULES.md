# Review triggers

Require explicit review (human or designated reviewer agent) **before merge** when **any** of:

- **Multi-file** change (≥3 files) touching one feature
- **Architecture** change (new modules, pipeline order, shared contracts)
- **UI** change (components, copy that implies metrics or rankings)
- **Auth / data / billing / integrations** (credentials, PII paths, external APIs)
- **Governed observability pipeline** (changes that could route product responses through `backend/src/inference/*`, ML/semantic classification, or non-deterministic scoring—v1 must stay on structural deterministic path per PRD + `artifacts/FLUENCYTRACR_V1_IMPLEMENTATION_BLUEPRINT.md`)

Keep review **concise**: risk, blast radius, suppression/PRD compliance, tests run.
