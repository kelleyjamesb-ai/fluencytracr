# Phase 4A Repo Alignment Record (RAR)

## 1) Canonical Governance Root
Authoritative governance directory: `/Users/jkelley/Desktop/FluencyTracr/docs/governance/`.

Prohibited secondary sources (non-authoritative for governance):
- `/Users/jkelley/Desktop/FluencyTracr/governance/` (empty/non-authoritative)
- `/Users/jkelley/Desktop/FluencyTracr/openspec/`
- `/Users/jkelley/Desktop/FluencyTracr/docs/` outside `/Users/jkelley/Desktop/FluencyTracr/docs/governance/`
- `/Users/jkelley/Desktop/FluencyTracr/artifacts/`
- Repo-level instruction files such as `/Users/jkelley/Desktop/FluencyTracr/AGENTS.md`, `/Users/jkelley/Desktop/FluencyTracr/CLAUDE.md`, `/Users/jkelley/Desktop/FluencyTracr/SCOPE_GUARDRAILS.md`, `/Users/jkelley/Desktop/FluencyTracr/CODEX_ENFORCEMENT_STATE.md`

Import rule (explicit): Code and CI may import governance artifacts only when they are classified NORMATIVE and marked Execution Authority = YES in this RAR. All other artifacts are forbidden import sources. Current state: no governance artifacts are import-authorized (Execution Authority YES), so all governance imports are prohibited by default.

## 2) Artifact Classification Table
Legend: Type = NORMATIVE / DESCRIPTIVE / ARCHIVED. Execution Authority = YES / NO. If uncertain, artifact is classified DESCRIPTIVE with Execution Authority NO and a brief note.

| Current Path | Type | Execution Authority | Supersedes | Superseded By | Notes |
| --- | --- | --- | --- | --- | --- |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/CI_GOVERNANCE_GATES.md` | NORMATIVE | NO | NONE | NONE | Governance CI specification (non-executable reference). |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/FluencyTracr_V2_Governance_Charter_Draft1.md` | DESCRIPTIVE | NO | NONE | NONE | Draft status; not a locked authority. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/FluencyTracr_V2_TG1_Governance_Lock.md` | NORMATIVE | NO | NONE | NONE | TG1 lock artifact. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/FluencyTracr_V2_Temporal_Semantics_Contract_TG2.md` | NORMATIVE | NO | NONE | NONE | TG2 contract. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/GOVERNANCE_TASK_GROUPS.md` | DESCRIPTIVE | NO | NONE | NONE | Clarification/traceability. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/Governance_Model_Overview_FINAL.md` | DESCRIPTIVE | NO | NONE | NONE | Overview document. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/SENTINEL_DECISIONS_LOG.md` | DESCRIPTIVE | NO | NONE | NONE | Log of decisions. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/SENTINEL_V2_TG0_APPROVAL.md` | NORMATIVE | NO | NONE | NONE | TG0 approval artifact. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/TG5-Governance-Enforce.md` | DESCRIPTIVE | NO | NONE | NONE | Reference note pointing to TG5 matrix. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/privacy.md` | NORMATIVE | NO | NONE | NONE | Governance privacy constraints. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg3/TG3_OVERVIEW.md` | NORMATIVE | NO | NONE | NONE | TG3 scope/overview. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg3/TG3_PASS_FAIL_CRITERIA.md` | NORMATIVE | NO | NONE | NONE | TG3 pass/fail criteria. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg3/TG3_QA_Artifact_Final.md` | NORMATIVE | NO | NONE | NONE | TG3 QA artifact. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg3/TG3_TEST_MATRIX.md` | NORMATIVE | NO | NONE | NONE | TG3 test matrix. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg4/TG4A_Executive_Observability_Boundary.md` | NORMATIVE | NO | NONE | NONE | TG4-A observability boundary. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg4/TG4B_Executive_Decisions_Boundary.md` | NORMATIVE | NO | NONE | NONE | TG4-B executive decisions boundary. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md` | NORMATIVE | NO | NONE | NONE | TG5 final enforcement matrix. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/phase3/WAIM_v2_DESCRIPTIVE.md` | DESCRIPTIVE | NO | `/Users/jkelley/Desktop/FluencyTracr/docs/governance/archive/waim.v1.yaml` | NONE | Explicitly descriptive, non-executable. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/governance/archive/waim.v1.yaml` | ARCHIVED | NO | NONE | `/Users/jkelley/Desktop/FluencyTracr/docs/governance/phase3/WAIM_v2_DESCRIPTIVE.md` | Archived WAIM v1. |
| `/Users/jkelley/Desktop/FluencyTracr/AGENTS.md` | DESCRIPTIVE | NO | NONE | NONE | Repo-level assistant instructions (non-governance root). |
| `/Users/jkelley/Desktop/FluencyTracr/CLAUDE.md` | DESCRIPTIVE | NO | NONE | NONE | Repo-level assistant instructions (non-governance root). |
| `/Users/jkelley/Desktop/FluencyTracr/CODEX_ENFORCEMENT_STATE.md` | DESCRIPTIVE | NO | NONE | NONE | Status note; non-authoritative. |
| `/Users/jkelley/Desktop/FluencyTracr/SCOPE_GUARDRAILS.md` | DESCRIPTIVE | NO | NONE | NONE | Scope guidance outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/ENFORCEMENT_SPEC.md` | DESCRIPTIVE | NO | NONE | NONE | Enforcement reference outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/TG4_SIGNAL_MEANINGS.md` | DESCRIPTIVE | NO | NONE | NONE | Signal meanings guidance outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/BEHAVIORAL_SIGNALS_SPEC.md` | DESCRIPTIVE | NO | NONE | NONE | Signal spec outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/V0_DATA_CONTRACT.md` | DESCRIPTIVE | NO | NONE | NONE | Contract outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/FluencyTracr_V1_Event_Contract.md` | DESCRIPTIVE | NO | NONE | NONE | Contract outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/FluencyTracr_V1_Windowing_And_Cohort_Primitives.md` | DESCRIPTIVE | NO | NONE | NONE | Contract outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/contracts/FluencyTracr_V1_Phase1_Event_Contract.md` | DESCRIPTIVE | NO | NONE | NONE | Contract outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md` | DESCRIPTIVE | NO | NONE | NONE | Contract outside governance root. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/AGENTS.md` | DESCRIPTIVE | NO | NONE | NONE | OpenSpec process instructions (non-authoritative for governance). |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/project.md` | DESCRIPTIVE | NO | NONE | NONE | OpenSpec project guidance (non-authoritative for governance). |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/specs/deployment/spec.md` | DESCRIPTIVE | NO | NONE | NONE | OpenSpec spec (non-authoritative for governance). |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-orientation-signals/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-orientation-signals/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-orientation-signals/specs/orientation-signals/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-waim-placement-gate/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-waim-placement-gate/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-waim-placement-gate/specs/waim-placement-gate/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-phase1-thin-slice/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-phase1-thin-slice/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-phase1-thin-slice/specs/phase1-thin-slice/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-gem-governance-enforcement/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-gem-governance-enforcement/design.md` | DESCRIPTIVE | NO | NONE | NONE | Design record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-gem-governance-enforcement/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-gem-governance-enforcement/specs/governance-enforcement/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-fluencytracr-confidence-signal-layer/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-fluencytracr-confidence-signal-layer/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-fluencytracr-confidence-signal-layer/specs/fluencytracr-confidence-signal/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/2026-01-09-add-sandbox-execution/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/2026-01-09-add-sandbox-execution/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/2026-01-09-add-sandbox-execution/specs/sandbox/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-waim-descriptive-only/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-waim-descriptive-only/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/update-waim-descriptive-only/specs/waim-descriptive-only/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-qa-backend-agents/proposal.md` | DESCRIPTIVE | NO | NONE | NONE | Proposal record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-qa-backend-agents/design.md` | DESCRIPTIVE | NO | NONE | NONE | Design record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-qa-backend-agents/tasks.md` | DESCRIPTIVE | NO | NONE | NONE | Tasks record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/add-qa-backend-agents/specs/agents/spec.md` | DESCRIPTIVE | NO | NONE | NONE | Spec record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/archive/2025-12-24-add-installer-script/proposal.md` | ARCHIVED | NO | NONE | `/Users/jkelley/Desktop/FluencyTracr/openspec/specs/deployment/spec.md` | Archived change record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/archive/2025-12-24-add-installer-script/tasks.md` | ARCHIVED | NO | NONE | `/Users/jkelley/Desktop/FluencyTracr/openspec/specs/deployment/spec.md` | Archived change record. |
| `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/archive/2025-12-24-add-installer-script/specs/deployment/spec.md` | ARCHIVED | NO | NONE | `/Users/jkelley/Desktop/FluencyTracr/openspec/specs/deployment/spec.md` | Archived spec record. |

## 3) Supersession & Archival Rules
Supersession must be explicit: An artifact supersedes another only if it explicitly declares `supersedes:` in its header or the supersession is recorded in this RAR table. Silence never supersedes.

Canonical archive directory: `/Users/jkelley/Desktop/FluencyTracr/docs/governance/archive/` for governance artifacts and `/Users/jkelley/Desktop/FluencyTracr/openspec/changes/archive/` for OpenSpec change records.

Required archived artifact header/notices (minimum):
- `status: ARCHIVED`
- `superseded_by: <path>` (or `superseded_by: NONE`)
- `reason: <brief reason>`
- `execution_authority: NO`

Archived artifacts are non-executable: CI and runtime must treat ARCHIVED artifacts as forbidden import sources.

## 4) CI Drift Guardrail Specification (Design-Level Only)
CI must implement fail-closed checks. Each check below is a build-fail condition when violated.

1. **Canonical governance root enforcement.** Scan: all governance-like references in code/CI/tests for paths containing `/Users/jkelley/Desktop/FluencyTracr/docs/governance/`, `/Users/jkelley/Desktop/FluencyTracr/openspec/`, `/Users/jkelley/Desktop/FluencyTracr/governance/`, `/Users/jkelley/Desktop/FluencyTracr/SCOPE_GUARDRAILS.md`, `/Users/jkelley/Desktop/FluencyTracr/CODEX_ENFORCEMENT_STATE.md`, `/Users/jkelley/Desktop/FluencyTracr/AGENTS.md`, `/Users/jkelley/Desktop/FluencyTracr/CLAUDE.md`, `/Users/jkelley/Desktop/FluencyTracr/docs/ENFORCEMENT_SPEC.md`. Fail if: any import/read of governance artifacts is not both NORMATIVE and Execution Authority = YES per this RAR. Current state: any governance import is a failure.

2. **WAIM non-executable enforcement (explicit).** Scan: code/CI/tests for any reference to `/Users/jkelley/Desktop/FluencyTracr/docs/governance/phase3/WAIM_v2_DESCRIPTIVE.md` or `/Users/jkelley/Desktop/FluencyTracr/docs/governance/archive/waim.v1.yaml`. Fail if: any reference is found (WAIM is DESCRIPTIVE/ARCHIVED; execution authority is NO).

3. **New orientation signal detection.** Authoritative allowlist source: the closed governance artifacts in `/Users/jkelley/Desktop/FluencyTracr/docs/governance/phase3/WAIM_v2_DESCRIPTIVE.md` and TG4 boundaries in `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg4/`. Scan: all schema files (`/Users/jkelley/Desktop/FluencyTracr/schemas/**`, `/Users/jkelley/Desktop/FluencyTracr/docs/contracts/**`, `/Users/jkelley/Desktop/FluencyTracr/docs/**`), code (`/Users/jkelley/Desktop/FluencyTracr/src/**`, `/Users/jkelley/Desktop/FluencyTracr/backend/**`, `/Users/jkelley/Desktop/FluencyTracr/frontend/**`), and tests (`/Users/jkelley/Desktop/FluencyTracr/tests/**`) for new signal identifiers (tokens matching `signal_`, `orientation_`, `signalId`, `signal_id`, or `signal_name`). Fail if: a signal identifier appears that is not in the allowlist derived from the closed governance artifacts above.

4. **Accumulative or ordered fields guardrail.** Scan: schema definitions (`/Users/jkelley/Desktop/FluencyTracr/schemas/**`, `/Users/jkelley/Desktop/FluencyTracr/docs/contracts/**`, `/Users/jkelley/Desktop/FluencyTracr/docs/**`) and runtime field declarations for patterns indicating ordering/aggregation: field names or labels containing `rank`, `score`, `percentile`, `cumulative`, `trend`, `delta`, `rolling`, `average`, `mean`, `median`, `std`, `variance`, `top`, `bottom`, `benchmark`; arrays of signals with ordering semantics (e.g., `ordered`, `sorted`, `ranked`, `topN`). Fail if: any new field or label matches these patterns.

5. **Deprecated artifact reference guardrail.** Scan: code/CI/tests for any path listed as ARCHIVED in Section 2. Fail if: any reference is found.

6. **Descriptive artifact import guardrail.** Scan: code/CI/tests for any path listed as DESCRIPTIVE in Section 2. Fail if: any reference is found (DESCRIPTIVE artifacts are non-executable).

7. **Executive observability boundary enforcement (TG4-A/TG4-B).** Authoritative boundary source: `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg4/TG4A_Executive_Observability_Boundary.md` and `/Users/jkelley/Desktop/FluencyTracr/docs/governance/tg4/TG4B_Executive_Decisions_Boundary.md`. Scan: executive-facing outputs (API responses, UI labels, dashboards, reports) for fields/labels. Fail if: any new executive-facing field or decision label is not in the TG4-A/TG4-B allowlist or if any forbidden terms appear (examples: `productivity`, `performance`, `trust`, `competence`, `surveillance`, `compliance enforcement`, `HR decision`, `discipline`, `rank`).

8. **Orientation signal placement gate consistency.** Scan: any config or code paths that render or expose orientation signals. Fail if: signals appear outside the explicitly allowed placements defined in closed governance artifacts (TG4 boundaries and WAIM descriptive constraints), or if placement logic is not fail-closed.

These guardrails make governance easier to follow than to violate by enforcing allowlists, explicit denial of non-authoritative sources, and automatic build failures on drift.

## 5) Drift Scenarios & Prevention
1. Temptation: Add a new helpful executive summary field (e.g., team performance trend) to a dashboard. Breaks: TG4-A/TG4-B boundaries by expanding observability into evaluative or performance framing. Prevented by: Guardrail 7 (Executive observability boundary enforcement).

2. Temptation: Reference WAIM to justify a UI placement change for orientation signals. Breaks: WAIM descriptive-only constraint and closed governance status. Prevented by: Guardrail 2 (WAIM non-executable enforcement) and Guardrail 6 (Descriptive artifact import guardrail).

3. Temptation: Introduce a ranked list of signals to prioritize insights. Breaks: No ordering/aggregation rule; introduces accumulative or ordered fields. Prevented by: Guardrail 4 (Accumulative or ordered fields guardrail).

4. Temptation: Pull a change proposal from `/Users/jkelley/Desktop/FluencyTracr/openspec/` into runtime logic as a shortcut. Breaks: Canonical governance root and import rule; uses non-authoritative sources. Prevented by: Guardrail 1 (Canonical governance root enforcement) and Guardrail 6 (Descriptive artifact import guardrail).

5. Temptation: Add a new orientation signal identifier in a schema to capture nuance. Breaks: Closed signal set and governance lock at TG5. Prevented by: Guardrail 3 (New orientation signal detection).
