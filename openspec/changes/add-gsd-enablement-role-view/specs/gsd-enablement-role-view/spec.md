## ADDED Requirements

### Requirement: Readiness Coverage Card
The Enablement view SHALL display org-aggregate training coverage as a
percentage of controls with training material attached.

#### Scenario: Coverage available
- **WHEN** controls data includes training_attached field
- **THEN** render "X of Y controls covered" with a progress bar

#### Scenario: Coverage unavailable
- **WHEN** training_attached field is absent from controls response
- **THEN** render "Coverage data unavailable" — not zero percent

### Requirement: Enablement Focus Hotspots
The Enablement view SHALL surface the top control areas by unresolved
clause count so enablement leads know where to focus effort first.

#### Scenario: Hotspots ranked
- **WHEN** policy list is available
- **THEN** render top-5 policies by unresolved clause count descending,
  each with name (truncated) and a RAG chip

#### Scenario: No unresolved clauses
- **WHEN** all policies have zero unresolved clauses
- **THEN** render a "No hotspots — all clauses resolved" empty state

### Requirement: Enablement Action Queue
The Enablement view SHALL list policies that have been uploaded but not
yet mapped to any control, surfacing the actionable backlog.

#### Scenario: Unmapped policies exist
- **WHEN** one or more policies have mapped_controls === 0
- **THEN** render count badge and list of unmapped policy names

#### Scenario: All policies mapped
- **WHEN** every policy has at least one control mapped
- **THEN** render "All policies mapped" empty state
