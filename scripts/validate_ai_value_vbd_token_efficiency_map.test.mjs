import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTelemetryEvidenceSnapshotDraft,
  buildTokenEfficiencySignalFromAggregateSummary,
  buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal,
  validateEvidenceSnapshot,
  validateTokenEfficiencySignal,
  validateVbdTokenEfficiencyMap
} from "../shared/dist/aiValueEngine/index.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

function highVbdOperatingMap() {
  return {
    velocity: {
      state: "high",
      evidence_state: "present",
      source_signals: ["workflow_run_count", "active_user_aggregate"],
      caveats: ["Velocity is aggregate Layer 1 posture only."]
    },
    breadth: {
      state: "broad",
      approved_aggregate_grain: "function",
      covered_slices: 6,
      suppressed_or_unknown_slices: 0,
      caveats: ["Breadth is aggregate-only."]
    },
    depth: {
      state: "embedded",
      evidence_state: "present",
      source_signals: ["agent_lifecycle_activity", "artifact_output_metadata"],
      requires_layer_3_for_value_claim: true,
      caveats: ["Depth is work-integration posture only."]
    },
    operating_mode: "high_fluency_flow",
    contributes_to_playbook_layer: "layer_1_platform_telemetry",
    allowed_interpretation: [
      "ai_fluency_posture",
      "layer_1_operating_signal",
      "evidence_collection_planning"
    ],
    blocked_interpretation: [...REQUIRED_BLOCKED_USES]
  };
}

function shallowVbdOperatingMap() {
  return {
    ...highVbdOperatingMap(),
    velocity: {
      state: "low",
      evidence_state: "present",
      source_signals: ["workflow_run_count"],
      caveats: ["Velocity is low in this aggregate window."]
    },
    breadth: {
      state: "narrow",
      approved_aggregate_grain: "function",
      covered_slices: 2,
      suppressed_or_unknown_slices: 0,
      caveats: ["Breadth remains narrow."]
    },
    depth: {
      state: "shallow",
      evidence_state: "present",
      source_signals: ["chat_or_assistant_activity"],
      requires_layer_3_for_value_claim: true,
      caveats: ["Depth remains shallow."]
    },
    operating_mode: "low_integration"
  };
}

function emergingVbdOperatingMap() {
  return {
    ...highVbdOperatingMap(),
    velocity: {
      state: "moderate",
      evidence_state: "partial",
      source_signals: ["workflow_run_count", "active_user_aggregate"],
      caveats: ["Velocity is partial aggregate Layer 1 posture only."]
    },
    breadth: {
      state: "emerging",
      approved_aggregate_grain: "function",
      covered_slices: 4,
      suppressed_or_unknown_slices: 0,
      caveats: ["Breadth is emerging across approved aggregate slices."]
    },
    depth: {
      state: "developing",
      evidence_state: "partial",
      source_signals: ["repeat_workflow_behavior", "artifact_output_metadata"],
      requires_layer_3_for_value_claim: true,
      caveats: ["Depth is developing aggregate posture only."]
    },
    operating_mode: "fast_but_shallow"
  };
}

function baseSnapshot(overrides = {}) {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_northstar_support",
    workflowFamily: "customer_support",
    workflowName: "Customer support",
    functionArea: "customer_success",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-16T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_support_vbd_token_2026_05",
    measurementPlanId: "measurement_plan_support_vbd_token_2026_05",
    aggregateTelemetrySummary: {
      probe_window_start: "2026-05-01",
      probe_window_end: "2026-05-31",
      aggregate_event_count: 125000,
      table_families_checked: [
        "scrubbed_llm_call",
        "scrubbed_client_analytics",
        "scrubbed_workflows"
      ],
      approved_field_coverage_summary: {
        approved_fields_expected: 24,
        approved_fields_found: 20,
        approved_fields_missing: 4
      },
      k_min_summary: {
        total_slices: 6,
        k_min_clear_slices: 6,
        suppressed_or_unknown_slices: 0,
        minimum_cohort_threshold: 5
      }
    },
    sourceRefs: {
      bigquery_probe_result_id: "bq_probe_support_vbd_token_2026_05",
      source_readiness_ids: ["source_readiness_support_vbd_token_2026_05"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    }
  });
  const merged = {
    ...snapshot,
    privacy_boundary: {
      ...snapshot.privacy_boundary,
      approved_aggregate_grain: "function",
      minimum_cohort_threshold: 5
    },
    vbd_operating_map: highVbdOperatingMap(),
    required_caveats: [
      ...snapshot.required_caveats,
      "High fluency flow is Layer 1 posture only and is not full value proof."
    ],
    ...overrides
  };
  return merged;
}

function tokenSummary(overrides = {}) {
  return {
    org_id: "org_northstar_support",
    workflow_family: "customer_support",
    workflow_name: "Customer support",
    function_area: "customer_success",
    generated_at: "2026-06-16T00:00:00.000Z",
    covered_window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    approved_aggregate_grain: "function",
    minimum_cohort_threshold: 5,
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 6,
      k_min_clear_slices: 6,
      suppressed_or_unknown_slices: 0
    },
    aggregate_token_summary: {
      total_prompt_tokens: 120000,
      total_completion_tokens: 42000,
      total_tokens: 162000,
      model_families_observed: ["gpt-4.1", "gpt-4.1-mini"],
      aggregate_interaction_count: 840,
      aggregate_workflow_count: 120,
      high_intensity_workflow_share: 0.18,
      average_tokens_per_interaction: 193,
      average_tokens_per_workflow: 1350,
      prompt_to_completion_ratio: 2.86
    },
    source_refs: {
      aggregate_probe_id: "token_probe_customer_support_2026_05",
      source_readiness_id: "source_readiness_token_usage_2026_05"
    },
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_data_owner",
      attested_at: "2026-06-16T00:00:00.000Z",
      caveats: []
    },
    ...overrides
  };
}

function tokenSignal(summaryOverrides = {}, optionOverrides = {}) {
  return buildTokenEfficiencySignalFromAggregateSummary(
    tokenSummary(summaryOverrides),
    {
      signalId: "token_efficiency_signal_support_2026_05",
      generatedAt: "2026-06-16T00:00:00.000Z",
      ...optionOverrides
    }
  );
}

function highIntensityTokenSignal() {
  return tokenSignal({
    aggregate_token_summary: {
      total_prompt_tokens: 980000,
      total_completion_tokens: 220000,
      total_tokens: 1200000,
      model_families_observed: ["gpt-4.1", "gpt-4.1-mini"],
      aggregate_interaction_count: 840,
      aggregate_workflow_count: 120,
      high_intensity_workflow_share: 0.72,
      average_tokens_per_interaction: 1428,
      average_tokens_per_workflow: 10000,
      prompt_to_completion_ratio: 4.45
    }
  });
}

function moderateTokenSignal() {
  return tokenSignal({
    aggregate_token_summary: {
      total_prompt_tokens: 230000,
      total_completion_tokens: 70000,
      total_tokens: 300000,
      model_families_observed: ["gpt-4.1", "gpt-4.1-mini"],
      aggregate_interaction_count: 840,
      aggregate_workflow_count: 120,
      high_intensity_workflow_share: 0.3,
      average_tokens_per_interaction: 357,
      average_tokens_per_workflow: 2500,
      prompt_to_completion_ratio: 3.29
    }
  });
}

function buildMap(snapshot = baseSnapshot(), signal = tokenSignal(), options = {}) {
  return buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(snapshot, signal, {
    mapId: "vbd_token_efficiency_map_support_2026_05",
    generatedAt: "2026-06-16T00:00:00.000Z",
    ...options
  });
}

function expectValidMap(map) {
  const result = validateVbdTokenEfficiencyMap(map);
  assert.equal(result.valid, true, result.gaps.join("; "));
  return result;
}

test("high VBD plus efficient token posture maps to replicate pattern", () => {
  const snapshot = baseSnapshot();
  const signal = tokenSignal();
  assert.equal(validateEvidenceSnapshot(snapshot).valid, true);
  assert.equal(validateTokenEfficiencySignal(signal).valid, true);

  const map = buildMap(snapshot, signal);

  expectValidMap(map);
  assert.equal(map.valid, true, map.gaps.join("; "));
  assert.equal(map.strategy_zone, "replicate_pattern");
  assert.equal(map.vbd_posture, "high_work_integration");
  assert.equal(map.token_posture, "efficient");
  assert.equal(map.feeds.claim_readiness_snapshot, false);
  assert.equal(map.feeds.executive_readout_snapshot, false);
  assert.equal(map.feeds.reportability_readiness, false);
  assert.equal(map.feeds.customer_facing_financial_output, false);
});

test("high VBD plus high token intensity maps to optimize cost", () => {
  const map = buildMap(baseSnapshot(), highIntensityTokenSignal());

  expectValidMap(map);
  assert.equal(map.strategy_zone, "optimize_cost");
  assert.equal(map.vbd_posture, "high_work_integration");
  assert.equal(map.token_posture, "high_intensity");
});

test("high VBD plus moderate token posture maps to optimize cost, not replicate", () => {
  const map = buildMap(baseSnapshot(), moderateTokenSignal());

  expectValidMap(map);
  assert.equal(map.strategy_zone, "optimize_cost");
  assert.equal(map.vbd_posture, "high_work_integration");
  assert.equal(map.token_posture, "moderate");
});

test("normal emerging VBD snapshot maps to emerging work integration", () => {
  const map = buildMap(
    baseSnapshot({ vbd_operating_map: emergingVbdOperatingMap() }),
    tokenSignal()
  );

  expectValidMap(map);
  assert.equal(map.vbd_posture, "emerging_work_integration");
  assert.equal(map.strategy_zone, "replicate_pattern");
});

test("shallow VBD plus efficient token posture maps to activate workflow", () => {
  const map = buildMap(baseSnapshot({ vbd_operating_map: shallowVbdOperatingMap() }), tokenSignal());

  expectValidMap(map);
  assert.equal(map.strategy_zone, "activate_workflow");
  assert.equal(map.vbd_posture, "shallow_work_integration");
  assert.equal(map.token_posture, "efficient");
});

test("shallow VBD plus high token intensity maps to mitigate friction", () => {
  const map = buildMap(
    baseSnapshot({ vbd_operating_map: shallowVbdOperatingMap() }),
    highIntensityTokenSignal()
  );

  expectValidMap(map);
  assert.equal(map.strategy_zone, "mitigate_friction");
  assert.equal(map.vbd_posture, "shallow_work_integration");
  assert.equal(map.token_posture, "high_intensity");
});

test("suppressed or not-computed breadth holds VBD maps", () => {
  for (const state of ["suppressed", "not_computed", "missing"]) {
    const map = buildMap(
      baseSnapshot({
        vbd_operating_map: {
          ...highVbdOperatingMap(),
          breadth: {
            ...highVbdOperatingMap().breadth,
            state,
            evidence_state: "present",
            caveats: [`Breadth is ${state} and cannot be inferred from other dimensions.`]
          }
        }
      }),
      tokenSignal(),
      { mapId: `vbd_token_efficiency_map_breadth_${state}` }
    );

    expectValidMap(map);
    assert.equal(map.strategy_zone, "hold_for_evidence", state);
    assert.notEqual(map.vbd_posture, "high_work_integration", state);
  }
});

test("suppressed or held dimension evidence wins over stale positive posture labels", () => {
  for (const evidenceState of ["suppressed", "held", "not_computed"]) {
    const map = buildMap(
      baseSnapshot({
        vbd_operating_map: {
          ...highVbdOperatingMap(),
          velocity: {
            ...highVbdOperatingMap().velocity,
            state: "high",
            evidence_state: evidenceState,
            caveats: [`Velocity evidence is ${evidenceState} and cannot be interpreted.`]
          }
        }
      }),
      tokenSignal(),
      { mapId: `vbd_token_efficiency_map_velocity_evidence_${evidenceState}` }
    );

    expectValidMap(map);
    assert.equal(map.strategy_zone, "hold_for_evidence", evidenceState);
    assert.notEqual(map.vbd_posture, "high_work_integration", evidenceState);
  }
});

test("emerging VBD maps hold when aggregate slices are suppressed", () => {
  const snapshot = baseSnapshot({
    aggregate_telemetry_summary: {
      ...baseSnapshot().aggregate_telemetry_summary,
      k_min_summary: {
        total_slices: 6,
        k_min_clear_slices: 5,
        suppressed_or_unknown_slices: 1,
        minimum_cohort_threshold: 5
      }
    },
    vbd_operating_map: {
      ...emergingVbdOperatingMap(),
      breadth: {
        ...emergingVbdOperatingMap().breadth,
        covered_slices: 5,
        suppressed_or_unknown_slices: 1,
        caveats: [
          "Suppressed or unknown slices are preserved and cannot be interpreted as covered breadth."
        ]
      }
    }
  });
  assert.equal(validateEvidenceSnapshot(snapshot).valid, true);

  const map = buildMap(snapshot, tokenSignal());

  expectValidMap(map);
  assert.equal(map.vbd_posture, "held");
  assert.equal(map.strategy_zone, "hold_for_evidence");
});

test("map fails closed when token signal and snapshot source bindings drift", () => {
  const map = buildMap(baseSnapshot(), tokenSignal({ org_id: "org_other" }));

  assert.equal(map.valid, false);
  assert.equal(map.strategy_zone, "hold_for_evidence");
  assert.equal(map.feeds.claim_readiness_snapshot, false);
  assert.ok(map.gaps.some((gap) => /org_id/i.test(gap)), map.gaps.join("; "));
});

test("map fails closed when k-min bindings drift between snapshot and token signal", () => {
  const signal = tokenSignal({
    minimum_cohort_threshold: 10,
    k_min_posture: {
      minimum_cohort_threshold: 10,
      cohort_threshold_met: true,
      total_slices: 6,
      k_min_clear_slices: 6,
      suppressed_or_unknown_slices: 0
    }
  });
  const map = buildMap(baseSnapshot(), signal);

  assert.equal(map.valid, false);
  assert.equal(map.strategy_zone, "hold_for_evidence");
  assert.ok(
    map.gaps.some((gap) => /minimum_cohort_threshold/i.test(gap)),
    map.gaps.join("; ")
  );
});

test("map uses telemetry k-min threshold when privacy boundary threshold is held", () => {
  const snapshot = baseSnapshot({
    privacy_boundary: {
      ...baseSnapshot().privacy_boundary,
      minimum_cohort_threshold: null
    }
  });
  assert.equal(validateEvidenceSnapshot(snapshot).valid, true);

  const map = buildMap(snapshot, tokenSignal({
    minimum_cohort_threshold: 10,
    k_min_posture: {
      minimum_cohort_threshold: 10,
      cohort_threshold_met: true,
      total_slices: 6,
      k_min_clear_slices: 6,
      suppressed_or_unknown_slices: 0
    }
  }));

  assert.equal(map.valid, false);
  assert.equal(map.strategy_zone, "hold_for_evidence");
  assert.ok(
    map.gaps.some((gap) => /minimum_cohort_threshold/i.test(gap)),
    map.gaps.join("; ")
  );
});

test("held token evidence produces hold zone and cannot feed downstream claims", () => {
  const heldSignal = tokenSignal(
    {
      k_min_posture: {
        minimum_cohort_threshold: 5,
        cohort_threshold_met: false,
        total_slices: 6,
        k_min_clear_slices: 4,
        suppressed_or_unknown_slices: 2
      }
    },
    {
      evidenceState: "held",
      caveats: ["Token evidence held because k-min did not clear."]
    }
  );
  const map = buildMap(baseSnapshot(), heldSignal);

  expectValidMap(map);
  assert.equal(map.valid, true);
  assert.equal(map.strategy_zone, "hold_for_evidence");
  assert.equal(map.token_posture, "held");
  assert.equal(map.feeds.claim_readiness_snapshot, false);
  assert.equal(map.feeds.customer_facing_financial_output, false);
});

test("validator rejects serialized maps with inconsistent gaps, postures, or zones", () => {
  const base = buildMap();
  expectValidMap(base);

  for (const unsafe of [
    { ...clone(base), gaps: ["manually carried caveat"] },
    { ...clone(base), vbd_posture: "held", strategy_zone: "replicate_pattern" },
    { ...clone(base), token_posture: "suppressed", strategy_zone: "optimize_cost" },
    { ...clone(base), token_posture: "moderate", strategy_zone: "replicate_pattern" }
  ]) {
    const result = validateVbdTokenEfficiencyMap(unsafe);
    assert.equal(result.valid, false, JSON.stringify(unsafe));
  }
});

test("map rejects ROI, productivity, causality, ranking, or financial output fields", () => {
  const map = buildMap();
  expectValidMap(map);

  for (const field of [
    "roi",
    "productivity_score",
    "causality_claim",
    "manager_or_team_ranking",
    "customer_facing_financial_output"
  ]) {
    const unsafe = clone(map);
    unsafe[field] = true;
    const result = validateVbdTokenEfficiencyMap(unsafe);
    assert.equal(result.valid, false, `${field} should fail closed`);
    assert.ok(
      result.gaps.some((gap) => new RegExp(field).test(gap)),
      `${field}: ${result.gaps.join("; ")}`
    );
  }
});

test("map rejects unsafe metadata values in serialized source refs and caveats", () => {
  const map = buildMap();
  expectValidMap(map);

  for (const unsafe of [
    {
      ...clone(map),
      source_refs: {
        ...map.source_refs,
        token_source_refs: {
          aggregate_probe_id: "raw_prompts_export",
          source_readiness_id: "source_readiness_token_usage_2026_05"
        }
      }
    },
    {
      ...clone(map),
      source_refs: {
        ...map.source_refs,
        token_source_refs: {
          aggregate_probe_id: "user_email_export",
          source_readiness_id: "source_readiness_token_usage_2026_05"
        }
      }
    },
    {
      ...clone(map),
      source_refs: {
        ...map.source_refs,
        token_source_refs: {
          aggregate_probe_id: "user_name_lookup",
          source_readiness_id: "employee_ids_export"
        }
      }
    },
    {
      ...clone(map),
      source_refs: {
        ...map.source_refs,
        allowed_uses: ["employee_email"]
      }
    },
    {
      ...clone(map),
      caveats: [
        ...map.caveats,
        "This caveat references employee_email metadata."
      ]
    }
  ]) {
    const result = validateVbdTokenEfficiencyMap(unsafe);
    assert.equal(result.valid, false, result.gaps.join("; "));
  }
});

test("map allows negative privacy caveats that name blocked artifacts", () => {
  const map = {
    ...clone(buildMap()),
    caveats: [
      ...buildMap().caveats,
      "No raw prompts, raw responses, transcripts, query text, tool payloads, or file contents are emitted."
    ]
  };

  expectValidMap(map);
});

test("map rejects direct identifiers even inside negative privacy caveats", () => {
  const map = {
    ...clone(buildMap()),
    caveats: [
      ...buildMap().caveats,
      "No employee email jane@example.com is emitted."
    ]
  };

  const result = validateVbdTokenEfficiencyMap(map);
  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) => /Forbidden metadata value/i.test(gap)),
    result.gaps.join("; ")
  );
});

test("map examples validate", () => {
  for (const name of [
    "valid-replicate-map.json",
    "valid-mitigate-map.json",
    "held-map.json"
  ]) {
    const example = JSON.parse(
      readFileSync(`docs/contracts/ai-value-vbd-token-efficiency-map/examples/${name}`, "utf8")
    );
    const result = validateVbdTokenEfficiencyMap(example);
    assert.equal(result.valid, true, `${name}: ${result.gaps.join("; ")}`);
  }
});
