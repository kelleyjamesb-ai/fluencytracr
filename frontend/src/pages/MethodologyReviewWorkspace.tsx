import { useMemo, useState } from "react";
import * as methodologySchemas from "@learnaire/shared/dist/aiWorkValueGraphSchemas";
import { NIELSEN_METHODOLOGY_SNAPSHOT_REGISTRY } from "../constants/methodologyReview";

const { buildMethodologyReviewWorkspace } = methodologySchemas;

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

export function MethodologyReviewWorkspace() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("glean_time_saves_mvp_2025_10");
  const workspace = useMemo(
    () => buildMethodologyReviewWorkspace(NIELSEN_METHODOLOGY_SNAPSHOT_REGISTRY, selectedSnapshotId),
    [selectedSnapshotId]
  );
  const selected = workspace.selected_snapshot;

  return (
    <main className="mrw-shell">
      <header className="mrw-header">
        <div>
          <p className="mrw-kicker">Evidence Governance</p>
          <h1>Methodology Review Workspace</h1>
          <p>
            Review methodology approval, assumptions, sensitivity, and claim effects before financial or
            customer-facing language is emitted.
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
        </section>
      </section>
    </main>
  );
}
