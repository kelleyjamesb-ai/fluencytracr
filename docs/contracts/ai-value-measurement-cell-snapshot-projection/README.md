# AI Value Measurement Cell Snapshot Projection

This contract defines the internal operator lineage projection over persisted
`measurement_cell_snapshots`.

It creates no frontend page, export package, rendered readout, customer-facing
output, financial output, ROI proof, causality claim, productivity claim,
confidence percentage, probability output, person-level output, team-ranking
surface, live connector execution, schema, migration, or new persistence table.

## Endpoint

```text
GET /api/v1/ai-value/measurement-cell-snapshots
```

Allowed roles:

- `ADMIN`
- `GOV_OPERATOR`
- `ENABLEMENT_LEAD`

Denied roles include `EXEC_VIEWER`, `MANAGER`, and `EMPLOYEE`.

## Display Boundary

The projection is for:

```text
internal_operator
```

It may support an internal operator surface that needs compact Measurement Cell
snapshot status, internal projection gate posture, selected-path lineage,
metric lineage, window lineage, source refs, caveats, and blocked uses.

It must not be treated as a source-bound executive readout, customer export,
financial output, ROI proof, causal proof, productivity output, confidence
model input, or probability output.

## Required Response Policy

Every response must keep these fields false:

- `customer_facing_output`
- `customer_facing_financial_output`
- `source_bound_readout`
- `export_authorized`

Every response must keep `source_bound_projection` true only in the narrow
sense that projected records retain compact source/path/metric/window lineage.

Every response must use:

```text
FT_AI_VALUE_MEASUREMENT_CELL_OPERATOR_PROJECTION_2026_06
```

## Allowed Snapshot Fields

Each projected snapshot may include:

- snapshot id, Measurement Cell id, assembly-run id, Measurement Plan id,
  Value Hypothesis binding, and append-only version;
- internal projection gate state derived from stored Measurement Cell gate
  posture, assembly gate posture, approval state, metric-owner approval state,
  milestone window posture, and projection safety posture;
- workflow family, workflow id, function area, and cohort key;
- one selected expectation-path binding;
- one selected metric binding;
- milestone window boundaries;
- the five Measurement Cell source refs only:
  `blueprint_source_ref`, `ai_fluency_source_ref`, `vbd_source_ref`,
  `metric_source_ref`, and `token_source_ref`;
- required caveats and the projection-safe blocked-use posture.

The internal projection gate must hold if the stored compact row has stale or
drifted selected-path, metric, lag, approval, window, source-ref, payload, or
validation posture. A stored `valid: true` flag is necessary but not sufficient
for a clear projection gate.

Rows with unsafe values in scalar fields that the projection would expose must
be omitted from the response entirely. Unsafe source refs or compact payloads
that can be withheld without leaking may still return a held projection with
unsafe refs removed. Held projections must not emit source refs.

Projected source refs must be compact scalar references. JSON strings, source
package payload fragments, registry fragments, free-form notes, arrays, query
text, raw-row hints, identifiers, prompts, responses, transcripts, or other
non-compact values must hold the projection gate and be stripped from the
response.

The stored blocked-use posture remains a gate input, but the API response must
not mirror the full persisted blocked-use array when that would surface
customer-facing financial, causality, productivity, ROI, EBITDA, probability,
or score-like language. The response may emit only the safe projection blocked
uses needed to preserve the operator boundary.

## Forbidden Fields

The projection must never expose:

- `payload`
- `assembly_payload`
- validation payloads
- assembly validation payloads
- full Measurement Cell objects
- full operator handoff bundles
- full source packages
- full expectation-path registries
- raw rows
- query text or SQL text
- prompts, responses, transcripts, or file contents
- user identifiers, person identifiers, row ids, or span ids
- ROI, EBITDA, finance-output, causality, productivity, confidence, score, or
  probability fields.

## Productization Role

This contract is a backend projection contract only. It is the safe read shape
that may feed an internal operator surface after snapshot persistence exists.
It does not upgrade Measurement Cell snapshots into customer-facing readouts,
exports, Series persistence, live connector output, confidence research input,
or finance output.
