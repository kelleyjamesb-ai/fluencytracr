# Change: Add FluencyTracr V1 Confidence & Signal Layer

## Why
FluencyTracr needs an inference safety layer that strictly governs when behavioral signals may surface and when they must be suppressed to prevent invasive data collection or misinterpretation.

## What Changes
- Define V1 confidence gating and suppression rules as a new FluencyTracr capability.
- Codify episode modeling, ambiguity handling, and signal class constraints as requirements.
- Specify governance clauses (anti-surveillance and ambiguity doctrine) as non-negotiable behavior.

## Impact
- Affected specs: fluencytracr-confidence-signal
- Affected code: backend signal processing, shared schema models, test suite (pytest)
