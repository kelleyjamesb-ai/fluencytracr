# Language Alignment Matrix

Status: active mapping

This matrix preserves internal FluencyTracr contracts while standardizing executive-facing language. "Alias" means keep the current object or enum, but use the canonical term in readouts, UI labels, and documentation where the audience is a client, sponsor, or value owner.

| Current FluencyTracr Term | Canonical Term | Keep / Rename / Alias | Reason |
| --- | --- | --- | --- |
| AI Fluency Baseline | AI Capability Baseline | Alias | Preserve the AI Fluency product concept while making the executive role clear: it is the capability baseline. |
| Velocity | Velocity | Keep | Canonical VBD dimension for speed to adoption. |
| Breadth | Breadth | Keep | Canonical VBD dimension for spread across functions, roles, workflows, or surfaces. |
| Depth | Depth | Keep | Canonical VBD dimension for embedded workflow integration. |
| VBD Operating Map | Operating Adoption Map | Alias | VBD remains the internal model; the readout label should explain what the user is looking at. |
| Function Outcome Metric | Outcome Metric | Alias | Shorter client-facing language for the metric selected by function/workflow. |
| Value Evidence Case | Value Evidence Case | Keep | Differentiated FluencyTracr object; already client-readable. |
| Evidence Readiness | Measurement Readiness | Alias | Clarifies that the decision is about whether measurement evidence is ready to support stronger language. |
| ROI Scenario | Value Scenario | Alias | ROI is one possible outcome; value scenarios are broader and safer. |
| Financial Claim Gate | Financial Claim Review | Alias | The gate remains internal; review is clearer for users. |
| EBITA Impact Bridge | Financial Translation | Alias | EBITA is a finance translation layer, not a usage metric or top-level UI label. |
| Executive Packet | Executive Readout | Alias | "Readout" is clearer for sponsors and aligns to the artifact's use. |
| Intervention Engine | Next Actions | Alias | The user needs to know what to do next, not see engine terminology. |
| Evidence Quality | Evidence Quality | Keep | Already clear and useful. |
| Directional | Estimate | Alias | Executive label for early evidence. |
| Caveated | Emerging Evidence | Alias | Executive label for evidence that exists but remains constrained. |
| Supported | Measured Value | Alias | Executive label for accepted evidence showing movement. |
| Finance Validated | Validated Value | Alias | Executive label for finance-attested value language. |
| Customer-Facing Approved | Renewal Evidence | Alias | Use when the output is approved for customer-facing sponsor or renewal use. |
| Claim Boundary | Value Realization / Governance Boundary | Alias | Keep the object; avoid using the database-like term as a user-facing heading. |
| Blocked Claims | Governance Boundaries | Alias | Keep exact validation fields; present as guardrails in readouts. |
| Time Saved | Capacity Created | Alias with caveat | Time saved only becomes value if capacity is recaptured and redeployed. |
| Realized ROI Calculation | Value Accounting | Alias | Keeps finance calculation governed and avoids calculator framing. |
| Customer-Facing Economic Output | Customer-Facing Value Evidence | Alias | Clarifies that the output is evidence, not automatic proof. |
| HR analytics | Person-level HRIS analytics / Aggregate Workforce Context | Split term | Person-level HRIS analytics, HRIS inference, decisioning, and ranking remain blocked. Aggregate HRIS-derived workforce context is allowed only when cohort-safe, customer-approved, and used for workflow-level value measurement. |

## Canonical Executive Concept Hierarchy

| Executive concept | Primary internal objects | Notes |
| --- | --- | --- |
| Value Hypothesis | Blueprint | Start with the client objective and workflow hypothesis. |
| Measurement Plan | Metrics Library, Outcome Evidence Export | Select outcome metrics, owners, sources, and windows. |
| Evidence Collection | Evidence Readiness, Outcome Evidence Export | Attach and review aggregate customer-owned evidence. |
| Value Realization | Value Evidence Case, Claim Boundary | Convert evidence into safe value language. |
| Financial Translation | EBITA Impact Bridge | Translate measured value into financial levers and assumptions. |
| Value Accounting | ROI Scenario, Financial Claim Gate | Finance-owned modeling and approval layer. |
| Renewal Evidence | Executive Packet | Sponsor-ready value record with caveats and next actions. |

## Canonical Evidence Translation

| Internal State | Executive Label | Definition |
| --- | --- | --- |
| Directional | Estimate | Early evidence or planning assumption; not ready for stronger value language. |
| Caveated | Emerging Evidence | Evidence exists but has explicit caveats. |
| Supported | Measured Value | Accepted aggregate evidence supports value movement. |
| Finance Validated | Validated Value | Finance-reviewed evidence and assumptions support stronger language. |

## Value Lifecycle Mapping

| Lifecycle state | VBD role | Evidence Readiness role | Financial Claim Gate role | EBITA Bridge role |
| --- | --- | --- | --- | --- |
| Potential Value | Shows where AI adoption may create value. | Evidence not yet attached. | Financial outputs blocked. | No translation. |
| Emerging Value | Shows adoption/workflow pattern worth investigating. | Evidence plan exists or is pending. | Internal or executive-caveated language only. | Directional Financial Translation may be shown. |
| Measured Value | Function/workflow pattern is tied to selected metric. | Aggregate outcome evidence is accepted. | Dollar language still depends on gate checks. | Measured financial levers may be shown. |
| Validated Value | VBD context supports interpretation, not proof. | Evidence is accepted and assumptions are reviewed. | Finance validation allows Value Accounting. | Finance-reviewed Financial Translation may be shown. |
| Realized Value | VBD remains context only. | Evidence and approvals travel with the readout. | Customer-facing approval is required. | Renewal Evidence may include approved financial language. |
