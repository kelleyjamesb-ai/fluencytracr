import { Link } from "react-router-dom";
import { getAiValueDisplayLabel } from "../../../shared/src/aiValueEngine/language";

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
      "AI-enabled activity is increasing, but workflow depth and evidence quality are not yet strong enough for realized financial claims."
  },
  outcome_evidence: {
    status: "CAVEATED",
    primary_metric: "Resolution cycle time",
    movement: "Improved",
    quality_guardrail: "Reopen rate did not degrade",
    evidence_note:
      "Outcome movement is promising but requires finance-owned assumptions before dollarized claims."
  },
  financial_claim_gate: {
    mode: "EXECUTIVE_CAVEATED",
    allowed_outputs: {
      dollarized_output: false,
      realized_roi_calculation: false,
      ebita_impact_bridge: true,
      customer_facing_economic_output: false,
      causality_language: false,
      aggregate_workflow_productivity: true
    } satisfies Record<ClaimGateOutputKey, boolean>
  },
  ebita_impact_summary: {
    status: "DIRECTIONAL_EBITA_BRIDGE",
    realized_ebita_claim_allowed: false,
    customer_facing_allowed: false,
    causality_claim_allowed: false,
    primary_ebita_levers: ["CAPACITY_CREATION", "OPERATING_COST_REDUCTION"],
    evidence_quality: {
      adoption_evidence: "SUPPORTED",
      workflow_evidence: "CAVEATED",
      outcome_evidence: "CAVEATED",
      financial_evidence: "MISSING",
      overall_ebita_confidence: "DIRECTIONAL"
    },
    allowed_phrases: [
      "This workflow may affect financial outcomes through identified levers.",
      "No realized financial claim is made."
    ],
    required_caveats: [
      "Financial impact is directional, not proven.",
      "Financial translation requires customer-owned finance assumptions.",
      "Usage telemetry alone does not establish realized financial value."
    ],
    blocked_claims: [
      "usage_proves_ebita",
      "ai_caused_ebita_without_causal_design",
      "headcount_reduction_from_usage",
      "individual_productivity_claim",
      "manager_or_team_ranking"
    ],
    next_evidence_actions: [
      "Attach customer-owned financial assumptions.",
      "Confirm finance owner and approval state.",
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

const blockedClaimCopy: Record<string, string> = {
  usage_proves_ebita: "Usage does not prove financial impact.",
  ai_caused_ebita_without_causal_design:
    "No AI-caused financial claim without an approved evidence design.",
  headcount_reduction_from_usage: "No headcount reduction claim from usage data.",
  individual_productivity_claim: "No individual productivity claim.",
  manager_or_team_ranking: "No manager or team ranking."
};

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
        {items.map((item) => (
          <li key={item}>{item}</li>
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
          <span className="ai-value-map-label">Financial claim review</span>
          <strong>{formatToken(gate.mode)}</strong>
        </article>
        <article>
          <span className="ai-value-map-label">Financial confidence</span>
          <strong>{formatToken(ebita.evidence_quality.overall_ebita_confidence)}</strong>
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

        <section className="ai-value-panel" aria-label="Financial claim review">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Claim Governance</p>
              <h2>Financial Claim Review</h2>
            </div>
            <StatusPill label={formatToken(gate.mode)} tone="warn" />
          </div>
          <p>
            Financial language is limited to executive-caveated workflow evidence.
            Stronger economic claims require finance-owned assumptions and approval.
          </p>
          <div className="ai-value-output-columns">
            <ListCard
              title="Allowed"
              items={allowedOutputs.map(([key]) => outputLabels[key as ClaimGateOutputKey])}
            />
            <ListCard
              title="Blocked"
              items={blockedOutputs.map(([key]) => outputLabels[key as ClaimGateOutputKey])}
            />
          </div>
        </section>

        <section className="ai-value-panel" aria-label="Financial translation">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Financial Translation</p>
              <h2>Financial Translation</h2>
            </div>
            <StatusPill label={formatToken(ebita.status)} tone="warn" />
          </div>
          <p className="ai-value-readout-warning">No realized financial claim is allowed.</p>
          <div className="ai-value-output-columns">
            <ListCard title="Primary financial levers" items={ebita.primary_ebita_levers.map(formatToken)} />
            <div className="ai-value-readout-list-block">
              <h3>Evidence quality</h3>
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
          <div className="ai-value-readout-permissions" aria-label="Financial translation permissions">
            <span>Realized financial claim allowed: No</span>
            <span>Customer-facing allowed: No</span>
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
              These actions move the case from directional executive language toward
              finance-reviewed value modeling.
            </p>
          </div>
          <ol>
            {ebita.next_evidence_actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
};
