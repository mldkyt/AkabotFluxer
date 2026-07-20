import { useEffect, useState } from "react";
import { Button, Description, Label, ListBox, Select, Skeleton, Switch, Typography } from "@heroui/react";
import { request } from "../util.ts";

const Verification = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [channelId, setChannelId] = useState("");

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    const rolesFetch = await request("GET", "/api/roles");
    if (!rolesFetch.ok) return;
    setRoles(rolesFetch.data);

    const channelsFetch = await request("GET", "/api/text-channels");
    if (!channelsFetch.ok) return;
    setChannels(channelsFetch.data);

    const settingsFetch = await request("GET", "/api/verification");
    if (!settingsFetch.ok) return;
    setEnabled(settingsFetch.data.enabled);
    setRoleId(settingsFetch.data.roleId);
    setChannelId(settingsFetch.data.channelId);

    setLoading(false);
  };

  const saveData = async () => {
    await request("POST", "/api/verification", {
      roleId,
      channelId,
      enabled,
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <Typography type="h1">!iam Roles</Typography>

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
      <Typography type="h1">Verification</Typography>

      <div className="flex flex-col gap-2 mt-4">
        <Switch isSelected={enabled} onChange={setEnabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Enable verification
          </Switch.Content>
        </Switch>

        <Select
          value={roleId}
          onChange={(x) => setRoleId(x?.toString() ?? "")}
        >
          <Label>Verification Role</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {roles.map((role) => (
                <ListBox.Item key={role.id} id={role.id} textValue={role.name}>
                  <Typography>@{role.name}</Typography>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <Description>Grant this role when verification is successful</Description>
        </Select>

        <Select
          value={channelId}
          onChange={(x) => setChannelId(x?.toString() ?? "")}
        >
          <Label>Verification Channel</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {channels.map((ch) => (
                <ListBox.Item key={ch.id} id={ch.id} textValue={ch.name}>
                  <Typography>#{ch.name}</Typography>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <Description>Use this channel for all transactional messages for verification (bot must have send messages permission in here)</Description>
        </Select>

        <Button onClick={saveData}>Save</Button>
      </div>
    </div>
  );
};

export default Verification;
