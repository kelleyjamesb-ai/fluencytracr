import { aiValueEngine } from "@fluencytracr/shared";

const hash = (value: string): string =>
  aiValueEngine.aggregateClaimHash("FT_CANONICAL_IDENTITY_TEST_V1", { value });

const coreInput = () => ({
  orgCommitment: hash("org"),
  hypothesisVersion: 1,
  hypothesisSemanticCommitment: hash("hypothesis"),
  hypothesisCreationAttestationCommitment: hash("hypothesis-attestation"),
  planVersion: 1,
  planSemanticCommitment: hash("plan"),
  planEdgeAttestationCommitment: hash("plan-edge"),
  measurementCellVersion: 1,
  measurementCellSemanticCommitment: hash("cell"),
  measurementCellEdgeAttestationCommitment: hash("cell-edge"),
  metricDefinitionCommitment: hash("metric"),
  canonicalSliceCommitment: hash("slice"),
  windowsCommitment: hash("windows"),
  sourceGraphCommitment: hash("source-graph"),
  acceptedExportCommitment: hash("export"),
  acceptedReviewCommitment: hash("review"),
  admissionCommitment: hash("admission"),
  comparisonReceiptCommitment: hash("receipt"),
  comparisonProjectionCommitment: hash("projection"),
  claimPolicyVersion: aiValueEngine.AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
  claimTemplateId: aiValueEngine.AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID
});

const packetContent = (): aiValueEngine.AggregateAuthorizedPacketContent => ({
  policy_version: aiValueEngine.AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
  template_id: aiValueEngine.AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID,
  slice_commitment: hash("slice"),
  canonical_identity_core_commitment: hash("core"),
  claim_content_hash: hash("claim"),
  movement: {
    metric_id: "support_median_resolution_hours",
    measurement_unit: "hours",
    baseline_value: 18.4,
    comparison_value: 15.1,
    absolute_delta: -3.3,
    percent_change: -17.934782608695652,
    observed_direction: "DECREASE",
    claim_label: "OBSERVED_NON_ATTRIBUTABLE"
  },
  caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS],
  customer_facing_output_authorized: false
});

describe("canonical identity binding contracts", () => {
  it("requires an explicit complete selector and rejects person-shaped IDs", () => {
    expect(
      aiValueEngine.CanonicalIdentitySelectorSchema.parse({
        value_hypothesis_id: "hypothesis_support_resolution",
        value_hypothesis_version: 1,
        measurement_plan_id: "plan_support_resolution",
        measurement_plan_version: 1,
        measurement_cell_id: "cell_support_resolution",
        measurement_cell_version: 1
      })
    ).toBeDefined();

    for (const invalid of [
      {},
      {
        value_hypothesis_id: "james.kelley@glean.com",
        value_hypothesis_version: 1,
        measurement_plan_id: "plan_support_resolution",
        measurement_plan_version: 1,
        measurement_cell_id: "cell_support_resolution",
        measurement_cell_version: 1
      },
      {
        value_hypothesis_id: "employee_12345",
        value_hypothesis_version: 1,
        measurement_plan_id: "plan_support_resolution",
        measurement_plan_version: 1,
        measurement_cell_id: "cell_support_resolution",
        measurement_cell_version: 1
      }
    ]) {
      expect(aiValueEngine.CanonicalIdentitySelectorSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("binds renderer identity into the core and changes commitment on any edge", () => {
    const core = aiValueEngine.buildCanonicalIdentityCore(coreInput());
    const replay = aiValueEngine.buildCanonicalIdentityCore(coreInput());
    const changed = aiValueEngine.buildCanonicalIdentityCore({
      ...coreInput(),
      planSemanticCommitment: hash("changed-plan")
    });

    expect(core.renderer_version).toBe(aiValueEngine.CANONICAL_READOUT_RENDERER_VERSION);
    expect(replay).toEqual(core);
    expect(aiValueEngine.canonicalIdentityCoreCommitment(replay)).toBe(
      aiValueEngine.canonicalIdentityCoreCommitment(core)
    );
    expect(aiValueEngine.canonicalIdentityCoreCommitment(changed)).not.toBe(
      aiValueEngine.canonicalIdentityCoreCommitment(core)
    );
  });

  it("renders exact deterministic internal bytes and binds them after the packet ID", () => {
    const content = packetContent();
    const html = aiValueEngine.renderCanonicalAggregateClaimReadoutHtml(content);
    const replay = aiValueEngine.renderCanonicalAggregateClaimReadoutHtml(content);
    const changedHtml = aiValueEngine.renderCanonicalAggregateClaimReadoutHtml({
      ...content,
      movement: {
        ...content.movement,
        comparison_value: 14.9,
        absolute_delta: -3.5
      }
    });

    expect(replay).toBe(html);
    expect(html).toContain("Internal aggregate observation");
    expect(html).toContain("OBSERVED_NON_ATTRIBUTABLE");
    expect(html).not.toContain("canonical_identity");
    expect(aiValueEngine.canonicalReadoutBytesCommitment(replay)).toBe(
      aiValueEngine.canonicalReadoutBytesCommitment(html)
    );
    expect(aiValueEngine.canonicalReadoutBytesCommitment(changedHtml)).not.toBe(
      aiValueEngine.canonicalReadoutBytesCommitment(html)
    );
  });

  it("derives one packet-bound private artifact without exposing selectors or row locators", () => {
    const core = aiValueEngine.buildCanonicalIdentityCore(coreInput());
    const coreCommitment = aiValueEngine.canonicalIdentityCoreCommitment(core);
    const packetId = `aggregate_packet_${"1".repeat(64)}_${"2".repeat(64)}`;
    const binding = aiValueEngine.buildCanonicalIdentityBinding({
      canonicalIdentityCoreCommitment: coreCommitment,
      claimId: `aggregate_claim_${"3".repeat(64)}_${"4".repeat(64)}`,
      claimContentHash: hash("claim-content"),
      packetId,
      packetContentHash: hash("packet-content"),
      manifestId: `manifest_${"5".repeat(64)}`,
      manifestHash: "5".repeat(64),
      renderedBodyCommitment: hash("html")
    });
    const changed = aiValueEngine.buildCanonicalIdentityBinding({
      canonicalIdentityCoreCommitment: binding.canonical_identity_core_commitment,
      claimId: binding.claim_id,
      claimContentHash: binding.claim_content_hash,
      packetId: `aggregate_packet_${"6".repeat(64)}_${"7".repeat(64)}`,
      packetContentHash: binding.packet_content_hash,
      manifestId: binding.manifest_id,
      manifestHash: binding.manifest_hash,
      renderedBodyCommitment: binding.rendered_body_commitment
    });
    const encoded = JSON.stringify(binding);

    expect(binding.binding_id).toBe(aiValueEngine.canonicalIdentityBindingIdFromPacketId(packetId));
    expect(changed.binding_id).not.toBe(binding.binding_id);
    expect(aiValueEngine.canonicalIdentityBindingReconciles(binding)).toBe(true);
    expect(encoded).not.toContain("value_hypothesis_id");
    expect(encoded).not.toContain("measurement_plan_id");
    expect(encoded).not.toContain("measurement_cell_id");
    expect(encoded).not.toContain("row_id");
  });

  it("reconciles the binding against all three finalized D artifacts and exact HTML", () => {
    const objects = {
      outcomeEvidenceExport: {
        export_id: "outcome_export_exact",
        review: { review_state: "ACCEPTED" }
      },
      blueprint: { blueprint_id: "blueprint_exact" },
      metricsLibrary: { library_id: "metrics_exact" },
      scenario: { scenario_id: "scenario_exact" }
    };
    const sourceGraphSeal = aiValueEngine.buildAggregateClaimSourceGraphSeal(objects);
    const projection = {
      policy_version: "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07",
      org_id: "org-northstar",
      workflow_id: "customer_support_case_resolution",
      jbtd_id: "resolve_support_case",
      persona_id: "support_specialist",
      outcome_metric: "support_median_resolution_hours",
      outcome_unit: "hours",
      source_system: "Support case management system",
      baseline_window: {
        period_start: "2026-01-01T00:00:00.000Z",
        period_end: "2026-03-01T00:00:00.000Z",
        evidence_id: "evidence_baseline",
        cohort_size: 10,
        aggregate_value: 18.4
      },
      comparison_window: {
        period_start: "2026-04-01T00:00:00.000Z",
        period_end: "2026-06-01T00:00:00.000Z",
        evidence_id: "evidence_comparison",
        cohort_size: 10,
        aggregate_value: 15.1
      }
    };
    const movement = aiValueEngine.buildAggregateObservedMovement({
      metricId: projection.outcome_metric,
      measurementUnit: projection.outcome_unit,
      baselineValue: projection.baseline_window.aggregate_value,
      comparisonValue: projection.comparison_window.aggregate_value,
      approvedMetricDirection: "DECREASE"
    });
    const bundle = aiValueEngine.buildAggregateClaimAuthorizationBundle({
      sourceGraphSeal,
      readinessId: "readiness_exact",
      readinessHash: hash("readiness"),
      acceptedExportPayloadHash: hash("export"),
      acceptedReviewHash: hash("review"),
      comparisonPrivacyReceipt: {
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
      },
      comparisonProjection: projection,
      policyState: aiValueEngine.aggregateClaimPolicyState(),
      canonicalIdentityCoreCommitment: hash("core"),
      claimContent: {
        policy_version: aiValueEngine.AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
        template_id: aiValueEngine.AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID,
        org_id: projection.org_id,
        workflow_id: projection.workflow_id,
        jbtd_id: projection.jbtd_id,
        persona_id: projection.persona_id,
        movement,
        caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS],
        model_use_authorized: false,
        customer_facing_output_authorized: false
      }
    });
    const html = aiValueEngine.renderCanonicalAggregateClaimReadoutHtml(bundle.packet.content);
    const binding = aiValueEngine.buildCanonicalIdentityBinding({
      canonicalIdentityCoreCommitment: hash("core"),
      claimId: bundle.claim.claim_id,
      claimContentHash: bundle.claim.content_hash,
      packetId: bundle.packet.packet_id,
      packetContentHash: bundle.packet.content_hash,
      manifestId: bundle.manifest.manifest_id,
      manifestHash: bundle.manifest.manifest_hash,
      renderedBodyCommitment: aiValueEngine.canonicalReadoutBytesCommitment(html)
    });

    expect(aiValueEngine.canonicalIdentityBundleReconciles({ ...bundle, binding })).toBe(true);
    expect(
      aiValueEngine.canonicalIdentityBundleReconciles({
        ...bundle,
        binding: { ...binding, claim_content_hash: hash("substitution") }
      })
    ).toBe(false);
  });
});
