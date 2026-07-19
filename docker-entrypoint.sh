#!/bin/bash

deno run -A npm:prisma db push --accept-data-loss
deno run -A main.ts
