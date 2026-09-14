import { Button, Surface, Typography } from "@heroui/react";
import type { PageKey } from "./Sidebar.tsx";

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
      <Typography type="h1">Welcome to Akabot</Typography>
      <Typography>Admin panel for your Fluxer Discord bot. Pick a module from the sidebar to get started.</Typography>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <Surface key={mod.key} className="flex flex-col gap-2 rounded-xl p-4">
            <Typography type="h3">{mod.title}</Typography>
            <Typography>{mod.description}</Typography>
            <Button className="mt-auto w-fit" variant="secondary" onClick={() => onNavigate(mod.key)}>
              Open
            </Button>
          </Surface>
        ))}
      </div>
    </div>
  );
};

export default Home;