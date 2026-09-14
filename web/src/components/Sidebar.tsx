import { Typography } from "@heroui/react/typography";

export type PageKey =
  | "home"
  | "server-settings"
  | "reaction-roles"
  | "welcome-goodbye"
  | "chat-summary"
  | "roles-on-join"
  | "verification"
  | "meow-back"
  | "chat-revive";

export const NAV_ITEMS: { key: PageKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "server-settings", label: "Server Settings" },
  { key: "reaction-roles", label: "Reaction Roles" },
  { key: "welcome-goodbye", label: "Welcome & Goodbye" },
  { key: "chat-summary", label: "Chat Summary" },
  { key: "roles-on-join", label: "Roles on Join" },
  { key: "verification", label: "Verification" },
  { key: "meow-back", label: "Meow Back" },
  { key: "chat-revive", label: "Chat Revive" },
];

interface SidebarProps {
  page: PageKey;
  onNavigate: (key: PageKey) => void;
}

const Sidebar = ({ page, onNavigate }: SidebarProps) => {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 bg-black/20 p-4">
      <div className="mb-4 px-3">
        <Typography type="h2">Akabot</Typography>
      </div>
      {NAV_ITEMS.map((item) => {
        const active = item.key === page;
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              active
                ? "bg-white/15 font-medium text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </aside>
  );
};

export default Sidebar;