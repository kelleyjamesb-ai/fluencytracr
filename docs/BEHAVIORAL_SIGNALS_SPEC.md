# Agentic Behavioral Signals - Design Specification

## Version 0.1 | Status: Draft | Date: 2026-01-11

---

## Executive Summary

This specification defines an **Agentic Behavioral Signals** capability for FluencyTracr that provides awareness of how teams delegate work to AI agents. The system is explicitly **non-punitive**, **privacy-preserving**, and **aggregation-first**, designed to help organizations understand emerging agentic usage patterns without surveillance.

**Key Principles**:
- ✅ Awareness model, not scoring or ranking
- ✅ No raw prompt text, output text, screenshots, or keystrokes
- ✅ Aggregation-first: store and expose only group-level counts
- ✅ Suppression: k=5 minimum group size (more stringent than metrics k=10)
- ✅ Rollup: suppressed groups roll up to parent function/department/org
- ✅ Agentic boundary: count "delegate_to_agent" only when AI causes external side effects

---

## 1. Data Schema: BehavioralSignalAggregate

### Schema Definition

```typescript
type BehavioralSignalAggregate = {
  org_id: string;                    // Organization identifier
  group_id: string;                  // Team, role, function, or org ID
  group_type: "team" | "role" | "function" | "org";
  function_id?: string;              // Parent function for rollup (required for team/role)
  bucket_start: string;              // ISO 8601 week start (e.g., "2026-01-06")
  signal_name: SignalName;           // Enum of tracked behaviors
  count: number;                     // Non-negative integer count
  tool_class?: ToolClass;            // Optional tool taxonomy
  suppressed: boolean;               // Privacy suppression flag
  metadata?: {                       // Optional flags, NO content
    has_human_review?: boolean;      // Any human-in-loop step
    is_cross_system?: boolean;       // Multi-system delegation
    requires_approval?: boolean;     // Approval workflow present
  };
};
```

### Field Constraints

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| `org_id` | string | Required, matches existing org | Foreign key |
| `group_id` | string | Required | Can be team, role, function, or org ID |
| `group_type` | enum | `"team" \| "role" \| "function" \| "org"` | Determines rollup hierarchy |
| `function_id` | string? | Required if `group_type` ∈ {team, role} | Parent function for rollup |
| `bucket_start` | string | ISO 8601 Monday date | Weekly buckets (consistent with metrics) |
| `signal_name` | enum | See SignalName enum | Whitelisted behaviors |
| `count` | number | >= 0, integer | Aggregate count, not individual events |
| `tool_class` | enum? | Optional | From existing `ToolClass` taxonomy |
| `suppressed` | boolean | Computed server-side | True if count < k=5 |
| `metadata` | object? | Flags only, no text | Optional behavioral flags |

### Validation Rules

1. **No User Identifiers**: Never include `user_id`, `employee_id`, or `role_id` at individual level
2. **No Content**: Never include prompts, outputs, screenshots, keystrokes
3. **No Fine-Grained Timestamps**: Only `bucket_start` (week level), no event timestamps
4. **Count Integrity**: `count >= 0` and must be integer
5. **Group Hierarchy**: If `group_type === "team"` or `"role"`, `function_id` must be provided
6. **Bucket Format**: Must be Monday ISO date (e.g., `"2026-01-06"`, not `"2026-01-07"`)

### Example Records

#### Example 1: Team-level signal (not suppressed)
```json
{
  "org_id": "org-abc123",
  "group_id": "team-engineering",
  "group_type": "team",
  "function_id": "function-rd",
  "bucket_start": "2026-01-06",
  "signal_name": "delegate_file_update",
  "count": 12,
  "tool_class": "coding",
  "suppressed": false,
  "metadata": {
    "has_human_review": true
  }
}
```

#### Example 2: Small team signal (suppressed, rolled up)
```json
{
  "org_id": "org-abc123",
  "group_id": "team-data-science",
  "group_type": "team",
  "function_id": "function-rd",
  "bucket_start": "2026-01-06",
  "signal_name": "delegate_data_fetch",
  "count": null,  // Suppressed
  "tool_class": "research",
  "suppressed": true
}
```

#### Example 3: Function-level rollup (includes suppressed teams)
```json
{
  "org_id": "org-abc123",
  "group_id": "function-rd",
  "group_type": "function",
  "bucket_start": "2026-01-06",
  "signal_name": "delegate_data_fetch",
  "count": 7,  // Rolled up from suppressed teams
  "tool_class": "research",
  "suppressed": false
}
```

---

## 2. Signal Names for v0

### SignalName Enum

```typescript
type SignalName =
  | "delegate_send_message"      // AI sent email/chat/notification
  | "delegate_file_update"       // AI wrote/modified file in external system
  | "delegate_record_create"     // AI created record in database/CRM/etc
  | "delegate_record_update"     // AI updated existing record
  | "delegate_approval_request"  // AI initiated approval workflow
  | "delegate_data_fetch"        // AI queried external API/database
  | "delegate_code_commit"       // AI committed code to repo
  | "delegate_schedule_event"    // AI created calendar event/meeting
  | "delegate_task_assign"       // AI assigned task to person
  | "delegate_payment_initiate"; // AI initiated payment/transaction
```

### Signal Definitions

| Signal Name | Description | Agentic Boundary | Examples |
|------------|-------------|------------------|----------|
| `delegate_send_message` | AI sends email, chat, or notification to external recipient | ✅ External side effect (message sent) | Copilot sends email, ChatGPT posts to Slack |
| `delegate_file_update` | AI writes or modifies a file in an external system | ✅ Persistent change in external system | AI updates Google Doc, modifies Excel file |
| `delegate_record_create` | AI creates a new record in database, CRM, ticketing system | ✅ Persistent data creation | AI creates Salesforce lead, Jira ticket |
| `delegate_record_update` | AI updates existing record in external system | ✅ Persistent data modification | AI updates customer record, closes ticket |
| `delegate_approval_request` | AI initiates approval workflow (requires human decision) | ✅ Triggers external workflow | AI requests PR review, expense approval |
| `delegate_data_fetch` | AI queries external API or database | ✅ External system interaction | AI fetches customer data, queries analytics |
| `delegate_code_commit` | AI commits code to repository | ✅ Persistent code change | GitHub Copilot commits code, AI merges PR |
| `delegate_schedule_event` | AI creates calendar event or schedules meeting | ✅ External calendar modification | AI books meeting room, sends calendar invite |
| `delegate_task_assign` | AI assigns task to a person in project management tool | ✅ External task creation/assignment | AI assigns Asana task, creates TODO |
| `delegate_payment_initiate` | AI initiates payment or financial transaction | ✅ Financial side effect | AI processes refund, submits expense |

### Non-Agentic Behaviors (Explicitly Excluded)

| Behavior | Why Excluded | Counter-Example |
|----------|--------------|-----------------|
| Chat/prompt without action | No external side effect | User asks ChatGPT a question, gets answer |
| Draft generation (not sent) | No persistence or sending | AI drafts email but user doesn't send |
| Read-only file access | No modification | AI reads document, no changes |
| Code autocomplete | No commit | Copilot suggests code, user types |
| Search/research | No side effect | AI searches web, summarizes results |

### Future Signals (v1+ Candidates)

- `delegate_meeting_summary` - AI posts meeting notes to shared system
- `delegate_report_publish` - AI publishes report to dashboard/wiki
- `delegate_notification_subscribe` - AI sets up alert/subscription
- `delegate_workflow_trigger` - AI triggers automation/integration
- `delegate_security_scan` - AI runs security scan, posts results

---

## 3. Rollup and Suppression Logic

### Hierarchy Model

```
Organization (org-id)
  └── Functions (function-id)
        ├── Teams (team-id, belongs to function)
        └── Roles (role-id, belongs to function)
```

**Example**:
```
Acme Corp (org-abc123)
  ├── R&D (function-rd)
  │     ├── Engineering Team (team-engineering)
  │     ├── Data Science Team (team-data-science, 3 members ← suppressed)
  │     └── Data Scientist Role (role-data-scientist)
  └── Sales (function-sales)
        ├── SDR Team (team-sdr)
        └── AE Team (team-ae, 4 members ← suppressed)
```

### Suppression Rules (k=5)

1. **Count Threshold**: If `count < 5`, set `suppressed = true` and `count = null`
2. **Implied Group Size**: We assume `count` approximates number of contributors (not always true, but conservative)
3. **Suppression Scope**: Apply to `team` and `role` groups only (not `function` or `org`)
4. **No Partial Suppression**: Either suppress entire row or expose entire row

### Rollup Algorithm

**Input**: Array of `BehavioralSignalAggregate` (team/role level, pre-aggregated by client)

**Output**: Array of `BehavioralSignalAggregate` (includes function and org rollups)

**Steps**:

1. **Validate Input**:
   - All records have valid `org_id`, `group_id`, `group_type`, `bucket_start`, `signal_name`
   - `count >= 0` for all records
   - `function_id` present for `group_type === "team"` or `"role"`

2. **Apply Suppression**:
   ```typescript
   for each record in input:
     if record.group_type in ["team", "role"] AND record.count < 5:
       record.suppressed = true
       record.count = null  // Do not expose small counts
   ```

3. **Build Function Rollups**:
   ```typescript
   // Group by: org_id, function_id, bucket_start, signal_name, tool_class
   functionRollups = {}

   for each record in input:
     if record.function_id exists:
       key = `${record.org_id}:${record.function_id}:${record.bucket_start}:${record.signal_name}:${record.tool_class}`

       if key not in functionRollups:
         functionRollups[key] = {
           org_id: record.org_id,
           group_id: record.function_id,
           group_type: "function",
           bucket_start: record.bucket_start,
           signal_name: record.signal_name,
           count: 0,
           tool_class: record.tool_class,
           suppressed: false
         }

       // Sum ALL records (including suppressed), using original count before nulling
       functionRollups[key].count += originalCount[record]
   ```

4. **Apply Suppression to Function Rollups** (if function is small):
   ```typescript
   for each rollup in functionRollups:
     if rollup.count < 5:
       rollup.suppressed = true
       rollup.count = null
   ```

5. **Build Org Rollups** (sum all functions):
   ```typescript
   orgRollups = {}

   for each rollup in functionRollups:
     key = `${rollup.org_id}:${rollup.bucket_start}:${rollup.signal_name}:${rollup.tool_class}`

     if key not in orgRollups:
       orgRollups[key] = {
         org_id: rollup.org_id,
         group_id: rollup.org_id,  // Org ID serves as group ID
         group_type: "org",
         bucket_start: rollup.bucket_start,
         signal_name: rollup.signal_name,
         count: 0,
         tool_class: rollup.tool_class,
         suppressed: false
       }

     orgRollups[key].count += originalCount[rollup]
   ```

6. **Apply Suppression to Org Rollups** (rare, but possible):
   ```typescript
   for each rollup in orgRollups:
     if rollup.count < 5:
       rollup.suppressed = true
       rollup.count = null
   ```

7. **Return Combined**:
   ```typescript
   return [
     ...input,              // Original team/role records (with suppressions)
     ...functionRollups,    // Function-level rollups
     ...orgRollups          // Org-level rollups
   ]
   ```

### Parent Function Selection

**Question**: How do we determine `function_id` for a team or role?

**Answer**: Teams and roles must be mapped to functions at ingestion time. Options:

1. **Option A (Recommended)**: Client provides `function_id` in payload
   - Requires client to know org hierarchy
   - Most flexible (supports dynamic org structure)

2. **Option B**: Store team→function mapping in backend
   - Requires new `TeamRecord.functionId` field
   - Less flexible (requires org structure updates)

**Recommendation**: Use **Option A** for v0. Require clients to provide `function_id` when submitting team/role aggregates.

### Rollup Example (Concrete)

**Input** (from client):
```json
[
  // Team 1: Engineering (12 members)
  { "group_id": "team-eng", "group_type": "team", "function_id": "func-rd",
    "signal_name": "delegate_code_commit", "count": 45 },

  // Team 2: Data Science (3 members, will be suppressed)
  { "group_id": "team-ds", "group_type": "team", "function_id": "func-rd",
    "signal_name": "delegate_code_commit", "count": 2 },

  // Team 3: SDR (8 members)
  { "group_id": "team-sdr", "group_type": "team", "function_id": "func-sales",
    "signal_name": "delegate_send_message", "count": 120 }
]
```

**Output** (after suppression + rollup):
```json
[
  // Original records (with suppression)
  { "group_id": "team-eng", "group_type": "team", "function_id": "func-rd",
    "signal_name": "delegate_code_commit", "count": 45, "suppressed": false },

  { "group_id": "team-ds", "group_type": "team", "function_id": "func-rd",
    "signal_name": "delegate_code_commit", "count": null, "suppressed": true },

  { "group_id": "team-sdr", "group_type": "team", "function_id": "func-sales",
    "signal_name": "delegate_send_message", "count": 120, "suppressed": false },

  // Function rollups (includes suppressed team-ds count of 2)
  { "group_id": "func-rd", "group_type": "function",
    "signal_name": "delegate_code_commit", "count": 47, "suppressed": false },

  { "group_id": "func-sales", "group_type": "function",
    "signal_name": "delegate_send_message", "count": 120, "suppressed": false },

  // Org rollup
  { "group_id": "org-abc123", "group_type": "org",
    "signal_name": "delegate_code_commit", "count": 47, "suppressed": false },

  { "group_id": "org-abc123", "group_type": "org",
    "signal_name": "delegate_send_message", "count": 120, "suppressed": false }
]
```

---

## 4. Executive-Facing Patterns Output

### Pattern Types (v0)

Instead of scores, we expose **qualitative patterns** that help executives understand emerging behaviors.

```typescript
type BehavioralPattern = {
  pattern_type: PatternType;
  group_id: string;
  group_type: "function" | "org";  // Patterns only at function+ level
  bucket_start: string;
  description: string;             // Human-readable summary
  confidence: "low" | "medium" | "high";
  signals: {                       // Supporting signal counts
    signal_name: SignalName;
    count: number;
  }[];
  trends?: {                       // Optional trend indicators
    direction: "increasing" | "stable" | "decreasing";
    magnitude: "slight" | "moderate" | "significant";
  };
};

type PatternType =
  | "automation_emerging"          // New agentic behavior appearing
  | "approval_workflow_mature"     // High approval-request signals
  | "cross_system_integration"     // Multi-system delegations
  | "human_review_dominant"        // Most delegations have human review
  | "data_intensive"               // High data-fetch relative to actions
  ;
```

### Pattern Definitions

#### 1. `automation_emerging`
**Trigger**: First appearance of delegation signals in a function (week-over-week comparison)

**Logic**:
```typescript
if (currentWeek.totalDelegations > 0 AND previousWeek.totalDelegations === 0) {
  return {
    pattern_type: "automation_emerging",
    description: "Teams are beginning to delegate tasks to AI agents",
    confidence: currentWeek.totalDelegations >= 10 ? "high" : "low"
  }
}
```

**Example Output**:
```json
{
  "pattern_type": "automation_emerging",
  "group_id": "func-sales",
  "group_type": "function",
  "bucket_start": "2026-01-06",
  "description": "Sales function showing first agentic delegation activity this week",
  "confidence": "medium",
  "signals": [
    { "signal_name": "delegate_send_message", "count": 12 },
    { "signal_name": "delegate_task_assign", "count": 8 }
  ]
}
```

#### 2. `approval_workflow_mature`
**Trigger**: `delegate_approval_request` count > 50% of total delegation count

**Logic**:
```typescript
approvalCount = count("delegate_approval_request")
totalCount = sum(all delegation counts)

if (approvalCount / totalCount > 0.5) {
  return {
    pattern_type: "approval_workflow_mature",
    description: "Majority of AI delegations include human approval steps",
    confidence: "high"
  }
}
```

**Example Output**:
```json
{
  "pattern_type": "approval_workflow_mature",
  "group_id": "func-rd",
  "group_type": "function",
  "bucket_start": "2026-01-06",
  "description": "R&D function predominantly uses AI with human-in-loop approval",
  "confidence": "high",
  "signals": [
    { "signal_name": "delegate_approval_request", "count": 67 },
    { "signal_name": "delegate_code_commit", "count": 32 },
    { "signal_name": "delegate_file_update", "count": 21 }
  ],
  "trends": {
    "direction": "stable",
    "magnitude": "slight"
  }
}
```

#### 3. `cross_system_integration`
**Trigger**: 3+ distinct delegation signal types in same week, with `metadata.is_cross_system === true`

**Logic**:
```typescript
distinctSignals = count(unique signal_names with metadata.is_cross_system)

if (distinctSignals >= 3) {
  return {
    pattern_type: "cross_system_integration",
    description: "AI agents orchestrating across multiple systems",
    confidence: "medium"
  }
}
```

**Example Output**:
```json
{
  "pattern_type": "cross_system_integration",
  "group_id": "func-it",
  "group_type": "function",
  "bucket_start": "2026-01-06",
  "description": "IT function using AI to coordinate actions across Jira, GitHub, and Slack",
  "confidence": "medium",
  "signals": [
    { "signal_name": "delegate_record_create", "count": 18 },
    { "signal_name": "delegate_code_commit", "count": 14 },
    { "signal_name": "delegate_send_message", "count": 22 }
  ]
}
```

#### 4. `human_review_dominant`
**Trigger**: >75% of signals have `metadata.has_human_review === true`

**Logic**:
```typescript
reviewedCount = count(records with metadata.has_human_review)
totalCount = count(all records)

if (reviewedCount / totalCount > 0.75) {
  return {
    pattern_type: "human_review_dominant",
    description: "Strong human oversight culture for AI delegations",
    confidence: "high"
  }
}
```

#### 5. `data_intensive`
**Trigger**: `delegate_data_fetch` > 2x sum of all action signals

**Logic**:
```typescript
dataFetchCount = count("delegate_data_fetch")
actionCount = sum(all signals except "delegate_data_fetch")

if (dataFetchCount > 2 * actionCount) {
  return {
    pattern_type: "data_intensive",
    description: "AI primarily used for data retrieval, not automation",
    confidence: "high"
  }
}
```

### Pattern Query Endpoint

```typescript
GET /orgs/:orgId/behavior/patterns
Query params:
  - bucket_start (optional, defaults to latest week)
  - group_type (optional, "function" or "org", defaults to "function")
  - group_id (optional, filter to specific function)

Response:
{
  "org_id": "org-abc123",
  "bucket_start": "2026-01-06",
  "patterns": [
    { /* pattern 1 */ },
    { /* pattern 2 */ }
  ]
}
```

---

## 5. API Endpoints

### Import Endpoint

```typescript
POST /orgs/:orgId/behavior/import
Content-Type: application/json

Request Body:
{
  "aggregates": [
    {
      "group_id": "team-engineering",
      "group_type": "team",
      "function_id": "func-rd",
      "bucket_start": "2026-01-06",
      "signal_name": "delegate_code_commit",
      "count": 45,
      "tool_class": "coding",
      "metadata": {
        "has_human_review": true
      }
    },
    // ... more aggregates
  ]
}

Response (200 OK):
{
  "imported": 12,          // Successfully imported
  "suppressed": 3,         // Suppressed due to k=5
  "rolled_up": 5,          // Created rollup records
  "rejected": 1,           // Validation failures
  "errors": [
    {
      "index": 4,
      "error": "Invalid signal_name"
    }
  ]
}

Response (400 Bad Request):
{
  "error": "Invalid payload",
  "details": "aggregates array required"
}

Response (404 Not Found):
{
  "error": "Org not found"
}
```

### Query Endpoint (Raw Signals)

```typescript
GET /orgs/:orgId/behavior/signals
Query params:
  - bucket_start (optional, ISO date)
  - group_type (optional, "team"|"role"|"function"|"org")
  - group_id (optional, specific group)
  - signal_name (optional, specific signal)
  - include_suppressed (optional, boolean, defaults to false)

Response (200 OK):
{
  "org_id": "org-abc123",
  "signals": [
    {
      "group_id": "func-rd",
      "group_type": "function",
      "bucket_start": "2026-01-06",
      "signal_name": "delegate_code_commit",
      "count": 47,
      "tool_class": "coding",
      "suppressed": false
    },
    // ... more signals (suppressed records only if include_suppressed=true)
  ],
  "total_count": 15,
  "suppressed_count": 3
}
```

### Query Endpoint (Patterns)

```typescript
GET /orgs/:orgId/behavior/patterns
Query params:
  - bucket_start (optional, defaults to latest)
  - group_type (optional, "function"|"org", defaults to "function")
  - group_id (optional, specific function/org)

Response (200 OK):
{
  "org_id": "org-abc123",
  "bucket_start": "2026-01-06",
  "patterns": [
    {
      "pattern_type": "automation_emerging",
      "group_id": "func-sales",
      "group_type": "function",
      "bucket_start": "2026-01-06",
      "description": "Sales function showing first agentic delegation activity",
      "confidence": "medium",
      "signals": [
        { "signal_name": "delegate_send_message", "count": 12 }
      ]
    },
    // ... more patterns
  ]
}
```

---

## 6. Test Plan and Acceptance Criteria

### Unit Tests

#### 1. Schema Validation Tests
```typescript
describe("BehavioralSignalAggregate Schema", () => {
  test("accepts valid aggregate", () => {
    const valid = {
      org_id: "org-123",
      group_id: "team-eng",
      group_type: "team",
      function_id: "func-rd",
      bucket_start: "2026-01-06",
      signal_name: "delegate_code_commit",
      count: 10
    };
    expect(BehavioralSignalSchema.parse(valid)).toMatchObject(valid);
  });

  test("rejects negative count", () => {
    const invalid = { /* ... */ count: -5 };
    expect(() => BehavioralSignalSchema.parse(invalid)).toThrow();
  });

  test("rejects invalid signal_name", () => {
    const invalid = { /* ... */ signal_name: "invalid_signal" };
    expect(() => BehavioralSignalSchema.parse(invalid)).toThrow();
  });

  test("requires function_id for team group_type", () => {
    const invalid = { /* ... */ group_type: "team", function_id: undefined };
    expect(() => BehavioralSignalSchema.parse(invalid)).toThrow();
  });
});
```

#### 2. Suppression Logic Tests
```typescript
describe("Behavioral Signal Suppression", () => {
  test("suppresses team with count < 5", () => {
    const input = [{ count: 3, group_type: "team", /* ... */ }];
    const result = applySuppression(input, 5);
    expect(result[0].suppressed).toBe(true);
    expect(result[0].count).toBe(null);
  });

  test("does not suppress team with count >= 5", () => {
    const input = [{ count: 5, group_type: "team", /* ... */ }];
    const result = applySuppression(input, 5);
    expect(result[0].suppressed).toBe(false);
    expect(result[0].count).toBe(5);
  });

  test("does not suppress function-level aggregates", () => {
    const input = [{ count: 3, group_type: "function", /* ... */ }];
    const result = applySuppression(input, 5);
    expect(result[0].suppressed).toBe(false);
  });
});
```

#### 3. Rollup Logic Tests
```typescript
describe("Behavioral Signal Rollup", () => {
  test("creates function rollup from team signals", () => {
    const input = [
      { group_id: "team-1", function_id: "func-rd", signal_name: "delegate_code_commit", count: 10 },
      { group_id: "team-2", function_id: "func-rd", signal_name: "delegate_code_commit", count: 7 }
    ];
    const result = rollupToFunction(input);
    const funcRollup = result.find(r => r.group_type === "function");
    expect(funcRollup.count).toBe(17);
  });

  test("includes suppressed counts in rollup", () => {
    const input = [
      { group_id: "team-1", function_id: "func-rd", signal_name: "delegate_code_commit", count: 10 },
      { group_id: "team-2", function_id: "func-rd", signal_name: "delegate_code_commit", count: 2, suppressed: true }
    ];
    const result = rollupToFunction(input, { includeSuppressed: true });
    const funcRollup = result.find(r => r.group_type === "function");
    expect(funcRollup.count).toBe(12);  // Includes suppressed team-2
  });
});
```

#### 4. Pattern Detection Tests
```typescript
describe("Behavioral Pattern Detection", () => {
  test("detects automation_emerging pattern", () => {
    const currentWeek = [{ signal_name: "delegate_code_commit", count: 12 }];
    const previousWeek = [];
    const patterns = detectPatterns(currentWeek, previousWeek);
    expect(patterns).toContainEqual(
      expect.objectContaining({ pattern_type: "automation_emerging" })
    );
  });

  test("detects approval_workflow_mature pattern", () => {
    const signals = [
      { signal_name: "delegate_approval_request", count: 60 },
      { signal_name: "delegate_code_commit", count: 40 }
    ];
    const patterns = detectPatterns(signals);
    expect(patterns).toContainEqual(
      expect.objectContaining({ pattern_type: "approval_workflow_mature" })
    );
  });
});
```

### Integration Tests

#### 1. Import Endpoint Test
```typescript
describe("POST /orgs/:orgId/behavior/import", () => {
  test("imports valid aggregates", async () => {
    const response = await request(app)
      .post("/orgs/org-123/behavior/import")
      .send({
        aggregates: [
          {
            group_id: "team-eng",
            group_type: "team",
            function_id: "func-rd",
            bucket_start: "2026-01-06",
            signal_name: "delegate_code_commit",
            count: 15
          }
        ]
      });
    expect(response.status).toBe(200);
    expect(response.body.imported).toBe(1);
  });

  test("rejects mismatched org_id", async () => {
    const response = await request(app)
      .post("/orgs/org-123/behavior/import")
      .send({
        aggregates: [
          { /* ... */ org_id: "org-456" }  // Wrong org!
        ]
      });
    expect(response.status).toBe(400);
  });

  test("creates function and org rollups", async () => {
    await request(app)
      .post("/orgs/org-123/behavior/import")
      .send({ aggregates: [/* team-level signal */] });

    const signals = await request(app)
      .get("/orgs/org-123/behavior/signals");

    expect(signals.body.signals).toContainEqual(
      expect.objectContaining({ group_type: "function" })
    );
    expect(signals.body.signals).toContainEqual(
      expect.objectContaining({ group_type: "org" })
    );
  });
});
```

#### 2. Query Endpoint Test
```typescript
describe("GET /orgs/:orgId/behavior/signals", () => {
  test("filters by group_type", async () => {
    const response = await request(app)
      .get("/orgs/org-123/behavior/signals?group_type=function");

    response.body.signals.forEach(signal => {
      expect(signal.group_type).toBe("function");
    });
  });

  test("excludes suppressed by default", async () => {
    const response = await request(app)
      .get("/orgs/org-123/behavior/signals");

    response.body.signals.forEach(signal => {
      expect(signal.suppressed).toBe(false);
    });
  });

  test("includes suppressed when requested", async () => {
    const response = await request(app)
      .get("/orgs/org-123/behavior/signals?include_suppressed=true");

    const hasSuppressed = response.body.signals.some(s => s.suppressed);
    expect(hasSuppressed).toBe(true);
  });
});
```

### Acceptance Criteria

#### ✅ Schema & Validation
- [ ] `BehavioralSignalAggregate` schema defined in `shared/src/schemas.ts`
- [ ] `SignalName` enum includes all v0 signals
- [ ] Zod validation rejects negative counts
- [ ] Zod validation requires `function_id` for team/role groups
- [ ] Zod validation enforces ISO date format for `bucket_start`

#### ✅ Import Endpoint
- [ ] `POST /orgs/:orgId/behavior/import` endpoint exists
- [ ] Validates payload against schema
- [ ] Applies suppression (k=5)
- [ ] Creates function-level rollups
- [ ] Creates org-level rollups
- [ ] Returns import summary (imported, suppressed, rolled_up, rejected)
- [ ] Rejects records with invalid `org_id`
- [ ] Stores records in `store.behavioralSignals` (memory store)

#### ✅ Query Endpoints
- [ ] `GET /orgs/:orgId/behavior/signals` endpoint exists
- [ ] Supports filtering by `group_type`, `group_id`, `signal_name`, `bucket_start`
- [ ] Excludes suppressed records by default
- [ ] Includes suppressed records when `include_suppressed=true`
- [ ] Returns total counts

#### ✅ Pattern Detection
- [ ] `GET /orgs/:orgId/behavior/patterns` endpoint exists
- [ ] Detects `automation_emerging` pattern
- [ ] Detects `approval_workflow_mature` pattern
- [ ] Detects `cross_system_integration` pattern
- [ ] Detects `human_review_dominant` pattern
- [ ] Detects `data_intensive` pattern
- [ ] Returns confidence levels

#### ✅ Privacy & Security
- [ ] No user IDs in schema
- [ ] No content fields (prompts, outputs) in schema
- [ ] Suppression applied server-side (client cannot bypass)
- [ ] Suppressed counts set to `null` (not exposed)
- [ ] RBAC enforced (only ADMIN, ENABLEMENT_LEAD can query)

#### ✅ Testing
- [ ] Unit tests for schema validation (5+ test cases)
- [ ] Unit tests for suppression logic (3+ test cases)
- [ ] Unit tests for rollup logic (3+ test cases)
- [ ] Unit tests for pattern detection (5+ test cases)
- [ ] Integration tests for import endpoint (3+ test cases)
- [ ] Integration tests for query endpoint (3+ test cases)
- [ ] All tests pass (`npm test`)

---

## 7. Implementation Checklist

### Phase 1: Schema & Types
- [ ] Add `SignalName` enum to `shared/src/types.ts`
- [ ] Add `BehavioralSignalAggregateSchema` to `shared/src/schemas.ts`
- [ ] Add `BehavioralPattern` type to `shared/src/types.ts`
- [ ] Export new types in `shared/src/index.ts`
- [ ] Update `shared/package.json` version

### Phase 2: Backend Store
- [ ] Add `behavioralSignals` Map to `backend/src/store.ts`
- [ ] Add `BehavioralSignalRecord` type
- [ ] Add `upsertBehavioralSignal()` function

### Phase 3: Suppression & Rollup
- [ ] Create `backend/src/behavioral_signals.ts`
- [ ] Implement `applySuppression()` function
- [ ] Implement `rollupToFunction()` function
- [ ] Implement `rollupToOrg()` function
- [ ] Implement `suppressAndRollup()` combined function

### Phase 4: Pattern Detection
- [ ] Create `backend/src/behavioral_patterns.ts`
- [ ] Implement `detectAutomationEmerging()`
- [ ] Implement `detectApprovalWorkflowMature()`
- [ ] Implement `detectCrossSystemIntegration()`
- [ ] Implement `detectHumanReviewDominant()`
- [ ] Implement `detectDataIntensive()`
- [ ] Implement `detectPatterns()` aggregator

### Phase 5: API Endpoints
- [ ] Add `POST /orgs/:orgId/behavior/import` to `backend/src/app.ts`
- [ ] Add `GET /orgs/:orgId/behavior/signals` to `backend/src/app.ts`
- [ ] Add `GET /orgs/:orgId/behavior/patterns` to `backend/src/app.ts`
- [ ] Add RBAC middleware (ADMIN, ENABLEMENT_LEAD only)
- [ ] Add input validation middleware

### Phase 6: Tests
- [ ] Create `backend/tests/behavioral_signals.test.ts`
- [ ] Create `backend/tests/behavioral_patterns.test.ts`
- [ ] Add integration tests for all endpoints
- [ ] Ensure 100% code coverage for core logic

### Phase 7: Documentation
- [ ] Add API examples to `docs/API_EXAMPLES.md`
- [ ] Update `README.md` with behavioral signals overview
- [ ] Add pattern interpretation guide for executives

---

## Files to Create/Modify

### New Files
1. `shared/src/behavioral_signals_schemas.ts` - Zod schemas (DEPRECATED: use schemas.ts)
2. `backend/src/behavioral_signals.ts` - Core signal processing
3. `backend/src/behavioral_patterns.ts` - Pattern detection
4. `backend/tests/behavioral_signals.test.ts` - Unit + integration tests
5. `backend/tests/behavioral_patterns.test.ts` - Pattern tests
6. `docs/BEHAVIORAL_SIGNALS_SPEC.md` - This document
7. `docs/BEHAVIORAL_SIGNALS_API.md` - API reference

### Modified Files
1. `shared/src/types.ts` - Add `SignalName`, `BehavioralPattern` types
2. `shared/src/schemas.ts` - Add `BehavioralSignalAggregateSchema`
3. `shared/src/index.ts` - Export new schemas/types
4. `backend/src/store.ts` - Add `behavioralSignals` Map
5. `backend/src/app.ts` - Add 3 new endpoints
6. `backend/src/rbac.ts` - Add capability for behavioral signals (if needed)
7. `README.md` - Update overview

---

## Naming Consistency Note

**Current**: Repo uses "LearnAIR" and "FluencyTracr" inconsistently

**Recommendation**: Stick with existing naming for now. Defer renaming to separate refactor.

**Behavioral Signals Naming**:
- Use `BehavioralSignal` prefix (not `LearnAIR` or `FluencyTracr`)
- Keep module names generic: `behavioral_signals.ts`, not `learnair_behavioral_signals.ts`

---

## End of Specification

**Next Steps**:
1. Review and approve this spec
2. Implement Phase 1-3 (shared schema + backend logic)
3. Implement Phase 4-5 (endpoints)
4. Implement Phase 6 (tests)
5. Document and deploy

**Estimated Effort**: 3-5 days for full implementation + tests
