import { useEffect, useState } from "react";
import { Button, Label, ListBox, NumberField, Select, Skeleton, Switch, Table, toast, Typography } from "@heroui/react";
import { request } from "../util.ts";

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
    const channelsFetch = await request("GET", "/api/text-channels");
    if (channelsFetch.ok) {
      setChannels(channelsFetch.data);
    }

    const settingsFetch = await request("GET", "/api/chat-summary");
    if (settingsFetch.ok) {
      setCountBots(settingsFetch.data.countBots);
      setEnableExtraSummaries(settingsFetch.data.enableExtraSummaries);
      setExtraSummariesRows(settingsFetch.data.extraSummariesRows);
      setSummariesRows(settingsFetch.data.summariesRows);
      setChatSummaryChannels(settingsFetch.data.channels);
    }

    setLoading(false);
  };

  const saveData = async () => {
    await request("POST", "/api/chat-summary", { countBots, enableExtraSummaries, extraSummariesRows, summariesRows });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addChannel = async () => {
    const res = await request("POST", "/api/chat-summary/channels", { channelId: addChannelId });

    if (res.ok) {
      setChatSummaryChannels([...chatSummaryChannels, addChannelId]);
      setAddChannelId("");
    }
  };

  const remChannel = async (channel: string) => {
    await request("DELETE", "/api/chat-summary/channels", { channelId: channel });
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
