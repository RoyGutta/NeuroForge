/**
 * Browser-side generator: posts the brief to the NeuroForge server endpoint,
 * which holds the provider credentials and makes the model call. The
 * browser never sees an API key. The endpoint's GET reports whether a
 * provider is configured so the interface can say so honestly.
 */
import type { BriefGenerator } from "./llmInterpreter";
import { LLMProviderError, type ProviderErrorKind, type StructuredResponse } from "./provider";

export interface RemoteStatus {
  configured: boolean;
  model: string | null;
  promptVersion: string;
  schemaVersion: string;
  effort?: string;
}

export const DEFAULT_ENDPOINT = "/api/interpret";

export async function fetchRemoteStatus(endpoint = DEFAULT_ENDPOINT, fetchImpl: typeof fetch = fetch): Promise<RemoteStatus> {
  try {
    const res = await fetchImpl(endpoint, { method: "GET", headers: { accept: "application/json" } });
    if (!res.ok) return { configured: false, model: null, promptVersion: "", schemaVersion: "" };
    return (await res.json()) as RemoteStatus;
  } catch {
    return { configured: false, model: null, promptVersion: "", schemaVersion: "" };
  }
}

export function createRemoteGenerator(status: RemoteStatus, endpoint = DEFAULT_ENDPOINT, fetchImpl: typeof fetch = fetch): BriefGenerator {
  return {
    id: "remote",
    model: status.model ?? "unconfigured",
    effort: status.effort,
    async generate(brief: string): Promise<StructuredResponse> {
      let res: Response;
      try {
        res = await fetchImpl(endpoint, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ brief }) });
      } catch (e) {
        throw new LLMProviderError(e instanceof Error ? e.message : "network error", "network");
      }
      if (!res.ok) {
        let kind: ProviderErrorKind = "api";
        let message = `${res.status} ${res.statusText}`;
        try {
          const body = (await res.json()) as { error?: string; kind?: ProviderErrorKind };
          if (body.kind) kind = body.kind;
          if (body.error) message = body.error;
        } catch {
          /* no JSON body */
        }
        throw new LLMProviderError(message, kind, res.status);
      }
      return (await res.json()) as StructuredResponse;
    },
  };
}
