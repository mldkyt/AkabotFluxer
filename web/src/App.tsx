import { useEffect, useState } from "react";
import { Button, Input, Surface, Toast, Typography } from "@heroui/react";
import ChatRevive from "./components/ChatRevive.tsx";
import ChatSummary from "./components/ChatSummary.tsx";
import Home from "./components/Home.tsx";
import MeowBack from "./components/MeowBack.tsx";
import ReactionRoles from "./components/ReactionRoles.tsx";
import RolesOnJoin from "./components/RolesOnJoin.tsx";
import ServerSettings from "./components/ServerSettings.tsx";
import Sidebar, { type PageKey } from "./components/Sidebar.tsx";
import Verification from "./components/Verification.tsx";
import WelcomeGoodbye from "./components/WelcomeGoodbye.tsx";

const App = () => {
  const [authorized, setAuthorized] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [page, setPage] = useState<PageKey>("home");
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    if (tokenFromStorage && tokenFromStorage.length > 0) {
      handleLogin(tokenFromStorage);
    }
  }, []);

  const handleLogin = async (loginToken: string) => {
    try {
      setAuthorizing(true);
      setAuthError("");

      const result = await fetch("/api/authorize", {
        method: "POST",
        body: JSON.stringify({
          token: loginToken,
        }),
        credentials: "include",
      });

      if (!result.ok) {
        setAuthorizing(false);
        setAuthError("Invalid token");
      } else {
        setAuthorized(true);
        setAuthError("");
        localStorage.setItem("token", loginToken);
      }
    } catch (e) {
      setAuthorizing(false);
      setAuthError(`Something went wrong: ${e}`);
      console.error(e);
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Toast.Provider />
      {!authorized ? (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Surface className="flex w-full max-w-sm flex-col gap-4 rounded-2xl p-8">
            <Typography type="h1" className="text-center">
              Akabot Admin
            </Typography>
            <Typography className="text-center">
              Log in with the token from the settings command in Discord.
            </Typography>
            <Input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token"
              disabled={authorizing}
              className="w-full"
            />
            <Button
              onClick={() => handleLogin(token)}
              variant="primary"
              isDisabled={authorizing || token.length === 0}
              className="w-full"
            >
              Log in
            </Button>
            {authError && <Typography className="text-red-500">An error occurred: {authError}</Typography>}
          </Surface>
        </div>
      ) : (
        <div className="flex">
          <Sidebar page={page} onNavigate={setPage} />
          <main className="flex-1 px-8 py-6">
            <div className="mx-auto max-w-4xl">
              {page === "home" && <Home onNavigate={setPage} />}
              {page === "server-settings" && <ServerSettings />}
              {page === "reaction-roles" && <ReactionRoles />}
              {page === "welcome-goodbye" && <WelcomeGoodbye />}
              {page === "chat-summary" && <ChatSummary />}
              {page === "roles-on-join" && <RolesOnJoin />}
              {page === "verification" && <Verification />}
              {page === "meow-back" && <MeowBack />}
              {page === "chat-revive" && <ChatRevive />}
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;