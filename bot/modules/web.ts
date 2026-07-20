import { Client, Message, MessageSendOptions, PermissionFlags } from "@fluxerjs/core";
import { setCookie } from "jsr:@std/http/cookie";
import { serveDir, serveFile } from "jsr:@std/http/file-server";
import z from "zod";
import { prisma } from "../src/database.ts";
import { authorizeRequest, generateToken } from "../src/web.ts";

export function checkCommand(prefix: string, message: Message): boolean {
  return message.content === `${prefix}settings`;
}

export async function runCommand(message: Message): Promise<MessageSendOptions | undefined> {
  if (!message.guild) return;

  // Permission check
  const member = await message.guild.fetchMember(message.author.id);
  if (!member.permissions.has(PermissionFlags.ManageGuild)) {
    return { content: "You do not have permission to use this command." };
  }

  const token = await generateToken(message.guild.id);

  await message.author.send({
    content: `Your token for the web UI is ${token}`,
  });
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname === "/api/authorize" && req.method === "POST") {
    const body = await req.json();
    console.log(body);
    const authorizeSchema = z.object({
      token: z.string().nonempty(),
    });

    const safeBody = authorizeSchema.safeParse(body);
    if (!safeBody.success) {
      console.log(safeBody.error.issues);
      return new Response("Invalid request", { status: 400 });
    }

    const webToken = await prisma.webTokens.findFirst({
      where: { token: safeBody.data.token },
    });
    console.log(webToken);
    if (!webToken) return new Response("Invalid token", { status: 401 });

    const headers = new Headers({
      "Content-Type": "application/json",
    });

    setCookie(headers, {
      name: "token",
      value: webToken.token,
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    return new Response(`204 No Content, Authorized`, { headers, status: 200 });
  }

  if (url.pathname === "/api/roles") {
    const guildId = await authorizeRequest(req);
    if (!guildId) return new Response("Unauthorized", { status: 401 });
    const guild = client.guilds.get(guildId);
    if (!guild) return new Response("Guild not found", { status: 404 });

    const roles = guild.roles.map((role) => ({
      name: role.name,
      id: role.id,
    }));

    roles.reverse();

    return new Response(
      JSON.stringify(roles),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  if (url.pathname === "/api/text-channels") {
    const guildId = await authorizeRequest(req);
    if (!guildId) return new Response("Unauthorized", { status: 401 });
    const guild = client.guilds.get(guildId);
    if (!guild) return new Response("Guild not found", { status: 404 });

    const channels = guild.channels.filter((channel) => channel.type === 0).map((channel) => ({
      id: channel.id,
      name: channel.name,
    }));

    channels.reverse();

    return new Response(
      JSON.stringify(channels),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  if (url.pathname === "/") {
    return serveFile(req, "dist/index.html");
  }

  if (url.pathname === "/favicon.svg") {
    return serveFile(req, "dist/favicon.svg");
  }

  if (url.pathname === "/icons.svg") {
    return serveFile(req, "dist/icons.svg");
  }

  if (url.pathname.startsWith("/assets")) {
    return serveDir(req, {
      fsRoot: "dist/assets",
      urlRoot: "assets",
    });
  }
}
