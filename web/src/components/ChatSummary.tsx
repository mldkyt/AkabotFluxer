import { useEffect, useState } from "react";
import { Button, Label, ListBox, NumberField, Select, Skeleton, Switch, Table, toast, Typography } from "@heroui/react";

const ChatSummary = () => {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [chatSummaryChannels, setChatSummaryChannels] = useState<string[]>([]);

  const [enableExtraSummaries, setEnableExtraSummaries] = useState(false);
  const [extraSummariesRows, setExtraSummariesRows] = useState(5);
  const [summariesRows, setSummariesRows] = useState(5);
  const [countBots, setCountBots] = useState(false);

  const [addChannelId, setAddChannelId] = useState("");

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const channelsFetch = await fetch("/api/text-channels", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!channelsFetch.ok) {
      console.log(channelsFetch);
      toast.danger("Failed to load channels....");
      return;
    }

    const fetchedChannelsJson = await channelsFetch.json() as { id: string; name: string }[];
    setChannels(fetchedChannelsJson);

    const settingsFetch = await fetch("/api/chat-summary", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!settingsFetch.ok) {
      console.log(settingsFetch);
      toast.danger("failed to load chat summary settings");
      return;
    }

    const fetchedSettingsJson = await settingsFetch.json();
    setCountBots(fetchedSettingsJson.countBots);
    setEnableExtraSummaries(fetchedSettingsJson.enableExtraSummaries);
    setExtraSummariesRows(fetchedSettingsJson.extraSummariesRows);
    setSummariesRows(fetchedSettingsJson.summariesRows);
    setChatSummaryChannels(fetchedSettingsJson.channels);

    setLoading(false);
  };

  const saveData = async () => {
    const res = await fetch("/api/chat-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        countBots,
        enableExtraSummaries,
        extraSummariesRows,
        summariesRows,
      }),
    });

    if (!res.ok) {
      console.log(res);
      alert("failed to save chat summary settings");
      return;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addChannel = async () => {
    const res = await fetch("/api/chat-summary/channels", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      method: "POST",
      body: JSON.stringify({
        channelId: addChannelId,
      }),
    });

    if (res.ok) {
      setChatSummaryChannels([...chatSummaryChannels, addChannelId]);
      setAddChannelId("");
    } else {
      alert(await res.text());
    }
  };

  const remChannel = async (channel: string) => {
    const res = await fetch("/api/chat-summary/channels", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      method: "DELETE",
      body: JSON.stringify({
        channelId: channel,
      }),
    });

    if (res.ok) {
      setChatSummaryChannels(chatSummaryChannels.filter((ch) => ch !== channel));
    } else {
      alert(await res.text());
    }
  };

  if (loading) {
    return (
      <div>
        <Typography type="h1">Chat Summary</Typography>

        <Skeleton className="w-66 h-12 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-8 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-8 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-24 m-2 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <Typography type="h1">Chat Summary</Typography>

      <Typography type="h2">Settings</Typography>

      <div className="flex flex-col gap-2">
        <NumberField value={summariesRows} onChange={(x) => setSummariesRows(x)} minValue={3} maxValue={10}>
          <Label>Chat summary row count</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input></NumberField.Input>
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>

        <Switch isSelected={enableExtraSummaries} onChange={(x) => setEnableExtraSummaries(x)}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Enable monthly and yearly chat summaries
          </Switch.Content>
        </Switch>

        {enableExtraSummaries &&
          (
            <NumberField value={extraSummariesRows} onChange={(x) => setExtraSummariesRows(x)} minValue={3} maxValue={10}>
              <Label>Monthly and yearly chat summary row count</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input></NumberField.Input>
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          )}

        <Switch isSelected={countBots} onChange={(x) => setCountBots(x)}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Count bots
          </Switch.Content>
        </Switch>

        <Button onClick={saveData}>Save</Button>
      </div>

      <Typography type="h2">Channels</Typography>
      <div className="flex flex-col gap-2">
        <Select value={addChannelId} onChange={(x) => setAddChannelId(x?.toString() ?? "")}>
          <Label>Channel</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {channels.map((channel) => (
                <ListBox.Item key={channel.id} id={channel.id} textValue={`#${channel.name}`}>
                  #{channel.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button onClick={addChannel}>Add channel</Button>
      </div>

      <Table className="mt-4">
        <Table.ScrollContainer>
          <Table.Content>
            <Table.Header>
              <Table.Column isRowHeader>Channel</Table.Column>
              <Table.Column>Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {chatSummaryChannels.map((chatSummaryChannel) => (
                <Table.Row key={chatSummaryChannel}>
                  <Table.Cell>
                    #{channels.find((ch) => ch.id === chatSummaryChannel)?.name ??
                      "Unknown channel"}
                  </Table.Cell>
                  <Table.Cell className="flex gap-2">
                    <Button
                      variant="danger"
                      onClick={() => remChannel(chatSummaryChannel)}
                    >
                      Delete
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
};

export default ChatSummary;
