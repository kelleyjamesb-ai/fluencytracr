import type { ExecutiveReadoutPreview } from "../hooks/useAiValueJourney";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

const reportDisplayCopy = (value: string) =>
  value
    .replace(/Executive Readout/g, "Executive Report")
    .replace(/executive readout/g, "executive report")
    .replace(/Readout/g, "Report")
    .replace(/readout/g, "report");

export const ExecutiveReadoutPreviewPanel = ({
  preview
}: {
  preview: ExecutiveReadoutPreview;
}) => (
  <section
    className="ai-value-panel ai-value-readout-preview-panel"
    aria-label="Executive report preview"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Internal Preview</p>
        <h2>Executive Report Preview</h2>
        <p>
          Review planning guidance for internal sponsor discussion while keeping
          evidence caveats attached.
        </p>
        <p>{reportDisplayCopy(preview.statusLabel)}</p>
      </div>
      <StatusPill
        label={
          preview.reviewState === "READY"
            ? "Internal review planning only"
            : "Review held for evidence"
        }
        tone={preview.reviewState === "READY" ? "neutral" : "warn"}
      />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">
          Review contents
        </span>
        <p>{reportDisplayCopy(preview.reviewContents)}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Language held</span>
        <p>{reportDisplayCopy(preview.heldLanguage)}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Next owner</span>
        <p>{preview.nextOwner}</p>
      </div>
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Next action</span>
        <p>{reportDisplayCopy(preview.nextAction)}</p>
      </div>
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Caveat that travels</span>
        <p>{reportDisplayCopy(preview.caveat)}</p>
      </div>
    </div>
  </section>
);
