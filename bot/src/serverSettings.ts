import { Guild, GuildChannel, Message, MessageSendOptions, ReplyOptions } from "@fluxerjs/core";
import { prisma } from "./database.ts";

export async function getBotChannel(guild: Guild): Promise<GuildChannel | null> {
  const serverSettings = await prisma.serverSettings.upsert({
    where: {
      guildId: guild.id,
    },
    create: {
      guildId: guild.id,
    },
    update: {},
  });

  if (!serverSettings) return null;
  if (!serverSettings.botChannel) return null;

  const channel = guild.channels.find((channel) => channel.id === serverSettings.botChannel);
  if (!channel) return null;

  return channel;
}

export async function sendToBotChannelOrReply(messageToReplyTo: Message, message: string | MessageSendOptions) {
  console.log("sendToBotChannelOrReply called with", message);
  if (!messageToReplyTo.guild) return;
  const botChannel = await getBotChannel(messageToReplyTo.guild);

  if (!botChannel) {
    await messageToReplyTo.reply(message);
    return;
  }

  if (typeof message === "string") {
    message = `<@${messageToReplyTo.author.id}> ${message}`;
  } else {
    if (message.content) {
      message.content = `<@${messageToReplyTo.author.id}> ${message.content}`;
    } else {
      message.content = `<@${messageToReplyTo.author.id}>`;
    }
  }

  await botChannel.send(message);
}
