import { Client, Message, MessageSendOptions } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import { z } from "zod";
import { captureException } from "@sentry/deno";
import { sendToBotChannelOrReply } from "../src/serverSettings.ts";

export function checkCommand(prefix: string, message: Message): boolean {
  return message.content.startsWith(`${prefix}iam`) || message.content === `${prefix}iamroles`;
}

export async function runCommand(prefix: string, message: Message): Promise<MessageSendOptions | undefined> {
  if (!message.guild) return;

  if (message.content.startsWith(`${prefix}iam`)) {
    const args = message.content.split(" ");
    if (args.length === 2) {
      try {
        const iamRole = await prisma.iamRoles.findFirst({
          where: {
            guildId: message.guild.id,
            tag: args[1],
          },
        });

        if (!iamRole) {
          await sendToBotChannelOrReply(message, `Unknown !iam role ${args[1]}`);

          return;
        }

        const member = await message.guild.fetchMember(message.author.id);
        const role = message.guild.roles.get(iamRole.roleId);
        if (!role) return;

        if (member.roles.has(iamRole.roleId)) {
          await member.removeRole(iamRole.roleId);

          await sendToBotChannelOrReply(message, `✅ Removed role ${role.name} from you!`);
          return;
        } else {
          await member.addRole(iamRole.roleId);
          await sendToBotChannelOrReply(message, `✅ Added role ${role.name} to you!`);
        }
      } catch (e) {
        await sendToBotChannelOrReply(message, `❌ Error adding role! ${e}`);

        captureException(e);
      }
    }
  }

  if (message.content === `${prefix}iamroles`) {
    let list = `!iam roles list: `;

    const iamRoles = await prisma.iamRoles.findMany({
      where: { guildId: message.guild.id },
    });

    for (const iamRole of iamRoles) {
      list += `\`${iamRole.tag}\`, `;
    }

    list = list.substring(0, list.lastIndexOf(","));

    return { content: list };
  }
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname === "/api/iam-roles") {
    const guildId = await authorizeRequest(req);
    if (!guildId) {
      return new Response(`401 Unauthorized`, { status: 401 });
    }

    const guild = client.guilds.find((g) => g.id === guildId);
    if (!guild) return new Response(`Guild not found`, { status: 400 });

    if (req.method === "GET") {
      const iamRoles = await prisma.iamRoles.findMany({
        where: {
          guildId,
        },
      });

      return new Response(
        JSON.stringify(
          iamRoles.map((x) => ({
            roleId: x.roleId,
            roleName: guild.roles.find((r) => r.id === x.roleId)?.name ?? "Unknown role",
            tag: x.tag,
          })),
        ),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } else if (req.method === "POST") {
      const postBodySchema = z.object({
        roleId: z.string().nonempty(),
        tag: z.string().nonempty(),
      });

      const body = await req.json();
      const result = postBodySchema.safeParse(body);

      if (!result.success) {
        return new Response(`Unable to parse the client payload`, { status: 400 });
      }

      const guild = client.guilds.get(guildId);
      if (!guild) {
        return new Response(`The guild was not found (how)`, { status: 400 });
      }

      if (!guild.roles.has(body.roleId)) {
        return new Response(`The role does not exist`, { status: 400 });
      }

      if (!/^[a-z0-9]+$/.test(result.data.tag)) {
        return new Response(`The tag is invalid`, { status: 400 });
      }

      const iamRole = await prisma.iamRoles.create({
        data: {
          guildId,
          roleId: body.roleId,
          tag: body.tag,
        },
      });

      return new Response(
        JSON.stringify({
          roleId: iamRole.roleId,
          tag: iamRole.tag,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } else if (req.method === "PATCH") {
      const patchBodySchema = z.object({
        roleId: z.string().optional(),
        tag: z.string().optional(),
      });

      const body = await req.json();
      const result = patchBodySchema.safeParse(body);

      if (!result.success) {
        return new Response(`Unable to parse the client payload`, { status: 400 });
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
