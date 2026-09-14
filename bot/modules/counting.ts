import { Client, Message, TextChannel } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

interface CountingSetting {
  anyCount: boolean;
  wordCount: boolean;
  totalWordCount: boolean;
  resetOnSameUser: boolean;
  failOnEdit: boolean;
}

function parseAttempt(content: string, setting: CountingSetting, target: number): { valid: boolean; attempted: number | null } {
  const trimmed = content.trim();
  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0);
  const numbers = [...trimmed.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  const allSameWords = tokens.length > 0 && tokens.every((t) => t === tokens[0]);

  if (tokens.length === 1 && /^\d+$/.test(tokens[0]) && parseInt(tokens[0], 10) === target) {
    return { valid: true, attempted: target };
  }
  if (setting.anyCount && numbers.includes(target)) {
    return { valid: true, attempted: target };
  }
  if (setting.wordCount && allSameWords && tokens.length === target) {
    return { valid: true, attempted: tokens.length };
  }
  if (setting.totalWordCount && tokens.length > 0 && tokens.length === target) {
    return { valid: true, attempted: tokens.length };
  }

  let attempted: number | null = numbers[0] ?? null;
  if (attempted == null && allSameWords) attempted = tokens.length;
  if (attempted == null) attempted = tokens.length > 0 ? tokens.length : null;
  return { valid: false, attempted };
}

async function resetCount(channelId: string) {
  await prisma.countingState.update({
    where: { channelId },
    data: { count: 0, lastUserId: "", lastMessageId: "" },
  });
}

async function sendToChannel(client: Client, channelId: string, content: string) {
  const channel = client.channels.get(channelId) as TextChannel | undefined;
  if (!channel) return;
  try {
    await channel.send(content);
  } catch (e) {
    console.error(`Counting send failed for ${channelId}:`, e);
  }
}

async function handleMessage(client: Client, message: Message) {
  if (message.author.bot || !message.guild) return;

  const setting = await prisma.countingSettings.findUnique({
    where: { guildId_channelId: { guildId: message.guild.id, channelId: message.channelId } },
  });
  if (!setting) return;

  const state = await prisma.countingState.upsert({
    where: { channelId: message.channelId },
    update: {},
    create: { channelId: message.channelId },
  });

  const target = state.count + 1;

  if (state.lastUserId === message.author.id && setting.resetOnSameUser) {
    await resetCount(message.channelId);
    try {
      await message.react("❌");
    } catch {}
    await sendToChannel(
      client,
      message.channelId,
      `<@${message.author.id}> counted twice in a row! The count was ${state.count}, now it resets back to 1.`,
    );
    return;
  }

  const { valid, attempted } = parseAttempt(message.content, setting, target);

  if (valid) {
    await prisma.countingState.update({
      where: { channelId: message.channelId },
      data: { count: target, lastUserId: message.author.id, lastMessageId: message.id },
    });
    try {
      await message.react("✅");
    } catch {}
    return;
  }

  await resetCount(message.channelId);
  try {
    await message.react("❌");
  } catch {}
  if (attempted == null) {
    await sendToChannel(
      client,
      message.channelId,
      `<@${message.author.id}> broke the count at ${state.count}! No valid number found. The next number is 1.`,
    );
  } else {
    await sendToChannel(
      client,
      message.channelId,
      `<@${message.author.id}> broke the count at ${attempted}! The next number was ${target}. The count resets back to 1.`,
    );
  }
}

export function setup(client: Client) {
  client.on("messageCreate", (msg) => handleMessage(client, msg));

  client.on("messageUpdate", async (oldMsg, newMsg) => {
    if (newMsg.author?.bot || !newMsg.guild) return;

    const setting = await prisma.countingSettings.findUnique({
      where: { guildId_channelId: { guildId: newMsg.guild.id, channelId: newMsg.channelId } },
    });
    if (!setting || !setting.failOnEdit) return;

    const state = await prisma.countingState.findUnique({ where: { channelId: newMsg.channelId } });
    if (!state || state.count === 0 || state.lastMessageId !== newMsg.id) return;

    await resetCount(newMsg.channelId);
    try {
      await newMsg.react("❌");
    } catch {}
    await sendToChannel(
      client,
      newMsg.channelId,
      `<@${newMsg.author.id}> edited their counted message! The count was ${state.count}, now it resets back to 1.`,
    );
  });
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname !== "/api/counting") return null;

  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response("Unauthorized", { status: 403 });
  const guild = client.guilds.find((g) => g.id === guildId);
  if (!guild) return new Response("Guild not found", { status: 400 });

  if (req.method === "GET") {
    const settings = await prisma.countingSettings.findMany({ where: { guildId } });
    const states = await prisma.countingState.findMany({
      where: { channelId: { in: settings.map((s) => s.channelId) } },
    });
    const result = settings.map((s) => {
      const state = states.find((st) => st.channelId === s.channelId);
      return {
        ...s,
        channelName: guild.channels.find((ch) => ch.id === s.channelId)?.name ?? "Unknown",
        count: state?.count ?? 0,
      };
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    const validator = z.object({
      channelId: z.string().nonempty(),
      anyCount: z.boolean(),
      wordCount: z.boolean(),
      totalWordCount: z.boolean(),
      resetOnSameUser: z.boolean(),
      failOnEdit: z.boolean(),
    });
    const body = await req.json();
    const validated = validator.safeParse(body);
    if (!validated.success) {
      console.log(validated.error);
      return new Response("Bad request", { status: 400 });
    }
    const channel = guild.channels.find((ch) => ch.id === validated.data.channelId);
    if (!channel) return new Response("Channel not found", { status: 400 });
    await prisma.countingSettings.upsert({
      where: { guildId_channelId: { guildId, channelId: validated.data.channelId } },
      update: {
        anyCount: validated.data.anyCount,
        wordCount: validated.data.wordCount,
        totalWordCount: validated.data.totalWordCount,
        resetOnSameUser: validated.data.resetOnSameUser,
        failOnEdit: validated.data.failOnEdit,
      },
      create: { guildId, ...validated.data },
    });
    await prisma.countingState.upsert({
      where: { channelId: validated.data.channelId },
      update: {},
      create: { channelId: validated.data.channelId },
    });
    return new Response("OK", { status: 200 });
  }

  if (req.method === "DELETE") {
    const validator = z.object({ channelId: z.string().nonempty() });
    const body = await req.json();
    const validated = validator.safeParse(body);
    if (!validated.success) return new Response("Bad request", { status: 400 });
    const result = await prisma.countingSettings.deleteMany({
      where: { guildId, channelId: validated.data.channelId },
    });
    if (result.count > 0) {
      await prisma.countingState.deleteMany({ where: { channelId: validated.data.channelId } });
      return new Response("Deleted", { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }
}
