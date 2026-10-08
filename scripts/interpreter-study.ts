/**
 * Run the interpreter benchmark and write a dated record.
 *
 *   npm run interpreter:study                      (rule-based only; offline)
 *   npm run interpreter:study -- --interpreters rule,llm,hybrid --model claude-opus-5 --effort medium
 *   npm run interpreter:study -- --limit 5         (first five entries, for a smoke run)
 *
 * The model-backed interpreters need ANTHROPIC_API_KEY in the environment
 * (never in the repository). Output: benchmarks/interpreter/results/<date>-<interpreter>-<model>.json
 * with the dataset version, prompt and schema versions, settings, every raw
 * and normalised output, per-entry scores and the aggregate metrics.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ENGINE_VERSION } from "../src/engine/version";
import { interpretBrief, type InterpretResult, type ProblemInterpreter } from "../src/engine/interpret";
import { aggregateScores, loadDataset, scoreEntry, type BenchmarkEntry, type EntryScore } from "../src/engine/interpret/benchmark";
import { createHybridInterpreter } from "../src/engine/interpret/llm/hybrid";
import { createLLMInterpreter, generatorFromProvider } from "../src/engine/interpret/llm/llmInterpreter";
import { PROMPT_VERSION } from "../src/engine/interpret/llm/prompt";
import { LLM_SCHEMA_VERSION } from "../src/engine/interpret/llm/schema";
import { createAnthropicProvider } from "../src/server/anthropicProvider";
import { configFromEnv } from "../src/server/config";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DATASET = opt("dataset", "benchmarks/interpreter/briefs-v1.0.0.json");
const which = opt("interpreters", "rule").split(",");
const env = configFromEnv(process.env);
const model = opt("model", env.model);
const effort = opt("effort", env.effort) as "low" | "medium" | "high";
const limit = Number(opt("limit", "0"));

const dataset = loadDataset(JSON.parse(readFileSync(DATASET, "utf8")));
const entries = (limit > 0 ? dataset.entries.slice(0, limit) : dataset.entries) as BenchmarkEntry[];

function build(name: string): ProblemInterpreter {
  if (name === "rule") return { id: "rule-based-v1", label: "Rule-based", kind: "rule", interpret: interpretBrief };
  if (!env.apiKey) throw new Error(`interpreter "${name}" needs ANTHROPIC_API_KEY in the environment`);
  const llm = createLLMInterpreter(generatorFromProvider(createAnthropicProvider({ apiKey: env.apiKey, model }), { effort }));
  if (name === "llm") return llm;
  if (name === "hybrid") return createHybridInterpreter(llm);
  throw new Error(`unknown interpreter "${name}"`);
}

const pct = (v: number | null) => (v === null ? "   n/a" : `${(v * 100).toFixed(0).padStart(4)} %`);

for (const name of which) {
  const interpreter = build(name);
  console.log(`\n${interpreter.label} on ${dataset.id} v${dataset.version} (${entries.length} briefs)${name !== "rule" ? ` · ${model} · effort ${effort} · prompt ${PROMPT_VERSION} · schema ${LLM_SCHEMA_VERSION}` : ""}`);
  const results: { id: string; result: InterpretResult; score: EntryScore }[] = [];
  for (const e of entries) {
    const result = await interpreter.interpret(e.brief);
    const score = scoreEntry(e, result);
    results.push({ id: e.id, result, score });
    console.log(`  ${e.id.padEnd(16)} ${score.failures.length === 0 ? "ok" : score.failures.join(", ")}${score.latencyMs !== null && name !== "rule" ? ` (${(score.latencyMs / 1000).toFixed(1)} s)` : ""}`);
  }
  const metrics = aggregateScores(results.map((r) => r.score));
  const rows: [string, number | null][] = [
    ["schema validity", metrics.schemaValidity.value],
    ["domain classification", metrics.domainClassification.value],
    ["field extraction", metrics.fieldExtraction.value],
    ["unit normalization", metrics.unitNormalization.value],
    ["missing information", metrics.missingInformation.value],
    ["ambiguity handling", metrics.ambiguityHandling.value],
    ["unsupported domains", metrics.unsupportedDetection.value],
    ["unsupported elements", metrics.unsupportedElementDetection.value],
    ["material", metrics.materialAccuracy.value],
    ["objective", metrics.objectiveAccuracy.value],
    ["validation pass", metrics.validationPassRate.value],
    ["semantic equivalence", metrics.semanticEquivalence.value],
  ];
  for (const [k, v] of rows) console.log(`  ${k.padEnd(24)} ${pct(v)}`);
  console.log(`  failures: ${Object.entries(metrics.failures).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
  if (metrics.latencyMs.mean !== null) console.log(`  latency mean ${(metrics.latencyMs.mean / 1000).toFixed(2)} s, median ${((metrics.latencyMs.median ?? 0) / 1000).toFixed(2)} s; cost total ${metrics.costUsd.total === null ? "n/a" : `$${metrics.costUsd.total.toFixed(4)}`}`);
  mkdirSync("benchmarks/interpreter/results", { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const out = `benchmarks/interpreter/results/${date}-${name}${name === "rule" ? "" : `-${model}`}.json`;
  writeFileSync(
    out,
    JSON.stringify(
      {
        kind: "interpreter-benchmark",
        interpreter: { id: interpreter.id, label: interpreter.label, kind: interpreter.kind },
        dataset: { id: dataset.id, version: dataset.version, file: DATASET, entries: entries.length },
        settings: name === "rule" ? { deterministic: true } : { model, effort, promptVersion: PROMPT_VERSION, llmSchemaVersion: LLM_SCHEMA_VERSION, maxTokens: 4096, thinking: "adaptive" },
        engineVersion: ENGINE_VERSION,
        createdAt: new Date().toISOString(),
        metrics,
        entries: results.map(({ id, result, score }) => ({
          id,
          score,
          supported: result.supported,
          kind: result.supported ? undefined : result.kind,
          reason: result.supported ? undefined : result.reason,
          spec: result.supported ? result.spec : result.spec,
          diagnostics: result.diagnostics,
        })),
      },
      null,
      1
    )
  );
  console.log(`  wrote ${out}`);
}
