import type { BenchmarkDataset } from "../../engine/interpret/benchmark";
import type { EntryScore, InterpreterMetrics } from "../../engine/interpret/benchmark";
import type { CandidateSpec, InterpretDiagnostics } from "../../engine/interpret";
import { normalizeReport, type NormalizedReport } from "./model";

/**
 * Benchmark records committed under benchmarks/results. Each record is its own
 * chunk, loaded when it is selected: study records reach several megabytes,
 * and bundling all of them made every visit download every record.
 */
const files = import.meta.glob("../../../benchmarks/results/*.json", { import: "default" }) as Record<string, () => Promise<unknown>>;

/** Analyses written by scripts (robustness estimator, margin analysis) sit beside the records but are not reports. */
export const ANALYSIS_FILE = /-(estimator|margins)-\d{4}-\d{2}-\d{2}\.json$/;

/** Loaded analysis records are skipped as well, whatever their name. */
const isReport = (raw: unknown) => (raw as { kind?: string } | null)?.kind !== "analysis";

export interface ReportEntry {
  file: string;
  /** First date in the file name; records are listed newest first. */
  date: string;
  load(): Promise<NormalizedReport | null>;
}

export function reportEntries(glob: Record<string, () => Promise<unknown>>): ReportEntry[] {
  return Object.entries(glob)
    .map(([path, load]) => {
      const file = path.split("/").pop() ?? path;
      return { file, date: file.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "", load: async () => { const raw = await load(); return isReport(raw) ? normalizeReport(file, raw) : null; } };
    })
    .filter((e) => !ANALYSIS_FILE.test(e.file))
    .sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file));
}

export const REPORT_ENTRIES: ReportEntry[] = reportEntries(files);

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
