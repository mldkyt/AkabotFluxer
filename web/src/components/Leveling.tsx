import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, NumberField, Select } from "./ui/index.ts";

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${i}:00` }));

interface Reward {
  id: number;
  level: number;
  roleId: string;
  roleName: string;
}

interface Multiplier {
  id: number;
  multiplier: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

interface Settings {
  guildId: string;
  enabled: boolean;
  xpPerMessage: number;
  xpPerLevel: number;
  weeklyBoostEnabled: boolean;
  weeklyBoostStartDay: number;
  weeklyBoostStartHour: number;
  weeklyBoostEndDay: number;
  weeklyBoostEndHour: number;
}

const defaultSettings: Settings = {
  guildId: "",
  enabled: false,
  xpPerMessage: 3,
  xpPerLevel: 500,
  weeklyBoostEnabled: false,
  weeklyBoostStartDay: 5,
  weeklyBoostStartHour: 15,
  weeklyBoostEndDay: 1,
  weeklyBoostEndHour: 3,
};

const Leveling = () => {
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [multipliers, setMultipliers] = useState<Multiplier[]>([]);

  const [newRewardLevel, setNewRewardLevel] = useState<number>(1);
  const [newRewardRoleId, setNewRewardRoleId] = useState("");

  const [newMultiplier, setNewMultiplier] = useState(2);
  const [newMultiplierStartMonth, setNewMultiplierStartMonth] = useState("12");
  const [newMultiplierStartDay, setNewMultiplierStartDay] = useState("24");
  const [newMultiplierEndMonth, setNewMultiplierEndMonth] = useState("1");
  const [newMultiplierEndDay, setNewMultiplierEndDay] = useState("3");

  const getData = async () => {
    const settingsFetch = await request("GET", "/api/leveling-settings");
    if (settingsFetch.ok) setSettings(settingsFetch.data);

    const rewardsFetch = await request("GET", "/api/leveling-rewards");
    if (rewardsFetch.ok) setRewards(rewardsFetch.data);

    const multipliersFetch = await request("GET", "/api/leveling-multipliers");
    if (multipliersFetch.ok) setMultipliers(multipliersFetch.data);

    const rolesFetch = await request("GET", "/api/roles");
    if (rolesFetch.ok) setRoles(rolesFetch.data);
  };

  useEffect(() => {
    getData();
  }, []);

  const saveSettings = async () => {
    const res = await request("POST", "/api/leveling-settings", settings);
    if (res.ok) {
      setSettings({ ...settings });
    }
  };

  const addReward = async () => {
    if (!newRewardRoleId) return;

    const res = await request("POST", "/api/leveling-rewards", {
      level: newRewardLevel,
      roleId: newRewardRoleId,
    });
    if (!res.ok) return;

    setNewRewardRoleId("");

    const rewardsFetch = await request("GET", "/api/leveling-rewards");
    if (rewardsFetch.ok) setRewards(rewardsFetch.data);
  };

  const deleteReward = async (reward: Reward) => {
    const res = await request("DELETE", "/api/leveling-rewards", { id: reward.id });
    if (!res.ok) return;

    setRewards(rewards.filter((r) => r.id !== reward.id));
  };

  const addMultiplier = async () => {
    const res = await request("POST", "/api/leveling-multipliers", {
      multiplier: newMultiplier,
      startMonth: Number(newMultiplierStartMonth),
      startDay: Number(newMultiplierStartDay),
      endMonth: Number(newMultiplierEndMonth),
      endDay: Number(newMultiplierEndDay),
    });
    if (!res.ok) return;

    if (res.data && res.data.id) {
      setMultipliers([...multipliers, res.data]);
    } else {
      setMultipliers([...multipliers, {
        id: Date.now(),
        multiplier: newMultiplier,
        startMonth: Number(newMultiplierStartMonth),
        startDay: Number(newMultiplierStartDay),
        endMonth: Number(newMultiplierEndMonth),
        endDay: Number(newMultiplierEndDay),
      }]);
    }
  };

  const deleteMultiplier = async (id: number) => {
    const res = await request("DELETE", "/api/leveling-multipliers", { id });
    if (!res.ok) return;

    setMultipliers(multipliers.filter((m) => m.id !== id));
  };

  return (
    <div>
      <h1>Leveling</h1>
      <p>Grant XP per message, level based on total XP, and reward reached levels with roles.</p>

      <h2>Settings</h2>
      <div className="flex flex-col gap-2">
        <Checkbox checked={settings.enabled} onChange={(enabled) => setSettings({ ...settings, enabled })} label="Enable leveling" />

        <div className="flex gap-4">
          <NumberField minValue={1} maxValue={1000} value={settings.xpPerMessage} onChange={(xpPerMessage) => setSettings({ ...settings, xpPerMessage })} label="XP per message" />
          <NumberField minValue={1} maxValue={1000000} value={settings.xpPerLevel} onChange={(xpPerLevel) => setSettings({ ...settings, xpPerLevel })} label="XP per level" />
        </div>

        <Checkbox
          checked={settings.weeklyBoostEnabled}
          onChange={(weeklyBoostEnabled) => setSettings({ ...settings, weeklyBoostEnabled })}
          label="Enable 1.5x weekly boost"
        />

        <div className="flex gap-4">
          <Select value={String(settings.weeklyBoostStartDay)} onChange={(v) => setSettings({ ...settings, weeklyBoostStartDay: Number(v) })} label="Boost start day">
            {WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </Select>
          <Select value={String(settings.weeklyBoostStartHour)} onChange={(v) => setSettings({ ...settings, weeklyBoostStartHour: Number(v) })} label="Boost start hour">
            {HOURS.map((hour) => <option key={hour.value} value={hour.value}>{hour.label}</option>)}
          </Select>
          <Select value={String(settings.weeklyBoostEndDay)} onChange={(v) => setSettings({ ...settings, weeklyBoostEndDay: Number(v) })} label="Boost end day">
            {WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </Select>
          <Select value={String(settings.weeklyBoostEndHour)} onChange={(v) => setSettings({ ...settings, weeklyBoostEndHour: Number(v) })} label="Boost end hour">
            {HOURS.map((hour) => <option key={hour.value} value={hour.value}>{hour.label}</option>)}
          </Select>
        </div>

        <div className="max-w-xs">
          <Button onClick={saveSettings}>Save settings</Button>
        </div>
      </div>

      <h2>Level rewards</h2>
      <p>A role is granted once a member reaches its level. Roles are permanent.</p>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-4">
          <NumberField minValue={1} value={newRewardLevel} onChange={setNewRewardLevel} label="Level" />
          <Select value={newRewardRoleId} onChange={setNewRewardRoleId} label="Role">
            {roles.map((role) => <option key={role.id} value={role.id}>@{role.name}</option>)}
          </Select>
          <Button onClick={addReward} isDisabled={!newRewardRoleId}>Add</Button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rewards.sort((a, b) => a.level - b.level).map((reward) => (
            <tr key={reward.id}>
              <td>{reward.level}</td>
              <td>{reward.roleName}</td>
              <td>
                <Button variant="danger" onClick={() => deleteReward(reward)}>Delete</Button>
              </td>
            </tr>
          ))}
          {rewards.length === 0 && (
            <tr>
              <td colSpan={3}>No level rewards configured.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Multipliers</h2>
      <p>Active multipliers stack with the weekly boost. Windows may span over the new year (e.g. Dec 24 to Jan 3).</p>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-4">
          <NumberField minValue={0.1} maxValue={100} step={0.5} value={newMultiplier} onChange={setNewMultiplier} label="Multiplier" />
          <Select value={newMultiplierStartMonth} onChange={setNewMultiplierStartMonth} label="Start month">
            {MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </Select>
          <Select value={newMultiplierStartDay} onChange={setNewMultiplierStartDay} label="Start day">
            {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </Select>
          <Select value={newMultiplierEndMonth} onChange={setNewMultiplierEndMonth} label="End month">
            {MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </Select>
          <Select value={newMultiplierEndDay} onChange={setNewMultiplierEndDay} label="End day">
            {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </Select>
          <Button onClick={addMultiplier}>Add</Button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Window</th>
            <th>Multiplier</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {multipliers.map((multiplier) => (
            <tr key={multiplier.id}>
              <td>
                {MONTHS.find((m) => Number(m.value) === multiplier.startMonth)?.label ?? multiplier.startMonth} {multiplier.startDay} -{" "}
                {MONTHS.find((m) => Number(m.value) === multiplier.endMonth)?.label ?? multiplier.endMonth} {multiplier.endDay}
              </td>
              <td>{multiplier.multiplier}x</td>
              <td>
                <Button variant="danger" onClick={() => deleteMultiplier(multiplier.id)}>Delete</Button>
              </td>
            </tr>
          ))}
          {multipliers.length === 0 && (
            <tr>
              <td colSpan={3}>No multipliers configured.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leveling;
