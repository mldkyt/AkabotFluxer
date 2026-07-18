import { Client, Message, PermissionFlags } from "@fluxerjs/core";
import { authorizeRequest, generateToken } from "../src/web.ts";
import z from "zod";
import { prisma } from "../src/database.ts";
import { setCookie } from "jsr:@std/http/cookie";

export function setup(client: Client) {
  client.on("messageCreate", async (msg: Message) => {
    if (!msg.guild) return;

    if (msg.content === "!settings") {
      // Permission check
      const member = await msg.guild.fetchMember(msg.author.id);
      if (!member.permissions.has(PermissionFlags.ManageGuild)) {
        await msg.reply("You do not have permission to use this command.");
      }

      const token = await generateToken(msg.guild.id);

      await msg.author.send({
        content: `Your token for the web UI is ${token}`,
      });
    }
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
}
