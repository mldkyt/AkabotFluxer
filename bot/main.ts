import * as Sentry from "npm:@sentry/deno";
import { Client, Message, MessageSendOptions } from "@fluxerjs/core";
import { prisma } from "./src/database.ts";
import { performCommandMessageActions } from "./src/commands.ts";
import { sendToBotChannelOrReply } from "./src/serverSettings.ts";

const sentryDsn = Deno.env.get("SENTRY_DSN");

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Alternatively, use `process.env.npm_package_version` for a dynamic release version
    // if your build tool supports it.
    release: "akabot-fluxer@0.0.1",

    integrations: [],
    tracesSampleRate: 0,
  });
}

const client = new Client({ intents: 0 });

// Load modules under modules/

const webRequestHandlers = [] as {
  fileName: string;
  handler: (
    client: Client,
    req: Request,
    url: URL,
  ) => Response | Promise<Response> | null;
}[];

const commandHandlers = [] as {
  checkCommand: (prefix: string, message: Message) => boolean;
  runCommand: (prefix: string, message: Message) => Promise<MessageSendOptions | undefined>;
}[];

for (const file of Deno.readDirSync("./modules")) {
  if (file.isFile && file.name.endsWith(".ts")) {
    const modulePath = `./modules/${file.name}`;
    console.log(`Loading ${modulePath}...`);
    const {
      setup,
      webRequest,
      checkCommand,
      runCommand,
    } = await import(modulePath) as {
      setup: ((client: Client) => void) | undefined;
      webRequest:
        | ((
          client: Client,
          req: Request,
          url: URL,
        ) => Response | Promise<Response> | null)
        | undefined;
      checkCommand: ((prefix: string, message: Message) => boolean) | undefined;
      runCommand: ((prefix: string, message: Message) => Promise<void>) | undefined;
    };

    if (setup) setup(client);
    if (webRequest) {
      webRequestHandlers.push({
        fileName: file.name,
        handler: webRequest,
      });
    }

    if (checkCommand && runCommand) {
      commandHandlers.push({
        checkCommand,
        runCommand,
      });
    }
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.username}!`);

  console.log("Registered", webRequestHandlers.length, "web request handlers.");
});

client.on("messageCreate", async (msg) => {
  if (!msg.guild) return;
  const serverSettings = await prisma.serverSettings.upsert({
    where: { guildId: msg.guild.id },
    create: { guildId: msg.guild.id },
    update: {},
  });

  if (!msg.content.startsWith(serverSettings.prefix)) return;

  for (const commandHandler of commandHandlers) {
    if (commandHandler.checkCommand(serverSettings.prefix, msg)) {
      const preemptiveTasks = await performCommandMessageActions(serverSettings, msg);
      if (preemptiveTasks === "cancel") return;
      const commandResponse = await commandHandler.runCommand(serverSettings.prefix, msg);
      if (!commandResponse) return;

      const botChannel = msg.guild.channels.find((ch) => ch.id === serverSettings.botChannel);
      if (!botChannel) {
        if (serverSettings.deleteCommandMessage) {
          commandResponse.content = `<@${msg.author.id}>\n${commandResponse.content}`;
          await msg.channel?.send(commandResponse);
        } else {
          await msg.reply(commandResponse);
        }
        return;
      }

      commandResponse.content = `<@${msg.author.id}>\n${commandResponse.content}`;
      await botChannel?.send(commandResponse);

      return;
    }
  }

  await sendToBotChannelOrReply(msg, `Unknown command`);
});

Deno.serve({ port: 3000 }, async (req: Request) => {
  const url = new URL(req.url);
  console.log(`${req.method} ${url.pathname}`);

  for (const handler of webRequestHandlers) {
    const response = await handler.handler(client, req, url);
    if (response) {
      console.log("Handling request by handler", handler.fileName);
      return response;
    } else {
      console.log("Handler", handler.fileName, "did not handle request.");
    }
  }

  console.log("404 not found");

  return new Response(`404 Not Found`, {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
});

const botToken = Deno.env.get("BOT_TOKEN");
if (!botToken) throw new Error("BOT_TOKEN is not set");

console.log("Logging in...");
await client.login(botToken);
