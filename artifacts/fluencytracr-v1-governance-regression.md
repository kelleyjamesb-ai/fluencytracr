# FluencyTracr v1 — Governance Regression Suite

## 1. Governance Regression Summary

Policy-focused **Jest** suite under `backend/tests/governance/` that fails closed when executive-facing outputs or aggregates drift toward **individual exposure**, **rankings**, **trend/ROI/productivity language**, **raw baselines/thresholds**, **score-like copy**, **unsafe ambiguity** (allowed distribution inflation), or **cross-workflow comparison** artifacts. Uses **deterministic fixtures**, **explicit negative tests** (leaky payload controls), **structural allowlists** for `handleGetObservability` bodies, **recursive forbidden-key checks**, and **string guards** with **pattern-enum masking** so legitimate `BehaviorPattern` labels (e.g. `RECOVERY_MATURITY`) do not false-positive “maturity score” rules.

**Path note:** Requested `src/tests/governance/...` maps to `backend/tests/governance/...` per existing `jest.config.js` (`testMatch: **/tests/**/*.test.ts`).

---

## 2. File Tree

```
backend/tests/governance/fixtures/governance.fixtures.ts
backend/tests/governance/helpers/governance-matchers.ts
backend/tests/governance/output-surface.regression.test.ts
backend/tests/governance/suppression-policy.regression.test.ts
backend/tests/governance/aggregation-safety.regression.test.ts
backend/tests/governance/api-contract.regression.test.ts
```

---

## 3. Governance Test Fixtures

`governance.fixtures.ts`: `GOV_ORG`, `GOV_WF_ALPHA`, `GOV_WF_BETA`; **`LEAKY_OBSERVABILITY_BODY`** (negative control: `execution_id` + `diagnostics` on a workflow row); **`TREND_LEAK_STRINGS`**, **`RANK_LEAK_STRINGS`** for matcher self-tests. Pipeline tests reuse `backend/tests/fixtures/canonical-events.fixtures.ts` and `createE2eInMemoryStack`.

---

## 4. Output Surface Regression Tests

`output-surface.regression.test.ts`: proves matchers **reject** leaky shapes; proves **trend / rank / score** scanners fail on polluted JSON; proves **benign** minimal JSON passes trend scan; proves **real** `handleGetObservability` output passes **`expectGovernanceSafeObservabilityBody`**.

---

## 5. Suppression Policy Regression Tests

`suppression-policy.regression.test.ts`: **FSC-failed** executions stay **SUPPRESSED** and **do not** appear in `pattern_distribution` counts alongside one **ALLOWED** execution; **INSUFFICIENT_SIGNAL** → empty distribution; **AMBIGUITY** (classifier spy) → **SUPPRESSED** and **zero** classified rows in aggregate.

---

## 6. Aggregation Safety Regression Tests

`aggregation-safety.regression.test.ts`: two workflows → two **isolated** workflow rows, **no** `cross_workflow` / comparison substrings in serialized response; **default pipeline** path keeps **`CATEGORICAL_PREVALENCE`** on observability; **NUMERIC_SHARE** aggregate still passes **forbidden-key** rules and **no rank/trend/diagnostic** substrings.

---

## 7. API Contract Regression Tests

`api-contract.regression.test.ts`: **`DEFAULT_PREVALENCE_MODE`** pinned to **`CATEGORICAL_PREVALENCE`**; **400** body is **`{ error }` only** with no leak substrings; **200** body passes full governance matcher and excludes **diagnostics / suppression_reason / trace** phrasing in serialized JSON.

---

## 8. Utility Guards or Matchers

`governance-matchers.ts`:

- `maskClassificationPatternLabels` — strips enum labels before phrase scans.
- `expectNoForbiddenKeys` — recursive exact + substring key denylist (avoids e.g. `interaction` ⊃ `actor` false positives).
- `expectExecutiveSafeWorkflowPayload` — allowlisted workflow + pattern row keys.
- `expectNoTrendLanguage` / `expectNoScoreLikeLanguage` / `expectNoRankingLanguage` — phrase and regex guards.
- `expectGovernanceSafeObservabilityBody` — composes structural + key + language checks on **200** payloads.

---

## 9. Notes on Extending the Suite

- Run **only** this suite: `cd backend && npm run test:ci -- tests/governance` (avoid matching `dashboard_v1_governance.test.ts` via `--testPathPattern=governance`).
- Add new forbidden **API keys** to `FORBIDDEN_OBSERVABILITY_KEYS_EXACT` / `FORBIDDEN_OBSERVABILITY_KEY_SUBSTRINGS` before they ship.
- Add **new executive endpoints** by reusing matchers on their JSON shapes (extend allowlists if a new safe field is deliberate).
- Keep **negative fixtures** beside positive tests so regressions in matchers themselves are caught.
- Prefer **explicit** `expect(...).toBe(...)` on counts and modes over snapshots.
