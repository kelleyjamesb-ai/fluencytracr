# MCII Slice F Allowlisted Claim Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one ADMIN/ENABLEMENT_LEAD-only, read-only, binding-addressed canonical claim trace; demote the legacy packet/HTML selection path; merge the verified slice; and deploy the merged unified backend/frontend revision with live database, C.1, and Slice E readiness proof.

**Architecture:** The existing Slice D/E readback remains the verification authority. A new strict shared trace contract projects only allowlisted aggregate fields, while a small backend orchestration service resolves a canonical binding, performs the full readback twice, requires an unchanged internal verification commitment, and returns either the strict authorized projection or one fixed `HOLD`. The frontend removes independent packet enumeration and HTML opening; the legacy HTML route remains available only with fixed deprecation headers.

**Tech Stack:** TypeScript, Zod, Express, Prisma/PostgreSQL, Jest/Supertest, React/Vite/Vitest, JSON Schema, OpenSpec, Vercel Services.

## Global Constraints

- Preserve the nine invariants in `AGENTS.md`; add no canonical event, suppression reason, threshold, override, individual field, or cross-slice aggregation.
- The only new runtime surface is `GET /api/v1/ai-value/claim-trace/:bindingId`.
- The path accepts only `canonical_identity_binding_<64 lowercase hexadecimal characters>`.
- Only `ADMIN` and `ENABLEMENT_LEAD` may call the endpoint.
- Every authenticated malformed, missing, foreign, stale, revoked, tampered, cross-spliced, or substituted lookup returns HTTP `200` with the same byte-identical fixed `HOLD` body.
- Authorized output contains only the fields in `FT_CANONICAL_CLAIM_TRACE_V1`; it never echoes the binding ID or any other stable identifier, hash, commitment, row locator, source payload, raw event, secret, HTML, or mutation hint.
- The trace performs no persistence write and must perform a final exact source/journal read immediately before projection.
- Keep the legacy HTML endpoint for additive compatibility, but mark it non-authoritative with fixed deprecation headers and remove all frontend packet-selection consumers.
- Add no database migration and perform no production database mutation.
- Run the full required suite only once on the final exact SHA after focused verification and exact-SHA CODE, BUG, and ADVERSARIAL review.
- Merge and deployment remain explicit external gates. Deployment may occur only from the normal merged SHA.
- Because Slice F changes the frontend, the post-merge unified Vercel Services deployment includes both frontend and backend using the then-current Production environment revision.

---

## File Structure

### New files

- `shared/src/aiValueEngine/canonicalClaimTrace.ts`: strict authorized/HOLD schemas, fixed HOLD builder, and field-by-field authorized projection builder.
- `schemas/ai-value/canonical-claim-trace.schema.json`: strict JSON Schema matching the shared discriminated union.
- `scripts/canonical_claim_trace_contract.test.mjs`: contract/schema/document synchronization and poison-field tests.
- `docs/contracts/ai-value-canonical-claim-trace/README.md`: internal API, allowlist, redaction, and no-authority boundaries.
- `openspec/changes/add-allowlisted-claim-trace/proposal.md`: Slice F why/what/impact.
- `openspec/changes/add-allowlisted-claim-trace/design.md`: approved architecture and threat boundary.
- `openspec/changes/add-allowlisted-claim-trace/tasks.md`: executable completion checklist.
- `openspec/changes/add-allowlisted-claim-trace/specs/ai-value-platform/spec.md`: normative delta.
- `backend/src/services/canonical-claim-trace.service.ts`: binding-addressed double-read orchestration and fixed HOLD behavior.
- `backend/tests/canonical_claim_trace_service.test.ts`: injected double-read success and final-read drift tests.
- `backend/tests/canonical_claim_trace_api.test.ts`: route/RBAC/request-shape/HOLD/legacy-header tests.
- `scripts/verify_canonical_claim_trace_postgres.mjs`: dedicated Slice F entrypoint over the existing D/E PostgreSQL fixture.

### Modified files

- `shared/src/aiValueEngine/index.ts`: export the new shared trace contract.
- `package.json`: add focused contract and PostgreSQL verifier commands.
- `backend/src/repositories/ai-value-object.repository.ts`: add exact organization-scoped binding lookup that derives the packet internally.
- `backend/src/services/aggregate-claim-authorization.service.ts`: expose a private-safe trace source plus an internal verification commitment from an already verified BOUND readback.
- `backend/src/ai_value_routes.ts`: register the trace route and demote the legacy HTML route with headers.
- `backend/tests/aggregate_claim_authorization_contract.test.ts`: reserved binding lookup and private trace-source assertions.
- `backend/tests/ai_value_objects_api.test.ts`: preserve legacy HTML fail-closed compatibility assertions.
- `scripts/verify_aggregate_claim_authorization_postgres.mjs`: execute Slice F assertions when invoked by the dedicated wrapper.
- `frontend/src/lib/aiValueApi.ts`: delete the unused HTML fetch helper.
- `frontend/src/lib/aiValueApi.test.ts`: prove no legacy HTML request helper remains.
- `frontend/src/hooks/useAiValueJourney.ts`: remove packet enumeration, packet-count authority, and `openReadout`.
- `frontend/src/components/ExecutiveReadoutPreviewPanel.tsx`: retain planning guidance without packet IDs or open actions.
- `frontend/src/pages/AIValueJourney.tsx`: remove both packet-driven button surfaces.
- `frontend/src/pages/AIValueJourney.test.tsx`: prove generic packet records do not create readiness or navigation.
- `frontend/src/pages/AIValueReadoutPrototype.tsx`: label the static page illustrative and not live evidence.
- `frontend/src/pages/AIValueReadoutPrototype.test.tsx`: require the visible illustrative label.
- `.project/PROGRESS.md`: record designed/implemented/verified/reviewed/release evidence without adding or broadening a queue item.
- `.project/WORK_QUEUE.json`: update only the existing Slice F item's status/last note at the final local and merged states.

---

### Task 1: Lock the OpenSpec and shared trace contract

**Files:**
- Create: `shared/src/aiValueEngine/canonicalClaimTrace.ts`
- Modify: `shared/src/aiValueEngine/index.ts`
- Create: `schemas/ai-value/canonical-claim-trace.schema.json`
- Create: `scripts/canonical_claim_trace_contract.test.mjs`
- Create: `docs/contracts/ai-value-canonical-claim-trace/README.md`
- Create: `openspec/changes/add-allowlisted-claim-trace/proposal.md`
- Create: `openspec/changes/add-allowlisted-claim-trace/design.md`
- Create: `openspec/changes/add-allowlisted-claim-trace/tasks.md`
- Create: `openspec/changes/add-allowlisted-claim-trace/specs/ai-value-platform/spec.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `CANONICAL_CLAIM_TRACE_SCHEMA_VERSION`
- Produces: `CanonicalClaimTraceSchema`
- Produces: `CanonicalClaimTraceAuthorizedSchema`
- Produces: `CanonicalClaimTraceHeldSchema`
- Produces: `canonicalClaimTraceFixedHold(): CanonicalClaimTraceHeld`
- Produces: `buildCanonicalClaimTraceAuthorized(input: CanonicalClaimTraceAuthorizedInput): CanonicalClaimTraceAuthorized`
- Consumes: existing `AggregateObservedMovementSchema`, `AggregateClaimPolicyStateSchema`, `AGGREGATE_CLAIM_CAVEATS`, metric/unit/direction enums.

- [ ] **Step 1: Write the failing shared contract test**

Add `scripts/canonical_claim_trace_contract.test.mjs` with direct exact-key and poison-field assertions:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aiValueEngine } from "../shared/dist/index.js";

const authorizedInput = {
  hypothesisVersion: 1,
  planVersion: 2,
  measurementCellVersion: 3,
  metricId: "support_median_resolution_hours",
  measurementUnit: "hours",
  approvedDirection: "DECREASE",
  movement: {
    metric_id: "support_median_resolution_hours",
    measurement_unit: "hours",
    baseline_value: 18.4,
    comparison_value: 15.1,
    absolute_delta: -3.3,
    percent_change: -17.934783,
    observed_direction: "DECREASE",
    approved_metric_direction: "DECREASE",
    claim_label: "OBSERVED_NON_ATTRIBUTABLE"
  },
  policyState: aiValueEngine.aggregateClaimPolicyState(),
  caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS]
};

test("Slice F exports one strict allowlisted trace and one fixed hold", () => {
  const trace = aiValueEngine.buildCanonicalClaimTraceAuthorized(authorizedInput);
  assert.deepEqual(Object.keys(trace), [
    "schema_version",
    "trace_state",
    "source_bound",
    "read_only",
    "customer_facing_output_authorized",
    "stages"
  ]);
  assert.equal(aiValueEngine.CanonicalClaimTraceSchema.parse(trace).trace_state, "AUTHORIZED");
  assert.deepEqual(aiValueEngine.canonicalClaimTraceFixedHold(), {
    schema_version: "FT_CANONICAL_CLAIM_TRACE_V1",
    trace_state: "HOLD",
    source_bound: false,
    read_only: true,
    canonical_identity_state: "UNBOUND",
    customer_facing_output_authorized: false
  });
});

test("Slice F never projects private or person-shaped source material", () => {
  const serialized = JSON.stringify(
    aiValueEngine.buildCanonicalClaimTraceAuthorized(authorizedInput)
  );
  for (const poison of [
    "org_id",
    "workflow_id",
    "jbtd_id",
    "persona_id",
    "binding_id",
    "packet_id",
    "manifest_id",
    "commitment",
    "attestation",
    "journal",
    "person@example.com",
    "raw_event",
    "prompt",
    "transcript",
    "secret"
  ]) {
    assert.equal(serialized.includes(poison), false, poison);
  }
});

test("Slice F JSON Schema and contract documentation are synchronized", () => {
  const schema = JSON.parse(
    readFileSync("schemas/ai-value/canonical-claim-trace.schema.json", "utf8")
  );
  const docs = readFileSync(
    "docs/contracts/ai-value-canonical-claim-trace/README.md",
    "utf8"
  );
  assert.equal(schema.oneOf.length, 2);
  assert.equal(schema.$defs.authorized.additionalProperties, false);
  assert.equal(schema.$defs.held.additionalProperties, false);
  assert.match(docs, /ADMIN/);
  assert.match(docs, /ENABLEMENT_LEAD/);
  assert.match(docs, /not a suppression reason/i);
  assert.match(docs, /no database migration/i);
});
```

- [ ] **Step 2: Add the focused package command and prove the test fails**

Add:

```json
"test:canonical-claim-trace": "npm run build --workspace shared && node --test scripts/canonical_claim_trace_contract.test.mjs"
```

Run:

```bash
npm run test:canonical-claim-trace
```

Expected: FAIL because `buildCanonicalClaimTraceAuthorized` and the schema/docs do not exist.

- [ ] **Step 3: Implement the strict shared schema and builders**

Create `canonicalClaimTrace.ts` around strict Zod objects. The public input contains only already verified typed values:

```ts
export const CANONICAL_CLAIM_TRACE_SCHEMA_VERSION =
  "FT_CANONICAL_CLAIM_TRACE_V1" as const;

export const CanonicalClaimTraceApprovedDirectionSchema = z.enum([
  "INCREASE",
  "DECREASE",
  "MAINTAIN",
  "MONITOR",
  "NO_CHANGE"
]);

type CanonicalClaimTraceMetricId = z.infer<typeof AggregateClaimMetricIdSchema>;
type CanonicalClaimTraceMeasurementUnit =
  z.infer<typeof AggregateClaimMeasurementUnitSchema>;
type CanonicalClaimTraceApprovedDirection =
  z.infer<typeof CanonicalClaimTraceApprovedDirectionSchema>;

export interface CanonicalClaimTraceAuthorizedInput {
  hypothesisVersion: number;
  planVersion: number;
  measurementCellVersion: number;
  metricId: CanonicalClaimTraceMetricId;
  measurementUnit: CanonicalClaimTraceMeasurementUnit;
  approvedDirection: CanonicalClaimTraceApprovedDirection;
  movement: AggregateObservedMovement;
  policyState: AggregateClaimPolicyState;
  caveats: readonly string[];
}

export const CanonicalClaimTraceHeldSchema = z.object({
  schema_version: z.literal(CANONICAL_CLAIM_TRACE_SCHEMA_VERSION),
  trace_state: z.literal("HOLD"),
  source_bound: z.literal(false),
  read_only: z.literal(true),
  canonical_identity_state: z.literal("UNBOUND"),
  customer_facing_output_authorized: z.literal(false)
}).strict();

export const canonicalClaimTraceFixedHold = (): CanonicalClaimTraceHeld =>
  CanonicalClaimTraceHeldSchema.parse({
    schema_version: CANONICAL_CLAIM_TRACE_SCHEMA_VERSION,
    trace_state: "HOLD",
    source_bound: false,
    read_only: true,
    canonical_identity_state: "UNBOUND",
    customer_facing_output_authorized: false
  });

export type CanonicalClaimTraceAuthorized =
  z.infer<typeof CanonicalClaimTraceAuthorizedSchema>;
export type CanonicalClaimTraceHeld =
  z.infer<typeof CanonicalClaimTraceHeldSchema>;
export type CanonicalClaimTrace =
  z.infer<typeof CanonicalClaimTraceSchema>;
```

Build the authorized object field by field. Do not accept or spread arbitrary records. Require:

```ts
hypothesis: { approval_state: "APPROVED", version: positiveVersion }
measurement: {
  approval_state: "APPROVED",
  plan_version: positiveVersion,
  cell_version: positiveVersion,
  metric_id: AggregateClaimMetricIdSchema,
  measurement_unit: AggregateClaimMeasurementUnitSchema,
  approved_direction: CanonicalClaimTraceApprovedDirectionSchema,
  aggregate_only: true
}
evidence: {
  schema_state: "VALID",
  review_state: "ACCEPTED",
  admission_state: "ADMITTED",
  comparison_privacy_state: "ATOMIC_COMPARISON_PRIVACY_RELEASED"
}
policy: AggregateClaimPolicyStateSchema
claim: { movement: AggregateObservedMovementSchema, caveats: exact fixed caveats }
readout: {
  canonical_identity_state: "BOUND",
  current_state: "CURRENT",
  source_bound: true,
  mutation_authorized: false,
  export_authorized: false,
  customer_facing_output_authorized: false
}
```

- [ ] **Step 4: Add the exact JSON Schema, contract README, and OpenSpec change**

The JSON Schema must use `additionalProperties: false` at every object level, exact `const` values for fixed states, positive integer versions, finite numbers, the existing metric/unit/direction enums, and two `oneOf` variants.

The OpenSpec delta must contain these normative requirements and scenarios:

```markdown
### Requirement: Binding-addressed allowlisted canonical claim trace
The system SHALL expose one read-only canonical claim trace selected only by an
exact current canonical identity binding and SHALL return only the fixed
allowlisted aggregate projection.

#### Scenario: Current exact binding authorizes a trace
- **WHEN** an ADMIN or ENABLEMENT_LEAD supplies an exact current binding
- **THEN** the system revalidates hypothesis, measurement, evidence, policy,
  claim, binding, attestation, renderer, and current source heads
- **AND** returns `FT_CANONICAL_CLAIM_TRACE_V1` with `trace_state: AUTHORIZED`

#### Scenario: Any lookup or authority failure holds without an oracle
- **WHEN** authenticated input is malformed, missing, foreign, stale, revoked,
  tampered, cross-spliced, substituted, or changes before final projection
- **THEN** the system returns the byte-identical fixed `HOLD`
- **AND** exposes no cause-specific diagnostic
```

Also specify legacy demotion, no mutations, no identifiers/commitments, and no new suppression reason.

- [ ] **Step 5: Run focused contract and strict OpenSpec validation**

Run:

```bash
npm run test:canonical-claim-trace
npx openspec validate add-allowlisted-claim-trace --strict
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Commit the contract unit**

```bash
git add shared/src/aiValueEngine/canonicalClaimTrace.ts \
  shared/src/aiValueEngine/index.ts \
  schemas/ai-value/canonical-claim-trace.schema.json \
  scripts/canonical_claim_trace_contract.test.mjs \
  docs/contracts/ai-value-canonical-claim-trace/README.md \
  openspec/changes/add-allowlisted-claim-trace \
  package.json
git commit -m "feat(mcii): define Slice F invariant-safe claim trace contract"
```

---

### Task 2: Add binding lookup and private-safe double-read trace verification

**Files:**
- Modify: `backend/src/repositories/ai-value-object.repository.ts`
- Modify: `backend/src/services/aggregate-claim-authorization.service.ts`
- Create: `backend/src/services/canonical-claim-trace.service.ts`
- Modify: `backend/tests/aggregate_claim_authorization_contract.test.ts`

**Interfaces:**
- Produces: `readAiValueClaimPacketIdByBindingId(orgId: string, bindingId: string): Promise<string | null>`
- Produces: `AggregateClaimTraceSource` as an internal-only interface with safe projection input and `verificationCommitment`.
- Produces: optional `traceSource` on a BOUND `AggregateClaimReadout`; unbound readouts never receive it.
- Produces: `readCanonicalClaimTrace(orgId: string, bindingId: string, dependencies?: CanonicalClaimTraceDependencies): Promise<CanonicalClaimTrace>`
- Consumes: `readAuthorizedAggregateClaim`, strict canonical binding schema, `buildCanonicalClaimTraceAuthorized`, and `canonicalClaimTraceFixedHold`.

- [ ] **Step 1: Write failing repository-boundary and trace-source tests**

Extend `backend/tests/aggregate_claim_authorization_contract.test.ts`:

```ts
it("rejects non-binding selectors without exposing reserved objects", async () => {
  expect(
    await readAiValueClaimPacketIdByBindingId(
      "org-northstar",
      "aggregate_packet_guessed"
    )
  ).toBeNull();
  expect(
    await getAiValueObject(
      "org-northstar",
      "canonical_identity_compatibility_binding",
      `canonical_identity_binding_${"0".repeat(64)}`
    )
  ).toBeNull();
  expect(
    await listAiValueObjects(
      "org-northstar",
      "canonical_identity_compatibility_binding"
    )
  ).toEqual([]);
});
```

- [ ] **Step 2: Run the focused backend test and confirm red**

```bash
npm run test:ci --workspace backend -- --runTestsByPath \
  tests/aggregate_claim_authorization_contract.test.ts
```

Expected: FAIL because the binding lookup and trace-source builder do not exist.

- [ ] **Step 3: Implement exact binding lookup**

Add:

```ts
export async function readAiValueClaimPacketIdByBindingId(
  orgId: string,
  bindingId: string
): Promise<string | null> {
  const parsedId = /^canonical_identity_binding_[0-9a-f]{64}$/.test(bindingId);
  if (!parsedId) return null;
  const binding = await getAiValueObjectRaw(
    orgId,
    aiValueEngine.INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE,
    bindingId
  );
  const parsed = aiValueEngine.CanonicalIdentityBindingSchema.safeParse(binding?.payload);
  if (!binding || !parsed.success || parsed.data.binding_id !== bindingId) return null;
  const bundle = await readAiValueClaimBundle(orgId, parsed.data.packet_id);
  return bundle?.binding?.object_id === bindingId ? parsed.data.packet_id : null;
}
```

Do not add a generic list/get path for reserved bindings.

- [ ] **Step 4: Add a private-safe BOUND trace source to verified readback**

After all existing D/E checks, binding reconciliation, renderer verification,
and bundle attestation pass, construct:

```ts
export interface AggregateClaimTraceSource {
  projectionInput: aiValueEngine.CanonicalClaimTraceAuthorizedInput;
  verificationCommitment: string;
}
```

The projection input is field-by-field:

```ts
const projectionInput = {
  hypothesisVersion: canonicalAuthority.sources.hypothesis.version,
  planVersion: canonicalAuthority.sources.plan.version,
  measurementCellVersion: canonicalAuthority.sources.measurementCell.version,
  metricId: rebuilt.claim.content.movement.metric_id,
  measurementUnit: rebuilt.claim.content.movement.measurement_unit,
  approvedDirection: canonicalAuthority.sliceBinding.approved_direction,
  movement: rebuilt.claim.content.movement,
  policyState: rebuilt.manifest.core.policy_state,
  caveats: rebuilt.claim.content.caveats
};
```

Require exact approved source states before creating the source:

```ts
canonicalAuthority.sources.hypothesis.authority.status === "approved"
canonicalAuthority.sources.measurementCell.authority.approval_state === "approved"
canonicalAuthority.sources.measurementCell.authority.metric_owner_approval_state === "approved"
```

Build `verificationCommitment` under a new internal domain from the already
verified canonical core commitment, binding payload, source semantic
commitments, current journal-head projections, comparison receipt/projection,
and source graph seal. Never return this commitment from a route.

- [ ] **Step 5: Implement the double-read trace service**

Create:

```ts
export interface CanonicalClaimTraceDependencies {
  readPacketIdByBindingId: typeof readAiValueClaimPacketIdByBindingId;
  readReadout: typeof readAuthorizedAggregateClaim;
}

const defaultDependencies: CanonicalClaimTraceDependencies = {
  readPacketIdByBindingId: readAiValueClaimPacketIdByBindingId,
  readReadout: readAuthorizedAggregateClaim
};

export const readCanonicalClaimTrace = async (
  orgId: string,
  bindingId: string,
  dependencies: CanonicalClaimTraceDependencies = defaultDependencies
): Promise<aiValueEngine.CanonicalClaimTrace> => {
  const held = aiValueEngine.canonicalClaimTraceFixedHold;
  try {
    const packetId = await dependencies.readPacketIdByBindingId(orgId, bindingId);
    if (!packetId) return held();

    const first = await dependencies.readReadout(orgId, packetId);
    if (!first?.traceSource || first.canonicalIdentityState !== "BOUND") return held();

    const finalRead = await dependencies.readReadout(orgId, packetId);
    if (
      !finalRead?.traceSource ||
      finalRead.canonicalIdentityState !== "BOUND" ||
      finalRead.traceSource.verificationCommitment !==
        first.traceSource.verificationCommitment
    ) {
      return held();
    }
    return aiValueEngine.buildCanonicalClaimTraceAuthorized(
      finalRead.traceSource.projectionInput
    );
  } catch {
    return held();
  }
};
```

This second complete read is the final source/journal re-read. The service
performs no write, repair, append, upsert, or persistence fallback.

Add service tests with injected dependencies. One returns the same safe BOUND
readback twice and expects `AUTHORIZED`; another changes only the second
`verificationCommitment` and expects the exact fixed `HOLD`. Assert the
readout stub was called exactly twice and the binding-derived packet ID, never
a caller packet ID, was passed both times. Define `authorizedInput` in
`backend/tests/canonical_claim_trace_service.test.ts` exactly as in Task 1,
then use:

```ts
const packetId = `aggregate_packet_${"1".repeat(64)}_${"2".repeat(64)}`;
const dependencies: CanonicalClaimTraceDependencies = {
  readPacketIdByBindingId: jest.fn().mockResolvedValue(packetId),
  readReadout: jest.fn()
    .mockResolvedValueOnce({
      html: "<!doctype html>",
      canonicalIdentityState: "BOUND",
      sourceBound: true,
      traceSource: {
        projectionInput: authorizedInput,
        verificationCommitment: "3".repeat(64)
      }
    })
    .mockResolvedValueOnce({
      html: "<!doctype html>",
      canonicalIdentityState: "BOUND",
      sourceBound: true,
      traceSource: {
        projectionInput: authorizedInput,
        verificationCommitment: "3".repeat(64)
      }
    })
};
```

- [ ] **Step 6: Run focused tests and commit**

```bash
npm run build --workspace shared
npm run test:ci --workspace backend -- --runTestsByPath \
  tests/aggregate_claim_authorization_contract.test.ts \
  tests/canonical_claim_trace_service.test.ts \
  tests/canonical_identity_binding_contract.test.ts
git diff --check
git add backend/src/repositories/ai-value-object.repository.ts \
  backend/src/services/aggregate-claim-authorization.service.ts \
  backend/src/services/canonical-claim-trace.service.ts \
  backend/tests/aggregate_claim_authorization_contract.test.ts \
  backend/tests/canonical_claim_trace_service.test.ts
git commit -m "feat(mcii): verify Slice F trace from exact bound authority"
```

Expected: PASS.

---

### Task 3: Register the read-only API and demote legacy HTML

**Files:**
- Modify: `backend/src/ai_value_routes.ts`
- Create: `backend/tests/canonical_claim_trace_api.test.ts`
- Modify: `backend/tests/ai_value_objects_api.test.ts`

**Interfaces:**
- Consumes: `readCanonicalClaimTrace(orgId, bindingId)`
- Produces: `GET /api/v1/ai-value/claim-trace/:bindingId`
- Preserves: `GET /api/v1/ai-value/readout/:packetId/html` with fixed deprecation headers.

- [ ] **Step 1: Write failing API/RBAC/request-shape tests**

Use Supertest. Mock only the new trace service return so route tests do not
pretend in-memory storage is the restricted PostgreSQL authority:

```ts
jest.mock("../src/services/canonical-claim-trace.service", () => ({
  readCanonicalClaimTrace: jest.fn()
}));

import crypto from "crypto";
import type { Role } from "@fluencytracr/shared";
import { aiValueEngine } from "@fluencytracr/shared";
import request from "supertest";
import { app } from "../src/app";
import { readCanonicalClaimTrace } from "../src/services/canonical-claim-trace.service";

const jwtSecret = "slice-f-route-test-secret";
const bindingId = `canonical_identity_binding_${"1".repeat(64)}`;
const base64Url = (value: Buffer | string) =>
  Buffer.from(value).toString("base64url");
const bearer = (role: Role, orgId: string) => {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: "slice-f-route-test",
    role,
    org_id: orgId,
    exp: Math.floor(Date.now() / 1000) + 3600
  }));
  const content = `${header}.${payload}`;
  const signature = base64Url(
    crypto.createHmac("sha256", jwtSecret).update(content).digest()
  );
  return `Bearer ${content}.${signature}`;
};
```

Set `NODE_ENV=production`, `JWT_SECRET=jwtSecret`, and clear
`DEV_HEADER_AUTH` in `beforeEach`; restore all three in `afterAll`. Set the
mocked service to return `canonicalClaimTraceFixedHold()` by default and the
Task 1 authorized fixture for explicit success cases.

```ts
it.each<Role>(["ADMIN", "ENABLEMENT_LEAD"])(
  "allows %s to receive the fixed trace result",
  async (role) => {
    const response = await request(app)
      .get(`/api/v1/ai-value/claim-trace/${bindingId}`)
      .set("authorization", bearer(role, "org-northstar"));
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-type"]).toMatch(/application\\/json/);
    expect(aiValueEngine.CanonicalClaimTraceSchema.safeParse(response.body).success).toBe(true);
  }
);

it.each<Role>(["GOV_OPERATOR", "EXEC_VIEWER", "MANAGER", "EMPLOYEE"])(
  "forbids %s from claim trace",
  async (role) => {
    const response = await request(app)
      .get(`/api/v1/ai-value/claim-trace/${bindingId}`)
      .set("authorization", bearer(role, "org-northstar"));
    expect(response.status).toBe(403);
  }
);

it("does not allow role or org header spoofing", async () => {
  const response = await request(app)
    .get(`/api/v1/ai-value/claim-trace/${bindingId}`)
    .set("authorization", bearer("EXEC_VIEWER", "org-foreign"))
    .set("x-role", "ADMIN")
    .set("x-org-id", "org-northstar");
  expect(response.status).toBe(403);
});

it("returns byte-identical HOLD for authenticated lookup failures", async () => {
  const paths = [
    "not-a-binding",
    `canonical_identity_binding_${"0".repeat(64)}`,
    `${bindingId}?packetId=aggregate_packet_guessed`
  ];
  const bodies = [];
  for (const path of paths) {
    const response = await request(app)
      .get(`/api/v1/ai-value/claim-trace/${path}`)
      .set("authorization", bearer("ADMIN", "org-northstar"));
    expect(response.status).toBe(200);
    bodies.push(response.text);
  }
  expect(new Set(bodies).size).toBe(1);
});
```

Add tests that a GET body produces the same HOLD, missing/forged JWT returns
401, and `POST`/`PUT`/`PATCH`/`DELETE` do not invoke the trace service or mutate
state.

- [ ] **Step 2: Run the API tests and confirm red**

```bash
npm run test:ci --workspace backend -- --runTestsByPath \
  tests/canonical_claim_trace_api.test.ts \
  tests/ai_value_objects_api.test.ts
```

Expected: FAIL because the route and headers do not exist.

- [ ] **Step 3: Register the strict GET route**

Add the route before the legacy HTML route:

```ts
app.get(
  "/api/v1/ai-value/claim-trace/:bindingId",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  async (req: RequestWithRole, res) => {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    res.set("cache-control", "no-store");

    const hasUnknownInput =
      Object.keys(req.query).length > 0 ||
      (req.body !== undefined &&
        req.body !== null &&
        (typeof req.body !== "object" || Object.keys(req.body).length > 0));
    const validBindingId =
      /^canonical_identity_binding_[0-9a-f]{64}$/.test(req.params.bindingId);
    const trace =
      hasUnknownInput || !validBindingId
        ? aiValueEngine.canonicalClaimTraceFixedHold()
        : await readCanonicalClaimTrace(orgId, req.params.bindingId);
    return res.status(200).json(aiValueEngine.CanonicalClaimTraceSchema.parse(trace));
  }
);
```

Do not set cause-specific headers.

- [ ] **Step 4: Add fixed legacy HTML demotion headers**

Keep the current HTML body and authorization behavior, and add:

```ts
res.set("deprecation", "true");
res.set("x-ai-value-legacy-path", "true");
res.set("x-ai-value-claim-trace-authoritative", "false");
```

- [ ] **Step 5: Run focused API tests and commit**

```bash
npm run test:ci --workspace backend -- --runTestsByPath \
  tests/canonical_claim_trace_api.test.ts \
  tests/ai_value_objects_api.test.ts \
  tests/aggregate_claim_authorization_contract.test.ts
git diff --check
git add backend/src/ai_value_routes.ts \
  backend/tests/canonical_claim_trace_api.test.ts \
  backend/tests/ai_value_objects_api.test.ts
git commit -m "feat(mcii): expose read-only Slice F trace and demote HTML"
```

Expected: PASS.

---

### Task 4: Remove frontend packet authority without adding a trace UI

**Files:**
- Modify: `frontend/src/lib/aiValueApi.ts`
- Modify: `frontend/src/lib/aiValueApi.test.ts`
- Modify: `frontend/src/hooks/useAiValueJourney.ts`
- Modify: `frontend/src/components/ExecutiveReadoutPreviewPanel.tsx`
- Modify: `frontend/src/pages/AIValueJourney.tsx`
- Modify: `frontend/src/pages/AIValueJourney.test.tsx`
- Modify: `frontend/src/pages/AIValueReadoutPrototype.tsx`
- Modify: `frontend/src/pages/AIValueReadoutPrototype.test.tsx`

**Interfaces:**
- Removes: `fetchReadoutHtml`
- Removes: `packetIds` and `openReadout` from `AiValueJourneyState`
- Removes: `packetCount` from `buildExecutiveOperatingPlan` and `buildExecutiveReadoutPreview`
- Replaces packet-derived readiness with evidence-review-derived planning state only.
- Adds no frontend claim-trace client or UI.

- [ ] **Step 1: Change frontend tests first**

Delete fetch stubs that special-case `/ai-value/readout/`. Keep an
`executive_packet` object in the list fixture as a poison record and assert it
does not create navigation or readiness:

```ts
it("does not treat generic executive packets as readout authority", async () => {
  renderPage();
  await screen.findByRole("heading", { name: /AI Value Journey/i });
  expect(
    screen.queryByRole("button", { name: /Open executive readout/i })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Open caveated internal preview/i })
  ).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(
    expect.stringContaining("/ai-value/readout/"),
    expect.anything()
  );
});

it("labels the static decision memo as illustrative rather than live evidence", () => {
  renderPrototype();
  expect(
    screen.getByText("Illustrative example, not live evidence")
  ).toBeInTheDocument();
});
```

Update component-model tests so accepted evidence can produce
`review_state: "READY"` but never `canOpen` or packet navigation.

- [ ] **Step 2: Run focused frontend tests and confirm red**

```bash
npm test --workspace frontend -- \
  src/lib/aiValueApi.test.ts \
  src/pages/AIValueJourney.test.tsx \
  src/pages/AIValueReadoutPrototype.test.tsx
```

Expected: FAIL because legacy actions and the missing label remain.

- [ ] **Step 3: Remove packet enumeration and HTML navigation**

Delete:

```ts
fetchReadoutHtml
packetIds: string[]
openReadout: (packetId: string) => Promise<void>
const [packetIds, setPacketIds] = useState<string[]>([])
const packetIds = (byType.executive_packet ?? []).map(...)
const openReadout = useCallback(...)
```

Do not replace them with a trace fetcher.

- [ ] **Step 4: Make planning state evidence-derived**

Change the internal preview model:

```ts
export interface ExecutiveReadoutPreview {
  reviewState: "READY" | "HELD";
  statusLabel: string;
  statusTone: "good" | "warn" | "neutral";
  reviewContents: string;
  heldLanguage: string;
  nextOwner: string;
  nextAction: string;
  caveat: string;
}
```

`buildExecutiveOperatingPlan` no longer accepts `packetCount`. Its status is
derived from `customerEvidenceReview.reviewState`:

```ts
readoutStatus:
  reviewState === "ACCEPTED"
    ? "Accepted evidence ready for internal review"
    : "Internal review held for evidence"
```

`buildExecutiveReadoutPreview` returns `READY` only for accepted aggregate
evidence and otherwise `HELD`. This state is planning guidance only and must
not claim canonical trace authority.

- [ ] **Step 5: Remove both button surfaces and simplify the preview component**

`ExecutiveReadoutPreviewPanel` accepts only:

```ts
{ preview: ExecutiveReadoutPreview }
```

It renders the planning text and a fixed status pill:

```tsx
<StatusPill
  label={
    preview.reviewState === "READY"
      ? "Internal review planning only"
      : "Review held for evidence"
  }
  tone={preview.reviewState === "READY" ? "neutral" : "warn"}
/>
```

Remove the per-stage “Open executive readout” buttons and all
`packetIds`/`onOpenReadout` props from `AIValueJourney.tsx`.

- [ ] **Step 6: Label the static prototype**

Add a visible line next to the existing “Caveated internal review draft”:

```tsx
<p>Illustrative example, not live evidence</p>
```

- [ ] **Step 7: Run focused tests/build and commit**

```bash
npm test --workspace frontend -- \
  src/lib/aiValueApi.test.ts \
  src/pages/AIValueJourney.test.tsx \
  src/pages/AIValueReadoutPrototype.test.tsx
npm run build --workspace frontend
git diff --check
git add frontend/src/lib/aiValueApi.ts \
  frontend/src/lib/aiValueApi.test.ts \
  frontend/src/hooks/useAiValueJourney.ts \
  frontend/src/components/ExecutiveReadoutPreviewPanel.tsx \
  frontend/src/pages/AIValueJourney.tsx \
  frontend/src/pages/AIValueJourney.test.tsx \
  frontend/src/pages/AIValueReadoutPrototype.tsx \
  frontend/src/pages/AIValueReadoutPrototype.test.tsx
git commit -m "fix(mcii): remove legacy packet authority from Slice F UI"
```

Expected: PASS.

---

### Task 5: Add real PostgreSQL trace and race verification

**Files:**
- Create: `scripts/verify_canonical_claim_trace_postgres.mjs`
- Modify: `scripts/verify_aggregate_claim_authorization_postgres.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run verify:canonical-claim-trace:postgres`
- Reuses: the existing D/E ephemeral PostgreSQL fixture and restricted C.1/Slice E roles.

- [ ] **Step 1: Add the dedicated wrapper**

```js
process.env.VERIFY_SLICE_F_CANONICAL_CLAIM_TRACE = "1";
await import("./verify_aggregate_claim_authorization_postgres.mjs");
```

Add:

```json
"verify:canonical-claim-trace:postgres": "node scripts/verify_canonical_claim_trace_postgres.mjs"
```

- [ ] **Step 2: Add fail-first trace assertions to the existing fixture**

After the fixture creates the exact BOUND four-artifact bundle, gate Slice F
assertions on:

```js
if (process.env.VERIFY_SLICE_F_CANONICAL_CLAIM_TRACE === "1") {
  // Slice F assertions
}
```

Assert:

```js
const trace = await readCanonicalClaimTrace(orgId, binding.binding_id);
assert.equal(trace.trace_state, "AUTHORIZED");
assert.equal(trace.source_bound, true);
assert.equal(trace.read_only, true);
assert.equal(trace.stages.readout.canonical_identity_state, "BOUND");
assert.equal(trace.stages.claim.movement.metric_id, canonicalMetricId);
```

Also assert:

- direct restricted runtime sessions can read only the already required source rows;
- a foreign org, random binding, packet ID, stale source, forged bundle
  attestation, C.1 revocation, Slice E key revocation, and cross-spliced
  artifact each produce the exact fixed HOLD;
- direct runtime writes remain denied;
- generic reserved-object list/get remains empty;
- a controlled source/head update between the first and second complete
  readback causes HOLD;
- after rollback/restoration, the exact trace returns AUTHORIZED again; and
- poison sentinels inserted into nonprojected validation fields never appear in
  serialized authorized or held output.

- [ ] **Step 3: Run the dedicated verifier**

Use the existing ephemeral PostgreSQL environment required by the D/E verifier:

```bash
npm run verify:canonical-claim-trace:postgres
```

Expected terminal line:

```text
Slice F PostgreSQL verification passed
```

- [ ] **Step 4: Run focused related tests and commit**

```bash
npm run test:canonical-claim-trace
npm run test:ci --workspace backend -- --runTestsByPath \
  tests/canonical_claim_trace_api.test.ts \
  tests/aggregate_claim_authorization_contract.test.ts \
  tests/ai_value_objects_api.test.ts \
  tests/canonical_identity_binding_contract.test.ts
npm test --workspace frontend -- \
  src/lib/aiValueApi.test.ts \
  src/pages/AIValueJourney.test.tsx \
  src/pages/AIValueReadoutPrototype.test.tsx
git diff --check
git add scripts/verify_canonical_claim_trace_postgres.mjs \
  scripts/verify_aggregate_claim_authorization_postgres.mjs \
  package.json
git commit -m "test(mcii): verify Slice F trace against PostgreSQL authority"
```

Expected: PASS.

---

### Task 6: Synchronize durable state and freeze the implementation candidate

**Files:**
- Modify: `.project/WORK_QUEUE.json`
- Modify: `.project/PROGRESS.md`
- Modify: `openspec/changes/add-allowlisted-claim-trace/tasks.md`

**Interfaces:**
- Records: designed, implemented, focused-verified, committed, review state,
  migration/deployment boundary, and exact SHA.

- [ ] **Step 1: Update only the existing Slice F queue item**

Set its implementation status to the repository's review-ready state and
update `last_note` with:

```text
Implemented one binding-addressed read-only allowlisted claim trace, removed
frontend packet-selection authority, and explicitly demoted legacy HTML.
Focused contract/API/frontend tests and the Slice F PostgreSQL verifier pass.
No migration or deployment was performed. Exact-SHA review is pending.
```

Do not add a queue item or change the item's scope/bounds.

- [ ] **Step 2: Add a concise progress record**

Record exact focused commands, counts, no migration, no deployment, and the
outstanding CODE/BUG/ADVERSARIAL reviews. Add the exact candidate SHA in the
same commit by recording the parent implementation SHA plus the statement that
the resulting evidence commit is the review target.

- [ ] **Step 3: Complete OpenSpec tasks that have executable evidence**

Mark only implemented/focused-verified tasks complete. Leave review, full
suite, GitHub, merge, and deployment tasks open.

- [ ] **Step 4: Validate state and create the immutable candidate**

```bash
node -e 'JSON.parse(require("node:fs").readFileSync(".project/WORK_QUEUE.json","utf8"))'
npx openspec validate add-allowlisted-claim-trace --strict
git diff --check
git add .project/WORK_QUEUE.json .project/PROGRESS.md \
  openspec/changes/add-allowlisted-claim-trace/tasks.md
git commit -m "chore(mcii): record Slice F invariant verification candidate"
git rev-parse HEAD
git status --short
```

Expected: a clean worktree and one immutable candidate SHA.

---

### Task 7: Review the exact SHA and run the full suite once

**Files:**
- Modify only if a review demonstrates an executable authorization/privacy
  failure or one of the nine invariants is violated.
- Record non-blocking improvements in `.project/PROGRESS.md` without expanding
  Slice F.

**Interfaces:**
- Input: exact immutable candidate SHA.
- Output: CODE, BUG, and ADVERSARIAL verdicts tied to that SHA.

- [ ] **Step 1: Dispatch three independent read-only reviews in parallel**

Each reviewer receives the exact SHA and this stop rule:

```text
Review commit <SHA> only. A HOLD must demonstrate an executable
authorization/privacy failure or violation of one of the nine invariants.
Report non-blocking improvements separately. Do not edit files.
```

Assignments:

- CODE: contract/code consistency, type/runtime correctness, and scope.
- BUG: executable failure paths, race behavior, legacy regression, and
  operational correctness.
- ADVERSARIAL: tenant isolation, role spoofing, oracle behavior, privacy
  leakage, mutation reachability, and invariant attacks.

- [ ] **Step 2: Resolve only demonstrated blockers**

If a blocker exists, add a failing regression test, prove red, implement the
smallest fix, prove green, commit, and repeat all three reviews on the new
exact SHA. Do not run the full suite yet.

- [ ] **Step 3: Freeze durable review evidence, then review the final SHA**

After the first candidate has no blocking finding, record the exact review
results and non-blocking follow-ups in `.project/PROGRESS.md`, mark the review
tasks complete in the OpenSpec task list, and create one evidence-only commit:

```bash
git add .project/PROGRESS.md \
  openspec/changes/add-allowlisted-claim-trace/tasks.md
git commit -m "chore(mcii): record Slice F exact-SHA review"
git rev-parse HEAD
git status --short
```

Run CODE, BUG, and ADVERSARIAL review once more against this final SHA. The
reviewers must verify that the runtime tree is unchanged from the approved
candidate and that the evidence-only diff is accurate. Any blocking correction
creates a new final candidate and repeats this step before the broad suite.

- [ ] **Step 4: Run the final required suite exactly once**

On the final reviewed SHA:

```bash
./harness/scripts/bootstrap.sh
./harness/scripts/verify.sh
python3 scripts/ci_v1_governance_gates.py
bash scripts/ci_docs_contract_sweep.sh
npm run test:canonical-claim-trace
npm run build --workspace shared
npm run test:ci --workspace backend
npm test --workspace frontend
npm run build --workspace backend
npm run build --workspace frontend
npx openspec validate add-allowlisted-claim-trace --strict
node -e 'JSON.parse(require("node:fs").readFileSync("schemas/ai-value/canonical-claim-trace.schema.json","utf8")); JSON.parse(require("node:fs").readFileSync(".project/WORK_QUEUE.json","utf8"))'
git diff --check
git status --short
```

The PostgreSQL verifier is not repeated here; it already passed before exact-SHA review unless a blocking fix touched its authority path. If such a fix did,
rerun the focused verifier before freezing the replacement SHA, not as a
second broad-suite run.

- [ ] **Step 5: Preserve the final SHA**

After the broad suite starts, do not modify or commit any file. Record the
final SHA and suite output externally for the PR body. Any required repository
change invalidates the final SHA and requires a new review followed by one new
final-suite run on that replacement SHA.

---

### Task 8: Push, open the PR, wait for current-head checks, and obtain merge authority

**Files:**
- No source changes unless a required current-head GitHub check demonstrates a
  real failure.

- [ ] **Step 1: Reconfirm branch/base/head and push**

```bash
git fetch origin
git status --short --branch
git merge-base --is-ancestor origin/main HEAD
git push -u origin codex/mcii-slice-f-claim-trace
```

- [ ] **Step 2: Create the ready PR**

The PR body must name:

- roadmap item `mcii-allowlisted-claim-trace-slice-f`;
- all nine invariants as preserved;
- API, schema, OpenSpec, verifier, and frontend demotion scope;
- no migration;
- no deployment yet;
- exact focused/full commands and review SHA;
- legacy HTML compatibility/deprecation boundary; and
- attribution impact (`ATTRIBUTION.md` unchanged unless a new external source
  was actually introduced).

- [ ] **Step 3: Wait for every required check on the current PR head**

Confirm the check SHA equals the PR head and distinguish success, skipped, and
failure. Do not treat checks on an earlier push as current.

- [ ] **Step 4: Obtain explicit normal-merge authority**

Present the exact PR URL, head SHA, review outcome, and current-head check
state. Normal-merge only after James explicitly authorizes merge.

- [ ] **Step 5: Normal-merge and verify main**

After authority:

```bash
gh pr merge <PR_NUMBER> --merge
git fetch origin
git rev-parse origin/main
gh pr view <PR_NUMBER> --json state,mergedAt,mergeCommit,headRefOid
```

Verify the merge commit contains the reviewed implementation tree. Update the
queue/progress merged state in a separate status PR only if repository
governance requires a durable post-merge state change; do not amend merged
runtime history.

---

### Task 9: Deploy the merged unified revision and prove live readiness

**Files:**
- No repository source changes.
- Do not apply migrations or modify production database state.

**Interfaces:**
- Input: normal merged SHA on `origin/main`.
- Input: current `fluencytracr-frontend` Vercel Production environment revision.
- Output: one production Vercel Services deployment containing both backend and frontend.
- Output: traceability and live readiness evidence.

- [ ] **Step 1: Resolve the exact production source and environment revision**

Use a clean deployment checkout at the merged SHA:

```bash
git fetch origin
MERGED_SLICE_F_SHA="$(git rev-parse origin/main)"
FT_SLICE_F_DEPLOY_DIR="$(mktemp -d)/fluencytracr-slice-f-deploy"
git worktree add --detach "${FT_SLICE_F_DEPLOY_DIR}" "${MERGED_SLICE_F_SHA}"
```

Inspect the canonical `fluencytracr-frontend` Vercel project and record:

- project ID and production domain;
- current Production environment revision before deploy;
- current production deployment SHA/status; and
- root-owned Vercel Services topology from `vercel.json`.

Do not copy, print, or write secret values.

- [ ] **Step 2: Pull the current Production environment revision and build**

From the clean merged-SHA checkout:

```bash
npx vercel pull --yes --environment=production
npm run build --workspace shared
npm run build --workspace backend
npm run build --workspace frontend
npx vercel build --prod
```

Expected: all builds pass using the pulled current Production environment
revision. Do not run `prisma migrate deploy`.

- [ ] **Step 3: Deploy the prebuilt unified Services artifact**

```bash
npx vercel deploy --prebuilt --prod
```

This deploys both services because Slice F changes both backend and frontend.
Wait until Vercel reports the production deployment `READY`.

- [ ] **Step 4: Prove deployment-to-merge traceability**

Using Vercel deployment metadata, require:

```text
deployment target = production
deployment state = READY
source revision = <MERGED_SLICE_F_SHA>
production alias = fluencytracr-frontend.vercel.app
```

If the CLI deployment does not expose a source SHA equal to the merge, stop and
do not claim traceability; use the canonical Git-connected main deployment or
record the immutable deployment metadata that binds the built checkout SHA.

- [ ] **Step 5: Prove public database health**

```bash
curl --fail --silent --show-error \
  https://fluencytracr-frontend.vercel.app/health
```

Require:

```json
{
  "status": "ok",
  "db": "postgres"
}
```

Record `db_tables` without treating its count alone as readiness proof.

- [ ] **Step 6: Prove database, C.1, and Slice E readiness from the live health gate**

At the merged SHA, public `/health` emits `status: "ok"` with `db: "postgres"`
only when the internal database readiness result is `ready`. That readiness
result is withheld unless all of these pass:

```text
database schema/tables/columns/guards/constraints/indexes/security
outcome_comparison_attestation_structure
outcome_comparison_attestation_runtime
canonical_identity_runtime_credential
canonical_identity_runtime_database
canonical_identity_family_head_structure
canonical_identity_attestation_config
```

Therefore record the live result as:

- database readiness: healthy;
- C.1 structure/runtime readiness: healthy by the merged readiness gate;
- Slice E credential/database/family-head/attestation readiness: healthy by
  the merged readiness gate.

Confirm this implication against the exact merged source before interpreting
the live response. If `/health` is not `status: "ok"` and `db: "postgres"`,
stop and report the genuine live-proof blocker. Do not rotate credentials,
change permissions, apply migrations, or weaken readiness.

- [ ] **Step 7: Smoke the frontend and Slice F route boundary**

Confirm:

```bash
curl --fail --silent --show-error \
  https://fluencytracr-frontend.vercel.app/ >/dev/null
curl --silent --show-error --output /dev/null --write-out "%{http_code}" \
  https://fluencytracr-frontend.vercel.app/api/v1/ai-value/claim-trace/not-a-binding
```

The frontend must load. The unauthenticated trace request must remain `401`;
do not create or expose production claim evidence solely for a smoke test.

- [ ] **Step 8: Record the release boundary**

Report separately:

- designed;
- locally implemented;
- focused verified;
- exact-SHA reviewed;
- full-suite verified;
- committed;
- pushed;
- PR opened;
- normal merged;
- production deployed;
- public health proved;
- live DB/C.1/Slice E readiness proved through the merged `/health` gate; and
- authenticated real Slice F trace with customer data: not claimed unless a
  pre-existing approved production binding is safely available.

Do not call the deployment live feature proof if only health/readiness was
tested.

After evidence is captured, remove only the exact temporary deployment
worktree:

```bash
git worktree remove "${FT_SLICE_F_DEPLOY_DIR}"
```
