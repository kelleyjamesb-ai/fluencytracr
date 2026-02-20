## 1. Implementation
- [x] 1.1 Define episode schema models with ambiguity state and closure reasons
      (`src/fluencytracr_signal.py` — EpisodeSchema, AmbiguityState, ClosureReason)
- [x] 1.2 Implement ambiguity detection and suppression enforcement
      (`detect_ambiguity()` — triggers: inactivity, conflict, open episode)
- [x] 1.3 Implement signal class gating and confidence surfacing logic
      (`evaluate_episode()` — 6-gate sequence: observation window, ambiguity,
      signal classes, low-volume, seasonal anomaly, privacy leakage)
- [x] 1.4 Enforce non-tunable parameters and governance clauses in code
      (fixed `_OBSERVATION_WINDOW_DAYS=30`, `_MIN_SIGNAL_CLASSES=2`;
      `is_out_of_scope()` guard for anti-surveillance; iteration depth
      is derived at evaluation time and never stored)
- [x] 1.5 Add required tests for ambiguity, latency, low-volume, seasonal,
      and privacy leakage cases
      (`tests/test_fluencytracr_signal.py` — 47 tests, all passing)
