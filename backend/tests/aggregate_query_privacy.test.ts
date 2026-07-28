import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";
import { evaluateAggregateDisclosure } from "../src/aggregate_disclosure_policy";
import {
  commitAggregatePrivacyProjection,
  hashAggregateProjectionContent,
  hashCanonicalContributionIds,
  hashPublicProjectionShape,
  readAdmittedAggregatePrivacyProjection
} from "../src/repositories/aggregate-privacy-release.repository";

describe("aggregate query privacy", () => {
  beforeEach(() => {
    store.reset();
    store.orgs.set("org-1", {
      id: "org-1",
      name: "Org",
      minGroupSize: 5,
      createdAt: "2026-01-01T00:00:00.000Z"
    });
  });

  it("keeps legacy behavioral aggregates storage-only on signal reads", async () => {
    store.behavioralSignals.set("legacy", {
      org_id: "org-1",
      workflow_id: "wf-1",
      jbtd_id: "manager-review",
      persona_id: "frontline-manager",
      group_id: "func-rd",
      group_type: "function",
      bucket_start: "2026-01-06",
      signal_name: "delegate_code_commit",
      count: 57,
      suppressed: false,
      includesRollup: true
    });

    const read = await request(app)
      .get("/orgs/org-1/behavior/signals?include_suppressed=true")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

    expect(read.status).toBe(200);
    expect(read.body.signals).toEqual([]);
    expect(read.body.total_count).toBe(0);
    expect(read.body.suppressed_count).toBe(0);
  });

  it("does not derive adjacent-window patterns from storage-only aggregates", async () => {
    for (const [bucket, count] of [["2026-01-06", 10], ["2026-01-13", 20]] as const) {
      store.behavioralSignals.set(bucket, {
        org_id: "org-1",
        group_id: "func-rd",
        group_type: "function",
        bucket_start: bucket,
        signal_name: "delegate_code_commit",
        count,
        suppressed: false
      });
    }

    const read = await request(app)
      .get("/orgs/org-1/behavior/patterns?bucket_start=2026-01-13&group_type=function")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

    expect(read.status).toBe(200);
    expect(read.body.patterns).toEqual([]);
  });

  it("keeps storage-only behavioral import receipts independent of held counts", async () => {
    const importCount = async (count: number) =>
      request(app)
        .post("/orgs/org-1/behavior/import")
        .set({
          "x-role": "ADMIN",
          "x-org-id": "org-1",
          "x-fluencytracr-schema-version": "0.1"
        })
        .send({
          aggregates: [{
            org_id: "org-1",
            group_id: "org-1",
            group_type: "org",
            bucket_start: "2026-01-06",
            signal_name: "delegate_code_commit",
            count
          }]
        });

    const belowK = await importCount(4);
    store.behavioralSignals.clear();
    const atK = await importCount(5);

    expect(belowK.status).toBe(200);
    expect(atK.status).toBe(200);
    expect(belowK.body).toEqual(atK.body);
    expect(belowK.body).toEqual({
      status: "accepted_storage_only",
      privacy_decision: "HOLD",
      imported: 0,
      suppressed: 0,
      rolled_up: 0,
      rejected: 0,
      errors: [],
      events_processed: 0,
      signals_generated: 0
    });
  });

  it("returns the same value-independent receipt for direct and connector imports", async () => {
    const headers = {
      "x-role": "ADMIN",
      "x-org-id": "org-1",
      "x-fluencytracr-schema-version": "0.1"
    };
    const direct = await request(app)
      .post("/orgs/org-1/behavior/import")
      .set(headers)
      .send({
        aggregates: [{
          org_id: "org-1",
          group_id: "org-1",
          group_type: "org",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 17
        }]
      });
    const connector = await request(app)
      .post("/orgs/org-1/behavior/connector/import")
      .set(headers)
      .send({
        vendor: "example-chat-vendor",
        connector_name: "chat-tool-connector",
        org_id: "org-1",
        group_id: "org-1",
        group_type: "org",
        bucket_start: "2026-01-06",
        events: [{
          event_type: "chat.prompt.edited",
          timestamp: "2026-01-06T12:00:00.000Z",
          edit_count: 2
        }]
      });

    expect(direct.status).toBe(200);
    expect(connector.status).toBe(200);
    expect(connector.body).toEqual(direct.body);
  });
});

describe("aggregate disclosure policy", () => {
  const projection = { status: "released", values: [10, 20] };
  const candidateWithoutContent = {
    org_id: "org-1",
    workflow_id: "wf-1",
    jbtd_id: "manager-review",
    persona_id: "frontline-manager",
    privacy_slot_id: "slot-1",
    atomic_lineage_fingerprint: "lineage-a",
    public_projection_hash: hashPublicProjectionShape(projection),
    temporal_grid_id: "weekly-grid-v1",
    window_id: "2026-W01",
    release_version: 1,
    hierarchy_axis: "team",
    source_mode: "direct",
    atomic_cell_ids: ["cell-a", "cell-b"]
  } as const;
  const candidate = {
    ...candidateWithoutContent,
    content_fingerprint: hashAggregateProjectionContent(candidateWithoutContent, projection)
  } as const;
  const canonicalContributionIds = [
    "contribution-1",
    "contribution-2",
    "contribution-3",
    "contribution-4",
    "contribution-5"
  ] as const;
  const serverManifest = {
    org_id: "org-1",
    workflow_id: "wf-1",
    jbtd_id: "manager-review",
    persona_id: "frontline-manager",
    privacy_slot_id: "slot-1",
    content_fingerprint: candidate.content_fingerprint,
    atomic_lineage_fingerprint: "lineage-a",
    public_projection_hash: hashPublicProjectionShape(projection),
    temporal_grid_id: "weekly-grid-v1",
    window_id: "2026-W01",
    release_version: 1,
    hierarchy_axis: "team",
    source_mode: "direct",
    atomic_cell_ids: ["cell-a", "cell-b"],
    complete_partition: true,
    canonical_contributions: true,
    canonical_contribution_fingerprint: hashCanonicalContributionIds(canonicalContributionIds),
    canonical_contribution_count: 5,
    canonical_contribution_ids: canonicalContributionIds,
    has_suppressed_child: false,
    has_ambiguous_lineage: false,
    has_overlapping_equation: false,
    is_multi_window: false,
    verified: true
  } as const;

  it("releases one complete server-authoritative fixed-window family", () => {
    expect(evaluateAggregateDisclosure(candidate, serverManifest, [])).toEqual({
      decision: "RELEASE",
      diagnostic: null
    });
  });

  it("connects the authenticated release route to durable server authority and holds when unavailable", async () => {
    const routeProjection = {
      org_id: "org-1",
      observation_window: "60d",
      workflows: [{
        workflow_id: "wf-1",
        jbtd_id: "manager-review",
        persona_id: "frontline-manager",
        executions_total: 5,
        executions_disclosed: 5,
        executions_suppressed: 0,
        disclosure: "ALLOWED",
        privacy_decision: "RELEASE",
        suppression_reasons: [],
        pattern_distribution: {
          "Calibrated Fluency": "HIGH",
          "Blind Efficiency": "LOW",
          "Recovery Maturity": "LOW",
          "Friction Loop": "LOW",
          "Undertrust Avoidance": "LOW"
        },
        residual_patterns: { ghost_use: "ABSENT" },
        reliability_factor: 0.8,
        reliability_components: {
          abandonment_rate: 0.1,
          friction_loop_rate: 0.1,
          recovery_success_rate: 0.8,
          verification_presence_rate: 0.8
        },
        allowed_interpretation_hints: []
      }]
    } as const;
    const routeCandidateWithoutContent = {
      ...candidateWithoutContent,
      public_projection_hash: hashPublicProjectionShape(routeProjection),
      window_id: "2026-01-01/2026-03-02"
    };
    const routeCandidate = {
      ...routeCandidateWithoutContent,
      content_fingerprint: hashAggregateProjectionContent(
        routeCandidateWithoutContent,
        routeProjection
      )
    };
    const {
      window_id: _routeWindowId,
      ...routeRequestCandidateFields
    } = routeCandidate;
    const routeRequestCandidate = {
      ...routeRequestCandidateFields,
      window_start: "2026-01-01",
      window_end: "2026-03-02"
    };
    const rollingResponse = await request(app)
      .post("/orgs/org-1/aggregate-privacy/releases")
      .set({
        "x-role": "ADMIN",
        "x-org-id": "org-1",
        "x-fluencytracr-schema-version": "0.1"
      })
      .send({
        candidate: { ...routeRequestCandidateFields, window_id: "60d" },
        projection: routeProjection
      });
    const invalidCalendarResponse = await request(app)
      .post("/orgs/org-1/aggregate-privacy/releases")
      .set({
        "x-role": "ADMIN",
        "x-org-id": "org-1",
        "x-fluencytracr-schema-version": "0.1"
      })
      .send({
        candidate: {
          ...routeRequestCandidateFields,
          window_start: "2026-02-30",
          window_end: "2026-05-01"
        },
        projection: routeProjection
      });
    const response = await request(app)
      .post("/orgs/org-1/aggregate-privacy/releases")
      .set({
        "x-role": "ADMIN",
        "x-org-id": "org-1",
        "x-fluencytracr-schema-version": "0.1"
      })
      .send({ candidate: routeRequestCandidate, projection: routeProjection });

    expect(rollingResponse.status).toBe(400);
    expect(invalidCalendarResponse.status).toBe(400);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "held",
      privacy_decision: "HOLD"
    });
  });

  it("holds a dependent parent when any child is suppressed", () => {
    expect(
      evaluateAggregateDisclosure(
        candidate,
        { ...serverManifest, has_suppressed_child: true },
        []
      )
    ).toEqual({
      decision: "HOLD",
      diagnostic: "COMPLEMENTARY_SUPPRESSION"
    });
  });

  it("allows exact replay but holds a changed content fingerprint", () => {
    const prior = [{
      org_id: "org-1",
      workflow_id: "wf-1",
      jbtd_id: "manager-review",
      persona_id: "frontline-manager",
      privacy_slot_id: "slot-1",
      content_fingerprint: candidate.content_fingerprint,
      atomic_lineage_fingerprint: "lineage-a",
      public_projection_hash: candidate.public_projection_hash,
      temporal_grid_id: "weekly-grid-v1",
      window_id: "2026-W01",
      release_version: 1,
      canonical_contribution_fingerprint:
        serverManifest.canonical_contribution_fingerprint,
      decision: "RELEASE" as const
    }];

    expect(evaluateAggregateDisclosure(candidate, serverManifest, prior).decision).toBe("RELEASE");
    expect(
      evaluateAggregateDisclosure(
        { ...candidate, content_fingerprint: "content-b" },
        { ...serverManifest, content_fingerprint: "content-b" },
        prior
      )
    ).toEqual({
      decision: "HOLD",
      diagnostic: "CHANGED_REPLAY"
    });
  });

  it("does not let caller candidate data establish server completeness", () => {
    expect(
      evaluateAggregateDisclosure(
        { ...candidate, privacy_slot_id: "attacker-selected-slot" },
        serverManifest,
        []
      )
    ).toEqual({
      decision: "HOLD",
      diagnostic: "MISSING_SERVER_AUTHORITY"
    });
  });

  it("holds a candidate that omits a server-manifest child even when fingerprints are copied", () => {
    expect(
      evaluateAggregateDisclosure(
        { ...candidate, atomic_cell_ids: ["cell-a"] },
        serverManifest,
        []
      )
    ).toEqual({
      decision: "HOLD",
      diagnostic: "MISSING_SERVER_AUTHORITY"
    });
  });

  it("holds a manifest with no canonical atomic cells", () => {
    expect(
      evaluateAggregateDisclosure(
        { ...candidate, atomic_cell_ids: [] },
        { ...serverManifest, atomic_cell_ids: [] },
        []
      )
    ).toEqual({
      decision: "HOLD",
      diagnostic: "MISSING_SERVER_AUTHORITY"
    });
  });

  it("does not let five aliases of one canonical contribution satisfy the gate", () => {
    expect(
      evaluateAggregateDisclosure(
        {
          ...candidate,
          atomic_cell_ids: ["alias-a", "alias-b", "alias-c", "alias-d", "alias-e"]
        },
        {
          ...serverManifest,
          atomic_cell_ids: ["alias-a", "alias-b", "alias-c", "alias-d", "alias-e"],
          canonical_contribution_count: 1
        },
        []
      )
    ).toEqual({
      decision: "HOLD",
      diagnostic: "MISSING_SERVER_AUTHORITY"
    });
  });

  it("fails closed before journal mutation when the server manifest is unavailable", async () => {
    let upsertCalled = false;
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: {
            findUnique: async () => null
          },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => [],
            upsert: async () => {
              upsertCalled = true;
              throw new Error("must not write");
            }
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () => [],
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(candidate, projection, journal as never)
    ).resolves.toEqual({
      decision: "HOLD",
      diagnostic: "MISSING_SERVER_AUTHORITY"
    });
    expect(upsertCalled).toBe(false);
  });

  it("holds a changed candidate when the durable slot already contains another fingerprint", async () => {
    const changedProjection = { status: "released", values: [11, 20] };
    const changedContentFingerprint = hashAggregateProjectionContent(
      candidateWithoutContent,
      changedProjection
    );
    const establishedRow = {
      orgId: "org-1",
      workflowId: "wf-1",
      jbtdId: "manager-review",
      personaId: "frontline-manager",
      privacySlotId: "slot-1",
      contentFingerprint: candidate.content_fingerprint,
      atomicLineageFingerprint: "lineage-a",
      publicProjectionHash: candidate.public_projection_hash,
      temporalGridId: "weekly-grid-v1",
      windowId: "2026-W01",
      releaseVersion: 1,
      canonicalContributionFingerprint:
        serverManifest.canonical_contribution_fingerprint,
      decision: "RELEASE",
      projectionJson: projection
    };
    const receipts = [establishedRow];
    const manifestRow = {
      orgId: serverManifest.org_id,
      workflowId: serverManifest.workflow_id,
      jbtdId: serverManifest.jbtd_id,
      personaId: serverManifest.persona_id,
      privacySlotId: serverManifest.privacy_slot_id,
      contentFingerprint: changedContentFingerprint,
      atomicLineageFingerprint: serverManifest.atomic_lineage_fingerprint,
      publicProjectionHash: serverManifest.public_projection_hash,
      temporalGridId: serverManifest.temporal_grid_id,
      windowId: serverManifest.window_id,
      releaseVersion: serverManifest.release_version,
      hierarchyAxis: serverManifest.hierarchy_axis,
      sourceMode: serverManifest.source_mode,
      atomicCellIds: serverManifest.atomic_cell_ids,
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint: serverManifest.canonical_contribution_fingerprint,
      canonicalContributionCount: serverManifest.canonical_contribution_count,
      canonicalContributionIds: serverManifest.canonical_contribution_ids,
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    };
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: {
            findUnique: async () => manifestRow
          },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => receipts,
            upsert: async () => establishedRow
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () => [],
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(
        { ...candidate, content_fingerprint: changedContentFingerprint },
        changedProjection,
        journal as never
      )
    ).resolves.toEqual({
      decision: "HOLD",
      diagnostic: "CHANGED_REPLAY"
    });
  });

  it("rejects a value-substituted projection even when its public shape is unchanged", async () => {
    const storedProjection = { status: "released", values: [10, 20] };
    const establishedRow = {
      orgId: "org-1",
      workflowId: "wf-1",
      jbtdId: "manager-review",
      personaId: "frontline-manager",
      privacySlotId: "slot-1",
      contentFingerprint: candidate.content_fingerprint,
      atomicLineageFingerprint: "lineage-a",
      publicProjectionHash: candidate.public_projection_hash,
      temporalGridId: "weekly-grid-v1",
      windowId: "2026-W01",
      releaseVersion: 1,
      canonicalContributionFingerprint:
        serverManifest.canonical_contribution_fingerprint,
      decision: "RELEASE",
      projectionJson: storedProjection
    };
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: {
            findUnique: async () => ({
              orgId: serverManifest.org_id,
              workflowId: serverManifest.workflow_id,
              jbtdId: serverManifest.jbtd_id,
              personaId: serverManifest.persona_id,
              privacySlotId: serverManifest.privacy_slot_id,
              contentFingerprint: serverManifest.content_fingerprint,
              atomicLineageFingerprint: serverManifest.atomic_lineage_fingerprint,
              publicProjectionHash: serverManifest.public_projection_hash,
              temporalGridId: serverManifest.temporal_grid_id,
              windowId: serverManifest.window_id,
              releaseVersion: serverManifest.release_version,
              hierarchyAxis: serverManifest.hierarchy_axis,
              sourceMode: serverManifest.source_mode,
              atomicCellIds: serverManifest.atomic_cell_ids,
              completePartition: true,
              canonicalContributions: true,
              canonicalContributionFingerprint: serverManifest.canonical_contribution_fingerprint,
              canonicalContributionCount: serverManifest.canonical_contribution_count,
              canonicalContributionIds: serverManifest.canonical_contribution_ids,
              hasSuppressedChild: false,
              hasAmbiguousLineage: false,
              hasOverlappingEquation: false,
              isMultiWindow: false,
              verified: true
            })
          },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => [establishedRow],
            upsert: async () => establishedRow
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () => [],
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(
        candidate,
        { status: "released", values: [999, 999] },
        journal as never
      )
    ).resolves.toEqual({
      decision: "HOLD",
      diagnostic: "MISSING_SERVER_AUTHORITY"
    });
  });

  it("returns the atomically admitted projection on an exact replay", async () => {
    const establishedRow = {
      orgId: "org-1",
      workflowId: "wf-1",
      jbtdId: "manager-review",
      personaId: "frontline-manager",
      privacySlotId: "slot-1",
      contentFingerprint: candidate.content_fingerprint,
      atomicLineageFingerprint: "lineage-a",
      publicProjectionHash: candidate.public_projection_hash,
      temporalGridId: "weekly-grid-v1",
      windowId: "2026-W01",
      releaseVersion: 1,
      canonicalContributionFingerprint:
        serverManifest.canonical_contribution_fingerprint,
      decision: "RELEASE",
      projectionJson: projection
    };
    const manifestRow = {
      orgId: serverManifest.org_id,
      workflowId: serverManifest.workflow_id,
      jbtdId: serverManifest.jbtd_id,
      personaId: serverManifest.persona_id,
      privacySlotId: serverManifest.privacy_slot_id,
      contentFingerprint: serverManifest.content_fingerprint,
      atomicLineageFingerprint: serverManifest.atomic_lineage_fingerprint,
      publicProjectionHash: serverManifest.public_projection_hash,
      temporalGridId: serverManifest.temporal_grid_id,
      windowId: serverManifest.window_id,
      releaseVersion: serverManifest.release_version,
      hierarchyAxis: serverManifest.hierarchy_axis,
      sourceMode: serverManifest.source_mode,
      atomicCellIds: serverManifest.atomic_cell_ids,
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint: serverManifest.canonical_contribution_fingerprint,
      canonicalContributionCount: serverManifest.canonical_contribution_count,
      canonicalContributionIds: serverManifest.canonical_contribution_ids,
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    };
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: { findUnique: async () => manifestRow },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => [establishedRow],
            upsert: async () => establishedRow
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () =>
              canonicalContributionIds.map((contributionTokenHash) => ({
                orgId: "org-1",
                contributionTokenHash,
                privacySlotId: "slot-1"
              })),
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(candidate, projection, journal as never)
    ).resolves.toEqual({
      decision: "RELEASE",
      receipt: {
        org_id: "org-1",
        workflow_id: "wf-1",
        jbtd_id: "manager-review",
        persona_id: "frontline-manager",
        privacy_slot_id: "slot-1",
        content_fingerprint: candidate.content_fingerprint,
        atomic_lineage_fingerprint: "lineage-a",
        public_projection_hash: candidate.public_projection_hash,
        temporal_grid_id: "weekly-grid-v1",
        window_id: "2026-W01",
        release_version: 1,
        canonical_contribution_fingerprint:
          serverManifest.canonical_contribution_fingerprint,
        decision: "RELEASE"
      },
      projection
    });
  });

  it("holds a second slot that overlaps any already-claimed canonical contribution", async () => {
    let upsertCalled = false;
    const manifestRow = {
      orgId: serverManifest.org_id,
      workflowId: serverManifest.workflow_id,
      jbtdId: serverManifest.jbtd_id,
      personaId: serverManifest.persona_id,
      privacySlotId: serverManifest.privacy_slot_id,
      contentFingerprint: serverManifest.content_fingerprint,
      atomicLineageFingerprint: serverManifest.atomic_lineage_fingerprint,
      publicProjectionHash: serverManifest.public_projection_hash,
      temporalGridId: serverManifest.temporal_grid_id,
      windowId: serverManifest.window_id,
      releaseVersion: serverManifest.release_version,
      hierarchyAxis: serverManifest.hierarchy_axis,
      sourceMode: serverManifest.source_mode,
      atomicCellIds: serverManifest.atomic_cell_ids,
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint: serverManifest.canonical_contribution_fingerprint,
      canonicalContributionCount: serverManifest.canonical_contribution_count,
      canonicalContributionIds: serverManifest.canonical_contribution_ids,
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    };
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: {
            findUnique: async () => manifestRow
          },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => [],
            upsert: async () => {
              upsertCalled = true;
              throw new Error("must not write");
            }
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () => [{
              orgId: "org-1",
              contributionTokenHash: "contribution-1",
              privacySlotId: "another-slot"
            }],
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(candidate, projection, journal as never)
    ).resolves.toEqual({
      decision: "HOLD",
      diagnostic: "AMBIGUOUS_LINEAGE"
    });
    expect(upsertCalled).toBe(false);
  });

  it("holds an adjacent-window release for the same exact slice even with a new slot and lineage", async () => {
    const adjacentProjection = { status: "released", values: [30, 40] };
    const adjacentWithoutContent = {
      ...candidateWithoutContent,
      privacy_slot_id: "slot-adjacent",
      atomic_lineage_fingerprint: "lineage-adjacent",
      window_id: "2026-W02",
      public_projection_hash: hashPublicProjectionShape(adjacentProjection)
    };
    const adjacentCandidate = {
      ...adjacentWithoutContent,
      content_fingerprint: hashAggregateProjectionContent(
        adjacentWithoutContent,
        adjacentProjection
      )
    };
    const adjacentContributions = canonicalContributionIds.map(
      (contribution) => `${contribution}-adjacent`
    );
    const manifestRow = {
      orgId: "org-1",
      workflowId: "wf-1",
      jbtdId: "manager-review",
      personaId: "frontline-manager",
      privacySlotId: "slot-adjacent",
      contentFingerprint: adjacentCandidate.content_fingerprint,
      atomicLineageFingerprint: "lineage-adjacent",
      publicProjectionHash: adjacentCandidate.public_projection_hash,
      temporalGridId: "weekly-grid-v1",
      windowId: "2026-W02",
      releaseVersion: 1,
      hierarchyAxis: "team",
      sourceMode: "direct",
      atomicCellIds: ["cell-a", "cell-b"],
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint: hashCanonicalContributionIds(adjacentContributions),
      canonicalContributionCount: 5,
      canonicalContributionIds: adjacentContributions,
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    };
    const priorRow = {
      orgId: "org-1",
      workflowId: "wf-1",
      jbtdId: "manager-review",
      personaId: "frontline-manager",
      privacySlotId: "slot-1",
      privacyDomainFingerprint: "same-exact-slice-domain",
      contentFingerprint: candidate.content_fingerprint,
      atomicLineageFingerprint: "lineage-a",
      publicProjectionHash: candidate.public_projection_hash,
      temporalGridId: "weekly-grid-v1",
      windowId: "2026-W01",
      releaseVersion: 1,
      canonicalContributionFingerprint:
        serverManifest.canonical_contribution_fingerprint,
      decision: "RELEASE",
      projectionJson: projection
    };
    let upsertCalled = false;
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: { findUnique: async () => manifestRow },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => [priorRow],
            upsert: async () => {
              upsertCalled = true;
              throw new Error("must not write");
            }
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () => [],
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(
        adjacentCandidate,
        adjacentProjection,
        journal as never
      )
    ).resolves.toEqual({
      decision: "HOLD",
      diagnostic: "CHANGED_REPLAY"
    });
    expect(upsertCalled).toBe(false);
  });

  it("holds a partial same-slot contribution-claim state", async () => {
    let upsertCalled = false;
    const manifestRow = {
      orgId: serverManifest.org_id,
      workflowId: serverManifest.workflow_id,
      jbtdId: serverManifest.jbtd_id,
      personaId: serverManifest.persona_id,
      privacySlotId: serverManifest.privacy_slot_id,
      contentFingerprint: serverManifest.content_fingerprint,
      atomicLineageFingerprint: serverManifest.atomic_lineage_fingerprint,
      publicProjectionHash: serverManifest.public_projection_hash,
      temporalGridId: serverManifest.temporal_grid_id,
      windowId: serverManifest.window_id,
      releaseVersion: serverManifest.release_version,
      hierarchyAxis: serverManifest.hierarchy_axis,
      sourceMode: serverManifest.source_mode,
      atomicCellIds: serverManifest.atomic_cell_ids,
      completePartition: true,
      canonicalContributions: true,
      canonicalContributionFingerprint: serverManifest.canonical_contribution_fingerprint,
      canonicalContributionCount: serverManifest.canonical_contribution_count,
      canonicalContributionIds: serverManifest.canonical_contribution_ids,
      hasSuppressedChild: false,
      hasAmbiguousLineage: false,
      hasOverlappingEquation: false,
      isMultiWindow: false,
      verified: true
    };
    const journal = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          aggregatePrivacyManifest: { findUnique: async () => manifestRow },
          aggregatePrivacyReleaseJournal: {
            findMany: async () => [],
            upsert: async () => {
              upsertCalled = true;
              throw new Error("must not write");
            }
          },
          aggregatePrivacyContributionClaim: {
            findMany: async () => [{
              orgId: "org-1",
              contributionTokenHash: canonicalContributionIds[0],
              privacySlotId: "slot-1"
            }],
            createMany: async () => ({ count: 0 })
          }
        })
    };

    await expect(
      commitAggregatePrivacyProjection(candidate, projection, journal as never)
    ).resolves.toEqual({
      decision: "HOLD",
      diagnostic: "AMBIGUOUS_LINEAGE"
    });
    expect(upsertCalled).toBe(false);
  });

  it("reads only an already-admitted durable projection", async () => {
    const journal = {
      aggregatePrivacyReleaseJournal: {
        findUnique: async () => ({
          decision: "RELEASE",
          windowId: "2026-01-01/2026-03-02",
          projectionJson: projection
        })
      }
    };
    const heldJournal = {
      aggregatePrivacyReleaseJournal: {
        findUnique: async () => ({
          decision: "HOLD",
          windowId: "2026-01-01/2026-03-02",
          projectionJson: { status: "held", values: [999] }
        })
      }
    };

    await expect(
      readAdmittedAggregatePrivacyProjection("org-1", "slot-1", journal as never)
    ).resolves.toEqual({
      projection,
      window_id: "2026-01-01/2026-03-02"
    });
    await expect(
      readAdmittedAggregatePrivacyProjection("org-1", "slot-1", heldJournal as never)
    ).resolves.toBeNull();
  });
});
