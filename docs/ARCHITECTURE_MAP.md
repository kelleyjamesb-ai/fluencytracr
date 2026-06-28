# FluencyTracr Architecture Map

## Repository Structure

```
FluencyTracr/
├── backend/              # TypeScript Express API server
│   ├── src/
│   │   ├── app.ts                    # Main Express app with all routes
│   │   ├── store.ts                  # In-memory data store (Map-based)
│   │   ├── ingest.ts                 # Data ingestion validation
│   │   ├── fluency_service.ts        # Deprecated legacy score compatibility boundary
│   │   ├── suppression.ts            # Privacy suppression (k=10)
│   │   ├── enablement.ts             # Training event processing
│   │   ├── enablement_rollups.ts     # Enablement aggregation
│   │   ├── spread_metrics.ts         # Team adoption spread
│   │   ├── usage_shape.ts            # Usage frequency tracking
│   │   ├── tool_inventory.ts         # Tool discovery tracking
│   │   ├── rbac.ts                   # Role-based access control
│   │   ├── query_scope.ts            # Query scope validation
│   │   ├── roster.ts                 # Employee roster import
│   │   ├── transparency.ts           # Transparency reports
│   │   └── capabilities.ts           # Capability enforcement
│   ├── tests/                        # Jest test suite
│   ├── prisma/
│   │   └── schema.prisma             # PostgreSQL schema (future DB)
│   └── package.json                  # Node dependencies
│
├── shared/               # Shared TypeScript types/schemas
│   ├── src/
│   │   ├── types.ts                  # Type definitions
│   │   ├── schemas.ts                # Zod validation schemas
│   │   ├── privacy.ts                # Privacy constants
│   │   └── index.ts                  # Exports
│   └── package.json
│
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   └── Dashboard.tsx         # Main dashboard view
│   │   └── main.tsx                  # App entry point
│   └── vite.config.ts
│
├── src/                  # Python modules (legacy/vision)
│   ├── fluency_service.py            # Python fluency calculation
│   ├── api.py                        # Python API helpers
│   ├── events.py                     # Event models
│   ├── passive_signals.py            # Signal event models
│   └── ...
│
├── vision/               # Vision Intelligence Module (Python)
│   ├── visual_engine.py              # OpenCV spot detection
│   └── fluency_bridge.py             # Vision-to-fluency integration
│
├── tests/                # Python pytest suite
│   ├── test_vision.py                # Vision module tests
│   ├── test_fluency.py               # Fluency tests
│   └── ...
│
├── examples/             # Example integrations
│   └── vision_integration_example.py
│
├── schemas/              # FluencyTracr V1 JSON schemas
│   └── ft_v1_*.schema.json
│
└── docs/                 # Documentation
    ├── SCOPE_GUARDRAILS.md
    └── ARCHITECTURE_MAP.md (this file)
```

---

## 1. Key Packages and Folders

### Backend (`/backend`)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database ORM**: Prisma (PostgreSQL target, currently using in-memory store)
- **Validation**: Zod schemas
- **Test Framework**: Jest + ts-jest
- **Entry Point**: `backend/src/index.ts` → `backend/src/app.ts`

### Shared (`/shared`)
- **Purpose**: Shared types, schemas, and constants between frontend and backend
- **Key Exports**:
  - `MetricObservationSchema`
  - `PolicyControlObservationSchema`
  - `TrainingEventRollupSchema`
  - `GroupUpsertSchema`
  - Role types, tool classes, capabilities

### Frontend (`/frontend`)
- **Language**: TypeScript + React
- **Build Tool**: Vite
- **Main Page**: `Dashboard.tsx`

### Python Modules (`/src` + `/vision`)
- **Purpose**: Legacy fluency service + vision intelligence
- **Test Framework**: pytest
- **Vision Dependencies**: opencv-python, numpy

---

## 2. Current Ingest Endpoints and Data Schemas

### Ingest Endpoints (from `backend/src/app.ts`)

| Endpoint | Method | Purpose | Schema |
|----------|--------|---------|--------|
| `/orgs/:orgId/groups` | POST | Upsert groups (org/team/role) | `GroupUpsertSchema` |
| `/orgs/:orgId/metrics/import` | POST | Ingest metric observations | `MetricObservationSchema[]` |
| `/orgs/:orgId/controls/import` | POST | Ingest policy control observations | `PolicyControlObservationSchema[]` |
| `/orgs/:orgId/enablement/import` | POST | Ingest training event rollups | `TrainingEventRollupSchema[]` |
| `/enablement/import` | POST | Ingest raw enablement events (CSV or JSON) | `EnablementEventSchema[]` |
| `/orgs/:orgId/tools` | POST | Ingest tool inventory | `ToolInventorySchema` |
| `/orgs/:orgId/usage-shape` | POST | Ingest usage frequency bands | `UsageShapeSchema` |
| `/api/ingest` | POST | Partner-facing asynchronous ingest facade with acknowledgment, queue intake, and dedupe semantics | `FluencyEventIngestSchema` envelope (aligned with `/api/events`) |

### Canonical Ingestion Path Distinction

- `/api/events`: strict canonical validator and direct event ingestion path.
- `/api/ingest`: partner-facing asynchronous facade for intake acknowledgment, queue handling, and idempotent dedupe before canonical validation flow.

### Data Schemas (from `shared/src/schemas.ts`)

#### MetricObservationSchema
```typescript
{
  group_key: string,           // e.g., "team-uuid" or "org-uuid"
  group_type: "org" | "team" | "role",
  metric_name: string,         // e.g., "weekly_active_users"
  metric_value: number | null,
  bucket_start: string,        // ISO date
  bucket_end?: string,         // ISO date
  vendor?: string,             // e.g., "microsoft", "google"
  is_user_count?: boolean      // Used for suppression
}
```

#### PolicyControlObservationSchema
```typescript
{
  group_key: string,
  group_type: "org" | "team" | "role",
  control_name: string,        // e.g., "ai_enabled_status"
  control_value: boolean,
  bucket_start: string,
  bucket_end: string,
  vendor?: string
}
```

#### TrainingEventRollupSchema
```typescript
{
  group_key: string,
  group_type: "org" | "team" | "role",
  event_type: string,          // e.g., "session_attended"
  event_count: number,
  bucket_start: string,
  bucket_end: string,
  vendor?: string
}
```

#### EnablementEventSchema (raw events)
```typescript
{
  event_id?: string,           // Optional, auto-generated if omitted
  org_id: string,
  team_id: string,
  role_id: string,
  timestamp: string,           // ISO date
  event_type: "assessment_pre" | "assessment_post" | "session_attended" | "everboarding_touch",
  payload?: unknown            // Arbitrary JSON
}
```

---

## 3. Suppression/Rollup Logic and Min Group Size

### Suppression Logic (`backend/src/suppression.ts`)

**Key Functions:**
- `applySuppression(metrics, minGroupSize)`: Suppresses individual metrics
- `rollupSuppressedToOrg(metrics, minGroupSize)`: Rolls up suppressed to org
- `suppressAndRollup(metrics, minGroupSize)`: Combined operation

**Algorithm:**
1. **Suppression Rule**: If `is_user_count === true` and `metric_value < minGroupSize`, set `suppressed: true` and `metric_value: null`
2. **Rollup to Org**: Sum all user counts across groups by `bucket_start:metric_name:vendor`
3. **Org-level Suppression**: If org total < minGroupSize, suppress org rollup too
4. **Return**: Original metrics (with suppressions) + org-level rollups

### Min Group Size Configuration

- **Default**: `minGroupSize = 10` (set in `backend/src/app.ts:206`)
- **Per-Org Configuration**: Stored in `OrgRecord.minGroupSize`
- **Location**: `store.orgs.get(orgId).minGroupSize`
- **Used in**:
  - `/orgs/:orgId/metrics/import` (line 548, 560)
  - Enablement rollups (`backend/src/enablement_rollups.ts`)
  - Spread metrics (`backend/src/spread_metrics.ts`)

**Current Value**: k=10 (not k=5)

---

## 4. Org/Team/Role Grouping Representation

### Data Model (`backend/src/store.ts`)

#### Organization
```typescript
type OrgRecord = {
  id: string;              // "org-uuid"
  name: string;
  minGroupSize: number;
  createdAt: string;
}
```

#### Team (hierarchical)
```typescript
type TeamRecord = {
  id: string;              // "team-uuid"
  orgId: string;
  name: string;
  parentTeamId?: string;   // Supports team hierarchy
}
```

#### Role
```typescript
type RoleRecord = {
  id: string;              // "role-uuid"
  orgId: string;
  name: string;
}
```

#### Employee (many-to-many with teams/roles)
```typescript
type EmployeeRecord = {
  orgId: string;
  employeeHash: string;    // SHA-256 hash of PII
  teamIds: Set<string>;    // Multiple teams
  roleIds: Set<string>;    // Multiple roles
}
```

### Group Endpoints (CRUD)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/orgs` | POST | Create organization |
| `/orgs/:orgId/teams` | GET | List teams |
| `/orgs/:orgId/teams` | POST | Create team |
| `/orgs/:orgId/teams/:teamId` | PATCH | Update team |
| `/orgs/:orgId/teams/:teamId` | DELETE | Delete team |
| `/orgs/:orgId/roles` | GET | List roles |
| `/orgs/:orgId/roles` | POST | Create role |
| `/orgs/:orgId/roles/:roleId` | PATCH | Update role |
| `/orgs/:orgId/roles/:roleId` | DELETE | Delete role |
| `/orgs/:orgId/roster/import` | POST | Import employee roster (CSV) |

### Grouping in Metrics

- **group_key**: Can be `orgId`, `teamId`, or `roleId`
- **group_type**: Enum `"org" | "team" | "role"`
- Metrics can be aggregated at any level
- Dashboard supports filtering by `groupType` and `group_key`

---

## 5. Current Store Implementation

### Type: In-Memory Store (No Database Persistence)

**Location**: `backend/src/store.ts`

```typescript
class MemoryStore {
  orgs = new Map<string, OrgRecord>();
  teams = new Map<string, TeamRecord>();
  roles = new Map<string, RoleRecord>();
  employees = new Map<string, EmployeeRecord>();
  enablementEvents = new Map<string, EnablementEventRecord>();
  enablementRollups = new Map<string, EnablementRollupRecord>();
  toolInventory = new Map<string, ToolInventoryRecord>();
  usageShapes = new Map<string, UsageShapeRecord>();
  spreadRollups = new Map<string, SpreadRollupRecord>();
  groups = new Map<string, GroupRecord>();
  metrics = new Map<string, MetricRecord>();
  controls = new Map<string, PolicyControlRecord>();
  enablement = new Map<string, TrainingEventRecord>();
  fluencyMeta = new Map<string, FluencyMetaRecord>();
  fluencyDimensions = new Map<string, FluencyDimensionRecord>();
  fluencySnapshots = new Map<string, FluencySnapshotRecord>();

  reset() { /* clear all maps */ }
}

export const store = new MemoryStore();
```

**Key Characteristics**:
- ✅ Fast in-memory operations
- ✅ Simple key-based lookups
- ❌ No persistence (data lost on restart)
- ❌ No transactions
- ❌ No relational queries

**Composite Keys** (examples):
- Metrics: `${orgId}:${group_key}:${bucket_start}:${metric_name}:${vendor}`
- Groups: `${orgId}:${group_key}`
- Tool Inventory: `${orgId}:${teamId}:${toolClass}`

### Database Schema (Prisma - Not Yet Used)

**Location**: `backend/prisma/schema.prisma`

- Defines PostgreSQL schema
- Currently NOT connected (using in-memory store)
- Models: `Organization`, `Team`, `AuditEvent`
- Deprecated legacy model `FluencyScore` is quarantined and ignored in Prisma
  Client generation; it is not part of the value-realization evidence layer.
- To activate: Set `DATABASE_URL` env var and run `prisma migrate dev`

---

## 6. Test Harness

### Backend Tests (TypeScript)

**Framework**: Jest + ts-jest

**Location**: `backend/tests/`

**Test Files**:
- `ingest.test.ts` - Ingest endpoint validation
- `suppression.test.ts` - Suppression logic
- `fluency_index.test.ts` - Deprecated legacy score quarantine regression
- `enablement_rollups.test.ts` - Enablement aggregation
- `spread_rollups.test.ts` - Spread metrics
- `roster_import.test.ts` - Roster CSV parsing
- `rbac.test.ts` - Role-based access control
- `query_scope.test.ts` - Query scope validation
- `dashboard_overview.test.ts` - Dashboard API
- `tool_inventory_api.test.ts` - Tool inventory
- `usage_shape_api.test.ts` - Usage shape
- `metric_name.test.ts` - Metric name validation
- `capabilities.test.ts` - Capability enforcement
- `enablement_import_api.test.ts` - Enablement import
- `query_scope_middleware.test.ts` - Middleware tests

**Run Tests**:
```bash
cd backend
npm test                  # Run all tests
npm test -- --watch       # Watch mode
npm test -- ingest        # Run specific test file
```

**Test Setup**:
- Each test file imports `store` and calls `store.reset()` in `beforeEach`
- Uses `supertest` for HTTP endpoint testing (not visible in current files but implied by Express testing patterns)

### Python Tests

**Framework**: pytest

**Location**: `tests/`

**Test Files**:
- `test_vision.py` - Vision module (26 tests)
- `test_fluency.py` - Fluency service (7 tests)
- `test_access_control.py` - Access control
- `test_api.py` - API helpers
- `test_data_contract.py` - Data contract validation
- `test_enablement_import.py` - Enablement import
- `test_events.py` - Event models
- `test_metrics.py` - Metrics rollups
- `test_organization.py` - Organization logic
- `test_passive_signals.py` - Passive signals
- `test_roster_import.py` - Roster import
- `test_teams_roles.py` - Teams/roles CRUD
- `test_tool_inventory.py` - Tool inventory

**Run Tests**:
```bash
python -m pytest tests/ -v           # Run all Python tests
python -m pytest tests/test_vision.py  # Run specific file
```

**Total Test Count**: 83 tests (57 Python existing + 26 vision module)

---

## 7. Edit Targets for Behavioral Signals Lane

### Files to Create (New)

1. **Backend Schema**:
   - `shared/src/behavioral_signals_schemas.ts` - Zod schemas for behavioral signals

2. **Backend Logic**:
   - `backend/src/behavioral_signals.ts` - Core behavioral signal processing
   - `backend/src/behavioral_patterns.ts` - Pattern detection logic

3. **Backend Tests**:
   - `backend/tests/behavioral_signals.test.ts` - Signal ingestion tests
   - `backend/tests/behavioral_patterns.test.ts` - Pattern detection tests

4. **Documentation**:
   - `docs/BEHAVIORAL_SIGNALS_SPEC.md` - Design specification (next step)

### Files to Modify (Existing)

1. **Backend App**:
   - `backend/src/app.ts` - Add new ingest + query endpoints

2. **Backend Store**:
   - `backend/src/store.ts` - Add new maps for behavioral signals

3. **Shared Types**:
   - `shared/src/types.ts` - Add signal enums
   - `shared/src/schemas.ts` - Export behavioral schemas
   - `shared/src/index.ts` - Export new types

4. **Suppression Logic**:
   - `backend/src/suppression.ts` - Extend for behavioral signals (or create variant)

5. **RBAC**:
   - `backend/src/rbac.ts` - Add capability for behavioral signals access

6. **Dashboard API** (if adding patterns view):
   - `backend/src/app.ts` (dashboard overview endpoint)

7. **Frontend** (optional, for visualization):
   - `frontend/src/pages/Dashboard.tsx` - Add patterns visualization

### Files NOT to Modify

- ✅ `backend/src/fluency_service.ts` - Deprecated legacy score boundary only;
  do not re-enable score calculation or customer-facing score export
- ✅ `backend/src/enablement*.ts` - Training events are separate
- ✅ `backend/src/spread_metrics.ts` - Adoption spread is separate
- ✅ Python modules (`src/`, `vision/`) - Keep separate from behavioral signals

---

## Summary Table

| Component | Technology | Location | Purpose |
|-----------|-----------|----------|---------|
| **Backend API** | TypeScript + Express | `backend/src/app.ts` | REST API endpoints |
| **Data Store** | In-memory Maps | `backend/src/store.ts` | Volatile storage |
| **Schemas** | Zod | `shared/src/schemas.ts` | Validation |
| **Suppression** | TypeScript | `backend/src/suppression.ts` | Privacy k-anonymity |
| **Fluency** | TypeScript | `backend/src/fluency_service.ts` | Maturity scoring |
| **Tests (TS)** | Jest | `backend/tests/` | Backend tests |
| **Tests (Python)** | pytest | `tests/` | Python tests |
| **Frontend** | React + Vite | `frontend/src/` | Dashboard UI |
| **Vision** | Python + OpenCV | `vision/` | Environmental detection |
| **Database** | PostgreSQL (future) | `backend/prisma/schema.prisma` | Persistent storage |

---

## Next Steps for Behavioral Signals

1. ✅ **Architecture Map** (this document)
2. ⏭️ **Design Specification** (next document)
3. ⏭️ Implementation in TypeScript backend
4. ⏭️ Test suite
5. ⏭️ Frontend patterns visualization (optional)
