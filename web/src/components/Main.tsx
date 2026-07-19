import { Typography } from "@heroui/react/typography";
import { useEffect, useState } from "react";
import { Button, FieldError, Input, type Key, Label, ListBox, Select, Switch, TextField } from "@heroui/react";

const Main = () => {
  const [botChannel, setBotChannel] = useState<Key>("null");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [deleteCommandMessage, setDeleteCommandMessage] = useState(false);
  const [onlyAllowCommandsInBotChannel, setOnlyAllowCommandsInBotChannel] = useState(false);
  const [commandPrefix, setCommandPrefix] = useState("!");

  const getSettings = async () => {
    const fetchChannels = await fetch("/api/text-channels", {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!fetchChannels.ok) {
      alert(await fetchChannels.text());
    }

    const fetchServerSettings = await fetch("/api/server-settings", {
      method: "GET",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!fetchServerSettings.ok) {
      alert(await fetchServerSettings.text());
    }

    const channels = await fetchChannels.json();
    const serverSettings = await fetchServerSettings.json();

    setBotChannel(serverSettings.botChannel);
    setOnlyAllowCommandsInBotChannel(serverSettings.onlyAllowCommandsInBotChannel);
    setDeleteCommandMessage(serverSettings.deleteCommandMessage);
    setChannels(channels);
    setCommandPrefix(serverSettings.prefix);
  };

  const setSettings = async () => {
    const res = await fetch("/api/server-settings", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({
        botChannel,
        onlyAllowCommandsInBotChannel,
        deleteCommandMessage,
        prefix: commandPrefix,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      alert(error);
    }
  };

  useEffect(() => {
    getSettings();
  }, []);

  return (
    <div>
      <Typography type="h1">Welcome to Akabot</Typography>

      <Typography type="h2">Basic server settings</Typography>

      <div className="flex flex-col gap-2">
        <Select
          value={botChannel}
          onChange={(x) => setBotChannel(x?.toString() ?? "null")}
        >
          <Label>Bot Channel</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="null" id="null" textValue="No bot channel">
                No bot channel
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {channels.map((channel) => (
                <ListBox.Item key={channel.id} id={channel.id} textValue={channel.name}>
                  #{channel.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Switch isSelected={deleteCommandMessage} onChange={setDeleteCommandMessage}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Delete command messages
          </Switch.Content>
        </Switch>

        <Switch isSelected={onlyAllowCommandsInBotChannel} onChange={setOnlyAllowCommandsInBotChannel}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Only allow using commands in the bot channel
          </Switch.Content>
        </Switch>

        <TextField
          value={commandPrefix}
          onChange={(x) => setCommandPrefix(x)}
          minLength={1}
          maxLength={5}
          validate={(x) => {
            if (x.length < 1) return "The command prefix must be at least 1 letter";
            if (x.length > 5) return "Command prefix is too long";
            return true;
          }}
        >
          <Label>Command Prefix</Label>
          <Input type="text" />
          <FieldError />
        </TextField>

        <Button onClick={setSettings} isDisabled={commandPrefix.length < 1 || commandPrefix.length > 5}>Save</Button>
      </div>
    </div>
  );
};

export default Main;
