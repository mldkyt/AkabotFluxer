import { Client, Message } from "@fluxerjs/core";
import { performCommandMessageActions } from "../src/commands.ts";
import { prisma } from "../src/database.ts";

async function sendHelp(message: Message) {
  if (!message.channel) return;
  if (!message.guild) return;
  if (message.author.bot) return;

  const serverSettings = await prisma.serverSettings.upsert({
    where: {
      guildId: message.guild.id,
    },
    create: { guildId: message.guild.id },
    update: {},
  });

  if (message.content !== `${serverSettings.prefix}help`) return;

  const replyState = await performCommandMessageActions(serverSettings, message);
  if (replyState === "cancel") return;

  const content = `# Akabot Help

- !settings - Admin only, gives you a token for the settings web UI
- !help - this message`;

  if (replyState === "noReply") {
    await message.channel.send(`<@${message.author.id}>
${content}`);
    return;
  }

  await message.reply(content);
}

export function setup(client: Client) {
  client.on("messageCreate", sendHelp);
}

export function webRequest(client: Client, req: Request, url: URL) {
}
