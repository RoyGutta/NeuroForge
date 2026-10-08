/**
 * Node adapters: the handler built from the process environment (memoised)
 * and a plain http request/response bridge shared by the Vite dev server
 * and the Vercel function.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createAnthropicProvider } from "./anthropicProvider";
import { configFromEnv } from "./config";
import { createInterpretHandler } from "./interpretHandler";

let cached: ReturnType<typeof createInterpretHandler> | null = null;

export function handlerFromEnv(env: Record<string, string | undefined> = process.env) {
  if (cached) return cached;
  const cfg = configFromEnv(env);
  cached = createInterpretHandler({ provider: cfg.apiKey ? createAnthropicProvider({ apiKey: cfg.apiKey, model: cfg.model }) : null, effort: cfg.effort });
  return cached;
}

function readJson(req: IncomingMessage, limit = 16_384): Promise<unknown> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer | string) => {
      data += chunk;
      if (data.length > limit) {
        resolve(null);
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

export async function serveNode(req: IncomingMessage, res: ServerResponse, body?: unknown): Promise<void> {
  const handler = handlerFromEnv();
  const parsed = body !== undefined ? body : req.method === "POST" ? await readJson(req) : undefined;
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "anonymous";
  const out = await handler.handle({ method: req.method ?? "GET", body: parsed, ip });
  res.statusCode = out.status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(out.body));
}
