import { getCookies } from "jsr:@std/http/cookie";
import { prisma } from "./database.ts";

export async function authorizeRequest(req: Request): Promise<string | null> {
  let token = "";

  // Authorization header
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (token.length === 0) {
    // Cookies
    const cookies = getCookies(req.headers);
    if (cookies && cookies.token) token = cookies.token;
  }

  if (token.length === 0) return null;

  const authorization = await prisma.webTokens.findFirst({
    where: {
      token: token,
    },
  });

  if (!authorization) return null;
  return authorization.guildId;
}

export async function generateToken(guildId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "");

  await prisma.webTokens.create({
    data: {
      guildId,
      token,
    },
  });

  return token;
}
