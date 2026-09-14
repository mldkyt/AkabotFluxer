import type { PageKey } from "./Sidebar.tsx";
import { Button } from "./ui/index.ts";

interface HomeProps {
  onNavigate: (key: PageKey) => void;
}

const MODULES: { key: PageKey; title: string }[] = [
  { key: "server-settings", title: "Server Settings" },
  { key: "reaction-roles", title: "Reaction Roles" },
  { key: "welcome-goodbye", title: "Welcome & Goodbye" },
  { key: "chat-summary", title: "Chat Summary" },
  { key: "roles-on-join", title: "Roles on Join" },
  { key: "verification", title: "Verification" },
  { key: "meow-back", title: "Meow Back" },
  { key: "chat-revive", title: "Chat Revive" },
];

const Home = ({ onNavigate }: HomeProps) => {
  return (
    <div>
      <h2>Welcome to Akabot</h2>
      <div className="flex flex-col gap-2 max-w-sm">
        {MODULES.map((mod) => (
          <Button key={mod.key} variant="secondary" onClick={() => onNavigate(mod.key)}>
            {mod.title}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Home;