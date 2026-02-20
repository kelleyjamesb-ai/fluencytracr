// EnablementView — Admin / Enablement Lead execution layer.
// Governance: org-aggregate workflows only. No individual attribution.
import { GovernanceDocumentWorkspace } from "../governanceConcept/GovernanceDocumentWorkspace";

const GSD_STEPS = [
  { id: "parse",    label: "Parse Document" },
  { id: "upload",   label: "Upload Policy" },
  { id: "select",   label: "Select Policy" },
  { id: "map",      label: "Run Mapping" },
  { id: "review",   label: "Review Hotspots" },
] as const;

export function EnablementView() {
  return (
    <section>
      <div className="gsd-section-header">
        <div>
          <h2>Enablement</h2>
          <p>Policy upload, mapping queue, and workflow execution — admin and enablement leads.</p>
        </div>
      </div>

      {/* 5-step GSD workflow rail */}
      <div className="gc-card" style={{ marginBottom: 20 }}>
        <p className="gc-mono" style={{ marginBottom: 12 }}>GSD Workflow State</p>
        <ol className="gc-step-list" style={{ listStyle: "none", padding: 0, display: "flex", gap: 0 }}>
          {GSD_STEPS.map((step, i) => (
            <li
              key={step.id}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                fontSize: 12,
                color: "#888",
                textAlign: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#f1f2f6", border: "2px solid #d8dbe4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, color: "#aaa", fontSize: 12,
                  zIndex: 1, position: "relative",
                }}
              >
                {i + 1}
              </span>
              {i < GSD_STEPS.length - 1 && (
                <span
                  style={{
                    position: "absolute", top: 13, left: "50%", right: "-50%",
                    height: 2, background: "#e2e0d8", zIndex: 0,
                  }}
                />
              )}
              {step.label}
            </li>
          ))}
        </ol>
      </div>

      {/* Full policy upload / mapping / clause workspace */}
      <GovernanceDocumentWorkspace />

      {/* Deferred V2 widget */}
      <div className="gsd-stub-card" style={{ marginTop: 24 }}>
        <h4>Enablement Focus Hotspots</h4>
        <p>
          Available in V2 — requires aggregate behavior endpoint. Shows areas where
          enablement work is most needed without individual attribution.
        </p>
      </div>
    </section>
  );
}
