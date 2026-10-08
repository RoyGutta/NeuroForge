/**
 * Provider-agnostic contract for structured generation. The engine never
 * imports a vendor SDK; adapters live outside `src/engine` (the Anthropic
 * adapter in `src/server`, the browser's remote adapter here) and the
 * interpreter only sees this interface. A provider returns the model's JSON
 * plus the metadata needed to reproduce and cost the call.
 */
import type { TokenUsage } from "../types";

export interface StructuredRequest {
  system: string;
  user: string;
  /** JSON schema the output must satisfy. */
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
  effort?: "low" | "medium" | "high";
}

export interface StructuredResponse {
  /** Parsed JSON, or null when the model produced none (refusal, truncation). */
  json: unknown | null;
  raw: string;
  model: string;
  stopReason: string;
  usage: TokenUsage;
  latencyMs: number;
  requestId?: string;
  refusal?: { category: string | null; explanation: string | null };
}

export type ProviderErrorKind = "not-configured" | "auth" | "rate-limit" | "timeout" | "network" | "api" | "bad-request";

export class LLMProviderError extends Error {
  constructor(message: string, public readonly kind: ProviderErrorKind, public readonly status?: number) {
    super(message);
    this.name = "LLMProviderError";
  }
}

export interface LLMProvider {
  id: string;
  model: string;
  generateStructured(request: StructuredRequest): Promise<StructuredResponse>;
}

/** Public first-party list prices in USD per million tokens (input, output), for cost tracking only. */
export const PRICE_USD_PER_MTOK: Record<string, [number, number]> = {
  "claude-fable-5-1": [10, 50],
  "claude-fable-5": [10, 50],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-opus-4-7": [5, 25],
  "claude-opus-4-6": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-4-5": [1, 5],
};

/** Estimated cost of one call; cache reads bill at a tenth of input, cache writes at 1.25 times. Null for unknown models. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const price = PRICE_USD_PER_MTOK[model];
  if (!price) return null;
  const [input, output] = price;
  const read = usage.cacheReadTokens ?? 0;
  const write = usage.cacheWriteTokens ?? 0;
  return (usage.inputTokens * input + read * input * 0.1 + write * input * 1.25 + usage.outputTokens * output) / 1e6;
}
