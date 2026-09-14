import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, Select } from "./ui/index.ts";

const modeLabel = (setting: { anyCount: boolean; wordCount: boolean; totalWordCount: boolean }) => {
  const extra = [
    setting.anyCount ? "Any count" : null,
    setting.wordCount ? "Word count" : null,
    setting.totalWordCount ? "Total word count" : null,
  ].filter(Boolean);
  return ["Normal", ...extra].join(" + ");
};

const Counting = () => {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<{
    channelId: string;
    channelName: string;
    anyCount: boolean;
    wordCount: boolean;
    totalWordCount: boolean;
    resetOnSameUser: boolean;
    failOnEdit: boolean;
    count: number;
  }[]>([]);

  const [newChannelId, setNewChannelId] = useState("");
  const [newAnyCount, setNewAnyCount] = useState(false);
  const [newWordCount, setNewWordCount] = useState(false);
  const [newTotalWordCount, setNewTotalWordCount] = useState(false);
  const [newResetOnSameUser, setNewResetOnSameUser] = useState(true);
  const [newFailOnEdit, setNewFailOnEdit] = useState(true);

  const [editChannelId, setEditChannelId] = useState("");
  const [editAnyCount, setEditAnyCount] = useState(false);
  const [editWordCount, setEditWordCount] = useState(false);
  const [editTotalWordCount, setEditTotalWordCount] = useState(false);
  const [editResetOnSameUser, setEditResetOnSameUser] = useState(true);
  const [editFailOnEdit, setEditFailOnEdit] = useState(true);

  const fetchData = async () => {
    const channelsFetch = await request("GET", "/api/text-channels");
    if (channelsFetch.ok) setChannels(channelsFetch.data);

    const settingsFetch = await request("GET", "/api/counting");
    if (settingsFetch.ok) setSettings(settingsFetch.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createSetting = async () => {
    if (!newChannelId) return;

    const res = await request("POST", "/api/counting", {
      channelId: newChannelId,
      anyCount: newAnyCount,
      wordCount: newWordCount,
      totalWordCount: newTotalWordCount,
      resetOnSameUser: newResetOnSameUser,
      failOnEdit: newFailOnEdit,
    });
    if (!res.ok) return;
    setNewChannelId("");
    setNewAnyCount(false);
    setNewWordCount(false);
    setNewTotalWordCount(false);
    setNewResetOnSameUser(true);
    setNewFailOnEdit(true);
    fetchData();
  };

  const startEditing = (channelId: string) => {
    const setting = settings.find((s) => s.channelId === channelId);
    if (!setting) return;
    setEditChannelId(channelId);
    setEditAnyCount(setting.anyCount);
    setEditWordCount(setting.wordCount);
    setEditTotalWordCount(setting.totalWordCount);
    setEditResetOnSameUser(setting.resetOnSameUser);
    setEditFailOnEdit(setting.failOnEdit);
  };

  const finishEditing = async () => {
    const res = await request("POST", "/api/counting", {
      channelId: editChannelId,
      anyCount: editAnyCount,
      wordCount: editWordCount,
      totalWordCount: editTotalWordCount,
      resetOnSameUser: editResetOnSameUser,
      failOnEdit: editFailOnEdit,
    });
    if (!res.ok) return;
    setEditChannelId("");
    fetchData();
  };

  const deleteSetting = async (channelId: string) => {
    const res = await request("DELETE", "/api/counting", { channelId });
    if (!res.ok) return;
    fetchData();
  };

  return (
    <div>
      <h1>Counting</h1>
      <p>Channels where members take turns counting up one number at a time.</p>
      <div className="flex flex-col gap-2">
        <Select value={newChannelId} onChange={setNewChannelId} label="Channel">
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-1">
          <label>Count options</label>
          <Checkbox checked={newAnyCount} onChange={setNewAnyCount} label="Any count: the number can appear anywhere in the message" />
          <Checkbox checked={newWordCount} onChange={setNewWordCount} label="Word count: repeated identical words count as their number" />
          <Checkbox checked={newTotalWordCount} onChange={setNewTotalWordCount} label="Total word count: any words count as their number" />
        </div>
        <p>
          The normal count (the message is exactly the next number) is always enabled. Check the options above to also accept the extra counting styles.
        </p>

        <Checkbox
          checked={newResetOnSameUser}
          onChange={setNewResetOnSameUser}
          label="Turn rule: reset the count if the same member counts twice in a row"
        />
        {!newResetOnSameUser && <p>Turn rule off: the same member can keep counting up.</p>}

        <Checkbox
          checked={newFailOnEdit}
          onChange={setNewFailOnEdit}
          label="Editing a counted message automatically fails the count"
        />

        <Button onClick={createSetting} isDisabled={!newChannelId}>Add counting channel</Button>
      </div>

      <h2>Configured channels</h2>

      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Count options</th>
            <th>Current count</th>
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
                    <div className="flex flex-col gap-1">
                      <Checkbox checked={editAnyCount} onChange={setEditAnyCount} label="Any count" />
                      <Checkbox checked={editWordCount} onChange={setEditWordCount} label="Word count" />
                      <Checkbox checked={editTotalWordCount} onChange={setEditTotalWordCount} label="Total word count" />
                    </div>
                  )
                  : modeLabel(setting)}
              </td>
              <td>
                {setting.channelId === editChannelId
                  ? (
                    <div className="flex flex-col gap-1">
                      <Checkbox
                        checked={editResetOnSameUser}
                        onChange={setEditResetOnSameUser}
                        label="Reset when same member counts twice"
                      />
                      <Checkbox
                        checked={editFailOnEdit}
                        onChange={setEditFailOnEdit}
                        label="Fail on edit"
                      />
                    </div>
                  )
                  : setting.count}
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

export default Counting;
