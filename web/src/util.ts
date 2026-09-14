import { toast } from "./components/ui/index.ts";

export async function request(method: "GET" | "POST" | "PATCH" | "DELETE", apiEndpoint: string, body?: any): Promise<
  | { ok: true; data: any }
  | { ok: false }
> {
  const request = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    credentials: "include",
  } as {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    headers: Record<string, string>;
    body?: string | undefined;
    credentials: "include";
  };
  if (body) request.body = JSON.stringify(body);

  const response = await fetch(apiEndpoint, request);
  if (!response.ok) {
    const text = await response.text();
    toast.danger(`${response.status} ${response.statusText}: ${text}`);
    return { ok: false };
  }

  return {
    ok: true,
    data: response.headers.get("Content-Type")?.startsWith("application/json") ? (await response.json()) as any : await response.text(),
  };
}