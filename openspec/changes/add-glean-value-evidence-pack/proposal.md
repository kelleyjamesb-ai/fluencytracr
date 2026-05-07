# Change: Add Glean Value Evidence Pack

## Why
Glean's Time-Saves and business-value narratives need an insertable, customer-safe evidence artifact that can show which ROI/value claims are evidenced, directional, assumption-heavy, not computed, or suppressed across live Glean surfaces. FluencyTracr already has readiness and EvidenceBundle contracts, but it lacks a dedicated org-window value evidence pack that includes Skills, Auto Mode Agents, MCP/actions, artifacts, and runtime controls.

## What Changes
- Add a Glean Value Evidence Pack contract for aggregate org-window value evidence across current Glean work surfaces.
- Add shared Zod validation for the `GVE_2026_05` pack shape.
- Add a synthetic example covering surface usage, Skills, Auto Mode Agents, triggered agents, MCP/actions, artifacts, controls, assumptions, and claim readiness.
- Keep the contract evidence-oriented: it governs claim readiness and safe language, but does not certify ROI or expose raw records.

## Impact
- Affected specs: `glean-value-evidence`
- Affected docs: `docs/contracts/glean-value-evidence/`
- Affected code: `shared/src/`
- Affected tests: backend schema/example validation tests
