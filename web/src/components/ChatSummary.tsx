import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, NumberField, Select } from "./ui/index.ts";

const ChatSummary = () => {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [chatSummaryChannels, setChatSummaryChannels] = useState<string[]>([]);

  const [enableExtraSummaries, setEnableExtraSummaries] = useState(false);
  const [extraSummariesRows, setExtraSummariesRows] = useState(5);
  const [summariesRows, setSummariesRows] = useState(5);
  const [countBots, setCountBots] = useState(false);

  const [addChannelId, setAddChannelId] = useState("");

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
  };

  const saveData = async () => {
    await request("POST", "/api/chat-summary", { countBots, enableExtraSummaries, extraSummariesRows, summariesRows });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addChannel = async () => {
    if (!addChannelId) return;

    const res = await request("POST", "/api/chat-summary/channels", { channelId: addChannelId });

    if (res.ok) {
      setChatSummaryChannels([...chatSummaryChannels, addChannelId]);
      setAddChannelId("");
    }
  };

  const remChannel = async (channel: string) => {
    await request("DELETE", "/api/chat-summary/channels", { channelId: channel });
  };

  return (
    <div>
      <h1>Chat Summary</h1>
      <p>Configure automatic summaries of your server's conversations.</p>

      <div className="flex flex-col gap-2">
        <NumberField value={summariesRows} onChange={setSummariesRows} minValue={3} maxValue={10} label="Chat summary row count" />

        <Checkbox checked={enableExtraSummaries} onChange={setEnableExtraSummaries} label="Enable monthly and yearly chat summaries" />

        {enableExtraSummaries && (
          <NumberField value={extraSummariesRows} onChange={setExtraSummariesRows} minValue={3} maxValue={10} label="Monthly and yearly chat summary row count" />
        )}

        <Checkbox checked={countBots} onChange={setCountBots} label="Count bots" />

        <Button onClick={saveData}>Save</Button>
      </div>

      <h2>Channels</h2>
      <div className="flex flex-col gap-2">
        <Select value={addChannelId} onChange={setAddChannelId} label="Channel">
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>
        <Button onClick={addChannel} isDisabled={!addChannelId}>Add channel</Button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {chatSummaryChannels.map((chatSummaryChannel) => (
            <tr key={chatSummaryChannel}>
              <td>
                #{channels.find((ch) => ch.id === chatSummaryChannel)?.name ??
                  "Unknown channel"}
              </td>
              <td className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => remChannel(chatSummaryChannel)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChatSummary;