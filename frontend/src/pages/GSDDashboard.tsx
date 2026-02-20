import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { ExecBoardView } from "../components/gsd/ExecBoardView";
import { OperatorView } from "../components/gsd/OperatorView";
import { EnablementView } from "../components/gsd/EnablementView";
import { useGovernanceContext } from "../hooks/useGovernanceContext";

type GSDSection = "board" | "operator" | "enablement";

const defaultSection = (role: string): GSDSection => {
  if (role === "ENABLEMENT_LEAD") return "enablement";
  return "board";
};

const canAccess = (section: GSDSection, role: string): boolean => {
  if (section === "board") return true;
  if (section === "operator") return role === "ADMIN";
  if (section === "enablement") return role === "ADMIN" || role === "ENABLEMENT_LEAD";
  return false;
};

export function GSDDashboard() {
  const { orgId, role, isAdmin, isEnablementLead } = useGovernanceContext();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<GSDSection>(
    () => defaultSection(role)
  );

  // Double-gate: if role changes and active section is no longer permitted, reset to board.
  useEffect(() => {
    if (!canAccess(activeSection, role)) {
      setActiveSection("board");
    }
  }, [role, activeSection]);

  // Dev session state
  const [devOrgId, setDevOrgId] = useState(orgId);
  const [devRole, setDevRole] = useState(role);

  const applySession = () => {
    localStorage.setItem("orgId", devOrgId);
    localStorage.setItem("role", devRole);
    window.location.reload();
  };

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Build role-gated nav items using positive role checks.
  // Unknown/unrecognized roles see Board View only (most restrictive).
  const navItems = [
    { key: "board", label: "Board View" },
    ...(isAdmin ? [{ key: "operator", label: "Operator View" }] : []),
    ...(isAdmin || isEnablementLead ? [{ key: "enablement", label: "Enablement" }] : []),
  ];

  const secondaryItems = [
    { key: "legacy", label: "Legacy Dashboard" },
    { key: "concept", label: "Concept Page" },
  ];

  const handleSelect = (key: string) => {
    if (key === "legacy") { navigate("/legacy-dashboard"); return; }
    if (key === "concept") { navigate("/concept"); return; }
    if (canAccess(key as GSDSection, role)) {
      setActiveSection(key as GSDSection);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
        <div className="sidebar-brand">
          <div className="eyebrow" style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.6 }}>
            GSD Dashboard
          </div>
          <h1 style={{ fontFamily: "sans-serif", margin: "4px 0" }}>FluencyTracr</h1>
          <p style={{ fontSize: 12, opacity: 0.6, margin: "2px 0" }}>
            Signals, not surveillance.
          </p>
          <span className="gsd-role-badge">{role}</span>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{orgId}</div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1 }}>
          <div className="gsd-shell-nav-section">
            <span className="gsd-shell-section-label">Navigation</span>
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeSection === item.key ? "nav-item active" : "nav-item"}
                onClick={() => handleSelect(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {secondaryItems.length > 0 && (
            <div className="gsd-shell-nav-section" style={{ marginTop: "auto" }}>
              <span className="gsd-shell-section-label">Other Views</span>
              {secondaryItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="nav-item"
                  onClick={() => handleSelect(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <p style={{ fontSize: 11, opacity: 0.6, marginBottom: 10 }}>
            All views are aggregated. No individual inference permitted.
          </p>
          <button
            type="button"
            className="nav-item"
            onClick={handleSignOut}
            style={{ width: "100%", textAlign: "left" }}
          >
            Sign out
          </button>

          {/* Dev session controls — not primary content */}
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 11, opacity: 0.5, cursor: "pointer" }}>
              Dev: session controls
            </summary>
            <div style={{ paddingTop: 8, display: "grid", gap: 6 }}>
              <input
                value={devOrgId}
                onChange={(e) => setDevOrgId(e.target.value)}
                style={{ fontSize: 11, padding: "3px 6px", borderRadius: 4, border: "1px solid #333", background: "#111", color: "#fff" }}
                placeholder="Org ID"
              />
              <select
                value={devRole}
                onChange={(e) => setDevRole(e.target.value)}
                style={{ fontSize: 11, padding: "3px 6px", borderRadius: 4, border: "1px solid #333", background: "#111", color: "#fff" }}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="EXEC_VIEWER">EXEC_VIEWER</option>
                <option value="ENABLEMENT_LEAD">ENABLEMENT_LEAD</option>
              </select>
              <button
                type="button"
                onClick={applySession}
                style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, background: "#343CED", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Apply
              </button>
            </div>
          </details>
        </div>
      </aside>

      <main className="main" style={{ padding: "32px 40px", overflowY: "auto" }}>
        {activeSection === "board" && (
          <ExecBoardView onRequestSection={(s) => setActiveSection(s as GSDSection)} />
        )}
        {activeSection === "operator" && isAdmin && <OperatorView />}
        {activeSection === "enablement" && (isAdmin || isEnablementLead) && <EnablementView />}
      </main>
    </div>
  );
}
