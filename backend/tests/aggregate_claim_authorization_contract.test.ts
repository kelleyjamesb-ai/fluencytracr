import { aiValueEngine } from "@fluencytracr/shared";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  getAiValueObject,
  listAiValueObjects,
  readAiValueClaimPacketIdByBindingId,
  upsertAiValueObject
} from "../src/repositories/ai-value-object.repository";
import { store } from "../src/store";

const {
  AGGREGATE_CLAIM_CAVEATS,
  AGGREGATE_CLAIM_HELD_REASON,
  AGGREGATE_CLAIM_METRIC_IDS,
  AGGREGATE_CLAIM_MEASUREMENT_UNITS,
  AGGREGATE_CLAIM_SOURCE_SYSTEMS,
  AGGREGATE_CLAIM_SOURCE_GRAPH_SCHEMA_VERSION,
  AggregateClaimHeldResponseSchema,
  AggregateAuthorizedClaimContentSchema,
  AggregateObservedMovementSchema,
  aggregateClaimBundleReconciles,
  aggregateClaimFixedHeldResponse,
  aggregateClaimHash,
  aggregateClaimPolicyState,
  aggregateClaimSourceRefCommitment,
  aggregateManifestIdFromPacketId,
  buildAggregateClaimAuthorizationBundle,
  buildAggregateClaimSourceGraphSeal,
  buildAggregateObservedMovement
} = aiValueEngine;

const sourceObjects = () => ({
  outcomeEvidenceExport: {
    schema_version: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
    export_id: "outcome_export_exact",
    org_id: "org-northstar",
    workflow_family: "customer_support_case_resolution",
    source_system: {
      source_type: "support_system",
      source_name: "Support case management system",
      approved_grain: "aggregate_workflow_window"
    },
    attestation: {
      exported_by_role: "customer_data_owner",
      approved_by_role: "customer_business_sponsor",
      export_date: "2026-07-28",
      contains_person_level_data: false,
      contains_raw_content: false
    },
    windows: {
      baseline: "2026-02-01_to_2026-03-31",
      comparison: "2026-04-01_to_2026-05-31"
    },
    admission: {
      policy_version: "FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07",
      workflow_id: "customer_support_case_resolution",
      jbtd_id: "resolve_support_case",
      persona_id: "support_specialist",
      baseline_window: {
        period_start: "2026-02-01T00:00:00.000Z",
        period_end: "2026-03-31T00:00:00.000Z",
        evidence_ids: ["evidence_baseline"]
      },
      comparison_window: {
        period_start: "2026-04-01T00:00:00.000Z",
        period_end: "2026-05-31T00:00:00.000Z",
        evidence_ids: ["evidence_comparison"]
      }
    },
    metrics: [
      {
        metric_id: "support_median_resolution_hours",
        measurement_unit: "hours",
        baseline_value: 18.4,
        comparison_value: 15.1,
        eligible_population: 100
      }
    ],
    review: { review_state: "SUBMITTED" }
  },
  blueprint: {
    blueprint_id: "bp_customer_support",
    workflow_family: "customer_support_case_resolution",
    windows: {
      baseline: "2026-02-01_to_2026-03-31",
      comparison: "2026-04-01_to_2026-05-31"
    }
  },
  metricsLibrary: {
    library_id: "metrics_customer_support",
    workflow_family: "customer_support_case_resolution",
    metrics: [
      {
        metric_id: "support_median_resolution_hours",
        measurement_unit: "hours"
      }
    ]
  },
  scenario: {
    scenario_id: "scenario_customer_support",
    input: {
      workflow_family: "customer_support_case_resolution"
    }
  }
});

const comparisonReceipt = {
  policy_version: "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07",
  release_id: "00000000-0000-4000-8000-000000000001",
  proof_journal_id: "00000000-0000-4000-8000-000000000002",
  reservation_key: "1".repeat(64),
  content_fingerprint: "2".repeat(64),
  projection_hash: "3".repeat(64),
  comparison_privacy_only: true,
  claim_authority_effect: "NONE",
  claim_authorized: false,
  model_authorized: false,
  customer_publishable: false
};

const comparisonProjection = {
  policy_version: "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07",
  org_id: "org-northstar",
  workflow_id: "customer_support_case_resolution",
  jbtd_id: "resolve_support_case",
  persona_id: "support_specialist",
  outcome_metric: "support_median_resolution_hours",
  outcome_unit: "hours",
  source_system: "Support case management system",
  baseline_window: {
    period_start: "2026-02-01T00:00:00.000Z",
    period_end: "2026-03-31T00:00:00.000Z",
    evidence_id: "evidence_baseline",
    cohort_size: 100,
    aggregate_value: 18.4
  },
  comparison_window: {
    period_start: "2026-04-01T00:00:00.000Z",
    period_end: "2026-05-31T00:00:00.000Z",
    evidence_id: "evidence_comparison",
    cohort_size: 100,
    aggregate_value: 15.1
  }
};

describe("aggregate claim authorization contracts", () => {
  beforeEach(() => {
    store.reset();
  });

  it("normalizes arithmetic and holds on finite-endpoint overflow", () => {
    const movement = buildAggregateObservedMovement({
      metricId: "support_median_resolution_hours",
      measurementUnit: "hours",
      baselineValue: -0,
      comparisonValue: -0
    });
    expect(Object.is(movement.baseline_value, -0)).toBe(false);
    expect(Object.is(movement.comparison_value, -0)).toBe(false);
    expect(Object.is(movement.absolute_delta, -0)).toBe(false);
    expect(movement.percent_change).toBeUndefined();
    expect(movement.observed_direction).toBe("NO_CHANGE");
    expect(() =>
      buildAggregateObservedMovement({
        metricId: "support_median_resolution_hours",
        measurementUnit: "hours",
        baselineValue: -Number.MAX_VALUE,
        comparisonValue: Number.MAX_VALUE
      })
    ).toThrow("AGGREGATE_CLAIM_NONFINITE_DELTA");
  });

  it("omits non-finite percent change and rejects blocked claim semantics", () => {
    const movement = buildAggregateObservedMovement({
      metricId: "support_median_resolution_hours",
      measurementUnit: "hours",
      baselineValue: Number.MIN_VALUE,
      comparisonValue: 1
    });
    expect(movement.absolute_delta).toBe(1);
    expect(movement.percent_change).toBeUndefined();
    expect(() =>
      buildAggregateObservedMovement({
        metricId: "individual_productivity_score",
        measurementUnit: "points",
        baselineValue: 1,
        comparisonValue: 2
      })
    ).toThrow();
  });

  it("keeps the source seal stable across review and detects same-id mutation", () => {
    const objects = sourceObjects();
    const submitted = buildAggregateClaimSourceGraphSeal(objects);
    const accepted = buildAggregateClaimSourceGraphSeal({
      ...objects,
      outcomeEvidenceExport: {
        ...objects.outcomeEvidenceExport,
        review: {
          review_state: "ACCEPTED",
          reviewer_role: "ADMIN",
          reviewed_at: "2026-07-28T12:00:00.000Z"
        }
      }
    });
    expect(submitted.schema_version).toBe(AGGREGATE_CLAIM_SOURCE_GRAPH_SCHEMA_VERSION);
    expect(accepted).toEqual(submitted);
    const changed = buildAggregateClaimSourceGraphSeal({
      ...objects,
      blueprint: {
        ...objects.blueprint,
        windows: {
          baseline: "2026-01-01_to_2026-01-31",
          comparison: "2026-04-01_to_2026-05-31"
        }
      }
    });
    expect(changed.blueprint_hash).not.toBe(submitted.blueprint_hash);
    expect(changed.source_graph_hash).not.toBe(submitted.source_graph_hash);
  });

  it("derives non-circular IDs and rejects packet or manifest substitution", () => {
    const objects = sourceObjects();
    const sourceGraphSeal = buildAggregateClaimSourceGraphSeal(objects);
    const movement = buildAggregateObservedMovement({
      metricId: "support_median_resolution_hours",
      measurementUnit: "hours",
      baselineValue: 18.4,
      comparisonValue: 15.1
    });
    const bundleInput = {
      sourceGraphSeal,
      readinessId: "readiness_exact",
      readinessHash: aggregateClaimHash("FT_TEST_READINESS", { readiness_id: "readiness_exact" }),
      acceptedExportPayloadHash: aggregateClaimHash(
        "FT_TEST_EXPORT",
        objects.outcomeEvidenceExport
      ),
      acceptedReviewHash: aggregateClaimHash("FT_TEST_REVIEW", { review_state: "ACCEPTED" }),
      comparisonPrivacyReceipt: comparisonReceipt,
      comparisonProjection,
      policyState: aggregateClaimPolicyState(),
      claimContent: {
        policy_version: "FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07",
        template_id: "FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1",
        org_id: "org-northstar",
        workflow_id: "customer_support_case_resolution",
        jbtd_id: "resolve_support_case",
        persona_id: "support_specialist",
        movement,
        caveats: [...AGGREGATE_CLAIM_CAVEATS],
        model_use_authorized: false,
        customer_facing_output_authorized: false
      }
    };
    const bundle = buildAggregateClaimAuthorizationBundle(bundleInput);
    const canonicalCoreCommitment = "a".repeat(64);
    const canonicalBundle = buildAggregateClaimAuthorizationBundle({
      ...bundleInput,
      canonicalIdentityCoreCommitment: canonicalCoreCommitment
    });
    const changedCanonicalBundle = buildAggregateClaimAuthorizationBundle({
      ...bundleInput,
      canonicalIdentityCoreCommitment: "b".repeat(64)
    });
    expect(aggregateManifestIdFromPacketId(bundle.packet.packet_id)).toBe(
      bundle.manifest.manifest_id
    );
    expect(bundle.claim.content).not.toHaveProperty("canonical_identity_core_commitment");
    expect(canonicalBundle.claim.content.canonical_identity_core_commitment).toBe(
      canonicalCoreCommitment
    );
    expect(canonicalBundle.packet.content.canonical_identity_core_commitment).toBe(
      canonicalCoreCommitment
    );
    expect(canonicalBundle.manifest.core.canonical_identity_core_commitment).toBe(
      canonicalCoreCommitment
    );
    expect(canonicalBundle.claim.claim_id).not.toBe(bundle.claim.claim_id);
    expect(canonicalBundle.packet.packet_id).not.toBe(bundle.packet.packet_id);
    expect(canonicalBundle.manifest.manifest_id).not.toBe(bundle.manifest.manifest_id);
    expect(changedCanonicalBundle.packet.packet_id).not.toBe(canonicalBundle.packet.packet_id);
    expect(aggregateClaimBundleReconciles(canonicalBundle)).toBe(true);
    expect(
      aggregateClaimBundleReconciles({
        ...canonicalBundle,
        manifest: {
          ...canonicalBundle.manifest,
          core: {
            ...canonicalBundle.manifest.core,
            canonical_identity_core_commitment: "c".repeat(64)
          }
        }
      })
    ).toBe(false);
    expect(bundle.packet.content.claim_content_hash).toBe(bundle.claim.content_hash);
    expect(aggregateClaimBundleReconciles(bundle)).toBe(true);
    expect(() =>
      buildAggregateClaimAuthorizationBundle({
        ...bundleInput,
        claimContent: {
          ...bundleInput.claimContent,
          movement: {
            ...bundleInput.claimContent.movement,
            absolute_delta: 999,
            percent_change: 54321,
            observed_direction: "INCREASE" as const
          }
        }
      })
    ).toThrow("AGGREGATE_CLAIM_DERIVED_MOVEMENT_MISMATCH");
    expect(
      aggregateClaimBundleReconciles({
        ...bundle,
        packet: {
          ...bundle.packet,
          content: {
            ...bundle.packet.content,
            movement: {
              ...bundle.packet.content.movement,
              comparison_value: 999
            }
          }
        }
      })
    ).toBe(false);
    for (const unsafeProjection of [
      { ...comparisonProjection, outcome_metric: "james.kelley@glean.com" },
      { ...comparisonProjection, outcome_unit: "james.kelley@glean.com" },
      { ...comparisonProjection, source_system: "james.kelley@glean.com" }
    ]) {
      expect(() =>
        buildAggregateClaimAuthorizationBundle({
          ...bundleInput,
          comparisonProjection: unsafeProjection
        })
      ).toThrow();
    }
    expect(() =>
      buildAggregateClaimAuthorizationBundle({
        ...bundleInput,
        claimContent: {
          ...bundleInput.claimContent,
          persona_id: "employee_12345"
        }
      })
    ).toThrow();
    expect(() =>
      buildAggregateClaimAuthorizationBundle({
        ...bundleInput,
        sourceGraphSeal: {
          ...sourceGraphSeal,
          scenario_id: "outcome_caused_by_ai"
        }
      })
    ).toThrow();
  });

  it("persists only commitments when authoritative identities contain person-shaped text", () => {
    const objects = sourceObjects();
    objects.outcomeEvidenceExport.export_id = "james_kelley";
    objects.blueprint.blueprint_id = "james_kelley";
    objects.metricsLibrary.library_id = "james_kelley";
    objects.scenario.scenario_id = "james_kelley";
    const sourceGraphSeal = buildAggregateClaimSourceGraphSeal(objects);
    const movement = buildAggregateObservedMovement({
      metricId: "support_median_resolution_hours",
      measurementUnit: "hours",
      baselineValue: 18.4,
      comparisonValue: 15.1
    });
    const personProjection = {
      ...comparisonProjection,
      org_id: "james_kelley",
      workflow_id: "james_kelley",
      jbtd_id: "james_kelley",
      persona_id: "james_kelley",
      baseline_window: {
        ...comparisonProjection.baseline_window,
        evidence_id: "james_kelley"
      },
      comparison_window: {
        ...comparisonProjection.comparison_window,
        evidence_id: "james_kelley_comparison"
      }
    };
    const bundle = buildAggregateClaimAuthorizationBundle({
      sourceGraphSeal,
      readinessId: "james_kelley",
      readinessHash: "4".repeat(64),
      acceptedExportPayloadHash: "5".repeat(64),
      acceptedReviewHash: "6".repeat(64),
      comparisonPrivacyReceipt: comparisonReceipt,
      comparisonProjection: personProjection,
      policyState: aggregateClaimPolicyState(),
      claimContent: {
        policy_version: "FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07",
        template_id: "FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1",
        org_id: "james_kelley",
        workflow_id: "james_kelley",
        jbtd_id: "james_kelley",
        persona_id: "james_kelley",
        movement,
        caveats: [...AGGREGATE_CLAIM_CAVEATS],
        model_use_authorized: false,
        customer_facing_output_authorized: false
      }
    });

    expect(JSON.stringify(bundle)).not.toContain("james_kelley");
    expect(bundle.claim.content).toMatchObject({
      slice_commitment: expect.stringMatching(/^[0-9a-f]{64}$/)
    });
    expect(bundle.manifest.core).toMatchObject({
      slice_commitment: bundle.claim.content.slice_commitment,
      readiness_ref_commitment: expect.stringMatching(/^[0-9a-f]{64}$/),
      comparison_projection_commitment: expect.stringMatching(/^[0-9a-f]{64}$/)
    });
    expect(bundle.manifest.core.source_graph).toEqual(
      expect.not.objectContaining({
        outcome_evidence_export_id: expect.anything(),
        blueprint_id: expect.anything(),
        metrics_library_id: expect.anything(),
        scenario_id: expect.anything()
      })
    );
    expect(
      aggregateClaimSourceRefCommitment(
        "evidence_readiness",
        "james_kelley",
        "4".repeat(64)
      )
    ).not.toBe(
      aggregateClaimSourceRefCommitment("blueprint", "james_kelley", "4".repeat(64))
    );

    const changedProjection = buildAggregateClaimAuthorizationBundle({
      sourceGraphSeal,
      readinessId: "james_kelley",
      readinessHash: "4".repeat(64),
      acceptedExportPayloadHash: "5".repeat(64),
      acceptedReviewHash: "6".repeat(64),
      comparisonPrivacyReceipt: comparisonReceipt,
      comparisonProjection: {
        ...personProjection,
        comparison_window: {
          ...personProjection.comparison_window,
          evidence_id: "james_kelley_alternate"
        }
      },
      policyState: aggregateClaimPolicyState(),
      claimContent: {
        policy_version: "FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07",
        template_id: "FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1",
        org_id: "james_kelley",
        workflow_id: "james_kelley",
        jbtd_id: "james_kelley",
        persona_id: "james_kelley",
        movement,
        caveats: [...AGGREGATE_CLAIM_CAVEATS],
        model_use_authorized: false,
        customer_facing_output_authorized: false
      }
    });
    expect(changedProjection.manifest.core.comparison_projection_commitment).not.toBe(
      bundle.manifest.core.comparison_projection_commitment
    );
    expect(changedProjection.manifest.manifest_id).not.toBe(bundle.manifest.manifest_id);
  });

  it("returns one fixed redacted HOLD shape", () => {
    const held = aggregateClaimFixedHeldResponse();
    expect(held).toEqual({
      decision: "HOLD",
      reason_family: AGGREGATE_CLAIM_HELD_REASON,
      persisted: []
    });
    expect(AggregateClaimHeldResponseSchema.parse(held)).toEqual(held);
    expect(JSON.stringify(held)).not.toMatch(
      /movement|claim_id|packet_id|manifest|hash|baseline|comparison/
    );
  });

  it("rejects reserved internal types at the generic repository boundary", async () => {
    for (const objectType of aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPES) {
      await expect(
        upsertAiValueObject({
          orgId: "org-northstar",
          objectType,
          objectId: "forged",
          schemaVersion: "FORGED",
          workflowFamily: null,
          payload: {},
          validation: {},
          valid: true
        })
      ).rejects.toThrow("INTERNAL_AI_VALUE_OBJECT_REQUIRES_IMMUTABLE_REPOSITORY");
      await expect(listAiValueObjects("org-northstar", objectType)).resolves.toEqual([]);
      await expect(getAiValueObject("org-northstar", objectType, "forged")).resolves.toBeNull();
    }
  });

  it("rejects non-binding selectors without exposing reserved objects", async () => {
    expect(
      await readAiValueClaimPacketIdByBindingId(
        "org-northstar",
        "aggregate_packet_guessed"
      )
    ).toBeNull();
    expect(
      await getAiValueObject(
        "org-northstar",
        "canonical_identity_compatibility_binding",
        `canonical_identity_binding_${"0".repeat(64)}`
      )
    ).toBeNull();
    expect(
      await listAiValueObjects(
        "org-northstar",
        "canonical_identity_compatibility_binding"
      )
    ).toEqual([]);
  });

  it("rejects a second movement, altered caveat, or blocked semantic field", () => {
    const objects = sourceObjects();
    const movement = buildAggregateObservedMovement({
      metricId: "support_median_resolution_hours",
      measurementUnit: "hours",
      baselineValue: 18.4,
      comparisonValue: 15.1
    });
    const content = {
      policy_version: "FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07",
      template_id: "FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1",
      slice_commitment: "7".repeat(64),
      movement,
      caveats: [...AGGREGATE_CLAIM_CAVEATS],
      model_use_authorized: false,
      customer_facing_output_authorized: false
    };
    expect(AggregateAuthorizedClaimContentSchema.safeParse(content).success).toBe(true);
    expect(
      AggregateObservedMovementSchema.safeParse({
        ...movement,
        second_movement: movement
      }).success
    ).toBe(false);
    expect(
      AggregateAuthorizedClaimContentSchema.safeParse({
        ...content,
        caveats: [...AGGREGATE_CLAIM_CAVEATS.slice(0, 3), "Customer-facing impact approved."]
      }).success
    ).toBe(false);
    expect(
      AggregateAuthorizedClaimContentSchema.safeParse({
        ...content,
        roi: { value: 1 },
        source_graph: buildAggregateClaimSourceGraphSeal(objects)
      }).success
    ).toBe(false);
  });

  it.each([
    "james.kelley@glean.com",
    "hours caused by AI improvement",
    "customer-facing impact",
    "currency_usd_millions",
    "score"
  ])("rejects identifier-bearing or unsupported unit %s", (measurementUnit) => {
    expect(() =>
      buildAggregateObservedMovement({
        metricId: "support_median_resolution_hours",
        measurementUnit,
        baselineValue: 18.4,
        comparisonValue: 15.1
      })
    ).toThrow();
  });

  it("accepts only the compiled generic Slice D unit vocabulary", () => {
    for (const measurementUnit of AGGREGATE_CLAIM_MEASUREMENT_UNITS) {
      expect(
        buildAggregateObservedMovement({
          metricId: "support_median_resolution_hours",
          measurementUnit,
          baselineValue: 18.4,
          comparisonValue: 15.1
        }).measurement_unit
      ).toBe(measurementUnit);
    }
  });

  it.each([
    "james_kelley",
    "employee_12345",
    "outcome_caused_by_ai",
    "productivityGain",
    "roiSavings"
  ])("rejects identifying or unsupported metric identifier %s", (metricId) => {
    expect(() =>
      buildAggregateObservedMovement({
        metricId,
        measurementUnit: "hours",
        baselineValue: 18.4,
        comparisonValue: 15.1
      })
    ).toThrow();
  });

  it("accepts only the compiled server-owned Slice D metric vocabulary", () => {
    for (const metricId of AGGREGATE_CLAIM_METRIC_IDS) {
      expect(
        buildAggregateObservedMovement({
          metricId,
          measurementUnit: "hours",
          baselineValue: 18.4,
          comparisonValue: 15.1
        }).metric_id
      ).toBe(metricId);
    }
  });

  it("keeps the runtime and JSON Schema vocabularies identical", () => {
    const schema = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          "../../schemas/ai-value-intelligence/aggregate-claim-authorization.schema.json"
        ),
        "utf8"
      )
    );
    expect(schema.$defs.movement.properties.metric_id.enum).toEqual([
      ...AGGREGATE_CLAIM_METRIC_IDS
    ]);
    expect(schema.$defs.movement.properties.measurement_unit.enum).toEqual([
      ...AGGREGATE_CLAIM_MEASUREMENT_UNITS
    ]);
    expect(schema.$defs.source_system.enum).toEqual([...AGGREGATE_CLAIM_SOURCE_SYSTEMS]);
  });
});
