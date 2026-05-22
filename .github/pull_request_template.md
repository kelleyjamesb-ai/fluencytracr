## Summary
<!-- One-paragraph description of what this PR does and why. -->

## Roadmap reference
<!-- Which AGENTS.md roadmap prompt does this implement? e.g. "Prompt 2 — Quality Multiplier API" -->

## Invariants checklist
- [ ] No new canonical events
- [ ] No new suppression reasons
- [ ] No tunable thresholds or admin overrides
- [ ] No individual scoring or user-identifiable fields
- [ ] Default verdict remains SUPPRESS; SURFACE requires all gates clearing
- [ ] Suppression gates apply independently per slice
- [ ] Verdict shape changes are additive only (no breaking consumers)
- [ ] LMSYS assurance harness fixtures added for new behavior
- [ ] Schemas/, openspec/, and docs/contracts/ updated together if verdict shape changed

## Test evidence
<!-- Link to Assurance Harness run, dogfood run, or unit test output. -->

## Out-of-scope confirmation
- [ ] This PR does not introduce statistical significance scoring, JBTD/persona taxonomies, system-of-record connectors, correlation engines, dollarized ROI, or individual attribution.
