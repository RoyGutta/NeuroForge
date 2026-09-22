import { describe, expect, test } from "vitest";
import { checkConstraints } from "../../../src/engine/core/design";
import type { ConstraintSpec, Objective } from "../../../src/engine/core/problem";
import { Rng } from "../../../src/engine/core/rng";
import { createDesignSpace } from "../../../src/engine/core/space";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { createOptimizer, listOptimizers, type OptimizerContext } from "../../../src/engine/optimization";

const objective: Objective = { id: "f", metric: "f", direction: "minimize", label: "f" };

function space(d: number) {
  return createDesignSpace(Array.from({ length: d }, (_, i) => ({ id: `x${i}`, label: `x${i}`, group: "x", lower: -2, upper: 2, unit: "-" })));
}

function drive(id: string, d: number, seed: number, budget: number, evaluate: (x: number[]) => ReturnType<typeof evalSphere>, params: Record<string, number> = {}) {
  let c = 0;
  const ctx: OptimizerContext = { space: space(d), objective, rng: new Rng(seed), nextId: () => `d${++c}` };
  const opt = createOptimizer(id, ctx, params);
  let evals = 0;
  let gen = 0;
  while (evals < budget) {
    const batch = opt.ask(gen++);
    for (const x of batch) {
      x.evaluation = evaluate(x.parameters);
      evals++;
    }
    opt.tell(batch);
  }
  return opt.best()!;
}

function evalSphere(x: number[]) {
  const f = x.reduce((s, v) => s + (v - 0.5) ** 2, 0);
  return { status: "ok" as const, metrics: { f }, objectives: { f }, constraints: checkConstraints([], { f }), feasible: true, totalViolation: 0, diagnostics: [], fidelity: "t", backend: "t" };
}

/** Rosenbrock-like ill-conditioned valley: needs covariance adaptation to make progress. */
function evalRosen(x: number[]) {
  let f = 0;
  for (let i = 0; i < x.length - 1; i++) f += 100 * (x[i + 1] - x[i] * x[i]) ** 2 + (1 - x[i]) ** 2;
  return { status: "ok" as const, metrics: { f }, objectives: { f }, constraints: checkConstraints([], { f }), feasible: true, totalViolation: 0, diagnostics: [], fidelity: "t", backend: "t" };
}

const constraints: ConstraintSpec[] = [{ id: "c", metric: "sum01", op: ">=", limit: 0.9, label: "x0+x1>=0.9", source: "user" }];
function evalConstrained(x: number[]) {
  const f = x.reduce((s, v) => s + (v - 0.3) ** 2, 0);
  const metrics = { f, sum01: x[0] + x[1] };
  const cs = checkConstraints(constraints, metrics);
  const tv = cs.reduce((s, c) => s + c.violation, 0);
  return { status: "ok" as const, metrics, objectives: { f }, constraints: cs, feasible: tv === 0, totalViolation: tv, diagnostics: [], fidelity: "t", backend: "t" };
}

describe("CMA-ES", () => {
  test("is registered", () => {
    expect(listOptimizers().map((o) => o.id)).toContain("cmaes");
  });

  test("converges to high precision on the sphere function", () => {
    const best = drive("cmaes", 6, 1, 3000, evalSphere);
    expect(best.evaluation!.objectives.f).toBeLessThan(1e-8);
  });

  test("makes progress on the Rosenbrock valley where isotropic search stalls", () => {
    const cma = drive("cmaes", 5, 2, 6000, evalRosen).evaluation!.objectives.f;
    const ea = drive("evolutionary", 5, 2, 6000, evalRosen, { populationSize: 30 }).evaluation!.objectives.f;
    expect(cma).toBeLessThan(0.05);
    expect(cma).toBeLessThan(ea);
  });

  test("handles constraints through the shared ranking and stays feasible at the optimum", () => {
    const best = drive("cmaes", 5, 3, 4000, evalConstrained);
    expect(best.evaluation!.feasible).toBe(true);
    expect(best.evaluation!.objectives.f).toBeLessThan(0.045 * 1.05);
    expect(best.parameters[0] + best.parameters[1]).toBeGreaterThanOrEqual(0.9 - 1e-9);
  });

  test("is deterministic and respects bounds", () => {
    const a = drive("cmaes", 4, 7, 800, evalSphere);
    const b = drive("cmaes", 4, 7, 800, evalSphere);
    expect(a.parameters).toEqual(b.parameters);
    a.parameters.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(2);
    });
  });

  test("runs on the truss problem and improves the baseline", () => {
    const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
    const rec = runExperimentToCompletion(createExperimentConfig({ id: "cma-truss", problem, seed: 4, optimizer: { id: "cmaes", params: {} }, budget: { maxEvaluations: 1500 } }));
    expect(rec.status).toBe("completed");
    expect(rec.best?.evaluation?.feasible).toBe(true);
    expect(rec.best!.evaluation!.metrics.mass_kg).toBeLessThan(rec.baseline.evaluation!.metrics.mass_kg * 0.9);
    const d = rec.optimizerDiagnostics as { sigma: number; conditionNumber: number };
    expect(d.sigma).toBeGreaterThan(0);
    expect(d.conditionNumber).toBeGreaterThanOrEqual(1);
  });
});
