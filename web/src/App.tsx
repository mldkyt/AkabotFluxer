import { useEffect, useState } from "react";
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
import { Button, Card, Input, ToastContainer } from "./components/ui/index.ts";

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
      <ToastContainer />
      {!authorized ? (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm flex flex-col gap-4 rounded-lg p-8">
            <h1 className="text-center">Akabot Admin</h1>
            <p className="text-center">
              Log in with the token from the settings command in Discord.
            </p>
            <div className="field">
              <Input
                type="text"
                value={token}
                onChange={(e) => setToken(e)}
                placeholder="Token"
                disabled={authorizing}
                className="w-full"
              />
            </div>
            <Button
              onClick={() => handleLogin(token)}
              isDisabled={authorizing || token.length === 0}
              className="w-full"
            >
              Log in
            </Button>
            {authError && <p className="field-error">An error occurred: {authError}</p>}
          </Card>
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