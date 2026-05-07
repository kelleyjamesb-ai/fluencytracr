import fs from "fs";
import path from "path";

import {
  AiSurfaceSchema,
  AiWorkMaturityModelSchema,
  AiWorkValueGraphSchema,
  ClaimReadinessStateSchema,
  AI_WORK_MATURITY_EVIDENCE_TO_STAGE_MAP,
  MaturityStageSchema,
  OutcomeDomainSchema,
  AiWorkValueDemoSchema,
  OutcomeInstrumentationMapSchema,
  StrongestSafeClaimSchema,
  ValueEvidenceTypeSchema,
  ValueHypothesisRegistrySchema,
  WorkPatternSchema,
  buildAiWorkMaturityModel,
  buildAiWorkValueDemo,
  buildOutcomeInstrumentationMap,
  buildValueHypothesisRegistry,
  buildAiWorkValueGraph,
  generateStrongestSafeClaim
} from "@learnaire/shared";

const fixture = (contractPath: string, name: string) => {
  const fullPath = path.join(__dirname, "../../docs/contracts", contractPath, "examples", name);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
};

const contractFile = (contractPath: string, name: string) => {
  const fullPath = path.join(__dirname, "../../docs/contracts", contractPath, name);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
};

const customerSafeGraph = fixture("ai-work-value-graph", "org-northstar-ai-work-value-graph.json");
const suppressedGraph = fixture("ai-work-value-graph", "org-northstar-suppressed-ai-work-value-graph.json");
const maturityModel = fixture("ai-work-maturity-model", "nielsen-style-ai-work-maturity-examples.json");
const valueHypothesisRegistry = fixture("value-hypothesis-registry", "nielsen-style-value-hypothesis-registry.json");
const outcomeInstrumentationMap = fixture("outcome-instrumentation-map", "nielsen-style-outcome-instrumentation-map.json");
const aiWorkValueDemo = contractFile("ai-work-value-graph/demo", "nielsen-style-ai-work-value-demo.json");

describe("AI Work Value Graph contract", () => {
  it("accepts the synthetic customer-safe value graph fixture", () => {
    const graph = buildAiWorkValueGraph(customerSafeGraph);

    expect(graph.schema_version).toBe("AIWVG_2026_05");
    expect(graph.summary.overall_claim_readiness).toBe("caveated");
    expect(graph.summary.covered_surfaces).toEqual(
      expect.arrayContaining(["search", "chat", "ai_answers", "agents", "skills", "mcp_actions"])
    );
    expect(graph.nodes.some((node) => node.kind === "outcome" && node.claim_readiness === "caveated")).toBe(true);
    expect(AiWorkValueGraphSchema.parse(graph)).toEqual(graph);
  });

  it("accepts a suppressed graph without forcing a value claim", () => {
    const graph = buildAiWorkValueGraph(suppressedGraph);

    expect(graph.summary.overall_claim_readiness).toBe("suppressed");
    expect(graph.edges[0].edge_type).toBe("claim_blocked_by_gap");
    expect(graph.summary.blocked_claims.join(" ")).toMatch(/Do not claim value impact/);
  });

  it("contains the requested canonical enum values", () => {
    expect(AiSurfaceSchema.options).toEqual([
      "search",
      "chat",
      "ai_answers",
      "agents",
      "skills",
      "mcp_actions",
      "canvas_artifacts",
      "apis",
      "embedded_hosts"
    ]);
    expect(WorkPatternSchema.options).toEqual([
      "find",
      "understand",
      "summarize",
      "draft",
      "decide",
      "analyze",
      "troubleshoot",
      "automate",
      "orchestrate"
    ]);
    expect(MaturityStageSchema.options).toEqual([
      "ad_hoc_assistance",
      "repeated_assistance",
      "reusable_expertise",
      "agentic_execution",
      "governed_action",
      "outcome_linked",
      "finance_approved"
    ]);
    expect(ValueEvidenceTypeSchema.options).toEqual([
      "survey",
      "product_telemetry",
      "workflow_run",
      "artifact_output",
      "action_log",
      "control_evidence",
      "business_outcome",
      "financial_model"
    ]);
    expect(OutcomeDomainSchema.options).toEqual([
      "sales",
      "customer_success",
      "support",
      "engineering",
      "product",
      "IT",
      "HR",
      "legal",
      "finance",
      "security",
      "operations"
    ]);
    expect(ClaimReadinessStateSchema.options).toEqual([
      "not_measured",
      "directional",
      "evidence_present",
      "caveated",
      "internal_only",
      "customer_safe",
      "suppressed"
    ]);
  });

  it("rejects raw content, direct identifiers, rankings, manager views, and productivity scoring fields", () => {
    const unsafeKeys = [
      "raw_prompt",
      "raw_response",
      "transcript",
      "query_text",
      "file_content",
      "user_email",
      "employee_id",
      "manager_view",
      "team_ranking",
      "productivity_score"
    ];

    for (const key of unsafeKeys) {
      const parsed = AiWorkValueGraphSchema.safeParse({
        ...customerSafeGraph,
        nodes: [
          {
            ...customerSafeGraph.nodes[0],
            [key]: "unsafe"
          },
          ...customerSafeGraph.nodes.slice(1)
        ]
      });

      expect(parsed.success).toBe(false);
    }
  });

  it("rejects edges that reference missing nodes", () => {
    const parsed = AiWorkValueGraphSchema.safeParse({
      ...customerSafeGraph,
      edges: [
        {
          ...customerSafeGraph.edges[0],
          to_node_id: "outcome:missing"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});

describe("AI Work Maturity Model contract", () => {
  it("accepts the Nielsen-style maturity model fixture", () => {
    const model = buildAiWorkMaturityModel(maturityModel);

    expect(model.schema_version).toBe("AIWMM_2026_05");
    expect(model.evidence_to_stage_map).toEqual(AI_WORK_MATURITY_EVIDENCE_TO_STAGE_MAP);
    expect(model.examples.map((example) => example.example_id)).toEqual([
      "search_productivity",
      "assistant_productivity",
      "cs_response_time_improvement",
      "sales_account_planning",
      "support_case_analyzer",
      "project_onboarding",
      "security_incident_assistant",
      "agentic_business_reporting"
    ]);
    expect(AiWorkMaturityModelSchema.parse(model)).toEqual(model);
  });

  it("shows current maturity, evidence gaps, upgrade path, and safe claim language for every example", () => {
    const model = buildAiWorkMaturityModel(maturityModel);

    for (const example of model.examples) {
      expect(MaturityStageSchema.options).toContain(example.current_maturity_stage);
      expect(example.evidence_present.length + example.evidence_missing.length).toBeGreaterThan(0);
      expect(example.safe_claim_language.current_safe_claim).toBeTruthy();
      expect(example.safe_claim_language.blocked_claim).toBeTruthy();

      if (example.current_maturity_stage !== "finance_approved") {
        expect(example.upgrade_path.length).toBeGreaterThan(0);
      }
    }
  });

  it("requires business outcome evidence before outcome-linked maturity", () => {
    const broken = {
      ...maturityModel,
      examples: maturityModel.examples.map((example: any) =>
        example.example_id === "cs_response_time_improvement"
          ? {
              ...example,
              evidence_present: example.evidence_present.filter((evidence: any) => evidence.evidence_type !== "business_outcome")
            }
          : example
      )
    };

    expect(AiWorkMaturityModelSchema.safeParse(broken).success).toBe(false);
  });

  it("requires financial model evidence before finance-approved maturity", () => {
    const broken = {
      ...maturityModel,
      examples: maturityModel.examples.map((example: any) =>
        example.example_id === "agentic_business_reporting"
          ? {
              ...example,
              evidence_present: example.evidence_present.filter((evidence: any) => evidence.evidence_type !== "financial_model")
            }
          : example
      )
    };

    expect(AiWorkMaturityModelSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects forbidden fields in maturity model examples", () => {
    const parsed = AiWorkMaturityModelSchema.safeParse({
      ...maturityModel,
      examples: [
        {
          ...maturityModel.examples[0],
          raw_response: "unsafe"
        },
        ...maturityModel.examples.slice(1)
      ]
    });

    expect(parsed.success).toBe(false);
  });
});

describe("Value Hypothesis Registry contract", () => {
  it("accepts the Nielsen-style value hypothesis registry fixture", () => {
    const registry = buildValueHypothesisRegistry(valueHypothesisRegistry);

    expect(registry.schema_version).toBe("VHR_2026_05");
    expect(registry.hypotheses.map((hypothesis) => hypothesis.hypothesis_id)).toEqual([
      "cs_response_time_improvement",
      "sales_account_planning_acceleration",
      "engineering_time_to_first_commit_reduction",
      "support_case_deflection",
      "security_incident_response_acceleration",
      "finance_reporting_acceleration",
      "hr_onboarding_acceleration",
      "agentic_business_reporting"
    ]);
    expect(ValueHypothesisRegistrySchema.parse(registry)).toEqual(registry);
  });

  it("includes the requested registry fields for every hypothesis", () => {
    const registry = buildValueHypothesisRegistry(valueHypothesisRegistry);

    for (const hypothesis of registry.hypotheses) {
      expect(hypothesis.hypothesis_id).toBeTruthy();
      expect(OutcomeDomainSchema.options).toContain(hypothesis.outcome_domain);
      expect(WorkPatternSchema.options).toContain(hypothesis.work_pattern);
      expect(MaturityStageSchema.options).toContain(hypothesis.target_maturity_stage);
      expect(hypothesis.expected_value_mechanism).toBeTruthy();
      expect(hypothesis.leading_indicators.length).toBeGreaterThan(0);
      expect(hypothesis.lagging_indicators.length).toBeGreaterThan(0);
      expect(hypothesis.required_evidence.length).toBeGreaterThan(0);
      expect(hypothesis.current_evidence_state.length).toBeGreaterThan(0);
      expect(hypothesis.claim_templates_enabled.length).toBeGreaterThan(0);
      expect(hypothesis.risks_and_caveats.length).toBeGreaterThan(0);
    }
  });

  it("requires every required evidence type to appear in current evidence state", () => {
    const broken = {
      ...valueHypothesisRegistry,
      hypotheses: valueHypothesisRegistry.hypotheses.map((hypothesis: any) =>
        hypothesis.hypothesis_id === "sales_account_planning_acceleration"
          ? {
              ...hypothesis,
              current_evidence_state: hypothesis.current_evidence_state.filter(
                (evidence: any) => evidence.evidence_type !== "business_outcome"
              )
            }
          : hypothesis
      )
    };

    expect(ValueHypothesisRegistrySchema.safeParse(broken).success).toBe(false);
  });

  it("requires outcome-linked hypotheses to require business outcome evidence", () => {
    const broken = {
      ...valueHypothesisRegistry,
      hypotheses: valueHypothesisRegistry.hypotheses.map((hypothesis: any) =>
        hypothesis.hypothesis_id === "support_case_deflection"
          ? {
              ...hypothesis,
              required_evidence: hypothesis.required_evidence.filter((evidence: string) => evidence !== "business_outcome")
            }
          : hypothesis
      )
    };

    expect(ValueHypothesisRegistrySchema.safeParse(broken).success).toBe(false);
  });

  it("requires finance-approved hypotheses to require financial model evidence", () => {
    const broken = {
      ...valueHypothesisRegistry,
      hypotheses: valueHypothesisRegistry.hypotheses.map((hypothesis: any) =>
        hypothesis.hypothesis_id === "agentic_business_reporting"
          ? {
              ...hypothesis,
              required_evidence: hypothesis.required_evidence.filter((evidence: string) => evidence !== "financial_model")
            }
          : hypothesis
      )
    };

    expect(ValueHypothesisRegistrySchema.safeParse(broken).success).toBe(false);
  });

  it("rejects duplicate hypothesis IDs and forbidden fields", () => {
    const duplicate = {
      ...valueHypothesisRegistry,
      hypotheses: [
        valueHypothesisRegistry.hypotheses[0],
        {
          ...valueHypothesisRegistry.hypotheses[1],
          hypothesis_id: valueHypothesisRegistry.hypotheses[0].hypothesis_id
        }
      ]
    };

    expect(ValueHypothesisRegistrySchema.safeParse(duplicate).success).toBe(false);

    const unsafe = {
      ...valueHypothesisRegistry,
      hypotheses: [
        {
          ...valueHypothesisRegistry.hypotheses[0],
          query_text: "unsafe"
        },
        ...valueHypothesisRegistry.hypotheses.slice(1)
      ]
    };

    expect(ValueHypothesisRegistrySchema.safeParse(unsafe).success).toBe(false);
  });
});

describe("Outcome Instrumentation Map contract", () => {
  it("accepts the Nielsen-style outcome instrumentation map fixture", () => {
    const map = buildOutcomeInstrumentationMap(outcomeInstrumentationMap);

    expect(map.schema_version).toBe("OIM_2026_05");
    expect(map.entries.map((entry) => entry.instrumentation_id)).toEqual([
      "cs_response_time",
      "sales_meetings_per_week",
      "support_ticket_deflection",
      "engineering_time_to_first_commit",
      "security_incident_response_time",
      "finance_reporting_cycle_time",
      "hr_onboarding_time_to_proficiency"
    ]);
    expect(OutcomeInstrumentationMapSchema.parse(map)).toEqual(map);
  });

  it("defines required external outcome instrumentation fields for every entry", () => {
    const map = buildOutcomeInstrumentationMap(outcomeInstrumentationMap);

    for (const entry of map.entries) {
      expect(entry.system_of_record).toBeTruthy();
      expect(entry.metric_name).toBeTruthy();
      expect(entry.aggregation_level).not.toMatch(/person|individual|user/i);
      expect(entry.window).toBeTruthy();
      expect(typeof entry.baseline_required).toBe("boolean");
      expect(entry.counterfactual_requirement).toBeTruthy();
      expect(entry.attribution_strength).toBeTruthy();
      expect(entry.privacy_boundary).toBeTruthy();
      expect(entry.minimum_sample_size).toBeGreaterThanOrEqual(5);
      expect(entry.claim_readiness_effect).toBeTruthy();
    }
  });

  it("requires a counterfactual when a baseline is required", () => {
    const broken = {
      ...outcomeInstrumentationMap,
      entries: [
        {
          ...outcomeInstrumentationMap.entries[0],
          counterfactual_requirement: "none"
        },
        ...outcomeInstrumentationMap.entries.slice(1)
      ]
    };

    expect(OutcomeInstrumentationMapSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects person-level metrics, direct identifiers, and duplicate instrumentation IDs", () => {
    const personLevelMetric = {
      ...outcomeInstrumentationMap,
      entries: [
        {
          ...outcomeInstrumentationMap.entries[0],
          metric_name: "employee_response_time_median_hours"
        },
        ...outcomeInstrumentationMap.entries.slice(1)
      ]
    };
    expect(OutcomeInstrumentationMapSchema.safeParse(personLevelMetric).success).toBe(false);

    const unsafeField = {
      ...outcomeInstrumentationMap,
      entries: [
        {
          ...outcomeInstrumentationMap.entries[0],
          user_id: "unsafe"
        },
        ...outcomeInstrumentationMap.entries.slice(1)
      ]
    };
    expect(OutcomeInstrumentationMapSchema.safeParse(unsafeField).success).toBe(false);

    const duplicate = {
      ...outcomeInstrumentationMap,
      entries: [
        outcomeInstrumentationMap.entries[0],
        {
          ...outcomeInstrumentationMap.entries[1],
          instrumentation_id: outcomeInstrumentationMap.entries[0].instrumentation_id
        }
      ]
    };
    expect(OutcomeInstrumentationMapSchema.safeParse(duplicate).success).toBe(false);
  });

  it("requires causal attribution to use holdout or control counterfactual evidence", () => {
    const broken = {
      ...outcomeInstrumentationMap,
      entries: [
        {
          ...outcomeInstrumentationMap.entries[0],
          attribution_strength: "causal_validated",
          counterfactual_requirement: "pre_post"
        },
        ...outcomeInstrumentationMap.entries.slice(1)
      ]
    };

    expect(OutcomeInstrumentationMapSchema.safeParse(broken).success).toBe(false);
  });
});

describe("Strongest Safe Claim generator", () => {
  it("returns an internal-only finance claim when financial evidence is present but methodology is missing", () => {
    const result = generateStrongestSafeClaim({
      graph: customerSafeGraph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      preferred_hypothesis_id: "agentic_business_reporting"
    });

    expect(result.schema_version).toBe("SSC_2026_05");
    expect(result.roi_positioning).toBe("final_claim_layer");
    expect(result.strongest_claim.hypothesis_id).toBe("agentic_business_reporting");
    expect(result.strongest_claim.maturity_stage).toBe("finance_approved");
    expect(result.strongest_claim.claim_readiness).toBe("internal_only");
    expect(result.strongest_claim.safe_claim_language).toMatch(/Finance-reviewed evidence supports a bounded value claim/);
    expect(result.strongest_claim.methodology_caveats.join(" ")).toMatch(/No methodology snapshot was selected/);
    expect(result.strongest_claim.evidence_used).toEqual(
      expect.arrayContaining(["workflow_run", "action_log", "artifact_output", "control_evidence", "business_outcome", "financial_model"])
    );
    expect(result.blocked_stronger_claims.join(" ")).toMatch(/Do not generalize/);
    expect(result.blocked_methodology_claims.join(" ")).toMatch(/Customer-facing ROI\/payback requires a selected methodology snapshot/);
    expect(StrongestSafeClaimSchema.parse(result)).toEqual(result);
  });

  it("blocks ROI and payback claims when financial model evidence is missing", () => {
    const registryWithoutFinance = {
      ...valueHypothesisRegistry,
      hypotheses: valueHypothesisRegistry.hypotheses.map((hypothesis: any) =>
        hypothesis.hypothesis_id === "agentic_business_reporting"
          ? {
              ...hypothesis,
              current_evidence_state: hypothesis.current_evidence_state.map((evidence: any) =>
                evidence.evidence_type === "financial_model"
                  ? {
                      ...evidence,
                      evidence_present: false,
                      claim_readiness: "not_measured",
                      evidence_strength: "unverified"
                    }
                  : evidence
              )
            }
          : hypothesis
      )
    };

    const result = generateStrongestSafeClaim({
      graph: customerSafeGraph,
      maturity_model: maturityModel,
      value_hypothesis_registry: registryWithoutFinance,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      preferred_hypothesis_id: "agentic_business_reporting"
    });

    expect(result.strongest_claim.maturity_stage).not.toBe("finance_approved");
    expect(result.strongest_claim.safe_claim_language).not.toMatch(/ROI|payback/i);
    expect(result.evidence_gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidence_type: "financial_model",
          blocks: "finance_approved"
        })
      ])
    );
    expect(result.blocked_stronger_claims.join(" ")).toMatch(/ROI|payback|finance-approved/i);
  });

  it("rejects unsafe input fields before generating claim language", () => {
    expect(() =>
      generateStrongestSafeClaim({
        graph: {
          ...customerSafeGraph,
          raw_prompt: "unsafe"
        },
        maturity_model: maturityModel,
        value_hypothesis_registry: valueHypothesisRegistry,
        outcome_instrumentation_map: outcomeInstrumentationMap
      })
    ).toThrow(/raw_prompt|forbidden/);
  });
});

describe("Nielsen-style AI Work Value Graph demo", () => {
  it("shows the full journey from survey opportunity to finance-approved claim", () => {
    const demo = buildAiWorkValueDemo(aiWorkValueDemo);

    expect(demo.schema_version).toBe("AIWVG_DEMO_2026_05");
    expect(demo.positioning.roi_role).toBe("final_claim_layer");
    expect(demo.positioning.core_product_questions).toEqual(
      expect.arrayContaining([
        "What work is AI participating in?",
        "What maturity stage is that work at?",
        "What claims are safe today?"
      ])
    );
    expect(demo.journey_steps.map((step) => step.step_id)).toEqual([
      "survey_opportunity",
      "search_chat_telemetry",
      "repeatable_work_patterns",
      "skills_artifacts",
      "agentic_execution",
      "governed_action",
      "outcome_linked_evidence",
      "finance_approved_value_claim"
    ]);
    expect(demo.journey_steps.at(-1)?.maturity_stage).toBe("finance_approved");
    expect(demo.journey_steps.at(-1)?.roi_position).toBe("final_layer");
    expect(AiWorkValueDemoSchema.parse(demo)).toEqual(demo);
  });

  it("rejects hidden reconstruction and person-level fields in the demo contract", () => {
    const unsafe = {
      ...aiWorkValueDemo,
      journey_steps: [
        {
          ...aiWorkValueDemo.journey_steps[0],
          query_text: "unsafe"
        },
        ...aiWorkValueDemo.journey_steps.slice(1)
      ]
    };

    expect(AiWorkValueDemoSchema.safeParse(unsafe).success).toBe(false);
  });
});
