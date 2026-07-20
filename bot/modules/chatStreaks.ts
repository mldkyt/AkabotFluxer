import { Client, GuildMember, Message } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { sendToBotChannelOrReply } from "../src/serverSettings.ts";

async function tickChatStreak(member: GuildMember): Promise<{ state: "stayed" } | { state: "updated"; newDays: number } | { state: "lost"; lastStreak: number }> {
  let chatStreak = await prisma.chatStreaks.upsert({
    where: {
      guildId_userId: {
        guildId: member.guild.id,
        userId: member.id,
      },
    },
    create: {
      guildId: member.guild.id,
      userId: member.id,
      lastMessageDate: new Date(),
      streakStartDate: new Date(),
    },
    update: {},
  });

  const days = Math.floor((chatStreak.lastMessageDate.getTime() - chatStreak.streakStartDate.getTime()) / (3600 * 24 * 1000));

  // Check expiry
  if (new Date().getTime() - chatStreak.lastMessageDate.getTime() > 3600 * 24 * 1000) {
    await prisma.chatStreaks.update({
      where: {
        guildId_userId: {
          guildId: member.guild.id,
          userId: member.id,
        },
      },
      data: {
        lastMessageDate: new Date(),
        streakStartDate: new Date(),
      },
    });

    return { state: "lost", lastStreak: days };
  }

  // Update streak
  chatStreak = await prisma.chatStreaks.update({
    where: {
      guildId_userId: {
        guildId: member.guild.id,
        userId: member.id,
      },
    },
    data: {
      lastMessageDate: new Date(),
    },
  });

  const newDays = Math.floor((chatStreak.lastMessageDate.getTime() - chatStreak.streakStartDate.getTime()) / (3600 * 24 * 1000));

  if (newDays !== days) {
    return { state: "updated", newDays };
  }
  return { state: "stayed" };
}

async function onMessageSend(message: Message) {
  if (message.author.bot) return;

  const member = message.guild?.members.find((member) => member.id === message.author.id);
  if (!member) return;

  const result = await tickChatStreak(member);

  if (result.state === "lost") {
    await sendToBotChannelOrReply(message, `Awww :( You lost your ${result.lastStreak} day streak.`);
  } else if (result.state === "updated") {
    await sendToBotChannelOrReply(message, `${result.newDays} day streak! Keep it up :3`);
  }
}

export function setup(client: Client) {
  client.on("messageCreate", onMessageSend);
}
