import { Client, Message, MessageSendOptions } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { sendToBotChannelOrReply } from "../src/serverSettings.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

const WEEKLY_BOOST_FACTOR = 1.5;
const WEEK_HOURS = 24 * 7;

function isInMonthDayWindow(now: Date, startMonth: number, startDay: number, endMonth: number, endDay: number): boolean {
  const current = now.getMonth() + 1;
  const day = now.getDate();
  const cur = current * 100 + day;
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;

  if (start < end) return cur >= start && cur <= end;
  if (start > end) return cur >= start || cur <= end;
  return cur === start;
}

function toWeekIndex(day: number, hour: number): number {
  return day * 24 + hour;
}

function isInWeekWindow(now: Date, startDay: number, startHour: number, endDay: number, endHour: number): boolean {
  const idx = toWeekIndex(now.getDay(), now.getHours());
  const start = toWeekIndex(startDay, startHour);
  const end = toWeekIndex(endDay, endHour);

  if (start < end) return idx >= start && idx < end;
  if (start > end) return idx >= start || idx < end;
  return idx === start;
}

function levelFor(xp: number, xpPerLevel: number): number {
  return 1 + Math.floor(xp / xpPerLevel);
}

async function tickLeveling(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const settings = await prisma.levelingSettings.upsert({
    where: { guildId: message.guild.id },
    create: { guildId: message.guild.id },
    update: {},
  });

  if (!settings.enabled) return;

  let factor = 1;

  if (settings.weeklyBoostEnabled && isInWeekWindow(new Date(), settings.weeklyBoostStartDay, settings.weeklyBoostStartHour, settings.weeklyBoostEndDay, settings.weeklyBoostEndHour)) {
    factor *= WEEKLY_BOOST_FACTOR;
  }

  const multipliers = await prisma.levelingMultipliers.findMany({ where: { guildId: message.guild.id } });
  const now = new Date();
  for (const multiplier of multipliers) {
    if (isInMonthDayWindow(now, multiplier.startMonth, multiplier.startDay, multiplier.endMonth, multiplier.endDay)) {
      factor *= multiplier.multiplier;
    }
  }

  const gain = Math.round(settings.xpPerMessage * factor);
  if (gain <= 0) return;

  const clampedGain = Math.min(gain, 1000000);

  const previous = await prisma.levelingStats.upsert({
    where: {
      guildId_userId: {
        guildId: message.guild.id,
        userId: message.author.id,
      },
    },
    create: {
      guildId: message.guild.id,
      userId: message.author.id,
      xp: 0,
    },
    update: {},
  });

  const newXp = previous.xp + clampedGain;

  await prisma.levelingStats.update({
    where: {
      guildId_userId: {
        guildId: message.guild.id,
        userId: message.author.id,
      },
    },
    data: { xp: newXp },
  });

  const oldLevel = levelFor(previous.xp, settings.xpPerLevel);
  const newLevel = levelFor(newXp, settings.xpPerLevel);

  if (newLevel <= oldLevel) return;

  const rewards = await prisma.levelingRoleRewards.findMany({
    where: {
      guildId: message.guild.id,
      level: { gte: oldLevel + 1, lte: newLevel },
    },
  });

  if (rewards.length > 0) {
    const member = message.guild.members.find((m) => m.id === message.author.id);
    if (member) {
      for (const reward of rewards) {
        if (member.roles.has(reward.roleId)) continue;
        if (!message.guild.roles.get(reward.roleId)) continue;
        try {
          await member.roles.add(reward.roleId);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  await sendToBotChannelOrReply(message, `You reached level ${newLevel}!`);
}

export function setup(client: Client) {
  client.on("messageCreate", tickLeveling);
}

export function checkCommand(prefix: string, message: Message): boolean {
  return message.content === `${prefix}rank` || message.content === `${prefix}level` || message.content === `${prefix}leaderboard`;
}

export async function runCommand(prefix: string, message: Message): Promise<MessageSendOptions | undefined> {
  if (!message.guild) return;

  const settings = await prisma.levelingSettings.upsert({
    where: { guildId: message.guild.id },
    create: { guildId: message.guild.id },
    update: {},
  });

  if (message.content === `${prefix}rank` || message.content === `${prefix}level`) {
    const stats = await prisma.levelingStats.upsert({
      where: {
        guildId_userId: {
          guildId: message.guild.id,
          userId: message.author.id,
        },
      },
      create: {
        guildId: message.guild.id,
        userId: message.author.id,
        xp: 0,
      },
      update: {},
    });

    const level = levelFor(stats.xp, settings.xpPerLevel);
    const xpIntoLevel = stats.xp - (level - 1) * settings.xpPerLevel;
    const xpNeeded = settings.xpPerLevel - xpIntoLevel;

    return {
      content: `You are level ${level} with ${stats.xp} XP. ${xpNeeded} XP until level ${level + 1}.`,
    };
  }

  if (message.content === `${prefix}leaderboard`) {
    const top = await prisma.levelingStats.findMany({
      where: { guildId: message.guild.id },
      orderBy: { xp: "desc" },
      take: 10,
    });

    if (top.length === 0) {
      return { content: "No members have leveled up yet." };
    }

    const lines = top.map((stats, index) => {
      const member = message.guild?.members.find((m) => m.id === stats.userId);
      const name = member?.user.username ?? "Unknown user";
      const level = levelFor(stats.xp, settings.xpPerLevel);
      return `${index + 1}. ${name} - Level ${level} (${stats.xp} XP)`;
    });

    return { content: lines.join("\n") };
  }
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (!url.pathname.startsWith("/api/leveling")) return;

  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response("Unauthorized", { status: 401 });
  const guild = client.guilds.get(guildId);
  if (!guild) return new Response("Guild not found", { status: 404 });

  if (url.pathname === "/api/leveling-settings") {
    if (req.method === "GET") {
      const settings = await prisma.levelingSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      });

      return new Response(JSON.stringify(settings), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const validator = z.object({
        enabled: z.boolean(),
        xpPerMessage: z.number().int().min(1).max(1000),
        xpPerLevel: z.number().int().min(1).max(1000000),
        weeklyBoostEnabled: z.boolean(),
        weeklyBoostStartDay: z.number().int().min(0).max(6),
        weeklyBoostStartHour: z.number().int().min(0).max(23),
        weeklyBoostEndDay: z.number().int().min(0).max(6),
        weeklyBoostEndHour: z.number().int().min(0).max(23),
      }).refine((data) => toWeekIndex(data.weeklyBoostStartDay, data.weeklyBoostStartHour) !== toWeekIndex(data.weeklyBoostEndDay, data.weeklyBoostEndHour), {
        message: "Weekly boost start and end must be different",
      });

      const body = validator.safeParse(await req.json());
      if (!body.success) {
        console.log(body.error);
        return new Response("Invalid request", { status: 400 });
      }

      await prisma.levelingSettings.upsert({
        where: { guildId },
        update: body.data,
        create: { ...body.data, guildId },
      });

      return new Response("OK", { status: 200 });
    }
  }

  if (url.pathname === "/api/leveling-rewards") {
    if (req.method === "GET") {
      const rewards = await prisma.levelingRoleRewards.findMany({ where: { guildId } });

      return new Response(
        JSON.stringify(rewards.map((reward) => ({
          id: reward.id,
          level: reward.level,
          roleId: reward.roleId,
          roleName: guild.roles.get(reward.roleId)?.name ?? "Unknown role",
        }))),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const validator = z.object({
        level: z.number().int().min(1).max(1000000),
        roleId: z.string().min(1),
      });

      const body = validator.safeParse(await req.json());
      if (!body.success) {
        return new Response("Invalid request", { status: 400 });
      }

      if (!guild.roles.get(body.data.roleId)) return new Response("Role not found", { status: 404 });

      await prisma.levelingRoleRewards.upsert({
        where: {
          guildId_level: {
            guildId,
            level: body.data.level,
          },
        },
        update: { roleId: body.data.roleId },
        create: { guildId, level: body.data.level, roleId: body.data.roleId },
      });

      return new Response("OK", { status: 200 });
    }

    if (req.method === "DELETE") {
      const validator = z.object({
        id: z.number().int(),
      });

      const body = validator.safeParse(await req.json());
      if (!body.success) {
        return new Response("Invalid request", { status: 400 });
      }

      const result = await prisma.levelingRoleRewards.deleteMany({ where: { id: body.data.id, guildId } });
      if (result.count === 0) return new Response("Not found", { status: 404 });

      return new Response("OK", { status: 200 });
    }
  }

  if (url.pathname === "/api/leveling-multipliers") {
    if (req.method === "GET") {
      const multipliers = await prisma.levelingMultipliers.findMany({ where: { guildId } });

      return new Response(
        JSON.stringify(multipliers),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const validator = z.object({
        multiplier: z.number().min(0.1).max(100),
        startMonth: z.number().int().min(1).max(12),
        startDay: z.number().int().min(1).max(31),
        endMonth: z.number().int().min(1).max(12),
        endDay: z.number().int().min(1).max(31),
      });

      const body = validator.safeParse(await req.json());
      if (!body.success) {
        return new Response("Invalid request", { status: 400 });
      }

      const created = await prisma.levelingMultipliers.create({
        data: { guildId, ...body.data },
      });

      return new Response(JSON.stringify(created), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "DELETE") {
      const validator = z.object({
        id: z.number().int(),
      });

      const body = validator.safeParse(await req.json());
      if (!body.success) {
        return new Response("Invalid request", { status: 400 });
      }

      const result = await prisma.levelingMultipliers.deleteMany({ where: { id: body.data.id, guildId } });
      if (result.count === 0) return new Response("Not found", { status: 404 });

      return new Response("OK", { status: 200 });
    }
  }
}
