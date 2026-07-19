import { Typography } from "@heroui/react/typography";
import { useEffect, useState } from "react";
import { Button, type Key, Label, ListBox, Select } from "@heroui/react";

const Main = () => {
  const [botChannel, setBotChannel] = useState<Key>("null");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

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

    if (serverSettings && serverSettings.botChannel) {
      setBotChannel(serverSettings.botChannel);
    } else {
      setBotChannel("null");
    }
    setChannels(channels);
  };

  const setSettings = async () => {
    const res = await fetch("/api/server-settings", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({
        botChannel,
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

      <Select
        value={botChannel}
        onChange={(x) => setBotChannel(x)}
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

      <Button onClick={setSettings}>Save</Button>
    </div>
  );
};

export default Main;
