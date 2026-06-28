import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type AiValueNavItem =
  | "Home"
  | "Value cases"
  | "Evidence"
  | "Metrics"
  | "Workflows"
  | "Risks"
  | "Decisions"
  | "Claim library"
  | "Approvals"
  | "Audit log";

const workspaceNav: { label: AiValueNavItem; path: string }[] = [
  { label: "Home", path: "/ai-value-workspace" },
  { label: "Value cases", path: "/ai-value-readout" },
  { label: "Evidence", path: "/ai-value-workspace/sources" },
  { label: "Metrics", path: "/ai-value-workspace/metrics" },
  { label: "Workflows", path: "/ai-value" },
  { label: "Risks", path: "/ai-value-workspace/readiness" },
  { label: "Decisions", path: "/ai-value-workspace/decisions" }
];

const governanceNav: { label: AiValueNavItem; path: string }[] = [
  { label: "Claim library", path: "/ai-value-workspace/case" },
  { label: "Approvals", path: "/ai-value-workspace/decisions" },
  { label: "Audit log", path: "/ai-value-workspace/sources" }
];

const allNav = [...workspaceNav, ...governanceNav];

export const AIValueReportLayout = ({
  activeNav,
  mode = "cockpit",
  title,
  children
}: {
  activeNav: AiValueNavItem;
  mode?: "cockpit" | "report";
  title: string;
  children: ReactNode;
}) => (
  <div className="ai-value-report-app" aria-label="AI value platform">
    <aside className="ai-value-report-sidebar" aria-label="Workspace navigation">
      <div className="ai-value-report-brand">
        <strong>FluencyTracr</strong>
        <span>Value Platform</span>
      </div>

      <nav>
        <p>Workspace</p>
        {workspaceNav.map((item) => (
          <Link
            className={activeNav === item.label ? "active" : undefined}
            key={item.label}
            to={item.path}
          >
            {item.label}
          </Link>
        ))}
        <p>Governance</p>
        {governanceNav.map((item) => (
          <Link
            className={activeNav === item.label ? "active" : undefined}
            key={item.label}
            to={item.path}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ai-value-report-user">
        <span>AM</span>
        <div>
          <strong>Alex Morgan</strong>
          <small>Value Lead</small>
        </div>
      </div>
    </aside>

    <section className="ai-value-report-workspace">
      <header className="ai-value-report-toolbar">
        <div>
          <p>{title}</p>
          <div className="ai-value-report-tabs" aria-label="Value case modes">
            <Link className={mode === "cockpit" ? "active" : undefined} to="/ai-value-workspace">
              Cockpit
            </Link>
            <Link className={mode === "report" ? "active" : undefined} to="/ai-value-readout">
              Report
            </Link>
          </div>
          <p className="ai-value-report-caveat-strip">
            Caveated review only: evidence supports planning, not proof of ROI. Causality blocked;
            blocked and internal-only items are excluded.
          </p>
        </div>
        <div className="ai-value-report-toolbar-actions">
          <button type="button">Settings</button>
          <button type="button">Review caveats</button>
          <button type="button" aria-label="More report actions">
            More
          </button>
        </div>
      </header>

      <nav className="ai-value-report-mobile-nav" aria-label="Workspace navigation">
        {allNav.map((item) => (
          <Link
            className={activeNav === item.label ? "active" : undefined}
            key={item.label}
            to={item.path}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </section>
  </div>
);
