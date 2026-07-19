import { Client, GuildMember } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

async function memberJoined(member: GuildMember) {
  const rolesOnJoin = await prisma.rolesOnJoin.findMany({
    where: {
      guildId: member.guild.id,
    },
  });

  for (const roleId of rolesOnJoin) {
    const role = member.guild.roles.find((r) => r.id === roleId.roleId);
    if (!role) continue;
    try {
      await member.addRole(role.id);
    } catch (e) {
      console.error(e);
    }
  }
}

async function onRoleDelete(role: {
  guild_id: string;
  role_id: string;
}) {
  await prisma.rolesOnJoin.delete({
    where: {
      guildId_roleId: {
        guildId: role.guild_id,
        roleId: role.role_id,
      },
    },
  });
}

export function setup(client: Client) {
  client.on("guildMemberAdd", memberJoined);

  client.on("guildRoleDelete", onRoleDelete);
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname === "/api/roles-on-join") {
    const guildId = await authorizeRequest(req);
    if (!guildId) return new Response(`Unauthorized`, { status: 403 });

    const guild = client.guilds.find((g) => g.id === guildId);
    if (!guild) return new Response(`Guild not found`, { status: 400 });

    if (req.method === "GET") {
      const rolesOnJoin = await prisma.rolesOnJoin.findMany({
        where: {
          guildId,
        },
      });

      return new Response(
        JSON.stringify(rolesOnJoin.map((r) => ({
          id: r.roleId,
          name: guild.roles.find((role) => role.id === r.roleId)?.name ?? "Unknown role",
        }))),
        { status: 200 },
      );
    }

    if (req.method === "POST") {
      const validator = z.object({
        roleId: z.string().nonempty(),
      });
      const json = await req.json();
      const validated = validator.safeParse(json);
      if (!validated.success) {
        return new Response(`Could not parse client payload`, { status: 400 });
      }

      const role = guild.roles.find((r) => r.id === validated.data.roleId);
      if (!role) return new Response(`Could not find role`, { status: 404 });

      await prisma.rolesOnJoin.create({
        data: {
          guildId,
          roleId: validated.data.roleId,
        },
      });

      return new Response(`OK`, { status: 200 });
    }

    if (req.method === "DELETE") {
      const validator = z.object({
        roleId: z.string().nonempty(),
      });
      const json = await req.json();
      const validated = validator.safeParse(json);
      if (!validated.success) {
        return new Response(`Could not parse client payload`, { status: 400 });
      }

      await prisma.rolesOnJoin.delete({
        where: {
          guildId_roleId: {
            guildId,
            roleId: validated.data.roleId,
          },
        },
      });

      return new Response(`OK`, { status: 200 });
    }
  }
}
