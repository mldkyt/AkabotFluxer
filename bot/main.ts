import { Client } from "@fluxerjs/core";

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

for (const file of Deno.readDirSync("./modules")) {
  if (file.isFile && file.name.endsWith(".ts")) {
    const modulePath = `./modules/${file.name}`;
    console.log(`Loading ${modulePath}...`);
    const {
      setup,
      webRequest,
    } = await import(modulePath) as {
      setup: ((client: Client) => void) | undefined;
      webRequest:
        | ((
          client: Client,
          req: Request,
          url: URL,
        ) => Response | Promise<Response> | null)
        | undefined;
    };

    if (setup) setup(client);
    if (webRequest) {
      webRequestHandlers.push({
        fileName: file.name,
        handler: webRequest,
      });
    }
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.username}!`);

  console.log("Registered", webRequestHandlers.length, "web request handlers.");
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
