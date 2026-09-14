import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Input, Label, NumberField, Select } from "./ui/index.ts";

const ChatRevive = () => {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<{
    channelId: string;
    channelName: string;
    timeout: number;
    message: string;
    roleId: string | null;
    roleName: string | null;
  }[]>([]);

  const [newChannelId, setNewChannelId] = useState("");
  const [newTimeout, setNewTimeout] = useState(60);
  const [newMessage, setNewMessage] = useState("This channel is quiet... anyone around?");
  const [newRoleId, setNewRoleId] = useState("");

  const [editChannelId, setEditChannelId] = useState("");
  const [editTimeout, setEditTimeout] = useState(60);
  const [editMessage, setEditMessage] = useState("");
  const [editRoleId, setEditRoleId] = useState("");

  const fetchData = async () => {
    const channelsFetch = await request("GET", "/api/text-channels");
    if (channelsFetch.ok) setChannels(channelsFetch.data);

    const rolesFetch = await request("GET", "/api/roles");
    if (rolesFetch.ok) setRoles(rolesFetch.data);

    const settingsFetch = await request("GET", "/api/chat-revive");
    if (settingsFetch.ok) setSettings(settingsFetch.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createSetting = async () => {
    if (!newChannelId) return;

    const res = await request("POST", "/api/chat-revive", {
      channelId: newChannelId,
      timeout: newTimeout,
      message: newMessage,
      roleId: newRoleId.length > 0 ? newRoleId : null,
    });
    if (!res.ok) return;
    setNewChannelId("");
    setNewTimeout(60);
    setNewMessage("This channel is quiet... anyone around?");
    setNewRoleId("");
    fetchData();
  };

  const startEditing = (channelId: string) => {
    const setting = settings.find((s) => s.channelId === channelId);
    if (!setting) return;
    setEditChannelId(channelId);
    setEditTimeout(setting.timeout);
    setEditMessage(setting.message);
    setEditRoleId(setting.roleId ?? "");
  };

  const finishEditing = async () => {
    const res = await request("POST", "/api/chat-revive", {
      channelId: editChannelId,
      timeout: editTimeout,
      message: editMessage,
      roleId: editRoleId.length > 0 ? editRoleId : null,
    });
    if (!res.ok) return;
    setEditChannelId("");
    fetchData();
  };

  const deleteSetting = async (channelId: string) => {
    const res = await request("DELETE", "/api/chat-revive", { channelId });
    if (!res.ok) return;
    fetchData();
  };

  return (
    <div>
      <h1>Chat Revive</h1>
      <p>Ping channels that go quiet to revive the conversation.</p>
      <div className="flex flex-col gap-2">
        <Select value={newChannelId} onChange={setNewChannelId} label="Channel">
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>

        <NumberField value={newTimeout} onChange={setNewTimeout} minValue={1} maxValue={1440} label="Inactivity timeout (minutes)" />

        <div className="field">
          <Label>Revive message</Label>
          <Input type="text" value={newMessage} onChange={setNewMessage} maxLength={2000} />
        </div>

        <Select value={newRoleId} onChange={setNewRoleId} label="Role to mention (optional)">
          <option value="">None</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>

        <Button onClick={createSetting} isDisabled={!newChannelId}>Add channel</Button>
      </div>

      <h2>Configured channels</h2>

      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Timeout</th>
            <th>Message</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((setting) => (
            <tr key={setting.channelId}>
              <td>#{setting.channelName}</td>
              <td>
                {setting.channelId === editChannelId
                  ? (
                    <NumberField value={editTimeout} onChange={setEditTimeout} minValue={1} maxValue={1440} label="Timeout" />
                  )
                  : `${setting.timeout} min`}
              </td>
              <td>
                {setting.channelId === editChannelId
                  ? (
                    <div className="field">
                      <Label>Message</Label>
                      <Input type="text" value={editMessage} onChange={setEditMessage} maxLength={2000} />
                    </div>
                  )
                  : setting.message}
              </td>
              <td>
                {setting.channelId === editChannelId
                  ? (
                    <Select value={editRoleId} onChange={setEditRoleId} label="Role">
                      <option value="">None</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  )
                  : setting.roleName ?? "None"}
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

export default ChatRevive;