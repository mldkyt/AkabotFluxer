import { Client, Message } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import { z } from "zod";

export function setup(client: Client) {
  client.on("messageCreate", async (msg: Message) => {
    if (!msg.guild) return;

    const args = msg.content.split(" ");
    if (args.length === 2 && args[0] === "!iam") {
      try {
        const iamRole = await prisma.iamRoles.findFirst({
          where: {
            guildId: msg.guild.id,
            tag: args[1],
          },
        });

        if (!iamRole) return;
        const member = await msg.guild.fetchMember(msg.author.id);
        const role = msg.guild.roles.get(iamRole.roleId);
        if (!role) return;

        if (member.roles.has(iamRole.roleId)) {
          await member.removeRole(iamRole.roleId);
          await msg.reply(`✅ Removed role ${role.name} from you!`);
          return;
        } else {
          await member.addRole(iamRole.roleId);
          await msg.reply(`✅ Added role ${role.name} to you!`);
        }
      } catch (e) {
        await msg.reply(`❌ Error adding role! ${e}`);
        console.error(e);
      }
    }
  });
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname === "/api/iam-roles") {
    const guildId = await authorizeRequest(req);
    if (!guildId) {
      return new Response(`401 Unauthorized`, { status: 401 });
    }

    console.log(`Request authorized as ${guildId}`);

    if (req.method === "GET") {
      const iamRoles = await prisma.iamRoles.findMany({
        where: {
          guildId,
        },
      });

      console.log(`Returning ${iamRoles.length} roles to client`);
      return new Response(JSON.stringify(iamRoles.map((x) => ({
        roleId: x.roleId,
        tag: x.tag,
      }))));
    } else if (req.method === "POST") {
      const postBodySchema = z.object({
        roleId: z.string().nonempty(),
        tag: z.string().nonempty(),
      });

      const body = await req.json();
      const result = postBodySchema.safeParse(body);

      if (!result.success) {
        return new Response(`400 Bad Request`, { status: 400 });
      }

      const guild = client.guilds.get(guildId);
      if (!guild) {
        return new Response(`400 Bad Request`, { status: 400 });
      }

      if (!guild.roles.has(body.roleId)) {
        return new Response(`400 Bad Request`, { status: 400 });
      }

      if (!/^[a-z0-9]$/.test(result.data.tag)) {
        return new Response(`400 Bad Request`, { status: 400 });
      }

      const iamRole = await prisma.iamRoles.create({
        data: {
          guildId,
          roleId: body.roleId,
          tag: body.tag,
        },
      });

      console.log(`Inserted !iam ${body.tag} for role ${body.roleId}`);
      return new Response(JSON.stringify({
        roleId: iamRole.roleId,
        tag: iamRole.tag,
      }));
    } else if (req.method === "PATCH") {
      const patchBodySchema = z.object({
        roleId: z.string().optional(),
        tag: z.string().optional(),
      });

      const body = await req.json();
      const result = patchBodySchema.safeParse(body);

      if (!result.success) {
        return new Response(`400 Bad Request`, { status: 400 });
      }

      await prisma.iamRoles.updateMany({
        where: {
          roleId: body.roleId,
        },
        data: {
          tag: body.tag ?? undefined,
        },
      });

      return new Response(null, { status: 204 });
    } else if (req.method === "DELETE") {
      const deleteBodySchema = z.object({
        id: z.string().nonempty(),
      });

      const body = await req.json();
      const result = deleteBodySchema.safeParse(body);

      if (!result.success) return;

      const iamRole = await prisma.iamRoles.deleteMany({
        where: {
          roleId: body.id,
          guildId,
        },
      });

      if (iamRole) {
        return new Response(null, { status: 204 });
      } else {
        return new Response(`404 Not Found`, { status: 404 });
      }
    }
  }
}
