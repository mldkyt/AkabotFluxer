import { Client, Message } from "@fluxerjs/core";
import { performCommandMessageActions } from "../src/commands.ts";

async function sendHelp(message: Message) {
  if (!message.channel) return;

  const replyState = await performCommandMessageActions(message);
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
