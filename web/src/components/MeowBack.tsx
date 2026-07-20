import { Button, Label, ListBox, Select, Surface, Switch, Typography } from "@heroui/react";
import { useEffect, useState } from "react";
import { request } from "../util.ts";

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
    setEditMeowBackMeow(false);
    setEditMeowBackWaf(false);
    setEditMeowBackBark(false);
    setEditMeowBackOwo(false);
    setEditMeowBackColon3(false);
    setEditMeowBackAwawa(false);

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
      <Typography type="h1">Meow back</Typography>

      <Surface className="flex flex-col gap-2 p-2 rounded-xl">
        <Select
          value={newMeowBackId}
          onChange={(x) => setNewMeowBackId(x?.toString() ?? "null")}
        >
          <Label>Channel</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {channels.map((channel) => (
                <ListBox.Item key={channel.id} id={channel.id} textValue={channel.name}>
                  #{channel.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Switch isSelected={newMeowBackMeow} onChange={setNewMeowBackMeow}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Meow in this channel
          </Switch.Content>
        </Switch>

        <Switch isSelected={newMeowBackWaf} onChange={setNewMeowBackWaf}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Waf in this channel
          </Switch.Content>
        </Switch>

        <Switch isSelected={newMeowBackBark} onChange={setNewMeowBackBark}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Bark in this channel
          </Switch.Content>
        </Switch>

        <Switch isSelected={newMeowBackColon3} onChange={setNewMeowBackColon3}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Colon 3 in this channel
          </Switch.Content>
        </Switch>

        <Switch isSelected={newMeowBackOwo} onChange={setNewMeowBackOwo}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Owo in this channel
          </Switch.Content>
        </Switch>

        <Switch isSelected={newMeowBackAwawa} onChange={setNewMeowBackAwawa}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Awawa in this channel
          </Switch.Content>
        </Switch>

        <Button onClick={createNewMeowBack}>Add</Button>
      </Surface>

      <Typography type="h2">Existing meow back settings</Typography>

      {meowBackSettings.map((meowBackSetting) => (
        <Surface key={meowBackSetting.channelId} className="flex flex-col gap-2 p-2 rounded-xl my-2">
          <Typography type="h3">{`Channel #${meowBackSetting.channelName}`}</Typography>
          <Switch
            isSelected={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackMeow : meowBackSetting.meow}
            onChange={(x) => setEditMeowBackMeow(x)}
            isDisabled={meowBackSetting.channelId !== editMeowBackChannelId}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Meow in this channel
            </Switch.Content>
          </Switch>

          <Switch
            isSelected={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackWaf : meowBackSetting.waf}
            onChange={(x) => setEditMeowBackWaf(x)}
            isDisabled={meowBackSetting.channelId !== editMeowBackChannelId}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Waf in this channel
            </Switch.Content>
          </Switch>

          <Switch
            isSelected={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackBark : meowBackSetting.bark}
            onChange={(x) => setEditMeowBackBark(x)}
            isDisabled={meowBackSetting.channelId !== editMeowBackChannelId}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Bark in this channel
            </Switch.Content>
          </Switch>

          <Switch
            isSelected={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackColon3 : meowBackSetting.colon3}
            onChange={(x) => setEditMeowBackColon3(x)}
            isDisabled={meowBackSetting.channelId !== editMeowBackChannelId}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Colon 3 in this channel
            </Switch.Content>
          </Switch>

          <Switch
            isSelected={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackOwo : meowBackSetting.owo}
            onChange={(x) => setEditMeowBackOwo(x)}
            isDisabled={meowBackSetting.channelId !== editMeowBackChannelId}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Owo in this channel
            </Switch.Content>
          </Switch>

          <Switch
            isSelected={meowBackSetting.channelId === editMeowBackChannelId ? editMeowBackAwawa : meowBackSetting.awawa}
            onChange={(x) => setEditMeowBackAwawa(x)}
            isDisabled={meowBackSetting.channelId !== editMeowBackChannelId}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Awawa in this channel
            </Switch.Content>
          </Switch>

          {editMeowBackChannelId !== meowBackSetting.channelId && <Button onClick={() => startEditing(meowBackSetting.channelId)} isDisabled={editMeowBackChannelId.length > 0}>Edit</Button>}
          {editMeowBackChannelId === meowBackSetting.channelId && <Button onClick={finishEditing}>Save</Button>}
          <Button variant="danger" onClick={async () => await deleteMeowBack(meowBackSetting.channelId)}>Delete</Button>
        </Surface>
      ))}
    </div>
  );
};

export default MeowBack;
