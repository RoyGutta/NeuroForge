/**
 * The interpretation endpoint, transport-agnostic. GET reports whether a
 * provider is configured; POST takes a brief, builds the versioned prompt
 * server-side and returns the model's structured response with its usage.
 * It is not a general proxy: callers cannot choose the prompt, the schema or
 * the model. Briefs are not logged. The deterministic half of interpretation
 * (schema check, normalisation, realisation, validation) runs wherever the
 * result is consumed, so the browser validates what the server returns.
 */
import { generatorFromProvider } from "../engine/interpret/llm/generator.js";
import { PROMPT_VERSION } from "../engine/interpret/llm/prompt.js";
import { LLMProviderError, type LLMProvider, type ProviderErrorKind } from "../engine/interpret/llm/provider.js";
import { LLM_SCHEMA_VERSION } from "../engine/interpret/llm/schema.js";
import { SPEC_SCHEMA_VERSION } from "../engine/interpret/spec.js";

export interface HandlerRequest {
  method: string;
  body?: unknown;
  /** Caller identity for the best-effort rate limit. */
  ip?: string;
}

export interface HandlerResponse {
  status: number;
  body: unknown;
}

export interface HandlerConfig {
  provider: LLMProvider | null;
  effort?: "low" | "medium" | "high";
  maxBriefChars?: number;
  /** Requests per caller per minute; best effort, in memory. */
  perMinute?: number;
  now?: () => number;
}

const STATUS: Record<ProviderErrorKind, number> = { "not-configured": 503, auth: 502, "rate-limit": 429, timeout: 504, network: 502, api: 502, "bad-request": 502 };

export function createInterpretHandler(cfg: HandlerConfig) {
  const maxChars = cfg.maxBriefChars ?? 4000;
  const perMinute = cfg.perMinute ?? 20;
  const now = cfg.now ?? (() => Date.now());
  const windows = new Map<string, number[]>();
  const limited = (ip: string): boolean => {
    const t = now();
    const hits = (windows.get(ip) ?? []).filter((h) => t - h < 60_000);
    hits.push(t);
    windows.set(ip, hits);
    return hits.length > perMinute;
  };
  const status = () => ({ configured: cfg.provider !== null, model: cfg.provider?.model ?? null, promptVersion: PROMPT_VERSION, schemaVersion: `${SPEC_SCHEMA_VERSION}/llm-${LLM_SCHEMA_VERSION}`, effort: cfg.effort ?? "medium" });

  return {
    async handle(req: HandlerRequest): Promise<HandlerResponse> {
      if (req.method === "GET") return { status: 200, body: status() };
      if (req.method !== "POST") return { status: 405, body: { error: "method not allowed" } };
      if (!cfg.provider) return { status: 503, body: { error: "No language-model provider is configured on this server; the rule-based interpreter remains available.", kind: "not-configured" } };
      const body = req.body;
      const brief = typeof body === "object" && body !== null && typeof (body as { brief?: unknown }).brief === "string" ? ((body as { brief: string }).brief as string).trim() : null;
      if (brief === null || brief.length === 0) return { status: 400, body: { error: "body must be { brief: string }" } };
      if (brief.length > maxChars) return { status: 400, body: { error: `brief must be at most ${maxChars} characters` } };
      if (limited(req.ip ?? "anonymous")) return { status: 429, body: { error: "too many interpretation requests; wait a minute", kind: "rate-limit" } };
      try {
        const res = await generatorFromProvider(cfg.provider, { effort: cfg.effort }).generate(brief);
        return { status: 200, body: res };
      } catch (e) {
        const err = e instanceof LLMProviderError ? e : new LLMProviderError("unexpected server error", "api");
        return { status: STATUS[err.kind], body: { error: err.message, kind: err.kind } };
      }
    },
    status,
  };
}
