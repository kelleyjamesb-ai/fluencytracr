# Ingest Architecture

## 1. Purpose

This document defines production ingest as a future V3 primitive for FluencyTracr. It establishes the architectural basis before any endpoint, schema, transformer, scheduler, or customer deployment path is implemented. The document is load-bearing on the governance posture because the ingest path determines where raw telemetry is allowed to exist, where per-user computation may happen, and what evidence can cross into FluencyTracr. V3 ingest may only advance if it preserves the nine invariants, the scope guardrails, and the aggregate-only evidence model already defined by the V1 and V2 concepts.

## 2. The Privacy Boundary Decision

The central architectural commitment is simple: raw GCE never leaves the customer environment.

Production ingest should use a customer-side transformer pattern. The transformer runs inside the customer's cloud boundary, reads the customer's GCE export or warehouse view, performs the minimum necessary per-user computation locally, aggregates those computations into cohort percentile distributions, and sends only those distributions to FluencyTracr. Per-user rows, raw prompts, document references, session traces, identifiers, and row-level telemetry do not cross the boundary.

The alternative is centralized raw-event ingestion: FluencyTracr receives raw GCE, stores it, filters it, computes per-user statistics centrally, and relies on policy, access controls, retention rules, and review process to prevent misuse. That model can be made procedurally safer, but it is not structurally private. It asks the customer to trust that raw data will not be mishandled after it leaves their environment.

The V3 ingest posture chooses structural privacy over procedural privacy. If per-user data cannot cross the boundary, FluencyTracr does not need to promise not to inspect it. The system is designed so it does not possess it. That is stronger than audit logging, stronger than role-based access control, and more aligned with the product's claim that it is an aggregate behavioral evidence layer, not a surveillance system.

## 3. Three-Layer Architecture

### Customer-Side Transformer

The customer-side transformer runs in the customer's GCP, AWS, or equivalent controlled environment. It reads approved GCE exports or warehouse tables, computes per-user usage statistics only inside that environment, aggregates the results into cohort distributions, and emits aggregate records to FluencyTracr.

The transformer is responsible for applying the surface taxonomy, joining verification signals to parent records, computing velocity dimensions, and producing only cohort-level output. It may compute over individual rows, but it must not emit individual rows. Its output is a compact set of distributions and aggregate rates by workflow, surface, JBTD, persona, and window.

### Aggregate Ingest Endpoint

The aggregate ingest endpoint is the FluencyTracr boundary. The future endpoint is:

`POST /api/v3/ingest/aggregate`

It accepts pre-computed cohort distributions and aggregate counts only. Its schema must reject any field that looks like a person-level identifier, raw event body, raw prompt, document text, message content, IP address, session trace, or row-level event list. The endpoint is not a convenience wrapper around raw event ingestion. It is the enforcement point that makes the privacy boundary real.

### Scheduled Orchestrator

The scheduled orchestrator runs the customer-side transformer on a fixed cadence, usually nightly or weekly. It may be implemented through cron, Cloud Scheduler, Airflow, dbt, a customer-owned CI job, or another customer-approved scheduler. The orchestrator controls freshness and retry behavior. It does not change what data is allowed to cross the boundary.

The orchestrator should produce repeatable windows so that verdicts can be compared over time. It should also make failures visible to the customer and to FluencyTracr without exposing raw records.

## 4. What This Is Not

V3 ingest is NOT centralized raw-event ingestion.

V3 ingest is NOT MCP-brokered ingestion. MCP may become useful later for output retrieval, analysis actions, or customer-facing workflow in V4. It is the wrong layer for moving sensitive production telemetry into FluencyTracr.

V3 ingest is NOT streaming per-event ingestion. The unit of transfer is an aggregate distribution for a governed window, not a live row.

V3 ingest is NOT any path that lets per-user data cross the customer boundary.

V3 ingest is NOT a connector strategy for Veeva, Jira, ServiceNow, or other systems of record. Outcome evidence remains customer-attested aggregate evidence unless separately governed.

Any implementation that routes raw GCE into FluencyTracr first and promises to aggregate later violates this concept. That is not a shortcut. It is the wrong architecture.

## 5. Governance Invariants Preserved

V3 ingest must preserve all nine invariants:

1. **Canonical event set unchanged.** Ingest architecture does not add canonical observation events. It transports aggregate evidence for the existing V1 and V2 event model.
2. **No new suppression reasons.** The five suppression reasons remain unchanged. Ingest failures may be operational errors, but they do not become new verdict reasons without governance review.
3. **No tunable thresholds.** The customer-side transformer must use governed constants and versioned calibration references, not admin-adjustable controls.
4. **No admin overrides.** A suppressed aggregate cannot be manually surfaced through ingest.
5. **No individual scoring.** This invariant becomes structural. Per-user computation happens only inside the customer environment, and the ingest schema rejects person-level fields at the boundary.
6. **Default verdict is SUPPRESS.** Aggregate records that do not clear volume, time, convergence, baseline, or ambiguity gates remain suppressed.
7. **Latency is corroborative only.** Ingest may carry aggregate latency distributions, but latency cannot become a surfacing trigger.
8. **Assurance Harness stays green.** Any implementation must add coverage for the aggregate boundary and keep existing assurance checks passing.
9. **Per-slice independence.** Aggregates are computed and gated independently per workflow, JBTD, persona, surface, and window. Small slices cannot be rescued by broader aggregation.

The privacy boundary strengthens the governance posture because FluencyTracr cannot misuse data it never receives.

## 6. Customer Operational Model

The customer runs the transformer in their own environment. They approve the data source, scheduler, service account, warehouse permissions, and retention policy. They can inspect the transformer query or script, review its output schema, and decide which surfaces and slices are eligible.

The customer sees the raw GCE because it remains in their systems. They also see the aggregate records emitted by the transformer and the FluencyTracr verdicts returned from those records. FluencyTracr receives aggregate distributions, cohort sizes, window metadata, surface labels, calibration references, and suppression-compatible evidence.

The customer does not send raw prompts, document content, user-identifiable fields, per-session traces, or per-user usage rows to FluencyTracr. FluencyTracr does not need access to the customer's raw warehouse tables after the transformer is installed.

Calibration baselines are shared governed artifacts. They help interpret aggregate distributions, but they do not grant FluencyTracr access to customer raw data.

## 7. Forward Reference to Calibration

Calibration baselines are governed separately. See [CALIBRATION.md](./CALIBRATION.md).

The ingest architecture depends on calibration, but it does not define calibration policy. V3 ingest should carry a calibration reference with aggregate records so downstream verdicts can explain what baseline was used. Swapping or updating calibration references must remain a deliberate governance-reviewed operation, not an admin override of suppression behavior.

## 8. Open Questions

These questions are deliberately open and must be resolved before V3 implementation:

- Should the customer-side transformer be primarily delivered as Python, SQL templates, or both?
- Should the transformer ship as a container, a script, a dbt package, or a warehouse-native scheduled query?
- Should verdicts be returned by pushing results back into the customer's warehouse, by customer pull from FluencyTracr, or by both?
- What retention policy should apply to ingested cohort distributions?
- How should failed transformer runs be reported without leaking raw event details?
- How should schema versioning work when customer-side transformer versions and FluencyTracr endpoint versions drift?

These are implementation decisions, not permission to weaken the privacy boundary.

## 9. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The customer-side-transformer privacy-boundary architectural choice is credited to James Kelley. The key insight is that FluencyTracr's production ingest should preserve aggregate evidence by construction: raw GCE remains inside the customer environment, while only cohort distributions cross into FluencyTracr.
