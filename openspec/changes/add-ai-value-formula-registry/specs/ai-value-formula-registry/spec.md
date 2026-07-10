## ADDED Requirements

### Requirement: Canonical Formula Registry

The system SHALL define `fluencytracr_ai_value_formula_registry` as the
canonical metadata registry for AI Fluency, VBD, hypothesis outcome modeling,
comparison-supported DiD, historical counterfactual modeling, pathway
coherence, evidence-design claim caps, economic value translation, portfolio
aggregation, and data-quality/governance formulas.

Every registry entry SHALL include `formula_id`, `formula_name`,
`formula_version`, `model_layer`, `implementation_state`,
`mathematical_expression`, `plain-language_definition`, `required_inputs`,
`input_units`, `output_unit`, `expected_direction`,
`applicable_metric_families`, `applicable_evidence_designs`, `assumptions`,
`limitations`, `prohibited_interpretations`, `source_contract_refs`,
`executable_reference_function`, `validation_tests`,
`customer_display_state`, and `governance_state`.

Allowed implementation states SHALL be `IMPLEMENTED_AND_TESTED`,
`IMPLEMENTED_SYNTHETIC_ONLY`, `SPECIFIED_NOT_IMPLEMENTED`,
`FUTURE_RESEARCH`, `DEPRECATED`, and `PROHIBITED`.

#### Scenario: Formula entries are complete

- **GIVEN** the registry JSON is loaded
- **WHEN** the registry validator checks entries
- **THEN** every entry contains the required field set and an allowed
  implementation state

#### Scenario: Human and machine registries stay aligned

- **GIVEN** a formula appears in the machine-readable registry
- **WHEN** the human-readable contract is inspected
- **THEN** the formula id and implementation state appear in the audit table

### Requirement: Registry Is Not An Execution Engine

The registry SHALL NOT execute formulas, compute posterior values, calculate
economic values, emit customer-facing output, or expose configurable runtime
weights, thresholds, coefficients, caps, or multipliers. Existing implementation
references SHALL be traceability metadata only and SHALL set
`runtime_callable_from_registry` to `false`.

#### Scenario: Specified formulas cannot execute

- **GIVEN** a formula entry has state `SPECIFIED_NOT_IMPLEMENTED`,
  `FUTURE_RESEARCH`, `DEPRECATED`, or `PROHIBITED`
- **WHEN** the registry validator runs
- **THEN** `executable_reference_function` must be null

#### Scenario: Implemented formulas remain trace-only

- **GIVEN** a formula entry has state `IMPLEMENTED_AND_TESTED` or
  `IMPLEMENTED_SYNTHETIC_ONLY`
- **WHEN** it references an existing implementation
- **THEN** the registry treats the reference as metadata only and cannot call it

#### Scenario: Runtime tunables are rejected

- **GIVEN** a registry entry includes a numeric runtime weight, threshold,
  coefficient, cap, or multiplier
- **WHEN** the registry validator runs
- **THEN** validation fails

### Requirement: Economic And Claim Boundaries

The registry SHALL preserve the existing V4 and Bayesian boundaries: AI Manager
formula families remain descriptive customer-owned aggregate templates;
financial assumptions cannot upgrade evidence design or claim level; favorable
AI Fluency or VBD context cannot rescue a failed primary outcome; future windows
cannot enter lagged exposure, baselines, counterfactuals, or eligibility checks;
and dollarized value, realized ROI, productivity lift, causality proof,
confidence percentages, and probability output remain blocked.

#### Scenario: AI Manager templates are complete and docs-only

- **GIVEN** the registry catalogs AI Manager formula templates
- **WHEN** formula families are listed
- **THEN** the list exactly matches `cycle_time_delta`,
  `friction_rate_delta`, `sales_cycle_delta`, `conversion_rate_delta`,
  `quality_rate_delta`, `throughput_delta`, `trust_coverage_share`,
  `exception_rate_delta`, and `experience_metric_delta`
- **AND** every template remains `SPECIFIED_NOT_IMPLEMENTED`

#### Scenario: Finance cannot upgrade claim caps

- **GIVEN** finance context, ROI Bot context, customer goals, or business
  targets are present
- **WHEN** evidence-design claim caps are interpreted
- **THEN** those contexts cannot upgrade evidence design strength, claim level,
  evidence grade, posterior eligibility, or customer-facing output

#### Scenario: Economic value formulas are prohibited

- **GIVEN** a formula would calculate modeled value draw, portfolio value,
  realized ROI, productivity lift, or customer-facing economic output
- **WHEN** it is represented in the registry
- **THEN** it must be marked `PROHIBITED`, blocked from customer display, and
  non-executable
