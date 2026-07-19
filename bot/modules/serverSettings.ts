import { Client } from "@fluxerjs/core";
import { authorizeRequest } from "../src/web.ts";
import { prisma } from "../src/database.ts";
import z from "zod";

export function setup(client: Client) {
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname !== "/api/server-settings") return;

  const guildId = await authorizeRequest(req);
  if (!guildId) return new Response("Unauthorized", { status: 401 });
  const guild = client.guilds.get(guildId);
  if (!guild) return new Response("Guild not found", { status: 404 });

  if (req.method === "GET") {
    const serverSettings = await prisma.serverSettings.findUnique({
      where: {
        guildId: guildId,
      },
    });

    return new Response(JSON.stringify(serverSettings), { status: 200 });
  } else if (req.method === "POST") {
    const serverSettingsValidator = z.object({
      botChannel: z.string().nonempty(),
      deleteCommandMessage: z.boolean(),
      onlyAllowCommandsInBotChannel: z.boolean(),
      prefix: z.string().min(1).max(5),
    });

    const body = await req.json();
    const result = serverSettingsValidator.safeParse(body);

    if (!result.success) {
      console.log(result.error);
      return new Response("Invalid request", { status: 400 });
    }

    const botChannel = guild.channels.filter((channel) => channel.type === 0).find((channel) => channel.id === result.data.botChannel);
    if (!botChannel) {
      return new Response("Bot channel was not found", { status: 400 });
    }

    await prisma.serverSettings.upsert({
      where: {
        guildId,
      },
      update: result.data,
      create: { ...result.data, guildId },
    });

    return new Response(`200 OK`, { status: 200 });
  }
}
