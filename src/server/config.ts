/** Server configuration from environment variables; the key never leaves this process. */
export interface ServerConfig {
  apiKey: string | null;
  model: string;
  effort: "low" | "medium" | "high";
}

export const DEFAULT_MODEL = "claude-opus-5";

export function configFromEnv(env: Record<string, string | undefined>): ServerConfig {
  const effort = env.NEUROFORGE_LLM_EFFORT;
  return {
    apiKey: env.ANTHROPIC_API_KEY?.trim() || null,
    model: env.NEUROFORGE_LLM_MODEL?.trim() || DEFAULT_MODEL,
    effort: effort === "low" || effort === "high" ? effort : "medium",
  };
}
