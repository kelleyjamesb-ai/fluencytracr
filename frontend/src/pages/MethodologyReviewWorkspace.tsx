import { useMemo, useState } from "react";
import * as methodologySchemas from "@learnaire/shared/dist/aiWorkValueGraphSchemas";
import * as claimPacketSchemas from "@learnaire/shared/dist/gleanClaimPacketSchemas";
import * as realSourceReadinessSchemas from "@learnaire/shared/dist/realSourceReadinessSchemas";
import {
  NIELSEN_CLAIM_PACKET_AI_WORK_VALUE_GRAPH,
  NIELSEN_CLAIM_PACKET_STRONGEST_SAFE_CLAIM,
  NIELSEN_CLAIM_PACKET_VALUE_EVIDENCE_PACK
} from "../constants/claimPacketReview";
import { NIELSEN_METHODOLOGY_SNAPSHOT_REGISTRY } from "../constants/methodologyReview";
import { GLEAN_CLAIM_PACKET_REAL_SOURCE_READINESS } from "../constants/realSourceReadiness";

const { buildMethodologyDecisionMemo, buildMethodologyReviewWorkspace } = methodologySchemas;
const {
  buildGleanClaimPacketExport,
  buildGleanClaimPacketQbrNarrative,
  buildGleanClaimPacketQbrReadinessSummary
} = claimPacketSchemas;
const { buildRealSourceReadinessReview } = realSourceReadinessSchemas;

type QbrNarrative = ReturnType<typeof buildGleanClaimPacketQbrNarrative>;
type QbrReadinessSummary = ReturnType<typeof buildGleanClaimPacketQbrReadinessSummary>;
type RealSourceReadinessReview = ReturnType<typeof buildRealSourceReadinessReview>;
type QbrClaimStatement = QbrNarrative["caveated_claims"][number];
type QbrEvidenceGap = QbrNarrative["evidence_gaps"][number];

const formatToken = (value: string) => value.replace(/_/g, " ");

const postureClass = (effect: string) => {
  if (effect.includes("internal-only")) {
    return "mrw-pill mrw-pill-internal";
  }
  if (effect.includes("suppressed")) {
    return "mrw-pill mrw-pill-suppressed";
  }
  if (effect.includes("customer-safe")) {
    return "mrw-pill mrw-pill-safe";
  }
  return "mrw-pill mrw-pill-caveated";
};

const renderClaimList = (claims: QbrClaimStatement[]) => {
  if (claims.length === 0) {
    return <p>No claims in this bucket.</p>;
  }

  return (
    <div className="mrw-claim-list">
      {claims.map((claim) => (
        <article key={`${claim.claim_source}:${claim.claim_id}`} className="mrw-claim-item">
          <div>
            <strong>{claim.claim_id}</strong>
            <span>{formatToken(claim.claim_readiness)}</span>
          </div>
          <p>{claim.language}</p>
          {claim.caveats.length > 0 ? (
            <ul>
              {claim.caveats.map((caveat) => (
                <li key={`${claim.claim_id}:${caveat}`}>{caveat}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
};

const renderEvidenceGaps = (gaps: QbrEvidenceGap[]) => {
  if (gaps.length === 0) {
    return <p>No evidence gaps are blocking the current packet.</p>;
  }

  return (
    <div className="mrw-claim-list">
      {gaps.map((gap) => (
        <article key={gap.gap_id} className="mrw-claim-item">
          <div>
            <strong>{gap.gap_id}</strong>
            <span>{formatToken(gap.blocks)}</span>
          </div>
          <p>{gap.action}</p>
        </article>
      ))}
    </div>
  );
};

const renderReadinessSummaryBucket = (
  title: string,
  bucket: QbrReadinessSummary["customer_safe_claims"]
) => (
  <section className="mrw-readiness-card">
    <h4>{title}</h4>
    <p>{bucket.summary}</p>
    {bucket.claim_ids.length > 0 ? (
      <div className="mrw-readiness-token-row">
        {bucket.claim_ids.map((claimId) => (
          <span key={`${title}:${claimId}`}>{claimId}</span>
        ))}
      </div>
    ) : null}
  </section>
);

const ingestionPathLabel = (path: string) => {
  if (path === "admin_exported_aggregate_upload") {
    return "admin-exported aggregate upload";
  }
  if (path === "glean_hosted_mcp_read_access") {
    return "Glean-hosted MCP/read access";
  }
  if (path === "live_event_ingestion") {
    return "live event ingestion";
  }
  return formatToken(path);
};

const renderSourceIdList = (title: string, bucket: RealSourceReadinessReview["ready_sources"]) => (
  <section className="mrw-source-card">
    <h4>{title}</h4>
    <p>{bucket.summary}</p>
    {bucket.source_input_ids.length > 0 ? (
      <div className="mrw-readiness-token-row">
        {bucket.source_input_ids.map((sourceId) => (
          <span key={`${title}:${sourceId}`}>{sourceId}</span>
        ))}
      </div>
    ) : null}
  </section>
);

export function MethodologyReviewWorkspace() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("glean_time_saves_mvp_2025_10");
  const workspace = useMemo(
    () => buildMethodologyReviewWorkspace(NIELSEN_METHODOLOGY_SNAPSHOT_REGISTRY, selectedSnapshotId),
    [selectedSnapshotId]
  );
  const selected = workspace.selected_snapshot;
  const decisionMemo = useMemo(
    () => buildMethodologyDecisionMemo(workspace, selected.methodology_snapshot_id),
    [workspace, selected.methodology_snapshot_id]
  );
  const claimPacket = useMemo(
    () =>
      buildGleanClaimPacketExport({
        methodology_review_workspace: workspace,
        selected_methodology_snapshot_id: selected.methodology_snapshot_id,
        strongest_safe_claim: NIELSEN_CLAIM_PACKET_STRONGEST_SAFE_CLAIM,
        value_evidence_pack: NIELSEN_CLAIM_PACKET_VALUE_EVIDENCE_PACK,
        ai_work_value_graph: NIELSEN_CLAIM_PACKET_AI_WORK_VALUE_GRAPH
      }),
    [workspace, selected.methodology_snapshot_id]
  );
  const claimPacketText = useMemo(() => JSON.stringify(claimPacket, null, 2), [claimPacket]);
  const qbrNarrative = useMemo(() => buildGleanClaimPacketQbrNarrative(claimPacket), [claimPacket]);
  const qbrReadinessSummary = useMemo(() => buildGleanClaimPacketQbrReadinessSummary(claimPacket), [claimPacket]);
  const realSourceReadiness = useMemo(
    () =>
      buildRealSourceReadinessReview({
        manifest: GLEAN_CLAIM_PACKET_REAL_SOURCE_READINESS,
        claim_packet: claimPacket
      }),
    [claimPacket]
  );

  return (
    <main className="mrw-shell">
      <header className="mrw-header">
        <div>
          <p className="mrw-kicker">Methodology-Governed Claim Packaging</p>
          <h1>Methodology Review Workspace</h1>
          <p>
            Build a QBR-prep artifact from synthetic Nielsen-style fixtures and approved evidence gates. This is
            not an ROI calculator; it preserves strongest safe claim language, caveats, and suppression boundaries.
          </p>
        </div>
        <div className="mrw-header-meta">
          <span>{workspace.schema_version}</span>
          <strong>{workspace.org_id}</strong>
          <span>{workspace.registry_id}</span>
        </div>
      </header>

      <section className="mrw-layout" aria-label="Methodology review workspace">
        <aside className="mrw-list" aria-label="Snapshot list">
          <div className="mrw-list-heading">
            <p className="mrw-kicker">Snapshot list</p>
            <span>{workspace.snapshots.length} snapshots</span>
          </div>
          {workspace.snapshots.map((snapshot) => (
            <button
              key={snapshot.methodology_snapshot_id}
              type="button"
              className={
                snapshot.methodology_snapshot_id === selected.methodology_snapshot_id
                  ? "mrw-snapshot-button active"
                  : "mrw-snapshot-button"
              }
              onClick={() => setSelectedSnapshotId(snapshot.methodology_snapshot_id)}
            >
              <span>{snapshot.label}</span>
              <small>
                {formatToken(snapshot.approval_state)} / {formatToken(snapshot.customer_safe_claim_effect)}
              </small>
            </button>
          ))}
        </aside>

        <section className="mrw-detail" aria-label="Selected snapshot detail">
          <div className="mrw-detail-head">
            <div>
              <p className="mrw-kicker">Selected snapshot detail</p>
              <h2>{selected.label}</h2>
              <p className="mrw-id">{selected.methodology_snapshot_id}</p>
            </div>
            <span className={postureClass(selected.financial_claim_effect)}>{selected.financial_claim_effect}</span>
          </div>

          <div className="mrw-summary-grid">
            <section>
              <h3>Approval gate</h3>
              <p>{selected.approval_gate_explanation}</p>
            </section>
            <section>
              <h3>Financial claim effect</h3>
              <p>{selected.financial_claim_effect}</p>
            </section>
            <section>
              <h3>Covered surfaces</h3>
              <div className="mrw-token-row">
                {selected.covered_surfaces.map((surface) => (
                  <span key={surface}>{formatToken(surface)}</span>
                ))}
              </div>
            </section>
            <section>
              <h3>Excluded surfaces</h3>
              <div className="mrw-token-row">
                {selected.excluded_surfaces.map((surface) => (
                  <span key={surface}>{formatToken(surface)}</span>
                ))}
              </div>
            </section>
          </div>

          <section className="mrw-band">
            <h3>Dominant assumptions</h3>
            <div className="mrw-table">
              {selected.dominant_assumptions.map((assumption) => (
                <div key={assumption.assumption_id} className="mrw-table-row">
                  <strong>{assumption.label}</strong>
                  <span>{assumption.value_summary}</span>
                  <em>{formatToken(assumption.sensitivity)} sensitivity</em>
                </div>
              ))}
            </div>
          </section>

          <section className="mrw-band">
            <h3>Sensitivity tests</h3>
            {selected.sensitivity_tests.length > 0 ? (
              <div className="mrw-table">
                {selected.sensitivity_tests.map((test) => (
                  <div key={test.sensitivity_test_id} className="mrw-table-row">
                    <strong>
                      {test.variable} ({test.change})
                    </strong>
                    <span>{test.modeled_effect}</span>
                    <em>{test.claim_effect}</em>
                  </div>
                ))}
              </div>
            ) : (
              <p>No sensitivity tests are approved for this placeholder.</p>
            )}
          </section>

          <section className="mrw-band">
            <h3>Safe / internal-only / suppressed examples</h3>
            <div className="mrw-example-grid">
              <p>
                <strong>Customer-safe</strong>
                {selected.example_claims.customer_safe}
              </p>
              <p>
                <strong>Internal-only</strong>
                {selected.example_claims.internal_only}
              </p>
              <p>
                <strong>Caveated</strong>
                {selected.example_claims.caveated}
              </p>
              <p>
                <strong>Suppressed</strong>
                {selected.example_claims.suppressed}
              </p>
            </div>
          </section>

          <section className="mrw-band">
            <h3>Blocked claim effects</h3>
            <ul>
              {selected.blocked_claim_effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </section>

          <section className="mrw-band">
            <h3>Caveats</h3>
            <ul>
              {selected.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </section>

          <section className="mrw-band mrw-memo">
            <div className="mrw-section-head">
              <h3>Reviewer decision memo</h3>
              <button
                type="button"
                className="mrw-copy-button"
                onClick={() => {
                  void navigator.clipboard?.writeText(decisionMemo);
                }}
              >
                Copy memo
              </button>
            </div>
            <label className="mrw-memo-label" htmlFor="reviewer-decision-memo">
              Reviewer decision memo plain text
            </label>
            <textarea id="reviewer-decision-memo" className="mrw-memo-output" readOnly value={decisionMemo} />
          </section>

          <section className="mrw-band mrw-memo">
            <div className="mrw-section-head">
              <h3>Export methodology-governed claim packet</h3>
              <button
                type="button"
                className="mrw-copy-button"
                onClick={() => {
                  void navigator.clipboard?.writeText(claimPacketText);
                }}
              >
                Copy packet
              </button>
            </div>
            <div className="mrw-packet-summary" aria-label="Claim packet summary">
              <span>{claimPacket.claim_packet_id}</span>
              <span>{claimPacket.window}</span>
              <span>{claimPacket.selected_methodology_snapshot_id}</span>
            </div>
            <label className="mrw-memo-label" htmlFor="claim-packet-export">
              Claim packet JSON
            </label>
            <textarea id="claim-packet-export" className="mrw-memo-output" readOnly value={claimPacketText} />
          </section>

          <section className="mrw-band mrw-qbr">
            <section className="mrw-real-source" aria-label="Real-source readiness">
              <div className="mrw-section-head">
                <div>
                  <h3>Real-source readiness</h3>
                  <p>
                    {realSourceReadiness.summary} No ingestion is implemented; this only shows whether synthetic
                    fixture inputs are ready to be replaced by approved aggregate sources.
                  </p>
                </div>
                <span className={postureClass(realSourceReadiness.overall_state)}>
                  {formatToken(realSourceReadiness.overall_state)}
                </span>
              </div>

              <div className="mrw-real-source-path">
                <strong>Recommended path</strong>
                <span>{ingestionPathLabel(realSourceReadiness.ingestion_decision.recommended_path)}</span>
                <em>{formatToken(realSourceReadiness.ingestion_decision.implementation_state)}</em>
              </div>
              <p className="mrw-real-source-effect">
                Claim effect: {formatToken(realSourceReadiness.claim_readiness_effect)}
              </p>

              <div className="mrw-real-source-grid">
                {renderSourceIdList("Ready sources", realSourceReadiness.ready_sources)}
                {renderSourceIdList("Blocked or unknown sources", realSourceReadiness.blocked_or_unknown_sources)}
                {renderSourceIdList("Approval required", realSourceReadiness.approval_required_sources)}
              </div>

              <section className="mrw-source-card">
                <h4>Affected claim buckets</h4>
                <div className="mrw-bucket-list">
                  {realSourceReadiness.affected_claim_buckets.map((bucket) => (
                    <article key={bucket.claim_bucket}>
                      <strong>{formatToken(bucket.claim_bucket)}</strong>
                      <p>{bucket.summary}</p>
                      <div className="mrw-readiness-token-row">
                        {bucket.source_input_ids.map((sourceId) => (
                          <span key={`${bucket.claim_bucket}:${sourceId}`}>{sourceId}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="mrw-readiness-followup">
                <section>
                  <h4>Top source blockers</h4>
                  <ul>
                    {realSourceReadiness.top_blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4>Next source upgrade action</h4>
                  <p>{realSourceReadiness.next_upgrade_action}</p>
                </section>
              </div>
            </section>

            <h3>QBR narrative view</h3>
            <p className="mrw-qbr-intro">
              A human-readable QBR-prep artifact for the selected synthetic fixture. It classifies claims by
              current evidence and methodology approval instead of calculating ROI or choosing the strongest
              possible claim.
            </p>
            <section className="mrw-readiness-summary" aria-label="QBR readiness summary">
              <h4>QBR readiness summary</h4>
              <div className="mrw-readiness-grid">
                {renderReadinessSummaryBucket("Customer-safe claims", qbrReadinessSummary.customer_safe_claims)}
                {renderReadinessSummaryBucket("Caveated claims", qbrReadinessSummary.caveated_claims)}
                {renderReadinessSummaryBucket("Internal-only claims", qbrReadinessSummary.internal_only_claims)}
                {renderReadinessSummaryBucket(
                  "Suppressed/not-computed claims",
                  qbrReadinessSummary.suppressed_or_not_computed_claims
                )}
              </div>
              <div className="mrw-readiness-followup">
                <section>
                  <h4>Top blockers</h4>
                  <ul>
                    {qbrReadinessSummary.top_blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4>Next upgrade action</h4>
                  <p>{qbrReadinessSummary.next_upgrade_action}</p>
                </section>
              </div>
            </section>
            <div className="mrw-qbr-grid">
              <section className="mrw-qbr-section">
                <h4>Executive decision</h4>
                <p>
                  <strong>{qbrNarrative.executive_decision.headline}</strong>
                </p>
                <p>{qbrNarrative.executive_decision.summary}</p>
              </section>

              <section className="mrw-qbr-section">
                <h4>Strongest safe claim</h4>
                {renderClaimList([qbrNarrative.strongest_safe_claim])}
              </section>

              <section className="mrw-qbr-section">
                <h4>Caveated claims</h4>
                {renderClaimList(qbrNarrative.caveated_claims)}
              </section>

              <section className="mrw-qbr-section">
                <h4>Internal-only claims</h4>
                {renderClaimList(qbrNarrative.internal_only_claims)}
              </section>

              <section className="mrw-qbr-section">
                <h4>Suppressed / not-computed claims</h4>
                {renderClaimList(qbrNarrative.suppressed_or_not_computed_claims)}
              </section>

              <section className="mrw-qbr-section">
                <h4>Evidence gaps</h4>
                {renderEvidenceGaps(qbrNarrative.evidence_gaps)}
              </section>

              <section className="mrw-qbr-section">
                <h4>Upgrade actions</h4>
                <ul>
                  {qbrNarrative.upgrade_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </section>

              <section className="mrw-qbr-section">
                <h4>Governance boundaries</h4>
                <ul>
                  {qbrNarrative.governance_boundaries.map((boundary) => (
                    <li key={boundary}>{boundary}</li>
                  ))}
                </ul>
              </section>

              <section className="mrw-qbr-section">
                <h4>Methodology snapshot summary</h4>
                <dl className="mrw-qbr-summary">
                  <div>
                    <dt>Snapshot</dt>
                    <dd>{qbrNarrative.methodology_snapshot_summary.selected_methodology_snapshot_id}</dd>
                  </div>
                  <div>
                    <dt>Decision</dt>
                    <dd>{qbrNarrative.methodology_snapshot_summary.decision_state}</dd>
                  </div>
                  <div>
                    <dt>Approval</dt>
                    <dd>{qbrNarrative.methodology_snapshot_summary.approval_state}</dd>
                  </div>
                  <div>
                    <dt>Financial claim effect</dt>
                    <dd>{qbrNarrative.methodology_snapshot_summary.financial_claim_effect}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
