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
  preview,
  packetIds,
  onOpenReadout
}: {
  preview: ExecutiveReadoutPreview;
  packetIds: string[];
  onOpenReadout: (packetId: string) => void;
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
          See what will open for internal sponsor review and keep the evidence
          caveats attached to the report.
        </p>
      </div>
      <StatusPill label={reportDisplayCopy(preview.statusLabel)} tone={preview.statusTone} />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">
          {preview.canOpen ? "What will open" : "Why preview is held"}
        </span>
        <p>{reportDisplayCopy(preview.whatWillOpen)}</p>
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

    <div className="ai-value-chip-row">
      {preview.canOpen && packetIds.length > 0 ? (
        packetIds.map((packetId) => (
          <button
            type="button"
            className="ai-value-step"
            key={packetId}
            onClick={() => onOpenReadout(packetId)}
          >
            Open caveated internal preview
          </button>
        ))
      ) : (
        <StatusPill
          label={packetIds.length > 0 ? "Preview held for evidence review" : "Generate report first"}
          tone="warn"
        />
      )}
    </div>
  </section>
);
