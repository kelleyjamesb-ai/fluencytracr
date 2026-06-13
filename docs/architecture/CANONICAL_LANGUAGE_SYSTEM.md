# Canonical Language System

Status: active language architecture

Phase: `phase-ai-value-language-alignment`

This document is the source of truth for FluencyTracr AI Value language. It aligns the product with enterprise value-engineering language while preserving existing FluencyTracr contracts, schemas, engines, and governance rules.

Language changes should happen first through documentation, aliases, display labels, and presentation layers. Internal object names, schemas, validators, and governance behavior remain stable unless a later migration explicitly changes them.

## Executive Vocabulary

| Canonical term | Internal object name | Display language | Definition | Allowed usage | Deprecated alternatives |
| --- | --- | --- | --- | --- | --- |
| Value Hypothesis | `blueprint.value_hypothesis` | Value hypothesis | The client-owned belief about which workflow change may create value. | Discovery, blueprint, readout setup, executive narrative. | ROI thesis, benefit statement, productivity promise |
| Measurement Plan | `metrics_library`, `outcome_evidence_export` | Measurement plan | The outcome metrics, owners, source systems, baseline window, and comparison window used to test the hypothesis. | Metrics step, evidence request, executive readout. | Metric candidates, value signals to validate |
| Evidence Collection | `evidence_readiness`, `outcome_evidence_export` | Evidence collection | The aggregate evidence package and review state used to decide what can be trusted. | Evidence readiness, evidence review, readout. | Data ask, export status, evidence path |
| Value Realization | `claim_boundary`, `value_evidence_case` | Value realization | The governed language the platform can safely support from accepted evidence. | Executive packet, value evidence case, decision review. | Claim boundary, proof layer, safe claims |
| Financial Translation | `ebita_impact_bridge` | Financial translation | A governed translation from measured workflow evidence to financial levers and assumptions. | Executive readout, finance review, caveated scenario language. | EBITA bridge as a headline, ROI bridge |
| Value Accounting | `roi_scenario.financial_claim_gate` | Value accounting | Finance-attested accounting of value, costs, assumptions, and caveats. | Finance validation, customer-facing approval checks. | ROI calculation as default, dollarized proof |
| Renewal Evidence | `executive_packet` | Renewal evidence | A sponsor-ready value record that supports renewal, expansion, or intervention conversations. | Executive readout, QBR-style summary, client decision packet. | Executive packet only, business case deck |

## Measurement Vocabulary

| Canonical term | Internal object name | Display language | Definition | Allowed usage | Deprecated alternatives |
| --- | --- | --- | --- | --- | --- |
| AI Capability Baseline | `fluency_baseline` | AI Capability Baseline | Aggregate AI Fluency baseline from the organizational instrument. | Start of value journey, capability context, retest comparison. | Deprecated: AI fluency score, readiness score |
| Operating Adoption Map | `vbd_operating_map` | Operating Adoption Map | The aggregate operating view that combines Velocity, Breadth, and Depth by function or workflow. | Function map, workflow prioritization, intervention planning. | Maturity map, adoption dashboard |
| Velocity | `velocity` | Velocity | Speed to adoption for the function or workflow. | VBD map, longitudinal adoption movement. | Usage frequency as value |
| Breadth | `breadth` | Breadth | Spread across functions, roles, workflows, or approved surfaces. | Coverage view, function comparison, adoption planning. | Tool sprawl, activity breadth |
| Depth | `depth` | Depth | How embedded AI is in repeatable workflow behavior. | Workflow integration, evidence context, intervention selection. | Number of tools used, maturity depth |
| Function Outcome Metric | `metric_definition` | Outcome metric | The business metric selected for the function and workflow. | Metrics mapping and evidence collection. | Signal, metric candidate |

## Evidence Vocabulary

| Internal state | Executive label | Definition | Evidence requirement | Allowed claim types |
| --- | --- | --- | --- | --- |
| `DIRECTIONAL` | Estimate | Early indication that may guide investigation. | Aggregate signal or planning assumption exists, but evidence is incomplete. | Internal planning, hypothesis language. |
| `CAVEATED` | Emerging Evidence | Evidence exists, but source coverage, assumptions, or review state still constrain claims. | Aggregate evidence plus stated caveats. | Caveated executive discussion, no ROI proof. |
| `SUPPORTED` | Measured Value | Accepted aggregate outcome evidence supports measured movement. | Accepted metric, approved grain, baseline/comparison context. | Measured value movement with caveats. |
| `FINANCE_VALIDATED` | Validated Value | Finance-owned assumptions and evidence support validated language for a scoped window. | Finance owner attestation, investment costs, confounds review, and approved assumptions. | Validated value language within scope. |

| Canonical term | Internal object name | Display language | Definition | Allowed usage | Deprecated alternatives |
| --- | --- | --- | --- | --- | --- |
| Evidence Quality | `evidence_quality` | Evidence Quality | The quality level attached to adoption, workflow, outcome, and financial evidence. | Readout tables, packet summaries, finance review. | Confidence score, proof score |
| Measurement Readiness | `evidence_readiness` | Measurement Readiness | Whether the selected metric and export path are ready for a governed value review. | Evidence page, readout readiness, next actions. | Evidence readiness as a generic status |
| Accepted Evidence | `outcome_evidence_export.review_state = ACCEPTED` | Accepted evidence | Aggregate customer-owned evidence accepted for the stated metric, source, grain, and windows. | Claim progression and executive readout. | Valid data, proof |

## Value Vocabulary

The platform-wide value lifecycle is:

Potential Value -> Emerging Value -> Measured Value -> Validated Value -> Realized Value

| Value state | Definition | Required evidence | Allowed financial claims | Allowed executive language |
| --- | --- | --- | --- | --- |
| Potential Value | A plausible value opportunity identified from AI Fluency, VBD, workflow, or client objective context. | Hypothesis, selected workflow, candidate function outcome metric. | None. | "This is a value hypothesis to test." |
| Emerging Value | Directional movement appears possible but is still caveated. | Aggregate adoption/workflow evidence and an evidence plan. | No realized ROI, no causality, no customer-facing economic output. | "Early evidence suggests this may affect the selected outcome." |
| Measured Value | Accepted aggregate outcome evidence shows movement on a selected metric. | Accepted metric evidence with baseline and comparison context. | Caveated value movement; dollar language only if a gate allows it. | "The selected outcome moved during the reviewed window." |
| Validated Value | Finance or governance attestation supports stronger value language. | Finance owner attestation, assumptions, cost inputs, confounds review. | Finance-validated value accounting inside the approved scope. | "Finance-reviewed assumptions support validated value language for this scope." |
| Realized Value | Customer-approved value language is ready for external or renewal use. | Customer-facing approval, legal/governance approval, and attached caveats. | Customer-facing economic output only if explicitly approved. | "This value evidence is approved for the stated audience, window, and caveats." |

Mapping:

| Existing object | Lifecycle role |
| --- | --- |
| VBD / Operating Adoption Map | Identifies Potential Value and where intervention may create movement. |
| Evidence Readiness | Determines whether Emerging Value can become Measured Value. |
| Financial Claim Gate | Determines whether Measured Value can become Validated Value or Realized Value. |
| EBITA Impact Bridge | Provides Financial Translation when evidence quality and gates permit it. |

## Financial Vocabulary

| Canonical term | Internal object name | Display language | Definition | Allowed usage | Deprecated alternatives |
| --- | --- | --- | --- | --- | --- |
| Value Scenario | `roi_scenario` | Value Scenario | A governed scenario for modeling how evidence may translate into value. | Internal modeling, executive caveated review, finance validation. | ROI scenario as the main label |
| Financial Translation | `ebita_impact_bridge` | Financial Translation | A translation from workflow evidence into financial levers and assumptions. | Finance discussion and executive readout. | EBITA impact as a usage metric |
| Value Accounting | `realized_roi_calculation` | Value Accounting | Finance-owned calculation and attestation of value, costs, and assumptions. | Only when financial gates allow it. | Realized ROI calculation as default |
| Customer-Facing Value Evidence | `customer_facing_economic_output` | Customer-facing value evidence | Economic language approved for customer-facing use in a defined scope. | Renewal evidence and executive sponsor discussions. | Customer-facing ROI output |

ROI is one possible outcome of value realization. It is not the product spine. Value realization is broader than ROI and can include capacity, quality, revenue, risk, customer experience, cycle time, adoption, and operating change.

EBITA is a financial translation layer, not a usage metric. Usage evidence alone must not be presented as EBITA, ROI, causality, or realized value.

## Governance Vocabulary

| Canonical term | Internal object name | Display language | Definition | Allowed usage | Deprecated alternatives |
| --- | --- | --- | --- | --- | --- |
| Financial Claim Review | `financial_claim_gate` | Financial Claim Review | Gate that determines which financial outputs are allowed. | Value Scenario and readout governance. | Financial claim gate in UI headings |
| Governance Boundary | `blocked_claims` | Governance Boundary | Claims that are not allowed for the current evidence state. | Readouts, validators, packet caveats. | Blocked claims as the main story |
| Aggregate-Only Evidence | suppression and cohort gates | Aggregate-only evidence | Evidence that has passed cohort and privacy constraints before use. | All customer-facing and executive value language. | Team/person productivity data |
| Caveat | `required_caveats` | Required caveat | Required language that must travel with the value readout. | Executive readouts, decision packets, finance review. | Disclaimer as optional copy |

## Intervention Vocabulary

| Canonical term | Internal object name | Display language | Definition | Allowed usage | Deprecated alternatives |
| --- | --- | --- | --- | --- | --- |
| Next Actions | `next_actions`, `value_improvement_loop` | Next Actions | The client-owned actions needed to strengthen capability, evidence, or value. | Decision and retest loop. | Recommendation engine |
| Intervention Plan | `value_improvement_loop` | Intervention Plan | A scoped action plan to improve capability, workflow adoption, or evidence quality. | Decision page and follow-up. | Remediation plan |
| Retest | `fluency_baseline` comparison | Retest | A later measurement window used to see if capability or work-pattern signals changed. | AI Fluency and VBD follow-up. | Re-score |

## Deprecated Vocabulary

| Deprecated term | Replacement | Reason |
| --- | --- | --- |
| ROI-first language | Value realization, Value Scenario, Value Accounting | ROI is too narrow and can imply proof before gates allow it. |
| Time-saved language as value | Capacity Created, Capacity Reallocated, Productivity Recapture | Time saved is not realized value unless capacity is recaptured and redeployed. |
| Activity-only language | Operating Adoption Map, Measurement Evidence | Activity does not equal business value. |
| Maturity language | AI Capability Baseline, Operating Adoption Map | Maturity can imply ranking or static labels. |
| Claim Boundary as a user-facing heading | Value Realization, Governance Boundary | The internal object name reads like a database term. |
| EBITA Impact Bridge as a user-facing heading | Financial Translation | EBITA is a finance translation layer, not the front-door product concept. |

## Executive Readout Vocabulary

| Executive-facing label | Existing FluencyTracr object |
| --- | --- |
| Value Hypothesis | Blueprint hypothesis and workflow context |
| Measurement Readiness | Evidence Readiness decision |
| Evidence Quality | Evidence quality and outcome export review |
| Value Realization | Claim Boundary and Value Evidence Case |
| Financial Translation | EBITA Impact Bridge |
| Value Accounting | ROI Scenario financial claim gate |
| Next Actions | Evidence actions and Intervention Engine |

## Productivity Recapture

Use Productivity Recapture Rate (rho) as a conceptual language layer when discussing time saved, capacity, and realized value.

Canonical terms:

| Canonical term | Definition | Allowed usage | Avoid |
| --- | --- | --- | --- |
| Time Saved | Time that may be released by workflow change. | Directional capacity hypothesis. | Presenting saved time as realized value. |
| Capacity Created | Work capacity made available by faster or higher-quality workflow execution. | Financial Translation and intervention planning. | Treating capacity as cash impact by default. |
| Capacity Reallocated | Capacity intentionally moved to higher-value work. | Value realization narrative after client confirmation. | Assuming reallocation without owner attestation. |
| Productivity Recapture | The share of created capacity that is actually redeployed into valuable work. | Value Accounting once the client validates assumptions. | Equating adoption or usage with productivity. |
| Realized Value | Validated value that has evidence, assumptions, owner attestation, and approval. | Renewal Evidence only when gates allow it. | Unsupported ROI proof or causal language. |

Examples:

- Allowed: "The workflow may create capacity if the client can recapture and redeploy the time released."
- Allowed: "Finance-reviewed assumptions are needed before this becomes Value Accounting."
- Not allowed: "AI saved 1,000 hours, therefore the customer realized that value."
- Not allowed: "Usage proves productivity improvement."
