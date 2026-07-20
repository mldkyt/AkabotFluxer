// export function checkCommand(prefix: string, message: Message): boolean {
//   return false;
// }

import { Client, Message, resolvePermissionsToBitfield, STATIC_CDN_URL } from "@fluxerjs/core";
import { prisma } from "../src/database.ts";
import { authorizeRequest } from "../src/web.ts";
import z from "zod";

// export async function runCommand(prefix: string, message: Message): Promise<MessageSendOptions | undefined> {
// }

function generateMeow() {
  const a = Math.random();

  if (a > 0.5) {
    return ["ny", ...Array(1 + Math.floor(Math.random() * 3)).fill("a")].join("");
  } else {
    const meows = ["meow", "mew", "mraow", "mrraaoww", "mrroww", "mreeow"];
    return meows[Math.floor(Math.random() * meows.length)];
  }
}

function handleMeow(content: string) {
  let response = ``;
  for (const bite of content.split(" ")) {
    if (/^nya+$/.test(bite) || /^m[mraoew]{2,}$/.test(bite)) {
      response += `${generateMeow()} `;
    }
  }

  return response.trim();
}

function handleWaf(content: string) {
  let response = ``;

  for (const bite of content.split(" ")) {
    if (bite === "waf") response += `waf `;
  }

  return response.trim();
}

function generateBark() {
  let bark = ``;
  if (Math.random() > 0.5) bark += `a`;
  bark += `w`;
  bark += Array(1 + Math.floor(Math.random() * 2)).fill("r").join("");
  bark += "u";
  bark += Array(1 + Math.floor(Math.random() * 3)).fill("f").join("");
  return bark;
}

function handleBark(content: string) {
  let response = ``;

  for (const bite of content.split(" ")) {
    if (/^a?w[rouf]{3,}$/.test(bite)) {
      response += `${generateBark()} `;
    }
  }

  return response;
}

function handleColon3(content: string) {
  let response = ``;

  for (const bite of content.split(" ")) {
    if (bite === ":3") {
      response += `:3 `;
    }
  }
  return response;
}

function handleOwO(content: string) {
  const owos = ["owo", "uwu", "OwO", "UwU"];
  let response = ``;

  for (const bite of content.split(" ")) {
    if (/^[oOuU]w[oOuU]$/.test(bite)) {
      response += `${owos[Math.floor(Math.random() * owos.length)]} `;
    }
  }

  return response;
}

function handleAwawa(content: string) {
  let response = ``;

  for (const bite of content.split(" ")) {
    if (/^a(wa)+$/.test(bite)) {
      response += `a${Array((bite.length - 1) / 2).fill("wa").join("")} `;
    }
  }

  return response;
}

async function handleMeowBack(message: Message) {
  if (message.author.bot) return;

  const meowBackConfig = await prisma.meowBackSettings.findUnique({
    where: { channelId: message.channelId },
  });

  if (!meowBackConfig) return;

  let response = ``;

  if (meowBackConfig.meow) {
    response += `${handleMeow(message.content)} `;
  }

  if (meowBackConfig.waf) {
    response += `${handleWaf(message.content)} `;
  }

  if (meowBackConfig.bark) {
    response += `${handleBark(message.content)} `;
  }

  if (meowBackConfig.colon3) {
    response += `${handleColon3(message.content)} `;
  }

  if (meowBackConfig.owo) {
    response += `${handleOwO(message.content)} `;
  }

  if (meowBackConfig.awawa) {
    response += `${handleAwawa(message.content)} `;
  }

  if (response.trim().length > 0) {
    await message.reply(response.trim());
  }
}

export function setup(client: Client) {
  client.on("messageCreate", handleMeowBack);
}

export async function webRequest(client: Client, req: Request, url: URL) {
  if (url.pathname === "/api/meow-back") {
    const guildId = await authorizeRequest(req);
    if (!guildId) return new Response(`Unauthorized`, { status: 403 });

    const guild = client.guilds.find((g) => g.id === guildId);
    if (!guild) return new Response(`Guild not found`, { status: 400 });

    if (req.method === "GET") {
      const meowBackSettings = await prisma.meowBackSettings.findMany({ where: { guildId } });

      return new Response(
        JSON.stringify(meowBackSettings.map((x) => ({
          ...x,
          channelName: guild.channels.find((ch) => ch.id === x.channelId)?.name ?? "Unknown channel",
        }))),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const validator = z.object({
        channelId: z.string().nonempty(),
        meow: z.boolean(),
        waf: z.boolean(),
        bark: z.boolean(),
        colon3: z.boolean(),
        owo: z.boolean(),
        awawa: z.boolean(),
      });

      const body = validator.safeParse(await req.json());

      if (!body.success) {
        return new Response(`Unable to parse client payload`, { status: 400 });
      }

      const channel = guild.channels.filter((ch) => ch.type === 0).find((ch) => ch.id === body.data.channelId);
      if (!channel) return new Response(`Channel not found`, { status: 400 });

      await prisma.meowBackSettings.upsert({
        where: { channelId: body.data.channelId },
        create: { guildId, ...body.data },
        update: body.data,
      });

      return new Response(`OK`, { status: 200 });
    }

    if (req.method === "DELETE") {
      const validator = z.object({
        channelId: z.string().nonempty(),
      });

      const body = validator.safeParse(await req.json());

      if (!body.success) {
        return new Response(`Unable to parse client payload`, { status: 400 });
      }

      const res = await prisma.meowBackSettings.deleteMany({ where: { channelId: body.data.channelId } });

      if (res.count === 0) return new Response(`Not found`, { status: 404 });

      return new Response(`OK`, { status: 200 });
    }
  }
}
