import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createExperimentConfig } from "../../../src/engine/experiments/runner";
import { buildDataset, collectDesigns, splitDataset, standardize } from "../../../src/engine/ml/dataset";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);
const config = createExperimentConfig({
  id: "ds",
  problem,
  seed: 3,
  optimizer: { id: "random-search", params: { batchSize: 50 } },
  budget: { maxEvaluations: 300 },
});

describe("dataset construction from reproducible runs", () => {
  test("collectDesigns re-runs a config and returns every evaluated design, deterministically", () => {
    const a = collectDesigns(config);
    const b = collectDesigns(config);
    expect(a.length).toBeGreaterThanOrEqual(300);
    expect(a.every((d) => d.evaluation)).toBe(true);
    expect(a.map((d) => d.id)).toEqual(b.map((d) => d.id));
  });

  test("buildDataset normalises inputs to the unit cube and keeps only successful evaluations", () => {
    const designs = collectDesigns(config);
    const ds = buildDataset(compiled.space, designs, ["mass_kg", "stressUtilization"]);
    expect(ds.size).toBe(designs.filter((d) => d.evaluation?.status === "ok").length);
    expect(ds.inputs[0]).toHaveLength(compiled.space.dimension);
    for (const row of ds.inputs) for (const v of row) expect(v).toBeGreaterThanOrEqual(-1e-12), expect(v).toBeLessThanOrEqual(1 + 1e-12);
    expect(ds.targets.mass_kg).toHaveLength(ds.size);
    expect(ds.feasible).toHaveLength(ds.size);
    expect(ds.metricIds).toEqual(["mass_kg", "stressUtilization"]);
    expect(ds.variableIds).toEqual(compiled.space.variables.map((v) => v.id));
  });

  test("splitDataset is a seeded, disjoint, exhaustive partition", () => {
    const ds = buildDataset(compiled.space, collectDesigns(config), ["mass_kg"]);
    const s1 = splitDataset(ds, 11, { train: 0.7, validation: 0.15, test: 0.15 });
    const s2 = splitDataset(ds, 11, { train: 0.7, validation: 0.15, test: 0.15 });
    expect(s1.train.size + s1.validation.size + s1.test.size).toBe(ds.size);
    expect(s1.train.size).toBeGreaterThan(s1.test.size);
    expect(s1.train.indices).toEqual(s2.train.indices);
    const all = [...s1.train.indices, ...s1.validation.indices, ...s1.test.indices].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: ds.size }, (_, i) => i));
    expect(splitDataset(ds, 12, { train: 0.7, validation: 0.15, test: 0.15 }).train.indices).not.toEqual(s1.train.indices);
  });

  test("standardize centres and scales, and inverts exactly", () => {
    const y = [1, 2, 3, 4, 5];
    const st = standardize(y);
    expect(st.mean).toBeCloseTo(3, 12);
    expect(st.std).toBeCloseTo(Math.sqrt(2), 12);
    const z = st.apply(y);
    expect(z.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12);
    expect(st.invert(z)).toEqual(y.map((v) => expect.closeTo(v, 12)));
    const c = standardize([7, 7, 7]);
    expect(c.apply([7])[0]).toBe(0);
  });
});
