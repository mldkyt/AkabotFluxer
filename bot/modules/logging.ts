import { Client, EmbedBuilder, Guild, GuildBan, GuildChannel, GuildMember, PermissionFlags } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { getBotChannel } from "../src/serverSettings.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

type RoleSnapshot = { name: string; color: number; hoist: boolean; mentionable: boolean; position: number };
type EmojiSnapshot = { name: string; animated: boolean };
type StickerSnapshot = { name: string; description: string; tags: string[] };
type WebhookSnapshot = { name: string; channelId: string };

type LoggingSettings = {
  id: number;
  guildId: string;
  channelId: string;
  roleCreate: boolean;
  roleUpdate: boolean;
  roleDelete: boolean;
  channelCreate: boolean;
  channelUpdate: boolean;
  channelDelete: boolean;
  guildUpdate: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  voiceJoin: boolean;
  voiceLeave: boolean;
  voiceMove: boolean;
  voiceServerDeafen: boolean;
  voiceServerMute: boolean;
  antiRaid: boolean;
  emojiCreate: boolean;
  emojiUpdate: boolean;
  emojiDelete: boolean;
  stickerCreate: boolean;
  stickerUpdate: boolean;
  stickerDelete: boolean;
  webhookCreate: boolean;
  webhookUpdate: boolean;
  webhookDelete: boolean;
  memberBan: boolean;
  memberUnban: boolean;
  memberKick: boolean;
  memberTimeout: boolean;
};

export type LogEventKey =
  | "roleCreate"
  | "roleUpdate"
  | "roleDelete"
  | "channelCreate"
  | "channelUpdate"
  | "channelDelete"
  | "guildUpdate"
  | "memberJoin"
  | "memberLeave"
  | "voiceJoin"
  | "voiceLeave"
  | "voiceMove"
  | "voiceServerDeafen"
  | "voiceServerMute"
  | "antiRaid"
  | "emojiCreate"
  | "emojiUpdate"
  | "emojiDelete"
  | "stickerCreate"
  | "stickerUpdate"
  | "stickerDelete"
  | "webhookCreate"
  | "webhookUpdate"
  | "webhookDelete"
  | "memberBan"
  | "memberUnban"
  | "memberKick"
  | "memberTimeout";

type DispItem = { guild_id: string; role: { id: string; name: string; color: number; hoist: boolean; mentionable: boolean; position: number } };
type RoleDeleteDisp = { guild_id: string; role_id: string };
type VoiceDisp = {
  guild_id?: string;
  channel_id: string | null;
  user_id: string;
  member?: { nick?: string | null; user?: { username?: string; display_name?: string | null; global_name?: string | null } };
  deaf?: boolean;
  mute?: boolean;
};

const COLORS: Record<LogEventKey, number> = {
  roleCreate: 0x68e86b,
  roleUpdate: 0x65a5ee,
  roleDelete: 0xdb3c30,
  channelCreate: 0x68e86b,
  channelUpdate: 0x65a5ee,
  channelDelete: 0xdb3c30,
  guildUpdate: 0x65a5ee,
  memberJoin: 0x68e86b,
  memberLeave: 0xdb3c30,
  voiceJoin: 0x9a8ff5,
  voiceLeave: 0x9a8ff5,
  voiceMove: 0x9a8ff5,
  voiceServerDeafen: 0x9a8ff5,
  voiceServerMute: 0x9a8ff5,
  antiRaid: 0xf04747,
  emojiCreate: 0x68e86b,
  emojiUpdate: 0x65a5ee,
  emojiDelete: 0xdb3c30,
  stickerCreate: 0x68e86b,
  stickerUpdate: 0x65a5ee,
  stickerDelete: 0xdb3c30,
  webhookCreate: 0x68e86b,
  webhookUpdate: 0x65a5ee,
  webhookDelete: 0xdb3c30,
  memberBan: 0xf04747,
  memberUnban: 0x68e86b,
  memberKick: 0xf04747,
  memberTimeout: 0xfdba31,
};

const CACHE_TTL_MS = 60_000;
const settingsCache = new Map<string, { settings: LoggingSettings[]; at: number }>();
const voiceStateMap = new Map<string, { channelId: string | null; deaf: boolean; mute: boolean }>();
const roleCache = new Map<string, Map<string, RoleSnapshot>>();
const emojiCache = new Map<string, Map<string, EmojiSnapshot>>();
const stickerCache = new Map<string, Map<string, StickerSnapshot>>();
const webhookCache = new Map<string, Map<string, WebhookSnapshot>>();

async function getSettings(guildId: string): Promise<LoggingSettings[]> {
  const cached = settingsCache.get(guildId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.settings;

  const settings = await prisma.loggingSettings.findMany({ where: { guildId } }) as LoggingSettings[];
  settingsCache.set(guildId, { settings, at: Date.now() });
  return settings;
}

function pruneCache() {
  const now = Date.now();
  for (const [guildId, entry] of settingsCache) {
    if (now - entry.at > CACHE_TTL_MS) settingsCache.delete(guildId);
  }
}

export async function logEvent(guild: Guild, eventKey: LogEventKey, embed: EmbedBuilder) {
  let sent = false;
  for (const setting of await getSettings(guild.id)) {
    if (!setting[eventKey]) continue;
    const channel = guild.channels.get(setting.channelId);
    if (!channel) continue;
    await channel.send({ embeds: [embed] }).catch(() => {});
    sent = true;
  }
  if (!sent) {
    const botChannel = await getBotChannel(guild);
    if (botChannel) await botChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

function colorHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function channelName(guild: Guild, channelId: string | null | undefined): string {
  if (!channelId) return "Unknown";
  return guild.channels.get(channelId)?.name ?? "Unknown";
}

function roleName(guild: Guild, roleId: string): string {
  const cached = roleCache.get(guild.id)?.get(roleId)?.name;
  if (cached) return cached;
  return guild.roles.get(roleId)?.name ?? roleId;
}

function cacheRole(guildId: string, role: DispItem["role"]) {
  let map = roleCache.get(guildId);
  if (!map) {
    map = new Map();
    roleCache.set(guildId, map);
  }
  map.set(role.id, { name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable, position: role.position });
}

function memberDisplayName(member: VoiceDisp["member"]): string {
  if (!member) return "Unknown";
  const nick = member.nick;
  const name = member.user?.display_name ?? member.user?.global_name ?? member.user?.username;
  return nick || name || "Unknown";
}

function seedRoleCache(guild: Guild) {
  const map = new Map<string, RoleSnapshot>();
  for (const role of guild.roles.values()) {
    map.set(role.id, { name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable, position: role.position });
  }
  roleCache.set(guild.id, map);
}

function seedAssetCaches(guild: Guild) {
  emojiCache.set(guild.id, new Map([...guild.emojis.values()].map((emoji) => [emoji.id, { name: emoji.name, animated: emoji.animated }])));
  stickerCache.set(guild.id, new Map([...guild.stickers.values()].map((sticker) => [sticker.id, { name: sticker.name, description: sticker.description, tags: sticker.tags }])));
}

async function hasEventEnabled(guildId: string, key: LogEventKey): Promise<boolean> {
  const settings = await getSettings(guildId);
  return settings.some((setting) => setting[key]);
}

function snowflakeTimestamp(id: string): number {
  return Number((BigInt(id) >> 22n) + 1420070400000n);
}

function emojiString(emoji: EmojiSnapshot, id: string): string {
  return emoji.animated ? `<a:${emoji.name}:${id}>` : `<:${emoji.name}:${id}>`;
}

const VERIFICATION_LEVELS = ["None", "Low", "Medium", "High", "Very High"];
const CONTENT_FILTERS = ["Disabled", "No roles", "All members"];
const NSFW_LEVELS = ["Default", "Explicit", "Safe", "Age restricted"];
const MFA_LEVELS = ["None", "Elevated"];

function labelOf(mapping: string[], value: number): string {
  return mapping[value] ?? String(value);
}

type Change = { label: string; old: string; neu: string };

function diffFields(changes: Change[]) {
  return changes.map((change) => ({ name: change.label, value: `${change.old} \u2192 ${change.neu}`, inline: true }));
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function permissionNames(bitField: string): string[] {
  let bits: bigint;
  try {
    bits = BigInt(bitField);
  } catch {
    return [];
  }
  return Object.entries(PermissionFlags)
    .filter(([, flag]) => (bits & flag) !== 0n)
    .map(([name]) => name);
}

function overwriteLabel(guild: Guild, overwrite: { id: string; type: number }): string {
  if (overwrite.type === 0) return guild.roles.get(overwrite.id) ? `<@&${overwrite.id}>` : `Role ${overwrite.id}`;
  return `<@${overwrite.id}>`;
}

function overwriteSummary(guild: Guild, overwrite: { allow: string; deny: string }): string {
  const allow = permissionNames(overwrite.allow);
  const deny = permissionNames(overwrite.deny);
  return `allow ${allow.length > 0 ? allow.join(", ") : "(none)"} | deny ${deny.length > 0 ? deny.join(", ") : "(none)"}`;
}

function diffOverwrites(guild: Guild, oldList: { id: string; type: number; allow: string; deny: string }[], newList: { id: string; type: number; allow: string; deny: string }[]) {
  const oldMap = new Map(oldList.map((overwrite) => [overwrite.id, overwrite]));
  const newMap = new Map(newList.map((overwrite) => [overwrite.id, overwrite]));
  const lines: string[] = [];
  for (const overwrite of newList) {
    const label = overwriteLabel(guild, overwrite);
    const prev = oldMap.get(overwrite.id);
    if (!prev) {
      lines.push(`${label}: **added** ${overwriteSummary(guild, overwrite)}`);
      continue;
    }
    if (prev.allow !== overwrite.allow || prev.deny !== overwrite.deny) {
      lines.push(`${label}: **changed** ${overwriteSummary(guild, prev)} \u2192 ${overwriteSummary(guild, overwrite)}`);
    }
  }
  for (const overwrite of oldList) {
    if (!newMap.has(overwrite.id)) lines.push(`${overwriteLabel(guild, overwrite)}: **removed** ${overwriteSummary(guild, overwrite)}`);
  }
  return lines;
}

function handleRoleCreate(data: DispItem, client: Client) {
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;
  const role = data.role;
  cacheRole(guild.id, role);
  const embed = new EmbedBuilder()
    .setTitle("Role created")
    .setDescription(`<@&${role.id}> **${role.name}**`)
    .setColor(COLORS.roleCreate)
    .addFields(
      { name: "ID", value: role.id, inline: true },
      { name: "Color", value: colorHex(role.color), inline: true },
      { name: "Hoisted", value: yesNo(role.hoist), inline: true },
      { name: "Mentionable", value: yesNo(role.mentionable), inline: true },
    );
  logEvent(guild, "roleCreate", embed);
}

function handleRoleUpdate(data: DispItem, client: Client) {
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;
  const role = data.role;
  const prev = roleCache.get(guild.id)?.get(role.id);
  cacheRole(guild.id, role);

  const changes: Change[] = [];
  if (prev) {
    if (prev.name !== role.name) changes.push({ label: "Name", old: prev.name, neu: role.name });
    if (prev.color !== role.color) changes.push({ label: "Color", old: colorHex(prev.color), neu: colorHex(role.color) });
    if (prev.hoist !== role.hoist) changes.push({ label: "Hoisted", old: yesNo(prev.hoist), neu: yesNo(role.hoist) });
    if (prev.mentionable !== role.mentionable) changes.push({ label: "Mentionable", old: yesNo(prev.mentionable), neu: yesNo(role.mentionable) });
    if (prev.position !== role.position) changes.push({ label: "Position", old: String(prev.position), neu: String(role.position) });
  }

  const embed = new EmbedBuilder()
    .setTitle("Role updated")
    .setDescription(`<@&${role.id}> **${role.name}**`)
    .setColor(COLORS.roleUpdate)
    .addFields({ name: "ID", value: role.id, inline: true }, ...diffFields(changes));
  logEvent(guild, "roleUpdate", embed);
}

function handleRoleDelete(data: RoleDeleteDisp, client: Client) {
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;
  const name = roleName(guild, data.role_id);
  roleCache.get(guild.id)?.delete(data.role_id);
  const embed = new EmbedBuilder()
    .setTitle("Role deleted")
    .setDescription(`**${name}**`)
    .setColor(COLORS.roleDelete)
    .addFields({ name: "ID", value: data.role_id });
  logEvent(guild, "roleDelete", embed);
}

function handleChannelCreate(channel: GuildChannel, client: Client) {
  const guild = client.guilds.get(channel.guildId);
  if (!guild) return;
  const embed = new EmbedBuilder()
    .setTitle("Channel created")
    .setDescription(`<#${channel.id}> **${channel.name ?? "Unknown"}**`)
    .setColor(COLORS.channelCreate)
    .addFields(
      { name: "ID", value: channel.id, inline: true },
      { name: "Type", value: String(channel.type), inline: true },
    );
  logEvent(guild, "channelCreate", embed);
}

type ChannelDiff = {
  id: string;
  type: number;
  name?: string | null;
  position?: number;
  parentId?: string | null;
  topic?: string | null;
  nsfw?: boolean;
  rateLimitPerUser?: number;
  permissionOverwrites?: { id: string; type: number; allow: string; deny: string }[];
};

function handleChannelUpdate(oldChannel: unknown, newChannel: GuildChannel, client: Client) {
  const guild = client.guilds.get(newChannel.guildId);
  if (!guild) return;
  const oldC = oldChannel as ChannelDiff | null;
  const newC = newChannel as unknown as ChannelDiff;

  const changes: Change[] = [];
  if (oldC) {
    if (oldC.name !== newChannel.name) changes.push({ label: "Name", old: oldC.name ?? "(none)", neu: newChannel.name ?? "(none)" });
    if (oldC.type !== newChannel.type) changes.push({ label: "Type", old: String(oldC.type), neu: String(newChannel.type) });
    if ("position" in newC && oldC.position !== newChannel.position) changes.push({ label: "Position", old: String(oldC.position ?? 0), neu: String(newChannel.position ?? 0) });
    if ("parentId" in newC && oldC.parentId !== newChannel.parentId) changes.push({ label: "Parent", old: channelName(guild, oldC.parentId), neu: channelName(guild, newChannel.parentId) });
    if ("topic" in newC && (oldC.topic ?? "") !== (newC.topic ?? "")) changes.push({ label: "Topic", old: oldC.topic ?? "(none)", neu: newC.topic ?? "(none)" });
    if ("nsfw" in newC && !!oldC.nsfw !== !!newC.nsfw) changes.push({ label: "NSFW", old: yesNo(!!oldC.nsfw), neu: yesNo(!!newC.nsfw) });
    if ("rateLimitPerUser" in newC && (oldC.rateLimitPerUser ?? 0) !== (newC.rateLimitPerUser ?? 0)) changes.push({ label: "Slowmode", old: `${oldC.rateLimitPerUser ?? 0}s`, neu: `${newC.rateLimitPerUser ?? 0}s` });
  }

  const embed = new EmbedBuilder()
    .setTitle("Channel updated")
    .setDescription(`<#${newChannel.id}> **${newChannel.name ?? "Unknown"}**`)
    .setColor(COLORS.channelUpdate)
    .addFields({ name: "ID", value: newChannel.id, inline: true }, ...diffFields(changes));

  if (oldC && newChannel.permissionOverwrites) {
    const overwriteLines = diffOverwrites(guild, oldC.permissionOverwrites ?? [], newChannel.permissionOverwrites);
    if (overwriteLines.length > 0) {
      embed.addFields({ name: "Permission overwrites", value: overwriteLines.join("\n") });
    }
  }

  logEvent(guild, "channelUpdate", embed);
}

function handleChannelDelete(channel: GuildChannel, client: Client) {
  const guild = client.guilds.get(channel.guildId);
  if (!guild) return;
  const embed = new EmbedBuilder()
    .setTitle("Channel deleted")
    .setDescription(`**${channel.name ?? "Unknown"}**`)
    .setColor(COLORS.channelDelete)
    .addFields(
      { name: "ID", value: channel.id, inline: true },
      { name: "Type", value: String(channel.type), inline: true },
    );
  logEvent(guild, "channelDelete", embed);
}

function handleEmojisUpdate(data: { guild_id: string; emojis: { id: string; name: string; animated: boolean }[] }, client: Client) {
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;

  const prev = emojiCache.get(guild.id) ?? new Map<string, EmojiSnapshot>();
  const next = new Map<string, EmojiSnapshot>(data.emojis.map((emoji) => [emoji.id, { name: emoji.name, animated: emoji.animated }]));

  for (const [id, snapshot] of prev) {
    if (next.has(id)) continue;
    const embed = new EmbedBuilder()
      .setTitle("Emoji deleted")
      .setDescription(emojiString(snapshot, id))
      .setColor(COLORS.emojiDelete)
      .addFields(
        { name: "ID", value: id, inline: true },
        { name: "Name", value: snapshot.name, inline: true },
      );
    logEvent(guild, "emojiDelete", embed);
  }

  for (const [id, snapshot] of next) {
    const oldSnapshot = prev.get(id);
    if (!oldSnapshot) {
      const embed = new EmbedBuilder()
        .setTitle("Emoji created")
        .setDescription(`${emojiString(snapshot, id)} **${snapshot.name}**`)
        .setColor(COLORS.emojiCreate)
        .addFields(
          { name: "ID", value: id, inline: true },
          { name: "Animated", value: yesNo(snapshot.animated), inline: true },
        );
      logEvent(guild, "emojiCreate", embed);
      continue;
    }
    if (oldSnapshot.name !== snapshot.name) {
      const embed = new EmbedBuilder()
        .setTitle("Emoji updated")
        .setDescription(emojiString(snapshot, id))
        .setColor(COLORS.emojiUpdate)
        .addFields({ name: "ID", value: id, inline: true }, ...diffFields([{ label: "Name", old: oldSnapshot.name, neu: snapshot.name }]));
      logEvent(guild, "emojiUpdate", embed);
    }
  }

  emojiCache.set(guild.id, next);
}

function handleStickersUpdate(data: { guild_id: string; stickers: { id: string; name: string; description: string; tags: string[] }[] }, client: Client) {
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;

  const prev = stickerCache.get(guild.id) ?? new Map<string, StickerSnapshot>();
  const next = new Map<string, StickerSnapshot>(data.stickers.map((sticker) => [sticker.id, { name: sticker.name, description: sticker.description, tags: sticker.tags }]));

  for (const [id, snapshot] of prev) {
    if (next.has(id)) continue;
    const embed = new EmbedBuilder()
      .setTitle("Sticker deleted")
      .setDescription(`**${snapshot.name}**`)
      .setColor(COLORS.stickerDelete)
      .addFields({ name: "ID", value: id, inline: true });
    logEvent(guild, "stickerDelete", embed);
  }

  for (const [id, snapshot] of next) {
    const oldSnapshot = prev.get(id);
    if (!oldSnapshot) {
      const embed = new EmbedBuilder()
        .setTitle("Sticker created")
        .setDescription(`**${snapshot.name}**`)
        .setColor(COLORS.stickerCreate)
        .addFields(
          { name: "ID", value: id, inline: true },
          { name: "Description", value: snapshot.description || "(none)", inline: true },
          { name: "Tags", value: snapshot.tags.join(", ") || "(none)", inline: true },
        );
      logEvent(guild, "stickerCreate", embed);
      continue;
    }
    const changes: Change[] = [];
    if (oldSnapshot.name !== snapshot.name) changes.push({ label: "Name", old: oldSnapshot.name, neu: snapshot.name });
    if (oldSnapshot.description !== snapshot.description) changes.push({ label: "Description", old: oldSnapshot.description, neu: snapshot.description });
    if (oldSnapshot.tags.join(",") !== snapshot.tags.join(",")) changes.push({ label: "Tags", old: oldSnapshot.tags.join(", "), neu: snapshot.tags.join(", ") });
    if (changes.length > 0) {
      const embed = new EmbedBuilder()
        .setTitle("Sticker updated")
        .setDescription(`**${snapshot.name}**`)
        .setColor(COLORS.stickerUpdate)
        .addFields({ name: "ID", value: id, inline: true }, ...diffFields(changes));
      logEvent(guild, "stickerUpdate", embed);
    }
  }

  stickerCache.set(guild.id, next);
}

async function handleWebhooksUpdate(data: { guild_id: string; channel_id: string }, client: Client) {
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;
  const channel = guild.channels.get(data.channel_id);
  if (!channel) return;

  const webhooks = await channel.fetchWebhooks().catch(() => null);
  if (!webhooks) return;
``
  const prev = webhookCache.get(guild.id) ?? new Map<string, WebhookSnapshot>();
  const next = new Map<string, WebhookSnapshot>(webhooks.map((webhook) => [webhook.id, { name: webhook.name, channelId: webhook.channelId }]));

  for (const [id, snapshot] of prev) {
    if (next.has(id)) continue;
    const embed = new EmbedBuilder()
      .setTitle("Webhook deleted")
      .setDescription(`**${snapshot.name}**`)
      .setColor(COLORS.webhookDelete)
      .addFields(
        { name: "ID", value: id, inline: true },
        { name: "Channel", value: channelName(guild, snapshot.channelId), inline: true },
      );
    logEvent(guild, "webhookDelete", embed);
  }

  for (const [id, snapshot] of next) {
    const oldSnapshot = prev.get(id);
    if (!oldSnapshot) {
      const embed = new EmbedBuilder()
        .setTitle("Webhook created")
        .setDescription(`**${snapshot.name}**`)
        .setColor(COLORS.webhookCreate)
        .addFields(
          { name: "ID", value: id, inline: true },
          { name: "Channel", value: channelName(guild, snapshot.channelId), inline: true },
        );
      logEvent(guild, "webhookCreate", embed);
      continue;
    }
    const changes: Change[] = [];
    if (oldSnapshot.name !== snapshot.name) changes.push({ label: "Name", old: oldSnapshot.name, neu: snapshot.name });
    if (oldSnapshot.channelId !== snapshot.channelId) changes.push({ label: "Channel", old: channelName(guild, oldSnapshot.channelId), neu: channelName(guild, snapshot.channelId) });
    if (changes.length > 0) {
      const embed = new EmbedBuilder()
        .setTitle("Webhook updated")
        .setDescription(`**${snapshot.name}**`)
        .setColor(COLORS.webhookUpdate)
        .addFields({ name: "ID", value: id, inline: true }, ...diffFields(changes));
      logEvent(guild, "webhookUpdate", embed);
    }
  }

  webhookCache.set(guild.id, next);
}

function handleGuildUpdate(oldGuild: Guild, newGuild: Guild) {
  const changes: Change[] = [];
  if (oldGuild.name !== newGuild.name) changes.push({ label: "Name", old: oldGuild.name, neu: newGuild.name });
  if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push({ label: "Verification Level", old: labelOf(VERIFICATION_LEVELS, oldGuild.verificationLevel), neu: labelOf(VERIFICATION_LEVELS, newGuild.verificationLevel) });
  if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) changes.push({ label: "Content Filter", old: labelOf(CONTENT_FILTERS, oldGuild.explicitContentFilter), neu: labelOf(CONTENT_FILTERS, newGuild.explicitContentFilter) });
  if (oldGuild.nsfwLevel !== newGuild.nsfwLevel) changes.push({ label: "NSFW Level", old: labelOf(NSFW_LEVELS, oldGuild.nsfwLevel), neu: labelOf(NSFW_LEVELS, newGuild.nsfwLevel) });
  if (oldGuild.mfaLevel !== newGuild.mfaLevel) changes.push({ label: "2FA Required", old: labelOf(MFA_LEVELS, oldGuild.mfaLevel), neu: labelOf(MFA_LEVELS, newGuild.mfaLevel) });

  const embed = new EmbedBuilder()
    .setTitle("Server updated")
    .setDescription(`**${newGuild.name}**`)
    .setColor(COLORS.guildUpdate)
    .addFields(...diffFields(changes));
  if (changes.length === 0) return;
  logEvent(newGuild, "guildUpdate", embed);
}

function handleMemberJoin(member: GuildMember) {
  const embed = new EmbedBuilder()
    .setTitle("Member joined")
    .setDescription(`<@${member.id}> **${member.displayName}**`)
    .setColor(COLORS.memberJoin)
    .addFields({ name: "ID", value: member.id, inline: true });
  logEvent(member.guild, "memberJoin", embed);
}

function handleMemberLeave(member: GuildMember) {
  const embed = new EmbedBuilder()
    .setTitle("Member left")
    .setDescription(`<@${member.id}> **${member.displayName}**`)
    .setColor(COLORS.memberLeave)
    .addFields({ name: "ID", value: member.id, inline: true });
  logEvent(member.guild, "memberLeave", embed);
  void handleMemberKick(member);
}

async function handleMemberKick(member: GuildMember) {
  const guild = member.guild;
  if (!await hasEventEnabled(guild.id, "memberKick")) return;

  const audit = await guild.fetchAuditLogs({ actionType: 20, userId: member.id, limit: 5 }).catch(() => null);
  const kickEntry = audit?.audit_log_entries.find((entry) => entry.target_id === member.id && Date.now() - snowflakeTimestamp(entry.id) < 30_000);
  if (!kickEntry) return;

  const embed = new EmbedBuilder()
    .setTitle("Member kicked")
    .setDescription(`<@${member.id}> **${member.displayName}** kicked by ${kickEntry.user_id ? `<@${kickEntry.user_id}>` : "Unknown"}`)
    .setColor(COLORS.memberKick)
    .addFields({ name: "Reason", value: kickEntry.reason ?? "None", inline: true });
  logEvent(guild, "memberKick", embed);
}

function handleMemberBan(ban: GuildBan, client: Client) {
  const guild = client.guilds.get(ban.guildId);
  if (!guild) return;
  const embed = new EmbedBuilder()
    .setTitle("Member banned")
    .setDescription(`<@${ban.user.id}> **${ban.user.username}**`)
    .setColor(COLORS.memberBan)
    .addFields(
      { name: "Reason", value: ban.reason ?? "None", inline: true },
      { name: "Expires", value: ban.expiresAt ?? "Never", inline: true },
    );
  logEvent(guild, "memberBan", embed);
}

function handleMemberUnban(ban: GuildBan, client: Client) {
  const guild = client.guilds.get(ban.guildId);
  if (!guild) return;
  const embed = new EmbedBuilder()
    .setTitle("Member unbanned")
    .setDescription(`<@${ban.user.id}> **${ban.user.username}**`)
    .setColor(COLORS.memberUnban);
  logEvent(guild, "memberUnban", embed);
}

function timeoutString(until: Date | null | undefined): string {
  return until ? until.toUTCString() : "None";
}

function handleMemberTimeout(oldMember: GuildMember | null, newMember: GuildMember) {
  if (!oldMember) return;
  const oldUntil = oldMember.communicationDisabledUntil;
  const newUntil = newMember.communicationDisabledUntil;
  if (oldUntil?.getTime() === newUntil?.getTime()) return;
  const changes: Change[] = [
    { label: "Timeout", old: timeoutString(oldUntil), neu: timeoutString(newUntil) },
  ];
  const embed = new EmbedBuilder()
    .setTitle("Member timed out")
    .setDescription(`<@${newMember.id}> **${newMember.displayName}**`)
    .setColor(COLORS.memberTimeout)
    .addFields({ name: "ID", value: newMember.id, inline: true }, ...diffFields(changes));
  logEvent(newMember.guild, "memberTimeout", embed);
}

function handleVoiceStateUpdate(data: VoiceDisp, client: Client) {
  if (!data.guild_id) return;
  const guild = client.guilds.get(data.guild_id);
  if (!guild) return;

  const key = `${data.guild_id}:${data.user_id}`;
  const prev = voiceStateMap.get(key);
  const next = { channelId: data.channel_id, deaf: !!data.deaf, mute: !!data.mute };
  voiceStateMap.set(key, next);

  const name = memberDisplayName(data.member);
  const idField = { name: "Member ID", value: data.user_id, inline: true };

  const from = prev?.channelId ?? null;
  const to = next.channelId;

  if (prev) {
    if (from === null && to !== null) {
      const embed = new EmbedBuilder()
        .setTitle("Joined voice channel")
        .setDescription(`**${name}** joined **${channelName(guild, to)}**`)
        .setColor(COLORS.voiceJoin)
        .addFields(idField);
      logEvent(guild, "voiceJoin", embed);
    } else if (from !== null && to === null) {
      const embed = new EmbedBuilder()
        .setTitle("Left voice channel")
        .setDescription(`**${name}** left **${channelName(guild, from)}**`)
        .setColor(COLORS.voiceLeave)
        .addFields(idField);
      logEvent(guild, "voiceLeave", embed);
    } else if (from !== null && to !== null && from !== to) {
      const embed = new EmbedBuilder()
        .setTitle("Moved voice channel")
        .setDescription(`**${name}** moved from **${channelName(guild, from)}** to **${channelName(guild, to)}**`)
        .setColor(COLORS.voiceMove)
        .addFields(idField);
      logEvent(guild, "voiceMove", embed);
    }

    if (prev.deaf !== next.deaf) {
      const embed = new EmbedBuilder()
        .setTitle(next.deaf ? "Server deafened" : "Server undeafened")
        .setDescription(`**${name}** was ${next.deaf ? "deafened" : "undeafened"} in **${channelName(guild, to)}**`)
        .setColor(COLORS.voiceServerDeafen)
        .addFields(idField);
      logEvent(guild, "voiceServerDeafen", embed);
    }

    if (prev.mute !== next.mute) {
      const embed = new EmbedBuilder()
        .setTitle(next.mute ? "Server muted" : "Server unmuted")
        .setDescription(`**${name}** was ${next.mute ? "muted" : "unmuted"} in **${channelName(guild, to)}**`)
        .setColor(COLORS.voiceServerMute)
        .addFields(idField);
      logEvent(guild, "voiceServerMute", embed);
    }
  }
}

export function setup(client: Client) {
  client.on("guildCreate", (guild: Guild) => {
    seedRoleCache(guild);
    seedAssetCaches(guild);
  });
  client.on("ready", () => {
    for (const guild of client.guilds.values()) {
      seedRoleCache(guild);
      seedAssetCaches(guild);
    }
  });
  client.on("guildRoleCreate", (data: DispItem) => handleRoleCreate(data, client));
  client.on("guildRoleUpdate", (data: DispItem) => handleRoleUpdate(data, client));
  client.on("guildRoleDelete", (data: RoleDeleteDisp) => handleRoleDelete(data, client));
  client.on("channelCreate", (channel: GuildChannel) => handleChannelCreate(channel, client));
  client.on("channelUpdate", (oldC, newC) => handleChannelUpdate(oldC, newC as GuildChannel, client));
  client.on("channelDelete", (channel) => handleChannelDelete(channel as GuildChannel, client));
  client.on("guildUpdate", (oldG, newG) => handleGuildUpdate(oldG, newG));
  client.on("guildMemberAdd", (member: GuildMember) => handleMemberJoin(member));
  client.on("guildMemberRemove", (member: GuildMember) => handleMemberLeave(member));
  client.on("guildMemberUpdate", (oldM, newM) => handleMemberTimeout(oldM, newM as GuildMember));
  client.on("guildBanAdd", (ban: GuildBan) => handleMemberBan(ban, client));
  client.on("guildBanRemove", (ban: GuildBan) => handleMemberUnban(ban, client));
  client.on("guildEmojisUpdate", (data) => handleEmojisUpdate(data, client));
  client.on("guildStickersUpdate", (data) => handleStickersUpdate(data, client));
  client.on("webhooksUpdate", (data) => handleWebhooksUpdate(data, client));
  client.on("voiceStateUpdate", (data: VoiceDisp) => handleVoiceStateUpdate(data, client));

  setInterval(pruneCache, CACHE_TTL_MS);
}

const settingsSchema = z.object({
  channelId: z.string().nonempty(),
  roleCreate: z.boolean(),
  roleUpdate: z.boolean(),
  roleDelete: z.boolean(),
  channelCreate: z.boolean(),
  channelUpdate: z.boolean(),
  channelDelete: z.boolean(),
  guildUpdate: z.boolean(),
  memberJoin: z.boolean(),
  memberLeave: z.boolean(),
  voiceJoin: z.boolean(),
  voiceLeave: z.boolean(),
  voiceMove: z.boolean(),
  voiceServerDeafen: z.boolean(),
  voiceServerMute: z.boolean(),
  antiRaid: z.boolean(),
  emojiCreate: z.boolean(),
  emojiUpdate: z.boolean(),
  emojiDelete: z.boolean(),
  stickerCreate: z.boolean(),
  stickerUpdate: z.boolean(),
  stickerDelete: z.boolean(),
  webhookCreate: z.boolean(),
  webhookUpdate: z.boolean(),
  webhookDelete: z.boolean(),
  memberBan: z.boolean(),
  memberUnban: z.boolean(),
  memberKick: z.boolean(),
  memberTimeout: z.boolean(),
});

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname !== "/api/logging") return null;

  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response("Unauthorized", { status: 403 });
  const guild = client.guilds.find((g) => g.id === guildId);
  if (!guild) return new Response("Guild not found", { status: 400 });

  if (req.method === "GET") {
    const settings = await prisma.loggingSettings.findMany({ where: { guildId } });
    const result = settings.map((s) => ({
      ...s,
      channelName: guild.channels.get(s.channelId)?.name ?? "Unknown",
    }));
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const validated = settingsSchema.safeParse(body);
    if (!validated.success) {
      console.log(validated.error);
      return new Response("Bad request", { status: 400 });
    }
    const channel = guild.channels.find((ch) => ch.id === validated.data.channelId && ch.type === 0);
    if (!channel) return new Response("Channel not found", { status: 400 });

    const { channelId, ...toggles } = validated.data;
    await prisma.loggingSettings.upsert({
      where: { guildId_channelId: { guildId, channelId } },
      update: toggles,
      create: { guildId, channelId, ...toggles },
    });
    pruneCache();
    settingsCache.delete(guildId);
    return new Response("OK", { status: 200 });
  }

  if (req.method === "DELETE") {
    const validator = z.object({ channelId: z.string().nonempty() });
    const body = await req.json();
    const validated = validator.safeParse(body);
    if (!validated.success) return new Response("Bad request", { status: 400 });
    const result = await prisma.loggingSettings.deleteMany({ where: { guildId, channelId: validated.data.channelId } });
    if (result.count > 0) {
      pruneCache();
      settingsCache.delete(guildId);
      return new Response("Deleted", { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }

  return new Response("Method Not Allowed", { status: 405 });
}
