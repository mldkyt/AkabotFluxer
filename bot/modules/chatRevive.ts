import { Client, Message, TextChannel } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

const timers = new Map<string, number>();

function armTimer(client: Client, channelId: string, setting: { guildId: string; message: string; roleId: string | null }, timeoutMs: number) {
  clearTimer(channelId);
  timers.set(channelId, setTimeout(async () => {
    timers.delete(channelId);
    const state = await prisma.chatReviveState.upsert({
      where: { channelId },
      update: {},
      create: { channelId },
    });
    if (state.reviveSent) return;
    const latest = await prisma.chatReviveSettings.findUnique({ where: { guildId_channelId: { guildId: setting.guildId, channelId } } });
    if (!latest) return;
    const channel = client.channels.get(channelId) as TextChannel | undefined;
    if (!channel) return;
    let content = latest.message;
    if (latest.roleId) content = content.replace("{role}", `<@&${latest.roleId}>`);
    else content = content.replace("{role}", "").trim();
    try {
      await channel.send(content);
      await prisma.chatReviveState.update({
        where: { channelId },
        data: { reviveSent: true },
      });
    } catch (e) {
      console.error(`Chat revive failed for ${channelId}:`, e);
    }
  }, timeoutMs) as unknown as number);
}

function clearTimer(channelId: string) {
  const existing = timers.get(channelId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(channelId);
  }
}

async function handleMessage(client: Client, message: Message) {
  if (message.author.bot || !message.guild) return;
  const setting = await prisma.chatReviveSettings.findUnique({
    where: { guildId_channelId: { guildId: message.guild.id, channelId: message.channelId } },
  });
  if (!setting) return;
  await prisma.chatReviveState.upsert({
    where: { channelId: message.channelId },
    update: { lastMessageAt: new Date(), reviveSent: false },
    create: { channelId: message.channelId, lastMessageAt: new Date(), reviveSent: false },
  });
  armTimer(client, message.channelId, setting, setting.timeout * 60_000);
}

export function setup(client: Client) {
  client.on("messageCreate", (msg) => handleMessage(client, msg));

  (async () => {
    const allSettings = await prisma.chatReviveSettings.findMany();
    for (const setting of allSettings) {
      const state = await prisma.chatReviveState.findUnique({ where: { channelId: setting.channelId } });
      const lastActive = state?.lastMessageAt ?? new Date();
      const elapsed = Date.now() - lastActive.getTime();
      const remaining = Math.max(0, setting.timeout * 60_000 - elapsed);
      armTimer(client, setting.channelId, setting, remaining);
    }
  })();
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname !== "/api/chat-revive") return null;

  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response("Unauthorized", { status: 403 });
  const guild = client.guilds.find((g) => g.id === guildId);
  if (!guild) return new Response("Guild not found", { status: 400 });

  if (req.method === "GET") {
    const settings = await prisma.chatReviveSettings.findMany({ where: { guildId } });
    const result = settings.map((s) => {
      const channel = guild.channels.find((ch) => ch.id === s.channelId);
      const role = s.roleId ? guild.roles.find((r) => r.id === s.roleId) : null;
      return {
        ...s,
        channelName: channel?.name ?? "Unknown",
        roleName: role?.name ?? null,
      };
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const validator = z.object({
      channelId: z.string().nonempty(),
      timeout: z.int().min(1).max(1440),
      message: z.string().min(1).max(2000),
      roleId: z.string().nullish(),
    });
    const body = await req.json();
    const validated = validator.safeParse(body);
    if (!validated.success) {
      console.log(validated.error);
      return new Response("Bad request", { status: 400 });
    }
    const channel = guild.channels.find((ch) => ch.id === validated.data.channelId);
    if (!channel) return new Response("Channel not found", { status: 400 });
    if (validated.data.roleId) {
      const role = guild.roles.find((r) => r.id === validated.data.roleId);
      if (!role) return new Response("Role not found", { status: 400 });
    }
    await prisma.chatReviveSettings.upsert({
      where: { guildId_channelId: { guildId, channelId: validated.data.channelId } },
      update: { timeout: validated.data.timeout, message: validated.data.message, roleId: validated.data.roleId ?? null },
      create: { guildId, ...validated.data, roleId: validated.data.roleId ?? null },
    });
    await prisma.chatReviveState.upsert({
      where: { channelId: validated.data.channelId },
      update: { lastMessageAt: new Date(), reviveSent: false },
      create: { channelId: validated.data.channelId, lastMessageAt: new Date(), reviveSent: false },
    });
    const setting = await prisma.chatReviveSettings.findUnique({
      where: { guildId_channelId: { guildId, channelId: validated.data.channelId } },
    });
    if (setting) armTimer(client, setting.channelId, setting, setting.timeout * 60_000);
    return new Response("OK", { status: 200 });
  }

  if (req.method === "DELETE") {
    const validator = z.object({ channelId: z.string().nonempty() });
    const body = await req.json();
    const validated = validator.safeParse(body);
    if (!validated.success) return new Response("Bad request", { status: 400 });
    const result = await prisma.chatReviveSettings.deleteMany({ where: { guildId, channelId: validated.data.channelId } });
    if (result.count > 0) {
      clearTimer(validated.data.channelId);
      await prisma.chatReviveState.deleteMany({ where: { channelId: validated.data.channelId } });
      return new Response("Deleted", { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }
}
