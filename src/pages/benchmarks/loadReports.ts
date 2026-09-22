import { normalizeReport, type NormalizedReport } from "./model";

/** Benchmark records committed under benchmarks/results, bundled at build time. */
const files = import.meta.glob("../../../benchmarks/results/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export const REPORTS: NormalizedReport[] = Object.entries(files)
  .map(([path, raw]) => normalizeReport(path.split("/").pop() ?? path, raw))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
