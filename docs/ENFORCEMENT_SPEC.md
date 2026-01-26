# Enforcement Spec

## Window surfacing gate

- `window_length_days < 60` ⇒ `decision == SUPPRESS`
  - 30–59 day windows are included in this rule as a subset.
