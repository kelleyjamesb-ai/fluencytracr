# AI Value Research Promotion Readiness Decision

Status: research-readiness decision only. This document does not create
backend routes, frontend UI, Prisma schema changes, migrations, repository
methods, persistence writes, live Glean or BigQuery execution, export packages,
rendered customer readouts, model math, numeric weights, ROI, causality,
productivity, probability, or customer-facing financial output.

Phase: `phase-ai-value-confidence-research-readiness-decision`

The file path and phase name retain the older `confidence` label for
continuity. This decision now governs the broader research promotion gate; it
does not create a separate confidence-research permission path.

Decision: `HOLD_RESEARCH_MODEL_IMPLEMENTATION_FOR_INTERNAL_RESEARCH_DESIGN`

## 1. Purpose

The productization plan intentionally places research model implementation after the
governed evidence spine has repeated aligned evidence, clear persistence /
projection boundaries, and a formal Research Promotion Readiness Packet. This
document records whether internal research model implementation may start.

Primary gate:

- [AI Value Research Promotion Readiness Packet](../contracts/ai-value-research-promotion-readiness-packet/README.md)

Internal research design:

- [AI Value Contribution Alignment Internal Research Design](./AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md)

Internal prototype runner design decision:

- [AI Value Contribution Alignment Internal Prototype Runner Design Decision](./AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_DESIGN_DECISION.md)

Internal prototype runner implementation decision:

- [AI Value Contribution Alignment Internal Prototype Runner Implementation Decision](./AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md)

## 2. Decision

Do not start research-model implementation yet.

The current controlled pilot packet instance returns
`READY_FOR_INTERNAL_RESEARCH_DESIGN`. That ready state allowed the
non-executable internal research-design artifact linked above from compact
packet refs and caveats.

Do not create numeric weights, model scores, contribution output, probability
output, finance output, ROI, causality, productivity measurement, or
customer-facing output.

Decision value:

```text
HOLD_RESEARCH_MODEL_IMPLEMENTATION_FOR_INTERNAL_RESEARCH_DESIGN
```

Reason:

- backend-internal Measurement Cell snapshot persistence is promoted, but only
  for compact internal evidence lineage;
- Measurement Cell Series persistence is still not promoted;
- controlled scrubbed aggregate pilot evidence exists for saved fixture paths,
  including repeated Day 0 / 30 / 60 / 90 / 180 / 365 milestone validation
  through the contract-only Measurement Cell Series layer;
- controlled fixture evidence is still internal promotion-review evidence, not
  live pilot evidence or durable Series product state;
- the current controlled pilot Research Promotion Readiness Packet has passed
  with `READY_FOR_INTERNAL_RESEARCH_DESIGN`, but only as a source-fixture-bound
  readiness record for internal research-design drafting;
- the internal contribution-alignment research design is drafted, but it
  explicitly keeps model implementation held;
- the internal prototype runner design decision promotes only the design of a
  future non-persistent internal runner and explicitly keeps runner
  implementation held;
- the internal prototype runner implementation decision promotes only a local,
  non-persistent internal runner that emits a compact method-design review
  envelope and no model result;
- customer projection and export governance remain blocked;
- live BigQuery/Sigma/Glean connector execution remains blocked;
- research language could be overread as ROI, EBITDA, causality, productivity,
  probability, or customer-facing finance output.

## 3. Required Prerequisites

Research model implementation may be reconsidered only after:

- a later exact-scope promotion decision cites the internal research design and
  authorizes a specific non-customer-facing prototype scope;
- repeated Measurement Cell milestone evidence exists across Day 0 / 30 / 60 /
  90 / 180 / 365;
- held, suppressed, missing, blocked, or rolling-window-only evidence remains
  visible and cannot be rescued by later ready windows;
- backend-internal Measurement Cell snapshots are recomputed-valid, or a
  later named, validator-backed contract explicitly promotes an alternative ref
  type with the same milestone, observed VBD, selected metric movement, path,
  suppression, source-bound, and compact-ref gates;
- Measurement Cell Series persistence is promoted, or the packet uses only the
  existing contract-output Series continuity proof without creating durable
  Series product state;
- selected expectation path binding remains stable;
- customer metric movement exists as aggregate evidence;
- AI Fluency construct context, AI Fluency psychological context, observed VBD
  behavior, and selected metric movement remain distinct;
- stated behavior remains a view over governed `behavior_change`, not observed
  VBD behavior;
- comparison design is documented;
- assumption governance is documented;
- source coverage is documented;
- customer-facing output remains blocked unless a later exact-scope
  customer-exposure decision promotes that exact surface with projection,
  export, auth/RLS, legal/trust, and red/green tests. This packet cannot be
  cited as customer-exposure authorization;
- legal/trust review requirements are understood.

## 4. Required Packet Output

The only packet decision that can unlock a later research-design document is:

```text
READY_FOR_INTERNAL_RESEARCH_DESIGN
```

That decision authorizes only this next step:

```text
Draft an internal research design using compact packet refs and caveats.
```

It does not authorize model implementation, statistical model selection,
numeric weights, research model inputs as durable product state, model outputs,
customer-facing output, finance-context investigation, ROI, EBITDA, causality,
productivity, probability, or contribution output.

## 5. Allowed Future Research Framing

Allowed research-design framing may focus on:

- aggregate operational metric movement reviewed beside governed AI work
  evidence;
- observed VBD behavior aligned to approved expectation paths;
- aggregate AI Fluency construct and psychological context as context only;
- evidence design strength;
- source alignment;
- metric specificity;
- assumption quality;
- governance clearance;
- comparison design;
- repeated milestone evidence quality.

## 6. Blocked Research Framing

Do not frame research as:

- AI caused EBITDA;
- AI proved ROI;
- financial attribution;
- workforce productivity measurement;
- employee performance inference;
- customer-facing contribution-model output;
- finance-output probability;
- customer-facing score;
- team, manager, department, or employee ranking;
- individual attribution.

## 7. Required Future Research Gate

Before research implementation, add a separate research design that specifies:

- research question;
- eligible aggregate inputs;
- excluded fields;
- comparison design;
- design-strength cap;
- source coverage requirements;
- missing-evidence behavior;
- suppression behavior;
- output audience;
- blocked output language;
- validation checks;
- legal/trust review posture.

The internal research design now cites the passed current controlled pilot
Research Promotion Readiness Packet. If that packet is later held, rejected, or
fails source-fixture-bound validation, research design and any future prototype
remain blocked.

## 8. Recommended Next Move

Do not start research model implementation. The internal contribution-alignment
prototype runner may be used only as a local compact-ref review envelope. The
next move is to use its output for internal review and decide whether to hold,
reject, or draft a later research-model prototype design. Do not implement
model math yet.

## 9. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
npm run test:ai-value-contribution-alignment-internal-research-design
npm run test:ai-value-contribution-alignment-internal-prototype-runner-design
npm run test:ai-value-contribution-alignment-internal-prototype-runner
```

Expected: all commands exit `0`.
