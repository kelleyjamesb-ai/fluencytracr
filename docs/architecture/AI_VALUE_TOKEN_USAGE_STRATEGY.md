# AI Value Token Usage Strategy

## 1. Decision

Token usage may be modeled only as a Layer 1 Token Efficiency Signal: aggregate
cost/intensity context for approved workflow windows. It can help teams inspect
model usage, workflow intensity, model routing, and evidence collection gaps.

Token usage is not ROI proof. It is not EBITA proof. It is not productivity,
causality, headcount, or customer-facing financial proof.

## 2. Why This Exists

Token volume can answer useful operational questions:

- Which workflow families consume more model capacity?
- Which model families appear in aggregate usage?
- Where does high-intensity usage suggest workflow design review?
- Where should the evidence collection plan request more context?

Those questions are materially different from value claims. A workflow can use
many tokens and still have no validated business outcome movement. A workflow
can use fewer tokens and still require Layer 2 user voice, Layer 3
system-of-record evidence, governance evidence, and assumptions before any
stronger Playbook coverage exists.

## 3. Evidence Boundary

| Signal | Layer | What it can support | What it cannot support |
| --- | --- | --- | --- |
| VBD operating posture | Layer 1 AI fluency posture | Aggregate AI work posture and evidence planning | ROI, productivity, causality, financial output |
| Token Efficiency | Layer 1 cost/intensity overlay | Cost exposure review, model usage review, workflow intensity review, routing/design review, evidence planning | Full Playbook coverage, claim readiness, ROI, EBITA, productivity, causality, headcount reduction, customer-facing financial output |
| Layer 2 user voice | Layer 2 empirical/user voice | Aggregate confidence, readiness, workflow observation, stated experience | System-of-record outcome movement by itself |
| Layer 3 outcomes | Layer 3 system-of-record | Customer-attested aggregate outcome movement | Causality or financial permission by itself |

## 4. Safe Signal Shape

The governed shape is defined by
[`docs/contracts/ai-value-token-efficiency-signal/README.md`](../contracts/ai-value-token-efficiency-signal/README.md)
and validated by
[`shared/src/aiValueEngine/tokenEfficiencySignal.ts`](../../shared/src/aiValueEngine/tokenEfficiencySignal.ts).

Required safety posture:

- aggregate-only;
- k-min threshold at least `5`;
- no raw rows, prompts, responses, transcripts, query text, or file contents;
- no direct, hashed, pseudonymous, tokenized, or joinable identifiers;
- no person-level HRIS or productivity records;
- no manager/team ranking, people decisioning, or individual attribution;
- no claim readiness, executive readout, persistence, backend route, frontend
  UI, migration, or ingestion job.

## 5. Product Interpretation

Token Efficiency belongs in the AI Value chain as evidence collection context.
It can point to where a customer or value team may want to investigate cost
exposure, model selection, or workflow design. It does not say whether value
was realized.

For external-client journeys, missing Layer 2 or Layer 3 evidence should become
client evidence requests. Token usage alone should not unlock stronger language
or customer-facing financial output.

## 6. Merge Boundary

This strategy is the Track A source of truth for the Token Efficiency contract.
The AI Value Blueprint may reference Token Efficiency as implemented only when
the contract, shared helper, examples, exports, and validator tests exist and
pass.
