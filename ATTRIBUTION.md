# Attribution

FluencyTracr's value-realization repositioning is informed by the work of
colleagues at Glean. The implementation, governance posture, and final
product decisions are the author's responsibility, but the underlying
ideas have authors. They are credited here.

This file is updated whenever a roadmap prompt incorporates external
intellectual work. Inclusion is not endorsement - these authors have
not necessarily reviewed or approved FluencyTracr.

## Concept attributions

### AIVM grammar (value_type, evidence_grade)
- Source: Paul Li, "AI Value Measurement Framework"
- Used in: Prompt 2 (AIVM tagging)

### Quality Multiplier on time-saved
- Source: Paul Li and Karthik Rajkumar, "Time-Saves MVP"
- Motivating finding: ~64% of chat runs have no quality signal today
- Used in: Prompt 3 (Quality Multiplier API)

### Counterfactual / Causal Delta requirement
- Source: Paul Li, ROI Framework - "what would have happened without Glean"
- Used in: Prompt 4 (Causal Delta primitive)

### Reliability Factor
- Source: Onder Polat, "Value Measurement Strategy"
- Reinforced by: Varun Tilva, Value Realization Pod notes on individual-attribution sensitivity
- Used in: Prompt 5 (Reliability Factor output)

### JBTD / persona slicing
- Source: Onder Polat, Jobs-to-be-Done x persona direction
- Used in: Prompt 6 (JBTD/persona join key)

### Outcome evidence (systems of record)
- Source: Chris Lee, "AI Outcomes Manager" proposal and AIOM framework
- Customer pull: Datadog (Julien Vige), Nielsen, Informatica, GSK
- Used in: Prompt 7 (Outcome ingestion contract)

### Diagnostic value of stated x observed evidence
- Source: Josh Rutberg, AI Fluency Instrument review notes
- Used in: cross-system pairing with the AI Fluency Instrument

### Velocity as behavioral counterpart to stated evidence
- Source: James Kelley, velocity-as-AI-fluency bridge insight
- Empirical grounding: scio-prod 60-day velocity diagnostic across 1,553 internal Glean users and 13 workflow surfaces
- Used in: V2 Velocity concept document, V2 canonical velocity events, and Velocity Index implementation

### Maturity as post-saturation depth
- Source: James Kelley, post-saturation maturity framing for AI value realization
- Empirical grounding: scio-prod dogfood diagnostics showing high adoption can still have emerging verification depth, workflow reuse, and agent relationship maturity
- Used in: Maturity concept document

### Surface taxonomy across AI touchpoints
- Source: James Kelley, surface-taxonomy insight that AI fluency must be measured across every AI touchpoint, not within an arbitrarily scoped subset
- Empirical grounding: scio-prod 60-day surface diagnostic showing V1 captured roughly 3.3M of an addressable ~28M first-class AI-use events
- Used in: future V2.1 surface taxonomy concept document

### Agent sub-surface taxonomy
- Source: James Kelley, auto-vs-workflow agent split insight
- Empirical grounding: scio-prod 60-day agent diagnostic showing autonomous agents represented 42% of AGENT volume
- Used in: V2.3 AGENT_TYPES concept document and V2.3 AGENT sub-surface implementation

### Work mode taxonomy
- Source: James Kelley, first-principles framing that value-confidence calibration should classify AI work by behavioral intent and evidence role, not by event names alone
- Empirical grounding: scio-prod 60-day calibration work showing Velocity and Depth are taxonomy-aware while Quality Multiplier and Reliability Factor still need aligned surface semantics
- Used in: V4 Work Mode Taxonomy concept document

### Customer-side transformer privacy boundary
- Source: James Kelley, architectural choice that production ingest should keep raw GCE inside the customer environment
- Governance grounding: structural privacy boundary where only cohort percentile distributions cross into FluencyTracr
- Used in: V3 ingest concept document

### Calibration as versioned baseline governance
- Source: James Kelley, calibration-as-versioned-baseline governance pattern
- Governance grounding: calibration baselines are immutable reference artifacts, not tunable thresholds or admin overrides
- Used in: V3 calibration concept document

### Canonical aggregate inference authority
- Source: James Kelley, architectural decision to separate portable aggregate transformation from one bit-for-bit authoritative inference service
- Governance grounding: local and client-native numerical results remain nonauthoritative; governed Bayesian evidence requires one fixed, trust-rooted runtime without weakening the aggregate-only privacy boundary
- Used in: Canonical Aggregate Inference Service concept document

### GCP canonical runtime qualification
- Sources: Google Cloud documentation for C3 CPU platforms; Confidential VM supported configurations and attestation; Confidential Space raw token claims, token-validation endpoints, CEL assertions, metadata, launch policies, deployment, and workload controls; Compute Instance REST/discovery schemas; sole-tenancy; and host-maintenance behavior
- Retrieval evidence: the provider-vocabulary contract binds the public source snapshot interval `2026-07-24T03:07:50Z..2026-07-24T03:08:12Z`, effective URLs, byte counts, and SHA-256 values in `docs/contracts/canonical-inference-gcp-provider-vocabulary/source-evidence.json`; full source bytes remain external and untracked
- Governance grounding: a C3 Intel TDX profile is only a candidate until exact cross-instance conformance and trust-rooted attestation pass; divergence requires rejection and escalation rather than an alternate oracle
- Used in: GCP Canonical Runtime Candidate Selection, GCP Provider Claim and Identity Vocabulary, and GCP Canonical Runtime Object and Hash contracts

### GCP security-authority qualification
- Sources: Google Cloud documentation for Confidential Space WIF/resource access and token claims; workload-identity pool/provider lifecycle; federated-service support; Cloud HSM, key resources, algorithms, attestations, asymmetric signing, rotation, permissions, and separation of duties; IAM deny and Policy Troubleshooter; Cloud KMS/Cloud Audit Logs and log-bucket locking; Binary Authorization attestations; and the Sigstore Simple Signing specification
- Retrieval evidence: `docs/contracts/canonical-inference-gcp-security-authority/provider-source-evidence.json` binds 23 sanitized public snapshots and 42 claim windows to `external-recovery://fluencytracr/gcp-security-authority-source-snapshot-20260724T232044Z.zip` with SHA-256 `6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3`; public example identifiers remain restricted provenance only
- Governance grounding: direct digest-based WIF, distinct non-exportable HSM keys, transitive controller closure, same-context denial proof, held rollover, and an immutable audit interface are contract requirements only; all live policy/evidence admission lists remain empty and no GCP or signing action is authorized
- Used in: GCP HSM, WIF, IAM, and Role-Separation Security Authority contract

### GCP attestation and receipt verification
- Sources: Google Cloud documentation for Confidential Space token claims, custom-audience/nonces, OIDC discovery/JWKS validation, TLS exported-key-material binding, Confidential VM MRTD/RTMR attestation, Cloud KMS algorithms/signing/public-key/data-integrity interfaces, and Cloud KMS/Cloud Audit logging; immutable source at reviewed commits from `google/go-tpm-tools`, `GoogleCloudPlatform/confidential-space`, and `google/go-tdx-guest`
- Retrieval evidence: `docs/contracts/canonical-inference-gcp-attestation-receipt/provider-source-evidence.json` binds 29 exact snapshots and 42 claim windows to `external-recovery://fluencytracr/gcp-attestation-receipt-source-snapshot-20260726T072745Z.zip` with SHA-256 `6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a`; public examples and all replay/model-plan bytes remain restricted provenance only
- Governance grounding: source-code presence does not prove runtime capability; nil-extra-data applicability, quote continuity, strict collateral/CRL/TCB policy, bounded audit claims, empty approvals, no public receipt projection, and `authority_effect=NONE` preserve the held runtime boundary
- Used in: GCP Canonical Attestation and Receipt-Verification contract (Section 7.4)

### GCP transport and persistence constraints (Section 7.5A)
- Sources: Google Cloud documentation for VPC Service Controls/private Google access/restricted VIPs; Cloud DNS, Compute, Access Context Manager, Resource Manager, and Artifact Registry controls/audit methods; Confidential Space image, metadata, disk/tmpfs/swap, ingress, and logging behavior; Cloud Storage consistency, listing, generations/preconditions/checksums, retention lock, access controls, and audit logging; Spanner external consistency, transactions, commit timestamps, IAM, and audit logging; Cloud Logging audit types, Data Access configuration, routing/exclusions, log buckets/locking, platform sink errors, and AuditLog schema; IAM, WIF, STS, and service-account credential audit methods; plus the inherited Section 7.3 Cloud KMS audit source.
- Retrieval evidence: `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/provider-source-evidence.json` binds 53 sanitized public snapshots to `external-recovery://fluencytracr/gcp-transport-persistence-source-snapshot-20260727T022634Z.zip` (1,360,001 bytes; SHA-256 `cb7c440f18c7afe7e5f05ff455ffca1dd98cd3a284c6b741c7b3ab88b7a88750`) and separately binds the inherited Section 7.3 source bundle; public example identifiers remain external restricted provenance only.
- Governance grounding: Section 7.5A is a machine-distinct constraints/debt contract only. It cannot satisfy full Section 7.5, become a Section 7.6 dependency, enter parent approvals, define verified records or writers, receive `READINESS_GO`, or create runtime authority. Twenty prerequisites remain open and force the recorded HOLD.
- Used in: GCP Transport and Persistence Constraints and Open Obligations contract (Section 7.5A)

### AI Scale Readiness Portfolio
- Source: James Kelley, scale-readiness portfolio framing for V4 value realization
- Governance grounding: aggregate readiness zones should guide where to scale, coach, redesign, calibrate trust, expand adoption, or hold without becoming a scorecard, ranking, ROI claim, or productivity measure
- Used in: V4 AI Scale Readiness Portfolio concept and dogfood decision plan

### Organizational Segmentation as intervention context
- Source: James Kelley, organizational segmentation framing for internal V4 dogfood
- Governance grounding: function, role, level, tenure, and behavior-derived segments are intervention contexts only; HR and directory joins must remain inside the customer or Glean boundary and emit aggregate distributions only
- Used in: V4 Organizational Segmentation concept and dogfood decision plan

### Economic Impact Bridge
- Source: James Kelley, economic-impact bridge framing for V4 value realization
- Governance grounding: aggregate readiness patterns may support customer-owned value investigations, but they do not prove ROI, causality, productivity lift, prediction, or employee performance
- Used in: V4 Economic Impact Bridge concept and dogfood decision plan

### AI Value Intelligence MVP
- Source: James Kelley, whole-system AI value intelligence framing
- Governance grounding: AI activity, workflow evidence, outcome signals, and systems-of-record context should produce governed value evidence and claim confidence, not automatic ROI proof or productivity measurement
- Used in: AI Value Intelligence MVP concept and first support-workflow pilot plan

## Framing influences (not directly implemented)

### Trace Learning narrative
- Source: Glean engineering blog "Trace learning for self-improving agents"
- External observability brainstorm: Piyush Shandilya

### Skills self-improvement and survival metrics
- Source: Skills Canonical Document (Miribel Wu, Sneha Chaudhari)
- Learning Loop one-pager: Lumin Zhang
- Status: Considered as a secondary play; not the primary positioning.

## Maintenance rule

When a future PR implements an idea attributable to a named source, the
PR description must reference the relevant ATTRIBUTION.md entry, and any
new entries must be added in the same PR. CODEOWNERS protects this file.
