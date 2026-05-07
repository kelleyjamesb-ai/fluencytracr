import type { ReactNode } from "react";

type NavItem = {
  key: string;
  label: string;
  icon?: ReactNode;
};

type SidebarProps = {
  items: NavItem[]; // Primary items (top)
  secondaryItems?: NavItem[]; // Secondary items (bottom)
  activeKey: string;
  onSelect: (key: string) => void;
};

export const Sidebar = ({ items, secondaryItems = [], activeKey, onSelect }: SidebarProps) => {
  return (
    <aside className="sidebar flex flex-col h-full">
      <div className="sidebar-brand">
        <div className="eyebrow font-mono text-primary">Executive Dashboard v1</div>
        <h1 className="font-sans tracking-tight">FluencyTracr</h1>
        <p className="font-sans opacity-80">Signals, not facts. Executive-first and non-punitive by design.</p>
      </div>

      {/* Primary Navigation */}
      <nav className="sidebar-nav font-sans flex-1" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeKey === item.key ? "nav-item active font-medium" : "nav-item font-medium"}
            onClick={() => onSelect(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Secondary Navigation (Bottom) */}
      {secondaryItems.length > 0 && (
        <nav className="sidebar-nav font-sans mt-auto border-t border-slate-800 pt-4" aria-label="Secondary">
          {secondaryItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeKey === item.key ? "nav-item active font-medium" : "nav-item font-medium"}
              onClick={() => onSelect(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-footer mt-4">
        <p>All views are aggregated. No individual inference permitted.</p>
      </div>
    </aside>
  );
};
