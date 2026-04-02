## ADDED Requirements

### Requirement: Expanded bounded executive questions

Agent tooling documentation and implementations SHALL support the original five question classes in `docs/integrations/glean/03-glean-agent-tooling.md` **plus** these additional org-level classes: operational health of instrumentation (whether required signal types are present for the window), change summary of suppression state versus prior window (aggregate labels only, no hidden reconstruction), and safe-path escalation presence (yes/no/suppressed/not_computed semantics). All classes SHALL remain org-scoped; team, manager, ranking, scoring, and individual attribution requests SHALL stay out of scope.

#### Scenario: Instrumentation health question

- **WHEN** the user asks whether required instrumentation signal types are present for the org-window
- **THEN** the agent answers using only `coverage` aggregate fields from the EvidenceBundle or coverage endpoint
- **AND** applies suppression rules without inferring masked values

### Requirement: Agent response template validation

A shared validator SHALL accept JSON objects that include exactly the required template fields: `org_id`, `window`, `generated_at`, `suppression_applied`, `suppression_reasons`, `exposure`, `calibration`, `fragility`, `coverage_summary`, `decision_safe_guidance`. Nested objects SHALL use only EvidenceBundle v1 enum semantics for status fields. Unknown top-level keys SHALL fail validation.

#### Scenario: Extra field rejected

- **WHEN** a response object includes `team_ranking`
- **THEN** validation fails with a deterministic error
