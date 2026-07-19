FROM denoland/deno:debian AS web

WORKDIR /app

COPY web/public public/.
COPY web/src src/.
COPY web/deno.json .
COPY web/deno.lock .
COPY web/index.html .
COPY web/package.json .
COPY web/tsconfig.json .
COPY web/tsconfig.app.json .
COPY web/tsconfig.node.json .
COPY web/vite.config.ts .

RUN deno install --allow-scripts=npm:*
RUN deno task build

FROM denoland/deno:debian AS bot

WORKDIR /app

RUN apt update
RUN apt install -y bash

COPY bot/deno.json .
COPY bot/deno.lock .
RUN deno install --allow-scripts=npm:*

COPY bot/prisma prisma/.
COPY bot/prisma.config.ts .
RUN deno run -A npm:prisma generate

COPY bot/modules modules/.
COPY bot/src src/.
COPY bot/main.ts .
COPY --from=web /app/dist dist/.
COPY docker-entrypoint.sh .

RUN chmod +x docker-entrypoint.sh

STOPSIGNAL SIGKILL

ENTRYPOINT [ "bash", "docker-entrypoint.sh" ]
