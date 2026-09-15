import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Checkbox, NumberField, Select } from "./ui/index.ts";

type Settings = Record<string, string | number | boolean>;

type DetectorField = {
  key: string;
  label: string;
  min?: number;
  max?: number;
};

type DetectorDef = {
  prefix: string;
  name: string;
  description: string;
  fields: DetectorField[];
  hasMessageOptions?: boolean;
};

const ACTIONS = [
  { value: "log", label: "Log" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "timeout", label: "Timeout" },
];

const DETECTORS: DetectorDef[] = [
  {
    prefix: "caps",
    name: "Caps",
    description: "Messages written mostly in capital letters.",
    fields: [
      { key: "capsPercent", label: "Caps percentage", min: 0, max: 100 },
      { key: "capsMinLength", label: "Minimum length" },
    ],
  },
  {
    prefix: "duplicate",
    name: "Duplicate messages",
    description: "The same message sent repeatedly within a window.",
    fields: [
      { key: "duplicateThreshold", label: "Duplicates (threshold)", min: 2 },
      { key: "duplicateWindow", label: "Window (seconds)" },
    ],
  },
  {
    prefix: "emoji",
    name: "Emoji flood",
    description: "Too many emojis within a window.",
    fields: [
      { key: "emojiCount", label: "Emoji count", min: 1 },
      { key: "emojiWindow", label: "Window (seconds)" },
    ],
  },
  {
    prefix: "spam",
    name: "Spam",
    description: "Too many messages within a short period.",
    fields: [
      { key: "spamMessages", label: "Messages", min: 2 },
      { key: "spamPer", label: "Per (seconds)" },
    ],
  },
  {
    prefix: "invite",
    name: "Invite spam",
    description: "Too many fluxer.gg invites within a window.",
    fields: [
      { key: "inviteThreshold", label: "Invites", min: 1 },
      { key: "inviteWindow", label: "Window (seconds)" },
    ],
  },
  {
    prefix: "joinBurst",
    name: "Join burst",
    description: "Too many members joining within a window.",
    fields: [
      { key: "joinBurstMembers", label: "Members", min: 2 },
      { key: "joinBurstWindow", label: "Window (seconds)" },
    ],
    hasMessageOptions: false,
  },
  {
    prefix: "mention",
    name: "Mass mentions",
    description: "Too many user mentions within a window.",
    fields: [
      { key: "mentionCount", label: "Mentions", min: 1 },
      { key: "mentionWindow", label: "Window (seconds)" },
    ],
  },
];

type DetectorCardProps = {
  def: DetectorDef;
  settings: Settings;
  onChange: (key: string, value: string | number | boolean) => void;
};

const DetectorCard = ({ def, settings, onChange }: DetectorCardProps) => {
  const enabled = Boolean(settings[`${def.prefix}Enabled`]);
  const action = String(settings[`${def.prefix}Action`] ?? "log");
  const hasMessageOptions = def.hasMessageOptions ?? true;

  return (
    <div className="bg-surface rounded-lg border p-4 flex flex-col gap-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{def.name}</h3>
          <p className="text-sm opacity-70">{def.description}</p>
        </div>
      </div>

      <div className={`gap-3 ${enabled ? "" : "opacity-50 pointer-events-none"}`}>
      	<Checkbox checked={enabled} onChange={(value) => onChange(`${def.prefix}Enabled`, value)} label="Enabled" />
        {def.fields.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            value={Number(settings[field.key] ?? 0)}
            minValue={field.min}
            maxValue={field.max}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
        <div className="field">
          <label>Action</label>
          <select value={action} onChange={(e) => onChange(`${def.prefix}Action`, e.target.value)}>
            {ACTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {action === "timeout" && (
          <NumberField
            label="Timeout (seconds)"
            value={Number(settings[`${def.prefix}TimeoutSeconds`] ?? 60)}
            minValue={1}
            onChange={(value) => onChange(`${def.prefix}TimeoutSeconds`, value)}
          />
        )}
        {hasMessageOptions && (
          <>
            <Checkbox checked={Boolean(settings[`${def.prefix}DeleteMessages`])} onChange={(value) => onChange(`${def.prefix}DeleteMessages`, value)} label="Delete messages" />
            <Checkbox checked={Boolean(settings[`${def.prefix}DmMember`])} onChange={(value) => onChange(`${def.prefix}DmMember`, value)} label="DM member" />
          </>
        )}
      </div>
    </div>
  );
};

const AntiRaid = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  const getSettings = async () => {
    const fetchChannels = await request("GET", "/api/text-channels");
    if (fetchChannels.ok) setChannels(fetchChannels.data);

    const fetchSettings = await request("GET", "/api/anti-raid");
    if (fetchSettings.ok) setSettings(fetchSettings.data);
  };

  const setField = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    await request("POST", "/api/anti-raid", settings);
  };

  useEffect(() => {
    getSettings();
  }, []);

  return (
    <div>
      <h1>Anti-Raid</h1>
      <p>Automatically detect and punish raids. Moderators, admins, and bots are ignored.</p>

      <div className="flex flex-col gap-4">
        <div className="field">
          <label>Log Channel</label>
          <select value={String(settings.logChannelId ?? "")} onChange={(e) => setField("logChannelId", e.target.value)}>
            <option value="">Bot channel (default)</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
        </div>

        {DETECTORS.map((detector) => <DetectorCard key={detector.prefix} def={detector} settings={settings} onChange={setField} />)}

        <Button onClick={saveSettings}>Save</Button>
      </div>
    </div>
  );
};

export default AntiRaid;
