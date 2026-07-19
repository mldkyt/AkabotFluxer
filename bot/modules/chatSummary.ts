import { Client, Message, TextChannel } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

async function tickStandardChatSummary(message: Message) {
  if (!message.guild) return;

  const chatSummary = await prisma.chatSummary.upsert({
    where: {
      guildId_channelId: {
        guildId: message.guild.id,
        channelId: message.channelId,
      },
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
    create: {
      channelId: message.channelId,
      guildId: message.guild.id,
      messageCount: 1,
    },
  });

  await prisma.chatSummaryMember.upsert({
    where: {
      memberId_chatSummaryId: {
        memberId: message.author.id,
        chatSummaryId: chatSummary.id,
      },
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
    create: {
      memberId: message.author.id,
      chatSummaryId: chatSummary.id,
      messageCount: 1,
    },
  });
}

async function tickMonthlyChatSummary(message: Message) {
  if (!message.guild) return;

  const chatSummary = await prisma.monthlyChatSummary.upsert({
    where: {
      channelId_guildId: {
        guildId: message.guild.id,
        channelId: message.channelId,
      },
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
    create: {
      channelId: message.channelId,
      guildId: message.guild.id,
      messageCount: 1,
    },
  });

  await prisma.monthlyChatSummaryMember.upsert({
    where: {
      chatSummaryId_memberId: {
        memberId: message.author.id,
        chatSummaryId: chatSummary.id,
      },
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
    create: {
      memberId: message.author.id,
      chatSummaryId: chatSummary.id,
      messageCount: 1,
    },
  });
}

async function tickYearlyChatSummary(message: Message) {
  if (!message.guild) return;

  const chatSummary = await prisma.yearlyChatSummary.upsert({
    where: {
      channelId_guildId: {
        guildId: message.guild.id,
        channelId: message.channelId,
      },
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
    create: {
      channelId: message.channelId,
      guildId: message.guild.id,
      messageCount: 1,
    },
  });

  await prisma.yearlyChatSummaryMember.upsert({
    where: {
      chatSummaryId_memberId: {
        memberId: message.author.id,
        chatSummaryId: chatSummary.id,
      },
    },
    update: {
      messageCount: {
        increment: 1,
      },
    },
    create: {
      memberId: message.author.id,
      chatSummaryId: chatSummary.id,
      messageCount: 1,
    },
  });
}

async function addChatSummary(message: Message) {
  if (!message.guild) return;
  const chatSummaryRec = await prisma.chatSummaryChannels.findFirst({
    where: {
      channelId: message.channelId,
    },
  });

  if (!chatSummaryRec) return;

  const chatSummarySettings = await prisma.chatSummarySettings.upsert({
    where: {
      guildId: message.guild.id,
    },
    create: { guildId: message.guild.id },
    update: {},
  });

  if (message.author.bot && !chatSummarySettings.countBots) return;

  await tickStandardChatSummary(message);
  await tickMonthlyChatSummary(message);
  await tickYearlyChatSummary(message);
}

async function summarizeMidnight(client: Client) {
  const now = new Date();
  console.log(now);
  const chatSummaries = await prisma.chatSummary.findMany({
    include: {
      members: true,
    },
  });

  for (let chatSummary of chatSummaries) {
    try {
      let keyword = "";

      const chatSummarySettings = await prisma.chatSummarySettings.upsert({
        where: {
          guildId: chatSummary.guildId,
        },
        update: {},
        create: { guildId: chatSummary.guildId },
      });

      if (chatSummarySettings.enableExtraSummaries && now.getDate() === 1 && now.getMonth() === 0) {
        const yearlyChatSummary = await prisma.yearlyChatSummary.findUnique({
          where: {
            channelId_guildId: {
              channelId: chatSummary.channelId,
              guildId: chatSummary.guildId,
            },
          },
          include: {
            members: true,
          },
        });
        if (yearlyChatSummary) {
          chatSummary = yearlyChatSummary;
          keyword = "Yearly ";
        }
      } else if (chatSummarySettings.enableExtraSummaries && now.getDate() === 1) {
        const monthlyChatSummary = await prisma.monthlyChatSummary.findUnique({
          where: {
            channelId_guildId: {
              channelId: chatSummary.channelId,
              guildId: chatSummary.guildId,
            },
          },
          include: {
            members: true,
          },
        });
        if (monthlyChatSummary) {
          chatSummary = monthlyChatSummary;
          keyword = "Monthly ";
        }
      }

      const guild = client.guilds.find((guild) => guild.id === chatSummary.guildId);
      if (!guild) continue;

      const channel = client.channels.find((channel) => channel.id === chatSummary.channelId) as TextChannel;
      if (!channel) continue;

      const rows = keyword.length > 0 ? chatSummarySettings.extraSummariesRows : chatSummarySettings.summariesRows;

      let summaryString = `# ${keyword}Chat Summary for ${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}: ${chatSummary.messageCount} messages\n`;

      chatSummary.members.sort((a, b) => b.messageCount - a.messageCount);

      for (const memberIndex in chatSummary.members) {
        const memberData = chatSummary.members[memberIndex];
        const member = guild.members.find((member) => member.id === memberData.memberId);

        if (member) summaryString += `${memberIndex + 1}. ${member.displayName} at ${memberData.messageCount} messages\n`;
        else summaryString += `${memberIndex + 1}. Unknown member at ${memberData.messageCount} messages\n`;

        if (memberIndex === rows.toString()) return;
      }

      summaryString += `\nChat summaries provided by Akabot :3`;

      await channel.send(summaryString);

      await prisma.chatSummaryMember.deleteMany({
        where: {
          channel: {
            channelId: chatSummary.channelId,
            guildId: chatSummary.guildId,
          },
        },
      });

      await prisma.chatSummary.deleteMany({
        where: {
          channelId: chatSummary.channelId,
          guildId: chatSummary.guildId,
        },
      });
    } catch (e) {
      console.error(e);
    }
  }
}

export function setup(client: Client) {
  client.on("messageCreate", addChatSummary);

  client.on("messageCreate", async (msg) => {
    if (!msg.guild) return;

    if (msg.content === "!summarize") {
      console.log("Summarizing midnight");
      await summarizeMidnight(client);
    }

    if (msg.content === "!addfake") {
      if (!msg.channel) return;
      const fakeMessage = await msg.channel.send("Fake message");
      for (let i = 0; i < 10; i++) await addChatSummary(fakeMessage);
      console.log("Added fake 10 messages");
    }
  });

  setInterval(() => {
    const date = new Date();
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      summarizeMidnight(client);
    }
  }, 60000);
}

export async function webRequest(client: Client, req: Request, url: URL) {
  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response("Unauthorized", { status: 403 });

  const guild = client.guilds.find((guild) => guild.id === guildId);
  if (!guild) return new Response("Guild not found", { status: 400 });

  if (url.pathname === "/api/chat-summary/channels") {
    if (req.method === "POST") {
      const data = await req.json();
      const postValidator = z.object({
        channelId: z.string().nonempty(),
      });

      const validated = postValidator.safeParse(data);

      if (!validated.success) {
        console.log(validated.error);
        return new Response("Bad request", { status: 400 });
      }

      const channel = guild.channels.find((ch) => ch.id === validated.data.channelId);
      if (!channel) return new Response("Channel not found", { status: 400 });

      await prisma.chatSummaryChannels.create({
        data: {
          guildId,
          channelId: validated.data.channelId,
        },
      });

      return new Response("Channel added", { status: 200 });
    }

    if (req.method === "DELETE") {
      const data = await req.json();
      const postValidator = z.object({
        channelId: z.string().nonempty(),
      });

      const validated = postValidator.safeParse(data);

      if (!validated.success) {
        console.log(validated.error);
        return new Response("Bad request", { status: 400 });
      }

      const result = await prisma.chatSummaryChannels.deleteMany({
        where: {
          guildId,
          channelId: validated.data.channelId,
        },
      });

      if (result.count > 0) {
        return new Response("Deleted OK", { status: 200 });
      }

      return new Response("Not found", { status: 404 });
    }
  }

  if (url.pathname === "/api/chat-summary") {
    if (req.method === "GET") {
      const chatSummarySettings = await prisma.chatSummarySettings.upsert({
        where: {
          guildId,
        },
        update: {},
        create: { guildId },
      });

      const settings = await prisma.chatSummaryChannels.findMany({
        where: {
          guildId,
        },
      });

      return new Response(
        JSON.stringify({
          ...chatSummarySettings,
          channels: settings.map((ch) => ch.channelId),
        }),
        { status: 200 },
      );
    }

    if (req.method === "POST") {
      const postValidator = z.object({
        enableExtraSummaries: z.boolean(),
        extraSummariesRows: z.int().min(3).max(10),
        summariesRows: z.int().min(3).max(10),
        countBots: z.boolean(),
      });

      const json = await req.json();
      const validatedObject = postValidator.safeParse(json);

      if (!validatedObject.success) {
        console.log(validatedObject.error);
        return new Response("Bad request", { status: 400 });
      }

      await prisma.chatSummarySettings.upsert({
        where: {
          guildId,
        },
        update: validatedObject.data,
        create: {
          guildId,
          ...validatedObject.data,
        },
      });

      return new Response("OK", { status: 200 });
    }
  }
}
