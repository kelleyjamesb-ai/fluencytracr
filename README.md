# FluencyTracr
![Assurance Harness](https://github.com/kelleyjamesb-ai/fluencytracr/actions/workflows/assurance-harness.yml/badge.svg)

> **Agents and contributors:** Read [AGENTS.md](./AGENTS.md) before making any changes. It defines the V1 invariants, the canonical event and suppression sets, and the ordered prompt roadmap.
> Influences and credits: see [ATTRIBUTION.md](./ATTRIBUTION.md).

FluencyTracr is the behavioral evidence layer for Glean value realization.
It exists because the current time-saved pipeline can show acceleration while
leaving a critical question unanswered: roughly 64% of chat runs have no
quality signal today.

FluencyTracr sits on top of that pipeline as bounded evidence services and
documented value-realization layers:

- **AI Work Evidence:** org-agnostic core layer that separates reusable
  aggregate evidence primitives from source-specific adapters such as Glean
  dogfood and value-evidence mappings. It defines surfaces, workflows,
  approved cohorts, interventions, trust evidence, source coverage, outcome
  evidence, and value hypotheses without adding events, suppression reasons,
  individual scoring, rankings, or realized ROI calculation. When aggregate
  evidence is trusted, reliable, and customer-approved, it may feed ROI metric
  routing and governed value-scenario modeling.
- **Quality Multiplier:** discounts, preserves, or amplifies time-saved estimates
  when aggregate workflow behavior shows enough evidence quality.
- **Causal Delta:** compares pre/post workflow patterns around a known change
  moment so value teams can ask what changed after rollout without claiming
  statistical causality.
- **Reliability Factor:** qualifies whether surfaced workflow evidence looks
  operationally dependable based on verification, recovery, abandonment, and
  friction-loop behavior.
- **Outcome Evidence:** stores and replays customer-attested aggregate KPI
  outcomes next to the unchanged workflow verdict so external consumers can do
  their own correlation.
- **Velocity Index:** adds V2 aggregate usage-distribution context across
  frequency, engagement, and breadth, surfaced only as cohort percentiles after
  the same fail-closed gates clear. Dogfood velocity coverage now follows the
  full surface taxonomy in [docs/concepts/SURFACES.md](docs/concepts/SURFACES.md),
  spanning workflow and standalone AI surfaces without adding person-level output.
- **Depth:** frames cross-surface work integration through surface repertoire
  and repeated meaningful use, then qualifies that evidence with verification,
  delegation, reuse, recovery, and judgment behavior. Depth is aggregate
  evidence that adoption is becoming durable enough to support defensible value
  claims.
- **AGENT sub-surfaces:** V2.3 splits AGENT into `agent:autonomous`,
  `agent:workflow_named`, and `agent:ephemeral` so delegation, reusable Skill,
  and exploratory agent behavior can be evaluated independently.
- **Skill Read Evidence:** V4 research path for Skills usage in agent span
  logs. It treats raw span skill-reader attributes, legacy skill-name inputs
  where present, plus dbt
  `skill_reader_skill_name`, as availability signals only until
  unspecified-share, parent attribution, canonical identity, versioning,
  invocation mode, UGC coverage, and personal/shared/org Skill separation are
  validated.
- **V3 production ingest:** moves beyond manual CSV dogfood by running a
  customer-side transformer in the customer's cloud, sending only aggregate
  cohort distributions to FluencyTracr, and storing immutable verdicts against
  governed calibration baselines.
  This is bounded aggregate ingest, not a production Sigma/BigQuery AI Value
  pipeline: FluencyTracr does not run live Sigma/BigQuery queries for the AI
  Value spine, ingest raw rows, or authorize customer-facing value output from
  this path.
- **AI Value controlled aggregate pipeline dry run:** proves that a
  BigQuery/Sigma-shaped scrubbed aggregate export manifest can enter the
  existing source-review path and produce a compact internal Measurement Cell
  candidate proof. It does not run BigQuery/Sigma, persist pipeline runs, create
  Measurement Cell snapshots, or emit customer-facing value/finance/confidence
  output.
- **AI Value Measurement Cell snapshot projection:** proves that a promoted
  backend-internal Measurement Cell snapshot row can be reduced to a compact
  internal operator-review product shape. It does not create read routes,
  frontend UI, exports, rendered readouts, live connectors, model output,
  finance output, or customer-facing output.
- **AI Value customer data model promotion gate:** proves that the compact
  Measurement Cell snapshot projection is safe enough only to enter a separate
  exact-scope customer data model persistence promotion decision. It holds by
  default, validates ready gates against the source projection, and blocks
  persistence writes, schemas, routes, UI, exports, rendered readouts, live
  connectors, model output, confidence/probability/score output, finance
  output, and customer-facing output.
- **AI Value customer data model persistence promotion decision:** proves that
  the customer data model gate can move only through the exact-scope
  implementation-decision lane. It holds by default and keeps any broader
  persistence writes, Prisma schemas, migrations, repository write paths,
  routes, UI, exports, rendered readouts, live connectors, model output,
  finance output, and customer-facing output blocked.
- **AI Value customer data model persistence implementation decision:** names
  and bounds the only promoted physical slice for customer-ready product data:
  one append-only compact `ai_value_customer_data_model_snapshots` table plus
  internal repository write/read paths derived from valid Measurement Cell
  Snapshot Projection inputs. It does not by itself expose stored rows,
  exports, rendered readouts, live connectors, confidence/probability/score
  output, finance output, or customer-facing economic output.
- **AI Value customer data model route projection:** opens the exact read-only
  customer evidence status projection over
  `ai_value_customer_data_model_snapshots`: one source-bound backend route and
  one compact workspace panel. It exposes approved customer-safe labels, windows,
  evidence status, caveats, blocked outputs, and next evidence action only; it
  only projects clear validated rows; it does not derive customer labels from
  compact IDs, apply stale local filters, or expose stored rows, org/client IDs,
  snapshot IDs, source refs, hashes, raw rows, exports, rendered readouts, live
  BigQuery/Sigma/Glean execution, confidence/probability/score output, ROI,
  finance output, causality, productivity, or customer-facing financial output.
- **AI Value Measurement Cell Series persistence decision:** repeated Day 0 /
  30 / 60 / 90 / 180 / 365 validation now passes through the contract-only
  Measurement Cell Series layer, but durable `measurement_cell_series_snapshots`
  remain held because no product read-path need has been proven. Evidence
  Continuity stays inside the Series contract output for now; do not extend
  `evidence_snapshots` until a later exact-scope decision authorizes it.
- **AI Value Measurement Cell Series persistence promotion gate:** adds the
  executable hold-by-default gate after repeated milestone validation. It can
  become ready only for a later exact-scope Series snapshot implementation
  decision after a separate durable read-path decision proves compact customer
  data model projections cannot satisfy continuity needs. Caller-supplied proof
  strings alone still hold. It does not create `measurement_cell_series_snapshots`,
  extend `evidence_snapshots`, add routes, UI, exports, rendered readouts, live
  BigQuery/Sigma/Glean wiring, model output, confidence/probability/score
  output, finance output, ROI, causality, productivity, or customer-facing
  output.
- **AI Value customer evidence history read-path proof:** proves that current
  Day 0 / 30 / 60 / 90 / 180 / 365 customer evidence history can be served
  from compact `ai_value_customer_data_model_snapshots` plus Measurement Cell
  Series contract output. It binds only compact milestone counts and hashes,
  ignores stale superseded rows, holds on missing or held latest rows, and does
  not create Series persistence, extend `evidence_snapshots`, add routes, UI,
  exports, rendered readouts, live connector execution, model output,
  confidence/probability/score output, finance output, ROI, causality,
  productivity, or customer-facing economic output.
- **AI Value durable Series read-path decision:** consumes the customer
  evidence history read-path proof and records the current decision:
  compact customer history satisfies the read path, so
  `measurement_cell_series_snapshots` remain blocked. The allowed next step is
  to continue history reads from `ai_value_customer_data_model_snapshots`; the
  decision does not emit a ready Series implementation state, persistence write,
  schema, migration, repository path, route, UI, export, rendered readout, live
  wiring, model output, finance output, ROI, causality, productivity, or
  customer-facing economic output.
- **AI Value data model spine readiness lock:** records that the compact
  customer data model spine is ready for hardening toward real source wiring
  only as a Boolean readiness contract. The implemented equation is
  `measurement_cell_snapshots_promoted AND
  ai_value_customer_data_model_snapshots_promoted AND
  customer_data_model_route_projection_ready AND
  customer_evidence_history_read_path_proven AND
  durable_series_read_path_holds_series_persistence AND
  all_blocked_outputs_false`. It explicitly reports no statistical model
  equation, confidence math, or numeric weights; keeps Series persistence held;
  and blocks model output, confidence/probability/score output, finance output,
  live BigQuery/Sigma/Glean execution, ROI, causality, productivity, and
  customer-facing economic output.
- **AI Value compact source wiring hardening:** turns the data model spine lock's
  allowed next step into non-live compact source-descriptor posture for prepared
  `bigquery_export` and `sigma_export` only. `glean_query` remains held. It does
  not authorize live BigQuery/Sigma/Glean execution, credentials, SQL/query
  storage, warehouse/dashboard handles, raw rows, routes, UI, exports, rendered
  readouts, model/confidence/probability/score output, finance/ROI/causality/
  productivity output, customer-facing output, or Measurement Cell Series
  persistence.
- **AI Value connector promotion readiness sequence:** records the next four
  actions as a governed requirements path: non-live connector promotion decision
  requirements, held Glean source adapter boundary planning, source descriptor
  promotion checklist, and exact-scope BigQuery/Sigma live connector gate design.
  It names the future target of a full data model with weights and Bayesian
  readiness, but keeps numeric weights, Bayesian model execution, model output,
  confidence/probability/score output, live connectors, finance output, and
  customer-facing output blocked.
- **AI Value controlled aggregate connector adapter:** proves that the reviewed
  aggregate dry-run proof can become a compact internal BigQuery/Sigma connector
  review packet without credentials, live execution, persistence, snapshots,
  routes, UI, or customer-facing output.
- **AI Value aggregate connector boundary plan:** proves that a
  source-owner-attested BigQuery/Sigma aggregate export plan can pass a
  validator-only boundary review before any live connector exists. It does not
  run BigQuery/Sigma, store connector or pipeline runs, persist manifests,
  create Source Packages or Measurement Cells, or emit model, finance, or
  customer-facing output.
- **AI Value controlled aggregate manifest validation:** proves that the saved
  BigQuery/Sigma-shaped connector review packet can be represented as Source
  Inventory, Aggregate Extraction, and Pipeline Run Review manifests for
  operator promotion review. It remains non-persistent and does not authorize
  live connector execution, Source Package clearance, Measurement Cell or
  Series persistence, confidence math, finance output, or customer-facing
  output.
- **AI Value research promotion readiness packet:** proves that repeated
  governed Day 0 / 30 / 60 / 90 / 180 / 365 aggregate evidence can become a
  compact internal research-design gate. It emits only refs, hashes, caveats,
  blocked uses, and false boundary feeds; it does not authorize model math,
  numeric weights, persistence, exports, finance output, or customer-facing
  output.
- **AI Value contribution alignment internal prototype runner:** proves that
  the research-design packet can become a local compact internal review
  envelope without becoming a model. It emits only refs, hashes, source-bound
  posture, caveats, blocked uses, and false boundary feeds; it does not
  authorize confidence math, numeric weights, persistence, exports, finance
  output, or customer-facing output.
- **AI Value contribution alignment runner review packet:** proves that the
  compact internal prototype-runner envelope can become a source-bound internal
  model-prototype design review packet without becoming a model. It keeps
  AI Fluency construct context, psychological context, observed VBD context,
  and selected customer metric movement separate; it does not authorize model
  implementation, numeric weights, persistence, exports, finance output, or
  customer-facing output.
- **AI Value contribution alignment model prototype design review:** records
  the internal candidate model frame and alignment-review components without
  implementing a model. It remains method-design-only and blocks model math,
  numeric weights, score/probability output, persistence, exports, finance
  output, and customer-facing output.
- **AI Value contribution alignment internal model prototype:** replays the
  governed design-review components as compact internal component traces
  without emitting a model result. It remains non-persistent and blocks model
  math, numeric weights, confidence output, probability/score output,
  persistence, exports, finance output, and customer-facing output.
- **AI Value contribution alignment internal model prototype review packet:**
  turns the compact internal prototype into a source-bound review packet for a
  separate internal research-design gate. It remains non-persistent,
  compact-ref-only, and blocks model feeds, model implementation, numeric
  weights, score/probability output, finance output, persistence, exports,
  live connectors, and customer-facing output.
- **AI Value contribution alignment internal research-design gate review:**
  closes the current internal design chain by reviewing whether the compact
  prototype review packet is safe enough for a later exact-scope
  method-prototype decision. It remains non-persistent, compact-ref-only, and
  blocks model feeds, model implementation, numeric weights, score/probability
  output, finance output, persistence, exports, live connectors, and
  customer-facing output.
- **AI Value contribution alignment method prototype decision:** records the
  exact-scope decision to promote only a small internal qualitative method
  prototype after the internal research-design gate review passes. It remains
  non-persistent, compact-ref-only, and blocks model feeds, model
  implementation, numeric weights, score/probability output, finance output,
  persistence, exports, live connectors, UI, routes, schemas, and
  customer-facing output.
- **AI Value contribution alignment small internal method prototype:** turns
  the promoted method scope into compact qualitative component posture for
  internal review only. It keeps AI Fluency construct context, psychological
  context, observed VBD context, and selected customer metric movement distinct,
  and it blocks model results, numeric weights, score/probability output,
  finance output, persistence, exports, live connectors, UI, routes, schemas,
  and customer-facing output.
- **AI Value contribution alignment internal method prototype review record:**
  reviews the compact qualitative method prototype and promotes only a separate
  exact-scope research math finalization review. It remains non-persistent,
  compact-ref-only, and blocks research math output, model feeds, model
  implementation, numeric weights, score/probability output, finance output,
  persistence, exports, live connectors, UI, routes, schemas, and
  customer-facing output.
- **AI Value contribution alignment research math finalization review:**
  closes the promised exact-scope review step before any data-model promotion.
  It consumes compact source-bound review record refs only and authorizes only
  a later research math data model promotion decision. It remains
  non-persistent and blocks research math output, model feeds, model
  implementation, numeric weights, score/probability output, finance output,
  persistence, exports, live connectors, UI, routes, schemas, and
  customer-facing output.
- **AI Value contribution alignment research math data model promotion
  decision:** consumes the finalization review and promotes only a compact
  internal research-math data model layer. It explicitly holds if only the older
  review record is supplied, and it blocks physical tables, persistence,
  research math output, model feeds, numeric weights, score/probability output,
  finance output, exports, live connectors, UI, routes, schemas, and
  customer-facing output.
- **AI Value contribution alignment internal research math data model:** defines
  the compact internal context grain for later research design: one approved
  expectation path ref, one source-bound Measurement Cell context ref, repeated
  Day 0 / 30 / 60 / 90 / 180 / 365 milestone refs, context-only component
  registry, and separate AI Fluency construct, AI Fluency psychological,
  observed VBD, and selected metric movement partitions. It remains
  non-persistent and emits no model result, numeric weights, score/probability
  output, finance output, exports, live connectors, UI, routes, schemas, or
  customer-facing output.
- **AI Value contribution alignment feature stability review:** reviews the
  internal research math data model feature inputs against a world-class
  pre-weight standard: source-bound id/hash, stable component registry,
  distinct context partitions, repeated milestone requirement, and false
  forbidden-output feeds. A pass authorizes only a separate internal numeric
  weight decision; it does not authorize weights, weighted model output,
  confidence/probability output, Bayesian execution, finance output, ROI,
  causality, productivity, persistence, exports, live connectors, UI, routes,
  schemas, or customer-facing output.
- **AI Value contribution alignment internal numeric weight decision:** consumes
  the feature stability review and authorizes only a later versioned internal
  weight object. It contains no weight values, emits no weighted model frame,
  and keeps confidence/probability output, Bayesian execution, score-like
  output, finance output, ROI, causality, productivity, persistence, exports,
  live connectors, UI, routes, schemas, and customer-facing output blocked.
- **AI Value contribution alignment versioned weight object:** consumes the
  internal numeric weight decision and creates the first internal-only
  structural weight set:
  `internal_structural_equal_weights_2026_06`. It assigns neutral equal
  weights across the ten governed source-bound feature inputs, records
  `initial_internal_structural_weights_not_empirical_confidence`, and feeds
  only a later weighted internal model frame. It does not emit weighted model
  output, research model feed, confidence/probability output, Bayesian
  execution, score-like output, finance output, ROI, causality, productivity,
  persistence, exports, live connectors, UI, routes, schemas, or
  customer-facing output.
- **AI Value contribution alignment weighted internal model frame:** consumes
  the versioned weight object and attaches its source-bound weights to the ten
  governed feature inputs as internal weighted feature composition only. It is
  the full internal weighted data model frame, not a model result: it keeps
  weighted internal model output, aggregate score output, research model feed,
  confidence/probability output, Bayesian execution, finance output, ROI,
  causality, productivity, persistence, exports, live connectors, UI, routes,
  schemas, and customer-facing output blocked while allowing only a later
  internal Bayesian readiness review.
- **AI Value contribution alignment internal Bayesian readiness review:**
  consumes the weighted internal model frame and authorizes only a later
  Bayesian model specification contract. It names
  `bayesian_hierarchical_difference_in_differences_candidate` as the candidate
  model family but does not define priors, likelihood, estimands, posterior
  output, confidence/probability output, Bayesian execution, finance output,
  ROI, causality, productivity, persistence, exports, live connectors, UI,
  routes, schemas, or customer-facing output.
- **AI Value contribution alignment Bayesian model specification:** consumes
  the internal Bayesian readiness review and defines the internal-only
  candidate model contract:
  `bayesian_hierarchical_did_spec_2026_06`. It records the aggregate
  Measurement Cell window unit, candidate difference-in-differences estimand,
  and uncalibrated prior/likelihood placeholders, but it does not run Bayesian
  execution, emit posterior/confidence/probability output, create score-like
  output, finance output, ROI, causality, productivity, persistence, exports,
  live connectors, UI, routes, schemas, or customer-facing output.
- **AI Value contribution alignment internal Bayesian execution gate:** consumes
  the Bayesian model specification and authorizes only a later internal
  execution runtime implementation. It binds to the specification id/hash,
  readiness-review ref, weighted-frame ref, and governed feature weights; records
  aggregate-only runtime prerequisites; and requires a later posterior/output
  review gate before any confidence or probability language can appear. It does
  not run Bayesian execution, emit posterior/confidence/probability output,
  create score-like output, finance output, ROI, causality, productivity,
  persistence, exports, live connectors, UI, routes, schemas, or
  customer-facing output.
- **AI Value contribution alignment internal Bayesian execution runtime:**
  consumes the execution gate and aggregate Measurement Cell windows to create a
  contained fixture/prototype Bayesian difference-in-differences artifact. It
  keeps the closed-form normal-normal update for `delta_ai_post` inside the
  internal fixture artifact, records missing diagnostics, and authorizes only
  `internal_diagnostics_and_model_adequacy_review_only`. It does not emit
  posterior/confidence/probability language, create score-like output, finance
  output, ROI, causality, productivity, persistence, exports, live connectors,
  UI, routes, schemas, or customer-facing output.
- **AI Value contribution alignment posterior output review gate:** consumes
  the internal Bayesian execution runtime and reviews the internal fixture
  artifact by ref/hash without echoing posterior numeric values. It is an
  artifact-containment review only, authorizes only
  `internal_diagnostics_and_model_adequacy_review_only`, and keeps internal
  posterior interpretation specification, posterior output, confidence output,
  probability output, finance output, ROI, causality, productivity, persistence,
  exports, live connectors, UI, routes, schemas, and customer-facing output
  blocked.
- **AI Value contribution alignment diagnostics evidence packet:** consumes the
  contained internal Bayesian fixture runtime and represents the evidence needed
  for diagnostics/model-adequacy review: data adequacy, suppressed/missing/held
  windows, comparison-design adequacy, convergence diagnostics, posterior
  predictive checks, prior sensitivity, residual/fit checks,
  calibration/backtest evidence, and feature-weight provenance. The current
  packet is ready for promotion-decision review but not promotion-sufficient:
  data/window/weight evidence is satisfied while comparison-design and model
  diagnostics remain unsatisfied. It cannot authorize promotion, posterior
  interpretation, confidence/probability language, customer-facing output, ROI,
  finance, causality, productivity, persistence, exports, live connectors, UI,
  routes, or schemas.
- **AI Value contribution alignment governed diagnostics sufficiency evidence
  source:** provides the internal-only, aggregate-only source contract that may
  supply diagnostics and comparison-design sufficiency evidence to the
  Diagnostics Evidence Packet. It holds by default unless each satisfied
  dimension has an explicit reviewed source evidence ref, an independent
  reviewed source evidence hash, and a derived source evidence hash bound to the
  runtime and fixture artifact. It cannot authorize promotion, posterior
  interpretation, confidence/probability language, customer-facing output, ROI,
  finance, causality, productivity, persistence, exports, live connectors, UI,
  routes, or schemas.
- **AI Value contribution alignment internal diagnostics and model adequacy
  review:** consumes the contained internal Bayesian fixture runtime and reviews
  data adequacy, comparison-design adequacy, and diagnostic placeholder status.
  It completes only as
  `INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED`,
  may feed only `bayesian_promotion_decision_gate_only`, keeps feature weights
  structural/internal rather than confidence scores, and keeps Bayesian
  interpretation, confidence/probability language, customer-facing output, ROI,
  finance, causality, productivity, persistence, exports, live connectors, UI,
  routes, and schemas blocked. This slice does not implement the Bayesian
  Promotion Decision Gate.
- **AI Value contribution alignment Bayesian promotion decision gate:** consumes
  the diagnostics/model adequacy review and decides whether a contained fixture
  may move only to a later Internal Bayesian Execution Artifact v1 slice. It may
  authorize only `internal_bayesian_execution_artifact_v1_only` and keeps
  posterior interpretation, confidence/probability language, customer-facing
  output, ROI, finance, causality, productivity, persistence, exports, live
  connectors, UI, routes, and schemas blocked. This slice does not create the
  execution artifact.
- **AI Value contribution alignment promotion gate passed artifact handoff:**
  records a passive, hash-bound handoff for an already-passed Bayesian
  Promotion Decision Gate and its exact runtime, diagnostics review, evidence
  packet, and governed diagnostics sufficiency evidence source hashes. The
  default executable path remains held; the explicit governed-evidence path may
  produce a passed handoff only as
  `PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY`.
  The handoff itself keeps `promotion_authorized=false`, creates no Internal
  Bayesian Execution Artifact v1, and keeps posterior interpretation,
  confidence/probability language, customer-facing output, ROI, finance,
  causality, productivity, persistence, exports, live connectors, UI, routes,
  and schemas blocked.
- **V4 Value Confidence Layer:** combines Velocity and Depth with governed V3
  verdicts to qualify the defensibility of AI value claims.
- **AI Scale Readiness Portfolio:** V4 internal readout contract that turns
  aggregate evidence into action postures for scale, enablement, workflow
  redesign, trust calibration, adoption expansion, value investigation, or hold.
  It is not customer-facing and does not calculate economic value.
- **Organizational Segmentation:** future V4 concept for aggregate-only
  intervention contexts such as tenure, function, role family, or behavior
  bands; never person, manager, or comparative team evaluation.
- **Economic Impact Bridge:** future V4 concept that maps trusted readiness
  patterns to customer-owned value investigations, ROI metric candidates, and
  governed scenario modeling without proving ROI or causality.
- **AI Manager Outcomes Recommendations:** docs-first V4 layer that recommends
  which customer-owned outcome signals and aggregate formulas to use next when
  testing cost, revenue, quality, capacity, risk, or experience value routes.
  Accepted aggregate evidence may be routed into ROI metric selection and
  scenario review, but not automatic economic proof.
  "AI Manager" means AI program owner or value-realization leader, not people
  manager scoring.
- **Data Boundary and ROI Evidence:** defines which organizational data may be
  useful upstream for value analysis, how it must be transformed before crossing
  into FluencyTracr, and which aggregate evidence can feed value-evidence cases.
  Sensitive HRIS, finance, revenue, workflow, support, and quality data can
  inform value modeling only after aggregation, attestation, and identifier
  removal; FluencyTracr still does not store raw rows, calculate realized ROI,
  prove causality, run HR analytics, or emit customer-facing economic output.
- **Work Mode Taxonomy:** maps governed surfaces into durable AI work patterns
  such as retrieval, conversation, transformation, embedded assist, delegation,
  reuse, exploration, verification, and corroborative telemetry.

V4 is the Value Confidence Layer. It combines Velocity and Depth with governed
V3 verdicts to qualify the defensibility of AI value claims.

The aggregate verdict layer uses AIVM vocabulary consistently: `value_type`
communicates the kind of value claim, and `evidence_grade` communicates whether
the support is `OBJECTIVE`, `CALIBRATED`, or `QUALITATIVE`. Value-realization
services should preserve those fields when they consume verdict metadata, and
suppression remains fail-closed.

The audience is AIOMs, value-realization PMs, and CIOs deciding which Glean
value claims are defensible. This is not an HR, learning, or individual
measurement product.

## AI assistants — start every session here

Long-form or multi-session coding **must** begin with **[`docs/agent/SESSION_START.md`](docs/agent/SESSION_START.md)** so work stays bounded, verified, and grounded in repo memory (queue + harness + git), not chat context alone. That doc aligns with [Anthropic’s guidance on long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) as implemented under [`harness/`](harness/README.md).

## Scope Guardrails
This project intentionally rejects surveillance and scope creep. Please read and follow
the guardrails in [SCOPE_GUARDRAILS.md](SCOPE_GUARDRAILS.md) before proposing changes.

## Evidence Layer Invariants
The governance invariants are the proof of seriousness behind the value
realization story. They are not the headline, but they make the headline
credible:

- Outputs are signals, not facts, and are strictly binary: `SURFACE` or `SUPPRESS`.
- Default state is `SUPPRESS`; ambiguity is first-class and always suppressive.
- No content storage or individual attribution is permitted.
- Latency is corroborative only and never triggers surfacing on its own.
- No tunable thresholds or admin overrides are allowed; constants are compiled into code.

Suppression reason codes (one-hot, immutable):
- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

## Complementary Stated-Evidence Layer
The AI Fluency Instrument remains useful as a stated-evidence layer: it captures
what people report about adoption, confidence, and practice. FluencyTracr should
be paired with that instrument when value teams want to compare stated evidence
with observed aggregate workflow evidence. The instrument is complementary; it
is not the lead positioning for this repository.

## Canonical Docs
- **Every session (mandatory for agents):** [docs/agent/SESSION_START.md](docs/agent/SESSION_START.md)
- AI / agent navigation (harness, evaluation, task contracts): [docs/agent/README.md](docs/agent/README.md)
- Agentic execution harness concept: [docs/concepts/AGENTIC_EXECUTION_HARNESS.md](docs/concepts/AGENTIC_EXECUTION_HARNESS.md)
- Cursor agent harness rules: [docs/agent/cursor-agent-harness.md](docs/agent/cursor-agent-harness.md)
- Optional OpenAI Agents SDK development harness: [docs/agent/openai-agents-harness.md](docs/agent/openai-agents-harness.md)
- Partner ingestion facade: [docs/api/ingest.md](docs/api/ingest.md)
- Unified telemetry ingest (UT_2026_04, feature-flagged): [docs/api/ingest-unified-telemetry.md](docs/api/ingest-unified-telemetry.md)
- Trace reconstruction (PRD Phase 1, admin): [docs/api/traces-reconstructed.md](docs/api/traces-reconstructed.md)
- Workflow observability rollup (PRD Phase 4): [docs/api/observability-org.md](docs/api/observability-org.md)
- Architecture map: [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md)
- Connector mapping spec: [docs/CONNECTOR_MAPPING_SPEC.md](docs/CONNECTOR_MAPPING_SPEC.md)
- EvidenceBundle v1 contract: [docs/contracts/evidence-bundle/v1/README.md](docs/contracts/evidence-bundle/v1/README.md)
- Reportability contract: [docs/contracts/reportability/README.md](docs/contracts/reportability/README.md)
- Agent-run development harness contract: [docs/contracts/agent-run/README.md](docs/contracts/agent-run/README.md)
- Agent-run ledger contract framing: [docs/contracts/agent-run/ledger.md](docs/contracts/agent-run/ledger.md)
- Unified cross-surface telemetry (UT_2026_04): [docs/contracts/unified-telemetry/README.md](docs/contracts/unified-telemetry/README.md)
- AI Value Intelligence evidence pack contract: [docs/contracts/ai-value-intelligence/README.md](docs/contracts/ai-value-intelligence/README.md)
- Customer Support AI Value pilot design: [docs/contracts/ai-value-intelligence/customer-support-pilot-design.md](docs/contracts/ai-value-intelligence/customer-support-pilot-design.md)
- Customer Support AI Value pilot dry run: [docs/contracts/ai-value-intelligence/customer-support-pilot-dry-run.md](docs/contracts/ai-value-intelligence/customer-support-pilot-dry-run.md)
- Customer Support AI Value validation workshop kit: [docs/contracts/ai-value-intelligence/customer-support-validation-workshop-kit.md](docs/contracts/ai-value-intelligence/customer-support-validation-workshop-kit.md)
- Customer Support AI Value workshop response fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-workshop-response.json](docs/contracts/ai-value-intelligence/examples/customer-support-workshop-response.json)
- AI Value Blueprint schema: [schemas/ai-value-intelligence/blueprint.schema.json](schemas/ai-value-intelligence/blueprint.schema.json)
- Customer Support AI Value blueprint fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json](docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json)
- AI Value Metric Definition schema: [schemas/ai-value-intelligence/metric-definition.schema.json](schemas/ai-value-intelligence/metric-definition.schema.json)
- Customer Support AI Value metrics fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json](docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json)
- AI Value Scenario input schema: [schemas/ai-value-intelligence/value-scenario-input.schema.json](schemas/ai-value-intelligence/value-scenario-input.schema.json)
- AI Value Scenario output schema: [schemas/ai-value-intelligence/value-scenario-output.schema.json](schemas/ai-value-intelligence/value-scenario-output.schema.json)
- Customer Support AI Value scenario fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json](docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json)
- AI Value governed ROI scenario schema: [schemas/ai-value-intelligence/roi-scenario.schema.json](schemas/ai-value-intelligence/roi-scenario.schema.json)
- Customer Support governed ROI scenario fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json](docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json)
- AI Value data boundary and ROI evidence schema: [schemas/ai-value-intelligence/data-boundary-roi-evidence.schema.json](schemas/ai-value-intelligence/data-boundary-roi-evidence.schema.json)
- Customer Support data boundary and ROI evidence fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-data-boundary-roi-evidence.json](docs/contracts/ai-value-intelligence/examples/customer-support-data-boundary-roi-evidence.json)
- AI Value Evidence Case schema: [schemas/ai-value-intelligence/value-evidence-case.schema.json](schemas/ai-value-intelligence/value-evidence-case.schema.json)
- Customer Support AI Value evidence case fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-case.json](docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-case.json)
- AI Value Agentic Platform Harness concept: [docs/concepts/AI_VALUE_AGENTIC_PLATFORM_HARNESS.md](docs/concepts/AI_VALUE_AGENTIC_PLATFORM_HARNESS.md)
- AI Value Agent Handoff schema: [schemas/ai-value-intelligence/agent-handoff.schema.json](schemas/ai-value-intelligence/agent-handoff.schema.json)
- Customer Support AI Value agent handoff fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json](docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json)
- AI Value Evidence Readiness schema: [schemas/ai-value-intelligence/evidence-readiness.schema.json](schemas/ai-value-intelligence/evidence-readiness.schema.json)
- Customer Support AI Value readiness fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json](docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json)
- AI Value Hypothesis Readiness contract: [docs/contracts/ai-value-value-hypothesis-readiness/README.md](docs/contracts/ai-value-value-hypothesis-readiness/README.md)
- AI Value Hypothesis Readiness Packet Runner: [docs/contracts/ai-value-hypothesis-readiness-packet-runner/README.md](docs/contracts/ai-value-hypothesis-readiness-packet-runner/README.md)
- AI Value Real Data Intake Packet Runner: [docs/contracts/ai-value-real-data-intake-packet-runner/README.md](docs/contracts/ai-value-real-data-intake-packet-runner/README.md)
- AI Value Operator Intake Adapter: [docs/contracts/ai-value-operator-intake-adapter/README.md](docs/contracts/ai-value-operator-intake-adapter/README.md)
- AI Value VBD + Token Operator Source Handoff: [docs/contracts/ai-value-vbd-token-operator-source-handoff/README.md](docs/contracts/ai-value-vbd-token-operator-source-handoff/README.md)
- AI Value Customer Metric Operator Source Handoff: [docs/contracts/ai-value-customer-metric-operator-source-handoff/README.md](docs/contracts/ai-value-customer-metric-operator-source-handoff/README.md)
- AI Value Assumption / Governance Operator Source Handoff: [docs/contracts/ai-value-assumption-governance-operator-source-handoff/README.md](docs/contracts/ai-value-assumption-governance-operator-source-handoff/README.md)
- AI Value Operator Source Handoff Bundle: [docs/contracts/ai-value-operator-source-handoff-bundle/README.md](docs/contracts/ai-value-operator-source-handoff-bundle/README.md)
- AI Value Measurement Cell Series: [docs/contracts/ai-value-measurement-cell-series/README.md](docs/contracts/ai-value-measurement-cell-series/README.md)
- AI Value Operator Time-Series Run: [docs/contracts/ai-value-operator-time-series-run/README.md](docs/contracts/ai-value-operator-time-series-run/README.md)
- AI Value Operator Workflow: [docs/contracts/ai-value-operator-workflow/README.md](docs/contracts/ai-value-operator-workflow/README.md)
- AI Value Operator Evidence Package Runner: [docs/contracts/ai-value-operator-evidence-package-runner/README.md](docs/contracts/ai-value-operator-evidence-package-runner/README.md)
- AI Value Controlled Aggregate Fixture Review: [docs/contracts/ai-value-controlled-aggregate-fixture-review/README.md](docs/contracts/ai-value-controlled-aggregate-fixture-review/README.md)
- AI Value Controlled Measurement Cell Assembly: [docs/contracts/ai-value-controlled-measurement-cell-assembly/README.md](docs/contracts/ai-value-controlled-measurement-cell-assembly/README.md)
- AI Value Controlled Aggregate Pipeline Dry Run: [docs/contracts/ai-value-controlled-aggregate-pipeline-dry-run/README.md](docs/contracts/ai-value-controlled-aggregate-pipeline-dry-run/README.md)
- AI Value Measurement Cell Preflight Runner: [docs/contracts/ai-value-measurement-cell-preflight-runner/README.md](docs/contracts/ai-value-measurement-cell-preflight-runner/README.md)
- AI Value Measurement Cell Snapshot Projection: [docs/contracts/ai-value-measurement-cell-snapshot-projection/README.md](docs/contracts/ai-value-measurement-cell-snapshot-projection/README.md)
- AI Value Customer Data Model Promotion Gate: [docs/contracts/ai-value-customer-data-model-promotion-gate/README.md](docs/contracts/ai-value-customer-data-model-promotion-gate/README.md)
- AI Value Customer Data Model Persistence Promotion Decision: [docs/contracts/ai-value-customer-data-model-persistence-promotion-decision/README.md](docs/contracts/ai-value-customer-data-model-persistence-promotion-decision/README.md)
- AI Value Customer Data Model Persistence Implementation Decision: [docs/contracts/ai-value-customer-data-model-persistence-implementation-decision/README.md](docs/contracts/ai-value-customer-data-model-persistence-implementation-decision/README.md)
- AI Value Customer Data Model Route Projection: [docs/contracts/ai-value-customer-data-model-route-projection/README.md](docs/contracts/ai-value-customer-data-model-route-projection/README.md)
- AI Value Data Model Spine Readiness Lock: [docs/contracts/ai-value-data-model-spine-readiness-lock/README.md](docs/contracts/ai-value-data-model-spine-readiness-lock/README.md)
- AI Value Compact Source Wiring Hardening: [docs/contracts/ai-value-compact-source-wiring-hardening/README.md](docs/contracts/ai-value-compact-source-wiring-hardening/README.md)
- AI Value Connector Promotion Readiness Sequence: [docs/contracts/ai-value-connector-promotion-readiness-sequence/README.md](docs/contracts/ai-value-connector-promotion-readiness-sequence/README.md)
- AI Value Controlled Aggregate Connector Adapter: [docs/contracts/ai-value-controlled-aggregate-connector-adapter/README.md](docs/contracts/ai-value-controlled-aggregate-connector-adapter/README.md)
- AI Value Aggregate Connector Boundary Plan: [docs/contracts/ai-value-aggregate-connector-boundary-plan/README.md](docs/contracts/ai-value-aggregate-connector-boundary-plan/README.md)
- AI Value BigQuery Aggregate Export Review: [docs/contracts/ai-value-bigquery-aggregate-export-review/README.md](docs/contracts/ai-value-bigquery-aggregate-export-review/README.md)
- AI Value Controlled Aggregate Manifest Validation: [docs/contracts/ai-value-controlled-aggregate-manifest-validation/README.md](docs/contracts/ai-value-controlled-aggregate-manifest-validation/README.md)
- AI Value Research Promotion Readiness Packet: [docs/contracts/ai-value-research-promotion-readiness-packet/README.md](docs/contracts/ai-value-research-promotion-readiness-packet/README.md)
- AI Value Contribution Alignment Feature Stability Review: [docs/contracts/ai-value-contribution-alignment-feature-stability-review/README.md](docs/contracts/ai-value-contribution-alignment-feature-stability-review/README.md)
- AI Value Contribution Alignment Internal Numeric Weight Decision: [docs/contracts/ai-value-contribution-alignment-internal-numeric-weight-decision/README.md](docs/contracts/ai-value-contribution-alignment-internal-numeric-weight-decision/README.md)
- AI Value Contribution Alignment Versioned Weight Object: [docs/contracts/ai-value-contribution-alignment-versioned-weight-object/README.md](docs/contracts/ai-value-contribution-alignment-versioned-weight-object/README.md)
- AI Value Contribution Alignment Weighted Internal Model Frame: [docs/contracts/ai-value-contribution-alignment-weighted-internal-model-frame/README.md](docs/contracts/ai-value-contribution-alignment-weighted-internal-model-frame/README.md)
- AI Value Contribution Alignment Internal Bayesian Readiness Review: [docs/contracts/ai-value-contribution-alignment-internal-bayesian-readiness-review/README.md](docs/contracts/ai-value-contribution-alignment-internal-bayesian-readiness-review/README.md)
- AI Value Contribution Alignment Bayesian Model Specification: [docs/contracts/ai-value-contribution-alignment-bayesian-model-specification/README.md](docs/contracts/ai-value-contribution-alignment-bayesian-model-specification/README.md)
- AI Value Contribution Alignment Internal Bayesian Execution Gate: [docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-gate/README.md](docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-gate/README.md)
- AI Value Contribution Alignment Internal Bayesian Execution Runtime: [docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-runtime/README.md](docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-runtime/README.md)
- AI Value Contribution Alignment Posterior Output Review Gate: [docs/contracts/ai-value-contribution-alignment-posterior-output-review-gate/README.md](docs/contracts/ai-value-contribution-alignment-posterior-output-review-gate/README.md)
- AI Value Contribution Alignment Diagnostics Evidence Packet: [docs/contracts/ai-value-contribution-alignment-diagnostics-evidence-packet/README.md](docs/contracts/ai-value-contribution-alignment-diagnostics-evidence-packet/README.md)
- AI Value Contribution Alignment Governed Diagnostics Sufficiency Evidence Source: [docs/contracts/ai-value-contribution-alignment-governed-diagnostics-sufficiency-evidence-source/README.md](docs/contracts/ai-value-contribution-alignment-governed-diagnostics-sufficiency-evidence-source/README.md)
- AI Value Contribution Alignment Internal Diagnostics and Model Adequacy Review: [docs/contracts/ai-value-contribution-alignment-internal-diagnostics-model-adequacy-review/README.md](docs/contracts/ai-value-contribution-alignment-internal-diagnostics-model-adequacy-review/README.md)
- AI Value Contribution Alignment Bayesian Promotion Decision Gate: [docs/contracts/ai-value-contribution-alignment-bayesian-promotion-decision-gate/README.md](docs/contracts/ai-value-contribution-alignment-bayesian-promotion-decision-gate/README.md)
- AI Value Contribution Alignment Promotion Gate Passed Artifact Handoff: [docs/contracts/ai-value-contribution-alignment-promotion-gate-passed-artifact-handoff/README.md](docs/contracts/ai-value-contribution-alignment-promotion-gate-passed-artifact-handoff/README.md)
- AI Value Source Inventory Manifest: [docs/contracts/ai-value-source-inventory-manifest/README.md](docs/contracts/ai-value-source-inventory-manifest/README.md)
- AI Value Aggregate Extraction Manifest: [docs/contracts/ai-value-aggregate-extraction-manifest/README.md](docs/contracts/ai-value-aggregate-extraction-manifest/README.md)
- AI Value Pipeline Run Review Manifest: [docs/contracts/ai-value-pipeline-run-review-manifest/README.md](docs/contracts/ai-value-pipeline-run-review-manifest/README.md)
- AI Value Claim Boundary schema: [schemas/ai-value-intelligence/claim-boundary.schema.json](schemas/ai-value-intelligence/claim-boundary.schema.json)
- Customer Support AI Value claim boundary fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json](docs/contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json)
- AI Value Executive Packet schema: [schemas/ai-value-intelligence/executive-packet.schema.json](schemas/ai-value-intelligence/executive-packet.schema.json)
- Customer Support AI Value executive packet fixture: [docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json](docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json)
- Local AI Value Workspace UI: [frontend/src/pages/AIValueWorkspace.tsx](frontend/src/pages/AIValueWorkspace.tsx)
- Glean integration pack: [docs/integrations/glean/01-overview.md](docs/integrations/glean/01-overview.md)
- Glean readiness demo guide: [docs/integrations/glean/06-readiness-demo-guide.md](docs/integrations/glean/06-readiness-demo-guide.md)
- Glean executive readiness prototype: [docs/integrations/glean/prototypes/executive-readiness-demo.html](docs/integrations/glean/prototypes/executive-readiness-demo.html)
- Glean live-data decision gate: [docs/integrations/glean/07-live-data-access-decision-gate.md](docs/integrations/glean/07-live-data-access-decision-gate.md)
- Value-realization contract index: [docs/integrations/value-realization/INDEX.md](docs/integrations/value-realization/INDEX.md)
- V3 production ingest walkthrough: [docs/integrations/value-realization/V3_INGEST.md](docs/integrations/value-realization/V3_INGEST.md)
- V4 value confidence integration: [docs/integrations/value-realization/V4_VALUE_CONFIDENCE.md](docs/integrations/value-realization/V4_VALUE_CONFIDENCE.md)
- Internal Scale Readiness Readout contract: [docs/contracts/value-confidence/internal-scale-readiness-readout.md](docs/contracts/value-confidence/internal-scale-readiness-readout.md)
- AI Work Evidence concept: [docs/concepts/AI_WORK_EVIDENCE.md](docs/concepts/AI_WORK_EVIDENCE.md)
- AI Value Measurement Model and phase data support map: [docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md](docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md)
- AI Value Platform architecture: [docs/concepts/AI_VALUE_PLATFORM_ARCHITECTURE.md](docs/concepts/AI_VALUE_PLATFORM_ARCHITECTURE.md)
- AI Value Intelligence MVP concept: [docs/concepts/AI_VALUE_INTELLIGENCE_MVP.md](docs/concepts/AI_VALUE_INTELLIGENCE_MVP.md)
- AI Work Evidence pilot package: [docs/integrations/value-realization/AI_WORK_EVIDENCE_PILOT_PACKAGE.md](docs/integrations/value-realization/AI_WORK_EVIDENCE_PILOT_PACKAGE.md)
- Velocity concept and V2 reference: [docs/concepts/VELOCITY.md](docs/concepts/VELOCITY.md)
- Depth concept and V4 reference: [docs/concepts/DEPTH.md](docs/concepts/DEPTH.md)
- Delegation Depth concept and V4 Depth subdimension: [docs/concepts/DELEGATION_DEPTH.md](docs/concepts/DELEGATION_DEPTH.md)
- Work Mode Taxonomy concept: [docs/concepts/WORK_MODES.md](docs/concepts/WORK_MODES.md)
- V4 Value Confidence Layer concept: [docs/concepts/V4_VALUE_CONFIDENCE_LAYER.md](docs/concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- AI Scale Readiness Portfolio concept: [docs/concepts/AI_SCALE_READINESS_PORTFOLIO.md](docs/concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- Organizational Segmentation concept: [docs/concepts/ORG_SEGMENTATION.md](docs/concepts/ORG_SEGMENTATION.md)
- Economic Impact Bridge concept: [docs/concepts/ECONOMIC_IMPACT_BRIDGE.md](docs/concepts/ECONOMIC_IMPACT_BRIDGE.md)
- AI Manager Outcomes Recommendations concept: [docs/concepts/AI_MANAGER_OUTCOMES_RECOMMENDATIONS.md](docs/concepts/AI_MANAGER_OUTCOMES_RECOMMENDATIONS.md)
- AI Manager Outcomes Recommendations contract: [docs/contracts/value-confidence/ai-manager-outcomes-recommendations.md](docs/contracts/value-confidence/ai-manager-outcomes-recommendations.md)
- AI Manager Outcomes Recommendations pilot readout: [docs/research/AI_MANAGER_OUTCOMES_RECOMMENDATIONS_PILOT_READOUT.md](docs/research/AI_MANAGER_OUTCOMES_RECOMMENDATIONS_PILOT_READOUT.md)
- Signal promotion criteria: [docs/research/SIGNAL_PROMOTION_CRITERIA.md](docs/research/SIGNAL_PROMOTION_CRITERIA.md)
- V4 signal discovery probes: [docs/research/V4_SIGNAL_DISCOVERY_PROBES.md](docs/research/V4_SIGNAL_DISCOVERY_PROBES.md)
- V4 signal discovery readout: [docs/research/V4_SIGNAL_DISCOVERY_READOUT.md](docs/research/V4_SIGNAL_DISCOVERY_READOUT.md)
- V4 signal validation gate: [docs/research/V4_SIGNAL_VALIDATION_GATE.md](docs/research/V4_SIGNAL_VALIDATION_GATE.md)
- V4 signal validation runbook: [docs/research/V4_SIGNAL_VALIDATION_RUNBOOK.md](docs/research/V4_SIGNAL_VALIDATION_RUNBOOK.md)
- V4 signal validation readout template: [docs/research/V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md](docs/research/V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md)
- Trust Episode Boundary research: [docs/research/TRUST_EPISODE_BOUNDARY.md](docs/research/TRUST_EPISODE_BOUNDARY.md)
- Trust Episode Boundary validation readout: [docs/research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](docs/research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)
- Trust Episode Boundary input contract proposal: [docs/contracts/value-confidence/trust-episode-boundary-input.md](docs/contracts/value-confidence/trust-episode-boundary-input.md)
- Trust Episode Boundary pilot runbook: [docs/dogfood/TRUST_EPISODE_PILOT_RUNBOOK.md](docs/dogfood/TRUST_EPISODE_PILOT_RUNBOOK.md)
- Trust Calibration external pilot brief: [output/doc/FluencyTracr_Trust_Calibration_Pilot_Brief.docx](output/doc/FluencyTracr_Trust_Calibration_Pilot_Brief.docx)
- V4 Depth readout runbook: [docs/research/V4_DEPTH_READOUT_RUNBOOK.md](docs/research/V4_DEPTH_READOUT_RUNBOOK.md)
- V4 Depth stability decision: [docs/research/V4_DEPTH_STABILITY_DECISION.md](docs/research/V4_DEPTH_STABILITY_DECISION.md)
- V4 Depth Repertoire stability readout: [docs/research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md](docs/research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)
- V4 Depth Repertoire value-confidence review: [docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md](docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md)
- V4 Depth Repertoire calibration plan: [docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md](docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md)
- V4 Depth Repertoire calibration decision: [docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md](docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)
- V4 Scale Readiness caveat propagation decision: [docs/research/V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
- V4 Trust Calibration caveat propagation decision: [docs/research/V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
- V4 Glean dogfood scale readiness readout: [docs/research/V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md](docs/research/V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md)
- V4 full dogfood rehearsal readout: [docs/research/V4_FULL_DOGFOOD_REHEARSAL_READOUT.md](docs/research/V4_FULL_DOGFOOD_REHEARSAL_READOUT.md)
- V4 behavior cohort classification readout: [docs/research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md](docs/research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md)
- V4 data analysis closeout: [docs/research/V4_DATA_ANALYSIS_CLOSEOUT.md](docs/research/V4_DATA_ANALYSIS_CLOSEOUT.md)
- V4 next sprint plan: [docs/research/V4_NEXT_SPRINT_PLAN.md](docs/research/V4_NEXT_SPRINT_PLAN.md)
- V4 measurement build plan: [docs/research/V4_MEASUREMENT_BUILD_PLAN.md](docs/research/V4_MEASUREMENT_BUILD_PLAN.md)
- V4 segment overlay test plan: [docs/research/V4_SEGMENT_OVERLAY_TEST_PLAN.md](docs/research/V4_SEGMENT_OVERLAY_TEST_PLAN.md)
- V4 intervention tracking research design: [docs/research/V4_INTERVENTION_TRACKING_RESEARCH_DESIGN.md](docs/research/V4_INTERVENTION_TRACKING_RESEARCH_DESIGN.md)
- V4 outcome join test plan: [docs/research/V4_OUTCOME_JOIN_TEST_PLAN.md](docs/research/V4_OUTCOME_JOIN_TEST_PLAN.md)
- V4 outcome source inventory readout: [docs/research/V4_OUTCOME_SOURCE_INVENTORY_READOUT.md](docs/research/V4_OUTCOME_SOURCE_INVENTORY_READOUT.md)
- V4 support outcome join test readout: [docs/research/V4_SUPPORT_OUTCOME_JOIN_TEST_READOUT.md](docs/research/V4_SUPPORT_OUTCOME_JOIN_TEST_READOUT.md)
- V4 support join-key test readout: [docs/research/V4_SUPPORT_JOIN_KEY_TEST_READOUT.md](docs/research/V4_SUPPORT_JOIN_KEY_TEST_READOUT.md)
- V4 Time-Saved Defensibility test plan: [docs/research/V4_TIME_SAVED_DEFENSIBILITY_TEST_PLAN.md](docs/research/V4_TIME_SAVED_DEFENSIBILITY_TEST_PLAN.md)
- V4 readout zone model: [docs/research/V4_READOUT_ZONE_MODEL.md](docs/research/V4_READOUT_ZONE_MODEL.md)
- V4 behavior feature backlog: [docs/research/V4_BEHAVIOR_FEATURE_BACKLOG.md](docs/research/V4_BEHAVIOR_FEATURE_BACKLOG.md)
- V4 value hypothesis map: [docs/research/V4_VALUE_HYPOTHESIS_MAP.md](docs/research/V4_VALUE_HYPOTHESIS_MAP.md)
- V4 value realization strategy layer: [docs/research/V4_VALUE_REALIZATION_STRATEGY_LAYER.md](docs/research/V4_VALUE_REALIZATION_STRATEGY_LAYER.md)
- V4 readout zone data test: [docs/research/V4_READOUT_ZONE_DATA_TEST.md](docs/research/V4_READOUT_ZONE_DATA_TEST.md)
- V4 Velocity x Depth zone test: [docs/research/V4_VELOCITY_DEPTH_ZONE_TEST.md](docs/research/V4_VELOCITY_DEPTH_ZONE_TEST.md)
- V4 Glean dogfood decision: [docs/research/V4_GLEAN_DOGFOOD_DECISION.md](docs/research/V4_GLEAN_DOGFOOD_DECISION.md)
- V4 closeout decision: [docs/research/V4_CLOSEOUT_DECISION.md](docs/research/V4_CLOSEOUT_DECISION.md)
- V4 canonical contract decision: [docs/research/V4_CANONICAL_CONTRACT_DECISION.md](docs/research/V4_CANONICAL_CONTRACT_DECISION.md)
- V4 internal readout runbook: [docs/research/V4_INTERNAL_READOUT_RUNBOOK.md](docs/research/V4_INTERNAL_READOUT_RUNBOOK.md)
- V4 internal readout rehearsal: [docs/research/V4_INTERNAL_READOUT_REHEARSAL.md](docs/research/V4_INTERNAL_READOUT_REHEARSAL.md)
- V4 Trust Attribution method: [docs/research/V4_TRUST_ATTRIBUTION_METHOD.md](docs/research/V4_TRUST_ATTRIBUTION_METHOD.md)
- V4 Trust Attribution test readout: [docs/research/V4_TRUST_ATTRIBUTION_TEST_READOUT.md](docs/research/V4_TRUST_ATTRIBUTION_TEST_READOUT.md)
- V4 Trust and Cohort classification plan: [docs/research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md](docs/research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md)
- V4 value-confidence caveat propagation runbook: [docs/research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md](docs/research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
- V4 TSDR caveat propagation decision: [docs/research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md)
- V4 AI Value Leakage Map caveat propagation decision: [docs/research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md](docs/research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md)
- V4 validation plan: [docs/research/V4_VALIDATION_PLAN.md](docs/research/V4_VALIDATION_PLAN.md)
- Surface taxonomy concept: [docs/concepts/SURFACES.md](docs/concepts/SURFACES.md)
- Agent types concept: [docs/concepts/AGENT_TYPES.md](docs/concepts/AGENT_TYPES.md)
- Production ingest concept: [docs/concepts/INGEST.md](docs/concepts/INGEST.md)
- Calibration governance concept: [docs/concepts/CALIBRATION.md](docs/concepts/CALIBRATION.md)
- Depth readout contract: [docs/contracts/depth/README.md](docs/contracts/depth/README.md)
- Depth Repertoire contract: [docs/contracts/depth/depth-repertoire.md](docs/contracts/depth/depth-repertoire.md)
- Value Confidence contract: [docs/contracts/value-confidence/README.md](docs/contracts/value-confidence/README.md)
- Time-Saved Defensibility Range: [docs/contracts/value-confidence/time-saved-defensibility-range.md](docs/contracts/value-confidence/time-saved-defensibility-range.md)
- Trust Calibration Index: [docs/contracts/value-confidence/trust-calibration-index.md](docs/contracts/value-confidence/trust-calibration-index.md)
- AI Value Leakage Map: [docs/contracts/value-confidence/value-leakage-map.md](docs/contracts/value-confidence/value-leakage-map.md)
- AI Scale Readiness Portfolio: [docs/contracts/value-confidence/scale-readiness-portfolio.md](docs/contracts/value-confidence/scale-readiness-portfolio.md)
- AI Manager Outcomes Recommendations: [docs/contracts/value-confidence/ai-manager-outcomes-recommendations.md](docs/contracts/value-confidence/ai-manager-outcomes-recommendations.md)
- AI Value Finance Investigation Readiness: [docs/contracts/value-confidence/ai-value-finance-investigation-readiness.md](docs/contracts/value-confidence/ai-value-finance-investigation-readiness.md)
- Velocity Index contract: [docs/contracts/velocity-index.md](docs/contracts/velocity-index.md)
- Behavioral Signals spec: [docs/BEHAVIORAL_SIGNALS_SPEC.md](docs/BEHAVIORAL_SIGNALS_SPEC.md)
- MCP adapter server: [docs/mcp/fluencytracr-mcp-server.md](docs/mcp/fluencytracr-mcp-server.md)
- API reference: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)
- System architecture overview: [docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md](docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md)
