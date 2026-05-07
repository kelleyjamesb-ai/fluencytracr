## ADDED Requirements

### Requirement: Skill lifecycle source readiness

The system SHALL support Skill lifecycle source records as Glean readiness inputs. Skill lifecycle records SHALL describe aggregate lifecycle metadata such as creation, enablement, routing, invocation, reuse, and association with agents without including `SKILL.md` contents, prompts, responses, transcripts, file content, or direct identifiers.

#### Scenario: Skill lifecycle present

- **WHEN** Skill lifecycle aggregate metadata is available with safe scrub status, stable lifecycle join keys, and derived dimensions
- **THEN** the source-to-readiness adapter maps it to `signal_family: "skill_lifecycle"`
- **AND** the generated readiness map can mark it `present`

#### Scenario: Skill content rejected

- **WHEN** a Skill lifecycle source record includes raw skill instructions, prompt text, file content, or direct identifiers
- **THEN** strict validation rejects the source record before readiness generation

### Requirement: Auto Mode Agent lifecycle source readiness

The system SHALL support Auto Mode Agent lifecycle source records as Glean readiness inputs through the `agent_run` signal family. Agent lifecycle records SHALL describe aggregate creation, test/debug, enablement, run, completion, retry, artifact, and action status metadata without raw run transcripts or tool payloads.

#### Scenario: Auto Mode Agent lifecycle present

- **WHEN** Auto Mode Agent lifecycle metadata is available with stable run/workflow/trace keys and safe scrub status
- **THEN** the source-to-readiness adapter maps it to `signal_family: "agent_run"`
- **AND** the generated readiness map can mark it `present`

### Requirement: Source-derived readiness includes live value surfaces

The source-derived readiness generator SHALL include WorkflowRun, Auto Mode Agent, Skill lifecycle, MCP Usage, and AI Security fixtures by default so Glean value readiness demos represent current Glean value surfaces.

#### Scenario: Default source generation

- **WHEN** the default source-derived readiness generator runs
- **THEN** the generated readiness map includes `workflow_run`, `agent_run`, `skill_lifecycle`, `mcp_usage`, and `ai_security`
