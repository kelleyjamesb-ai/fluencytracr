# Workflow Registry

Registry fields:
- `orgId`
- `workflowId`
- `version`
- `riskClass` (`low|medium|high`)
- audit metadata and timestamps

Rules:
- Version increments by one per workflow.
- Registry versions are append-only.
- Events do not override registry risk class.
