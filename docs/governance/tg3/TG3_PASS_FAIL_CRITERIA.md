# TG3 Pass/Fail Criteria

## Required QA Artifact Contents

QA must produce one TG3 artifact containing:

Test list with assertions
Synthetic data descriptions (parameters only, no raw data)
Expected vs actual outcomes
Explicit confirmation:
“All adversarial cases fail closed.”
Explicit statement:
“No false-positive temporal path exists.”
Any exception must be documented and escalated.

## Pass / Fail Criteria (Binary)

TG3 PASSES only if:
- No test surfaces a temporal signal
- No output implies progress, decline, or performance
- All ambiguity results in suppression or withholding
- Gate Owner, QA, and Semantic Safety Reviewer agree no misuse path exists

TG3 FAILS if:
- Any pattern survives noise or seasonality
- Any output can reasonably be read as evaluative
- Any case requires interpretation to justify

If TG3 fails:
- Fixes occur inside TG3
- Tests are re-run
- Advancement is blocked until clean
