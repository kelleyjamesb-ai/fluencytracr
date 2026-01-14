import type { ReactNode } from "react";

type NavItem = {
  key: string;
  label: string;
  icon?: ReactNode;
};

type SidebarProps = {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export const Sidebar = ({ items, activeKey, onSelect }: SidebarProps) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="eyebrow">Executive Dashboard v1</div>
        <h1>FluencyTracr</h1>
        <p>Signals, not facts. Executive-first and non-punitive by design.</p>
      </div>
      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeKey === item.key ? "nav-item active" : "nav-item"}
            onClick={() => onSelect(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>All views are aggregated. No individual inference permitted.</p>
      </div>
    </aside>
  );
};
