import { Message } from "@fluxerjs/core";
import { prisma } from "./database.ts";

export async function performCommandMessageActions(msg: Message): Promise<"cancel" | "noReply" | "ok"> {
  if (!msg.guild) return "ok";

  const serverSettings = await prisma.serverSettings.upsert({
    where: {
      guildId: msg.guild.id,
    },
    create: { guildId: msg.guild.id },
    update: {},
  });

  if (serverSettings.onlyAllowCommandsInBotChannel) {
    await msg.reply(`Please use <#${serverSettings.botChannel}> for commands`);
    return "cancel";
  }

  if (serverSettings.deleteCommandMessage) {
    await msg.delete();
    return "noReply";
  }

  return "ok";
}
