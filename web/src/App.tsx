import { useEffect, useState } from "react";
import MainPage from "./components/Main";
import ReactionRoles from "./components/ReactionRoles";
import { Button, Input, Label, ListBox, Select, Toast, Typography } from "@heroui/react";
import WelcomeGoodbye from "./components/WelcomeGoodbye.tsx";
import ChatSummary from "./components/ChatSummary.tsx";

const App = () => {
  const [authorized, setAuthorized] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [page, setPage] = useState("main");
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    if (tokenFromStorage && tokenFromStorage.length > 0) {
      handleLogin(tokenFromStorage);
    }
  }, []);

  const handleLogin = async (token: string) => {
    try {
      setAuthorizing(true);
      setAuthError("");

      const result = await fetch("/api/authorize", {
        method: "POST",
        body: JSON.stringify({
          token,
        }),
        credentials: "include",
      });

      if (!result.ok) {
        setAuthorizing(false);
        setAuthError("Invalid token");
      } else {
        setAuthorized(true);
        setAuthError("");
        localStorage.setItem("token", token);
      }
    } catch (e) {
      setAuthorizing(false);
      setAuthError(`Something went wrong: ${e}`);
      console.error(e);
    } finally {
      setAuthorizing(false);
    }
  };

  console.log(page);

  return (
    <div className="m-auto w-3/4 min-h-screen">
      <Toast.Provider />
      {!authorized && (
        <>
          <Typography type="h1" className="text-center mt-4">
            Log into the admin panel
          </Typography>
          <br />
          <Input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token"
            disabled={authorizing}
            className="w-full"
          />
          <br />
          <Button
            onClick={() => handleLogin(token)}
            variant="primary"
            isDisabled={authorizing}
            className="mt-4 w-full"
          >
            Log in
          </Button>
          <br />
          {authError && (
            <Typography className="text-red-500">
              An error occurred: {authError}
            </Typography>
          )}
        </>
      )}
      {authorized && (
        <>
          <Select
            id="page"
            value={page}
            onChange={(e) => setPage(e.toString())}
          >
            <Label>Page</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="main" textValue="main">
                  <Label>Main Page</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="reaction-roles" textValue="Reaction Roles">
                  <Label>Reaction Roles</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="welcome-goodbye" textValue="Welcome & Goodbye Messages">
                  <Label>Welcome & Goodbye Messages</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="chat-summary" textValue="Chat Summary">
                  <Label>Chat Summary</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
          {page === "main" && <MainPage />}
          {page === "reaction-roles" && <ReactionRoles />}
          {page === "welcome-goodbye" && <WelcomeGoodbye />}
          {page === "chat-summary" && <ChatSummary />}
        </>
      )}
    </div>
  );
};

export default App;
