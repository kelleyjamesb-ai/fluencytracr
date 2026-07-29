# MCII Slice F Allowlisted Claim Trace Design

## Status

- Design date: 2026-07-29
- Governing queue item: `mcii-allowlisted-claim-trace-slice-f`
- Base SHA: `07265a763b2a5c1e250c243f2edd0a17812bbb6b`
- Design decision: approved API-only approach
- Deployment and production migration: excluded

## Objective

Slice F adds one internal, read-only projection that traces an approved value
hypothesis through its approved measurement, admitted aggregate evidence,
policy decisions, authorized descriptive claim, and canonical readout. The
trace proves that these stages belong to one current immutable identity without
returning the private identifiers, commitments, source payloads, or unrestricted
objects used to verify that identity.

The slice also removes the current frontend packet-selection path as an
independent authority and explicitly demotes the legacy HTML readout to
non-authoritative compatibility behavior.

## Governing Boundaries

The implementation must preserve all nine repository invariants. In particular:

- it adds no canonical event or suppression reason;
- it adds no threshold or override;
- it exposes no individual or user-identifiable field;
- it performs no cross-slice aggregation;
- it remains aggregate-only and fail-closed;
- it does not create scoring, ranking, ROI, causality, productivity,
  prediction, or customer-facing output;
- it does not add a database table, database column, persistence type, or
  production migration; and
- it does not deploy.

This is one endpoint and the minimum demotion work needed to make that endpoint
the only authoritative Slice F trace. It is not a new claim engine, evidence
engine, readout builder, frontend experience, or architecture layer.

## Chosen Approach

Add:

```text
GET /api/v1/ai-value/claim-trace/:bindingId
```

The path accepts only the existing canonical identity binding ID shape:

```text
canonical_identity_binding_<64 lowercase hexadecimal characters>
```

The binding ID is a lookup capability, not a response field. The server uses it
to locate the organization-scoped reserved binding artifact, derives the
associated packet internally, and revalidates the existing canonical artifact
bundle and all of its authority sources.

Using a binding ID makes the canonical binding the entry point. A packet-ID
endpoint was rejected because it would preserve the independent packet selector
that Slice F must demote. Hard-deleting the legacy HTML and persistence paths
was rejected because Slice E deliberately preserved additive compatibility and
the queue permits explicit demotion instead of deletion.

## Authorization and Request Contract

- Existing JWT and organization resolution remain authoritative.
- Only `ADMIN` and `ENABLEMENT_LEAD` may call the endpoint.
- Missing or invalid authentication returns the existing fixed `401` behavior.
- An authenticated disallowed role returns the existing fixed `403` behavior.
- Header claims cannot replace or elevate the JWT-derived organization or role.
- The endpoint accepts no query parameters and no request body.
- A malformed binding ID, unknown query input, present request body, absent
  record, foreign-organization record, or failed verification returns the fixed
  `HOLD` projection.
- No mutation method is registered for the path.
- Every response sets `Cache-Control: no-store`.
- Authorized and held projections use `application/json`.

Authorization failures remain distinct from an authenticated trace result.
After authentication succeeds, record existence and verification failures must
not be distinguishable by status, body, headers, or cause-specific diagnostic
text.

## Read-Only Verification Flow

The endpoint uses a dedicated claim-trace service boundary:

1. Validate authentication, organization, role, path shape, and the absence of
   unrecognized input.
2. Read the reserved canonical binding by exact `binding_id` and `org_id`.
3. Parse the binding with the existing strict canonical binding schema.
4. Derive the packet ID from the verified binding; never accept a packet ID from
   the caller.
5. Read the reserved packet, claim, and authorization manifest through the
   existing organization-scoped repository.
6. Re-run the current Slice D and Slice E verification:
   - artifact schemas and bundle reconciliation;
   - immutable source graph and source hashes;
   - slice commitment;
   - accepted evidence and review hashes;
   - C.1 atomic comparison privacy release;
   - policy state;
   - canonical identity core and selector;
   - canonical binding reconciliation;
   - canonical rendered-body commitment; and
   - four-artifact bundle attestation.
7. Use read-only source resolution. The trace path must not call a resolver with
   persistence enabled or create, repair, update, or append any artifact.
8. Immediately before projection, re-read the exact canonical source records
   and the required family journal heads. Recompute the canonical authority and
   require exact equality with the first verified result. Any source change,
   head movement, revocation, disappearance, or substitution yields `HOLD`.
9. Build a new object field by field from verified typed values. Do not spread a
   stored object or validation envelope into the response.
10. Validate the completed response against the strict shared response schema
    before returning it.

The final re-read closes the time-of-check/time-of-use gap in the current HTML
readback without broadening Slice F into a new persistence model.

## Response Contract

The shared contract is a strict discriminated union with schema version:

```text
FT_CANONICAL_CLAIM_TRACE_V1
```

### Authorized projection

The authorized response has exactly this structure:

```json
{
  "schema_version": "FT_CANONICAL_CLAIM_TRACE_V1",
  "trace_state": "AUTHORIZED",
  "source_bound": true,
  "read_only": true,
  "customer_facing_output_authorized": false,
  "stages": {
    "hypothesis": {
      "approval_state": "APPROVED",
      "version": 1
    },
    "measurement": {
      "approval_state": "APPROVED",
      "plan_version": 1,
      "cell_version": 1,
      "metric_id": "cycle_time",
      "measurement_unit": "days",
      "approved_direction": "DECREASE",
      "aggregate_only": true
    },
    "evidence": {
      "schema_state": "VALID",
      "review_state": "ACCEPTED",
      "admission_state": "ADMITTED",
      "comparison_privacy_state": "ATOMIC_COMPARISON_PRIVACY_RELEASED"
    },
    "policy": {
      "readiness_state": "INTERNAL_CLAIM_REVIEW_PERMITTED",
      "model_eligibility_state": "NOT_REQUESTED",
      "model_use_authorized": false,
      "claim_authorization_state": "AUTHORIZED",
      "customer_facing_output_authorized": false
    },
    "claim": {
      "movement": {
        "metric_id": "cycle_time",
        "measurement_unit": "days",
        "baseline_value": 12,
        "comparison_value": 9,
        "absolute_delta": -3,
        "percent_change": -25,
        "observed_direction": "DECREASE",
        "approved_metric_direction": "DECREASE",
        "claim_label": "OBSERVED_NON_ATTRIBUTABLE"
      },
      "caveats": [
        "Aggregate observation only.",
        "No attribution to AI or any intervention.",
        "No causal conclusion.",
        "Internal review only; not customer-facing."
      ]
    },
    "readout": {
      "canonical_identity_state": "BOUND",
      "current_state": "CURRENT",
      "source_bound": true,
      "mutation_authorized": false,
      "export_authorized": false,
      "customer_facing_output_authorized": false
    }
  }
}
```

The numbers and enum values shown above are illustrative values inside the
strict allowlist, not new defaults or thresholds. `percent_change` and
`approved_metric_direction` remain optional exactly where the existing
authorized movement contract makes them optional. Version fields are positive
integers taken from the verified hypothesis, plan, and cell.

### Held projection

Every authenticated lookup or verification failure returns HTTP `200` with
byte-identical canonical JSON:

```json
{
  "schema_version": "FT_CANONICAL_CLAIM_TRACE_V1",
  "trace_state": "HOLD",
  "source_bound": false,
  "read_only": true,
  "canonical_identity_state": "UNBOUND",
  "customer_facing_output_authorized": false
}
```

`HOLD` is a claim-trace transport state. It is not a sixth suppression reason
and does not change a FluencyTracr verdict.

## Explicitly Excluded Fields

Neither response variant may contain or echo:

- organization, workflow, JBTD, persona, cohort, user, reviewer, or actor
  identifiers;
- binding, packet, claim, manifest, readiness, evidence, blueprint, metrics
  library, scenario, plan, cell, or source-row identifiers;
- commitments, hashes, MACs, attestations, signatures, key identifiers, journal
  identifiers, or journal heads;
- windows, cohort selectors, row locators, URLs, actions, or mutation hints;
- raw events, raw evidence, prompts, outputs, transcripts, emails, names, direct
  identifiers, secrets, or unrestricted validation payloads;
- HTML or rendered-body bytes; or
- generic stored-object payloads.

Private commitments are intentionally excluded even though they are not direct
identifiers. Returning them would create stable join handles across otherwise
suppressed slices.

## Legacy-Path Demotion

The current frontend Journey must stop treating generic `executive_packet`
records as selectable authoritative readouts:

- remove packet-ID enumeration from the journey hook;
- remove packet count from readiness or completion semantics;
- remove the packet chooser and “open readout” action;
- remove the frontend HTML-fetch helper when it has no remaining consumer; and
- add no replacement trace UI in Slice F.

The existing HTML endpoint remains available only for additive compatibility.
It keeps its current role restriction and fail-closed output, and adds fixed
headers:

```text
Deprecation: true
X-AI-Value-Legacy-Path: true
X-AI-Value-Claim-Trace-Authoritative: false
```

It does not redirect to or claim equivalence with the JSON trace. Generic
legacy object persistence remains non-authoritative and reserved Slice D/E
objects remain hidden from generic object reads. No storage type is deleted.

The existing static `/ai-value-readout` prototype receives a visible
“Illustrative example, not live evidence” label. It is not wired to the trace.

## Contract and Documentation Synchronization

The implementation unit includes:

- a strict shared Zod schema and exported TypeScript types;
- `schemas/ai-value/canonical-claim-trace.schema.json`;
- `docs/contracts/ai-value-canonical-claim-trace/README.md`;
- an OpenSpec change named `add-allowlisted-claim-trace` with proposal, design,
  tasks, and the `ai-value-platform` specification delta;
- backend route, service, and organization-scoped repository support;
- focused backend and frontend tests;
- a dedicated `scripts/verify_canonical_claim_trace_postgres.mjs` verifier that
  exercises the real restricted persistence path and final-head race; and
- queue/progress documentation updated with exact evidence and state.

No existing Slice D or Slice E contract is weakened. Any explanatory references
to Slice F in those contracts remain compatible with this design.

## Test-First Acceptance Evidence

Implementation starts with failing tests for:

1. Exact response-schema keys and rejection of additional fields.
2. Authorized success for `ADMIN` and `ENABLEMENT_LEAD`.
3. Existing `401` behavior for missing or forged authentication.
4. Existing `403` behavior for every disallowed role.
5. Inability to elevate a JWT-derived role or organization with headers.
6. Binding-ID-only lookup; a packet ID cannot select a trace.
7. Byte-identical `HOLD` bodies for malformed, missing, foreign, stale,
   revoked, tampered, cross-spliced, and substituted artifacts.
8. Final source or journal-head movement between initial verification and
   projection producing `HOLD`.
9. Poison sentinels for emails, user IDs, raw events, prompts, transcripts,
   secrets, key material, MACs, commitments, and row locators never appearing
   in authorized or held output.
10. Unknown query parameters and request bodies producing `HOLD`.
11. No registered `POST`, `PUT`, `PATCH`, or `DELETE` mutation path and no
    persistence write during a trace read.
12. Journey packet chooser, packet-count readiness, and HTML navigation removal.
13. Fixed legacy HTML deprecation headers and preserved fail-closed behavior.
14. PostgreSQL verification of organization isolation, restricted-role
    behavior, exact BOUND trace, and the final-head race.

Focused tests run before broad suites. Strict OpenSpec validation and the
Assurance Harness governance gate are required.

## Review and Completion Boundary

After focused tests and the PostgreSQL verifier pass:

1. Create an immutable local implementation commit.
2. Run independent CODE, BUG, and ADVERSARIAL reviews against that exact SHA.
3. Treat a review as blocking only when it demonstrates an executable
   authorization or privacy failure, or a violation of one of the nine
   invariants. Record other improvements as follow-up work.
4. Apply any blocking fix in a new commit and repeat exact-SHA review as needed.
5. Run the full required suite once on the final reviewed SHA.
6. Push, create the Slice F pull request, wait for required current-head GitHub
   checks, and normal-merge only with explicit merge authority.

Designed, implemented, locally verified, committed, pushed, open-PR, reviewed,
merged, deployed, and live-proved remain separate states. This design
authorizes no deployment or production migration.
