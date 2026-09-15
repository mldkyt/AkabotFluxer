import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, Select } from "./ui/index.ts";

type LoggingRow = {
  id: number;
  channelId: string;
  channelName: string;
  roleCreate: boolean;
  roleUpdate: boolean;
  roleDelete: boolean;
  channelCreate: boolean;
  channelUpdate: boolean;
  channelDelete: boolean;
  guildUpdate: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  voiceJoin: boolean;
  voiceLeave: boolean;
  voiceMove: boolean;
  voiceServerDeafen: boolean;
  voiceServerMute: boolean;
  antiRaid: boolean;
  emojiCreate: boolean;
  emojiUpdate: boolean;
  emojiDelete: boolean;
  stickerCreate: boolean;
  stickerUpdate: boolean;
  stickerDelete: boolean;
  webhookCreate: boolean;
  webhookUpdate: boolean;
  webhookDelete: boolean;
  memberBan: boolean;
  memberUnban: boolean;
  memberKick: boolean;
  memberTimeout: boolean;
};

const EVENTS: { key: keyof LoggingRow; label: string }[] = [
  { key: "roleCreate", label: "Role created" },
  { key: "roleUpdate", label: "Role updated" },
  { key: "roleDelete", label: "Role deleted" },
  { key: "channelCreate", label: "Channel created" },
  { key: "channelUpdate", label: "Channel updated" },
  { key: "channelDelete", label: "Channel deleted" },
  { key: "guildUpdate", label: "Server updated" },
  { key: "memberJoin", label: "Member joined" },
  { key: "memberLeave", label: "Member left" },
  { key: "voiceJoin", label: "Voice channel joined" },
  { key: "voiceLeave", label: "Voice channel left" },
  { key: "voiceMove", label: "Voice channel moved" },
  { key: "voiceServerDeafen", label: "Server deafened" },
  { key: "voiceServerMute", label: "Server muted" },
  { key: "antiRaid", label: "Anti-raid action" },
  { key: "emojiCreate", label: "Emoji created" },
  { key: "emojiUpdate", label: "Emoji updated" },
  { key: "emojiDelete", label: "Emoji deleted" },
  { key: "stickerCreate", label: "Sticker created" },
  { key: "stickerUpdate", label: "Sticker updated" },
  { key: "stickerDelete", label: "Sticker deleted" },
  { key: "webhookCreate", label: "Webhook created" },
  { key: "webhookUpdate", label: "Webhook updated" },
  { key: "webhookDelete", label: "Webhook deleted" },
  { key: "memberBan", label: "Member banned" },
  { key: "memberUnban", label: "Member unbanned" },
  { key: "memberKick", label: "Member kicked" },
  { key: "memberTimeout", label: "Member timed out" },
];

const Logging = () => {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<LoggingRow[]>([]);

  const [newChannelId, setNewChannelId] = useState("");
  const [newToggles, setNewToggles] = useState<Record<string, boolean>>(() => Object.fromEntries(EVENTS.map((e) => [e.key, false])));

  const [editChannelId, setEditChannelId] = useState("");
  const [editToggles, setEditToggles] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    const channelsFetch = await request("GET", "/api/text-channels");
    if (channelsFetch.ok) setChannels(channelsFetch.data);

    const settingsFetch = await request("GET", "/api/logging");
    if (settingsFetch.ok) setSettings(settingsFetch.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createSetting = async () => {
    if (!newChannelId) return;
    const res = await request("POST", "/api/logging", { channelId: newChannelId, ...newToggles });
    if (!res.ok) return;
    setNewChannelId("");
    setNewToggles(Object.fromEntries(EVENTS.map((e) => [e.key, false])));
    fetchData();
  };

  const startEditing = (channelId: string) => {
    const setting = settings.find((s) => s.channelId === channelId);
    if (!setting) return;
    setEditChannelId(channelId);
    setEditToggles(Object.fromEntries(EVENTS.map((e) => [e.key, setting[e.key] as boolean])));
  };

  const finishEditing = async () => {
    const res = await request("POST", "/api/logging", { channelId: editChannelId, ...editToggles });
    if (!res.ok) return;
    setEditChannelId("");
    fetchData();
  };

  const deleteSetting = async (channelId: string) => {
    const res = await request("DELETE", "/api/logging", { channelId });
    if (!res.ok) return;
    fetchData();
  };

  const renderToggles = (toggles: Record<string, boolean>, onChange: (key: string, value: boolean) => void) => (
    <div className="flex flex-col gap-1">
      {EVENTS.map((e) => <Checkbox key={e.key} checked={toggles[e.key]} onChange={(v) => onChange(e.key, v)} label={e.label} />)}
    </div>
  );

  const enabledCount = (row: LoggingRow) => EVENTS.filter((e) => row[e.key]).length;

  return (
    <div>
      <h1>Logging</h1>
      <p>Send server events to text channels. Each channel only receives the events you enable for it.</p>
      <div className="flex flex-col gap-2">
        <Select value={newChannelId} onChange={setNewChannelId} label="Channel">
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>
        {renderToggles(newToggles, (key, value) => setNewToggles((prev) => ({ ...prev, [key]: value })))}
        <Button onClick={createSetting} isDisabled={!newChannelId}>Add logging channel</Button>
      </div>

      <h2>Configured channels</h2>

      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Enabled events</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((setting) => (
            <tr key={setting.channelId}>
              <td>#{setting.channelName}</td>
              <td>
                {setting.channelId === editChannelId
                  ? renderToggles(editToggles, (key, value) => setEditToggles((prev) => ({ ...prev, [key]: value })))
                  : `${enabledCount(setting)} of ${EVENTS.length} events`}
              </td>
              <td className="flex gap-2">
                {editChannelId !== setting.channelId && (
                  <Button onClick={() => startEditing(setting.channelId)} isDisabled={editChannelId.length > 0}>
                    Edit
                  </Button>
                )}
                {editChannelId === setting.channelId && <Button onClick={finishEditing}>Save</Button>}
                <Button variant="danger" onClick={() => deleteSetting(setting.channelId)}>
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

export default Logging;
