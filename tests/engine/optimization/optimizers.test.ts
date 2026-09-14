import { describe, expect, test } from "vitest";
import type { Design } from "../../../src/engine/core/design";
import { checkConstraints } from "../../../src/engine/core/design";
import type { ConstraintSpec, Objective } from "../../../src/engine/core/problem";
import { Rng } from "../../../src/engine/core/rng";
import { createDesignSpace } from "../../../src/engine/core/space";
import {
  createOptimizer,
  listOptimizers,
  type OptimizerContext,
} from "../../../src/engine/optimization";

/**
 * Synthetic constrained test problem with a known optimum:
 *   minimise  f(x) = sum (x_i - 0.3)^2   over [0,1]^5
 *   subject to x_0 + x_1 >= 0.9
 * Optimum: x_0 = x_1 = 0.45, others 0.3, f* = 0.045.
 */
const DIM = 5;
const F_STAR = 0.045;
const space = createDesignSpace(
  Array.from({ length: DIM }, (_, i) => ({
    id: `x${i}`,
    label: `x${i}`,
    group: "x",
    lower: 0,
    upper: 1,
    unit: "-",
  }))
);
const objective: Objective = { id: "f", metric: "f", direction: "minimize", label: "f" };
const constraints: ConstraintSpec[] = [
  { id: "c1", metric: "sum01", op: ">=", limit: 0.9, label: "x0+x1>=0.9", source: "user" },
];

function evaluate(params: number[]) {
  const f = params.reduce((s, x) => s + (x - 0.3) ** 2, 0);
  const metrics = { f, sum01: params[0] + params[1] };
  const cs = checkConstraints(constraints, metrics);
  const totalViolation = cs.reduce((s, c) => s + c.violation, 0);
  return {
    status: "ok" as const,
    metrics,
    objectives: { f },
    constraints: cs,
    feasible: totalViolation === 0,
    totalViolation,
    diagnostics: [],
    fidelity: "analytic",
    backend: "test",
  };
}

function runOptimizer(id: string, seed: number, budget: number, params: Record<string, number> = {}) {
  let counter = 0;
  const ctx: OptimizerContext = {
    space,
    objective,
    rng: new Rng(seed),
    nextId: () => `d${++counter}`,
  };
  const opt = createOptimizer(id, ctx, params);
  let evaluations = 0;
  let gen = 0;
  while (evaluations < budget) {
    const batch = opt.ask(gen++);
    for (const d of batch) {
      d.evaluation = evaluate(d.parameters);
      evaluations++;
    }
    opt.tell(batch);
  }
  return { best: opt.best()!, evaluations };
}

describe("optimizer registry", () => {
  test("lists evolutionary, annealing and random search with parameter schemas", () => {
    const ids = listOptimizers().map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(["evolutionary", "annealing", "random-search"]));
    for (const o of listOptimizers()) {
      expect(o.label.length).toBeGreaterThan(0);
      for (const p of o.params) {
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
      }
    }
  });

  test("throws for an unknown optimizer id", () => {
    const ctx: OptimizerContext = { space, objective, rng: new Rng(1), nextId: () => "x" };
    expect(() => createOptimizer("gradient-descent", ctx, {})).toThrow(/unknown optimizer/);
  });
});

describe("evolutionary optimizer", () => {
  test("converges close to the constrained optimum", () => {
    const { best } = runOptimizer("evolutionary", 7, 6000);
    expect(best.evaluation!.feasible).toBe(true);
    expect(best.evaluation!.objectives.f).toBeLessThan(F_STAR * 1.15);
    expect(best.parameters[0] + best.parameters[1]).toBeGreaterThanOrEqual(0.9 - 1e-9);
  });

  test("is deterministic for a fixed seed", () => {
    const a = runOptimizer("evolutionary", 3, 1500);
    const b = runOptimizer("evolutionary", 3, 1500);
    expect(a.best.parameters).toEqual(b.best.parameters);
    expect(a.best.id).toBe(b.best.id);
  });

  test("respects the population size parameter and records lineage", () => {
    let counter = 0;
    const ctx: OptimizerContext = { space, objective, rng: new Rng(9), nextId: () => `d${++counter}` };
    const opt = createOptimizer("evolutionary", ctx, { populationSize: 12 });
    const g0 = opt.ask(0);
    expect(g0).toHaveLength(12);
    expect(g0.every((d) => d.operator === "initial" && d.parentIds.length === 0)).toBe(true);
    g0.forEach((d) => (d.evaluation = evaluate(d.parameters)));
    opt.tell(g0);
    const g1 = opt.ask(1);
    expect(g1.length).toBeGreaterThan(0);
    const ids = new Set(g0.map((d) => d.id));
    for (const child of g1) {
      expect(child.generation).toBe(1);
      expect(child.parentIds.length).toBeGreaterThan(0);
      for (const pid of child.parentIds) expect(ids.has(pid)).toBe(true);
      child.parameters.forEach((v, i) => {
        expect(v).toBeGreaterThanOrEqual(space.variables[i].lower);
        expect(v).toBeLessThanOrEqual(space.variables[i].upper);
      });
    }
  });

  test("can be seeded with a starting design that is kept if nothing beats it", () => {
    let counter = 0;
    const ctx: OptimizerContext = { space, objective, rng: new Rng(2), nextId: () => `d${++counter}` };
    const seedDesign: Design = {
      id: "seed",
      generation: 0,
      parentIds: [],
      operator: "baseline",
      parameters: [0.45, 0.45, 0.3, 0.3, 0.3],
    };
    const opt = createOptimizer("evolutionary", ctx, { populationSize: 10 }, [seedDesign]);
    const g0 = opt.ask(0);
    expect(g0.some((d) => d.id === "seed")).toBe(true);
    g0.forEach((d) => (d.evaluation = evaluate(d.parameters)));
    opt.tell(g0);
    expect(opt.best()!.id).toBe("seed");
  });
});

describe("simulated annealing", () => {
  test("finds a feasible design near the optimum", () => {
    const { best } = runOptimizer("annealing", 5, 6000);
    expect(best.evaluation!.feasible).toBe(true);
    expect(best.evaluation!.objectives.f).toBeLessThan(F_STAR * 1.5);
  });

  test("is deterministic for a fixed seed", () => {
    const a = runOptimizer("annealing", 4, 800);
    const b = runOptimizer("annealing", 4, 800);
    expect(a.best.parameters).toEqual(b.best.parameters);
  });
});

describe("random search", () => {
  test("keeps the best feasible sample and never returns an infeasible best when a feasible one exists", () => {
    const { best } = runOptimizer("random-search", 8, 3000);
    expect(best.evaluation!.feasible).toBe(true);
    expect(best.evaluation!.objectives.f).toBeLessThan(0.5);
  });

  test("is beaten by the evolutionary optimizer at equal budget", () => {
    const rs = runOptimizer("random-search", 1, 4000).best.evaluation!.objectives.f;
    const ea = runOptimizer("evolutionary", 1, 4000).best.evaluation!.objectives.f;
    expect(ea).toBeLessThan(rs);
  });
});
