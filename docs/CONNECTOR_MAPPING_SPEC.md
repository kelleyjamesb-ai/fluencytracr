# FluencyTracr Connector Mapping Spec

**Date**: 2026-01-12
**Status**: Integration Baseline
**Purpose**: Connector discovery, mapping specification, and validation plan for partner ingestion

---

## Current Addition: Glean Dogfood BigQuery Adapter

Status: internal-only, read-only adapter scaffold.

The Glean dogfood BigQuery adapter maps three scrubbed, date-sharded internal
tables into the existing `FT_V3_2026_05` aggregate ingest payload shape. It is
not a new canonical event contract and does not add endpoints, production
connectors, dashboards, ROI calculations, causality claims, or person-level
storage.

| Source key | BigQuery pattern | Mapping |
| --- | --- | --- |
| `scrubbed_llm_call` | `scio-apps.scrubbed_llm_call.scrubbed_llm_call_*` | Aggregate LLM invocation, model, workflow, status, token, and latency evidence into V3 velocity and quality fields. |
| `scrubbed_client_analytics` | `scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*` | Aggregate surface engagement and client interaction evidence into V3 velocity and quality fields. |
| `scrubbed_workflows` | `scio-apps.scrubbed_workflows.scrubbed_workflows_*` | Aggregate workflow, agent, step, citation, trigger, model, and execution evidence into V3 velocity and quality fields. |

Boundary:

- Source allowlists are broad and pinned in
  `src/connectors/glean_dogfood_bq/adapter.py`.
- Output is narrow and aggregate-only: `schema_version`, cohort/workflow/window
  metadata, `cohort_size`, `calibration_id`, `velocity`, `quality_signals`, and
  `privacy.person_level_fields_included = false`.
- Connector-side k-min is enforced per independent slice before emission.
- Queries require `_TABLE_SUFFIX` or a partition guard and are capped at 100 GB
  estimated bytes unless explicitly overridden.
- Forbidden field names fail closed before payload emission.

See [docs/integrations/glean/dogfood-bq-adapter.md](integrations/glean/dogfood-bq-adapter.md).

---

## Part A: Repo Architecture Map

### 1. Repository Structure (2 levels deep)

```
LearnAIR_Engable_Tool/
├── backend/                    # TypeScript Express API server
│   ├── prisma/                # PostgreSQL schema (future DB)
│   ├── src/                   # Backend source code
│   └── tests/                 # Jest test suite
├── shared/                     # Shared TypeScript types/schemas
│   └── src/                   # Shared source code
├── frontend/                   # React + Vite frontend
│   └── src/                   # Frontend source code
├── docs/                       # Documentation
├── infra/                      # Infrastructure (docker-compose)
├── tools/                      # Utility scripts (vocabulary checker)
├── src/                        # Python modules (legacy/vision)
├── tests/                      # Python pytest suite
├── vision/                     # Vision Intelligence Module (Python/OpenCV)
└── examples/                   # Example integrations
```

**Total Source Files**: 1,532 (TypeScript, TSX, Python)

---

### 2. Key Packages/Folders

| Package | Purpose | Key Files |
|---------|---------|-----------|
| **backend/src/** | Express API, business logic | app.ts, store.ts, suppression.ts, fluency_service.ts, behavioral_signals.ts |
| **shared/src/** | Shared types, schemas, validation | types.ts, schemas.ts, privacy.ts |
| **frontend/src/** | React dashboard UI | Dashboard.tsx, main.tsx |
| **backend/tests/** | Jest integration tests | ~20 test files |
| **docs/** | Architecture docs | ARCHITECTURE_MAP.md, BEHAVIORAL_SIGNALS_SPEC.md |
| **infra/** | Docker compose | docker-compose.yml |
| **tools/** | Build/validation tools | check_vocabulary.js |

---

### 3. Existing Ingest Endpoints and Routes

#### Ingest Endpoints (from `backend/src/app.ts`)

| Endpoint | Method | Purpose | Schema | Line |
|----------|--------|---------|--------|------|
| `/orgs/:orgId/metrics/import` | POST | Ingest metric observations | `MetricObservationSchema` | 546 |
| `/orgs/:orgId/controls/import` | POST | Ingest policy control observations | `PolicyControlObservationSchema` | 595 |
| `/orgs/:orgId/enablement/import` | POST | Ingest training event rollups | `TrainingEventRollupSchema` | 615 |
| `/enablement/import` | POST | Ingest raw enablement events (CSV/JSON) | `EnablementEventSchema` | 345 |
| `/orgs/:orgId/groups` | POST | Upsert groups (org/team/role) | `GroupUpsertSchema` | 526 |
| `/orgs/:orgId/tools` | POST | Ingest tool inventory | `ToolInventorySchema` | 429 |
| `/orgs/:orgId/usage-shape` | POST | Ingest usage frequency bands | `UsageShapeSchema` | 470 |
| `/orgs/:orgId/behavior/import` | POST | Ingest behavioral signals | `BehavioralSignalImportSchema` | 793 |
| `/api/ingest` | POST | Partner-facing asynchronous facade for intake acknowledgment, queue semantics, and dedupe | `FluencyEventIngestSchema` envelope (aligned with `/api/events`) | 635 |

#### Connector Responsibilities for `/api/ingest`
- Add `Idempotency-Key` per logical batch submission.
- Handle `429` responses with bounded exponential backoff and retry.
- Scope submissions by `org_id` and integration identity.
- Do not send raw prompt content, model output content, transcripts, or direct identifiers.

#### Request Validation Approach

**Location**: `shared/src/schemas.ts` (Zod schemas)

**Validation Layers**:
1. **Zod Schema Validation**: All endpoints parse with `safeParse()`
2. **Forbidden Fields Check**: `rejectForbiddenFields` middleware (line 345, 526, 546, etc.)
3. **Privacy Filter**: `containsForbiddenFields()` from `shared/src/privacy.ts`

**Forbidden Fields** (`shared/src/privacy.ts`):
```typescript
export const NON_COLLECTABLE_FIELDS = [
  "prompt_content",
  "output_content",
  "keystrokes",
  "file_names",
  "message_text",
  "raw_logs"
] as const;
```

**Example Schema** (`MetricObservationSchema`):
```typescript
export const MetricObservationSchema = z.object({
  group_key: z.string(),
  group_type: z.enum(["org", "team", "role"]),
  metric_name: z.string(),
  metric_value: z.number().nullable(),
  bucket_start: z.string(),
  bucket_end: z.string().optional(),
  vendor: z.string().optional(),
  is_user_count: z.boolean().optional()
});
```

---

### 4. Data Store Implementation

**Type**: In-Memory Store (No Database Persistence)

**Location**: `backend/src/store.ts`

**Store Class**:
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
  functions = new Map<string, FunctionRecord>();
  behavioralSignals = new Map<string, BehavioralSignalRecord>();
}
```

**Keying Strategy** (Composite Keys):
- **Metrics**: `${orgId}:${group_key}:${bucket_start}:${metric_name}:${vendor}`
- **Groups**: `${orgId}:${group_key}`
- **Tool Inventory**: `${orgId}:${teamId}:${toolClass}`
- **Behavioral Signals**: `${orgId}:${groupId}:${bucketStart}:${signalName}:${toolClass}`

**Upsert Functions**:
- `upsertMetric()`, `upsertControl()`, `upsertEnablement()`
- `upsertBehavioralSignal()`, `upsertGroup()`
- Returns: `{ inserted: boolean }`

**Future**: Prisma schema exists at `backend/prisma/schema.prisma` but not yet connected

---

### 5. Suppression/Rollup Logic

#### Metrics Suppression (`backend/src/suppression.ts`)

**Algorithm**:
```typescript
export const applySuppression = (metrics: Metric[], minGroupSize: number): Metric[] => {
  return metrics.map((metric) => {
    if (metric.isUserCount && metric.metricValue !== null && metric.metricValue < minGroupSize) {
      return { ...metric, suppressed: true, metricValue: null };
    }
    return metric;
  });
};
```

**Min Group Size**: `k=10` (default from `OrgRecord.minGroupSize`)

**Rollup**: `rollupSuppressedToOrg()` sums suppressed groups to org level

**Applied At**: `/orgs/:orgId/metrics/import` endpoint (line 548-560)

#### Behavioral Signals Suppression (`backend/src/behavioral_signals.ts`)

**Algorithm**: More stringent `k=5` suppression
- Team/role groups < 5 members: `suppressed = true, count = 0`
- Function/org groups: never suppressed by size
- Automatic rollup to parent function → org

**Applied At**: `/orgs/:orgId/behavior/import` endpoint (line 826)

---

### 6. Org/Team/Role/Function Grouping Model

#### Data Model (`backend/src/store.ts`)

```typescript
type OrgRecord = {
  id: string;              // "org-uuid"
  name: string;
  minGroupSize: number;    // k-anonymity threshold (default 10)
  createdAt: string;
}

type TeamRecord = {
  id: string;              // "team-uuid"
  orgId: string;
  name: string;
  parentTeamId?: string;   // Hierarchical teams
}

type RoleRecord = {
  id: string;              // "role-uuid"
  orgId: string;
  name: string;
}

type FunctionRecord = {   // NEW: Added for behavioral signals
  id: string;              // "function-uuid"
  orgId: string;
  name: string;
}

type EmployeeRecord = {
  orgId: string;
  employeeHash: string;    // SHA-256 hash (privacy)
  teamIds: Set<string>;    // Many-to-many
  roleIds: Set<string>;    // Many-to-many
}
```

#### CRUD Endpoints

| Resource | Endpoints | Methods |
|----------|-----------|---------|
| Orgs | `/orgs` | POST (create) |
| Teams | `/orgs/:orgId/teams`, `/orgs/:orgId/teams/:teamId` | GET, POST, PATCH, DELETE |
| Roles | `/orgs/:orgId/roles`, `/orgs/:orgId/roles/:roleId` | GET, POST, PATCH, DELETE |
| Roster | `/orgs/:orgId/roster/import` | POST (CSV import) |

**Grouping in Metrics**:
- `group_key`: Can be `orgId`, `teamId`, or `roleId`
- `group_type`: Enum `"org" | "team" | "role" | "function"`
- `vendor`: Optional tool/vendor identifier (e.g., "microsoft", "google")

---

### 7. Deprecated Legacy Score Quarantine

**Location**: `backend/src/fluency_service.ts`

**Status**: Deprecated and quarantined. The historical job
`runFluencyIndexJob(orgId: string)` remains only as a no-op compatibility
boundary so old imports fail closed.

The previous weighted formula is intentionally not documented as an active
product contract. FluencyTracr now exposes aggregate value-realization evidence
through fail-closed `SURFACE` / `SUPPRESS` verdicts, Quality Multiplier,
Reliability Factor, Causal Delta, Outcome Evidence, and Velocity Index outputs.

**Do not re-enable** a general index, weighted interaction score, dashboard score export, team ranking, or productivity score from connector metrics.

---

### 8. Test Framework

#### Backend Tests (TypeScript/Jest)

**Command**: `npm test` (from `backend/` directory)

**Framework**: Jest + ts-jest

**Test Files** (`backend/tests/`):
- `ingest.test.ts` - Ingest validation
- `suppression.test.ts` - Privacy suppression
- `fluency_index.test.ts` - Deprecated legacy score quarantine regression
- `behavioral_signals.test.ts` - Behavioral signals (18 tests)
- `behavioral_patterns.test.ts` - Pattern detection (18 tests)
- ~15 more test files

**Test Pattern**:
```typescript
describe("Feature", () => {
  beforeEach(() => {
    store.reset();  // Reset in-memory store
    // Create test fixtures
  });

  test("specific behavior", () => {
    // Arrange, Act, Assert
  });
});
```

**Integration Tests**: Use supertest for HTTP endpoint testing (implied, not visible in current files)

#### Python Tests (pytest)

**Command**: `python -m pytest tests/ -v`

**Framework**: pytest

**Test Files** (`tests/`):
- `test_vision.py` (26 tests)
- `test_fluency.py` (7 tests)
- ~15 more test files

**Total**: 83 Python tests passing

#### Full Suite

**Commands**:
```bash
# Backend tests
cd backend && npm test

# Python tests
python -m pytest tests/ -v

# Frontend tests (if exist)
cd frontend && npm test

# Vocabulary check
node tools/check_vocabulary.js
```

---

## Part B: Connector Discovery Findings

### Search Results

**Keywords Searched**: connector, integration, adapter, vendor, mapping, taxonomy

**Files Found**: 21 files contain these keywords

**Key Findings**:

#### 1. **Vendor Field Usage**
- Metrics, controls, and enablement schemas include optional `vendor?: string` field
- Used for filtering in dashboard queries (line 663 in app.ts)
- Examples: "microsoft", "google", "all"
- **Purpose**: Distinguish data source tool/platform

#### 2. **Tool Taxonomy Exists**
- **Location**: `shared/src/types.ts`
- **Tool Classes** (line 1-7):
  ```typescript
  export const TOOL_CLASSES = [
    "llm_chat",
    "research",
    "coding",
    "workflow_automation",
    "embedded_ai"
  ] as const;
  ```
- Used in `ToolInventorySchema` and `UsageShapeSchema`

#### 3. **Vocabulary Control**
- **Location**: `shared/controlled-vocabulary.json`
- **Tool**: `tools/check_vocabulary.js`
- **Purpose**: Enforce non-punitive language
- **Forbidden Terms**: "Productivity", "Monitoring", "Tracking", "Performance", "Efficiency per employee"
- **Allowed Terms**: "Fluency", "Coverage", "Adoption", "Enablement effectiveness"

#### 4. **Privacy Enforcement**
- **Location**: `shared/src/privacy.ts`
- **Forbidden Fields**: `prompt_content`, `output_content`, `keystrokes`, `file_names`, `message_text`, `raw_logs`
- **Validation**: `containsForbiddenFields()` recursively checks payloads
- **Middleware**: `rejectForbiddenFields` applied to all ingest endpoints

### Connector Structure: **DOES NOT EXIST**

**Conclusion**: No formal connector abstraction layer exists. Current approach:
1. External tools directly post to ingest endpoints
2. Validation at endpoint level (Zod schemas + forbidden fields)
3. No transformation layer between external events and internal schemas
4. `vendor` field is the only connector identifier

**Implications**:
- Tools must conform to FluencyTracr schemas directly
- No validation that "delegate_to_agent" from Tool A means same as Tool B
- No enforcement of "agentic boundary" (external side effect requirement)
- Mapping drift risk: tools may interpret signal_name differently

---

### Best Place to Introduce Connector Layer

**Recommendation**: `backend/src/connectors/` or `shared/src/connectors/`

**Option 1 - Backend Connectors** (Preferred):
```
backend/src/connectors/
  ├── base/
  │   ├── ConnectorBase.ts        # Abstract connector interface
  │   └── ConnectorRegistry.ts    # Connector registration/discovery
  ├── mappings/
  │   ├── chat-tool.mapping.yaml  # Chat tool mapping spec
  │   └── workflow-agent.mapping.yaml
  ├── implementations/
  │   ├── ChatToolConnector.ts
  │   └── WorkflowAgentConnector.ts
  └── validation/
      └── MappingValidator.ts     # Validates connector mappings
```

**Option 2 - Shared Connectors** (Alternative):
```
shared/src/connectors/
  ├── types.ts                    # Connector types
  ├── schemas.ts                  # Connector mapping schemas
  └── mappings/                   # YAML mapping specs
```

**Rationale for Backend**:
- Connectors are server-side transformation layer
- Can access store for context (e.g., check if action had side effect)
- Frontend doesn't need connector logic
- Easier to add connector-specific dependencies

---

### Existing Ingest Schemas Connectors Must Target

**From `shared/src/schemas.ts`**:

1. **MetricObservationSchema** - Usage metrics
   - `group_key`, `group_type`, `metric_name`, `metric_value`, `bucket_start`, `vendor`

2. **PolicyControlObservationSchema** - Policy compliance
   - `group_key`, `group_type`, `control_name`, `control_value`, `bucket_start`, `vendor`

3. **TrainingEventRollupSchema** - Enablement events
   - `group_key`, `group_type`, `event_type`, `event_count`, `bucket_start`, `vendor`

4. **BehavioralSignalAggregateSchema** - Agentic delegation signals (NEW)
   - `org_id`, `group_id`, `group_type`, `signal_name`, `count`, `bucket_start`, `function_id`, `tool_class`, `metadata`

**Key Target for Connectors**: `BehavioralSignalAggregateSchema` (agentic signals)

---

## Part C: Connector Mapping Spec (Draft)

### Overview

A **Connector Mapping Spec** is a declarative YAML/JSON document that defines how external tool events map to internal FluencyTracr signal names. Each connector must provide a mapping spec that is validated before deployment.

### Design Principles

1. **Tool-Agnostic**: Signal definitions are universal, not tool-specific
2. **No Content**: Never include prompts, outputs, keystrokes, or message text
3. **Agentic Boundary**: `delegate_to_agent` requires external side effect (not just chat/draft)
4. **Explicit Mapping**: Every external event type maps to exactly one internal signal_name
5. **Validation**: Automated tests prevent mapping drift

---

### Connector Mapping Schema (YAML)

```yaml
# connector_mapping_spec_v1.yaml

connector_metadata:
  connector_name: string              # e.g., "copilot-chat-connector"
  connector_version: string           # Semantic version, e.g., "1.0.0"
  vendor: string                      # Tool vendor, e.g., "microsoft"
  tool_class: string                  # From TOOL_CLASSES enum
  created_at: ISO8601                 # Spec creation date
  author: string                      # Contact email

signal_mappings:
  - external_event_type: string       # Tool's native event name
    internal_signal_name: SignalName  # FluencyTracr signal enum
    requires_side_effect: boolean     # True for delegate_to_agent
    validation_rules:
      - rule_type: string             # e.g., "field_exists", "value_equals"
        field_path: string            # JSON path to validate
        expected_value: any           # Expected value or pattern
    examples:
      - external_event: object        # Example external event JSON
        expected_signal: object       # Expected internal signal output
    notes: string                     # Human-readable explanation

forbidden_fields:
  - field_name: string                # Fields that must never appear
    reason: string                    # Why forbidden (privacy/content)

metadata_flags:
  - flag_name: string                 # e.g., "has_human_review"
    extraction_rule: string           # How to extract from external event
    default_value: boolean            # Default if not present

validation_config:
  strict_mode: boolean                # Fail on unknown external events
  log_unmapped_events: boolean        # Log events that don't match any mapping
  require_all_signals: boolean        # Require all internal signals mapped
```

---

### Signal Definitions (v0)

**v0 Signal Set** (from task requirements):
```typescript
type SignalName =
  | "invoke_ai"              // User initiates AI interaction (no side effect yet)
  | "delegate_to_agent"      // AI performs action with EXTERNAL SIDE EFFECT
  | "revoke_agent"           // User cancels/stops AI action
  | "refine_request"         // User edits prompt/refines AI instructions
  | "accept_output"          // User accepts AI-generated output
  | "retry_after_mismatch"   // User retries after AI output was incorrect
  | "override_to_manual"     // User bypasses AI and does task manually
```

**NOTE**: Current behavioral signals implementation uses different signal names:
- `delegate_send_message`, `delegate_file_update`, etc.

**For Connector Spec, use v0 names from task requirements.**

---

### "What Counts" and "What Does Not Count"

#### invoke_ai
**Counts**:
- User opens AI chat interface
- User sends prompt to AI (no action taken yet)
- User starts AI workflow

**Does NOT Count**:
- Hovering over AI button
- Viewing AI suggestions (passive)
- AI autocomplete without user trigger

#### delegate_to_agent
**Counts** (MUST have external side effect):
- ✅ AI sends email on user's behalf
- ✅ AI commits code to repository
- ✅ AI creates calendar event
- ✅ AI updates database record
- ✅ AI posts message to Slack channel

**Does NOT Count** (no external side effect):
- ❌ AI drafts email but user doesn't send
- ❌ AI suggests code but doesn't commit
- ❌ AI generates text that stays in local editor
- ❌ Chat/Q&A without action
- ❌ Research/search that doesn't modify external state

#### revoke_agent
**Counts**:
- User clicks "Stop" button mid-execution
- User cancels pending AI action
- User reverts AI-made change

**Does NOT Count**:
- User closes AI panel
- User ignores AI suggestion

#### refine_request
**Counts**:
- User edits prompt and re-sends
- User provides additional context to AI
- User clarifies previous instruction

**Does NOT Count**:
- User starts entirely new conversation
- User switches to different AI tool

#### accept_output
**Counts**:
- User clicks "Accept" on AI suggestion
- User keeps AI-generated content
- User approves AI-made change

**Does NOT Count**:
- Passive acceptance (no explicit action)
- Keeping draft without confirmation

#### retry_after_mismatch
**Counts**:
- User re-runs AI after rejecting output
- User tries different prompt after failure
- User reports "incorrect" and retries

**Does NOT Count**:
- User abandons task after mismatch
- User switches to manual mode

#### override_to_manual
**Counts**:
- User explicitly chooses manual mode over AI
- User completes task manually after AI failed
- User disables AI for specific task

**Does NOT Count**:
- User does manual task without considering AI
- AI wasn't available to begin with

---

### Example Connector Mapping Spec (Chat Tool)

```yaml
# chat-tool-connector.mapping.yaml

connector_metadata:
  connector_name: "chat-tool-connector"
  connector_version: "1.0.0"
  vendor: "example-vendor"
  tool_class: "llm_chat"
  created_at: "2026-01-12T00:00:00Z"
  author: "eng@example.com"

signal_mappings:
  # invoke_ai
  - external_event_type: "chat.conversation.started"
    internal_signal_name: "invoke_ai"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_exists"
        field_path: "event.conversation_id"
        expected_value: null
    examples:
      - external_event:
          event_type: "chat.conversation.started"
          conversation_id: "conv-123"
          user_id: "user-456"  # Will be stripped
        expected_signal:
          signal_name: "invoke_ai"
          count: 1
          metadata: {}
    notes: "User opens chat interface or sends first prompt"

  # delegate_to_agent (requires side effect)
  - external_event_type: "chat.action.executed"
    internal_signal_name: "delegate_to_agent"
    requires_side_effect: true
    validation_rules:
      - rule_type: "field_equals"
        field_path: "event.action_type"
        expected_value: "execute_external"
      - rule_type: "field_exists"
        field_path: "event.side_effect_occurred"
        expected_value: true
    examples:
      - external_event:
          event_type: "chat.action.executed"
          action_type: "execute_external"
          side_effect_occurred: true
          action_details: "sent_email"
        expected_signal:
          signal_name: "delegate_to_agent"
          count: 1
          metadata:
            is_cross_system: false
    notes: "AI performed action with external side effect (email sent, file updated, etc.)"

  # accept_output
  - external_event_type: "chat.suggestion.accepted"
    internal_signal_name: "accept_output"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_exists"
        field_path: "event.suggestion_id"
        expected_value: null
    examples:
      - external_event:
          event_type: "chat.suggestion.accepted"
          suggestion_id: "sugg-789"
        expected_signal:
          signal_name: "accept_output"
          count: 1
          metadata:
            has_human_review: true
    notes: "User explicitly accepted AI-generated content"

  # refine_request
  - external_event_type: "chat.prompt.edited"
    internal_signal_name: "refine_request"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_exists"
        field_path: "event.previous_prompt_id"
        expected_value: null
    examples:
      - external_event:
          event_type: "chat.prompt.edited"
          previous_prompt_id: "prompt-111"
          new_prompt_id: "prompt-222"
        expected_signal:
          signal_name: "refine_request"
          count: 1
          metadata: {}
    notes: "User edited prompt and re-sent (clarification or correction)"

  # override_to_manual
  - external_event_type: "chat.manual_mode.enabled"
    internal_signal_name: "override_to_manual"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_equals"
        field_path: "event.reason"
        expected_value: "user_initiated"
    examples:
      - external_event:
          event_type: "chat.manual_mode.enabled"
          reason: "user_initiated"
        expected_signal:
          signal_name: "override_to_manual"
          count: 1
          metadata: {}
    notes: "User explicitly chose manual mode over AI"

forbidden_fields:
  - field_name: "prompt_content"
    reason: "Privacy: Never collect prompt text"
  - field_name: "response_content"
    reason: "Privacy: Never collect AI output text"
  - field_name: "user_id"
    reason: "Privacy: Only collect aggregated group-level data"
  - field_name: "message_text"
    reason: "Privacy: Never collect message content"

metadata_flags:
  - flag_name: "has_human_review"
    extraction_rule: "event.requires_approval == true OR event.approval_flow_triggered == true"
    default_value: false
  - flag_name: "is_cross_system"
    extraction_rule: "event.action_targets.length > 1"
    default_value: false

validation_config:
  strict_mode: true
  log_unmapped_events: true
  require_all_signals: false  # Not all tools support all signals
```

---

### Example Connector Mapping Spec (Workflow Agent Tool)

```yaml
# workflow-agent-connector.mapping.yaml

connector_metadata:
  connector_name: "workflow-agent-connector"
  connector_version: "1.0.0"
  vendor: "workflow-vendor"
  tool_class: "workflow_automation"
  created_at: "2026-01-12T00:00:00Z"
  author: "eng@workflow-vendor.com"

signal_mappings:
  # invoke_ai
  - external_event_type: "workflow.agent.invoked"
    internal_signal_name: "invoke_ai"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_exists"
        field_path: "workflow.id"
        expected_value: null
    examples:
      - external_event:
          event_type: "workflow.agent.invoked"
          workflow_id: "wf-123"
          trigger: "user_manual"
        expected_signal:
          signal_name: "invoke_ai"
          count: 1
    notes: "User manually triggers workflow agent"

  # delegate_to_agent (requires side effect)
  - external_event_type: "workflow.step.completed"
    internal_signal_name: "delegate_to_agent"
    requires_side_effect: true
    validation_rules:
      - rule_type: "field_equals"
        field_path: "step.type"
        expected_value: "external_action"
      - rule_type: "field_equals"
        field_path: "step.status"
        expected_value: "success"
    examples:
      - external_event:
          event_type: "workflow.step.completed"
          step_id: "step-456"
          step_type: "external_action"
          step_status: "success"
          action_details:
            type: "update_record"
            system: "crm"
        expected_signal:
          signal_name: "delegate_to_agent"
          count: 1
          metadata:
            is_cross_system: true
    notes: "Agent completed step with external side effect (updated CRM, sent notification, etc.)"

  # revoke_agent
  - external_event_type: "workflow.execution.cancelled"
    internal_signal_name: "revoke_agent"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_equals"
        field_path: "cancellation.reason"
        expected_value: "user_requested"
    examples:
      - external_event:
          event_type: "workflow.execution.cancelled"
          workflow_id: "wf-789"
          cancellation_reason: "user_requested"
        expected_signal:
          signal_name: "revoke_agent"
          count: 1
    notes: "User explicitly cancelled running workflow"

  # retry_after_mismatch
  - external_event_type: "workflow.retry.triggered"
    internal_signal_name: "retry_after_mismatch"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_exists"
        field_path: "retry.previous_attempt_id"
        expected_value: null
    examples:
      - external_event:
          event_type: "workflow.retry.triggered"
          workflow_id: "wf-111"
          previous_attempt_id: "attempt-222"
          retry_reason: "output_mismatch"
        expected_signal:
          signal_name: "retry_after_mismatch"
          count: 1
    notes: "User retries workflow after previous execution failed or produced incorrect output"

  # accept_output
  - external_event_type: "workflow.output.approved"
    internal_signal_name: "accept_output"
    requires_side_effect: false
    validation_rules:
      - rule_type: "field_exists"
        field_path: "approval.approved_by_user"
        expected_value: true
    examples:
      - external_event:
          event_type: "workflow.output.approved"
          workflow_id: "wf-333"
          approved_by_user: true
        expected_signal:
          signal_name: "accept_output"
          count: 1
          metadata:
            has_human_review: true
    notes: "User explicitly approved workflow output"

forbidden_fields:
  - field_name: "workflow_input_data"
    reason: "Privacy: May contain sensitive prompts or parameters"
  - field_name: "workflow_output_data"
    reason: "Privacy: May contain generated content"
  - field_name: "user_email"
    reason: "Privacy: Only collect aggregated group-level data"
  - field_name: "file_paths"
    reason: "Privacy: Never collect file names or paths"

metadata_flags:
  - flag_name: "has_human_review"
    extraction_rule: "workflow.approval_required == true"
    default_value: true  # Workflows often have approval steps
  - flag_name: "is_cross_system"
    extraction_rule: "workflow.step_count > 2 AND workflow.systems.length > 1"
    default_value: true  # Workflows often orchestrate multiple systems
  - flag_name: "requires_approval"
    extraction_rule: "workflow.approval_step_exists == true"
    default_value: false

validation_config:
  strict_mode: true
  log_unmapped_events: true
  require_all_signals: false
```

---

### Connector Mapping Schema (JSON Schema)

For automated validation, define JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FluencyTracr Connector Mapping Spec v1",
  "type": "object",
  "required": ["connector_metadata", "signal_mappings", "forbidden_fields", "validation_config"],
  "properties": {
    "connector_metadata": {
      "type": "object",
      "required": ["connector_name", "connector_version", "vendor", "tool_class"],
      "properties": {
        "connector_name": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "connector_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "vendor": { "type": "string" },
        "tool_class": {
          "type": "string",
          "enum": ["llm_chat", "research", "coding", "workflow_automation", "embedded_ai"]
        },
        "created_at": { "type": "string", "format": "date-time" },
        "author": { "type": "string", "format": "email" }
      }
    },
    "signal_mappings": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["external_event_type", "internal_signal_name", "requires_side_effect"],
        "properties": {
          "external_event_type": { "type": "string" },
          "internal_signal_name": {
            "type": "string",
            "enum": [
              "invoke_ai",
              "delegate_to_agent",
              "revoke_agent",
              "refine_request",
              "accept_output",
              "retry_after_mismatch",
              "override_to_manual"
            ]
          },
          "requires_side_effect": { "type": "boolean" },
          "validation_rules": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["rule_type", "field_path"],
              "properties": {
                "rule_type": {
                  "type": "string",
                  "enum": ["field_exists", "field_equals", "field_matches", "value_in_range"]
                },
                "field_path": { "type": "string" },
                "expected_value": {}
              }
            }
          },
          "examples": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["external_event", "expected_signal"],
              "properties": {
                "external_event": { "type": "object" },
                "expected_signal": { "type": "object" }
              }
            }
          },
          "notes": { "type": "string" }
        }
      }
    },
    "forbidden_fields": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["field_name", "reason"],
        "properties": {
          "field_name": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "metadata_flags": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["flag_name", "extraction_rule", "default_value"],
        "properties": {
          "flag_name": {
            "type": "string",
            "enum": ["has_human_review", "is_cross_system", "requires_approval"]
          },
          "extraction_rule": { "type": "string" },
          "default_value": { "type": "boolean" }
        }
      }
    },
    "validation_config": {
      "type": "object",
      "required": ["strict_mode", "log_unmapped_events", "require_all_signals"],
      "properties": {
        "strict_mode": { "type": "boolean" },
        "log_unmapped_events": { "type": "boolean" },
        "require_all_signals": { "type": "boolean" }
      }
    }
  }
}
```

---

## Part D: Automated Mapping Tests Plan

### Test Location

**Recommended**: `backend/tests/connectors/` (new directory)

```
backend/tests/connectors/
  ├── fixtures/
  │   ├── chat-tool.mapping.yaml
  │   ├── workflow-agent.mapping.yaml
  │   └── sample-events.json
  ├── ConnectorMappingValidator.test.ts
  ├── ChatToolConnector.test.ts
  └── WorkflowAgentConnector.test.ts
```

---

### Test Harness Design

#### Test Framework: Jest (existing backend framework)

#### Test Harness Components:

1. **Mapping Loader**: Reads YAML mapping spec from fixtures
2. **Event Transformer**: Applies mapping rules to external events
3. **Assertion Engine**: Validates output matches expected signal
4. **Privacy Validator**: Ensures no forbidden fields in output
5. **Side Effect Checker**: Validates `delegate_to_agent` requires side effect flag

#### Test Harness Pseudocode:

```typescript
describe("Connector Mapping Tests", () => {
  let mappingSpec: ConnectorMappingSpec;
  let transformer: EventTransformer;

  beforeAll(() => {
    mappingSpec = loadMappingSpec("fixtures/chat-tool.mapping.yaml");
    transformer = new EventTransformer(mappingSpec);
  });

  test("loads mapping spec without errors", () => {
    expect(mappingSpec).toBeDefined();
    expect(mappingSpec.connector_metadata.connector_name).toBe("chat-tool-connector");
  });

  test("transforms external event to internal signal", () => {
    const externalEvent = {
      event_type: "chat.conversation.started",
      conversation_id: "conv-123",
      user_id: "user-456"  // Should be stripped
    };

    const result = transformer.transform(externalEvent);

    expect(result.signal_name).toBe("invoke_ai");
    expect(result.count).toBe(1);
    expect(result).not.toHaveProperty("user_id");  // Privacy check
  });

  test("rejects event with forbidden fields", () => {
    const externalEvent = {
      event_type: "chat.conversation.started",
      prompt_content: "Secret prompt"  // Forbidden!
    };

    expect(() => transformer.transform(externalEvent)).toThrow("Forbidden field: prompt_content");
  });

  test("validates delegate_to_agent requires side_effect flag", () => {
    const externalEvent = {
      event_type: "chat.action.executed",
      action_type: "execute_external",
      side_effect_occurred: false  // Missing side effect!
    };

    expect(() => transformer.transform(externalEvent)).toThrow(
      "delegate_to_agent requires side_effect_occurred=true"
    );
  });

  test("all examples in mapping spec produce expected signals", () => {
    mappingSpec.signal_mappings.forEach((mapping) => {
      mapping.examples?.forEach((example) => {
        const result = transformer.transform(example.external_event);
        expect(result.signal_name).toBe(example.expected_signal.signal_name);
        expect(result.count).toBe(example.expected_signal.count);
      });
    });
  });

  test("unmapped external event logs warning in non-strict mode", () => {
    const unknownEvent = { event_type: "unknown.event" };

    if (mappingSpec.validation_config.strict_mode) {
      expect(() => transformer.transform(unknownEvent)).toThrow("Unmapped event type");
    } else {
      const result = transformer.transform(unknownEvent);
      expect(result).toBeNull();
      // Should log warning (check logs)
    }
  });

  test("internal signal enum is exhaustive", () => {
    const validSignals = [
      "invoke_ai",
      "delegate_to_agent",
      "revoke_agent",
      "refine_request",
      "accept_output",
      "retry_after_mismatch",
      "override_to_manual"
    ];

    mappingSpec.signal_mappings.forEach((mapping) => {
      expect(validSignals).toContain(mapping.internal_signal_name);
    });
  });

  test("metadata flags are extracted correctly", () => {
    const externalEvent = {
      event_type: "chat.action.executed",
      action_type: "execute_external",
      side_effect_occurred: true,
      requires_approval: true  // Should set has_human_review=true
    };

    const result = transformer.transform(externalEvent);

    expect(result.metadata.has_human_review).toBe(true);
  });

  test("mapping spec version matches expected", () => {
    expect(mappingSpec.connector_metadata.connector_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("connector prevents mapping drift", () => {
    // Load previous version of mapping spec
    const previousSpec = loadMappingSpec("fixtures/chat-tool.mapping.v0.9.0.yaml");
    const currentSpec = mappingSpec;

    // Assert mappings haven't changed unintentionally
    // (This test fails if mappings change without explicit version bump)
    const previousMappingHashes = hashMappings(previousSpec);
    const currentMappingHashes = hashMappings(currentSpec);

    expect(currentMappingHashes).toEqual(previousMappingHashes);
    // If test fails, must bump connector_version
  });
});
```

---

### Example Test Cases

#### Test Suite 1: Chat Tool Connector

| Test Case | External Event | Expected Signal | Assertions |
|-----------|---------------|-----------------|------------|
| TC-1.1: Conversation started | `{ event_type: "chat.conversation.started", conversation_id: "conv-123" }` | `invoke_ai` | signal_name = "invoke_ai", count = 1, no user_id |
| TC-1.2: Action with side effect | `{ event_type: "chat.action.executed", action_type: "execute_external", side_effect_occurred: true }` | `delegate_to_agent` | signal_name = "delegate_to_agent", metadata.is_cross_system defined |
| TC-1.3: Action WITHOUT side effect | `{ event_type: "chat.action.executed", side_effect_occurred: false }` | ERROR | Throws "side effect required" |
| TC-1.4: Suggestion accepted | `{ event_type: "chat.suggestion.accepted", suggestion_id: "sugg-789" }` | `accept_output` | signal_name = "accept_output", metadata.has_human_review = true |
| TC-1.5: Prompt edited | `{ event_type: "chat.prompt.edited", previous_prompt_id: "prompt-111" }` | `refine_request` | signal_name = "refine_request", count = 1 |
| TC-1.6: Manual mode enabled | `{ event_type: "chat.manual_mode.enabled", reason: "user_initiated" }` | `override_to_manual` | signal_name = "override_to_manual" |
| TC-1.7: Forbidden field present | `{ event_type: "chat.conversation.started", prompt_content: "secret" }` | ERROR | Throws "Forbidden field: prompt_content" |
| TC-1.8: Unknown event type | `{ event_type: "chat.unknown.event" }` | NULL (or ERROR in strict mode) | Logs warning if strict_mode=false |
| TC-1.9: Invalid signal enum | `{ internal_signal_name: "invalid_signal" }` | ERROR | Mapping validation fails |
| TC-1.10: User ID stripped | `{ event_type: "chat.conversation.started", user_id: "user-123" }` | `invoke_ai` (no user_id) | Output does not contain user_id |

#### Test Suite 2: Workflow Agent Connector

| Test Case | External Event | Expected Signal | Assertions |
|-----------|---------------|-----------------|------------|
| TC-2.1: Workflow invoked | `{ event_type: "workflow.agent.invoked", workflow_id: "wf-123" }` | `invoke_ai` | signal_name = "invoke_ai", count = 1 |
| TC-2.2: Step completed with side effect | `{ event_type: "workflow.step.completed", step_type: "external_action", step_status: "success" }` | `delegate_to_agent` | signal_name = "delegate_to_agent", metadata.is_cross_system = true |
| TC-2.3: Execution cancelled | `{ event_type: "workflow.execution.cancelled", cancellation_reason: "user_requested" }` | `revoke_agent` | signal_name = "revoke_agent", count = 1 |
| TC-2.4: Retry triggered | `{ event_type: "workflow.retry.triggered", previous_attempt_id: "attempt-222" }` | `retry_after_mismatch` | signal_name = "retry_after_mismatch" |
| TC-2.5: Output approved | `{ event_type: "workflow.output.approved", approved_by_user: true }` | `accept_output` | signal_name = "accept_output", metadata.has_human_review = true |
| TC-2.6: Forbidden workflow input | `{ event_type: "workflow.agent.invoked", workflow_input_data: { secret: "data" } }` | ERROR | Throws "Forbidden field: workflow_input_data" |
| TC-2.7: Missing required field | `{ event_type: "workflow.step.completed" }` (no step_type) | ERROR | Validation rule fails |
| TC-2.8: Cross-system flag | `{ event_type: "workflow.step.completed", step_type: "external_action", systems: ["crm", "email"] }` | `delegate_to_agent` | metadata.is_cross_system = true (systems.length > 1) |
| TC-2.9: Approval required flag | `{ event_type: "workflow.agent.invoked", approval_required: true }` | `invoke_ai` | metadata.requires_approval = true |
| TC-2.10: All examples pass | (Load all examples from mapping spec) | (Expected signals from spec) | All examples produce expected output |

---

### Acceptance Criteria

#### AC-1: Mapping Validation
- [ ] All mapping specs pass JSON schema validation
- [ ] connector_name follows naming convention (`[a-z0-9-]+`)
- [ ] connector_version is valid semver (`\d+\.\d+\.\d+`)
- [ ] tool_class is in TOOL_CLASSES enum

#### AC-2: Signal Enum Enforcement
- [ ] Tests fail if mapping uses signal_name not in SignalName enum
- [ ] Tests fail if connector outputs unmapped signal
- [ ] All internal_signal_name values match enum

#### AC-3: Forbidden Fields
- [ ] Tests fail if any output includes forbidden fields:
  - `prompt_content`, `output_content`, `keystrokes`
  - `file_names`, `message_text`, `raw_logs`
  - `user_id`, `user_email`, `employee_id`
- [ ] Privacy validator recursively checks nested objects
- [ ] Forbidden fields list matches `shared/src/privacy.ts`

#### AC-4: Agentic Boundary
- [ ] Tests fail if `delegate_to_agent` mapping does not require `side_effect_occurred=true`
- [ ] Tests fail if `delegate_to_agent` is triggered by chat/draft events (no side effect)
- [ ] Validation rule checks `requires_side_effect: true` for delegate mappings

#### AC-5: Mapping Drift Prevention
- [ ] Tests fail if mapping changes without explicit version bump
- [ ] Hash-based comparison detects unintentional changes
- [ ] CI/CD blocks merges if tests fail

#### AC-6: Example Coverage
- [ ] All examples in mapping spec have corresponding tests
- [ ] Tests run every example through transformer
- [ ] Tests assert output matches expected_signal

#### AC-7: Edge Cases
- [ ] Unknown external events handled (error or log, based on strict_mode)
- [ ] Missing required fields cause validation failure
- [ ] Metadata flags extracted correctly (has_human_review, is_cross_system)
- [ ] Default values applied when extraction rule fails

#### AC-8: CI/CD Integration
- [ ] Connector tests run in CI pipeline
- [ ] Pre-commit hook validates mapping specs
- [ ] Deployment blocked if any connector test fails
- [ ] Mapping spec linter checks YAML syntax

---

### Test Implementation Checklist

**Phase 1: Test Infrastructure** (Week 1)
- [ ] Create `backend/tests/connectors/` directory
- [ ] Add YAML parser dependency (`js-yaml`)
- [ ] Implement `ConnectorMappingLoader` class
- [ ] Implement `EventTransformer` base class
- [ ] Implement `PrivacyValidator` utility
- [ ] Add JSON schema for mapping spec validation

**Phase 2: Connector Implementations** (Week 2)
- [ ] Implement `ChatToolConnector` class
- [ ] Implement `WorkflowAgentConnector` class
- [ ] Create fixture mapping specs (YAML)
- [ ] Create fixture sample events (JSON)

**Phase 3: Test Suites** (Week 3)
- [ ] Write `ConnectorMappingValidator.test.ts` (10 tests)
- [ ] Write `ChatToolConnector.test.ts` (10 tests)
- [ ] Write `WorkflowAgentConnector.test.ts` (10 tests)
- [ ] Add drift detection test (version comparison)
- [ ] Add privacy field exhaustive test

**Phase 4: CI/CD Integration** (Week 4)
- [ ] Add connector tests to GitHub Actions workflow
- [ ] Add pre-commit hook for mapping spec validation
- [ ] Add mapping spec linter to package.json scripts
- [ ] Document connector development process

---

## Summary of Deliverables

### ✅ Part A: Repo Architecture Map
- Directory structure (2 levels deep)
- Key packages identified
- Ingest endpoints documented (9 endpoints)
- Validation approach mapped (Zod + forbidden fields)
- Data store analyzed (in-memory Maps, composite keys)
- Suppression/rollup logic explained (k=10 metrics, k=5 behavioral)
- Org/team/role/function model documented
- Fluency computation described
- Test framework identified (Jest + pytest)

### ✅ Part B: Connector Discovery
- **Verdict**: No formal connector abstraction exists
- Vendor field used for tool identification
- Tool taxonomy exists (TOOL_CLASSES)
- Vocabulary control enforced (forbidden terms)
- Privacy validation in place (forbidden fields)
- **Recommendation**: Create `backend/src/connectors/` directory

### ✅ Part C: Connector Mapping Spec
- YAML schema defined with metadata, mappings, validation
- v0 signal set: invoke_ai, delegate_to_agent, revoke_agent, refine_request, accept_output, retry_after_mismatch, override_to_manual
- "What counts" and "What does NOT count" for each signal
- Agentic boundary defined (delegate_to_agent requires external side effect)
- Example mapping specs for Chat Tool and Workflow Agent Tool
- JSON Schema for automated validation

### ✅ Part D: Automated Mapping Tests Plan
- Test location: `backend/tests/connectors/`
- Test harness components defined
- 20 example test cases (10 per connector)
- Acceptance criteria (8 categories)
- Implementation checklist (4-week plan)

---

## Edit Targets for Connector Implementation

### Files to Create:
1. `backend/src/connectors/base/ConnectorBase.ts`
2. `backend/src/connectors/base/ConnectorRegistry.ts`
3. `backend/src/connectors/mappings/chat-tool.mapping.yaml`
4. `backend/src/connectors/mappings/workflow-agent.mapping.yaml`
5. `backend/src/connectors/implementations/ChatToolConnector.ts`
6. `backend/src/connectors/implementations/WorkflowAgentConnector.ts`
7. `backend/src/connectors/validation/MappingValidator.ts`
8. `backend/tests/connectors/ConnectorMappingValidator.test.ts`
9. `backend/tests/connectors/ChatToolConnector.test.ts`
10. `backend/tests/connectors/WorkflowAgentConnector.test.ts`
11. `backend/tests/connectors/fixtures/chat-tool.mapping.yaml`
12. `backend/tests/connectors/fixtures/workflow-agent.mapping.yaml`
13. `backend/tests/connectors/fixtures/sample-events.json`
14. `shared/src/connectors/types.ts` (optional)
15. `shared/src/connectors/schemas.ts` (optional)

### Files to Modify:
1. `shared/src/types.ts` - Add SignalName v0 enum (invoke_ai, delegate_to_agent, etc.)
2. `shared/src/schemas.ts` - Add ConnectorMappingSpecSchema
3. `backend/src/app.ts` - Add connector transformation middleware to `/orgs/:orgId/behavior/import`
4. `backend/package.json` - Add js-yaml dependency
5. `.github/workflows/test.yml` - Add connector tests to CI

---

## Next Steps (PROMPT 1+)

**Do NOT implement in this prompt. Wait for explicit approval.**

1. Create connector base classes and interfaces
2. Implement mapping loader and transformer
3. Create example mapping specs for 2 connectors
4. Implement automated test suite
5. Integrate with behavioral signals ingest endpoint
6. Add CI/CD validation

**End of connector mapping specification baseline**
