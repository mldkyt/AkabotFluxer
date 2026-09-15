export type PageKey =
  | "server-settings"
  | "reaction-roles"
  | "welcome-goodbye"
  | "chat-summary"
  | "roles-on-join"
  | "verification"
  | "meow-back"
  | "chat-revive"
  | "counting"
  | "anti-raid"
  | "logging"
  | "leveling";

export const NAV_ITEMS: { key: PageKey; label: string }[] = [
  { key: "server-settings", label: "Server Settings" },
  { key: "reaction-roles", label: "Reaction Roles" },
  { key: "welcome-goodbye", label: "Welcome & Goodbye" },
  { key: "chat-summary", label: "Chat Summary" },
  { key: "roles-on-join", label: "Roles on Join" },
  { key: "verification", label: "Verification" },
  { key: "meow-back", label: "Meow Back" },
  { key: "chat-revive", label: "Chat Revive" },
  { key: "counting", label: "Counting" },
  { key: "anti-raid", label: "Anti-Raid" },
  { key: "logging", label: "Logging" },
  { key: "leveling", label: "Leveling" },
];

interface SidebarProps {
  page: PageKey;
  onNavigate: (key: PageKey) => void;
}

const Sidebar = ({ page, onNavigate }: SidebarProps) => {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r overflow-y-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}>
      <div className="sidebar-header">
        <span className="sidebar-brand">Akabot</span>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className={`nav-item ${item.key === page ? "active" : ""}`}
                onClick={() => onNavigate(item.key)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
