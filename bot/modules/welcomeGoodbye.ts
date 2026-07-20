import { Client, EmbedBuilder, GuildChannel, GuildMember, TextChannel } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import z from "zod";
import { authorizeRequest } from "../src/web.ts";

type WelcomeSettings = {
  guildId: string;
  welcomeEnabled: boolean;
  welcomeChannel: string;
  welcomeType: string;
  welcomeTitle: string;
  welcomeContent: string;
  welcomeFirstGracePeriod: number;
  welcomeSecondGracePeriod: number;
  goodbyeEnabled: boolean;
  goodbyeChannel: string;
  goodbyeType: string;
  goodbyeTitle: string;
  goodbyeContent: string;
};

async function sendWelcomeMessage(
  welcomeSettings: WelcomeSettings,
  channel: GuildChannel,
  member: GuildMember,
) {
  let formattedTitle = welcomeSettings.welcomeTitle;
  formattedTitle = formattedTitle.replaceAll("{mention}", `<@${member.id}>`);
  formattedTitle = formattedTitle.replaceAll("{name}", member.displayName);
  formattedTitle = formattedTitle.replaceAll("{server}", member.guild.name);

  let formattedContent = welcomeSettings.welcomeContent;
  formattedContent = formattedContent.replaceAll("{mention}", `<@${member.id}>`);
  formattedContent = formattedContent.replaceAll("{name}", member.displayName);
  formattedContent = formattedContent.replaceAll("{server}", member.guild.name);

  let message: {
    content?: string;
    embeds?: EmbedBuilder[];
  } = {
    content: `<@${member.id}`,
  };

  switch (welcomeSettings.welcomeType) {
    case "embed":
      message = {
        content: `<@${member.id}>`,
        embeds: [
          new EmbedBuilder()
            .setTitle(formattedTitle)
            .setDescription(formattedContent)
            .setColor(0x68e86b),
        ],
      };
      break;
    case "text":
      message.content = `<@${member.id}> ${formattedContent}`;
      break;
    default:
      return;
  }

  const messageSent = await channel.send(message);

  if (welcomeSettings.welcomeSecondGracePeriod > 0) {
    await prisma.welcomeSecondGracePeriod.create({
      data: {
        guildId: member.guild.id,
        messageId: messageSent.id,
        userId: member.id,
        expiresAt: new Date(new Date().getTime() + welcomeSettings.welcomeSecondGracePeriod * 1000),
      },
    });
  }
}

async function handleMemberAdd(member: GuildMember) {
  const welcomeSettings = await prisma.welcomeGoodbyeSettings.findFirst({
    where: {
      guildId: member.guild.id,
    },
  });

  if (!welcomeSettings) return;
  if (!welcomeSettings.welcomeEnabled) return;

  if (welcomeSettings.welcomeFirstGracePeriod === 0) {
    const channel = member.guild.channels.find((channel) => channel.id === welcomeSettings.welcomeChannel);
    if (!channel) return;

    await sendWelcomeMessage(welcomeSettings, channel, member);
  } else {
    await prisma.welcomeFirstGracePeriod.create({
      data: {
        guildId: member.guild.id,
        userId: member.id,
        expiresAt: new Date(
          new Date().getTime() + welcomeSettings.welcomeFirstGracePeriod * 1000,
        ),
      },
    });
  }
}

async function handleGracePeriods(client: Client) {
  const firstGracePeriods = await prisma.welcomeFirstGracePeriod.findMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  for (const gracePeriod of firstGracePeriods) {
    try {
      const welcomeSettings = await prisma.welcomeGoodbyeSettings.findFirst({
        where: {
          guildId: gracePeriod.guildId,
        },
      });
      if (!welcomeSettings) continue;
      if (!welcomeSettings.welcomeEnabled) continue;

      const guild = client.guilds.find((guild) => guild.id === gracePeriod.guildId);
      if (!guild) continue;

      const channel = guild.channels.find((channel) => channel.id === welcomeSettings.welcomeChannel);
      if (!channel) continue;

      const member = guild.members.find((member) => member.id === gracePeriod.userId) || await guild.fetchMember(gracePeriod.userId);
      if (!member) continue;

      await sendWelcomeMessage(welcomeSettings, channel, member);
    } catch (e) {
      console.error(e);
      continue;
    }
  }

  await prisma.welcomeFirstGracePeriod.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  await prisma.welcomeSecondGracePeriod.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  setTimeout(async () => {
    await handleGracePeriods(client);
  }, 1000);
}

async function handleMemberRemove(member: GuildMember) {
  const welcomeSettings = await prisma.welcomeGoodbyeSettings.upsert({
    where: {
      guildId: member.guild.id,
    },
    create: { guildId: member.guild.id },
    update: {},
  });

  if (!welcomeSettings.goodbyeEnabled) return;

  const secondGracePeriod = await prisma.welcomeSecondGracePeriod.findFirst({
    where: {
      userId: member.id,
    },
  });

  if (secondGracePeriod) {
    const welcomeChannel = member.guild.channels.find((channel) => channel.id === welcomeSettings.welcomeChannel) as TextChannel | undefined;
    if (!welcomeChannel) return;

    const message = await welcomeChannel.messages.fetch(secondGracePeriod.messageId);

    await message.delete();

    await prisma.welcomeSecondGracePeriod.deleteMany({
      where: {
        userId: member.id,
      },
    });

    return;
  }

  const firstGracePeriod = await prisma.welcomeFirstGracePeriod.findFirst({
    where: {
      userId: member.id,
    },
  });

  if (firstGracePeriod) {
    await prisma.welcomeFirstGracePeriod.deleteMany({
      where: {
        userId: member.id,
      },
    });
    return;
  }

  const goodbyeChannel = member.guild.channels.find((channel) => channel.id === welcomeSettings.goodbyeChannel);
  if (!goodbyeChannel) return;

  let formattedTitle = welcomeSettings.goodbyeTitle;
  formattedTitle = formattedTitle.replaceAll("{mention}", `<@${member.id}>`);
  formattedTitle = formattedTitle.replaceAll("{name}", member.displayName);
  formattedTitle = formattedTitle.replaceAll("{server}", member.guild.name);

  let formattedContent = welcomeSettings.goodbyeContent;
  formattedContent = formattedContent.replaceAll("{mention}", `<@${member.id}>`);
  formattedContent = formattedContent.replaceAll("{name}", member.displayName);
  formattedContent = formattedContent.replaceAll("{server}", member.guild.name);

  let message: {
    content?: string;
    embeds?: EmbedBuilder[];
  } = {
    content: `<@${member.id}`,
  };

  switch (welcomeSettings.goodbyeType) {
    case "embed":
      message = {
        content: `<@${member.id}>`,
        embeds: [
          new EmbedBuilder()
            .setTitle(formattedTitle)
            .setDescription(formattedContent)
            .setColor(0xdb3c30),
        ],
      };
      break;
    case "text":
      message.content = `<@${member.id}> ${formattedContent}`;
      break;
    default:
      return;
  }

  await goodbyeChannel.send(message);
}

export function setup(client: Client) {
  client.on("guildMemberAdd", handleMemberAdd);
  client.on("guildMemberRemove", handleMemberRemove);

  setTimeout(async () => {
    await handleGracePeriods(client);
  }, 1000);
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname !== "/api/welcome-goodbye") {
    return null;
  }
  const guildId = await authorizeRequest(req);
  if (!guildId) {
    return new Response(`401 Unauthorized`, { status: 401 });
  }

  if (req.method === "GET") {
    const welcomeGoodbyeSettings = await prisma.welcomeGoodbyeSettings.upsert({
      where: {
        guildId,
      },
      update: {},
      create: { guildId },
    });

    return new Response(JSON.stringify(welcomeGoodbyeSettings), { status: 200, headers: { "Content-Type": "application/json" } });
  } else if (req.method === "POST") {
    const validator = z.object({
      welcomeEnabled: z.boolean(),
      welcomeChannel: z.string(),
      welcomeType: z.union([
        z.literal("text"),
        z.literal("embed"),
      ]),
      welcomeTitle: z.string().min(1).max(50),
      welcomeContent: z.string().min(1).max(1000),
      welcomeFirstGracePeriod: z.int().min(0).max(60),
      welcomeSecondGracePeriod: z.int().min(0).max(120),
      goodbyeEnabled: z.boolean(),
      goodbyeChannel: z.string(),
      goodbyeType: z.union([
        z.literal("text"),
        z.literal("embed"),
      ]),
      goodbyeTitle: z.string().min(1).max(50),
      goodbyeContent: z.string().min(1).max(1000),
    });

    const parsed = validator.safeParse(await req.json());

    if (!parsed.success) {
      console.log(parsed.error);
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
    }

    const guild = client.guilds.find((guild) => guild.id === guildId);
    if (!guild) return new Response("Guild not found", { status: 404 });

    const welcomeChannel = guild.channels.find((channel) => channel.id === parsed.data.welcomeChannel);
    if (!welcomeChannel) return new Response("Welcome channel not found", { status: 404 });

    const goodbyeChannel = guild.channels.find((channel) => channel.id === parsed.data.goodbyeChannel);
    if (!goodbyeChannel) return new Response("Goodbye channel not found", { status: 404 });

    await prisma.welcomeGoodbyeSettings.upsert({
      where: {
        guildId,
      },
      update: parsed.data,
      create: { ...parsed.data, guildId },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } else {
    return new Response(`405 Method Not Allowed`, { status: 405 });
  }
}
