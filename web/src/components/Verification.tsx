import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Select, Switch } from "./ui/index.ts";

const Verification = () => {
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

  return (
    <div>
      <h2>Verification</h2>
      <div className="flex flex-col gap-2 mt-4">
        <Switch checked={enabled} onChange={setEnabled} label="Enable verification" />

        <Select value={roleId} onChange={setRoleId} label="Verification Role">
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              @{role.name}
            </option>
          ))}
        </Select>

        <Select value={channelId} onChange={setChannelId} label="Verification Channel">
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              #{ch.name}
            </option>
          ))}
        </Select>

        <Button onClick={saveData}>Save</Button>
      </div>
    </div>
  );
};

export default Verification;