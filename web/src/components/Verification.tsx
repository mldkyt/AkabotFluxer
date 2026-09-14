import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, Select } from "./ui/index.ts";

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
      <h1>Verification</h1>
      <p>Verify members before they fully join your server.</p>

      <div className="flex flex-col gap-2 mt-4">
        <Checkbox checked={enabled} onChange={setEnabled} label="Enable verification" />

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