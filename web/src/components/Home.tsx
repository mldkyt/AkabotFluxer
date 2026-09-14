import type { PageKey } from "./Sidebar.tsx";
import { Button, Card } from "./ui/index.ts";

interface HomeProps {
  onNavigate: (key: PageKey) => void;
}

const MODULES: { key: PageKey; title: string; description: string }[] = [
  { key: "server-settings", title: "Server Settings", description: "Bot channel, command prefix, and command behavior." },
  { key: "reaction-roles", title: "Reaction Roles", description: "Let members grab roles by running !iam." },
  { key: "welcome-goodbye", title: "Welcome & Goodbye", description: "Greet new members and say goodbye to leavers." },
  { key: "chat-summary", title: "Chat Summary", description: "Summarize your server's conversations." },
  { key: "roles-on-join", title: "Roles on Join", description: "Grant roles to new members automatically." },
  { key: "verification", title: "Verification", description: "Verify members before they fully join." },
  { key: "meow-back", title: "Meow Back", description: "Meow back when someone says meow." },
  { key: "chat-revive", title: "Chat Revive", description: "Revive conversations that went quiet." },
];

const Home = ({ onNavigate }: HomeProps) => {
  return (
    <div>
      <h1>Welcome to Akabot</h1>
      <p>Admin panel for your Fluxer Discord bot. Pick a module from the sidebar to get started.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <Card key={mod.key} hover className="flex flex-col gap-2 p-4">
            <h3>{mod.title}</h3>
            <p>{mod.description}</p>
            <Button className="mt-auto w-fit" variant="secondary" onClick={() => onNavigate(mod.key)}>
              Open
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;