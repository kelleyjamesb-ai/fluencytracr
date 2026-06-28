import { Link } from "react-router-dom";
import { AIValueReportLayout } from "../components/AIValueReportLayout";
import { AiContributionReportingSpinePanel } from "../components/AiContributionReportingSpinePanel";
import { buildAiContributionReportingSpineViewModel } from "../lib/aiValueContributionReportingSpine";

type EvidenceStatus = "Included" | "Caveated" | "Needs evidence" | "Internal only" | "Blocked";

const reportContext = {
  client: "Northbridge Financial Services",
  workflow: "AI Assistant Value Assessment",
  prepared: "May 14, 2025",
  primaryMetric: "Resolution cycle time"
};

const reportingSpine = buildAiContributionReportingSpineViewModel({
  blueprintHypothesisRef: "blueprint_hypothesis.customer_support_resolution.readout_demo",
  workflowFunctionScope: "Customer Support Resolution",
  valueRouteLabel: "Capacity creation",
  metricLibraryRef: "metrics_library.readout_demo",
  questionMetricBridge: {
    available: true,
    items: [
      {
        id: "resolution_cycle_time",
        metricName: reportContext.primaryMetric,
        valueRouteLabel: "Capacity creation",
        sourceSystem: "Customer-owned aggregate outcome source",
        measurementUnit: "time",
        owner: "Customer data owner",
        successMeasure: "Track aggregate resolution movement across approved milestone windows."
      }
    ]
  }
});

const evidenceBlocks: {
  title: string;
  detail: string;
  version: string;
  status: EvidenceStatus;
}[] = [
  {
    title: "Workflow telemetry",
    detail: "Reviewed aggregate workflow behavior",
    version: "v1.2",
    status: "Included"
  },
  {
    title: "Cycle time analysis",
    detail: "Customer-owned operating metric",
    version: "v1.1",
    status: "Included"
  },
  {
    title: "Quality / error review",
    detail: "Guardrail evidence, limited window",
    version: "v1.0",
    status: "Caveated"
  },
  {
    title: "Adoption signals",
    detail: "Aggregate behavior context only",
    version: "v1.0",
    status: "Caveated"
  },
  {
    title: "Business outcome metrics",
    detail: "Requested from customer owner",
    version: "Pending",
    status: "Needs evidence"
  },
  {
    title: "Financial impact analysis",
    detail: "Financial attribution not authorized",
    version: "Pending",
    status: "Blocked"
  },
  {
    title: "Vendor benchmark pack",
    detail: "Reference material, not report evidence",
    version: "Internal",
    status: "Internal only"
  },
  {
    title: "Attribution analysis",
    detail: "Causality design not present",
    version: "Pending",
    status: "Blocked"
  }
];

const supportedEvidence = [
  {
    label: "Workflow process signals",
    detail: "Supported by workflow telemetry",
    status: "Included" as EvidenceStatus
  },
  {
    label: "Quality / accuracy gains",
    detail: "Partially supported; limited error data",
    status: "Caveated" as EvidenceStatus
  },
  {
    label: "User experience and adoption signals",
    detail: "Supported directionally",
    status: "Caveated" as EvidenceStatus
  },
  {
    label: "Implementation feasibility",
    detail: "Supported by implementation evidence",
    status: "Included" as EvidenceStatus
  }
];

const excludedEvidence = [
  {
    label: "Customer business outcomes",
    detail: "Missing customer-owned metrics",
    status: "Needs evidence" as EvidenceStatus
  },
  {
    label: "Financial impact",
    detail: "Causality blocked",
    status: "Blocked" as EvidenceStatus
  },
  {
    label: "Vendor internal benchmarks",
    detail: "Internal only",
    status: "Internal only" as EvidenceStatus
  },
  {
    label: "Attribution to AI Assistant",
    detail: "Causality blocked",
    status: "Blocked" as EvidenceStatus
  }
];

const nextMoves = [
  "Secure customer-owned metrics for outcomes and baseline comparison.",
  "Run a controlled, time-boxed pilot with clear success criteria.",
  "Reassess evidence and update claims upon data collection.",
  "Scale decision contingent on validated outcomes and readiness."
];

const statusTone: Record<EvidenceStatus, "good" | "warn" | "neutral" | "danger"> = {
  Included: "good",
  Caveated: "warn",
  "Needs evidence": "neutral",
  "Internal only": "neutral",
  Blocked: "danger"
};

const StatusPill = ({ label }: { label: EvidenceStatus | string }) => {
  const tone = label in statusTone ? statusTone[label as EvidenceStatus] : "neutral";

  return <span className={`ai-value-report-pill ai-value-report-pill-${tone}`}>{label}</span>;
};

const EvidenceRow = ({
  label,
  detail,
  status
}: {
  label: string;
  detail: string;
  status: EvidenceStatus;
}) => (
  <li className="ai-value-report-evidence-row">
    <div>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
    <StatusPill label={status} />
  </li>
);

export const AIValueReadoutPrototype = () => {
  const includedCount = evidenceBlocks.filter((block) => block.status === "Included").length;
  const caveatedCount = evidenceBlocks.filter((block) => block.status === "Caveated").length;
  const excludedCount = evidenceBlocks.length - includedCount - caveatedCount;

  return (
    <AIValueReportLayout
      activeNav="Value cases"
      mode="report"
      title="Value Case: AI Assistant Value Assessment"
    >
      <div className="ai-value-report-main">
        <article className="ai-value-report-document" aria-label="Client value evidence report">
          <section className="ai-value-report-meta" aria-label="Report context">
            <div>
              <span>Client</span>
              <strong>{reportContext.client}</strong>
            </div>
            <div>
              <span>Workflow</span>
              <strong>{reportContext.workflow}</strong>
            </div>
            <div>
              <span>Date prepared</span>
              <strong>{reportContext.prepared}</strong>
            </div>
          </section>

          <section className="ai-value-report-hero">
            <div>
              <h1>Decision Memo</h1>
              <p>Caveated client report</p>
            </div>
            <aside>
              <strong>Evidence supports planning, not ROI proof</strong>
              <span>Customer-owned metric required for stronger claims</span>
              <span>Causality blocked</span>
            </aside>
          </section>

          <section className="ai-value-report-section">
            <h2>Executive narrative</h2>
            <p>
              The AI Assistant initiative is positioned to improve how internal teams access
              information and complete routine tasks. Evidence indicates potential for reduced
              cycle time and fewer handoffs in targeted processes.
            </p>
            <p>
              Claims remain caveated because customer-owned metrics are unavailable and causality
              cannot be established. We recommend a phased plan that secures the missing evidence
              and validates outcomes in a controlled rollout.
            </p>
          </section>

          <section className="ai-value-report-section">
            <h2>Evidence posture</h2>
            <div className="ai-value-report-evidence-grid">
              <div>
                <h3>Supported in report</h3>
                <ul>
                  {supportedEvidence.map((item) => (
                    <EvidenceRow key={item.label} {...item} />
                  ))}
                </ul>
              </div>
              <div>
                <h3>Not supported in report</h3>
                <ul>
                  {excludedEvidence.map((item) => (
                    <EvidenceRow key={item.label} {...item} />
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="ai-value-report-section">
            <h2>Contribution reporting spine</h2>
            <AiContributionReportingSpinePanel spine={reportingSpine} />
          </section>

          <section className="ai-value-report-bottom-grid">
            <div className="ai-value-report-boundary">
              <h2>Claim boundary</h2>
              <p>
                <strong>In scope:</strong> Internal knowledge retrieval and task assistance within
                the selected pilot workflows and business units.
              </p>
              <p>
                <strong>Out of scope:</strong> Enterprise-wide impact, financial outcomes, customer
                experience, individual productivity, and benefits outside the pilot period.
              </p>
            </div>

            <div className="ai-value-report-next">
              <h2>Recommended next move</h2>
              <ol>
                {nextMoves.map((move) => (
                  <li key={move}>{move}</li>
                ))}
              </ol>
            </div>
          </section>
        </article>

        <aside className="ai-value-report-annex" aria-label="Evidence annex">
          <div>
            <h2>Evidence Annex</h2>
            <p>Internal evidence inventory feeding this report. Blocked items are not exported.</p>
          </div>
          <ul>
            {evidenceBlocks.map((block) => (
              <li key={block.title}>
                <div>
                  <strong>{block.title}</strong>
                  <span>
                    {block.version} · {block.detail}
                  </span>
                </div>
                <StatusPill label={block.status} />
              </li>
            ))}
          </ul>
          <Link to="/ai-value-workspace">View evidence library</Link>
        </aside>
      </div>

      <footer className="ai-value-report-export-bar" aria-label="Export readiness">
        <div>
          <span>Export readiness</span>
          <strong>Ready for caveated review</strong>
          <small>Blocked and internal-only items are excluded</small>
        </div>
        <div>
          <span>Report status</span>
          <strong>Caveated client report</strong>
          <small>Evidence supports planning, not ROI proof</small>
        </div>
        <div>
          <span>Included</span>
          <strong>{includedCount}</strong>
          <small>evidence blocks</small>
        </div>
        <div>
          <span>Caveated</span>
          <strong>{caveatedCount}</strong>
          <small>evidence blocks</small>
        </div>
        <div>
          <span>Not included</span>
          <strong>{excludedCount}</strong>
          <small>evidence blocks</small>
        </div>
        <div className="ai-value-report-export-actions">
          <button type="button">Run export check</button>
          <button type="button" className="primary">
            Export caveated report
          </button>
        </div>
      </footer>
    </AIValueReportLayout>
  );
};
