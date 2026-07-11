import { PrismaClient } from "../generated/client/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: Deno.env.get("DATABASE_URL") }),
});
