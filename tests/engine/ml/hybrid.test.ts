import { describe, expect, test } from "vitest";
import { Rng } from "../../../src/engine/core/rng";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig } from "../../../src/engine/experiments/runner";
import { buildDataset, collectDesigns } from "../../../src/engine/ml/dataset";
import { HybridPredictor } from "../../../src/engine/ml/hybrid";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);
const config = createExperimentConfig({ id: "hy", problem, seed: 9, optimizer: { id: "evolutionary", params: { populationSize: 40 } }, budget: { maxEvaluations: 1600 } });

describe("hybrid learned-force / exact-physics predictor", () => {
  const designs = collectDesigns(config);
  const ds = buildDataset(compiled.space, designs, ["maxDisplacement_m"], ["memberForces_N"]);

  test("with exact forces supplied, derived feasibility equals the solver's for every design", () => {
    const hp = new HybridPredictor(compiled, { memberModel: "ridge", riskK: 0 }, new Rng(1));
    for (const d of designs.slice(0, 50)) {
      const ev = d.evaluation!;
      const derived = hp.deriveFromForces(d.parameters, ev.responses!.memberForces_N, ev.metrics.maxDisplacement_m);
      expect(derived.feasible).toBe(ev.feasible);
      expect(derived.metrics.bucklingUtilization).toBeCloseTo(ev.metrics.bucklingUtilization, 12);
    }
  });

  test("trained on real runs it predicts member forces and derives constraint metrics with uncertainty", () => {
    const hp = new HybridPredictor(compiled, { memberModel: "ridge", riskK: 2 }, new Rng(1));
    hp.fit(ds);
    const X = designs.slice(0, 40).map((d) => d.parameters);
    const out = hp.predict(X);
    expect(out).toHaveLength(40);
    for (const o of out) {
      expect(o.forces.mean).toHaveLength(15);
      expect(o.forces.std).toHaveLength(15);
      expect(Number.isFinite(o.nominal.metrics.stressUtilization)).toBe(true);
      expect(o.conservative.metrics.stressUtilization).toBeGreaterThanOrEqual(o.nominal.metrics.stressUtilization - 1e-12);
      expect(o.conservative.metrics.bucklingUtilization).toBeGreaterThanOrEqual(o.nominal.metrics.bucklingUtilization - 1e-12);
      expect(o.conservative.metrics.mass_kg).toBe(o.nominal.metrics.mass_kg);
    }
  });

  test("riskK = 0 makes conservative and nominal identical; larger k is monotonically more conservative", () => {
    const k0 = new HybridPredictor(compiled, { memberModel: "ridge", riskK: 0 }, new Rng(1));
    const k1 = new HybridPredictor(compiled, { memberModel: "ridge", riskK: 1 }, new Rng(1));
    const k3 = new HybridPredictor(compiled, { memberModel: "ridge", riskK: 3 }, new Rng(1));
    for (const h of [k0, k1, k3]) h.fit(ds);
    const X = designs.slice(100, 120).map((d) => d.parameters);
    const [p0, p1, p3] = [k0, k1, k3].map((h) => h.predict(X));
    p0.forEach((o, i) => {
      expect(o.conservative.metrics.bucklingUtilization).toBeCloseTo(o.nominal.metrics.bucklingUtilization, 12);
      expect(p1[i].conservative.metrics.bucklingUtilization).toBeLessThanOrEqual(p3[i].conservative.metrics.bucklingUtilization + 1e-12);
    });
  });

  test("member-force accuracy on held-out designs is high for the truss", () => {
    const hp = new HybridPredictor(compiled, { memberModel: "ridge", riskK: 2 }, new Rng(1));
    const n = Math.floor(ds.size * 0.8);
    const train = { ...ds, inputs: ds.inputs.slice(0, n), size: n, targets: Object.fromEntries(Object.entries(ds.targets).map(([k, v]) => [k, v.slice(0, n)])) };
    hp.fit(train);
    const heldIds = new Set(ds.designIds.slice(n));
    const test = designs.filter((d) => heldIds.has(d.id)).slice(0, 150);
    const out = hp.predict(test.map((d) => d.parameters));
    let correct = 0;
    out.forEach((o, i) => {
      if (o.nominal.feasible === test[i].evaluation!.feasible) correct++;
    });
    expect(correct / out.length).toBeGreaterThan(0.7);
    const r = hp.forceAccuracy(test.map((d) => d.parameters), test.map((d) => d.evaluation!.responses!.memberForces_N));
    expect(r.perMemberMae).toHaveLength(15);
    expect(r.overallR2).toBeGreaterThan(0.8);
  });
});
