import type { ExecutiveReadoutPreview } from "../hooks/useAiValueJourney";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

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
    aria-label="Executive readout preview"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Preview &amp; Share</p>
        <h2>Executive Readout Preview</h2>
        <p>
          See what will open for the sponsor before sharing it, and keep the
          evidence caveats attached to the readout.
        </p>
      </div>
      <StatusPill label={preview.statusLabel} tone={preview.statusTone} />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">What will open</span>
        <p>{preview.whatWillOpen}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Language held</span>
        <p>{preview.heldLanguage}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Next owner</span>
        <p>{preview.nextOwner}</p>
      </div>
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Next action</span>
        <p>{preview.nextAction}</p>
      </div>
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Caveat that travels</span>
        <p>{preview.caveat}</p>
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
            Open executive readout
          </button>
        ))
      ) : (
        <StatusPill label="Generate readout first" tone="warn" />
      )}
    </div>
  </section>
);
