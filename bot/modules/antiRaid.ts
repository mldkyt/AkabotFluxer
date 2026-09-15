import { Client, EmbedBuilder, Guild, GuildChannel, GuildMember, Message, PermissionFlags, TextChannel } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import { getBotChannel } from "../src/serverSettings.ts";
import z from "zod";

type AntiRaidSettings = {
  guildId: string;
  logChannelId: string;

  capsEnabled: boolean;
  capsPercent: number;
  capsMinLength: number;
  capsAction: string;
  capsTimeoutSeconds: number;
  capsDeleteMessages: boolean;
  capsDmMember: boolean;

  duplicateEnabled: boolean;
  duplicateThreshold: number;
  duplicateWindow: number;
  duplicateAction: string;
  duplicateTimeoutSeconds: number;
  duplicateDeleteMessages: boolean;
  duplicateDmMember: boolean;

  emojiEnabled: boolean;
  emojiCount: number;
  emojiWindow: number;
  emojiCustomEmojis: boolean;
  emojiAction: string;
  emojiTimeoutSeconds: number;
  emojiDeleteMessages: boolean;
  emojiDmMember: boolean;

  spamEnabled: boolean;
  spamMessages: number;
  spamPer: number;
  spamAction: string;
  spamTimeoutSeconds: number;
  spamDeleteMessages: boolean;
  spamDmMember: boolean;

  inviteEnabled: boolean;
  inviteThreshold: number;
  inviteWindow: number;
  inviteAction: string;
  inviteTimeoutSeconds: number;
  inviteDeleteMessages: boolean;
  inviteDmMember: boolean;

  joinBurstEnabled: boolean;
  joinBurstMembers: number;
  joinBurstWindow: number;
  joinBurstAction: string;
  joinBurstTimeoutSeconds: number;
  joinBurstDeleteMessages: boolean;
  joinBurstDmMember: boolean;

  mentionEnabled: boolean;
  mentionCount: number;
  mentionWindow: number;
  mentionAction: string;
  mentionTimeoutSeconds: number;
  mentionDeleteMessages: boolean;
  mentionDmMember: boolean;
};

type MessageRecord = {
  id: string;
  ts: number;
  content: string;
  mentions: number;
};

type ActionOptions = {
  guild: Guild;
  member: GuildMember;
  settings: AntiRaidSettings;
  detector: string;
  action: string;
  timeoutSeconds: number;
  deleteMessages: boolean;
  dmMember: boolean;
  records: MessageRecord[];
};

const messageState = new Map<string, Map<string, MessageRecord[]>>();
const joinState = new Map<string, number[]>();
const actionCooldown = new Map<string, number>();
const settingsCache = new Map<string, { settings: AntiRaidSettings; at: number }>();
const CACHE_TTL_MS = 60_000;
const ACTION_COOLDOWN_MS = 60_000;
const RECORD_RETENTION_MS = 600_000;

const UNICODE_EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const CUSTOM_EMOJI_REGEX = /<a?:\w+:\d+>/g;
const INVITE_REGEX = /fluxer\.gg\//g;

async function getSettings(guildId: string): Promise<AntiRaidSettings> {
  const cached = settingsCache.get(guildId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.settings;

  const settings = await prisma.antiRaidSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  }) as AntiRaidSettings;

  settingsCache.set(guildId, { settings, at: Date.now() });
  return settings;
}

function pruneCache() {
  const now = Date.now();
  for (const [guildId, entry] of settingsCache) {
    if (now - entry.at > CACHE_TTL_MS) settingsCache.delete(guildId);
  }
}

function hasEnabledDetector(settings: AntiRaidSettings): boolean {
  return settings.capsEnabled || settings.duplicateEnabled || settings.emojiEnabled || settings.spamEnabled || settings.inviteEnabled || settings.joinBurstEnabled || settings.mentionEnabled;
}

function getRecords(guildId: string, memberId: string): MessageRecord[] {
  let memberMap = messageState.get(guildId);
  if (!memberMap) {
    memberMap = new Map();
    messageState.set(guildId, memberMap);
  }
  let records = memberMap.get(memberId);
  if (!records) {
    records = [];
    memberMap.set(memberId, records);
  }

  const cutoff = Date.now() - RECORD_RETENTION_MS;
  const pruned = records.filter((record) => record.ts >= cutoff);
  memberMap.set(memberId, pruned.slice(-200));
  return memberMap.get(memberId)!;
}

function isIgnoredMember(member: GuildMember): boolean {
  if (member.user.bot) return true;
  // return member.permissions.has(PermissionFlags.KickMembers) || member.permissions.has(PermissionFlags.BanMembers) || member.permissions.has(PermissionFlags.ManageGuild) || member.permissions.has(PermissionFlags.Administrator);
  return false;
}

function withinWindow(records: MessageRecord[], windowSeconds: number): MessageRecord[] {
  const cutoff = Date.now() - windowSeconds * 1000;
  return records.filter((record) => record.ts >= cutoff);
}

function emptyMessageContent(content: string): string {
  return content.replace(CUSTOM_EMOJI_REGEX, "").replace(UNICODE_EMOJI_REGEX, "");
}

function emojiCount(content: string, customEmojis: boolean): number {
  const unicode = content.match(UNICODE_EMOJI_REGEX)?.length ?? 0;
  const custom = customEmojis ? content.match(CUSTOM_EMOJI_REGEX)?.length ?? 0 : 0;
  return unicode + custom;
}

function checkCaps(records: MessageRecord[], settings: AntiRaidSettings): boolean {
  if (!settings.capsEnabled) return false;
  const latest = records[records.length - 1];
  if (!latest) return false;
  if (latest.content.length < settings.capsMinLength) return false;
  const letters = latest.content.match(/[A-Za-z]/g)?.length ?? 0;
  if (letters === 0) return false;
  const uppercase = latest.content.match(/[A-Z]/g)?.length ?? 0;
  return (uppercase / letters) * 100 >= settings.capsPercent;
}

function checkDuplicate(records: MessageRecord[], settings: AntiRaidSettings): boolean {
  if (!settings.duplicateEnabled) return false;
  const windowRecords = withinWindow(records, settings.duplicateWindow);
  if (windowRecords.length < settings.duplicateThreshold) return false;
  const content = emptyMessageContent(windowRecords[windowRecords.length - 1].content);
  if (!content) return false;
  return windowRecords.filter((record) => emptyMessageContent(record.content) === content).length >= settings.duplicateThreshold;
}

function checkEmoji(records: MessageRecord[], settings: AntiRaidSettings): boolean {
  if (!settings.emojiEnabled) return false;
  const windowRecords = withinWindow(records, settings.emojiWindow);
  let total = 0;
  for (const record of windowRecords) total += emojiCount(record.content, settings.emojiCustomEmojis);
  return total >= settings.emojiCount;
}

function checkSpam(records: MessageRecord[], settings: AntiRaidSettings): boolean {
  if (!settings.spamEnabled) return false;
  return withinWindow(records, settings.spamPer).length >= settings.spamMessages;
}

function checkInvite(records: MessageRecord[], settings: AntiRaidSettings): boolean {
  if (!settings.inviteEnabled) return false;
  const windowRecords = withinWindow(records, settings.inviteWindow);
  let total = 0;
  for (const record of windowRecords) total += record.content.match(INVITE_REGEX)?.length ?? 0;
  return total >= settings.inviteThreshold;
}

function checkMention(records: MessageRecord[], settings: AntiRaidSettings): boolean {
  if (!settings.mentionEnabled) return false;
  const windowRecords = withinWindow(records, settings.mentionWindow);
  let total = 0;
  for (const record of windowRecords) total += record.mentions;
  return total >= settings.mentionCount;
}

async function deleteMessages(guild: Guild, records: MessageRecord[], msg: Message) {
  const channel = msg.channel;
  if (!channel || !("bulkDeleteMessages" in channel)) return;
  const ids = records.slice(-100).map((record) => record.id);
  if (ids.length === 0) return;
  if (ids.length === 1) {
    await msg.delete().catch(() => {});
    return;
  }
  await (channel as TextChannel).bulkDeleteMessages(ids).catch(() => {});
}

async function dmMember(member: GuildMember, detector: string) {
  const dm = await member.user.createDM().catch(() => null);
  if (!dm) return;
  await dm.send({
    embeds: [new EmbedBuilder().setTitle("Strike").setDescription(`You were flagged by the **${detector}** anti-raid detector in ${member.guild.name}.`).setColor(0xf04747)],
  }).catch(() => {});
}

async function sendLogMessage(guild: Guild, settings: AntiRaidSettings, embed: EmbedBuilder) {
  let channel: GuildChannel | null = null;
  if (settings.logChannelId) {
    channel = guild.channels.find((channel) => channel.id === settings.logChannelId) ?? null;
  }
  if (!channel) channel = await getBotChannel(guild);
  if (!channel) return;
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function runAction({ guild, member, settings, detector, action, timeoutSeconds, deleteMessages: shouldDelete, dmMember: shouldDm, records }: ActionOptions, msg: Message | null) {
  const cooldownKey = `${guild.id}:${member.id}:${action}:${detector}`;
  const now = Date.now();
  const lastAction = actionCooldown.get(cooldownKey);
  if (lastAction && now - lastAction < ACTION_COOLDOWN_MS) return;
  actionCooldown.set(cooldownKey, now);

  if (shouldDelete && msg) await deleteMessages(guild, records, msg);
  if (shouldDm) await dmMember(member, detector);

  const embed = new EmbedBuilder()
    .setTitle(`${detector} detected`)
    .setDescription(`**Member:** <@${member.id}> (${member.displayName})\n**Detector:** ${detector}\n**Action:** ${action}`)
    .setColor(0xf04747);

  switch (action) {
    case "kick":
      await guild.kick(member.id).catch(() => {});
      break;
    case "ban":
      await guild.ban(member.id).catch(() => {});
      break;
    case "timeout":
      const until = new Date(now + timeoutSeconds * 1000).toISOString();
      await member.edit({ communication_disabled_until: until, timeout_reason: `Anti-raid: ${detector}` }).catch(() => {});
      break;
  }

  await sendLogMessage(guild, settings, embed);
}

async function handleMessage(msg: Message) {
  if (!msg.guild) return;
  if (msg.author.bot) return;

  const member = msg.guild.members.get(msg.author.id);
  if (!member) return;
  if (isIgnoredMember(member)) return;

  const settings = await getSettings(msg.guild.id);
  if (!hasEnabledDetector(settings)) return;

  const records = getRecords(msg.guild.id, member.id);
  records.push({ id: msg.id, ts: Date.now(), content: msg.content, mentions: msg.mentions.length });

  const detectors: { name: string; active: boolean; check: () => boolean; action: string; timeoutSeconds: number; deleteMessages: boolean; dmMember: boolean; windowSeconds: number }[] = [
    {
      name: "Caps",
      active: settings.capsEnabled,
      check: () => checkCaps(records, settings),
      action: settings.capsAction,
      timeoutSeconds: settings.capsTimeoutSeconds,
      deleteMessages: settings.capsDeleteMessages,
      dmMember: settings.capsDmMember,
      windowSeconds: RECORD_RETENTION_MS / 1000,
    },
    {
      name: "Duplicates",
      active: settings.duplicateEnabled,
      check: () => checkDuplicate(records, settings),
      action: settings.duplicateAction,
      timeoutSeconds: settings.duplicateTimeoutSeconds,
      deleteMessages: settings.duplicateDeleteMessages,
      dmMember: settings.duplicateDmMember,
      windowSeconds: settings.duplicateWindow,
    },
    {
      name: "Emoji flood",
      active: settings.emojiEnabled,
      check: () => checkEmoji(records, settings),
      action: settings.emojiAction,
      timeoutSeconds: settings.emojiTimeoutSeconds,
      deleteMessages: settings.emojiDeleteMessages,
      dmMember: settings.emojiDmMember,
      windowSeconds: settings.emojiWindow,
    },
    {
      name: "Spam",
      active: settings.spamEnabled,
      check: () => checkSpam(records, settings),
      action: settings.spamAction,
      timeoutSeconds: settings.spamTimeoutSeconds,
      deleteMessages: settings.spamDeleteMessages,
      dmMember: settings.spamDmMember,
      windowSeconds: settings.spamPer,
    },
    {
      name: "Invite spam",
      active: settings.inviteEnabled,
      check: () => checkInvite(records, settings),
      action: settings.inviteAction,
      timeoutSeconds: settings.inviteTimeoutSeconds,
      deleteMessages: settings.inviteDeleteMessages,
      dmMember: settings.inviteDmMember,
      windowSeconds: settings.inviteWindow,
    },
    {
      name: "Mass mentions",
      active: settings.mentionEnabled,
      check: () => checkMention(records, settings),
      action: settings.mentionAction,
      timeoutSeconds: settings.mentionTimeoutSeconds,
      deleteMessages: settings.mentionDeleteMessages,
      dmMember: settings.mentionDmMember,
      windowSeconds: settings.mentionWindow,
    },
  ];

  for (const detector of detectors) {
    if (!detector.active) continue;
    if (!detector.check()) continue;
    await runAction({
      guild: msg.guild,
      member,
      settings,
      detector: detector.name,
      action: detector.action,
      timeoutSeconds: detector.timeoutSeconds,
      deleteMessages: detector.deleteMessages,
      dmMember: detector.dmMember,
      records: withinWindow(records, detector.windowSeconds),
    }, msg);
    break;
  }
}

async function handleMemberJoin(member: GuildMember) {
  if (isIgnoredMember(member)) return;
  const settings = await getSettings(member.guild.id);
  if (!settings.joinBurstEnabled) return;

  const now = Date.now();
  const timestamps = joinState.get(member.guild.id) ?? [];
  timestamps.push(now);
  const cutoff = now - settings.joinBurstWindow * 1000;
  const active = timestamps.filter((ts) => ts >= cutoff);
  joinState.set(member.guild.id, active);
  if (active.length < settings.joinBurstMembers) return;

  const records: MessageRecord[] = [];
  await runAction({
    guild: member.guild,
    member,
    settings,
    detector: "Join burst",
    action: settings.joinBurstAction,
    timeoutSeconds: settings.joinBurstTimeoutSeconds,
    deleteMessages: settings.joinBurstDeleteMessages,
    dmMember: settings.joinBurstDmMember,
    records,
  }, null);
  joinState.delete(member.guild.id);
}

export function setup(client: Client) {
  client.on("messageCreate", (msg: Message) => {
    handleMessage(msg);
  });
  client.on("guildMemberAdd", (member: GuildMember) => {
    handleMemberJoin(member);
  });
}

const settingsSchema = z.object({
  logChannelId: z.string(),

  capsEnabled: z.boolean(),
  capsPercent: z.number().int().min(0).max(100),
  capsMinLength: z.number().int().min(1),
  capsAction: z.enum(["log", "kick", "ban", "timeout"]),
  capsTimeoutSeconds: z.number().int().min(1),
  capsDeleteMessages: z.boolean(),
  capsDmMember: z.boolean(),

  duplicateEnabled: z.boolean(),
  duplicateThreshold: z.number().int().min(2),
  duplicateWindow: z.number().int().min(1),
  duplicateAction: z.enum(["log", "kick", "ban", "timeout"]),
  duplicateTimeoutSeconds: z.number().int().min(1),
  duplicateDeleteMessages: z.boolean(),
  duplicateDmMember: z.boolean(),

  emojiEnabled: z.boolean(),
  emojiCount: z.number().int().min(1),
  emojiWindow: z.number().int().min(1),
  emojiCustomEmojis: z.boolean(),
  emojiAction: z.enum(["log", "kick", "ban", "timeout"]),
  emojiTimeoutSeconds: z.number().int().min(1),
  emojiDeleteMessages: z.boolean(),
  emojiDmMember: z.boolean(),

  spamEnabled: z.boolean(),
  spamMessages: z.number().int().min(2),
  spamPer: z.number().int().min(1),
  spamAction: z.enum(["log", "kick", "ban", "timeout"]),
  spamTimeoutSeconds: z.number().int().min(1),
  spamDeleteMessages: z.boolean(),
  spamDmMember: z.boolean(),

  inviteEnabled: z.boolean(),
  inviteThreshold: z.number().int().min(1),
  inviteWindow: z.number().int().min(1),
  inviteAction: z.enum(["log", "kick", "ban", "timeout"]),
  inviteTimeoutSeconds: z.number().int().min(1),
  inviteDeleteMessages: z.boolean(),
  inviteDmMember: z.boolean(),

  joinBurstEnabled: z.boolean(),
  joinBurstMembers: z.number().int().min(2),
  joinBurstWindow: z.number().int().min(1),
  joinBurstAction: z.enum(["log", "kick", "ban", "timeout"]),
  joinBurstTimeoutSeconds: z.number().int().min(1),
  joinBurstDeleteMessages: z.boolean(),
  joinBurstDmMember: z.boolean(),

  mentionEnabled: z.boolean(),
  mentionCount: z.number().int().min(1),
  mentionWindow: z.number().int().min(1),
  mentionAction: z.enum(["log", "kick", "ban", "timeout"]),
  mentionTimeoutSeconds: z.number().int().min(1),
  mentionDeleteMessages: z.boolean(),
  mentionDmMember: z.boolean(),
});

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname !== "/api/anti-raid") return;

  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response(`Unauthorized`, { status: 403 });

  const guild = client.guilds.find((g) => g.id === guildId);
  if (!guild) return new Response(`Guild not found`, { status: 400 });

  if (req.method === "GET") {
    const settings = await prisma.antiRaidSettings.upsert({
      where: { guildId },
      update: {},
      create: { guildId },
    });
    return new Response(JSON.stringify(settings), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const json = await req.json();
    const validated = settingsSchema.safeParse(json);
    if (!validated.success) return new Response(`Invalid payload`, { status: 400 });

    const data = { ...validated.data, guildId };
    if (data.logChannelId) {
      const channel = guild.channels.filter((channel) => channel.type === 0).find((channel) => channel.id === data.logChannelId);
      if (!channel) return new Response(`Channel was not found`, { status: 400 });
    }

    await prisma.antiRaidSettings.upsert({
      where: { guildId },
      create: data,
      update: data,
    });

    pruneCache();
    settingsCache.delete(guildId);
    return new Response(`OK`, { status: 200 });
  }
}
