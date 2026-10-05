import { normalizeReport, type NormalizedReport } from "./model";

/** Benchmark records committed under benchmarks/results, bundled at build time. */
const files = import.meta.glob("../../../benchmarks/results/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** Analysis records (e.g. the robustness estimator) are derived from studies and are not rendered as reports. */
const isReport = (raw: unknown) => (raw as { kind?: string } | null)?.kind !== "analysis";

export const REPORTS: NormalizedReport[] = Object.entries(files)
  .filter(([, raw]) => isReport(raw))
  .map(([path, raw]) => normalizeReport(path.split("/").pop() ?? path, raw))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
