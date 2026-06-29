import { Link } from "react-router-dom";
import { getAiValueDisplayLabel } from "../../../shared/src/aiValueEngine/language";
import { AiContributionReportingSpinePanel } from "../components/AiContributionReportingSpinePanel";
import { buildAiContributionReportingSpineViewModel } from "../lib/aiValueContributionReportingSpine";

type ClaimGateOutputKey =
  | "dollarized_output"
  | "realized_roi_calculation"
  | "ebita_impact_bridge"
  | "customer_facing_economic_output"
  | "causality_language"
  | "aggregate_workflow_productivity";

const executiveReadout = {
  workflow: {
    workflow_family: "customer_support_resolution",
    workflow_name: "Customer Support Resolution",
    function: "Customer Support",
    baseline_window: "2026-Q1",
    comparison_window: "2026-Q2"
  },
  vbd_operating_posture: {
    velocity: "HIGH",
    breadth: "MEDIUM",
    depth: "MEDIUM",
    mode: "FAST_BUT_SHALLOW",
    interpretation:
      "AI-enabled activity is increasing, but workflow depth and evidence quality are not yet strong enough for stronger value claims."
  },
  outcome_evidence: {
    status: "CAVEATED",
    primary_metric: "Resolution cycle time",
    movement: "Improved",
    quality_guardrail: "Reopen rate did not degrade",
    evidence_note:
      "Outcome movement is promising but remains internal and caveated until reviewer-owned evidence is complete."
  },
  financial_claim_gate: {
    mode: "INTERNAL_CLAIM_BOUNDARY_REVIEW",
    allowed_outputs: {
      dollarized_output: false,
      realized_roi_calculation: false,
      ebita_impact_bridge: false,
      customer_facing_economic_output: false,
      causality_language: false,
      aggregate_workflow_productivity: false
    } satisfies Record<ClaimGateOutputKey, boolean>
  },
  ebita_impact_summary: {
    status: "CLAIM_BOUNDARY_REVIEW_HELD",
    realized_ebita_claim_allowed: false,
    customer_facing_allowed: false,
    causality_claim_allowed: false,
    primary_ebita_levers: ["AGGREGATE_CAPACITY_CONTEXT", "OPERATING_PROCESS_CONTEXT"],
    evidence_quality: {
      adoption_evidence: "SUPPORTED",
      workflow_evidence: "CAVEATED",
      outcome_evidence: "CAVEATED",
      economic_claim_evidence: "BLOCKED",
      overall_evidence_posture: "HELD"
    },
    allowed_phrases: [
      "This workflow has aggregate evidence that requires further review.",
      "No realized economic claim is made."
    ],
    required_caveats: [
      "Outcome movement is not a proof claim.",
      "Economic translation remains blocked.",
      "Usage telemetry alone does not establish realized value."
    ],
    blocked_claims: [
      "usage_proves_ebita",
      "ai_caused_ebita_without_causal_design",
      "headcount_reduction_from_usage",
      "individual_productivity_claim",
      "manager_or_team_ranking"
    ],
    next_evidence_actions: [
      "Attach customer-owned outcome assumptions.",
      "Confirm source owner and review state.",
      "Confirm baseline and comparison windows.",
      "Do not use causal language unless experimental or quasi-experimental evidence is available."
    ]
  }
};

const outputLabels: Record<ClaimGateOutputKey, string> = {
  dollarized_output: getAiValueDisplayLabel("dollarized_output"),
  realized_roi_calculation: getAiValueDisplayLabel("realized_roi_calculation"),
  ebita_impact_bridge: getAiValueDisplayLabel("ebita_impact_bridge"),
  customer_facing_economic_output: getAiValueDisplayLabel("customer_facing_economic_output"),
  causality_language: getAiValueDisplayLabel("causality_language"),
  aggregate_workflow_productivity: getAiValueDisplayLabel("aggregate_workflow_productivity")
};

const reportingSpine = buildAiContributionReportingSpineViewModel({
  blueprintHypothesisRef: "blueprint_hypothesis.customer_support_resolution.readout_demo",
  workflowFunctionScope: executiveReadout.workflow.workflow_name,
  valueRouteLabel: "Capacity creation",
  metricLibraryRef: "metrics_library.readout_demo",
  questionMetricBridge: {
    available: true,
    items: [
      {
        id: "resolution_cycle_time",
        metricName: executiveReadout.outcome_evidence.primary_metric,
        valueRouteLabel: "Capacity creation",
        sourceSystem: "Customer-owned aggregate outcome source",
        measurementUnit: "time",
        owner: "Customer data owner",
        successMeasure: "Track aggregate resolution movement across approved milestone windows."
      }
    ]
  }
});

const blockedClaimCopy: Record<string, string> = {
  usage_proves_ebita: "Usage does not prove financial impact.",
  ai_caused_ebita_without_causal_design:
    "No AI-caused financial claim without an approved evidence design.",
  headcount_reduction_from_usage: "No headcount reduction claim from usage data.",
  individual_productivity_claim: "No individual productivity claim.",
  manager_or_team_ranking: "No manager or team ranking."
};

const evidenceAnnexItems = [
  {
    title: "Workflow telemetry",
    detail: "Reviewed aggregate workflow behavior only.",
    status: "Included",
    tone: "good"
  },
  {
    title: "Outcome metric context",
    detail: "Customer-owned metric movement remains caveated.",
    status: "Caveated",
    tone: "warn"
  },
  {
    title: "Quality guardrail",
    detail: "Reopen-rate guardrail did not degrade in the reviewed window.",
    status: "Caveated",
    tone: "warn"
  },
  {
    title: "Contribution reporting spine",
    detail: "Planning and reviewer-action posture only.",
    status: "Review only",
    tone: "neutral"
  },
  {
    title: "Economic translation",
    detail: "No dollar, ROI, or realized economic output authorized.",
    status: "Blocked",
    tone: "warn"
  },
  {
    title: "Attribution language",
    detail: "Causality language remains blocked.",
    status: "Blocked",
    tone: "warn"
  }
] satisfies Array<{
  title: string;
  detail: string;
  status: string;
  tone: "good" | "warn" | "neutral";
}>;

const formatToken = (value: string) => getAiValueDisplayLabel(value);

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "good" | "warn" | "neutral";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

const ListCard = ({
  title,
  items,
  ordered = false
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) => {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div className="ai-value-readout-list-block">
      <h3>{title}</h3>
      <ListTag>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
};

export const AIValueReadoutPrototype = () => {
  const {
    workflow,
    vbd_operating_posture: posture,
    outcome_evidence: outcome,
    financial_claim_gate: gate,
    ebita_impact_summary: ebita
  } = executiveReadout;

  const allowedOutputs = Object.entries(gate.allowed_outputs).filter(([, allowed]) => allowed);
  const blockedOutputs = Object.entries(gate.allowed_outputs).filter(([, allowed]) => !allowed);

  return (
    <main className="ai-value-shell ai-value-readout-prototype">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">Executive Value Case</p>
          <h1>AI Value Executive Readout</h1>
          <p>
            {workflow.workflow_name} · {workflow.function} · {workflow.baseline_window} to{" "}
            {workflow.comparison_window}
          </p>
        </div>
        <div className="ai-value-status-strip" aria-label="Readout status">
          <StatusPill label={formatToken(ebita.status)} tone="warn" />
          <Link className="ai-value-step" to="/ai-value-workspace">
            Back to workspace
          </Link>
        </div>
      </header>

      <section className="ai-value-context-bar" aria-label="Workflow being evaluated">
        <div>
          <span className="ai-value-map-label">Workflow</span>
          <strong>{workflow.workflow_name}</strong>
        </div>
        <div>
          <span className="ai-value-map-label">Function</span>
          <strong>{workflow.function}</strong>
        </div>
        <div>
          <span className="ai-value-map-label">Evidence window</span>
          <strong>
            {workflow.baseline_window} to {workflow.comparison_window}
          </strong>
        </div>
        <div>
          <span className="ai-value-map-label">Overall status</span>
          <strong>{formatToken(ebita.status)}</strong>
        </div>
      </section>

      <section className="ai-value-readout-report-frame" aria-label="Governed report frame">
        <div className="ai-value-readout-report-main">
          <article className="ai-value-readout-document" aria-label="Governed decision memo">
            <section className="ai-value-readout-report-hero">
              <div>
                <p className="eyebrow">Internal Governed Preview</p>
                <h2>Decision Memo</h2>
                <p>
                  Evidence supports planning and reviewer action only. Stronger economic,
                  causality, productivity, and customer-facing claims remain blocked.
                </p>
              </div>
              <aside>
                <StatusPill label={formatToken(ebita.status)} tone="warn" />
                <strong>Preview only</strong>
                <span>Export and sharing stay blocked until a promoted report-output contract exists.</span>
              </aside>
            </section>

            <section className="ai-value-readout-summary" aria-label="Executive value summary">
              <article>
                <span className="ai-value-map-label">VBD mode</span>
                <strong>{formatToken(posture.mode)}</strong>
              </article>
              <article>
                <span className="ai-value-map-label">Outcome evidence</span>
                <strong>{formatToken(outcome.status)}</strong>
              </article>
              <article>
                <span className="ai-value-map-label">Claim boundary review</span>
                <strong>{formatToken(gate.mode)}</strong>
              </article>
              <article>
                <span className="ai-value-map-label">Evidence posture</span>
                <strong>{formatToken(ebita.evidence_quality.overall_evidence_posture)}</strong>
              </article>
            </section>

            <section className="ai-value-readout-grid">
              <section className="ai-value-panel" aria-label="VBD operating posture">
                <div className="ai-value-section-head">
                  <div>
                    <p className="eyebrow">Operating Posture</p>
                    <h2>Operating Adoption Map</h2>
                  </div>
                  <StatusPill label={formatToken(posture.mode)} tone="warn" />
                </div>
                <div className="ai-value-readout-score-grid">
                  {[
                    ["Velocity", posture.velocity],
                    ["Breadth", posture.breadth],
                    ["Depth", posture.depth]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="ai-value-map-label">{label}</span>
                      <strong>{formatToken(value)}</strong>
                    </div>
                  ))}
                </div>
                <p>{posture.interpretation}</p>
              </section>

              <section className="ai-value-panel" aria-label="Measurement evidence">
                <div className="ai-value-section-head">
                  <div>
                    <p className="eyebrow">Evidence Collection</p>
                    <h2>Measurement Evidence</h2>
                  </div>
                  <StatusPill label={formatToken(outcome.status)} tone="warn" />
                </div>
                <dl className="ai-value-readout-facts">
                  <div>
                    <dt>Primary metric</dt>
                    <dd>{outcome.primary_metric}</dd>
                  </div>
                  <div>
                    <dt>Movement</dt>
                    <dd>{outcome.movement}</dd>
                  </div>
                  <div>
                    <dt>Quality guardrail</dt>
                    <dd>{outcome.quality_guardrail}</dd>
                  </div>
                </dl>
                <p>{outcome.evidence_note}</p>
              </section>

              <div className="ai-value-readout-spine">
                <AiContributionReportingSpinePanel spine={reportingSpine} />
              </div>

              <section className="ai-value-panel" aria-label="Claim boundary review">
                <div className="ai-value-section-head">
                  <div>
                    <p className="eyebrow">Claim Governance</p>
                    <h2>Claim Boundary Review</h2>
                  </div>
                  <StatusPill label={formatToken(gate.mode)} tone="warn" />
                </div>
                <p>
                  Stronger value language is held until reviewer-owned evidence and
                  comparison-design inputs are complete.
                </p>
                <div className="ai-value-output-columns">
                  <ListCard
                    title="Allowed"
                    items={
                      allowedOutputs.length > 0
                        ? allowedOutputs.map(([key]) => outputLabels[key as ClaimGateOutputKey])
                        : ["No stronger outputs allowed"]
                    }
                  />
                  <ListCard
                    title="Blocked"
                    items={blockedOutputs.map(([key]) => outputLabels[key as ClaimGateOutputKey])}
                  />
                </div>
              </section>

              <section className="ai-value-panel" aria-label="Stronger claims blocked">
                <div className="ai-value-section-head">
                  <div>
                    <p className="eyebrow">Boundary</p>
                    <h2>Stronger Claims Blocked</h2>
                  </div>
                  <StatusPill label={formatToken(ebita.status)} tone="warn" />
                </div>
                <p className="ai-value-readout-warning">No realized economic claim is allowed.</p>
                <div className="ai-value-output-columns">
                  <ListCard title="Review contexts" items={ebita.primary_ebita_levers.map(formatToken)} />
                  <div className="ai-value-readout-list-block">
                    <h3>Evidence posture</h3>
                    <dl className="ai-value-readout-facts ai-value-readout-evidence">
                      {Object.entries(ebita.evidence_quality).map(([field, value]) => (
                        <div key={field}>
                          <dt>{formatToken(field)}</dt>
                          <dd>{formatToken(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <div className="ai-value-readout-permissions" aria-label="Claim boundary permissions">
                  <span>Realized economic claim allowed: No</span>
                  <span>Customer-facing economic output allowed: No</span>
                  <span>Causality claim allowed: No</span>
                </div>
              </section>

              <section className="ai-value-panel" aria-label="Safe claims and caveats">
                <div className="ai-value-section-head">
                  <div>
                    <p className="eyebrow">Safe Language</p>
                    <h2>Safe Claims &amp; Caveats</h2>
                  </div>
                  <StatusPill label="Internal and caveated" tone="warn" />
                </div>
                <div className="ai-value-output-columns">
                  <ListCard title="Allowed phrases" items={ebita.allowed_phrases} />
                  <ListCard title="Required caveats" items={ebita.required_caveats} />
                </div>
              </section>

              <section className="ai-value-panel" aria-label="Blocked claims">
                <div className="ai-value-section-head">
                  <div>
                    <p className="eyebrow">Boundary</p>
                    <h2>Blocked Claims</h2>
                  </div>
                  <StatusPill label="Not allowed" tone="neutral" />
                </div>
                <ul className="ai-value-blocked-claim-list">
                  {ebita.blocked_claims.map((claim) => (
                    <li key={claim}>
                      <strong>{blockedClaimCopy[claim] ?? formatToken(claim)}</strong>
                      <span>{formatToken(claim)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ai-value-panel ai-value-readout-actions" aria-label="Next evidence actions">
                <div>
                  <p className="eyebrow">Next Move</p>
                  <h2>Next Evidence Actions</h2>
                  <p>
                    These actions move the case from internal measurement posture toward
                    reviewer-owned evidence collection.
                  </p>
                </div>
                <ol>
                  {ebita.next_evidence_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </section>
            </section>
          </article>

          <aside className="ai-value-readout-annex" aria-label="Evidence annex">
            <div>
              <p className="eyebrow">Evidence Inventory</p>
              <h2>Evidence Annex</h2>
              <p>
                Internal-only inventory for the governed preview. Blocked and review-only
                items are not exportable.
              </p>
            </div>
            <ul>
              {evidenceAnnexItems.map((item) => (
                <li key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <StatusPill label={item.status} tone={item.tone} />
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="ai-value-readout-export-bar" role="group" aria-label="Report output controls">
          <div>
            <span className="ai-value-map-label">Report output boundary</span>
            <strong>Preview only. Export not authorized until a promoted report-output contract exists.</strong>
          </div>
          <div className="ai-value-readout-export-actions">
            <button type="button" className="ai-value-step" disabled>
              Export not authorized
            </button>
            <button type="button" className="ai-value-step" disabled>
              Share not authorized
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
