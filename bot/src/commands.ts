import { Message } from "@fluxerjs/core";

export async function performCommandMessageActions(settings: {
  deleteCommandMessage: boolean;
  botChannel: string;
  onlyAllowCommandsInBotChannel: boolean;
}, msg: Message): Promise<"cancel" | "noReply" | "ok"> {
  if (!msg.guild) return "ok";

  if (settings.botChannel !== msg.channelId && settings.onlyAllowCommandsInBotChannel) {
    await msg.reply(`Please use <#${settings.botChannel}> for commands`);
    return "cancel";
  }

  if (settings.deleteCommandMessage) {
    await msg.delete();
    return "noReply";
  }

  return "ok";
}
