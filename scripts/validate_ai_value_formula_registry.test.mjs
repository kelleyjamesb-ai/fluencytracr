import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_MANAGER_OUTCOME_FORMULA_FAMILIES,
  AI_VALUE_FORMULA_REGISTRY_ID,
  AI_VALUE_FORMULA_REGISTRY_SCHEMA_VERSION,
  FORMULA_REGISTRY_IMPLEMENTATION_STATES,
  FORMULA_REGISTRY_MODEL_LAYERS,
  validateAiValueFormulaRegistry
} from "../shared/dist/aiValueEngine/index.js";

const REGISTRY_PATH =
  "docs/contracts/ai-value-formula-registry/formula-registry.json";
const SCHEMA_PATH =
  "docs/contracts/ai-value-formula-registry/formula-registry.schema.json";
const README_PATH = "docs/contracts/ai-value-formula-registry/README.md";

const REQUIRED_ENTRY_FIELDS = [
  "formula_id",
  "formula_name",
  "formula_version",
  "model_layer",
  "implementation_state",
  "mathematical_expression",
  "plain-language_definition",
  "required_inputs",
  "input_units",
  "output_unit",
  "expected_direction",
  "applicable_metric_families",
  "applicable_evidence_designs",
  "assumptions",
  "limitations",
  "prohibited_interpretations",
  "source_contract_refs",
  "executable_reference_function",
  "validation_tests",
  "customer_display_state",
  "governance_state"
];

const BLOCKED_INTERPRETATIONS = [
  "realized_roi",
  "customer_facing_economic_output",
  "causality_proof",
  "productivity_measurement",
  "individual_scoring",
  "manager_or_team_ranking",
  "confidence_percentage",
  "probability_output"
];

const NON_EXECUTABLE_STATES = new Set([
  "SPECIFIED_NOT_IMPLEMENTED",
  "FUTURE_RESEARCH",
  "DEPRECATED",
  "PROHIBITED"
]);

const EXPECTED_REGISTRY_BOUNDARY_PINS = [
  "metadata_only",
  "not_a_formula_execution_engine",
  "aggregate_only",
  "no_customer_facing_economic_output",
  "no_runtime_tunable_thresholds",
  "no_new_events_or_suppression_reasons"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const registry = readJson(REGISTRY_PATH);
const schema = readJson(SCHEMA_PATH);
const readme = readFileSync(README_PATH, "utf8");

function formula(id) {
  const found = registry.formulas.find((entry) => entry.formula_id === id);
  assert.ok(found, `missing formula ${id}`);
  return found;
}

function formulaFrom(value, id) {
  const found = value.formulas.find((entry) => entry.formula_id === id);
  assert.ok(found, `missing formula ${id}`);
  return found;
}

test("formula registry validates as canonical metadata only", () => {
  const result = validateAiValueFormulaRegistry(registry);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(registry.registry_id, AI_VALUE_FORMULA_REGISTRY_ID);
  assert.equal(registry.schema_version, AI_VALUE_FORMULA_REGISTRY_SCHEMA_VERSION);
  assert.equal(registry.status, "canonical_metadata_registry");
  assert.ok(result.formula_count >= 30);
  assert.ok(result.implemented_formula_count > 0);
  assert.ok(result.non_executable_formula_count > result.implemented_formula_count);
});

test("validator requires exact top-level registry metadata and fields", () => {
  for (const field of ["registry_version", "generated_for_change"]) {
    const mutated = structuredClone(registry);
    delete mutated[field];
    assert.equal(validateAiValueFormulaRegistry(mutated).valid, false, field);
  }

  const wrongVersion = structuredClone(registry);
  wrongVersion.registry_version = "future_unreviewed";
  assert.equal(validateAiValueFormulaRegistry(wrongVersion).valid, false);

  const wrongChange = structuredClone(registry);
  wrongChange.generated_for_change = "unreviewed-change";
  assert.equal(validateAiValueFormulaRegistry(wrongChange).valid, false);

  const extraField = structuredClone(registry);
  extraField.runtime_formula_url = "https://example.invalid/formulas";
  assert.equal(validateAiValueFormulaRegistry(extraField).valid, false);

  assert.equal(registry.registry_version, "2026_07");
  assert.equal(registry.generated_for_change, "add-ai-value-formula-registry");
});

test("validator requires the exact model layers and boundary pins", () => {
  for (const mutate of [
    (value) => value.model_layers.push("CUSTOM_ROI_ENGINE"),
    (value) => value.model_layers.push(value.model_layers[0]),
    (value) => value.registry_boundary.splice(0),
    (value) => value.registry_boundary.pop(),
    (value) => value.registry_boundary.push("customer_output_authorized")
  ]) {
    const mutated = structuredClone(registry);
    mutate(mutated);
    assert.equal(validateAiValueFormulaRegistry(mutated).valid, false);
  }

  assert.deepEqual(registry.model_layers, [...FORMULA_REGISTRY_MODEL_LAYERS]);
  assert.deepEqual(registry.registry_boundary, EXPECTED_REGISTRY_BOUNDARY_PINS);
});

test("validator rejects unexpected formula-entry fields", () => {
  const mutated = structuredClone(registry);
  mutated.formulas[0].customer_output_formula = "movement * unit_value";

  const result = validateAiValueFormulaRegistry(mutated);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("unexpected field customer_output_formula")));
});

test("validator requires every AI Manager family on its canonical template", () => {
  const missingEntry = structuredClone(registry);
  missingEntry.formulas = missingEntry.formulas.filter(
    (entry) => entry.formula_id !== "trust_coverage_share"
  );
  assert.equal(validateAiValueFormulaRegistry(missingEntry).valid, false);

  const missingFamily = structuredClone(registry);
  delete formulaFrom(missingFamily, "cycle_time_delta").formula_family;
  assert.equal(validateAiValueFormulaRegistry(missingFamily).valid, false);

  const mismatchedFamily = structuredClone(registry);
  formulaFrom(mismatchedFamily, "cycle_time_delta").formula_family =
    "friction_rate_delta";
  assert.equal(validateAiValueFormulaRegistry(mismatchedFamily).valid, false);
});

test("JSON schema requires the prompt field set and allowed states", () => {
  assert.deepEqual(schema.required, [
    "registry_id",
    "registry_version",
    "schema_version",
    "status",
    "generated_for_change",
    "registry_boundary",
    "model_layers",
    "formulas"
  ]);
  assert.deepEqual(schema.$defs.formula.required, REQUIRED_ENTRY_FIELDS);
  assert.deepEqual(
    schema.$defs.formula.properties.implementation_state.enum,
    [...FORMULA_REGISTRY_IMPLEMENTATION_STATES]
  );
  assert.deepEqual(
    schema.$defs.formula.properties.model_layer.enum,
    [...FORMULA_REGISTRY_MODEL_LAYERS]
  );
});

test("README audit table covers every registry formula id and state", () => {
  assert.match(readme, /\| Formula or calculation \| Current location \| Current status \| Mathematical meaning \| Keep\/change\/deprecate \|/);

  for (const entry of registry.formulas) {
    assert.ok(
      readme.includes(`\`${entry.formula_id}\``),
      `${entry.formula_id} is absent from README audit table`
    );
    assert.ok(
      readme.includes(`\`${entry.implementation_state}\``),
      `${entry.implementation_state} is absent from README audit table`
    );
  }
});

test("README audit table and machine registry contain the exact same formulas", () => {
  const readmeFormulaIds = [...readme.matchAll(/^\| `([a-z0-9_]+)` \|/gm)]
    .map((match) => match[1])
    .sort();
  const registryFormulaIds = registry.formulas
    .map((entry) => entry.formula_id)
    .sort();

  assert.deepEqual(readmeFormulaIds, registryFormulaIds);
});

test("formula input units accept only non-blank string values", () => {
  for (const invalidValue of [
    0.5,
    "  ",
    { runtime_authorization: { executable: true } }
  ]) {
    const mutated = structuredClone(registry);
    mutated.formulas[0].input_units.selected_metric = invalidValue;

    const result = validateAiValueFormulaRegistry(mutated);

    assert.equal(result.valid, false);
    assert.ok(
      result.gaps.some((gap) => gap.includes("input_units must map to non-blank strings"))
    );
  }

  const emptyUnits = structuredClone(registry);
  emptyUnits.formulas[0].input_units = {};
  assert.equal(validateAiValueFormulaRegistry(emptyUnits).valid, false);
});

test("executable references reject undeclared fields", () => {
  const mutated = structuredClone(registry);
  const implemented = mutated.formulas.find(
    (entry) => entry.executable_reference_function !== null
  );
  implemented.executable_reference_function.runtime_formula_url = "internal-only";

  const result = validateAiValueFormulaRegistry(mutated);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("executable_reference_function.runtime_formula_url is not allowed")
    )
  );
});

test("implemented entries reference existing governed code but remain non-callable from registry", () => {
  for (const entry of registry.formulas) {
    const executable = entry.executable_reference_function;
    if (
      entry.implementation_state === "IMPLEMENTED_AND_TESTED" ||
      entry.implementation_state === "IMPLEMENTED_SYNTHETIC_ONLY"
    ) {
      assert.ok(executable, `${entry.formula_id} should reference existing implementation`);
      assert.equal(executable.runtime_callable_from_registry, false);
      assert.ok(
        existsSync(executable.source_path),
        `${entry.formula_id} points to missing source ${executable.source_path}`
      );
      continue;
    }
    assert.equal(
      executable,
      null,
      `${entry.formula_id} must not expose executable reference in ${entry.implementation_state}`
    );
  }
});

test("AI Manager formula templates are complete, docs-only, and non-economic", () => {
  const families = registry.formulas
    .filter((entry) => entry.formula_family)
    .map((entry) => entry.formula_family)
    .sort();

  assert.deepEqual(families, [...AI_MANAGER_OUTCOME_FORMULA_FAMILIES].sort());

  for (const family of AI_MANAGER_OUTCOME_FORMULA_FAMILIES) {
    const entry = formula(family);
    assert.equal(entry.implementation_state, "SPECIFIED_NOT_IMPLEMENTED");
    assert.equal(entry.customer_display_state, "DOCS_ONLY_TEMPLATE");
    assert.equal(entry.executable_reference_function, null);
    assert.equal(entry.model_layer, "ECONOMIC_VALUE_TRANSLATION");
    for (const blocked of BLOCKED_INTERPRETATIONS) {
      assert.ok(entry.prohibited_interpretations.includes(blocked));
    }
  }
});

test("specified, future, deprecated, and prohibited formulas cannot execute", () => {
  for (const entry of registry.formulas) {
    if (NON_EXECUTABLE_STATES.has(entry.implementation_state)) {
      assert.equal(entry.executable_reference_function, null);
    }
  }
});

test("prohibited economic and arbitrary-score formulas are blocked", () => {
  const prohibitedIds = [
    "ai_fluency_arbitrary_overall_score",
    "vbd_fixed_weight_composite",
    "finance_context_claim_cap_upgrade",
    "modeled_value_draw",
    "portfolio_value_draw"
  ];

  for (const id of prohibitedIds) {
    const entry = formula(id);
    assert.equal(entry.implementation_state, "PROHIBITED");
    assert.equal(entry.customer_display_state, "BLOCKED");
    assert.equal(entry.executable_reference_function, null);
    for (const blocked of BLOCKED_INTERPRETATIONS) {
      assert.ok(entry.prohibited_interpretations.includes(blocked));
    }
  }
});

test("finance context cannot alter Fluency, VBD, or historical model inputs", () => {
  assert.equal(formula("finance_context_claim_cap_upgrade").implementation_state, "PROHIBITED");

  const protectedLayers = new Set([
    "AI_FLUENCY_MEASUREMENT",
    "VBD_BEHAVIORAL_MEASUREMENT",
    "HISTORICAL_COUNTERFACTUAL_MODELING"
  ]);
  for (const entry of registry.formulas) {
    if (!protectedLayers.has(entry.model_layer)) continue;
    const requiredInputs = entry.required_inputs.join(" ").toLowerCase();
    assert.ok(
      !requiredInputs.includes("finance"),
      `${entry.formula_id} should not take finance context as model input`
    );
  }
});

test("claim cap blocks rescue by favorable Fluency, VBD, or finance context", () => {
  const claimCap = formula("evidence_design_claim_cap");
  const boundaryText = [
    ...claimCap.limitations,
    ...claimCap.assumptions,
    ...claimCap.prohibited_interpretations
  ].join(" ");

  assert.match(boundaryText, /cannot upgrade weak evidence/);
  assert.match(boundaryText, /favorable Fluency or VBD cannot rescue failed primary outcome/);
  assert.equal(formula("finance_context_claim_cap_upgrade").implementation_state, "PROHIBITED");
});

test("longitudinal synthetic slice documents no future-window leakage", () => {
  const longitudinal = formula("first_longitudinal_synthetic_model_slice");

  assert.equal(longitudinal.implementation_state, "IMPLEMENTED_SYNTHETIC_ONLY");
  assert.ok(
    longitudinal.assumptions.some((item) => item.includes("prior windows only")),
    "lagged exposure must use prior windows only"
  );
  assert.ok(
    longitudinal.limitations.includes("future_window_leakage prohibited"),
    "future-window leakage must remain explicitly prohibited"
  );
});

test("runtime-tunable numeric controls are rejected", () => {
  const mutated = JSON.parse(JSON.stringify(registry));
  mutated.formulas[0].runtime_weight = 0.5;

  const result = validateAiValueFormulaRegistry(mutated);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) => gap.includes("runtime_weight contains a numeric tunable value"))
  );
});

test("array- and object-valued runtime tunables are rejected", () => {
  for (const sidecar of [
    { runtime_weights: [0.5, 0.5] },
    { thresholds: { surface: 5 } }
  ]) {
    const mutated = structuredClone(registry);
    Object.assign(mutated.formulas[0], sidecar);

    const result = validateAiValueFormulaRegistry(mutated);

    assert.equal(result.valid, false);
    assert.ok(
      result.gaps.some((gap) => gap.includes("numeric tunable value")),
      result.gaps.join("; ")
    );
  }
});

test("suppression gate metadata describes every implemented fail-closed decision gate", () => {
  const entry = formula("suppression_gate_default_hold");

  assert.equal(entry.implementation_state, "IMPLEMENTED_AND_TESTED");
  assert.equal(entry.model_layer, "DATA_QUALITY_AND_GOVERNANCE_GATES");
  assert.equal(entry.customer_display_state, "EXISTING_INTERNAL_CONTRACT");
  assert.equal(entry.executable_reference_function.runtime_callable_from_registry, false);
  for (const gate of [
    "ambiguity_flag",
    "window_length_days < 60",
    "behavioral_classes_present < 2",
    "candidate_decision ?? SUPPRESS"
  ]) {
    assert.ok(
      entry.mathematical_expression.includes(gate),
      `suppression metadata omits ${gate}`
    );
  }
});

test("capacity and value language cannot become realized savings or productivity", () => {
  const serialized = JSON.stringify(registry).toLowerCase();

  for (const unsafe of [
    "realized_savings",
    "dollar_savings",
    "cost_savings",
    "productivity_lift"
  ]) {
    assert.ok(!serialized.includes(unsafe), `${unsafe} must not appear as a registry output`);
  }
  assert.match(
    formula("throughput_delta").limitations.join(" "),
    /not capacity or productivity proof/
  );
});

test("unsafe executable formula helper was not retained", () => {
  assert.equal(
    existsSync("shared/src/aiValueEngine/aiValueFormulaReference.ts"),
    false,
    "formula reference helper should not be staged in this bounded metadata slice"
  );

  const serialized = JSON.stringify(registry);
  assert.ok(!serialized.includes("calculateModeledValueDraw"));
  assert.ok(!serialized.includes("calculatePortfolioValueDraw"));
});
