import { describe, expect, test } from "vitest";
import { checkConstraints } from "../../../src/engine/core/design";
import type { Objective } from "../../../src/engine/core/problem";
import { Rng } from "../../../src/engine/core/rng";
import { createDesignSpace } from "../../../src/engine/core/space";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { createOptimizer, listOptimizers, type OptimizerContext } from "../../../src/engine/optimization";
import { constrainedDominates } from "../../../src/engine/optimization/pareto";

/** ZDT1-style bi-objective test problem on [0,1]^d: f1 = x0, f2 = g (1 - sqrt(f1/g)), g = 1 + 9 mean(x1..). True front: f2 = 1 - sqrt(f1). */
const DIM = 6;
const space = createDesignSpace(Array.from({ length: DIM }, (_, i) => ({ id: `x${i}`, label: `x${i}`, group: "x", lower: 0, upper: 1, unit: "-" })));
const objectives: Objective[] = [
  { id: "f1", metric: "f1", direction: "minimize", label: "f1" },
  { id: "f2", metric: "f2", direction: "minimize", label: "f2" },
];
function evaluate(x: number[]) {
  const f1 = x[0];
  const g = 1 + (9 * x.slice(1).reduce((a, b) => a + b, 0)) / (DIM - 1);
  const f2 = g * (1 - Math.sqrt(f1 / g));
  const metrics = { f1, f2 };
  const cs = checkConstraints([], metrics);
  return { status: "ok" as const, metrics, objectives: { f1, f2 }, constraints: cs, feasible: true, totalViolation: 0, diagnostics: [], fidelity: "t", backend: "t" };
}

describe("NSGA-II", () => {
  test("is registered as multi-objective", () => {
    const d = listOptimizers().find((o) => o.id === "nsga2");
    expect(d).toBeDefined();
    expect(d!.multiObjective).toBe(true);
  });

  test("approximates the ZDT1 front and returns a non-dominated, spread front", () => {
    let c = 0;
    const ctx: OptimizerContext = { space, objective: objectives[0], objectives, rng: new Rng(3), nextId: () => `d${++c}` };
    const opt = createOptimizer("nsga2", ctx, { populationSize: 60 });
    let gen = 0;
    let evals = 0;
    while (evals < 9000) {
      const batch = opt.ask(gen++);
      for (const d of batch) {
        d.evaluation = evaluate(d.parameters);
        evals++;
      }
      opt.tell(batch);
    }
    const front = opt.front!();
    expect(front.length).toBeGreaterThan(20);
    for (const a of front) for (const b of front) expect(constrainedDominates(a, b, objectives)).toBe(false);
    // Mean vertical distance to the true front f2 = 1 - sqrt(f1).
    const err = front.reduce((s, d) => s + Math.abs(d.evaluation!.objectives.f2 - (1 - Math.sqrt(d.evaluation!.objectives.f1))), 0) / front.length;
    expect(err).toBeLessThan(0.05);
    const f1s = front.map((d) => d.evaluation!.objectives.f1);
    expect(Math.max(...f1s) - Math.min(...f1s)).toBeGreaterThan(0.6);
  });

  test("is deterministic", () => {
    const run = () => {
      let c = 0;
      const ctx: OptimizerContext = { space, objective: objectives[0], objectives, rng: new Rng(5), nextId: () => `d${++c}` };
      const opt = createOptimizer("nsga2", ctx, { populationSize: 20 });
      for (let g = 0; g < 10; g++) {
        const b = opt.ask(g);
        b.forEach((d) => (d.evaluation = evaluate(d.parameters)));
        opt.tell(b);
      }
      return opt.front!().map((d) => d.id);
    };
    expect(run()).toEqual(run());
  });
});

describe("multi-objective truss experiment", () => {
  test("records a feasible Pareto front of mass versus compliance and a hypervolume history", () => {
    const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4, objectiveMetric: "multi" });
    expect(problem.objectives.map((o) => o.metric)).toEqual(["mass_kg", "compliance_J"]);
    const record = runExperimentToCompletion(
      createExperimentConfig({ id: "mo", problem, seed: 8, optimizer: { id: "nsga2", params: { populationSize: 40 } }, budget: { maxEvaluations: 4000 } })
    );
    expect(record.status).toBe("completed");
    const front = record.paretoFront!;
    expect(front.length).toBeGreaterThan(5);
    expect(front.every((d) => d.evaluation?.feasible)).toBe(true);
    for (const a of front) for (const b of front) expect(constrainedDominates(a, b, problem.objectives)).toBe(false);
    const masses = front.map((d) => d.evaluation!.metrics.mass_kg);
    const compl = front.map((d) => d.evaluation!.metrics.compliance_J);
    expect(Math.max(...masses) / Math.min(...masses)).toBeGreaterThan(1.3);
    expect(Math.max(...compl) / Math.min(...compl)).toBeGreaterThan(1.3);
    const hv = record.generations.map((g) => g.hypervolume!);
    expect(hv.every((v) => Number.isFinite(v))).toBe(true);
    for (let i = 1; i < hv.length; i++) expect(hv[i]).toBeGreaterThanOrEqual(hv[i - 1] - 1e-12);
    expect(record.best?.evaluation?.feasible).toBe(true);
  });
});
