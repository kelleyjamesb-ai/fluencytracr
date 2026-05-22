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

### Surface taxonomy across AI touchpoints
- Source: James Kelley, surface-taxonomy insight that AI fluency must be measured across every AI touchpoint, not within an arbitrarily scoped subset
- Empirical grounding: scio-prod 60-day surface diagnostic showing V1 captured roughly 3.3M of an addressable ~28M first-class AI-use events
- Used in: future V2.1 surface taxonomy concept document

### Agent sub-surface taxonomy
- Source: James Kelley, auto-vs-workflow agent split insight
- Empirical grounding: scio-prod 60-day agent diagnostic showing autonomous agents represented 42% of AGENT volume
- Used in: V2.3 AGENT_TYPES concept document and V2.3 AGENT sub-surface implementation

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
