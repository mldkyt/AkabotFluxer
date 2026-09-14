import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, Select } from "./ui/index.ts";

const MeowBack = () => {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [meowBackSettings, setMeowBackSettings] = useState<{
    channelId: string;
    channelName: string;
    meow: boolean;
    waf: boolean;
    bark: boolean;
    colon3: boolean;
    awawa: boolean;
    owo: boolean;
  }[]>([]);

  const fetchOnLoad = async () => {
    const channels = await request("GET", "/api/text-channels");
    if (!channels.ok) return;
    setChannels(channels.data);

    const meowBackSettings = await request("GET", "/api/meow-back");
    if (!meowBackSettings.ok) return;
    setMeowBackSettings(meowBackSettings.data);
  };

  useEffect(() => {
    fetchOnLoad();
  }, []);

  const [newMeowBackId, setNewMeowBackId] = useState("");
  const [newMeowBackMeow, setNewMeowBackMeow] = useState(false);
  const [newMeowBackWaf, setNewMeowBackWaf] = useState(false);
  const [newMeowBackBark, setNewMeowBackBark] = useState(false);
  const [newMeowBackColon3, setNewMeowBackColon3] = useState(false);
  const [newMeowBackAwawa, setNewMeowBackAwawa] = useState(false);
  const [newMeowBackOwo, setNewMeowBackOwo] = useState(false);

  const createNewMeowBack = async () => {
    if (!newMeowBackId) return;

    const res = await request("POST", "/api/meow-back", {
      channelId: newMeowBackId,
      meow: newMeowBackMeow,
      waf: newMeowBackWaf,
      bark: newMeowBackBark,
      colon3: newMeowBackColon3,
      awawa: newMeowBackAwawa,
      owo: newMeowBackOwo,
    });

    if (!res.ok) return;
    setNewMeowBackId("");
    setNewMeowBackMeow(false);
    setNewMeowBackWaf(false);
    setNewMeowBackBark(false);
    setNewMeowBackColon3(false);
    setNewMeowBackAwawa(false);
    setNewMeowBackOwo(false);

    setMeowBackSettings([...meowBackSettings, {
      channelId: newMeowBackId,
      channelName: channels.find((ch) => ch.id === newMeowBackId)?.name ?? "Unknown channel",
      meow: newMeowBackMeow,
      waf: newMeowBackWaf,
      bark: newMeowBackBark,
      colon3: newMeowBackColon3,
      awawa: newMeowBackAwawa,
      owo: newMeowBackOwo,
    }]);
  };

  const [editMeowBackChannelId, setEditMeowBackChannelId] = useState<string>("");
  const [editMeowBackMeow, setEditMeowBackMeow] = useState<boolean>(false);
  const [editMeowBackWaf, setEditMeowBackWaf] = useState<boolean>(false);
  const [editMeowBackBark, setEditMeowBackBark] = useState<boolean>(false);
  const [editMeowBackColon3, setEditMeowBackColon3] = useState<boolean>(false);
  const [editMeowBackOwo, setEditMeowBackOwo] = useState<boolean>(false);
  const [editMeowBackAwawa, setEditMeowBackAwawa] = useState<boolean>(false);

  const startEditing = (channelId: string) => {
    const meowBackSetting = meowBackSettings.find((m) => m.channelId === channelId);
    if (!meowBackSetting) return;
    setEditMeowBackChannelId(channelId);
    setEditMeowBackMeow(meowBackSetting.meow);
    setEditMeowBackWaf(meowBackSetting.waf);
    setEditMeowBackBark(meowBackSetting.bark);
    setEditMeowBackColon3(meowBackSetting.colon3);
    setEditMeowBackOwo(meowBackSetting.owo);
    setEditMeowBackAwawa(meowBackSetting.awawa);
  };

  const finishEditing = async () => {
    const res = await request("POST", "/api/meow-back", {
      channelId: editMeowBackChannelId,
      meow: editMeowBackMeow,
      waf: editMeowBackWaf,
      bark: editMeowBackBark,
      owo: editMeowBackOwo,
      colon3: editMeowBackColon3,
      awawa: editMeowBackAwawa,
    });

    if (!res.ok) return;
    setEditMeowBackChannelId("");

    setMeowBackSettings([...meowBackSettings.filter((x) => x.channelId !== editMeowBackChannelId), {
      channelId: editMeowBackChannelId,
      channelName: channels.find((c) => c.id === editMeowBackChannelId)?.name ?? "Unknown channel",
      meow: editMeowBackMeow,
      waf: editMeowBackWaf,
      bark: editMeowBackBark,
      owo: editMeowBackOwo,
      colon3: editMeowBackColon3,
      awawa: editMeowBackAwawa,
    }]);
  };

  const deleteMeowBack = async (channelId: string) => {
    const res = await request("DELETE", "/api/meow-back", {
      channelId,
    });
    if (!res.ok) return;

    setMeowBackSettings(meowBackSettings.filter((x) => x.channelId !== channelId));
  };

  return (
    <div>
      <h1>Meow Back</h1>
      <p>Make the bot react with meow, waf, bark, and more in specific channels.</p>

      <div className="flex flex-col gap-2">
        <Select value={newMeowBackId} onChange={setNewMeowBackId} label="Channel">
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>

        <Checkbox checked={newMeowBackMeow} onChange={setNewMeowBackMeow} label="Meow in this channel" />
        <Checkbox checked={newMeowBackWaf} onChange={setNewMeowBackWaf} label="Waf in this channel" />
        <Checkbox checked={newMeowBackBark} onChange={setNewMeowBackBark} label="Bark in this channel" />
        <Checkbox checked={newMeowBackColon3} onChange={setNewMeowBackColon3} label="Colon 3 in this channel" />
        <Checkbox checked={newMeowBackOwo} onChange={setNewMeowBackOwo} label="Owo in this channel" />
        <Checkbox checked={newMeowBackAwawa} onChange={setNewMeowBackAwawa} label="Awawa in this channel" />

        <Button onClick={createNewMeowBack} isDisabled={!newMeowBackId}>Add</Button>
      </div>

      {meowBackSettings.map((meowBackSetting) => (
        <div key={meowBackSetting.channelId}>
          <h2>{`Channel #${meowBackSetting.channelName}`}</h2>
          <div className="flex flex-col gap-2">
            <Checkbox
              checked={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackMeow : meowBackSetting.meow}
              onChange={setEditMeowBackMeow}
              disabled={meowBackSetting.channelId !== editMeowBackChannelId}
              label="Meow in this channel"
            />

            <Checkbox
              checked={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackWaf : meowBackSetting.waf}
              onChange={setEditMeowBackWaf}
              disabled={meowBackSetting.channelId !== editMeowBackChannelId}
              label="Waf in this channel"
            />

            <Checkbox
              checked={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackBark : meowBackSetting.bark}
              onChange={setEditMeowBackBark}
              disabled={meowBackSetting.channelId !== editMeowBackChannelId}
              label="Bark in this channel"
            />

            <Checkbox
              checked={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackColon3 : meowBackSetting.colon3}
              onChange={setEditMeowBackColon3}
              disabled={meowBackSetting.channelId !== editMeowBackChannelId}
              label="Colon 3 in this channel"
            />

            <Checkbox
              checked={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackOwo : meowBackSetting.owo}
              onChange={setEditMeowBackOwo}
              disabled={meowBackSetting.channelId !== editMeowBackChannelId}
              label="Owo in this channel"
            />

            <Checkbox
              checked={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackAwawa : meowBackSetting.awawa}
              onChange={setEditMeowBackAwawa}
              disabled={meowBackSetting.channelId !== editMeowBackChannelId}
              label="Awawa in this channel"
            />

            {editMeowBackChannelId !== meowBackSetting.channelId && <Button onClick={() => startEditing(meowBackSetting.channelId)} isDisabled={editMeowBackChannelId.length > 0}>Edit</Button>}
            {editMeowBackChannelId === meowBackSetting.channelId && <Button onClick={finishEditing}>Save</Button>}
            <Button variant="danger" onClick={async () => await deleteMeowBack(meowBackSetting.channelId)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MeowBack;