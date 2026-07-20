import { Typography } from "@heroui/react/typography";
import { useEffect, useState } from "react";
import { Button, FieldError, Input, type Key, Label, ListBox, Select, Switch, TextField } from "@heroui/react";
import { request } from "../util.ts";

const Main = () => {
  const [botChannel, setBotChannel] = useState<Key>("null");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [deleteCommandMessage, setDeleteCommandMessage] = useState(false);
  const [onlyAllowCommandsInBotChannel, setOnlyAllowCommandsInBotChannel] = useState(false);
  const [commandPrefix, setCommandPrefix] = useState("!");

  const getSettings = async () => {
    const fetchChannels = await request("GET", "/api/text-channels");
    if (fetchChannels.ok) {
      setChannels(fetchChannels.data);
    }

    const fetchServerSettings = await request("GET", "/api/server-settings");
    if (fetchServerSettings.ok) {
      setBotChannel(fetchServerSettings.data.botChannel);
      setOnlyAllowCommandsInBotChannel(fetchServerSettings.data.onlyAllowCommandsInBotChannel);
      setDeleteCommandMessage(fetchServerSettings.data.deleteCommandMessage);
      setCommandPrefix(fetchServerSettings.data.prefix);
    }
  };

  const setSettings = async () => {
    await request("POST", "/api/server-settings", { botChannel, onlyAllowCommandsInBotChannel, deleteCommandMessage, prefix: commandPrefix });
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
