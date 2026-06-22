# AI Value Confidence Research Readiness Decision

Status: research-readiness decision only. This document does not create
backend routes, frontend UI, Prisma schema changes, migrations, repository
methods, persistence writes, live Glean or BigQuery execution, export packages,
rendered customer readouts, confidence math, ROI, causality, productivity,
probability, or customer-facing financial output.

Phase: `phase-ai-value-confidence-research-readiness-decision`

Decision: `HOLD_CONFIDENCE_RESEARCH_FOR_REPEATED_ALIGNED_EVIDENCE`

## 1. Purpose

The productization plan intentionally places confidence research after the
governed evidence spine has repeated aligned evidence and clear persistence /
projection boundaries. This document records whether confidence research may
start.

## 2. Decision

Do not start confidence-model research yet.

Decision value:

```text
HOLD_CONFIDENCE_RESEARCH_FOR_REPEATED_ALIGNED_EVIDENCE
```

Reason:

- Measurement Cell persistence is not promoted;
- Measurement Cell Series persistence is not promoted;
- controlled scrubbed aggregate pilot evidence has not been produced;
- repeated milestone windows are not validated;
- customer projection and export governance remain blocked;
- legacy readout isolation is not implemented;
- confidence language could be overread as ROI, EBITDA, causality, or
  customer-facing finance output.

## 3. Required Prerequisites

Confidence research may be reconsidered only after:

- controlled scrubbed aggregate pilot passes;
- Measurement Cell persistence is promoted and implemented, or a separate
  governance promotion records equivalent aggregate evidence sufficiency;
- repeated Measurement Cell milestone evidence exists;
- Measurement Cell Series persistence is promoted, or a separate governance
  promotion records equivalent aggregate evidence sufficiency;
- selected expectation path binding remains stable;
- customer metric movement exists as aggregate evidence;
- comparison design is documented;
- assumption governance is documented;
- source coverage is documented;
- customer-facing output remains blocked unless separately promoted;
- legal/trust review requirements are understood.

## 4. Allowed Future Research Framing

Allowed research may focus on:

- aggregate operational metric movement associated with governed AI work
  evidence;
- evidence design strength;
- source alignment;
- metric specificity;
- assumption quality;
- governance clearance;
- comparison design;
- repeated milestone evidence quality.

## 5. Blocked Research Framing

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

## 6. Required Future Research Gate

Before research implementation, add a separate research plan that specifies:

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

## 7. Recommended Next Move

Do not start confidence research. Execute the controlled scrubbed aggregate
pilot and revisit persistence promotion first.

## 8. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
