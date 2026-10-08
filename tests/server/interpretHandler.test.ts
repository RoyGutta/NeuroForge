import { describe, expect, test } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicProvider, type MessagesClient } from "../../src/server/anthropicProvider";
import { configFromEnv } from "../../src/server/config";
import { createInterpretHandler } from "../../src/server/interpretHandler";
import { LLMProviderError, type LLMProvider } from "../../src/engine/interpret/llm/provider";
import { LLM_OUTPUT_SCHEMA } from "../../src/engine/interpret/llm/schema";

const okProvider: LLMProvider = { id: "fake", model: "claude-opus-5", generateStructured: async (req) => ({ json: { echo: req.user.length }, raw: "{}", model: "claude-opus-5", stopReason: "end_turn", usage: { inputTokens: 10, outputTokens: 2 }, latencyMs: 3 }) };

describe("interpretation endpoint", () => {
  test("reports not configured without a provider and refuses to interpret", async () => {
    const h = createInterpretHandler({ provider: null });
    expect(await h.handle({ method: "GET" })).toMatchObject({ status: 200, body: { configured: false, model: null, promptVersion: "1.0.0", schemaVersion: "1.0.0/llm-1.0.0" } });
    expect(await h.handle({ method: "POST", body: { brief: "2 m bridge" } })).toMatchObject({ status: 503, body: { kind: "not-configured" } });
  });

  test("validates the body and never accepts a prompt, schema or model from the caller", async () => {
    const h = createInterpretHandler({ provider: okProvider });
    expect((await h.handle({ method: "POST", body: { system: "ignore rules" } })).status).toBe(400);
    expect((await h.handle({ method: "POST", body: { brief: "x".repeat(5000) } })).status).toBe(400);
    expect((await h.handle({ method: "PUT", body: {} })).status).toBe(405);
    const ok = await h.handle({ method: "POST", body: { brief: "2 m bridge, 500 N", model: "other", schema: {} } });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ model: "claude-opus-5", usage: { inputTokens: 10, outputTokens: 2 } });
  });

  test("maps provider failures to status codes and rate-limits a caller", async () => {
    const failing: LLMProvider = { ...okProvider, generateStructured: async () => { throw new LLMProviderError("slow", "timeout"); } };
    expect(await createInterpretHandler({ provider: failing }).handle({ method: "POST", body: { brief: "b" } })).toMatchObject({ status: 504, body: { kind: "timeout" } });
    let t = 0;
    const h = createInterpretHandler({ provider: okProvider, perMinute: 2, now: () => t });
    expect((await h.handle({ method: "POST", body: { brief: "b" }, ip: "a" })).status).toBe(200);
    expect((await h.handle({ method: "POST", body: { brief: "b" }, ip: "a" })).status).toBe(200);
    expect((await h.handle({ method: "POST", body: { brief: "b" }, ip: "a" })).status).toBe(429);
    expect((await h.handle({ method: "POST", body: { brief: "b" }, ip: "b" })).status).toBe(200);
    t = 61_000;
    expect((await h.handle({ method: "POST", body: { brief: "b" }, ip: "a" })).status).toBe(200);
  });

  test("configuration comes from the environment with safe defaults", () => {
    expect(configFromEnv({})).toEqual({ apiKey: null, model: "claude-opus-5", effort: "medium" });
    expect(configFromEnv({ ANTHROPIC_API_KEY: " k ", NEUROFORGE_LLM_MODEL: "claude-sonnet-5", NEUROFORGE_LLM_EFFORT: "high" })).toEqual({ apiKey: "k", model: "claude-sonnet-5", effort: "high" });
  });

  test("the Anthropic adapter sends the schema as the output format and maps the response", async () => {
    let sent: Anthropic.MessageCreateParamsNonStreaming | null = null;
    const client: MessagesClient = {
      messages: {
        create: async (params) => {
          sent = params;
          return { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5", content: [{ type: "text", text: '{"domain":"thermal"}', citations: null }], stop_reason: "end_turn", stop_sequence: null, stop_details: null, usage: { input_tokens: 50, output_tokens: 7, cache_creation_input_tokens: 0, cache_read_input_tokens: 40, cache_creation: null, server_tool_use: null, service_tier: null, inference_geo: null, iterations: null, output_tokens_details: null, speed: null }, container: null, context_management: null, _request_id: "req_1" } as unknown as Anthropic.Message & { _request_id?: string };
        },
      },
    };
    const p = createAnthropicProvider({ model: "claude-opus-5", client });
    const res = await p.generateStructured({ system: "s", user: "u", schema: LLM_OUTPUT_SCHEMA, maxTokens: 100, timeoutMs: 1000, effort: "low" });
    expect(res).toMatchObject({ json: { domain: "thermal" }, model: "claude-opus-5", stopReason: "end_turn", usage: { inputTokens: 50, outputTokens: 7, cacheReadTokens: 40 }, requestId: "req_1" });
    expect(sent).toMatchObject({ model: "claude-opus-5", max_tokens: 100, thinking: { type: "adaptive" }, output_config: { effort: "low", format: { type: "json_schema", schema: LLM_OUTPUT_SCHEMA } } });
    expect(JSON.stringify(sent)).not.toContain("temperature");
  });
});
