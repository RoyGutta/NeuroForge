/**
 * Anthropic adapter for `LLMProvider`, server-side only. Structured output
 * is enforced by the API through `output_config.format` with the versioned
 * JSON schema; adaptive thinking is on with a configurable effort. The
 * adapter maps SDK errors onto the provider's error kinds and records
 * token usage, request id, stop reason and latency for every call.
 */
import Anthropic from "@anthropic-ai/sdk";
import { LLMProviderError, type LLMProvider, type StructuredRequest, type StructuredResponse } from "../engine/interpret/llm/provider";

/** The subset of the SDK client the adapter uses; injectable for tests. */
export interface MessagesClient {
  messages: { create(params: Anthropic.MessageCreateParamsNonStreaming, options?: { timeout?: number }): Promise<Anthropic.Message & { _request_id?: string | null }> };
}

export interface AnthropicProviderOptions {
  model: string;
  apiKey?: string;
  client?: MessagesClient;
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function mapError(e: unknown): LLMProviderError {
  if (e instanceof Anthropic.AuthenticationError) return new LLMProviderError("The provider rejected the server's credentials.", "auth", e.status);
  if (e instanceof Anthropic.RateLimitError) return new LLMProviderError("The provider is rate-limiting requests; try again shortly.", "rate-limit", e.status);
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new LLMProviderError("The model call timed out.", "timeout");
  if (e instanceof Anthropic.APIConnectionError) return new LLMProviderError("Could not reach the provider.", "network");
  if (e instanceof Anthropic.BadRequestError) return new LLMProviderError(`The provider rejected the request: ${e.message}`, "bad-request", e.status);
  if (e instanceof Anthropic.APIError) return new LLMProviderError(`Provider error ${e.status ?? ""}: ${e.message}`, "api", e.status);
  return new LLMProviderError(e instanceof Error ? e.message : String(e), "api");
}

export function createAnthropicProvider(opts: AnthropicProviderOptions): LLMProvider {
  const client: MessagesClient = opts.client ?? new Anthropic({ apiKey: opts.apiKey });
  return {
    id: "anthropic",
    model: opts.model,
    async generateStructured(req: StructuredRequest): Promise<StructuredResponse> {
      const t0 = Date.now();
      let message: Anthropic.Message & { _request_id?: string | null };
      try {
        message = await client.messages.create(
          {
            model: opts.model,
            max_tokens: req.maxTokens,
            system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: req.user }],
            thinking: { type: "adaptive" },
            output_config: { effort: req.effort ?? "medium", format: { type: "json_schema", schema: req.schema } },
          },
          { timeout: req.timeoutMs }
        );
      } catch (e) {
        throw mapError(e);
      }
      const raw = textOf(message);
      let json: unknown | null = null;
      if (message.stop_reason !== "refusal" && raw.trim()) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }
      }
      const out: StructuredResponse = {
        json,
        raw,
        model: message.model,
        stopReason: message.stop_reason ?? "unknown",
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
        },
        latencyMs: Date.now() - t0,
      };
      if (message._request_id) out.requestId = message._request_id;
      if (message.stop_reason === "refusal") out.refusal = { category: message.stop_details?.category ?? null, explanation: message.stop_details?.explanation ?? null };
      return out;
    },
  };
}
