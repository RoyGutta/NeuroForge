import { describe, expect, test } from "vitest";
import { ANALYSIS_FILE, reportEntries } from "../../src/pages/benchmarks/loadReports";

describe("benchmark record listing", () => {
  test("lists records newest first by the date in the name, skips script analyses, and loads lazily", async () => {
    const loaded: string[] = [];
    const study = { kind: "study", spec: { id: "s", title: "t", hypothesis: "h", benchmark: { problem: "truss-bridge", span_m: 2, load_N: 500, panels: 4 }, budget: 10, seeds: [1], reference: "a", methods: [{ id: "a", optimizer: "evolutionary", params: {} }], metrics: [], targetFraction: 0.9 }, engineVersion: "1", createdAt: "2026-10-24T00:00:00Z", objective: { metric: "mass_kg", label: "Mass", unit: "kg" }, baselineObjective: 1, targetObjective: 0.9, runs: [], analysis: { methods: [], comparisons: [] } };
    const glob = {
      "../x/2026-09-22-truss-1500x5.json": async () => (loaded.push("old"), { kind: "benchmark" }),
      "../x/margin-sweep-a-2026-10-24.json": async () => (loaded.push("study"), study),
      "../x/margin-sweep-a-2026-10-24-margins-2026-10-24.json": async () => (loaded.push("analysis"), { kind: "analysis" }),
      "../x/robust-formulations-2026-10-05-estimator-2026-10-05.json": async () => ({ kind: "analysis" }),
      "../x/odd-2026-10-01.json": async () => ({ kind: "analysis" }),
    };
    const entries = reportEntries(glob);
    expect(entries.map((e) => e.file)).toEqual(["margin-sweep-a-2026-10-24.json", "odd-2026-10-01.json", "2026-09-22-truss-1500x5.json"]);
    expect(loaded).toEqual([]);
    expect(await entries[1].load()).toBeNull();
    const r = await entries[0].load();
    expect(r?.kind).toBe("study");
    expect(loaded).toEqual(["study"]);
    expect(ANALYSIS_FILE.test("margin-sweep-manipulator-joint-2026-10-24-margins-2026-10-24.json")).toBe(true);
  });
});
