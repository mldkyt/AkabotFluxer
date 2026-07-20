import { Client, Message, MessageSendOptions } from "@fluxerjs/core";
import { sendToBotChannelOrReply } from "../src/serverSettings.ts";
import { prisma } from "../src/database.ts";

export function checkCommand(prefix: string, message: Message): boolean {
  return message.content === `${prefix}help`;
}

export async function runCommand(prefix: string, message: Message): Promise<MessageSendOptions> {
  const content = `# Akabot Help

- ${prefix}settings - Admin only, gives you a token for the settings web UI
- ${prefix}help - this message`;

  return { content };
}

export function setup(client: Client) {
  client.on("messageCreate", async (msg) => {
    if (!client.user) return;
    if (!msg.guild) return;
    if (msg.author.bot) return;
    if (msg.content !== `<@${client.user.id}>`) return;

    const serverSettings = await prisma.serverSettings.upsert({
      where: { guildId: msg.guild.id },
      create: { guildId: msg.guild.id },
      update: {},
    });

    await sendToBotChannelOrReply(msg, `The prefix for all commands for this bot is ${serverSettings.prefix}, e.g. ${serverSettings.prefix}help.`);
  });
}
