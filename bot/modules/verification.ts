// export function checkCommand(prefix: string, message: Message): boolean {
//   return false;
// }

import { Client, GuildMember, Message, PermissionFlags, TextChannel } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

// export async function runCommand(prefix: string, message: Message): Promise<MessageSendOptions | undefined> {
// }

async function giveOutVerifyCode(member: GuildMember) {
  const verificationSettings = await prisma.verificationSettings.upsert({
    where: { guildId: member.guild.id },
    update: {},
    create: { guildId: member.guild.id },
  });

  if (!verificationSettings.enabled) return;

  const channel = member.guild.channels.find((ch) => ch.id === verificationSettings.channelId);
  if (!channel) return;

  const token = Math.floor(Math.random() * 888888 + 100000).toString();

  const message = await channel.send(`<@${member.id}> Verification: Please send the following number in this channel: \`${token}\` in order to verify :3`);

  await prisma.verificationTokens.create({
    data: {
      guildId: member.guild.id,
      memberId: member.id,
      token,
      verifyMessageId: message.id,
    },
  });
}

async function verifyMember(client: Client, msg: Message) {
  if (msg.author.bot) return;

  const verificationCode = await prisma.verificationTokens.findFirst({
    where: { memberId: msg.author.id },
  });

  if (!verificationCode) return;
  if (verificationCode.token !== msg.content) {
    await msg.reply({ content: "Invalid token! Please try again." });
  }

  const verificationSettings = await prisma.verificationSettings.upsert({
    where: { guildId: verificationCode.guildId },
    create: { guildId: verificationCode.guildId },
    update: {},
  });

  if (!verificationSettings.enabled) return;
  if (msg.channelId !== verificationSettings.channelId) return;

  const guild = client.guilds.find((g) => g.id === verificationCode.guildId);
  if (!guild) return;

  const member = guild.members.find((m) => m.id === verificationCode.memberId);
  if (!member) return;

  await member.addRole(verificationSettings.roleId);
  await msg.reply({
    content: `You have been verified!`,
  });

  await prisma.verificationTokens.delete({
    where: {
      memberId_guildId: {
        memberId: verificationCode.memberId,
        guildId: verificationCode.guildId,
      },
    },
  });
}

async function deleteVerifyCode(member: GuildMember) {
  const token = await prisma.verificationTokens.findFirst({
    where: {
      memberId: member.id,
    },
  });

  if (!token) return;

  const verifySettings = await prisma.verificationSettings.upsert({
    where: { guildId: member.guild.id },
    create: { guildId: member.guild.id },
    update: {},
  });

  const channel = member.guild.channels.find((ch) => ch.id === verifySettings.channelId) as TextChannel;
  if (!channel) return;

  const message = await channel.messages.fetch(token.verifyMessageId);
  await message.delete();

  await prisma.verificationTokens.delete({
    where: {
      memberId_guildId: {
        ...token,
      },
    },
  });
}

export function setup(client: Client) {
  client.on("messageCreate", async (msg: Message) => {
    await verifyMember(client, msg);
  });
  client.on("guildMemberAdd", giveOutVerifyCode);
  client.on("guildMemberRemove", deleteVerifyCode);
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname === "/api/verification") {
    const guildId = await authorizeRequest(req);
    if (!guildId) return new Response(`Unauthorized`, { status: 403 });

    const guild = client.guilds.find((g) => g.id === guildId);
    if (!guild) return new Response(`Guild not found`, { status: 400 });

    if (req.method === "GET") {
      const verificationSettings = await prisma.verificationSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      });

      return new Response(
        JSON.stringify(verificationSettings),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const validation = z.object({
        enabled: z.boolean(),
        roleId: z.string().nonempty(),
        channelId: z.string().nonempty(),
      });

      const json = await req.json();
      const validated = validation.safeParse(json);

      if (!validated.success) {
        return new Response(`Invalid payload`, { status: 400 });
      }

      const channel = guild.channels.filter((ch) => ch.type === 0).find((ch) => ch.id === validated.data.channelId);
      if (!channel) return new Response(`Channel was not found`, { status: 400 });

      const member = guild.members.find((m) => m.id === client.user?.id);
      if (!member) return new Response(`Couldn't find myself (this error should not happen)`, { status: 400 });

      const permissionsInChannel = member.permissionsIn(channel);
      if (!permissionsInChannel.has(PermissionFlags.SendMessages)) return new Response(`Missing Send Messages permission in verification channel`, { status: 400 });

      const role = guild.roles.find((r) => r.id === validated.data.roleId);
      if (!role) return new Response(`Role was not found`, { status: 400 });

      await prisma.verificationSettings.upsert({
        where: { guildId },
        create: { guildId, ...validated.data },
        update: validated.data,
      });

      return new Response(`OK`, { status: 200 });
    }
  }
}
