/**
 * AI Value Formula Registry metadata validator.
 *
 * This module validates the canonical formula registry as contract metadata
 * only. It intentionally does not evaluate formulas, compute posterior values,
 * assemble customer-facing output, calculate ROI, or expose configurable
 * thresholds. Existing implementation references are traceability pointers,
 * not callable registry functions.
 */

export const AI_VALUE_FORMULA_REGISTRY_SCHEMA_VERSION =
  "FT_AI_VALUE_FORMULA_REGISTRY_2026_07";

export const AI_VALUE_FORMULA_REGISTRY_ID =
  "fluencytracr_ai_value_formula_registry";

const AI_VALUE_FORMULA_REGISTRY_VERSION = "2026_07";
const AI_VALUE_FORMULA_REGISTRY_CHANGE_ID = "add-ai-value-formula-registry";

export const FORMULA_REGISTRY_IMPLEMENTATION_STATES = [
  "IMPLEMENTED_AND_TESTED",
  "IMPLEMENTED_SYNTHETIC_ONLY",
  "SPECIFIED_NOT_IMPLEMENTED",
  "FUTURE_RESEARCH",
  "DEPRECATED",
  "PROHIBITED"
] as const;

export const FORMULA_REGISTRY_MODEL_LAYERS = [
  "AI_FLUENCY_MEASUREMENT",
  "VBD_BEHAVIORAL_MEASUREMENT",
  "HYPOTHESIS_OUTCOME_MODELING",
  "COMPARISON_SUPPORTED_DID",
  "HISTORICAL_COUNTERFACTUAL_MODELING",
  "PATHWAY_COHERENCE",
  "EVIDENCE_DESIGN_CLAIM_CAPS",
  "ECONOMIC_VALUE_TRANSLATION",
  "PORTFOLIO_AGGREGATION",
  "DATA_QUALITY_AND_GOVERNANCE_GATES"
] as const;

export const FORMULA_REGISTRY_CUSTOMER_DISPLAY_STATES = [
  "BLOCKED",
  "INTERNAL_ONLY",
  "DOCS_ONLY_TEMPLATE",
  "EXISTING_INTERNAL_CONTRACT",
  "DEPRECATED_NOT_CANONICAL"
] as const;

export const AI_MANAGER_OUTCOME_FORMULA_FAMILIES = [
  "cycle_time_delta",
  "friction_rate_delta",
  "sales_cycle_delta",
  "conversion_rate_delta",
  "quality_rate_delta",
  "throughput_delta",
  "trust_coverage_share",
  "exception_rate_delta",
  "experience_metric_delta"
] as const;

const FORMULA_REGISTRY_BOUNDARY_PINS = [
  "metadata_only",
  "not_a_formula_execution_engine",
  "aggregate_only",
  "no_customer_facing_economic_output",
  "no_runtime_tunable_thresholds",
  "no_new_events_or_suppression_reasons"
] as const;

const REGISTRY_KEYS = new Set([
  "registry_id",
  "registry_version",
  "schema_version",
  "status",
  "generated_for_change",
  "registry_boundary",
  "model_layers",
  "formulas"
]);

const REQUIRED_ENTRY_KEYS = [
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
] as const;

const FORMULA_ENTRY_KEYS = new Set<string>([
  ...REQUIRED_ENTRY_KEYS,
  "formula_family"
]);

const EXECUTABLE_REFERENCE_KEYS = new Set([
  "source_path",
  "export_name",
  "execution_boundary",
  "runtime_callable_from_registry"
]);

const REQUIRED_BLOCKED_INTERPRETATIONS = [
  "realized_roi",
  "customer_facing_economic_output",
  "causality_proof",
  "productivity_measurement",
  "individual_scoring",
  "manager_or_team_ranking",
  "confidence_percentage",
  "probability_output"
] as const;

const NON_EXECUTABLE_STATES = new Set<FormulaImplementationState>([
  "SPECIFIED_NOT_IMPLEMENTED",
  "FUTURE_RESEARCH",
  "DEPRECATED",
  "PROHIBITED"
]);

const NUMERIC_TUNABLE_KEY_PATTERN =
  /(?:^|_)(?:weight|weights|threshold|thresholds|coefficient|coefficients|multiplier|multipliers|cap|caps)$/i;

const IMPLEMENTATION_STATES = new Set<string>(FORMULA_REGISTRY_IMPLEMENTATION_STATES);
const MODEL_LAYERS = new Set<string>(FORMULA_REGISTRY_MODEL_LAYERS);
const CUSTOMER_DISPLAY_STATES = new Set<string>(FORMULA_REGISTRY_CUSTOMER_DISPLAY_STATES);
const AI_MANAGER_FAMILIES = new Set<string>(AI_MANAGER_OUTCOME_FORMULA_FAMILIES);

export type FormulaImplementationState =
  (typeof FORMULA_REGISTRY_IMPLEMENTATION_STATES)[number];

export type FormulaModelLayer = (typeof FORMULA_REGISTRY_MODEL_LAYERS)[number];

export type FormulaCustomerDisplayState =
  (typeof FORMULA_REGISTRY_CUSTOMER_DISPLAY_STATES)[number];

export type AiManagerOutcomeFormulaFamily =
  (typeof AI_MANAGER_OUTCOME_FORMULA_FAMILIES)[number];

export interface FormulaExecutableReference {
  source_path: string;
  export_name: string;
  execution_boundary: "existing_runtime_contract" | "synthetic_internal_only";
  runtime_callable_from_registry: false;
}

export interface AiValueFormulaRegistryEntry {
  formula_id: string;
  formula_name: string;
  formula_version: string;
  model_layer: FormulaModelLayer;
  implementation_state: FormulaImplementationState;
  mathematical_expression: string;
  "plain-language_definition": string;
  required_inputs: string[];
  input_units: Record<string, string>;
  output_unit: string;
  expected_direction: string;
  applicable_metric_families: string[];
  applicable_evidence_designs: string[];
  assumptions: string[];
  limitations: string[];
  prohibited_interpretations: string[];
  source_contract_refs: string[];
  executable_reference_function: FormulaExecutableReference | null;
  validation_tests: string[];
  customer_display_state: FormulaCustomerDisplayState;
  governance_state: string;
  formula_family?: AiManagerOutcomeFormulaFamily;
}

export interface AiValueFormulaRegistry {
  registry_id: typeof AI_VALUE_FORMULA_REGISTRY_ID;
  registry_version: string;
  schema_version: typeof AI_VALUE_FORMULA_REGISTRY_SCHEMA_VERSION;
  status: "canonical_metadata_registry";
  generated_for_change: string;
  registry_boundary: string[];
  model_layers: FormulaModelLayer[];
  formulas: AiValueFormulaRegistryEntry[];
}

export interface AiValueFormulaRegistryValidationResult {
  valid: boolean;
  gaps: string[];
  formula_count: number;
  formula_ids: string[];
  implemented_formula_count: number;
  non_executable_formula_count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateNoNumericTunableValues(
  value: unknown,
  gaps: string[],
  path = "registry",
  insideTunable = false
): void {
  if (typeof value === "number") {
    if (insideTunable) {
      gaps.push(`${path} contains a numeric tunable value`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateNoNumericTunableValues(entry, gaps, `${path}[${index}]`, insideTunable)
    );
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    validateNoNumericTunableValues(
      nestedValue,
      gaps,
      nestedPath,
      insideTunable || NUMERIC_TUNABLE_KEY_PATTERN.test(key)
    );
  }
}

function validateExecutableReference(
  entry: Record<string, unknown>,
  gaps: string[],
  formulaId: string
): void {
  const state = entry.implementation_state as FormulaImplementationState;
  const executable = entry.executable_reference_function;

  if (NON_EXECUTABLE_STATES.has(state) && executable !== null) {
    gaps.push(`${formulaId} must not declare an executable reference in ${state}`);
    return;
  }

  if (isRecord(executable)) {
    for (const key of Object.keys(executable)) {
      if (!EXECUTABLE_REFERENCE_KEYS.has(key)) {
        gaps.push(`${formulaId}.executable_reference_function.${key} is not allowed`);
      }
    }
  }

  if (state === "IMPLEMENTED_AND_TESTED" || state === "IMPLEMENTED_SYNTHETIC_ONLY") {
    if (!isRecord(executable)) {
      gaps.push(`${formulaId} must reference the existing governed implementation`);
      return;
    }
    for (const key of ["source_path", "export_name", "execution_boundary"]) {
      if (!hasText(executable[key])) {
        gaps.push(`${formulaId}.executable_reference_function.${key} is missing`);
      }
    }
    if (executable.runtime_callable_from_registry !== false) {
      gaps.push(`${formulaId} executable reference must not be callable from registry`);
    }
    if (
      executable.execution_boundary !== "existing_runtime_contract" &&
      executable.execution_boundary !== "synthetic_internal_only"
    ) {
      gaps.push(`${formulaId} executable reference has unsupported execution boundary`);
    }
  }
}

function validateFormulaFamily(
  entry: Record<string, unknown>,
  gaps: string[],
  formulaId: string
): void {
  if (entry.formula_family === undefined) return;
  if (!hasText(entry.formula_family) || !AI_MANAGER_FAMILIES.has(entry.formula_family)) {
    gaps.push(`${formulaId} has unsupported AI Manager formula family`);
    return;
  }
  if (entry.implementation_state !== "SPECIFIED_NOT_IMPLEMENTED") {
    gaps.push(`${formulaId} AI Manager formula templates must remain specified only`);
  }
  if (entry.executable_reference_function !== null) {
    gaps.push(`${formulaId} AI Manager formula templates must not be executable`);
  }
  if (entry.customer_display_state !== "DOCS_ONLY_TEMPLATE") {
    gaps.push(`${formulaId} AI Manager formula templates must be docs-only templates`);
  }
}

function validateEntry(entry: unknown, gaps: string[], seenIds: Set<string>): void {
  if (!isRecord(entry)) {
    gaps.push("formula entry must be an object");
    return;
  }

  const formulaId = hasText(entry.formula_id) ? entry.formula_id : "unknown_formula";
  for (const key of Object.keys(entry)) {
    if (!FORMULA_ENTRY_KEYS.has(key)) {
      gaps.push(`${formulaId} has unexpected field ${key}`);
    }
  }

  for (const key of REQUIRED_ENTRY_KEYS) {
    if (!(key in entry)) {
      gaps.push(`formula entry is missing ${key}`);
    }
  }

  if (!/^[a-z0-9_]+$/.test(formulaId)) {
    gaps.push(`${formulaId} formula_id must be stable snake_case`);
  }
  if (seenIds.has(formulaId)) {
    gaps.push(`${formulaId} formula_id is duplicated`);
  }
  seenIds.add(formulaId);

  for (const key of [
    "formula_name",
    "formula_version",
    "mathematical_expression",
    "plain-language_definition",
    "output_unit",
    "expected_direction",
    "governance_state"
  ]) {
    if (!hasText(entry[key])) {
      gaps.push(`${formulaId}.${key} is missing or blank`);
    }
  }

  if (!hasText(entry.implementation_state) || !IMPLEMENTATION_STATES.has(entry.implementation_state)) {
    gaps.push(`${formulaId} has unsupported implementation_state`);
  }
  if (!hasText(entry.model_layer) || !MODEL_LAYERS.has(entry.model_layer)) {
    gaps.push(`${formulaId} has unsupported model_layer`);
  }
  if (
    !hasText(entry.customer_display_state) ||
    !CUSTOMER_DISPLAY_STATES.has(entry.customer_display_state)
  ) {
    gaps.push(`${formulaId} has unsupported customer_display_state`);
  }

  for (const key of [
    "required_inputs",
    "applicable_metric_families",
    "applicable_evidence_designs",
    "assumptions",
    "limitations",
    "prohibited_interpretations",
    "source_contract_refs",
    "validation_tests"
  ]) {
    if (!isStringArray(entry[key]) || (entry[key] as string[]).length === 0) {
      gaps.push(`${formulaId}.${key} must be a non-empty string array`);
    }
  }

  if (
    !isRecord(entry.input_units) ||
    Object.keys(entry.input_units).length === 0 ||
    Object.values(entry.input_units).some((value) => !hasText(value))
  ) {
    gaps.push(`${formulaId}.input_units must map to non-blank strings`);
  }

  if (entry.implementation_state === "PROHIBITED" && entry.customer_display_state !== "BLOCKED") {
    gaps.push(`${formulaId} prohibited formulas must be blocked from customer display`);
  }

  const prohibited = isStringArray(entry.prohibited_interpretations)
    ? entry.prohibited_interpretations
    : [];
  for (const blocked of REQUIRED_BLOCKED_INTERPRETATIONS) {
    if (!prohibited.includes(blocked)) {
      gaps.push(`${formulaId}.prohibited_interpretations must include ${blocked}`);
    }
  }

  validateExecutableReference(entry, gaps, formulaId);
  validateFormulaFamily(entry, gaps, formulaId);
}

export function validateAiValueFormulaRegistry(
  registry: unknown
): AiValueFormulaRegistryValidationResult {
  const gaps: string[] = [];
  const formulaIds: string[] = [];
  let implementedFormulaCount = 0;
  let nonExecutableFormulaCount = 0;

  if (!isRecord(registry)) {
    return {
      valid: false,
      gaps: ["registry must be an object"],
      formula_count: 0,
      formula_ids: [],
      implemented_formula_count: 0,
      non_executable_formula_count: 0
    };
  }

  for (const key of Object.keys(registry)) {
    if (!REGISTRY_KEYS.has(key)) {
      gaps.push(`registry has unexpected field ${key}`);
    }
  }

  if (registry.registry_id !== AI_VALUE_FORMULA_REGISTRY_ID) {
    gaps.push(`registry_id must be ${AI_VALUE_FORMULA_REGISTRY_ID}`);
  }
  if (registry.schema_version !== AI_VALUE_FORMULA_REGISTRY_SCHEMA_VERSION) {
    gaps.push(`schema_version must be ${AI_VALUE_FORMULA_REGISTRY_SCHEMA_VERSION}`);
  }
  if (registry.registry_version !== AI_VALUE_FORMULA_REGISTRY_VERSION) {
    gaps.push(`registry_version must be ${AI_VALUE_FORMULA_REGISTRY_VERSION}`);
  }
  if (registry.generated_for_change !== AI_VALUE_FORMULA_REGISTRY_CHANGE_ID) {
    gaps.push(`generated_for_change must be ${AI_VALUE_FORMULA_REGISTRY_CHANGE_ID}`);
  }
  if (registry.status !== "canonical_metadata_registry") {
    gaps.push("status must be canonical_metadata_registry");
  }
  if (!isStringArray(registry.model_layers)) {
    gaps.push("model_layers must list canonical model layers");
  } else {
    if (new Set(registry.model_layers).size !== registry.model_layers.length) {
      gaps.push("model_layers must not contain duplicates");
    }
    for (const layer of registry.model_layers) {
      if (!MODEL_LAYERS.has(layer)) {
        gaps.push(`model_layers contains unsupported layer ${layer}`);
      }
    }
    for (const layer of FORMULA_REGISTRY_MODEL_LAYERS) {
      if (!registry.model_layers.includes(layer)) {
        gaps.push(`model_layers must include ${layer}`);
      }
    }
  }
  if (!isStringArray(registry.registry_boundary)) {
    gaps.push("registry_boundary must be a string array");
  } else {
    const requiredPins = new Set<string>(FORMULA_REGISTRY_BOUNDARY_PINS);
    if (new Set(registry.registry_boundary).size !== registry.registry_boundary.length) {
      gaps.push("registry_boundary must not contain duplicates");
    }
    for (const pin of registry.registry_boundary) {
      if (!requiredPins.has(pin)) {
        gaps.push(`registry_boundary contains unsupported pin ${pin}`);
      }
    }
    for (const pin of FORMULA_REGISTRY_BOUNDARY_PINS) {
      if (!registry.registry_boundary.includes(pin)) {
        gaps.push(`registry_boundary must include ${pin}`);
      }
    }
  }

  if (!Array.isArray(registry.formulas) || registry.formulas.length === 0) {
    gaps.push("formulas must be a non-empty array");
  } else {
    const seenIds = new Set<string>();
    for (const formula of registry.formulas) {
      validateEntry(formula, gaps, seenIds);
      if (isRecord(formula) && hasText(formula.formula_id)) {
        formulaIds.push(formula.formula_id);
      }
      if (
        isRecord(formula) &&
        (formula.implementation_state === "IMPLEMENTED_AND_TESTED" ||
          formula.implementation_state === "IMPLEMENTED_SYNTHETIC_ONLY")
      ) {
        implementedFormulaCount += 1;
      }
      if (isRecord(formula) && formula.executable_reference_function === null) {
        nonExecutableFormulaCount += 1;
      }
    }

    const formulaRecords = registry.formulas.filter(isRecord);
    for (const family of AI_MANAGER_OUTCOME_FORMULA_FAMILIES) {
      const matchingTemplates = formulaRecords.filter(
        (formula) => formula.formula_id === family && formula.formula_family === family
      );
      if (matchingTemplates.length !== 1) {
        gaps.push(`${family} must have exactly one canonical AI Manager template`);
      }
      const familyDeclarations = formulaRecords.filter(
        (formula) => formula.formula_family === family
      );
      if (familyDeclarations.length !== 1) {
        gaps.push(`${family} formula_family must be declared exactly once`);
      }
    }
  }

  validateNoNumericTunableValues(registry, gaps);

  return {
    valid: gaps.length === 0,
    gaps,
    formula_count: formulaIds.length,
    formula_ids: formulaIds,
    implemented_formula_count: implementedFormulaCount,
    non_executable_formula_count: nonExecutableFormulaCount
  };
}
