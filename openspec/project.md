# Project Context

## Purpose
**FluencyTracr** measures organizational AI fluency using aggregated, privacy-preserving behavioral and governance signals.
Its goals are to:
- Track directional adoption and confidence-gated behavioral patterns.
- Enforce suppression-first governance constraints and schema guardrails.
- Support executive decision workflows with transparency and auditability.
- Operationalize policy and control posture for organizational compliance visibility.

## Tech Stack
- **Backend:** TypeScript, Express, Zod, Jest
- **Frontend:** React + TypeScript
- **Shared Contracts:** TypeScript shared schemas and types
- **Data Layer (current):** In-memory store with deterministic test fixtures

## Project Conventions

### Code Style
- TypeScript strict mode is enabled.
- Route inputs must validate through Zod schemas.
- Responses should preserve safety semantics (suppression and ambiguity-first).

### Architecture Patterns
- Shared schema contracts in `shared/src`.
- Backend endpoints in `backend/src/app.ts`.
- Domain logic in focused backend modules (for example: suppression, rollups, inference, compliance).
- No raw content or direct identifiers in ingested payloads.

### Testing Strategy
- **Framework:** Jest
- **Scope:** API contracts, governance guardrails, suppression behavior, inference gating, and compliance flows.
- New behavior must include regression coverage for existing contracts.

## Domain Context
- FluencyTracr outputs directional organizational signals, not individual-level judgments.
- Confidence gates and suppression rules are mandatory and fail-closed.
- Governance posture should be auditable and explainable at the organization level.

## Important Constraints
- No individual attribution or direct-identifier ingestion.
- Schema-version enforcement is mandatory for governed endpoints.
- Ambiguity and low-confidence cases must default to withheld/suppressed behavior.
