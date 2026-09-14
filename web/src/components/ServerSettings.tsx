import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Input, Label, Select, Switch } from "./ui/index.ts";

const ServerSettings = () => {
  const [botChannel, setBotChannel] = useState("null");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [deleteCommandMessage, setDeleteCommandMessage] = useState(false);
  const [onlyAllowCommandsInBotChannel, setOnlyAllowCommandsInBotChannel] = useState(false);
  const [commandPrefix, setCommandPrefix] = useState("!");

  const prefixError = commandPrefix.length < 1 ? "The command prefix must be at least 1 letter" : commandPrefix.length > 5 ? "Command prefix is too long" : "";

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
      <h2>Server Settings</h2>
      <div className="flex flex-col gap-2">
        <Select value={botChannel} onChange={setBotChannel} label="Bot Channel">
          <option value="null">No bot channel</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>

        <Switch checked={deleteCommandMessage} onChange={setDeleteCommandMessage} label="Delete command messages" />

        <Switch checked={onlyAllowCommandsInBotChannel} onChange={setOnlyAllowCommandsInBotChannel} label="Only allow using commands in the bot channel" />

        <div className="field">
          <Label>Command Prefix</Label>
          <Input
            type="text"
            value={commandPrefix}
            onChange={setCommandPrefix}
            minLength={1}
            maxLength={5}
          />
        </div>

        <Button onClick={setSettings} isDisabled={!!prefixError}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default ServerSettings;