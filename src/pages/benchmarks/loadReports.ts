import type { BenchmarkDataset } from "../../engine/interpret/benchmark";
import type { EntryScore, InterpreterMetrics } from "../../engine/interpret/benchmark";
import type { CandidateSpec, InterpretDiagnostics } from "../../engine/interpret";
import { normalizeReport, type NormalizedReport } from "./model";

/** Benchmark records committed under benchmarks/results, bundled at build time. */
const files = import.meta.glob("../../../benchmarks/results/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** Analysis records (e.g. the robustness estimator) are derived from studies and are not rendered as reports. */
const isReport = (raw: unknown) => (raw as { kind?: string } | null)?.kind !== "analysis";

export const REPORTS: NormalizedReport[] = Object.entries(files)
  .filter(([, raw]) => isReport(raw))
  .map(([path, raw]) => normalizeReport(path.split("/").pop() ?? path, raw))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Interpreter benchmark records (`benchmarks/interpreter/results/*.json`) and the dataset they score. */
export interface InterpreterRecord {
  file: string;
  kind: "interpreter-benchmark";
  interpreter: { id: string; label: string; kind: string };
  dataset: { id: string; version: string; entries: number };
  settings: { deterministic?: boolean; model?: string; effort?: string; promptVersion?: string; llmSchemaVersion?: string };
  engineVersion: string;
  createdAt: string;
  metrics: InterpreterMetrics;
  entries: { id: string; score: EntryScore; supported: boolean; kind?: string; reason?: string; spec?: CandidateSpec; diagnostics: InterpretDiagnostics }[];
}

const interpreterFiles = import.meta.glob("../../../benchmarks/interpreter/results/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const datasetFiles = import.meta.glob("../../../benchmarks/interpreter/briefs-*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export const INTERPRETER_RECORDS: InterpreterRecord[] = Object.entries(interpreterFiles)
  .filter(([, raw]) => (raw as { kind?: string } | null)?.kind === "interpreter-benchmark")
  .map(([path, raw]) => ({ ...(raw as Omit<InterpreterRecord, "file">), file: path.split("/").pop() ?? path }))
  .sort((a, b) => (a.interpreter.kind === "rule" ? -1 : b.interpreter.kind === "rule" ? 1 : a.createdAt.localeCompare(b.createdAt)));

export const INTERPRETER_DATASET: BenchmarkDataset | null = (Object.entries(datasetFiles).sort(([a], [b]) => b.localeCompare(a))[0]?.[1] as BenchmarkDataset | undefined) ?? null;
