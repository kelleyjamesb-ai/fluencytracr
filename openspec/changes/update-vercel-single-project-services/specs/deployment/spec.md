## ADDED Requirements

### Requirement: Single Vercel project deployment topology

The system SHALL deploy the frontend and backend from one canonical Vercel project using a shared root deployment configuration.

#### Scenario: Unified deployment source

- **WHEN** a deployment is triggered from the repository
- **THEN** one canonical Vercel project builds both the frontend and backend services
- **AND** the deployment does not depend on a second Vercel project for backend routing

### Requirement: Public route preservation during Vercel consolidation

The system SHALL preserve the current public route surface while consolidating the deployment topology.

#### Scenario: Existing application routes remain valid

- **WHEN** the Vercel Services migration is completed
- **THEN** the frontend remains available at `/`
- **AND** the backend remains available at `/api`, `/auth`, `/health`, and `/orgs`
- **AND** clients do not need a new API base path to use the application

### Requirement: Canonical root-owned deployment configuration

The system SHALL use the repository root Vercel configuration as the authoritative deployment definition for the unified project.

#### Scenario: Deployment configuration ownership

- **WHEN** deployment configuration is reviewed after migration
- **THEN** the repository root defines the unified Vercel Services topology
- **AND** subordinate frontend/backend Vercel configs do not remain as independent deployment authorities
